import { AU_KM, EARTH_MEAN_RADIUS_KM, J2000_JD, SESSION_START_MS } from './constants'
import { advanceClock, createClock, resetSimulation, reverseDirection, setRate, stepSim, togglePlay } from './clock'
import { auToKm, kmToAu } from './format'
import { heliocentricEclipticAu, JPL_TABLE1, solveKepler } from './kepler'
import { orbitLabDerived, periodSeconds, sunGm } from './gravity'
import { displayRadius, mapVecKm } from './scale'
import { ALL_BODIES, getBody, radiusKm } from '../data/catalog'
import { distanceKm, poseAt } from '../sim/ephemeris'

let failed = 0
function check(name: string, fn: () => void): void {
  try {
    fn()
    console.log('ok', name)
  } catch (e) {
    failed += 1
    console.error('FAIL', name, e)
  }
}

check('kepler circular', () => {
  const r = solveKepler(30, 0)
  if (!r.ok) throw new Error('not ok')
  if (Math.abs(r.Edeg - 30) > 1e-5) throw new Error(String(r.Edeg))
})

check('table1 finite J2000', () => {
  for (const key of Object.keys(JPL_TABLE1)) {
    const p = heliocentricEclipticAu(JPL_TABLE1[key], J2000_JD)
    if (!p.ok || !Number.isFinite(p.pos.x + p.pos.y + p.pos.z)) throw new Error(key)
  }
})

check('earth year', () => {
  const a = heliocentricEclipticAu(JPL_TABLE1.emb, J2000_JD)
  const b = heliocentricEclipticAu(JPL_TABLE1.emb, J2000_JD + 365.25)
  let d = Math.atan2(b.pos.y, b.pos.x) - Math.atan2(a.pos.y, a.pos.x)
  while (d > Math.PI) d -= 2 * Math.PI
  while (d < -Math.PI) d += 2 * Math.PI
  if (Math.abs(d) >= 0.05) throw new Error(String(d))
})

check('forward reverse', () => {
  const t0 = J2000_JD + 8000
  const p0 = heliocentricEclipticAu(JPL_TABLE1.mars, t0)
  const p1 = heliocentricEclipticAu(JPL_TABLE1.mars, t0 + 40)
  const p2 = heliocentricEclipticAu(JPL_TABLE1.mars, t0)
  if (Math.abs(p1.pos.x - p0.pos.x) < 1e-6) throw new Error('no motion')
  if (Math.abs(p2.pos.x - p0.pos.x) > 1e-8) throw new Error('asymmetry')
})

check('clock 1x', () => {
  const c = createClock(0)
  c.rate = 1
  c.playing = true
  c.lastRealMs = 0
  advanceClock(c, 100)
  if (Math.abs(c.simMs - SESSION_START_MS - 100) > 1) throw new Error(String(c.simMs))
})

check('clock pause reverse', () => {
  const c = createClock(0)
  setRate(c, 0)
  if (c.playing) throw new Error('playing')
  reverseDirection(c)
  if (c.playing) throw new Error('resumed')
  togglePlay(c)
  if (!c.playing || c.rate <= 0) throw new Error('resume')
})

check('clock step', () => {
  const c = createClock(0)
  stepSim(c, 86400)
  if (c.playing) throw new Error('playing')
  if (c.simMs !== SESSION_START_MS + 86_400_000) throw new Error(String(c.simMs))
})

check('clock reset', () => {
  const c = createClock(0)
  c.simMs = SESSION_START_MS + 1e9
  resetSimulation(c)
  if (c.simMs !== SESSION_START_MS || c.rate !== 86400) throw new Error('reset')
})

check('au roundtrip', () => {
  if (Math.abs(kmToAu(auToKm(1)) - 1) > 1e-12) throw new Error('au')
})

check('kepler III earth year', () => {
  const a = 1.00000261 * AU_KM * 1000
  const T = periodSeconds(a, sunGm())
  if (Math.abs(T / 86400 - 365.25) > 0.6) throw new Error(String(T / 86400))
})

check('hyperbolic rejected', () => {
  const r = orbitLabDerived({ centralMassKg: 1e30, aM: 1e11, e: 1.2 })
  if (r.ok) throw new Error('accepted e>1')
})

check('moon distance physical', () => {
  const d = distanceKm('moon', 'earth', SESSION_START_MS)
  if (d < 300_000 || d > 500_000) throw new Error(String(d))
  const p = poseAt('moon', SESSION_START_MS)
  const re = Math.hypot(...Object.values(mapVecKm(p.km, 'exploration')))
  const rr = Math.hypot(...Object.values(mapVecKm(p.km, 'relative')))
  if (Math.abs(re - rr) < 0.01) throw new Error('scale identical')
})

check('display radius', () => {
  if (displayRadius(EARTH_MEAN_RADIUS_KM, 'exploration') <= 0) throw new Error('r')
})

check('catalog ids', () => {
  const ids = new Set<string>()
  for (const b of ALL_BODIES) {
    if (ids.has(b.id)) throw new Error('dup ' + b.id)
    ids.add(b.id)
    if (b.parentId && !getBody(b.parentId)) throw new Error('parent ' + b.id)
    if (b.massKg != null && b.massKg === 0) throw new Error('zero mass ' + b.id)
    if (b.meanRadiusKm != null && b.massKg != null && b.densityGCm3 != null && b.meanRadiusKm > 50) {
      const rM = b.meanRadiusKm * 1000
      const vol = (4 / 3) * Math.PI * rM ** 3
      const rho = b.massKg / vol / 1000
      if (Math.abs(rho - b.densityGCm3) / b.densityGCm3 >= 0.25) throw new Error('density ' + b.id)
    }
  }
  if (getBody('earth')?.helioOrbit?.kind !== 'jpl-table1') throw new Error('emb')
})

check('moon vs earth spin', () => {
  const a = poseAt('moon', SESSION_START_MS)
  const b = poseAt('earth', SESSION_START_MS)
  const later = SESSION_START_MS + 3600_000 * 10
  const a2 = poseAt('moon', later)
  const b2 = poseAt('earth', later)
  if (Math.abs(b2.spinRad - b.spinRad) <= 0.1) throw new Error('no spin')
  const r1 = Math.hypot(a.km.x - b.km.x, a.km.y - b.km.y, a.km.z - b.km.z)
  const r2 = Math.hypot(a2.km.x - b2.km.x, a2.km.y - b2.km.y, a2.km.z - b2.km.z)
  if (Math.abs(r1 - r2) / r1 >= 0.05) throw new Error('drift')
})

check('earth radius', () => {
  const e = getBody('earth')!
  if (radiusKm(e) !== e.meanRadiusKm) throw new Error('radius')
})

if (failed) {
  console.error(failed, 'failed')
  throw new Error(`${failed} science checks failed`)
}
console.log('all checks passed')
