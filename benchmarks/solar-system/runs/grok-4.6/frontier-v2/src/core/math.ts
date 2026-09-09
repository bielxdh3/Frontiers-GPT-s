import { J2000_JD, UNIX_JD_OFFSET } from './constants'

export function unixMsToJd(ms: number): number {
  return ms / 86_400_000 + UNIX_JD_OFFSET
}

export function jdToUnixMs(jd: number): number {
  return (jd - UNIX_JD_OFFSET) * 86_400_000
}

export function centuriesSinceJ2000(jd: number): number {
  return (jd - J2000_JD) / 36_525
}

export function wrap180(deg: number): number {
  let x = ((deg + 180) % 360 + 360) % 360 - 180
  if (x === -180) x = 180
  return x
}

export function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360
}

export function degToRad(d: number): number {
  return d * (Math.PI / 180)
}

export function radToDeg(r: number): number {
  return r * (180 / Math.PI)
}

export function sind(d: number): number {
  return Math.sin(degToRad(d))
}

export function cosd(d: number): number {
  return Math.cos(degToRad(d))
}

export function clamp(x: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, x))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function hypot3(x: number, y: number, z: number): number {
  return Math.hypot(x, y, z)
}

export function finite(n: number): boolean {
  return Number.isFinite(n)
}

export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
