import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { bodyName } from '../../app/controller';
import { BODY_MAP } from '../../data/bodies';
import type { BodyId } from '../../data/types';
import { dayLengthHours, solarDeclinationDeg } from '../../sim/physics';
import { fmtDeg, fmtNumber, t } from '../../i18n';
import { labPreset } from '../Timebar';
import { Badge, Btn, Note, Range, Term } from '../common';
import { Workspace } from './ToolRouter';

const PLANETS: BodyId[] = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const PRESETS: { key: string; angle: number }[] = [{ key: 'marchEquinox', angle: 0 }, { key: 'juneSolstice', angle: 90 }, { key: 'septemberEquinox', angle: 180 }, { key: 'decemberSolstice', angle: 270 }];

function season(angle: number, north: boolean): string {
  const a = ((angle % 360) + 360) % 360;
  const idx = Math.floor(a / 90); // 0 spring(N) 1 summer(N) 2 autumn(N) 3 winter(N)
  const n = ['spring', 'summer', 'autumn', 'winter'];
  const s = ['autumn', 'winter', 'spring', 'summer'];
  return t(`seasons.season.${(north ? n : s)[idx]}`);
}

export function SeasonsLab(): JSX.Element {
  const [body, setBody] = useState<BodyId>('earth');
  const real = BODY_MAP[body].physical.axialTiltDeg ?? 0;
  const [tilt, setTilt] = useState(real);
  const [angle, setAngle] = useState(90);
  const [lat, setLat] = useState(45);
  const [showAnswer, setShowAnswer] = useState(false);
  useEffect(() => { setTilt(BODY_MAP[body].physical.axialTiltDeg ?? 0); }, [body]);
  useEffect(() => {
    const p = labPreset.value;
    if (p?.tool === 'seasons-lab') { const pr = PRESETS.find((x) => x.key === p.preset); if (pr) setAngle(pr.angle); labPreset.value = null; }
  }, []);
  const hoursInDay = BODY_MAP[body].physical.solarDayHours ?? 24;
  const decl = solarDeclinationDeg(tilt, angle);
  const day = dayLengthHours(lat, decl, hoursInDay);
  const modified = Math.abs(tilt - real) > 0.05;
  // Globe diagram
  const W = 520, H = 320, cx = 300, cy = 160, R = 110;
  const tiltRad = (tilt * Math.PI) / 180;
  // In this side view, the Sun is to the left; the axis is tilted toward/away from the Sun by tilt * sin(angle)
  const eff = Math.asin(Math.sin(tiltRad) * Math.sin((angle * Math.PI) / 180)); // effective tilt in view plane (= declination in rad)
  const latRad = (lat * Math.PI) / 180;
  // Year chart of day length at the chosen latitude
  const CW = 520, CH = 150;
  const pts = Array.from({ length: 73 }, (_, i) => { const a = i * 5; const d = dayLengthHours(lat, solarDeclinationDeg(tilt, a), hoursInDay); return `${20 + (a / 360) * (CW - 40)},${CH - 20 - (d.hours / hoursInDay) * (CH - 40)}`; }).join(' ');
  return (
    <Workspace title={t('seasons.title')} icon="sun" experimental={modified ? t('lab.hypothetical') : undefined} footer={<span className="muted">{t('seasons.note')}</span>}>
      <div className="tool-split">
        <div className="stack">
          <div className="card">
            <div className="field"><label htmlFor="se-body">{t('seasons.body')}</label>
              <select id="se-body" value={body} onChange={(e) => setBody((e.target as HTMLSelectElement).value as BodyId)}>{PLANETS.map((id) => <option key={id} value={id}>{bodyName(id)}</option>)}</select></div>
            <Range label={`${t('seasons.tilt')}`} value={tilt} min={0} max={90} step={0.5} onChange={setTilt} format={(v) => fmtDeg(v, 1)} />
            {modified && <div className="row" style={{ marginBottom: 8 }}><Badge kind="warm">{t('seasons.modified', { value: fmtDeg(tilt, 1), body: bodyName(body), real: fmtDeg(real, 1) })}</Badge><Btn small label={t('seasons.restore')} onClick={() => setTilt(real)} /></div>}
            <Range label={t('seasons.orbitPosition')} value={angle} min={0} max={359} step={1} onChange={setAngle} format={(v) => fmtDeg(v, 0)} />
            <div className="row" style={{ marginBottom: 8 }}>{PRESETS.map((p) => <Btn key={p.key} small pressed={angle === p.angle} onClick={() => setAngle(p.angle)}>{t(`seasons.preset.${p.key}`)}</Btn>)}</div>
            <Range label={t('seasons.latitude')} value={lat} min={-90} max={90} step={1} onChange={setLat} format={(v) => `${fmtDeg(Math.abs(v), 0)} ${v >= 0 ? 'N' : 'S'}`} />
          </div>
          <div className="card">
            <div className="kv" style={{ margin: 0 }}>
              <div className="k"><Term id="axial-tilt">{t('seasons.declination')}</Term></div><div className="v num">{fmtDeg(decl, 2)}</div>
              <div className="k">{t('seasons.subsolar')}</div><div className="v num">{fmtDeg(Math.abs(decl), 2)} {decl >= 0 ? 'N' : 'S'}</div>
              <div className="k">{t('seasons.dayLength')}</div><div className="v num">{day.polar === 'day' ? t('seasons.polarDay') : day.polar === 'night' ? t('seasons.polarNight') : t('seasons.hoursOfDaylight', { hours: fmtNumber(day.hours, 1) })}</div>
              <div className="k">{t('seasons.northern')}</div><div className="v">{season(angle, true)}</div>
              <div className="k">{t('seasons.southern')}</div><div className="v">{season(angle, false)}</div>
            </div>
          </div>
          <div className="card">
            <p style={{ marginTop: 0 }}>{t('seasons.question')}</p>
            <Btn small icon="help" label={t('seasons.checkAnswer')} onClick={() => setShowAnswer((v) => !v)} pressed={showAnswer} />
            {showAnswer && <Note>{t('seasons.answerHint')}</Note>}
          </div>
        </div>
        <div className="stack">
          <div className="tool-stage" style={{ height: H, flex: 'none' }}>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('seasons.title')}>
              <defs><linearGradient id="se-shade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0" /><stop offset="0.5" stop-color="#fff" stop-opacity="0" /><stop offset="0.5" stop-color="#000" stop-opacity="0.7" /><stop offset="1" stop-color="#000" stop-opacity="0.85" /></linearGradient></defs>
              {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={20} x2={cx - R - 10} y1={cy - 80 + i * 40} y2={cy - 80 + i * 40} stroke="#ffcf7a" stroke-opacity="0.7" stroke-width="1.5" marker-end="none" />)}
              <text x={20} y={cy - 96} fill="#ffcf7a" font-size="12">{t('seasons.sunlight')} →</text>
              <circle cx={cx} cy={cy} r={R} fill={BODY_MAP[body].appearance.color} />
              <circle cx={cx} cy={cy} r={R} fill="url(#se-shade)" />
              <g transform={`rotate(${(eff * 180) / Math.PI} ${cx} ${cy})`}>
                <line x1={cx} x2={cx} y1={cy - R * 1.25} y2={cy + R * 1.25} stroke="#e8ecf3" stroke-width="2" stroke-dasharray="6 4" />
                <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.12} fill="none" stroke="#e8ecf3" stroke-opacity="0.6" />
                <ellipse cx={cx} cy={cy - Math.sin(latRad) * R} rx={Math.cos(latRad) * R} ry={Math.cos(latRad) * R * 0.12} fill="none" stroke="#6fe0a8" stroke-opacity="0.9" />
                <text x={cx + 6} y={cy - R * 1.25 - 4} fill="#e8ecf3" font-size="11">N</text>
                <text x={cx + R + 6} y={cy + 4} fill="#e8ecf3" font-size="11">{t('seasons.equator')}</text>
              </g>
              <circle cx={cx - R + 3} cy={cy} r={4} fill="#ffcf7a" />
              <text x={cx - R - 8} y={cy + 14} text-anchor="end" fill="#ffcf7a" font-size="11">{t('seasons.subsolar')}</text>
              <text x={cx} y={H - 10} text-anchor="middle" fill="#aeb8ca" font-size="11">{t('seasons.axis')}: {fmtDeg(tilt, 1)} · {t('seasons.orbitPosition')}: {fmtDeg(angle, 0)}</text>
            </svg>
          </div>
          <div className="tool-stage" style={{ height: CH, flex: 'none' }}>
            <svg viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={t('seasons.dayLength')}>
              <line x1={20} x2={CW - 20} y1={CH - 20} y2={CH - 20} stroke="#3a4560" />
              <line x1={20} x2={20} y1={20} y2={CH - 20} stroke="#3a4560" />
              <line x1={20} x2={CW - 20} y1={CH - 20 - (CH - 40) / 2} y2={CH - 20 - (CH - 40) / 2} stroke="#3a4560" stroke-dasharray="3 3" />
              <text x={24} y={CH - 24 - (CH - 40) / 2} fill="#aeb8ca" font-size="10">{fmtNumber(hoursInDay / 2, 1)} h</text>
              <text x={24} y={26} fill="#aeb8ca" font-size="10">{fmtNumber(hoursInDay, 1)} h</text>
              <polyline points={pts} fill="none" stroke="#6fe0a8" stroke-width="2" />
              <line x1={20 + (angle / 360) * (CW - 40)} x2={20 + (angle / 360) * (CW - 40)} y1={20} y2={CH - 20} stroke="#ffcf7a" />
              {PRESETS.map((p) => <text key={p.key} x={20 + (p.angle / 360) * (CW - 40)} y={CH - 6} text-anchor={p.angle === 0 ? 'start' : 'middle'} fill="#aeb8ca" font-size="10">{t(`seasons.preset.${p.key}`)}</text>)}
            </svg>
          </div>
          <p className="muted">{t('lab.canonicalUnchanged')}</p>
        </div>
      </div>
    </Workspace>
  );
}
