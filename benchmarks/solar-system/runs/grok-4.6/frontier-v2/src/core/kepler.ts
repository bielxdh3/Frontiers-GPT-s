import type { KeplerElements, Vec3 } from './types'
import { centuriesSinceJ2000, cosd, degToRad, sind, wrap180 } from './math'
import { J2000_JD } from './constants'

const TOL_DEG = 1e-6
const MAX_ITER = 30

export type KeplerResult = {
  Edeg: number
  ok: boolean
  iterations: number
}

/** JPL approx_pos Kepler solver. M and E in degrees; e dimensionless. */
export function solveKepler(Mdeg: number, e: number): KeplerResult {
  if (!Number.isFinite(Mdeg) || !Number.isFinite(e) || e < 0 || e >= 1) {
    return { Edeg: Number.NaN, ok: false, iterations: 0 }
  }
  const eStar = (180 / Math.PI) * e
  const M = wrap180(Mdeg)
  let E = M + eStar * sind(M)
  for (let n = 0; n < MAX_ITER; n++) {
    const dM = M - (E - eStar * sind(E))
    const denom = 1 - e * cosd(E)
    if (Math.abs(denom) < 1e-18) {
      return { Edeg: E, ok: false, iterations: n + 1 }
    }
    const dE = dM / denom
    E += dE
    if (Math.abs(dE) <= TOL_DEG) {
      return { Edeg: E, ok: true, iterations: n + 1 }
    }
  }
  return { Edeg: E, ok: false, iterations: MAX_ITER }
}

export function orbitalPlanePosition(a: number, e: number, Edeg: number): Vec3 {
  const E = degToRad(Edeg)
  const x = a * (Math.cos(E) - e)
  const y = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E)
  return { x, y, z: 0 }
}

/** Rotate orbital-plane r' into J2000 ecliptic using JPL matrix. */
export function toEcliptic(r: Vec3, omega: number, Omega: number, I: number): Vec3 {
  const x = r.x
  const y = r.y
  const xE =
    (cosd(omega) * cosd(Omega) - sind(omega) * sind(Omega) * cosd(I)) * x +
    (-sind(omega) * cosd(Omega) - cosd(omega) * sind(Omega) * cosd(I)) * y
  const yE =
    (cosd(omega) * sind(Omega) + sind(omega) * cosd(Omega) * cosd(I)) * x +
    (-sind(omega) * sind(Omega) + cosd(omega) * cosd(Omega) * cosd(I)) * y
  const zE = sind(omega) * sind(I) * x + cosd(omega) * sind(I) * y
  return { x: xE, y: yE, z: zE }
}

export function elementsAtT(el: KeplerElements, T: number): {
  a: number
  e: number
  I: number
  L: number
  varpi: number
  Omega: number
} {
  return {
    a: el.a0 + el.adot * T,
    e: el.e0 + el.edot * T,
    I: el.i0 + el.idot * T,
    L: el.L0 + el.Ldot * T,
    varpi: el.varpi0 + el.varpidot * T,
    Omega: el.Omega0 + el.Omegadot * T,
  }
}

export function meanAnomaly(L: number, varpi: number, T: number, extra?: { b?: number; c?: number; s?: number; f?: number }): number {
  let M = L - varpi
  if (extra) {
    const b = extra.b ?? 0
    const c = extra.c ?? 0
    const s = extra.s ?? 0
    const f = extra.f ?? 0
    M += b * T * T + c * Math.cos(degToRad(f * T)) + s * Math.sin(degToRad(f * T))
  }
  return wrap180(M)
}

export function heliocentricEclipticAu(el: KeplerElements, jd: number, useExtra = false): { pos: Vec3; ok: boolean; a: number; e: number } {
  const T = centuriesSinceJ2000(jd)
  const q = elementsAtT(el, T)
  const extra = useExtra ? { b: el.b, c: el.c, s: el.s, f: el.f } : undefined
  const M = meanAnomaly(q.L, q.varpi, T, extra)
  const { Edeg, ok } = solveKepler(M, q.e)
  const omega = q.varpi - q.Omega
  const r = orbitalPlanePosition(q.a, q.e, Edeg)
  const pos = toEcliptic(r, omega, q.Omega, q.I)
  return { pos, ok, a: q.a, e: q.e }
}

export function keplerJ2000Position(
  aAu: number,
  e: number,
  iDeg: number,
  OmegaDeg: number,
  omegaDeg: number,
  M0Deg: number,
  periodDays: number,
  jd: number,
): { pos: Vec3; ok: boolean } {
  const days = jd - J2000_JD
  const n = 360 / periodDays
  const M = wrap180(M0Deg + n * days)
  const { Edeg, ok } = solveKepler(M, e)
  const r = orbitalPlanePosition(aAu, e, Edeg)
  return { pos: toEcliptic(r, omegaDeg, OmegaDeg, iDeg), ok }
}

export const JPL_TABLE1: Record<string, KeplerElements> = {
  mercury: {
    a0: 0.38709927, adot: 0.00000037,
    e0: 0.20563593, edot: 0.00001906,
    i0: 7.00497902, idot: -0.00594749,
    L0: 252.25032350, Ldot: 149472.67411175,
    varpi0: 77.45779628, varpidot: 0.16047689,
    Omega0: 48.33076593, Omegadot: -0.12534081,
  },
  venus: {
    a0: 0.72333566, adot: 0.00000390,
    e0: 0.00677672, edot: -0.00004107,
    i0: 3.39467605, idot: -0.00078890,
    L0: 181.97909950, Ldot: 58517.81538729,
    varpi0: 131.60246718, varpidot: 0.00268329,
    Omega0: 76.67984255, Omegadot: -0.27769418,
  },
  emb: {
    a0: 1.00000261, adot: 0.00000562,
    e0: 0.01671123, edot: -0.00004392,
    i0: -0.00001531, idot: -0.01294668,
    L0: 100.46457166, Ldot: 35999.37244981,
    varpi0: 102.93768193, varpidot: 0.32327364,
    Omega0: 0.0, Omegadot: 0.0,
  },
  mars: {
    a0: 1.52371034, adot: 0.00001847,
    e0: 0.09339410, edot: 0.00007882,
    i0: 1.84969142, idot: -0.00813131,
    L0: -4.55343205, Ldot: 19140.30268499,
    varpi0: -23.94362959, varpidot: 0.44441088,
    Omega0: 49.55953891, Omegadot: -0.29257343,
  },
  jupiter: {
    a0: 5.20288700, adot: -0.00011607,
    e0: 0.04838624, edot: -0.00013253,
    i0: 1.30439695, idot: -0.00183714,
    L0: 34.39644051, Ldot: 3034.74612775,
    varpi0: 14.72847983, varpidot: 0.21252668,
    Omega0: 100.47390909, Omegadot: 0.20469106,
  },
  saturn: {
    a0: 9.53667594, adot: -0.00125060,
    e0: 0.05386179, edot: -0.00050991,
    i0: 2.48599187, idot: 0.00193609,
    L0: 49.95424423, Ldot: 1222.49362201,
    varpi0: 92.59887831, varpidot: -0.41897216,
    Omega0: 113.66242448, Omegadot: -0.28867794,
  },
  uranus: {
    a0: 19.18916464, adot: -0.00196176,
    e0: 0.04725744, edot: -0.00004397,
    i0: 0.77263783, idot: -0.00242939,
    L0: 313.23810451, Ldot: 428.48202785,
    varpi0: 170.95427630, varpidot: 0.40805281,
    Omega0: 74.01692503, Omegadot: 0.04240589,
  },
  neptune: {
    a0: 30.06992276, adot: 0.00026291,
    e0: 0.00859048, edot: 0.00005105,
    i0: 1.77004347, idot: 0.00035372,
    L0: -55.12002969, Ldot: 218.45945325,
    varpi0: 44.96476227, varpidot: -0.32241464,
    Omega0: 131.78422574, Omegadot: -0.00508664,
  },
}

export function perihelionAphelionAu(a: number, e: number): { q: number; Q: number } {
  return { q: a * (1 - e), Q: a * (1 + e) }
}

export function visVivaKmPerS(gmM3s2: number, rKm: number, aKm: number): number {
  const r = rKm * 1000
  const a = aKm * 1000
  const v2 = gmM3s2 * (2 / r - 1 / a)
  return Math.sqrt(Math.max(0, v2)) / 1000
}
