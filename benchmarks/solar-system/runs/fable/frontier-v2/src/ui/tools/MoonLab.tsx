import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import * as S from '../../state/store';
import { app } from '../../app/controller';
import { BODY_MAP } from '../../data/bodies';
import { AU_KM } from '../../data/types';
import { clock } from '../../state/store';
import { moonGeocentric } from '../../sim/moon';
import { distanceBetween } from '../../sim/ephemeris';
import { angularDiameterRad } from '../../sim/physics';
import { fmtDateTimeUtc, fmtDeg, fmtKm, fmtPercent, t } from '../../i18n';
import { labPreset } from '../Timebar';
import { Badge, Btn, Note, Range, Seg, Switch, Term } from '../common';
import { Workspace } from './ToolRouter';

const REAL_INCL = 5.145;
export function phaseName(elongDeg: number): string {
  const d = ((elongDeg % 360) + 360) % 360;
  if (d < 10 || d >= 350) return t('moonlab.phase.new');
  if (d < 80) return t('moonlab.phase.waxingCrescent');
  if (d < 100) return t('moonlab.phase.firstQuarter');
  if (d < 170) return t('moonlab.phase.waxingGibbous');
  if (d < 190) return t('moonlab.phase.full');
  if (d < 260) return t('moonlab.phase.waningGibbous');
  if (d < 280) return t('moonlab.phase.lastQuarter');
  return t('moonlab.phase.waningCrescent');
}

/** SVG path of the lit part of a disc of radius r for elongation D (0 = new). Northern-hemisphere orientation (waxing lit on the right). */
function litPath(r: number, D: number): string {
  const d = ((D % 360) + 360) % 360;
  const k = Math.cos((d * Math.PI) / 180); // +1 new, -1 full
  const waxing = d <= 180;
  const rx = Math.abs(k) * r;
  const sweepOuter = waxing ? 1 : 0;
  // Outer limb half (lit side) + terminator ellipse
  const outer = `M 0 ${-r} A ${r} ${r} 0 0 ${sweepOuter} 0 ${r}`;
  const termSweep = (k > 0) === waxing ? 0 : 1;
  const term = `A ${rx} ${r} 0 0 ${termSweep} 0 ${-r}`;
  return `${outer} ${term} Z`;
}

export function MoonLab(): JSX.Element {
  void S.readoutMs.value;
  const [useSim, setUseSim] = useState(false);
  const [elong, setElong] = useState(90);
  const [incl, setIncl] = useState(REAL_INCL);
  const [nodeOffset, setNodeOffset] = useState(90); // angle from ascending node to the sun direction; controls latitude at syzygy
  const [view, setView] = useState<'earth' | 'external'>('earth');
  useEffect(() => {
    const p = labPreset.value;
    if (p?.tool === 'moon-lab') {
      if (p.preset === 'solar') { setElong(0); setNodeOffset(0); } else if (p.preset === 'lunar') { setElong(180); setNodeOffset(0); } else if (p.preset === 'none') { setElong(0); setNodeOffset(90); }
      labPreset.value = null;
    }
  }, []);
  const geo = moonGeocentric(clock.jd);
  const D = useSim ? geo.meanElongationDeg : elong;
  const lat = useSim ? geo.latDeg : incl * Math.sin(((D + nodeOffset) * Math.PI) / 180);
  const distMoon = useSim ? geo.distanceKm : 384400;
  const distSun = (app.scene?.state && distanceBetween(app.scene.state, 'sun', 'earth')) ?? AU_KM;
  const frac = (1 - Math.cos((D * Math.PI) / 180)) / 2;
  const appSun = (angularDiameterRad(BODY_MAP.sun.physical.meanRadiusKm, distSun) * 180) / Math.PI;
  const appMoon = (angularDiameterRad(BODY_MAP.moon.physical.meanRadiusKm, distMoon) * 180) / Math.PI;
  const nearNew = Math.abs(((D + 180) % 360) - 180) < 8, nearFull = Math.abs(D - 180) < 8;
  const offPlaneKm = distMoon * Math.sin((lat * Math.PI) / 180);
  const solarPossible = nearNew && Math.abs(lat) < 1.5, lunarPossible = nearFull && Math.abs(lat) < 1.0;
  const W = 560, H = 320;
  return (
    <Workspace title={t('moonlab.title')} icon="moon" experimental={Math.abs(incl - REAL_INCL) > 0.05 && !useSim ? t('lab.hypothetical') : undefined} footer={<span className="muted">{t('moonlab.notPredictor')} {t('moonlab.schematicNote')}</span>}>
      <div className="tool-split">
        <div className="stack">
          <div className="card">
            <Switch label={t('moonlab.useSimDate')} checked={useSim} onChange={setUseSim} desc={useSim ? `${t('moonlab.simDateNote')} ${fmtDateTimeUtc(clock.simMs)}` : undefined} />
            <Range label={t('moonlab.phaseAngle')} value={Math.round(D)} min={0} max={359} step={1} onChange={(v) => { setUseSim(false); setElong(v); }} format={(v) => `${fmtDeg(v, 0)} · ${phaseName(v)}`} />
            <div className="row" style={{ marginBottom: 8 }}>{[0, 90, 180, 270].map((a) => <Btn key={a} small pressed={!useSim && elong === a} onClick={() => { setUseSim(false); setElong(a); }}>{phaseName(a)}</Btn>)}</div>
            <Range label={t('moonlab.inclinationHyp')} value={incl} min={0} max={15} step={0.1} onChange={(v) => { setUseSim(false); setIncl(v); }} format={(v) => fmtDeg(v, 1)} />
            {Math.abs(incl - REAL_INCL) > 0.05 && <Btn small label={`${t('common.reset')} (${t('moonlab.inclination')})`} onClick={() => setIncl(REAL_INCL)} />}
            <Range label={t('moonlab.nodeDistance')} value={nodeOffset} min={0} max={180} step={1} onChange={(v) => { setUseSim(false); setNodeOffset(v); }} format={(v) => fmtDeg(v, 0)} />
            <div className="row">
              <Btn small onClick={() => { setUseSim(false); setElong(0); setNodeOffset(0); }}>{t('moonlab.preset.solar')}</Btn>
              <Btn small onClick={() => { setUseSim(false); setElong(180); setNodeOffset(0); }}>{t('moonlab.preset.lunar')}</Btn>
              <Btn small onClick={() => { setUseSim(false); setElong(0); setNodeOffset(90); }}>{t('moonlab.preset.none')}</Btn>
            </div>
          </div>
          <div className="card">
            <div className="kv" style={{ margin: 0 }}>
              <div className="k"><Term id="phase">{t('moonlab.illuminated')}</Term></div><div className="v num">{fmtPercent(frac, 0)} · {phaseName(D)} ({D <= 180 ? t('moonlab.waxing') : t('moonlab.waning')})</div>
              <div className="k">{t('moonlab.nodeDistance')}</div><div className="v num">{fmtDeg(lat, 2)} · {fmtKm(Math.abs(offPlaneKm))}</div>
              <div className="k">{t('moonlab.apparentSizes')}</div><div className="v num">{t('moonlab.apparentSun', { value: fmtDeg(appSun, 3) })}<br />{t('moonlab.apparentMoon', { value: fmtDeg(appMoon, 3) })}</div>
            </div>
            <div style={{ marginTop: 8 }}>
              {solarPossible && <Badge kind="warm">{appMoon >= appSun ? t('moonlab.eclipseType.total') : t('moonlab.eclipseType.annular')}</Badge>}
              {lunarPossible && <Badge kind="warm">{t('moonlab.preset.lunar')}</Badge>}
              {!solarPossible && !lunarPossible && <Badge>{t('moonlab.preset.none')}</Badge>}
            </div>
          </div>
          <div className="card">
            <h3>{t('moonlab.whyNoEclipse')}</h3>
            <p className="muted" style={{ marginTop: 0 }}>{t('moonlab.whyNoEclipseText')}</p>
            <details><summary>{t('moonlab.stepThrough')}</summary><ol style={{ paddingLeft: 18, color: 'var(--text-2)' }}><li>{t('moonlab.step1').replace(/^\d\.\s*/, '')}</li><li>{t('moonlab.step2').replace(/^\d\.\s*/, '')}</li><li>{t('moonlab.step3').replace(/^\d\.\s*/, '')}</li><li>{t('moonlab.step4').replace(/^\d\.\s*/, '')}</li></ol></details>
          </div>
        </div>
        <div className="stack">
          <Seg label={t('moonlab.title')} value={view} onChange={setView} options={[{ value: 'earth', label: t('moonlab.fromEarth') }, { value: 'external', label: t('moonlab.external') }]} />
          <div className="tool-stage" style={{ height: H, flex: 'none' }}>
            {view === 'earth' ? (
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('moonlab.fromEarth')}>
                <g transform={`translate(${W / 2} ${H / 2})`}>
                  <circle r={110} fill="#1a1c22" stroke="#3a4560" />
                  <path d={litPath(110, D)} fill="#d9d9d3" />
                  <circle r={110} fill="url(#ml-tex)" opacity="0.35" />
                </g>
                <defs><radialGradient id="ml-tex" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity="0.15" /><stop offset="1" stop-color="#000" stop-opacity="0.5" /></radialGradient></defs>
                <text x={W / 2} y={H - 14} text-anchor="middle" fill="#aeb8ca" font-size="12">{phaseName(D)} · {fmtPercent(frac, 0)} · {t('moonlab.observer')}: {t('seasons.northern')}</text>
              </svg>
            ) : (
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('moonlab.external')}>
                {/* Sun far left, Earth center, Moon on its orbit; latitude shown as vertical offset (exaggerated) */}
                <circle cx={-60} cy={H / 2} r={120} fill="#ffd27a" opacity="0.9" />
                <text x={20} y={H / 2 - 100} fill="#ffcf7a" font-size="12">{t('moonlab.sunlight')} →</text>
                <ellipse cx={W / 2 + 40} cy={H / 2} rx={150} ry={150 * 0.35} fill="none" stroke="#3a4560" stroke-dasharray="4 4" />
                {(() => {
                  const ex = W / 2 + 40, ey = H / 2, er = 22, mr = 7;
                  const ang = ((180 - D) * Math.PI) / 180; // D=0 → moon toward sun (left)
                  const mx = ex + Math.cos(ang) * 150, my = ey + Math.sin(ang) * 150 * 0.35 - lat * 6;
                  return (
                    <g>
                      {/* Earth shadow cone (schematic) */}
                      <polygon points={`${ex},${ey - er} ${ex + 260},${ey - 4} ${ex + 260},${ey + 4} ${ex},${ey + er}`} fill="#000" opacity="0.55" />
                      <polygon points={`${ex},${ey - er} ${ex + 260},${ey - 22} ${ex + 260},${ey + 22} ${ex},${ey + er}`} fill="#000" opacity="0.2" />
                      <text x={ex + 200} y={ey - 30} fill="#aeb8ca" font-size="10">{t('moonlab.earthShadow')} ({t('moonlab.umbra')}/{t('moonlab.penumbra')})</text>
                      {/* Moon shadow (schematic) */}
                      {D < 90 || D > 270 ? <polygon points={`${mx},${my - mr} ${mx + 120},${my - 1} ${mx + 120},${my + 1} ${mx},${my + mr}`} fill="#000" opacity="0.6" /> : null}
                      <circle cx={ex} cy={ey} r={er} fill="#3b7dd8" />
                      <path d={`M ${ex} ${ey - er} A ${er} ${er} 0 0 1 ${ex} ${ey + er} Z`} fill="#000" opacity="0.6" />
                      <circle cx={mx} cy={my} r={mr} fill="#cfcfc8" />
                      <path d={`M ${mx} ${my - mr} A ${mr} ${mr} 0 0 1 ${mx} ${my + mr} Z`} fill="#000" opacity="0.6" />
                      <line x1={mx} x2={mx} y1={ey + Math.sin(ang) * 150 * 0.35} y2={my} stroke="#6fe0a8" stroke-dasharray="2 2" />
                      <text x={mx + 10} y={my - 8} fill="#e8ecf3" font-size="11">{fmtDeg(lat, 1)}</text>
                    </g>
                  );
                })()}
                <text x={W / 2} y={H - 10} text-anchor="middle" fill="#aeb8ca" font-size="11">{t('common.schematic')} · {t('moonlab.inclination')}: {fmtDeg(useSim ? REAL_INCL : incl, 1)}</text>
              </svg>
            )}
          </div>
          <Note>{t('moonlab.phaseNote')}</Note>
          <p className="muted">{t('lab.canonicalUnchanged')}</p>
        </div>
      </div>
    </Workspace>
  );
}
