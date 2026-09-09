import type { HelioElements } from '../data/types';
import { AU_KM, DAY_S } from '../data/types';
import { centuriesSinceJ2000 } from './time';

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export interface Vec3 { x: number; y: number; z: number }

export interface KeplerSolution {
  E: number;          // eccentric anomaly (rad)
  iterations: number;
  converged: boolean;
}

/** Normalize an angle in radians to [-π, π]. */
export function wrapPi(a: number): number {
  let x = a % (2 * Math.PI);
  if (x > Math.PI) x -= 2 * Math.PI;
  if (x < -Math.PI) x += 2 * Math.PI;
  return x;
}

/** Normalize an angle in degrees to [0, 360). */
export function wrap360(a: number): number {
  const x = a % 360;
  return x < 0 ? x + 360 : x;
}

/**
 * Solve Kepler's equation M = E - e sin E (all in radians) by Newton iteration.
 * Bounded iterations; reports convergence explicitly instead of failing silently.
 */
export function solveKepler(M: number, e: number, tolRad = 1e-9, maxIter = 50): KeplerSolution {
  if (!Number.isFinite(M) || !Number.isFinite(e) || e < 0 || e >= 1) {
    return { E: NaN, iterations: 0, converged: false };
  }
  const m = wrapPi(M);
  let E = e < 0.8 ? m + e * Math.sin(m) : Math.PI * Math.sign(m || 1);
  let converged = false;
  let i = 0;
  for (; i < maxIter; i++) {
    const f = E - e * Math.sin(E) - m;
    const fp = 1 - e * Math.cos(E);
    const dE = f / fp;
    E -= dE;
    if (Math.abs(dE) <= tolRad) { converged = true; i++; break; }
  }
  return { E, iterations: i, converged };
}

export interface OrbitalState {
  /** Position in the reference plane frame (km). */
  pos: Vec3;
  /** Velocity in the same frame (km/s). */
  vel: Vec3;
  /** Instantaneous heliocentric distance (km). */
  r: number;
  E: number;
  M: number;
  trueAnomaly: number;
  converged: boolean;
}

export interface EvaluatedElements {
  a: number; e: number; i: number; L: number; wBar: number; Omega: number; M: number; omega: number; n: number; // n: rad/day
}

/** Evaluate JPL-style elements at a Julian Date (angles in radians, a in au). */
export function evaluateElements(el: HelioElements, jd: number): EvaluatedElements {
  const T = centuriesSinceJ2000(jd);
  const a = el.a + el.aDot * T;
  const e = el.e + el.eDot * T;
  const i = (el.i + el.iDot * T) * DEG;
  const L = el.L + el.LDot * T;
  const wBar = el.wBar + el.wBarDot * T;
  const Omega = el.Omega + el.OmegaDot * T;
  let Mdeg = L - wBar;
  if (el.b) Mdeg += el.b * T * T;
  if (el.c && el.f) Mdeg += el.c * Math.cos(el.f * T * DEG);
  if (el.s && el.f) Mdeg += el.s * Math.sin(el.f * T * DEG);
  const omega = (wBar - Omega) * DEG;
  const n = (el.LDot / 36525) * DEG; // rad/day
  return { a, e, i, L: L * DEG, wBar: wBar * DEG, Omega: Omega * DEG, M: wrapPi(Mdeg * DEG), omega, n };
}

/**
 * Heliocentric position/velocity in the J2000 ecliptic frame (km, km/s)
 * following the JPL approximate-positions recipe.
 */
export function helioState(el: HelioElements, jd: number): OrbitalState {
  const ev = evaluateElements(el, jd);
  const { a, e, i, Omega, omega, M, n } = ev;
  const sol = solveKepler(M, e);
  const E = sol.converged ? sol.E : M; // explicit fallback keeps positions finite
  const cosE = Math.cos(E), sinE = Math.sin(E);
  const sq = Math.sqrt(Math.max(0, 1 - e * e));
  const xp = a * (cosE - e);
  const yp = a * sq * sinE;
  const Edot = n / (1 - e * cosE); // rad/day
  const vxp = -a * sinE * Edot;
  const vyp = a * sq * cosE * Edot;

  const cw = Math.cos(omega), sw = Math.sin(omega);
  const cO = Math.cos(Omega), sO = Math.sin(Omega);
  const ci = Math.cos(i), si = Math.sin(i);
  const m11 = cw * cO - sw * sO * ci, m12 = -sw * cO - cw * sO * ci;
  const m21 = cw * sO + sw * cO * ci, m22 = -sw * sO + cw * cO * ci;
  const m31 = sw * si, m32 = cw * si;

  const kmPerDayToKmPerS = AU_KM / DAY_S;
  const pos = { x: (m11 * xp + m12 * yp) * AU_KM, y: (m21 * xp + m22 * yp) * AU_KM, z: (m31 * xp + m32 * yp) * AU_KM };
  const vel = { x: (m11 * vxp + m12 * vyp) * kmPerDayToKmPerS, y: (m21 * vxp + m22 * vyp) * kmPerDayToKmPerS, z: (m31 * vxp + m32 * vyp) * kmPerDayToKmPerS };
  const r = Math.hypot(pos.x, pos.y, pos.z);
  const trueAnomaly = Math.atan2(sq * sinE, cosE - e);
  return { pos, vel, r, E, M, trueAnomaly, converged: sol.converged };
}

/** Orbital period in days from the element mean motion. */
export function periodDaysFromElements(el: HelioElements): number {
  return 360 / (el.LDot / 36525);
}

/**
 * Sample the full orbit geometry (one revolution) at a given epoch in the
 * J2000 ecliptic frame (km). Used for orbit paths.
 */
export function sampleOrbitPath(el: HelioElements, jd: number, segments = 256): Vec3[] {
  const ev = evaluateElements(el, jd);
  const { a, e, i, Omega, omega } = ev;
  const cw = Math.cos(omega), sw = Math.sin(omega);
  const cO = Math.cos(Omega), sO = Math.sin(Omega);
  const ci = Math.cos(i), si = Math.sin(i);
  const m11 = cw * cO - sw * sO * ci, m12 = -sw * cO - cw * sO * ci;
  const m21 = cw * sO + sw * cO * ci, m22 = -sw * sO + cw * cO * ci;
  const m31 = sw * si, m32 = cw * si;
  const sq = Math.sqrt(Math.max(0, 1 - e * e));
  const pts: Vec3[] = [];
  for (let k = 0; k <= segments; k++) {
    const E = (k / segments) * 2 * Math.PI;
    const xp = a * (Math.cos(E) - e);
    const yp = a * sq * Math.sin(E);
    pts.push({ x: (m11 * xp + m12 * yp) * AU_KM, y: (m21 * xp + m22 * yp) * AU_KM, z: (m31 * xp + m32 * yp) * AU_KM });
  }
  return pts;
}

/** Perihelion / aphelion positions (km) for the orbit at epoch. */
export function apsides(el: HelioElements, jd: number): { peri: Vec3; apo: Vec3; periKm: number; apoKm: number } {
  const ev = evaluateElements(el, jd);
  const { a, e, i, Omega, omega } = ev;
  const cw = Math.cos(omega), sw = Math.sin(omega);
  const cO = Math.cos(Omega), sO = Math.sin(Omega);
  const ci = Math.cos(i), si = Math.sin(i);
  const px = cw * cO - sw * sO * ci, py = cw * sO + sw * cO * ci, pz = sw * si;
  const q = a * (1 - e) * AU_KM;
  const Q = a * (1 + e) * AU_KM;
  return {
    peri: { x: px * q, y: py * q, z: pz * q },
    apo: { x: -px * Q, y: -py * Q, z: -pz * Q },
    periKm: q,
    apoKm: Q,
  };
}

/** Orbit normal (unit) in the J2000 ecliptic frame. */
export function orbitNormal(el: HelioElements, jd: number): Vec3 {
  const ev = evaluateElements(el, jd);
  const { i, Omega } = ev;
  return { x: Math.sin(i) * Math.sin(Omega), y: -Math.sin(i) * Math.cos(Omega), z: Math.cos(i) };
}

/**
 * Generic two-body position for a satellite: circular/elliptical orbit in a
 * local reference frame given by node/inclination/pericenter (radians), mean
 * anomaly (radians) and semi-major axis (km). Returns position (km) and
 * velocity (km/s) in that frame.
 */
export function localKeplerState(aKm: number, e: number, incl: number, node: number, peri: number, M: number, periodDays: number): { pos: Vec3; vel: Vec3 } {
  const sol = solveKepler(M, e);
  const E = sol.converged ? sol.E : wrapPi(M);
  const sq = Math.sqrt(Math.max(0, 1 - e * e));
  const cosE = Math.cos(E), sinE = Math.sin(E);
  const xp = aKm * (cosE - e), yp = aKm * sq * sinE;
  const n = (2 * Math.PI) / (Math.abs(periodDays) * DAY_S) * Math.sign(periodDays || 1); // rad/s
  const Edot = n / (1 - e * cosE);
  const vxp = -aKm * sinE * Edot, vyp = aKm * sq * cosE * Edot;
  const cw = Math.cos(peri), sw = Math.sin(peri);
  const cO = Math.cos(node), sO = Math.sin(node);
  const ci = Math.cos(incl), si = Math.sin(incl);
  const m11 = cw * cO - sw * sO * ci, m12 = -sw * cO - cw * sO * ci;
  const m21 = cw * sO + sw * cO * ci, m22 = -sw * sO + cw * cO * ci;
  const m31 = sw * si, m32 = cw * si;
  return {
    pos: { x: m11 * xp + m12 * yp, y: m21 * xp + m22 * yp, z: m31 * xp + m32 * yp },
    vel: { x: m11 * vxp + m12 * vyp, y: m21 * vxp + m22 * vyp, z: m31 * vxp + m32 * vyp },
  };
}
