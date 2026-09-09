import type { JSX } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { app, bodyName } from '../../app/controller';
import { ARTICLES, ARTICLE_MAP } from '../../content/glossary';
import { SOURCES } from '../../data/sources';
import { locale, t, tx } from '../../i18n';
import { Badge, Btn, EmptyState, ExternalLink, Icon, encyclopediaTarget } from '../common';
import { Workspace } from '../tools/ToolRouter';

function norm(s: string): string { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

export function Encyclopedia(): JSX.Element {
  const [q, setQ] = useState('');
  const [current, setCurrent] = useState<string | null>(encyclopediaTarget.value);
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => { if (encyclopediaTarget.value) { setCurrent(encyclopediaTarget.value); encyclopediaTarget.value = null; } }, [encyclopediaTarget.value]);
  const lang = locale.value === 'pt-BR' ? 'pt' : 'en';
  const list = useMemo(() => {
    const nq = norm(q.trim());
    const sorted = [...ARTICLES].sort((a, b) => tx(a.title).localeCompare(tx(b.title)));
    if (!nq) return sorted;
    return sorted.filter((a) => norm(tx(a.title)).includes(nq) || a.synonyms[lang].some((s) => norm(s).includes(nq)) || norm(tx(a.short)).includes(nq));
  }, [q, lang]);
  const art = current ? ARTICLE_MAP[current] : null;
  const open = (id: string) => { if (current) setHistory((h) => [...h, current].slice(-20)); setCurrent(id); };
  const back = () => { const h = [...history]; const prev = h.pop(); setHistory(h); setCurrent(prev ?? null); };
  return (
    <Workspace title={t('ency.title')} icon="book">
      <div className="tool-split">
        <div className="stack">
          <div className="search-box row" style={{ gap: 6 }}><Icon name="search" size={16} /><input type="search" value={q} placeholder={t('ency.search')} aria-label={t('ency.search')} onInput={(e) => setQ((e.target as HTMLInputElement).value)} style={{ flex: 1 }} /></div>
          <div className="card" style={{ padding: 4 }}>
            {list.length === 0 && <EmptyState text={t('ency.noResults')} />}
            {list.map((a) => <button key={a.id} type="button" className={`list-item ${a.id === current ? 'is-selected' : ''}`} onClick={() => open(a.id)}><span className="grow name">{tx(a.title)}</span><Icon name="forward" size={14} /></button>)}
          </div>
        </div>
        <div className="stack">
          {!art && <EmptyState text={t('ency.title')} />}
          {art && (
            <article className="card" aria-labelledby="ency-title">
              <div className="row between">
                <h2 id="ency-title" style={{ margin: 0 }}>{tx(art.title)}</h2>
                {history.length > 0 && <Btn small icon="back" label={t('ency.backToArticle')} onClick={back} />}
              </div>
              <h3>{t('ency.short')}</h3>
              <p style={{ marginTop: 0 }}>{tx(art.short)}</p>
              {art.deeper && <><h3>{t('ency.deeper')}</h3><p style={{ marginTop: 0 }}>{tx(art.deeper)}</p></>}
              {art.link && (
                <><h3>{t('ency.tryIt')}</h3>
                  <Btn small variant="primary" icon={art.link.kind === 'tool' ? 'flask' : 'focus'} label={tx(art.link.label)} onClick={() => { const l = art.link!; if (l.kind === 'tool') app.openTool(l.id); else { app.closeTool(); app.select(l.id, { focus: true }); } }} />
                  {art.link.kind === 'body' && <span className="muted" style={{ marginLeft: 8 }}>{t('ency.openInScene')}: {bodyName(art.link.id)}</span>}
                </>
              )}
              {art.related.length > 0 && <><h3>{t('ency.related')}</h3><div className="row">{art.related.filter((id) => ARTICLE_MAP[id]).map((id) => <Btn key={id} small onClick={() => open(id)}>{tx(ARTICLE_MAP[id].title)}</Btn>)}</div></>}
              <h3>{t('common.sources')}</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{art.sourceIds.map((sid) => { const s = SOURCES[sid]; return <li key={sid}>{s ? <ExternalLink href={s.url}>{s.label}</ExternalLink> : sid}{s?.accessed && <span className="muted"> · {t('inspector.dataAsOf', { date: s.accessed })}</span>}</li>; })}</ul>
              <p className="muted" style={{ marginBottom: 0 }}><Badge>{t('ency.about')}</Badge> {t('scale.explain.physics')}</p>
            </article>
          )}
        </div>
      </div>
    </Workspace>
  );
}
