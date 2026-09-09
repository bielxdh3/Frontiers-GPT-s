export type TourStop = {
  title: { 'pt-BR': string; en: string }
  body: { 'pt-BR': string; en: string }
  targetId: string
  overlays?: { labels?: string; orbits?: string }
}

export type TourDef = {
  id: string
  title: { 'pt-BR': string; en: string }
  stops: TourStop[]
}

export const TOURS: TourDef[] = [
  {
    id: 'grand',
    title: { 'pt-BR': 'Grande viagem', en: 'Grand Tour' },
    stops: [
      { title: { 'pt-BR': 'O Sol', en: 'The Sun' }, body: { 'pt-BR': 'A estrela que ilumina todos os hemisférios neste modelo. A coroa é ilustrativa.', en: 'The star that lights every hemisphere in this model. The corona is illustrative.' }, targetId: 'sun' },
      { title: { 'pt-BR': 'Mercúrio e Vênus', en: 'Mercury and Venus' }, body: { 'pt-BR': 'Mundos internos: Mercúrio craterizado, Vênus sob nuvens densas.', en: 'Inner worlds: cratered Mercury, Venus under dense clouds.' }, targetId: 'venus' },
      { title: { 'pt-BR': 'Terra e Lua', en: 'Earth and Moon' }, body: { 'pt-BR': 'A Lua orbita o referencial de posição da Terra, não o giro diário da superfície.', en: 'The Moon orbits Earth’s positional frame, not its daily spin.' }, targetId: 'earth' },
      { title: { 'pt-BR': 'Marte', en: 'Mars' }, body: { 'pt-BR': 'Planeta vermelho com duas luas minúsculas: Fobos e Deimos.', en: 'The red planet with two tiny moons: Phobos and Deimos.' }, targetId: 'mars' },
      { title: { 'pt-BR': 'Cinturão de asteroides', en: 'Asteroid belt' }, body: { 'pt-BR': 'Partículas representativas entre Marte e Júpiter. Ceres e Vesta são inspecionáveis.', en: 'Representative particles between Mars and Jupiter. Ceres and Vesta are inspectable.' }, targetId: 'ceres' },
      { title: { 'pt-BR': 'Júpiter', en: 'Jupiter' }, body: { 'pt-BR': 'O maior planeta. A Grande Mancha Vermelha está em longitude ilustrativa.', en: 'The largest planet. The Great Red Spot sits at an illustrative longitude.' }, targetId: 'jupiter' },
      { title: { 'pt-BR': 'Saturno', en: 'Saturn' }, body: { 'pt-BR': 'Anéis no plano equatorial, alinhados enquanto o planeta gira.', en: 'Rings in the equatorial plane, aligned while the planet spins.' }, targetId: 'saturn' },
      { title: { 'pt-BR': 'Urano', en: 'Uranus' }, body: { 'pt-BR': 'Gigante de gelo de lado: o eixo tem cerca de 98°.', en: 'Ice giant on its side: the axis is about 98°.' }, targetId: 'uranus' },
      { title: { 'pt-BR': 'Netuno', en: 'Neptune' }, body: { 'pt-BR': 'O planeta mais distante. Tritão orbita ao contrário.', en: 'The farthest planet. Triton orbits the other way.' }, targetId: 'neptune' },
      { title: { 'pt-BR': 'Plutão', en: 'Pluto' }, body: { 'pt-BR': 'Planeta anão do Cinturão de Kuiper, não um nono planeta esquecido.', en: 'A Kuiper Belt dwarf planet, not a forgotten ninth planet.' }, targetId: 'pluto' },
    ],
  },
  {
    id: 'earth-moon',
    title: { 'pt-BR': 'Terra e Lua', en: 'Earth and Moon' },
    stops: [
      { title: { 'pt-BR': 'A Terra', en: 'Earth' }, body: { 'pt-BR': 'Continentes, oceanos, nuvens e um terminador dia-noite coerente com o Sol.', en: 'Continents, oceans, clouds, and a terminator consistent with the Sun.' }, targetId: 'earth' },
      { title: { 'pt-BR': 'A Lua', en: 'The Moon' }, body: { 'pt-BR': 'Fases vêm da geometria da luz, não da sombra da Terra.', en: 'Phases come from lighting geometry, not Earth’s shadow.' }, targetId: 'moon' },
    ],
  },
  {
    id: 'giants',
    title: { 'pt-BR': 'Gigantes e suas luas', en: 'Giant planets and their moons' },
    stops: [
      { title: { 'pt-BR': 'Io', en: 'Io' }, body: { 'pt-BR': 'A mais interna das galileanas, visualmente distinta das outras.', en: 'Innermost Galilean moon, visually distinct from the others.' }, targetId: 'io' },
      { title: { 'pt-BR': 'Europa', en: 'Europa' }, body: { 'pt-BR': 'Crosta gelada clara — não é uma esfera cinza genérica.', en: 'Bright icy crust — not a generic gray sphere.' }, targetId: 'europa' },
      { title: { 'pt-BR': 'Titã', en: 'Titan' }, body: { 'pt-BR': 'Névoa densa; a superfície visível não é o chão.', en: 'Dense haze; the visible globe is not the ground.' }, targetId: 'titan' },
      { title: { 'pt-BR': 'Encélado', en: 'Enceladus' }, body: { 'pt-BR': 'Gelo brilhante no sistema de Saturno.', en: 'Bright ice in Saturn’s system.' }, targetId: 'enceladus' },
    ],
  },
  {
    id: 'scale',
    title: { 'pt-BR': 'Entender a escala', en: 'Understanding Scale' },
    stops: [
      { title: { 'pt-BR': 'Escala de exploração', en: 'Exploration Scale' }, body: { 'pt-BR': 'Tamanhos e distâncias comprimidos para navegar. Ordem orbital preservada.', en: 'Sizes and distances compressed for navigation. Orbital order preserved.' }, targetId: 'earth' },
      { title: { 'pt-BR': 'Escala relativa', en: 'Relative Scale' }, body: { 'pt-BR': 'Raios em proporção verdadeira; distâncias ainda comprimidas — leia o selo.', en: 'True radius ratios; distances still compressed — read the badge.' }, targetId: 'jupiter' },
    ],
  },
  {
    id: 'light',
    title: { 'pt-BR': 'Luz no Sistema Solar', en: 'Light Across the Solar System' },
    stops: [
      { title: { 'pt-BR': 'Do Sol à Terra', en: 'Sun to Earth' }, body: { 'pt-BR': 'A luz leva cerca de 8 minutos do Sol à Terra. Use a régua para medir.', en: 'Light takes about 8 minutes from the Sun to Earth. Use the ruler to measure.' }, targetId: 'earth' },
      { title: { 'pt-BR': 'Até Netuno', en: 'Out to Neptune' }, body: { 'pt-BR': 'Até Netuno, a luz leva horas. Distâncias físicas não usam a cena comprimida.', en: 'Out to Neptune, light takes hours. Physical distances do not use the compressed scene.' }, targetId: 'neptune' },
    ],
  },
  {
    id: 'discoveries',
    title: { 'pt-BR': 'Seguir as descobertas', en: 'Follow the discoveries' },
    stops: [
      { title: { 'pt-BR': 'Apollo', en: 'Apollo' }, body: { 'pt-BR': 'Humanos na Lua em 1969. Isto não reproduz telemetria da missão.', en: 'Humans on the Moon in 1969. This is not mission telemetry.' }, targetId: 'moon' },
      { title: { 'pt-BR': 'Voyager', en: 'Voyager' }, body: { 'pt-BR': 'Encontros com os gigantes nos anos 1970–89. Rotas aqui são esquemáticas.', en: 'Giant-planet encounters in 1979–89. Routes here are schematic.' }, targetId: 'jupiter' },
      { title: { 'pt-BR': 'Cassini', en: 'Cassini' }, body: { 'pt-BR': 'Órbita de Saturno e pouso da Huygens em Titã.', en: 'Saturn orbiter and Huygens landing on Titan.' }, targetId: 'saturn' },
      { title: { 'pt-BR': 'New Horizons', en: 'New Horizons' }, body: { 'pt-BR': 'Sobrevoo de Plutão em 14 jul 2015.', en: 'Pluto flyby on 14 Jul 2015.' }, targetId: 'pluto' },
    ],
  },
]

export type Activity = {
  id: string
  theme: string
  title: { 'pt-BR': string; en: string }
  objective: { 'pt-BR': string; en: string }
  hint: { 'pt-BR': string; en: string }
  explain: { 'pt-BR': string; en: string }
  startId: string
  check: (ctx: { selectedId: string | null; compare: string[]; scaleMode: string; playing: boolean; direction: number; tool: string }) => boolean
}

export const ACTIVITIES: Activity[] = [
  { id: 'order', theme: 'planetary-order', title: { 'pt-BR': 'Ordem planetária', en: 'Planetary order' }, objective: { 'pt-BR': 'Selecione o quarto planeta a partir do Sol.', en: 'Select the fourth planet from the Sun.' }, hint: { 'pt-BR': 'Mercúrio, Vênus, Terra, …', en: 'Mercury, Venus, Earth, …' }, explain: { 'pt-BR': 'Marte é o quarto.', en: 'Mars is fourth.' }, startId: 'sun', check: (c) => c.selectedId === 'mars' },
  { id: 'size', theme: 'size', title: { 'pt-BR': 'Quem é maior?', en: 'Which is larger?' }, objective: { 'pt-BR': 'Selecione o planeta de maior diâmetro médio.', en: 'Select the planet with the largest mean diameter.' }, hint: { 'pt-BR': 'Pense nos gigantes gasosos.', en: 'Think of the gas giants.' }, explain: { 'pt-BR': 'Júpiter é o maior.', en: 'Jupiter is largest.' }, startId: 'earth', check: (c) => c.selectedId === 'jupiter' },
  { id: 'dayyear', theme: 'day-year', title: { 'pt-BR': 'Dia e ano', en: 'Day and year' }, objective: { 'pt-BR': 'Abra os dados da Terra e identifique rotação vs órbita — depois selecione Vênus, cujo dia sideral é mais longo que o ano.', en: 'Open Earth’s data, then select Venus, whose sidereal day is longer than its year.' }, hint: { 'pt-BR': 'Vênus gira muito devagar e no sentido retrógrado.', en: 'Venus spins very slowly and retrograde.' }, explain: { 'pt-BR': 'Rotação sideral de Vênus: −243 d; órbita ~225 d.', en: 'Venus sidereal rotation: −243 d; orbit ~225 d.' }, startId: 'earth', check: (c) => c.selectedId === 'venus' },
  { id: 'phases', theme: 'phases', title: { 'pt-BR': 'Fases da Lua', en: 'Moon phases' }, objective: { 'pt-BR': 'Abra o laboratório da Lua (Ferramentas).', en: 'Open the Moon laboratory (Tools).' }, hint: { 'pt-BR': 'Ferramentas → laboratório Lua.', en: 'Tools → Moon lab.' }, explain: { 'pt-BR': 'Fases ≠ eclipses.', en: 'Phases ≠ eclipses.' }, startId: 'moon', check: (c) => c.tool === 'moon-lab' },
  { id: 'speed', theme: 'orbital-speed', title: { 'pt-BR': 'Velocidade orbital', en: 'Orbital speed' }, objective: { 'pt-BR': 'Selecione Mercúrio, o planeta mais rápido na órbita.', en: 'Select Mercury, the fastest-orbiting planet.' }, hint: { 'pt-BR': 'Mais perto do Sol, mais rápido (Kepler).', en: 'Closer to the Sun, faster (Kepler).' }, explain: { 'pt-BR': 'Mercúrio tem o menor período e maior velocidade média.', en: 'Mercury has the shortest period and highest mean speed.' }, startId: 'neptune', check: (c) => c.selectedId === 'mercury' },
  { id: 'seasons', theme: 'seasons', title: { 'pt-BR': 'Estações', en: 'Seasons' }, objective: { 'pt-BR': 'Abra o laboratório de estações.', en: 'Open the seasons laboratory.' }, hint: { 'pt-BR': 'Ferramentas → estações.', en: 'Tools → seasons.' }, explain: { 'pt-BR': 'A inclinação axial, não a distância ao Sol, domina as estações da Terra.', en: 'Axial tilt, not Sun distance, dominates Earth’s seasons.' }, startId: 'earth', check: (c) => c.tool === 'seasons-lab' },
  { id: 'rings', theme: 'rings', title: { 'pt-BR': 'Anéis', en: 'Rings' }, objective: { 'pt-BR': 'Foque Saturno para enquadrar o sistema de anéis.', en: 'Focus Saturn to frame the ring system.' }, hint: { 'pt-BR': 'Busque Saturno e use Focar.', en: 'Search Saturn and Focus.' }, explain: { 'pt-BR': 'Os anéis estão no equador de Saturno.', en: 'The rings lie in Saturn’s equator.' }, startId: 'sun', check: (c) => c.selectedId === 'saturn' },
  { id: 'moons', theme: 'moons', title: { 'pt-BR': 'Quem é o pai?', en: 'Who is the parent?' }, objective: { 'pt-BR': 'Selecione Titã, lua de Saturno.', en: 'Select Titan, Saturn’s moon.' }, hint: { 'pt-BR': 'Não é uma lua de Júpiter.', en: 'Not a Jupiter moon.' }, explain: { 'pt-BR': 'Titã orbita Saturno.', en: 'Titan orbits Saturn.' }, startId: 'jupiter', check: (c) => c.selectedId === 'titan' },
  { id: 'gravity', theme: 'gravity', title: { 'pt-BR': 'Gravidade', en: 'Gravity' }, objective: { 'pt-BR': 'Abra o laboratório de órbitas/gravidade.', en: 'Open the orbit/gravity laboratory.' }, hint: { 'pt-BR': 'Ferramentas → Kepler.', en: 'Tools → Kepler.' }, explain: { 'pt-BR': 'g = GM/r² no modelo esférico de dois corpos.', en: 'g = GM/r² in the spherical two-body model.' }, startId: 'earth', check: (c) => c.tool === 'orbit-lab' },
  { id: 'light', theme: 'light-travel', title: { 'pt-BR': 'Tempo de luz', en: 'Light travel' }, objective: { 'pt-BR': 'Abra a ferramenta de medição.', en: 'Open the measurement tool.' }, hint: { 'pt-BR': 'Ferramentas → Medir.', en: 'Tools → Measure.' }, explain: { 'pt-BR': 'A régua usa posições físicas, não pixels da cena.', en: 'The ruler uses physical positions, not scene pixels.' }, startId: 'earth', check: (c) => c.tool === 'measure' },
  { id: 'dscale', theme: 'distance-scale', title: { 'pt-BR': 'Escala de distâncias', en: 'Distance scale' }, objective: { 'pt-BR': 'Abra o laboratório de escalas.', en: 'Open the scale laboratory.' }, hint: { 'pt-BR': 'Ferramentas → Escala.', en: 'Tools → Scale.' }, explain: { 'pt-BR': 'Tamanho e distância só compartilham uma escala na vista combinada verdadeira.', en: 'Size and distance share one scale only in combined true-scale view.' }, startId: 'earth', check: (c) => c.tool === 'scale-lab' },
  { id: 'uncertain', theme: 'uncertainty', title: { 'pt-BR': 'Incerteza científica', en: 'Scientific uncertainty' }, objective: { 'pt-BR': 'Selecione Éris e abra Fontes — o raio tem ±50 km.', en: 'Select Eris and open Sources — radius is ±50 km.' }, hint: { 'pt-BR': 'Planetas anões distantes.', en: 'Distant dwarf planets.' }, explain: { 'pt-BR': 'Valores ausentes não viram zero; incerteza é um estado próprio.', en: 'Missing values are not zero; uncertainty is its own state.' }, startId: 'pluto', check: (c) => c.selectedId === 'eris' },
]

export type Article = {
  id: string
  title: { 'pt-BR': string; en: string }
  short: { 'pt-BR': string; en: string }
  long: { 'pt-BR': string; en: string }
  link?: { tool?: string; body?: string }
}

export const ARTICLES: Article[] = [
  { id: 'au', title: { 'pt-BR': 'Unidade astronômica', en: 'Astronomical unit' }, short: { 'pt-BR': '1 ua = 149 597 870,7 km (distância de referência Sol–Terra).', en: '1 au = 149,597,870.7 km (Sun–Earth reference distance).' }, long: { 'pt-BR': 'Usamos o valor da IAU. Distância instantânea ao Sol ≠ semi-eixo maior.', en: 'We use the IAU value. Instantaneous Sun distance ≠ semi-major axis.' } },
  { id: 'light-time', title: { 'pt-BR': 'Tempo de luz', en: 'Light-time' }, short: { 'pt-BR': 'Tempo para a luz percorrer a distância centro a centro, ida.', en: 'Time for light to cover the center-to-center distance, one way.' }, long: { 'pt-BR': 'Não inclui tempo de emissão, relé ou movimento do receptor salvo no pulso educativo.', en: 'Does not include emission delay, relays, or receiver motion except in the educational pulse.' }, link: { tool: 'measure' } },
  { id: 'diameter', title: { 'pt-BR': 'Diâmetro', en: 'Diameter' }, short: { 'pt-BR': 'Neste catálogo, diâmetro médio = 2 × raio médio, salvo indicação equatorial.', en: 'In this catalog, mean diameter = 2 × mean radius unless equatorial is stated.' }, long: { 'pt-BR': 'Gigantes são achatados; o raio equatorial é maior.', en: 'Giants are oblate; equatorial radius is larger.' } },
  { id: 'mass', title: { 'pt-BR': 'Massa', en: 'Mass' }, short: { 'pt-BR': 'Quantidade de matéria, em quilogramas.', en: 'Amount of matter, in kilograms.' }, long: { 'pt-BR': 'Diferente de peso (força).', en: 'Different from weight (a force).' }, link: { tool: 'orbit-lab' } },
  { id: 'gravity', title: { 'pt-BR': 'Gravidade', en: 'Gravity' }, short: { 'pt-BR': 'Aceleração de referência g = GM/r² no modelo esférico.', en: 'Reference acceleration g = GM/r² in the spherical model.' }, long: { 'pt-BR': 'Gigantes: nível de 1 bar, não um chão sólido. Forma e rotação omitidas.', en: 'Giants: 1-bar level, not a solid floor. Shape and spin omitted.' }, link: { tool: 'orbit-lab' } },
  { id: 'density', title: { 'pt-BR': 'Densidade', en: 'Density' }, short: { 'pt-BR': 'Massa / volume de uma esfera de raio médio.', en: 'Mass / volume of a sphere of mean radius.' }, long: { 'pt-BR': 'Saturno é menos denso que a água líquida.', en: 'Saturn is less dense than liquid water.' } },
  { id: 'rotation', title: { 'pt-BR': 'Rotação', en: 'Rotation' }, short: { 'pt-BR': 'Giro em torno do eixo. Período sideral relativo às estrelas.', en: 'Spin about the axis. Sidereal period relative to the stars.' }, long: { 'pt-BR': 'Sinal negativo = retrógrado. Travamento de maré iguala rotação e órbita neste modelo, sem libração.', en: 'Negative sign = retrograde. Tidal locking equates spin and orbit here, with no libration.' } },
  { id: 'revolution', title: { 'pt-BR': 'Revolução', en: 'Revolution' }, short: { 'pt-BR': 'Uma volta na órbita.', en: 'One trip around the orbit.' }, long: { 'pt-BR': 'Período sideral em relação às estrelas distantes.', en: 'Sidereal period relative to distant stars.' } },
  { id: 'sidereal', title: { 'pt-BR': 'Dia sideral', en: 'Sidereal day' }, short: { 'pt-BR': 'Giro completo relativo às estrelas.', en: 'Full spin relative to the stars.' }, long: { 'pt-BR': 'O dia solar inclui o avanço extra da órbita até o Sol voltar ao meridiano.', en: 'The solar day includes the extra orbital advance until the Sun returns to the meridian.' } },
  { id: 'solar-day', title: { 'pt-BR': 'Dia solar', en: 'Solar day' }, short: { 'pt-BR': 'Intervalo entre passagens sucessivas do Sol pelo meridiano.', en: 'Interval between successive solar meridian passages.' }, long: { 'pt-BR': 'Na Terra ≈ 24 h; o sideral ≈ 23 h 56 min.', en: 'On Earth ≈ 24 h; sidereal ≈ 23 h 56 min.' } },
  { id: 'inclination', title: { 'pt-BR': 'Inclinação', en: 'Inclination' }, short: { 'pt-BR': 'Ângulo entre o plano da órbita e a eclíptica J2000 (planetas) ou o equador do pai (muitas luas).', en: 'Angle between the orbit plane and the J2000 ecliptic (planets) or the parent equator (many moons).' }, long: { 'pt-BR': 'Não é a mesma coisa que inclinação axial.', en: 'Not the same as axial tilt.' } },
  { id: 'eccentricity', title: { 'pt-BR': 'Excentricidade', en: 'Eccentricity' }, short: { 'pt-BR': '0 = círculo; próximo de 1 = elipse alongada. Só elipses ligadas (e < 1) neste laboratório.', en: '0 = circle; near 1 = elongated ellipse. Only bound ellipses (e < 1) in this lab.' }, long: { 'pt-BR': 'Mercúrio e o cometa educativo são visivelmente excêntricos.', en: 'Mercury and the educational comet are visibly eccentric.' }, link: { tool: 'orbit-lab' } },
  { id: 'tilt', title: { 'pt-BR': 'Inclinação axial', en: 'Axial tilt' }, short: { 'pt-BR': 'Ângulo entre o eixo de rotação e a normal da órbita.', en: 'Angle between the spin axis and the orbit normal.' }, long: { 'pt-BR': 'A Terra ~23,44°; Urano ~98°. Estações de cada hemisfério são opostas.', en: 'Earth ~23.44°; Uranus ~98°. Hemispheres have opposite seasons.' }, link: { tool: 'seasons-lab' } },
  { id: 'perihelion', title: { 'pt-BR': 'Periélio', en: 'Perihelion' }, short: { 'pt-BR': 'Ponto da órbita mais próximo do Sol: q = a(1−e).', en: 'Closest orbital point to the Sun: q = a(1−e).' }, long: { 'pt-BR': 'Afélio é o mais distante: Q = a(1+e).', en: 'Aphelion is farthest: Q = a(1+e).' } },
  { id: 'aphelion', title: { 'pt-BR': 'Afélio', en: 'Aphelion' }, short: { 'pt-BR': 'Ponto mais distante do Sol.', en: 'Farthest point from the Sun.' }, long: { 'pt-BR': 'Não é “verão” automático — veja inclinação axial.', en: 'Not automatic summer — see axial tilt.' } },
  { id: 'tidal', title: { 'pt-BR': 'Travamento de maré', en: 'Tidal locking' }, short: { 'pt-BR': 'Mesmo hemisfério volta-se ao pai. Sem libração neste modelo.', en: 'The same hemisphere faces the parent. No libration in this model.' }, long: { 'pt-BR': 'Lua, muitas luas galileanas e Caronte estão travados aqui.', en: 'The Moon, many Galilean moons, and Charon are locked here.' } },
  { id: 'phase', title: { 'pt-BR': 'Fase', en: 'Phase' }, short: { 'pt-BR': 'Porção iluminada visível de um ponto de vista.', en: 'Illuminated portion visible from a viewpoint.' }, long: { 'pt-BR': 'Não é a sombra da Terra. Eclipses exigem alinhamento diferente.', en: 'Not Earth’s shadow. Eclipses need a different alignment.' }, link: { tool: 'moon-lab' } },
  { id: 'eclipse', title: { 'pt-BR': 'Eclipse', en: 'Eclipse' }, short: { 'pt-BR': 'Alinhamento que põe um corpo na sombra de outro.', en: 'Alignment that puts one body in another’s shadow.' }, long: { 'pt-BR': 'Este app não é um serviço de previsão. Diagramas são esquemáticos.', en: 'This app is not a prediction service. Diagrams are schematic.' }, link: { tool: 'moon-lab' } },
  { id: 'barycenter', title: { 'pt-BR': 'Baricentro', en: 'Barycenter' }, short: { 'pt-BR': 'Centro de massa de um sistema.', en: 'Center of mass of a system.' }, long: { 'pt-BR': 'A órbita da Terra na Tabela 1 da JPL é o baricentro Terra–Lua (EMB).', en: 'Earth’s JPL Table 1 orbit is the Earth–Moon barycenter (EMB).' } },
  { id: 'frame', title: { 'pt-BR': 'Referencial', en: 'Reference frame' }, short: { 'pt-BR': 'Eclíptica média e equinócio de J2000. Z aponta ao polo norte da eclíptica.', en: 'Mean ecliptic and equinox of J2000. Z points to the north ecliptic pole.' }, long: { 'pt-BR': 'Seguir Marte com a câmera não transforma as quantidades em marcianas.', en: 'Following Mars with the camera does not make quantities Mars-centered.' } },
  { id: 'about', title: { 'pt-BR': 'Sobre este modelo', en: 'About this model' }, short: { 'pt-BR': 'Kepler analítico (JPL Tabela 1, 1800–2050). Sem N-corpos, sem tempo-luz, sem precessão.', en: 'Analytic Kepler (JPL Table 1, 1800–2050). No N-body, light-time, or precession.' }, long: { 'pt-BR': 'Escala de exploração comprime raios (potência 0,46) e distâncias (potência 0,64). Escala relativa: raios lineares verdadeiros; distâncias log-comprimidas. Luas: Kepler simplificado no referencial do pai, não no giro da superfície. 1× = 1 segundo simulado por segundo real; o padrão é 86 400× (1 dia/s). Fundo estelar é procedural, não um céu observacional. Cinturões são amostras representativas. Dados físicos: JPL phys_par (consulta 2026-09-09). Contagem de luas: NASA Space Place 2026-07-31 / NASA Júpiter ago 2026.', en: 'Exploration scale compresses radii (power 0.46) and distances (power 0.64). Relative: true linear radii; log-compressed distances. Moons: simplified Kepler in the parent positional frame, not surface spin. 1× = 1 simulated second per real second; default is 86,400× (1 day/s). Starfield is procedural, not an observational sky. Belts are representative samples. Physical data: JPL phys_par (retrieved 2026-09-09). Moon counts: NASA Space Place 2026-07-31 / NASA Jupiter Aug 2026.' } },
]

export type Mission = {
  id: string
  name: string
  agency: string
  type: string
  targets: string[]
  launch: string
  encounter?: string
  end?: string
  blurb: { 'pt-BR': string; en: string }
  source: string
  schematic: boolean
}

export const MISSIONS: Mission[] = [
  { id: 'apollo11', name: 'Apollo 11', agency: 'NASA', type: 'crewed landing', targets: ['moon', 'earth'], launch: '1969-07-16', encounter: '1969-07-20', end: '1969-07-24', blurb: { 'pt-BR': 'Primeiro pouso humano na Lua. Datas históricas; sem trajetória de telemetria.', en: 'First crewed lunar landing. Historical dates; no telemetry trajectory.' }, source: 'NASA Apollo 11 mission pages', schematic: true },
  { id: 'voyager1', name: 'Voyager 1', agency: 'NASA/JPL', type: 'flyby / interstellar', targets: ['jupiter', 'saturn'], launch: '1977-09-05', encounter: '1979-03-05', blurb: { 'pt-BR': 'Júpiter 1979, Saturno 1980; agora no espaço interestelar. Rota esquemática.', en: 'Jupiter 1979, Saturn 1980; now in interstellar space. Schematic route.' }, source: 'NASA Voyager', schematic: true },
  { id: 'voyager2', name: 'Voyager 2', agency: 'NASA/JPL', type: 'flyby', targets: ['jupiter', 'saturn', 'uranus', 'neptune'], launch: '1977-08-20', encounter: '1989-08-25', blurb: { 'pt-BR': 'Única sonda a visitar Urano (1986) e Netuno (1989).', en: 'Only spacecraft to visit Uranus (1986) and Neptune (1989).' }, source: 'NASA Voyager', schematic: true },
  { id: 'cassini', name: 'Cassini-Huygens', agency: 'NASA/ESA/ASI', type: 'orbiter / lander', targets: ['saturn', 'titan', 'enceladus'], launch: '1997-10-15', encounter: '2004-07-01', end: '2017-09-15', blurb: { 'pt-BR': 'Órbita de Saturno; Huygens pousou em Titã (2005).', en: 'Saturn orbiter; Huygens landed on Titan (2005).' }, source: 'NASA Cassini', schematic: true },
  { id: 'newhorizons', name: 'New Horizons', agency: 'NASA', type: 'flyby', targets: ['pluto', 'charon'], launch: '2006-01-19', encounter: '2015-07-14', blurb: { 'pt-BR': 'Sobrevoo de Plutão e Caronte em 14 jul 2015.', en: 'Pluto–Charon flyby on 14 Jul 2015.' }, source: 'NASA New Horizons', schematic: true },
  { id: 'curiosity', name: 'Curiosity', agency: 'NASA/JPL', type: 'rover', targets: ['mars'], launch: '2011-11-26', encounter: '2012-08-06', blurb: { 'pt-BR': 'Rover em Marte desde 2012. Status “ativo” não é telemetria ao vivo aqui.', en: 'Mars rover since 2012. “Active” is not live telemetry here.' }, source: 'NASA Mars Curiosity', schematic: true },
  { id: 'perseverance', name: 'Perseverance', agency: 'NASA/JPL', type: 'rover', targets: ['mars'], launch: '2020-07-30', encounter: '2021-02-18', blurb: { 'pt-BR': 'Pouso em 2021. Sem rastreio ao vivo neste app.', en: 'Landed 2021. No live tracking in this app.' }, source: 'NASA Mars Perseverance', schematic: true },
  { id: 'juno', name: 'Juno', agency: 'NASA', type: 'orbiter', targets: ['jupiter'], launch: '2011-08-05', encounter: '2016-07-04', blurb: { 'pt-BR': 'Orbitador polar de Júpiter. Trajetória esquemática.', en: 'Jupiter polar orbiter. Schematic path.' }, source: 'NASA Juno', schematic: true },
]
