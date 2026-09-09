import type { BodyDef, BodyId, HelioElements, LocalizedText, RingSpec, SatelliteOrbit } from './types';

/** Julian Dates bounding the supported simulation interval (1800-01-01 to 2051-01-01 UTC). */
export const SUPPORTED_JD_MIN = 2378495.5;
export const SUPPORTED_JD_MAX = 2470172.5;

const T1 = { validFromJd: SUPPORTED_JD_MIN, validToJd: SUPPORTED_JD_MAX, model: 'jpl-table1' as const, sourceId: 'jpl-approx' };

function el(
  a: number, aDot: number, e: number, eDot: number, i: number, iDot: number,
  L: number, LDot: number, wBar: number, wBarDot: number, Omega: number, OmegaDot: number,
  meta: Pick<HelioElements, 'validFromJd' | 'validToJd' | 'model' | 'sourceId'> = T1,
  extra?: Pick<HelioElements, 'b' | 'c' | 's' | 'f'>,
): HelioElements {
  return { a, aDot, e, eDot, i, iDot, L, LDot, wBar, wBarDot, Omega, OmegaDot, ...meta, ...(extra ?? {}) };
}

/** Mean-element helper for small bodies: geometry sourced, phase approximate. */
function meanEl(a: number, e: number, i: number, Omega: number, omega: number, M0: number, periodDays: number, sourceId = 'jpl-sbdb', model: HelioElements['model'] = 'mean-elements'): HelioElements {
  const wBar = Omega + omega;
  const L = wBar + M0;
  const LDot = (360 / periodDays) * 36525;
  return { a, aDot: 0, e, eDot: 0, i, iDot: 0, L, LDot, wBar, wBarDot: 0, Omega, OmegaDot: 0, validFromJd: SUPPORTED_JD_MIN, validToJd: SUPPORTED_JD_MAX, model, sourceId };
}

function sat(aKm: number, e: number, periodDays: number, inclinationDeg: number, phaseDeg: number, sourceId = 'nssdc-factsheets', plane: SatelliteOrbit['plane'] = 'parent-equator'): SatelliteOrbit {
  return { aKm, e, periodDays, inclinationDeg, nodeDeg: 0, periDeg: 0, meanAnomalyAtEpochDeg: phaseDeg, plane, phaseIsReal: false, sourceId };
}

const t = (pt: string, en: string): LocalizedText => ({ pt, en });

const SATURN_RINGS: RingSpec = {
  enhanced: false,
  bands: [
    { name: 'D', innerKm: 66900, outerKm: 74510, opacity: 0.05, color: '#8d8578' },
    { name: 'C', innerKm: 74658, outerKm: 92000, opacity: 0.18, color: '#9c9484' },
    { name: 'B', innerKm: 92000, outerKm: 117580, opacity: 0.88, color: '#d9cdb4' },
    { name: 'Cassini', innerKm: 117580, outerKm: 122170, opacity: 0.1, color: '#8a8478' },
    { name: 'A', innerKm: 122170, outerKm: 133400, opacity: 0.58, color: '#c8bca4' },
    { name: 'Encke', innerKm: 133400, outerKm: 133750, opacity: 0.03, color: '#8a8478' },
    { name: 'A-outer', innerKm: 133750, outerKm: 136775, opacity: 0.5, color: '#c4b89e' },
    { name: 'F', innerKm: 140000, outerKm: 140400, opacity: 0.25, color: '#d8d0c0' },
  ],
};

const JUPITER_RINGS: RingSpec = {
  enhanced: true,
  bands: [
    { name: 'Halo', innerKm: 92000, outerKm: 122500, opacity: 0.02, color: '#b8a898' },
    { name: 'Main', innerKm: 122500, outerKm: 129000, opacity: 0.06, color: '#c8b8a8' },
    { name: 'Gossamer', innerKm: 129000, outerKm: 226000, opacity: 0.008, color: '#b0a090' },
  ],
};

const URANUS_RINGS: RingSpec = {
  enhanced: true,
  bands: [
    { name: 'Inner (6,5,4,α,β,η,γ,δ)', innerKm: 41800, outerKm: 48300, opacity: 0.07, color: '#9fb4bc' },
    { name: 'ε', innerKm: 50900, outerKm: 51400, opacity: 0.35, color: '#b8c8ce' },
  ],
};

const NEPTUNE_RINGS: RingSpec = {
  enhanced: true,
  bands: [
    { name: 'Galle', innerKm: 41000, outerKm: 43000, opacity: 0.03, color: '#9fb0c8' },
    { name: 'Le Verrier', innerKm: 53100, outerKm: 53300, opacity: 0.1, color: '#b0c0d8' },
    { name: 'Adams', innerKm: 62800, outerKm: 63100, opacity: 0.15, color: '#b8c8e0' },
  ],
};

export const BODIES: BodyDef[] = [
  {
    id: 'sun', kind: 'star', level: 'simulated',
    names: { pt: 'Sol', en: 'Sun', aliases: ['sol', 'sun', 'estrela', 'star'] },
    physical: {
      meanRadiusKm: 695700, massKg: 1.98841e30, densityGcm3: 1.408, gravityMs2: 274.0, gravityRef: 'photosphere',
      escapeVelocityKms: 617.6, tempMeanK: 5772, tempRef: 'photosphere', axialTiltDeg: 7.25, knownMoons: undefined,
    },
    rotation: { periodHours: 609.12, poleRA: 286.13, poleDec: 63.87, w0Deg: 84.176, wRateDegPerDay: 14.1844 },
    appearance: { texture: 'sun', color: '#ffb347', accent: '#ff7a1a', emissive: true, seed: 11, illustrative: true },
    summary: t(
      'A estrela do sistema: contém 99,8% de toda a massa e ilumina tudo o que você vê aqui.',
      'The system\'s star: it holds 99.8% of all the mass and lights everything you see here.',
    ),
    facts: [
      t('A luz do Sol leva cerca de 8 minutos e 19 segundos para chegar à Terra.', 'Sunlight takes about 8 minutes 19 seconds to reach Earth.'),
      t('A superfície visível (fotosfera) tem cerca de 5.772 K; a coroa é muito mais quente.', 'The visible surface (photosphere) is about 5,772 K; the corona is far hotter.'),
      t('O período de rotação varia com a latitude: cerca de 25 dias no equador e mais de 30 nos polos.', 'Rotation varies with latitude: about 25 days at the equator and over 30 at the poles.'),
    ],
    sourceIds: ['nssdc-factsheets', 'iau-wg-2015', 'nasa-solar-system'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'mercury', kind: 'planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Mercúrio', en: 'Mercury', aliases: ['mercurio', 'mercury'] },
    physical: {
      meanRadiusKm: 2439.4, equatorialRadiusKm: 2440.53, massKg: 3.30103e23, densityGcm3: 5.4289, gravityMs2: 3.70, gravityRef: 'surface',
      escapeVelocityKms: 4.25, tempMeanK: 440, tempMinK: 100, tempMaxK: 700, tempRef: 'surface', axialTiltDeg: 0.034,
      solarDayHours: 4222.6, knownMoons: 0, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.106, orbitalPeriodDays: 87.969, semiMajorAxisAu: 0.387, eccentricity: 0.2056, inclinationDeg: 7.0,
    },
    orbit: el(0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081),
    rotation: { periodHours: 1407.5088, poleRA: 281.0103, poleDec: 61.4155, w0Deg: 329.5988, wRateDegPerDay: 6.1385108 },
    appearance: { texture: 'mercury', color: '#a89f94', accent: '#6f6861', seed: 21, illustrative: true },
    summary: t(
      'O menor planeta e o mais próximo do Sol: um mundo de crateras, sem atmosfera significativa.',
      'The smallest planet and the closest to the Sun: a cratered world with no significant atmosphere.',
    ),
    facts: [
      t('Um dia solar em Mercúrio (do nascer ao nascer do Sol) dura cerca de 176 dias terrestres — dois anos mercurianos.', 'A solar day on Mercury (sunrise to sunrise) lasts about 176 Earth days — two Mercury years.'),
      t('A órbita é a mais excêntrica entre os planetas (e ≈ 0,206).', 'Its orbit is the most eccentric among the planets (e ≈ 0.206).'),
      t('A temperatura da superfície varia de cerca de 100 K à noite a 700 K ao meio-dia.', 'Surface temperature ranges from about 100 K at night to 700 K at noon.'),
    ],
    sourceIds: ['jpl-phys', 'jpl-approx', 'iau-wg-2015', 'nssdc-factsheets'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'venus', kind: 'planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Vênus', en: 'Venus', aliases: ['venus', 'estrela da manhã', 'estrela vespertina', 'morning star', 'evening star'] },
    physical: {
      meanRadiusKm: 6051.8, equatorialRadiusKm: 6051.8, massKg: 4.86731e24, densityGcm3: 5.243, gravityMs2: 8.87, gravityRef: 'surface',
      escapeVelocityKms: 10.36, tempMeanK: 737, tempRef: 'surface', axialTiltDeg: 177.36, solarDayHours: 2802.0,
      knownMoons: 0, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.65, orbitalPeriodDays: 224.701, semiMajorAxisAu: 0.723, eccentricity: 0.0068, inclinationDeg: 3.39,
    },
    orbit: el(0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418),
    rotation: { periodHours: -5832.443, poleRA: 272.76, poleDec: 67.16, w0Deg: 160.20, wRateDegPerDay: -1.4813688 },
    appearance: { texture: 'venus', color: '#e6c58a', accent: '#c9a462', atmosphere: { color: '#f2dcae', intensity: 0.5 }, seed: 31, illustrative: true },
    summary: t(
      'Envolta por nuvens densas de ácido sulfúrico, tem a superfície mais quente de todos os planetas.',
      'Wrapped in dense sulfuric-acid clouds, it has the hottest surface of any planet.',
    ),
    facts: [
      t('Gira ao contrário (rotação retrógrada) e muito devagar: um dia sideral dura 243 dias terrestres.', 'It spins backwards (retrograde rotation) and very slowly: a sidereal day lasts 243 Earth days.'),
      t('A pressão atmosférica na superfície é cerca de 92 vezes a da Terra ao nível do mar.', 'Surface atmospheric pressure is about 92 times Earth\'s at sea level.'),
      t('O que se vê da órbita são nuvens; a superfície foi mapeada por radar, não por luz visível.', 'What you see from orbit are clouds; the surface was mapped by radar, not visible light.'),
    ],
    sourceIds: ['jpl-phys', 'jpl-approx', 'iau-wg-2015', 'nssdc-factsheets'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'earth', kind: 'planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Terra', en: 'Earth', aliases: ['terra', 'earth', 'mundo', 'world', 'planeta azul', 'blue planet'] },
    physical: {
      meanRadiusKm: 6371.0084, equatorialRadiusKm: 6378.1366, massKg: 5.97217e24, densityGcm3: 5.5134, gravityMs2: 9.80, gravityRef: 'surface',
      escapeVelocityKms: 11.19, tempMeanK: 288, tempMinK: 184, tempMaxK: 330, tempRef: 'surface', axialTiltDeg: 23.44, solarDayHours: 24.0,
      knownMoons: 1, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.367, orbitalPeriodDays: 365.256, semiMajorAxisAu: 1.0, eccentricity: 0.0167, inclinationDeg: 0.0,
    },
    orbit: el(1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0),
    rotation: { periodHours: 23.9344696, poleRA: 0.0, poleDec: 90.0, w0Deg: 190.147, wRateDegPerDay: 360.9856235 },
    appearance: { texture: 'earth', color: '#4f8fd9', accent: '#3a7d44', atmosphere: { color: '#7fb3ff', intensity: 0.9 }, clouds: true, nightLights: true, seed: 41, illustrative: false },
    summary: t(
      'Nosso planeta: oceanos líquidos, atmosfera rica em oxigênio e a única vida conhecida.',
      'Our planet: liquid oceans, an oxygen-rich atmosphere and the only known life.',
    ),
    facts: [
      t('Cerca de 71% da superfície é coberta por água.', 'About 71% of the surface is covered by water.'),
      t('A inclinação do eixo (23,4°) é o que causa as estações, não a distância ao Sol.', 'The axial tilt (23.4°) is what causes seasons, not the distance to the Sun.'),
      t('O dia sideral dura 23 h 56 min; o dia solar médio, 24 h.', 'The sidereal day lasts 23 h 56 min; the mean solar day, 24 h.'),
    ],
    sourceIds: ['jpl-phys', 'jpl-approx', 'iau-wg-2015', 'nssdc-factsheets', 'nasa-seasons'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'moon', kind: 'moon', level: 'simulated', parent: 'earth',
    names: { pt: 'Lua', en: 'Moon', aliases: ['lua', 'moon', 'luna', 'satélite da terra'] },
    physical: {
      meanRadiusKm: 1737.4, massKg: 7.346e22, densityGcm3: 3.344, gravityMs2: 1.62, gravityRef: 'surface', escapeVelocityKms: 2.38,
      tempMeanK: 250, tempMinK: 95, tempMaxK: 390, tempRef: 'surface', axialTiltDeg: 6.68, solarDayHours: 708.7, geometricAlbedo: 0.12,
      orbitalPeriodDays: 27.3217, semiMajorAxisAu: 384400 / 149597870.7, eccentricity: 0.0549, inclinationDeg: 5.145,
    },
    satellite: { aKm: 384400, e: 0.0549, periodDays: 27.321661, inclinationDeg: 5.145, nodeDeg: 125.04, periDeg: 318.15, meanAnomalyAtEpochDeg: 134.96, plane: 'ecliptic', phaseIsReal: true, sourceId: 'meeus-1998' },
    rotation: { periodHours: 655.72, poleRA: 269.9949, poleDec: 66.5392, w0Deg: 38.3213, wRateDegPerDay: 13.17635815 },
    appearance: { texture: 'moon', color: '#b9b5ad', accent: '#5f5c58', seed: 51, illustrative: true },
    summary: t(
      'O único satélite natural da Terra: mostra sempre a mesma face para nós por causa da rotação sincronizada.',
      'Earth\'s only natural satellite: it always shows us the same face because of synchronous rotation.',
    ),
    facts: [
      t('A distância média é 384.400 km — cerca de 30 diâmetros terrestres.', 'The mean distance is 384,400 km — about 30 Earth diameters.'),
      t('As fases acontecem porque vemos porções diferentes do hemisfério iluminado, não por causa da sombra da Terra.', 'Phases happen because we see different portions of the lit hemisphere, not because of Earth\'s shadow.'),
      t('O mês sinódico (de lua nova a lua nova) dura 29,53 dias.', 'The synodic month (new moon to new moon) lasts 29.53 days.'),
    ],
    sourceIds: ['nssdc-factsheets', 'meeus-1998', 'iau-wg-2015', 'nasa-eclipses'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'mars', kind: 'planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Marte', en: 'Mars', aliases: ['marte', 'mars', 'planeta vermelho', 'red planet'] },
    physical: {
      meanRadiusKm: 3389.5, equatorialRadiusKm: 3396.19, massKg: 6.41691e23, densityGcm3: 3.934, gravityMs2: 3.71, gravityRef: 'surface',
      escapeVelocityKms: 5.03, tempMeanK: 210, tempMinK: 130, tempMaxK: 308, tempRef: 'surface', axialTiltDeg: 25.19, solarDayHours: 24.6597,
      knownMoons: 2, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.150, orbitalPeriodDays: 686.98, semiMajorAxisAu: 1.524, eccentricity: 0.0934, inclinationDeg: 1.85,
    },
    orbit: el(1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343),
    rotation: { periodHours: 24.622962, poleRA: 317.68143, poleDec: 52.88650, w0Deg: 176.630, wRateDegPerDay: 350.89198226 },
    appearance: { texture: 'mars', color: '#c1623b', accent: '#7a3b22', atmosphere: { color: '#d9a27a', intensity: 0.25 }, seed: 61, illustrative: true },
    summary: t(
      'O planeta vermelho: desertos de óxido de ferro, o maior vulcão do sistema e calotas polares sazonais.',
      'The red planet: iron-oxide deserts, the largest volcano in the system and seasonal polar caps.',
    ),
    facts: [
      t('Um dia marciano (sol) dura 24 h 39 min — muito parecido com o da Terra.', 'A Martian day (sol) lasts 24 h 39 min — very similar to Earth\'s.'),
      t('A inclinação do eixo (25,2°) dá a Marte estações, mas cada uma dura quase o dobro das nossas.', 'Its 25.2° tilt gives Mars seasons, but each lasts almost twice as long as ours.'),
      t('Tem duas luas pequenas e irregulares: Fobos e Deimos.', 'It has two small, irregular moons: Phobos and Deimos.'),
    ],
    sourceIds: ['jpl-phys', 'jpl-approx', 'iau-wg-2015', 'nssdc-factsheets'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'phobos', kind: 'moon', level: 'simulated', parent: 'mars',
    names: { pt: 'Fobos', en: 'Phobos', aliases: ['fobos', 'phobos'] },
    physical: { meanRadiusKm: 11.1, dimensionsKm: [27, 22, 18], massKg: 1.066e16, densityGcm3: 1.87, gravityMs2: 0.0057, gravityRef: 'surface', tempMeanK: 233, tempRef: 'estimated', orbitalPeriodDays: 0.3189, eccentricity: 0.0151, inclinationDeg: 1.08 },
    satellite: sat(9376, 0.0151, 0.31891, 1.08, 40),
    rotation: { periodHours: 7.65, poleRA: 317.68, poleDec: 52.9, synchronous: true },
    appearance: { texture: 'asteroid', color: '#8b7f74', accent: '#5a514a', irregular: true, seed: 71, illustrative: true },
    summary: t('Lua interna de Marte: orbita tão perto que nasce no oeste e se põe no leste.', 'Mars\'s inner moon: it orbits so close that it rises in the west and sets in the east.'),
    facts: [
      t('Completa uma órbita em 7 h 39 min — mais rápido que a rotação de Marte.', 'It completes an orbit in 7 h 39 min — faster than Mars rotates.'),
      t('Está lentamente espiralando para dentro e deve se romper ou colidir em dezenas de milhões de anos.', 'It is slowly spiraling inward and should break apart or impact in tens of millions of years.'),
    ],
    sourceIds: ['nssdc-factsheets'], dataAsOf: '2026-09-08',
  },
  {
    id: 'deimos', kind: 'moon', level: 'simulated', parent: 'mars',
    names: { pt: 'Deimos', en: 'Deimos', aliases: ['deimos'] },
    physical: { meanRadiusKm: 6.2, dimensionsKm: [15, 12.2, 11], massKg: 1.51e15, densityGcm3: 1.47, gravityMs2: 0.003, gravityRef: 'surface', tempMeanK: 233, tempRef: 'estimated', orbitalPeriodDays: 1.2624, eccentricity: 0.0002, inclinationDeg: 1.79 },
    satellite: sat(23463, 0.0002, 1.26244, 1.79, 200),
    rotation: { periodHours: 30.3, poleRA: 317.68, poleDec: 52.9, synchronous: true },
    appearance: { texture: 'asteroid', color: '#948a80', accent: '#635a52', irregular: true, seed: 72, illustrative: true },
    summary: t('A lua externa e menor de Marte, com superfície mais lisa que a de Fobos.', 'Mars\'s outer and smaller moon, with a smoother surface than Phobos.'),
    facts: [
      t('Visto de Marte, Deimos parece pouco maior que uma estrela brilhante.', 'Seen from Mars, Deimos looks little bigger than a bright star.'),
    ],
    sourceIds: ['nssdc-factsheets'], dataAsOf: '2026-09-08',
  },
  {
    id: 'jupiter', kind: 'planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Júpiter', en: 'Jupiter', aliases: ['jupiter', 'gigante gasoso', 'gas giant'] },
    physical: {
      meanRadiusKm: 69911, equatorialRadiusKm: 71492, massKg: 1.898125e27, densityGcm3: 1.3262, gravityMs2: 24.79, gravityRef: 'one-bar',
      escapeVelocityKms: 60.20, tempMeanK: 165, tempRef: 'one-bar', axialTiltDeg: 3.13, solarDayHours: 9.9259,
      knownMoons: 115, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.52, orbitalPeriodDays: 4332.59, semiMajorAxisAu: 5.203, eccentricity: 0.0484, inclinationDeg: 1.30,
    },
    orbit: el(5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106),
    rotation: { periodHours: 9.92496, poleRA: 268.056595, poleDec: 64.495303, w0Deg: 284.95, wRateDegPerDay: 870.536 },
    appearance: { texture: 'jupiter', color: '#c9a27c', accent: '#8f5f3f', rings: JUPITER_RINGS, seed: 81, illustrative: true },
    summary: t(
      'O maior planeta: faixas de nuvens, tempestades gigantes e mais de cem luas conhecidas.',
      'The largest planet: cloud bands, giant storms and over a hundred known moons.',
    ),
    facts: [
      t('Tem mais massa do que todos os outros planetas juntos — mais de 2,5 vezes.', 'It has more mass than all the other planets combined — over 2.5 times.'),
      t('A Grande Mancha Vermelha é uma tempestade observada há mais de 150 anos; a posição aqui é ilustrativa.', 'The Great Red Spot is a storm observed for over 150 years; its position here is illustrative.'),
      t('Gira mais rápido que qualquer outro planeta: um dia dura menos de 10 horas.', 'It spins faster than any other planet: a day lasts under 10 hours.'),
    ],
    sourceIds: ['jpl-phys', 'jpl-approx', 'iau-wg-2015', 'nasa-jupiter-moons'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'io', kind: 'moon', level: 'simulated', parent: 'jupiter',
    names: { pt: 'Io', en: 'Io', aliases: ['io'] },
    physical: { meanRadiusKm: 1821.6, massKg: 8.93e22, densityGcm3: 3.53, gravityMs2: 1.796, gravityRef: 'surface', tempMeanK: 110, tempRef: 'surface', orbitalPeriodDays: 1.769, eccentricity: 0.0041, inclinationDeg: 0.05 },
    satellite: sat(421700, 0.0041, 1.769138, 0.05, 10),
    rotation: { periodHours: 42.46, poleRA: 268.05, poleDec: 64.5, synchronous: true },
    appearance: { texture: 'io', color: '#d9c25a', accent: '#a0522d', seed: 82, illustrative: true },
    summary: t('O corpo mais vulcanicamente ativo do Sistema Solar, colorido por enxofre.', 'The most volcanically active body in the Solar System, colored by sulfur.'),
    facts: [
      t('As marés de Júpiter deformam Io e aquecem seu interior, alimentando centenas de vulcões.', 'Jupiter\'s tides flex Io and heat its interior, powering hundreds of volcanoes.'),
    ],
    sourceIds: ['nssdc-factsheets', 'nasa-jupiter-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'europa', kind: 'moon', level: 'simulated', parent: 'jupiter',
    names: { pt: 'Europa', en: 'Europa', aliases: ['europa'] },
    physical: { meanRadiusKm: 1560.8, massKg: 4.80e22, densityGcm3: 3.01, gravityMs2: 1.314, gravityRef: 'surface', tempMeanK: 102, tempRef: 'surface', orbitalPeriodDays: 3.551, eccentricity: 0.0094, inclinationDeg: 0.47 },
    satellite: sat(671034, 0.0094, 3.551181, 0.47, 120),
    rotation: { periodHours: 85.23, poleRA: 268.05, poleDec: 64.5, synchronous: true },
    appearance: { texture: 'europa', color: '#d8d2c4', accent: '#a5735a', seed: 83, illustrative: true },
    summary: t('Uma crosta de gelo rachada sobre um provável oceano global de água salgada.', 'A cracked ice shell over a probable global saltwater ocean.'),
    facts: [
      t('A superfície é uma das mais lisas conhecidas: poucas crateras, muitas fraturas.', 'Its surface is among the smoothest known: few craters, many fractures.'),
    ],
    sourceIds: ['nssdc-factsheets', 'nasa-jupiter-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'ganymede', kind: 'moon', level: 'simulated', parent: 'jupiter',
    names: { pt: 'Ganimedes', en: 'Ganymede', aliases: ['ganimedes', 'ganymede'] },
    physical: { meanRadiusKm: 2634.1, massKg: 1.4819e23, densityGcm3: 1.94, gravityMs2: 1.428, gravityRef: 'surface', tempMeanK: 110, tempRef: 'surface', orbitalPeriodDays: 7.155, eccentricity: 0.0013, inclinationDeg: 0.20 },
    satellite: sat(1070412, 0.0013, 7.154553, 0.2, 230),
    rotation: { periodHours: 171.7, poleRA: 268.05, poleDec: 64.5, synchronous: true },
    appearance: { texture: 'icy', color: '#a9a49c', accent: '#6e6a66', seed: 84, illustrative: true },
    summary: t('A maior lua do Sistema Solar — maior que Mercúrio — e a única com campo magnético próprio.', 'The largest moon in the Solar System — bigger than Mercury — and the only one with its own magnetic field.'),
    facts: [
      t('Tem regiões escuras antigas e faixas claras mais jovens, marcadas por sulcos.', 'It has ancient dark regions and younger bright, grooved terrain.'),
    ],
    sourceIds: ['nssdc-factsheets', 'nasa-jupiter-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'callisto', kind: 'moon', level: 'simulated', parent: 'jupiter',
    names: { pt: 'Calisto', en: 'Callisto', aliases: ['calisto', 'callisto'] },
    physical: { meanRadiusKm: 2410.3, massKg: 1.0759e23, densityGcm3: 1.83, gravityMs2: 1.235, gravityRef: 'surface', tempMeanK: 134, tempRef: 'surface', orbitalPeriodDays: 16.689, eccentricity: 0.0074, inclinationDeg: 0.19 },
    satellite: sat(1882709, 0.0074, 16.689018, 0.19, 300),
    rotation: { periodHours: 400.5, poleRA: 268.05, poleDec: 64.5, synchronous: true },
    appearance: { texture: 'rocky', color: '#7e7369', accent: '#3f3934', seed: 85, illustrative: true },
    summary: t('A superfície mais craterada conhecida: um registro antigo e quase inalterado.', 'The most heavily cratered surface known: an ancient, nearly unchanged record.'),
    facts: [
      t('Orbita longe o bastante para sofrer pouco aquecimento de maré, ao contrário de Io e Europa.', 'It orbits far enough to receive little tidal heating, unlike Io and Europa.'),
    ],
    sourceIds: ['nssdc-factsheets', 'nasa-jupiter-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'saturn', kind: 'planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Saturno', en: 'Saturn', aliases: ['saturno', 'saturn', 'planeta dos anéis', 'ringed planet'] },
    physical: {
      meanRadiusKm: 58232, equatorialRadiusKm: 60268, massKg: 5.68317e26, densityGcm3: 0.6871, gravityMs2: 10.44, gravityRef: 'one-bar',
      escapeVelocityKms: 36.09, tempMeanK: 134, tempRef: 'one-bar', axialTiltDeg: 26.73, solarDayHours: 10.656,
      knownMoons: 293, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.47, orbitalPeriodDays: 10755.7, semiMajorAxisAu: 9.537, eccentricity: 0.0539, inclinationDeg: 2.49,
    },
    orbit: el(9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794),
    rotation: { periodHours: 10.65624, poleRA: 40.589, poleDec: 83.537, w0Deg: 38.90, wRateDegPerDay: 810.7939024 },
    appearance: { texture: 'saturn', color: '#e3cfa0', accent: '#b8955f', rings: SATURN_RINGS, seed: 91, illustrative: true },
    summary: t(
      'O planeta dos anéis: um gigante gasoso tão pouco denso que flutuaria na água.',
      'The ringed planet: a gas giant so light it would float on water.',
    ),
    facts: [
      t('Os anéis principais têm cerca de 280.000 km de diâmetro, mas em geral menos de 1 km de espessura.', 'The main rings span about 280,000 km but are typically less than 1 km thick.'),
      t('É o planeta com mais luas confirmadas: 293 em agosto de 2026.', 'It has the most confirmed moons of any planet: 293 as of August 2026.'),
      t('A densidade média (0,69 g/cm³) é menor que a da água.', 'Its mean density (0.69 g/cm³) is lower than water\'s.'),
    ],
    sourceIds: ['jpl-phys', 'jpl-approx', 'iau-wg-2015', 'nasa-saturn-moons'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'titan', kind: 'moon', level: 'simulated', parent: 'saturn',
    names: { pt: 'Titã', en: 'Titan', aliases: ['tita', 'titan'] },
    physical: { meanRadiusKm: 2574.7, massKg: 1.3452e23, densityGcm3: 1.88, gravityMs2: 1.352, gravityRef: 'surface', tempMeanK: 94, tempRef: 'surface', orbitalPeriodDays: 15.945, eccentricity: 0.0288, inclinationDeg: 0.35 },
    satellite: sat(1221870, 0.0288, 15.945421, 0.35, 75),
    rotation: { periodHours: 382.7, poleRA: 40.59, poleDec: 83.54, synchronous: true },
    appearance: { texture: 'titan', color: '#d3a45a', accent: '#b07f3a', atmosphere: { color: '#e4b26a', intensity: 0.8 }, seed: 92, illustrative: true },
    summary: t('A única lua com atmosfera densa — e com lagos de metano e etano líquidos.', 'The only moon with a dense atmosphere — and with lakes of liquid methane and ethane.'),
    facts: [
      t('A sonda Huygens pousou em Titã em 14 de janeiro de 2005.', 'The Huygens probe landed on Titan on 14 January 2005.'),
      t('A pressão na superfície é cerca de 1,5 vez a da Terra.', 'Surface pressure is about 1.5 times Earth\'s.'),
    ],
    sourceIds: ['nssdc-factsheets', 'nasa-saturn-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'enceladus', kind: 'moon', level: 'simulated', parent: 'saturn',
    names: { pt: 'Encélado', en: 'Enceladus', aliases: ['encelado', 'enceladus'] },
    physical: { meanRadiusKm: 252.1, massKg: 1.08e20, densityGcm3: 1.61, gravityMs2: 0.113, gravityRef: 'surface', tempMeanK: 75, tempRef: 'surface', orbitalPeriodDays: 1.370, eccentricity: 0.0047, inclinationDeg: 0.009 },
    satellite: sat(237948, 0.0047, 1.370218, 0.009, 190),
    rotation: { periodHours: 32.9, poleRA: 40.59, poleDec: 83.54, synchronous: true },
    appearance: { texture: 'icy', color: '#eef2f5', accent: '#bcd0dc', seed: 93, illustrative: true },
    summary: t('Uma pequena lua de gelo que lança gêiseres de água de um oceano subterrâneo.', 'A small icy moon that shoots water geysers from a subsurface ocean.'),
    facts: [
      t('Seus jatos alimentam o anel E de Saturno.', 'Its plumes feed Saturn\'s E ring.'),
      t('Reflete quase toda a luz que recebe: é um dos corpos mais brilhantes do sistema.', 'It reflects almost all the light it receives: one of the brightest bodies in the system.'),
    ],
    sourceIds: ['nssdc-factsheets', 'nasa-saturn-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'uranus', kind: 'planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Urano', en: 'Uranus', aliases: ['urano', 'uranus', 'gigante de gelo', 'ice giant'] },
    physical: {
      meanRadiusKm: 25362, equatorialRadiusKm: 25559, massKg: 8.68099e25, densityGcm3: 1.270, gravityMs2: 8.87, gravityRef: 'one-bar',
      escapeVelocityKms: 21.38, tempMeanK: 76, tempRef: 'one-bar', axialTiltDeg: 97.77, solarDayHours: 17.24,
      knownMoons: 29, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.51, orbitalPeriodDays: 30687.2, semiMajorAxisAu: 19.19, eccentricity: 0.0473, inclinationDeg: 0.77,
    },
    orbit: el(19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589),
    rotation: { periodHours: -17.23992, poleRA: 257.311, poleDec: -15.175, w0Deg: 203.81, wRateDegPerDay: -501.1600928 },
    appearance: { texture: 'uranus', color: '#9fd8e0', accent: '#78bcc8', atmosphere: { color: '#b8e8ee', intensity: 0.35 }, rings: URANUS_RINGS, seed: 101, illustrative: true },
    summary: t(
      'Um gigante de gelo que gira quase deitado: o eixo está inclinado cerca de 98°.',
      'An ice giant that spins almost on its side: the axis is tilted about 98°.',
    ),
    facts: [
      t('Cada polo passa cerca de 42 anos em luz contínua e 42 anos no escuro.', 'Each pole spends about 42 years in continuous light and 42 years in darkness.'),
      t('Os anéis são escuros e estreitos; aqui aparecem realçados para visibilidade.', 'Its rings are dark and narrow; here they are enhanced for visibility.'),
      t('É o planeta com a atmosfera mais fria medida: cerca de 49 K no mínimo.', 'It has the coldest measured planetary atmosphere: about 49 K at minimum.'),
    ],
    sourceIds: ['jpl-phys', 'jpl-approx', 'iau-wg-2015', 'nasa-uranus-moons'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'miranda', kind: 'moon', level: 'simulated', parent: 'uranus',
    names: { pt: 'Miranda', en: 'Miranda', aliases: ['miranda'] },
    physical: { meanRadiusKm: 235.8, massKg: 6.4e19, densityGcm3: 1.2, gravityMs2: 0.079, gravityRef: 'surface', tempMeanK: 60, tempRef: 'estimated', orbitalPeriodDays: 1.413, eccentricity: 0.0013, inclinationDeg: 4.34 },
    satellite: sat(129390, 0.0013, 1.413479, 4.34, 15),
    rotation: { periodHours: 33.9, poleRA: 257.31, poleDec: -15.18, synchronous: true },
    appearance: { texture: 'icy', color: '#c8ccd0', accent: '#7c8288', seed: 102, illustrative: true },
    summary: t('Pequena lua com um dos terrenos mais dramáticos conhecidos, incluindo penhascos de 20 km.', 'A small moon with some of the most dramatic terrain known, including 20 km cliffs.'),
    facts: [t('Verona Rupes pode ser o penhasco mais alto do Sistema Solar.', 'Verona Rupes may be the tallest cliff in the Solar System.')],
    sourceIds: ['nssdc-factsheets', 'nasa-uranus-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'ariel', kind: 'moon', level: 'simulated', parent: 'uranus',
    names: { pt: 'Ariel', en: 'Ariel', aliases: ['ariel'] },
    physical: { meanRadiusKm: 578.9, massKg: 1.25e21, densityGcm3: 1.59, gravityMs2: 0.25, gravityRef: 'surface', tempMeanK: 60, tempRef: 'estimated', orbitalPeriodDays: 2.520, eccentricity: 0.0012, inclinationDeg: 0.04 },
    satellite: sat(191020, 0.0012, 2.520379, 0.04, 100),
    rotation: { periodHours: 60.5, poleRA: 257.31, poleDec: -15.18, synchronous: true },
    appearance: { texture: 'icy', color: '#d6d9dc', accent: '#8a9096', seed: 103, illustrative: true },
    summary: t('A lua mais brilhante de Urano, com vales e sinais de atividade geológica passada.', 'Uranus\'s brightest moon, with valleys and signs of past geological activity.'),
    facts: [t('Sua superfície é relativamente jovem: poucas crateras grandes.', 'Its surface is relatively young: few large craters.')],
    sourceIds: ['nssdc-factsheets', 'nasa-uranus-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'umbriel', kind: 'moon', level: 'simulated', parent: 'uranus',
    names: { pt: 'Umbriel', en: 'Umbriel', aliases: ['umbriel'] },
    physical: { meanRadiusKm: 584.7, massKg: 1.28e21, densityGcm3: 1.46, gravityMs2: 0.25, gravityRef: 'surface', tempMeanK: 61, tempRef: 'estimated', orbitalPeriodDays: 4.144, eccentricity: 0.0039, inclinationDeg: 0.13 },
    satellite: sat(266300, 0.0039, 4.144177, 0.13, 220),
    rotation: { periodHours: 99.5, poleRA: 257.31, poleDec: -15.18, synchronous: true },
    appearance: { texture: 'rocky', color: '#6f6f72', accent: '#3d3d40', seed: 104, illustrative: true },
    summary: t('A mais escura das grandes luas de Urano, com um anel brilhante misterioso chamado Wunda.', 'The darkest of Uranus\'s large moons, with a mysterious bright ring called Wunda.'),
    facts: [t('Reflete apenas cerca de 16% da luz que recebe.', 'It reflects only about 16% of the light it receives.')],
    sourceIds: ['nssdc-factsheets', 'nasa-uranus-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'titania', kind: 'moon', level: 'simulated', parent: 'uranus',
    names: { pt: 'Titânia', en: 'Titania', aliases: ['titania'] },
    physical: { meanRadiusKm: 788.4, massKg: 3.4e21, densityGcm3: 1.66, gravityMs2: 0.37, gravityRef: 'surface', tempMeanK: 60, tempRef: 'estimated', orbitalPeriodDays: 8.706, eccentricity: 0.0011, inclinationDeg: 0.08 },
    satellite: sat(435910, 0.0011, 8.705872, 0.08, 330),
    rotation: { periodHours: 208.9, poleRA: 257.31, poleDec: -15.18, synchronous: true },
    appearance: { texture: 'icy', color: '#b9b4ae', accent: '#6f6a64', seed: 105, illustrative: true },
    summary: t('A maior lua de Urano, marcada por enormes cânions.', 'Uranus\'s largest moon, marked by enormous canyons.'),
    facts: [t('Messina Chasma se estende por cerca de 1.500 km.', 'Messina Chasma stretches about 1,500 km.')],
    sourceIds: ['nssdc-factsheets', 'nasa-uranus-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'oberon', kind: 'moon', level: 'simulated', parent: 'uranus',
    names: { pt: 'Oberon', en: 'Oberon', aliases: ['oberon'] },
    physical: { meanRadiusKm: 761.4, massKg: 3.08e21, densityGcm3: 1.66, gravityMs2: 0.35, gravityRef: 'surface', tempMeanK: 61, tempRef: 'estimated', orbitalPeriodDays: 13.463, eccentricity: 0.0014, inclinationDeg: 0.07 },
    satellite: sat(583520, 0.0014, 13.463239, 0.07, 60),
    rotation: { periodHours: 323.1, poleRA: 257.31, poleDec: -15.18, synchronous: true },
    appearance: { texture: 'rocky', color: '#9a908a', accent: '#5b544f', seed: 106, illustrative: true },
    summary: t('A lua mais externa entre as grandes de Urano, coberta de crateras antigas.', 'The outermost of Uranus\'s large moons, covered in ancient craters.'),
    facts: [t('Uma montanha de cerca de 6 km foi vista no limbo pela Voyager 2.', 'A mountain about 6 km high was seen on the limb by Voyager 2.')],
    sourceIds: ['nssdc-factsheets', 'nasa-uranus-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'neptune', kind: 'planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Netuno', en: 'Neptune', aliases: ['netuno', 'neptune'] },
    physical: {
      meanRadiusKm: 24622, equatorialRadiusKm: 24764, massKg: 1.024092e26, densityGcm3: 1.638, gravityMs2: 11.15, gravityRef: 'one-bar',
      escapeVelocityKms: 23.56, tempMeanK: 72, tempRef: 'one-bar', axialTiltDeg: 28.32, solarDayHours: 16.11,
      knownMoons: 16, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.41, orbitalPeriodDays: 60190.0, semiMajorAxisAu: 30.07, eccentricity: 0.0086, inclinationDeg: 1.77,
    },
    orbit: el(30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664),
    rotation: { periodHours: 16.11, poleRA: 299.36, poleDec: 43.46, w0Deg: 249.978, wRateDegPerDay: 541.1397757 },
    appearance: { texture: 'neptune', color: '#4f7fd8', accent: '#2f56a8', atmosphere: { color: '#7aa3f0', intensity: 0.4 }, rings: NEPTUNE_RINGS, seed: 111, illustrative: true },
    summary: t(
      'O planeta mais distante: ventos supersônicos e uma cor azulada — em tom natural, mais pálida do que nas imagens realçadas.',
      'The most distant planet: supersonic winds and a bluish color — in natural tone, paler than in enhanced images.',
    ),
    facts: [
      t('Foi o primeiro planeta descoberto por previsão matemática, em 1846.', 'It was the first planet found by mathematical prediction, in 1846.'),
      t('Um ano em Netuno dura quase 165 anos terrestres.', 'A Neptune year lasts almost 165 Earth years.'),
      t('Tritão, sua maior lua, orbita no sentido contrário à rotação do planeta.', 'Triton, its largest moon, orbits opposite to the planet\'s rotation.'),
    ],
    sourceIds: ['jpl-phys', 'jpl-approx', 'iau-wg-2015', 'nasa-neptune-moons'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'triton', kind: 'moon', level: 'simulated', parent: 'neptune',
    names: { pt: 'Tritão', en: 'Triton', aliases: ['tritao', 'triton'] },
    physical: { meanRadiusKm: 1353.4, massKg: 2.14e22, densityGcm3: 2.06, gravityMs2: 0.779, gravityRef: 'surface', tempMeanK: 38, tempRef: 'surface', orbitalPeriodDays: 5.877, eccentricity: 0.00002, inclinationDeg: 156.9 },
    satellite: sat(354759, 0.00002, -5.876854, 23.1, 140),
    rotation: { periodHours: 141.04, poleRA: 299.36, poleDec: 43.46, synchronous: true },
    appearance: { texture: 'triton', color: '#d8c8c0', accent: '#a98f80', seed: 112, illustrative: true },
    summary: t('A maior lua de Netuno tem órbita retrógrada — provavelmente foi capturada do Cinturão de Kuiper.', 'Neptune\'s largest moon has a retrograde orbit — it was probably captured from the Kuiper Belt.'),
    facts: [
      t('Gêiseres de nitrogênio foram observados pela Voyager 2 em 1989.', 'Nitrogen geysers were observed by Voyager 2 in 1989.'),
      t('É um dos objetos mais frios já medidos: cerca de 38 K.', 'It is one of the coldest objects measured: about 38 K.'),
    ],
    sourceIds: ['nssdc-factsheets', 'nasa-neptune-moons'], dataAsOf: '2026-09-08',
  },
  {
    id: 'pluto', kind: 'dwarf-planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Plutão', en: 'Pluto', aliases: ['plutao', 'pluto', '134340'] },
    physical: {
      meanRadiusKm: 1188.3, massKg: 1.30246e22, densityGcm3: 1.853, gravityMs2: 0.62, gravityRef: 'surface', escapeVelocityKms: 1.21,
      tempMeanK: 44, tempMinK: 33, tempMaxK: 55, tempRef: 'surface', axialTiltDeg: 119.6, solarDayHours: 153.3,
      knownMoons: 5, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.3, orbitalPeriodDays: 90560, semiMajorAxisAu: 39.48, eccentricity: 0.2488, inclinationDeg: 17.14,
    },
    orbit: el(39.48686035, 0.00449751, 0.24885238, 0.00006016, 17.14104260, 0.00000501, 238.96535011, 145.18042903, 224.09702598, -0.00968827, 110.30167986, -0.00809981,
      { validFromJd: SUPPORTED_JD_MIN, validToJd: SUPPORTED_JD_MAX, model: 'jpl-table2', sourceId: 'standish-1992' }, { b: -0.01262724, c: 0, s: 0, f: 0 }),
    rotation: { periodHours: -153.2928, poleRA: 132.993, poleDec: -6.163, w0Deg: 302.695, wRateDegPerDay: 56.3625225 },
    appearance: { texture: 'pluto', color: '#d2b48c', accent: '#6b4a3a', atmosphere: { color: '#8fb6ff', intensity: 0.15 }, seed: 121, illustrative: true },
    summary: t(
      'Um planeta anão do Cinturão de Kuiper, com planícies de gelo de nitrogênio e uma atmosfera tênue.',
      'A dwarf planet of the Kuiper Belt, with nitrogen-ice plains and a thin atmosphere.',
    ),
    facts: [
      t('A New Horizons passou por Plutão em 14 de julho de 2015 e revelou a planície Sputnik Planitia.', 'New Horizons flew past Pluto on 14 July 2015 and revealed Sputnik Planitia.'),
      t('Plutão e Caronte orbitam um ponto comum (baricentro) fora de Plutão.', 'Pluto and Charon orbit a common point (barycenter) outside Pluto.'),
      t('Entre 1979 e 1999 esteve mais perto do Sol do que Netuno.', 'Between 1979 and 1999 it was closer to the Sun than Neptune.'),
    ],
    classificationNote: t(
      'Planeta anão (IAU, 2006): orbita o Sol e tem forma quase esférica, mas não "limpou" a vizinhança de sua órbita — compartilha o Cinturão de Kuiper com muitos outros corpos.',
      'Dwarf planet (IAU, 2006): it orbits the Sun and is nearly round, but has not "cleared" its orbital neighborhood — it shares the Kuiper Belt with many other bodies.',
    ),
    sourceIds: ['jpl-phys', 'standish-1992', 'iau-wg-2015', 'nasa-dwarf-planets'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'charon', kind: 'moon', level: 'simulated', parent: 'pluto',
    names: { pt: 'Caronte', en: 'Charon', aliases: ['caronte', 'charon'] },
    physical: { meanRadiusKm: 606.0, massKg: 1.586e21, densityGcm3: 1.70, gravityMs2: 0.29, gravityRef: 'surface', tempMeanK: 53, tempRef: 'surface', orbitalPeriodDays: 6.387, eccentricity: 0.0002, inclinationDeg: 0.08 },
    satellite: sat(19591, 0.0002, 6.387221, 0.08, 250),
    rotation: { periodHours: 153.29, poleRA: 132.99, poleDec: -6.16, synchronous: true },
    appearance: { texture: 'charon', color: '#9f9a96', accent: '#6b4a3a', seed: 122, illustrative: true },
    summary: t('A maior lua de Plutão — metade do diâmetro dele — com um polo norte avermelhado.', 'Pluto\'s largest moon — half its diameter — with a reddish north pole.'),
    facts: [
      t('Plutão e Caronte estão mutuamente travados: cada um mostra sempre a mesma face ao outro.', 'Pluto and Charon are mutually locked: each always shows the same face to the other.'),
    ],
    sourceIds: ['jpl-phys', 'nssdc-factsheets'], dataAsOf: '2026-09-08',
  },
  {
    id: 'ceres', kind: 'dwarf-planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Ceres', en: 'Ceres', aliases: ['ceres', '1 ceres'] },
    physical: {
      meanRadiusKm: 469.7, equatorialRadiusKm: 482.1, massKg: 9.38416e20, densityGcm3: 2.162, gravityMs2: 0.27, gravityRef: 'surface', escapeVelocityKms: 0.51,
      tempMeanK: 168, tempMaxK: 235, tempRef: 'surface', axialTiltDeg: 4.0, knownMoons: 0, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.09,
      orbitalPeriodDays: 1683.1, semiMajorAxisAu: 2.769, eccentricity: 0.076, inclinationDeg: 10.59,
    },
    orbit: meanEl(2.7691, 0.0760, 10.594, 80.31, 73.6, 6.0, 1683.1),
    rotation: { periodHours: 9.074, poleRA: 291.4, poleDec: 66.8, w0Deg: 170.65, wRateDegPerDay: 952.1532 },
    appearance: { texture: 'dwarf', color: '#9a948c', accent: '#5e5953', seed: 131, illustrative: true },
    summary: t('O maior objeto do cinturão de asteroides e o único planeta anão do Sistema Solar interno.', 'The largest object in the asteroid belt and the only dwarf planet of the inner Solar System.'),
    facts: [
      t('A sonda Dawn orbitou Ceres de 2015 a 2018 e encontrou depósitos brilhantes de sais.', 'The Dawn spacecraft orbited Ceres from 2015 to 2018 and found bright salt deposits.'),
      t('Contém cerca de um quarto da massa de todo o cinturão de asteroides.', 'It holds about a quarter of the mass of the entire asteroid belt.'),
    ],
    classificationNote: t('Planeta anão desde 2006; antes era classificado como o maior asteroide.', 'Dwarf planet since 2006; previously classified as the largest asteroid.'),
    sourceIds: ['jpl-phys', 'jpl-sbdb', 'nasa-dwarf-planets'],
    dataAsOf: '2026-09-08',
  },
  {
    id: 'vesta', kind: 'asteroid', level: 'simulated', parent: 'sun',
    names: { pt: 'Vesta', en: 'Vesta', aliases: ['vesta', '4 vesta'] },
    physical: {
      meanRadiusKm: 262.7, dimensionsKm: [572.6, 557.2, 446.4], massKg: 2.59e20, densityGcm3: 3.46, gravityMs2: 0.25, gravityRef: 'surface',
      tempMeanK: 180, tempRef: 'estimated', geometricAlbedo: 0.42, orbitalPeriodDays: 1325.8, semiMajorAxisAu: 2.362, eccentricity: 0.0887, inclinationDeg: 7.14,
    },
    orbit: meanEl(2.3615, 0.0887, 7.14, 103.8, 151.2, 20.0, 1325.8),
    rotation: { periodHours: 5.342, poleRA: 309.0, poleDec: 42.2 },
    appearance: { texture: 'asteroid', color: '#a49c90', accent: '#6b645b', irregular: true, seed: 141, illustrative: true },
    summary: t('O segundo corpo mais massivo do cinturão de asteroides, com uma enorme bacia de impacto no polo sul.', 'The second most massive body in the asteroid belt, with a huge impact basin at its south pole.'),
    facts: [
      t('Fragmentos de Vesta chegam à Terra como meteoritos do grupo HED.', 'Fragments of Vesta reach Earth as HED meteorites.'),
      t('A sonda Dawn orbitou Vesta em 2011–2012 antes de seguir para Ceres.', 'The Dawn spacecraft orbited Vesta in 2011–2012 before heading to Ceres.'),
    ],
    sourceIds: ['jpl-sbdb', 'nasa-asteroids'], dataAsOf: '2026-09-08',
  },
  {
    id: 'eris', kind: 'dwarf-planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Éris', en: 'Eris', aliases: ['eris', '136199'] },
    physical: {
      meanRadiusKm: 1200, massKg: 1.66e22, densityGcm3: 2.3, gravityMs2: 0.77, gravityRef: 'surface', escapeVelocityKms: 1.36,
      tempMeanK: 42, tempRef: 'estimated', knownMoons: 1, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.84,
      orbitalPeriodDays: 203650, semiMajorAxisAu: 67.9, eccentricity: 0.436, inclinationDeg: 44.0,
    },
    orbit: meanEl(67.86, 0.4361, 44.04, 35.95, 151.6, 205.0, 203650),
    rotation: { periodHours: 25.9, poleRA: 0, poleDec: 90 },
    appearance: { texture: 'dwarf', color: '#e8e8ec', accent: '#b8b8c0', seed: 151, illustrative: true },
    summary: t('O planeta anão mais massivo conhecido, três vezes mais distante do Sol que Plutão em média.', 'The most massive known dwarf planet, on average three times farther from the Sun than Pluto.'),
    facts: [
      t('Sua descoberta em 2005 levou à definição formal de "planeta" pela IAU em 2006.', 'Its discovery in 2005 led to the IAU\'s formal definition of "planet" in 2006.'),
      t('Tem uma lua, Disnomia.', 'It has one moon, Dysnomia.'),
    ],
    classificationNote: t('Planeta anão do disco disperso; a superfície nunca foi fotografada em detalhe — a aparência aqui é ilustrativa.', 'Scattered-disc dwarf planet; its surface has never been imaged in detail — the appearance here is illustrative.'),
    sourceIds: ['jpl-phys', 'jpl-sbdb', 'nasa-dwarf-planets'], dataAsOf: '2026-09-08',
  },
  {
    id: 'haumea', kind: 'dwarf-planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Haumea', en: 'Haumea', aliases: ['haumea', '136108'] },
    physical: {
      meanRadiusKm: 715, dimensionsKm: [2100, 1680, 1074], massKg: 4.006e21, densityGcm3: 2.6, gravityMs2: 0.35, gravityRef: 'surface',
      tempMeanK: 50, tempRef: 'estimated', knownMoons: 2, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.72,
      orbitalPeriodDays: 104030, semiMajorAxisAu: 43.1, eccentricity: 0.195, inclinationDeg: 28.2,
    },
    orbit: meanEl(43.12, 0.195, 28.2, 122.1, 239.5, 210.0, 104030),
    rotation: { periodHours: 3.9155, poleRA: 0, poleDec: 90 },
    appearance: { texture: 'dwarf', color: '#dedede', accent: '#a8a8a8', irregular: true, rings: { enhanced: true, bands: [{ name: 'Ring', innerKm: 2250, outerKm: 2320, opacity: 0.25, color: '#c8c8d0' }] }, seed: 161, illustrative: true },
    summary: t('Um planeta anão alongado que gira em menos de 4 horas e possui um anel.', 'An elongated dwarf planet that spins in under 4 hours and has a ring.'),
    facts: [
      t('A rotação rápida deforma Haumea em um elipsoide alongado.', 'Its fast rotation stretches Haumea into an elongated ellipsoid.'),
      t('O anel foi detectado por ocultação estelar em 2017.', 'Its ring was detected by a stellar occultation in 2017.'),
    ],
    classificationNote: t('Aparência ilustrativa: dimensões e forma vêm de ocultações, não de imagens detalhadas.', 'Illustrative appearance: dimensions and shape come from occultations, not detailed imagery.'),
    sourceIds: ['jpl-phys', 'jpl-sbdb', 'nasa-dwarf-planets'], dataAsOf: '2026-09-08',
  },
  {
    id: 'makemake', kind: 'dwarf-planet', level: 'simulated', parent: 'sun',
    names: { pt: 'Makemake', en: 'Makemake', aliases: ['makemake', '136472'] },
    physical: {
      meanRadiusKm: 714, massKg: 3.1e21, densityGcm3: 2.1, gravityMs2: 0.40, gravityRef: 'surface', tempMeanK: 40, tempRef: 'estimated',
      knownMoons: 1, knownMoonsAsOf: '2026-08', geometricAlbedo: 0.81, orbitalPeriodDays: 112330, semiMajorAxisAu: 45.4, eccentricity: 0.161, inclinationDeg: 29.0,
    },
    orbit: meanEl(45.43, 0.161, 29.0, 79.4, 297.2, 160.0, 112330),
    rotation: { periodHours: 22.83, poleRA: 0, poleDec: 90 },
    appearance: { texture: 'dwarf', color: '#d9b591', accent: '#a17a58', seed: 171, illustrative: true },
    summary: t('Um planeta anão avermelhado do Cinturão de Kuiper coberto por gelos de metano.', 'A reddish Kuiper Belt dwarf planet covered in methane ices.'),
    facts: [
      t('Foi descoberto em 2005 e nomeado a partir do deus criador do povo Rapa Nui.', 'It was discovered in 2005 and named after the creator god of the Rapa Nui people.'),
    ],
    classificationNote: t('Aparência ilustrativa: sem imagens detalhadas da superfície.', 'Illustrative appearance: no detailed surface imagery exists.'),
    sourceIds: ['jpl-phys', 'jpl-sbdb', 'nasa-dwarf-planets'], dataAsOf: '2026-09-08',
  },
  {
    id: 'comet-observatory', kind: 'comet', level: 'simulated', parent: 'sun',
    names: { pt: 'Cometa Observatório (hipotético)', en: 'Observatory Comet (hypothetical)', aliases: ['cometa', 'comet', 'cometa educacional', 'educational comet'] },
    physical: {
      meanRadiusKm: 4, dimensionsKm: [10, 7, 6], massKg: 2e13, densityGcm3: 0.5, gravityRef: 'none', tempRef: 'estimated',
      orbitalPeriodDays: 2392, semiMajorAxisAu: 3.5, eccentricity: 0.85, inclinationDeg: 12.0,
    },
    orbit: meanEl(3.5, 0.85, 12.0, 60.0, 100.0, 0.0, 2392, 'hypothetical', 'hypothetical'),
    rotation: { periodHours: 12, poleRA: 0, poleDec: 90 },
    appearance: { texture: 'comet', color: '#cfe8ff', accent: '#9fc9ff', irregular: true, seed: 181, illustrative: true },
    summary: t(
      'Um cometa hipotético da família de Júpiter, criado para ensinar como cometas se comportam perto do Sol.',
      'A hypothetical Jupiter-family comet created to teach how comets behave near the Sun.',
    ),
    facts: [
      t('O periélio fica a 0,53 UA e o afélio a 6,5 UA; período de cerca de 6,5 anos.', 'Perihelion is at 0.53 au and aphelion at 6.5 au; period about 6.5 years.'),
      t('A cauda de íons aponta para longe do Sol; a cauda de poeira se curva ao longo da órbita.', 'The ion tail points away from the Sun; the dust tail curves along the orbit.'),
      t('A intensidade visual da atividade aqui é um modelo educativo, não uma previsão de brilho.', 'The visual activity intensity here is an educational model, not a brightness forecast.'),
    ],
    classificationNote: t('Objeto hipotético: os elementos orbitais foram escolhidos para fins educativos e não correspondem a um cometa real.', 'Hypothetical object: its orbital elements were chosen for teaching and do not correspond to a real comet.'),
    sourceIds: ['hypothetical', 'nasa-comets'], dataAsOf: '2026-09-08',
  },
  {
    id: 'asteroid-belt', kind: 'region', level: 'schematic', parent: 'sun',
    names: { pt: 'Cinturão de asteroides', en: 'Asteroid belt', aliases: ['cinturao de asteroides', 'asteroid belt', 'cinturão principal', 'main belt'] },
    physical: { meanRadiusKm: 0, gravityRef: 'none', semiMajorAxisAu: 2.7 },
    appearance: { texture: 'asteroid', color: '#9c948a', seed: 191, illustrative: true },
    summary: t(
      'Região entre Marte e Júpiter (cerca de 2,1 a 3,3 UA) com milhões de corpos rochosos. As partículas mostradas são representativas, não objetos catalogados.',
      'Region between Mars and Jupiter (about 2.1 to 3.3 au) with millions of rocky bodies. The particles shown are representative, not cataloged objects.',
    ),
    facts: [
      t('A massa total é menor que 4% da massa da Lua.', 'Its total mass is less than 4% of the Moon\'s mass.'),
      t('Ao contrário do que os filmes mostram, os asteroides estão separados por milhões de quilômetros.', 'Unlike in movies, asteroids are separated by millions of kilometers.'),
    ],
    sourceIds: ['nasa-asteroids'], dataAsOf: '2026-09-08',
  },
  {
    id: 'kuiper-belt', kind: 'region', level: 'schematic', parent: 'sun',
    names: { pt: 'Cinturão de Kuiper', en: 'Kuiper Belt', aliases: ['cinturao de kuiper', 'kuiper belt', 'kuiper'] },
    physical: { meanRadiusKm: 0, gravityRef: 'none', semiMajorAxisAu: 40 },
    appearance: { texture: 'icy', color: '#9fb4c8', seed: 192, illustrative: true },
    summary: t(
      'Um disco de corpos gelados além de Netuno, de cerca de 30 a 50 UA. Plutão, Haumea e Makemake vivem aqui.',
      'A disc of icy bodies beyond Neptune, from about 30 to 50 au. Pluto, Haumea and Makemake live here.',
    ),
    facts: [
      t('A New Horizons visitou o objeto Arrokoth no Cinturão de Kuiper em 1º de janeiro de 2019.', 'New Horizons visited the Kuiper Belt object Arrokoth on 1 January 2019.'),
    ],
    sourceIds: ['nasa-kuiper-belt'], dataAsOf: '2026-09-08',
  },
  {
    id: 'oort-cloud', kind: 'region', level: 'schematic', parent: 'sun',
    names: { pt: 'Nuvem de Oort', en: 'Oort Cloud', aliases: ['nuvem de oort', 'oort cloud', 'oort'] },
    physical: { meanRadiusKm: 0, gravityRef: 'none', semiMajorAxisAu: 20000 },
    appearance: { texture: 'icy', color: '#8ea0b8', seed: 193, illustrative: true },
    summary: t(
      'Uma casca esférica hipotética de corpos gelados, estimada entre cerca de 2.000 e 100.000 UA. Nunca foi observada diretamente; é a provável origem dos cometas de longo período.',
      'A hypothesized spherical shell of icy bodies, estimated between about 2,000 and 100,000 au. Never directly observed; the likely origin of long-period comets.',
    ),
    facts: [
      t('A borda externa pode estar a um quarto da distância até a estrela mais próxima.', 'Its outer edge may lie a quarter of the way to the nearest star.'),
    ],
    sourceIds: ['nasa-oort-cloud'], dataAsOf: '2026-09-08',
  },
];

export const BODY_MAP: Record<BodyId, BodyDef> = Object.fromEntries(BODIES.map((b) => [b.id, b])) as Record<BodyId, BodyDef>;

export function getBody(id: BodyId): BodyDef {
  const b = BODY_MAP[id];
  if (!b) throw new Error(`Unknown body ${id}`);
  return b;
}

export function childrenOf(id: BodyId): BodyDef[] {
  return BODIES.filter((b) => b.parent === id && b.kind === 'moon');
}

export const PLANET_IDS: BodyId[] = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
export const MAJOR_IDS: BodyId[] = ['sun', ...PLANET_IDS, 'moon'];
export const DWARF_IDS: BodyId[] = BODIES.filter((b) => b.kind === 'dwarf-planet').map((b) => b.id);
export const SMALL_BODY_IDS: BodyId[] = BODIES.filter((b) => b.kind === 'asteroid' || b.kind === 'comet').map((b) => b.id);
export const REGION_IDS: BodyId[] = BODIES.filter((b) => b.kind === 'region').map((b) => b.id);
export const SIMULATED_IDS: BodyId[] = BODIES.filter((b) => b.level === 'simulated').map((b) => b.id);
