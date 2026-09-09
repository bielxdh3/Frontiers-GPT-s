import { computed, signal } from '@preact/signals';
import type { LocalizedText } from '../data/types';
import { PT_BR } from './pt-BR';
import { EN } from './en';

export type Locale = 'pt-BR' | 'en';
export const locale = signal<Locale>('pt-BR');

const DICTS: Record<Locale, Record<string, string>> = { 'pt-BR': PT_BR, en: EN };

/** Translate a key with optional {param} interpolation. Falls back to en, then the key. */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = DICTS[locale.value];
  let s = dict[key] ?? EN[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function tx(text: LocalizedText | undefined): string {
  if (!text) return '';
  return locale.value === 'pt-BR' ? text.pt : text.en;
}

export const localeTag = computed(() => (locale.value === 'pt-BR' ? 'pt-BR' : 'en-US'));

export function setLocale(l: Locale): void {
  locale.value = l;
  document.documentElement.lang = l;
}

/* ---------- Number formatting ---------- */

export function fmtNumber(v: number, maxFrac = 2, minFrac = 0): string {
  if (!Number.isFinite(v)) return t('common.unavailable');
  return new Intl.NumberFormat(localeTag.value, { maximumFractionDigits: maxFrac, minimumFractionDigits: minFrac }).format(v);
}

/** Compact but precise formatting for physical magnitudes. */
export function fmtSci(v: number, sig = 3): string {
  if (!Number.isFinite(v)) return t('common.unavailable');
  if (v === 0) return '0';
  const abs = Math.abs(v);
  if (abs >= 1e6 || abs < 1e-3) {
    const exp = Math.floor(Math.log10(abs));
    const mant = v / Math.pow(10, exp);
    const m = new Intl.NumberFormat(localeTag.value, { maximumFractionDigits: sig - 1, minimumFractionDigits: sig - 1 }).format(mant);
    return `${m} × 10${superscript(exp)}`;
  }
  const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(abs)));
  return new Intl.NumberFormat(localeTag.value, { maximumFractionDigits: Math.min(digits, 6) }).format(v);
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
export function superscript(n: number): string {
  const s = String(Math.abs(n)).split('').map((c) => SUP[Number(c)]).join('');
  return (n < 0 ? '⁻' : '') + s;
}

export function fmtKm(km: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(km)) return t('common.unavailable');
  if (opts.compact && Math.abs(km) >= 1e6) return `${fmtNumber(km / 1e6, 3)} ${t('unit.millionKm')}`;
  return `${fmtNumber(km, km < 100 ? 2 : 0)} km`;
}

export function fmtAu(au: number): string {
  if (!Number.isFinite(au)) return t('common.unavailable');
  return `${fmtNumber(au, au < 0.1 ? 5 : au < 10 ? 4 : 2)} ${t('unit.au')}`;
}

export function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return t('common.unavailable');
  const s = Math.abs(seconds);
  const sign = seconds < 0 ? '−' : '';
  if (s < 60) return `${sign}${fmtNumber(s, s < 10 ? 2 : 1)} ${t('unit.s')}`;
  if (s < 3600) return `${sign}${fmtNumber(Math.floor(s / 60), 0)} ${t('unit.min')} ${fmtNumber(Math.floor(s % 60), 0)} ${t('unit.s')}`;
  if (s < 86400) return `${sign}${fmtNumber(Math.floor(s / 3600), 0)} ${t('unit.h')} ${fmtNumber(Math.floor((s % 3600) / 60), 0)} ${t('unit.min')}`;
  if (s < 86400 * 365.25) return `${sign}${fmtNumber(s / 86400, 2)} ${t('unit.days')}`;
  return `${sign}${fmtNumber(s / (86400 * 365.25), 2)} ${t('unit.years')}`;
}

export function fmtHours(h: number): string {
  if (!Number.isFinite(h)) return t('common.unavailable');
  const a = Math.abs(h);
  if (a < 48) return `${fmtNumber(a, 2)} ${t('unit.h')}`;
  return `${fmtNumber(a / 24, 2)} ${t('unit.days')}`;
}

export function fmtDays(d: number): string {
  if (!Number.isFinite(d)) return t('common.unavailable');
  const a = Math.abs(d);
  if (a < 1) return `${fmtNumber(a * 24, 2)} ${t('unit.h')}`;
  if (a < 1000) return `${fmtNumber(a, 2)} ${t('unit.days')}`;
  return `${fmtNumber(a / 365.25, 2)} ${t('unit.years')}`;
}

export function fmtTempK(k: number, unit: 'K' | 'C' | 'F' = 'K'): string {
  if (!Number.isFinite(k)) return t('common.unavailable');
  if (unit === 'C') return `${fmtNumber(k - 273.15, 0)} °C`;
  if (unit === 'F') return `${fmtNumber((k - 273.15) * 1.8 + 32, 0)} °F`;
  return `${fmtNumber(k, 0)} K`;
}

export function fmtDeg(d: number, frac = 2): string {
  if (!Number.isFinite(d)) return t('common.unavailable');
  return `${fmtNumber(d, frac)}°`;
}

export function fmtPercent(p: number, frac = 0): string {
  if (!Number.isFinite(p)) return t('common.unavailable');
  return `${fmtNumber(p * 100, frac)}%`;
}

/* ---------- Date formatting (UTC) ---------- */

export function fmtDateTimeUtc(ms: number, withSeconds = false): string {
  if (!Number.isFinite(ms)) return t('common.unavailable');
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return t('common.unavailable');
  return new Intl.DateTimeFormat(localeTag.value, {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined, timeZone: 'UTC', hour12: false,
  }).format(d) + ' UTC';
}

export function fmtDateUtc(ms: number): string {
  if (!Number.isFinite(ms)) return t('common.unavailable');
  const d = new Date(ms);
  return new Intl.DateTimeFormat(localeTag.value, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d);
}

export function fmtIsoUtc(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
}

/** Parse a datetime-local style string as UTC. Returns NaN if invalid. */
export function parseIsoUtc(s: string): number {
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(s)) return NaN;
  const ms = Date.parse(s.length === 10 ? `${s}T00:00:00Z` : `${s}${s.length === 16 ? ':00' : ''}Z`);
  return ms;
}

/** Parse a user-entered number in the current locale (accepts , or . as decimal separator). */
export function parseLocaleNumber(s: string): number {
  const trimmed = s.trim().replace(/\s/g, '');
  if (!trimmed) return NaN;
  // If both separators present, assume the last one is decimal.
  const lastComma = trimmed.lastIndexOf(','), lastDot = trimmed.lastIndexOf('.');
  let norm = trimmed;
  if (lastComma >= 0 && lastDot >= 0) {
    norm = lastComma > lastDot ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed.replace(/,/g, '');
  } else if (lastComma >= 0) {
    norm = trimmed.replace(',', '.');
  }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(norm)) return NaN;
  return Number(norm);
}

/** Remove diacritics and lowercase for search matching. */
export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
