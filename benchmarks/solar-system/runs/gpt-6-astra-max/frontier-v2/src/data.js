// Physical units: radius km, mass kg, period and rotation days. Source snapshot: 2026-09-06 UTC.
export const DATA_DATE = '2026-09-06';
export const AU = 149597870.7;
export const DAY = 86400;
export const G = 6.67430e-11;
export const C = 299792.458;
export const EPOCH = Date.UTC(2000,0,1,12);
export const START = Date.UTC(2026,8,5,12);
export const MIN_DATE = Date.UTC(1800,0,1);
export const MAX_DATE = Date.UTC(2050,0,1);
export const SOURCES = {
  physical:['JPL · Physical parameters','https://ssd.jpl.nasa.gov/planets/phys_par.html'],
  orbit:['JPL · Approximate planetary positions','https://ssd.jpl.nasa.gov/planets/approx_pos.html'],
  moons:['JPL · Satellite physical parameters','https://ssd.jpl.nasa.gov/sats/phys_par/'],
  moonOrbit:['JPL · Satellite mean elements','https://ssd.jpl.nasa.gov/sats/elem/'],
  counts:['JPL · Recognized satellites','https://ssd.jpl.nasa.gov/sats/discovery.html'],
  textures:['Solar System Scope · CC BY 4.0','https://www.solarsystemscope.com/textures/'],
  small:['JPL · Small-Body Database','https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html'],
  system:['NASA · Solar System','https://science.nasa.gov/solar-system/solar-system-facts/']
};
// JPL Table 1: a, e, I, mean longitude, longitude of perihelion, ascending node;
// second vector is the corresponding rate per Julian century, degrees except a/e.
export const ELEMENTS = {
  mercury:[[.38709927,.20563593,7.00497902,252.25032350,77.45779628,48.33076593],[.00000037,.00001906,-.00594749,149472.67411175,.16047689,-.12534081]],
  venus:[[.72333566,.00677672,3.39467605,181.97909950,131.60246718,76.67984255],[.00000390,-.00004107,-.00078890,58517.81538729,.00268329,-.27769418]],
  earth:[[1.00000261,.01671123,-.00001531,100.46457166,102.93768193,0],[.00000562,-.00004392,-.01294668,35999.37244981,.32327364,0]],
  mars:[[1.52371034,.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891],[.00001847,.00007882,-.00813131,19140.30268499,.44441088,-.29257343]],
  jupiter:[[5.202887,.04838624,1.30439695,34.39644051,14.72847983,100.47390909],[-.00011607,-.00013253,-.00183714,3034.74612775,.21252668,.20469106]],
  saturn:[[9.53667594,.05386179,2.48599187,49.95424423,92.59887831,113.66242448],[-.00125060,-.00050991,.00193609,1222.49362201,-.41897216,-.28867794]],
  uranus:[[19.18916464,.04725744,.77263783,313.23810451,170.95427630,74.01692503],[-.00196176,-.00004397,-.00242939,428.48202785,.40805281,.04240589]],
  neptune:[[30.06992276,.00859048,1.77004347,-55.12002969,44.96476227,131.78422574],[.00026291,.00005105,.00035372,218.45945325,-.32241464,-.00508664]]
};
const rawPlanets = [
  ['mercury','Mercúrio','Mercury',2439.4,.330103e24,3.70,5.4289,58.6462,.2408467*365.25,.034,'#a79988',0],
  ['venus','Vênus','Venus',6051.8,4.86731e24,8.87,5.243,-243.018,.61519726*365.25,177.36,'#d9bb85',0],
  ['earth','Terra','Earth',6371.0084,5.97217e24,9.80,5.5134,.99726968,1.0000174*365.25,23.439,'#76bce0',1],
  ['mars','Marte','Mars',3389.5,.641691e24,3.71,3.9340,1.02595676,1.8808476*365.25,25.19,'#db8565',2],
  ['jupiter','Júpiter','Jupiter',69911,1898.125e24,24.79,1.3262,.41354,11.862615*365.25,3.13,'#d6b493',115],
  ['saturn','Saturno','Saturn',58232,568.317e24,10.44,.6871,.44401,29.447498*365.25,26.73,'#dec795',293],
  ['uranus','Urano','Uranus',25362,86.8099e24,8.87,1.270,-.71833,84.016846*365.25,97.77,'#a1d9db',29],
  ['neptune','Netuno','Neptune',24622,102.4092e24,11.15,1.638,.67125,164.79132*365.25,28.32,'#6b9be1',16]
];
const descriptions = {
  sun:['A estrela que torna tudo possível. Sua gravidade organiza os mundos que você está prestes a explorar.','The star that makes it all possible. Its gravity shapes the worlds you are about to explore.'],
  mercury:['Um pequeno mundo de crateras e contrastes, completando a volta mais curta ao redor do Sol.','A small world of craters and contrasts, completing the shortest journey around the Sun.'],
  venus:['Sob um véu de nuvens, uma atmosfera densa guarda calor. Um mundo quase do tamanho da Terra, profundamente diferente.','Beneath a veil of clouds, a dense atmosphere holds heat. Almost Earth-sized, yet profoundly different.'],
  earth:['Oceanos, continentes e uma atmosfera delicada. Nosso ponto de partida para conhecer todos os outros mundos.','Oceans, continents and a delicate atmosphere. Our starting point for understanding every other world.'],
  mars:['Desertos de óxido de ferro guardam pistas de um passado com água. Um destino para perguntas ainda em aberto.','Iron-oxide deserts preserve clues to a watery past. A destination for questions still unanswered.'],
  jupiter:['Faixas de nuvens envolvem o maior planeta. Ao seu redor, quatro grandes luas formam um sistema em miniatura.','Cloud bands wrap around the largest planet. Four major moons form a miniature system around it.'],
  saturn:['Milhares de estruturas de gelo formam anéis extraordinários. Vistos de perto, eles são uma população, não um disco sólido.','Countless icy structures form extraordinary rings. Up close, they are a population, not a solid disk.'],
  uranus:['Um gigante de gelo que gira quase deitado. Sua orientação transforma a experiência das estações.','An ice giant spinning nearly on its side. Its orientation transforms the experience of seasons.'],
  neptune:['Além dos outros planetas, ventos atravessam uma atmosfera azulada. A luz solar chega aqui muito mais fraca.','Beyond the other planets, winds cross a bluish atmosphere. Sunlight reaches here much more faintly.'],
  moon:['Nossa companheira de marés e noites. Suas fases revelam a geometria da luz, não a sombra da Terra.','Our companion of tides and nights. Its phases reveal the geometry of light, not Earth’s shadow.']
};
export const bodies = [{id:'sun',name:['Sol','Sun'],type:'star',parent:null,radius:695700,mass:1.98847e30,gravity:274,density:1.408,rotation:25.38,period:null,tilt:7.25,color:'#f5ba70',temperature:5772,temperatureContext:['Fotosfera; temperatura efetiva','Photosphere; effective temperature'],knownMoons:null,source:'https://science.nasa.gov/sun/facts/',description:descriptions.sun,texture:'sun',model:'star'},
  ...rawPlanets.map(([id,pt,en,radius,mass,gravity,density,rotation,period,tilt,color,knownMoons])=>({id,name:[pt,en],type:'planet',parent:'sun',radius,mass,gravity,density,rotation,period,tilt,color,knownMoons,a:ELEMENTS[id][0][0]*AU,e:ELEMENTS[id][0][1],i:ELEMENTS[id][0][2],source:`https://science.nasa.gov/${id}/facts/`,description:descriptions[id],texture:id==='venus'?'venus_atmosphere':id==='earth'?'earth_daymap':id,model:'jpl',giant:['jupiter','saturn','uranus','neptune'].includes(id)}))
];
// Satellites use mean sizes/periods. Non-lunar orientations and all phase angles
// are deliberately illustrative, not a satellite ephemeris. Moon uses J2000 mean elements.
const moons = [
  ['moon','Lua','Moon','earth',1737.4,4902.8,384400,27.322,.0554,5.16,'#c3c2ba'],
  ['phobos','Fobos','Phobos','mars',11.08,.0007087,9375,.3187,.015,1.1,'#9e8f7f'],
  ['deimos','Deimos','Deimos','mars',6.2,.0000962,23458,1.2624,.0003,1.8,'#b6a492'],
  ['io','Io','Io','jupiter',1821.49,5959.91547,421800,1.7691,.0041,.04,'#d9bc64'],
  ['europa','Europa','Europa','jupiter',1560.8,3202.7121,671100,3.5512,.0094,.47,'#d1c3ab'],
  ['ganymede','Ganimedes','Ganymede','jupiter',2631.2,9887.83275,1070400,7.1546,.0013,.2,'#a99780'],
  ['callisto','Calisto','Callisto','jupiter',2410.3,7179.2834,1882700,16.689,.0074,.28,'#847b72'],
  ['titan','Titã','Titan','saturn',2574.76,8978.1382,1221870,15.945,.0288,.35,'#d6a755'],
  ['enceladus','Encélado','Enceladus','saturn',252.1,7.21037,238400,1.3702,.0047,.01,'#e4ecef'],
  ['miranda','Miranda','Miranda','uranus',235.8,4.4,129900,1.4135,.0013,4.34,'#b2b6b1'],
  ['ariel','Ariel','Ariel','uranus',578.9,83.5,190900,2.5204,.0012,.04,'#c2caca'],
  ['umbriel','Umbriel','Umbriel','uranus',584.7,85.1,266000,4.1442,.0039,.13,'#7a8184'],
  ['titania','Titânia','Titania','uranus',788.9,226.9,436300,8.7059,.0011,.08,'#bab4ae'],
  ['oberon','Oberon','Oberon','uranus',761.4,205.3,583500,13.4632,.0014,.07,'#9a8e87'],
  ['triton','Tritão','Triton','neptune',1352.6,1428.4955,354800,5.8769,.00002,156.865,'#d6c4b4'],
  ['charon','Caronte','Charon','pluto',606,105.88,19596,6.3872,.0002,0,'#b2a9a0']
];
const moonStories = {
  phobos:['Pequena e irregular, Fobos dá várias voltas enquanto Marte completa uma rotação.','Small and irregular, Phobos makes several orbits during a single Martian rotation.'],
  deimos:['A companheira mais distante de Marte tem uma silhueta irregular e movimento mais lento que Fobos.','Mars’s more distant companion has an irregular silhouette and moves more slowly than Phobos.'],
  io:['Um mundo vulcânico de tons amarelos. Compare seu tamanho com o das outras luas de Júpiter.','A volcanic world in yellow tones. Compare its size with Jupiter’s other moons.'],
  europa:['Linhas atravessam uma crosta de gelo. A presença de um oceano interno motiva a exploração deste mundo.','Lines cross an icy crust. Evidence for an interior ocean motivates exploration of this world.'],
  ganymede:['A maior lua do Sistema Solar supera Mercúrio em diâmetro, mas não em massa.','The largest moon in the Solar System exceeds Mercury in diameter, but not in mass.'],
  callisto:['Uma superfície intensamente marcada por crateras preserva uma longa história de impactos.','A heavily cratered surface preserves a long history of impacts.'],
  titan:['Uma atmosfera espessa envolve a maior lua de Saturno. Seu brilho dourado representa a névoa.','A thick atmosphere surrounds Saturn’s largest moon. Its golden appearance represents haze.'],
  enceladus:['Um mundo pequeno e gelado, conhecido por plumas que revelam material do seu interior.','A small icy world, known for plumes that reveal material from its interior.'],
  miranda:['A pequena Miranda reúne terrenos de aparência muito diferente em uma superfície irregular.','Small Miranda combines very different-looking terrains on an irregular surface.'],
  ariel:['Uma lua clara do sistema de Urano. Aqui, o relevo é uma interpretação visual.','A bright moon of the Uranian system. Terrain here is a visual interpretation.'],
  umbriel:['Uma das grandes luas escuras de Urano, apresentada com textura ilustrativa.','One of Uranus’s large dark moons, shown with illustrative terrain.'],
  titania:['A maior lua de Urano. Sua órbita pertence ao sistema inclinado do planeta.','Uranus’s largest moon. Its orbit belongs to the planet’s tilted system.'],
  oberon:['Uma grande lua externa de Urano, com paisagem antiga e marcada por impactos.','A large outer moon of Uranus, with an old landscape shaped by impacts.'],
  triton:['Tritão percorre uma órbita retrógrada: uma pista importante sobre sua origem.','Triton follows a retrograde orbit: an important clue to its origin.'],
  charon:['Grande em relação a Plutão, Caronte ajuda a explicar o conceito de baricentro.','Large relative to Pluto, Charon helps explain the concept of a barycenter.']
};
for(const [id,pt,en,parent,radius,gm,a,period,e,i,color] of moons){const mass=gm*1e9/G;bodies.push({id,name:[pt,en],type:'moon',parent,radius,mass,gravity:gm*1000/(radius*radius),density:mass/(4/3*Math.PI*(radius*1000)**3)/1000,rotation:period,period,a,e,i,tilt:0,color,knownMoons:0,description:descriptions[id]||moonStories[id],source:id==='moon'?'https://science.nasa.gov/moon/facts/':`https://science.nasa.gov/${parent}/moons/${id}/`,model:'mean',texture:id==='moon'?'moon':null});}
const dwarfs=[
 ['pluto','Plutão','Pluto',1188.3,1.30246e22,-6.3872,247.92065,39.482,.2488,17.16,122.53,'#c7b19a',5],
 ['ceres','Ceres','Ceres',469.7,9.38416e20,.37809,4.61,2.767,.0758,10.59,4,'#a3a099',0],
 ['eris','Éris','Eris',1163,1.66e22,1.079,557.56,67.78,.44,44.04,0,'#dfded5',1],
 ['haumea','Haumea','Haumea',797.5,4.006e21,.1631,284.81,43.13,.19,28.2,0,'#cdcac2',2],
 ['makemake','Makemake','Makemake',715,null,22.8266/24,307.54,45.79,.16,28.98,0,'#d2b7a1',1],
 ['vesta','Vesta','Vesta',262.7,2.59076e20,.2226,3.63,2.362,.0887,7.14,27,'#9e968b',0]
];
for(const [id,pt,en,radius,mass,rotation,years,a,e,i,tilt,color,knownMoons] of dwarfs) bodies.push({id,name:[pt,en],type:id==='vesta'?'asteroid':'dwarf',parent:'sun',radius,mass,gravity:mass?G*mass/(radius*1000)**2:null,density:mass?mass/(4/3*Math.PI*(radius*1000)**3)/1000:null,rotation,period:years*365.25,a:a*AU,e,i,tilt,color,knownMoons,description:[id==='vesta'?'Um corpo irregular no cinturão principal. A sonda Dawn revelou sua geologia.':`${pt} pertence à família dos planetas anões. Explore sua órbita didática e compare as proporções.`,id==='vesta'?'An irregular body in the main belt. Dawn revealed its geology.':`${en} belongs to the dwarf-planet family. Explore its educational orbit and compare proportions.`],source:id==='vesta'?'https://science.nasa.gov/solar-system/asteroids/4-vesta/':`https://science.nasa.gov/dwarf-planets/${id}/facts/`,model:'illustrative'});
// Dated, explicitly defined small-body size estimates; these are not live ephemerides.
const dwarfNotes={
pluto:{description:['Montanhas de gelo e planícies de nitrogênio reveladas pela New Horizons. Caronte completa este pequeno sistema, aqui representado de forma didática.','Ice mountains and nitrogen plains revealed by New Horizons. Charon completes this small system, represented here educationally.']},
ceres:{description:['O maior corpo do cinturão principal. Dawn encontrou depósitos de sais brilhantes, pistas de água na história deste mundo.','The main belt’s largest body. Dawn found bright salt deposits, clues to water in this world’s history.']},
eris:{source:'https://science.nasa.gov/dwarf-planets/eris/',physicalSource:'https://www.nature.com/articles/nature10550',radiusContext:['Raio esférico 1.163 ± 6 km: ocultação de 2010, Sicardy et al. (2011). Rotação adotada de 25,9 h é uma estimativa fotométrica incerta do JPL/LCDB.','Spherical radius 1,163 ± 6 km: 2010 occultation, Sicardy et al. (2011). Adopted 25.9 h rotation is an uncertain JPL/LCDB photometric estimate.'],description:['Uma órbita inclinada leva Éris muito além de Netuno. Sua lua Disnomia ajuda a estimar a massa deste mundo distante.','A tilted orbit carries Eris far beyond Neptune. Its moon Dysnomia helps constrain this distant world’s mass.']},
haumea:{source:'https://science.nasa.gov/dwarf-planets/haumea/',physicalSource:'https://www.nature.com/articles/nature24051',shapeAxes:[1161/797.5,513/797.5,852/797.5],radiusContext:['Raio equivalente em volume ≈797,5 km, derivado dos semieixos 1.161 × 852 × 513 km da ocultação de 2017. A forma e a gravidade esférica são aproximações.','Volume-equivalent radius ≈797.5 km, derived from 1,161 × 852 × 513 km semi-axes in the 2017 occultation. Shape and spherical gravity are approximations.'],description:['Uma rotação de menos de quatro horas acompanha sua forma alongada. Haumea possui duas luas e um anel descoberto por ocultação em 2017; o anel não está desenhado nesta seleção.','A rotation shorter than four hours accompanies its elongated shape. Haumea has two moons and a ring discovered by occultation in 2017; that ring is not drawn in this selection.']},
makemake:{source:'https://science.nasa.gov/dwarf-planets/makemake/',physicalSource:'https://www.nature.com/articles/nature11597',radiusContext:['Raio esférico adotado de 715 km. A ocultação publicada em 2012 mediu eixos projetados de 1.430 ± 9 e 1.502 ± 45 km; o volume não foi determinado unicamente. Massa e gravidade foram omitidas. Rotação JPL/LCDB: 22,8266 h, com incerteza.','Adopted spherical radius 715 km. The occultation published in 2012 measured projected axes of 1,430 ± 9 and 1,502 ± 45 km; volume was not uniquely determined. Mass and gravity are omitted. JPL/LCDB rotation: 22.8266 h, uncertain.'],description:['Um mundo frio do cinturão de Kuiper, com metano congelado e uma pequena lua. Sua aparência aqui é uma ilustração, pois não dispomos de um mapa detalhado.','A cold Kuiper Belt world with frozen methane and a small moon. Its appearance here is illustrative because no detailed map is available.']}
};
for(const body of bodies)if(dwarfNotes[body.id])Object.assign(body,dwarfNotes[body.id]);
bodies.find(b=>b.id==='charon').source='https://science.nasa.gov/dwarf-planets/pluto/moons/charon/';
bodies.push({id:'comet',name:['Cometa Aurora · hipotético','Comet Aurora · hypothetical'],type:'comet',parent:'sun',radius:3,mass:null,density:null,gravity:null,rotation:1,period:Math.sqrt(8**3)*365.25,a:8*AU,e:.88,i:24,tilt:0,color:'#abd8df',knownMoons:null,description:['Experimente a atividade de um cometa educativo. A cauda de íons aponta para longe do Sol; a de poeira se curva.','Explore the activity of an educational comet. Its ion tail points away from the Sun; its dust tail curves.'],source:'https://science.nasa.gov/solar-system/comets/facts/',model:'hypothetical'});
export const regions = [
 {id:'belt',name:['Cinturão de asteroides','Asteroid belt'],type:'region',a:2.7*AU,color:'#8c8f8b',range:[2.1,3.3],source:'https://science.nasa.gov/solar-system/asteroids/'},
 {id:'kuiper',name:['Cinturão de Kuiper','Kuiper Belt'],type:'region',a:40*AU,color:'#6e9baf',range:[30,50],source:'https://science.nasa.gov/solar-system/kuiper-belt/facts/'},
 {id:'oort',name:['Nuvem de Oort','Oort Cloud'],type:'region',a:20000*AU,color:'#7391b4',range:[2000,100000],source:'https://science.nasa.gov/solar-system/oort-cloud/facts/'}
];
// NASA temperature summary published 2022-02-15, updated 2024-11-01.
// Rounded climatological means, not contemporary weather or a forecast.
const temperatureC={mercury:167,venus:464,earth:15,mars:-65,jupiter:-110,saturn:-140,uranus:-195,neptune:-200,pluto:-225};
for(const b of bodies){if(Object.hasOwn(temperatureC,b.id)){b.temperature=Math.round(temperatureC[b.id]+273.15);b.temperatureContext=b.giant?['Média no nível atmosférico de pressão terrestre ao nível do mar; referência NASA 2022','Mean at atmospheric pressure equivalent to Earth sea level; NASA 2022 reference']:['Média superficial de referência; NASA 2022, não clima atual','Reference mean surface value; NASA 2022, not current weather'];b.temperatureSource='https://science.nasa.gov/resource/solar-system-temperatures/';}if(b.type==='planet')b.solarDay=1/Math.abs(1/b.rotation-1/b.period);}
export const catalog = [...bodies,...regions];
export const byId = Object.fromEntries(catalog.map(b=>[b.id,b]));
export const planets = bodies.filter(b=>b.type==='planet');
export const children = id=>bodies.filter(b=>b.parent===id);
export const normalize = text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function searchBodies(query){const q=normalize(query).trim();return catalog.filter(b=>normalize([...b.name,b.id,b.parent||'',b.id==='earth'?'Gaia Tellus Terra':b.id==='moon'?'Luna Selene Lua':''].join(' ')).includes(q));}
export function validateCatalog(){const ids=new Set();for(const b of catalog){if(ids.has(b.id))throw Error('Duplicate id');ids.add(b.id);if(b.type==='region')continue;if(b.parent&&!byId[b.parent])throw Error('Missing parent');if(!(b.radius>0)||!Number.isFinite(b.radius))throw Error('Invalid radius');if(b.period!==null&&!(b.period>0))throw Error('Invalid period');if(b.e!==undefined&&(b.e<0||b.e>=1))throw Error('Invalid eccentricity');if(!b.description?.[0]||!b.description?.[1])throw Error('Missing content');}return true;}
