import type { JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import * as S from '../../state/store';
import { app, bodyName, measureState, pickRequest } from '../../app/controller';
import type { MeasureHistoryItem } from '../../app/controller';
import { clock } from '../../state/store';
import { angularSeparation, measureDistance, splitDuration } from '../../sim/measure';
import { BODIES } from '../../data/bodies';
import { AU_KM } from '../../data/types';
import type { BodyId } from '../../data/types';
import { fmtAu, fmtDateTimeUtc, fmtDeg, fmtKm, fmtNumber, t } from '../../i18n';
import { copyText, downloadText } from '../../state/persistence';
import { Badge, Btn, Icon, Note, Switch, Term } from '../common';

const CANDIDATES = BODIES.filter((b) => b.level === 'simulated');

/** "8 min 19 s", "1 h 20 min", "5 dias 3 h" … */
export function lightPhrase(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  const d = splitDuration(seconds);
  if (d.days > 0) return `${d.days} ${t(d.days === 1 ? 'unit.day' : 'unit.days')} ${d.hours} ${t('unit.h')}`;
  if (d.hours > 0) return `${d.hours} ${t('unit.h')} ${d.minutes} ${t('unit.min')}`;
  if (d.minutes > 0) return `${d.minutes} ${t('unit.min')} ${Math.round(d.seconds)} ${t('unit.s')}`;
  return `${fmtNumber(d.seconds, 2)} ${t('unit.s')}`;
}

function BodySelect({ id, value, onChange, label }: { id: string; value: BodyId | null; onChange: (id: BodyId) => void; label: string }): JSX.Element {
  const picking = pickRequest.value?.label === id;
  return (
    <div className="field" style={{ marginBottom: 6 }}>
      <label htmlFor={id}>{label}</label>
      <div className="row">
        <select id={id} value={value ?? ''} onChange={(e) => onChange((e.target as HTMLSelectElement).value as BodyId)} style={{ flex: 1 }}>
          {!value && <option value="">—</option>}
          {CANDIDATES.map((b) => <option key={b.id} value={b.id}>{bodyName(b.id)}</option>)}
        </select>
        <Btn small icon="target" iconOnly label={t('measure.pickFromScene')} pressed={picking}
          onClick={() => { pickRequest.value = picking ? null : { label: id, onPick: onChange }; if (!picking) S.announce(t('measure.pickFromScene')); }} />
      </div>
    </div>
  );
}

export function Measure(): JSX.Element {
  void S.readoutMs.value; // re-render at readout cadence
  const ms = measureState.value;
  const set = (patch: Partial<typeof ms>) => { measureState.value = { ...measureState.value, ...patch }; };
  useEffect(() => {
    const unregister = app.registerLayer('measure', () => { if (pickRequest.value) { pickRequest.value = null; return; } app.closeTool(); });
    return () => { unregister(); pickRequest.value = null; if (app.scene) { app.scene.measure.a = null; app.scene.measure.b = null; app.scene.measure.pulseT = null; } };
  }, []);
  useEffect(() => { if (app.scene) { app.scene.measure.a = ms.a; app.scene.measure.b = ms.b; } }, [ms.a, ms.b]);
  const state = app.scene?.state;
  const m = state && ms.a && ms.b ? measureDistance(state, ms.a, ms.b, clock.jd) : null;
  const shownKm = m?.valid ? (ms.showSurface ? m.surfaceKm : m.centerKm) : NaN;
  const ang = state && ms.a && ms.c ? angularSeparation(state, ms.observer, ms.a, ms.c) : null;
  const frozen = ms.frozen;
  const delta = frozen && m?.valid ? m.centerKm - frozen.km : null;
  const sendPulse = () => {
    if (!m?.valid) return;
    const durationS = Math.min(8, Math.max(1.5, Math.log10(m.lightSeconds + 1) * 2.2));
    set({ pulse: { startedAt: performance.now(), durationS, lightS: m.lightSeconds } });
  };
  const addHistory = () => {
    if (!m?.valid || !ms.a || !ms.b) return;
    const item: MeasureHistoryItem = { id: `${Date.now()}`, label: `${bodyName(ms.a)} → ${bodyName(ms.b)}`, km: m.centerKm, lightS: m.lightSeconds, simMs: clock.simMs, createdAt: Date.now() };
    set({ history: [item, ...ms.history].slice(0, 20) });
    S.toast(t('toast.saved'), 'success');
  };
  const csv = () => ['label;km;au;light_seconds;sim_utc', ...ms.history.map((h) => `${h.label};${h.km.toFixed(0)};${(h.km / AU_KM).toFixed(6)};${h.lightS.toFixed(2)};${new Date(h.simMs).toISOString()}`)].join('\n');
  const valuesText = m?.valid ? `${bodyName(ms.a!)} → ${bodyName(ms.b!)}: ${fmtKm(m.centerKm)} (${fmtAu(m.au)}), ${t('measure.lightTime')} ${lightPhrase(m.lightSeconds)} — ${fmtDateTimeUtc(clock.simMs)}` : '';
  return (
    <section className="tool overlay-tool" role="region" aria-label={t('measure.title')}>
      <div className="panel-header"><Icon name="ruler" /><h2>{t('measure.title')}</h2><Btn icon="close" iconOnly variant="ghost" label={t('common.close')} onClick={() => app.closeTool()} /></div>
      <div className="panel-body stack">
        {pickRequest.value && <Note>{t('measure.pickFromScene')} ({pickRequest.value.label === 'ms-a' ? t('measure.from') : t('measure.to')}).</Note>}
        <div className="card">
          <BodySelect id="ms-a" value={ms.a} label={t('measure.from')} onChange={(id) => set({ a: id, frozen: null })} />
          <div className="row" style={{ justifyContent: 'center' }}><Btn small variant="ghost" icon="swap" label={t('measure.swap')} onClick={() => set({ a: ms.b, b: ms.a })} /></div>
          <BodySelect id="ms-b" value={ms.b} label={t('measure.to')} onChange={(id) => set({ b: id, frozen: null })} />
          <div className="row" style={{ marginTop: 4 }}>
            <Btn small onClick={() => set({ a: 'sun', b: 'earth', frozen: null })}>{bodyName('sun')} → {bodyName('earth')}</Btn>
            <Btn small onClick={() => set({ a: 'earth', b: 'moon', frozen: null })}>{bodyName('earth')} → {bodyName('moon')}</Btn>
            <Btn small onClick={() => set({ a: 'earth', b: 'mars', frozen: null })}>{bodyName('earth')} → {bodyName('mars')}</Btn>
          </div>
        </div>
        {m && !m.valid && <Note kind="caution">{t('measure.invalid')}</Note>}
        {m?.valid && (
          <div className="card">
            <div className="row between" style={{ marginBottom: 6 }}><Badge kind={frozen ? 'warm' : 'accent'}>{frozen ? t('measure.frozen') : t('measure.live')}</Badge><span className="muted num">{fmtDateTimeUtc(clock.simMs)}</span></div>
            <div className="kv" style={{ margin: 0 }}>
              <div className="k"><Term id="au">{ms.showSurface ? t('measure.surfaceDistance') : t('measure.centerDistance')}</Term></div>
              <div className="v num">{fmtKm(shownKm)}<div className="muted" style={{ fontSize: '0.82em' }}>{fmtAu(shownKm / AU_KM)}</div></div>
              <div className="k"><Term id="light-time">{t('measure.lightTime')}</Term></div><div className="v num">{lightPhrase(m.lightSeconds)}</div>
            </div>
            <Switch label={t('measure.surfaceDistance')} checked={ms.showSurface} onChange={(v) => set({ showSurface: v })} />
            <div className="row" style={{ marginTop: 6 }}>
              <Btn small icon="play" label={t('measure.fire')} onClick={sendPulse} disabled={!!ms.pulse} />
              <Btn small icon={frozen ? 'refresh' : 'freeze'} label={frozen ? t('measure.unfreeze') : t('measure.freeze')} onClick={() => set({ frozen: frozen ? null : { a: ms.a!, b: ms.b!, simMs: clock.simMs, km: m.centerKm, lightS: m.lightSeconds } })} />
              <Btn small icon="bookmark" label={t('measure.addToHistory')} onClick={addHistory} />
              <Btn small icon="copy" iconOnly label={t('measure.copyValue')} onClick={async () => { S.toast((await copyText(valuesText)) ? t('toast.copied') : t('common.copyFailed'), 'info'); }} />
            </div>
            {ms.pulse && <p className="muted" style={{ marginTop: 6 }}>{t('measure.pulse')}: {t('measure.pulseNote', { factor: fmtNumber(ms.pulse.lightS / ms.pulse.durationS, 0) })}</p>}
            {frozen && delta !== null && (
              <div className="note info" style={{ marginTop: 8 }}>
                <strong>{t('measure.measuredAt')} {fmtDateTimeUtc(frozen.simMs)}</strong><br />
                {fmtKm(frozen.km)} · {lightPhrase(frozen.lightS)}<br />
                <span className="muted">{t('measure.delta')}: {delta >= 0 ? '+' : '−'}{fmtKm(Math.abs(delta))}</span>
              </div>
            )}
          </div>
        )}
        <div className="card">
          <h3><Term id="angular-size">{t('measure.angular')}</Term></h3>
          <div className="field"><label htmlFor="ms-obs">{t('measure.observer')}</label>
            <select id="ms-obs" value={ms.observer} onChange={(e) => set({ observer: (e.target as HTMLSelectElement).value as BodyId })}>{CANDIDATES.map((b) => <option key={b.id} value={b.id}>{bodyName(b.id)}</option>)}</select></div>
          <div className="field"><label htmlFor="ms-c">{t('measure.secondTarget')}</label>
            <select id="ms-c" value={ms.c} onChange={(e) => set({ c: (e.target as HTMLSelectElement).value as BodyId })}>{CANDIDATES.map((b) => <option key={b.id} value={b.id}>{bodyName(b.id)}</option>)}</select></div>
          {ang && (ang.valid
            ? <p className="num" style={{ margin: 0 }}>{t('measure.angularResult', { a: bodyName(ms.a!), b: bodyName(ms.c), obs: bodyName(ms.observer), deg: fmtDeg(ang.degrees, 2) })}</p>
            : <Note kind="caution">{ang.reason === 'observer-is-target' ? t('measure.degenerate') : t('measure.invalid')}</Note>)}
          <p className="muted" style={{ marginBottom: 0 }}>{t('measure.angularNote')}</p>
        </div>
        {ms.history.length > 0 && (
          <div className="card">
            <div className="row between"><h3 style={{ margin: 0 }}>{t('measure.history')} <Badge>{ms.history.length}</Badge></h3>
              <div className="row">
                <Btn small iconOnly icon="download" label={t('measure.exportCsv')} onClick={() => downloadText('medicoes.csv', csv(), 'text/csv')} />
                <Btn small iconOnly icon="copy" label={t('common.copy')} onClick={async () => { S.toast((await copyText(csv())) ? t('toast.copied') : t('common.copyFailed'), 'info'); }} />
                <Btn small iconOnly icon="trash" label={t('measure.clearHistory')} onClick={() => set({ history: [] })} />
              </div></div>
            {ms.history.map((h) => <div key={h.id} className="list-item" style={{ padding: '4px 6px' }}><span className="grow"><span className="name">{h.label}</span><span className="meta">{fmtKm(h.km)} · {lightPhrase(h.lightS)} · {fmtDateTimeUtc(h.simMs)}</span></span></div>)}
          </div>
        )}
        <p className="muted" style={{ margin: 0 }}>{t('measure.lineNote')}</p>
      </div>
    </section>
  );
}
