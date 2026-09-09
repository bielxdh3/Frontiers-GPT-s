import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import * as S from '../../state/store';
import { app, bodyName } from '../../app/controller';
import { tours } from '../../app/tours';
import { MISSIONS, missionEra } from '../../content/missions';
import type { Mission, MissionEra, MissionType } from '../../content/missions';
import { TOUR_MAP } from '../../content/tours';
import type { BodyId } from '../../data/types';
import { fmtDateUtc, t, tx } from '../../i18n';
import { Badge, Btn, ExternalLink, Note, Switch } from '../common';
import { Workspace } from '../tools/ToolRouter';

const ERAS: MissionEra[] = ['1960s', '1980s', '2000s', '2020s'];
const TYPES: MissionType[] = ['flyby', 'orbiter', 'lander', 'rover', 'crewed', 'probe', 'sample-return'];
const utcMs = (iso: string): number => Date.parse(`${iso}T12:00:00Z`);

function statusText(m: Mission): string {
  if (m.status === 'completed') return t('missions.status.completed');
  if (m.status === 'active') return t('missions.status.active', { date: m.statusAsOf });
  if (m.status === 'enroute') return t('missions.status.enroute', { date: m.statusAsOf });
  return t('missions.status.unverified', { date: m.statusAsOf });
}

export function Missions(): JSX.Element {
  const [dest, setDest] = useState<BodyId | 'all'>('all');
  const [era, setEra] = useState<MissionEra | 'all'>('all');
  const [type, setType] = useState<MissionType | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const destinations = Array.from(new Set(MISSIONS.flatMap((m) => m.targets)));
  const list = MISSIONS.filter((m) => (dest === 'all' || m.targets.includes(dest)) && (era === 'all' || missionEra(m) === era) && (type === 'all' || m.type === type)).sort((a, b) => a.launch.localeCompare(b.launch));
  const goToDate = (iso: string) => { const ms = utcMs(iso); if (!S.clock.isWithinSupported(ms)) { S.toast(t('time.invalidDate'), 'warning'); return; } S.clock.setSimMs(ms); S.clock.pause(); S.toast(`${t('time.jumpTo')}: ${fmtDateUtc(ms)}`, 'info'); };
  const hasTour = !!TOUR_MAP['discoveries'];
  return (
    <Workspace title={t('missions.title')} icon="rocket" footer={<span className="muted">{t('missions.noLiveTracking')} {t('missions.dateNote')}</span>}>
      <div className="stack">
        <div className="row">
          <label className="field" style={{ margin: 0 }}><span className="muted">{t('missions.filter.destination')}</span><select value={dest} onChange={(e) => setDest((e.target as HTMLSelectElement).value as BodyId | 'all')}><option value="all">{t('common.all')}</option>{destinations.map((id) => <option key={id} value={id}>{bodyName(id)}</option>)}</select></label>
          <label className="field" style={{ margin: 0 }}><span className="muted">{t('missions.filter.era')}</span><select value={era} onChange={(e) => setEra((e.target as HTMLSelectElement).value as MissionEra | 'all')}><option value="all">{t('common.all')}</option>{ERAS.map((x) => <option key={x} value={x}>{t(`missions.era.${x}`)}</option>)}</select></label>
          <label className="field" style={{ margin: 0 }}><span className="muted">{t('missions.filter.type')}</span><select value={type} onChange={(e) => setType((e.target as HTMLSelectElement).value as MissionType | 'all')}><option value="all">{t('common.all')}</option>{TYPES.map((x) => <option key={x} value={x}>{t(`missions.type.${x}`)}</option>)}</select></label>
          <div className="grow" />
          <Switch label={t('overlay.missions')} checked={S.prefs.value.overlays.missions} onChange={(v) => S.updatePrefs({ overlays: { ...S.prefs.value.overlays, missions: v } })} />
          {hasTour && <Btn small icon="sparkle" label={t('missions.followDiscoveries')} onClick={() => { app.closeTool(); tours.start('discoveries'); }} />}
        </div>
        <Note>{t('missions.schematicRoute')}</Note>
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table className="data" aria-label={t('missions.title')}>
            <thead><tr><th>{t('common.name')}</th><th>{t('missions.agency')}</th><th>{t('missions.filter.type')}</th><th>{t('missions.filter.destination')}</th><th>{t('missions.launch')}</th><th>{t('missions.status')}</th><th /></tr></thead>
            <tbody>
              {list.map((m) => (
                <>
                  <tr key={m.id} className={openId === m.id ? 'is-selected' : ''}>
                    <th scope="row"><button type="button" className="btn ghost small" aria-expanded={openId === m.id} onClick={() => setOpenId(openId === m.id ? null : m.id)}>{m.name}</button></th>
                    <td>{m.agency}</td><td>{t(`missions.type.${m.type}`)}</td>
                    <td>{m.targets.map((id) => bodyName(id)).join(', ')}</td>
                    <td className="num">{fmtDateUtc(utcMs(m.launch))}</td>
                    <td><Badge kind={m.status === 'active' || m.status === 'enroute' ? 'live' : undefined}>{statusText(m)}</Badge></td>
                    <td><Btn small iconOnly icon="clock" label={t('missions.goToDate')} onClick={() => goToDate(m.launch)} /></td>
                  </tr>
                  {openId === m.id && (
                    <tr key={`${m.id}-d`}><td colSpan={7}>
                      <div className="stack" style={{ padding: '6px 4px' }}>
                        <p style={{ margin: 0 }}><strong>{t('missions.achievement')}:</strong> {tx(m.achievement)}</p>
                        {m.encounters?.map((e, i) => <div key={i} className="row"><span className="num muted" style={{ minWidth: 130 }}>{fmtDateUtc(utcMs(e.date))}</span><span className="grow">{tx(e.label)} — {bodyName(e.body)}</span><Btn small icon="clock" label={t('missions.goToDate')} onClick={() => goToDate(e.date)} /><Btn small icon="focus" label={t('missions.showBody')} onClick={() => { app.closeTool(); app.select(e.body, { focus: true }); }} /></div>)}
                        <div className="row muted" style={{ fontSize: '0.85em' }}>{m.end && <span>{t('missions.end')}: {fmtDateUtc(utcMs(m.end))}</span>}<span>{t('common.source')}: <ExternalLink href={m.sourceUrl}>{m.sourceLabel}</ExternalLink></span></div>
                      </div>
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Workspace>
  );
}
