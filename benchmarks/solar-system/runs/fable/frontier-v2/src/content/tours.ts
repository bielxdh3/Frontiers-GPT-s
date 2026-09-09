import type { BodyId, LocalizedText } from '../data/types';
import type { LabelsMode, OrbitsMode, Overlays, Tool } from '../state/store';

export interface TourStop {
  id: string;
  target: BodyId;
  camera: { kind: 'focus' | 'system' | 'overview'; zoom?: number; theta?: number; phi?: number; preset?: 'top' | 'low' | 'equatorial' | 'polar' | 'terminator' };
  title: LocalizedText;
  text: LocalizedText;
  overlays?: Partial<Overlays>;
  labelsMode?: LabelsMode;
  orbitsMode?: OrbitsMode;
  /** Signed rate for this stop (0 pauses). Undefined leaves playback alone. */
  rate?: number;
  deeper?: { kind: 'tool' | 'activity' | 'article'; id: Tool | string; label: LocalizedText };
}

export interface Tour {
  id: string;
  title: LocalizedText;
  goal: LocalizedText;
  minutes: number;
  stops: TourStop[];
}

const L = (pt: string, en: string): LocalizedText => ({ pt, en });

export const TOURS: Tour[] = [
  {
    id: 'grand',
    title: L('Grande Tour', 'Grand Tour'),
    goal: L('Uma volta completa pelo sistema: do Sol a Plutão, com paradas em cada mundo principal.', 'A complete loop through the system: from the Sun to Pluto, stopping at every major world.'),
    minutes: 12,
    stops: [
      { id: 'sun', target: 'sun', camera: { kind: 'focus', zoom: 1.4, phi: 1.2 }, title: L('O Sol', 'The Sun'), labelsMode: 'major', orbitsMode: 'all', rate: 3600,
        text: L('Quase toda a massa do Sistema Solar está aqui: 99,8% dela. A luz que ilumina cada planeta desta cena parte desta fotosfera a cerca de 5.800 K. A granulação e a coroa são representações ilustrativas.', 'Almost all the mass of the Solar System is here: 99.8% of it. The light illuminating every planet in this scene leaves this photosphere at about 5,800 K. The granulation and corona are illustrative representations.') },
      { id: 'mercury', target: 'mercury', camera: { kind: 'focus', zoom: 1.1 }, title: L('Mercúrio', 'Mercury'),
        text: L('O menor planeta e o mais rápido: completa uma órbita em 88 dias. Sem atmosfera significativa, o lado diurno passa de 700 K e o noturno cai abaixo de 100 K.', 'The smallest planet and the fastest: one orbit takes 88 days. Without a significant atmosphere, the day side exceeds 700 K while the night side drops below 100 K.') },
      { id: 'venus', target: 'venus', camera: { kind: 'focus', zoom: 1.1 }, title: L('Vênus', 'Venus'),
        text: L('Envolto em nuvens de ácido sulfúrico, Vênus tem a superfície mais quente de qualquer planeta, ~735 K, por causa de uma atmosfera densa de CO₂. Gira devagar e em sentido retrógrado.', 'Wrapped in sulfuric-acid clouds, Venus has the hottest surface of any planet, ~735 K, because of a dense CO₂ atmosphere. It rotates slowly and in the retrograde direction.') },
      { id: 'earth', target: 'earth', camera: { kind: 'focus', zoom: 1.0, preset: 'terminator' }, title: L('Terra', 'Earth'),
        text: L('Oceanos, continentes, nuvens separadas e uma borda atmosférica fina. Repare no terminador: a linha entre dia e noite responde à direção real do Sol nesta cena.', 'Oceans, continents, separate clouds and a thin atmospheric rim. Notice the terminator: the day–night line responds to the actual Sun direction in this scene.') },
      { id: 'moon', target: 'moon', camera: { kind: 'system' }, title: L('Terra e Lua', 'Earth and Moon'), overlays: { moons: 'auto' }, labelsMode: 'system',
        text: L('A Lua orbita a Terra a cada 27,3 dias enquanto a Terra segue em torno do Sol. Em Escala de Exploração a distância entre elas está comprimida; a escala relativa mostra os 384 mil km reais.', 'The Moon orbits Earth every 27.3 days while Earth continues around the Sun. In Exploration Scale their separation is compressed; Relative Scale shows the real 384,000 km.') },
      { id: 'mars', target: 'mars', camera: { kind: 'focus', zoom: 1.0 }, title: L('Marte', 'Mars'),
        text: L('Metade do diâmetro da Terra, um dia de 24 h 37 min e estações marcadas por uma inclinação axial parecida com a nossa. As regiões escuras e os polos claros são representação procedural.', 'Half Earth\'s diameter, a 24 h 37 min day and seasons driven by an axial tilt similar to ours. The dark regions and bright poles are a procedural representation.') },
      { id: 'belt', target: 'asteroid-belt', camera: { kind: 'focus' }, title: L('Cinturão de asteroides', 'Asteroid belt'), overlays: { belts: true }, rate: 86400 * 7,
        text: L('Entre Marte e Júpiter, milhões de corpos pequenos ocupam uma região vasta e majoritariamente vazia. Os pontos aqui são representativos, não um catálogo. Ceres, o maior deles, é um planeta anão.', 'Between Mars and Jupiter, millions of small bodies occupy a vast and mostly empty region. The points here are representative, not a catalog. Ceres, the largest, is a dwarf planet.') },
      { id: 'jupiter', target: 'jupiter', camera: { kind: 'focus', zoom: 1.0 }, title: L('Júpiter', 'Jupiter'),
        text: L('Onze Terras de diâmetro e um dia de menos de 10 horas. As faixas são zonas e cinturões de nuvens; a Grande Mancha Vermelha é uma tempestade maior que a Terra, mostrada em posição ilustrativa.', 'Eleven Earths across and a day shorter than 10 hours. The bands are cloud zones and belts; the Great Red Spot is a storm larger than Earth, shown at an illustrative position.') },
      { id: 'galilean', target: 'jupiter', camera: { kind: 'system' }, title: L('As luas galileanas', 'The Galilean moons'), labelsMode: 'system', overlays: { moons: 'auto' }, rate: 3600 * 6,
        text: L('Io, Europa, Ganimedes e Calisto: quatro mundos distintos. Io é vulcânico, Europa esconde um oceano sob o gelo, Ganimedes é a maior lua do sistema. Suas distâncias estão comprimidas nesta escala.', 'Io, Europa, Ganymede and Callisto: four distinct worlds. Io is volcanic, Europa hides an ocean under ice, Ganymede is the largest moon in the system. Their distances are compressed in this scale.') },
      { id: 'saturn', target: 'saturn', camera: { kind: 'focus', zoom: 1.15, phi: 1.05 }, title: L('Saturno', 'Saturn'), rate: 3600,
        text: L('Os anéis têm centenas de milhares de km de largura e apenas dezenas de metros de espessura. A Divisão de Cassini separa os anéis A e B. A sombra do planeta atravessa os anéis conforme a direção do Sol.', 'The rings span hundreds of thousands of km yet are only tens of meters thick. The Cassini Division separates the A and B rings. The planet\'s shadow crosses the rings according to the Sun direction.') },
      { id: 'uranus', target: 'uranus', camera: { kind: 'focus', zoom: 1.1 }, title: L('Urano', 'Uranus'), overlays: { axes: true },
        text: L('O eixo de Urano está deitado quase no plano da órbita (98°). Cada polo passa décadas em luz contínua. Os anéis finos seguem o equador do planeta, não o de Saturno.', 'Uranus\'s axis lies almost in its orbital plane (98°). Each pole spends decades in continuous light. The thin rings follow the planet\'s equator, not Saturn\'s.') },
      { id: 'neptune', target: 'neptune', camera: { kind: 'focus', zoom: 1.1 }, title: L('Netuno', 'Neptune'), overlays: { axes: false },
        text: L('A 30 UA do Sol, Netuno leva 165 anos para uma órbita e recebe menos de 0,1% da luz que chega à Terra. O azul natural é mais suave que nas imagens históricas realçadas.', 'At 30 au from the Sun, Neptune takes 165 years per orbit and receives less than 0.1% of the light Earth gets. Its natural blue is softer than in enhanced historical images.') },
      { id: 'pluto', target: 'pluto', camera: { kind: 'system' }, title: L('Plutão e Caronte', 'Pluto and Charon'), labelsMode: 'system',
        text: L('Plutão é um planeta anão do Cinturão de Kuiper. Caronte tem metade do seu diâmetro; ambos giram travados um para o outro. Aqui termina o tour, mas não o sistema: veja "Além de Netuno".', 'Pluto is a dwarf planet of the Kuiper Belt. Charon is half its diameter; the two are locked facing each other. The tour ends here, but the system does not: see "Beyond Neptune".'),
        deeper: { kind: 'tool', id: 'beyond', label: L('Abrir Além de Netuno', 'Open Beyond Neptune') } },
    ],
  },
  {
    id: 'earth-moon',
    title: L('Terra e Lua', 'Earth and Moon'),
    goal: L('Entender a relação entre a Terra, a Lua, o dia e a noite e as fases.', 'Understand the relationship between Earth, the Moon, day and night, and the phases.'),
    minutes: 5,
    stops: [
      { id: 'earth', target: 'earth', camera: { kind: 'focus', zoom: 1.0, preset: 'terminator' }, title: L('Dia e noite', 'Day and night'), rate: 600,
        text: L('A Terra gira uma vez a cada 23 h 56 min em relação às estrelas; o dia solar de 24 h inclui o pequeno avanço na órbita. Nesta parada o tempo corre a 10 minutos por segundo.', 'Earth rotates once every 23 h 56 min relative to the stars; the 24 h solar day includes the small advance along the orbit. Time runs at 10 minutes per second at this stop.') },
      { id: 'pair', target: 'earth', camera: { kind: 'system' }, title: L('O par Terra–Lua', 'The Earth–Moon pair'), labelsMode: 'system', rate: 3600 * 3,
        text: L('A Lua completa uma órbita em 27,3 dias. A mesma face aponta sempre para a Terra: rotação sincronizada. Note que a órbita da Lua não gira junto com a superfície da Terra.', 'The Moon completes one orbit in 27.3 days. The same face always points toward Earth: synchronous rotation. Notice that the Moon\'s orbit does not spin along with Earth\'s surface.') },
      { id: 'moon', target: 'moon', camera: { kind: 'focus', zoom: 1.0 }, title: L('A Lua de perto', 'The Moon up close'), overlays: { axes: true },
        text: L('Mares escuros de basalto, terras altas claras e crateras. A Lua não emite luz: a fase que vemos depende do ângulo entre Sol, Lua e observador, não da sombra da Terra.', 'Dark basalt maria, bright highlands and craters. The Moon emits no light: the phase we see depends on the Sun–Moon–observer angle, not on Earth\'s shadow.'),
        deeper: { kind: 'tool', id: 'moon-lab', label: L('Abrir laboratório de fases', 'Open the phases lab') } },
      { id: 'distance', target: 'earth', camera: { kind: 'system' }, title: L('Qual é a distância real?', 'How far is it really?'), overlays: { axes: false },
        text: L('Em Escala de Exploração a Lua parece próxima. Na realidade cabem cerca de 30 Terras entre os dois corpos. Troque para Escala Relativa e a cena mostra a proporção verdadeira.', 'In Exploration Scale the Moon looks close. In reality about 30 Earths fit between the two bodies. Switch to Relative Scale and the scene shows the true proportion.'),
        deeper: { kind: 'tool', id: 'scale-lab', label: L('Abrir laboratório de escala', 'Open the scale lab') } },
    ],
  },
  {
    id: 'giants',
    title: L('Planetas gigantes e suas luas', 'Giant planets and their moons'),
    goal: L('Comparar os quatro gigantes e conhecer suas luas mais importantes.', 'Compare the four giants and meet their most important moons.'),
    minutes: 8,
    stops: [
      { id: 'jupiter', target: 'jupiter', camera: { kind: 'focus', zoom: 1.0 }, title: L('Júpiter, o maior', 'Jupiter, the largest'), rate: 600,
        text: L('Com 318 massas terrestres, Júpiter é mais massivo que todos os outros planetas juntos. Gira em 9 h 56 min; a rotação é visível nesta parada a 10 min por segundo.', 'At 318 Earth masses, Jupiter outweighs all the other planets combined. It spins in 9 h 56 min; the rotation is visible at this stop at 10 min per second.') },
      { id: 'io-europa', target: 'io', camera: { kind: 'system' }, title: L('Io e Europa', 'Io and Europa'), labelsMode: 'system', rate: 3600 * 4,
        text: L('Io, amarela de enxofre, é o corpo mais vulcânico do sistema. Europa, lisa e gelada, guarda um oceano interno. As distâncias estão comprimidas: Io orbita a 6 raios de Júpiter, Calisto a 26.', 'Io, sulfur-yellow, is the most volcanic body in the system. Europa, smooth and icy, holds an internal ocean. Distances are compressed: Io orbits at 6 Jupiter radii, Callisto at 26.') },
      { id: 'saturn', target: 'saturn', camera: { kind: 'focus', zoom: 1.2, phi: 0.95 }, title: L('Os anéis de Saturno', 'Saturn\'s rings'), rate: 3600,
        text: L('Gelo de água em bilhões de fragmentos, do tamanho de grãos a casas. Os anéis C, B e A e a Divisão de Cassini são reproduzidos com raios reais em relação ao planeta.', 'Water ice in billions of fragments, from grains to houses. The C, B and A rings and the Cassini Division are reproduced with real radii relative to the planet.') },
      { id: 'titan', target: 'titan', camera: { kind: 'focus', zoom: 1.0 }, title: L('Titã', 'Titan'),
        text: L('A única lua com atmosfera densa: nitrogênio e uma neblina laranja de hidrocarbonetos que esconde lagos de metano. A sonda Huygens pousou aqui em 2005.', 'The only moon with a dense atmosphere: nitrogen and an orange hydrocarbon haze hiding methane lakes. The Huygens probe landed here in 2005.') },
      { id: 'enceladus', target: 'enceladus', camera: { kind: 'focus', zoom: 1.0 }, title: L('Encélado', 'Enceladus'),
        text: L('Pequena, brilhante e ativa: gêiseres no polo sul lançam água de um oceano interno e alimentam o anel E de Saturno.', 'Small, bright and active: geysers at the south pole vent water from an internal ocean and feed Saturn\'s E ring.') },
      { id: 'uranus', target: 'uranus', camera: { kind: 'system' }, title: L('Urano e suas luas', 'Uranus and its moons'), labelsMode: 'system', overlays: { axes: true },
        text: L('Miranda, Ariel, Umbriel, Titânia e Oberon orbitam no plano equatorial inclinado de Urano — quase perpendicular à órbita. Repare no eixo marcado.', 'Miranda, Ariel, Umbriel, Titania and Oberon orbit in Uranus\'s tilted equatorial plane — almost perpendicular to the orbit. Notice the marked axis.') },
      { id: 'triton', target: 'triton', camera: { kind: 'system' }, title: L('Netuno e Tritão', 'Neptune and Triton'), overlays: { axes: false }, labelsMode: 'system',
        text: L('Tritão orbita no sentido contrário à rotação de Netuno — provável indício de que foi capturado do Cinturão de Kuiper. É a maior lua retrógrada do sistema.', 'Triton orbits opposite to Neptune\'s rotation — likely evidence it was captured from the Kuiper Belt. It is the largest retrograde moon in the system.'),
        deeper: { kind: 'tool', id: 'compare', label: L('Comparar os gigantes', 'Compare the giants') } },
    ],
  },
  {
    id: 'scale',
    title: L('Entendendo a escala', 'Understanding scale'),
    goal: L('Perceber o quanto o Sistema Solar é vazio e por que a cena usa duas escalas.', 'Grasp how empty the Solar System is and why the scene uses two scales.'),
    minutes: 5,
    stops: [
      { id: 'overview', target: 'sun', camera: { kind: 'overview' }, title: L('A visão comprimida', 'The compressed view'), labelsMode: 'major', orbitsMode: 'all',
        text: L('Esta é a Escala de Exploração: raios e distâncias comprimidos por leis de potência para que tudo caiba na tela. A ordem das órbitas e as diferenças de tamanho são preservadas; as proporções não.', 'This is Exploration Scale: radii and distances compressed by power laws so everything fits on screen. Orbital order and size differences are preserved; the proportions are not.') },
      { id: 'earth', target: 'earth', camera: { kind: 'focus', zoom: 1.0 }, title: L('Terra em escala comprimida', 'Earth in compressed scale'),
        text: L('A Terra tem 12.742 km de diâmetro e está a 150 milhões de km do Sol: uma razão de 1 para 11.700. Nenhuma tela mostraria os dois ao mesmo tempo sem compressão.', 'Earth is 12,742 km across and 150 million km from the Sun: a ratio of 1 to 11,700. No screen could show both at once without compression.') },
      { id: 'relative', target: 'earth', camera: { kind: 'focus', zoom: 1.0 }, title: L('Escala Relativa', 'Relative Scale'),
        text: L('Use o seletor de escala para passar à Escala Relativa: tudo em proporção real. A Terra continua na tela, mas os outros planetas viram pontos. Marcadores e rótulos mantêm cada um acessível.', 'Use the scale selector to switch to Relative Scale: everything in true proportion. Earth stays on screen, but the other planets become points. Markers and labels keep each one reachable.'),
        deeper: { kind: 'tool', id: 'scale-lab', label: L('Abrir laboratório de escala', 'Open the scale lab') } },
      { id: 'neptune', target: 'neptune', camera: { kind: 'focus', zoom: 1.0 }, title: L('Trinta vezes mais longe', 'Thirty times farther'),
        text: L('Netuno está a 30 UA: 30 vezes a distância Terra–Sol. A luz do Sol leva 4 horas para chegar. E o Cinturão de Kuiper, a Nuvem de Oort e a estrela mais próxima estão muito além.', 'Neptune sits at 30 au: 30 times the Earth–Sun distance. Sunlight takes 4 hours to arrive. And the Kuiper Belt, the Oort Cloud and the nearest star lie far beyond.'),
        deeper: { kind: 'tool', id: 'beyond', label: L('Abrir Além de Netuno', 'Open Beyond Neptune') } },
    ],
  },
  {
    id: 'light',
    title: L('Luz pelo Sistema Solar', 'Light across the Solar System'),
    goal: L('Usar o tempo de viagem da luz como régua de distâncias.', 'Use light-travel time as a ruler for distances.'),
    minutes: 5,
    stops: [
      { id: 'sun', target: 'sun', camera: { kind: 'focus', zoom: 1.6 }, title: L('A régua mais rápida', 'The fastest ruler'),
        text: L('A luz percorre 299.792 km por segundo. Nada é mais rápido; por isso o tempo de viagem da luz é uma medida natural de distância.', 'Light covers 299,792 km every second. Nothing is faster; that is why light-travel time is a natural measure of distance.') },
      { id: 'earth', target: 'earth', camera: { kind: 'focus', zoom: 1.2 }, title: L('Oito minutos', 'Eight minutes'),
        text: L('A luz do Sol que ilumina esta Terra partiu há cerca de 8 min 19 s. Se o Sol se apagasse agora, só saberíamos daqui a oito minutos. A distância varia ~3% ao longo do ano.', 'The sunlight lighting this Earth left about 8 min 19 s ago. If the Sun went dark now, we would only know eight minutes later. The distance varies ~3% over the year.') },
      { id: 'jupiter', target: 'jupiter', camera: { kind: 'focus', zoom: 1.2 }, title: L('Quarenta minutos', 'Forty minutes'),
        text: L('A 5,2 UA, Júpiter recebe luz de 43 minutos de idade. Uma mensagem de rádio da Terra para uma sonda em Júpiter leva entre 33 e 53 minutos, dependendo das posições.', 'At 5.2 au, Jupiter receives 43-minute-old light. A radio message from Earth to a probe at Jupiter takes 33 to 53 minutes, depending on the positions.') },
      { id: 'neptune', target: 'neptune', camera: { kind: 'focus', zoom: 1.2 }, title: L('Quatro horas', 'Four hours'),
        text: L('Netuno, a 30 UA: 4 h 10 min de luz. Quando a Voyager 2 passou por aqui em 1989, cada imagem levava mais de quatro horas para chegar à Terra.', 'Neptune, at 30 au: 4 h 10 min of light. When Voyager 2 passed here in 1989, every image took more than four hours to reach Earth.'),
        deeper: { kind: 'tool', id: 'measure', label: L('Medir com a régua de luz', 'Measure with the light ruler') } },
    ],
  },
  {
    id: 'discoveries',
    title: L('Seguindo as descobertas', 'Follow the discoveries'),
    goal: L('Uma cronologia de missões que revelaram estes mundos, com fontes.', 'A chronology of missions that revealed these worlds, with sources.'),
    minutes: 7,
    stops: [
      { id: 'apollo', target: 'moon', camera: { kind: 'focus', zoom: 1.0 }, title: L('1969 — Apollo 11', '1969 — Apollo 11'),
        text: L('Em 20 de julho de 1969, humanos pousaram na Lua e trouxeram 21,5 kg de rochas. A idade das amostras ajudou a datar a superfície de toda a Lua por contagem de crateras.', 'On 20 July 1969, humans landed on the Moon and brought back 21.5 kg of rock. The samples\' ages helped date the entire lunar surface by crater counting.') },
      { id: 'viking', target: 'mars', camera: { kind: 'focus', zoom: 1.0 }, title: L('1976 — Viking 1', '1976 — Viking 1'),
        text: L('A primeira operação bem-sucedida na superfície de Marte enviou imagens de um deserto rochoso sob um céu rosado e mediu uma atmosfera fina de CO₂.', 'The first successful operation on the Martian surface sent images of a rocky desert under a pinkish sky and measured a thin CO₂ atmosphere.') },
      { id: 'voyager-jupiter', target: 'jupiter', camera: { kind: 'system' }, title: L('1979 — Voyager em Júpiter', '1979 — Voyager at Jupiter'), labelsMode: 'system',
        text: L('As Voyagers descobriram vulcões ativos em Io e o anel fino de Júpiter. O estado do planeta nesta cena não muda por causa da história: a posição vem do modelo orbital para a data atual.', 'The Voyagers discovered active volcanoes on Io and Jupiter\'s thin ring. The planet\'s state in this scene does not change because of the story: its position comes from the orbital model for the current date.') },
      { id: 'voyager-neptune', target: 'neptune', camera: { kind: 'focus', zoom: 1.0 }, title: L('1989 — Voyager 2 em Netuno', '1989 — Voyager 2 at Neptune'),
        text: L('A única visita a Netuno até hoje: ventos de 2.000 km/h, a Grande Mancha Escura e gêiseres de nitrogênio em Tritão.', 'The only visit to Neptune so far: 2,000 km/h winds, the Great Dark Spot and nitrogen geysers on Triton.') },
      { id: 'cassini', target: 'saturn', camera: { kind: 'focus', zoom: 1.15 }, title: L('2004–2017 — Cassini-Huygens', '2004–2017 — Cassini-Huygens'),
        text: L('Treze anos em órbita de Saturno: os gêiseres de Encélado, os lagos de Titã e a estrutura fina dos anéis. A missão terminou mergulhando no planeta em 2017 para proteger as luas.', 'Thirteen years orbiting Saturn: Enceladus\'s geysers, Titan\'s lakes and the fine structure of the rings. The mission ended by plunging into the planet in 2017 to protect the moons.') },
      { id: 'new-horizons', target: 'pluto', camera: { kind: 'system' }, title: L('2015 — New Horizons', '2015 — New Horizons'), labelsMode: 'system',
        text: L('Plutão revelou montanhas de gelo de água, planícies de nitrogênio congelado e uma atmosfera azulada. Caronte tem um cânion maior que o Grand Canyon.', 'Pluto revealed water-ice mountains, plains of frozen nitrogen and a bluish atmosphere. Charon has a canyon larger than the Grand Canyon.'),
        deeper: { kind: 'tool', id: 'missions', label: L('Abrir histórico de missões', 'Open mission history') } },
    ],
  },
];

export const TOUR_MAP: Record<string, Tour> = Object.fromEntries(TOURS.map((tr) => [tr.id, tr]));
