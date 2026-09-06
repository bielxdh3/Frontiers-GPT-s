import { mkdir, writeFile } from 'node:fs/promises';
const root = new URL('../public/assets/', import.meta.url);
await mkdir(root, { recursive: true });
const names = ['sun','mercury','venus_atmosphere','earth_daymap','earth_clouds','earth_specular_map','moon','mars','jupiter','saturn','uranus','neptune'];
const manifest = [];
for (const name of names) {
  const url = `https://www.solarsystemscope.com/textures/download/2k_${name}.jpg`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (!r.ok || !r.headers.get('content-type')?.startsWith('image/')) throw Error(`HTTP ${r.status}`);
    const bytes = new Uint8Array(await r.arrayBuffer());
    await writeFile(new URL(`${name}.jpg`, root), bytes);
    manifest.push({ id:name, file:`/assets/${name}.jpg`, source:url, resolution:'2048 × 1024', role:name.includes('specular')?'linear data':'sRGB color', attribution:'Solar System Scope / INOVE, based on NASA data', license:'CC BY 4.0', licenseURL:'https://creativecommons.org/licenses/by/4.0/', note:'Enhanced colors; some unmapped regions are illustrative. Not live imagery.', fallback:'Seeded, body-specific procedural material', bytes:bytes.length });
    console.log(`${name}: ${bytes.length} bytes`);
  } catch (e) { console.log(`${name}: procedural fallback (${e.message})`); }
}
await writeFile(new URL('manifest.json', root), JSON.stringify(manifest,null,2));
