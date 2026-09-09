/**
 * Display-scale mapping. Physical quantities (km) are mapped to scene units
 * for presentation only. Nothing scientific is ever read back from these.
 *
 * Exploration Scale:
 *   body radius   r_disp = 0.00627 · R_km^0.5           (Earth = 0.5 units)
 *   helio distance d_disp = 19.4 · d_au^0.7              (radial compression, direction preserved)
 *   satellite distance: per-system compression — the outermost curated moon of
 *   each planet sits at 4 parent display radii, the innermost at ≥ 2.2 radii
 *   (outside the rings), intermediate moons by logarithmic interpolation.
 *   rings: true ratio to the planet radius.
 * Relative Scale (true proportions):
 *   1 au = 20 units for everything: radii, distances, satellites and rings.
 */
import { BODIES, BODY_MAP } from '../data/bodies';
import type { BodyDef, BodyId } from '../data/types';
import { AU_KM } from '../data/types';
import type { Vec3 } from './kepler';
import { length, scale as vscale } from './vec';

export type ScaleMode = 'exploration' | 'relative';

export const EXPLORATION = { radiusK: 0.00627, radiusExp: 0.5, distA: 19.4, distExp: 0.7, satInner: 2.2, satOuter: 4.0 };
export const RELATIVE_UNITS_PER_AU = 20;
export const RELATIVE_UNITS_PER_KM = RELATIVE_UNITS_PER_AU / AU_KM;

/** Convert an ecliptic-frame vector (x→equinox, z→north) to three.js scene axes (Y up). */
export function eclToScene(v: Vec3): Vec3 {
  return { x: v.x, y: v.z, z: -v.y };
}

export function sceneToEcl(v: Vec3): Vec3 {
  return { x: v.x, y: -v.z, z: v.y };
}

interface SatSystemInfo { xLo: number; xHi: number; single: boolean; lo: number; hi: number }
const satSystems = new Map<BodyId, SatSystemInfo>();

function satSystem(parentId: BodyId): SatSystemInfo {
  let info = satSystems.get(parentId);
  if (info) return info;
  const parent = BODY_MAP[parentId];
  const R = parent.physical.meanRadiusKm;
  const moons = BODIES.filter((b) => b.parent === parentId && b.satellite);
  const ratios = moons.map((m) => m.satellite!.aKm / R);
  const xLo = Math.min(...ratios), xHi = Math.max(...ratios);
  const ringsOuter = parent.appearance.rings?.bands.filter((b) => b.opacity > 0.05).reduce((m, b) => Math.max(m, b.outerKm), 0) ?? 0;
  const ringBound = ringsOuter > 0 ? (ringsOuter / R) * 1.1 : 0;
  info = {
    xLo, xHi, single: moons.length <= 1,
    lo: Math.max(EXPLORATION.satInner, ringBound),
    hi: Math.max(EXPLORATION.satOuter, ringBound + 1.2),
  };
  satSystems.set(parentId, info);
  return info;
}

export interface ScaleMapping {
  mode: ScaleMode;
  bodyRadius(def: BodyDef): number;
  /** Heliocentric km (ecliptic) → display units (ecliptic axes). */
  helioPosition(posKm: Vec3): Vec3;
  /** Parent-relative km (ecliptic) → display offset units (ecliptic axes). */
  satelliteOffset(def: BodyDef, relKm: Vec3): Vec3;
  /** Ring radius in display units for a body. */
  ringRadius(def: BodyDef, km: number): number;
  /** Heliocentric distance in au → display units (for framing and belts). */
  auToDisplay(au: number): number;
  kmToDisplayLength(km: number, near?: BodyId): number;
}

const explorationMapping: ScaleMapping = {
  mode: 'exploration',
  bodyRadius(def) {
    return EXPLORATION.radiusK * Math.pow(Math.max(def.physical.meanRadiusKm, 0.5), EXPLORATION.radiusExp);
  },
  helioPosition(posKm) {
    const r = length(posKm);
    if (r === 0) return { x: 0, y: 0, z: 0 };
    const d = EXPLORATION.distA * Math.pow(r / AU_KM, EXPLORATION.distExp);
    return vscale(posKm, d / r);
  },
  satelliteOffset(def, relKm) {
    const parent = BODY_MAP[def.parent!];
    const info = satSystem(def.parent!);
    const Rp = parent.physical.meanRadiusKm;
    const rDisp = explorationMapping.bodyRadius(parent);
    const r = length(relKm);
    if (r === 0) return { x: 0, y: 0, z: 0 };
    const x = r / Rp;
    let g: number;
    if (info.single) {
      g = info.hi * (x / info.xHi);
    } else {
      const t = Math.log(x / info.xLo) / Math.log(info.xHi / info.xLo);
      g = info.lo + (info.hi - info.lo) * t;
    }
    return vscale(relKm, (g * rDisp) / r);
  },
  ringRadius(def, km) {
    return (km / def.physical.meanRadiusKm) * explorationMapping.bodyRadius(def);
  },
  auToDisplay(au) {
    return EXPLORATION.distA * Math.pow(Math.max(au, 0), EXPLORATION.distExp);
  },
  kmToDisplayLength(km) {
    return EXPLORATION.distA * Math.pow(km / AU_KM, EXPLORATION.distExp);
  },
};

const relativeMapping: ScaleMapping = {
  mode: 'relative',
  bodyRadius(def) {
    return Math.max(def.physical.meanRadiusKm, 0.5) * RELATIVE_UNITS_PER_KM;
  },
  helioPosition(posKm) {
    return vscale(posKm, RELATIVE_UNITS_PER_KM);
  },
  satelliteOffset(_def, relKm) {
    return vscale(relKm, RELATIVE_UNITS_PER_KM);
  },
  ringRadius(_def, km) {
    return km * RELATIVE_UNITS_PER_KM;
  },
  auToDisplay(au) {
    return au * RELATIVE_UNITS_PER_AU;
  },
  kmToDisplayLength(km) {
    return km * RELATIVE_UNITS_PER_KM;
  },
};

export function getMapping(mode: ScaleMode): ScaleMapping {
  return mode === 'relative' ? relativeMapping : explorationMapping;
}

/** Descriptive numbers for the scale badge / explanation. */
export function describeSatelliteCompression(parentId: BodyId): { lo: number; hi: number; single: boolean } {
  const info = satSystem(parentId);
  return { lo: info.lo, hi: info.hi, single: info.single };
}
