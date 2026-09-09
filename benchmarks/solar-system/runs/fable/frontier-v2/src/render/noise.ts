/**
 * Seeded pseudo-random numbers and 3D gradient noise for procedural textures.
 * Pure functions: safe to use inside a Web Worker.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAD: number[][] = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
  [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, -1, -1],
];

function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

export class Noise3 {
  private perm = new Uint8Array(512);

  constructor(seed: number) {
    const rnd = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  /** Perlin gradient noise in roughly [-1, 1]. */
  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    const xf = x - X, yf = y - Y, zf = z - Z;
    const xi = X & 255, yi = Y & 255, zi = Z & 255;
    const u = fade(xf), v = fade(yf), w = fade(zf);
    const p = this.perm;
    const aaa = p[p[p[xi] + yi] + zi], aba = p[p[p[xi] + yi + 1] + zi], aab = p[p[p[xi] + yi] + zi + 1], abb = p[p[p[xi] + yi + 1] + zi + 1];
    const baa = p[p[p[xi + 1] + yi] + zi], bba = p[p[p[xi + 1] + yi + 1] + zi], bab = p[p[p[xi + 1] + yi] + zi + 1], bbb = p[p[p[xi + 1] + yi + 1] + zi + 1];
    const g = (h: number, dx: number, dy: number, dz: number) => { const gr = GRAD[h & 15]; return gr[0] * dx + gr[1] * dy + gr[2] * dz; };
    const x1 = lerp(g(aaa, xf, yf, zf), g(baa, xf - 1, yf, zf), u);
    const x2 = lerp(g(aba, xf, yf - 1, zf), g(bba, xf - 1, yf - 1, zf), u);
    const y1 = lerp(x1, x2, v);
    const x3 = lerp(g(aab, xf, yf, zf - 1), g(bab, xf - 1, yf, zf - 1), u);
    const x4 = lerp(g(abb, xf, yf - 1, zf - 1), g(bbb, xf - 1, yf - 1, zf - 1), u);
    const y2 = lerp(x3, x4, v);
    return lerp(y1, y2, w) * 1.15;
  }

  /** Fractal Brownian motion, roughly [-1, 1]. */
  fbm(x: number, y: number, z: number, octaves = 5, lacunarity = 2.0, gain = 0.5): number {
    let sum = 0, amp = 1, norm = 0, f = 1;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.noise(x * f, y * f, z * f);
      norm += amp;
      amp *= gain;
      f *= lacunarity;
    }
    return sum / norm;
  }

  /** Ridged multifractal in [0, 1]: sharp creases. */
  ridged(x: number, y: number, z: number, octaves = 4, lacunarity = 2.0, gain = 0.5): number {
    let sum = 0, amp = 1, norm = 0, f = 1;
    for (let i = 0; i < octaves; i++) {
      const n = 1 - Math.abs(this.noise(x * f, y * f, z * f));
      sum += amp * n * n;
      norm += amp;
      amp *= gain;
      f *= lacunarity;
    }
    return sum / norm;
  }

  /** Turbulence (abs-sum) in [0, 1]. */
  turbulence(x: number, y: number, z: number, octaves = 4): number {
    let sum = 0, amp = 1, norm = 0, f = 1;
    for (let i = 0; i < octaves; i++) {
      sum += amp * Math.abs(this.noise(x * f, y * f, z * f));
      norm += amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  }
}

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
