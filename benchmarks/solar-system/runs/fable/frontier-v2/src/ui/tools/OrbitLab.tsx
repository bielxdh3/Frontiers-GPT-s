import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import * as S from '../../state/store';
import { app, bodyName } from '../../app/controller';
import { BODY_MAP, PLANET_IDS } from '../../data/bodies';
import type { BodyId } from '../../data/types';
import { AU_KM } from '../../data/types';
import { gravity, orbitalPeriodSeconds, visVivaKmS, weight } from '../../sim/physics';
import { fmtAu, fmtDays, fmtKm, fmtNumber, fmtSci, t } from '../../i18n';
import { collections, copyText, newId, updateCollections } from '../../state/persistence';
import { Badge, Btn, Note, Range, Term } from '../common';
import { Workspace } from './ToolRouter';

const SUN_MASS = BODY_MAP.sun.physical.massKg ?? 1.989e30;
const PRESETS: { key: string; a: number; e: number; m: number }[] = [
  { key: 'circular', a: 1, e: 0, m: 1 }, { key: 'elliptical', a: 1, e: 0.6, m: 1 }, { key: 'small', a: 0.3, e: 0.2, m: 1 }, { key: 'large', a: 10, e: 0.1, m: 1 },
];
const GRAVITY_BODIES: BodyId[] = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

/** Solve Kepler's equation for eccentric anomaly E given mean anomaly M (rad). */
function keplerE(M: number, e: number): number {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 12; i++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-9) break; }
  return E;
}

export function OrbitLab(): JSX.Element {
  const [massSolar, setMassSolar] = useState(1);
  const [aAu, setAAu] = useState(1);
  const [e, setE] = useState(0.3);
  const [testMass, setTestMass] = useState(1000);
  const [yourMass, setYourMass] = useState(70);
  const [speed, setSpeed] = useState(1);
  const [presetName, setPresetName] = useState('');
  const [phase, setPhase] = useState(0); // mean anomaly fraction 0..1
  const raf = useRef(0);
  const last = useRef(performance.now());
  useEffect(() => {
    const tick = (now: number) => { const dt = (now - last.current) / 1000; last.current = now; if (!S.reducedMotion.value) setPhase((p) => (p + (dt * speed) / 12) % 1); raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [speed]);
  const M = massSolar * SUN_MASS, aKm = aAu * AU_KM;
  const periodS = orbitalPeriodSeconds(aKm, M);
  const rp = aKm * (1 - e), ra = aKm * (1 + e);
  const vp = visVivaKmS(rp, aKm, M), va = visVivaKmS(ra, aKm, M);
  const W = 560, H = 340, cx = W / 2, cy = H / 2;
  const scale = (Math.min(W, H) * 0.42) / aKm; // px per km
  const b = aKm * Math.sqrt(1 - e * e);
  const centralX = cx + aKm * e * scale; // central body at the focus (+ae from the ellipse center); periapsis on the right
  const ptAt = (Ecc: number): [number, number] => [cx + aKm * Math.cos(Ecc) * scale, cy - b * Math.sin(Ecc) * scale];
  const E = keplerE(phase * 2 * Math.PI, e);
  const [px, py] = ptAt(E);
  // Equal-area sectors: 1/12 of the period starting at periapsis (M=0) and at apoapsis (M=π)
  const sector = (M0: number): string => {
    const pts: string[] = [`${centralX},${cy}`];
    for (let i = 0; i <= 16; i++) { const [sx, sy] = ptAt(keplerE(M0 + ((i / 16) * 2 * Math.PI) / 12, e)); pts.push(`${sx},${sy}`); }
    return pts.join(' ');
  };
  const savePreset = () => {
    const name = presetName.trim() || `${fmtAu(aAu)} · e=${fmtNumber(e, 2)}`;
    const ok = updateCollections((c) => ({ ...c, orbitPresets: [...c.orbitPresets, { id: newId(), name, centralMassKg: M, aKm, e, createdAt: Date.now() }].slice(-20) }));
    app.persistToast(ok, t('toast.saved')); setPresetName('');
  };
  const summary = () => [`${t('orbitlab.title')} — ${t('orbitlab.hypotheticalLabel')}`, `${t('orbitlab.centralMass')}: ${fmtNumber(massSolar, 3)} ${t('orbitlab.solarMasses')} (${fmtSci(M)} kg)`, `${t('orbitlab.semiMajor')}: ${fmtAu(aAu)}`, `${t('orbitlab.eccentricity')}: ${fmtNumber(e, 3)}`, `${t('orbitlab.period')}: ${fmtDays(periodS / 86400)}`, `${t('orbitlab.periapsis')}: ${fmtKm(rp, { compact: true })} · ${t('orbitlab.apoapsis')}: ${fmtKm(ra, { compact: true })}`, `${t('orbitlab.speedPeri')}: ${fmtNumber(vp, 2)} km/s · ${t('orbitlab.speedApo')}: ${fmtNumber(va, 2)} km/s`, t('orbitlab.formula')].join('\n');
  // Kepler chart (log-log): planets + hypothetical
  const CW = 560, CH = 200;
  const lx = (a: number) => 40 + ((Math.log10(a) + 1.5) / 3.5) * (CW - 60); // 0.03..100 au
  const ly = (days: number) => CH - 24 - ((Math.log10(days) - 1) / 5) * (CH - 44); // 10..1e6 days
  return (
    <Workspace title={t('orbitlab.title')} icon="orbit" experimental={t('orbitlab.hypotheticalLabel')} footer={<><span className="muted">{t('orbitlab.boundOnly')} {t('orbitlab.omitted')}</span><Btn small icon="copy" label={t('orbitlab.exportSummary')} onClick={async () => { S.toast((await copyText(summary())) ? t('toast.copied') : t('common.copyFailed'), 'info'); }} /></>}>
      <div className="tool-split">
        <div className="stack">
          <div className="card">
            <h3>{t('orbitlab.independent')}</h3>
            <Range label={`${t('orbitlab.centralMass')} (${t('orbitlab.solarMasses')})`} value={Math.log10(massSolar)} min={-3} max={1.5} step={0.01} onChange={(v) => setMassSolar(Math.pow(10, v))} format={(v) => `${fmtNumber(Math.pow(10, v), Math.pow(10, v) < 0.1 ? 4 : 2)} M☉`} />
            <div className="row" style={{ marginBottom: 8 }}>{(['sun', 'jupiter', 'earth'] as BodyId[]).map((id) => <Btn key={id} small onClick={() => setMassSolar((BODY_MAP[id].physical.massKg ?? SUN_MASS) / SUN_MASS)}>{bodyName(id)}</Btn>)}</div>
            <Range label={`${t('orbitlab.semiMajor')} (${t('unit.au')})`} value={Math.log10(aAu)} min={-1.5} max={1.7} step={0.01} onChange={(v) => setAAu(Math.pow(10, v))} format={(v) => fmtAu(Math.pow(10, v))} />
            <Range label={t('orbitlab.eccentricity')} value={e} min={0} max={0.95} step={0.01} onChange={setE} format={(v) => fmtNumber(v, 2)} />
            <div className="row">{PRESETS.map((p) => <Btn key={p.key} small onClick={() => { setAAu(p.a); setE(p.e); setMassSolar(p.m); }}>{t(`orbitlab.preset.${p.key}`)}</Btn>)}</div>
          </div>
          <div className="card">
            <h3>{t('orbitlab.derived')}</h3>
            <div className="kv" style={{ margin: 0 }}>
              <div className="k"><Term id="kepler-laws">{t('orbitlab.period')}</Term></div><div className="v num">{fmtDays(periodS / 86400)}</div>
              <div className="k"><Term id="perihelion">{t('orbitlab.periapsis')}</Term></div><div className="v num">{fmtKm(rp, { compact: true })} · {fmtAu(rp / AU_KM)}</div>
              <div className="k">{t('orbitlab.apoapsis')}</div><div className="v num">{fmtKm(ra, { compact: true })} · {fmtAu(ra / AU_KM)}</div>
              <div className="k">{t('orbitlab.speedPeri')}</div><div className="v num">{fmtNumber(vp, 2)} km/s</div>
              <div className="k">{t('orbitlab.speedApo')}</div><div className="v num">{fmtNumber(va, 2)} km/s</div>
            </div>
            <p className="muted" style={{ marginBottom: 0 }}>{t('orbitlab.formula')} · {t('orbitlab.compareBaselineNote')}</p>
          </div>
          <div className="card">
            <Range label={`${t('orbitlab.testMass')} (kg)`} value={Math.log10(testMass)} min={0} max={9} step={0.1} onChange={(v) => setTestMass(Math.pow(10, v))} format={(v) => fmtSci(Math.pow(10, v), 2) + ' kg'} />
            <Note>{t('orbitlab.testMassNote')}</Note>
          </div>
          <div className="card">
            <h3>{t('orbitlab.savedPresets')}</h3>
            <div className="row"><input type="text" value={presetName} placeholder={t('lab.presetName')} onInput={(ev) => setPresetName((ev.target as HTMLInputElement).value)} style={{ flex: 1 }} /><Btn small icon="bookmark" label={t('lab.savePreset')} onClick={savePreset} /></div>
            {collections.value.orbitPresets.map((p) => <div key={p.id} className="list-item" style={{ padding: '4px 6px' }}><span className="grow name">{p.name}</span><Btn small label={t('lab.loadPreset')} onClick={() => { setMassSolar(p.centralMassKg / SUN_MASS); setAAu(p.aKm / AU_KM); setE(p.e); }} /><Btn small iconOnly icon="trash" label={t('common.delete')} onClick={() => updateCollections((c) => ({ ...c, orbitPresets: c.orbitPresets.filter((x) => x.id !== p.id) }))} /></div>)}
          </div>
        </div>
        <div className="stack">
          <div className="tool-stage" style={{ height: H, flex: 'none' }}>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('orbitlab.title')}>
              <ellipse cx={cx} cy={cy} rx={aKm * scale} ry={b * scale} fill="none" stroke="#6f7c94" stroke-width="1.5" />
              <polygon points={sector(0)} fill="#6fe0a8" opacity="0.25" />
              <polygon points={sector(Math.PI)} fill="#ffcf7a" opacity="0.25" />
              <circle cx={centralX} cy={cy} r={Math.max(6, Math.min(18, 6 + Math.log10(massSolar + 0.001) * 4))} fill="#ffd27a" />
              <circle cx={px} cy={py} r={5} fill="#6fe0a8" />
              <line x1={centralX} y1={cy} x2={px} y2={py} stroke="#6fe0a8" stroke-opacity="0.5" stroke-dasharray="3 3" />
              <text x={cx + aKm * scale - 4} y={cy + 16} text-anchor="end" fill="#aeb8ca" font-size="10">{t('orbitlab.periapsis')}</text>
              <text x={cx - aKm * scale + 4} y={cy + 16} fill="#aeb8ca" font-size="10">{t('orbitlab.apoapsis')}</text>
              <text x={12} y={18} fill="#e8ecf3" font-size="12">{t('orbitlab.sweep')}</text>
              <text x={12} y={34} fill="#aeb8ca" font-size="10">{t('orbitlab.sweepNote')}</text>
            </svg>
          </div>
          <Range label={t('orbitlab.animSpeed')} value={speed} min={0} max={5} step={0.1} onChange={setSpeed} format={(v) => `${fmtNumber(v, 1)}×`} />
          <div className="tool-stage" style={{ height: CH, flex: 'none' }}>
            <svg viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={t('orbitlab.periodVsSize')}>
              <text x={12} y={16} fill="#e8ecf3" font-size="12">{t('orbitlab.periodVsSize')} (log–log, {t('orbitlab.solarMasses')}: 1)</text>
              <line x1={40} x2={CW - 20} y1={CH - 24} y2={CH - 24} stroke="#3a4560" /><line x1={40} x2={40} y1={20} y2={CH - 24} stroke="#3a4560" />
              {[0.1, 1, 10, 100].map((a) => <text key={a} x={lx(a)} y={CH - 8} text-anchor="middle" fill="#aeb8ca" font-size="10">{a} {t('unit.au')}</text>)}
              {[10, 1000, 100000].map((d) => <text key={d} x={36} y={ly(d) + 3} text-anchor="end" fill="#aeb8ca" font-size="9">{d < 1000 ? `${d} d` : `${fmtNumber(d / 365.25, 0)} a`}</text>)}
              <polyline points={[0.03, 100].map((a) => `${lx(a)},${ly(orbitalPeriodSeconds(a * AU_KM, SUN_MASS) / 86400)}`).join(' ')} stroke="#3a4560" stroke-dasharray="4 4" fill="none" />
              {PLANET_IDS.map((id) => { const d = BODY_MAP[id]; const a = d.physical.semiMajorAxisAu ?? 1; const p = d.physical.orbitalPeriodDays ?? 365; return <g key={id}><circle cx={lx(a)} cy={ly(p)} r={3.5} fill={d.appearance.color} /><text x={lx(a) + 6} y={ly(p) - 4} fill="#aeb8ca" font-size="9">{bodyName(id)}</text></g>; })}
              {massSolar > 0 && aAu >= 0.03 && aAu <= 100 && <circle cx={lx(aAu)} cy={ly(periodS / 86400)} r={6} fill="none" stroke="#6fe0a8" stroke-width="2" />}
            </svg>
          </div>
          <div className="card">
            <h3><Term id="gravity">{t('orbitlab.gravityTool')}</Term></h3>
            <Range label={`${t('orbitlab.yourMass')} (kg)`} value={yourMass} min={1} max={200} step={1} onChange={setYourMass} format={(v) => `${v} kg`} />
            <div className="table-wrap"><table className="data"><thead><tr><th>{t('common.name')}</th><th>g (m/s²)</th><th>{t('orbitlab.weightOn', { body: '…' })} (N)</th></tr></thead>
              <tbody>{GRAVITY_BODIES.map((id) => { const d = BODY_MAP[id]; const g = d.physical.gravityMs2 ?? (d.physical.massKg ? gravity(d.physical.massKg, d.physical.meanRadiusKm) : NaN); return <tr key={id}><th scope="row">{bodyName(id)} <span className="muted">({t('orbitlab.refLevel', { ref: t(`field.gravity.${d.physical.gravityRef}`) })})</span></th><td>{fmtNumber(g, 2)}</td><td>{fmtNumber(weight(yourMass, g), 0)}{id === 'earth' && <> <Badge kind="accent">{t('common.reference')}</Badge></>}</td></tr>; })}</tbody></table></div>
            <p className="muted" style={{ marginBottom: 0 }}>{t('orbitlab.massVsWeight')}</p>
          </div>
        </div>
      </div>
    </Workspace>
  );
}
