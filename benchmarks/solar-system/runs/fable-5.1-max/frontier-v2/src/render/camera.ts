import * as THREE from 'three';
import type { BodyId } from '../data/types';

export type Anchor = { type: 'body'; id: BodyId } | { type: 'point'; pos: THREE.Vector3 };

export interface ViewState {
  anchor: Anchor;
  theta: number;
  phi: number;
  distance: number;
  pan: THREE.Vector3;
}

export interface FlyOptions {
  theta?: number;
  phi?: number;
  distance?: number;
  duration?: number;
  /** Keep the current spherical offset (used by Follow / selection focus). */
  keepOffset?: boolean;
  instant?: boolean;
}

interface Transition {
  from: Anchor;
  fromPan: THREE.Vector3;
  to: Anchor;
  t: number;
  duration: number;
  theta0: number; phi0: number; dist0: number;
  theta1: number; phi1: number; dist1: number;
  onDone?: () => void;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Orbit camera anchored to a (moving) body, with floating-origin support.
 * The scene is rendered relative to `originWorld`, the display-space point
 * the camera currently orbits; the controller reports that point each frame.
 */
export class CameraController {
  readonly camera: THREE.PerspectiveCamera;
  anchor: Anchor = { type: 'body', id: 'sun' };
  theta = 0.6;      // azimuth (rad)
  phi = 1.05;       // polar angle from +Y (rad)
  distance = 60;
  pan = new THREE.Vector3();
  private tTheta = this.theta; private tPhi = this.phi; private tDistance = this.distance;
  minDistance = 0.01;
  maxDistance = 5000;
  private transition: Transition | null = null;
  /** Display-space position resolver for body anchors (absolute display coords). */
  resolve: (id: BodyId) => THREE.Vector3 | null = () => null;
  /** Called on any manual camera input (drag/zoom/keys). */
  onManualInput: (() => void) | null = null;
  onClick: ((x: number, y: number, ev: PointerEvent) => void) | null = null;
  onDoubleClick: ((x: number, y: number) => void) | null = null;
  onTransitionEnd: (() => void) | null = null;
  reducedMotion = false;
  autoRotate = false;
  /** Screen-space framing offset (px) so the target sits in the panel-free area. */
  frameOffsetPx = new THREE.Vector2();
  private originWorld = new THREE.Vector3();
  private lastInputAt = 0;
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number }>();
  private dragging = false;
  private dragMoved = false;
  private pinchDist = 0;
  private lastTap = 0;
  private el: HTMLElement;
  private dispose_: (() => void)[] = [];
  private viewport = { w: 1, h: 1 };

  constructor(el: HTMLElement, aspect: number) {
    this.el = el;
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.001, 1e6);
    this.bind();
  }

  get isTransitioning(): boolean { return this.transition !== null; }
  get origin(): THREE.Vector3 { return this.originWorld; }
  get idleSeconds(): number { return (performance.now() - this.lastInputAt) / 1000; }

  setViewport(w: number, h: number): void {
    this.viewport = { w, h };
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  private anchorPos(a: Anchor): THREE.Vector3 {
    if (a.type === 'point') return a.pos.clone();
    return this.resolve(a.id) ?? new THREE.Vector3();
  }

  /** Distance needed to fit a sphere of `radius` with a margin, considering aspect. */
  fitDistance(radius: number, margin = 1.35): number {
    const fovV = THREE.MathUtils.degToRad(this.camera.fov);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * this.camera.aspect);
    const f = Math.min(fovV, fovH);
    return (radius * margin) / Math.sin(f / 2);
  }

  flyTo(anchor: Anchor, opts: FlyOptions = {}): void {
    const keep = opts.keepOffset ?? false;
    const theta1 = opts.theta ?? (keep ? this.tTheta : this.theta);
    const phi1 = clamp(opts.phi ?? (keep ? this.tPhi : this.phi), 0.05, Math.PI - 0.05);
    const dist1 = clamp(opts.distance ?? this.tDistance, this.minDistance, this.maxDistance);
    const instant = opts.instant || this.reducedMotion;
    if (instant) {
      this.anchor = anchor;
      this.theta = this.tTheta = theta1; this.phi = this.tPhi = phi1; this.distance = this.tDistance = dist1;
      this.pan.set(0, 0, 0);
      this.transition = null;
      opts.duration = 0;
      this.onTransitionEnd?.();
      return;
    }
    // Estimate travel size for a sensible duration.
    const from = this.anchorPos(this.anchor).add(this.pan);
    const to = this.anchorPos(anchor);
    const travel = from.distanceTo(to) / Math.max(this.distance, 1e-6);
    const zoom = Math.abs(Math.log(dist1 / Math.max(this.distance, 1e-9)));
    const duration = opts.duration ?? clamp(0.7 + Math.log1p(travel) * 0.35 + zoom * 0.12, 0.7, 2.4);
    this.transition = {
      from: this.anchor, fromPan: this.pan.clone(), to: anchor, t: 0, duration,
      theta0: this.theta, phi0: this.phi, dist0: this.distance, theta1: this.shortestTheta(this.theta, theta1), phi1, dist1,
    };
    this.tTheta = theta1; this.tPhi = phi1; this.tDistance = dist1;
  }

  private shortestTheta(from: number, to: number): number {
    let d = (to - from) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
    return from + d;
  }

  cancelTransition(): void {
    if (!this.transition) return;
    // Adopt the destination anchor but keep current spherical values.
    this.anchor = this.transition.to;
    this.pan.set(0, 0, 0);
    this.tTheta = this.theta; this.tPhi = this.phi; this.tDistance = this.distance;
    this.transition = null;
  }

  /** Detach from the current body: keep looking at the same display point. */
  detach(): void {
    const p = this.anchorPos(this.anchor).add(this.pan);
    this.anchor = { type: 'point', pos: p };
    this.pan.set(0, 0, 0);
    this.transition = null;
  }

  rotateBy(dTheta: number, dPhi: number): void {
    this.tTheta += dTheta;
    this.tPhi = clamp(this.tPhi + dPhi, 0.05, Math.PI - 0.05);
    this.manual();
  }

  zoomBy(factor: number): void {
    this.tDistance = clamp(this.tDistance * factor, this.minDistance, this.maxDistance);
    this.manual();
  }

  panBy(dxPx: number, dyPx: number): void {
    const fovV = THREE.MathUtils.degToRad(this.camera.fov);
    const worldPerPx = (2 * this.distance * Math.tan(fovV / 2)) / this.viewport.h;
    const right = new THREE.Vector3(), up = new THREE.Vector3();
    this.camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
    this.pan.addScaledVector(right, -dxPx * worldPerPx).addScaledVector(up, dyPx * worldPerPx);
    const maxPan = this.distance * 2;
    if (this.pan.length() > maxPan) this.pan.setLength(maxPan);
    this.manual();
  }

  resetPan(): void { this.pan.set(0, 0, 0); }

  private manual(): void {
    this.lastInputAt = performance.now();
    if (this.transition) this.cancelTransition();
    this.onManualInput?.();
  }

  getView(): ViewState {
    return { anchor: this.anchor.type === 'body' ? { type: 'body', id: this.anchor.id } : { type: 'point', pos: this.anchor.pos.clone() }, theta: this.tTheta, phi: this.tPhi, distance: this.tDistance, pan: this.pan.clone() };
  }

  setView(v: ViewState, instant = false): void {
    this.flyTo(v.anchor, { theta: v.theta, phi: v.phi, distance: v.distance, instant });
    if (instant) this.pan.copy(v.pan);
  }

  /** Per-frame update. Returns the origin (display-space) to subtract from all objects. */
  update(dt: number): THREE.Vector3 {
    if (this.autoRotate && !this.transition && this.idleSeconds > 4 && !this.reducedMotion) this.tTheta += dt * 0.03;
    let target: THREE.Vector3;
    if (this.transition) {
      const tr = this.transition;
      tr.t = Math.min(1, tr.t + dt / tr.duration);
      const e = easeInOut(tr.t);
      const a = this.anchorPos(tr.from).add(tr.fromPan);
      const b = this.anchorPos(tr.to);
      target = a.lerp(b, e);
      this.theta = tr.theta0 + (tr.theta1 - tr.theta0) * e;
      this.phi = tr.phi0 + (tr.phi1 - tr.phi0) * e;
      // Interpolate distance in log space; add a slight rise for long travels.
      const lg = Math.log(tr.dist0) + (Math.log(tr.dist1) - Math.log(tr.dist0)) * e;
      const rise = Math.sin(Math.PI * tr.t) * Math.min(1.2, a.distanceTo(b) / Math.max(tr.dist1, 1e-6) * 0.15);
      this.distance = Math.exp(lg + rise);
      if (tr.t >= 1) {
        this.anchor = tr.to;
        this.pan.set(0, 0, 0);
        this.theta = tr.theta1; this.phi = tr.phi1; this.distance = tr.dist1;
        this.tTheta = tr.theta1; this.tPhi = tr.phi1; this.tDistance = tr.dist1;
        this.transition = null;
        target = this.anchorPos(this.anchor);
        this.onTransitionEnd?.();
      }
    } else {
      const k = 1 - Math.exp(-dt * 10);
      this.theta += (this.tTheta - this.theta) * k;
      this.phi += (this.tPhi - this.phi) * k;
      this.distance = Math.exp(Math.log(this.distance) + (Math.log(this.tDistance) - Math.log(this.distance)) * k);
      this.distance = clamp(this.distance, this.minDistance, this.maxDistance);
      if (Math.abs(this.tDistance - this.distance) < 1e-9) this.distance = this.tDistance;
      target = this.anchorPos(this.anchor).add(this.pan);
    }
    this.originWorld.copy(target);
    // Camera relative to origin: target is at (0,0,0) + frame offset.
    const sp = Math.sin(this.phi);
    const offset = new THREE.Vector3(this.distance * sp * Math.sin(this.theta), this.distance * Math.cos(this.phi), this.distance * sp * Math.cos(this.theta));
    this.camera.position.copy(offset);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    // Apply screen-space framing offset (shift camera and look target together).
    if (this.frameOffsetPx.lengthSq() > 0) {
      const fovV = THREE.MathUtils.degToRad(this.camera.fov);
      const worldPerPx = (2 * this.distance * Math.tan(fovV / 2)) / this.viewport.h;
      const right = new THREE.Vector3(), up = new THREE.Vector3();
      this.camera.updateMatrixWorld();
      this.camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
      const shift = right.multiplyScalar(-this.frameOffsetPx.x * worldPerPx).add(up.multiplyScalar(this.frameOffsetPx.y * worldPerPx));
      this.camera.position.add(shift);
    }
    // Dynamic clipping planes.
    this.camera.near = Math.max(1e-6, this.distance * 0.002);
    this.camera.far = Math.max(1e4, this.distance * 5e4);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    return this.originWorld;
  }

  /* ---------------- input ---------------- */

  private bind(): void {
    const el = this.el;
    const isUi = (ev: Event) => ev.target instanceof Element && !!ev.target.closest('.ui, .label-layer');
    const onDown = (ev: PointerEvent) => {
      if (isUi(ev)) return;
      if (ev.button !== 0 && ev.button !== 2) return;
      el.setPointerCapture(ev.pointerId);
      this.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY, sx: ev.clientX, sy: ev.clientY });
      this.dragging = true;
      this.dragMoved = false;
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onMove = (ev: PointerEvent) => {
      const p = this.pointers.get(ev.pointerId);
      if (!p || !this.dragging) return;
      const dx = ev.clientX - p.x, dy = ev.clientY - p.y;
      p.x = ev.clientX; p.y = ev.clientY;
      if (Math.hypot(ev.clientX - p.sx, ev.clientY - p.sy) > 6) this.dragMoved = true;
      if (this.pointers.size === 1) {
        if (!this.dragMoved) return;
        const pan = ev.buttons === 2 || ev.shiftKey;
        if (pan) this.panBy(dx, dy);
        else this.rotateBy(-dx * 0.0065, -dy * 0.0065);
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDist > 0 && d > 0) this.zoomBy(this.pinchDist / d);
        this.pinchDist = d;
        // Two-finger drag pans.
        this.panBy(dx * 0.5, dy * 0.5);
      }
    };
    const onUp = (ev: PointerEvent) => {
      const p = this.pointers.get(ev.pointerId);
      this.pointers.delete(ev.pointerId);
      try { el.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
      if (this.pointers.size === 0) this.dragging = false;
      if (p && !this.dragMoved && ev.button === 0 && this.pointers.size === 0) {
        const now = performance.now();
        if (now - this.lastTap < 320) { this.onDoubleClick?.(ev.clientX, ev.clientY); this.lastTap = 0; }
        else { this.onClick?.(ev.clientX, ev.clientY, ev); this.lastTap = now; }
      }
    };
    const onWheel = (ev: WheelEvent) => {
      if (isUi(ev)) return;
      ev.preventDefault();
      const delta = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
      this.zoomBy(Math.exp(clamp(delta, -120, 120) * 0.0022));
    };
    const onCtx = (ev: MouseEvent) => { if (!isUi(ev)) ev.preventDefault(); };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', onCtx);
    this.dispose_.push(() => {
      el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp); el.removeEventListener('wheel', onWheel); el.removeEventListener('contextmenu', onCtx);
    });
  }

  dispose(): void { for (const d of this.dispose_) d(); this.dispose_ = []; }
}
