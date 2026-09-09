import type { JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import * as S from '../state/store';
import { app, bodyName, checklistOpen, disambiguation, hintState, pickRequest } from '../app/controller';
import { BODY_MAP } from '../data/bodies';
import { t } from '../i18n';
import { collections, recoveryNotice, uiMemory, updateUiMemory } from '../state/persistence';
import { BodyThumb, Btn, Icon } from './common';

export function StatusBar(): JSX.Element {
  const sel = S.selectedId.value;
  const mode = S.cameraMode.value;
  const target = S.cameraTarget.value;
  const scale = S.prefs.value.scaleMode;
  const pick = pickRequest.value;
  const camText = mode === 'follow' && target ? t('camera.mode.follow', { body: bodyName(target) }) : t(`camera.mode.${mode}`);
  return (
    <div className="statusbar" role="status" aria-label={t('nav.status')}>
      {pick && <span className="chip warn"><Icon name="target" size={14} /> {pick.label} · {t('measure.pickFromScene')} <Btn small variant="ghost" iconOnly icon="close" label={t('common.cancel')} onClick={() => { pickRequest.value = null; }} /></span>}
      {sel && <button type="button" className="chip is-button" onClick={() => { S.inspectorOpen.value = true; }} title={t('nav.toggleInspector')}><BodyThumb id={sel} size={12} /> {bodyName(sel)}</button>}
      <button type="button" className="chip is-button optional" onClick={() => app.toggleFollow()} title={t('camera.mode')}><Icon name="camera" size={14} /> {camText}</button>
      <button type="button" className={`chip is-button ${scale === 'relative' ? 'warn' : ''}`} onClick={() => app.toggleScale()} title={t(`scale.short.${scale}`)}><span className="dot" style={{ background: scale === 'relative' ? 'var(--caution)' : 'var(--accent)' }} /> {t(`scale.badge.${scale}`)}</button>
      <span className="chip optional" title={t('a11y.sceneSummary', { n: S.hiddenBodies.value.size, date: '' })}><Icon name="info" size={13} /> {t('status.approx')}</span>
      {S.fps.value > 0 && <span className="chip optional" aria-hidden="true">{t('status.fps', { fps: S.fps.value })} · {t('status.quality', { q: t(`settings.quality.${S.effectiveQuality.value}`) })}</span>}
      {!S.storageAvailable.value && <span className="chip warn"><Icon name="warning" size={13} /> {t('coll.storageUnavailable')}</span>}
      {recoveryNotice.value && <span className="chip warn"><Icon name="warning" size={13} /> {t('coll.recovered', { n: recoveryNotice.value })} <Btn small variant="ghost" iconOnly icon="close" label={t('common.dismiss')} onClick={() => { recoveryNotice.value = null; }} /></span>}
    </div>
  );
}

const CHECKLIST_KEYS = ['visitPlanet', 'followMoon', 'reverseTime', 'compareTwo', 'inspectScale'];

export function Checklist(): JSX.Element | null {
  const done = collections.value.checklist;
  const collapsed = uiMemory.value.checklistCollapsed;
  const count = CHECKLIST_KEYS.filter((k) => done[k]).length;
  if (!checklistOpen.value || S.welcomeOpen.value) return null;
  if (count === CHECKLIST_KEYS.length && collapsed) return null;
  return (
    <div className={`panel checklist ${S.navigatorOpen.value && !S.isNarrow.value ? 'with-nav' : ''}`} aria-label={t('checklist.title')}>
      <div className="panel-header" style={{ padding: '8px 10px' }}>
        <Icon name="check" size={16} />
        <h2 style={{ fontSize: '0.9em' }}>{t('checklist.title')} <span className="muted">{count}/{CHECKLIST_KEYS.length}</span></h2>
        <Btn small iconOnly variant="ghost" icon={collapsed ? 'chevronDown' : 'chevronUp'} label={collapsed ? t('common.expand') : t('common.collapse')} onClick={() => updateUiMemory({ checklistCollapsed: !collapsed })} />
        <Btn small iconOnly variant="ghost" icon="close" label={t('common.close')} onClick={() => { checklistOpen.value = false; }} />
      </div>
      {!collapsed && (
        <div style={{ padding: '6px 10px 10px' }}>
          <ul>
            {CHECKLIST_KEYS.map((k) => <li key={k} className={done[k] ? 'done' : ''}><span className="box" aria-hidden="true">{done[k] ? '✓' : ''}</span>{t(`checklist.${k}`)}</li>)}
          </ul>
          {count === CHECKLIST_KEYS.length && <p className="muted" style={{ margin: '6px 0 0' }}>{t('checklist.complete')}</p>}
        </div>
      )}
    </div>
  );
}

export function Hints(): JSX.Element | null {
  const id = hintState.value;
  if (!id || S.welcomeOpen.value) return null;
  const touch = S.isTouch.value;
  const text = id === 'orbit' ? `${t(touch ? 'hint.touchOrbit' : 'hint.orbit')} · ${t(touch ? 'hint.touchZoom' : 'hint.zoom')}` : id === 'select' ? t(touch ? 'hint.touchSelect' : 'hint.select') : t(`hint.${id}`);
  const pos = id === 'time' ? 'time' : id === 'relativeScale' ? 'top-right' : 'bottom-center';
  const next = id === 'orbit' ? 'select' : id === 'select' ? 'reset' : null;
  return (
    <div className={`hint ${pos}`} role="note">
      <Icon name="info" size={18} />
      <span style={{ flex: 1 }}>{text}</span>
      {next && <Btn small variant="ghost" label={t('hint.next')} onClick={() => { app.dismissHint(id); setTimeout(() => app.showHint(next), 50); }} />}
      <Btn small label={t('hint.dismiss')} onClick={() => app.dismissHint(id)} />
    </div>
  );
}

export function Toasts(): JSX.Element {
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {S.toasts.value.map((x) => <div key={x.id} className={`toast ${x.kind ?? ''}`} role={x.kind === 'error' ? 'alert' : 'status'}>{x.text}</div>)}
    </div>
  );
}

export function LiveRegion(): JSX.Element {
  return <div className="live-region" aria-live="polite" aria-atomic="true">{S.announcement.value}</div>;
}

export function RestoreUi(): JSX.Element {
  return <Btn className="restore-ui" icon="eye" iconOnly label={t('nav.showInterface')} shortcut="H" onClick={() => app.toggleDistractionFree()} />;
}

export function Disambiguation(): JSX.Element | null {
  const d = disambiguation.value;
  useEffect(() => {
    if (!d) return;
    const onDoc = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('.popover')) disambiguation.value = null; };
    setTimeout(() => document.addEventListener('pointerdown', onDoc), 0);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [d]);
  if (!d) return null;
  const left = Math.min(d.x + 8, window.innerWidth - 240), top = Math.min(d.y + 8, window.innerHeight - 40 * d.ids.length - 40);
  return (
    <div className="popover" role="menu" style={{ left, top, width: 230 }} aria-label={t('common.select')}>
      {d.ids.map((id) => (
        <button key={id} type="button" role="menuitem" className="list-item" onClick={() => { disambiguation.value = null; app.select(id); }}>
          <BodyThumb id={id} /><span className="grow name">{bodyName(id)}</span><span className="meta">{t(`kind.${BODY_MAP[id].kind}`)}</span>
        </button>
      ))}
    </div>
  );
}
