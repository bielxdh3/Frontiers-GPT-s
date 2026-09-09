import type { BodyId, LocalizedText } from '../data/types';
import { evaluateSystem } from '../sim/ephemeris';
import { jdFromUnixMs, unixMsFromJd, DEFAULT_EPOCH_MS } from '../sim/time';
import type { Tool } from '../state/store';

export type EventKind = 'historical' | 'model' | 'schematic';

export interface EventPreset {
  id: string;
  kind: EventKind;
  title: LocalizedText;
  description: LocalizedText;
  body?: BodyId;
  /** Historical events: sourced ISO instant. */
  isoUtc?: string;
  sourceUrl?: string;
  /** Model events: numerical search descriptor. */
  search?: { type: 'opposition'; planet: BodyId } | { type: 'conjunction'; a: BodyId; b: BodyId };
  /** Schematic demonstrations: open a laboratory. */
  tool?: Tool;
  toolPreset?: string;
}

const L = (pt: string, en: string): LocalizedText => ({ pt, en });

export const EVENTS: EventPreset[] = [
  { id: 'apollo11', kind: 'historical', body: 'moon', isoUtc: '1969-07-20T20:17:00Z', sourceUrl: 'https://www.nasa.gov/mission/apollo-11/',
    title: L('Pouso da Apollo 11', 'Apollo 11 landing'), description: L('Data de fonte histórica. A cena mostra a configuração aproximada do modelo nesse instante; a posição da Lua tem precisão de ~10 minutos de arco.', 'Sourced historical date. The scene shows the model\'s approximate configuration at that instant; the Moon\'s position is accurate to ~10 arcminutes.') },
  { id: 'voyager2-neptune', kind: 'historical', body: 'neptune', isoUtc: '1989-08-25T03:56:00Z', sourceUrl: 'https://science.nasa.gov/mission/voyager/',
    title: L('Voyager 2 em Netuno', 'Voyager 2 at Neptune'), description: L('Maior aproximação da Voyager 2 a Netuno. A sonda não é rastreada nesta cena; apenas a data e o planeta.', 'Voyager 2\'s closest approach to Neptune. The spacecraft is not tracked in this scene; only the date and the planet.') },
  { id: 'cassini-soi', kind: 'historical', body: 'saturn', isoUtc: '2004-07-01T02:48:00Z', sourceUrl: 'https://science.nasa.gov/mission/cassini/',
    title: L('Cassini entra em órbita de Saturno', 'Cassini enters Saturn orbit'), description: L('Inserção orbital da Cassini. Veja a inclinação dos anéis nessa época.', 'Cassini orbit insertion. Note the ring tilt at that epoch.') },
  { id: 'newhorizons-pluto', kind: 'historical', body: 'pluto', isoUtc: '2015-07-14T11:49:00Z', sourceUrl: 'https://science.nasa.gov/mission/new-horizons/',
    title: L('New Horizons em Plutão', 'New Horizons at Pluto'), description: L('Sobrevoo de Plutão. A posição de Plutão vem de elementos médios (Standish 1992), com erro de alguns minutos de arco.', 'Pluto flyby. Pluto\'s position comes from mean elements (Standish 1992), with an error of a few arcminutes.') },
  { id: 'eclipse-2024', kind: 'historical', body: 'moon', isoUtc: '2024-04-08T18:18:00Z', sourceUrl: 'https://science.nasa.gov/eclipses/future-eclipses/eclipse-2024/',
    title: L('Eclipse solar total de 2024', '2024 total solar eclipse'), description: L('Data histórica real. O modelo posiciona a Lua aproximadamente entre a Terra e o Sol, mas não reproduz a geometria do eclipse com precisão nem sua faixa de visibilidade.', 'Real historical date. The model places the Moon approximately between Earth and the Sun, but does not reproduce the eclipse geometry precisely nor its visibility path.') },
  { id: 'mars-opposition', kind: 'model', body: 'mars', search: { type: 'opposition', planet: 'mars' },
    title: L('Próxima oposição de Marte', 'Next Mars opposition'), description: L('Encontrada por busca numérica no modelo aproximado a partir do início da sessão: Terra entre o Sol e Marte (longitudes heliocêntricas iguais). Erro típico de horas a poucos dias.', 'Found by numerical search in the approximate model from the session start: Earth between the Sun and Mars (equal heliocentric longitudes). Typical error of hours to a few days.') },
  { id: 'jupiter-opposition', kind: 'model', body: 'jupiter', search: { type: 'opposition', planet: 'jupiter' },
    title: L('Próxima oposição de Júpiter', 'Next Jupiter opposition'), description: L('Encontrada por busca numérica no modelo: melhor época para observar Júpiter, a cada ~13 meses.', 'Found by numerical search in the model: the best time to observe Jupiter, every ~13 months.') },
  { id: 'jup-sat-conj', kind: 'model', body: 'jupiter', search: { type: 'conjunction', a: 'jupiter', b: 'saturn' },
    title: L('Próxima conjunção Júpiter–Saturno (vista da Terra)', 'Next Jupiter–Saturn conjunction (seen from Earth)'), description: L('Longitudes geocêntricas iguais, encontradas no modelo. Conjunções ocorrem a cada ~20 anos; a de 2020 foi a mais próxima desde 1623.', 'Equal geocentric longitudes, found in the model. Conjunctions occur every ~20 years; the 2020 one was the closest since 1623.') },
  { id: 'demo-phases', kind: 'schematic', tool: 'moon-lab', toolPreset: 'none',
    title: L('Demonstração: fases da Lua', 'Demonstration: lunar phases'), description: L('Configuração pedagógica no laboratório da Lua, sem data real associada.', 'Pedagogical setup in the Moon lab, with no associated real date.') },
  { id: 'demo-solar-eclipse', kind: 'schematic', tool: 'moon-lab', toolPreset: 'solar',
    title: L('Demonstração: alinhamento de eclipse solar', 'Demonstration: solar eclipse alignment'), description: L('Diagrama esquemático de umbra e penumbra. Não é a previsão de um eclipse real.', 'Schematic umbra and penumbra diagram. Not a prediction of a real eclipse.') },
  { id: 'demo-equinox', kind: 'schematic', tool: 'seasons-lab', toolPreset: 'marchEquinox',
    title: L('Demonstração: geometria do equinócio', 'Demonstration: equinox geometry'), description: L('Posição orbital em que a declinação solar é 0°, no laboratório de estações.', 'Orbital position where solar declination is 0°, in the seasons lab.') },
];

/* ---------- numerical search in the model ---------- */

const cache = new Map<string, number | null>();

function helioLon(jd: number, id: BodyId): number {
  const st = evaluateSystem(jd).get(id)!;
  return Math.atan2(st.pos.y, st.pos.x);
}

function geoLon(jd: number, id: BodyId): number {
  const s = evaluateSystem(jd);
  const e = s.get('earth')!.pos, p = s.get(id)!.pos;
  return Math.atan2(p.y - e.y, p.x - e.x);
}

const wrap = (a: number): number => { let x = a % (2 * Math.PI); if (x > Math.PI) x -= 2 * Math.PI; if (x < -Math.PI) x += 2 * Math.PI; return x; };

/** Find the first zero crossing of f (wrapped angle difference) after fromJd within spanDays. */
function findZero(f: (jd: number) => number, fromJd: number, spanDays: number, stepDays: number): number | null {
  let prevJd = fromJd, prev = f(prevJd);
  for (let d = stepDays; d <= spanDays; d += stepDays) {
    const jd = fromJd + d;
    const cur = f(jd);
    if (Math.abs(cur - prev) < Math.PI && Math.sign(cur) !== Math.sign(prev)) {
      // bisection
      let a = prevJd, b = jd, fa = prev;
      for (let i = 0; i < 40; i++) {
        const m = (a + b) / 2, fm = f(m);
        if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
      }
      return (a + b) / 2;
    }
    prevJd = jd; prev = cur;
  }
  return null;
}

/** Resolve an event to a Unix-ms instant (memoized). Model events search from the default session epoch. */
export function resolveEventMs(ev: EventPreset): number | null {
  if (ev.isoUtc) return Date.parse(ev.isoUtc);
  if (!ev.search) return null;
  if (cache.has(ev.id)) return cache.get(ev.id)!;
  const fromJd = jdFromUnixMs(DEFAULT_EPOCH_MS);
  let jd: number | null = null;
  if (ev.search.type === 'opposition') {
    const planet = ev.search.planet;
    jd = findZero((j) => wrap(helioLon(j, planet) - helioLon(j, 'earth')), fromJd, 900, 2);
  } else {
    const { a, b } = ev.search;
    jd = findZero((j) => wrap(geoLon(j, a) - geoLon(j, b)), fromJd, 365.25 * 25, 5);
  }
  const ms = jd === null ? null : unixMsFromJd(jd);
  cache.set(ev.id, ms);
  return ms;
}
