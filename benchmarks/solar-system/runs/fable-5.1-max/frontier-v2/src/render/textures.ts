import * as THREE from 'three';
import type { BodyDef, RingSpec } from '../data/types';
import { generate, generateRingProfile, type TexRequest, type TexResult } from './texgen';

export interface BodyTextures {
  width: number;
  map: THREE.DataTexture;
  normal?: THREE.DataTexture;
  night?: THREE.DataTexture;
  clouds?: THREE.DataTexture;
}

interface Pending { resolve: (r: TexResult) => void; reject: (e: unknown) => void }
interface Job { id: number; req: TexRequest; priority: number; pending: Pending }

function needsNormal(def: BodyDef): boolean {
  return ['mercury', 'moon', 'mars', 'icy', 'rocky', 'dwarf', 'asteroid', 'comet', 'charon', 'earth'].includes(def.appearance.texture);
}

/**
 * Generates and caches procedural textures, preferring a Web Worker so the
 * main thread stays responsive. Falls back to chunked main-thread work.
 */
export class TextureFactory {
  private worker: Worker | null = null;
  private seq = 1;
  private inflight = new Map<number, Pending>();
  private queue: Job[] = [];
  private busy = false;
  private cache = new Map<string, BodyTextures>();
  private promises = new Map<string, Promise<BodyTextures>>();
  readonly anisotropy: number;
  disposed = false;

  constructor(anisotropy = 4) {
    this.anisotropy = anisotropy;
    try {
      this.worker = new Worker(new URL('./texture.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (ev: MessageEvent<{ id: number; ok: boolean; res?: TexResult; error?: string }>) => {
        const p = this.inflight.get(ev.data.id);
        if (!p) return;
        this.inflight.delete(ev.data.id);
        if (ev.data.ok && ev.data.res) p.resolve(ev.data.res); else p.reject(new Error(ev.data.error ?? 'texture generation failed'));
        this.busy = false;
        this.pump();
      };
      this.worker.onerror = () => {
        // Worker broke: reject in-flight jobs and fall back to main thread.
        for (const p of this.inflight.values()) p.reject(new Error('worker error'));
        this.inflight.clear();
        this.worker?.terminate();
        this.worker = null;
        this.busy = false;
        this.pump();
      };
    } catch {
      this.worker = null;
    }
  }

  get usingWorker(): boolean { return this.worker !== null; }

  private pump(): void {
    if (this.busy || this.disposed) return;
    const job = this.queue.sort((a, b) => b.priority - a.priority).shift();
    if (!job) return;
    this.busy = true;
    if (this.worker) {
      this.inflight.set(job.id, job.pending);
      this.worker.postMessage({ id: job.id, req: job.req });
    } else {
      setTimeout(() => {
        try { job.pending.resolve(generate(job.req)); } catch (e) { job.pending.reject(e); }
        this.busy = false;
        this.pump();
      }, 0);
    }
  }

  private generateAsync(req: TexRequest, priority: number): Promise<TexResult> {
    return new Promise<TexResult>((resolve, reject) => {
      this.queue.push({ id: this.seq++, req, priority, pending: { resolve, reject } });
      this.pump();
    });
  }

  private toTexture(data: Uint8ClampedArray, w: number, h: number, srgb: boolean): THREE.DataTexture {
    const tex = new THREE.DataTexture(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = this.anisotropy;
    tex.flipY = true;
    tex.needsUpdate = true;
    return tex;
  }

  /** Get (or build) textures for a body at a given width. Cached per body+width. */
  request(def: BodyDef, width: number, priority = 0): Promise<BodyTextures> {
    const key = `${def.id}@${width}`;
    const cached = this.cache.get(key);
    if (cached) return Promise.resolve(cached);
    const existing = this.promises.get(key);
    if (existing) return existing;
    const req: TexRequest = {
      kind: def.appearance.texture, seed: def.appearance.seed, w: width, h: width / 2,
      color: def.appearance.color, accent: def.appearance.accent ?? def.appearance.color,
      normal: needsNormal(def), night: !!def.appearance.nightLights, clouds: !!def.appearance.clouds,
    };
    const p = this.generateAsync(req, priority).then((res) => {
      const out: BodyTextures = { width, map: this.toTexture(res.map, res.w, res.h, true) };
      if (res.normal) out.normal = this.toTexture(res.normal, res.w, res.h, false);
      if (res.night) out.night = this.toTexture(res.night, res.w, res.h, true);
      if (res.clouds) out.clouds = this.toTexture(res.clouds, res.w, res.h, true);
      if (this.disposed) { disposeBodyTextures(out); throw new Error('disposed'); }
      this.cache.set(key, out);
      this.promises.delete(key);
      return out;
    });
    this.promises.set(key, p);
    return p;
  }

  has(def: BodyDef, width: number): boolean { return this.cache.has(`${def.id}@${width}`); }

  /** 1-D radial ring profile texture. Synchronous (cheap). */
  ringTexture(spec: RingSpec, seed: number): { tex: THREE.DataTexture; innerKm: number; outerKm: number } {
    const width = 1024;
    const { data, innerKm, outerKm } = generateRingProfile(spec.bands, width, seed);
    const tex = new THREE.DataTexture(new Uint8Array(data.buffer), width, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return { tex, innerKm, outerKm };
  }

  dispose(): void {
    this.disposed = true;
    this.worker?.terminate();
    this.worker = null;
    for (const t of this.cache.values()) disposeBodyTextures(t);
    this.cache.clear();
    this.queue = [];
  }
}

export function disposeBodyTextures(t: BodyTextures): void {
  t.map.dispose(); t.normal?.dispose(); t.night?.dispose(); t.clouds?.dispose();
}

/** Radial soft sprite (glow / coma / star) as a canvas texture. */
export function makeRadialSprite(size = 128, inner = 1, falloff = 2.2, color = '#ffffff'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const rgb = color.replace('#', '');
  const r = parseInt(rgb.slice(0, 2), 16), g = parseInt(rgb.slice(2, 4), 16), b = parseInt(rgb.slice(4, 6), 16);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + 0.5) / size - 0.5, dy = (y + 0.5) / size - 0.5;
    const d = Math.min(1, Math.hypot(dx, dy) * 2);
    const a = Math.pow(Math.max(0, 1 - d), falloff) * inner;
    const o = (y * size + x) * 4;
    img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = Math.min(255, a * 255);
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
