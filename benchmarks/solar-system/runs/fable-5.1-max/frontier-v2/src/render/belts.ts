import * as THREE from 'three';
import { mulberry32 } from './noise';
import type { ScaleMapping } from '../sim/scale';
import { EXPLORATION, RELATIVE_UNITS_PER_AU } from '../sim/scale';

/**
 * Representative small-body populations (asteroid belt, Kuiper Belt) as GPU
 * point clouds. Each particle has its own seeded Keplerian elements and is
 * advanced with the simulation clock in the vertex shader, so the belt
 * rotates coherently with time and reverses correctly. The particles are
 * illustrative: they are not cataloged objects.
 */

const beltVert = /* glsl */ `
attribute vec4 elemA;   // a (au), e, inc, Omega
attribute vec3 elemB;   // omega, M0, size
uniform float days;
uniform float mode;     // 0 exploration, 1 relative
uniform float distA;
uniform float distExp;
uniform float unitsPerAu;
uniform vec3 origin;
uniform float pixelRatio;
uniform float sizeScale;
varying float vFade;
void main() {
  float a = elemA.x, e = elemA.y, inc = elemA.z, Om = elemA.w;
  float w = elemB.x, M0 = elemB.y;
  float n = 6.283185307 / (365.25 * pow(a, 1.5));
  float M = M0 + n * days;
  float E = M + e * sin(M);
  for (int i = 0; i < 4; i++) { E = E - (E - e * sin(E) - M) / (1.0 - e * cos(E)); }
  float xv = a * (cos(E) - e);
  float yv = a * sqrt(1.0 - e * e) * sin(E);
  float cw = cos(w), sw = sin(w), cO = cos(Om), sO = sin(Om), ci = cos(inc), si = sin(inc);
  vec3 ecl = vec3(
    (cw * cO - sw * sO * ci) * xv + (-sw * cO - cw * sO * ci) * yv,
    (cw * sO + sw * cO * ci) * xv + (-sw * sO + cw * cO * ci) * yv,
    (sw * si) * xv + (cw * si) * yv);
  float r = length(ecl);
  float rd = mode < 0.5 ? distA * pow(r, distExp) : unitsPerAu * r;
  vec3 disp = ecl * (rd / r);
  vec3 scenePos = vec3(disp.x, disp.z, -disp.y) - origin;
  vec4 mv = modelViewMatrix * vec4(scenePos, 1.0);
  float dist = max(-mv.z, 0.001);
  float s = elemB.z * sizeScale * pixelRatio * clamp(120.0 / dist, 0.35, 1.6);
  gl_PointSize = clamp(s, 0.6, 3.5);
  vFade = clamp(s / 1.2, 0.35, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const beltFrag = /* glsl */ `
uniform vec3 color;
uniform float opacity;
varying float vFade;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d) * 2.0;
  float a = smoothstep(1.0, 0.4, r) * opacity * vFade;
  gl_FragColor = vec4(color, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export interface BeltConfig {
  seed: number;
  count: number;
  aMin: number;
  aMax: number;
  eMax: number;
  incMaxDeg: number;
  color: string;
  opacity: number;
  sizeMin: number;
  sizeMax: number;
}

export class Belt {
  readonly points: THREE.Points;
  private mat: THREE.ShaderMaterial;
  private geo: THREE.BufferGeometry;
  private fullCount: number;

  constructor(cfg: BeltConfig) {
    const rnd = mulberry32(cfg.seed);
    const n = cfg.count;
    this.fullCount = n;
    const pos = new Float32Array(n * 3);
    const A = new Float32Array(n * 4), B = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // Weight toward the middle of the belt with soft edges.
      const t = (rnd() + rnd()) / 2;
      const a = cfg.aMin + (cfg.aMax - cfg.aMin) * t;
      const e = cfg.eMax * Math.sqrt(rnd()) * rnd();
      const inc = cfg.incMaxDeg * Math.PI / 180 * Math.pow(rnd(), 1.6);
      A[i * 4] = a; A[i * 4 + 1] = e; A[i * 4 + 2] = inc; A[i * 4 + 3] = rnd() * Math.PI * 2;
      B[i * 3] = rnd() * Math.PI * 2; B[i * 3 + 1] = rnd() * Math.PI * 2; B[i * 3 + 2] = cfg.sizeMin + (cfg.sizeMax - cfg.sizeMin) * Math.pow(rnd(), 2.5);
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('elemA', new THREE.BufferAttribute(A, 4));
    this.geo.setAttribute('elemB', new THREE.BufferAttribute(B, 3));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: beltVert, fragmentShader: beltFrag, transparent: true, depthWrite: false,
      uniforms: {
        days: { value: 0 }, mode: { value: 0 }, distA: { value: EXPLORATION.distA }, distExp: { value: EXPLORATION.distExp },
        unitsPerAu: { value: RELATIVE_UNITS_PER_AU }, origin: { value: new THREE.Vector3() }, pixelRatio: { value: 1 }, sizeScale: { value: 1 },
        color: { value: new THREE.Color(cfg.color) }, opacity: { value: cfg.opacity },
      },
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = -1;
  }

  update(daysSinceJ2000: number, mapping: ScaleMapping, origin: THREE.Vector3, pixelRatio: number): void {
    const u = this.mat.uniforms;
    u.days.value = daysSinceJ2000;
    u.mode.value = mapping.mode === 'relative' ? 1 : 0;
    u.origin.value.copy(origin);
    u.pixelRatio.value = pixelRatio;
  }

  /** Reduce the rendered population for low quality. */
  setDensity(fraction: number): void {
    this.geo.setDrawRange(0, Math.max(100, Math.floor(this.fullCount * fraction)));
  }

  set visible(v: boolean) { this.points.visible = v; }
  get visible(): boolean { return this.points.visible; }

  dispose(): void { this.geo.dispose(); this.mat.dispose(); }
}
