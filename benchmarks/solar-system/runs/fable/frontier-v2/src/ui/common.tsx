import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { ARTICLE_MAP } from '../content/glossary';
import { BODY_MAP } from '../data/bodies';
import type { BodyId } from '../data/types';
import { t, tx } from '../i18n';
import { app } from '../app/controller';

/* ------------------------------------------------------------------ */
/* Icons (coherent inline set, 24×24, stroke-based)                    */
/* ------------------------------------------------------------------ */

const P: Record<string, string> = {
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm9 16-4.3-4.3',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  reverse: 'M16 5v14L5 12zM19 5v14',
  stepBack: 'M18 6v12L9 12zM6 6v12',
  stepForward: 'M6 6v12l9-6zM18 6v12',
  settings: 'M12 15.5A3.5 3.5 0 1 0 12 8.5a3.5 3.5 0 0 0 0 7zm7.4-2.2.9 1.6-1.7 2.9-1.8-.3a7 7 0 0 1-1.5 1.1L15 20.5H9l-.3-1.9a7 7 0 0 1-1.5-1.1l-1.8.3-1.7-2.9.9-1.6a7 7 0 0 1 0-2.6l-.9-1.6 1.7-2.9 1.8.3a7 7 0 0 1 1.5-1.1L9 3.5h6l.3 1.9a7 7 0 0 1 1.5 1.1l1.8-.3 1.7 2.9-.9 1.6a7 7 0 0 1 0 2.6z',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-.3 13.8h.6M9.6 9.5a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  compare: 'M4 6h7v12H4zM13 6h7v12h-7zM7.5 9v6M16.5 9v6',
  ruler: 'M3 17 17 3l4 4L7 21zM8 16l1.5 1.5M11 13l1.5 1.5M14 10l1.5 1.5',
  star: 'm12 3 2.7 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8l-5.5 2.9 1.2-6.1L3.2 9.4l6.1-.8z',
  focus: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 5.3A11 11 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6.2 6.2A15 15 0 0 0 2 12s4 7 10 7c1.7 0 3.2-.5 4.5-1.2',
  layers: 'm12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5',
  share: 'M18 8a3 3 0 1 0-2.8-4M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 10.7l6.8-3.4M8.6 13.3l6.8 3.4',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  book: 'M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zm16 0h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z',
  rocket: 'M5 15c-1.5 1.5-1.5 4-1.5 4s2.5 0 4-1.5M12 15l-3-3 3.5-7c1.5-2.5 6-3 6-3s-.5 4.5-3 6zM9 12l-4 1 2-4zm3 3 1 4 3-2z',
  flask: 'M9 3h6M10 3v6L4 20h16l-6-11V3M7 15h10',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  collapse: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  back: 'M15 5l-7 7 7 7',
  forward: 'M9 5l7 7-7 7',
  check: 'M5 12l5 5L20 7',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  download: 'M12 4v12M6 11l6 6 6-6M4 20h16',
  upload: 'M12 16V4M6 9l6-6 6 6M4 20h16',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  orbit: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 0c6 0 10 2 10 4s-4 4-10 4S2 18 2 16s4-4 10-4zm7 2a1.5 1.5 0 1 0 0 .01',
  label: 'M3 5h12l6 7-6 7H3zM8 12h.01',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M6 15l6-6 6 6',
  warning: 'M12 3 2 21h20zM12 9v5M12 17v.5',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 8v5M12 8v.5',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  home: 'M3 11 12 4l9 7v9H3zM9 20v-6h6v6',
  zoomIn: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm9 16-4.3-4.3M11 8v6M8 11h6',
  zoomOut: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm9 16-4.3-4.3M8 11h6',
  fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  speaker: 'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  mute: 'M4 9v6h4l5 4V5L8 9zM16 9l5 6M21 9l-5 6',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4v5l3 2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  swap: 'M7 4v13M4 14l3 3 3-3M17 20V7M14 10l3-3 3 3',
  pin: 'M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  freeze: 'M12 2v20M4 6l16 12M20 6 4 18M9 4l3 2 3-2M9 20l3-2 3 2M4 10l3 2-3 2M20 10l-3 2 3 2',
  record: 'M12 12a5 5 0 1 0 0 .01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  stop: 'M6 6h12v12H6z',
  edit: 'M4 20h4l11-11-4-4L4 16zM13 7l4 4',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2',
  video: 'M3 7h13v10H3zM16 10l5-3v10l-5-3',
  target: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  minus: 'M5 12h14',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  external: 'M14 4h6v6M20 4l-9 9M19 14v6H4V5h6',
  keyboard: 'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
};

export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" className={className}>
      <path d={P[name] ?? P.info} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons & controls                                                  */
/* ------------------------------------------------------------------ */

interface BtnProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'label' | 'size'> {
  icon?: string;
  label?: string;
  /** Icon-only button: label becomes the accessible name and tooltip. */
  iconOnly?: boolean;
  variant?: 'primary' | 'ghost' | 'warm' | 'danger' | 'default';
  small?: boolean;
  pressed?: boolean;
  active?: boolean;
  shortcut?: string;
}

export function Btn({ icon, label, iconOnly, variant = 'default', small, pressed, active, shortcut, className, children, ...rest }: BtnProps): JSX.Element {
  const cls = ['btn', variant !== 'default' ? variant : '', small ? 'small' : '', iconOnly ? 'icon' : '', active ? 'is-active' : '', className ?? ''].filter(Boolean).join(' ');
  const title = iconOnly ? `${label ?? ''}${shortcut ? ` (${shortcut})` : ''}` : (rest.title as string | undefined) ?? (shortcut ? `${label ?? ''} (${shortcut})` : undefined);
  return (
    <button type="button" className={cls} aria-label={iconOnly ? label : undefined} title={title} aria-pressed={pressed} {...rest}>
      {icon && <Icon name={icon} />}
      {!iconOnly && label !== undefined && <span className="btn-label">{label}</span>}
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, label, desc, disabled, note }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; disabled?: boolean; note?: string }): JSX.Element {
  return (
    <div className="toggle">
      <div>
        <div>{label}</div>
        {desc && <div className="desc">{desc}</div>}
        {note && <div className="desc" style={{ color: 'var(--caution)' }}>{note}</div>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" disabled={disabled} onClick={() => onChange(!checked)} />
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }): JSX.Element {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}
    </div>
  );
}

export function Range({ label, value, min, max, step, onChange, format, id }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string; id?: string }): JSX.Element {
  const rid = id ?? `r-${label.replace(/\W+/g, '-')}`;
  return (
    <div className="field">
      <label htmlFor={rid}><span>{label}</span><span className="value">{format ? format(value) : value}</span></label>
      <input id={rid} type="range" min={min} max={max} step={step} value={value} onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))} />
    </div>
  );
}

export function Badge({ kind, children }: { kind?: 'warm' | 'accent' | 'caution' | 'live'; children: ComponentChildren }): JSX.Element {
  return <span className={`badge ${kind ?? ''}`}>{children}</span>;
}

export function Note({ kind, children }: { kind?: 'warm' | 'caution' | 'error'; children: ComponentChildren }): JSX.Element {
  return <div className={`note ${kind ?? ''}`}>{children}</div>;
}

export function BodyThumb({ id, size = 22 }: { id: BodyId; size?: number }): JSX.Element {
  const def = BODY_MAP[id];
  const ring = !!def.appearance.rings && def.appearance.rings.bands.some((b) => b.opacity > 0.2);
  const style: JSX.CSSProperties = { width: size, height: size, background: def.kind === 'star' ? `radial-gradient(circle at 40% 40%, #fff6dc, ${def.appearance.color})` : `radial-gradient(circle at 35% 35%, ${lighten(def.appearance.color)}, ${def.appearance.color} 60%, #000 130%)` };
  if (def.kind === 'region') style.background = `repeating-radial-gradient(circle, ${def.appearance.color}55 0 1px, transparent 1px 3px)`;
  return <span className={`thumb ${ring ? 'ring' : ''}`} style={style} aria-hidden="true" />;
}

function lighten(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.min(255, ((n >> 16) & 255) + 70), g = Math.min(255, ((n >> 8) & 255) + 70), b = Math.min(255, (n & 255) + 70);
  return `rgb(${r},${g},${b})`;
}

/* ------------------------------------------------------------------ */
/* Dialog with focus management + Escape via the layer stack           */
/* ------------------------------------------------------------------ */

export function Dialog({ id, title, onClose, children, wide, full, footer, className }: { id: string; title: string; onClose: () => void; children: ComponentChildren; wide?: boolean; full?: boolean; footer?: ComponentChildren; className?: string }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const unregister = app.registerLayer(id, onClose);
    const first = ref.current?.querySelector<HTMLElement>('input, select, textarea, button:not(.close-x)') ?? ref.current?.querySelector<HTMLElement>('button');
    setTimeout(() => (first ?? ref.current)?.focus(), 20);
    return () => { unregister(); prev?.focus?.(); };
  }, [id]);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !ref.current) return;
    const els = [...ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!els.length) return;
    const firstEl = els[0], lastEl = els[els.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
  };
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div ref={ref} className={`dialog ${wide ? 'wide' : ''} ${full ? 'full' : ''} ${className ?? ''}`} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1} onKeyDown={onKey}>
        <div className="panel-header">
          <h2 id={`${id}-title`}>{title}</h2>
          <Btn icon="close" iconOnly label={t('common.close')} variant="ghost" className="close-x" onClick={onClose} />
        </div>
        <div className="panel-body">{children}</div>
        {footer && <div className="panel-footer">{footer}</div>}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Contextual term explanation (glossary popover)                      */
/* ------------------------------------------------------------------ */

export function Term({ id, children }: { id: string; children: ComponentChildren }): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const art = ARTICLE_MAP[id];
  useEffect(() => {
    if (!open) return;
    const unregister = app.registerLayer(`term:${id}`, () => setOpen(false));
    const onDoc = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.popover') && e.target !== ref.current) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => { unregister(); document.removeEventListener('mousedown', onDoc); };
  }, [open, id]);
  if (!art) return <>{children}</>;
  const rect = ref.current?.getBoundingClientRect();
  const left = rect ? Math.min(rect.left, window.innerWidth - 340) : 0;
  const top = rect ? (rect.bottom + 320 > window.innerHeight ? rect.top - 8 : rect.bottom + 6) : 0;
  return (
    <>
      <button ref={ref} type="button" className="term" aria-expanded={open} aria-label={`${t('inspector.whatIs', { term: tx(art.title) })}`} onClick={() => setOpen(!open)}>{children}</button>
      {open && (
        <div className="popover" role="dialog" aria-label={tx(art.title)} style={{ position: 'fixed', left, top: rect && rect.bottom + 320 > window.innerHeight ? undefined : top, bottom: rect && rect.bottom + 320 > window.innerHeight ? window.innerHeight - rect.top + 6 : undefined }}>
          <div className="row between"><strong>{tx(art.title)}</strong><Btn icon="close" iconOnly small variant="ghost" label={t('common.close')} onClick={() => setOpen(false)} /></div>
          <p style={{ marginTop: 6 }}>{tx(art.short)}</p>
          <div className="row">
            <Btn small label={t('common.readMore')} icon="book" onClick={() => { setOpen(false); encyclopediaTarget.value = art.id; app.openTool('encyclopedia'); }} />
          </div>
        </div>
      )}
    </>
  );
}

/** Which article the encyclopedia should open on. */
export const encyclopediaTarget = signal<string | null>(null);

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function ExternalLink({ href, children }: { href: string; children: ComponentChildren }): JSX.Element {
  if (!href) return <span>{children}</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer" title={t('common.externalLink')}>{children} <Icon name="external" size={12} /></a>;
}

export function EmptyState({ text, action }: { text: string; action?: ComponentChildren }): JSX.Element {
  return <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-3)' }}><p>{text}</p>{action}</div>;
}
