import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { useSignalEffect } from '@preact/signals';
import * as S from '../state/store';
import { app, photoState, WORKSPACE_TOOLS } from '../app/controller';
import { tourRun } from '../app/tours';
import { activityRun } from '../app/activities';
import type { BodyId } from '../data/types';
import { t } from '../i18n';
import { Topbar } from './Topbar';
import { Navigator } from './Navigator';
import { Inspector } from './Inspector';
import { Timebar } from './Timebar';
import { Minimap } from './Minimap';
import { Checklist, Disambiguation, Hints, LiveRegion, RestoreUi, StatusBar, Toasts } from './Status';
import { Palette } from './Palette';
import { Welcome } from './Welcome';
import { ToolRouter } from './tools/ToolRouter';
import { TourCard } from './learn/Tours';
import { ActivityCard } from './learn/Learn';
import { PhotoOverlays, PhotoToolbar } from './Photo';
import { Fallback } from './Fallback';

/** Label clicks select the body; a double click also travels there (read `app.scene` fresh: it is assigned inside `init`). */
function wireLabels(): void {
  const scene = app.scene;
  if (!scene) return;
  scene.labels.onSelect = (id, ev) => {
    const body = id as BodyId;
    if (ev.detail >= 2) { app.select(body); app.focus(body); } else app.select(body);
  };
}

/** Mounts the 3D scene once and keeps the camera's panel-free framing area in sync with open panels. */
function SceneHost(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || app.scene) return;
    if (app.init(el)) wireLabels();
  }, []);
  useSignalEffect(() => {
    const scene = app.scene;
    if (!scene) return;
    const narrow = S.isNarrow.value;
    const hidden = S.distractionFree.value || photoState.value.active;
    const tool = S.activeTool.value;
    const nav = S.navigatorOpen.value && !hidden && !narrow;
    const insp = S.inspectorOpen.value && !!S.selectedId.value && !hidden && !narrow;
    const overlayTool = tool === 'measure' && !narrow;
    const left = nav ? 312 : 0;
    const right = insp ? 372 : overlayTool ? 372 : 0;
    const top = hidden ? 0 : 52;
    let bottom = hidden ? 0 : narrow ? 96 : 64;
    if (narrow && ((S.inspectorOpen.value && S.selectedId.value) || S.navigatorOpen.value || tool === 'measure')) bottom = Math.round(S.viewport.value.h * 0.5);
    scene.setSafeInsets(left, right, top, bottom);
  });
  return <div ref={ref} className="scene-host" aria-label={t('nav.sceneCanvas')} />;
}

export function App(): JSX.Element {
  if (!S.webglAvailable.value) return <Fallback />;
  const tool = S.activeTool.value;
  const photo = photoState.value.active;
  const hidden = S.distractionFree.value;
  const workspace = tool !== null && WORKSPACE_TOOLS.has(tool);
  const chromeHidden = hidden || photo;
  const showInspector = S.inspectorOpen.value && !!S.selectedId.value && !workspace;
  const tour = tourRun.value;
  const activity = activityRun.value;
  return (
    <>
      <SceneHost />
      <a href="#timebar" className="sr-only" onClick={(e) => { e.preventDefault(); document.getElementById('timebar')?.querySelector<HTMLElement>('button')?.focus(); }}>{t('nav.skipToControls')}</a>
      <div className={`chrome ${chromeHidden ? 'is-hidden' : ''}`} aria-hidden={chromeHidden ? 'true' : undefined}>
        <Topbar />
        {S.navigatorOpen.value && !workspace && <Navigator />}
        {showInspector && <Inspector />}
        {!workspace && <Timebar />}
        {!workspace && !S.isPhone.value && <Minimap />}
        {!workspace && <StatusBar />}
        {!workspace && <Checklist />}
        {!workspace && !tour && <Hints />}
        {tour && !workspace && <TourCard />}
        {activity && !workspace && tool !== 'learn' && <ActivityCard floating />}
        {hidden && <RestoreUi />}
      </div>
      {photo && <PhotoOverlays />}
      {photo && <PhotoToolbar />}
      <ToolRouter />
      {S.paletteOpen.value && <Palette />}
      {S.welcomeOpen.value && !tour && <Welcome />}
      <Disambiguation />
      <Toasts />
      <LiveRegion />
    </>
  );
}
