import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { app, bodyName } from '../../app/controller';
import type { BodyId } from '../../data/types';
import { AU_KM, C_KM_S } from '../../data/types';
import { fmtAu, fmtNumber, t } from '../../i18n';
import { Badge, Btn, Note, Seg } from '../common';
import { lightPhrase } from './Measure';
import { Workspace } from './ToolRouter';

interface Stage { key: string; au: number; auMax?: number; text: string; body?: BodyId; schematicOnly?: boolean }
const STAGES: Stage[] = [
  { key: 'neptune', au: 30.07, text: 'beyond.neptuneText', body: 'neptune' },
  { key: 'kuiper', au: 30, auMax: 50, text: 'beyond.kuiperText', body: 'kuiper-belt' as BodyId },
  { key: 'dwarfs', au: 39.5, auMax: 97.5, text: 'beyond.dwarfsText', body: 'eris' },
  { key: 'heliopause', au: 120, text: 'beyond.heliopauseText' },
  { key: 'voyager', au: 165, text: 'beyond.voyagerText' },
  { key: 'oort', au: 2000, auMax: 100000, text: 'beyond.oortText', body: 'oort-cloud' as BodyId, schematicOnly: true },
  { key: 'nearestStar', au: 268000, text: 'beyond.proximaText' },
];
type Axis = 'linear' | 'log' | 'schematic';

export function Beyond(): JSX.Element {
  const [i, setI] = useState(0);
  const [axis, setAxis] = useState<Axis>('log');
  const st = STAGES[i];
  const W = 960, H = 200;
  const maxAu = st.auMax ?? st.au;
  const domainMax = axis === 'linear' ? Math.max(maxAu * 1.15, 1) : 400000;
  const xOf = (au: number): number => {
    if (axis === 'schematic') return 60 + (STAGES.findIndex((s) => s.au >= au) / (STAGES.length - 1)) * (W - 120);
    if (axis === 'log') return 60 + ((Math.log10(Math.max(0.3, au)) - Math.log10(0.3)) / (Math.log10(domainMax) - Math.log10(0.3))) * (W - 120);
    return 60 + (au / domainMax) * (W - 120);
  };
  const ticks = axis === 'log' ? [1, 10, 100, 1000, 10000, 100000] : axis === 'linear' ? Array.from({ length: 6 }, (_, k) => Math.round((domainMax / 5) * k)) : [];
  const planets: { id: BodyId; au: number }[] = [{ id: 'earth', au: 1 }, { id: 'jupiter', au: 5.2 }, { id: 'saturn', au: 9.5 }, { id: 'uranus', au: 19.2 }, { id: 'neptune', au: 30.07 }];
  const lightS = (st.au * AU_KM) / C_KM_S;
  const canShow = st.body && !st.schematicOnly;
  return (
    <Workspace title={t('beyond.title')} icon="globe" footer={<><Btn small icon="back" label={t('common.previous')} disabled={i === 0} onClick={() => setI(i - 1)} /><span className="muted">{t('beyond.stage', { n: i + 1, total: STAGES.length })}</span><Btn small icon="forward" label={t('common.next')} disabled={i === STAGES.length - 1} onClick={() => setI(i + 1)} variant="primary" /></>}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>{t('beyond.intro')} {t('beyond.origin')}: {bodyName('sun')}.</p>
        <div className="row between">
          <div className="row" role="tablist" aria-label={t('beyond.title')}>{STAGES.map((s, k) => <Btn key={s.key} small pressed={k === i} onClick={() => setI(k)}>{t(`beyond.stage.${s.key}`)}</Btn>)}</div>
          <Seg label={t('common.axis')} value={axis} onChange={setAxis} options={[{ value: 'linear', label: t('common.linear') }, { value: 'log', label: t('common.logarithmic') }, { value: 'schematic', label: t('common.schematic') }]} />
        </div>
        <div className="tool-stage" style={{ height: H, flex: 'none' }}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('beyond.scaleRuler')}>
            <line x1={60} x2={W - 60} y1={H / 2} y2={H / 2} stroke="#3a4560" stroke-width="2" />
            {ticks.filter((v) => v <= domainMax).map((v) => <g key={v}><line x1={xOf(v)} x2={xOf(v)} y1={H / 2 - 6} y2={H / 2 + 6} stroke="#6f7c94" /><text x={xOf(v)} y={H / 2 + 22} text-anchor="middle" fill="#aeb8ca" font-size="11">{fmtNumber(v, 0)} {t('unit.au')}</text></g>)}
            <circle cx={60} cy={H / 2} r={7} fill="#ffd27a" />
            {axis !== 'schematic' && planets.filter((p) => p.au <= domainMax).map((p, k) => <g key={p.id}><circle cx={xOf(p.au)} cy={H / 2} r={3} fill="#9fb3d9" /><text x={xOf(p.au)} y={H / 2 - 12 - (k % 2) * 12} text-anchor="middle" fill="#aeb8ca" font-size="10">{bodyName(p.id)}</text></g>)}
            {STAGES.map((s, k) => {
              const x0 = xOf(s.au), x1 = s.auMax ? xOf(Math.min(s.auMax, domainMax)) : x0;
              if (s.au > domainMax && axis === 'linear') return null;
              return (
                <g key={s.key} opacity={k === i ? 1 : 0.45}>
                  {s.auMax && <rect x={x0} y={H / 2 - 10} width={Math.max(2, x1 - x0)} height={20} fill={k === i ? '#6fe0a8' : '#6f7c94'} opacity="0.35" />}
                  <line x1={x0} x2={x0} y1={H / 2 - 14} y2={H / 2 + 14} stroke={k === i ? '#6fe0a8' : '#6f7c94'} stroke-width={k === i ? 3 : 1.5} />
                  <text x={x0} y={H / 2 + 44 + (k % 3) * 14} text-anchor="middle" fill={k === i ? '#e8ecf3' : '#aeb8ca'} font-size="11">{t(`beyond.stage.${s.key}`)}</text>
                </g>
              );
            })}
            <text x={W / 2} y={H - 8} text-anchor="middle" fill="#aeb8ca" font-size="11">{t(`beyond.axisNote.${axis}`)}</text>
          </svg>
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>{t(`beyond.stage.${st.key}`)} {st.schematicOnly && <Badge kind="caution">{t('common.schematic')}</Badge>}</h3>
            <p style={{ marginTop: 0 }}>{t(st.text)}</p>
            <div className="kv" style={{ margin: 0 }}>
              <div className="k">{t('beyond.compareUnits')}</div><div className="v num">{st.auMax ? `${fmtAu(st.au)} – ${fmtAu(st.auMax)}` : fmtAu(st.au)} · {fmtNumber(st.au * AU_KM / 1e6, 0)} {t('unit.millionKm')}</div>
              <div className="k">{t('beyond.lightTime')}</div><div className="v num">{lightPhrase(lightS)}{st.auMax ? ` – ${lightPhrase((st.auMax * AU_KM) / C_KM_S)}` : ''}</div>
            </div>
            {canShow && <Btn small style={{ marginTop: 10 }} icon="focus" label={t('beyond.showInScene')} onClick={() => { app.closeTool(); if (st.body) app.select(st.body, { focus: true }); }} />}
            {st.body && st.schematicOnly && <Btn small style={{ marginTop: 10 }} icon="eye" label={t('beyond.showInScene')} onClick={() => { app.closeTool(); if (st.body) app.select(st.body); }} />}
          </div>
          <div className="stack">
            <Note>{t('beyond.reveal')}</Note>
            <Note kind="caution">{t('beyond.noEdge')}</Note>
          </div>
        </div>
      </div>
    </Workspace>
  );
}
