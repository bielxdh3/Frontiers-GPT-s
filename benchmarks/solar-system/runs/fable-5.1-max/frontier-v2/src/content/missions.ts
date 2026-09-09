import type { BodyId, LocalizedText } from '../data/types';

export type MissionType = 'flyby' | 'orbiter' | 'lander' | 'rover' | 'crewed' | 'probe' | 'sample-return';
export type MissionStatus = 'completed' | 'active' | 'enroute' | 'unverified';
export type MissionEra = '1960s' | '1980s' | '2000s' | '2020s';

export interface Mission {
  id: string;
  name: string;
  agency: string;
  type: MissionType;
  targets: BodyId[];
  /** ISO dates (UTC). Each milestone is separate; none is compressed into one ambiguous stamp. */
  launch: string;
  encounters?: { body: BodyId; date: string; label: LocalizedText }[];
  end?: string;
  status: MissionStatus;
  /** Date the status was last verified. */
  statusAsOf: string;
  achievement: LocalizedText;
  sourceUrl: string;
  sourceLabel: string;
  /** Whether the displayed route is schematic (always true here: no trajectory data is bundled). */
  schematicRoute: true;
}

const L = (pt: string, en: string): LocalizedText => ({ pt, en });
const AS_OF = '2026-08-31';

export const MISSIONS: Mission[] = [
  { id: 'apollo-11', name: 'Apollo 11', agency: 'NASA', type: 'crewed', targets: ['moon'], launch: '1969-07-16',
    encounters: [{ body: 'moon', date: '1969-07-20', label: L('Pouso (Mar da Tranquilidade)', 'Landing (Sea of Tranquility)') }], end: '1969-07-24', status: 'completed', statusAsOf: AS_OF,
    achievement: L('Primeiro pouso humano em outro mundo; 21,5 kg de amostras lunares trazidas à Terra.', 'First human landing on another world; 21.5 kg of lunar samples returned to Earth.'),
    sourceUrl: 'https://www.nasa.gov/mission/apollo-11/', sourceLabel: 'NASA — Apollo 11', schematicRoute: true },
  { id: 'viking-1', name: 'Viking 1', agency: 'NASA', type: 'lander', targets: ['mars'], launch: '1975-08-20',
    encounters: [{ body: 'mars', date: '1976-06-19', label: L('Inserção orbital', 'Orbit insertion') }, { body: 'mars', date: '1976-07-20', label: L('Pouso (Chryse Planitia)', 'Landing (Chryse Planitia)') }], end: '1982-11-13', status: 'completed', statusAsOf: AS_OF,
    achievement: L('Primeira operação prolongada bem-sucedida na superfície de Marte; imagens e análises de solo.', 'First successful long-duration operation on the Martian surface; imagery and soil analyses.'),
    sourceUrl: 'https://science.nasa.gov/mission/viking/', sourceLabel: 'NASA Science — Viking', schematicRoute: true },
  { id: 'voyager-1', name: 'Voyager 1', agency: 'NASA', type: 'flyby', targets: ['jupiter', 'saturn'], launch: '1977-09-05',
    encounters: [{ body: 'jupiter', date: '1979-03-05', label: L('Sobrevoo de Júpiter', 'Jupiter flyby') }, { body: 'saturn', date: '1980-11-12', label: L('Sobrevoo de Saturno', 'Saturn flyby') }], status: 'active', statusAsOf: AS_OF,
    achievement: L('Vulcões ativos em Io, detalhes dos anéis de Saturno; hoje no espaço interestelar, o objeto humano mais distante.', 'Active volcanoes on Io, details of Saturn\'s rings; now in interstellar space, the most distant human-made object.'),
    sourceUrl: 'https://science.nasa.gov/mission/voyager/', sourceLabel: 'NASA Science — Voyager', schematicRoute: true },
  { id: 'voyager-2', name: 'Voyager 2', agency: 'NASA', type: 'flyby', targets: ['jupiter', 'saturn', 'uranus', 'neptune'], launch: '1977-08-20',
    encounters: [{ body: 'jupiter', date: '1979-07-09', label: L('Sobrevoo de Júpiter', 'Jupiter flyby') }, { body: 'saturn', date: '1981-08-25', label: L('Sobrevoo de Saturno', 'Saturn flyby') }, { body: 'uranus', date: '1986-01-24', label: L('Sobrevoo de Urano', 'Uranus flyby') }, { body: 'neptune', date: '1989-08-25', label: L('Sobrevoo de Netuno', 'Neptune flyby') }], status: 'active', statusAsOf: AS_OF,
    achievement: L('Única sonda a visitar Urano e Netuno; descobriu luas, anéis e a Grande Mancha Escura.', 'The only spacecraft to visit Uranus and Neptune; discovered moons, rings and the Great Dark Spot.'),
    sourceUrl: 'https://science.nasa.gov/mission/voyager/', sourceLabel: 'NASA Science — Voyager', schematicRoute: true },
  { id: 'magellan', name: 'Magellan', agency: 'NASA', type: 'orbiter', targets: ['venus'], launch: '1989-05-04',
    encounters: [{ body: 'venus', date: '1990-08-10', label: L('Inserção orbital', 'Orbit insertion') }], end: '1994-10-13', status: 'completed', statusAsOf: AS_OF,
    achievement: L('Mapeou 98% da superfície de Vênus por radar através das nuvens.', 'Mapped 98% of Venus\'s surface by radar through the clouds.'),
    sourceUrl: 'https://science.nasa.gov/mission/magellan/', sourceLabel: 'NASA Science — Magellan', schematicRoute: true },
  { id: 'galileo', name: 'Galileo', agency: 'NASA', type: 'orbiter', targets: ['jupiter', 'io', 'europa', 'ganymede', 'callisto'], launch: '1989-10-18',
    encounters: [{ body: 'jupiter', date: '1995-12-07', label: L('Inserção orbital e sonda atmosférica', 'Orbit insertion and atmospheric probe') }], end: '2003-09-21', status: 'completed', statusAsOf: AS_OF,
    achievement: L('Primeira órbita de Júpiter; evidências de um oceano sob o gelo de Europa.', 'First Jupiter orbiter; evidence for an ocean beneath Europa\'s ice.'),
    sourceUrl: 'https://science.nasa.gov/mission/galileo/', sourceLabel: 'NASA Science — Galileo', schematicRoute: true },
  { id: 'cassini', name: 'Cassini–Huygens', agency: 'NASA / ESA / ASI', type: 'orbiter', targets: ['saturn', 'titan', 'enceladus'], launch: '1997-10-15',
    encounters: [{ body: 'saturn', date: '2004-07-01', label: L('Inserção orbital', 'Orbit insertion') }, { body: 'titan', date: '2005-01-14', label: L('Pouso da Huygens em Titã', 'Huygens landing on Titan') }], end: '2017-09-15', status: 'completed', statusAsOf: AS_OF,
    achievement: L('Treze anos em Saturno: gêiseres de Encélado, lagos de Titã, estrutura fina dos anéis.', 'Thirteen years at Saturn: Enceladus geysers, Titan lakes, fine ring structure.'),
    sourceUrl: 'https://science.nasa.gov/mission/cassini/', sourceLabel: 'NASA Science — Cassini', schematicRoute: true },
  { id: 'rosetta', name: 'Rosetta', agency: 'ESA', type: 'orbiter', targets: ['comet-observatory'], launch: '2004-03-02',
    encounters: [{ body: 'comet-observatory', date: '2014-08-06', label: L('Chegada ao cometa 67P (cometa real, não o cometa educativo)', 'Arrival at comet 67P (a real comet, not the educational comet)') }], end: '2016-09-30', status: 'completed', statusAsOf: AS_OF,
    achievement: L('Primeira órbita de um cometa e pouso do módulo Philae (67P/Churyumov–Gerasimenko).', 'First orbit of a comet and landing of the Philae module (67P/Churyumov–Gerasimenko).'),
    sourceUrl: 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta', sourceLabel: 'ESA — Rosetta', schematicRoute: true },
  { id: 'messenger', name: 'MESSENGER', agency: 'NASA', type: 'orbiter', targets: ['mercury'], launch: '2004-08-03',
    encounters: [{ body: 'mercury', date: '2011-03-18', label: L('Inserção orbital', 'Orbit insertion') }], end: '2015-04-30', status: 'completed', statusAsOf: AS_OF,
    achievement: L('Primeira órbita de Mercúrio; mapeou o planeta inteiro e confirmou gelo em crateras polares.', 'First Mercury orbiter; mapped the whole planet and confirmed ice in polar craters.'),
    sourceUrl: 'https://science.nasa.gov/mission/messenger/', sourceLabel: 'NASA Science — MESSENGER', schematicRoute: true },
  { id: 'new-horizons', name: 'New Horizons', agency: 'NASA', type: 'flyby', targets: ['pluto', 'charon', 'kuiper-belt'], launch: '2006-01-19',
    encounters: [{ body: 'pluto', date: '2015-07-14', label: L('Sobrevoo de Plutão', 'Pluto flyby') }, { body: 'kuiper-belt', date: '2019-01-01', label: L('Sobrevoo de Arrokoth', 'Arrokoth flyby') }], status: 'active', statusAsOf: AS_OF,
    achievement: L('Primeiras imagens detalhadas de Plutão e Caronte; primeiro sobrevoo de um objeto do Cinturão de Kuiper.', 'First detailed images of Pluto and Charon; first flyby of a Kuiper Belt object.'),
    sourceUrl: 'https://science.nasa.gov/mission/new-horizons/', sourceLabel: 'NASA Science — New Horizons', schematicRoute: true },
  { id: 'dawn', name: 'Dawn', agency: 'NASA', type: 'orbiter', targets: ['vesta', 'ceres'], launch: '2007-09-27',
    encounters: [{ body: 'vesta', date: '2011-07-16', label: L('Órbita de Vesta', 'Vesta orbit') }, { body: 'ceres', date: '2015-03-06', label: L('Órbita de Ceres', 'Ceres orbit') }], end: '2018-11-01', status: 'completed', statusAsOf: AS_OF,
    achievement: L('Primeira sonda a orbitar dois corpos distintos; revelou depósitos brilhantes de sal em Ceres.', 'First spacecraft to orbit two different bodies; revealed bright salt deposits on Ceres.'),
    sourceUrl: 'https://science.nasa.gov/mission/dawn/', sourceLabel: 'NASA Science — Dawn', schematicRoute: true },
  { id: 'juno', name: 'Juno', agency: 'NASA', type: 'orbiter', targets: ['jupiter'], launch: '2011-08-05',
    encounters: [{ body: 'jupiter', date: '2016-07-04', label: L('Inserção orbital', 'Orbit insertion') }], status: 'active', statusAsOf: AS_OF,
    achievement: L('Mapeou gravidade e campo magnético de Júpiter e revelou ciclones polares.', 'Mapped Jupiter\'s gravity and magnetic field and revealed polar cyclones.'),
    sourceUrl: 'https://science.nasa.gov/mission/juno/', sourceLabel: 'NASA Science — Juno', schematicRoute: true },
  { id: 'curiosity', name: 'Mars Science Laboratory (Curiosity)', agency: 'NASA', type: 'rover', targets: ['mars'], launch: '2011-11-26',
    encounters: [{ body: 'mars', date: '2012-08-06', label: L('Pouso (Cratera Gale)', 'Landing (Gale Crater)') }], status: 'active', statusAsOf: AS_OF,
    achievement: L('Confirmou ambientes antigos habitáveis com água líquida na Cratera Gale.', 'Confirmed ancient habitable environments with liquid water in Gale Crater.'),
    sourceUrl: 'https://science.nasa.gov/mission/msl-curiosity/', sourceLabel: 'NASA Science — MSL Curiosity', schematicRoute: true },
  { id: 'parker', name: 'Parker Solar Probe', agency: 'NASA', type: 'probe', targets: ['sun'], launch: '2018-08-12',
    encounters: [{ body: 'sun', date: '2024-12-24', label: L('Periélio mais próximo (~6,1 milhões de km)', 'Closest perihelion (~6.1 million km)') }], status: 'active', statusAsOf: AS_OF,
    achievement: L('Primeira sonda a atravessar a coroa solar; objeto humano mais rápido já construído.', 'First spacecraft to fly through the solar corona; fastest human-made object.'),
    sourceUrl: 'https://science.nasa.gov/mission/parker-solar-probe/', sourceLabel: 'NASA Science — Parker Solar Probe', schematicRoute: true },
  { id: 'perseverance', name: 'Mars 2020 (Perseverance)', agency: 'NASA', type: 'rover', targets: ['mars'], launch: '2020-07-30',
    encounters: [{ body: 'mars', date: '2021-02-18', label: L('Pouso (Cratera Jezero)', 'Landing (Jezero Crater)') }], status: 'active', statusAsOf: AS_OF,
    achievement: L('Coleta amostras para retorno futuro; o helicóptero Ingenuity realizou 72 voos.', 'Collecting samples for future return; the Ingenuity helicopter flew 72 times.'),
    sourceUrl: 'https://science.nasa.gov/mission/mars-2020-perseverance/', sourceLabel: 'NASA Science — Mars 2020', schematicRoute: true },
];

export function missionEra(m: Mission): MissionEra {
  const y = Number(m.launch.slice(0, 4));
  if (y < 1980) return '1960s';
  if (y < 2000) return '1980s';
  if (y < 2020) return '2000s';
  return '2020s';
}

export const MISSION_MAP: Record<string, Mission> = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));
