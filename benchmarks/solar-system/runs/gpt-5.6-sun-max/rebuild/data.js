(function (root) {
  "use strict";

  const sources = {
    "nasa-system": {
      title: "NASA Solar System Facts",
      url: "https://science.nasa.gov/solar-system/solar-system-facts/",
      note: {
        pt: "Contexto do Sistema Solar, categorias e regiões externas.",
        en: "Solar System context, categories, and outer regions."
      }
    },
    "jpl-phys": {
      title: "JPL Planetary Physical Parameters",
      url: "https://ssd.jpl.nasa.gov/planets/phys_par.html",
      note: {
        pt: "Raios médios, massas, densidades, gravidade e períodos siderais.",
        en: "Mean radii, masses, densities, gravity, and sidereal periods."
      }
    },
    "jpl-orbits": {
      title: "JPL Approximate Positions of the Planets",
      url: "https://ssd.jpl.nasa.gov/planets/approx_pos.html",
      note: {
        pt: "Elementos keplerianos J2000 e limites de precisão, válidos de 1800 a 2050.",
        en: "J2000 Keplerian elements and accuracy limits, valid from 1800 to 2050."
      }
    },
    "jpl-satellites": {
      title: "JPL Planetary Satellites",
      url: "https://ssd.jpl.nasa.gov/sats/",
      note: {
        pt: "Relações de satélites, baricentros e rotas para efemérides.",
        en: "Satellite relationships, barycenters, and ephemeris routes."
      }
    },
    "nasa-moons": {
      title: "NASA — Moons of the Solar System",
      url: "https://science.nasa.gov/solar-system/moons/",
      note: {
        pt: "Contexto e identidades das luas; contagens são datadas.",
        en: "Moon context and identities; counts are date-stamped."
      }
    },
    "nasa-comets": {
      title: "NASA Comet Facts",
      url: "https://science.nasa.gov/solar-system/comets/facts/",
      note: {
        pt: "Núcleo, coma e comportamento didático das caudas.",
        en: "Nucleus, coma, and educational tail behavior."
      }
    },
    "nasa-eclipses": {
      title: "NASA — Eclipses and the Moon",
      url: "https://science.nasa.gov/moon/eclipses/?lv=true",
      note: {
        pt: "Geometria de fases, eclipses, umbra, penumbra e inclinação lunar.",
        en: "Phase and eclipse geometry, umbra, penumbra, and lunar inclination."
      }
    },
    "nasa-seasons": {
      title: "NASA — Earth's Spin, Tilt and Orbit",
      url: "https://science.nasa.gov/learn/heat/resource/earths-spin-tilt-and-orbit/",
      note: {
        pt: "Ponto de partida para rotação, inclinação e estações.",
        en: "Starting point for rotation, axial tilt, and seasons."
      }
    },
    "nasa-jupiter-moons": {
      title: "NASA — Moons of Jupiter",
      url: "https://science.nasa.gov/jupiter/jupiter-moons/",
      note: {
        pt: "115 luas reconhecidas em agosto de 2026; quatro são exibidas aqui.",
        en: "115 recognized moons as of August 2026; four are rendered here."
      }
    },
    "nasa-saturn-moons": {
      title: "NASA — Saturn Moons",
      url: "https://science.nasa.gov/saturn/moons/",
      note: {
        pt: "293 luas confirmadas reportadas pela NASA em agosto de 2026; duas são exibidas aqui.",
        en: "293 confirmed moons reported by NASA in August 2026; two are rendered here."
      }
    },
    "nasa-uranus-moons": {
      title: "NASA — Uranus Moons",
      url: "https://science.nasa.gov/uranus/moons/facts/",
      note: {
        pt: "29 luas conhecidas em agosto de 2026; cinco são exibidas aqui.",
        en: "29 known moons as of August 2026; five are rendered here."
      }
    },
    "nasa-neptune-moons": {
      title: "NASA — Neptune Moons",
      url: "https://science.nasa.gov/neptune/moons/",
      note: {
        pt: "16 luas conhecidas; Tritão é exibida aqui.",
        en: "16 known moons; Triton is rendered here."
      }
    }
  };

  const bodies = [
    {
      id: "sun", name: { pt: "Sol", en: "Sun" }, aliases: ["sol", "sun", "estrela", "star"],
      type: "star", category: "star", parent: null, color: "#ffb347", accent: "#ffd684", pattern: "sun",
      radiusKm: 695700, massKg: 1.9885e30, density: 1.408, gravity: 274, rotationDays: 25.38,
      tilt: 7.25, temp: { pt: "5.772 K (fotosfera)", en: "5,772 K (photosphere)" }, knownMoons: null,
      description: {
        pt: "A estrela que concentra mais de 99% da massa do Sistema Solar e ilumina todos os mundos desta cena.",
        en: "The star holding more than 99% of the Solar System's mass and illuminating every world in this scene."
      },
      fact: {
        pt: "A superfície animada é procedural e ilustrativa; não representa atividade solar ao vivo.",
        en: "The animated surface is procedural and illustrative; it is not live solar activity."
      }, sourceIds: ["nasa-system", "jpl-phys"]
    },
    {
      id: "mercury", name: { pt: "Mercúrio", en: "Mercury" }, aliases: ["mercurio", "mercury"],
      type: "rocky", category: "planet", parent: "sun", color: "#a69e91", accent: "#d3cabd", pattern: "craters",
      radiusKm: 2439.4, massKg: 3.30103e23, density: 5.4289, gravity: 3.70, rotationDays: 58.6462,
      periodDays: 87.9691, aAu: .38709927, e: .20563593, inc: 7.00497902, phase: 174, tilt: .034,
      temp: { pt: "100–700 K (superfície)", en: "100–700 K (surface)" }, knownMoons: 0,
      description: { pt: "O menor planeta e o mais próximo do Sol, marcado por uma superfície antiga e muito craterada.", en: "The smallest planet and closest to the Sun, marked by an ancient, heavily cratered surface." },
      fact: { pt: "Um dia solar em Mercúrio dura cerca de dois anos mercurianos.", en: "One solar day on Mercury lasts about two Mercurian years." },
      sourceIds: ["jpl-phys", "jpl-orbits"],
      jpl: { base: [.38709927,.20563593,7.00497902,252.25032350,77.45779628,48.33076593], rate: [.00000037,.00001906,-.00594749,149472.67411175,.16047689,-.12534081] }
    },
    {
      id: "venus", name: { pt: "Vênus", en: "Venus" }, aliases: ["venus", "vênus"],
      type: "rocky", category: "planet", parent: "sun", color: "#d7bd86", accent: "#f3dda9", pattern: "clouds",
      radiusKm: 6051.8, massKg: 4.86731e24, density: 5.243, gravity: 8.87, rotationDays: -243.018,
      periodDays: 224.701, aAu: .72333566, e: .00677672, inc: 3.39467605, phase: 50, tilt: 177.36,
      temp: { pt: "≈737 K (superfície)", en: "≈737 K (surface)" }, knownMoons: 0,
      description: { pt: "Um mundo rochoso envolto por nuvens densas e uma atmosfera de efeito estufa extremo.", en: "A rocky world wrapped in dense clouds and an atmosphere with an extreme greenhouse effect." },
      fact: { pt: "Vênus é o planeta mais quente, embora Mercúrio esteja mais perto do Sol.", en: "Venus is the hottest planet even though Mercury is closer to the Sun." },
      sourceIds: ["nasa-system", "jpl-phys", "jpl-orbits"],
      jpl: { base: [.72333566,.00677672,3.39467605,181.97909950,131.60246718,76.67984255], rate: [.00000390,-.00004107,-.00078890,58517.81538729,.00268329,-.27769418] }
    },
    {
      id: "earth", name: { pt: "Terra", en: "Earth" }, aliases: ["terra", "earth", "mundo", "world"],
      type: "rocky", category: "planet", parent: "sun", color: "#397fbd", accent: "#65c7ee", pattern: "earth",
      radiusKm: 6371.0084, massKg: 5.97217e24, density: 5.5134, gravity: 9.80, rotationDays: .99726968,
      periodDays: 365.25636, aAu: 1.00000261, e: .01671123, inc: -.00001531, phase: 100, tilt: 23.439,
      temp: { pt: "≈288 K (média global)", en: "≈288 K (global mean)" }, knownMoons: 1, renderedMoons: 1,
      description: { pt: "Nosso planeta oceânico, o único mundo onde a vida é conhecida e o ponto de referência de muitas comparações.", en: "Our ocean world, the only known home of life and the reference point for many comparisons." },
      fact: { pt: "A posição representa aproximadamente o baricentro Terra–Lua; a Lua é separada por um modelo local simplificado.", en: "The position approximates the Earth–Moon barycenter; the Moon is separated with a simplified local model." },
      sourceIds: ["nasa-system", "jpl-phys", "jpl-orbits", "jpl-satellites"],
      jpl: { base: [1.00000261,.01671123,-.00001531,100.46457166,102.93768193,0], rate: [.00000562,-.00004392,-.01294668,35999.37244981,.32327364,0] }
    },
    {
      id: "moon", name: { pt: "Lua", en: "Moon" }, aliases: ["lua", "moon", "luna"],
      type: "moon", category: "moon", parent: "earth", color: "#aaa9a4", accent: "#d7d6d1", pattern: "maria",
      radiusKm: 1737.4, massKg: 7.342e22, density: 3.344, gravity: 1.62, rotationDays: 27.321661,
      periodDays: 27.321661, distanceKm: 384400, e: .0549, inc: 5.145, phase: 116, tilt: 6.68,
      temp: { pt: "≈100–390 K (superfície)", en: "≈100–390 K (surface)" }, knownMoons: 0,
      description: { pt: "O satélite natural da Terra, travado por maré e iluminado pelo Sol — não por luz própria.", en: "Earth's natural satellite, tidally locked and lit by the Sun — not by light of its own." },
      fact: { pt: "Fases comuns mostram a porção iluminada vista da Terra; a sombra terrestre só participa de eclipses lunares.", en: "Ordinary phases show the sunlit portion seen from Earth; Earth's shadow is involved only in lunar eclipses." },
      sourceIds: ["jpl-satellites", "nasa-eclipses"]
    },
    {
      id: "mars", name: { pt: "Marte", en: "Mars" }, aliases: ["marte", "mars", "planeta vermelho", "red planet"],
      type: "rocky", category: "planet", parent: "sun", color: "#b85b3c", accent: "#df8a62", pattern: "mars",
      radiusKm: 3389.5, massKg: 6.41691e23, density: 3.934, gravity: 3.71, rotationDays: 1.02595676,
      periodDays: 686.98, aAu: 1.52371034, e: .09339410, inc: 1.84969142, phase: 250, tilt: 25.19,
      temp: { pt: "≈210 K (média)", en: "≈210 K (mean)" }, knownMoons: 2, renderedMoons: 2,
      description: { pt: "Um planeta frio e desértico, com calotas polares, vulcões gigantes e evidências de água antiga.", en: "A cold desert planet with polar caps, giant volcanoes, and evidence of ancient water." },
      fact: { pt: "Seu dia tem duração parecida com o terrestre, mas seu ano dura quase dois anos da Terra.", en: "Its day resembles Earth's in length, while its year lasts almost two Earth years." },
      sourceIds: ["jpl-phys", "jpl-orbits"],
      jpl: { base: [1.52371034,.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891], rate: [.00001847,.00007882,-.00813131,19140.30268499,.44441088,-.29257343] }
    },
    { id: "phobos", name: { pt: "Fobos", en: "Phobos" }, aliases: ["fobos","phobos"], type: "moon", category: "moon", parent: "mars", color: "#81776d", accent: "#aaa094", pattern: "irregular", radiusKm: 11.267, massKg: 1.066e16, density: 1.876, gravity: .0057, rotationDays: .31891, periodDays: .31891, distanceKm: 9376, e: .0151, inc: 1.093, phase: 32, temp: {pt:"≈233 K (média)",en:"≈233 K (mean)"}, description:{pt:"A maior lua de Marte, irregular e tão próxima que cruza o céu marciano rapidamente.",en:"Mars's larger moon, irregular and so close that it crosses the Martian sky quickly."}, fact:{pt:"Seu modelo local é circularizado e educativo, não uma efeméride lunar de precisão.",en:"Its local model is circularized and educational, not a precision lunar ephemeris."}, sourceIds:["jpl-satellites"] },
    { id: "deimos", name: { pt: "Deimos", en: "Deimos" }, aliases: ["deimos"], type: "moon", category: "moon", parent: "mars", color: "#a09484", accent: "#c0b5a5", pattern: "irregular", radiusKm: 6.2, massKg: 1.476e15, density: 1.471, gravity: .003, rotationDays: 1.263, periodDays: 1.263, distanceKm: 23463, e: .0002, inc: .93, phase: 201, temp: {pt:"≈233 K (média)",en:"≈233 K (mean)"}, description:{pt:"A pequena lua externa de Marte, com forma irregular e superfície escura.",en:"Mars's small outer moon, with an irregular shape and dark surface."}, fact:{pt:"Distâncias lunares são relativas ao planeta pai, nunca ao Sol.",en:"Moon distances are parent-relative, never distances from the Sun."}, sourceIds:["jpl-satellites"] },
    {
      id: "jupiter", name: { pt: "Júpiter", en: "Jupiter" }, aliases: ["jupiter", "júpiter", "gigante"],
      type: "gas", category: "planet", parent: "sun", color: "#c79c72", accent: "#e2bd91", pattern: "jupiter",
      radiusKm: 69911, massKg: 1.898125e27, density: 1.3262, gravity: 24.79, rotationDays: .41354,
      periodDays: 4332.59, aAu: 5.202887, e: .04838624, inc: 1.30439695, phase: 15, tilt: 3.13,
      temp: { pt: "≈165 K (nível de referência)", en: "≈165 K (reference level)" }, knownMoons: 115, renderedMoons: 4, moonCountDate: "2026-08",
      description: { pt: "O maior planeta, um gigante gasoso de bandas turbulentas com um vasto sistema de luas.", en: "The largest planet, a banded and turbulent gas giant with a vast moon system." },
      fact: { pt: "A Grande Mancha Vermelha é estilizada; sua longitude aqui não representa observação em tempo real.", en: "The Great Red Spot is stylized; its longitude here is not a real-time observation." },
      sourceIds: ["jpl-phys", "jpl-orbits", "nasa-jupiter-moons"],
      jpl: { base: [5.202887,.04838624,1.30439695,34.39644051,14.72847983,100.47390909], rate: [-.00011607,-.00013253,-.00183714,3034.74612775,.21252668,.20469106] }
    },
    { id: "io", name:{pt:"Io",en:"Io"}, aliases:["io"], type:"moon",category:"moon",parent:"jupiter",color:"#d6bb5a",accent:"#f2dd7d",pattern:"io",radiusKm:1821.6,massKg:8.932e22,density:3.528,gravity:1.796,rotationDays:1.769,periodDays:1.769,distanceKm:421700,e:.0041,inc:.05,phase:20,temp:{pt:"≈130 K (média)",en:"≈130 K (mean)"},description:{pt:"O mundo vulcanicamente mais ativo conhecido, colorido por compostos de enxofre.",en:"The most volcanically active known world, colored by sulfur compounds."},fact:{pt:"As manchas são procedurais e não mapeiam erupções atuais.",en:"The markings are procedural and do not map current eruptions."},sourceIds:["jpl-satellites","nasa-jupiter-moons"] },
    { id: "europa", name:{pt:"Europa",en:"Europa"},aliases:["europa"],type:"moon",category:"moon",parent:"jupiter",color:"#b9aa8a",accent:"#e4d6b6",pattern:"europa",radiusKm:1560.8,massKg:4.8e22,density:3.013,gravity:1.315,rotationDays:3.551,periodDays:3.551,distanceKm:671034,e:.009,inc:.47,phase:102,temp:{pt:"≈102 K (superfície)",en:"≈102 K (surface)"},description:{pt:"Lua gelada sulcada por longas fraturas, com forte evidência de um oceano sob a crosta.",en:"An icy moon crossed by long fractures, with strong evidence for an ocean beneath its crust."},fact:{pt:"O desenho de fraturas é ilustrativo, não um mapa cartográfico.",en:"The fracture pattern is illustrative, not a cartographic map."},sourceIds:["jpl-satellites","nasa-jupiter-moons"] },
    { id: "ganymede", name:{pt:"Ganimedes",en:"Ganymede"},aliases:["ganimedes","ganymede"],type:"moon",category:"moon",parent:"jupiter",color:"#8d8172",accent:"#b8ab9a",pattern:"maria",radiusKm:2634.1,massKg:1.4819e23,density:1.936,gravity:1.428,rotationDays:7.155,periodDays:7.155,distanceKm:1070412,e:.0013,inc:.2,phase:188,temp:{pt:"≈110 K (média)",en:"≈110 K (mean)"},description:{pt:"A maior lua do Sistema Solar — maior em diâmetro que Mercúrio.",en:"The largest moon in the Solar System — larger in diameter than Mercury."},fact:{pt:"É a única lua conhecida com campo magnético próprio substancial.",en:"It is the only moon known to have a substantial intrinsic magnetic field."},sourceIds:["jpl-satellites","nasa-jupiter-moons"] },
    { id: "callisto", name:{pt:"Calisto",en:"Callisto"},aliases:["calisto","callisto"],type:"moon",category:"moon",parent:"jupiter",color:"#5f5a54",accent:"#918980",pattern:"craters",radiusKm:2410.3,massKg:1.0759e23,density:1.834,gravity:1.235,rotationDays:16.689,periodDays:16.689,distanceKm:1882709,e:.0074,inc:.19,phase:277,temp:{pt:"≈134 K (média)",en:"≈134 K (mean)"},description:{pt:"Uma lua antiga e escura, coberta por crateras que registram bilhões de anos de impactos.",en:"An ancient, dark moon covered in craters recording billions of years of impacts."},fact:{pt:"Seu relevo procedural preserva a identidade craterada sem simular cartografia real.",en:"Its procedural relief preserves a cratered identity without simulating real cartography."},sourceIds:["jpl-satellites","nasa-jupiter-moons"] },
    {
      id: "saturn", name: { pt: "Saturno", en: "Saturn" }, aliases: ["saturno", "saturn", "aneis", "rings"],
      type: "gas", category: "planet", parent: "sun", color: "#d3b783", accent: "#ead4a8", pattern: "saturn", rings: true, ringFactor: 2.3,
      radiusKm: 58232, massKg: 5.68317e26, density: .6871, gravity: 10.44, rotationDays: .44401,
      periodDays: 10759.22, aAu: 9.53667594, e: .05386179, inc: 2.48599187, phase: 230, tilt: 26.73,
      temp: { pt: "≈134 K (nível de referência)", en: "≈134 K (reference level)" }, knownMoons: 293, renderedMoons: 2, moonCountDate: "2026-08",
      description: { pt: "Um gigante gasoso de baixa densidade cercado por um sistema complexo de anéis de gelo e rocha.", en: "A low-density gas giant surrounded by a complex system of icy and rocky rings." },
      fact: { pt: "Os anéis usam geometria anular em bandas e permanecem presos ao plano equatorial de Saturno.", en: "The rings use banded annular geometry and remain attached to Saturn's equatorial plane." },
      sourceIds: ["jpl-phys", "jpl-orbits", "nasa-saturn-moons"],
      jpl: { base: [9.53667594,.05386179,2.48599187,49.95424423,92.59887831,113.66242448], rate: [-.00125060,-.00050991,.00193609,1222.49362201,-.41897216,-.28867794] }
    },
    { id:"titan",name:{pt:"Titã",en:"Titan"},aliases:["tita","titã","titan"],type:"moon",category:"moon",parent:"saturn",color:"#c9964e",accent:"#e5b86c",pattern:"haze",radiusKm:2574.73,massKg:1.3452e23,density:1.8798,gravity:1.352,rotationDays:15.945,periodDays:15.945,distanceKm:1221870,e:.0288,inc:.35,phase:74,temp:{pt:"≈94 K (superfície)",en:"≈94 K (surface)"},description:{pt:"Uma grande lua envolta em névoa, com atmosfera densa e lagos de hidrocarbonetos.",en:"A large haze-wrapped moon with a dense atmosphere and hydrocarbon lakes."},fact:{pt:"A camada âmbar representa a atmosfera, não uma visão desobstruída da superfície.",en:"The amber layer represents the atmosphere, not an unobstructed surface view."},sourceIds:["jpl-satellites","nasa-saturn-moons"] },
    { id:"enceladus",name:{pt:"Encélado",en:"Enceladus"},aliases:["encelado","encélado","enceladus"],type:"moon",category:"moon",parent:"saturn",color:"#d8e6ec",accent:"#f1fbff",pattern:"ice",radiusKm:252.1,massKg:1.0802e20,density:1.609,gravity:.113,rotationDays:1.37,periodDays:1.37,distanceKm:237948,e:.0047,inc:.01,phase:148,temp:{pt:"≈75 K (média)",en:"≈75 K (mean)"},description:{pt:"Pequena lua gelada com um oceano global sob a crosta e jatos no polo sul.",en:"A small icy moon with a global subsurface ocean and south-polar jets."},fact:{pt:"Os sulcos claros são uma representação visual simplificada.",en:"The bright grooves are a simplified visual representation."},sourceIds:["jpl-satellites","nasa-saturn-moons"] },
    {
      id:"uranus",name:{pt:"Urano",en:"Uranus"},aliases:["urano","uranus"],type:"ice",category:"planet",parent:"sun",color:"#8bc8cc",accent:"#b8e7e8",pattern:"uranus",rings:true,ringFactor:1.75,radiusKm:25362,massKg:8.68099e25,density:1.270,gravity:8.87,rotationDays:-.71833,periodDays:30688.5,aAu:19.18916464,e:.04725744,inc:.77263783,phase:310,tilt:97.77,temp:{pt:"≈76 K (nível de referência)",en:"≈76 K (reference level)"},knownMoons:29,renderedMoons:5,moonCountDate:"2026-08",description:{pt:"Um gigante de gelo que gira quase deitado, com anéis estreitos e um sistema de luas literárias.",en:"An ice giant rotating almost on its side, with narrow rings and a literary moon system."},fact:{pt:"Sua orientação axial extrema é representada no plano próprio dos anéis.",en:"Its extreme axial orientation is represented in its own ring plane."},sourceIds:["jpl-phys","jpl-orbits","nasa-uranus-moons"],jpl:{base:[19.18916464,.04725744,.77263783,313.23810451,170.95427630,74.01692503],rate:[-.00196176,-.00004397,-.00242939,428.48202785,.40805281,.04240589]}
    },
    { id:"miranda",name:{pt:"Miranda",en:"Miranda"},aliases:["miranda"],type:"moon",category:"moon",parent:"uranus",color:"#aaa7a1",accent:"#d0ccc5",pattern:"ice",radiusKm:235.8,massKg:6.59e19,density:1.214,gravity:.079,rotationDays:1.413,periodDays:1.413,distanceKm:129900,e:.0013,inc:4.34,phase:10,temp:{pt:"≈60 K",en:"≈60 K"},description:{pt:"Uma pequena lua com terrenos dramaticamente variados e grandes cânions.",en:"A small moon with dramatically varied terrain and enormous canyons."},fact:{pt:"A aparência é ilustrativa por falta de cobertura global detalhada neste projeto.",en:"Its appearance is illustrative because this project has no detailed global map."},sourceIds:["jpl-satellites","nasa-uranus-moons"] },
    { id:"ariel",name:{pt:"Ariel",en:"Ariel"},aliases:["ariel"],type:"moon",category:"moon",parent:"uranus",color:"#c1c2bf",accent:"#e2e2df",pattern:"ice",radiusKm:578.9,massKg:1.353e21,density:1.592,gravity:.269,rotationDays:2.52,periodDays:2.52,distanceKm:190900,e:.0012,inc:.04,phase:72,temp:{pt:"≈60 K",en:"≈60 K"},description:{pt:"Lua clara de Urano, marcada por vales e sinais de atividade geológica passada.",en:"A bright Uranian moon marked by valleys and signs of past geologic activity."},fact:{pt:"O brilho foi realçado para descoberta na cena local.",en:"Brightness is enhanced for discoverability in the local scene."},sourceIds:["jpl-satellites","nasa-uranus-moons"] },
    { id:"umbriel",name:{pt:"Umbriel",en:"Umbriel"},aliases:["umbriel"],type:"moon",category:"moon",parent:"uranus",color:"#656665",accent:"#929492",pattern:"craters",radiusKm:584.7,massKg:1.172e21,density:1.39,gravity:.234,rotationDays:4.144,periodDays:4.144,distanceKm:266000,e:.0039,inc:.13,phase:135,temp:{pt:"≈75 K",en:"≈75 K"},description:{pt:"A mais escura das grandes luas de Urano, com uma superfície antiga e craterada.",en:"The darkest of Uranus's major moons, with an ancient cratered surface."},fact:{pt:"O contraste é elevado no modo Aprimorado para manter a lua visível.",en:"Contrast is raised in Enhanced mode to keep the moon visible."},sourceIds:["jpl-satellites","nasa-uranus-moons"] },
    { id:"titania",name:{pt:"Titânia",en:"Titania"},aliases:["titania","titânia"],type:"moon",category:"moon",parent:"uranus",color:"#97958f",accent:"#c4c0b8",pattern:"ice",radiusKm:788.9,massKg:3.527e21,density:1.711,gravity:.367,rotationDays:8.706,periodDays:8.706,distanceKm:436300,e:.0011,inc:.08,phase:214,temp:{pt:"≈70 K",en:"≈70 K"},description:{pt:"A maior lua de Urano, com grandes falhas e cânions em uma superfície de gelo e rocha.",en:"Uranus's largest moon, with large faults and canyons across an ice-rock surface."},fact:{pt:"A orientação de maré é simplificada e não inclui libração.",en:"Tidal orientation is simplified and omits libration."},sourceIds:["jpl-satellites","nasa-uranus-moons"] },
    { id:"oberon",name:{pt:"Oberon",en:"Oberon"},aliases:["oberon"],type:"moon",category:"moon",parent:"uranus",color:"#736c67",accent:"#a39a91",pattern:"craters",radiusKm:761.4,massKg:3.014e21,density:1.63,gravity:.346,rotationDays:13.463,periodDays:13.463,distanceKm:583500,e:.0014,inc:.07,phase:300,temp:{pt:"≈70 K",en:"≈70 K"},description:{pt:"A lua principal mais externa de Urano, escura e marcada por impactos.",en:"The outermost major Uranian moon, dark and impact-scarred."},fact:{pt:"A população de crateras é procedural e representativa.",en:"The crater population is procedural and representative."},sourceIds:["jpl-satellites","nasa-uranus-moons"] },
    {
      id:"neptune",name:{pt:"Netuno",en:"Neptune"},aliases:["netuno","neptune"],type:"ice",category:"planet",parent:"sun",color:"#3d69b2",accent:"#6f9fe5",pattern:"neptune",radiusKm:24622,massKg:1.024092e26,density:1.638,gravity:11.15,rotationDays:.67125,periodDays:60182,aAu:30.06992276,e:.00859048,inc:1.77004347,phase:70,tilt:28.32,temp:{pt:"≈72 K (nível de referência)",en:"≈72 K (reference level)"},knownMoons:16,renderedMoons:1,moonCountDate:"2026-09",description:{pt:"O gigante de gelo mais distante, azulado por absorção atmosférica e agitado por ventos intensos.",en:"The most distant ice giant, blue from atmospheric absorption and stirred by powerful winds."},fact:{pt:"A cor é uma interpretação natural contida; estrutura de nuvens é ilustrativa.",en:"The color is a restrained natural interpretation; cloud structure is illustrative."},sourceIds:["jpl-phys","jpl-orbits","nasa-neptune-moons"],jpl:{base:[30.06992276,.00859048,1.77004347,-55.12002969,44.96476227,131.78422574],rate:[.00026291,.00005105,.00035372,218.45945325,-.32241464,-.00508664]}
    },
    { id:"triton",name:{pt:"Tritão",en:"Triton"},aliases:["tritao","tritão","triton"],type:"moon",category:"moon",parent:"neptune",color:"#c5a79d",accent:"#ead0c7",pattern:"triton",radiusKm:1353.4,massKg:2.14e22,density:2.061,gravity:.779,rotationDays:-5.877,periodDays:-5.877,distanceKm:354759,e:.000016,inc:156.865,phase:44,temp:{pt:"≈38 K",en:"≈38 K"},description:{pt:"A grande lua retrógrada de Netuno, provavelmente capturada do cinturão de Kuiper.",en:"Neptune's large retrograde moon, likely captured from the Kuiper Belt."},fact:{pt:"O período negativo indica movimento orbital retrógrado no nosso modelo local.",en:"The negative period denotes retrograde orbital motion in our local model."},sourceIds:["jpl-satellites","nasa-neptune-moons"] },
    {
      id:"pluto",name:{pt:"Plutão",en:"Pluto"},aliases:["plutao","plutão","pluto"],type:"dwarf",category:"dwarf",parent:"sun",color:"#ae907c",accent:"#d8bba6",pattern:"pluto",radiusKm:1188.3,massKg:1.30246e22,density:1.853,gravity:.62,rotationDays:-6.3872,periodDays:90560,aAu:39.482,e:.2488,inc:17.16,phase:14,tilt:122.53,temp:{pt:"≈44 K (média)",en:"≈44 K (mean)"},knownMoons:5,renderedMoons:1,description:{pt:"Um planeta anão gelado do cinturão de Kuiper, acompanhado de perto pela grande lua Caronte.",en:"An icy dwarf planet in the Kuiper Belt, closely partnered by its large moon Charon."},fact:{pt:"Sua órbita é simplificada fora da tabela planetária JPL usada pelos oito planetas.",en:"Its orbit is simplified outside the JPL planetary table used for the eight planets."},sourceIds:["jpl-phys","nasa-system","jpl-satellites"]
    },
    { id:"charon",name:{pt:"Caronte",en:"Charon"},aliases:["caronte","charon"],type:"moon",category:"moon",parent:"pluto",color:"#8b8984",accent:"#b8b5ae",pattern:"maria",radiusKm:606,massKg:1.586e21,density:1.702,gravity:.288,rotationDays:6.387,periodDays:6.387,distanceKm:19596,e:.0002,inc:.08,phase:155,temp:{pt:"≈53 K",en:"≈53 K"},description:{pt:"Uma lua excepcionalmente grande em relação a Plutão; ambos orbitam um baricentro externo a Plutão.",en:"An exceptionally large moon relative to Pluto; both orbit a barycenter outside Pluto."},fact:{pt:"A cena enfatiza a relação do par, mas mantém Plutão como centro local simplificado.",en:"The scene emphasizes the pair relationship but keeps Pluto as a simplified local center."},sourceIds:["jpl-satellites","jpl-phys"] },
    { id:"ceres",name:{pt:"Ceres",en:"Ceres"},aliases:["ceres"],type:"dwarf",category:"dwarf",parent:"sun",color:"#777874",accent:"#aaa9a3",pattern:"craters",radiusKm:469.7,massKg:9.38416e20,density:2.162,gravity:.27,rotationDays:.37809,periodDays:1681.63,aAu:2.7675,e:.0758,inc:10.59,phase:92,tilt:4,temp:{pt:"≈167 K (média)",en:"≈167 K (mean)"},description:{pt:"O maior objeto do cinturão principal de asteroides e o único planeta anão do Sistema Solar interior.",en:"The largest object in the main asteroid belt and the only dwarf planet in the inner Solar System."},fact:{pt:"Pontos brilhantes são sugeridos de forma ilustrativa, não cartográfica.",en:"Bright spots are suggested illustratively, not cartographically."},sourceIds:["jpl-phys","nasa-system"] },
    { id:"eris",name:{pt:"Éris",en:"Eris"},aliases:["eris","éris"],type:"dwarf",category:"dwarf",parent:"sun",color:"#d5d7d5",accent:"#f1f3ef",pattern:"ice",radiusKm:1200,massKg:1.66e22,density:2.3,gravity:.77,rotationDays:1.079,periodDays:203830,aAu:67.67,e:.44,inc:44.04,phase:181,tilt:null,temp:{pt:"≈30 K",en:"≈30 K"},description:{pt:"Um planeta anão muito distante e brilhante, em uma órbita bastante inclinada e excêntrica.",en:"A very distant and bright dwarf planet on a highly inclined, eccentric orbit."},fact:{pt:"A aparência é uma reconstrução procedural explicitamente ilustrativa.",en:"Its appearance is an explicitly illustrative procedural reconstruction."},sourceIds:["jpl-phys","nasa-system"] },
    { id:"haumea",name:{pt:"Haumea",en:"Haumea"},aliases:["haumea"],type:"dwarf",category:"dwarf",parent:"sun",color:"#c8cbc8",accent:"#eff2ef",pattern:"ice",shape:"ellipsoid",radiusKm:715,massKg:4.006e21,density:2.6,gravity:.35,rotationDays:.1631,periodDays:103774,aAu:43.13,e:.195,inc:28.19,phase:288,tilt:null,temp:{pt:"≈50 K",en:"≈50 K"},description:{pt:"Um planeta anão muito alongado pela rotação rápida, acompanhado por um anel.",en:"A dwarf planet strongly elongated by rapid rotation and accompanied by a ring."},fact:{pt:"A silhueta alongada comunica a forma geral; não é um modelo topográfico.",en:"The elongated silhouette conveys the general shape; it is not a topographic model."},sourceIds:["jpl-phys","nasa-system"] },
    { id:"makemake",name:{pt:"Makemake",en:"Makemake"},aliases:["makemake"],type:"dwarf",category:"dwarf",parent:"sun",color:"#b89a86",accent:"#dcc0ac",pattern:"ice",radiusKm:714,massKg:3.1e21,density:2.1,gravity:.40,rotationDays:.937,periodDays:112897,aAu:45.79,e:.159,inc:28.98,phase:340,tilt:null,temp:{pt:"≈40 K",en:"≈40 K"},description:{pt:"Um planeta anão avermelhado do cinturão de Kuiper, com superfície rica em gelos voláteis.",en:"A reddish Kuiper Belt dwarf planet with a surface rich in volatile ices."},fact:{pt:"Detalhes de superfície são ilustrativos porque a cobertura observacional é limitada.",en:"Surface detail is illustrative because observational coverage is limited."},sourceIds:["jpl-phys","nasa-system"] },
    { id:"vesta",name:{pt:"Vesta",en:"Vesta"},aliases:["vesta","asteroide","asteroid"],type:"asteroid",category:"small",parent:"sun",color:"#887d70",accent:"#b1a393",pattern:"irregular",shape:"irregular",radiusKm:262.7,massKg:2.59076e20,density:3.456,gravity:.25,rotationDays:.2226,periodDays:1325.9,aAu:2.361,e:.089,inc:7.14,phase:205,tilt:27.5,temp:{pt:"≈145–250 K",en:"≈145–250 K"},description:{pt:"Um grande asteroide diferenciado do cinturão principal, explorado pela missão Dawn.",en:"A large differentiated main-belt asteroid explored by the Dawn mission."},fact:{pt:"A silhueta irregular é própria de Vesta e não é reutilizada como todos os asteroides do cinturão.",en:"The irregular silhouette belongs to Vesta and is not reused as every belt asteroid."},sourceIds:["nasa-system"] },
    { id:"comet-edu",name:{pt:"Cometa didático",en:"Educational Comet"},aliases:["cometa","comet","didatico","educational"],type:"comet",category:"small",parent:"sun",color:"#bddcd8",accent:"#dbfffb",pattern:"comet",shape:"irregular",radiusKm:4,massKg:null,density:null,gravity:null,rotationDays:null,periodDays:7497,aAu:7.5,e:.82,inc:22,phase:15,tilt:null,temp:{pt:"Varia com a distância solar",en:"Varies with solar distance"},description:{pt:"Um cometa hipotético para observar como coma e caudas respondem qualitativamente à distância do Sol.",en:"A hypothetical comet for observing how coma and tails qualitatively respond to solar distance."},fact:{pt:"A cauda iônica aponta para longe do Sol; a cauda de poeira curva. A intensidade não prevê brilho aparente.",en:"The ion tail points away from the Sun while the dust tail curves. Intensity does not predict apparent brightness."},sourceIds:["nasa-comets"] }
  ];

  const structures = [
    { id:"asteroid-belt", name:{pt:"Cinturão de asteroides",en:"Asteroid Belt"}, type:"region", category:"structure", range:[2.1,3.3], description:{pt:"População representativa entre Marte e Júpiter; não é uma parede sólida.",en:"A representative population between Mars and Jupiter; it is not a solid wall."}, sourceIds:["nasa-system"] },
    { id:"kuiper-belt", name:{pt:"Cinturão de Kuiper",en:"Kuiper Belt"}, type:"region", category:"structure", range:[30,50], description:{pt:"Região de corpos gelados além de Netuno, mostrada de forma esquemática.",en:"A region of icy bodies beyond Neptune, shown schematically."}, sourceIds:["nasa-system"] },
    { id:"oort-cloud", name:{pt:"Nuvem de Oort",en:"Oort Cloud"}, type:"region", category:"structure", range:[5000,100000], description:{pt:"Região conceitual inferida por modelos e cometas; nunca observada diretamente como uma nuvem.",en:"A conceptual region inferred from models and comets; never directly observed as a cloud."}, sourceIds:["nasa-system"] }
  ];

  const typeLabels = {
    star:{pt:"Estrela",en:"Star"}, rocky:{pt:"Planeta rochoso",en:"Rocky planet"}, gas:{pt:"Gigante gasoso",en:"Gas giant"},
    ice:{pt:"Gigante de gelo",en:"Ice giant"}, moon:{pt:"Lua",en:"Moon"}, dwarf:{pt:"Planeta anão",en:"Dwarf planet"},
    asteroid:{pt:"Asteroide",en:"Asteroid"}, comet:{pt:"Cometa hipotético",en:"Hypothetical comet"}, region:{pt:"Região esquemática",en:"Schematic region"}
  };

  const tours = [
    { id:"grand", title:{pt:"Grande Tour",en:"Grand Tour"}, duration:{pt:"12 min",en:"12 min"}, description:{pt:"Do Sol a Netuno, uma leitura panorâmica da arquitetura do sistema.",en:"From the Sun to Neptune, a panoramic reading of the system's architecture."}, stops:[
      ["sun",{pt:"Nossa estrela",en:"Our star"},{pt:"Toda órbita desta experiência começa na massa dominante e na luz do Sol.",en:"Every orbit in this experience begins with the Sun's dominant mass and light."}],
      ["mercury",{pt:"Mundo extremo",en:"Extreme world"},{pt:"Mercúrio percorre a órbita planetária mais curta e mais excêntrica entre os oito planetas.",en:"Mercury follows the shortest and most eccentric planetary orbit among the eight planets."}],
      ["venus",{pt:"Calor sob as nuvens",en:"Heat under clouds"},{pt:"A proximidade não explica tudo: a atmosfera torna Vênus mais quente que Mercúrio.",en:"Proximity is not everything: the atmosphere makes Venus hotter than Mercury."}],
      ["earth",{pt:"Oceano e companhia",en:"Ocean and companion"},{pt:"Terra e Lua formam o sistema local mais familiar — e um bom laboratório de fases.",en:"Earth and Moon form our most familiar local system — and a natural phase laboratory."}],
      ["mars",{pt:"Um deserto em movimento",en:"A moving desert"},{pt:"Marte tem estações, calotas polares e duas pequenas luas irregulares.",en:"Mars has seasons, polar caps, and two small irregular moons."}],
      ["jupiter",{pt:"Um sistema em miniatura",en:"A miniature system"},{pt:"As quatro luas galileanas revelam mundos de vulcões, gelo, oceanos e crateras.",en:"The four Galilean moons reveal worlds of volcanoes, ice, oceans, and craters."}],
      ["saturn",{pt:"Arquitetura dos anéis",en:"Architecture of rings"},{pt:"Milhares de faixas de partículas formam um disco amplo e extraordinariamente fino.",en:"Thousands of particle bands form a broad, extraordinarily thin disk."}],
      ["uranus",{pt:"Um planeta de lado",en:"A planet on its side"},{pt:"A inclinação de Urano transforma a orientação de seus anéis e estações.",en:"Uranus's tilt transforms the orientation of its rings and seasons."}],
      ["neptune",{pt:"Fronteira planetária",en:"Planetary frontier"},{pt:"Netuno conclui a família dos oito planetas, mas o Sistema Solar continua muito além.",en:"Neptune completes the family of eight planets, but the Solar System continues far beyond."}]
    ] },
    { id:"earth-moon", title:{pt:"Terra e Lua",en:"Earth and Moon"}, duration:{pt:"6 min",en:"6 min"}, description:{pt:"Fases, marés gravitacionais e uma parceria em torno do Sol.",en:"Phases, tidal locking, and a partnership around the Sun."}, stops:[
      ["earth",{pt:"Um planeta e seu satélite",en:"A planet and its satellite"},{pt:"A Lua acompanha a Terra sem herdar a rotação diária de sua superfície.",en:"The Moon accompanies Earth without inheriting its surface's daily rotation."}],
      ["moon",{pt:"Sempre a mesma face?",en:"Always the same face?"},{pt:"O travamento de maré sincroniza rotação e revolução; nosso modelo omite a libração física.",en:"Tidal locking synchronizes spin and revolution; our model omits physical libration."}],
      ["earth",{pt:"Luz, fase e sombra",en:"Light, phase, and shadow"},{pt:"Fases dependem do ângulo da porção iluminada; eclipses exigem alinhamento especial.",en:"Phases depend on the angle of the lit portion; eclipses require special alignment."}]
    ] },
    { id:"giants", title:{pt:"Gigantes e suas luas",en:"Giants and Their Moons"}, duration:{pt:"9 min",en:"9 min"}, description:{pt:"Atmosferas, anéis e quatro sistemas locais muito diferentes.",en:"Atmospheres, rings, and four very different local systems."}, stops:[
      ["jupiter",{pt:"Bandas e tempestades",en:"Bands and storms"},{pt:"A rotação rápida organiza nuvens em faixas; detalhes aqui são ilustrativos.",en:"Fast rotation organizes clouds into bands; details here are illustrative."}],
      ["europa",{pt:"Gelo sobre oceano",en:"Ice over ocean"},{pt:"Europa conecta geologia de gelo à busca por ambientes habitáveis.",en:"Europa connects ice geology with the search for habitable environments."}],
      ["saturn",{pt:"Anéis em perspectiva",en:"Rings in perspective"},{pt:"Veja o disco acima do plano para perceber bandas, lacunas e transparência.",en:"View the disk above its plane to see bands, gaps, and transparency."}],
      ["titan",{pt:"Uma lua com atmosfera",en:"A moon with an atmosphere"},{pt:"Titã combina névoa densa, química orgânica e lagos superficiais.",en:"Titan combines dense haze, organic chemistry, and surface lakes."}],
      ["uranus",{pt:"Geometria inclinada",en:"Tilted geometry"},{pt:"Os anéis e as luas compartilham o plano equatorial inclinado do planeta.",en:"The rings and moons share the planet's tilted equatorial plane."}],
      ["triton",{pt:"Órbita ao contrário",en:"Orbiting backward"},{pt:"Tritão percorre uma órbita retrógrada, pista de uma provável captura.",en:"Triton follows a retrograde orbit, a clue to likely capture."}]
    ] },
    { id:"scale", title:{pt:"Entendendo a escala",en:"Understanding Scale"}, duration:{pt:"7 min",en:"7 min"}, description:{pt:"Por que mundos precisam de exagero visual e o espaço real parece vazio.",en:"Why worlds need visual exaggeration and real space appears empty."}, stops:[
      ["earth",{pt:"Comece com um diâmetro",en:"Start with a diameter"},{pt:"Usaremos a Terra como referência para separar tamanho de distância.",en:"We will use Earth as the reference to separate size from distance."}],
      ["jupiter",{pt:"Onze Terras de largura",en:"Eleven Earths wide"},{pt:"Uma escala linear de diâmetro preserva essa proporção sem transformar área em diâmetro.",en:"A linear diameter scale preserves this ratio without confusing area with diameter."}],
      ["neptune",{pt:"O vazio domina",en:"Emptiness dominates"},{pt:"Quando tamanhos e distâncias compartilham a mesma escala, planetas quase desaparecem.",en:"When sizes and distances share one scale, planets nearly disappear."}]
    ] },
    { id:"light", title:{pt:"Luz pelo Sistema Solar",en:"Light Across the Solar System"}, duration:{pt:"5 min",en:"5 min"}, description:{pt:"Meça quanto uma mensagem luminosa leva para cruzar o espaço.",en:"Measure how long a light message takes to cross space."}, stops:[
      ["sun",{pt:"Partida",en:"Departure"},{pt:"No vácuo, a luz viaja a 299.792,458 km/s — ainda assim o sistema é enorme.",en:"In vacuum, light travels at 299,792.458 km/s — yet the system is enormous."}],
      ["earth",{pt:"Oito minutos",en:"Eight minutes"},{pt:"A uma unidade astronômica média, a luz solar leva cerca de 8 min 19 s.",en:"At one average astronomical unit, sunlight takes about 8 min 19 s."}],
      ["saturn",{pt:"Mais de uma hora",en:"More than an hour"},{pt:"A distância instantânea varia; a régua calcula o estado atual do modelo.",en:"Instantaneous distance varies; the ruler calculates the model's current state."}],
      ["neptune",{pt:"Horas de atraso",en:"Hours of delay"},{pt:"Conversas com sondas do sistema externo exigem paciência e autonomia.",en:"Conversations with outer-system probes demand patience and autonomy."}]
    ] }
  ];

  const activities = [
    {id:"order",theme:"orbits",title:{pt:"Ordem planetária",en:"Planetary order"},objective:{pt:"Selecione os quatro planetas interiores em ordem a partir do Sol.",en:"Select the four inner planets in order from the Sun."},kind:"sequence",answer:["mercury","venus","earth","mars"]},
    {id:"larger",theme:"scale",title:{pt:"Quem é maior?",en:"Which is larger?"},objective:{pt:"Compare Terra e Marte e escolha o maior diâmetro.",en:"Compare Earth and Mars and choose the larger diameter."},kind:"choice",options:["earth","mars"],answer:"earth"},
    {id:"day-year",theme:"time",title:{pt:"Dia contra ano",en:"Day versus year"},objective:{pt:"Encontre o planeta cujo giro sideral demora mais que seu ano.",en:"Find the planet whose sidereal spin takes longer than its year."},kind:"choice",options:["venus","earth","jupiter"],answer:"venus"},
    {id:"phase",theme:"moon",title:{pt:"De onde vem a fase?",en:"What creates a phase?"},objective:{pt:"Identifique a explicação correta para as fases comuns da Lua.",en:"Identify the correct explanation for ordinary Moon phases."},kind:"text-choice",options:[{pt:"Sombra da Terra todo mês",en:"Earth's shadow every month"},{pt:"Porção iluminada vista da Terra",en:"The sunlit portion seen from Earth"},{pt:"Luz própria da Lua",en:"The Moon's own light"}],answer:1},
    {id:"speed",theme:"orbits",title:{pt:"Órbita mais rápida",en:"Fastest orbit"},objective:{pt:"Entre Terra, Marte e Júpiter, selecione o menor período orbital.",en:"Among Earth, Mars, and Jupiter, select the shortest orbital period."},kind:"choice",options:["earth","mars","jupiter"],answer:"earth"},
    {id:"seasons",theme:"tilt",title:{pt:"Sem inclinação",en:"Zero tilt"},objective:{pt:"No laboratório, ajuste a inclinação para 0° e observe a variação sazonal.",en:"In the lab, set axial tilt to 0° and observe seasonal variation."},kind:"lab",tool:"seasons",check:"tilt-zero"},
    {id:"rings",theme:"rings",title:{pt:"Plano dos anéis",en:"Ring plane"},objective:{pt:"Foque Saturno e use uma vista baixa para perceber a espessura do disco.",en:"Focus Saturn and use a low view to perceive the disk's thinness."},kind:"scene",check:"saturn-cinematic"},
    {id:"parent",theme:"moons",title:{pt:"Encontre o planeta pai",en:"Find the parent planet"},objective:{pt:"Selecione Europa e depois o planeta que ela orbita.",en:"Select Europa and then the planet it orbits."},kind:"sequence",answer:["europa","jupiter"]},
    {id:"gravity",theme:"gravity",title:{pt:"Massa não é peso",en:"Mass is not weight"},objective:{pt:"No laboratório orbital, calcule o peso de 10 kg sob a gravidade terrestre.",en:"In the orbit lab, calculate the weight of 10 kg under Earth gravity."},kind:"lab",tool:"orbit",check:"earth-weight"},
    {id:"light",theme:"measurement",title:{pt:"Luz mais demorada",en:"Longest light time"},objective:{pt:"Entre Sol–Terra e Sol–Netuno, identifique a viagem luminosa mais longa.",en:"Between Sun–Earth and Sun–Neptune, identify the longer light journey."},kind:"choice",options:["earth","neptune"],answer:"neptune"},
    {id:"emptiness",theme:"scale",title:{pt:"O espaço entre mundos",en:"Space between worlds"},objective:{pt:"Abra a Escala real combinada e encontre por que os planetas somem.",en:"Open Combined True Scale and discover why planets vanish."},kind:"lab",tool:"scale",check:"combined-scale"},
    {id:"uncertainty",theme:"model",title:{pt:"Precisão com limites",en:"Accuracy has limits"},objective:{pt:"Escolha o que este observatório usa para os oito planetas.",en:"Choose what this observatory uses for the eight planets."},kind:"text-choice",options:[{pt:"Telemetria ao vivo",en:"Live telemetry"},{pt:"Efeméride N-corpos exata",en:"Exact N-body ephemeris"},{pt:"Elementos keplerianos aproximados JPL",en:"Approximate JPL Keplerian elements"}],answer:2}
  ];

  const glossary = [
    ["about-model",{pt:"Sobre este modelo",en:"About this model"},{pt:"As posições dos oito planetas usam elementos médios aproximados do JPL para 1800–2050. Luas e corpos menores usam órbitas keplerianas didáticas; tamanhos e distâncias visuais podem ser comprimidos ou exagerados, enquanto medições leem coordenadas físicas separadas.",en:"Positions of the eight planets use JPL approximate mean elements for 1800–2050. Moons and small bodies use educational Keplerian orbits; visual sizes and distances may be compressed or exaggerated while measurements read separate physical coordinates."},"orbit"],
    ["au",{pt:"Unidade astronômica",en:"Astronomical unit"},{pt:"Unidade de comprimento igual a 149.597.870,7 km, aproximadamente a distância média Terra–Sol.",en:"A length unit equal to 149,597,870.7 km, approximately the mean Earth–Sun distance."},"scale"],
    ["light-time",{pt:"Tempo-luz",en:"Light-time"},{pt:"Tempo que a luz leva para atravessar uma distância no vácuo; não é uma distância visual comprimida.",en:"The time light takes to cross a distance in vacuum; it is not a compressed visual distance."},"measurement"],
    ["diameter",{pt:"Diâmetro",en:"Diameter"},{pt:"Distância de uma borda à outra passando pelo centro. Este catálogo prefere o diâmetro médio quando disponível.",en:"The distance across a body through its center. This catalog prefers mean diameter when available."},"comparison"],
    ["mass",{pt:"Massa",en:"Mass"},{pt:"Quantidade de matéria; não muda quando o objeto vai para outro mundo. Peso depende da gravidade local.",en:"Amount of matter; it does not change on another world. Weight depends on local gravity."},"orbit"],
    ["gravity",{pt:"Gravidade",en:"Gravity"},{pt:"Aceleração usada aqui em um nível de referência indicado. Gigantes não possuem uma superfície sólida equivalente à terrestre.",en:"Acceleration used here at a stated reference level. Giants do not have an Earth-like solid surface."},"orbit"],
    ["density",{pt:"Densidade",en:"Density"},{pt:"Massa dividida pelo volume. Ajuda a comparar mundos rochosos, gelados e gasosos.",en:"Mass divided by volume. It helps compare rocky, icy, and gaseous worlds."},"comparison"],
    ["rotation",{pt:"Rotação",en:"Rotation"},{pt:"Giro de um corpo em torno do próprio eixo. O período sideral é medido em relação às estrelas.",en:"A body's spin around its own axis. A sidereal period is measured against the stars."},"time"],
    ["revolution",{pt:"Revolução",en:"Revolution"},{pt:"Uma volta orbital completa em torno do corpo pai, medida aqui pelo modelo sideral.",en:"One complete orbit around the parent body, measured here by the sidereal model."},"time"],
    ["sidereal-day",{pt:"Dia sideral",en:"Sidereal day"},{pt:"Tempo de uma rotação comparada ao fundo estelar; pode diferir do intervalo entre dois meios-dias solares.",en:"Time for one rotation against the stars; it may differ from the interval between two solar noons."},"time"],
    ["solar-day",{pt:"Dia solar",en:"Solar day"},{pt:"Intervalo entre duas passagens sucessivas do Sol pelo mesmo meridiano local.",en:"Interval between successive passages of the Sun across the same local meridian."},"time"],
    ["inclination",{pt:"Inclinação orbital",en:"Orbital inclination"},{pt:"Ângulo entre um plano orbital e o plano de referência escolhido.",en:"Angle between an orbital plane and the chosen reference plane."},"orbit"],
    ["eccentricity",{pt:"Excentricidade",en:"Eccentricity"},{pt:"Mede quanto uma órbita elíptica se afasta de um círculo; 0 é circular no modelo ideal.",en:"Measures how far an elliptical orbit departs from a circle; 0 is circular in the ideal model."},"orbit"],
    ["tilt",{pt:"Inclinação axial",en:"Axial tilt"},{pt:"Ângulo do eixo de rotação em relação à normal do plano orbital; influencia estações.",en:"Angle of the spin axis relative to the orbital-plane normal; it influences seasons."},"seasons"],
    ["perihelion",{pt:"Periélio",en:"Perihelion"},{pt:"Ponto da órbita heliocêntrica mais próximo do Sol.",en:"The point in a heliocentric orbit closest to the Sun."},"orbit"],
    ["aphelion",{pt:"Afélio",en:"Aphelion"},{pt:"Ponto da órbita heliocêntrica mais distante do Sol.",en:"The point in a heliocentric orbit farthest from the Sun."},"orbit"],
    ["tidal-lock",{pt:"Travamento de maré",en:"Tidal locking"},{pt:"Estado em que rotação e revolução ficam sincronizadas, mantendo aproximadamente a mesma face voltada ao corpo pai.",en:"A state where spin and revolution synchronize, keeping roughly the same face toward the parent."},"moon"],
    ["phase",{pt:"Fase",en:"Phase"},{pt:"Forma aparente da porção iluminada de um corpo observada de um ponto de vista.",en:"The apparent shape of a body's lit portion from a viewpoint."},"moon"],
    ["eclipse",{pt:"Eclipse",en:"Eclipse"},{pt:"Ocultação ou passagem pela sombra que exige alinhamento geométrico; não é a causa das fases comuns.",en:"An occultation or shadow passage requiring geometric alignment; it does not cause ordinary phases."},"moon"],
    ["barycenter",{pt:"Baricentro",en:"Barycenter"},{pt:"Centro de massa comum em torno do qual corpos de um sistema orbitam.",en:"The shared center of mass around which bodies in a system orbit."},"orbit"],
    ["reference-frame",{pt:"Referencial",en:"Reference frame"},{pt:"Sistema de coordenadas usado para descrever posições e movimento; mudar o referencial não muda a configuração física.",en:"Coordinate system used to describe positions and motion; changing it does not change the physical configuration."},"orbit"]
  ].map(([id,title,short,tool])=>({id,title,short,tool}));

  const missions = [
    {id:"apollo11",name:"Apollo 11",target:"moon",agency:"NASA",launch:"1969-07-16",encounter:"1969-07-20",end:"1969-07-24",type:{pt:"Pouso tripulado",en:"Crewed landing"},achievement:{pt:"Primeiro pouso humano na Lua e retorno seguro à Terra.",en:"First human Moon landing and safe return to Earth."},url:"https://www.nasa.gov/mission/apollo-11/",route:"timeline"},
    {id:"voyager1",name:"Voyager 1",target:"jupiter",agency:"NASA/JPL",launch:"1977-09-05",encounter:"1979-03-05",end:null,type:{pt:"Sobrevoo e missão interestelar",en:"Flyby and interstellar mission"},achievement:{pt:"Estudou Júpiter e Saturno antes de alcançar o espaço interestelar; rota exibida é esquemática.",en:"Studied Jupiter and Saturn before reaching interstellar space; displayed route is schematic."},url:"https://science.nasa.gov/mission/voyager/",route:"schematic"},
    {id:"voyager2",name:"Voyager 2",target:"neptune",agency:"NASA/JPL",launch:"1977-08-20",encounter:"1989-08-25",end:null,type:{pt:"Grande tour por sobrevoos",en:"Grand flyby tour"},achievement:{pt:"Única sonda a visitar Urano e Netuno; rota exibida é esquemática.",en:"The only probe to visit Uranus and Neptune; displayed route is schematic."},url:"https://science.nasa.gov/mission/voyager/",route:"schematic"},
    {id:"cassini",name:"Cassini–Huygens",target:"saturn",agency:"NASA/ESA/ASI",launch:"1997-10-15",encounter:"2004-07-01",end:"2017-09-15",type:{pt:"Orbitador e módulo de pouso",en:"Orbiter and lander"},achievement:{pt:"Revolucionou o estudo de Saturno, seus anéis, Titã e Encélado.",en:"Transformed the study of Saturn, its rings, Titan, and Enceladus."},url:"https://science.nasa.gov/mission/cassini/",route:"timeline"},
    {id:"new-horizons",name:"New Horizons",target:"pluto",agency:"NASA/APL",launch:"2006-01-19",encounter:"2015-07-14",end:null,type:{pt:"Sobrevoo do sistema externo",en:"Outer-system flyby"},achievement:{pt:"Realizou o primeiro reconhecimento próximo de Plutão e Caronte.",en:"Performed the first close reconnaissance of Pluto and Charon."},url:"https://science.nasa.gov/mission/new-horizons/",route:"schematic"},
    {id:"perseverance",name:"Mars 2020 Perseverance",target:"mars",agency:"NASA/JPL",launch:"2020-07-30",encounter:"2021-02-18",end:null,type:{pt:"Rover de superfície",en:"Surface rover"},achievement:{pt:"Investiga a geologia de Jezero e armazena amostras para possível retorno futuro.",en:"Investigates Jezero geology and caches samples for possible future return."},url:"https://science.nasa.gov/mission/mars-2020-perseverance/",route:"timeline"}
  ];

  const i18n = {
    brand:{pt:"Observatório",en:"Observatory"}, brandSub:{pt:"Sistema Solar",en:"Solar System"}, explore:{pt:"Explorar",en:"Explore"}, learn:{pt:"Aprender",en:"Learn"}, tools:{pt:"Ferramentas",en:"Tools"},
    search:{pt:"Buscar",en:"Search"}, catalog:{pt:"Catálogo celeste",en:"Celestial catalog"}, whereTo:{pt:"Para onde vamos?",en:"Where shall we go?"}, searchObjects:{pt:"Buscar objetos",en:"Search objects"},
    all:{pt:"Todos",en:"All"}, favorites:{pt:"Favoritos",en:"Favorites"}, visited:{pt:"Visitados",en:"Visited"}, nothingFound:{pt:"Nenhum mundo encontrado",en:"No world found"}, tryAnother:{pt:"Tente outro nome ou limpe os filtros.",en:"Try another name or clear the filters."}, clearSearch:{pt:"Limpar busca",en:"Clear search"},
    overview:{pt:"Visão geral",en:"Overview"}, data:{pt:"Dados",en:"Data"}, system:{pt:"Sistema",en:"System"}, sources:{pt:"Fontes",en:"Sources"}, focus:{pt:"Focar",en:"Focus"}, follow:{pt:"Seguir",en:"Follow"}, stopFollowing:{pt:"Parar de seguir",en:"Stop following"}, compare:{pt:"Comparar",en:"Compare"}, measure:{pt:"Medir",en:"Measure"},
    orientation:{pt:"Orientação",en:"Orientation"}, simulationTime:{pt:"Tempo da simulação",en:"Simulation time"}, now:{pt:"Agora",en:"Now"}, navigate:{pt:"navegar",en:"navigate"}, open:{pt:"abrir",en:"open"}, close:{pt:"fechar",en:"close"}
  };

  const groups = [
    {id:"star",label:{pt:"Estrela",en:"Star"},categories:["star"]},
    {id:"planets",label:{pt:"Planetas",en:"Planets"},categories:["planet"]},
    {id:"moons",label:{pt:"Luas exibidas",en:"Rendered moons"},categories:["moon"]},
    {id:"dwarfs",label:{pt:"Planetas anões",en:"Dwarf planets"},categories:["dwarf"]},
    {id:"small",label:{pt:"Corpos menores",en:"Small bodies"},categories:["small"]}
  ];

  const api = {
    sources, bodies, structures, typeLabels, tours, activities, glossary, missions, i18n, groups,
    sourceDate: "2026-09-05",
    getBody(id) { return bodies.find((b) => b.id === id) || null; },
    childrenOf(id) { return bodies.filter((b) => b.parent === id); }
  };

  root.SolarData = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
