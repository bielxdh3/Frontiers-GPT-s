import { G_SI, GM_SUN_M3_S2 } from './constants'

export function gravityMs2(massKg: number, radiusM: number): number {
  return (G_SI * massKg) / (radiusM * radiusM)
}

export function weightN(massKg: number, gMs2: number): number {
  return massKg * gMs2
}

/** Negligible test mass: T = 2π √(a³ / GM) */
export function periodSeconds(aM: number, gmM3s2: number): number {
  return 2 * Math.PI * Math.sqrt((aM * aM * aM) / gmM3s2)
}

export function gmFromMass(massKg: number): number {
  return G_SI * massKg
}

export function sunGm(): number {
  return GM_SUN_M3_S2
}

export function periapsisM(aM: number, e: number): number {
  return aM * (1 - e)
}

export function apoapsisM(aM: number, e: number): number {
  return aM * (1 + e)
}

export type OrbitLabInput = {
  centralMassKg: number
  aM: number
  e: number
}

export function orbitLabDerived(input: OrbitLabInput): {
  periodS: number
  periM: number
  apoM: number
  gm: number
  ok: boolean
  error: string | null
} {
  const { centralMassKg, aM, e } = input
  if (![centralMassKg, aM, e].every(Number.isFinite)) {
    return { periodS: NaN, periM: NaN, apoM: NaN, gm: NaN, ok: false, error: 'nonfinite' }
  }
  if (centralMassKg <= 0 || aM <= 0) {
    return { periodS: NaN, periM: NaN, apoM: NaN, gm: NaN, ok: false, error: 'nonpositive' }
  }
  if (e < 0 || e >= 1) {
    return { periodS: NaN, periM: NaN, apoM: NaN, gm: NaN, ok: false, error: 'eccentricity' }
  }
  const gm = gmFromMass(centralMassKg)
  return {
    periodS: periodSeconds(aM, gm),
    periM: periapsisM(aM, e),
    apoM: apoapsisM(aM, e),
    gm,
    ok: true,
    error: null,
  }
}
