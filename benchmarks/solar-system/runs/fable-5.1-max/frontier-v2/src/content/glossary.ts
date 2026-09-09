import type { BodyId, LocalizedText } from '../data/types';
import type { Tool } from '../state/store';

export interface Article {
  id: string;
  title: LocalizedText;
  /** One-paragraph accessible definition. */
  short: LocalizedText;
  /** Optional deeper explanation. */
  deeper?: LocalizedText;
  related: string[];
  /** Working scene example. */
  link?: { kind: 'tool'; id: Tool; label: LocalizedText } | { kind: 'body'; id: BodyId; label: LocalizedText };
  sourceIds: string[];
  synonyms: { pt: string[]; en: string[] };
}

const L = (pt: string, en: string): LocalizedText => ({ pt, en });

export const ARTICLES: Article[] = [
  { id: 'au', title: L('Unidade astronômica (UA)', 'Astronomical unit (au)'),
    short: L('A distância média entre a Terra e o Sol, definida como exatamente 149.597.870,7 km. É a régua natural para distâncias dentro do Sistema Solar.', 'The mean Earth–Sun distance, defined as exactly 149,597,870.7 km. It is the natural ruler for distances inside the Solar System.'),
    deeper: L('Desde 2012 a UA é uma constante definida, não mais medida. A luz percorre 1 UA em 499,0 s. Netuno está a ~30 UA; a Nuvem de Oort começa a milhares de UA; a estrela mais próxima está a ~268.000 UA.', 'Since 2012 the au is a defined constant rather than a measured one. Light covers 1 au in 499.0 s. Neptune is at ~30 au; the Oort Cloud begins at thousands of au; the nearest star is ~268,000 au away.'),
    related: ['light-time', 'perihelion'], link: { kind: 'tool', id: 'beyond', label: L('Ver distâncias em UA', 'See distances in au') }, sourceIds: ['nasa-solar-system'], synonyms: { pt: ['ua', 'unidade astronomica'], en: ['au', 'astronomical unit'] } },
  { id: 'light-time', title: L('Tempo-luz', 'Light-time'),
    short: L('O tempo que a luz leva para percorrer uma distância. A luz viaja a 299.792 km/s: 1,3 s até a Lua, 8,3 min até o Sol, 4,2 h até Netuno.', 'The time light takes to cover a distance. Light travels at 299,792 km/s: 1.3 s to the Moon, 8.3 min to the Sun, 4.2 h to Neptune.'),
    deeper: L('Quando olhamos um planeta, vemos onde ele estava quando a luz partiu. Este modelo não aplica correção de tempo-luz às posições: mostra posições geométricas no instante simulado.', 'When we look at a planet we see where it was when the light left. This model applies no light-time correction to positions: it shows geometric positions at the simulated instant.'),
    related: ['au'], link: { kind: 'tool', id: 'measure', label: L('Medir tempo-luz', 'Measure light-time') }, sourceIds: ['nasa-solar-system'], synonyms: { pt: ['tempo de luz', 'minuto-luz', 'ano-luz'], en: ['light time', 'light minute', 'light year'] } },
  { id: 'diameter', title: L('Diâmetro', 'Diameter'),
    short: L('Duas vezes o raio. Este catálogo usa o diâmetro médio (raio médio volumétrico × 2) e informa o diâmetro equatorial separadamente quando o corpo é achatado.', 'Twice the radius. This catalog uses the mean diameter (volumetric mean radius × 2) and lists the equatorial diameter separately when the body is flattened.'),
    deeper: L('Júpiter tem diâmetro equatorial de 142.984 km e polar de 133.708 km por causa da rotação rápida. Corpos irregulares como Vesta são descritos por três dimensões.', 'Jupiter\'s equatorial diameter is 142,984 km and its polar diameter 133,708 km because of its fast rotation. Irregular bodies like Vesta are described by three dimensions.'),
    related: ['mass', 'density'], link: { kind: 'tool', id: 'compare', label: L('Comparar diâmetros', 'Compare diameters') }, sourceIds: ['jpl-phys'], synonyms: { pt: ['raio', 'tamanho'], en: ['radius', 'size'] } },
  { id: 'mass', title: L('Massa', 'Mass'),
    short: L('A quantidade de matéria de um corpo, em quilogramas. Não muda de lugar para lugar — ao contrário do peso.', 'The amount of matter in a body, in kilograms. It does not change from place to place — unlike weight.'),
    deeper: L('A massa de um planeta é medida pelo efeito gravitacional sobre luas e sondas (GM). O Sol tem 1,989 × 10³⁰ kg, 333.000 vezes a Terra.', 'A planet\'s mass is measured by its gravitational effect on moons and spacecraft (GM). The Sun has 1.989 × 10³⁰ kg, 333,000 times Earth.'),
    related: ['gravity', 'density'], link: { kind: 'tool', id: 'orbit-lab', label: L('Massa × peso', 'Mass vs weight') }, sourceIds: ['jpl-phys'], synonyms: { pt: ['peso'], en: ['weight'] } },
  { id: 'gravity', title: L('Gravidade', 'Gravity'),
    short: L('A aceleração que um corpo imprime a objetos na sua superfície de referência: g = GM/r². Na Terra, 9,8 m/s².', 'The acceleration a body imparts to objects at its reference surface: g = GM/r². On Earth, 9.8 m/s².'),
    deeper: L('Planetas gigantes não têm superfície sólida; a gravidade é informada no nível de pressão de 1 bar. O valor aqui ignora rotação e achatamento; o peso é W = m·g em newtons.', 'Giant planets have no solid surface; gravity is quoted at the 1-bar pressure level. The value here ignores rotation and flattening; weight is W = m·g in newtons.'),
    related: ['mass', 'kepler'], link: { kind: 'tool', id: 'orbit-lab', label: L('Calcular peso', 'Calculate weight') }, sourceIds: ['jpl-phys'], synonyms: { pt: ['gravidade de superficie', 'aceleracao'], en: ['surface gravity', 'acceleration'] } },
  { id: 'density', title: L('Densidade', 'Density'),
    short: L('Massa dividida pelo volume, em g/cm³. Água = 1. A Terra tem 5,51; Saturno, 0,69 — flutuaria na água, se houvesse uma banheira grande o bastante.', 'Mass divided by volume, in g/cm³. Water = 1. Earth is 5.51; Saturn 0.69 — it would float in water, given a big enough tub.'),
    related: ['mass', 'diameter'], link: { kind: 'tool', id: 'compare', label: L('Comparar densidades', 'Compare densities') }, sourceIds: ['jpl-phys'], synonyms: { pt: [], en: [] } },
  { id: 'rotation', title: L('Rotação', 'Rotation'),
    short: L('O giro de um corpo em torno do próprio eixo. Define o dia. Júpiter gira em 9,9 h; Vênus leva 243 dias e gira ao contrário (retrógrado).', 'A body\'s spin about its own axis. It defines the day. Jupiter spins in 9.9 h; Venus takes 243 days and spins backward (retrograde).'),
    related: ['sidereal-day', 'solar-day', 'axial-tilt'], link: { kind: 'body', id: 'venus', label: L('Ver Vênus', 'See Venus') }, sourceIds: ['iau-wg-2015'], synonyms: { pt: ['giro', 'dia'], en: ['spin', 'day'] } },
  { id: 'revolution', title: L('Revolução (órbita)', 'Revolution (orbit)'),
    short: L('O movimento de um corpo em torno de outro. Define o ano: a Terra completa uma revolução em 365,26 dias.', 'The motion of one body around another. It defines the year: Earth completes one revolution in 365.26 days.'),
    related: ['kepler', 'rotation'], link: { kind: 'tool', id: 'orbit-lab', label: L('Laboratório de órbitas', 'Orbit lab') }, sourceIds: ['jpl-approx'], synonyms: { pt: ['orbita', 'ano', 'periodo orbital'], en: ['orbit', 'year', 'orbital period'] } },
  { id: 'sidereal-day', title: L('Dia sideral', 'Sidereal day'),
    short: L('O tempo de uma rotação completa em relação às estrelas distantes. Na Terra: 23 h 56 min 4 s.', 'The time for one full rotation relative to the distant stars. On Earth: 23 h 56 min 4 s.'),
    deeper: L('O campo "Rotação (sideral)" do inspetor usa esta definição, com sinal negativo para rotação retrógrada.', 'The inspector\'s "Rotation (sidereal)" field uses this definition, with a negative sign for retrograde rotation.'),
    related: ['solar-day', 'rotation'], link: { kind: 'body', id: 'earth', label: L('Ver Terra', 'See Earth') }, sourceIds: ['iau-wg-2015'], synonyms: { pt: ['sideral'], en: ['sidereal'] } },
  { id: 'solar-day', title: L('Dia solar', 'Solar day'),
    short: L('O tempo entre dois meios-dias: o Sol voltar à mesma posição no céu. Na Terra são 24 h — 4 minutos a mais que o dia sideral, porque a Terra também avança na órbita.', 'The time between two noons: the Sun returning to the same place in the sky. On Earth it is 24 h — 4 minutes longer than the sidereal day, because Earth also advances along its orbit.'),
    deeper: L('Em Mercúrio a rotação sideral dura 58,6 dias, mas o dia solar dura 176 dias terrestres, por causa da relação 3:2 entre rotação e órbita.', 'On Mercury the sidereal rotation lasts 58.6 days, but the solar day lasts 176 Earth days, because of the 3:2 relation between rotation and orbit.'),
    related: ['sidereal-day'], link: { kind: 'body', id: 'mercury', label: L('Ver Mercúrio', 'See Mercury') }, sourceIds: ['nssdc-factsheets'], synonyms: { pt: ['dia'], en: ['day'] } },
  { id: 'inclination', title: L('Inclinação orbital', 'Orbital inclination'),
    short: L('O ângulo entre o plano da órbita e um plano de referência (a eclíptica para planetas). A maioria fica abaixo de 4°; Plutão tem 17°.', 'The angle between an orbit\'s plane and a reference plane (the ecliptic for planets). Most stay below 4°; Pluto has 17°.'),
    deeper: L('A inclinação da órbita da Lua (5,1°) em relação à eclíptica é o motivo de não haver eclipses todo mês.', 'The Moon\'s orbital inclination (5.1°) to the ecliptic is why eclipses do not happen every month.'),
    related: ['eclipse', 'reference-frame'], link: { kind: 'tool', id: 'moon-lab', label: L('Ver no laboratório da Lua', 'See in the Moon lab') }, sourceIds: ['jpl-approx'], synonyms: { pt: ['inclinacao'], en: [] } },
  { id: 'eccentricity', title: L('Excentricidade', 'Eccentricity'),
    short: L('Quanto uma órbita se afasta de um círculo: 0 é círculo perfeito; perto de 1, muito alongada. Terra 0,017; Mercúrio 0,206; o cometa educativo 0,85.', 'How far an orbit departs from a circle: 0 is a perfect circle; near 1, very elongated. Earth 0.017; Mercury 0.206; the educational comet 0.85.'),
    related: ['perihelion', 'kepler'], link: { kind: 'tool', id: 'orbit-lab', label: L('Experimentar excentricidade', 'Experiment with eccentricity') }, sourceIds: ['jpl-approx'], synonyms: { pt: ['excentrica', 'elipse'], en: ['ellipse', 'eccentric'] } },
  { id: 'axial-tilt', title: L('Inclinação axial (obliquidade)', 'Axial tilt (obliquity)'),
    short: L('O ângulo entre o eixo de rotação e a perpendicular à órbita. Terra 23,4°; Urano 97,8° — quase deitado.', 'The angle between the rotation axis and the perpendicular to the orbit. Earth 23.4°; Uranus 97.8° — nearly lying down.'),
    deeper: L('É a causa das estações. Valores acima de 90° indicam rotação retrógrada em relação à órbita (Vênus, 177°).', 'It is the cause of seasons. Values above 90° indicate retrograde rotation relative to the orbit (Venus, 177°).'),
    related: ['rotation', 'inclination'], link: { kind: 'tool', id: 'seasons-lab', label: L('Laboratório de estações', 'Seasons lab') }, sourceIds: ['jpl-phys', 'nasa-seasons'], synonyms: { pt: ['obliquidade', 'inclinacao do eixo', 'estacoes'], en: ['obliquity', 'tilt', 'seasons'] } },
  { id: 'perihelion', title: L('Periélio', 'Perihelion'),
    short: L('O ponto da órbita mais próximo do Sol. A Terra passa por ele no início de janeiro, a 147,1 milhões de km.', 'The point of an orbit closest to the Sun. Earth passes it in early January, at 147.1 million km.'),
    related: ['aphelion', 'eccentricity'], link: { kind: 'body', id: 'earth', label: L('Ativar marcadores de ápsides', 'Turn on apsis markers') }, sourceIds: ['jpl-approx'], synonyms: { pt: ['perielio', 'apsides'], en: ['apsides', 'periapsis'] } },
  { id: 'aphelion', title: L('Afélio', 'Aphelion'),
    short: L('O ponto da órbita mais distante do Sol. A Terra passa por ele no início de julho, a 152,1 milhões de km.', 'The point of an orbit farthest from the Sun. Earth passes it in early July, at 152.1 million km.'),
    deeper: L('A diferença de 3% na distância muda a insolação em ~7%, mas não é a causa das estações.', 'The 3% distance difference changes insolation by ~7%, but it is not the cause of seasons.'),
    related: ['perihelion', 'eccentricity'], link: { kind: 'body', id: 'earth', label: L('Ativar marcadores de ápsides', 'Turn on apsis markers') }, sourceIds: ['jpl-approx'], synonyms: { pt: ['afelio'], en: ['apoapsis'] } },
  { id: 'tidal-locking', title: L('Travamento de maré', 'Tidal locking'),
    short: L('Quando a rotação de uma lua se sincroniza com sua órbita e a mesma face aponta sempre para o planeta. A Lua, as luas galileanas e Caronte são exemplos.', 'When a moon\'s rotation synchronizes with its orbit so the same face always points at the planet. The Moon, the Galilean moons and Charon are examples.'),
    deeper: L('Neste modelo a orientação de luas sincronizadas é derivada da direção do planeta pai (aproximação simplificada, sem libração física).', 'In this model the orientation of synchronous moons is derived from the parent direction (a simplified approximation, without physical libration).'),
    related: ['rotation'], link: { kind: 'body', id: 'moon', label: L('Ver sobreposição na Lua', 'See the overlay on the Moon') }, sourceIds: ['iau-wg-2015'], synonyms: { pt: ['rotacao sincrona', 'sincronizada'], en: ['synchronous rotation', 'locked'] } },
  { id: 'phase', title: L('Fase', 'Phase'),
    short: L('A fração iluminada de um corpo que vemos, determinada pelo ângulo Sol–corpo–observador. As fases da Lua não são causadas pela sombra da Terra.', 'The lit fraction of a body that we see, set by the Sun–body–observer angle. The Moon\'s phases are not caused by Earth\'s shadow.'),
    related: ['eclipse'], link: { kind: 'tool', id: 'moon-lab', label: L('Laboratório de fases', 'Phases lab') }, sourceIds: ['nasa-eclipses'], synonyms: { pt: ['fases da lua', 'lua cheia', 'lua nova'], en: ['moon phases', 'full moon', 'new moon'] } },
  { id: 'eclipse', title: L('Eclipse', 'Eclipse'),
    short: L('Quando um corpo entra na sombra de outro. Eclipse solar: a Lua entre o Sol e a Terra. Eclipse lunar: a Terra entre o Sol e a Lua. Exige alinhamento preciso perto dos nodos.', 'When one body enters another\'s shadow. Solar eclipse: the Moon between the Sun and Earth. Lunar eclipse: Earth between the Sun and the Moon. It requires precise alignment near the nodes.'),
    deeper: L('A umbra é a sombra total; a penumbra, parcial. Este aplicativo demonstra a geometria; não prevê datas nem mapas de visibilidade.', 'The umbra is the total shadow; the penumbra, partial. This application demonstrates the geometry; it does not predict dates or visibility maps.'),
    related: ['phase', 'inclination'], link: { kind: 'tool', id: 'moon-lab', label: L('Presets de eclipse', 'Eclipse presets') }, sourceIds: ['nasa-eclipses'], synonyms: { pt: ['umbra', 'penumbra'], en: ['umbra', 'penumbra'] } },
  { id: 'barycenter', title: L('Baricentro', 'Barycenter'),
    short: L('O centro de massa comum de dois corpos, em torno do qual ambos orbitam. O baricentro Terra–Lua fica 4.670 km do centro da Terra, ainda dentro dela.', 'The common center of mass of two bodies, around which both orbit. The Earth–Moon barycenter lies 4,670 km from Earth\'s center, still inside it.'),
    deeper: L('Os elementos do JPL descrevem o baricentro Terra–Lua; este modelo desloca a Terra em −1,215% do vetor geocêntrico da Lua para obter o centro da Terra. Plutão e Caronte orbitam um baricentro fora de Plutão.', 'JPL elements describe the Earth–Moon barycenter; this model offsets Earth by −1.215% of the Moon\'s geocentric vector to obtain Earth\'s center. Pluto and Charon orbit a barycenter outside Pluto.'),
    related: ['mass', 'reference-frame'], link: { kind: 'body', id: 'pluto', label: L('Ver Plutão–Caronte', 'See Pluto–Charon') }, sourceIds: ['jpl-approx', 'meeus-1998'], synonyms: { pt: ['centro de massa'], en: ['center of mass', 'barycentre'] } },
  { id: 'reference-frame', title: L('Referencial', 'Reference frame'),
    short: L('O sistema de coordenadas em que descrevemos posições. Este modelo usa a eclíptica J2000 heliocêntrica; o minimapa pode recentrar em um planeta para mostrar movimento aparente.', 'The coordinate system in which positions are described. This model uses the heliocentric J2000 ecliptic; the minimap can recenter on a planet to show apparent motion.'),
    deeper: L('Seguir um corpo com a câmera não muda o referencial das grandezas científicas: distâncias ao Sol continuam heliocêntricas. Uma vista geocêntrica reproduz o movimento retrógrado aparente de Marte por transformação geométrica simples, sem tempo-luz ou aberração.', 'Following a body with the camera does not change the frame of scientific quantities: Sun distances remain heliocentric. A geocentric view reproduces Mars\'s apparent retrograde motion through a simple geometric transformation, without light-time or aberration.'),
    related: ['barycenter'], link: { kind: 'body', id: 'mars', label: L('Ver Marte no minimapa geocêntrico', 'See Mars in the geocentric minimap') }, sourceIds: ['jpl-approx'], synonyms: { pt: ['sistema de coordenadas', 'geocentrico', 'heliocentrico'], en: ['coordinate system', 'geocentric', 'heliocentric'] } },
  { id: 'dwarf-planet', title: L('Planeta anão', 'Dwarf planet'),
    short: L('Corpo que orbita o Sol e tem forma quase esférica, mas não "limpou" a vizinhança da órbita de outros corpos. Plutão, Ceres, Éris, Haumea e Makemake.', 'A body that orbits the Sun and is nearly round, but has not "cleared" its orbital neighborhood of other bodies. Pluto, Ceres, Eris, Haumea and Makemake.'),
    deeper: L('A definição de 2006 da IAU separa planetas (8) de planetas anões pela dominância gravitacional da órbita. Não é um rebaixamento científico: Plutão continua um mundo fascinante, o maior do Cinturão de Kuiper.', 'The 2006 IAU definition separates planets (8) from dwarf planets by gravitational dominance of the orbit. It is not a scientific demotion: Pluto remains a fascinating world, the largest in the Kuiper Belt.'),
    related: ['revolution'], link: { kind: 'body', id: 'pluto', label: L('Ver Plutão', 'See Pluto') }, sourceIds: ['nasa-dwarf-planets'], synonyms: { pt: ['plutao', 'planeta-anao'], en: ['pluto'] } },
  { id: 'kepler', title: L('Leis de Kepler', 'Kepler\'s laws'),
    short: L('1) Órbitas são elipses com o Sol em um foco. 2) A linha Sol–planeta varre áreas iguais em tempos iguais. 3) T² ∝ a³: o quadrado do período é proporcional ao cubo do semieixo maior.', '1) Orbits are ellipses with the Sun at one focus. 2) The Sun–planet line sweeps equal areas in equal times. 3) T² ∝ a³: the square of the period is proportional to the cube of the semi-major axis.'),
    deeper: L('Este modelo resolve a equação de Kepler M = E − e·sen E por Newton–Raphson (máximo 50 iterações, tolerância 10⁻⁹ rad) para cada corpo a cada quadro.', 'This model solves Kepler\'s equation M = E − e·sin E by Newton–Raphson (max 50 iterations, 10⁻⁹ rad tolerance) for every body every frame.'),
    related: ['eccentricity', 'revolution', 'gravity'], link: { kind: 'tool', id: 'orbit-lab', label: L('Ver áreas iguais', 'See equal areas') }, sourceIds: ['jpl-approx'], synonyms: { pt: ['kepler', 'areas iguais'], en: ['equal areas'] } },
  { id: 'about-model', title: L('Sobre este modelo', 'About this model'),
    short: L('Resumo das escolhas de implementação: escala, órbitas, datas dos dados, realces visuais e limites de precisão.', 'Summary of the implementation choices: scale, orbits, data dates, visual enhancements and precision limits.'),
    deeper: L(
      'Escala. Escala de Exploração: raio exibido = 0,00627·√(R km) (Terra = 0,5 unidades; o Sol é reduzido mais 40%); distância heliocêntrica = 19,4·(d UA)^0,7; luas por sistema entre 2,2 e 4 raios do planeta (interpolação logarítmica, fora dos anéis); anéis em razão real ao planeta. Escala Relativa: 1 UA = 20 unidades para tudo.\n\n' +
      'Órbitas. Planetas: elementos keplerianos aproximados do JPL (Tabela 1, válidos 1800–2050; Plutão de Standish 1992), equação de Kepler por Newton–Raphson. A Lua: série truncada de Meeus (precisão de ~10 arcmin); a Terra é deslocada do baricentro Terra–Lua. Outras luas: órbitas keplerianas com geometria real e fase inicial esquemática. Sem perturbações, precessão, nutação, relatividade ou tempo-luz.\n\n' +
      'Orientação. Polos IAU 2015 e meridiano central W(t) onde disponível; luas sincronizadas apontam para o pai.\n\n' +
      'Tempo. 1× = 1 segundo simulado por segundo real; padrão 86.400× (1 dia/s). Dia = 86.400 s; semana = 7 dias; "mês" de demonstração = 30 dias; ano juliano = 365,25 dias. Datas UTC. Aba oculta pausa a progressão sem recuperação.\n\n' +
      'Dados. JPL Physical Parameters, NSSDCA e páginas de luas da NASA (contagens de agosto de 2026). Data de referência em cada entrada.\n\n' +
      'Visual. Texturas procedurais com sementes (nenhuma imagem observacional): reconhecíveis, mas ilustrativas. Anéis de Urano e Netuno realçados. Cinturões e Nuvem de Oort são populações representativas. Estrelas procedurais, sem catálogo direcional. Apresentação Realçada aumenta contraste e atmosfera.\n\n' +
      'Eventos. Eventos históricos têm datas de fonte; eventos "do modelo" são encontrados por busca numérica no modelo aproximado; demonstrações esquemáticas não têm data real. Não há previsão de eclipses.',
      'Scale. Exploration Scale: displayed radius = 0.00627·√(R km) (Earth = 0.5 units; the Sun is reduced a further 40%); heliocentric distance = 19.4·(d au)^0.7; moons per system between 2.2 and 4 planet radii (logarithmic interpolation, outside the rings); rings in true ratio to the planet. Relative Scale: 1 au = 20 units for everything.\n\n' +
      'Orbits. Planets: JPL approximate Keplerian elements (Table 1, valid 1800–2050; Pluto from Standish 1992), Kepler\'s equation by Newton–Raphson. The Moon: truncated Meeus series (~10 arcmin accuracy); Earth is offset from the Earth–Moon barycenter. Other moons: Keplerian orbits with real geometry and schematic initial phase. No perturbations, precession, nutation, relativity or light-time.\n\n' +
      'Orientation. IAU 2015 poles and prime meridian W(t) where available; synchronous moons face their parent.\n\n' +
      'Time. 1× = 1 simulated second per real second; default 86,400× (1 day/s). Day = 86,400 s; week = 7 days; demonstration "month" = 30 days; Julian year = 365.25 days. UTC dates. A hidden tab pauses progression without catch-up.\n\n' +
      'Data. JPL Physical Parameters, NSSDCA and NASA moon pages (counts as of August 2026). Reference date on every entry.\n\n' +
      'Visuals. Seeded procedural textures (no observational imagery): recognizable but illustrative. Uranus and Neptune rings enhanced. Belts and the Oort Cloud are representative populations. Procedural stars, no directional catalog. Enhanced presentation increases contrast and atmosphere.\n\n' +
      'Events. Historical events carry sourced dates; "model" events are found by numerical search in the approximate model; schematic demonstrations have no real date. There is no eclipse prediction.'),
    related: ['kepler', 'reference-frame', 'barycenter'], link: { kind: 'tool', id: 'scale-lab', label: L('Ver escala ativa', 'See the active scale') }, sourceIds: ['jpl-approx', 'jpl-phys', 'meeus-1998', 'iau-wg-2015'], synonyms: { pt: ['modelo', 'precisao', 'limites', 'aproximacao'], en: ['model', 'accuracy', 'limits', 'approximation'] } },
];

export const ARTICLE_MAP: Record<string, Article> = Object.fromEntries(ARTICLES.map((a) => [a.id, a]));
