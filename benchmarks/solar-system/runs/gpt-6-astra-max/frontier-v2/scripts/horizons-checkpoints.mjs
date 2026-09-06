import {writeFile,mkdir} from 'node:fs/promises';
import {positionsAt,length,sub,RAD} from '../src/model.js';
import {AU,EPOCH} from '../src/data.js';
await mkdir('tests/fixtures',{recursive:true});
const rows=[];
for(const [body,command,nominal]of[['earth','3',[20,8,6000]],['mars','4',[40,2,25000]],['jupiter','5',[400,10,600000]]]){
 const params={format:'json',COMMAND:"'"+command+"'",EPHEM_TYPE:"'VECTORS'",CENTER:"'500@10'",START_TIME:"'2000-01-01 12:00'",STOP_TIME:"'2000-01-02 12:00'",STEP_SIZE:"'1 d'",REF_PLANE:"'ECLIPTIC'",REF_SYSTEM:"'ICRF'",OUT_UNITS:"'AU-D'",VEC_TABLE:"'2'",CSV_FORMAT:"'YES'",VEC_CORR:"'NONE'"};
 const url='https://ssd.jpl.nasa.gov/api/horizons.api?'+new URLSearchParams(params),data=await(await fetch(url,{signal:AbortSignal.timeout(30000)})).json();
 if(!data.result?.includes('$$SOE'))throw Error(JSON.stringify(data));
 const fields=data.result.split('$$SOE')[1].trim().split('\n')[0].split(',').map(s=>s.trim()),xyz=fields.slice(2,5).map(Number);if(!xyz.every(Number.isFinite))throw Error('vector parse');
 const actual=positionsAt(EPOCH).positions[body],reference=xyz.map(v=>v*AU),radial=Math.abs(length(actual)-length(reference)),lon=Math.atan2(actual[1],actual[0])-Math.atan2(reference[1],reference[0]),lat=Math.asin(actual[2]/length(actual))-Math.asin(reference[2]/length(reference));
 const errors={longitudeArcsec:Math.abs(lon/RAD*3600),latitudeArcsec:Math.abs(lat/RAD*3600),radialKm:radial,cartesianKm:length(sub(actual,reference))};
 rows.push({body,command,url,epoch:'2000-01-01T12:00:00 TDB',frame:'Heliocentric geometric ICRF ecliptic J2000, AU',referenceAU:xyz,nominalErrors:{longitudeArcsec:nominal[0],latitudeArcsec:nominal[1],radialKm:nominal[2]},observedErrors:errors,sourceExcerpt:data.result.slice(0,data.result.indexOf('$$SOE'))});console.log(JSON.stringify({body,errors}));
}
await writeFile('tests/fixtures/horizons-j2000.json',JSON.stringify({retrieved:new Date().toISOString(),source:'JPL Horizons, geometric barycenter vectors',checkpoints:rows},null,2));
