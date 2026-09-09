import type { JSX } from 'preact';
import * as S from '../state/store';
import { app, bodyName } from '../app/controller';
import { BODIES } from '../data/bodies';
import { t } from '../i18n';
import { Badge, BodyThumb, Btn, Icon, Note } from './common';
import { InspectorBody } from './Inspector';
import { ToolRouter } from './tools/ToolRouter';
import { Toasts, LiveRegion } from './Status';
import { BODY_MAP } from '../data/bodies';

/** Rendered when WebGL is unavailable: the catalog, comparisons, labs and encyclopedia keep working. */
export function Fallback(): JSX.Element {
  const sel = S.selectedId.value;
  return (
    <div className="fallback">
      <div className="inner">
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="brand"><Icon name="sun" size={24} /> <span>{t('app.title')}</span></div>
          <div className="row">
            <Btn small icon="settings" label={t('common.settings')} onClick={() => app.openTool('settings')} />
            <Btn small icon="help" label={t('common.help')} onClick={() => app.openTool('help')} />
          </div>
        </div>
        <Note kind="error"><strong>{t('error.webgl')}</strong><br />{t('error.webglFallback')}</Note>
        <div className="row" style={{ margin: '12px 0' }}>
          <Btn icon="compare" label={t('nav.compare')} onClick={() => app.openTool('compare')} />
          <Btn icon="expand" label={t('nav.scaleLab')} onClick={() => app.openTool('scale-lab')} />
          <Btn icon="sun" label={t('nav.seasonsLab')} onClick={() => app.openTool('seasons-lab')} />
          <Btn icon="moon" label={t('nav.moonLab')} onClick={() => app.openTool('moon-lab')} />
          <Btn icon="orbit" label={t('nav.orbitLab')} onClick={() => app.openTool('orbit-lab')} />
          <Btn icon="globe" label={t('nav.beyond')} onClick={() => app.openTool('beyond')} />
          <Btn icon="book" label={t('nav.encyclopedia')} onClick={() => app.openTool('encyclopedia')} />
          <Btn icon="rocket" label={t('nav.missions')} onClick={() => app.openTool('missions')} />
          <Btn icon="check" label={t('nav.learn')} onClick={() => app.openTool('learn')} />
        </div>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <h3>{t('nav.navigator')}</h3>
            {BODIES.map((b) => (
              <button key={b.id} type="button" className={`list-item ${sel === b.id ? 'is-selected' : ''}`} onClick={() => app.select(b.id, { silent: true })}>
                <BodyThumb id={b.id} /><span className="grow name">{bodyName(b.id)}</span><Badge>{t(`kind.${b.kind}`)}</Badge>
              </button>
            ))}
          </div>
          <div className="card">
            {sel ? <><h3>{bodyName(sel)}</h3><InspectorBody def={BODY_MAP[sel]} tab="overview" /><hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '12px 0' }} /><InspectorBody def={BODY_MAP[sel]} tab="data" /></> : <p className="muted">{t('inspector.noSelectionHint')}</p>}
          </div>
        </div>
      </div>
      <ToolRouter />
      <Toasts />
      <LiveRegion />
    </div>
  );
}
