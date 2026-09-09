/**
 * Procedural equirectangular texture synthesis for every catalog body.
 * DOM-free so it can run inside a Web Worker. All appearances are
 * illustrative reconstructions built from noise plus a few hand-placed
 * large-scale features (continents, maria, bands, storms) chosen so each
 * world remains recognizable.
 *
 * Output RGBA: color in RGB, and a gloss/specular mask in A for the surface
 * shader (oceans reflect, rock does not).
 */
import type { TextureKind } from '../data/types';
import { Noise3, clamp01, mix, mulberry32, smoothstep } from './noise';

export interface TexRequest {
  kind: TextureKind;
  seed: number;
  w: number;
  h: number;
  color: string;
  accent: string;
  /** Requested extra layers. */
  normal?: boolean;
  night?: boolean;
  clouds?: boolean;
}

export interface TexResult {
  w: number;
  h: number;
  map: Uint8ClampedArray;
  normal?: Uint8ClampedArray;
  night?: Uint8ClampedArray;
  clouds?: Uint8ClampedArray;
}

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const mul = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const DEG = Math.PI / 180;

interface Px { x: number; y: number; z: number; lon: number; lat: number; u: number; v: number; ix: number; iy: number }

function forEachPixel(w: number, h: number, fn: (p: Px) => void): void {
  const p: Px = { x: 0, y: 0, z: 0, lon: 0, lat: 0, u: 0, v: 0, ix: 0, iy: 0 };
  for (let iy = 0; iy < h; iy++) {
    const v = (iy + 0.5) / h;
    const lat = (0.5 - v) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let ix = 0; ix < w; ix++) {
      const u = (ix + 0.5) / w;
      const lon = (u - 0.5) * 2 * Math.PI;
      p.x = cl * Math.cos(lon); p.y = cl * Math.sin(lon); p.z = sl;
      p.lon = lon; p.lat = lat; p.u = u; p.v = v; p.ix = ix; p.iy = iy;
      fn(p);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Craters and relief                                                  */
/* ------------------------------------------------------------------ */

interface Crater { lon: number; lat: number; rho: number; depth: number; rim: number; bright: number; rays: boolean }

function makeCraters(seed: number, count: number, rhoMinDeg: number, rhoMaxDeg: number, brightFraction = 0.25): Crater[] {
  const rnd = mulberry32(seed * 7919 + 13);
  const out: Crater[] = [];
  for (let i = 0; i < count; i++) {
    const r = rnd();
    const rho = (rhoMinDeg + (rhoMaxDeg - rhoMinDeg) * Math.pow(r, 3)) * DEG;
    const lat = Math.asin(rnd() * 2 - 1);
    const lon = (rnd() * 2 - 1) * Math.PI;
    const young = rnd() < brightFraction;
    out.push({ lon, lat, rho, depth: 0.35 + rnd() * 0.5, rim: 0.25 + rnd() * 0.3, bright: young ? 0.6 + rnd() * 0.5 : 0, rays: young && rnd() < 0.3 });
  }
  return out;
}

/** Rasterize craters into a height field (H) and an albedo multiplier field (A). */
function rasterCraters(craters: Crater[], w: number, h: number, H: Float32Array, A: Float32Array, scale = 1): void {
  for (const c of craters) {
    const rho = c.rho;
    const latMin = Math.max(-Math.PI / 2, c.lat - rho * 2.2), latMax = Math.min(Math.PI / 2, c.lat + rho * 2.2);
    const yMin = Math.max(0, Math.floor((0.5 - latMax / Math.PI) * h)), yMax = Math.min(h - 1, Math.ceil((0.5 - latMin / Math.PI) * h));
    const cosc = Math.cos(c.lat);
    const fullLon = latMax >= Math.PI / 2 - 1e-3 || latMin <= -Math.PI / 2 + 1e-3 || cosc < 0.05;
    const dLon = fullLon ? Math.PI : Math.min(Math.PI, (rho * 2.2) / cosc);
    const cx = Math.cos(c.lon) * cosc, cy = Math.sin(c.lon) * cosc, cz = Math.sin(c.lat);
    for (let iy = yMin; iy <= yMax; iy++) {
      const lat = (0.5 - (iy + 0.5) / h) * Math.PI;
      const cl = Math.cos(lat), sl = Math.sin(lat);
      const xMinF = ((c.lon - dLon) / (2 * Math.PI) + 0.5) * w, xMaxF = ((c.lon + dLon) / (2 * Math.PI) + 0.5) * w;
      const x0 = Math.floor(xMinF), x1 = Math.ceil(xMaxF);
      for (let ixr = x0; ixr <= x1; ixr++) {
        const ix = ((ixr % w) + w) % w;
        const lon = ((ix + 0.5) / w - 0.5) * 2 * Math.PI;
        const d = cl * Math.cos(lon) * cx + cl * Math.sin(lon) * cy + sl * cz;
        const ang = Math.acos(Math.min(1, Math.max(-1, d)));
        const s = ang / rho;
        if (s > 2.2) continue;
        const idx = iy * w + ix;
        const bowl = s < 1 ? -c.depth * (1 - s * s) : 0;
        const rim = c.rim * Math.exp(-(((s - 1) / 0.18) ** 2));
        H[idx] += (bowl + rim) * scale * (rho / (6 * DEG));
        let alb = 1;
        if (s < 0.8) alb *= 0.9 + 0.1 * s;
        alb *= 1 + 0.18 * Math.exp(-(((s - 1) / 0.2) ** 2));
        if (c.bright > 0) {
          const ej = s > 1 ? Math.exp(-(s - 1) * (c.rays ? 1.2 : 2.5)) : 0.6;
          alb *= 1 + c.bright * 0.35 * ej;
        }
        A[idx] *= alb;
      }
    }
  }
}

function normalMapFromHeight(H: Float32Array, w: number, h: number, strength: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4);
  for (let iy = 0; iy < h; iy++) {
    const lat = (0.5 - (iy + 0.5) / h) * Math.PI;
    const cl = Math.max(0.15, Math.cos(lat));
    const yUp = Math.max(0, iy - 1), yDn = Math.min(h - 1, iy + 1);
    for (let ix = 0; ix < w; ix++) {
      const xL = (ix - 1 + w) % w, xR = (ix + 1) % w;
      const dHdx = (H[iy * w + xR] - H[iy * w + xL]) * 0.5 * (w / (2 * Math.PI)) / cl;
      const dHdy = (H[yUp * w + ix] - H[yDn * w + ix]) * 0.5 * (h / Math.PI); // north positive
      let nx = -dHdx * strength, ny = -dHdy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const o = (iy * w + ix) * 4;
      out[o] = (nx * 0.5 + 0.5) * 255; out[o + 1] = (ny * 0.5 + 0.5) * 255; out[o + 2] = (nz * 0.5 + 0.5) * 255; out[o + 3] = 255;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Ellipse helper for hand-placed features                             */
/* ------------------------------------------------------------------ */

interface Ell { lon: number; lat: number; rx: number; ry: number; rot: number }
const E = (lon: number, lat: number, rx: number, ry: number, rot = 0): Ell => ({ lon: lon * DEG, lat: lat * DEG, rx: rx * DEG, ry: ry * DEG, rot: rot * DEG });

/** 1 at ellipse center → 0 at edge → negative outside. */
function ellipseField(p: Px, e: Ell): number {
  let dLon = p.lon - e.lon;
  if (dLon > Math.PI) dLon -= 2 * Math.PI; else if (dLon < -Math.PI) dLon += 2 * Math.PI;
  const dx = dLon * Math.cos(e.lat), dy = p.lat - e.lat;
  const cr = Math.cos(e.rot), sr = Math.sin(e.rot);
  const rx = dx * cr - dy * sr, ry = dx * sr + dy * cr;
  return 1 - Math.hypot(rx / e.rx, ry / e.ry);
}

const EARTH_LAND: Ell[] = [
  E(-102, 50, 36, 20, 12), E(-78, 41, 14, 13), E(-150, 64, 13, 8), E(-92, 16, 8, 10, -35), E(-105, 25, 10, 9),
  E(-60, -12, 16, 26, -18), E(-66, 4, 16, 10), E(-42, 74, 13, 9),
  E(18, 52, 22, 11), E(17, 64, 8, 9), E(-3, 54, 3, 6), E(18, 8, 22, 28), E(10, 22, 30, 11), E(46, 23, 11, 9),
  E(88, 52, 60, 20), E(110, 66, 48, 9), E(78, 20, 9, 13), E(103, 14, 11, 9), E(112, 32, 18, 13), E(138, 37, 3, 8, 20),
  E(117, -3, 22, 4), E(134, -25, 19, 12), E(172, -42, 3, 6, 20), E(47, -20, 3, 7),
];

const EARTH_CITIES: { lon: number; lat: number; r: number; w: number }[] = [
  { lon: -78, lat: 40, r: 11, w: 1 }, { lon: -120, lat: 37, r: 8, w: 0.7 }, { lon: -98, lat: 33, r: 10, w: 0.5 },
  { lon: 8, lat: 50, r: 13, w: 1 }, { lon: 30, lat: 55, r: 12, w: 0.4 }, { lon: 78, lat: 22, r: 11, w: 0.9 }, { lon: 116, lat: 33, r: 12, w: 1 },
  { lon: 137, lat: 36, r: 5, w: 1 }, { lon: -45, lat: -22, r: 8, w: 0.7 }, { lon: 31, lat: 29, r: 4, w: 0.8 }, { lon: 28, lat: -27, r: 5, w: 0.5 },
  { lon: 149, lat: -34, r: 5, w: 0.6 }, { lon: 3, lat: 7, r: 6, w: 0.4 }, { lon: 100, lat: 14, r: 6, w: 0.5 }, { lon: 107, lat: -6, r: 5, w: 0.5 },
];

/* ------------------------------------------------------------------ */
/* Generators                                                          */
/* ------------------------------------------------------------------ */

export function generate(req: TexRequest): TexResult {
  const { w, h, seed, kind } = req;
  const map = new Uint8ClampedArray(w * h * 4);
  const n = new Noise3(seed);
  const n2 = new Noise3(seed + 101);
  const base = hexToRgb(req.color);
  const accent = hexToRgb(req.accent || req.color);
  const result: TexResult = { w, h, map };
  const put = (p: Px, rgb: RGB, a = 0.05) => {
    const o = (p.iy * w + p.ix) * 4;
    map[o] = rgb[0]; map[o + 1] = rgb[1]; map[o + 2] = rgb[2]; map[o + 3] = a * 255;
  };

  const relief = (craterCount: number, rhoMin: number, rhoMax: number, terrainAmp: number, strength: number, brightFrac = 0.25): { H: Float32Array; A: Float32Array } => {
    const H = new Float32Array(w * h);
    const A = new Float32Array(w * h).fill(1);
    if (terrainAmp > 0) forEachPixel(w, h, (p) => { H[p.iy * w + p.ix] = terrainAmp * n2.fbm(p.x * 3, p.y * 3, p.z * 3, 5); });
    rasterCraters(makeCraters(seed, Math.round(craterCount * (w / 1024 + 0.35)), rhoMin, rhoMax, brightFrac), w, h, H, A);
    if (req.normal) result.normal = normalMapFromHeight(H, w, h, strength);
    return { H, A };
  };

  switch (kind) {
    case 'sun': {
      const hot: RGB = [255, 250, 225], mid: RGB = [255, 200, 90], lane: RGB = [225, 110, 20];
      const spots = makeCraters(seed, 9, 1.5, 4, 0);
      forEachPixel(w, h, (p) => {
        const g = n.ridged(p.x * 28, p.y * 28, p.z * 28, 3, 2.3, 0.55);
        const g2 = n2.fbm(p.x * 6, p.y * 6, p.z * 6, 3);
        let c = mixRgb(lane, mid, smoothstep(0.25, 0.7, g));
        c = mixRgb(c, hot, smoothstep(0.75, 0.98, g) * 0.8);
        c = mixRgb(c, mid, 0.15 + 0.15 * g2);
        for (const s of spots) {
          if (Math.abs(s.lat) > 35 * DEG || Math.abs(s.lat) < 6 * DEG) continue;
          const d = Math.acos(Math.min(1, p.x * Math.cos(s.lon) * Math.cos(s.lat) + p.y * Math.sin(s.lon) * Math.cos(s.lat) + p.z * Math.sin(s.lat)));
          const sp = d / (s.rho * 0.6);
          if (sp < 1.6) {
            const umbra = smoothstep(1.0, 0.5, sp), pen = smoothstep(1.6, 0.9, sp);
            c = mixRgb(c, [60, 20, 5], umbra * 0.9);
            c = mixRgb(c, [190, 90, 20], pen * (1 - umbra) * 0.6);
          }
        }
        put(p, c, 0);
      });
      break;
    }

    case 'mercury': {
      const { H, A } = relief(520, 0.6, 14, 0.06, 2.2, 0.2);
      const basin = E(30, 32, 22, 20);
      forEachPixel(w, h, (p) => {
        const i = p.iy * w + p.ix;
        const tone = 0.82 + 0.18 * n.fbm(p.x * 2.5, p.y * 2.5, p.z * 2.5, 4) + 0.5 * H[i];
        let c: RGB = mixRgb(accent, base, clamp01(tone));
        const b = ellipseField(p, basin);
        if (b > -0.15) c = mixRgb(c, [188, 178, 165], smoothstep(-0.15, 0.2, b) * 0.35);
        put(p, mul(c, A[i]), 0.04);
      });
      break;
    }

    case 'moon': {
      const { H, A } = relief(460, 0.7, 12, 0.05, 2.4, 0.3);
      const maria: Ell[] = [E(-16, 33, 15, 12), E(19, 27, 9, 8), E(31, 8, 10, 8), E(-56, 20, 22, 26, 15), E(-32, -5, 8, 6), E(37, 21, 5, 4), E(-12, 14, 5, 5), E(60, 16, 8, 6), E(-48, -20, 7, 5)];
      forEachPixel(w, h, (p) => {
        const i = p.iy * w + p.ix;
        const hl: RGB = [185, 181, 172], mare: RGB = [88, 86, 84];
        let m = -1;
        for (const e of maria) m = Math.max(m, ellipseField(p, e) + 0.18 * n.fbm(p.x * 4, p.y * 4, p.z * 4, 3));
        const isMare = smoothstep(-0.08, 0.1, m);
        const tone = 0.9 + 0.12 * n2.fbm(p.x * 5, p.y * 5, p.z * 5, 4) + 0.6 * H[i];
        let c = mixRgb(hl, mare, isMare);
        c = mul(c, clamp01(tone));
        put(p, mul(c, isMare > 0.5 ? 0.5 + 0.5 * A[i] : A[i]), 0.05);
      });
      break;
    }

    case 'mars': {
      const { H, A } = relief(160, 0.6, 9, 0.08, 1.6, 0.1);
      const dark: Ell[] = [E(70, 10, 14, 16), E(-30, 5, 18, 8), E(100, -20, 22, 8), E(-60, -25, 20, 8, 10)];
      const hellas = E(70, -42, 14, 11);
      forEachPixel(w, h, (p) => {
        const i = p.iy * w + p.ix;
        const ochre: RGB = [200, 120, 78], rust: RGB = [150, 78, 48], darkc: RGB = [96, 58, 42], ice: RGB = [240, 236, 228];
        const t = 0.5 + 0.5 * n.fbm(p.x * 3, p.y * 3, p.z * 3, 5);
        let c = mixRgb(rust, ochre, t);
        let dk = -1;
        for (const e of dark) dk = Math.max(dk, ellipseField(p, e) + 0.25 * n2.fbm(p.x * 5, p.y * 5, p.z * 5, 3));
        c = mixRgb(c, darkc, smoothstep(-0.1, 0.25, dk) * 0.75);
        const hb = ellipseField(p, hellas);
        if (hb > -0.2) c = mixRgb(c, [222, 170, 120], smoothstep(-0.2, 0.3, hb) * 0.5);
        const capN = smoothstep(78 * DEG, 84 * DEG, p.lat + 3 * DEG * n.fbm(p.x * 6, p.y * 6, p.z * 6, 2));
        const capS = smoothstep(-74 * DEG, -82 * DEG, p.lat + 3 * DEG * n2.fbm(p.x * 6, p.y * 6, p.z * 6, 2));
        c = mixRgb(c, ice, Math.max(capN, capS * 0.7));
        c = mul(c, clamp01(0.85 + 0.9 * H[i] + 0.15));
        put(p, mul(c, A[i]), 0.04);
      });
      break;
    }

    case 'venus': {
      forEachPixel(w, h, (p) => {
        const warp = n2.fbm(p.x * 2, p.y * 2, p.z * 2, 3);
        const band = n.fbm(p.x * 1.2 + warp * 0.8, p.y * 1.2 + warp * 0.8, p.z * 4.5, 4);
        const chevron = n.fbm(p.x * 3 + p.z * 2, p.y * 3 - p.z * 2, p.z * 2, 4);
        const t = 0.5 + 0.28 * band + 0.14 * chevron;
        const cream: RGB = [242, 222, 178], deep: RGB = [196, 160, 100];
        put(p, mixRgb(deep, cream, clamp01(t)), 0.15);
      });
      break;
    }

    case 'earth': {
      const H = new Float32Array(w * h);
      const landMask = new Float32Array(w * h);
      const night = req.night ? new Uint8ClampedArray(w * h * 4) : undefined;
      const clouds = req.clouds ? new Uint8ClampedArray(w * h * 4) : undefined;
      const deep: RGB = [10, 36, 82], shallow: RGB = [26, 92, 156], coastW: RGB = [60, 140, 180];
      const forest: RGB = [40, 96, 46], grass: RGB = [110, 138, 64], desert: RGB = [196, 170, 112], rock: RGB = [122, 112, 92], snow: RGB = [236, 240, 244], tundra: RGB = [150, 150, 128];
      forEachPixel(w, h, (p) => {
        const i = p.iy * w + p.ix;
        let e = -1;
        for (const el of EARTH_LAND) e = Math.max(e, ellipseField(p, el));
        const coast = 0.2 * n.fbm(p.x * 3, p.y * 3, p.z * 3, 4) + 0.08 * n2.fbm(p.x * 10, p.y * 10, p.z * 10, 3);
        const f = e + coast;
        const antarctic = p.lat < (-69 + 4 * n.fbm(p.x * 5, p.y * 5, p.z * 5, 2)) * DEG;
        const land = f > 0 || antarctic;
        landMask[i] = land ? 1 : 0;
        let c: RGB;
        let gloss = 0.05;
        if (!land) {
          const depth = clamp01(-f * 2.5);
          c = mixRgb(shallow, deep, smoothstep(0, 1, depth));
          c = mixRgb(coastW, c, smoothstep(0, 0.12, -f));
          gloss = 1;
          H[i] = 0;
          if (p.lat > 80 * DEG || (p.lat > 70 * DEG && n.fbm(p.x * 4, p.y * 4, p.z * 4, 2) > -0.2)) { c = mixRgb(c, snow, 0.9); gloss = 0.3; }
        } else {
          const elev = clamp01(0.25 + 0.55 * n2.fbm(p.x * 6, p.y * 6, p.z * 6, 5) + 0.6 * Math.max(0, f));
          H[i] = elev * 0.12;
          const absLat = Math.abs(p.lat) / DEG;
          const moisture = n.fbm(p.x * 2.4 + 7, p.y * 2.4, p.z * 2.4, 4);
          const temp = clamp01(1 - absLat / 70 - elev * 0.35);
          const desertness = smoothstep(0.05, 0.4, moisture * -1 + 0.15) * smoothstep(8, 18, absLat) * smoothstep(40, 28, absLat);
          c = mixRgb(grass, forest, smoothstep(0.3, 0.75, temp) * smoothstep(-0.2, 0.3, moisture));
          c = mixRgb(c, desert, desertness);
          c = mixRgb(c, tundra, smoothstep(0.35, 0.15, temp));
          c = mixRgb(c, rock, smoothstep(0.6, 0.85, elev) * 0.7);
          const snowy = Math.max(smoothstep(0.12, 0.0, temp), smoothstep(0.82, 0.95, elev), antarctic ? 1 : 0);
          c = mixRgb(c, snow, snowy);
          gloss = antarctic || snowy > 0.5 ? 0.3 : 0.06;
        }
        put(p, c, gloss);
        if (night) {
          let wgt = 0;
          if (land && !antarctic) {
            for (const ct of EARTH_CITIES) {
              let dLon = p.lon - ct.lon * DEG; if (dLon > Math.PI) dLon -= 2 * Math.PI; else if (dLon < -Math.PI) dLon += 2 * Math.PI;
              const d = Math.hypot(dLon * Math.cos(ct.lat * DEG), p.lat - ct.lat * DEG) / (ct.r * DEG);
              wgt = Math.max(wgt, ct.w * smoothstep(1, 0.2, d));
            }
            const speck = n2.fbm(p.x * 90, p.y * 90, p.z * 90, 2);
            const v = smoothstep(0.55 - wgt * 0.5, 0.75 - wgt * 0.3, speck) * (0.25 + wgt);
            const o = i * 4;
            night[o] = 255 * v; night[o + 1] = 215 * v; night[o + 2] = 140 * v; night[o + 3] = 255;
          } else { night[i * 4 + 3] = 255; }
        }
        if (clouds) {
          const warp = n2.fbm(p.x * 2, p.y * 2, p.z * 2, 3) * 0.6;
          const r = n.ridged(p.x * 3.2 + warp, p.y * 3.2 - warp, p.z * 3.2 + warp * 0.5, 4, 2.2, 0.55);
          const swirl = n.fbm(p.x * 7, p.y * 7, p.z * 7, 3);
          const latBias = 0.15 + 0.4 * Math.exp(-(((p.lat / DEG) / 12) ** 2)) + 0.35 * Math.exp(-((((Math.abs(p.lat) / DEG) - 52) / 16) ** 2)) + 0.15 * smoothstep(60, 80, Math.abs(p.lat) / DEG);
          const a = clamp01(smoothstep(0.42, 0.85, r + swirl * 0.18) * (0.55 + latBias));
          const o = i * 4;
          clouds[o] = 255; clouds[o + 1] = 255; clouds[o + 2] = 255; clouds[o + 3] = a * 255;
        }
      });
      if (req.normal) result.normal = normalMapFromHeight(H, w, h, 1.2);
      result.night = night; result.clouds = clouds;
      break;
    }

    case 'jupiter': {
      // Latitude → band color (belts dark, zones bright), plus turbulence and the Great Red Spot (illustrative position).
      const stops: [number, RGB][] = [
        [-90, [190, 170, 150]], [-70, [205, 185, 160]], [-58, [180, 140, 105]], [-48, [222, 205, 180]], [-38, [186, 140, 100]], [-30, [232, 215, 190]],
        [-22, [200, 150, 110]], [-14, [236, 222, 200]], [-7, [172, 120, 88]], [0, [238, 226, 205]], [7, [175, 125, 90]], [14, [240, 228, 206]],
        [22, [196, 148, 108]], [30, [228, 212, 190]], [40, [184, 140, 102]], [50, [218, 200, 176]], [62, [186, 150, 118]], [75, [204, 186, 164]], [90, [190, 172, 152]],
      ];
      const grs = E(18, -22, 12, 7);
      forEachPixel(w, h, (p) => {
        const warp = n.fbm(p.x * 4, p.y * 4, p.z * 9, 4) * 2.2 + n2.fbm(p.x * 12, p.y * 12, p.z * 24, 3) * 0.8;
        const latDeg = p.lat / DEG + warp;
        let c: RGB = stops[0][1];
        for (let k = 0; k < stops.length - 1; k++) {
          if (latDeg >= stops[k][0] && latDeg <= stops[k + 1][0]) {
            const t = smoothstep(stops[k][0], stops[k + 1][0], latDeg);
            c = mixRgb(stops[k][1], stops[k + 1][1], t);
            break;
          }
        }
        const fine = n2.fbm(p.x * 30, p.y * 30, p.z * 60, 3) * 0.06;
        c = mul(c, 1 + fine);
        const g = ellipseField(p, grs);
        if (g > -0.3) {
          const sw = n.fbm(p.x * 20, p.y * 20, p.z * 20, 3) * 0.15;
          const inner = smoothstep(-0.05, 0.35, g + sw);
          const ringC = smoothstep(-0.3, -0.05, g) * (1 - inner);
          c = mixRgb(c, [205, 95, 60], inner * 0.9);
          c = mixRgb(c, [240, 228, 210], ringC * 0.5);
        }
        put(p, c, 0.02);
      });
      break;
    }

    case 'saturn': {
      const stops: [number, RGB][] = [
        [-90, [150, 160, 170]], [-70, [190, 178, 150]], [-50, [214, 196, 158]], [-35, [228, 210, 168]], [-22, [208, 186, 140]], [-10, [236, 220, 178]],
        [0, [226, 208, 166]], [10, [238, 222, 180]], [22, [212, 190, 146]], [35, [230, 212, 170]], [50, [216, 198, 160]], [70, [186, 174, 150]], [90, [140, 150, 165]],
      ];
      forEachPixel(w, h, (p) => {
        const warp = n.fbm(p.x * 3, p.y * 3, p.z * 8, 3) * 1.3;
        const latDeg = p.lat / DEG + warp;
        let c: RGB = stops[0][1];
        for (let k = 0; k < stops.length - 1; k++) {
          if (latDeg >= stops[k][0] && latDeg <= stops[k + 1][0]) { c = mixRgb(stops[k][1], stops[k + 1][1], smoothstep(stops[k][0], stops[k + 1][0], latDeg)); break; }
        }
        c = mul(c, 1 + n2.fbm(p.x * 20, p.y * 20, p.z * 40, 3) * 0.035);
        put(p, c, 0.02);
      });
      break;
    }

    case 'uranus': {
      forEachPixel(w, h, (p) => {
        const band = n.fbm(p.x * 1.5, p.y * 1.5, p.z * 6, 3) * 0.03;
        const pole = smoothstep(40 * DEG, 80 * DEG, p.lat) * 0.06;
        const c = mul(mixRgb(base, [220, 240, 242], pole), 1 + band);
        put(p, c, 0.05);
      });
      break;
    }

    case 'neptune': {
      const spot = E(-30, -24, 9, 5);
      forEachPixel(w, h, (p) => {
        const warp = n.fbm(p.x * 3, p.y * 3, p.z * 7, 3) * 1.5;
        const latDeg = p.lat / DEG + warp;
        const band = 0.5 + 0.5 * Math.sin(latDeg * DEG * 5.5 + 0.7);
        let c = mixRgb(accent, base, 0.55 + 0.35 * band);
        const streak = n2.fbm(p.x * 9, p.y * 9, p.z * 40, 3);
        const streakMask = smoothstep(0.35, 0.6, streak) * smoothstep(60, 40, Math.abs(latDeg + 20)) ;
        c = mixRgb(c, [232, 240, 250], streakMask * 0.75);
        const s = ellipseField(p, spot);
        if (s > -0.2) c = mixRgb(c, [28, 44, 110], smoothstep(-0.1, 0.3, s) * 0.8);
        put(p, c, 0.05);
      });
      break;
    }

    case 'io': {
      const vents = makeCraters(seed, 26, 1.5, 5, 0);
      forEachPixel(w, h, (p) => {
        const t = n.fbm(p.x * 3, p.y * 3, p.z * 3, 4);
        const yellow: RGB = [222, 200, 96], orange: RGB = [200, 120, 50], white: RGB = [236, 232, 214], dark: RGB = [60, 40, 25];
        let c = mixRgb(yellow, orange, smoothstep(-0.2, 0.5, t));
        const frost = smoothstep(0.3, 0.6, n2.fbm(p.x * 6, p.y * 6, p.z * 6, 3));
        c = mixRgb(c, white, frost * 0.8);
        c = mixRgb(c, [170, 80, 40], smoothstep(50, 80, Math.abs(p.lat) / DEG) * 0.6);
        for (const v of vents) {
          const d = Math.acos(Math.min(1, p.x * Math.cos(v.lon) * Math.cos(v.lat) + p.y * Math.sin(v.lon) * Math.cos(v.lat) + p.z * Math.sin(v.lat)));
          const s = d / v.rho;
          if (s < 2.5) {
            c = mixRgb(c, dark, smoothstep(0.5, 0.1, s));
            c = mixRgb(c, [190, 60, 30], smoothstep(2.5, 0.6, s) * 0.55 * (1 - smoothstep(0.5, 0.1, s)));
          }
        }
        put(p, c, 0.03);
      });
      break;
    }

    case 'europa': {
      forEachPixel(w, h, (p) => {
        const ice: RGB = [226, 222, 210], brown: RGB = [160, 112, 86];
        let c = ice;
        const mottle = smoothstep(0.1, 0.5, n.fbm(p.x * 4, p.y * 4, p.z * 4, 4));
        c = mixRgb(c, [196, 176, 156], mottle * 0.6);
        let lines = 0;
        for (let k = 0; k < 3; k++) {
          const f = 3 + k * 2.5;
          const v = n2.noise(p.x * f + k * 7, p.y * f, p.z * f);
          lines = Math.max(lines, smoothstep(0.05, 0.0, Math.abs(v)) * (0.6 + 0.4 * (2 - k) / 2));
        }
        c = mixRgb(c, brown, lines * 0.85);
        put(p, c, 0.25);
      });
      break;
    }

    case 'titan': {
      forEachPixel(w, h, (p) => {
        const t = n.fbm(p.x * 2, p.y * 2, p.z * 2, 4);
        const dune = smoothstep(0.1, 0.4, n2.fbm(p.x * 5, p.y * 5, p.z * 5, 3)) * smoothstep(30, 10, Math.abs(p.lat) / DEG);
        let c = mixRgb(base, accent, 0.5 + 0.35 * t);
        c = mixRgb(c, [120, 90, 50], dune * 0.6);
        const lakes = smoothstep(0.35, 0.55, n.fbm(p.x * 8, p.y * 8, p.z * 8, 3)) * smoothstep(65, 80, p.lat / DEG);
        c = mixRgb(c, [70, 60, 50], lakes);
        put(p, c, 0.08);
      });
      break;
    }

    case 'triton': {
      forEachPixel(w, h, (p) => {
        const cells = n.ridged(p.x * 10, p.y * 10, p.z * 10, 3, 2.1, 0.5);
        const pinkIce: RGB = [232, 214, 206], tan: RGB = [190, 160, 140], darkStreak: RGB = [110, 92, 84];
        let c = mixRgb(tan, base, 0.5 + 0.3 * n2.fbm(p.x * 3, p.y * 3, p.z * 3, 3));
        c = mixRgb(c, [170, 145, 130], smoothstep(0.4, 0.75, cells) * 0.45);
        const capEdge = (-40 + 8 * n.fbm(p.x * 4, p.y * 4, p.z * 4, 2)) * DEG;
        const cap = smoothstep(capEdge + 8 * DEG, capEdge - 4 * DEG, p.lat);
        c = mixRgb(c, pinkIce, cap);
        const streaks = smoothstep(0.5, 0.75, n2.fbm(p.x * 14, p.y * 14, p.z * 14, 2)) * cap;
        c = mixRgb(c, darkStreak, streaks * 0.5);
        put(p, c, 0.2);
      });
      break;
    }

    case 'pluto': {
      const heartA = E(175, 20, 22, 20), heartB = E(200, 28, 14, 16);
      const cthulhu = E(-100, -8, 60, 12);
      forEachPixel(w, h, (p) => {
        const tan: RGB = [214, 184, 146], dark: RGB = [88, 58, 46], bright: RGB = [240, 236, 226];
        let c = mixRgb(tan, [170, 130, 100], 0.5 + 0.4 * n.fbm(p.x * 3, p.y * 3, p.z * 3, 4));
        const hf = Math.max(ellipseField(p, heartA), ellipseField(p, heartB)) + 0.1 * n2.fbm(p.x * 6, p.y * 6, p.z * 6, 3);
        c = mixRgb(c, bright, smoothstep(-0.05, 0.15, hf));
        const cf = ellipseField(p, cthulhu) + 0.25 * n.fbm(p.x * 5 + 3, p.y * 5, p.z * 5, 3);
        c = mixRgb(c, dark, smoothstep(-0.1, 0.2, cf) * 0.85);
        c = mul(c, 1 + 0.05 * n2.fbm(p.x * 15, p.y * 15, p.z * 15, 2));
        put(p, c, 0.12);
      });
      break;
    }

    case 'charon': {
      const { A } = relief(120, 0.8, 8, 0.03, 1.4, 0.15);
      forEachPixel(w, h, (p) => {
        const i = p.iy * w + p.ix;
        let c = mixRgb([150, 146, 142], [178, 172, 166], 0.5 + 0.4 * n.fbm(p.x * 3, p.y * 3, p.z * 3, 4));
        const mordor = smoothstep(62 * DEG, 78 * DEG, p.lat + 3 * DEG * n2.fbm(p.x * 5, p.y * 5, p.z * 5, 2));
        c = mixRgb(c, [96, 60, 48], mordor * 0.8);
        put(p, mul(c, A[i]), 0.08);
      });
      break;
    }

    case 'icy': {
      const { H, A } = relief(260, 0.6, 9, 0.04, 1.8, 0.35);
      const isEnceladus = seed === 93;
      const isGanymede = seed === 84;
      forEachPixel(w, h, (p) => {
        const i = p.iy * w + p.ix;
        let c = mixRgb(accent, base, clamp01(0.62 + 0.3 * n.fbm(p.x * 3, p.y * 3, p.z * 3, 4) + 0.8 * H[i]));
        if (isGanymede) {
          const groove = smoothstep(0.1, 0.4, n2.fbm(p.x * 2.5, p.y * 2.5, p.z * 2.5, 3));
          c = mixRgb(c, [200, 196, 190], groove * 0.5);
          const stripes = smoothstep(0.02, 0, Math.abs(n.noise(p.x * 25, p.y * 25, p.z * 6)));
          c = mixRgb(c, [215, 212, 205], stripes * groove * 0.4);
        }
        if (isEnceladus) {
          c = mixRgb(c, [246, 250, 252], 0.5);
          const south = smoothstep(-55 * DEG, -70 * DEG, p.lat);
          const stripes = smoothstep(0.03, 0.0, Math.abs(Math.sin((p.x * 6 + p.y * 2) * 2.5 + n2.noise(p.x * 3, p.y * 3, p.z * 3))));
          c = mixRgb(c, [150, 190, 210], stripes * south * 0.8);
        }
        put(p, mul(c, A[i]), isEnceladus ? 0.5 : 0.15);
      });
      break;
    }

    case 'rocky': {
      const { H, A } = relief(360, 0.6, 10, 0.05, 2, 0.5);
      forEachPixel(w, h, (p) => {
        const i = p.iy * w + p.ix;
        const c = mixRgb(accent, base, clamp01(0.55 + 0.35 * n.fbm(p.x * 3, p.y * 3, p.z * 3, 4) + 0.9 * H[i]));
        put(p, mul(c, A[i]), 0.04);
      });
      break;
    }

    case 'dwarf': {
      const { H, A } = relief(200, 0.7, 9, 0.04, 1.6, 0.2);
      const isCeres = seed === 131;
      const spots = isCeres ? [E(20, 20, 2.5, 2.5), E(-120, -10, 1.5, 1.5)] : [];
      forEachPixel(w, h, (p) => {
        const i = p.iy * w + p.ix;
        let c = mixRgb(accent, base, clamp01(0.6 + 0.3 * n.fbm(p.x * 3, p.y * 3, p.z * 3, 4) + 0.8 * H[i]));
        for (const s of spots) { const f = ellipseField(p, s); if (f > -0.5) c = mixRgb(c, [240, 240, 235], smoothstep(-0.5, 0.3, f)); }
        put(p, mul(c, A[i]), 0.08);
      });
      break;
    }

    case 'asteroid':
    case 'comet': {
      const { H, A } = relief(kind === 'comet' ? 60 : 300, 1, 16, 0.06, 2.2, 0.1);
      forEachPixel(w, h, (p) => {
        const i = p.iy * w + p.ix;
        const t = clamp01(0.55 + 0.35 * n.fbm(p.x * 3, p.y * 3, p.z * 3, 4) + H[i]);
        let c = mixRgb(accent, base, t);
        if (kind === 'comet') c = mul(mixRgb([40, 38, 36], [70, 66, 62], t), 1);
        put(p, mul(c, A[i]), 0.03);
      });
      break;
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* Ring radial profile (1-D): color + alpha across [inner, outer]       */
/* ------------------------------------------------------------------ */

export interface RingBandIn { innerKm: number; outerKm: number; opacity: number; color: string }

export function generateRingProfile(bands: RingBandIn[], width: number, seed: number): { data: Uint8ClampedArray; innerKm: number; outerKm: number } {
  const innerKm = Math.min(...bands.map((b) => b.innerKm));
  const outerKm = Math.max(...bands.map((b) => b.outerKm));
  const data = new Uint8ClampedArray(width * 4);
  const n = new Noise3(seed);
  for (let i = 0; i < width; i++) {
    const km = innerKm + ((i + 0.5) / width) * (outerKm - innerKm);
    let r = 0, g = 0, b = 0, a = 0;
    for (const band of bands) {
      if (km >= band.innerKm && km <= band.outerKm) {
        const t = (km - band.innerKm) / (band.outerKm - band.innerKm);
        const edge = smoothstep(0, 0.04, t) * smoothstep(1, 0.96, t);
        const fine = 0.75 + 0.25 * n.fbm(km / 600, 0.3, 0.7, 4) + 0.12 * n.noise(km / 90, 0.1, 0.2);
        const alpha = clamp01(band.opacity * fine * edge);
        const c = hexToRgb(band.color);
        r = c[0]; g = c[1]; b = c[2]; a = Math.max(a, alpha);
      }
    }
    data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = a * 255;
  }
  return { data, innerKm, outerKm };
}
