import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import * as S from '../state/store';
import { app, bodyName } from '../app/controller';
import { ACTION_MAP, runAction } from '../app/actions';
import { t } from '../i18n';
import { Btn, Icon, Range, Seg, Switch } from './common';
import { describeSatelliteCompression } from '../sim/scale';
import { encyclopediaTarget } from './common';

/* ------------------------------------------------------------------ */
/* Dropdown menu anchored to a toolbar button                          */
/* ------------------------------------------------------------------ */

export function Menu({ id, label, icon, iconOnly, children, align = 'left', width, badge, className }: { id: string; label: string; icon?: string; iconOnly?: boolean; children: (close: () => void) => ComponentChildren; align?: 'left' | 'right'; width?: number; badge?: string; className?: string }): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const unregister = app.registerLayer(`menu:${id}`, close);
    const onDoc = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    document.addEventListener('pointerdown', onDoc);
    return () => { unregister(); document.removeEventListener('pointerdown', onDoc); };
  }, [open, id]);
  const onKey = (e: KeyboardEvent) => {
    if (!open || !ref.current) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = [...ref.current.querySelectorAll<HTMLElement>('.menu [role="menuitem"], .menu button, .menu input, .menu select')];
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement as HTMLElement);
      const n = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[n].focus();
    }
  };
  return (
    <div ref={ref} className={`menu-host ${className ?? ''}`} data-menu={id} style={{ position: 'relative' }} onKeyDown={onKey}>
      <Btn icon={icon} label={label} iconOnly={iconOnly} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} pressed={open || undefined}>
        {badge && <span className="badge accent" style={{ marginLeft: 4 }}>{badge}</span>}
        {!iconOnly && <Icon name="chevronDown" size={14} />}
      </Btn>
      {open && (
        <div className="menu" role="menu" aria-label={label} style={{ [align === 'right' ? 'right' : 'left']: 0, width: width ?? undefined }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ actionId, label, icon, onClick, disabled, shortcut, close, checked }: { actionId?: string; label?: string; icon?: string; onClick?: () => void; disabled?: boolean; shortcut?: string; close: () => void; checked?: boolean }): JSX.Element {
  const a = actionId ? ACTION_MAP[actionId] : undefined;
  const text = label ?? (a ? t(a.labelKey, { body: S.selectedId.value ? bodyName(S.selectedId.value) : '' }) : '');
  const sc = shortcut ?? a?.shortcut;
  const unavailable = disabled ?? (a?.available ? !a.available() : false);
  return (
    <button type="button" role={checked !== undefined ? 'menuitemcheckbox' : 'menuitem'} aria-checked={checked} className="list-item" disabled={unavailable} onClick={() => { close(); if (onClick) onClick(); else if (actionId) runAction(actionId); }}>
      {icon && <Icon name={icon} size={16} />}
      <span className="grow name">{text}</span>
      {checked && <Icon name="check" size={14} />}
      {sc && <kbd>{sc}</kbd>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Layers popover                                                      */
/* ------------------------------------------------------------------ */

function LayersPanel(): JSX.Element {
  const p = S.prefs.value;
  const o = p.overlays;
  const set = (patch: Partial<S.Overlays>) => S.updateOverlays(patch);
  const modeOpts = (keys: string[], prefix: string) => keys.map((k) => ({ value: k, label: t(`${prefix}.${k}`) }));
  return (
    <div style={{ padding: '4px 6px', maxHeight: '70vh', overflow: 'auto' }} onPointerDown={(e) => e.stopPropagation()}>
      <div className="field">
        <label>{t('labels.title')}</label>
        <Seg value={p.labelsMode} label={t('labels.title')} options={modeOpts(['major', 'system', 'selected', 'favorites', 'none'], 'labels.mode') as { value: S.LabelsMode; label: string }[]} onChange={(v) => S.updatePrefs({ labelsMode: v })} />
      </div>
      <div className="field">
        <label>{t('orbits.title')}</label>
        <Seg value={p.orbitsMode} label={t('orbits.title')} options={modeOpts(['all', 'system', 'selected', 'none'], 'orbits.mode') as { value: S.OrbitsMode; label: string }[]} onChange={(v) => S.updatePrefs({ orbitsMode: v })} />
      </div>
      <div className="field">
        <label>{t('overlay.moons')}</label>
        <Seg value={o.moons} label={t('overlay.moons')} options={[{ value: 'auto', label: t('overlay.moons.auto') }, { value: 'all', label: t('overlay.moons.all') }, { value: 'none', label: t('overlay.moons.none') }] as { value: 'auto' | 'all' | 'none'; label: string }[]} onChange={(v) => set({ moons: v })} />
      </div>
      <h4 style={{ margin: '8px 0 2px' }}>{t('overlay.title')}</h4>
      <Switch label={t('overlay.trails')} checked={o.trails} onChange={(v) => set({ trails: v })} desc={t('overlay.trailNote')} />
      {o.trails && <Range label={t('overlay.trailDuration')} value={o.trailDays} min={1} max={365} step={1} onChange={(v) => set({ trailDays: v })} format={(v) => `${v} ${t('unit.days')}`} />}
      <Switch label={t('overlay.ecliptic')} checked={o.ecliptic} onChange={(v) => set({ ecliptic: v })} />
      <Switch label={t('overlay.grid')} checked={o.grid} onChange={(v) => set({ grid: v })} desc={t('overlay.gridNote')} />
      <Switch label={t('overlay.axes')} checked={o.axes} onChange={(v) => set({ axes: v })} />
      <Switch label={t('overlay.velocity')} checked={o.velocity} onChange={(v) => set({ velocity: v })} desc={t('overlay.velocityLegend')} />
      <Switch label={t('overlay.apsides')} checked={o.apsides} onChange={(v) => set({ apsides: v })} />
      <Switch label={t('overlay.cardinal')} checked={o.cardinal} onChange={(v) => set({ cardinal: v })} />
      <Switch label={t('overlay.markers')} checked={o.markers} onChange={(v) => set({ markers: v })} />
      <Switch label={t('overlay.belts')} checked={o.belts} onChange={(v) => set({ belts: v })} />
      <Switch label={t('overlay.kuiper')} checked={o.kuiper} onChange={(v) => set({ kuiper: v })} />
      <Switch label={t('overlay.comet')} checked={o.comet} onChange={(v) => set({ comet: v })} />
      <Switch label={t('overlay.milkyWay')} checked={o.milkyWay} onChange={(v) => set({ milkyWay: v })} />
      <Range label={t('overlay.background')} value={p.background} min={0} max={1} step={0.05} onChange={(v) => S.updatePrefs({ background: v })} format={(v) => `${Math.round(v * 100)}%`} />
      <Btn small label={t('overlay.cleanBackground')} icon="eyeOff" onClick={() => { S.updatePrefs({ background: 0.15 }); S.updateOverlays({ milkyWay: false, markers: true }); }} />
      <p className="muted" style={{ marginTop: 8 }}>{t('overlay.pathVsTrail')}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Scale control                                                       */
/* ------------------------------------------------------------------ */

function ScaleControl(): JSX.Element {
  const mode = S.prefs.value.scaleMode;
  const sat = describeSatelliteCompression('jupiter');
  return (
    <Menu id="scale" label={t('scale.mode')} icon="orbit" badge={t(`scale.badge.${mode}`)} width={360}>
      {(close) => (
        <div style={{ padding: '4px 6px' }} onPointerDown={(e) => e.stopPropagation()}>
          <Seg value={mode} label={t('scale.mode')} options={[{ value: 'exploration', label: t('scale.badge.exploration') }, { value: 'relative', label: t('scale.badge.relative') }] as { value: 'exploration' | 'relative'; label: string }[]} onChange={(v) => app.setScaleMode(v)} />
          <p style={{ margin: '10px 0 6px' }}>{t(`scale.short.${mode}`)}</p>
          <h4>{t('scale.explain.title')}</h4>
          <ul style={{ paddingLeft: 18, margin: '4px 0', fontSize: '0.86em', color: 'var(--text-2)' }}>
            {mode === 'exploration' ? (
              <>
                <li>{t('scale.explain.exploration.sizes')}</li>
                <li>{t('scale.explain.exploration.distances')}</li>
                <li>{t('scale.explain.exploration.satellites', { lo: sat.lo.toFixed(1), hi: sat.hi.toFixed(1) })}</li>
                <li>{t('scale.explain.exploration.rings')}</li>
              </>
            ) : <li>{t('scale.explain.relative.all')}</li>}
            <li>{t('scale.explain.markers')}</li>
            <li>{t('scale.explain.physics')}</li>
          </ul>
          <div className="row" style={{ marginTop: 8 }}>
            <Btn small icon="flask" label={t('scale.openLab')} onClick={() => { close(); app.openTool('scale-lab'); }} />
            <Btn small icon="book" label={t('ency.about')} onClick={() => { close(); encyclopediaTarget.value = 'about-model'; app.openTool('encyclopedia'); }} />
          </div>
        </div>
      )}
    </Menu>
  );
}

/* ------------------------------------------------------------------ */
/* Topbar                                                              */
/* ------------------------------------------------------------------ */

export function Topbar(): JSX.Element {
  const sel = S.selectedId.value;
  const narrow = S.isNarrow.value;
  const phone = S.isPhone.value;
  const mode = S.cameraMode.value;
  const canBack = !!app.scene?.canGoBack();
  const canFwd = !!app.scene?.canGoForward();
  return (
    <header className="topbar" role="banner">
      <div className="brand" aria-label={t('app.title')}>
        <Icon name="sun" size={22} />
        <span className="title-text">{t('app.title')}</span>
      </div>
      <Btn icon="search" label={narrow ? t('common.search') : t('search.placeholder')} iconOnly={phone} shortcut="/" className={`search-trigger ${narrow ? '' : 'hide-narrow'}`} onClick={() => { S.paletteOpen.value = true; }} style={narrow ? undefined : { justifyContent: 'flex-start', color: 'var(--text-3)' }} />
      <Btn icon="list" label={t('nav.navigator')} iconOnly shortcut="N" pressed={S.navigatorOpen.value} onClick={() => { S.navigatorOpen.value = !S.navigatorOpen.value; }} />
      <div className="spacer" />
      {!phone && (
        <div className="group">
          <Menu id="explore" label={t('common.explore')} icon="focus">
            {(close) => (
              <>
                <MenuItem actionId="overview" icon="home" close={close} />
                <MenuItem actionId="focus" icon="focus" close={close} disabled={!sel} />
                <MenuItem actionId="follow" icon="target" close={close} label={mode === 'follow' ? t('inspector.unfollow') : t('camera.follow')} />
                <MenuItem label={t('camera.parentSystem')} icon="orbit" close={close} disabled={!sel} onClick={() => { if (sel) app.exploreMoons(sel); }} />
                <div className="group-title">{t('camera.presets')}</div>
                <MenuItem label={t('camera.topDown')} close={close} onClick={() => app.preset('top')} />
                <MenuItem label={t('camera.cinematic')} close={close} onClick={() => app.preset('low')} />
                <MenuItem label={t('camera.equatorial')} close={close} onClick={() => app.preset('equatorial')} />
                <MenuItem label={t('camera.polar')} close={close} onClick={() => app.preset('polar')} />
                <MenuItem label={t('camera.earthTerminator')} close={close} onClick={() => { app.select('earth'); app.focus('earth', { zoom: 1 }); setTimeout(() => app.preset('terminator'), S.reducedMotion.value ? 0 : 1500); }} />
                <div className="group-title">{t('nav.camera')}</div>
                <MenuItem label={t('camera.back')} icon="back" close={close} disabled={!canBack} onClick={() => app.back()} />
                <MenuItem label={t('camera.forward')} icon="forward" close={close} disabled={!canFwd} onClick={() => app.forward()} />
                <MenuItem label={t('camera.recover')} icon="refresh" close={close} onClick={() => app.recoverCamera()} />
                <MenuItem actionId="fullscreen" icon="fullscreen" close={close} />
              </>
            )}
          </Menu>
          <Menu id="learn" label={t('common.learn')} icon="book">
            {(close) => (
              <>
                <MenuItem actionId="grand-tour" icon="sparkle" close={close} />
                <MenuItem actionId="tours" icon="map" close={close} />
                <MenuItem actionId="learn" icon="check" close={close} />
                <MenuItem actionId="encyclopedia" icon="book" close={close} />
                <MenuItem actionId="missions" icon="rocket" close={close} />
                <MenuItem actionId="beyond" icon="globe" close={close} />
              </>
            )}
          </Menu>
          <Menu id="tools" label={t('common.tools')} icon="flask">
            {(close) => (
              <>
                <MenuItem actionId="compare" icon="compare" close={close} />
                <MenuItem actionId="measure" icon="ruler" close={close} />
                <div className="group-title">{t('nav.labs')}</div>
                <MenuItem actionId="scale-lab" icon="expand" close={close} />
                <MenuItem actionId="seasons-lab" icon="sun" close={close} />
                <MenuItem actionId="moon-lab" icon="moon" close={close} />
                <MenuItem actionId="orbit-lab" icon="orbit" close={close} />
                <div className="group-title">{t('nav.photo')}</div>
                <MenuItem actionId="photo" icon="camera" close={close} />
                <MenuItem actionId="screenshot" icon="download" close={close} />
              </>
            )}
          </Menu>
        </div>
      )}
      <div className="group">
        {!phone && <ScaleControl />}
        <Menu id="layers" label={t('nav.overlays')} icon="layers" iconOnly width={340} align="right">{() => <LayersPanel />}</Menu>
        {!narrow && <Btn icon="eyeOff" label={t('nav.distractionFree')} iconOnly shortcut="H" onClick={() => app.toggleDistractionFree()} />}
        <Menu id="main" label={t('nav.mainMenu')} icon="menu" iconOnly align="right">
          {(close) => (
            <>
              {phone && <MenuItem label={t(`scale.badge.${S.prefs.value.scaleMode}`)} icon="orbit" close={close} onClick={() => app.toggleScale()} />}
              {phone && <MenuItem actionId="grand-tour" icon="sparkle" close={close} />}
              {phone && <MenuItem actionId="tours" icon="map" close={close} />}
              {phone && <MenuItem actionId="learn" icon="check" close={close} />}
              {phone && <MenuItem actionId="encyclopedia" icon="book" close={close} />}
              {phone && <MenuItem actionId="missions" icon="rocket" close={close} />}
              {phone && <MenuItem actionId="compare" icon="compare" close={close} />}
              {phone && <MenuItem actionId="measure" icon="ruler" close={close} />}
              {phone && <MenuItem actionId="scale-lab" icon="expand" close={close} />}
              {phone && <MenuItem actionId="seasons-lab" icon="sun" close={close} />}
              {phone && <MenuItem actionId="moon-lab" icon="moon" close={close} />}
              {phone && <MenuItem actionId="orbit-lab" icon="orbit" close={close} />}
              {phone && <MenuItem actionId="beyond" icon="globe" close={close} />}
              {phone && <MenuItem actionId="photo" icon="camera" close={close} />}
              {phone && <div className="group-title">{t('common.settings')}</div>}
              <MenuItem actionId="collections" icon="star" close={close} />
              <MenuItem actionId="share" icon="share" close={close} />
              <MenuItem actionId="settings" icon="settings" close={close} />
              <MenuItem actionId="help" icon="help" close={close} />
              {narrow && <MenuItem actionId="ui" icon="eyeOff" close={close} />}
              <MenuItem label={t('ency.about')} icon="info" close={close} onClick={() => { encyclopediaTarget.value = 'about-model'; app.openTool('encyclopedia'); }} />
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}
