import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import * as S from '../../state/store';
import { app } from '../../app/controller';
import { tourRun, tours } from '../../app/tours';
import { activities } from '../../app/activities';
import { audio } from '../../app/audio';
import { TOURS } from '../../content/tours';
import type { Tool } from '../../state/store';
import { t, tx } from '../../i18n';
import { collections } from '../../state/persistence';
import { encyclopediaTarget } from '../common';
import { Badge, Btn, Dialog, Icon, Note, Switch } from '../common';

/** Floating card shown while a guided tour is running. */
export function TourCard(): JSX.Element | null {
  const r = tourRun.value;
  const cur = tours.current;
  const [stopsOpen, setStopsOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  useEffect(() => app.registerLayer('tour', () => { if (stopsOpen) { setStopsOpen(false); return; } setConfirmExit(true); }), [stopsOpen]);
  if (!r || !cur) return null;
  const { tour, stop } = cur;
  const total = tour.stops.length;
  const pct = r.totalMs > 0 ? 1 - r.remainingMs / r.totalMs : 0;
  const narrationOk = audio.caps().speech;
  const deeper = stop.deeper;
  const runDeeper = () => {
    if (!deeper) return;
    if (deeper.kind === 'tool') app.openTool(deeper.id as Tool);
    else if (deeper.kind === 'activity') activities.start(deeper.id);
    else { encyclopediaTarget.value = deeper.id; app.openTool('encyclopedia'); }
  };
  return (
    <section className="tour-card" role="region" aria-label={t('tours.title')} aria-live="polite">
      <div className="row between">
        <div className="row" style={{ gap: 8 }}><Icon name="sparkle" size={16} /><strong>{tx(tour.title)}</strong><Badge>{t('tours.stop', { n: r.stop + 1, total })}</Badge>{r.status === 'paused' && <Badge kind="warm">{t('common.pause')}</Badge>}</div>
        <div className="row" style={{ gap: 4 }}>
          <Btn small iconOnly icon="list" label={t('tours.stopList')} pressed={stopsOpen} onClick={() => setStopsOpen((v) => !v)} />
          <Btn small iconOnly icon="close" label={t('common.exit')} onClick={() => setConfirmExit(true)} />
        </div>
      </div>
      {stopsOpen ? (
        <div style={{ maxHeight: '30vh', overflow: 'auto', margin: '8px 0' }}>
          {tour.stops.map((s, i) => <button key={s.id} type="button" className={`list-item ${i === r.stop ? 'is-selected' : ''}`} onClick={() => { tours.goTo(i); setStopsOpen(false); }}><span className="num muted" style={{ width: 22 }}>{i + 1}</span><span className="grow name">{tx(s.title)}</span>{r.visited.includes(i) && <Icon name="check" size={14} />}</button>)}
        </div>
      ) : (
        <>
          <h3 style={{ margin: '8px 0 4px' }}>{tx(stop.title)}</h3>
          <div className="text"><p style={{ margin: 0 }}>{tx(stop.text)}</p></div>
          {r.auto && r.status === 'playing' && <div className="progress" aria-hidden="true"><i style={{ width: `${Math.round(pct * 100)}%` }} /></div>}
          {r.status === 'suspended' && <Note>{t('tours.suspended')}</Note>}
          {r.status === 'paused' && S.activeTool.value && <Note>{t('tours.pausedByTool')}</Note>}
        </>
      )}
      {confirmExit ? (
        <div className="row between" style={{ marginTop: 8 }}>
          <span>{t('tours.exitConfirm')}</span>
          <div className="row"><Btn small label={t('common.cancel')} onClick={() => setConfirmExit(false)} /><Btn small variant="primary" label={t('common.exit')} onClick={() => { setConfirmExit(false); tours.exit(false); }} /></div>
        </div>
      ) : (
        <div className="row between" style={{ marginTop: 8 }}>
          <div className="row" style={{ gap: 4 }}>
            <Btn small iconOnly icon="stepBack" label={t('common.previous')} disabled={r.stop === 0} onClick={() => tours.prev()} />
            {r.status === 'playing' ? <Btn small iconOnly icon="pause" label={t('common.pause')} onClick={() => tours.pause()} /> : <Btn small iconOnly icon="play" label={t('common.resume')} variant="primary" onClick={() => tours.resume()} />}
            <Btn small icon="stepForward" label={r.stop + 1 >= total ? t('common.finish') : t('common.next')} variant={r.status === 'playing' ? 'primary' : 'default'} onClick={() => tours.next()} />
            <Btn small iconOnly icon="refresh" label={t('tours.restartStop')} onClick={() => tours.restartStop()} />
          </div>
          <div className="row" style={{ gap: 6 }}>
            {deeper && <Btn small icon="flask" label={`${t('tours.deeper')}: ${tx(deeper.label)}`} onClick={runDeeper} />}
            <label className="row muted" style={{ gap: 4, fontSize: '0.85em' }}><input type="checkbox" checked={r.auto} onChange={(e) => tours.setAuto((e.target as HTMLInputElement).checked)} /> {r.auto ? t('tours.auto') : t('tours.manual')}</label>
            <Btn small iconOnly icon={S.prefs.value.audio.narration && narrationOk ? 'speaker' : 'mute'} label={narrationOk ? t('tours.narration') : t('tours.narrationUnavailable')} pressed={S.prefs.value.audio.narration}
              onClick={() => { if (!narrationOk) { S.toast(t('tours.narrationUnavailable'), 'info'); return; } S.updatePrefs({ audio: { ...S.prefs.value.audio, narration: !S.prefs.value.audio.narration } }); }} />
          </div>
        </div>
      )}
    </section>
  );
}

/** Tour catalog dialog. */
export function ToursDialog(): JSX.Element {
  const done = collections.value.toursCompleted;
  const resume = collections.value.tourResume;
  return (
    <Dialog id="tours" title={t('tours.title')} onClose={() => app.closeTool()} wide>
      <div className="stack">
        {TOURS.map((tour) => {
          const idx = resume[tour.id];
          return (
            <div key={tour.id} className="card">
              <div className="row between">
                <div>
                  <h3 style={{ margin: '0 0 4px' }}>{tx(tour.title)} {done.includes(tour.id) && <Badge kind="accent">{t('tours.completedBefore')}</Badge>}</h3>
                  <p className="muted" style={{ margin: 0 }}>{tx(tour.goal)}</p>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85em' }}>{t('tours.duration', { n: tour.stops.length })} · ~{tour.minutes} min</p>
                </div>
                <div className="row">
                  {idx !== undefined && idx > 0 && <Btn small icon="play" label={t('tours.resumeFrom', { n: idx + 1 })} variant="primary" onClick={() => { app.closeTool(); tours.start(tour.id, idx); }} />}
                  <Btn small icon="sparkle" label={t('common.start')} variant={idx === undefined ? 'primary' : 'default'} onClick={() => { app.closeTool(); tours.start(tour.id, 0); }} />
                </div>
              </div>
            </div>
          );
        })}
        <Switch label={t('tours.narration')} checked={S.prefs.value.audio.narration} disabled={!audio.caps().speech} note={!audio.caps().speech ? t('tours.narrationUnavailable') : undefined} onChange={(v) => S.updatePrefs({ audio: { ...S.prefs.value.audio, narration: v } })} />
        <p className="muted" style={{ margin: 0 }}>{t('tours.settingsRestored')}</p>
      </div>
    </Dialog>
  );
}
