import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import * as S from '../state/store';
import { app, bodyName } from '../app/controller';
import { BODY_MAP, PLANET_IDS } from '../data/bodies';
import type { BodyId } from '../data/types';
import { AU_KM } from '../data/types';
import { getMapping } from '../sim/scale';
import { t } from '../i18n';
import { currentState } from './Inspector';
import { Btn } from './common';

const MAP_IDS: BodyId[] = [...PLANET_IDS, 'pluto', 'ceres', 'comet-observatory'];

export function Minimap(): JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  const [expanded, setExpanded] = useState(false);
  const narrow = S.isNarrow.value;
  const collapsed = narrow && !expanded;
  const readout = S.readoutMs.value;
  const sel = S.selectedId.value;
  const mode = S.prefs.value.scaleMode;
  const target = S.cameraTarget.value;
  const compressed = mode === 'exploration';
  const size = collapsed ? 44 : narrow ? 170 : 190;
  const radiusFor = (au: number): number => {
    if (compressed) return getMapping('exploration').auToDisplay(au) / getMapping('exploration').auToDisplay(42);
    return (Math.log10(Math.max(0.05, au)) + 1.4) / (Math.log10(42) + 1.4);
  };
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const c = size / 2, R = c - (collapsed ? 6 : 14);
    ctx.fillStyle = 'rgba(8,11,20,0.9)'; ctx.beginPath(); ctx.arc(c, c, c, 0, Math.PI * 2); ctx.fill();
    const st = currentState();
    // Sun
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(c, c, collapsed ? 2 : 3.5, 0, Math.PI * 2); ctx.fill();
    for (const id of MAP_IDS) {
      const def = BODY_MAP[id]; const s = st.get(id); if (!s || !def.physical.semiMajorAxisAu) continue;
      if (collapsed && !PLANET_IDS.includes(id)) continue;
      const a = def.physical.semiMajorAxisAu;
      const r = radiusFor(a) * R;
      if (r > R * 1.02) continue;
      // Orbit ring (circular approximation of the mean distance).
      ctx.strokeStyle = id === sel ? 'rgba(255,210,122,0.8)' : 'rgba(160,180,215,0.22)'; ctx.lineWidth = id === sel ? 1.5 : 0.8;
      ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke();
      // Body position (ecliptic x→right, y→up; north pole toward the viewer).
      const d = Math.hypot(s.pos.x, s.pos.y) / AU_KM;
      const rr = radiusFor(d) * R;
      const ang = Math.atan2(s.pos.y, s.pos.x);
      const x = c + Math.cos(ang) * rr, y = c - Math.sin(ang) * rr;
      ctx.fillStyle = def.appearance.color; ctx.beginPath(); ctx.arc(x, y, id === sel ? 3.5 : collapsed ? 1.5 : 2.4, 0, Math.PI * 2); ctx.fill();
      if (id === sel) { ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke(); }
    }
    // Camera azimuth indicator (scene theta → ecliptic angle).
    const cam = app.scene?.cameraCtl;
    if (cam && !collapsed) {
      const th = cam.theta; // azimuth around +Y (scene), x = sin, z = cos ; ecliptic y = -z
      const ex = Math.sin(th), ey = -Math.cos(th);
      const ang = Math.atan2(ey, ex);
      const x = c + Math.cos(ang) * (R + 8), y = c - Math.sin(ang) * (R + 8);
      ctx.fillStyle = '#6fd3ff'; ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang - 0.5) * 7, y + Math.sin(ang - 0.5) * 7); ctx.lineTo(x - Math.cos(ang + 0.5) * 7, y + Math.sin(ang + 0.5) * 7); ctx.closePath(); ctx.fill();
      // Camera anchor marker.
      if (target && target !== 'sun') {
        const s = st.get(target); const def = BODY_MAP[target];
        const tid: BodyId = def.kind === 'moon' && def.parent ? def.parent : target;
        const ts = st.get(tid);
        if (s && ts) { const d = Math.hypot(ts.pos.x, ts.pos.y) / AU_KM; const rr = radiusFor(d) * R; const a2 = Math.atan2(ts.pos.y, ts.pos.x); ctx.strokeStyle = '#6fd3ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(c + Math.cos(a2) * rr, c - Math.sin(a2) * rr, 8, 0, Math.PI * 2); ctx.stroke(); }
      }
    }
    if (!collapsed) { ctx.fillStyle = 'rgba(174,184,202,0.8)'; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('N', c, 12); }
  }, [readout, sel, mode, target, size, collapsed]);
  const onClick = (e: MouseEvent) => {
    if (collapsed) { setExpanded(true); return; }
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const c = size / 2, R = c - 14;
    const x = e.clientX - rect.left - c, y = -(e.clientY - rect.top - c);
    const dist = Math.hypot(x, y) / R;
    let best: BodyId | null = null, bestD = 0.06;
    for (const id of MAP_IDS) {
      const a = BODY_MAP[id].physical.semiMajorAxisAu; if (!a) continue;
      const d = Math.abs(radiusFor(a) - dist);
      if (d < bestD) { bestD = d; best = id; }
    }
    if (best) app.select(best, { focus: true });
    else if (dist < 0.08) app.select('sun', { focus: true });
  };
  // On wide screens the inspector owns the right edge; slide the map beside it instead of under it.
  const besideInspector = !narrow && S.inspectorOpen.value && !!sel && !S.distractionFree.value;
  return (
    <div className={`panel minimap ${collapsed ? 'is-collapsed' : ''} ${narrow && expanded ? 'is-expanded' : ''} ${besideInspector ? 'beside-inspector' : ''}`} aria-label={t('nav.minimap')} title={t('minimap.note', { mode: t(`minimap.mode.${compressed ? 'compressed' : 'log'}`) })}>
      <canvas ref={ref} style={{ width: size, height: size }} onClick={onClick} role="img" aria-label={`${t('minimap.title')}. ${t('frame.heliocentric')}. ${sel ? `${t('status.selected')}: ${bodyName(sel)}` : ''}`} />
      {!collapsed && <div className="frame-label">{t(`minimap.short.${compressed ? 'compressed' : 'log'}`)}</div>}
      {narrow && expanded && <Btn small iconOnly icon="collapse" variant="ghost" label={t('common.collapse')} onClick={() => setExpanded(false)} style={{ position: 'absolute', top: 4, right: 4 }} />}
    </div>
  );
}
