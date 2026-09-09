import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import * as S from '../state/store';
import { app, bodyName } from '../app/controller';
import { ACTIONS, runAction } from '../app/actions';
import { tourRun, tours } from '../app/tours';
import { BODIES, BODY_MAP } from '../data/bodies';
import { ARTICLES } from '../content/glossary';
import { normalizeText, t, tx } from '../i18n';
import { collections, type Viewpoint } from '../state/persistence';
import { BodyThumb, Icon, encyclopediaTarget } from './common';
import { matchesQuery } from './Navigator';

interface Result { key: string; group: string; label: string; meta?: string; icon?: string; body?: string; run: () => void }

export function Palette(): JSX.Element {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const unregister = app.registerLayer('palette', () => { S.paletteOpen.value = false; });
    setTimeout(() => inputRef.current?.focus(), 10);
    if (tourRun.value?.status === 'playing') { tours.pause(); S.toast(t('tours.interruptedBySearch'), 'info'); }
    return unregister;
  }, []);
  const close = () => { S.paletteOpen.value = false; };
  const results = useMemo<Result[]>(() => {
    const n = normalizeText(q.trim());
    const out: Result[] = [];
    const bodies = n ? BODIES.filter((b) => matchesQuery(b, q)) : S.recentBodies.value.map((id) => BODY_MAP[id]);
    for (const b of bodies.slice(0, 8)) out.push({ key: `b:${b.id}`, group: n ? t('search.group.planets') : t('search.recent'), label: bodyName(b.id), meta: t(`kind.${b.kind}`), body: b.id, run: () => { app.select(b.id, { focus: true }); } });
    const acts = ACTIONS.filter((a) => a.id !== 'pauseIfPlaying' && (!a.available || a.available())).map((a) => ({ a, label: t(a.labelKey, { body: S.selectedId.value ? bodyName(S.selectedId.value) : '' }) })).filter((x) => !n || normalizeText(x.label).includes(n));
    for (const { a, label } of (n ? acts : acts.slice(0, 6))) out.push({ key: `a:${a.id}`, group: a.group === 'tools' || a.group === 'learn' ? t('search.group.tools') : t('search.group.actions'), label, meta: a.shortcut, icon: 'sparkle', run: () => runAction(a.id) });
    if (n) {
      for (const art of ARTICLES.filter((x) => normalizeText(tx(x.title)).includes(n) || x.synonyms.pt.some((s) => normalizeText(s).includes(n)) || x.synonyms.en.some((s) => normalizeText(s).includes(n))).slice(0, 6)) {
        out.push({ key: `e:${art.id}`, group: t('search.group.articles'), label: tx(art.title), icon: 'book', run: () => { encyclopediaTarget.value = art.id; app.openTool('encyclopedia'); } });
      }
      for (const v of collections.value.viewpoints.filter((vp: Viewpoint) => normalizeText(vp.title).includes(n)).slice(0, 5)) {
        out.push({ key: `v:${v.id}`, group: t('search.group.viewpoints'), label: v.title, meta: bodyName(v.target), icon: 'pin', run: () => app.applyViewpoint(v) });
      }
    }
    return out;
  }, [q, S.recentBodies.value, S.selectedId.value]);
  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>('.is-active')?.scrollIntoView({ block: 'nearest' }); }, [idx]);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = results[idx]; if (r) { close(); r.run(); } }
  };
  let lastGroup = '';
  return (
    <>
      <div className="scrim" onClick={close} />
      <div className="palette" role="dialog" aria-label={t('nav.commandPalette')} onKeyDown={onKey}>
        <input ref={inputRef} type="search" role="combobox" aria-expanded="true" aria-controls="palette-results" aria-activedescendant={results[idx] ? `pr-${results[idx].key}` : undefined} placeholder={t('search.placeholder')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label={t('search.placeholder')} />
        <div ref={listRef} className="results" id="palette-results" role="listbox">
          {results.length === 0 && <div style={{ padding: 16, color: 'var(--text-3)' }}>{t('search.noResults', { q })}</div>}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? <div className="group-title" key={`g-${r.group}-${i}`}>{r.group}</div> : null;
            lastGroup = r.group;
            return (
              <div key={r.key}>
                {header}
                <button id={`pr-${r.key}`} type="button" role="option" aria-selected={i === idx} className={`list-item ${i === idx ? 'is-active' : ''}`} onMouseEnter={() => setIdx(i)} onClick={() => { close(); r.run(); }}>
                  {r.body ? <BodyThumb id={r.body as never} /> : <Icon name={r.icon ?? 'sparkle'} size={16} />}
                  <span className="grow name">{r.label}</span>
                  {r.meta && (r.meta.length <= 6 ? <kbd>{r.meta}</kbd> : <span className="meta">{r.meta}</span>)}
                </button>
              </div>
            );
          })}
        </div>
        <div className="hintbar">{t('search.hint')}</div>
      </div>
    </>
  );
}
