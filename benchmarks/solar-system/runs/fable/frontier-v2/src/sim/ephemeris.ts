import { BODIES, BODY_MAP } from '../data/bodies';
import type { BodyDef, BodyId } from '../data/types';
import { DAY_S } from '../data/types';
import { DEG, helioState, localKeplerState, wrapPi } from './kepler';
import type { Vec3 } from './kepler';
import { MOON_FRACTION_OF_EMB, moonGeocentric } from './moon';
import { equatorialBasis, orientationQuat, synchronousQuat } from './orientation';
import { daysSinceJ2000 } from './time';
import { add, dist, normalize, scale, sub, type Quat } from './vec';

export interface BodyState {
  id: BodyId;
  /** Heliocentric position in the J2000 ecliptic frame (km). */
  pos: Vec3;
  /** Heliocentric velocity (km/s). */
  vel: Vec3;
  /** Position relative to the parent body (km); equals pos for heliocentric bodies. */
  parentRel: Vec3;
  /** Distance from the Sun (km). */
  sunDistanceKm: number;
  /** Distance from the parent (km); equals sunDistanceKm for heliocentric bodies. */
  parentDistanceKm: number;
  /** Orientation quaternion (body → ecliptic frame). */
  orientation: Quat;
  /** Whether the position came from a converged solver. */
  converged: boolean;
  /** Whether the position is within the model's validity interval. */
  withinValidity: boolean;
}

export type SystemState = Map<BodyId, BodyState>;

const IDENTITY_Q: Quat = { x: 0, y: 0, z: 0, w: 1 };

const heliocentricBodies: BodyDef[] = BODIES.filter((b) => b.level === 'simulated' && b.orbit && b.parent === 'sun');
const satelliteBodies: BodyDef[] = BODIES.filter((b) => b.level === 'simulated' && b.satellite && b.id !== 'moon');

function moonVelocity(jd: number, moonPos: Vec3): Vec3 {
  const dtDays = 60 / DAY_S;
  const p2 = moonGeocentric(jd + dtDays).pos;
  return scale(sub(p2, moonPos), 1 / 60);
}

/**
 * Evaluate the physical state of every simulated body at a Julian Date.
 * Pure function of (jd, catalog). Parent states are evaluated before children.
 */
export function evaluateSystem(jd: number): SystemState {
  const out: SystemState = new Map();
  const sun = BODY_MAP.sun;
  out.set('sun', {
    id: 'sun', pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 }, parentRel: { x: 0, y: 0, z: 0 },
    sunDistanceKm: 0, parentDistanceKm: 0, orientation: sun.rotation ? orientationQuat(sun.rotation, jd) : IDENTITY_Q,
    converged: true, withinValidity: true,
  });

  // Heliocentric bodies
  for (const b of heliocentricBodies) {
    const el = b.orbit!;
    const st = helioState(el, jd);
    let pos = st.pos;
    let vel = st.vel;
    if (b.id === 'earth') {
      // Table 1 gives the Earth–Moon barycenter; separate Earth using the lunar model.
      const mg = moonGeocentric(jd);
      const moonVel = moonVelocity(jd, mg.pos);
      pos = sub(st.pos, scale(mg.pos, MOON_FRACTION_OF_EMB));
      vel = sub(st.vel, scale(moonVel, MOON_FRACTION_OF_EMB));
      const moonPos = add(pos, mg.pos);
      const moonDef = BODY_MAP.moon;
      out.set('moon', {
        id: 'moon', pos: moonPos, vel: add(vel, moonVel), parentRel: mg.pos,
        sunDistanceKm: Math.hypot(moonPos.x, moonPos.y, moonPos.z), parentDistanceKm: mg.distanceKm,
        orientation: moonDef.rotation ? orientationQuat(moonDef.rotation, jd) : IDENTITY_Q,
        converged: true, withinValidity: jd >= el.validFromJd && jd <= el.validToJd,
      });
    }
    out.set(b.id, {
      id: b.id, pos, vel, parentRel: pos,
      sunDistanceKm: Math.hypot(pos.x, pos.y, pos.z), parentDistanceKm: Math.hypot(pos.x, pos.y, pos.z),
      orientation: b.rotation ? orientationQuat(b.rotation, jd) : IDENTITY_Q,
      converged: st.converged, withinValidity: jd >= el.validFromJd && jd <= el.validToJd,
    });
  }

  // Schematic satellites (geometry sourced, phase schematic)
  const d = daysSinceJ2000(jd);
  for (const b of satelliteBodies) {
    const s = b.satellite!;
    const parent = out.get(b.parent!);
    const parentDef = BODY_MAP[b.parent!];
    if (!parent) continue;
    const n = (360 / Math.abs(s.periodDays)) * DEG; // rad/day
    const M = wrapPi(s.meanAnomalyAtEpochDeg * DEG + n * d * Math.sign(s.periodDays));
    const local = localKeplerState(s.aKm, s.e, s.inclinationDeg * DEG, s.nodeDeg * DEG, s.periDeg * DEG, M, s.periodDays);
    let rel: Vec3, relVel: Vec3;
    if (s.plane === 'parent-equator' && parentDef.rotation) {
      const basis = equatorialBasis(parentDef.rotation);
      rel = add(add(scale(basis.x, local.pos.x), scale(basis.y, local.pos.y)), scale(basis.z, local.pos.z));
      relVel = add(add(scale(basis.x, local.vel.x), scale(basis.y, local.vel.y)), scale(basis.z, local.vel.z));
    } else {
      rel = local.pos;
      relVel = local.vel;
    }
    const pos = add(parent.pos, rel);
    const toParent = normalize(scale(rel, -1));
    const orientation = b.rotation
      ? (b.rotation.synchronous ? synchronousQuat(b.rotation, toParent) : orientationQuat(b.rotation, jd))
      : IDENTITY_Q;
    out.set(b.id, {
      id: b.id, pos, vel: add(parent.vel, relVel), parentRel: rel,
      sunDistanceKm: Math.hypot(pos.x, pos.y, pos.z), parentDistanceKm: Math.hypot(rel.x, rel.y, rel.z),
      orientation, converged: true, withinValidity: parent.withinValidity,
    });
  }
  return out;
}

/** Center-to-center distance between two bodies (km) at a system state. */
export function distanceBetween(state: SystemState, a: BodyId, b: BodyId): number | undefined {
  const sa = state.get(a), sb = state.get(b);
  if (!sa || !sb) return undefined;
  return dist(sa.pos, sb.pos);
}

/** Unit vector from body toward the Sun in the ecliptic frame. */
export function sunDirectionFrom(state: SystemState, id: BodyId): Vec3 {
  const s = state.get(id);
  if (!s) return { x: 1, y: 0, z: 0 };
  return normalize(scale(s.pos, -1));
}

/** Fraction of a body's disk illuminated as seen from an observer body. */
export function illuminatedFraction(state: SystemState, target: BodyId, observer: BodyId): number | undefined {
  const t = state.get(target), o = state.get(observer);
  if (!t || !o) return undefined;
  const toSun = normalize(scale(t.pos, -1));
  const toObs = normalize(sub(o.pos, t.pos));
  const c = toSun.x * toObs.x + toSun.y * toObs.y + toSun.z * toObs.z;
  return (1 + c) / 2;
}

/** Sample the Moon's geocentric orbit (km, ecliptic) over one sidereal month around a JD. */
export function sampleMoonPath(jd: number, segments = 128): Vec3[] {
  const period = 27.321661;
  const pts: Vec3[] = [];
  for (let k = 0; k <= segments; k++) {
    pts.push(moonGeocentric(jd - period / 2 + (k / segments) * period).pos);
  }
  return pts;
}

/** Sample a schematic satellite's parent-relative orbit (km, ecliptic) at a JD. */
export function sampleSatellitePath(id: BodyId, segments = 128): Vec3[] {
  const b = BODY_MAP[id];
  const s = b.satellite;
  if (!s) return [];
  const parentDef = BODY_MAP[b.parent!];
  const basis = s.plane === 'parent-equator' && parentDef.rotation ? equatorialBasis(parentDef.rotation) : null;
  const pts: Vec3[] = [];
  for (let k = 0; k <= segments; k++) {
    const M = (k / segments) * 2 * Math.PI;
    const local = localKeplerState(s.aKm, s.e, s.inclinationDeg * DEG, s.nodeDeg * DEG, s.periDeg * DEG, M, s.periodDays);
    pts.push(basis ? add(add(scale(basis.x, local.pos.x), scale(basis.y, local.pos.y)), scale(basis.z, local.pos.z)) : local.pos);
  }
  return pts;
}
