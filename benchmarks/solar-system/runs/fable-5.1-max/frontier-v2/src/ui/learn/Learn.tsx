import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import * as S from '../../state/store';
import { app } from '../../app/controller';
import { activities, activityRun, sequence } from '../../app/activities';
import { tours } from '../../app/tours';
import { ACTIVITIES, ACTIVITY_MAP, THEME_ORDER } from '../../content/activities';
import type { Activity, ActivityTheme } from '../../content/activities';
import { TOURS } from '../../content/tours';
import { t, tx } from '../../i18n';
import { collections } from '../../state/persistence';
import { Badge, Btn, Icon, Note } from '../common';
import { Workspace } from '../tools/ToolRouter';

function progressOf(id: string): 'done' | 'started' | undefined { return collections.value.progress[id]; }

/** The running activity, as a floating card over the scene or embedded in the Learn workspace. */
export function ActivityCard({ floating }: { floating?: boolean }): JSX.Element | null {
  const r = activityRun.value;
  const a = activities.current;
  if (!r || !a) return null;
  const seq = sequence.value;
  const body = (
    <>
      <div className="row between">
        <div className="row" style={{ gap: 8 }}><Icon name="check" size={16} /><strong>{tx(a.title)}</strong><Badge>{t(`learn.theme.${a.theme}`)}</Badge>{seq && <Badge kind="accent">{t('learn.sequence')} {seq.index + 1}/{seq.ids.length}</Badge>}</div>
        <Btn small iconOnly icon="close" label={t('common.close')} onClick={() => { activities.abandon(); sequence.value = null; }} />
      </div>
      <p className="muted" style={{ margin: '6px 0' }}><strong>{t('learn.objective')}:</strong> {tx(a.objective)}</p>
      {a.kind === 'choice' ? (
        <>
          <p style={{ margin: '6px 0' }}>{tx(a.question)}</p>
          <div className="stack" role="radiogroup" aria-label={t('learn.answerLabel')}>
            {a.options.map((o, i) => {
              const chosen = r.answered === i;
              const state = chosen ? (r.correct ? 'is-correct' : 'is-wrong') : '';
              return <button key={i} type="button" role="radio" aria-checked={chosen} className={`list-item ${state}`} disabled={r.done} onClick={() => activities.answer(i)} style={chosen ? { outline: `2px solid ${r.correct ? 'var(--accent-2, #6fe0a8)' : 'var(--warm)'}` } : undefined}><span className="grow">{tx(o.text)}</span>{chosen && <Icon name={r.correct ? 'check' : 'close'} size={14} />}</button>;
            })}
          </div>
          {r.answered !== null && !r.correct && <Note kind="caution">{t('learn.incorrect')}</Note>}
        </>
      ) : (
        <>
          <p style={{ margin: '6px 0' }}><strong>{t('learn.sceneTask')}:</strong> {tx(a.task)}</p>
          <Note kind={r.done ? undefined : 'caution'}>{r.done ? t('learn.taskDone') : t('learn.taskPending')}</Note>
        </>
      )}
      {r.hintShown && a.hint && <Note>{t('learn.hint')}: {tx(a.hint)}</Note>}
      {r.done && <div className="note" style={{ borderLeftColor: 'var(--accent)' }}><strong>{t('learn.correct')}</strong> — {t('learn.explanation')}: {tx(a.explanation)}{a.modelCaveat && <><br /><em>{t('learn.modelCaveat')} {tx(a.modelCaveat)}</em></>}</div>}
      <div className="row between" style={{ marginTop: 8 }}>
        <div className="row">
          {!r.hintShown && a.hint && !r.done && <Btn small icon="help" label={t('learn.showHint')} onClick={() => activities.showHint()} />}
          {a.kind === 'choice' && r.answered !== null && !r.correct && <Btn small icon="refresh" label={t('learn.retry')} onClick={() => activities.retry()} />}
          {a.startView && <Btn small icon="focus" label={t('learn.startView')} onClick={() => activities.start(a.id)} />}
        </div>
        <div className="row">
          {r.done && a.followUp && <Btn small icon="flask" label={tx(a.followUp.label)} onClick={() => { activities.finish(); app.openTool(a.followUp!.tool); }} />}
          {r.done && <Btn small variant="primary" icon="forward" label={seq && seq.index + 1 < seq.ids.length ? t('learn.continueSequence') : t('common.done')} onClick={() => activities.finish()} />}
        </div>
      </div>
    </>
  );
  if (floating) return <section className="tour-card" role="region" aria-label={t('learn.activities')} aria-live="polite">{body}</section>;
  return <div className="card">{body}</div>;
}

export function Learn(): JSX.Element {
  const [theme, setTheme] = useState<ActivityTheme | 'all'>('all');
  const [confirmReset, setConfirmReset] = useState(false);
  const c = collections.value;
  const doneCount = ACTIVITIES.filter((a) => progressOf(a.id) === 'done').length;
  const themesDone = THEME_ORDER.filter((th) => ACTIVITIES.some((a) => a.theme === th && progressOf(a.id) === 'done'));
  const milestones: { key: string; ok: boolean }[] = [
    { key: 'firstActivity', ok: doneCount >= 1 }, { key: 'fiveActivities', ok: doneCount >= 5 }, { key: 'allThemes', ok: themesDone.length === THEME_ORDER.length },
    { key: 'tour', ok: c.toursCompleted.length >= 1 }, { key: 'journal', ok: c.journal.length >= 1 },
  ];
  const list: Activity[] = theme === 'all' ? ACTIVITIES : ACTIVITIES.filter((a) => a.theme === theme);
  const sequenceIds = THEME_ORDER.map((th) => ACTIVITIES.find((a) => a.theme === th && progressOf(a.id) !== 'done')?.id).filter((x): x is string => !!x).slice(0, 5);
  const running = activityRun.value;
  return (
    <Workspace title={t('learn.title')} icon="check" actions={<Badge kind="accent">{t('learn.progress', { done: doneCount, total: ACTIVITIES.length })}</Badge>}>
      <div className="tool-split">
        <div className="stack">
          {running && <ActivityCard />}
          <div className="card">
            <h3>{t('learn.sequence')}</h3>
            <p className="muted" style={{ marginTop: 0 }}>{sequenceIds.map((id) => tx(ACTIVITY_MAP[id].title)).join(' · ') || t('checklist.complete')}</p>
            <Btn small variant="primary" icon="play" label={sequence.value ? t('learn.continueSequence') : t('learn.startSequence')} disabled={!sequenceIds.length} onClick={() => { if (sequence.value && running) { app.closeTool(); return; } activities.startSequence(sequenceIds); }} />
          </div>
          <div className="card">
            <h3>{t('learn.milestones')}</h3>
            {milestones.map((m) => <div key={m.key} className="row" style={{ padding: '3px 0', color: m.ok ? 'var(--text-1)' : 'var(--text-3)' }}><Icon name={m.ok ? 'check' : 'more'} size={14} /> {t(`learn.milestone.${m.key}`)}</div>)}
          </div>
          <div className="card">
            <h3>{t('nav.tours')}</h3>
            {TOURS.slice(0, 3).map((tr) => <div key={tr.id} className="row between" style={{ padding: '3px 0' }}><span>{tx(tr.title)} {c.toursCompleted.includes(tr.id) && <Icon name="check" size={12} />}</span><Btn small label={t('common.start')} onClick={() => { app.closeTool(); tours.start(tr.id); }} /></div>)}
            <Btn small variant="ghost" label={t('common.more')} onClick={() => app.openTool('tours')} />
          </div>
          <div className="card">
            <div className="row between"><h3 style={{ margin: 0 }}>{t('learn.journal')}</h3><Btn small icon="book" label={t('common.open')} onClick={() => app.openTool('collections')} /></div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{c.journal.length} {t('common.note').toLowerCase()}{c.journal.length === 1 ? '' : 's'}</p>
          </div>
          <div className="row">
            {confirmReset ? <><span className="muted" style={{ fontSize: '0.85em' }}>{t('learn.resetProgressConfirm')}</span><Btn small label={t('common.cancel')} onClick={() => setConfirmReset(false)} /><Btn small variant="danger" label={t('common.confirm')} onClick={() => { activities.resetProgress(); setConfirmReset(false); }} /></> : <Btn small variant="ghost" icon="trash" label={t('learn.resetProgress')} onClick={() => setConfirmReset(true)} />}
          </div>
        </div>
        <div className="stack">
          <div className="row" role="tablist" aria-label={t('common.filter')}>
            <Btn small pressed={theme === 'all'} onClick={() => setTheme('all')}>{t('common.all')}</Btn>
            {THEME_ORDER.map((th) => <Btn key={th} small pressed={theme === th} onClick={() => setTheme(th)}>{t(`learn.theme.${th}`)}{themesDone.includes(th) && <Icon name="check" size={12} />}</Btn>)}
          </div>
          {list.map((a) => {
            const p = progressOf(a.id);
            return (
              <div key={a.id} className="card">
                <div className="row between">
                  <div>
                    <h3 style={{ margin: '0 0 4px' }}>{tx(a.title)} <Badge kind={p === 'done' ? 'accent' : p === 'started' ? 'warm' : undefined}>{p === 'done' ? t('learn.completed') : p === 'started' ? t('learn.inProgress') : t('learn.notStarted')}</Badge> <Badge>{t(`learn.theme.${a.theme}`)}</Badge></h3>
                    <p className="muted" style={{ margin: 0 }}>{tx(a.objective)}</p>
                    {a.kind === 'scene-task' && <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85em' }}>{t('learn.sceneTask')}</p>}
                  </div>
                  <Btn small variant={p === 'done' ? 'default' : 'primary'} icon="play" label={p === 'done' ? t('learn.retry') : t('common.start')} onClick={() => { if (a.kind === 'scene-task' || a.startView?.tool) app.closeTool(); activities.start(a.id); if (a.kind === 'scene-task') app.closeTool(); }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Workspace>
  );
}
