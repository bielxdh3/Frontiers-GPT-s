import { signal } from '@preact/signals';
import { ACTIVITY_MAP, correctIndex, type Activity } from '../content/activities';
import { BODY_MAP } from '../data/bodies';
import type { BodyId } from '../data/types';
import { DAY_S } from '../data/types';
import * as S from '../state/store';
import { clock } from '../state/store';
import { collections, updateCollections } from '../state/persistence';
import { app, measureState } from './controller';

export interface ActivityRun {
  id: string;
  startedAtSimMs: number;
  answered: number | null;
  correct: boolean | null;
  hintShown: boolean;
  done: boolean;
  /** Live status of a scene task. */
  taskOk: boolean;
}

export const activityRun = signal<ActivityRun | null>(null);
export const sequence = signal<{ ids: string[]; index: number } | null>(null);

class ActivityRunner {
  private installed = false;
  private accum = 0;

  private install(): void {
    if (this.installed) return;
    this.installed = true;
    app.tickListeners.add((dt) => { this.accum += dt; if (this.accum >= 400) { this.accum = 0; this.tick(); } });
  }

  get current(): Activity | null { const r = activityRun.value; return r ? ACTIVITY_MAP[r.id] ?? null : null; }

  start(id: string): void {
    this.install();
    const a = ACTIVITY_MAP[id]; if (!a) return;
    if (S.activeTool.value) app.closeTool();
    const sv = a.startView;
    if (sv) {
      if (sv.scaleMode && S.prefs.value.scaleMode !== sv.scaleMode) S.updatePrefs({ scaleMode: sv.scaleMode });
      if (sv.rate !== undefined) { clock.setSignedRate(sv.rate); clock.play(); }
      const scene = app.scene;
      if (scene) {
        if (sv.kind === 'overview') scene.overview({ instant: S.reducedMotion.value });
        else if (sv.target) { app.select(sv.target, { silent: true }); if (sv.kind === 'system') scene.fitSystem(sv.target, { instant: S.reducedMotion.value }); else scene.focus(sv.target, { instant: S.reducedMotion.value }); }
      }
      if (sv.tool) app.openTool(sv.tool);
    }
    activityRun.value = { id, startedAtSimMs: clock.simMs, answered: null, correct: null, hintShown: false, done: false, taskOk: false };
    if (collections.value.progress[id] !== 'done') updateCollections((c) => ({ ...c, progress: { ...c.progress, [id]: c.progress[id] === 'done' ? 'done' : 'started' } }));
  }

  answer(index: number): void {
    const r = activityRun.value; const a = this.current;
    if (!r || !a || a.kind !== 'choice') return;
    const ok = index === correctIndex(a);
    activityRun.value = { ...r, answered: index, correct: ok, done: ok || r.done };
    if (ok) this.markDone(a.id);
  }

  retry(): void { const r = activityRun.value; if (r) activityRun.value = { ...r, answered: null, correct: null }; }
  showHint(): void { const r = activityRun.value; if (r) activityRun.value = { ...r, hintShown: true }; }

  private markDone(id: string): void {
    updateCollections((c) => ({ ...c, progress: { ...c.progress, [id]: 'done' } }));
  }

  private tick(): void {
    const r = activityRun.value; const a = this.current;
    if (!r || !a || a.kind !== 'scene-task' || r.done) return;
    const ok = this.check(a.check, r);
    if (ok !== r.taskOk) activityRun.value = { ...r, taskOk: ok };
    if (ok) { activityRun.value = { ...activityRun.value!, done: true, correct: true }; this.markDone(a.id); }
  }

  private check(spec: string, r: ActivityRun): boolean {
    const [kind, arg = ''] = spec.split(':');
    const sel = S.selectedId.value;
    const scene = app.scene;
    switch (kind) {
      case 'elapsed': {
        const def = BODY_MAP[arg as BodyId];
        const period = def?.physical.orbitalPeriodDays ?? 0;
        return sel === arg && Math.abs(clock.simMs - r.startedAtSimMs) >= period * DAY_S * 1000;
      }
      case 'select-larger': {
        const [x, y] = arg.split(',') as BodyId[];
        const larger = BODY_MAP[x].physical.meanRadiusKm >= BODY_MAP[y].physical.meanRadiusKm ? x : y;
        return sel === larger;
      }
      case 'select': return sel === arg;
      case 'reverse-playing': return clock.playing && clock.direction === -1 && S.prefs.value.overlays.trails;
      case 'close': {
        if (!scene || sel !== arg || scene.anchorId !== arg) return false;
        const r0 = scene.displayRadius.get(arg as BodyId) ?? 0;
        const rings = BODY_MAP[arg as BodyId].appearance.rings;
        const outer = rings ? Math.max(...rings.bands.map((b) => b.outerKm)) / BODY_MAP[arg as BodyId].physical.meanRadiusKm : 1;
        return scene.cameraDistance < r0 * outer * 4.5 && !scene.cameraCtl.isTransitioning;
      }
      case 'measure': {
        const [x, y] = arg.split(',');
        const m = measureState.value;
        return (m.a === x && m.b === y) || (m.a === y && m.b === x);
      }
      case 'relative': return S.prefs.value.scaleMode === 'relative' && sel === arg;
      default: return false;
    }
  }

  finish(): void {
    const r = activityRun.value;
    activityRun.value = null;
    const seq = sequence.value;
    if (seq && r && seq.ids[seq.index] === r.id) {
      const next = seq.index + 1;
      if (next < seq.ids.length) { sequence.value = { ...seq, index: next }; this.start(seq.ids[next]); }
      else { sequence.value = null; app.openTool('learn'); }
    } else if (!S.activeTool.value) {
      app.openTool('learn');
    }
  }

  abandon(): void { activityRun.value = null; }

  startSequence(ids: string[]): void {
    if (!ids.length) return;
    sequence.value = { ids, index: 0 };
    this.start(ids[0]);
  }

  resetProgress(): void {
    updateCollections((c) => ({ ...c, progress: {} }));
    activityRun.value = null;
    sequence.value = null;
  }
}

export const activities = new ActivityRunner();
