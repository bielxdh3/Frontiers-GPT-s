import * as THREE from 'three';
import { mulberry32 } from './noise';
import { createPointsMaterial } from './materials';
import { makeRadialSprite } from './textures';
import type { ScaleMapping } from '../sim/scale';

/**
 * Illustrative activity model for the educational comet: a function of
 * heliocentric distance only. Not a brightness forecast or gas-production
 * calculation.
 */
export function cometActivity(rAu: number): number {
  if (!Number.isFinite(rAu) || rAu <= 0) return 0;
  return Math.min(1, Math.pow(2.0 / rAu, 2));
}

export class CometEffects {
  readonly group = new THREE.Group();
  private coma: THREE.Sprite;
  private ion: THREE.Points;
  private dust: THREE.Points;
  private ionPos: Float32Array;
  private dustPos: Float32Array;
  private ionN = 500;
  private dustN = 800;
  private ionSeeds: Float32Array;
  private dustSeeds: Float32Array;
  private comaTex: THREE.CanvasTexture;

  constructor() {
    this.comaTex = makeRadialSprite(128, 1, 2.6, '#cfe8ff');
    this.coma = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.comaTex, color: '#dbeeff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
    this.group.add(this.coma);
    const rnd = mulberry32(4242);
    this.ionPos = new Float32Array(this.ionN * 3);
    this.dustPos = new Float32Array(this.dustN * 3);
    this.ionSeeds = new Float32Array(this.ionN * 4);
    this.dustSeeds = new Float32Array(this.dustN * 4);
    for (let i = 0; i < this.ionN; i++) { this.ionSeeds[i * 4] = Math.pow(rnd(), 1.3); this.ionSeeds[i * 4 + 1] = rnd() * 2 - 1; this.ionSeeds[i * 4 + 2] = rnd() * 2 - 1; this.ionSeeds[i * 4 + 3] = rnd(); }
    for (let i = 0; i < this.dustN; i++) { this.dustSeeds[i * 4] = Math.pow(rnd(), 1.1); this.dustSeeds[i * 4 + 1] = rnd() * 2 - 1; this.dustSeeds[i * 4 + 2] = rnd() * 2 - 1; this.dustSeeds[i * 4 + 3] = rnd(); }
    this.ion = this.makePoints(this.ionN, this.ionPos, [0.55, 0.75, 1.0], 1.6);
    this.dust = this.makePoints(this.dustN, this.dustPos, [1.0, 0.94, 0.8], 2.2);
    this.group.add(this.ion, this.dust);
  }

  private makePoints(n: number, pos: Float32Array, color: [number, number, number], size: number): THREE.Points {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const col = new Float32Array(n * 3), sz = new Float32Array(n), al = new Float32Array(n);
    for (let i = 0; i < n; i++) { col[i * 3] = color[0]; col[i * 3 + 1] = color[1]; col[i * 3 + 2] = color[2]; sz[i] = size; al[i] = 1; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(al, 1));
    const mat = createPointsMaterial({ soft: true, additive: true, attenuate: true, sizeScale: 1 });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }

  /**
   * @param nucleus scene position of the nucleus (origin-relative)
   * @param antiSun unit vector pointing away from the Sun (scene axes)
   * @param velDir unit velocity direction (scene axes)
   * @param rAu heliocentric distance in au
   */
  update(nucleus: THREE.Vector3, antiSun: THREE.Vector3, velDir: THREE.Vector3, rAu: number, mapping: ScaleMapping, pixelRatio: number, sizeScale: number, maxComa = Infinity): void {
    const act = cometActivity(rAu);
    const L = Math.max(1e-6, mapping.auToDisplay(rAu + 0.35 * act) - mapping.auToDisplay(rAu));
    // Coma radius in display units; clamped so compressed (exploration) scales do not turn it into a disc
    // rivalling the Sun.
    const comaSize = Math.min(maxComa, Math.max(mapping.auToDisplay(rAu + 0.012 * (0.3 + act)) - mapping.auToDisplay(rAu), 1e-6));
    this.group.visible = act > 0.02;
    this.coma.position.copy(nucleus);
    this.coma.scale.setScalar(comaSize * 2.2);
    (this.coma.material as THREE.SpriteMaterial).opacity = 0.25 + 0.6 * act;
    const side = new THREE.Vector3().crossVectors(antiSun, velDir).normalize();
    if (side.lengthSq() < 0.5) side.set(0, 1, 0);
    const up = new THREE.Vector3().crossVectors(side, antiSun).normalize();
    const spread = comaSize * 0.6;
    // Ion tail: straight, anti-sunward, narrow.
    for (let i = 0; i < this.ionN; i++) {
      const s = this.ionSeeds[i * 4], a = this.ionSeeds[i * 4 + 1], b = this.ionSeeds[i * 4 + 2];
      const len = s * L * 1.25;
      const w = spread * (0.3 + s * 1.8);
      const x = nucleus.x + antiSun.x * len + side.x * a * w + up.x * b * w;
      const y = nucleus.y + antiSun.y * len + side.y * a * w + up.y * b * w;
      const z = nucleus.z + antiSun.z * len + side.z * a * w + up.z * b * w;
      this.ionPos[i * 3] = x; this.ionPos[i * 3 + 1] = y; this.ionPos[i * 3 + 2] = z;
    }
    // Dust tail: broader, curving back along the orbit (lagging the nucleus).
    const back = velDir.clone().multiplyScalar(-1);
    for (let i = 0; i < this.dustN; i++) {
      const s = this.dustSeeds[i * 4], a = this.dustSeeds[i * 4 + 1], b = this.dustSeeds[i * 4 + 2];
      const len = s * L * 0.85;
      const curve = s * s * L * 0.55;
      const w = spread * (0.5 + s * 3.2);
      const x = nucleus.x + antiSun.x * len + back.x * curve + side.x * a * w + up.x * b * w;
      const y = nucleus.y + antiSun.y * len + back.y * curve + side.y * a * w + up.y * b * w;
      const z = nucleus.z + antiSun.z * len + back.z * curve + side.z * a * w + up.z * b * w;
      this.dustPos[i * 3] = x; this.dustPos[i * 3 + 1] = y; this.dustPos[i * 3 + 2] = z;
    }
    const ionAlpha = this.ion.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    const dustAlpha = this.dust.geometry.getAttribute('alpha') as THREE.BufferAttribute;
    for (let i = 0; i < this.ionN; i++) ionAlpha.setX(i, (1 - this.ionSeeds[i * 4]) * 0.55 * act);
    for (let i = 0; i < this.dustN; i++) dustAlpha.setX(i, (1 - this.dustSeeds[i * 4]) * 0.4 * act);
    ionAlpha.needsUpdate = true; dustAlpha.needsUpdate = true;
    (this.ion.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.dust.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    for (const p of [this.ion, this.dust]) {
      const m = p.material as THREE.ShaderMaterial;
      m.uniforms.pixelRatio.value = pixelRatio;
      // Point size grows gently with tail length; the shader adds distance attenuation on top,
      // so keep this small or the particles fuse into a saturated disc at overview distances.
      m.uniforms.sizeScale.value = sizeScale * THREE.MathUtils.clamp(L * 0.15, 0.3, 2.5);
    }
  }

  dispose(): void {
    this.comaTex.dispose();
    (this.coma.material as THREE.Material).dispose();
    this.ion.geometry.dispose(); (this.ion.material as THREE.Material).dispose();
    this.dust.geometry.dispose(); (this.dust.material as THREE.Material).dispose();
  }
}
