import {
  DEFAULT_RATE,
  MAX_FRAME_DT_S,
  SESSION_START_MS,
  VALID_END_MS,
  VALID_START_MS,
} from './constants'
import { clamp } from './math'

export type ClockState = {
  simMs: number
  playing: boolean
  direction: 1 | -1
  rate: number
  previousRate: number
  sessionStartMs: number
  lastRealMs: number
  documentHidden: boolean
  pausedByHidden: boolean
  catchUpBackground: boolean
  atBound: boolean
}

export function createClock(now = performance.now()): ClockState {
  return {
    simMs: SESSION_START_MS,
    playing: true,
    direction: 1,
    rate: DEFAULT_RATE,
    previousRate: DEFAULT_RATE,
    sessionStartMs: SESSION_START_MS,
    lastRealMs: now,
    documentHidden: false,
    pausedByHidden: false,
    catchUpBackground: false,
    atBound: false,
  }
}

export function advanceClock(c: ClockState, nowRealMs: number): { jumpedBound: boolean } {
  const rawDt = (nowRealMs - c.lastRealMs) / 1000
  c.lastRealMs = nowRealMs
  const dt = clamp(rawDt, 0, MAX_FRAME_DT_S)
  if (c.documentHidden && !c.catchUpBackground) {
    return { jumpedBound: false }
  }
  if (!c.playing || c.rate === 0) return { jumpedBound: false }
  const deltaSimMs = dt * 1000 * c.rate * c.direction
  const next = c.simMs + deltaSimMs
  if (next < VALID_START_MS) {
    c.simMs = VALID_START_MS
    c.playing = false
    c.atBound = true
    return { jumpedBound: true }
  }
  if (next > VALID_END_MS) {
    c.simMs = VALID_END_MS
    c.playing = false
    c.atBound = true
    return { jumpedBound: true }
  }
  c.simMs = next
  c.atBound = false
  return { jumpedBound: false }
}

export function setRate(c: ClockState, rate: number): string | null {
  if (!Number.isFinite(rate)) return 'nonfinite'
  const mag = Math.abs(rate)
  if (mag === 0) {
    if (c.rate > 0) c.previousRate = c.rate
    c.rate = 0
    c.playing = false
    return null
  }
  if (mag > 1e12) return 'too-large'
  c.rate = mag
  c.previousRate = mag
  c.direction = rate < 0 ? -1 : c.direction
  return null
}

export function togglePlay(c: ClockState): void {
  if (c.playing) {
    c.playing = false
    return
  }
  if (c.rate === 0) c.rate = c.previousRate || DEFAULT_RATE
  c.playing = true
  c.atBound = false
}

export function reverseDirection(c: ClockState): void {
  c.direction = c.direction === 1 ? -1 : 1
}

export function stepSim(c: ClockState, deltaSeconds: number): void {
  c.playing = false
  const next = c.simMs + deltaSeconds * 1000
  c.simMs = clamp(next, VALID_START_MS, VALID_END_MS)
  c.atBound = c.simMs === VALID_START_MS || c.simMs === VALID_END_MS
}

export function resetSimulation(c: ClockState): void {
  c.simMs = c.sessionStartMs
  c.playing = true
  c.direction = 1
  c.rate = DEFAULT_RATE
  c.previousRate = DEFAULT_RATE
  c.atBound = false
}

export function goToNow(c: ClockState): void {
  c.simMs = clamp(Date.now(), VALID_START_MS, VALID_END_MS)
  c.atBound = false
}

export function setDateMs(c: ClockState, ms: number): string | null {
  if (!Number.isFinite(ms)) return 'nonfinite'
  if (ms < VALID_START_MS || ms > VALID_END_MS) return 'out-of-range'
  c.simMs = ms
  c.atBound = false
  return null
}

export function onVisibility(c: ClockState, hidden: boolean): void {
  c.documentHidden = hidden
  if (hidden) {
    if (c.playing && !c.catchUpBackground) {
      c.pausedByHidden = true
      c.playing = false
    }
  } else if (c.pausedByHidden) {
    c.playing = true
    c.pausedByHidden = false
    c.lastRealMs = performance.now()
  }
}

export function signedRate(c: ClockState): number {
  if (!c.playing) return 0
  return c.rate * c.direction
}

export function parseRateInput(raw: string, localeDecimal = '.'): { value: number | null; error: string | null } {
  const t = raw.trim().replace(localeDecimal === ',' ? ',' : ',', localeDecimal === ',' ? '.' : '.')
  const normalized = t.replace(',', '.')
  if (!normalized) return { value: null, error: 'empty' }
  const n = Number(normalized)
  if (!Number.isFinite(n)) return { value: null, error: 'nonfinite' }
  return { value: n, error: null }
}
