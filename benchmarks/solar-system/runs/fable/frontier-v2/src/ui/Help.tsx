import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import * as S from '../state/store';
import { app } from '../app/controller';
import { ACTIONS } from '../app/actions';
import { SOURCES } from '../data/sources';
import { fmtDateTimeUtc, t } from '../i18n';
import { copyText, downloadText } from '../state/persistence';
import { Badge, Btn, Dialog, ExternalLink, Note } from './common';
import { clock } from '../state/store';

const GROUPS: { id: string; label: string }[] = [
  { id: 'explore', label: 'common.explore' }, { id: 'view', label: 'nav.overlays' }, { id: 'time', label: 'nav.time' }, { id: 'tools', label: 'common.tools' }, { id: 'learn', label: 'common.learn' }, { id: 'system', label: 'nav.mainMenu' },
];

export function HelpDialog(): JSX.Element {
  const shortcuts = ACTIONS.filter((a) => a.shortcut);
  return (
    <Dialog id="help" title={t('help.title')} onClose={() => app.closeTool()} wide>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="card">
            <h3>{t('help.mouse')}</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>{t('help.mouse.orbit')}</li><li>{t('help.mouse.pan')}</li><li>{t('help.mouse.zoom')}</li><li>{t('help.mouse.select')}</li>
              <li>{t('hint.touchOrbit')} · {t('hint.touchZoom')} · {t('hint.touchSelect')}</li>
            </ul>
            <p className="muted" style={{ marginBottom: 0 }}>{t('help.keyboardCamera')} · {t('a11y.exitCameraControls')}</p>
          </div>
          <div className="card">
            <h3>{t('help.shortcuts')}</h3>
            {GROUPS.map((g) => {
              const list = shortcuts.filter((a) => a.group === g.id);
              if (!list.length) return null;
              return <div key={g.id} style={{ marginBottom: 8 }}><div className="muted" style={{ fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t(g.label)}</div>{list.map((a) => <div key={a.id} className="row between" style={{ padding: '2px 0' }}><span>{t(a.labelKey, { body: '…' })}</span><kbd>{a.shortcut}</kbd></div>)}</div>;
            })}
            <div className="row between" style={{ padding: '2px 0' }}><span>{t('actions.escape')}</span><kbd>Esc</kbd></div>
            <div className="row between" style={{ padding: '2px 0' }}><span>{t('time.customRate')} ({t('common.more')}/{t('common.less')})</span><kbd>+ / −</kbd></div>
          </div>
          <Btn small icon="refresh" label={t('help.restartTutorial')} onClick={() => { app.closeTool(); app.restartTutorial(); }} />
        </div>
        <div className="stack">
          <div className="card">
            <h3>{t('help.about')}</h3>
            <p style={{ marginTop: 0 }}>{t('app.tagline')}</p>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)' }}>
              <li>{t('scale.explain.physics')}</li>
              <li>{t('inspector.positionModel.jpl-table1')}.</li>
              <li>{t('inspector.positionModel.moon')}.</li>
              <li>{t('inspector.positionModel.satellite')}.</li>
              <li>{t('inspector.appearanceIllustrative')}</li>
              <li>{t('time.supportedRange')}.</li>
            </ul>
          </div>
          <div className="card">
            <h3>{t('common.sources')}</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{Object.values(SOURCES).map((s) => <li key={s.id}><ExternalLink href={s.url}>{s.label}</ExternalLink> <span className="muted">({s.accessed})</span></li>)}</ul>
          </div>
          <Note>{t('overlay.gridNote')}</Note>
        </div>
      </div>
    </Dialog>
  );
}

export function ShareDialog(): JSX.Element {
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => app.encodeShare(), []);
  const scene = () => JSON.stringify({ app: 'solar-system-observatory', kind: 'scene', version: 1, url, simMs: clock.simMs, simUtc: new Date(clock.simMs).toISOString(), selected: S.selectedId.value, scaleMode: S.prefs.value.scaleMode, labelsMode: S.prefs.value.labelsMode, orbitsMode: S.prefs.value.orbitsMode, overlays: S.prefs.value.overlays, viewpoint: app.scene?.getViewpoint() ?? null }, null, 2);
  return (
    <Dialog id="share" title={t('share.title')} onClose={() => app.closeTool()}>
      <div className="stack">
        <p className="muted" style={{ margin: 0 }}>{t('share.note')}</p>
        <div className="kv"><div className="k">{t('common.date')}</div><div className="v num">{fmtDateTimeUtc(clock.simMs)}</div><div className="k">{t('status.scale')}</div><div className="v"><Badge>{t(`scale.badge.${S.prefs.value.scaleMode}`)}</Badge></div></div>
        <textarea readOnly value={url} rows={3} aria-label={t('share.copyLink')} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} style={{ width: '100%', fontSize: '0.8em' }} />
        <div className="row">
          <Btn variant="primary" icon="copy" label={copied ? t('common.copied') : t('share.copyLink')} onClick={async () => { const ok = await copyText(url); setCopied(ok); S.toast(ok ? t('toast.copied') : t('common.copyFailed'), ok ? 'success' : 'warning'); }} />
          <Btn icon="download" label={t('share.downloadScene')} onClick={() => { if (!downloadText(`cena-${new Date(clock.simMs).toISOString().slice(0, 10)}.json`, scene())) S.toast(t('photo.blocked'), 'warning'); }} />
        </div>
        <Note kind="caution">{t('share.previewNote')}</Note>
      </div>
    </Dialog>
  );
}
