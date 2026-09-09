import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import * as S from '../state/store';
import { clock } from '../state/store';
import { app, bodyName } from '../app/controller';
import { BODY_MAP } from '../data/bodies';
import { DAY_S } from '../data/types';
import { EVENTS, resolveEventMs, type EventPreset } from '../content/events';
import { describeRate, MAX_RATE, RATE_PRESETS, STEP_SECONDS, type StepUnit } from '../sim/time';
import { periodDaysFromElements } from '../sim/kepler';
import { fmtDateTimeUtc, fmtIsoUtc, fmtNumber, parseIsoUtc, parseLocaleNumber, t, tx } from '../i18n';
import { collections, updateCollections, type Bookmark } from '../state/persistence';
import { Badge, Btn, EmptyState, ExternalLink, Icon, Seg } from './common';
import { Menu, MenuItem } from './Topbar';

/** Preset requested by an event for a laboratory (consumed by the lab on open). */
export const labPreset = signal<{ tool: S.Tool; preset: string } | null>(null);

const LOG_MIN = 0, LOG_MAX = Math.log10(MAX_RATE);
const rateToPos = (r: number): number => ((Math.log10(Math.max(1, r)) - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 1000;
const posToRate = (p: number): number => Math.pow(10, LOG_MIN + (p / 1000) * (LOG_MAX - LOG_MIN));

export function ratePhrase(rate: number): string {
  const d = describeRate(rate);
  const v = Math.round(d.value * 100) / 100;
  const unit = t(`time.rateUnit.${d.unit}${v === 1 ? '' : 's'}`);
  return t('time.ratePhrase', { value: fmtNumber(v, 2), unit });
}

function stepSeconds(unit: StepUnit, body: string | null): number | null {
  if (unit === 'rotation') { const def = body ? BODY_MAP[body as keyof typeof BODY_MAP] : null; return def?.rotation ? Math.abs(def.rotation.periodHours) * 3600 : null; }
  if (unit === 'orbit') {
    const def = body ? BODY_MAP[body as keyof typeof BODY_MAP] : null;
    if (!def) return null;
    if (def.orbit) return periodDaysFromElements(def.orbit) * DAY_S;
    if (def.satellite) return Math.abs(def.satellite.periodDays) * DAY_S;
    if (def.physical.orbitalPeriodDays) return def.physical.orbitalPeriodDays * DAY_S;
    return null;
  }
  return STEP_SECONDS[unit];
}

function DateEditor({ close }: { close: () => void }): JSX.Element {
  const [val, setVal] = useState(fmtIsoUtc(clock.simMs));
  const [bad, setBad] = useState(false);
  const apply = () => {
    const ms = parseIsoUtc(val);
    if (!Number.isFinite(ms) || !clock.isWithinSupported(ms)) { setBad(true); S.toast(t('time.invalidDate'), 'error'); return; }
    clock.setSimMs(ms); close();
  };
  return (
    <div style={{ padding: '6px 8px', width: 300 }} onPointerDown={(e) => e.stopPropagation()}>
      <div className="field">
        <label htmlFor="date-edit">{t('time.dateUtc')}</label>
        <input id="date-edit" type="datetime-local" value={val} aria-invalid={bad} onInput={(e) => { setBad(false); setVal((e.target as HTMLInputElement).value); }} onKeyDown={(e) => { if (e.key === 'Enter') apply(); }} />
        <small>{t('time.dateHint')} · {t('time.timezone')}</small>
      </div>
      <div className="row">
        <Btn small variant="primary" label={t('time.applyDate')} onClick={apply} />
        <Btn small label={t('time.goToNow')} icon="clock" onClick={() => { app.goToNow(); close(); }} title={t('time.goToNowDesc')} />
      </div>
      <p className="muted" style={{ marginTop: 8 }}>{t('time.supportedRange')}</p>
    </div>
  );
}

function EventsList({ close }: { close: () => void }): JSX.Element {
  const go = (ev: EventPreset) => {
    close();
    if (ev.kind === 'schematic' && ev.tool) { labPreset.value = { tool: ev.tool, preset: ev.toolPreset ?? '' }; app.openTool(ev.tool); return; }
    const ms = resolveEventMs(ev);
    if (ms === null || !clock.isWithinSupported(ms)) { S.toast(t('time.invalidDate'), 'warning'); return; }
    clock.pause(); clock.setSimMs(ms);
    if (ev.body) app.select(ev.body, { focus: true });
    S.toast(`${tx(ev.title)} — ${fmtDateTimeUtc(ms)}`, 'info', 5000);
  };
  return (
    <div style={{ maxHeight: '60vh', overflow: 'auto', width: 380 }} onPointerDown={(e) => e.stopPropagation()}>
      {EVENTS.map((ev) => (
        <button key={ev.id} type="button" className="list-item" role="menuitem" onClick={() => go(ev)} style={{ alignItems: 'flex-start' }}>
          <Icon name={ev.kind === 'historical' ? 'rocket' : ev.kind === 'model' ? 'orbit' : 'flask'} size={16} />
          <span className="grow">
            <span className="name">{tx(ev.title)} <Badge kind={ev.kind === 'historical' ? 'accent' : ev.kind === 'model' ? 'live' : 'caution'}>{t(`time.eventKind.${ev.kind}`)}</Badge></span>
            <span className="meta" style={{ display: 'block', whiteSpace: 'normal' }}>{tx(ev.description)}</span>
            {ev.sourceUrl && <span className="meta" onClick={(e) => e.stopPropagation()}><ExternalLink href={ev.sourceUrl}>{t('common.source')}</ExternalLink></span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function BookmarksList({ close }: { close: () => void }): JSX.Element {
  const bms = collections.value.bookmarks;
  return (
    <div style={{ maxHeight: '60vh', overflow: 'auto', width: 320 }} onPointerDown={(e) => e.stopPropagation()}>
      <div style={{ padding: '4px 6px' }}><Btn small icon="bookmark" label={t('time.addBookmark')} shortcut="B" onClick={() => app.addBookmark('')} /></div>
      {bms.length === 0 && <EmptyState text={t('coll.empty.bookmarks')} />}
      {bms.map((b: Bookmark) => (
        <div key={b.id} className="list-item" style={{ padding: 0 }}>
          <button type="button" className="list-item grow" role="menuitem" onClick={() => { close(); app.goToBookmark(b); }}>
            <Icon name="bookmark" size={14} />
            <span className="grow"><span className="name">{b.title}</span><span className="meta">{fmtDateTimeUtc(b.simMs)}{b.body ? ` · ${bodyName(b.body)}` : ''}</span></span>
          </button>
          <Btn small iconOnly icon="trash" variant="ghost" label={t('common.delete')} onClick={() => { if (confirm(t('coll.deleteConfirm', { name: b.title }))) updateCollections((c) => ({ ...c, bookmarks: c.bookmarks.filter((x) => x.id !== b.id) })); }} />
        </div>
      ))}
    </div>
  );
}

const SPANS: { key: string; days: number }[] = [{ key: '1w', days: 7 }, { key: '1m', days: 30 }, { key: '1y', days: 365.25 }, { key: '10y', days: 3652.5 }];

function Timeline(): JSX.Element {
  const [span, setSpan] = useState(SPANS[2]);
  const [center, setCenter] = useState(clock.simMs);
  const wasPlaying = useRef(false);
  const cs = S.clockState.value;
  const half = (span.days * DAY_S * 1000) / 2;
  const min = Math.max(clock.minMs, center - half), max = Math.min(clock.maxMs, center + half);
  const val = Math.min(max, Math.max(min, cs.simMs));
  useEffect(() => { if (cs.simMs < min || cs.simMs > max) setCenter(cs.simMs); }, [cs.simMs, min, max]);
  const bms = collections.value.bookmarks.filter((b) => b.simMs >= min && b.simMs <= max);
  const idx = collections.value.bookmarks.findIndex((b) => b.simMs > cs.simMs);
  const prevBm = [...collections.value.bookmarks].reverse().find((b) => b.simMs < cs.simMs - 1000);
  const nextBm = idx >= 0 ? collections.value.bookmarks[idx] : undefined;
  return (
    <div className="row secondary timeline" style={{ position: 'relative', gap: 8 }}>
      <Btn small iconOnly icon="back" label={t('time.prevBookmark')} disabled={!prevBm} onClick={() => prevBm && app.goToBookmark(prevBm)} />
      <div style={{ flex: 1, position: 'relative', minWidth: 160 }}>
        <input type="range" min={min} max={max} step={60000} value={val} aria-label={t('time.timeline')} aria-valuetext={fmtDateTimeUtc(val)} style={{ width: '100%' }}
          onPointerDown={() => { wasPlaying.current = clock.playing; clock.pause(); S.announce(t('time.scrubbing')); }}
          onInput={(e) => clock.setSimMs(Number((e.target as HTMLInputElement).value))}
          onPointerUp={() => { if (wasPlaying.current) clock.play(); }}
          onKeyUp={() => { if (wasPlaying.current) clock.play(); }} />
        <div aria-hidden="true" style={{ position: 'absolute', left: 8, right: 8, top: 22, height: 6, pointerEvents: 'none' }}>
          {bms.map((b) => <span key={b.id} title={b.title} style={{ position: 'absolute', left: `${((b.simMs - min) / (max - min)) * 100}%`, top: 0, width: 2, height: 6, background: 'var(--selected)' }} />)}
        </div>
        <div className="row between muted" style={{ fontSize: '0.75em' }}><span>{fmtDateTimeUtc(min).slice(0, 12)}</span><span>{t('time.timelineSpan')}</span><span>{fmtDateTimeUtc(max).slice(0, 12)}</span></div>
      </div>
      <Btn small iconOnly icon="forward" label={t('time.nextBookmark')} disabled={!nextBm} onClick={() => nextBm && app.goToBookmark(nextBm)} />
      <Seg value={span.key} label={t('time.timelineSpan')} options={SPANS.map((s) => ({ value: s.key, label: s.key }))} onChange={(k) => { setSpan(SPANS.find((s) => s.key === k)!); setCenter(clock.simMs); }} />
    </div>
  );
}

export function Timebar(): JSX.Element {
  const cs = S.clockState.value;
  const sel = S.selectedId.value;
  const [unit, setUnit] = useState<StepUnit>('day');
  const [expanded, setExpanded] = useState(false);
  const [timeline, setTimeline] = useState(false);
  const [custom, setCustom] = useState('');
  const phone = S.isPhone.value;
  const resumeRate = cs.rate > 0 ? cs.rate : clock.resumeRate;
  const stepS = useMemo(() => stepSeconds(unit, sel), [unit, sel]);
  const stepLabel = unit === 'rotation' || unit === 'orbit' ? t(`time.step.${unit}`, { body: sel ? bodyName(sel) : '—' }) : t(`time.step.${unit}`);
  const dateLabel = fmtDateTimeUtc(cs.simMs, cs.rate < 3600 && cs.playing);
  const onFocusIn = () => app.showHint('time');
  const ref = useRef<HTMLElement>(null);
  // Publish the real height so the status bar, minimap and panels stack above the bar.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty('--timebar-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    publish();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => { ro.disconnect(); root.style.removeProperty('--timebar-h'); };
  }, []);
  return (
    <section ref={ref} id="timebar" className={`timebar ${expanded ? 'is-expanded' : ''}`} aria-label={t('nav.time')} onFocusIn={onFocusIn}>
      <div className="row primary">
        <div className="group" role="group" aria-label={t('nav.time')}>
          <Btn iconOnly icon="stepBack" label={`${t('time.stepBack')} (${stepLabel})`} shortcut="[" disabled={stepS === null} onClick={() => stepS !== null && app.step(-stepS)} />
          <Btn iconOnly icon="reverse" label={t('time.reverse')} shortcut="X" pressed={cs.direction === -1} onClick={() => app.reverse()} />
          <Btn iconOnly icon={cs.playing ? 'pause' : 'play'} variant="primary" label={cs.playing ? t('time.pause') : t('time.play')} shortcut="Space" onClick={() => app.togglePlay()} />
          <Btn iconOnly icon="stepForward" label={`${t('time.stepForward')} (${stepLabel})`} shortcut="]" disabled={stepS === null} onClick={() => stepS !== null && app.step(stepS)} />
        </div>
        <Menu id="date" className="tb-date" label={dateLabel} icon="calendar">{(close) => <DateEditor close={close} />}</Menu>
        <div className="rate" aria-live="off">
          {cs.playing ? <><b>{cs.direction === -1 ? '−' : ''}{ratePhrase(cs.rate)}</b></> : <><b>{t('time.paused')}</b> <span className="muted">· {t('time.resumesAt', { rate: ratePhrase(resumeRate) })}</span></>}
        </div>
        <Menu id="rate" label={t('time.rate')} icon="clock" iconOnly={phone}>
          {(close) => (
            <>
              {RATE_PRESETS.map((r) => <MenuItem key={r.key} close={close} label={t(`time.preset.${r.key}`)} checked={Math.abs(cs.rate - r.rate) < 1e-9} onClick={() => { clock.setRate(r.rate); clock.play(); }} />)}
              <div style={{ padding: '6px 10px' }} onPointerDown={(e) => e.stopPropagation()}>
                <label className="field-label" htmlFor="custom-rate">{t('time.customRate')}</label>
                <input id="custom-rate" type="text" inputMode="decimal" value={custom} onInput={(e) => setCustom((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseLocaleNumber(custom); if (!Number.isFinite(v) || v < 0) S.toast(t('time.invalidRate'), 'error'); else { clock.setRate(v); if (v > 0) clock.play(); close(); } } }} placeholder="86400" />
              </div>
            </>
          )}
        </Menu>
        <Menu id="bookmarks" className="tb-aux" label={t('time.bookmarks')} icon="bookmark" iconOnly align="right">{(close) => <BookmarksList close={close} />}</Menu>
        <Menu id="events" className="tb-aux" label={t('time.events')} icon="rocket" iconOnly align="right">{(close) => <EventsList close={close} />}</Menu>
        <Btn className="tb-aux" iconOnly icon="history" label={t('time.timeline')} pressed={timeline} onClick={() => setTimeline(!timeline)} />
        <Menu id="time-more" label={t('common.more')} icon="more" iconOnly align="right">
          {(close) => (
            <>
              <MenuItem close={close} label={t('time.goToNow')} icon="clock" onClick={() => app.goToNow()} />
              <MenuItem close={close} label={t('time.resetSimulation')} icon="refresh" onClick={() => app.resetSimulation()} />
              <MenuItem close={close} label={t('time.resetView')} icon="home" onClick={() => app.resetView()} />
              {sel && BODY_MAP[sel].level === 'simulated' && sel !== 'sun' && <MenuItem close={close} label={t('time.completeOrbit')} icon="orbit" onClick={() => app.observeOrbit(sel)} />}
              <div className="muted" style={{ padding: '6px 10px', fontSize: '0.8em', maxWidth: 280 }}>{t('time.backgroundPolicy')} {t('time.samplingNote')}</div>
            </>
          )}
        </Menu>
        <Btn iconOnly icon={expanded ? 'chevronDown' : 'chevronUp'} label={expanded ? t('common.collapse') : t('common.expand')} pressed={expanded} onClick={() => setExpanded(!expanded)} />
      </div>
      {expanded && <div className="row secondary">
        <label className="row" style={{ flex: 1, gap: 8, minWidth: 200 }}>
          <span className="muted" style={{ whiteSpace: 'nowrap' }}>{t('time.speedSlider')}</span>
          <input type="range" min={0} max={1000} step={1} value={rateToPos(resumeRate)} aria-label={t('time.speedSlider')} aria-valuetext={ratePhrase(resumeRate)} onInput={(e) => { clock.setRate(posToRate(Number((e.target as HTMLInputElement).value))); if (!clock.playing) clock.play(); }} />
        </label>
        <label className="row" style={{ gap: 6 }}>
          <span className="muted">{t('time.step')}</span>
          <select value={unit} onChange={(e) => setUnit((e.target as HTMLSelectElement).value as StepUnit)} style={{ width: 'auto', minHeight: 30, padding: '2px 6px' }} aria-label={t('time.step')}>
            {(['minute', 'hour', 'day', 'week', 'rotation', 'orbit'] as StepUnit[]).map((u) => <option key={u} value={u}>{u === 'rotation' || u === 'orbit' ? t(`time.step.${u}`, { body: sel ? bodyName(sel) : '—' }) : t(`time.step.${u}`)}</option>)}
          </select>
        </label>
        <Seg value={cs.direction === 1 ? 'fwd' : 'back'} label={t('time.direction')} options={[{ value: 'back', label: t('time.backward') }, { value: 'fwd', label: t('time.forward') }]} onChange={(v) => clock.setDirection(v === 'fwd' ? 1 : -1)} />
      </div>}
      {timeline && <Timeline />}
    </section>
  );
}
