import { BODY_MAP } from '../data/bodies';
import type { BodyId, LocalizedText } from '../data/types';
import type { Tool } from '../state/store';

export type ActivityTheme = 'order' | 'size' | 'dayYear' | 'phases' | 'speed' | 'seasons' | 'rings' | 'moons' | 'gravity' | 'light' | 'scale' | 'uncertainty';

export interface StartView { target?: BodyId; kind?: 'focus' | 'system' | 'overview'; tool?: Tool; rate?: number; scaleMode?: 'exploration' | 'relative' }

interface ActivityBase {
  id: string;
  theme: ActivityTheme;
  title: LocalizedText;
  objective: LocalizedText;
  /** Explanation shown after completion (why the answer is right / what was observed). */
  explanation: LocalizedText;
  hint?: LocalizedText;
  startView?: StartView;
  /** Deeper tool to open after the activity. */
  followUp?: { tool: Tool; label: LocalizedText };
  /** If the answer depends on model approximations, say so. */
  modelCaveat?: LocalizedText;
}

export interface ChoiceOption { text: LocalizedText; body?: BodyId }

export interface ChoiceActivity extends ActivityBase {
  kind: 'choice';
  question: LocalizedText;
  options: ChoiceOption[];
  /** Index of the correct option; computed from the catalog when a function. */
  correct: number | (() => number);
}

/**
 * Scene tasks are evaluated against actual application state by a checker id
 * (see src/app/activities.ts). Opening a panel never counts as success.
 */
export interface SceneTaskActivity extends ActivityBase {
  kind: 'scene-task';
  task: LocalizedText;
  check: string;
}

export type Activity = ChoiceActivity | SceneTaskActivity;

const L = (pt: string, en: string): LocalizedText => ({ pt, en });
const larger = (a: BodyId, b: BodyId): number => (BODY_MAP[a].physical.meanRadiusKm >= BODY_MAP[b].physical.meanRadiusKm ? 0 : 1);

export const THEME_ORDER: ActivityTheme[] = ['order', 'size', 'dayYear', 'phases', 'speed', 'seasons', 'rings', 'moons', 'gravity', 'light', 'scale', 'uncertainty'];

export const ACTIVITIES: Activity[] = [
  {
    id: 'order-between', kind: 'choice', theme: 'order',
    title: L('A ordem dos planetas', 'Planetary order'),
    objective: L('Reconhecer a ordem dos planetas a partir do Sol.', 'Recognize the order of the planets from the Sun.'),
    startView: { kind: 'overview' },
    question: L('Qual planeta orbita entre Vênus e Marte?', 'Which planet orbits between Venus and Mars?'),
    options: [{ text: L('Mercúrio', 'Mercury'), body: 'mercury' }, { text: L('Terra', 'Earth'), body: 'earth' }, { text: L('Júpiter', 'Jupiter'), body: 'jupiter' }],
    correct: 1,
    hint: L('Observe as órbitas na visão geral: a terceira a partir do Sol.', 'Look at the orbits in the overview: the third from the Sun.'),
    explanation: L('A ordem é Mercúrio, Vênus, Terra, Marte, Júpiter, Saturno, Urano e Netuno. A Terra é o terceiro planeta, a 1 UA do Sol; Vênus está a 0,72 UA e Marte a 1,52 UA.', 'The order is Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune. Earth is the third planet, at 1 au from the Sun; Venus is at 0.72 au and Mars at 1.52 au.'),
  },
  {
    id: 'order-mercury-orbit', kind: 'scene-task', theme: 'order',
    title: L('Uma órbita completa de Mercúrio', 'One complete orbit of Mercury'),
    objective: L('Observar Mercúrio completar uma órbita usando o controle de tempo.', 'Watch Mercury complete one orbit using the time controls.'),
    startView: { target: 'mercury', kind: 'focus', rate: 86400 * 3 },
    task: L('Com Mercúrio selecionado, deixe o tempo avançar (ou use "Completar uma órbita") até passarem 88 dias simulados.', 'With Mercury selected, let time run (or use "Complete one orbit") until 88 simulated days have passed.'),
    check: 'elapsed:mercury',
    hint: L('O botão "Completar uma órbita" na barra de tempo avança exatamente um período orbital.', 'The "Complete one orbit" button in the time bar advances exactly one orbital period.'),
    explanation: L('Mercúrio leva 87,97 dias para dar uma volta ao Sol. Enquanto isso a Terra percorreu só um quarto da sua órbita: cada planeta tem o próprio período, e o relógio único move todos de forma coerente.', 'Mercury takes 87.97 days to go around the Sun. Meanwhile Earth covered only a quarter of its orbit: each planet has its own period, and the single clock moves them all coherently.'),
  },
  {
    id: 'size-earth-mars', kind: 'scene-task', theme: 'size',
    title: L('Quem é maior?', 'Which is larger?'),
    objective: L('Identificar o maior entre dois corpos antes de abrir a comparação.', 'Identify the larger of two bodies before opening comparison.'),
    startView: { kind: 'overview' },
    task: L('Selecione na cena ou no navegador o maior corpo entre Terra e Marte.', 'Select, in the scene or navigator, the larger body between Earth and Mars.'),
    check: 'select-larger:earth,mars',
    hint: L('Marte tem cerca de metade do diâmetro da Terra.', 'Mars is about half Earth\'s diameter.'),
    explanation: L('A Terra (12.742 km) tem quase o dobro do diâmetro de Marte (6.779 km) e cerca de 10 vezes a massa. Abra a comparação para ver a proporção com uma escala linear comum.', 'Earth (12,742 km) has almost twice Mars\'s diameter (6,779 km) and about 10 times its mass. Open comparison to see the proportion on a common linear scale.'),
    followUp: { tool: 'compare', label: L('Comparar Terra e Marte', 'Compare Earth and Mars') },
  },
  {
    id: 'size-largest-moon', kind: 'choice', theme: 'size',
    title: L('A maior lua', 'The largest moon'),
    objective: L('Comparar luas de planetas diferentes pelo diâmetro.', 'Compare moons of different planets by diameter.'),
    startView: { target: 'jupiter', kind: 'system' },
    question: L('Qual é a maior lua do Sistema Solar?', 'Which is the largest moon in the Solar System?'),
    options: [{ text: L('Lua', 'Moon'), body: 'moon' }, { text: L('Ganimedes', 'Ganymede'), body: 'ganymede' }, { text: L('Titã', 'Titan'), body: 'titan' }],
    correct: () => { const ids: BodyId[] = ['moon', 'ganymede', 'titan']; let best = 0; for (let i = 1; i < ids.length; i++) if (BODY_MAP[ids[i]].physical.meanRadiusKm > BODY_MAP[ids[best]].physical.meanRadiusKm) best = i; return best; },
    explanation: L('Ganimedes (5.268 km) é maior que Titã (5.149 km) e até que Mercúrio. A Lua tem 3.475 km. Os valores vêm do mesmo catálogo mostrado no inspetor.', 'Ganymede (5,268 km) is larger than Titan (5,149 km) and even than Mercury. The Moon is 3,475 km. The values come from the same catalog shown in the inspector.'),
  },
  {
    id: 'dayyear-venus', kind: 'choice', theme: 'dayYear',
    title: L('Dia mais longo que o ano', 'A day longer than the year'),
    objective: L('Distinguir rotação (dia) de revolução (ano).', 'Distinguish rotation (day) from revolution (year).'),
    startView: { target: 'venus', kind: 'focus' },
    question: L('Qual destes tem o dia solar mais longo?', 'Which of these has the longest solar day?'),
    options: [{ text: L('Vênus', 'Venus'), body: 'venus' }, { text: L('Terra', 'Earth'), body: 'earth' }, { text: L('Júpiter', 'Jupiter'), body: 'jupiter' }],
    correct: () => { const ids: BodyId[] = ['venus', 'earth', 'jupiter']; let best = 0; for (let i = 1; i < ids.length; i++) if ((BODY_MAP[ids[i]].physical.solarDayHours ?? 0) > (BODY_MAP[ids[best]].physical.solarDayHours ?? 0)) best = i; return best; },
    explanation: L('O dia solar de Vênus dura 117 dias terrestres e sua rotação sideral 243 dias — mais que o ano venusiano de 225 dias. Júpiter, gigante, gira em menos de 10 horas.', 'Venus\'s solar day lasts 117 Earth days and its sidereal rotation 243 days — longer than the 225-day Venusian year. Jupiter, a giant, spins in under 10 hours.'),
  },
  {
    id: 'phases-why', kind: 'choice', theme: 'phases',
    title: L('Por que a Lua tem fases?', 'Why does the Moon have phases?'),
    objective: L('Separar fases lunares de eclipses.', 'Separate lunar phases from eclipses.'),
    startView: { tool: 'moon-lab' },
    question: L('O que causa as fases da Lua?', 'What causes the Moon\'s phases?'),
    options: [
      { text: L('A sombra da Terra cobre parte da Lua', 'Earth\'s shadow covers part of the Moon') },
      { text: L('Vemos porções diferentes da metade iluminada pelo Sol', 'We see different portions of the Sun-lit half') },
      { text: L('Nuvens na atmosfera da Lua', 'Clouds in the Moon\'s atmosphere') },
    ],
    correct: 1,
    explanation: L('Metade da Lua está sempre iluminada pelo Sol. Conforme ela orbita a Terra, vemos essa metade de ângulos diferentes: é isso que gera as fases. A sombra da Terra só entra em cena em um eclipse lunar, quando o alinhamento é preciso.', 'Half of the Moon is always lit by the Sun. As it orbits Earth we see that half from different angles: that is what creates the phases. Earth\'s shadow only enters the picture during a lunar eclipse, when the alignment is precise.'),
    followUp: { tool: 'moon-lab', label: L('Explorar no laboratório', 'Explore in the lab') },
  },
  {
    id: 'speed-inner-outer', kind: 'choice', theme: 'speed',
    title: L('Quem orbita mais rápido?', 'Who orbits faster?'),
    objective: L('Relacionar distância ao Sol com velocidade orbital.', 'Relate distance from the Sun to orbital speed.'),
    startView: { kind: 'overview', rate: 86400 * 7 },
    question: L('Qual planeta se move mais rápido ao longo da órbita?', 'Which planet moves fastest along its orbit?'),
    options: [{ text: L('Mercúrio', 'Mercury'), body: 'mercury' }, { text: L('Saturno', 'Saturn'), body: 'saturn' }, { text: L('Netuno', 'Neptune'), body: 'neptune' }],
    correct: () => { const ids: BodyId[] = ['mercury', 'saturn', 'neptune']; let best = 0; for (let i = 1; i < ids.length; i++) if ((BODY_MAP[ids[i]].physical.orbitalPeriodDays ?? Infinity) < (BODY_MAP[ids[best]].physical.orbitalPeriodDays ?? Infinity)) best = i; return best; },
    explanation: L('Mercúrio viaja a ~47 km/s; Netuno a ~5,4 km/s. Pela terceira lei de Kepler, T² ∝ a³: quanto mais distante, mais lento e mais longo o período. Observe na cena a uma semana por segundo.', 'Mercury travels at ~47 km/s; Neptune at ~5.4 km/s. By Kepler\'s third law, T² ∝ a³: the farther out, the slower and the longer the period. Watch it in the scene at one week per second.'),
    followUp: { tool: 'orbit-lab', label: L('Testar no laboratório de órbitas', 'Test in the orbit lab') },
  },
  {
    id: 'speed-reverse', kind: 'scene-task', theme: 'speed',
    title: L('Refazendo o caminho', 'Retracing the path'),
    objective: L('Inverter o tempo e observar os planetas refazerem exatamente suas trajetórias.', 'Reverse time and watch the planets retrace exactly their paths.'),
    startView: { kind: 'overview', rate: 86400 * 3 },
    task: L('Ative os rastros e inverta a direção do tempo com a reprodução ativa.', 'Turn on trails and reverse the time direction with playback active.'),
    check: 'reverse-playing',
    explanation: L('O modelo é determinístico: a posição depende só do instante. Ao inverter o tempo, cada corpo percorre o mesmo caminho para trás, sem deriva entre pais e satélites.', 'The model is deterministic: position depends only on the instant. When time reverses, each body follows the same path backward, with no drift between parents and satellites.'),
  },
  {
    id: 'seasons-zero-tilt', kind: 'choice', theme: 'seasons',
    title: L('E se a inclinação fosse zero?', 'What if the tilt were zero?'),
    objective: L('Prever o efeito da inclinação axial nas estações.', 'Predict the effect of axial tilt on the seasons.'),
    startView: { tool: 'seasons-lab' },
    question: L('Se o eixo da Terra não fosse inclinado (0°), o que aconteceria com as estações?', 'If Earth\'s axis were not tilted (0°), what would happen to the seasons?'),
    options: [
      { text: L('Continuariam iguais, pois dependem da distância ao Sol', 'They would stay the same, since they depend on the distance to the Sun') },
      { text: L('Praticamente desapareceriam; cada latitude teria sempre o mesmo dia', 'They would nearly vanish; each latitude would always have the same day length') },
      { text: L('Ficariam mais intensas', 'They would become more intense') },
    ],
    correct: 1,
    explanation: L('As estações vêm da inclinação de 23,4°, que muda a altura do Sol e a duração do dia ao longo do ano. Sem inclinação, a declinação solar seria sempre 0° e o dia teria 12 horas em toda latitude. A variação de distância (3%) tem efeito pequeno.', 'Seasons come from the 23.4° tilt, which changes the Sun\'s height and day length across the year. Without tilt, solar declination would always be 0° and every latitude would have 12-hour days. The 3% distance variation has a small effect.'),
    followUp: { tool: 'seasons-lab', label: L('Testar com inclinação 0°', 'Test with 0° tilt') },
  },
  {
    id: 'rings-frame', kind: 'scene-task', theme: 'rings',
    title: L('Enquadrando os anéis', 'Framing the rings'),
    objective: L('Aproximar-se de Saturno até os anéis preencherem a vista.', 'Approach Saturn until the rings fill the view.'),
    startView: { kind: 'overview' },
    task: L('Selecione Saturno e use Focar (ou duplo clique) para aproximar a câmera até os anéis ficarem grandes na tela.', 'Select Saturn and use Focus (or double-click) to bring the camera close enough that the rings are large on screen.'),
    check: 'close:saturn',
    explanation: L('O enquadramento inclui o raio externo dos anéis (anel A a 136.775 km), não só o planeta. Os anéis seguem o equador de Saturno, inclinado 26,7° em relação à órbita — por isso os vemos abertos ou de perfil conforme a época.', 'Framing includes the outer ring radius (A ring at 136,775 km), not just the planet. The rings follow Saturn\'s equator, tilted 26.7° to the orbit — which is why we see them open or edge-on depending on the epoch.'),
  },
  {
    id: 'moons-parent', kind: 'scene-task', theme: 'moons',
    title: L('De quem é esta lua?', 'Whose moon is this?'),
    objective: L('Encontrar o planeta pai de uma lua a partir da própria lua.', 'Find a moon\'s parent planet starting from the moon.'),
    startView: { target: 'io', kind: 'focus' },
    task: L('Você está em Io. Encontre e selecione o planeta que ela orbita.', 'You are at Io. Find and select the planet it orbits.'),
    check: 'select:jupiter',
    hint: L('O inspetor mostra o campo "Orbita" com o pai; a lista de luas fica na aba Sistema.', 'The inspector shows the "Orbits" field with the parent; the moon list is on the System tab.'),
    explanation: L('Io é a lua galileana mais interna de Júpiter, a 421.700 km do planeta — distância medida em relação a Júpiter, não ao Sol.', 'Io is Jupiter\'s innermost Galilean moon, 421,700 km from the planet — a distance measured relative to Jupiter, not the Sun.'),
  },
  {
    id: 'moons-count', kind: 'choice', theme: 'moons',
    title: L('Luas exibidas e luas conhecidas', 'Moons shown and moons known'),
    objective: L('Distinguir a quantidade renderizada da quantidade conhecida.', 'Distinguish the rendered count from the known count.'),
    startView: { target: 'jupiter', kind: 'system' },
    question: L(`Júpiter tem ${BODY_MAP.jupiter.physical.knownMoons} luas conhecidas (dados de ${BODY_MAP.jupiter.physical.knownMoonsAsOf}). Quantas são exibidas nesta cena?`, `Jupiter has ${BODY_MAP.jupiter.physical.knownMoons} known moons (data as of ${BODY_MAP.jupiter.physical.knownMoonsAsOf}). How many are shown in this scene?`),
    options: [{ text: L('4', '4') }, { text: L(String(BODY_MAP.jupiter.physical.knownMoons), String(BODY_MAP.jupiter.physical.knownMoons)) }, { text: L('16', '16') }],
    correct: 0,
    explanation: L('A cena mostra as quatro luas galileanas, escolhidas por importância. A contagem "Luas exibidas" nunca deve ser confundida com "Luas conhecidas", que é um dado com data de referência e muda com novas descobertas.', 'The scene shows the four Galilean moons, chosen for their importance. The "Moons shown" count must never be confused with "Known moons", a dated figure that changes with new discoveries.'),
  },
  {
    id: 'gravity-weight', kind: 'choice', theme: 'gravity',
    title: L('Onde você pesaria mais?', 'Where would you weigh most?'),
    objective: L('Separar massa de peso usando a gravidade de referência.', 'Separate mass from weight using the reference gravity.'),
    startView: { tool: 'orbit-lab' },
    question: L('Uma pessoa de 70 kg pesaria mais em qual destes?', 'Where would a 70 kg person weigh the most?'),
    options: [{ text: L('Marte (superfície)', 'Mars (surface)'), body: 'mars' }, { text: L('Terra (superfície)', 'Earth (surface)'), body: 'earth' }, { text: L('Júpiter (nível de 1 bar)', 'Jupiter (1-bar level)'), body: 'jupiter' }],
    correct: () => { const ids: BodyId[] = ['mars', 'earth', 'jupiter']; let best = 0; for (let i = 1; i < ids.length; i++) if ((BODY_MAP[ids[i]].physical.gravityMs2 ?? 0) > (BODY_MAP[ids[best]].physical.gravityMs2 ?? 0)) best = i; return best; },
    explanation: L('A massa (70 kg) não muda; o peso W = m·g muda. Em Júpiter, g ≈ 24,8 m/s² no nível de 1 bar (não há superfície sólida), dando ~1.735 N contra 686 N na Terra e 260 N em Marte.', 'Mass (70 kg) does not change; weight W = m·g does. On Jupiter, g ≈ 24.8 m/s² at the 1-bar level (there is no solid surface), giving ~1,735 N versus 686 N on Earth and 260 N on Mars.'),
    followUp: { tool: 'orbit-lab', label: L('Calcular seu peso', 'Calculate your weight') },
  },
  {
    id: 'light-sun-earth', kind: 'choice', theme: 'light',
    title: L('A idade da luz do Sol', 'The age of sunlight'),
    objective: L('Estimar o tempo de viagem da luz do Sol à Terra.', 'Estimate light-travel time from the Sun to Earth.'),
    startView: { target: 'earth', kind: 'focus' },
    question: L('Quanto tempo a luz leva do Sol até a Terra?', 'How long does light take from the Sun to Earth?'),
    options: [{ text: L('Cerca de 8 segundos', 'About 8 seconds') }, { text: L('Cerca de 8 minutos', 'About 8 minutes') }, { text: L('Cerca de 8 horas', 'About 8 hours') }],
    correct: 1,
    explanation: L('1 UA ÷ 299.792 km/s ≈ 499 s ≈ 8 min 19 s. Use a régua de medição entre Sol e Terra para ver o valor exato na data atual da simulação, que varia com a excentricidade da órbita.', '1 au ÷ 299,792 km/s ≈ 499 s ≈ 8 min 19 s. Use the measurement ruler between the Sun and Earth to see the exact value at the current simulation date, which varies with the orbit\'s eccentricity.'),
    followUp: { tool: 'measure', label: L('Medir Sol–Terra', 'Measure Sun–Earth') },
  },
  {
    id: 'light-measure', kind: 'scene-task', theme: 'light',
    title: L('Medindo com a luz', 'Measuring with light'),
    objective: L('Usar a ferramenta de medição para obter distância e tempo de luz.', 'Use the measurement tool to obtain a distance and light time.'),
    startView: { tool: 'measure' },
    task: L('Na ferramenta Medir, defina Sol e Júpiter como extremidades e leia o tempo de luz.', 'In the Measure tool, set the Sun and Jupiter as endpoints and read the light time.'),
    check: 'measure:sun,jupiter',
    explanation: L('A distância Sol–Júpiter varia entre 4,95 e 5,46 UA (excentricidade 0,048): entre 41 e 45 minutos-luz. O valor vem das coordenadas físicas do modelo, não da linha desenhada em escala comprimida.', 'The Sun–Jupiter distance varies between 4.95 and 5.46 au (eccentricity 0.048): 41 to 45 light-minutes. The value comes from the model\'s physical coordinates, not from the line drawn in compressed scale.'),
  },
  {
    id: 'scale-relative', kind: 'scene-task', theme: 'scale',
    title: L('A escala verdadeira', 'The true scale'),
    objective: L('Ver a Terra em Escala Relativa e entender por que ela some.', 'See Earth in Relative Scale and understand why it vanishes.'),
    startView: { target: 'earth', kind: 'focus' },
    task: L('Troque para Escala Relativa mantendo a Terra selecionada.', 'Switch to Relative Scale while keeping Earth selected.'),
    check: 'relative:earth',
    explanation: L('Em proporção real, a Terra tem 1/11.700 da sua distância ao Sol. Em uma visão de todo o sistema ela ocuparia menos de um pixel; marcadores, rótulos e a busca mantêm o acesso. As grandezas físicas não mudam com a escala.', 'In true proportion, Earth is 1/11,700 of its distance to the Sun. In a whole-system view it would occupy less than a pixel; markers, labels and search keep it reachable. Physical quantities do not change with the scale.'),
    followUp: { tool: 'scale-lab', label: L('Abrir laboratório de escala', 'Open the scale lab') },
  },
  {
    id: 'uncertainty-model', kind: 'choice', theme: 'uncertainty',
    title: L('O que este modelo sabe?', 'What does this model know?'),
    objective: L('Reconhecer os limites das posições exibidas.', 'Recognize the limits of the displayed positions.'),
    startView: { kind: 'overview' },
    question: L('Qual afirmação sobre as posições dos planetas nesta cena é verdadeira?', 'Which statement about the planetary positions in this scene is true?'),
    options: [
      { text: L('São telemetria ao vivo de sondas', 'They are live telemetry from spacecraft') },
      { text: L('Vêm de elementos keplerianos aproximados, válidos em um intervalo de datas declarado', 'They come from approximate Keplerian elements, valid within a stated date range') },
      { text: L('São exatas ao segundo para qualquer data', 'They are exact to the second for any date') },
    ],
    correct: 1,
    explanation: L('As posições usam os elementos aproximados do JPL (válidos de 1800 a 2050), sem perturbações, precessão ou correções de tempo-luz. Erros típicos são de minutos de arco. Fora do intervalo a simulação pausa e avisa.', 'Positions use JPL\'s approximate elements (valid 1800–2050), without perturbations, precession or light-time corrections. Typical errors are arcminutes. Outside the range the simulation pauses and warns.'),
    modelCaveat: L('Este é o ponto da atividade: o modelo é educacional, não uma efeméride de precisão.', 'That is the point of this activity: the model is educational, not a precision ephemeris.'),
  },
];

export const ACTIVITY_MAP: Record<string, Activity> = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));

export function correctIndex(a: ChoiceActivity): number {
  return typeof a.correct === 'function' ? a.correct() : a.correct;
}
