import {writeFile} from 'node:fs/promises';
const out=[];for(const id of ['136199','136108','136472']){try{const data=await(await fetch('https://ssd-api.jpl.nasa.gov/sbdb.api?sstr='+id+'&phys-par=true',{signal:AbortSignal.timeout(20000)})).json();out.push(data);console.log(JSON.stringify({object:data.object,parameters:data.phys_par},null,2));}catch(e){console.log(id+': '+e.message);}}
await writeFile('test-results/dwarf-reference.json',JSON.stringify(out,null,2));
