import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import * as S from '../../state/store';
import { app, bodyName } from '../../app/controller';
import { BODY_MAP, DWARF_IDS, PLANET_IDS } from '../../data/bodies';
import type { BodyId } from '../../data/types';
import { AU_KM } from '../../data/types';
import { fmtAu, fmtKm, fmtNumber, t } from '../../i18n';
import { Badge, Btn, Note, Seg, Switch, Term } from '../common';
import { Workspace } from './ToolRouter';

type View = 'sizes' | 'distances' | 'combined';
type Unit = 'mm' | 'cm' | 'm' | 'km';
const UNIT_KM: Record<Unit, number> = { mm: 1e-6, cm: 1e-5, m: 1e-3, km: 1 };
const CANDIDATES: BodyId[] = ['sun', ...PLANET_IDS, ...DWARF_IDS.filter((id) => ['ceres', 'pluto', 'eris'].includes(id))];

/** Format a model length given in km with an auto-chosen human unit. */
export function fmtModelLength(km: number): string {
  if (!Number.isFinite(km)) return '—';
  if (km >= 1) return `${fmtNumber(km, km < 10 ? 2 : 0)} ${t('scalelab.unit.km')}`;
  const m = km * 1000;
  if (m >= 1) return `${fmtNumber(m, m < 10 ? 2 : 1)} ${t('scalelab.unit.m')}`;
  const cm = m * 100;
  if (cm >= 1) return `${fmtNumber(cm, cm < 10 ? 2 : 1)} ${t('scalelab.unit.cm')}`;
  const mm = cm * 10;
  return `${fmtNumber(mm, mm < 0.1 ? 3 : 2)} ${t('scalelab.unit.mm')}`;
}

export function ScaleLab(): JSX.Element {
  const [view, setView] = useState<View>('sizes');
  const [includeSun, setIncludeSun] = useState(false);
  const [log, setLog] = useState(false);
  const [subset, setSubset] = useState(false);
  const [refBody, setRefBody] = useState<BodyId>('earth');
  const [refValue, setRefValue] = useState(10);
  const [refUnit, setRefUnit] = useState<Unit>('cm');
  const ids = CANDIDATES.filter((id) => (includeSun || view !== 'sizes' ? true : id !== 'sun')).filter((id) => (subset ? ['sun', 'mercury', 'venus', 'earth', 'mars'].includes(id) : true));
  const defs = ids.map((id) => BODY_MAP[id]);
  const W = 960, H = 300;
  const factor = (refValue * UNIT_KM[refUnit]) / (BODY_MAP[refBody].physical.meanRadiusKm * 2); // model km per real km
  const sunModel = BODY_MAP.sun.physical.meanRadiusKm * 2 * factor, earthModel = BODY_MAP.earth.physical.meanRadiusKm * 2 * factor, distModel = AU_KM * factor;
  const maxA = Math.max(...defs.map((d) => d.physical.semiMajorAxisAu ?? 0), 0.4);
  const xOf = (au: number): number => {
    if (log) { const lo = Math.log10(0.3), hi = Math.log10(maxA * 1.1); return 60 + ((Math.log10(Math.max(0.3, au)) - lo) / (hi - lo)) * (W - 120); }
    return 60 + (au / (maxA * 1.05)) * (W - 120);
  };
  let stage: JSX.Element;
  if (view === 'sizes') {
    const sizeDefs = defs.filter((d) => d.id !== 'sun' || includeSun);
    const maxR = Math.max(...sizeDefs.map((d) => d.physical.meanRadiusKm));
    const total = sizeDefs.reduce((s, d) => s + d.physical.meanRadiusKm * 2, 0);
    const px = Math.min((W - 60) / total, (H * 0.8) / (maxR * 2));
    let x = 30;
    const barKm = includeSun ? 500000 : 50000;
    stage = (
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('scalelab.sizes')}>
        {sizeDefs.map((d) => { const r = d.physical.meanRadiusKm * px; const cx = x + r; x += r * 2 + 6; return (
          <g key={d.id}>
            <circle cx={cx} cy={H / 2 - 10} r={Math.max(r, 0.6)} fill={d.appearance.color} stroke={r < 1.5 ? d.appearance.color : 'none'} stroke-opacity="0.5" stroke-width={r < 1.5 ? 6 : 0} />
            <text x={cx} y={H - 26} text-anchor="middle" fill="#e8ecf3" font-size="12">{bodyName(d.id)}</text>
            <text x={cx} y={H - 10} text-anchor="middle" fill="#aeb8ca" font-size="10">{fmtKm(d.physical.meanRadiusKm * 2, { compact: true })}</text>
          </g>); })}
        <g transform={`translate(${W - 40 - barKm * px}, 22)`}><line x1={0} x2={barKm * px} y1={0} y2={0} stroke="#aeb8ca" stroke-width="2" /><line x1={0} x2={0} y1={-4} y2={4} stroke="#aeb8ca" /><line x1={barKm * px} x2={barKm * px} y1={-4} y2={4} stroke="#aeb8ca" /><text x={barKm * px / 2} y={-8} text-anchor="middle" fill="#aeb8ca" font-size="11">{t('scalelab.scaleBar')}: {fmtKm(barKm, { compact: true })}</text></g>
      </svg>
    );
  } else if (view === 'distances') {
    const ticks = log ? [0.3, 1, 3, 10, 30, 100].filter((v) => v <= maxA * 1.1) : Array.from({ length: 7 }, (_, i) => (maxA / 6) * i);
    stage = (
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('scalelab.distances')}>
        <line x1={60} x2={W - 60} y1={H / 2} y2={H / 2} stroke="#3a4560" stroke-width="2" />
        {ticks.map((v) => <g key={v}><line x1={xOf(v)} x2={xOf(v)} y1={H / 2 - 6} y2={H / 2 + 6} stroke="#6f7c94" /><text x={xOf(v)} y={H / 2 + 24} text-anchor="middle" fill="#aeb8ca" font-size="11">{fmtNumber(v, v < 1 ? 1 : 0)} {t('unit.au')}</text></g>)}
        <circle cx={xOf(0)} cy={H / 2} r={9} fill={BODY_MAP.sun.appearance.color} /><text x={xOf(0)} y={H / 2 - 18} text-anchor="middle" fill="#e8ecf3" font-size="11">{bodyName('sun')}</text>
        {defs.filter((d) => d.id !== 'sun' && d.physical.semiMajorAxisAu).map((d, i) => { const x = xOf(d.physical.semiMajorAxisAu!); const up = i % 2 === 0; return (
          <g key={d.id}><circle cx={x} cy={H / 2} r={5} fill={d.appearance.color} /><line x1={x} x2={x} y1={H / 2 + (up ? -8 : 8)} y2={H / 2 + (up ? -40 - (i % 4) * 14 : 40 + (i % 4) * 14)} stroke="#4a5670" />
            <text x={x} y={H / 2 + (up ? -46 - (i % 4) * 14 : 54 + (i % 4) * 14)} text-anchor="middle" fill="#e8ecf3" font-size="11">{bodyName(d.id)} · {fmtAu(d.physical.semiMajorAxisAu!)}</text></g>); })}
      </svg>
    );
  } else {
    // combined: one scale for radii and distances (sun radius visible, planets sub-pixel)
    const unitsPerAu = (W - 120) / (maxA * 1.05);
    const sunR = (BODY_MAP.sun.physical.meanRadiusKm / AU_KM) * unitsPerAu;
    stage = (
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('scalelab.combined')}>
        <line x1={60} x2={W - 60} y1={H / 2} y2={H / 2} stroke="#3a4560" stroke-width="1" />
        <circle cx={60} cy={H / 2} r={Math.max(sunR, 0.5)} fill={BODY_MAP.sun.appearance.color} /><text x={60} y={H / 2 - 16} text-anchor="middle" fill="#e8ecf3" font-size="11">{bodyName('sun')} · r={fmtNumber(sunR, 2)} px</text>
        {defs.filter((d) => d.id !== 'sun' && d.physical.semiMajorAxisAu).map((d, i) => { const x = 60 + d.physical.semiMajorAxisAu! * unitsPerAu; const r = (d.physical.meanRadiusKm / AU_KM) * unitsPerAu; const up = i % 2 === 0; return (
          <g key={d.id}><circle cx={x} cy={H / 2} r={Math.max(r, 0.4)} fill={d.appearance.color} /><rect x={x - 5} y={H / 2 - 5} width={10} height={10} fill="none" stroke={d.appearance.color} stroke-dasharray="2 2" />
            <text x={x} y={H / 2 + (up ? -30 - (i % 4) * 14 : 40 + (i % 4) * 14)} text-anchor="middle" fill="#e8ecf3" font-size="11">{bodyName(d.id)} · {r < 0.5 ? `<1 px` : `${fmtNumber(r, 2)} px`}</text></g>); })}
      </svg>
    );
  }
  return (
    <Workspace title={t('scalelab.title')} icon="expand" footer={<span className="muted">{t('scale.explain.physics')}</span>}>
      <div className="tool-split">
        <div className="stack">
          <div className="card">
            <Seg label={t('scalelab.title')} value={view} onChange={setView} options={[{ value: 'sizes', label: t('scalelab.sizes') }, { value: 'distances', label: t('scalelab.distances') }, { value: 'combined', label: t('scalelab.combined') }]} />
            {view === 'sizes' && <Switch label={t('scalelab.includeSun')} checked={includeSun} onChange={setIncludeSun} />}
            {view === 'distances' && <Switch label={t('common.logarithmic')} checked={log} onChange={setLog} desc={log ? t('scalelab.axisLog') : t('scalelab.axisLinear')} />}
            {view !== 'sizes' && <Switch label={t('scalelab.zoomSubset')} checked={subset} onChange={setSubset} />}
            <p className="muted" style={{ marginBottom: 0 }}>{view === 'combined' ? t('scalelab.combinedNote') : t('scalelab.semiMajor')}</p>
          </div>
          <div className="card">
            <h3>{t('scalelab.ifEarth')}</h3>
            <div className="field"><label htmlFor="sl-ref">{t('scalelab.referenceBody')}</label>
              <select id="sl-ref" value={refBody} onChange={(e) => setRefBody((e.target as HTMLSelectElement).value as BodyId)}>{CANDIDATES.map((id) => <option key={id} value={id}>{bodyName(id)}</option>)}</select></div>
            <div className="field"><label htmlFor="sl-val">{t('scalelab.referenceDiameter')}</label>
              <div className="row"><input id="sl-val" type="number" min={0.1} step={1} value={refValue} onInput={(e) => setRefValue(Math.max(0.01, Number((e.target as HTMLInputElement).value) || 1))} style={{ width: 100 }} />
                <select value={refUnit} onChange={(e) => setRefUnit((e.target as HTMLSelectElement).value as Unit)} aria-label={t('common.units')}>{(['mm', 'cm', 'm', 'km'] as Unit[]).map((u) => <option key={u} value={u}>{t(`scalelab.unit.${u}`)}</option>)}</select></div></div>
            <Note>{t('scalelab.emptiness', { sun: fmtModelLength(sunModel), earth: fmtModelLength(earthModel), dist: fmtModelLength(distModel) })}</Note>
          </div>
          <div className="card">
            <h3>{t('scale.explain.title')}</h3>
            <p className="muted" style={{ margin: 0 }}>{S.prefs.value.scaleMode === 'exploration' ? t('scale.short.exploration') : t('scale.short.relative')}</p>
            <Btn small style={{ marginTop: 8 }} icon="swap" label={t('actions.toggleScale')} onClick={() => { app.setScaleMode(S.prefs.value.scaleMode === 'exploration' ? 'relative' : 'exploration'); app.checklist('inspectScale'); }} />
          </div>
        </div>
        <div className="stack">
          <div className="tool-stage" style={{ height: H, flex: 'none' }}>{stage}</div>
          {view === 'combined' && <p className="muted"><Badge kind="caution">{t('scalelab.locator')}</Badge></p>}
          <div className="table-wrap card" style={{ padding: 0 }}>
            <table className="data" aria-label={t('scalelab.table')}>
              <thead><tr><th>{t('scalelab.body')}</th><th><Term id="diameter">{t('field.meanDiameter')}</Term></th><th>{t('scalelab.diameterScaled')}</th><th><Term id="au">{t('field.semiMajorAxis')}</Term></th><th>{t('scalelab.distanceScaled')}</th></tr></thead>
              <tbody>{CANDIDATES.map((id) => { const d = BODY_MAP[id]; const a = d.physical.semiMajorAxisAu; return (
                <tr key={id}><th scope="row">{bodyName(id)}{id === refBody && <> <Badge kind="accent">{t('common.reference')}</Badge></>}</th><td>{fmtKm(d.physical.meanRadiusKm * 2)}</td><td>{fmtModelLength(d.physical.meanRadiusKm * 2 * factor)}</td><td>{a ? fmtAu(a) : '—'}</td><td>{a ? fmtModelLength(a * AU_KM * factor) : '—'}</td></tr>); })}</tbody>
            </table>
          </div>
        </div>
      </div>
    </Workspace>
  );
}
