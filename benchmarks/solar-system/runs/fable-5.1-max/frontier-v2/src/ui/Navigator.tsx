import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import * as S from '../state/store';
import { app, bodyName } from '../app/controller';
import { BODIES, BODY_MAP } from '../data/bodies';
import type { BodyDef, BodyId } from '../data/types';
import { evaluateSystem } from '../sim/ephemeris';
import { fmtAu, fmtKm, normalizeText, t } from '../i18n';
import { collections } from '../state/persistence';
import { BodyThumb, Btn, EmptyState, Icon, Seg } from './common';

type Sort = 'name' | 'diameter' | 'distance' | 'type';

export function matchesQuery(def: BodyDef, q: string): boolean {
  if (!q) return true;
  const n = normalizeText(q);
  return normalizeText(def.names.pt).includes(n) || normalizeText(def.names.en).includes(n) || def.names.aliases.some((a) => normalizeText(a).includes(n)) || normalizeText(t(`kind.${def.kind}`)).includes(n);
}

const GROUPS: { key: string; title: string; filter: (b: BodyDef) => boolean }[] = [
  { key: 'star', title: 'search.group.star', filter: (b) => b.kind === 'star' },
  { key: 'planets', title: 'search.group.planets', filter: (b) => b.kind === 'planet' },
  { key: 'moons', title: 'search.group.moons', filter: (b) => b.kind === 'moon' },
  { key: 'dwarf', title: 'search.group.dwarf', filter: (b) => b.kind === 'dwarf-planet' },
  { key: 'small', title: 'search.group.small', filter: (b) => b.kind === 'asteroid' || b.kind === 'comet' },
  { key: 'regions', title: 'search.group.regions', filter: (b) => b.kind === 'region' },
];

export function BodyRow({ id, meta, onActivate, selected, showFav = true }: { id: BodyId; meta?: string; onActivate?: () => void; selected?: boolean; showFav?: boolean }): JSX.Element {
  const def = BODY_MAP[id];
  const fav = collections.value.favorites.includes(id);
  const visited = S.visited.value.includes(id);
  return (
    <div className={`list-item ${selected ? 'is-selected' : ''}`} style={{ padding: 0 }}>
      <button type="button" className="list-item grow" style={{ padding: '7px 10px' }} aria-current={selected ? 'true' : undefined}
        onClick={() => { app.select(id); onActivate?.(); }} onDblClick={() => { app.select(id, { focus: true }); }}
        title={`${bodyName(id)} — ${t(`kind.${def.kind}`)}`}>
        <BodyThumb id={id} />
        <span className="grow">
          <span className="name">{bodyName(id)} {visited && <span className="badge" style={{ marginLeft: 4 }}>{t('search.visited')}</span>}</span>
          <span className="meta">{meta ?? (def.level === 'simulated' ? `${t(`kind.${def.kind}`)} · ${fmtKm(def.physical.meanRadiusKm * 2, { compact: true })}` : t(`level.${def.level}`))}</span>
        </span>
      </button>
      {showFav && <Btn icon="star" iconOnly small variant="ghost" label={fav ? t('inspector.unfavorite') : t('inspector.favorite')} pressed={fav} onClick={() => app.toggleFavorite(id)} style={{ marginRight: 4, color: fav ? 'var(--selected)' : undefined }} />}
    </div>
  );
}

export function Navigator(): JSX.Element {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [onlyFav, setOnlyFav] = useState(false);
  const sel = S.selectedId.value;
  const favs = collections.value.favorites;
  const recent = S.recentBodies.value;
  const readout = sort === 'distance' ? S.readoutMs.value : 0;
  const state = useMemo(() => (sort === 'distance' ? (app.scene?.state ?? evaluateSystem(S.clock.jd)) : null), [readout, sort]);
  const list = useMemo(() => {
    let items = BODIES.filter((b) => matchesQuery(b, q));
    if (onlyFav) items = items.filter((b) => favs.includes(b.id));
    const cmp = (a: BodyDef, b: BodyDef): number => {
      if (sort === 'name') return bodyName(a.id).localeCompare(bodyName(b.id));
      if (sort === 'diameter') return b.physical.meanRadiusKm - a.physical.meanRadiusKm;
      if (sort === 'distance') return (state?.get(a.id)?.sunDistanceKm ?? Infinity) - (state?.get(b.id)?.sunDistanceKm ?? Infinity);
      return a.kind.localeCompare(b.kind);
    };
    return [...items].sort(cmp);
  }, [q, sort, onlyFav, favs, state]);
  const grouped = sort === 'name' || sort === 'type';
  const metaFor = (b: BodyDef): string | undefined => {
    if (sort === 'distance') { const d = state?.get(b.id)?.sunDistanceKm; return d !== undefined ? fmtAu(d / 149597870.7) : undefined; }
    if (sort === 'diameter' && b.level === 'simulated') return fmtKm(b.physical.meanRadiusKm * 2, { compact: true });
    return undefined;
  };
  const close = () => { if (S.isNarrow.value) S.navigatorOpen.value = false; };
  return (
    <aside className="panel navigator" aria-label={t('nav.navigator')}>
      <div className="panel-header">
        <Icon name="list" />
        <h2>{t('nav.navigator')}</h2>
        <Btn icon="close" iconOnly small variant="ghost" label={t('common.close')} onClick={() => { S.navigatorOpen.value = false; }} />
      </div>
      <div style={{ padding: '8px 12px 4px' }}>
        <input type="search" placeholder={t('common.search')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label={t('common.search')} />
        <div className="row between" style={{ marginTop: 8 }}>
          <label className="row" style={{ gap: 6, fontSize: '0.85em', color: 'var(--text-2)' }}>
            {t('search.sortBy')}
            <select value={sort} onChange={(e) => setSort((e.target as HTMLSelectElement).value as Sort)} style={{ width: 'auto', minHeight: 30, padding: '2px 6px' }} aria-label={t('search.sortBy')}>
              <option value="name">{t('search.sort.name')}</option>
              <option value="diameter">{t('search.sort.diameter')}</option>
              <option value="distance">{t('search.sort.distance')}</option>
              <option value="type">{t('search.sort.type')}</option>
            </select>
          </label>
          <Seg value={onlyFav ? 'fav' : 'all'} label={t('common.filter')} options={[{ value: 'all', label: t('search.filter.all') }, { value: 'fav', label: t('search.filter.favorites') }]} onChange={(v) => setOnlyFav(v === 'fav')} />
        </div>
        {sort === 'distance' && <p className="muted" style={{ margin: '6px 0 0' }}>{t('search.liveSortNote')}</p>}
      </div>
      <div className="panel-body" style={{ paddingTop: 4 }}>
        {!q && !onlyFav && recent.length > 0 && (
          <>
            <div className="group-title">{t('search.recent')}</div>
            <div className="row" style={{ padding: '0 6px 6px', gap: 4 }}>
              {recent.slice(0, 6).map((id) => <Btn key={id} small variant="ghost" onClick={() => { app.select(id, { focus: true }); close(); }} label={bodyName(id)}><BodyThumb id={id} size={14} /></Btn>)}
            </div>
          </>
        )}
        {list.length === 0 && <EmptyState text={t('search.noResults', { q })} action={<Btn small label={t('search.resetFilters')} onClick={() => { setQ(''); setOnlyFav(false); }} />} />}
        {grouped
          ? GROUPS.map((g) => {
            const items = list.filter(g.filter);
            if (!items.length) return null;
            return (
              <section key={g.key} aria-label={t(g.title)}>
                <div className="group-title">{t(g.title)} <span className="muted">({items.length})</span></div>
                {g.key === 'moons'
                  ? [...new Set(items.map((m) => m.parent))].map((parent) => (
                    <div key={parent}>
                      <div className="muted" style={{ padding: '2px 10px', fontSize: '0.78em' }}>{parent ? bodyName(parent) : ''}</div>
                      {items.filter((m) => m.parent === parent).map((b) => <BodyRow key={b.id} id={b.id} selected={sel === b.id} onActivate={close} />)}
                    </div>
                  ))
                  : items.map((b) => <BodyRow key={b.id} id={b.id} selected={sel === b.id} onActivate={close} />)}
              </section>
            );
          })
          : list.map((b) => <BodyRow key={b.id} id={b.id} selected={sel === b.id} meta={metaFor(b)} onActivate={close} />)}
      </div>
      <div className="panel-footer">
        <span className="muted">{t('search.hint')}</span>
      </div>
    </aside>
  );
}
