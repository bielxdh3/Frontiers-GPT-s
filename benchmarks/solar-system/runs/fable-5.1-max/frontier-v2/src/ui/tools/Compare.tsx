import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
import * as S from '../../state/store';
import { app, bodyName, compareState } from '../../app/controller';
import { BODIES, BODY_MAP } from '../../data/bodies';
import type { BodyDef, BodyId } from '../../data/types';
import { AU_KM } from '../../data/types';
import { fmtAu, fmtDays, fmtDeg, fmtHours, fmtKm, fmtNumber, fmtSci, fmtTempK, t } from '../../i18n';
import { copyText, downloadText } from '../../state/persistence';
import { Badge, BodyThumb, Btn, Note, Switch, Term } from '../common';
import { Workspace } from './ToolRouter';

interface Field { key: string; label: string; term?: string; value: (d: BodyDef) => number | undefined; fmt: (v: number) => string; ratio?: boolean }

const FIELDS: Field[] = [
  { key: 'diameter', label: 'field.meanDiameter', term: 'diameter', value: (d) => d.physical.meanRadiusKm * 2 || undefined, fmt: (v) => fmtKm(v), ratio: true },
  { key: 'mass', label: 'field.mass', term: 'mass', value: (d) => d.physical.massKg, fmt: (v) => `${fmtSci(v)} kg`, ratio: true },
  { key: 'density', label: 'field.density', term: 'density', value: (d) => d.physical.densityGcm3, fmt: (v) => `${fmtNumber(v, 2)} g/cm³`, ratio: true },
  { key: 'gravity', label: 'field.gravity', term: 'gravity', value: (d) => d.physical.gravityMs2, fmt: (v) => `${fmtNumber(v, 2)} m/s²`, ratio: true },
  { key: 'escape', label: 'field.escapeVelocity', value: (d) => d.physical.escapeVelocityKms, fmt: (v) => `${fmtNumber(v, 2)} km/s`, ratio: true },
  { key: 'period', label: 'field.orbitalPeriod', term: 'revolution', value: (d) => d.physical.orbitalPeriodDays, fmt: (v) => fmtDays(v), ratio: true },
  { key: 'rotation', label: 'field.rotationPeriod', term: 'rotation', value: (d) => (d.rotation ? Math.abs(d.rotation.periodHours) : undefined), fmt: (v) => fmtHours(v), ratio: true },
  { key: 'solarDay', label: 'field.solarDay', term: 'solar-day', value: (d) => d.physical.solarDayHours, fmt: (v) => fmtHours(v), ratio: true },
  { key: 'tilt', label: 'field.axialTilt', term: 'axial-tilt', value: (d) => d.physical.axialTiltDeg, fmt: (v) => fmtDeg(v, 1) },
  { key: 'temp', label: 'field.temperature', value: (d) => d.physical.tempMeanK, fmt: (v) => fmtTempK(v, S.prefs.value.tempUnit), ratio: true },
  { key: 'sma', label: 'field.semiMajorAxis', term: 'au', value: (d) => d.physical.semiMajorAxisAu, fmt: (v) => (v < 0.05 ? fmtKm(v * AU_KM, { compact: true }) : fmtAu(v)), ratio: true },
  { key: 'ecc', label: 'field.eccentricity', term: 'eccentricity', value: (d) => d.physical.eccentricity, fmt: (v) => fmtNumber(v, 4) },
  { key: 'moons', label: 'field.knownMoons', value: (d) => d.physical.knownMoons, fmt: (v) => String(v) },
];

const PRESETS: { label: string; ids: BodyId[] }[] = [
  { label: 'Terra · Marte', ids: ['earth', 'mars'] }, { label: 'Terra · Lua', ids: ['earth', 'moon'] }, { label: 'Júpiter · Saturno', ids: ['jupiter', 'saturn'] },
  { label: 'Sol · Júpiter · Terra', ids: ['sun', 'jupiter', 'earth'] }, { label: 'Ganimedes · Titã · Lua · Mercúrio', ids: ['ganymede', 'titan', 'moon', 'mercury'] }, { label: 'Plutão · Caronte · Éris', ids: ['pluto', 'charon', 'eris'] },
];

const CANDIDATES = BODIES.filter((b) => b.level === 'simulated');

export function Compare(): JSX.Element {
  const cs = compareState.value;
  const set = (patch: Partial<typeof cs>) => { compareState.value = { ...cs, ...patch }; };
  const [addId, setAddId] = useState<BodyId | ''>('');
  const svgRef = useRef<SVGSVGElement>(null);
  const ids = cs.ids.filter((id) => BODY_MAP[id]);
  const ref = ids.includes(cs.reference) ? cs.reference : ids[0];
  const defs = ids.map((id) => BODY_MAP[id]);
  const maxR = Math.max(...defs.map((d) => d.physical.meanRadiusKm));
  const minR = Math.min(...defs.map((d) => d.physical.meanRadiusKm));
  const W = 900, H = 340, pad = 40;
  const slot = (W - pad * 2) / Math.max(1, ids.length);
  const maxDisc = Math.min(slot * 0.42, 130);
  const rad = (d: BodyDef): number => {
    if (cs.log) { const lo = Math.log10(Math.max(1, minR)) - 0.5, hi = Math.log10(maxR); return 14 + ((Math.log10(Math.max(1, d.physical.meanRadiusKm)) - lo) / Math.max(0.01, hi - lo)) * (maxDisc - 14); }
    return Math.max(1, (d.physical.meanRadiusKm / maxR) * maxDisc);
  };
  const add = (id: BodyId) => { if (ids.length >= 4) { S.toast(t('compare.max'), 'warning'); return; } if (!ids.includes(id)) set({ ids: [...ids, id] }); app.checklist('compareTwo'); };
  const remove = (id: BodyId) => set({ ids: ids.filter((x) => x !== id), reference: ref === id ? ids.find((x) => x !== id) ?? 'earth' : ref });
  const move = (id: BodyId, dir: -1 | 1) => { const i = ids.indexOf(id); const j = i + dir; if (j < 0 || j >= ids.length) return; const n = [...ids]; [n[i], n[j]] = [n[j], n[i]]; set({ ids: n }); };
  const csv = (): string => {
    const head = ['field', ...ids.map((id) => bodyName(id))].join(';');
    const rows = FIELDS.map((f) => [t(f.label), ...defs.map((d) => { const v = f.value(d); return v === undefined ? '' : String(v); })].join(';'));
    return [head, ...rows].join('\n');
  };
  const exportImage = async () => {
    const svg = svgRef.current; if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2;
      const ctx = cv.getContext('2d')!; ctx.fillStyle = '#0a0d16'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob((blob) => { if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'comparacao.png'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); });
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  };
  const refDef = BODY_MAP[ref];
  return (
    <Workspace title={t('compare.title')} icon="compare"
      footer={<>
        <Btn small icon="download" label={t('compare.exportCsv')} onClick={() => downloadText('comparacao.csv', csv(), 'text/csv')} />
        <Btn small icon="copy" label={t('common.copy')} onClick={async () => { S.toast((await copyText(csv())) ? t('compare.copied') : t('common.copyFailed'), 'info'); }} />
        <Btn small icon="camera" label={t('compare.exportImage')} onClick={() => void exportImage()} />
        <span className="muted">{t('compare.timeFrozen')}</span>
      </>}>
      <div className="tool-split">
        <div className="stack">
          <div className="card">
            <h3>{t('compare.title')} <Badge>{ids.length}/4</Badge></h3>
            {ids.map((id) => (
              <div key={id} className="list-item" style={{ padding: '4px 6px' }}>
                <BodyThumb id={id} />
                <span className="grow name" style={{ whiteSpace: 'normal' }}>{bodyName(id)} {id === ref && <Badge kind="accent">{t('compare.reference')}</Badge>}</span>
                <Btn small iconOnly variant="ghost" icon="back" label={t('compare.moveLeft')} onClick={() => move(id, -1)} disabled={ids.indexOf(id) === 0} />
                <Btn small iconOnly variant="ghost" icon="forward" label={t('compare.moveRight')} onClick={() => move(id, 1)} disabled={ids.indexOf(id) === ids.length - 1} />
                <Btn small iconOnly variant="ghost" icon="close" label={t('common.remove')} onClick={() => remove(id)} disabled={ids.length <= 1} />
              </div>
            ))}
            <div className="row" style={{ marginTop: 6 }}>
              <select value={addId} onChange={(e) => setAddId((e.target as HTMLSelectElement).value as BodyId)} aria-label={t('compare.addBody')} style={{ flex: 1 }}>
                <option value="">{t('compare.addBody')}…</option>
                {CANDIDATES.filter((b) => !ids.includes(b.id)).map((b) => <option key={b.id} value={b.id}>{bodyName(b.id)}</option>)}
              </select>
              <Btn small icon="plus" label={t('common.add')} disabled={!addId || ids.length >= 4} onClick={() => { if (addId) { add(addId); setAddId(''); } }} />
            </div>
            {ids.length < 2 && <Note kind="caution">{t('compare.min')}</Note>}
          </div>
          <div className="card">
            <div className="field">
              <label htmlFor="cmp-ref">{t('compare.reference')}</label>
              <select id="cmp-ref" value={ref} onChange={(e) => set({ reference: (e.target as HTMLSelectElement).value as BodyId })}>{ids.map((id) => <option key={id} value={id}>{bodyName(id)}</option>)}</select>
            </div>
            <Switch label={t('compare.log')} checked={cs.log} onChange={(v) => set({ log: v })} desc={cs.log ? t('compare.diameterChartLog') : t('compare.diameterChart')} />
            <Switch label={t('compare.syncRotation')} checked={cs.sync} onChange={(v) => set({ sync: v })} desc={t('compare.syncNote')} />
          </div>
          <div className="card">
            <h3>{t('compare.presets')}</h3>
            <div className="row">{PRESETS.map((p) => <Btn key={p.label} small onClick={() => set({ ids: p.ids, reference: p.ids[0] })}>{p.ids.map((id) => bodyName(id)).join(' · ')}</Btn>)}</div>
          </div>
        </div>
        <div className="stack" style={{ minHeight: 0 }}>
          <div className="tool-stage" style={{ height: `min(${H}px, 46vh)`, flex: 'none' }}>
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={cs.log ? t('compare.diameterChartLog') : t('compare.diameterChart')} xmlns="http://www.w3.org/2000/svg">
              <defs>{defs.map((d) => <radialGradient key={d.id} id={`g-${d.id}`} cx="38%" cy="35%" r="70%"><stop offset="0%" stop-color={d.kind === 'star' ? '#fff5dc' : '#ffffff'} stop-opacity={d.kind === 'star' ? 1 : 0.55} /><stop offset="45%" stop-color={d.appearance.color} /><stop offset="100%" stop-color={d.kind === 'star' ? d.appearance.color : '#050810'} /></radialGradient>)}</defs>
              <text x={W / 2} y={22} text-anchor="middle" fill="#aeb8ca" font-size="13">{cs.log ? t('compare.diameterChartLog') : t('compare.diameterChart')}</text>
              {defs.map((d, i) => {
                const r = rad(d); const cx = pad + slot * (i + 0.5), cy = H / 2 + 10;
                const rings = d.appearance.rings?.bands.filter((b) => b.opacity > 0.15);
                const outer = rings?.length ? Math.max(...rings.map((b) => b.outerKm)) / d.physical.meanRadiusKm : 0;
                return (
                  <g key={d.id}>
                    {outer > 0 && <ellipse cx={cx} cy={cy} rx={r * outer} ry={r * outer * 0.28} fill="none" stroke="#d9c9a8" stroke-opacity="0.55" stroke-width={Math.max(1, r * 0.25)} />}
                    <circle cx={cx} cy={cy} r={r} fill={`url(#g-${d.id})`} style={cs.sync ? { transformOrigin: `${cx}px ${cy}px`, animation: 'spin 8s linear infinite' } : undefined} />
                    {d.physical.meanRadiusKm / maxR < 0.004 && !cs.log && <circle cx={cx} cy={cy} r={8} fill="none" stroke={d.appearance.color} stroke-dasharray="2 2" />}
                    <text x={cx} y={H - 34} text-anchor="middle" fill="#e8ecf3" font-size="13" font-weight="600">{bodyName(d.id)}</text>
                    <text x={cx} y={H - 16} text-anchor="middle" fill="#aeb8ca" font-size="11">{fmtKm(d.physical.meanRadiusKm * 2, { compact: false })}{d.id !== ref ? ` · ${fmtNumber(d.physical.meanRadiusKm / refDef.physical.meanRadiusKm, 3)}×` : ''}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          {cs.log && <Note kind="caution">{t('compare.diameterChartLog')}</Note>}
          <div className="table-wrap card" style={{ padding: 0, flex: 'none' }}>
            <table className="data" aria-label={t('compare.title')}>
              <thead><tr><th>{t('compare.field')}</th>{defs.map((d) => <th key={d.id}>{bodyName(d.id)}{d.id === ref && <> <Badge kind="accent">{t('common.reference')}</Badge></>}</th>)}</tr></thead>
              <tbody>
                {FIELDS.map((f) => {
                  const rv = f.value(refDef);
                  return (
                    <tr key={f.key}>
                      <th scope="row">{f.term ? <Term id={f.term}>{t(f.label)}</Term> : t(f.label)}</th>
                      {defs.map((d) => {
                        const v = f.value(d);
                        const ratio = f.ratio && v !== undefined && rv !== undefined && rv !== 0 && d.id !== ref ? v / rv : undefined;
                        return <td key={d.id}>{v === undefined ? <span className="muted">{t('compare.inapplicable')}</span> : f.fmt(v)}{ratio !== undefined && <span className="sub" style={{ display: 'block', color: 'var(--text-3)', fontSize: '0.82em' }}>{t('compare.ratio')}: {fmtNumber(ratio, ratio < 0.01 ? 4 : 3)}×</span>}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted">{t('compare.tempRatioNote')} {t('lab.canonicalUnchanged')}</p>
        </div>
      </div>
    </Workspace>
  );
}
