import { AU_KM } from '../core/constants'
import { heliocentricEclipticAu, JPL_TABLE1, keplerJ2000Position } from '../core/kepler'
import { cosd, degToRad, sind, unixMsToJd, wrap360 } from '../core/math'
import type { BodyId, Vec3 } from '../core/types'
import { getBody, majorPlanetIds } from '../data/catalog'

export type Pose = {
  km: Vec3
  ok: boolean
  parentKm: Vec3 | null
  relKm: Vec3 | null
  spinRad: number
  axialTiltRad: number
  sunDir: Vec3
}

const cache = new Map<string, Pose>()
let cacheMs = NaN

export function clearPoseCache(): void {
  cache.clear()
  cacheMs = NaN
}

export function poseAt(id: BodyId, simMs: number): Pose {
  if (cacheMs !== simMs) {
    cache.clear()
    cacheMs = simMs
  }
  const hit = cache.get(id)
  if (hit) return hit
  const p = computePose(id, simMs)
  cache.set(id, p)
  return p
}

function computePose(id: BodyId, simMs: number): Pose {
  const jd = unixMsToJd(simMs)
  const body = getBody(id)
  if (!body) return empty()
  if (id === 'sun' || body.kind === 'region') {
    return {
      km: { x: 0, y: 0, z: 0 },
      ok: true,
      parentKm: null,
      relKm: null,
      spinRad: spin(body.siderealRotationDays, simMs),
      axialTiltRad: degToRad(body.axialTiltDeg ?? 0),
      sunDir: { x: 1, y: 0, z: 0 },
    }
  }
  if (body.helioOrbit) {
    const helio = helioKm(body.helioOrbit, jd)
    const spinRad = spin(body.siderealRotationDays, simMs)
    return {
      km: helio.pos,
      ok: helio.ok,
      parentKm: { x: 0, y: 0, z: 0 },
      relKm: helio.pos,
      spinRad,
      axialTiltRad: degToRad(body.axialTiltDeg ?? 0),
      sunDir: norm({ x: -helio.pos.x, y: -helio.pos.y, z: -helio.pos.z }),
    }
  }
  if (body.satOrbit) {
    const parent = poseAt(body.satOrbit.parentId, simMs)
    const sat = satRelKm(body.satOrbit, jd, parent.axialTiltRad)
    const km = add(parent.km, sat.pos)
    const spinRad = body.tidallyLocked
      ? sat.trueAnomalyRad + degToRad(body.satOrbit.omegaDeg)
      : spin(body.siderealRotationDays, simMs)
    return {
      km,
      ok: parent.ok && sat.ok,
      parentKm: parent.km,
      relKm: sat.pos,
      spinRad,
      axialTiltRad: degToRad(body.axialTiltDeg ?? 0),
      sunDir: norm({ x: -km.x, y: -km.y, z: -km.z }),
    }
  }
  return empty()
}

function helioKm(orbit: NonNullable<import('../core/types').BodyRecord['helioOrbit']>, jd: number): { pos: Vec3; ok: boolean } {
  if (orbit.kind === 'jpl-table1') {
    const el = JPL_TABLE1[orbit.planet]
    const r = heliocentricEclipticAu(el, jd, false)
    return { pos: { x: r.pos.x * AU_KM, y: r.pos.y * AU_KM, z: r.pos.z * AU_KM }, ok: r.ok }
  }
  const r = keplerJ2000Position(orbit.aAu, orbit.e, orbit.iDeg, orbit.OmegaDeg, orbit.omegaDeg, orbit.M0Deg, orbit.periodDays, jd)
  return { pos: { x: r.pos.x * AU_KM, y: r.pos.y * AU_KM, z: r.pos.z * AU_KM }, ok: r.ok }
}

function satRelKm(
  orbit: NonNullable<import('../core/types').BodyRecord['satOrbit']>,
  jd: number,
  parentTiltRad: number,
): { pos: Vec3; ok: boolean; trueAnomalyRad: number } {
  const period = orbit.periodDays
  const absP = Math.abs(period)
  const r = keplerJ2000Position(
    orbit.aKm / AU_KM,
    orbit.e,
    orbit.iDeg,
    orbit.OmegaDeg,
    orbit.omegaDeg,
    orbit.M0Deg,
    absP,
    period < 0 ? 2 * 2451545 - jd : jd,
  )
  let pos = { x: r.pos.x * AU_KM, y: r.pos.y * AU_KM, z: r.pos.z * AU_KM }
  if (orbit.frame === 'parent-equator') {
    pos = equatorToEcliptic(pos, parentTiltRad)
  }
  const days = jd - 2451545.0
  const n = 360 / absP
  const M = wrap360(orbit.M0Deg + n * days * Math.sign(period || 1))
  return { pos, ok: r.ok, trueAnomalyRad: degToRad(M) }
}

function equatorToEcliptic(v: Vec3, eps: number): Vec3 {
  const c = Math.cos(eps)
  const s = Math.sin(eps)
  return {
    x: v.x,
    y: c * v.y + s * v.z,
    z: -s * v.y + c * v.z,
  }
}

function spin(periodDays: number | null, simMs: number): number {
  if (periodDays == null || periodDays === 0) return 0
  const days = (simMs - Date.parse('2000-01-01T12:00:00.000Z')) / 86_400_000
  return (2 * Math.PI * days) / periodDays
}

function empty(): Pose {
  return {
    km: { x: 0, y: 0, z: 0 },
    ok: false,
    parentKm: null,
    relKm: null,
    spinRad: 0,
    axialTiltRad: 0,
    sunDir: { x: 1, y: 0, z: 0 },
  }
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function norm(v: Vec3): Vec3 {
  const n = Math.hypot(v.x, v.y, v.z) || 1
  return { x: v.x / n, y: v.y / n, z: v.z / n }
}

export function distanceKm(a: BodyId, b: BodyId, simMs: number): number {
  const pa = poseAt(a, simMs).km
  const pb = poseAt(b, simMs).km
  return Math.hypot(pa.x - pb.x, pa.y - pb.y, pa.z - pb.z)
}

export function velocityApproxKmS(id: BodyId, simMs: number): Vec3 {
  const dt = 60
  const a = poseAt(id, simMs - dt * 1000).km
  clearPoseCache()
  const b = poseAt(id, simMs + dt * 1000).km
  return {
    x: (b.x - a.x) / (2 * dt),
    y: (b.y - a.y) / (2 * dt),
    z: (b.z - a.z) / (2 * dt),
  }
}

export function planetOrderIds(): BodyId[] {
  return majorPlanetIds()
}

export function angularSeparationDeg(observer: BodyId, a: BodyId, b: BodyId, simMs: number): number | null {
  const o = poseAt(observer, simMs).km
  const pa = poseAt(a, simMs).km
  const pb = poseAt(b, simMs).km
  const va = { x: pa.x - o.x, y: pa.y - o.y, z: pa.z - o.z }
  const vb = { x: pb.x - o.x, y: pb.y - o.y, z: pb.z - o.z }
  const na = Math.hypot(va.x, va.y, va.z)
  const nb = Math.hypot(vb.x, vb.y, vb.z)
  if (na < 1e-6 || nb < 1e-6) return null
  const dot = (va.x * vb.x + va.y * vb.y + va.z * vb.z) / (na * nb)
  const c = Math.min(1, Math.max(-1, dot))
  return (Math.acos(c) * 180) / Math.PI
}

export { sind, cosd }
