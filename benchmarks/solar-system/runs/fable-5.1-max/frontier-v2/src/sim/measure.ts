import type { BodyId } from '../data/types';
import { AU_KM, C_KM_S } from '../data/types';
import { BODY_MAP } from '../data/bodies';
import type { SystemState } from './ephemeris';
import { angleBetween, dist, sub } from './vec';
import { RAD } from './kepler';

export interface DistanceMeasurement {
  a: BodyId;
  b: BodyId;
  jd: number;
  centerKm: number;
  surfaceKm: number;
  au: number;
  lightSeconds: number;
  valid: boolean;
}

/** Center-to-center and surface-to-surface distance between two bodies. */
export function measureDistance(state: SystemState, a: BodyId, b: BodyId, jd: number): DistanceMeasurement {
  const sa = state.get(a), sb = state.get(b);
  if (!sa || !sb || a === b) {
    return { a, b, jd, centerKm: NaN, surfaceKm: NaN, au: NaN, lightSeconds: NaN, valid: false };
  }
  const centerKm = dist(sa.pos, sb.pos);
  const ra = BODY_MAP[a].physical.meanRadiusKm, rb = BODY_MAP[b].physical.meanRadiusKm;
  const surfaceKm = Math.max(0, centerKm - ra - rb);
  return { a, b, jd, centerKm, surfaceKm, au: centerKm / AU_KM, lightSeconds: centerKm / C_KM_S, valid: Number.isFinite(centerKm) };
}

export interface AngularSeparation {
  observer: BodyId;
  a: BodyId;
  b: BodyId;
  degrees: number;
  valid: boolean;
  reason?: 'same-body' | 'observer-is-target' | 'missing';
}

/** Angular separation between two targets as seen from the center of an observer body. */
export function angularSeparation(state: SystemState, observer: BodyId, a: BodyId, b: BodyId): AngularSeparation {
  if (a === b) return { observer, a, b, degrees: NaN, valid: false, reason: 'same-body' };
  if (observer === a || observer === b) return { observer, a, b, degrees: NaN, valid: false, reason: 'observer-is-target' };
  const so = state.get(observer), sa = state.get(a), sb = state.get(b);
  if (!so || !sa || !sb) return { observer, a, b, degrees: NaN, valid: false, reason: 'missing' };
  const va = sub(sa.pos, so.pos), vb = sub(sb.pos, so.pos);
  const ang = angleBetween(va, vb);
  return { observer, a, b, degrees: ang * RAD, valid: Number.isFinite(ang) };
}

/** Split seconds into a human structure for light-travel display. */
export function splitDuration(seconds: number): { days: number; hours: number; minutes: number; seconds: number } {
  const s = Math.max(0, seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  return { days, hours, minutes, seconds: s % 60 };
}
