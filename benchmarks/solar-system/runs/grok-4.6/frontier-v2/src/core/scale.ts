import { AU_KM, EARTH_MEAN_RADIUS_KM, SUN_MEAN_RADIUS_KM } from './constants'
import type { ScaleMode, Vec3 } from './types'

/**
 * Display mapping (not physical).
 * Exploration: compressed sizes and distances so the system is navigable.
 * Relative: true body-size ratios; distances stay log-compressed and are labeled as such.
 * Combined true scale is only used in the scale laboratory.
 */
export const SCALE_EXPLAIN = {
  exploration: {
    sizes: 'Radii use a power mapping so small worlds stay visible; they are not true linear size ratios.',
    distances: 'Heliocentric distances are compressed with a power law. Orbital order is preserved.',
    satellites: 'Moon distances are locally exaggerated around each parent so systems can be inspected.',
    rings: 'Ring radial extents are closer to true planet-radius ratios than the exploration planet spacing.',
  },
  relative: {
    sizes: 'Body radii share one linear scale (true diameter ratios).',
    distances: 'Distances remain logarithmically compressed for navigation — not the same scale as the radii.',
    satellites: 'Satellite distances stay locally exaggerated and are labeled as such.',
    rings: 'Rings use the same linear radius scale as the planet.',
  },
} as const

const SIZE_POWER = 0.46
const DIST_POWER = 0.64
const DIST_K = 11.2
const EXPLORE_EARTH_R = 0.38
const REL_UNIT_KM = 2500

export function explorationRadius(radiusKm: number): number {
  const ratio = radiusKm / EARTH_MEAN_RADIUS_KM
  return EXPLORE_EARTH_R * Math.pow(Math.max(ratio, 1e-6), SIZE_POWER)
}

export function relativeRadius(radiusKm: number): number {
  return radiusKm / REL_UNIT_KM
}

export function displayRadius(radiusKm: number, mode: ScaleMode): number {
  if (mode === 'relative') return relativeRadius(radiusKm)
  return explorationRadius(radiusKm)
}

export function explorationDistanceAu(au: number): number {
  const s = Math.sign(au) || 1
  return s * DIST_K * Math.pow(Math.abs(au), DIST_POWER)
}

export function relativeDistanceAu(au: number): number {
  const s = Math.sign(au) || 1
  const a = Math.abs(au)
  return s * (4.2 * Math.log10(1 + a * 12) + a * 0.15)
}

export function displayDistanceAu(au: number, mode: ScaleMode): number {
  return mode === 'relative' ? relativeDistanceAu(au) : explorationDistanceAu(au)
}

export function mapVecKm(v: Vec3, mode: ScaleMode): Vec3 {
  const au = { x: v.x / AU_KM, y: v.y / AU_KM, z: v.z / AU_KM }
  const r = Math.hypot(au.x, au.y, au.z)
  if (r < 1e-18) return { x: 0, y: 0, z: 0 }
  const rd = displayDistanceAu(r, mode)
  const k = rd / r
  return { x: au.x * k, y: au.y * k, z: au.z * k }
}

/** Parent-relative display for satellites. Physical offset in km. */
export function mapSatelliteOffset(offsetKm: Vec3, parentRadiusKm: number, mode: ScaleMode): Vec3 {
  const physR = Math.hypot(offsetKm.x, offsetKm.y, offsetKm.z)
  const parentDisp = displayRadius(parentRadiusKm, mode)
  const moonDispMin = parentDisp * 2.6
  const trueDisp = displayDistanceAu(physR / AU_KM, mode)
  const local = Math.max(moonDispMin, Math.min(trueDisp * 140, parentDisp * 14 + trueDisp * 80))
  if (physR < 1e-9) return { x: 0, y: 0, z: 0 }
  const k = local / physR
  return { x: offsetKm.x * k, y: offsetKm.y * k, z: offsetKm.z * k }
}

export function sunDisplayRadius(mode: ScaleMode): number {
  return displayRadius(SUN_MEAN_RADIUS_KM, mode)
}

export function ringDisplayRadii(
  planetRadiusKm: number,
  innerKm: number,
  outerKm: number,
  mode: ScaleMode,
): { inner: number; outer: number } {
  const pr = displayRadius(planetRadiusKm, mode)
  const inner = pr * (innerKm / planetRadiusKm)
  const outer = pr * (outerKm / planetRadiusKm)
  return { inner, outer }
}

export function trueScalePositionAu(au: number, metersPerUnit: number): number {
  return (au * AU_KM * 1000) / metersPerUnit
}

export function ifEarthWere(earthDisplayM: number, realKm: number): number {
  return earthDisplayM * (realKm / (2 * EARTH_MEAN_RADIUS_KM))
}
