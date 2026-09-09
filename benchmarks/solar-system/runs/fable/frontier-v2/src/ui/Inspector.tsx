import type { ComponentChildren, JSX } from 'preact';
import { useState } from 'preact/hooks';
import * as S from '../state/store';
import { app, bodyName, orbitWatch } from '../app/controller';
import { BODIES, BODY_MAP, childrenOf } from '../data/bodies';
import { SOURCES } from '../data/sources';
import type { BodyDef, BodyId } from '../data/types';
import { AU_KM, C_KM_S } from '../data/types';
import { evaluateSystem, illuminatedFraction, type SystemState } from '../sim/ephemeris';
import { fmtAu, fmtDateUtc, fmtDays, fmtDeg, fmtDuration, fmtHours, fmtKm, fmtNumber, fmtPercent, fmtSci, fmtTempK, t, tx } from '../i18n';
import { kmToMiles } from '../sim/physics';
import { collections } from '../state/persistence';
import { Badge, BodyThumb, Btn, ExternalLink, Icon, Note, Term } from './common';
import { BodyRow } from './Navigator';

type Tab = 'overview' | 'data' | 'system' | 'sources';

/** Current physical state: from the live scene when available, otherwise evaluated directly. */
export function currentState(): SystemState {
  return app.scene?.state ?? evaluateSystem(S.clock.jd);
}

function KV({ label, value, sub, live, term }: { label: string; value: ComponentChildren; sub?: string; live?: boolean; term?: string }): JSX.Element {
  return (
    <div className={live ? 'live' : ''} style={{ display: 'contents' }}>
      <dt>{term ? <Term id={term}>{label}</Term> : label}</dt>
      <dd>{value}{sub && <span className="sub">{sub}</span>}</dd>
    </div>
  );
}

function positionModelKey(def: BodyDef): string {
  if (def.id === 'sun') return 'inspector.positionModel.sun';
  if (def.id === 'moon') return 'inspector.positionModel.moon';
  if (def.orbit) return `inspector.positionModel.${def.orbit.model}`;
  if (def.satellite) return 'inspector.positionModel.satellite';
  return 'level.schematic.desc';
}

export function ActionBar({ id }: { id: BodyId }): JSX.Element {
  const def = BODY_MAP[id];
  const fav = collections.value.favorites.includes(id);
  const following = S.cameraMode.value === 'follow' && S.cameraTarget.value === id;
  const moons = childrenOf(id).filter((m) => m.level === 'simulated');
  const simulated = def.level === 'simulated';
  const hidden = S.hiddenBodies.value.has(id);
  return (
    <div className="row" style={{ gap: 6 }}>
      <Btn small variant="primary" icon="focus" label={t('inspector.focus')} shortcut="F" onClick={() => app.focus(id)} disabled={!simulated && def.kind !== 'region'} />
      {simulated && <Btn small icon="target" label={following ? t('inspector.unfollow') : t('inspector.follow')} shortcut="G" pressed={following} onClick={() => (following ? app.freeCamera() : app.follow(id))} />}
      {simulated && <Btn small icon="compare" label={t('inspector.compare')} shortcut="C" onClick={() => { app.openCompareWith(id); app.checklist('compareTwo'); }} />}
      {simulated && <Btn small icon="ruler" label={t('inspector.measure')} shortcut="M" onClick={() => app.startMeasureFrom(id)} />}
      <Btn small icon="star" iconOnly label={fav ? t('inspector.unfavorite') : t('inspector.favorite')} pressed={fav} onClick={() => app.toggleFavorite(id)} style={{ color: fav ? 'var(--selected)' : undefined }} />
      {simulated && <Btn small icon="camera" iconOnly label={t('inspector.capture')} shortcut="P" onClick={() => void app.capture({ labels: S.prefs.value.labelsMode !== 'none', caption: true })} />}
      {moons.length > 0 && <Btn small icon="orbit" label={t('inspector.exploreMoons')} onClick={() => app.exploreMoons(id)} />}
      {simulated && <Btn small icon="pin" iconOnly label={t('inspector.saveViewpoint')} onClick={() => { const name = prompt(t('coll.viewpointName'), bodyName(id)); if (name !== null) app.saveViewpoint(name, true); }} />}
      {hidden ? <Btn small icon="eye" label={t('inspector.showObject')} onClick={() => app.showBody(id)} /> : simulated && id !== 'sun' && <Btn small icon="eyeOff" iconOnly label={t('common.hide')} onClick={() => app.hideBody(id)} />}
    </div>
  );
}

function Overview({ def }: { def: BodyDef }): JSX.Element {
  const id = def.id;
  const proj = app.scene?.projected.get(id);
  const hidden = S.hiddenBodies.value.has(id);
  const watching = orbitWatch.value?.id === id;
  const hasOrbitPeriod = !!def.orbit || !!def.satellite;
  return (
    <>
      <p style={{ color: 'var(--text-1)' }}>{tx(def.summary)}</p>
      {hidden && <Note kind="caution">{t('inspector.hiddenByLayer')}</Note>}
      {proj && proj.inFront && proj.radiusPx < 1 && def.level === 'simulated' && <Note>{t('inspector.tooSmall')}</Note>}
      {def.kind === 'region' && <Note>{t('inspector.regionActions')}</Note>}
      <ActionBar id={id} />
      {hasOrbitPeriod && (
        <div className="row" style={{ marginTop: 8 }}>
          <Btn small icon={watching ? 'stop' : 'history'} label={t('time.completeOrbit')} pressed={watching} onClick={() => (watching ? (orbitWatch.value = null, S.clock.pause()) : app.observeOrbit(id))} title={t('time.completeOrbitDesc', { body: bodyName(id) })} />
        </div>
      )}
      <h4 style={{ margin: '14px 0 6px' }}>{t('inspector.keyFacts')}</h4>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)' }}>
        {def.facts.map((f, i) => <li key={i} style={{ marginBottom: 4 }}>{tx(f)}</li>)}
      </ul>
      {def.classificationNote && (
        <>
          <h4 style={{ margin: '14px 0 6px' }}>{t('inspector.classification')}</h4>
          <p style={{ color: 'var(--text-2)' }}>{tx(def.classificationNote)}</p>
        </>
      )}
    </>
  );
}

function Data({ def }: { def: BodyDef }): JSX.Element {
  const id = def.id;
  const p = def.physical;
  const prefs = S.prefs.value;
  const st = currentState();
  const me = st.get(id);
  const parentDef = def.parent ? BODY_MAP[def.parent] : undefined;
  const parentSt = def.parent ? st.get(def.parent) : undefined;
  const speed = me ? (parentSt && def.parent !== 'sun' ? Math.hypot(me.vel.x - parentSt.vel.x, me.vel.y - parentSt.vel.y, me.vel.z - parentSt.vel.z) : Math.hypot(me.vel.x, me.vel.y, me.vel.z)) : NaN;
  const phase = id !== 'earth' && id !== 'sun' && me ? illuminatedFraction(st, id, 'earth') : undefined;
  const mi = (km: number) => (prefs.familiarUnits ? `${fmtNumber(kmToMiles(km), km < 100 ? 2 : 0)} mi` : undefined);
  const sim = def.level === 'simulated';
  return (
    <>
      {sim && me && (
        <>
          <h4 style={{ margin: '0 0 6px' }}>{t('inspector.liveValues')} <Badge kind="live">{t('measure.live')}</Badge></h4>
          <dl className="kv">
            {id !== 'sun' && <KV live label={t('field.sunDistanceNow')} value={fmtKm(me.sunDistanceKm, { compact: true })} sub={fmtAu(me.sunDistanceKm / AU_KM)} term="au" />}
            {parentDef && def.parent !== 'sun' && <KV live label={t('field.parentDistanceNow', { parent: bodyName(parentDef.id) })} value={fmtKm(me.parentDistanceKm, { compact: true })} sub={`${fmtNumber(me.parentDistanceKm / parentDef.physical.meanRadiusKm, 1)} ${t('field.parentRadii')}`} />}
            {id !== 'sun' && <KV live label={t('field.orbitalSpeedNow')} value={`${fmtNumber(speed, 2)} ${t('unit.kms')}`} term="revolution" />}
            {id !== 'sun' && <KV live label={t('field.lightTimeFromSun')} value={fmtDuration(me.sunDistanceKm / C_KM_S)} term="light-time" />}
            {phase !== undefined && <KV live label={t('field.phase')} value={fmtPercent(phase, 0)} sub={t('common.fromEarth')} term="phase" />}
          </dl>
        </>
      )}
      <h4 style={{ margin: '14px 0 6px' }}>{t('inspector.staticValues')}</h4>
      <dl className="kv">
        {p.meanRadiusKm > 0 && <KV label={t('field.meanDiameter')} value={fmtKm(p.meanRadiusKm * 2)} sub={id !== 'earth' ? `${fmtNumber(p.meanRadiusKm / BODY_MAP.earth.physical.meanRadiusKm, 3)} ${t('compare.asEarth')}` : mi(p.meanRadiusKm * 2)} term="diameter" />}
        {p.equatorialRadiusKm && <KV label={t('field.equatorialDiameter')} value={fmtKm(p.equatorialRadiusKm * 2)} sub={mi(p.equatorialRadiusKm * 2)} />}
        {p.dimensionsKm && <KV label={t('field.dimensions')} value={p.dimensionsKm.map((d) => fmtNumber(d, 0)).join(' × ') + ' km'} />}
        {p.massKg && <KV label={t('field.mass')} value={`${fmtSci(p.massKg)} kg`} sub={id !== 'earth' ? `${fmtSci(p.massKg / BODY_MAP.earth.physical.massKg!, 3)} ${t('unit.earthMasses')}` : undefined} term="mass" />}
        {p.densityGcm3 && <KV label={t('field.density')} value={`${fmtNumber(p.densityGcm3, 3)} ${t('unit.gcm3')}`} term="density" />}
        {p.gravityMs2 && <KV label={t('field.gravity')} value={`${fmtNumber(p.gravityMs2, 2)} ${t('unit.ms2')}`} sub={t(`field.gravity.${p.gravityRef}`)} term="gravity" />}
        {p.escapeVelocityKms && <KV label={t('field.escapeVelocity')} value={`${fmtNumber(p.escapeVelocityKms, 2)} ${t('unit.kms')}`} />}
        {p.orbitalPeriodDays && <KV label={t('field.orbitalPeriod')} value={fmtDays(p.orbitalPeriodDays)} sub={p.orbitalPeriodDays > 400 ? `${fmtNumber(p.orbitalPeriodDays, 1)} ${t('unit.days')}` : undefined} term="revolution" />}
        {def.rotation && !def.rotation.synchronous && <KV label={t('field.rotationPeriod')} value={fmtHours(Math.abs(def.rotation.periodHours))} sub={def.rotation.periodHours < 0 ? t('inspector.retrograde') : undefined} term="rotation" />}
        {def.rotation?.synchronous && <KV label={t('field.rotationPeriod')} value={t('inspector.synchronous')} term="tidal-locking" />}
        {p.solarDayHours && <KV label={t('field.solarDay')} value={fmtHours(p.solarDayHours)} term="solar-day" />}
        {p.axialTiltDeg !== undefined && <KV label={t('field.axialTilt')} value={fmtDeg(p.axialTiltDeg, 2)} term="axial-tilt" />}
        {p.semiMajorAxisAu && <KV label={t('field.semiMajorAxis')} value={p.semiMajorAxisAu < 0.05 ? fmtKm(p.semiMajorAxisAu * AU_KM, { compact: true }) : fmtAu(p.semiMajorAxisAu)} term="au" />}
        {p.eccentricity !== undefined && <KV label={t('field.eccentricity')} value={fmtNumber(p.eccentricity, 4)} term="eccentricity" />}
        {p.inclinationDeg !== undefined && <KV label={t('field.inclination')} value={fmtDeg(p.inclinationDeg, 2)} term="inclination" />}
        {p.tempMeanK && <KV label={id === 'sun' ? t('field.effectiveTemp') : t('field.temperature')} value={fmtTempK(p.tempMeanK, prefs.tempUnit)} sub={[p.tempRef ? t(`field.tempRef.${p.tempRef}`) : '', p.tempMinK && p.tempMaxK ? t('field.tempRange', { min: fmtTempK(p.tempMinK, prefs.tempUnit), max: fmtTempK(p.tempMaxK, prefs.tempUnit) }) : ''].filter(Boolean).join(' · ')} />}
        {p.geometricAlbedo !== undefined && <KV label={t('field.albedo')} value={fmtNumber(p.geometricAlbedo, 3)} />}
        {p.knownMoons !== undefined && <KV label={t('field.knownMoons')} value={String(p.knownMoons)} sub={p.knownMoonsAsOf ? t('inspector.asOf', { date: p.knownMoonsAsOf }) : undefined} />}
      </dl>
      <p className="muted" style={{ marginTop: 10 }}>{t('field.diameterDef')} {t('field.siderealNote')}</p>
      <p className="muted">{t('inspector.dataAsOf', { date: def.dataAsOf })}</p>
    </>
  );
}

function System({ def }: { def: BodyDef }): JSX.Element {
  const id = def.id;
  const moons = childrenOf(id);
  const shown = moons.filter((m) => m.level === 'simulated');
  const parent = def.parent ? BODY_MAP[def.parent] : undefined;
  const siblings = def.kind === 'moon' && def.parent ? childrenOf(def.parent).filter((m) => m.id !== id) : [];
  return (
    <>
      {parent && (
        <>
          <h4 style={{ margin: '0 0 6px' }}>{t('inspector.parent')}</h4>
          <BodyRow id={parent.id} showFav={false} />
        </>
      )}
      {(moons.length > 0 || def.physical.knownMoons) && (
        <>
          <h4 style={{ margin: '12px 0 6px' }}>{t('inspector.moonsShown')} <Badge>{shown.length}</Badge>{def.physical.knownMoons !== undefined && <span className="muted" style={{ marginLeft: 8 }}>{t('inspector.knownMoons')}: {def.physical.knownMoons} {def.physical.knownMoonsAsOf && t('inspector.asOf', { date: def.physical.knownMoonsAsOf })}</span>}</h4>
          {shown.map((m) => <BodyRow key={m.id} id={m.id} showFav={false} />)}
          <div className="row" style={{ marginTop: 6 }}>
            <Btn small icon="orbit" label={t('inspector.exploreMoons')} onClick={() => app.exploreMoons(id)} />
          </div>
        </>
      )}
      {siblings.length > 0 && (
        <>
          <h4 style={{ margin: '12px 0 6px' }}>{t('search.group.moons')} · {bodyName(def.parent!)}</h4>
          {siblings.map((m) => <BodyRow key={m.id} id={m.id} showFav={false} />)}
        </>
      )}
      <h4 style={{ margin: '14px 0 6px' }}>{t('inspector.modelNotes')}</h4>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-2)', fontSize: '0.9em' }}>
        <li><strong>{t('inspector.positionModel')}:</strong> {t(positionModelKey(def))}</li>
        <li>{t(`level.${def.level}`)}: {t(`level.${def.level}.desc`)}</li>
        {def.appearance.illustrative && def.level === 'simulated' && <li>{t('inspector.appearanceIllustrative')}</li>}
        {id === 'earth' && <li>{t('inspector.appearanceEarth')}</li>}
        {def.appearance.rings?.enhanced && <li>{t('inspector.ringsEnhanced')}</li>}
        {def.rotation?.synchronous && <li><Term id="tidal-locking">{t('inspector.tidalLocking')}</Term>: {t('inspector.tidalLockingDesc')}</li>}
        {def.satellite && !def.satellite.phaseIsReal && <li>{t('inspector.positionModel.satellite')}</li>}
      </ul>
    </>
  );
}

function Sources({ def }: { def: BodyDef }): JSX.Element {
  return (
    <>
      <p className="muted">{t('inspector.dataAsOf', { date: def.dataAsOf })}</p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {def.sourceIds.map((sid) => { const s = SOURCES[sid]; if (!s) return null; return <li key={sid} style={{ marginBottom: 6 }}><ExternalLink href={s.url}>{s.label}</ExternalLink><br /><span className="muted">{t('inspector.asOf', { date: s.accessed })}</span></li>; })}
      </ul>
      {def.orbit && <p className="muted" style={{ marginTop: 10 }}>{t('inspector.positionModel')}: {t(positionModelKey(def))} · {t('time.supportedRange')}</p>}
    </>
  );
}

export function InspectorBody({ def, tab }: { def: BodyDef; tab: Tab }): JSX.Element {
  // Subscribe to the throttled readout so live values refresh at ~4 Hz.
  void S.readoutMs.value;
  if (tab === 'data') return <Data def={def} />;
  if (tab === 'system') return <System def={def} />;
  if (tab === 'sources') return <Sources def={def} />;
  return <Overview def={def} />;
}

export function Inspector(): JSX.Element | null {
  const id = S.selectedId.value;
  const [tab, setTab] = useState<Tab>('overview');
  const [collapsed, setCollapsed] = useState(false);
  if (!id) return null;
  const def = BODY_MAP[id];
  const narrow = S.isNarrow.value;
  const tabs: Tab[] = ['overview', 'data', 'system', 'sources'];
  const badges: JSX.Element[] = [<Badge key="k" kind="accent">{t(`kind.${def.kind}`)}</Badge>];
  if (def.level !== 'simulated') badges.push(<Badge key="l" kind="caution">{t('common.schematic')}</Badge>);
  if (def.orbit?.model === 'hypothetical') badges.push(<Badge key="h" kind="warm">{t('common.hypothetical')}</Badge>);
  else if (def.appearance.illustrative && def.level === 'simulated') badges.push(<Badge key="i">{t('common.illustrative')}</Badge>);
  return (
    <aside className={`panel inspector ${collapsed && narrow ? 'is-collapsed' : ''}`} aria-label={t('nav.inspector')}>
      <div className="panel-header" onClick={() => { if (narrow) setCollapsed(!collapsed); }} style={{ position: 'relative' }}>
        <BodyThumb id={id} size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{bodyName(id)} {badges}</h2>
          {def.parent && def.parent !== 'sun' && <div className="muted">{t('inspector.parent')} {bodyName(def.parent)}</div>}
        </div>
        {narrow && <Btn icon={collapsed ? 'chevronUp' : 'chevronDown'} iconOnly small variant="ghost" label={collapsed ? t('common.expand') : t('common.collapse')} onClick={(e: Event) => { e.stopPropagation(); setCollapsed(!collapsed); }} />}
        <Btn icon="close" iconOnly small variant="ghost" label={t('common.close')} onClick={(e: Event) => { e.stopPropagation(); S.inspectorOpen.value = false; }} />
      </div>
      {!(collapsed && narrow) && (
        <>
          <div className="tabs" role="tablist">
            {tabs.map((tb) => <button key={tb} type="button" role="tab" aria-selected={tab === tb} onClick={() => setTab(tb)}>{t(`inspector.${tb}`)}</button>)}
          </div>
          <div className="panel-body" role="tabpanel">
            <InspectorBody def={def} tab={tab} />
          </div>
        </>
      )}
      {collapsed && narrow && <div style={{ padding: '0 12px 10px' }}><ActionBar id={id} /></div>}
      <span className="sr-only"><Icon name="info" /></span>
    </aside>
  );
}

export const SIMULATED_BODIES = BODIES.filter((b) => b.level === 'simulated');
