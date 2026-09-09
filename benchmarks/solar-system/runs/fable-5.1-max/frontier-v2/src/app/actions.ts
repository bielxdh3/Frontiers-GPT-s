import { t } from '../i18n';
import * as S from '../state/store';
import { clock } from '../state/store';
import { app } from './controller';
import { tours } from './tours';

export interface Action {
  id: string;
  labelKey: string;
  shortcut?: string;
  group: 'explore' | 'learn' | 'tools' | 'time' | 'view' | 'system';
  run: () => void;
  available?: () => boolean;
}

/** One shared action table used by toolbar menus, the command palette, shortcuts help and tours. */
export const ACTIONS: Action[] = [
  { id: 'search', labelKey: 'actions.openSearch', shortcut: '/', group: 'explore', run: () => { S.paletteOpen.value = true; } },
  { id: 'focus', labelKey: 'actions.focusBody', shortcut: 'F', group: 'explore', run: () => { if (S.selectedId.value) app.focus(S.selectedId.value); }, available: () => !!S.selectedId.value },
  { id: 'follow', labelKey: 'actions.toggleFollow', shortcut: 'G', group: 'explore', run: () => app.toggleFollow() },
  { id: 'overview', labelKey: 'actions.overview', shortcut: 'R', group: 'explore', run: () => app.resetView() },
  { id: 'navigator', labelKey: 'actions.toggleNavigator', shortcut: 'N', group: 'view', run: () => { S.navigatorOpen.value = !S.navigatorOpen.value; } },
  { id: 'inspector', labelKey: 'actions.toggleInspector', shortcut: 'I', group: 'view', run: () => { S.inspectorOpen.value = !S.inspectorOpen.value; } },
  { id: 'labels', labelKey: 'actions.toggleLabels', shortcut: 'L', group: 'view', run: () => app.toggleLabels() },
  { id: 'orbits', labelKey: 'actions.toggleOrbits', shortcut: 'O', group: 'view', run: () => app.toggleOrbits() },
  { id: 'scale', labelKey: 'actions.toggleScale', group: 'view', run: () => app.toggleScale() },
  { id: 'ui', labelKey: 'actions.toggleUi', shortcut: 'H', group: 'view', run: () => app.toggleDistractionFree() },
  { id: 'play', labelKey: 'actions.togglePlay', shortcut: 'Space', group: 'time', run: () => app.togglePlay() },
  { id: 'reverse', labelKey: 'actions.reverse', shortcut: 'X', group: 'time', run: () => app.reverse() },
  { id: 'stepBack', labelKey: 'actions.stepBack', shortcut: '[', group: 'time', run: () => app.step(-86400) },
  { id: 'stepForward', labelKey: 'actions.stepForward', shortcut: ']', group: 'time', run: () => app.step(86400) },
  { id: 'now', labelKey: 'actions.goNow', group: 'time', run: () => app.goToNow() },
  { id: 'bookmark', labelKey: 'time.addBookmark', shortcut: 'B', group: 'time', run: () => app.addBookmark('') },
  { id: 'compare', labelKey: 'actions.openCompare', shortcut: 'C', group: 'tools', run: () => app.openCompareWith(S.selectedId.value) },
  { id: 'measure', labelKey: 'actions.openMeasure', shortcut: 'M', group: 'tools', run: () => app.toggleTool('measure') },
  { id: 'scale-lab', labelKey: 'actions.openScaleLab', group: 'tools', run: () => app.openTool('scale-lab') },
  { id: 'seasons-lab', labelKey: 'actions.openSeasonsLab', group: 'tools', run: () => app.openTool('seasons-lab') },
  { id: 'moon-lab', labelKey: 'actions.openMoonLab', group: 'tools', run: () => app.openTool('moon-lab') },
  { id: 'orbit-lab', labelKey: 'actions.openOrbitLab', group: 'tools', run: () => app.openTool('orbit-lab') },
  { id: 'beyond', labelKey: 'actions.openBeyond', group: 'tools', run: () => app.openTool('beyond') },
  { id: 'photo', labelKey: 'actions.openPhoto', group: 'tools', run: () => app.openTool('photo') },
  { id: 'screenshot', labelKey: 'actions.screenshot', shortcut: 'P', group: 'tools', run: () => { void app.capture({ labels: S.prefs.value.labelsMode !== 'none', caption: true }); } },
  { id: 'tours', labelKey: 'actions.openTours', group: 'learn', run: () => app.openTool('tours') },
  { id: 'grand-tour', labelKey: 'actions.startGrandTour', group: 'learn', run: () => tours.start('grand') },
  { id: 'learn', labelKey: 'actions.openLearn', group: 'learn', run: () => app.openTool('learn') },
  { id: 'encyclopedia', labelKey: 'actions.openEncyclopedia', group: 'learn', run: () => app.openTool('encyclopedia') },
  { id: 'missions', labelKey: 'actions.openMissions', group: 'learn', run: () => app.openTool('missions') },
  { id: 'collections', labelKey: 'actions.openCollections', group: 'system', run: () => app.openTool('collections') },
  { id: 'settings', labelKey: 'actions.openSettings', group: 'system', run: () => app.openTool('settings') },
  { id: 'help', labelKey: 'actions.openHelp', shortcut: '?', group: 'system', run: () => app.openTool('help') },
  { id: 'share', labelKey: 'actions.share', group: 'system', run: () => app.openTool('share') },
  { id: 'fullscreen', labelKey: 'actions.fullscreen', group: 'system', run: () => { void toggleFullscreen(); }, available: () => !!document.fullscreenEnabled },
  { id: 'pauseIfPlaying', labelKey: 'time.pause', group: 'time', run: () => clock.pause(), available: () => clock.playing },
];

export const ACTION_MAP: Record<string, Action> = Object.fromEntries(ACTIONS.map((a) => [a.id, a]));

export function runAction(id: string): void {
  const a = ACTION_MAP[id];
  if (!a) return;
  if (a.available && !a.available()) return;
  a.run();
}

export async function toggleFullscreen(): Promise<void> {
  if (!document.fullscreenEnabled) { S.toast(t('actions.fullscreenUnsupported'), 'warning'); return; }
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    S.toast(t('actions.fullscreenUnsupported'), 'warning');
  }
}
