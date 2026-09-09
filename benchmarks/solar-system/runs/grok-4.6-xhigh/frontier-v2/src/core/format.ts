import { AU_KM, C_KMS, DAY_S, EARTH_MEAN_RADIUS_KM, JULIAN_YEAR_DAYS } from './constants'

export function kmToAu(km: number): number {
  return km / AU_KM
}

export function auToKm(au: number): number {
  return au * AU_KM
}

export function lightTimeSeconds(km: number): number {
  return km / C_KMS
}

export function formatLightTime(seconds: number, lang: 'pt-BR' | 'en'): string {
  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 1) return lang === 'pt-BR' ? `${(seconds * 1000).toFixed(1)} ms` : `${(seconds * 1000).toFixed(1)} ms`
  if (seconds < 120) return lang === 'pt-BR' ? `${seconds.toFixed(1)} s` : `${seconds.toFixed(1)} s`
  if (seconds < 7200) return lang === 'pt-BR' ? `${(seconds / 60).toFixed(1)} min` : `${(seconds / 60).toFixed(1)} min`
  if (seconds < 172800) return lang === 'pt-BR' ? `${(seconds / 3600).toFixed(2)} h` : `${(seconds / 3600).toFixed(2)} h`
  return lang === 'pt-BR' ? `${(seconds / DAY_S).toFixed(2)} d` : `${(seconds / DAY_S).toFixed(2)} d`
}

export function daysToYears(days: number): number {
  return days / JULIAN_YEAR_DAYS
}

export function earthDiameters(km: number): number {
  return km / (2 * EARTH_MEAN_RADIUS_KM)
}

export function formatSci(n: number, digits = 3): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) return n.toExponential(digits)
  return n.toLocaleString('en-US', { maximumFractionDigits: digits })
}

export function formatKm(km: number, lang: 'pt-BR' | 'en'): string {
  if (!Number.isFinite(km)) return '—'
  const loc = lang === 'pt-BR' ? 'pt-BR' : 'en-US'
  if (Math.abs(km) >= 1_000_000) {
    return `${(km / 1e6).toLocaleString(loc, { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ×10⁶ km`
  }
  return `${km.toLocaleString(loc, { maximumFractionDigits: 0 })} km`
}

export function formatAu(au: number, lang: 'pt-BR' | 'en'): string {
  if (!Number.isFinite(au)) return '—'
  const loc = lang === 'pt-BR' ? 'pt-BR' : 'en-US'
  return `${au.toLocaleString(loc, { maximumFractionDigits: 4 })} ua`
}

export function formatMassKg(kg: number, lang: 'pt-BR' | 'en'): string {
  if (!Number.isFinite(kg)) return '—'
  const loc = lang === 'pt-BR' ? 'pt-BR' : 'en-US'
  return `${kg.toExponential(3).replace('.', loc === 'pt-BR' ? ',' : '.')} kg`
}

export function formatDays(days: number, lang: 'pt-BR' | 'en'): string {
  if (!Number.isFinite(days)) return '—'
  const loc = lang === 'pt-BR' ? 'pt-BR' : 'en-US'
  const abs = Math.abs(days)
  const sign = days < 0 ? '−' : ''
  if (abs < 1) return `${sign}${(abs * 24).toLocaleString(loc, { maximumFractionDigits: 2 })} h`
  if (abs > 400) {
    const y = abs / JULIAN_YEAR_DAYS
    return `${sign}${y.toLocaleString(loc, { maximumFractionDigits: 3 })} a (365,25 d)`
  }
  return `${sign}${abs.toLocaleString(loc, { maximumFractionDigits: 3 })} d`
}

export function formatK(k: number, lang: 'pt-BR' | 'en'): string {
  if (!Number.isFinite(k)) return '—'
  const loc = lang === 'pt-BR' ? 'pt-BR' : 'en-US'
  return `${k.toLocaleString(loc, { maximumFractionDigits: 0 })} K`
}

export function formatDateUtc(ms: number, lang: 'pt-BR' | 'en'): string {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return '—'
  const iso = d.toISOString().replace('.000Z', 'Z')
  if (lang === 'pt-BR') {
    const [date, time] = iso.split('T')
    const [y, m, day] = date.split('-')
    return `${day}/${m}/${y} ${time.replace('Z', '')} UTC`
  }
  return `${iso.replace('T', ' ').replace('Z', '')} UTC`
}

export function ratePhrase(rate: number, playing: boolean, direction: 1 | -1, lang: 'pt-BR' | 'en'): string {
  if (!playing) {
    const resume = ratePhrase(rate || 1, true, direction, lang)
    return lang === 'pt-BR' ? `Pausado · retoma ${resume}` : `Paused · resumes ${resume}`
  }
  const signed = rate * direction
  const abs = Math.abs(signed)
  const back = signed < 0
  const prefix = back ? (lang === 'pt-BR' ? 'Ré · ' : 'Reverse · ') : ''
  if (abs === 1) return prefix + (lang === 'pt-BR' ? '1× (1 s / s)' : '1× (1 s / s)')
  if (abs === 3600) return prefix + (lang === 'pt-BR' ? '1 hora / s' : '1 hour / s')
  if (abs === 86_400) return prefix + (lang === 'pt-BR' ? '1 dia / s' : '1 day / s')
  if (abs === 604_800) return prefix + (lang === 'pt-BR' ? '1 semana / s' : '1 week / s')
  if (abs === 2_592_000) return prefix + (lang === 'pt-BR' ? '1 mês de 30 d / s' : '30-day month / s')
  if (abs >= 86_400) {
    const days = abs / 86_400
    return prefix + (lang === 'pt-BR' ? `${days.toFixed(days >= 10 ? 0 : 1)} d / s` : `${days.toFixed(days >= 10 ? 0 : 1)} d / s`)
  }
  return prefix + `${formatSci(abs, 2)}×`
}

export function isoToDatetimeLocal(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}
