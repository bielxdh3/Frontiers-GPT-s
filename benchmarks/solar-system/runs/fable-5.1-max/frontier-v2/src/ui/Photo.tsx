import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import * as S from '../state/store';
import { app, bodyName, photoState } from '../app/controller';
import type { PhotoState } from '../app/controller';
import { clock } from '../state/store';
import { fmtDateTimeUtc, fmtNumber, t } from '../i18n';
import { newId, updateCollections } from '../state/persistence';
import { Btn, Icon, Range, Seg, Switch } from './common';

const CINEMATIC: { key: string; run: () => void }[] = [
  { key: 'earthTerminator', run: () => { app.select('earth', { silent: true }); app.preset('terminator'); } },
  { key: 'saturnRings', run: () => { app.select('saturn', { silent: true }); app.preset('low'); } },
  { key: 'jupiterMoons', run: () => { app.select('jupiter', { silent: true }); app.scene?.fitSystem('jupiter', { instant: S.reducedMotion.value }); } },
  { key: 'sunClose', run: () => { app.select('sun', { silent: true }); app.focus('sun', { zoom: 1.3 }); } },
  { key: 'plutoCharon', run: () => { app.select('pluto', { silent: true }); app.scene?.fitSystem('pluto', { instant: S.reducedMotion.value }); } },
];

/** Composition guides and aspect mask drawn over the scene in photo mode. */
export function PhotoOverlays(): JSX.Element {
  const ph = photoState.value;
  const vp = S.viewport.value;
  let mask: JSX.CSSProperties | undefined;
  if (ph.aspect !== 'free') {
    const [aw, ah] = ph.aspect.split(':').map(Number);
    const target = aw / ah, cur = vp.w / vp.h;
    const w = cur > target ? vp.h * target : vp.w, h = cur > target ? vp.h : vp.w / target;
    mask = { width: `${Math.round(w)}px`, height: `${Math.round(h)}px` };
  }
  return (
    <>
      {ph.guides && <div className="photo-guides" aria-hidden="true" />}
      {mask && <div className="aspect-mask" style={mask} aria-hidden="true" />}
    </>
  );
}

export function PhotoToolbar(): JSX.Element {
  const ph = photoState.value;
  const set = (patch: Partial<PhotoState>) => app.setPhoto(patch);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => app.registerLayer('photo', () => app.closeTool()), []);
  useEffect(() => {
    if (!ph.recording) { setElapsed(0); return; }
    const started = performance.now();
    const id = setInterval(() => setElapsed(Math.round((performance.now() - started) / 1000)), 500);
    return () => clearInterval(id);
  }, [ph.recording]);
  const capture = async () => { setBusy(true); await app.capture(); setBusy(false); };
  const download = () => {
    const r = ph.result; if (!r) return;
    try { const a = document.createElement('a'); a.href = r.url; a.download = `observatorio-${new Date(clock.simMs).toISOString().slice(0, 10)}.${r.kind === 'png' ? 'png' : 'webm'}`; document.body.appendChild(a); a.click(); a.remove(); } catch { S.toast(t('photo.blocked'), 'warning'); }
  };
  const journal = () => {
    const sel = S.selectedId.value;
    const ok = updateCollections((c) => ({ ...c, journal: [{ id: newId(), text: `${sel ? bodyName(sel) : t('photo.title')} — ${fmtDateTimeUtc(clock.simMs)}`, body: sel ?? undefined, simMs: clock.simMs, screenshotRef: t('coll.screenshotRef'), createdAt: Date.now(), updatedAt: Date.now() }, ...c.journal] }));
    app.persistToast(ok, t('toast.saved'));
  };
  return (
    <section className="photo-toolbar" role="region" aria-label={t('photo.title')}>
      <div className="row between">
        <div className="row" style={{ gap: 8 }}><Icon name="camera" size={16} /><strong>{t('photo.title')}</strong><span className="muted num">{fmtDateTimeUtc(clock.simMs)}</span></div>
        <div className="row">
          <Btn small icon="close" label={t('common.exit')} shortcut="Esc" onClick={() => app.closeTool()} />
        </div>
      </div>
      <div className="row">
        <div style={{ flex: '1 1 160px' }}><Range label={t('photo.fov')} value={ph.fov} min={15} max={90} step={1} onChange={(v) => set({ fov: v })} format={(v) => `${v}°`} /></div>
        <div style={{ flex: '1 1 160px' }}><Range label={t('photo.exposure')} value={ph.exposure} min={0.6} max={2} step={0.05} onChange={(v) => set({ exposure: v })} format={(v) => `${fmtNumber(v, 2)}×`} /></div>
        <div style={{ flex: '1 1 160px' }}><Range label={t('photo.background')} value={ph.background} min={0} max={1} step={0.05} onChange={(v) => set({ background: v })} format={(v) => `${Math.round(v * 100)}%`} /></div>
        <Seg label={t('photo.aspect')} value={ph.aspect} onChange={(v) => set({ aspect: v })} options={(['free', '16:9', '4:3', '1:1', '9:16'] as PhotoState['aspect'][]).map((a) => ({ value: a, label: a === 'free' ? t('common.none') : a }))} />
      </div>
      <div className="row">
        <Btn small pressed={ph.guides} icon="expand" label={t('photo.guides')} onClick={() => set({ guides: !ph.guides })} />
        <Btn small pressed={ph.labels} icon="label" label={t('photo.labels')} onClick={() => set({ labels: !ph.labels })} />
        <Btn small pressed={ph.orbits} icon="orbit" label={t('photo.orbits')} onClick={() => set({ orbits: !ph.orbits })} />
        <Btn small pressed={ph.freeze} icon={ph.freeze ? 'freeze' : 'play'} label={ph.freeze ? t('photo.freeze') : t('photo.keepMotion')} onClick={() => set({ freeze: !ph.freeze })} />
        <Btn small pressed={ph.caption} icon="edit" label={t('photo.caption')} onClick={() => set({ caption: !ph.caption })} />
        <Btn small pressed={ph.hires} icon="zoomIn" label={t('photo.hires')} onClick={() => set({ hires: !ph.hires })} />
        <div className="grow" />
        <select aria-label={t('photo.cinematic')} value="" onChange={(e) => { const k = (e.target as HTMLSelectElement).value; CINEMATIC.find((c) => c.key === k)?.run(); (e.target as HTMLSelectElement).value = ''; }}>
          <option value="">{t('photo.cinematic')}…</option>
          {CINEMATIC.map((c) => <option key={c.key} value={c.key}>{t(`camera.${c.key}`)}</option>)}
        </select>
      </div>
      <div className="row between">
        <div className="row">
          <Btn variant="primary" icon="camera" label={t('photo.capture')} disabled={busy} onClick={() => void capture()} />
          {app.recordingSupported()
            ? (ph.recording ? <Btn variant="danger" icon="stop" label={t('photo.stopRecording')} onClick={() => app.stopRecording()} /> : <Btn icon="record" label={t('photo.record')} onClick={() => { if (!app.startRecording(15)) S.toast(t('photo.recordUnsupported'), 'warning'); }} />)
            : <span className="muted" style={{ fontSize: '0.85em' }}>{t('photo.recordUnsupported')}</span>}
          {ph.recording && <span className="num" aria-live="polite">{t('photo.recording', { s: elapsed })}</span>}
        </div>
        {ph.result && (
          <div className="row" style={{ gap: 8 }}>
            {ph.result.kind === 'png' ? <img src={ph.result.url} alt={t('photo.result')} style={{ height: 44, borderRadius: 4, border: '1px solid var(--border)' }} /> : <video src={ph.result.url} controls style={{ height: 44 }} />}
            <span className="muted num">{ph.result.w}×{ph.result.h}</span>
            <Btn small icon="download" label={t('common.download')} onClick={download} />
            <Btn small icon="book" label={t('photo.saveJournal')} onClick={journal} />
          </div>
        )}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: '0.8em' }}>{t('photo.exitRestore')}</p>
    </section>
  );
}
