import type { RotationModel } from '../data/types';
import { OBLIQUITY_J2000_DEG } from '../data/types';
import { DEG } from './kepler';
import type { Vec3 } from './kepler';
import { cross, dot, normalize, quatFromBasis, scale, sub, type Quat } from './vec';
import { daysSinceJ2000 } from './time';

const EPS = OBLIQUITY_J2000_DEG * DEG;
const COS_EPS = Math.cos(EPS), SIN_EPS = Math.sin(EPS);

/** Convert a J2000 equatorial unit vector to the J2000 ecliptic frame. */
export function equatorialToEcliptic(v: Vec3): Vec3 {
  return { x: v.x, y: v.y * COS_EPS + v.z * SIN_EPS, z: -v.y * SIN_EPS + v.z * COS_EPS };
}

export function eclipticToEquatorial(v: Vec3): Vec3 {
  return { x: v.x, y: v.y * COS_EPS - v.z * SIN_EPS, z: v.y * SIN_EPS + v.z * COS_EPS };
}

/** Unit vector from RA/Dec (degrees) in the equatorial frame. */
export function unitFromRaDec(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * DEG, dec = decDeg * DEG;
  return { x: Math.cos(dec) * Math.cos(ra), y: Math.cos(dec) * Math.sin(ra), z: Math.sin(dec) };
}

/** Pole direction in the ecliptic J2000 frame. */
export function poleEcliptic(rot: { poleRA: number; poleDec: number }): Vec3 {
  return equatorialToEcliptic(unitFromRaDec(rot.poleRA, rot.poleDec));
}

/**
 * Direction of the ascending node of the body's equator on the ICRF equator
 * (IAU convention: RA = α0 + 90°), expressed in the ecliptic frame.
 */
export function equatorNodeEcliptic(rot: { poleRA: number; poleDec: number }): Vec3 {
  const q = unitFromRaDec(rot.poleRA + 90, 0);
  return equatorialToEcliptic(q);
}

/** Prime-meridian angle W in degrees at the given JD. */
export function primeMeridianDeg(rot: RotationModel, jd: number): number {
  const d = daysSinceJ2000(jd);
  const rate = rot.wRateDegPerDay ?? (360 / (rot.periodHours / 24));
  const w0 = rot.w0Deg ?? 0;
  return w0 + rate * d;
}

export interface BodyBasis { x: Vec3; y: Vec3; z: Vec3 }

/** Equatorial basis of a body (not rotating with W): z = pole, x = node direction. */
export function equatorialBasis(rot: { poleRA: number; poleDec: number }): BodyBasis {
  const z = poleEcliptic(rot);
  let x = equatorNodeEcliptic(rot);
  // Ensure x is perpendicular to z (numerical safety)
  x = normalize(sub(x, scale(z, dot(x, z))));
  const y = cross(z, x);
  return { x, y, z };
}

/** Body-fixed basis (prime meridian along x) in the ecliptic frame at JD. */
export function bodyFixedBasis(rot: RotationModel, jd: number): BodyBasis {
  const eq = equatorialBasis(rot);
  const W = primeMeridianDeg(rot, jd) * DEG;
  const cw = Math.cos(W), sw = Math.sin(W);
  const x = { x: eq.x.x * cw + eq.y.x * sw, y: eq.x.y * cw + eq.y.y * sw, z: eq.x.z * cw + eq.y.z * sw };
  const y = cross(eq.z, x);
  return { x, y, z: eq.z };
}

/** Orientation quaternion (ecliptic frame) mapping body axes to world axes. */
export function orientationQuat(rot: RotationModel, jd: number): Quat {
  const b = bodyFixedBasis(rot, jd);
  return quatFromBasis(b.x, b.y, b.z);
}

/**
 * Orientation for a synchronously rotating satellite: pole given by `rot`,
 * prime meridian pointing toward the parent (sub-parent point at longitude 0).
 */
export function synchronousQuat(rot: { poleRA: number; poleDec: number }, toParentEcl: Vec3): Quat {
  const z = poleEcliptic(rot);
  let x = sub(toParentEcl, scale(z, dot(toParentEcl, z)));
  if (Math.hypot(x.x, x.y, x.z) < 1e-9) x = equatorNodeEcliptic(rot);
  x = normalize(x);
  const y = cross(z, x);
  return quatFromBasis(x, y, z);
}

/** Angle between the pole and an orbit normal, degrees. */
export function obliquityDeg(pole: Vec3, orbitNormal: Vec3): number {
  const c = Math.min(1, Math.max(-1, dot(normalize(pole), normalize(orbitNormal))));
  return Math.acos(c) / DEG;
}
