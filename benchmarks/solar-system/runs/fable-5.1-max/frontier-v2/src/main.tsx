import { render } from 'preact';
import { effect } from '@preact/signals';
import './styles.css';
import { App } from './ui/App';
import * as S from './state/store';
import { loadAll, uiMemory } from './state/persistence';
import { setLocale, t } from './i18n';
import { app } from './app/controller';

/* ---------- restore persisted state before the first render ---------- */
loadAll();
setLocale(S.prefs.value.locale);
if (uiMemory.value.welcomeDismissed) S.welcomeOpen.value = false;

/* ---------- environment detection ---------- */
const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
S.isTouch.value = coarse || (navigator.maxTouchPoints ?? 0) > 0 && coarse;
const syncViewport = (): void => { S.viewport.value = { w: window.innerWidth, h: window.innerHeight }; };
syncViewport();
window.addEventListener('resize', syncViewport);

/* ---------- boot screen (lives outside the Preact root) ---------- */
const bootEl = document.getElementById('boot');
const bootStage = document.getElementById('boot-stage');
effect(() => {
  const stage = S.loadingStage.value;
  if (bootStage) bootStage.textContent = t(`loading.${stage}`);
  if (stage === 'ready' && bootEl && !bootEl.classList.contains('is-done')) {
    bootEl.classList.add('is-done');
    setTimeout(() => bootEl.remove(), 600);
  }
});
effect(() => { if (!S.webglAvailable.value) S.loadingStage.value = 'ready'; });
effect(() => { document.title = t('app.title'); });

/* ---------- mount ---------- */
const host = document.getElementById('app') ?? document.body;
const root = document.createElement('div');
root.className = 'ui-root';
host.appendChild(root);
render(<App />, root);

/* ---------- shared scene links (#v=1&…) ---------- */
if (location.hash.length > 3) {
  const applyWhenReady = effect(() => {
    if (S.loadingStage.value !== 'ready' || !app.scene) return;
    setTimeout(() => { if (app.applyShare(location.hash)) S.welcomeOpen.value = false; }, 50);
    applyWhenReady();
  });
}

window.addEventListener('error', (ev) => {
  if (ev.message && /WebGL|three/i.test(ev.message)) S.toast(t('error.generic', { msg: ev.message }), 'error', 6000);
});

/* ---------- dev console handle (not shipped in production builds) ---------- */
if (import.meta.env.DEV) {
  void import('./app/tours').then(({ tours }) => { (window as unknown as { __sso: unknown }).__sso = { app, S, tours }; });
}
