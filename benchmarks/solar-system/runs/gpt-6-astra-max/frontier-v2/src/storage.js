import { byId, MIN_DATE, MAX_DATE, START } from './data.js';
import { activities, tours } from './content.js';
export const STORAGE_KEY='observatory.v1';
export const defaults={language:'pt',quality:'auto',scale:'explore',labels:'major',orbits:'all',background:.6,exposure:1.1,presentation:'enhanced',reducedMotion:'system',fontSize:1,panelOpacity:.94,units:'km',dateFormat:'locale',highContrast:false,labelDensity:1,sound:false,grid:false,axes:false,nodes:false,velocity:false,trails:false,trailDays:90,belt:true,kuiper:false,smallBodies:false,frame:'sun'};
export const freshData=()=>({version:1,preferences:{...defaults},favorites:[],viewpoints:[],bookmarks:[],notes:[],experiments:[],progress:{activities:[],tours:[],visited:[],activity:null},onboarded:false});
const text=(x,max=100)=>typeof x==='string'&&x.length<=max&&!/[\u0000-\u0008\u000b\u000c]/.test(x);
const date=x=>Number.isFinite(x)&&x>=MIN_DATE&&x<=MAX_DATE;
const finiteArray=(v,n,limit)=>Array.isArray(v)&&v.length===n&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<=limit);
export function validateView(v){return v&&byId[v.target]&&byId[v.target].type!=='region'&&['explore','relative'].includes(v.scale)&&finiteArray(v.offset,3,1e6)&&finiteArray(v.targetOffset||[0,0,0],3,1e6)&&date(v.time??START)&&(v.fov===undefined||Number.isFinite(v.fov)&&v.fov>=15&&v.fov<=90)&&['free','focus','follow','system','overview'].includes(v.mode||'focus')&&(v.system==null||byId[v.system])&&(v.labels===undefined||['major','system','selected','favorites','none'].includes(v.labels))&&(v.orbits===undefined||['all','selected','system','none'].includes(v.orbits));}
export function validateData(raw){
  if(!raw||raw.version!==1||JSON.stringify(raw).length>2_000_000)throw Error('schema');
  const out=freshData();
  for(const [k,v]of Object.entries(raw.preferences||{})){if(!Object.hasOwn(defaults,k))continue;const enums={language:['pt','en'],quality:['auto','low','medium','high'],scale:['explore','relative'],labels:['major','system','selected','favorites','none'],orbits:['all','selected','system','none'],presentation:['natural','enhanced'],reducedMotion:['system','on','off'],units:['km','mi'],dateFormat:['locale','iso'],frame:['sun','earth','selected']};if(enums[k]&&!enums[k].includes(v))throw Error('preference');if(typeof defaults[k]==='number'&&(!Number.isFinite(v)||v<0||v>3650))throw Error('preference');if(typeof defaults[k]==='boolean'&&typeof v!=='boolean')throw Error('preference');out.preferences[k]=v;}
  const ranges={background:[0,1],exposure:[.3,2],fontSize:[1,1.3],panelOpacity:[.65,1],labelDensity:[.5,1.5],trailDays:[1,3650]};for(const[k,[min,max]]of Object.entries(ranges))if(out.preferences[k]<min||out.preferences[k]>max)throw Error('preference range');
  for(const key of ['favorites','viewpoints','bookmarks','notes','experiments']){if(raw[key]!==undefined&&!Array.isArray(raw[key]))throw Error('collection');if((raw[key]?.length||0)>200)throw Error('collection limit');}
  out.favorites=[...new Set(raw.favorites||[])];if(out.favorites.some(id=>!byId[id]))throw Error('identifier');
  for(const key of ['viewpoints','bookmarks','notes','experiments'])out[key]=(raw[key]||[]).map(item=>{
    if(!item||!text(item.id,80)||!text(item.title,100)||!byId[item.body]||!date(item.time))throw Error('entry');
    if(key==='viewpoints'&&(!validateView(item.view)||item.dateMode!==undefined&&!['saved','current'].includes(item.dateMode)))throw Error('view');
    if(key==='notes'&&!text(item.text,4000))throw Error('note');
    if(key==='experiments'){const p=item.params;if(!p||![p.mass,p.a,p.e,p.testMass??70].every(Number.isFinite)||p.mass<.1||p.mass>5||p.a<.1||p.a>10||p.e<0||p.e>.9||(p.testMass??70)<=0||(p.testMass??70)>10000)throw Error('experiment');}
    return JSON.parse(JSON.stringify(item));
  });
  const identifiers={activities:new Set(activities.map(a=>a.id)),tours:new Set(tours.map(t=>t.id)),visited:new Set(Object.keys(byId))};
  if(raw.progress){for(const key of ['activities','tours','visited']){const arr=raw.progress[key]||[];if(!Array.isArray(arr)||arr.length>100||arr.some(x=>!identifiers[key].has(x)))throw Error('progress');out.progress[key]=[...new Set(arr)];}if(raw.progress.activity!=null&&!identifiers.activities.has(raw.progress.activity))throw Error('activity');out.progress.activity=raw.progress.activity??null;}
  out.onboarded=raw.onboarded===true;return out;
}
export function loadData(storage){try{const raw=storage.getItem(STORAGE_KEY);return {data:raw?validateData(JSON.parse(raw)):freshData(),error:null};}catch{return {data:freshData(),error:'load'};}}
export function persist(storage,data){try{storage.setItem(STORAGE_KEY,JSON.stringify(validateData(data)));return true;}catch{return false;}}
export function sceneFile(view){if(!validateView(view))throw Error('view');return {version:1,kind:'observatory-scene',view:{target:view.target,scale:view.scale,offset:view.offset,targetOffset:view.targetOffset||[0,0,0],time:view.time,mode:view.mode,fov:view.fov,labels:view.labels,orbits:view.orbits}};}
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
