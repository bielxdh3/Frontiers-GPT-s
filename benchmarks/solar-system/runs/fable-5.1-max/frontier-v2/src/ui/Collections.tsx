import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';
import * as S from '../state/store';
import { app, bodyName } from '../app/controller';
import { clock } from '../state/store';
import { BODIES } from '../data/bodies';
import type { BodyId } from '../data/types';
import { fmtDateTimeUtc, t } from '../i18n';
import { applyImport, clearAllLocalData, collections, downloadText, exportBundle, newId, previewImport, saveCollections, updateCollections } from '../state/persistence';
import type { ImportPreview, JournalEntry } from '../state/persistence';
import { Badge, BodyThumb, Btn, Dialog, EmptyState, Note, Switch } from './common';

type Tab = 'favorites' | 'viewpoints' | 'bookmarks' | 'journal' | 'data';

function ConfirmDelete({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }): JSX.Element {
  return <div className="row" style={{ padding: '4px 8px', fontSize: '0.88em' }}><span className="grow">{t('coll.deleteConfirm', { name })}</span><Btn small label={t('common.cancel')} onClick={onCancel} /><Btn small variant="danger" label={t('common.delete')} onClick={onConfirm} /></div>;
}

export function CollectionsDialog(): JSX.Element {
  const [tab, setTab] = useState<Tab>('favorites');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteBody, setNoteBody] = useState<BodyId | ''>(S.selectedId.value ?? '');
  const [attachTime, setAttachTime] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const c = collections.value;
  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: 'favorites', label: t('coll.favorites'), n: c.favorites.length }, { id: 'viewpoints', label: t('coll.viewpoints'), n: c.viewpoints.length },
    { id: 'bookmarks', label: t('coll.bookmarks'), n: c.bookmarks.length }, { id: 'journal', label: t('coll.journal'), n: c.journal.length }, { id: 'data', label: t('settings.dataExport'), n: 0 },
  ];
  const saveNote = () => {
    const text = noteText.trim(); if (!text) return;
    const now = Date.now();
    const ok = updateCollections((cc) => editing
      ? { ...cc, journal: cc.journal.map((j) => (j.id === editing ? { ...j, text, body: noteBody || undefined, updatedAt: now } : j)) }
      : { ...cc, journal: [{ id: newId(), text, body: noteBody || undefined, simMs: attachTime ? clock.simMs : undefined, createdAt: now, updatedAt: now } as JournalEntry, ...cc.journal] });
    app.persistToast(ok, t('coll.saved')); setNoteText(''); setEditing(null);
  };
  const onFile = async (f: File | undefined) => { if (!f) return; const text = await f.text(); setPreview(previewImport(text)); };
  return (
    <Dialog id="collections" title={t('coll.title')} onClose={() => app.closeTool()} wide>
      {!S.storageAvailable.value && <Note kind="caution">{t('coll.storageUnavailable')}</Note>}
      <div className="tabs" role="tablist" style={{ marginBottom: 10 }}>
        {tabs.map((tb) => <button key={tb.id} type="button" role="tab" className={`tab ${tab === tb.id ? 'is-active' : ''}`} aria-selected={tab === tb.id} onClick={() => setTab(tb.id)}>{tb.label}{tb.n > 0 && <> <Badge>{tb.n}</Badge></>}</button>)}
      </div>
      {tab === 'favorites' && (
        <div className="stack">
          {c.favorites.length === 0 && <EmptyState text={t('coll.empty.favorites')} />}
          {c.favorites.map((id) => <div key={id} className="list-item" style={{ padding: '4px 8px' }}><BodyThumb id={id} /><span className="grow name">{bodyName(id)}</span><Btn small icon="focus" label={t('inspector.focus')} onClick={() => { app.closeTool(); app.select(id, { focus: true }); }} /><Btn small iconOnly icon="star" label={t('inspector.unfavorite')} pressed onClick={() => app.toggleFavorite(id)} /></div>)}
        </div>
      )}
      {tab === 'viewpoints' && (
        <div className="stack">
          {c.viewpoints.length === 0 && <EmptyState text={t('coll.empty.viewpoints')} action={<Btn small icon="bookmark" label={t('inspector.saveViewpoint')} onClick={() => { const v = app.saveViewpoint('', true); if (v) app.persistToast(true, t('toast.viewpointSaved')); }} />} />}
          {c.viewpoints.map((v) => pendingDelete === v.id ? <ConfirmDelete key={v.id} name={v.title} onCancel={() => setPendingDelete(null)} onConfirm={() => { updateCollections((cc) => ({ ...cc, viewpoints: cc.viewpoints.filter((x) => x.id !== v.id) })); setPendingDelete(null); }} /> : (
            <div key={v.id} className="list-item" style={{ padding: '4px 8px' }}>
              <BodyThumb id={v.target} />
              <span className="grow"><span className="name">{v.title}</span><span className="meta">{bodyName(v.target)} · {fmtDateTimeUtc(v.simMs)} · {t('coll.scaleContext', { mode: t(`scale.badge.${v.scaleMode}`) })}{v.restoreDate ? ` · ${t('coll.restoreDate')}` : ''}</span></span>
              <Btn small icon="focus" label={t('coll.revisit')} onClick={() => { app.closeTool(); app.applyViewpoint(v); }} />
              <Btn small iconOnly icon="edit" label={t('common.rename')} onClick={() => { const name = prompt(t('coll.viewpointName'), v.title); if (name !== null) updateCollections((cc) => ({ ...cc, viewpoints: cc.viewpoints.map((x) => (x.id === v.id ? { ...x, title: name.trim().slice(0, 80) || x.title } : x)) })); }} />
              <Btn small iconOnly icon="trash" label={t('common.delete')} onClick={() => setPendingDelete(v.id)} />
            </div>
          ))}
        </div>
      )}
      {tab === 'bookmarks' && (
        <div className="stack">
          {c.bookmarks.length === 0 && <EmptyState text={t('coll.empty.bookmarks')} action={<Btn small icon="bookmark" label={t('time.addBookmark')} onClick={() => app.addBookmark('')} />} />}
          {[...c.bookmarks].sort((a, b) => a.simMs - b.simMs).map((b) => pendingDelete === b.id ? <ConfirmDelete key={b.id} name={b.title} onCancel={() => setPendingDelete(null)} onConfirm={() => { updateCollections((cc) => ({ ...cc, bookmarks: cc.bookmarks.filter((x) => x.id !== b.id) })); setPendingDelete(null); }} /> : (
            <div key={b.id} className="list-item" style={{ padding: '4px 8px' }}>
              {b.body ? <BodyThumb id={b.body} /> : <span style={{ width: 22 }} />}
              <span className="grow"><span className="name">{b.title}</span><span className="meta num">{fmtDateTimeUtc(b.simMs)}{b.body ? ` · ${bodyName(b.body)}` : ''}</span></span>
              <Btn small icon="clock" label={t('time.jumpTo')} onClick={() => { app.closeTool(); app.goToBookmark(b); }} />
              <Btn small iconOnly icon="trash" label={t('common.delete')} onClick={() => setPendingDelete(b.id)} />
            </div>
          ))}
        </div>
      )}
      {tab === 'journal' && (
        <div className="stack">
          <div className="card">
            <h3>{editing ? t('common.edit') : t('coll.newNote')} {editing && <Badge kind="warm">{t('coll.unsavedNote')}</Badge>}</h3>
            <textarea value={noteText} rows={3} placeholder={t('coll.notePlaceholder')} aria-label={t('coll.newNote')} onInput={(e) => setNoteText((e.target as HTMLTextAreaElement).value)} style={{ width: '100%', resize: 'vertical' }} />
            <div className="row" style={{ marginTop: 6 }}>
              <label className="row muted" style={{ gap: 6 }}>{t('coll.attachBody')}<select value={noteBody} onChange={(e) => setNoteBody((e.target as HTMLSelectElement).value as BodyId | '')}><option value="">{t('common.none')}</option>{BODIES.map((b) => <option key={b.id} value={b.id}>{bodyName(b.id)}</option>)}</select></label>
              {!editing && <label className="row muted" style={{ gap: 6 }}><input type="checkbox" checked={attachTime} onChange={(e) => setAttachTime((e.target as HTMLInputElement).checked)} />{t('coll.attachTime')} ({fmtDateTimeUtc(clock.simMs)})</label>}
              <div className="grow" />
              {editing && <Btn small label={t('common.cancel')} onClick={() => { setEditing(null); setNoteText(''); }} />}
              <Btn small variant="primary" icon="check" label={t('common.save')} disabled={!noteText.trim()} onClick={saveNote} />
            </div>
          </div>
          {c.journal.length === 0 && <EmptyState text={t('coll.empty.journal')} />}
          {c.journal.map((j) => pendingDelete === j.id ? <ConfirmDelete key={j.id} name={j.text.slice(0, 40)} onCancel={() => setPendingDelete(null)} onConfirm={() => { updateCollections((cc) => ({ ...cc, journal: cc.journal.filter((x) => x.id !== j.id) })); setPendingDelete(null); }} /> : (
            <div key={j.id} className="card" style={{ marginBottom: 0 }}>
              <p style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{j.text}</p>
              <div className="row muted" style={{ fontSize: '0.82em' }}>
                {j.body && <span className="row" style={{ gap: 4 }}><BodyThumb id={j.body} size={14} />{bodyName(j.body)}</span>}
                {j.simMs !== undefined && <span className="num">{fmtDateTimeUtc(j.simMs)}</span>}
                {j.measurement && <span>{j.measurement}</span>}
                {j.screenshotRef && <span>{t('coll.screenshotRef')}</span>}
                <span className="num">{new Date(j.updatedAt).toLocaleString()}</span>
                <div className="grow" />
                {j.body && <Btn small iconOnly icon="focus" label={t('coll.revisit')} onClick={() => { app.closeTool(); if (j.simMs !== undefined && clock.isWithinSupported(j.simMs)) clock.setSimMs(j.simMs); app.select(j.body!, { focus: true }); }} />}
                <Btn small iconOnly icon="edit" label={t('common.edit')} onClick={() => { setEditing(j.id); setNoteText(j.text); setNoteBody(j.body ?? ''); }} />
                <Btn small iconOnly icon="trash" label={t('common.delete')} onClick={() => setPendingDelete(j.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'data' && (
        <div className="stack">
          <div className="card">
            <h3>{t('common.export')}</h3>
            <Switch label={t('coll.includesNotes')} checked={includeNotes} onChange={setIncludeNotes} desc={includeNotes ? undefined : t('coll.exportNoNotes')} />
            <Btn small icon="download" label={t('coll.exportAll')} onClick={() => { const ok = downloadText(`observatorio-colecoes-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(exportBundle(includeNotes), null, 2)); if (!ok) S.toast(t('photo.blocked'), 'warning'); }} />
          </div>
          <div className="card">
            <h3>{t('common.import')}</h3>
            <input ref={fileRef} type="file" accept="application/json,.json" aria-label={t('coll.importFile')} onChange={(e) => void onFile((e.target as HTMLInputElement).files?.[0])} />
            {preview && !preview.ok && <Note kind="error">{t('coll.importInvalid', { reason: preview.reason ?? '' })}</Note>}
            {preview?.ok && (
              <div className="note" style={{ marginTop: 8 }}>
                <strong>{t('coll.importPreview')}</strong>: {t('coll.importSummary', preview.counts)}{preview.skipped > 0 && <><br />{t('coll.importSkipped', { n: preview.skipped })}</>}
                <div className="row" style={{ marginTop: 6 }}>
                  <Btn small variant="primary" label={t('coll.importMerge')} onClick={() => { app.persistToast(applyImport(preview, 'merge'), t('coll.saved')); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }} />
                  <Btn small variant="warm" label={t('coll.importReplace')} onClick={() => { app.persistToast(applyImport(preview, 'replace'), t('coll.saved')); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }} />
                  <Btn small label={t('common.cancel')} onClick={() => setPreview(null)} />
                </div>
              </div>
            )}
          </div>
          <div className="card">
            <h3>{t('coll.clearAll')}</h3>
            {confirmClear ? <div className="row"><span className="grow" style={{ fontSize: '0.88em' }}>{t('coll.clearAllConfirm')}</span><Btn small label={t('common.cancel')} onClick={() => setConfirmClear(false)} /><Btn small variant="danger" icon="trash" label={t('common.confirm')} onClick={() => { clearAllLocalData(); saveCollections(); setConfirmClear(false); S.toast(t('common.done'), 'info'); }} /></div>
              : <Btn small variant="danger" icon="trash" label={t('coll.clearAll')} onClick={() => setConfirmClear(true)} />}
          </div>
        </div>
      )}
    </Dialog>
  );
}
