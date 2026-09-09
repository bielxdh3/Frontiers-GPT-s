import * as THREE from 'three';
import { BODIES, BODY_MAP, MAJOR_IDS } from '../data/bodies';
import type { BodyDef, BodyId } from '../data/types';
import { AU_KM } from '../data/types';
import { evaluateSystem, type SystemState } from '../sim/ephemeris';
import { apsides } from '../sim/kepler';
import { getMapping, eclToScene, type ScaleMapping, type ScaleMode } from '../sim/scale';
import { daysSinceJ2000 } from '../sim/time';
import { Noise3 } from './noise';
import { Belt } from './belts';
import { CameraController, type Anchor, type ViewState } from './camera';
import { CometEffects } from './comet';
import { LabelLayer, type LabelItem } from './labels';
import { createAtmosphereMaterial, createCloudMaterial, createPlanetMaterial, createRingMaterial, createSunMaterial } from './materials';
import { OrbitLines, Trails } from './orbits';
import { Starfield } from './starfield';
import { TextureFactory, makeRadialSprite, type BodyTextures } from './textures';
import type { EffectiveQuality, LabelsMode, OrbitsMode, Overlays, Presentation } from '../state/store';
import { clock } from '../state/store';

/** Ecliptic (x→equinox, z→north) to three.js scene axes (Y up). */
const Q_E2S = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
/** Sphere geometry (pole +Y, prime meridian +X) to body-fixed frame (pole +Z, prime meridian +X). */
const Q_GEO = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);

const QUALITY: Record<EffectiveQuality, { pixelRatio: number; segments: number; beltDensity: number; effects: boolean; texture: number }> = {
  high: { pixelRatio: 2, segments: 96, beltDensity: 1, effects: true, texture: 1024 },
  medium: { pixelRatio: 1.35, segments: 64, beltDensity: 0.6, effects: true, texture: 512 },
  low: { pixelRatio: 1, segments: 36, beltDensity: 0.3, effects: false, texture: 256 },
};

interface BodyNode {
  def: BodyDef;
  group: THREE.Group;
  orient: THREE.Group;
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  clouds?: THREE.Mesh;
  atmo?: THREE.Mesh;
  rings?: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; innerR: number; outerR: number; tex: THREE.Texture; opaqueOuterR: number };
  glow?: THREE.Sprite[];
  texWidth: number;
  radius: number;      // current display radius
  frameRadius: number; // framing radius (rings, glow)
  visible: boolean;
}

export interface ProjectedBody { id: BodyId; x: number; y: number; radiusPx: number; inFront: boolean; distance: number; occluded: boolean }

export interface FrameInfo { fps: number; quality: EffectiveQuality; drawCalls: number; triangles: number }

export interface SceneCallbacks {
  onPick: (ids: BodyId[], x: number, y: number, ev: PointerEvent) => void;
  onDoublePick: (id: BodyId | null) => void;
  onManualCamera: () => void;
  onTransitionEnd: () => void;
  onQualityChange: (q: EffectiveQuality) => void;
  onContextLost: (lost: boolean) => void;
  onFrame: (info: FrameInfo) => void;
  onTexturesReady: () => void;
  labelText: (id: BodyId) => string;
}

export interface VisualSettings {
  scaleMode: ScaleMode;
  labelsMode: LabelsMode;
  orbitsMode: OrbitsMode;
  overlays: Overlays;
  presentation: Presentation;
  background: number;
  bloom: boolean;
  exposure: number;
  labelSize: number;
  labelDensity: number;
  highContrast: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
  quality: 'auto' | EffectiveQuality;
  hidden: Set<BodyId>;
  favorites: BodyId[];
  photoLabels?: boolean;
}

/**
 * Owns the renderer, the single animation loop, the scene graph and the
 * mapping from physical state to display space (floating origin).
 */
export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly cameraCtl: CameraController;
  readonly stars: Starfield;
  readonly textures: TextureFactory;
  readonly labels: LabelLayer;
  readonly container: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  private nodes = new Map<BodyId, BodyNode>();
  private orbits = new OrbitLines();
  private trails = new Trails();
  private beltAst: Belt;
  private beltKuiper: Belt;
  private comet = new CometEffects();
  private sphereGeo: THREE.SphereGeometry;
  private irregularGeos = new Map<BodyId, THREE.BufferGeometry>();
  private overlayGroup = new THREE.Group();
  private grid: THREE.Group;
  private eclipticLine: THREE.Line;
  private axisLine: THREE.Line;
  private velArrow: THREE.ArrowHelper;
  private apsideSprites: THREE.Sprite[];
  private cardinal: THREE.Group;
  private tidal: THREE.Group;
  private measureLine: THREE.Line;
  private pulseSprite: THREE.Sprite;
  /** Measurement overlay: endpoints and optional light-pulse progress (0–1). */
  measure: { a: BodyId | null; b: BodyId | null; pulseT: number | null } = { a: null, b: null, pulseT: null };
  /** When true, the loop still ticks the clock and physical state but skips rendering (scene hidden behind a tool). */
  idle = false;
  mapping: ScaleMapping = getMapping('exploration');
  private blend: { from: ScaleMapping; to: ScaleMapping; t: number } | null = null;
  state: SystemState = evaluateSystem(clock.jd);
  private stateJd = clock.jd;
  displayPos = new Map<BodyId, THREE.Vector3>();
  displayRadius = new Map<BodyId, number>();
  projected = new Map<BodyId, ProjectedBody>();
  private origin = new THREE.Vector3();
  private raf = 0;
  private lastT = 0;
  private running = false;
  quality: EffectiveQuality = 'high';
  private fpsFrames = 0; private fpsTime = 0; fps = 60;
  private lowWindows = 0; private highWindows = 0;
  private settings: VisualSettings;
  selected: BodyId | null = null;
  focusedSystem: BodyId | null = null;
  private history: ViewState[] = [];
  private future: ViewState[] = [];
  private cb: SceneCallbacks;
  private resizeObs: ResizeObserver | null = null;
  private safe = { left: 0, right: 0, top: 0, bottom: 0 };
  private width = 1; private height = 1;
  private texturesLoaded = 0;
  private simTime = 0;
  private disposed = false;
  private lastPixelRatio = 1;
  photoMode = false;
  private unsubClock: () => void;

  constructor(container: HTMLElement, settings: VisualSettings, cb: SceneCallbacks) {
    this.container = container;
    this.settings = settings;
    this.cb = cb;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'scene-canvas';
    this.canvas.setAttribute('aria-label', 'Cena 3D do Sistema Solar');
    this.canvas.tabIndex = 0;
    container.appendChild(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: 'high-performance', logarithmicDepthBuffer: true, preserveDrawingBuffer: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = settings.exposure;
    this.renderer.autoClear = false;
    this.renderer.setClearColor(new THREE.Color('#04060c'), 1);
    this.textures = new TextureFactory(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));
    this.stars = new Starfield();
    this.labels = new LabelLayer(container);
    this.cameraCtl = new CameraController(this.canvas, 16 / 9);
    this.cameraCtl.resolve = (id) => this.displayPos.get(id) ?? null;
    this.cameraCtl.onManualInput = () => cb.onManualCamera();
    this.cameraCtl.onClick = (x, y, ev) => { const r = this.canvas.getBoundingClientRect(); cb.onPick(this.pick(x - r.left, y - r.top), x - r.left, y - r.top, ev); };
    this.cameraCtl.onDoubleClick = (x, y) => { const r = this.canvas.getBoundingClientRect(); const ids = this.pick(x - r.left, y - r.top); cb.onDoublePick(ids[0] ?? null); };
    this.cameraCtl.onTransitionEnd = () => cb.onTransitionEnd();
    this.sphereGeo = new THREE.SphereGeometry(1, 96, 48);
    this.beltAst = new Belt({ seed: 9001, count: 7000, aMin: 2.06, aMax: 3.28, eMax: 0.28, incMaxDeg: 22, color: '#a89f94', opacity: 0.55, sizeMin: 0.8, sizeMax: 2.2 });
    this.beltKuiper = new Belt({ seed: 9002, count: 6000, aMin: 30, aMax: 50, eMax: 0.2, incMaxDeg: 25, color: '#9fb4c8', opacity: 0.5, sizeMin: 0.8, sizeMax: 2.4 });
    this.scene.add(this.beltAst.points, this.beltKuiper.points, this.orbits.group, this.trails.group, this.comet.group, this.overlayGroup);
    // Overlays
    this.grid = this.buildGrid();
    this.eclipticLine = this.buildEclipticPlane();
    this.axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 }));
    this.velArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x6fd3ff, 0.2, 0.1);
    const apsTex = makeRadialSprite(32, 1, 1.2);
    this.apsideSprites = [0, 1].map((i) => new THREE.Sprite(new THREE.SpriteMaterial({ map: apsTex, color: i === 0 ? '#ffb347' : '#6fd3ff', depthWrite: false, transparent: true })));
    this.cardinal = this.buildCardinal();
    this.tidal = this.buildTidal();
    this.measureLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: '#6fe0a8', transparent: true, opacity: 0.9, dashSize: 0.5, gapSize: 0.25, depthTest: false }));
    this.measureLine.renderOrder = 5;
    this.pulseSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeRadialSprite(32, 1, 1.4), color: '#ffffff', depthWrite: false, depthTest: false, transparent: true }));
    this.pulseSprite.renderOrder = 6;
    this.overlayGroup.add(this.grid, this.eclipticLine, this.axisLine, this.velArrow, ...this.apsideSprites, this.cardinal, this.tidal, this.measureLine, this.pulseSprite);
    this.buildBodies();
    this.applyQuality(this.pickInitialQuality(), true);
    this.observeResize();
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    this.unsubClock = clock.on((e) => { if (e === 'jump') { this.trails.invalidate(); } });
    this.requestInitialTextures();
  }

  /* ------------------------------------------------------------------ */
  /* Construction                                                        */
  /* ------------------------------------------------------------------ */

  private pickInitialQuality(): EffectiveQuality {
    if (this.settings.quality !== 'auto') return this.settings.quality;
    const dpr = window.devicePixelRatio || 1;
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    const gl = this.renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const weak = /swiftshader|llvmpipe|software|mali-4|adreno 3/i.test(rendererName);
    if (weak) return 'low';
    if (small || dpr > 2.5) return 'medium';
    return 'high';
  }

  private irregularGeometry(def: BodyDef): THREE.BufferGeometry {
    let g = this.irregularGeos.get(def.id);
    if (g) return g;
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const n = new Noise3(def.appearance.seed);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const dims = def.physical.dimensionsKm;
    const sx = dims ? dims[0] / dims[0] : 1, sy = dims ? dims[1] / dims[0] : 0.85, sz = dims ? dims[2] / dims[0] : 0.78;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const d = 1 + 0.18 * n.fbm(v.x * 1.6, v.y * 1.6, v.z * 1.6, 4) + 0.05 * n.fbm(v.x * 6, v.y * 6, v.z * 6, 3);
      v.multiplyScalar(d);
      v.set(v.x * sx, v.y * sz, v.z * sy);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    // Equirectangular UVs from the direction.
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const lon = Math.atan2(v.z, -v.x);
      uv.setXY(i, 1 - (lon / (2 * Math.PI) + 0.5), 0.5 + Math.asin(v.y) / Math.PI);
    }
    uv.needsUpdate = true;
    g = geo;
    this.irregularGeos.set(def.id, g);
    return g;
  }

  private buildBodies(): void {
    for (const def of BODIES) {
      if (def.level !== 'simulated') continue;
      const group = new THREE.Group();
      const orient = new THREE.Group();
      group.add(orient);
      const isSun = def.id === 'sun';
      const material = isSun ? createSunMaterial() : createPlanetMaterial({ color: def.appearance.color, atmoColor: def.appearance.atmosphere?.color, atmoIntensity: def.appearance.atmosphere?.intensity ?? 0 });
      const geo = def.appearance.irregular ? this.irregularGeometry(def) : this.sphereGeo;
      const mesh = new THREE.Mesh(geo, material);
      mesh.userData.bodyId = def.id;
      orient.add(mesh);
      const node: BodyNode = { def, group, orient, mesh, material, texWidth: 0, radius: 1, frameRadius: 1, visible: true };
      if (def.appearance.clouds) {
        const cm = createCloudMaterial();
        node.clouds = new THREE.Mesh(this.sphereGeo, cm);
        node.clouds.scale.setScalar(1.006);
        node.clouds.renderOrder = 1;
        orient.add(node.clouds);
      }
      if (def.appearance.atmosphere && !isSun) {
        const a = def.appearance.atmosphere;
        node.atmo = new THREE.Mesh(this.sphereGeo, createAtmosphereMaterial(a.color, a.intensity));
        node.atmo.scale.setScalar(def.id === 'titan' ? 1.07 : def.id === 'venus' ? 1.03 : 1.028);
        node.atmo.renderOrder = 2;
        orient.add(node.atmo);
      }
      if (def.appearance.rings) {
        const R = def.physical.meanRadiusKm;
        const { tex, innerKm, outerKm } = this.textures.ringTexture(def.appearance.rings, def.appearance.seed);
        const innerR = innerKm / R, outerR = outerKm / R;
        const rg = new THREE.RingGeometry(innerR, outerR, 256, 1);
        rg.rotateX(-Math.PI / 2);
        const boost = def.appearance.rings.enhanced ? 6 : 1;
        const rm = createRingMaterial(tex, innerR, outerR, boost);
        const rmesh = new THREE.Mesh(rg, rm);
        rmesh.renderOrder = 3;
        orient.add(rmesh);
        const opaque = def.appearance.rings.bands.filter((b) => b.opacity > 0.05).reduce((m, b) => Math.max(m, b.outerKm), 0) / R;
        node.rings = { mesh: rmesh, mat: rm, innerR, outerR, tex, opaqueOuterR: opaque || outerR };
      }
      if (isSun) {
        const g1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeRadialSprite(256, 1, 3.2, '#ffd9a0'), color: '#ffc070', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
        const g2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeRadialSprite(256, 1, 1.6, '#fff2dc'), color: '#ffd8a8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
        g1.renderOrder = 4; g2.renderOrder = 4;
        group.add(g1, g2);
        node.glow = [g1, g2];
      }
      this.scene.add(group);
      this.nodes.set(def.id, node);
    }
  }

  private buildGrid(): THREE.Group {
    const g = new THREE.Group();
    g.visible = false;
    return g;
  }

  private rebuildGrid(): void {
    for (const c of [...this.grid.children]) { this.grid.remove(c); (c as THREE.Line).geometry.dispose(); ((c as THREE.Line).material as THREE.Material).dispose(); }
    const radiiAu = this.mapping.mode === 'relative' ? [0.5, 1, 2, 5, 10, 20, 30, 40, 50] : [0.5, 1, 2, 5, 10, 20, 30, 40, 50];
    const mat = new THREE.LineBasicMaterial({ color: '#6fd3ff', transparent: true, opacity: 0.16, depthWrite: false });
    for (const au of radiiAu) {
      const r = this.mapping.auToDisplay(au);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 180; i++) { const a = (i / 180) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
      line.userData.au = au;
      this.grid.add(line);
    }
    // Radial spokes every 30° (ecliptic longitude).
    const rMax = this.mapping.auToDisplay(50);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(Math.cos(a) * rMax, 0, -Math.sin(a) * rMax)]), mat);
      this.grid.add(line);
    }
  }

  private buildEclipticPlane(): THREE.Line {
    const mat = new THREE.LineBasicMaterial({ color: '#8fb6ff', transparent: true, opacity: 0.25, depthWrite: false });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), mat);
    line.visible = false;
    return line;
  }

  private buildCardinal(): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.6 });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), mat);
    g.add(line);
    const north = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]), new THREE.LineBasicMaterial({ color: '#6fd3ff', transparent: true, opacity: 0.6 }));
    g.add(north);
    g.visible = false;
    return g;
  }

  private buildTidal(): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: '#ff8fb0', transparent: true, opacity: 0.9 });
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), mat));
    const hemi = new THREE.Mesh(new THREE.SphereGeometry(1.01, 32, 16, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#ff8fb0', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    g.add(hemi);
    g.visible = false;
    return g;
  }

  private requestInitialTextures(): void {
    const order: BodyId[] = ['sun', 'earth', 'saturn', 'jupiter', 'mars', 'venus', 'mercury', 'moon', 'uranus', 'neptune'];
    const rest = BODIES.filter((b) => b.level === 'simulated' && !order.includes(b.id)).map((b) => b.id);
    let pr = 100;
    for (const id of [...order, ...rest]) {
      const def = BODY_MAP[id];
      const w = order.includes(id) ? 256 : 128;
      this.textures.request(def, w, pr--).then((t) => this.applyTextures(id, t)).catch(() => { /* flat material remains */ });
    }
    // Background refinement for major bodies after boot.
    setTimeout(() => {
      if (this.disposed) return;
      for (const id of order) this.textures.request(BODY_MAP[id], Math.min(512, QUALITY[this.quality].texture), 5).then((t) => this.applyTextures(id, t)).catch(() => { /* ignore */ });
    }, 1500);
  }

  private applyTextures(id: BodyId, t: BodyTextures): void {
    const node = this.nodes.get(id);
    if (!node || this.disposed) return;
    if (t.width < node.texWidth) return; // never downgrade
    node.texWidth = t.width;
    const u = node.material.uniforms;
    u.map.value = t.map; u.hasMap.value = 1;
    if (t.normal && u.normalMap) { u.normalMap.value = t.normal; u.hasNormal.value = 1; }
    if (t.night && u.nightMap) { u.nightMap.value = t.night; u.hasNight.value = 1; }
    if (t.clouds && node.clouds) { (node.clouds.material as THREE.ShaderMaterial).uniforms.map.value = t.clouds; }
    this.texturesLoaded++;
    if (this.texturesLoaded === 10) this.cb.onTexturesReady();
  }

  /** Request a high-resolution texture for a body (selected / focused). */
  refine(id: BodyId): void {
    const def = BODY_MAP[id];
    if (!def || def.level !== 'simulated') return;
    const target = QUALITY[this.quality].texture;
    const node = this.nodes.get(id);
    if (!node || node.texWidth >= target) return;
    this.textures.request(def, target, 50).then((t) => this.applyTextures(id, t)).catch(() => { /* ignore */ });
  }

  private observeResize(): void {
    const apply = () => {
      const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight);
      this.width = w; this.height = h;
      this.renderer.setSize(w, h, false);
      this.cameraCtl.setViewport(w, h);
      this.labels.resize(w, h);
    };
    apply();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObs = new ResizeObserver(apply);
      this.resizeObs.observe(this.container);
    } else {
      window.addEventListener('resize', apply);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Quality                                                             */
  /* ------------------------------------------------------------------ */

  applyQuality(q: EffectiveQuality, force = false): void {
    if (q === this.quality && !force) return;
    this.quality = q;
    const cfg = QUALITY[q];
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.pixelRatio);
    this.renderer.setPixelRatio(dpr);
    this.lastPixelRatio = dpr;
    this.renderer.setSize(this.width, this.height, false);
    if (this.sphereGeo.parameters.widthSegments !== cfg.segments) {
      const g = new THREE.SphereGeometry(1, cfg.segments, cfg.segments / 2);
      for (const n of this.nodes.values()) {
        if (!n.def.appearance.irregular) n.mesh.geometry = g;
        if (n.clouds) n.clouds.geometry = g;
        if (n.atmo) n.atmo.geometry = g;
      }
      this.sphereGeo.dispose();
      this.sphereGeo = g;
    }
    this.beltAst.setDensity(cfg.beltDensity);
    this.beltKuiper.setDensity(cfg.beltDensity);
    for (const n of this.nodes.values()) {
      if (n.atmo) n.atmo.visible = cfg.effects;
      if (n.clouds) n.clouds.visible = cfg.effects || n.def.id === 'earth';
      n.material.uniforms.flatShade && (n.material.uniforms.flatShade.value = 0);
    }
    this.cb.onQualityChange(q);
  }

  private adaptQuality(dt: number): void {
    this.fpsFrames++; this.fpsTime += dt;
    if (this.fpsTime < 1) return;
    this.fps = this.fpsFrames / this.fpsTime;
    this.fpsFrames = 0; this.fpsTime = 0;
    if (this.settings.quality !== 'auto') return;
    if (this.fps < 36) { this.lowWindows++; this.highWindows = 0; } else if (this.fps > 56) { this.highWindows++; this.lowWindows = 0; } else { this.lowWindows = Math.max(0, this.lowWindows - 1); this.highWindows = 0; }
    if (this.lowWindows >= 3) {
      this.lowWindows = 0;
      if (this.quality === 'high') this.applyQuality('medium'); else if (this.quality === 'medium') this.applyQuality('low');
    } else if (this.highWindows >= 15) {
      this.highWindows = 0;
      if (this.quality === 'low') this.applyQuality('medium'); else if (this.quality === 'medium') this.applyQuality('high');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Settings                                                            */
  /* ------------------------------------------------------------------ */

  updateSettings(s: VisualSettings): void {
    const prev = this.settings;
    this.settings = s;
    this.renderer.toneMappingExposure = s.exposure;
    this.cameraCtl.reducedMotion = s.reducedMotion;
    this.cameraCtl.autoRotate = s.autoRotate;
    this.labels.labelScale = s.labelSize;
    this.labels.density = s.labelDensity;
    if (s.quality !== 'auto' && s.quality !== this.quality) this.applyQuality(s.quality);
    if (s.scaleMode !== this.mapping.mode) this.setScaleMode(s.scaleMode);
    if (prev.presentation !== s.presentation || prev.highContrast !== s.highContrast) this.applyPresentation();
    this.trails.windowDays = s.overlays.trailDays;
    if (!s.overlays.trails) this.trails.invalidate();
  }

  private applyPresentation(): void {
    const enhanced = this.settings.presentation === 'enhanced';
    for (const n of this.nodes.values()) {
      const u = n.material.uniforms;
      if (u.ambient) u.ambient.value = enhanced ? 0.09 : 0.035;
      if (u.nightIntensity) u.nightIntensity.value = enhanced ? 1.3 : 0.9;
      if (u.atmoIntensity && n.def.appearance.atmosphere) u.atmoIntensity.value = n.def.appearance.atmosphere.intensity * (enhanced ? 1.4 : 1);
      if (n.atmo) (n.atmo.material as THREE.ShaderMaterial).uniforms.intensity.value = (n.def.appearance.atmosphere?.intensity ?? 0) * (enhanced ? 1.5 : 1);
      if (n.clouds) (n.clouds.material as THREE.ShaderMaterial).uniforms.ambient.value = enhanced ? 0.09 : 0.035;
      if (n.rings) n.rings.mat.uniforms.boost.value = (n.def.appearance.rings?.enhanced ? (enhanced ? 8 : 3) : 1);
      if (n.def.id === 'sun') { n.material.uniforms.brightness.value = enhanced ? 2.6 : 2.2; n.material.uniforms.tint.value.set(enhanced ? '#ff9a3c' : '#ffb347'); }
    }
  }

  setSafeInsets(left: number, right: number, top: number, bottom: number): void {
    this.safe = { left, right, top, bottom };
    this.cameraCtl.frameOffsetPx.set((left - right) / 2, (top - bottom) / 2);
  }

  /* ------------------------------------------------------------------ */
  /* Scale                                                               */
  /* ------------------------------------------------------------------ */

  setScaleMode(mode: ScaleMode): void {
    if (mode === this.mapping.mode && !this.blend) return;
    const from = this.blend ? this.blend.to : this.mapping;
    const to = getMapping(mode);
    const anchor = this.cameraCtl.anchor;
    const id = anchor.type === 'body' ? anchor.id : 'sun';
    const oldR = this.frameRadiusFor(id, from), newR = this.frameRadiusFor(id, to);
    const ratio = newR / Math.max(oldR, 1e-12);
    this.mapping = to;
    this.blend = this.settings.reducedMotion ? null : { from, to, t: 0 };
    this.cameraCtl.minDistance = newR * 1.08;
    this.cameraCtl.flyTo(anchor, { distance: this.cameraCtl.getView().distance * ratio, keepOffset: true, duration: 1.0, instant: this.settings.reducedMotion });
    this.trails.invalidate();
    this.rebuildGrid();
  }

  private frameRadiusFor(id: BodyId, mapping: ScaleMapping): number {
    const def = BODY_MAP[id];
    if (!def || def.level !== 'simulated') return mapping.auToDisplay(1);
    let r = radiusFor(def, mapping);
    const node = this.nodes.get(id);
    if (node?.rings) r *= node.rings.opaqueOuterR;
    if (id === 'comet-observatory') r = Math.max(r * 40, mapping.auToDisplay(1.01) - mapping.auToDisplay(1));
    return r;
  }

  /* ------------------------------------------------------------------ */
  /* Camera API                                                          */
  /* ------------------------------------------------------------------ */

  private pushHistory(): void {
    const v = this.cameraCtl.getView();
    this.history.push(v);
    if (this.history.length > 40) this.history.shift();
    this.future = [];
  }

  canGoBack(): boolean { return this.history.length > 0; }
  canGoForward(): boolean { return this.future.length > 0; }

  back(): void {
    const v = this.history.pop();
    if (!v) return;
    this.future.push(this.cameraCtl.getView());
    this.applyView(v);
  }

  forward(): void {
    const v = this.future.pop();
    if (!v) return;
    this.history.push(this.cameraCtl.getView());
    this.applyView(v);
  }

  private applyView(v: ViewState): void {
    if (v.anchor.type === 'body') this.cameraCtl.minDistance = this.frameRadiusFor(v.anchor.id, this.mapping) * 1.08;
    this.cameraCtl.setView(v, this.settings.reducedMotion);
    if (v.anchor.type === 'body') this.focusedSystem = BODY_MAP[v.anchor.id].parent && BODY_MAP[v.anchor.id].kind === 'moon' ? BODY_MAP[v.anchor.id].parent! : v.anchor.id;
  }

  /** Effective fit margin factoring the panel-free area. */
  private safeMargin(): number {
    const sw = Math.max(200, this.width - this.safe.left - this.safe.right);
    const sh = Math.max(160, this.height - this.safe.top - this.safe.bottom);
    return Math.max(this.width / sw, this.height / sh);
  }

  focus(id: BodyId, opts: { zoom?: number; theta?: number; phi?: number; instant?: boolean; keepOffset?: boolean; duration?: number } = {}): void {
    const def = BODY_MAP[id];
    if (!def) return;
    if (def.level !== 'simulated') { this.focusRegion(id); return; }
    this.pushHistory();
    const r = this.frameRadiusFor(id, this.mapping);
    this.cameraCtl.minDistance = r * 1.08;
    const distance = this.cameraCtl.fitDistance(r, 1.6 * (opts.zoom ?? 1) * this.safeMargin());
    this.cameraCtl.flyTo({ type: 'body', id }, { distance, theta: opts.theta, phi: opts.phi, keepOffset: opts.keepOffset ?? true, instant: opts.instant, duration: opts.duration });
    this.focusedSystem = def.kind === 'moon' && def.parent ? def.parent : id;
    this.refine(id);
  }

  /** Frame a parent with its curated satellite system. */
  fitSystem(parentId: BodyId, opts: { instant?: boolean } = {}): void {
    const def = BODY_MAP[parentId];
    if (!def) return;
    this.pushHistory();
    const moons = BODIES.filter((b) => b.parent === parentId && b.satellite && b.level === 'simulated');
    let r = this.frameRadiusFor(parentId, this.mapping);
    for (const m of moons) {
      const off = this.mapping.satelliteOffset(m, { x: m.satellite!.aKm * (1 + m.satellite!.e), y: 0, z: 0 });
      r = Math.max(r, Math.hypot(off.x, off.y, off.z) * 1.05);
    }
    if (parentId === 'earth' && !moons.length) r = Math.max(r, Math.hypot(...Object.values(this.mapping.satelliteOffset(BODY_MAP.moon, { x: 405000, y: 0, z: 0 })) as [number, number, number]));
    this.cameraCtl.minDistance = this.frameRadiusFor(parentId, this.mapping) * 1.08;
    this.cameraCtl.flyTo({ type: 'body', id: parentId }, { distance: this.cameraCtl.fitDistance(r, 1.25 * this.safeMargin()), keepOffset: true, phi: Math.min(this.cameraCtl.phi, 1.25), instant: opts.instant });
    this.focusedSystem = parentId;
  }

  /** Full-system overview (inner system through Saturn), heliocentric. */
  overview(opts: { instant?: boolean; radiusAu?: number } = {}): void {
    this.pushHistory();
    const r = this.mapping.auToDisplay(opts.radiusAu ?? 10.2);
    this.cameraCtl.minDistance = this.frameRadiusFor('sun', this.mapping) * 1.08;
    this.cameraCtl.flyTo({ type: 'body', id: 'sun' }, { distance: this.cameraCtl.fitDistance(r, 1.05 * this.safeMargin()), theta: 0.55, phi: 1.12, instant: opts.instant });
    this.focusedSystem = null;
  }

  private focusRegion(id: BodyId): void {
    this.pushHistory();
    const au = id === 'asteroid-belt' ? 3.4 : id === 'kuiper-belt' ? 52 : 52;
    const r = this.mapping.auToDisplay(au);
    this.cameraCtl.minDistance = this.frameRadiusFor('sun', this.mapping) * 1.08;
    this.cameraCtl.flyTo({ type: 'body', id: 'sun' }, { distance: this.cameraCtl.fitDistance(r, 1.05 * this.safeMargin()), phi: 0.75, keepOffset: true });
    this.focusedSystem = null;
  }

  preset(kind: 'top' | 'low' | 'equatorial' | 'polar' | 'terminator'): void {
    const anchor = this.cameraCtl.anchor;
    const id = anchor.type === 'body' ? anchor.id : 'sun';
    this.pushHistory();
    const v = this.cameraCtl.getView();
    if (kind === 'top') this.cameraCtl.flyTo(anchor, { theta: v.theta, phi: 0.06, distance: v.distance });
    else if (kind === 'low') this.cameraCtl.flyTo(anchor, { theta: v.theta, phi: 1.48, distance: v.distance });
    else if (kind === 'terminator') {
      // Look along the terminator: camera perpendicular to the Sun direction.
      const p = this.displayPos.get(id), s = this.displayPos.get('sun');
      if (p && s) {
        const toSun = new THREE.Vector3().subVectors(s, p).normalize();
        const theta = Math.atan2(toSun.x, toSun.z) + Math.PI / 2;
        this.cameraCtl.flyTo(anchor, { theta, phi: 1.35, distance: v.distance });
      }
    } else {
      // Body-relative equatorial / polar views using the current orientation quaternion.
      const node = this.nodes.get(id);
      if (!node) return;
      const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(node.orient.quaternion);
      if (kind === 'polar') {
        const phi = Math.acos(THREE.MathUtils.clamp(pole.y, -1, 1));
        const theta = Math.atan2(pole.x, pole.z);
        this.cameraCtl.flyTo(anchor, { theta, phi: Math.max(0.05, phi), distance: v.distance });
      } else {
        const eq = new THREE.Vector3().crossVectors(pole, new THREE.Vector3(0, 1, 0)).normalize();
        if (eq.lengthSq() < 1e-6) eq.set(1, 0, 0);
        const side = new THREE.Vector3().crossVectors(eq, pole).normalize();
        const phi = Math.acos(THREE.MathUtils.clamp(side.y, -1, 1));
        const theta = Math.atan2(side.x, side.z);
        this.cameraCtl.flyTo(anchor, { theta, phi: THREE.MathUtils.clamp(phi, 0.05, Math.PI - 0.05), distance: v.distance });
      }
    }
  }

  /** Detach the camera from its body so the body drifts away. */
  freeCamera(): void { this.pushHistory(); this.cameraCtl.detach(); }

  /** Recover from an odd camera state: refit the current anchor. */
  recover(): void {
    const a = this.cameraCtl.anchor;
    const id = a.type === 'body' ? a.id : 'sun';
    this.cameraCtl.resetPan();
    this.focus(id, { instant: true, keepOffset: false, theta: 0.6, phi: 1.05 });
  }

  getViewpoint(): { target: BodyId; distance: number; theta: number; phi: number } {
    const v = this.cameraCtl.getView();
    return { target: v.anchor.type === 'body' ? v.anchor.id : 'sun', distance: v.distance, theta: v.theta, phi: v.phi };
  }

  applyViewpoint(vp: { target: BodyId; distance: number; theta: number; phi: number }, instant = false): void {
    this.pushHistory();
    this.cameraCtl.minDistance = this.frameRadiusFor(vp.target, this.mapping) * 1.08;
    this.cameraCtl.flyTo({ type: 'body', id: vp.target }, { distance: vp.distance, theta: vp.theta, phi: vp.phi, instant });
    const def = BODY_MAP[vp.target];
    this.focusedSystem = def?.kind === 'moon' && def.parent ? def.parent : vp.target;
  }

  get anchorId(): BodyId | null { return this.cameraCtl.anchor.type === 'body' ? this.cameraCtl.anchor.id : null; }
  get anchor(): Anchor { return this.cameraCtl.anchor; }
  get cameraDistance(): number { return this.cameraCtl.distance; }
  setFov(fov: number): void { this.cameraCtl.camera.fov = fov; this.cameraCtl.camera.updateProjectionMatrix(); }
  get fov(): number { return this.cameraCtl.camera.fov; }

  /* ------------------------------------------------------------------ */
  /* Picking                                                             */
  /* ------------------------------------------------------------------ */

  pick(x: number, y: number): BodyId[] {
    const out: { id: BodyId; score: number }[] = [];
    for (const p of this.projected.values()) {
      if (!p.inFront || p.occluded) continue;
      const d = Math.hypot(p.x - x, p.y - y);
      const tol = Math.max(p.radiusPx, 14);
      if (d <= tol) out.push({ id: p.id, score: d - Math.min(p.radiusPx, tol) * 0.5 + (p.radiusPx > 40 ? 6 : 0) });
    }
    out.sort((a, b) => a.score - b.score);
    return out.map((o) => o.id);
  }

  /* ------------------------------------------------------------------ */
  /* Frame                                                               */
  /* ------------------------------------------------------------------ */

  start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.lastT = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.25, Math.max(0, (t - this.lastT) / 1000));
      this.lastT = t;
      try { this.frame(dt); } catch (err) { console.error(err); }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Compute physical state and display positions for the current clock instant. */
  private computeDisplay(): void {
    const jd = clock.jd;
    if (jd !== this.stateJd) { this.state = evaluateSystem(jd); this.stateJd = jd; }
    const mapA = this.blend ? this.blend.from : this.mapping;
    const mapB = this.mapping;
    const e = this.blend ? (this.blend.t < 0.5 ? 4 * this.blend.t ** 3 : 1 - Math.pow(-2 * this.blend.t + 2, 3) / 2) : 1;
    const tmp = new THREE.Vector3();
    const posFor = (def: BodyDef, m: ScaleMapping, parentPos: THREE.Vector3 | null): THREE.Vector3 => {
      const st = this.state.get(def.id)!;
      if (def.parent && def.parent !== 'sun' && parentPos) {
        const off = eclToScene(m.satelliteOffset(def, st.parentRel));
        return new THREE.Vector3(parentPos.x + off.x, parentPos.y + off.y, parentPos.z + off.z);
      }
      const p = eclToScene(m.helioPosition(st.pos));
      return new THREE.Vector3(p.x, p.y, p.z);
    };
    const parentsA = new Map<BodyId, THREE.Vector3>();
    const parentsB = new Map<BodyId, THREE.Vector3>();
    for (const def of BODIES) {
      if (def.level !== 'simulated') continue;
      const st = this.state.get(def.id);
      if (!st) continue;
      const hasParent = !!def.parent && def.parent !== 'sun';
      const pa = posFor(def, mapA, hasParent ? parentsA.get(def.parent!) ?? null : null);
      parentsA.set(def.id, pa);
      const ra = radiusFor(def, mapA);
      let pos = pa, r = ra;
      if (this.blend) {
        const pb = posFor(def, mapB, hasParent ? parentsB.get(def.parent!) ?? null : null);
        parentsB.set(def.id, pb);
        const rb = radiusFor(def, mapB);
        pos = tmp.copy(pa).lerp(pb, e).clone();
        r = Math.exp(Math.log(ra) + (Math.log(rb) - Math.log(ra)) * e);
      }
      this.displayPos.set(def.id, pos);
      this.displayRadius.set(def.id, r);
    }
    // Schematic regions: representative display positions for labels.
    const regionPos = (au: number, angleDeg: number) => { const r = this.mapping.auToDisplay(au); const a = angleDeg * Math.PI / 180; return new THREE.Vector3(Math.cos(a) * r, 0, -Math.sin(a) * r); };
    this.displayPos.set('asteroid-belt', regionPos(2.7, 135));
    this.displayPos.set('kuiper-belt', regionPos(42, 225));
    this.displayRadius.set('asteroid-belt', 0); this.displayRadius.set('kuiper-belt', 0);
  }

  private visibleMoons(): Set<BodyId> {
    const out = new Set<BodyId>();
    const mode = this.settings.overlays.moons;
    if (mode === 'none') { if (this.selected && BODY_MAP[this.selected].kind === 'moon') out.add(this.selected); return out; }
    for (const def of BODIES) {
      if (def.kind !== 'moon' || def.level !== 'simulated') continue;
      if (mode === 'all') { out.add(def.id); continue; }
      const sys = this.focusedSystem;
      const selParent = this.selected ? (BODY_MAP[this.selected].kind === 'moon' ? BODY_MAP[this.selected].parent : this.selected) : null;
      if (def.parent === sys || def.parent === selParent || def.id === this.selected) out.add(def.id);
    }
    return out;
  }

  private orbitVisibility(): Set<BodyId> {
    const out = new Set<BodyId>();
    const mode = this.settings.orbitsMode;
    if (mode === 'none') return out;
    const moons = this.visibleMoons();
    const sel = this.selected;
    for (const def of BODIES) {
      if (def.level !== 'simulated' || def.id === 'sun') continue;
      if (this.settings.hidden.has(def.id)) continue;
      const isMoon = def.kind === 'moon';
      if (mode === 'all') {
        if (!isMoon || moons.has(def.id)) out.add(def.id);
      } else if (mode === 'selected') {
        if (def.id === sel) out.add(def.id);
      } else if (mode === 'system') {
        if (!sel) continue;
        const selDef = BODY_MAP[sel];
        const parent = selDef.kind === 'moon' ? selDef.parent : sel;
        if (def.id === sel || def.parent === parent || def.id === parent) out.add(def.id);
      }
    }
    if (!this.settings.overlays.comet && sel !== 'comet-observatory') out.delete('comet-observatory');
    return out;
  }

  private frame(dt: number): void {
    // 1. Simulation clock (single authoritative tick).
    clock.tick(dt);
    this.simTime += dt;
    // 2. Physical state → display space.
    if (this.blend) { this.blend.t = Math.min(1, this.blend.t + dt / 1.0); if (this.blend.t >= 1) this.blend = null; }
    this.computeDisplay();
    // 3. Camera & floating origin.
    const origin = this.cameraCtl.update(dt);
    this.origin.copy(origin);
    const cam = this.cameraCtl.camera;
    const sunDisp = this.displayPos.get('sun')!;
    const sunPos = new THREE.Vector3().subVectors(sunDisp, origin);
    const moonsVisible = this.visibleMoons();
    const days = daysSinceJ2000(clock.jd);
    const pr = this.lastPixelRatio;
    // 4. Bodies.
    for (const [id, node] of this.nodes) {
      const pos = this.displayPos.get(id)!;
      const r = this.displayRadius.get(id)!;
      const st = this.state.get(id)!;
      const hidden = this.settings.hidden.has(id) && id !== this.selected;
      const moonHidden = node.def.kind === 'moon' && !moonsVisible.has(id);
      const cometHidden = id === 'comet-observatory' && !this.settings.overlays.comet && id !== this.selected;
      node.visible = !hidden && !moonHidden && !cometHidden;
      node.group.visible = node.visible;
      node.radius = r;
      node.frameRadius = r * (node.rings ? node.rings.opaqueOuterR : 1);
      if (!node.visible) continue;
      node.group.position.copy(pos).sub(origin);
      const q = st.orientation;
      node.orient.quaternion.set(q.x, q.y, q.z, q.w).premultiply(Q_E2S).multiply(Q_GEO);
      node.orient.scale.setScalar(r);
      const u = node.material.uniforms;
      if (id === 'sun') {
        u.time.value = this.simTime;
        const camDist = cam.position.distanceTo(node.group.position);
        const glowScale = this.settings.bloom ? 1 : 0.55;
        if (node.glow) {
          node.glow[0].scale.setScalar(r * 5.2 * glowScale);
          node.glow[1].scale.setScalar(r * 2.6 * glowScale);
          const fade = THREE.MathUtils.clamp(camDist / (r * 3), 0, 1);
          (node.glow[0].material as THREE.SpriteMaterial).opacity = 0.75 * fade * (0.6 + 0.4 * this.settings.background);
          (node.glow[1].material as THREE.SpriteMaterial).opacity = 0.5 * fade;
        }
      } else {
        u.sunPos.value.copy(sunPos);
        if (node.clouds) {
          const cu = (node.clouds.material as THREE.ShaderMaterial).uniforms;
          cu.sunPos.value.copy(sunPos);
          cu.drift.value = (days * 0.02) % 1; // illustrative slow cloud drift relative to the surface
        }
        if (node.atmo) (node.atmo.material as THREE.ShaderMaterial).uniforms.sunPos.value.copy(sunPos);
        if (node.rings) {
          const ru = node.rings.mat.uniforms;
          ru.sunPos.value.copy(sunPos);
          ru.planetCenter.value.copy(node.group.position);
          ru.planetRadius.value = r;
          ru.inner.value = node.rings.innerR * r; ru.outer.value = node.rings.outerR * r;
          const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(node.orient.quaternion);
          ru.ringNormal.value.copy(normal);
          u.hasRingShadow.value = 1; u.ringTex.value = node.rings.tex; u.ringInner.value = ru.inner.value; u.ringOuter.value = ru.outer.value;
          u.ringCenter.value.copy(node.group.position); u.ringNormal.value.copy(normal);
        }
      }
    }
    // 5. Belts, comet, orbits, trails.
    const showBelts = !this.blend;
    this.beltAst.visible = showBelts && this.settings.overlays.belts;
    this.beltKuiper.visible = showBelts && this.settings.overlays.kuiper;
    this.beltAst.update(days, this.mapping, origin, pr);
    this.beltKuiper.update(days, this.mapping, origin, pr);
    const cometNode = this.nodes.get('comet-observatory');
    if (cometNode && cometNode.visible) {
      const st = this.state.get('comet-observatory')!;
      const nucleus = cometNode.group.position;
      const antiSun = new THREE.Vector3().subVectors(nucleus, sunPos).normalize();
      const vel = eclToScene(st.vel);
      const velDir = new THREE.Vector3(vel.x, vel.y, vel.z).normalize();
      this.comet.group.visible = true;
      const maxComa = radiusFor(BODY_MAP.sun, this.mapping) * 0.45;
      this.comet.update(nucleus, antiSun, velDir, st.sunDistanceKm / AU_KM, this.mapping, pr, 1, maxComa);
    } else {
      this.comet.group.visible = false;
    }
    this.orbits.group.visible = !this.blend;
    if (!this.blend) this.orbits.update(clock.jd, this.mapping, this.state, this.displayPos, origin, this.orbitVisibility(), this.selected, this.settings.highContrast);
    if (this.settings.overlays.trails && !this.blend) {
      const ids: BodyId[] = BODIES.filter((b) => b.level === 'simulated' && b.id !== 'sun' && ((b.kind !== 'moon' && b.kind !== 'comet' && b.kind !== 'asteroid' && b.kind !== 'dwarf-planet') || b.id === this.selected || (b.kind === 'moon' && moonsVisible.has(b.id)))).map((b) => b.id);
      this.trails.group.visible = true;
      this.trails.update(clock.jd, this.state, ids, this.mapping, this.displayPos, origin);
    } else {
      this.trails.group.visible = false;
    }
    // 6. Scientific overlays.
    this.updateOverlays(origin, sunPos);
    this.updateMeasure(origin);
    if (this.idle) return;
    // 7. Projection for labels & picking.
    this.project(cam);
    this.updateLabels();
    // 8. Render.
    this.renderer.clear();
    this.stars.setIntensity(this.settings.background, this.settings.overlays.milkyWay, pr);
    this.stars.render(this.renderer, cam);
    this.renderer.render(this.scene, cam);
    // 9. Adaptive quality + frame info.
    this.adaptQuality(dt);
    if (this.fpsFrames === 0) {
      const info = this.renderer.info.render;
      this.cb.onFrame({ fps: this.fps, quality: this.quality, drawCalls: info.calls, triangles: info.triangles });
    }
  }

  private updateOverlays(origin: THREE.Vector3, sunPos: THREE.Vector3): void {
    const ov = this.settings.overlays;
    const showGrid = ov.grid && !this.blend;
    this.grid.visible = showGrid;
    if (showGrid) { if (this.grid.children.length === 0) this.rebuildGrid(); this.grid.position.copy(sunPos); }
    // Ecliptic: a large circle at the selected/anchored body's heliocentric distance.
    const selId = this.selected ?? this.anchorId ?? 'earth';
    const selNode = this.nodes.get(selId);
    this.eclipticLine.visible = ov.ecliptic && !!selNode && selId !== 'sun';
    if (this.eclipticLine.visible && selNode) {
      const p = this.displayPos.get(selId)!;
      const rr = Math.hypot(p.x - (this.displayPos.get('sun')!.x), p.z - (this.displayPos.get('sun')!.z));
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 256; i++) { const a = (i / 256) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr)); }
      this.eclipticLine.geometry.setFromPoints(pts);
      this.eclipticLine.position.copy(sunPos);
    }
    // Axis of the selected body.
    this.axisLine.visible = ov.axes && !!selNode && !!selNode.visible;
    if (this.axisLine.visible && selNode) {
      const pole = new THREE.Vector3(0, 1, 0).applyQuaternion(selNode.orient.quaternion);
      const L = selNode.radius * 2.2;
      this.axisLine.geometry.setFromPoints([selNode.group.position.clone().addScaledVector(pole, -L), selNode.group.position.clone().addScaledVector(pole, L)]);
    }
    // Velocity arrow (display-scaled, legend in UI).
    const st = this.selected ? this.state.get(this.selected) : undefined;
    this.velArrow.visible = ov.velocity && !!st && !!selNode && selNode.visible && this.selected !== 'sun';
    if (this.velArrow.visible && st && selNode) {
      const v = eclToScene(st.vel);
      const speed = Math.hypot(v.x, v.y, v.z);
      const dir = new THREE.Vector3(v.x, v.y, v.z).normalize();
      const len = selNode.radius * (1.5 + 2.5 * Math.min(1, speed / 50));
      this.velArrow.position.copy(selNode.group.position);
      this.velArrow.setDirection(dir);
      this.velArrow.setLength(len, len * 0.25, len * 0.12);
    }
    // Perihelion / aphelion markers for the selected heliocentric body.
    const selDef = this.selected ? BODY_MAP[this.selected] : null;
    const showAps = ov.apsides && !!selDef?.orbit && !this.blend;
    for (const s of this.apsideSprites) s.visible = showAps;
    if (showAps && selDef?.orbit) {
      const ap = apsides(selDef.orbit, clock.jd);
      const pp = eclToScene(this.mapping.helioPosition(ap.peri)), aa = eclToScene(this.mapping.helioPosition(ap.apo));
      this.apsideSprites[0].position.set(pp.x, pp.y, pp.z).sub(origin);
      this.apsideSprites[1].position.set(aa.x, aa.y, aa.z).sub(origin);
      const sc = this.cameraCtl.distance * 0.012;
      this.apsideSprites[0].scale.setScalar(sc); this.apsideSprites[1].scale.setScalar(sc);
    }
    // Cardinal directions: vernal equinox (+X) and ecliptic north (+Y) from the Sun.
    this.cardinal.visible = ov.cardinal;
    if (ov.cardinal) {
      this.cardinal.position.copy(sunPos);
      const L = this.mapping.auToDisplay(this.mapping.mode === 'relative' ? 1.5 : 1.3);
      this.cardinal.scale.setScalar(L);
    }
    // Tidal locking overlay for synchronous moons.
    const tidalOn = !!selDef && selDef.kind === 'moon' && !!selDef.rotation?.synchronous && !!selNode?.visible && ov.axes;
    this.tidal.visible = tidalOn;
    if (tidalOn && selNode && selDef?.parent) {
      const parentPos = this.displayPos.get(selDef.parent)!.clone().sub(origin);
      const dir = new THREE.Vector3().subVectors(parentPos, selNode.group.position).normalize();
      this.tidal.position.copy(selNode.group.position);
      this.tidal.scale.setScalar(selNode.radius * 1.02);
      this.tidal.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
      (this.tidal.children[0] as THREE.Line).scale.setScalar(2.5);
    }
  }

  /** Measurement ruler: a dashed line between two bodies (display space) plus an optional light-pulse marker. */
  private updateMeasure(origin: THREE.Vector3): void {
    const { a, b, pulseT } = this.measure;
    const pa = a ? this.displayPos.get(a) : undefined, pb = b ? this.displayPos.get(b) : undefined;
    const show = !!pa && !!pb && !this.blend;
    this.measureLine.visible = show;
    this.pulseSprite.visible = show && pulseT !== null;
    if (!show || !pa || !pb) return;
    const A = pa.clone().sub(origin), B = pb.clone().sub(origin);
    this.measureLine.geometry.setFromPoints([A, B]);
    this.measureLine.computeLineDistances();
    const len = A.distanceTo(B);
    const m = this.measureLine.material as THREE.LineDashedMaterial;
    m.dashSize = len / 40; m.gapSize = len / 80;
    if (pulseT !== null) {
      this.pulseSprite.position.lerpVectors(A, B, THREE.MathUtils.clamp(pulseT, 0, 1));
      this.pulseSprite.scale.setScalar(Math.max(this.cameraCtl.distance * 0.02, len * 0.01));
    }
  }

  private project(cam: THREE.PerspectiveCamera): void {
    this.projected.clear();
    const v = new THREE.Vector3();
    const halfH = this.height / 2, halfW = this.width / 2;
    const fovV = THREE.MathUtils.degToRad(cam.fov);
    const list: ProjectedBody[] = [];
    for (const [id, node] of this.nodes) {
      if (!node.visible) continue;
      v.copy(node.group.position);
      const dist = v.distanceTo(cam.position);
      v.project(cam);
      const inFront = v.z < 1 && v.z > -1;
      const x = (v.x + 1) * halfW, y = (1 - v.y) * halfH;
      const radiusPx = (node.frameRadius / (dist * Math.tan(fovV / 2))) * halfH;
      list.push({ id, x, y, radiusPx, inFront, distance: dist, occluded: false });
    }
    for (const rid of ['asteroid-belt', 'kuiper-belt'] as BodyId[]) {
      const p = this.displayPos.get(rid);
      const show = rid === 'asteroid-belt' ? this.settings.overlays.belts : this.settings.overlays.kuiper;
      if (!p || !show || this.blend) continue;
      v.copy(p).sub(this.origin);
      const dist = v.distanceTo(cam.position);
      v.project(cam);
      list.push({ id: rid, x: (v.x + 1) * halfW, y: (1 - v.y) * halfH, radiusPx: 0, inFront: v.z < 1 && v.z > -1, distance: dist, occluded: false });
    }
    // Occlusion: a body center inside a nearer body's disc is occluded.
    for (const a of list) {
      if (!a.inFront) continue;
      for (const b of list) {
        if (a === b || !b.inFront || b.radiusPx < 6 || b.distance >= a.distance) continue;
        const bodyR = this.displayRadius.get(b.id) ?? 0;
        const bodyPx = (bodyR / (b.distance * Math.tan(fovV / 2))) * halfH;
        if (Math.hypot(a.x - b.x, a.y - b.y) < bodyPx * 0.98) { a.occluded = true; break; }
      }
    }
    for (const p of list) this.projected.set(p.id, p);
  }

  private priorityFor(id: BodyId): number {
    const def = BODY_MAP[id];
    if (id === this.selected) return 10;
    if (id === this.anchorId) return 9;
    if (id === 'sun') return 8;
    if (def.kind === 'planet') return 6 + Math.min(1, def.physical.meanRadiusKm / 70000);
    if (def.kind === 'moon') return def.parent === this.focusedSystem ? 5 : id === 'moon' ? 4.5 : 3.5;
    if (def.kind === 'dwarf-planet') return 3;
    if (def.kind === 'region') return 1;
    return 2;
  }

  private updateLabels(): void {
    const mode = this.settings.labelsMode;
    const showLabels = mode !== 'none' && !(this.photoMode && this.settings.photoLabels === false);
    const items: LabelItem[] = [];
    const selDef = this.selected ? BODY_MAP[this.selected] : null;
    const selParent = selDef ? (selDef.kind === 'moon' ? selDef.parent : selDef.id) : null;
    for (const p of this.projected.values()) {
      const def = BODY_MAP[p.id];
      let show = true;
      if (mode === 'major') show = MAJOR_IDS.includes(p.id) || p.id === this.selected || def.parent === this.focusedSystem || def.kind === 'dwarf-planet' && p.radiusPx > 2 || p.id === 'asteroid-belt' || p.id === 'kuiper-belt';
      else if (mode === 'selected') show = p.id === this.selected;
      else if (mode === 'system') show = p.id === this.selected || p.id === selParent || def.parent === selParent || (selParent === null && MAJOR_IDS.includes(p.id));
      else if (mode === 'favorites') show = this.settings.favorites.includes(p.id) || p.id === this.selected;
      if (!show && p.id !== this.selected) continue;
      const bodyR = this.displayRadius.get(p.id) ?? 0;
      const discPx = (bodyR / (p.distance * Math.tan(THREE.MathUtils.degToRad(this.cameraCtl.camera.fov) / 2))) * (this.height / 2);
      items.push({
        id: p.id, text: this.cb.labelText(p.id), x: p.x, y: p.y, radiusPx: p.radiusPx, priority: this.priorityFor(p.id), inFront: p.inFront, occluded: p.occluded,
        selected: p.id === this.selected, marker: def.kind !== 'region' && discPx < 2.5, color: def.appearance.color, kind: def.kind === 'region' ? 'region' : 'body',
      });
    }
    this.labels.update(items, showLabels, this.settings.overlays.markers && !this.photoMode);
  }

  /* ------------------------------------------------------------------ */
  /* Capture                                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Render the current composition to a PNG blob at `scale` × canvas size.
   * HTML labels are drawn onto the export deliberately (they are not part
   * of the WebGL surface).
   */
  async capture(opts: { scale?: number; labels?: boolean; caption?: string[] } = {}): Promise<Blob> {
    const scale = Math.max(1, Math.min(opts.scale ?? 1, 4));
    const w = Math.round(this.width * scale), h = Math.round(this.height * scale);
    const gl = this.renderer.getContext();
    const maxDim = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number;
    if (w > maxDim || h > maxDim) throw new Error(`size ${w}×${h} exceeds device limit ${maxDim}`);
    const prevPr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    const cam = this.cameraCtl.camera;
    cam.aspect = w / h; cam.updateProjectionMatrix();
    try {
      this.renderer.clear();
      this.stars.render(this.renderer, cam);
      this.renderer.render(this.scene, cam);
      const out = document.createElement('canvas');
      out.width = w; out.height = h;
      const ctx = out.getContext('2d')!;
      ctx.drawImage(this.canvas, 0, 0, w, h);
      if (opts.labels) {
        ctx.font = `${Math.round(13 * scale)}px system-ui, sans-serif`;
        ctx.textBaseline = 'middle';
        for (const p of this.projected.values()) {
          if (!p.inFront || p.occluded) continue;
          const def = BODY_MAP[p.id];
          const show = this.settings.labelsMode === 'none' ? false : MAJOR_IDS.includes(p.id) || p.id === this.selected || def.parent === this.focusedSystem;
          if (!show) continue;
          const text = this.cb.labelText(p.id);
          const x = p.x * scale + (p.radiusPx + 8) * scale, y = p.y * scale;
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 4 * scale, y - 9 * scale, ctx.measureText(text).width + 8 * scale, 18 * scale);
          ctx.fillStyle = '#e8ecf3'; ctx.fillText(text, x, y);
        }
      }
      if (opts.caption && opts.caption.length) {
        ctx.font = `${Math.round(12 * scale)}px system-ui, sans-serif`;
        ctx.textBaseline = 'bottom';
        let y = h - 10 * scale;
        for (const line of [...opts.caption].reverse()) {
          const tw = ctx.measureText(line).width;
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(8 * scale, y - 16 * scale, tw + 10 * scale, 18 * scale);
          ctx.fillStyle = '#d5dbe6'; ctx.fillText(line, 13 * scale, y);
          y -= 19 * scale;
        }
      }
      const blob = await new Promise<Blob | null>((res) => out.toBlob(res, 'image/png'));
      if (!blob) throw new Error('toBlob returned null');
      return blob;
    } finally {
      this.renderer.setPixelRatio(prevPr);
      this.renderer.setSize(this.width, this.height, false);
      cam.aspect = this.width / this.height; cam.updateProjectionMatrix();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Context loss                                                        */
  /* ------------------------------------------------------------------ */

  private onContextLost = (ev: Event): void => {
    ev.preventDefault();
    this.stop();
    this.cb.onContextLost(true);
  };

  private onContextRestored = (): void => {
    this.cb.onContextLost(false);
    this.applyQuality(this.quality, true);
    this.start();
  };

  dispose(): void {
    this.disposed = true;
    this.stop();
    this.unsubClock();
    this.resizeObs?.disconnect();
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.cameraCtl.dispose();
    for (const n of this.nodes.values()) {
      n.material.dispose();
      (n.clouds?.material as THREE.Material | undefined)?.dispose();
      (n.atmo?.material as THREE.Material | undefined)?.dispose();
      if (n.rings) { n.rings.mesh.geometry.dispose(); n.rings.mat.dispose(); n.rings.tex.dispose(); }
      n.glow?.forEach((g) => { (g.material as THREE.SpriteMaterial).map?.dispose(); g.material.dispose(); });
    }
    for (const g of this.irregularGeos.values()) g.dispose();
    this.sphereGeo.dispose();
    this.orbits.dispose(); this.trails.dispose(); this.beltAst.dispose(); this.beltKuiper.dispose(); this.comet.dispose();
    this.stars.dispose(); this.textures.dispose(); this.labels.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}

/** Display radius; the Sun is reduced a further 40% in Exploration Scale (documented in the scale explanation). */
export function radiusFor(def: BodyDef, mapping: ScaleMapping): number {
  const r = mapping.bodyRadius(def);
  return def.id === 'sun' && mapping.mode === 'exploration' ? r * 0.6 : r;
}
