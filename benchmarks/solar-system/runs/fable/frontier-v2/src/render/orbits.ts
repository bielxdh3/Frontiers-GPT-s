import * as THREE from 'three';
import { BODIES, BODY_MAP } from '../data/bodies';
import type { BodyDef, BodyId } from '../data/types';
import { sampleOrbitPath } from '../sim/kepler';
import type { Vec3 } from '../sim/kepler';
import { sampleMoonPath, sampleSatellitePath, type SystemState } from '../sim/ephemeris';
import type { ScaleMapping } from '../sim/scale';
import { eclToScene } from '../sim/scale';

const SEGMENTS = 256;

interface OrbitEntry {
  def: BodyDef;
  line: THREE.Line;
  mat: THREE.LineBasicMaterial;
  sampledJd: number;
  mode: string;
  kind: 'helio' | 'moon' | 'satellite';
}

/** Orbit paths for heliocentric bodies and curated satellites, in display space. */
export class OrbitLines {
  readonly group = new THREE.Group();
  private entries = new Map<BodyId, OrbitEntry>();

  constructor() {
    for (const def of BODIES) {
      if (def.level !== 'simulated' || def.id === 'sun') continue;
      const kind: OrbitEntry['kind'] = def.orbit ? 'helio' : def.id === 'moon' ? 'moon' : def.satellite ? 'satellite' : 'helio';
      if (!def.orbit && !def.satellite && def.id !== 'moon') continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEGMENTS + 1) * 3), 3));
      const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(def.appearance.color), transparent: true, opacity: 0.35, depthWrite: false });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.renderOrder = -2;
      this.group.add(line);
      this.entries.set(def.id, { def, line, mat, sampledJd: NaN, mode: '', kind });
    }
  }

  private fill(entry: OrbitEntry, pts: Vec3[], mapper: (p: Vec3) => Vec3): void {
    const attr = entry.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    const n = Math.min(pts.length, SEGMENTS + 1);
    for (let i = 0; i < n; i++) {
      const s = eclToScene(mapper(pts[i]));
      attr.setXYZ(i, s.x, s.y, s.z);
    }
    for (let i = n; i <= SEGMENTS; i++) { const s = eclToScene(mapper(pts[pts.length - 1])); attr.setXYZ(i, s.x, s.y, s.z); }
    attr.needsUpdate = true;
    entry.line.geometry.computeBoundingSphere();
  }

  /**
   * Update geometry (lazily) and placement.
   * @param visibleIds which orbits to show this frame
   * @param displayPos display positions (absolute, before origin shift) of all bodies
   */
  update(jd: number, mapping: ScaleMapping, state: SystemState, displayPos: Map<BodyId, THREE.Vector3>, origin: THREE.Vector3, visibleIds: Set<BodyId>, selected: BodyId | null, highContrast: boolean): void {
    for (const [id, e] of this.entries) {
      const vis = visibleIds.has(id);
      e.line.visible = vis;
      if (!vis) continue;
      const modeKey = mapping.mode;
      if (e.kind === 'helio') {
        if (e.mode !== modeKey || !Number.isFinite(e.sampledJd) || Math.abs(jd - e.sampledJd) > 120) {
          this.fill(e, sampleOrbitPath(e.def.orbit!, jd, SEGMENTS), (p) => mapping.helioPosition(p));
          e.sampledJd = jd; e.mode = modeKey;
        }
        e.line.position.copy(origin).multiplyScalar(-1);
      } else if (e.kind === 'moon') {
        if (e.mode !== modeKey || !Number.isFinite(e.sampledJd) || Math.abs(jd - e.sampledJd) > 4) {
          this.fill(e, sampleMoonPath(jd, SEGMENTS), (p) => mapping.satelliteOffset(e.def, p));
          e.sampledJd = jd; e.mode = modeKey;
        }
        const parent = displayPos.get('earth');
        if (parent) e.line.position.copy(parent).sub(origin);
      } else {
        if (e.mode !== modeKey) {
          this.fill(e, sampleSatellitePath(e.def.id, SEGMENTS), (p) => mapping.satelliteOffset(e.def, p));
          e.sampledJd = jd; e.mode = modeKey;
        }
        const parent = displayPos.get(e.def.parent!);
        if (parent) e.line.position.copy(parent).sub(origin);
      }
      const sel = id === selected;
      const st = state.get(id);
      const outside = st && !st.withinValidity;
      e.mat.opacity = (sel ? 0.85 : highContrast ? 0.6 : 0.32) * (outside ? 0.5 : 1);
    }
  }

  setVisibleAll(v: boolean): void { this.group.visible = v; }

  dispose(): void {
    for (const e of this.entries.values()) { e.line.geometry.dispose(); e.mat.dispose(); }
  }
}

/* ------------------------------------------------------------------ */
/* Motion trails: sampled physical positions over a time window        */
/* ------------------------------------------------------------------ */

const TRAIL_MAX = 240;

interface Trail {
  id: BodyId;
  relative: boolean; // parent-relative for moons
  pts: Vec3[];       // km (ecliptic), oldest first
  jds: number[];
  line: THREE.Line;
  mat: THREE.LineBasicMaterial;
}

export class Trails {
  readonly group = new THREE.Group();
  private trails = new Map<BodyId, Trail>();
  private lastJd = NaN;
  windowDays = 30;

  private ensure(id: BodyId): Trail {
    let t = this.trails.get(id);
    if (t) return t;
    const def = BODY_MAP[id];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 3), 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    this.group.add(line);
    t = { id, relative: def.kind === 'moon', pts: [], jds: [], line, mat };
    this.trails.set(id, t);
    return t;
  }

  /** Discontinuous date change: discard stale history. */
  invalidate(): void {
    for (const t of this.trails.values()) { t.pts.length = 0; t.jds.length = 0; t.line.geometry.setDrawRange(0, 0); }
    this.lastJd = NaN;
  }

  update(jd: number, state: SystemState, ids: BodyId[], mapping: ScaleMapping, displayPos: Map<BodyId, THREE.Vector3>, origin: THREE.Vector3): void {
    const step = this.windowDays / (TRAIL_MAX - 20);
    const idSet = new Set(ids);
    for (const [id, t] of this.trails) t.line.visible = idSet.has(id);
    const shouldSample = !Number.isFinite(this.lastJd) || Math.abs(jd - this.lastJd) >= step;
    for (const id of ids) {
      const t = this.ensure(id);
      const st = state.get(id);
      if (!st) continue;
      if (shouldSample) {
        // Drop samples outside the window in either time direction.
        const p = t.relative ? st.parentRel : st.pos;
        if (t.jds.length && Math.abs(jd - t.jds[t.jds.length - 1]) > step * 4) { t.pts.length = 0; t.jds.length = 0; }
        t.pts.push({ ...p }); t.jds.push(jd);
        while (t.pts.length > TRAIL_MAX || (t.jds.length && Math.abs(jd - t.jds[0]) > this.windowDays)) { t.pts.shift(); t.jds.shift(); }
      }
      const posAttr = t.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = t.line.geometry.getAttribute('color') as THREE.BufferAttribute;
      const def = BODY_MAP[id];
      const base = new THREE.Color(def.appearance.color);
      const n = t.pts.length;
      for (let i = 0; i < n; i++) {
        const d = t.relative ? mapping.satelliteOffset(def, t.pts[i]) : mapping.helioPosition(t.pts[i]);
        const s = eclToScene(d);
        posAttr.setXYZ(i, s.x, s.y, s.z);
        const f = n > 1 ? (i / (n - 1)) : 1;
        colAttr.setXYZ(i, base.r * f, base.g * f, base.b * f);
      }
      posAttr.needsUpdate = true; colAttr.needsUpdate = true;
      t.line.geometry.setDrawRange(0, n);
      if (t.relative) {
        const parent = displayPos.get(def.parent!);
        if (parent) t.line.position.copy(parent).sub(origin);
      } else {
        t.line.position.copy(origin).multiplyScalar(-1);
      }
    }
    if (shouldSample) this.lastJd = jd;
  }

  dispose(): void {
    for (const t of this.trails.values()) { t.line.geometry.dispose(); t.mat.dispose(); }
  }
}
