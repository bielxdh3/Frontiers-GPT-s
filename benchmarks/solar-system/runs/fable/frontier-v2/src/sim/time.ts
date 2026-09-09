import { DAY_S, J2000_JD, JULIAN_YEAR_D } from '../data/types';
import { SUPPORTED_JD_MAX, SUPPORTED_JD_MIN } from '../data/bodies';

/** Julian Date from a Unix millisecond timestamp (UTC). */
export function jdFromUnixMs(ms: number): number {
  return ms / 86400000 + 2440587.5;
}

export function unixMsFromJd(jd: number): number {
  return (jd - 2440587.5) * 86400000;
}

/** Julian centuries since J2000.0. */
export function centuriesSinceJ2000(jd: number): number {
  return (jd - J2000_JD) / 36525;
}

export function daysSinceJ2000(jd: number): number {
  return jd - J2000_JD;
}

/** Deterministic default session start: 2026-01-01T00:00:00Z. */
export const DEFAULT_EPOCH_MS = Date.UTC(2026, 0, 1, 0, 0, 0);

export const RATE_PRESETS: { rate: number; key: string }[] = [
  { rate: 1, key: 'realtime' },
  { rate: 10, key: 'x10' },
  { rate: 100, key: 'x100' },
  { rate: 1000, key: 'x1000' },
  { rate: 3600, key: 'hourPerSec' },
  { rate: DAY_S, key: 'dayPerSec' },
  { rate: DAY_S * 7, key: 'weekPerSec' },
  { rate: DAY_S * 30, key: 'monthPerSec' },
  { rate: DAY_S * JULIAN_YEAR_D, key: 'yearPerSec' },
];

export const DEFAULT_RATE = DAY_S;
export const MAX_RATE = DAY_S * JULIAN_YEAR_D * 10; // 10 years per second
export const MIN_RATE = 0.001;

export type StepUnit = 'minute' | 'hour' | 'day' | 'week' | 'rotation' | 'orbit';

export const STEP_SECONDS: Record<Exclude<StepUnit, 'rotation' | 'orbit'>, number> = {
  minute: 60,
  hour: 3600,
  day: DAY_S,
  week: DAY_S * 7,
};

export interface ClockSnapshot {
  simMs: number;
  playing: boolean;
  direction: 1 | -1;
  rate: number;
}

export type ClockEvent = 'boundary' | 'jump';

/**
 * Single authoritative simulation clock.
 * One simulation second == one modeled second. Rate 1 == real time.
 */
export class SimClock {
  private _simMs: number;
  private _playing = false;
  private _direction: 1 | -1 = 1;
  private _rate: number = DEFAULT_RATE;
  private _lastNonZeroRate: number = DEFAULT_RATE;
  private _sessionStartMs: number;
  private _wasPlayingBeforeHide = false;
  private listeners = new Set<(e: ClockEvent, detail?: unknown) => void>();
  /** Bound for abnormal frame gaps (seconds of real time integrated per tick). */
  readonly maxRealStep = 0.25;
  readonly minMs = unixMsFromJd(SUPPORTED_JD_MIN);
  readonly maxMs = unixMsFromJd(SUPPORTED_JD_MAX);

  constructor(startMs: number = DEFAULT_EPOCH_MS) {
    this._simMs = startMs;
    this._sessionStartMs = startMs;
  }

  get simMs(): number { return this._simMs; }
  get jd(): number { return jdFromUnixMs(this._simMs); }
  get playing(): boolean { return this._playing; }
  get direction(): 1 | -1 { return this._direction; }
  get rate(): number { return this._rate; }
  get signedRate(): number { return this._playing ? this._rate * this._direction : 0; }
  get sessionStartMs(): number { return this._sessionStartMs; }
  get resumeRate(): number { return this._rate > 0 ? this._rate : this._lastNonZeroRate; }

  on(fn: (e: ClockEvent, detail?: unknown) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: ClockEvent, detail?: unknown): void {
    for (const l of this.listeners) l(e, detail);
  }

  /** Advance the clock by elapsed real seconds (monotonic). */
  tick(realDtSeconds: number): void {
    if (!this._playing) return;
    if (!Number.isFinite(realDtSeconds) || realDtSeconds <= 0) return;
    const dt = Math.min(realDtSeconds, this.maxRealStep);
    const next = this._simMs + this._direction * this._rate * dt * 1000;
    this.setSimMsInternal(next, false);
  }

  private setSimMsInternal(next: number, isJump: boolean): void {
    if (!Number.isFinite(next)) return;
    if (next < this.minMs || next > this.maxMs) {
      this._simMs = Math.min(this.maxMs, Math.max(this.minMs, next));
      if (this._playing) {
        this._playing = false;
        this.emit('boundary', { edge: next < this.minMs ? 'min' : 'max' });
      }
      if (isJump) this.emit('jump');
      return;
    }
    this._simMs = next;
    if (isJump) this.emit('jump');
  }

  play(): void { if (this._rate > 0) this._playing = true; }
  pause(): void { this._playing = false; }
  toggle(): void { this._playing ? this.pause() : this.play(); }

  setDirection(direction: 1 | -1): void { this._direction = direction; }
  reverse(): void { this._direction = this._direction === 1 ? -1 : 1; }

  /** Set a nonnegative rate magnitude. Zero pauses while remembering the previous rate. */
  setRate(rate: number): boolean {
    if (!Number.isFinite(rate) || rate < 0) return false;
    if (rate === 0) {
      if (this._rate > 0) this._lastNonZeroRate = this._rate;
      this._rate = 0;
      this._playing = false;
      return true;
    }
    this._rate = Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
    this._lastNonZeroRate = this._rate;
    return true;
  }

  /** Set a signed rate: sign sets direction, magnitude sets rate. */
  setSignedRate(signed: number): boolean {
    if (!Number.isFinite(signed)) return false;
    if (signed < 0) this._direction = -1;
    else if (signed > 0) this._direction = 1;
    return this.setRate(Math.abs(signed));
  }

  /** Resume after a zero rate using the remembered magnitude. */
  resume(): void {
    if (this._rate === 0) this._rate = this._lastNonZeroRate || DEFAULT_RATE;
    this._playing = true;
  }

  /** Discontinuous jump to an absolute instant (Unix ms). Emits `jump`. */
  setSimMs(ms: number): void { this.setSimMsInternal(ms, true); }
  setJd(jd: number): void { this.setSimMs(unixMsFromJd(jd)); }

  /** Step by signed seconds; leaves playback paused. */
  step(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    this._playing = false;
    this.setSimMsInternal(this._simMs + seconds * 1000, true);
  }

  /** Reset to the session start and default playback (paused, forward, default rate). */
  resetSimulation(): void {
    this._simMs = this._sessionStartMs;
    this._direction = 1;
    this._rate = DEFAULT_RATE;
    this._lastNonZeroRate = DEFAULT_RATE;
    this._playing = false;
    this.emit('jump');
  }

  goToNow(): void { this.setSimMs(Date.now()); }

  /** Document hidden: remember state and pause. */
  onHidden(): void {
    this._wasPlayingBeforeHide = this._playing;
    this._playing = false;
  }

  /** Document visible: resume only if it was playing before. No catch-up. */
  onVisible(): void {
    if (this._wasPlayingBeforeHide) this._playing = true;
    this._wasPlayingBeforeHide = false;
  }

  snapshot(): ClockSnapshot {
    return { simMs: this._simMs, playing: this._playing, direction: this._direction, rate: this._rate };
  }

  restore(s: ClockSnapshot): void {
    if (Number.isFinite(s.simMs)) this._simMs = Math.min(this.maxMs, Math.max(this.minMs, s.simMs));
    this._playing = !!s.playing;
    this._direction = s.direction === -1 ? -1 : 1;
    if (Number.isFinite(s.rate) && s.rate >= 0) this._rate = s.rate;
    this.emit('jump');
  }

  isWithinSupported(ms: number): boolean {
    return ms >= this.minMs && ms <= this.maxMs;
  }
}

/** Human-readable description of a rate as a "unit per second" phrase. */
export function describeRate(rate: number): { value: number; unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year' } {
  const yr = DAY_S * JULIAN_YEAR_D;
  if (rate >= yr) return { value: rate / yr, unit: 'year' };
  if (rate >= DAY_S * 30) return { value: rate / (DAY_S * 30), unit: 'month' };
  if (rate >= DAY_S * 7) return { value: rate / (DAY_S * 7), unit: 'week' };
  if (rate >= DAY_S) return { value: rate / DAY_S, unit: 'day' };
  if (rate >= 3600) return { value: rate / 3600, unit: 'hour' };
  if (rate >= 60) return { value: rate / 60, unit: 'minute' };
  return { value: rate, unit: 'second' };
}
