import {writeFile} from 'node:fs/promises';
import {bodies,SOURCES} from '../src/data.js';
import {missions} from '../src/content.js';
const urls=[...new Set([...bodies.map(b=>b.source),...Object.values(SOURCES).map(v=>v[1]),...missions.map(m=>m.source)])];
const rows=[];for(let i=0;i<urls.length;i+=5){const batch=await Promise.all(urls.slice(i,i+5).map(async url=>{try{const response=await fetch(url,{signal:AbortSignal.timeout(20000)});const row={url,status:response.status,resolved:response.url};await response.body?.cancel();return row;}catch(e){return {url,error:e.message};}}));rows.push(...batch);console.log(JSON.stringify(batch.filter(r=>r.error||r.status!==200)));}
await writeFile('test-results/sources.json',JSON.stringify({checkedAt:new Date().toISOString(),sources:rows},null,2));console.log('Public source routes checked: '+rows.length);
