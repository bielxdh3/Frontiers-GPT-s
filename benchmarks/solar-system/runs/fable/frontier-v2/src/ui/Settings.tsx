import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import * as S from '../state/store';
import type { Prefs } from '../state/store';
import { app, bodyName } from '../app/controller';
import { audio } from '../app/audio';
import { PLANET_IDS, BODY_MAP } from '../data/bodies';
import { setLocale, t } from '../i18n';
import { savePrefs } from '../state/persistence';
import { Badge, Btn, Dialog, Note, Range, Seg, Switch } from './common';

type Section = 'appearance' | 'performance' | 'accessibility' | 'audio' | 'language' | 'diagnostics';

const PRESETS: Record<string, Partial<Prefs>> = {
  cinematic: { presentation: 'enhanced', bloom: true, background: 0.9, panelOpacity: 0.8, labelDensity: 0.5, labelsMode: 'selected', orbitsMode: 'selected', exposure: 1 },
  classroom: { presentation: 'natural', bloom: false, background: 0.35, panelOpacity: 1, labelDensity: 1, labelsMode: 'major', orbitsMode: 'all', highContrast: true, labelSize: 1.2, uiScale: 1.15 },
  study: { presentation: 'natural', bloom: true, background: 0.6, panelOpacity: 0.95, labelDensity: 1, labelsMode: 'system', orbitsMode: 'all', exposure: 1.2, overlays: { ...S.DEFAULT_OVERLAYS, ecliptic: true, axes: true, apsides: true } },
  lowPower: { quality: 'low', bloom: false, background: 0.4, autoRotate: false, presentation: 'natural' },
};

/** Synchronise the audio engine with the audio preferences (must run from a user gesture when enabling). */
export async function applyAudioPrefs(): Promise<void> {
  const a = S.prefs.value.audio;
  if (!a.master) { audio.disable(); return; }
  const ok = await audio.enable();
  if (!ok) { S.updatePrefs({ audio: { ...a, master: false } }); S.toast(audio.caps().webAudio ? t('audio.initFailed') : t('audio.unavailable'), 'error'); return; }
  if (a.ambience > 0) audio.startAmbience(a.ambience); else audio.stopAmbience();
  audio.setUiLevel(a.ui);
}

export function SettingsDialog(): JSX.Element {
  const [section, setSection] = useState<Section>('appearance');
  const [confirmReset, setConfirmReset] = useState(false);
  const p = S.prefs.value;
  const set = (patch: Partial<Prefs>) => { S.updatePrefs(patch); savePrefs(); };
  const setAudio = (patch: Partial<Prefs['audio']>) => { set({ audio: { ...S.prefs.value.audio, ...patch } }); void applyAudioPrefs(); };
  const caps = audio.caps();
  const sections: { id: Section; label: string }[] = [
    { id: 'appearance', label: t('settings.appearance') }, { id: 'performance', label: t('settings.performance') }, { id: 'accessibility', label: t('settings.accessibility') },
    { id: 'audio', label: t('audio.title') }, { id: 'language', label: t('common.language') }, { id: 'diagnostics', label: t('settings.diagnostics') },
  ];
  const gl = app.scene?.renderer.getContext();
  const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
  const gpu = gl && dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : t('common.unknown');
  return (
    <Dialog id="settings" title={t('settings.title')} onClose={() => app.closeTool()} wide>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="muted">{t('common.presets')}:</span>
        {Object.keys(PRESETS).map((k) => <Btn key={k} small onClick={() => { set(PRESETS[k]); S.toast(t('settings.presetApplied', { name: t(`settings.preset.${k}`) }), 'info'); }}>{t(`settings.preset.${k}`)}</Btn>)}
      </div>
      <div className="tabs" role="tablist" style={{ marginBottom: 10 }}>
        {sections.map((s) => <button key={s.id} type="button" role="tab" className={`tab ${section === s.id ? 'is-active' : ''}`} aria-selected={section === s.id} onClick={() => setSection(s.id)}>{s.label}</button>)}
      </div>
      {section === 'appearance' && (
        <div className="stack">
          <div className="field"><label>{t('settings.presentation')}</label><Seg label={t('settings.presentation')} value={p.presentation} onChange={(v) => set({ presentation: v })} options={[{ value: 'natural', label: t('settings.presentation.natural') }, { value: 'enhanced', label: t('settings.presentation.enhanced') }]} /><span className="muted" style={{ fontSize: '0.85em' }}>{t('settings.presentationNote')}</span></div>
          <Range label={t('settings.background')} value={p.background} min={0} max={1} step={0.05} onChange={(v) => set({ background: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Range label={t('settings.exposure')} value={p.exposure} min={0.6} max={2} step={0.05} onChange={(v) => set({ exposure: v })} format={(v) => `${v.toFixed(2)}×`} />
          <p className="muted" style={{ margin: '-6px 0 6px', fontSize: '0.85em' }}>{t('settings.exposureNote')}</p>
          <Switch label={t('settings.bloom')} checked={p.bloom} onChange={(v) => set({ bloom: v })} disabled={S.effectiveQuality.value === 'low'} note={S.effectiveQuality.value === 'low' ? t('settings.bloomUnavailable') : undefined} />
          <Switch label={t('settings.autoRotate')} checked={p.autoRotate} onChange={(v) => set({ autoRotate: v })} />
          <Switch label={t('overlay.milkyWay')} checked={p.overlays.milkyWay} onChange={(v) => S.updateOverlays({ milkyWay: v })} />
          <Range label={t('settings.panelOpacity')} value={p.panelOpacity} min={0.6} max={1} step={0.02} onChange={(v) => set({ panelOpacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Range label={t('settings.uiScale')} value={p.uiScale} min={0.9} max={1.3} step={0.05} onChange={(v) => set({ uiScale: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Range label={t('settings.labelSize')} value={p.labelSize} min={0.85} max={1.3} step={0.05} onChange={(v) => set({ labelSize: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Range label={t('labels.density')} value={p.labelDensity} min={0.4} max={1} step={0.05} onChange={(v) => set({ labelDensity: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <div className="row">{confirmReset ? <><span className="muted" style={{ fontSize: '0.85em' }}>{t('time.resetSettingsDesc')}</span><Btn small label={t('common.cancel')} onClick={() => setConfirmReset(false)} /><Btn small variant="danger" label={t('common.confirm')} onClick={() => { const { locale, audio: au, scaleMode } = S.prefs.value; S.prefs.value = { ...S.DEFAULT_PREFS, overlays: { ...S.DEFAULT_OVERLAYS }, locale, audio: au, scaleMode }; savePrefs(); setConfirmReset(false); }} /></> : <Btn small variant="ghost" icon="refresh" label={t('settings.resetVisual')} onClick={() => setConfirmReset(true)} />}</div>
        </div>
      )}
      {section === 'performance' && (
        <div className="stack">
          <div className="field"><label>{t('settings.quality')}</label><Seg label={t('settings.quality')} value={p.quality} onChange={(v) => set({ quality: v })} options={(['auto', 'low', 'medium', 'high'] as Prefs['quality'][]).map((q) => ({ value: q, label: t(`settings.quality.${q}`) }))} /><span className="muted" style={{ fontSize: '0.85em' }}>{t('settings.qualityNote')}</span></div>
          <div className="kv"><div className="k">{t('status.quality', { q: '' })}</div><div className="v">{t(`settings.quality.${S.effectiveQuality.value}`)}</div><div className="k">{t('status.fps', { fps: '' })}</div><div className="v num">{Math.round(S.fps.value)}</div><div className="k">{t('settings.pixelRatio')}</div><div className="v num">{app.scene ? app.scene.renderer.getPixelRatio().toFixed(2) : '—'}</div></div>
          <Note>{t('time.backgroundPolicy')}</Note>
        </div>
      )}
      {section === 'accessibility' && (
        <div className="stack">
          <div className="field"><label>{t('settings.reducedMotion')}</label><Seg label={t('settings.reducedMotion')} value={p.reducedMotion} onChange={(v) => set({ reducedMotion: v })} options={[{ value: 'system', label: t('settings.reducedMotion.system') }, { value: 'on', label: t('settings.reducedMotion.on') }, { value: 'off', label: t('settings.reducedMotion.off') }]} /></div>
          <Switch label={t('settings.highContrast')} checked={p.highContrast} onChange={(v) => set({ highContrast: v })} desc={t('labels.highContrast')} />
          <Switch label={t('settings.simplified')} checked={p.simplified} onChange={(v) => set({ simplified: v })} />
          <Range label={t('settings.uiScale')} value={p.uiScale} min={0.9} max={1.3} step={0.05} onChange={(v) => set({ uiScale: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Btn small icon="keyboard" label={t('help.shortcuts')} onClick={() => app.openTool('help')} />
        </div>
      )}
      {section === 'audio' && (
        <div className="stack">
          <Note>{t('audio.note')}</Note>
          {!caps.webAudio && <Note kind="caution">{t('audio.unavailable')}</Note>}
          <Switch label={t('audio.master')} checked={p.audio.master} disabled={!caps.webAudio} onChange={(v) => setAudio({ master: v })} note={t('common.requiresInteraction')} />
          <Range label={t('audio.ambience')} value={p.audio.ambience} min={0} max={1} step={0.05} onChange={(v) => setAudio({ ambience: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Range label={t('audio.ui')} value={p.audio.ui} min={0} max={1} step={0.05} onChange={(v) => setAudio({ ui: v })} format={(v) => `${Math.round(v * 100)}%`} />
          <Switch label={t('audio.narration')} checked={p.audio.narration} disabled={!caps.speech} note={caps.speech ? undefined : t('tours.narrationUnavailable')} onChange={(v) => set({ audio: { ...p.audio, narration: v } })} />
          <div className="card">
            <h3>{t('audio.sonification')}</h3>
            <p className="muted" style={{ marginTop: 0 }}>{t('audio.sonificationNote')}</p>
            <Btn small icon="play" label={t('audio.play')} disabled={!p.audio.master} onClick={() => { const items = PLANET_IDS.map((id) => ({ id, periodDays: BODY_MAP[id].physical.orbitalPeriodDays ?? 365 })); const map = audio.sonify(items); S.announce(map.map((m, i) => `${bodyName(items[i].id)}: ${Math.round(m.hz)} Hz`).join(', ')); }} />
          </div>
        </div>
      )}
      {section === 'language' && (
        <div className="stack">
          <div className="field"><label>{t('settings.language')}</label><Seg label={t('settings.language')} value={p.locale} onChange={(v) => { set({ locale: v }); setLocale(v); }} options={[{ value: 'pt-BR', label: 'Português (Brasil)' }, { value: 'en', label: 'English' }]} /></div>
          <div className="field"><label>{t('settings.temperatureUnit')}</label><Seg label={t('settings.temperatureUnit')} value={p.tempUnit} onChange={(v) => set({ tempUnit: v })} options={[{ value: 'K', label: 'K' }, { value: 'C', label: '°C' }, { value: 'F', label: '°F' }]} /></div>
          <Switch label={t('settings.units')} checked={p.familiarUnits} onChange={(v) => set({ familiarUnits: v })} desc={p.familiarUnits ? t('common.familiar') : t('common.metric')} />
          <p className="muted" style={{ margin: 0 }}>{t('settings.dateFormat')}: {t('time.timezone')} · {t('time.dateHint')}</p>
        </div>
      )}
      {section === 'diagnostics' && (
        <div className="stack">
          <h3>{t('settings.capabilities')}</h3>
          <div className="kv">
            <div className="k">WebGL</div><div className="v">{S.webglAvailable.value ? <Badge kind="accent">{t('common.enabled')}</Badge> : <Badge kind="caution">{t('common.unavailable')}</Badge>}</div>
            <div className="k">GPU</div><div className="v" style={{ wordBreak: 'break-word' }}>{gpu}</div>
            <div className="k">Web Audio</div><div className="v">{caps.webAudio ? t('common.yes') : t('common.no')}</div>
            <div className="k">{t('tours.narration')}</div><div className="v">{caps.speech ? t('common.yes') : t('common.no')}</div>
            <div className="k">MediaRecorder</div><div className="v">{app.recordingSupported() ? t('common.yes') : t('common.no')}</div>
            <div className="k">localStorage</div><div className="v">{S.storageAvailable.value ? t('common.yes') : t('common.no')}</div>
            <div className="k">{t('common.status')}</div><div className="v">{S.contextLost.value ? t('error.contextLost') : t('common.ok')}</div>
            <div className="k">{t('settings.pixelRatio')}</div><div className="v num">{window.devicePixelRatio.toFixed(2)} · {S.viewport.value.w}×{S.viewport.value.h}</div>
          </div>
          <Btn small icon="download" label={t('settings.dataExport')} onClick={() => app.openTool('collections')} />
        </div>
      )}
    </Dialog>
  );
}
