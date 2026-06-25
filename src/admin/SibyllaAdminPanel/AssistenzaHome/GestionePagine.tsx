import React, { useMemo, useState, useRef, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { InputField, SelectField, TextareaField, CheckboxField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import {
  useGestionePagineStore, childrenOf, descendantIds,
  FONT_STACKS, DEFAULT_STYLE,
  PageNode, MenuStyle, DropPos,
} from './useGestionePagineStore'
import './GestionePagine.sass'

interface Props { navigate: (p: string) => void }

const EMPTY_FORM: Omit<PageNode, 'id' | 'ordine'> = {
  nome: '', titolo: '', sottotitolo: '', link: '', icona: '',
  parentId: null, visibile: true, productionReady: false, disabilitata: false,
}

// ── Form di modifica/creazione pagina ────────────────────────────────────────
type FormState = Omit<PageNode, 'ordine'> & { ordine?: number }
interface ParentOpt { id: string; nome: string; link: string; depth: number }

export default function GestionePagine({ navigate }: Props) {
  const profili    = useGestionePagineStore(s => s.profili)
  const activeId   = useGestionePagineStore(s => s.activeId)
  const selectProfile   = useGestionePagineStore(s => s.selectProfile)
  const addProfile      = useGestionePagineStore(s => s.addProfile)
  const renameProfile   = useGestionePagineStore(s => s.renameProfile)
  const duplicateProfile= useGestionePagineStore(s => s.duplicateProfile)
  const deleteProfile   = useGestionePagineStore(s => s.deleteProfile)
  const updateStyle     = useGestionePagineStore(s => s.updateStyle)
  const addPage    = useGestionePagineStore(s => s.addPage)
  const updatePage = useGestionePagineStore(s => s.updatePage)
  const deletePage = useGestionePagineStore(s => s.deletePage)
  const movePage   = useGestionePagineStore(s => s.movePage)

  const profilo = profili.find(p => p.id === activeId) ?? profili[0]

  const [selId, setSelId]   = useState<string | null>(null)
  const [form, setForm]     = useState<FormState | null>(null)
  const [isNew, setIsNew]   = useState(false)
  const [search, setSearch] = useState('')

  // profilo modal (nuovo / rinomina)
  const [profModal, setProfModal] = useState<{ mode: 'new' | 'rename'; value: string } | null>(null)
  // stile modal
  const [styleDraft, setStyleDraft] = useState<MenuStyle | null>(null)

  // drag & drop
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{ id: string; pos: DropPos } | null>(null)

  const pages = profilo.pages
  const style = profilo.style

  // ── selezione / editing ────────────────────────────────────────────────────
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => (f ? { ...f, [k]: v } : f))

  // Pagina già presente nel catalogo a cui punta il Link corrente (esclusa la
  // voce in modifica). Titolo/Sottotitolo appartengono alla pagina collegata:
  // se il Link la individua, i campi la riflettono e al salvataggio la aggiornano.
  const findByLink = (link: string): PageNode | undefined => {
    const k = link.trim().toLowerCase()
    if (!k) return undefined
    return pages.find(p => p.id !== (selId ?? '') && p.link.trim().toLowerCase() === k)
  }
  const linkedPage = form ? findByLink(form.link) : undefined

  // Cambiando il Link, se punta a una pagina esistente pre-compila titolo/sottotitolo.
  const onLinkChange = (v: string) => {
    const match = findByLink(v)
    setForm(f => (f ? { ...f, link: v, ...(match ? { titolo: match.titolo, sottotitolo: match.sottotitolo } : {}) } : f))
  }

  const openEdit = (pg: PageNode) => {
    setSelId(pg.id); setIsNew(false)
    setForm({ ...pg })
  }
  const openNew = () => {
    setSelId(null); setIsNew(true)
    setForm({ ...EMPTY_FORM, id: '__new__' })
  }
  const cancel = () => { setForm(null); setSelId(null); setIsNew(false) }

  const save = () => {
    if (!form || !form.nome.trim()) { toast.error('Il nome è obbligatorio.', 'Gestione pagine'); return }
    // se il Link punta a una pagina esistente, titolo/sottotitolo aggiornano quella pagina
    if (linkedPage) updatePage(profilo.id, linkedPage.id, { titolo: form.titolo, sottotitolo: form.sottotitolo })

    if (isNew) {
      const { id, ordine, ...rest } = form
      addPage(profilo.id, rest)
      toast.success(
        linkedPage
          ? `Voce «${form.nome.trim()}» creata; titolo/sottotitolo aggiornati su «${linkedPage.nome}».`
          : `Pagina «${form.nome.trim()}» creata.`,
        'Gestione pagine',
      )
    } else if (selId) {
      const { id, ordine, ...rest } = form
      updatePage(profilo.id, selId, rest)
      toast.success('Pagina aggiornata.', 'Gestione pagine')
    }
    cancel()
  }

  const removePage = (pg: PageNode) => {
    deletePage(profilo.id, pg.id)
    if (selId === pg.id) cancel()
    toast.success(`«${pg.nome}» eliminata.`, 'Gestione pagine')
  }

  // toggle rapidi dalla riga (pubblica / nascondi)
  const toggleVisible = (pg: PageNode) =>
    updatePage(profilo.id, pg.id, { visibile: !pg.visibile })

  // ── parent options (esclude se stesso e i discendenti) ──────────────────────
  const parentOptions = useMemo<ParentOpt[]>(() => {
    const blocked = isNew || !selId ? new Set<string>() : (() => { const s = descendantIds(pages, selId); s.add(selId); return s })()
    const opts: ParentOpt[] = []
    const walk = (parentId: string | null, depth: number) => {
      childrenOf(pages, parentId).forEach(pg => {
        if (!blocked.has(pg.id)) opts.push({ id: pg.id, nome: pg.nome, link: pg.link, depth })
        walk(pg.id, depth + 1)
      })
    }
    walk(null, 0)
    return opts
  }, [pages, selId, isNew])

  // ── ricerca: id delle pagine che matchano (per evidenziare/filtrare) ─────────
  const q = search.trim().toLowerCase()
  const matches = (pg: PageNode) =>
    !q || pg.nome.toLowerCase().includes(q) || pg.link.toLowerCase().includes(q) || pg.id.toLowerCase().includes(q)

  // ── drag & drop handlers ────────────────────────────────────────────────────
  // Zona verticale: terzo alto → prima, terzo basso → dopo (stesso livello);
  // banda centrale → dentro il nodo (sottolivello). Lo spostamento "orizzontale"
  // (cambio di gerarchia/profondità) avviene così, senza Parent select.
  const hintFor = (e: React.DragEvent, pg: PageNode): DropPos => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - r.top
    if (y < r.height * 0.3) return 'before'
    if (y > r.height * 0.7) return 'after'
    return 'inside'
  }

  const onDrop = (target: PageNode) => {
    if (dragId && dropHint) movePage(profilo.id, dragId, target.id, dropHint.pos)
    setDragId(null); setDropHint(null)
  }

  // ── render albero ricorsivo ─────────────────────────────────────────────────
  const renderNode = (pg: PageNode, depth: number): React.ReactNode => {
    const kids = childrenOf(pages, pg.id)
    const dimmed = !matches(pg) && q !== ''
    const hint = dropHint?.id === pg.id ? dropHint : null
    return (
      <React.Fragment key={pg.id}>
        <div
          className={[
            'gpag__row',
            selId === pg.id ? 'is-sel' : '',
            pg.disabilitata ? 'is-disabled' : '',
            dimmed ? 'is-dimmed' : '',
            dragId === pg.id ? 'is-dragging' : '',
            hint ? `is-drop-${hint.pos}` : '',
          ].join(' ')}
          style={{ '--gpag-depth': depth } as React.CSSProperties}
          onClick={() => openEdit(pg)}
          draggable
          onDragStart={e => { setDragId(pg.id); e.dataTransfer.effectAllowed = 'move' }}
          onDragEnd={() => { setDragId(null); setDropHint(null) }}
          onDragOver={e => {
            e.preventDefault()
            if (!dragId || dragId === pg.id) return
            const pos = hintFor(e, pg)
            setDropHint(h => (h && h.id === pg.id && h.pos === pos ? h : { id: pg.id, pos }))
          }}
          onDrop={e => { e.preventDefault(); onDrop(pg) }}
        >
          <span className="gpag__grip" title="Trascina per riordinare"><Ico n="dots" s={14} c="var(--color-text-inactive)" /></span>
          <span className="gpag__row-ico" dangerouslySetInnerHTML={{ __html: pg.icona || '' }} />
          <span className="gpag__row-name">{pg.nome}</span>
          <span className="gpag__row-link">{pg.link}</span>
          <span className="gpag__row-flags">
            {pg.productionReady && <Tooltip text="Production ready"><span className="gpag__dot gpag__dot--prod" /></Tooltip>}
            <Tooltip text={pg.visibile ? 'Visibile in menu' : 'Nascosta'}>
              <button type="button" className="gpag__flag-btn" onClick={e => { e.stopPropagation(); toggleVisible(pg) }}>
                <Ico n={pg.visibile ? 'eye' : 'eye-off'} s={15} c={pg.visibile ? 'var(--color-primary)' : 'var(--color-text-inactive)'} />
              </button>
            </Tooltip>
            <Tooltip text="Elimina">
              <button type="button" className="gpag__flag-btn" onClick={e => { e.stopPropagation(); removePage(pg) }}>
                <Ico n="trash" s={14} c="var(--color-text-inactive)" />
              </button>
            </Tooltip>
          </span>
        </div>
        {kids.map(k => renderNode(k, depth + 1))}
      </React.Fragment>
    )
  }

  const roots = childrenOf(pages, null)
  const total = pages.length

  // ── stile menu live (CSS custom properties consumate dal .sass) ─────────────
  const menuVars = {
    '--gpag-font': FONT_STACKS[style.fontFamily],
    '--gpag-size': `${style.fontSize}px`,
    '--gpag-weight': style.bold ? 700 : 500,
    '--gpag-transform': style.uppercase ? 'uppercase' : 'none',
    '--gpag-color': style.colorText,
    '--gpag-active': style.colorActive,
    '--gpag-menu-bg': style.colorBg,
    '--gpag-icon': style.colorIcon,
  } as React.CSSProperties

  // ── profilo modal submit ────────────────────────────────────────────────────
  const submitProfModal = () => {
    if (!profModal) return
    const v = profModal.value.trim()
    if (!v) return
    if (profModal.mode === 'new') { addProfile(v); toast.success(`Profilo «${v}» creato.`, 'Profili') }
    else { renameProfile(profilo.id, v); toast.success('Profilo rinominato.', 'Profili') }
    setProfModal(null)
  }

  return (
    <div className="gpag">
      <button type="button" className="gpag__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>

      <div className="gpag__head">
        <h1 className="gpag__title">Gestione Pagine</h1>
        <p className="gpag__sub">Crea menu differenziati per profilo e modifica il catalogo master delle pagine: nome, titolo, sottotitolo, link, icona, ordine e gerarchia.</p>
      </div>

      {/* ── Barra profili ───────────────────────────────────────────────── */}
      <div className="gpag__profiles">
        <div className="gpag__tabs">
          {profili.map(p => (
            <button
              key={p.id}
              type="button"
              className={`gpag__tab ${p.id === activeId ? 'is-active' : ''}`}
              onClick={() => { selectProfile(p.id); cancel() }}
            >{p.nome}</button>
          ))}
        </div>
        <div className="gpag__prof-actions">
          <Tooltip text="Nuovo profilo">
            <button type="button" className="gpag__pbtn" onClick={() => setProfModal({ mode: 'new', value: '' })}>
              <Ico n="plus" s={13} c="currentColor" /> Profilo
            </button>
          </Tooltip>
          <Tooltip text="Duplica il profilo attivo">
            <button type="button" className="gpag__pbtn" onClick={() => { duplicateProfile(profilo.id); toast.success('Profilo duplicato.', 'Profili') }}>
              <Ico n="copy" s={13} c="currentColor" /> Duplica
            </button>
          </Tooltip>
          <Tooltip text="Rinomina il profilo attivo">
            <button type="button" className="gpag__pbtn" onClick={() => setProfModal({ mode: 'rename', value: profilo.nome })}>
              <Ico n="edit" s={13} c="currentColor" /> Rinomina
            </button>
          </Tooltip>
          <Tooltip text="Personalizza stile del menu">
            <button type="button" className="gpag__pbtn" onClick={() => setStyleDraft({ ...style })}>
              <Ico n="wheel" s={13} c="currentColor" /> Stile menu
            </button>
          </Tooltip>
          <Tooltip text="Elimina il profilo attivo">
            <button type="button" className="gpag__pbtn gpag__pbtn--danger" disabled={profili.length <= 1}
              onClick={() => { if (window.confirm(`Eliminare il profilo «${profilo.nome}»?`)) { deleteProfile(profilo.id); cancel() } }}>
              <Ico n="trash" s={13} c="currentColor" /> Elimina
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="gpag__toolbar">
        <div className="gpag__search">
          <Ico n="search" s={14} c="var(--color-text-inactive)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome / link / id…" />
        </div>
        <div className="gpag__toolbar-r">
          <button type="button" className="gpag__btn gpag__btn--primary" onClick={openNew}>
            <Ico n="plus" s={13} c="currentColor" /> Nuova
          </button>
          <button type="button" className="gpag__btn" onClick={() => toast.success('Cache del menu svuotata.', 'Gestione pagine')}>
            <Ico n="refresh" s={13} c="var(--color-primary)" /> Reset cache
          </button>
        </div>
      </div>

      {/* ── Corpo: albero + pannello modifica ───────────────────────────── */}
      <div className="gpag__body">
        <div className="gpag__tree" style={menuVars}>
          {roots.length === 0 && <div className="gpag__empty">Nessuna pagina in questo profilo. Usa «Nuova» per crearne una.</div>}
          {roots.map(r => renderNode(r, 0))}
        </div>

        <aside className="gpag__panel">
          {!form ? (
            <div className="gpag__panel-empty">
              <Ico n="edit" s={22} c="var(--color-text-inactive)" />
              <p>Seleziona una voce dall'albero o crea una <strong>Nuova</strong> pagina.</p>
              <p className="gpag__panel-empty-meta">{total} {total === 1 ? 'voce' : 'voci'} nel profilo «{profilo.nome}»</p>
            </div>
          ) : (
            <>
              <h2 className="gpag__panel-title">{isNew ? 'Nuova pagina' : 'Modifica pagina'}</h2>

              <div className="gpag__section">Dati base</div>
              <InputField
                name="nome"
                label="Nome (etichetta menu)"
                className="gpag__f"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
              />
              <InputField
                name="link"
                label="Link (collegamento alla pagina)"
                className="gpag__f"
                value={form.link}
                onChange={e => onLinkChange(e.target.value)}
                placeholder="/Controller/Azione"
              />
              {linkedPage && (
                <div className="gpag__linked">
                  <Ico n="alert" s={14} c="#8a6d1f" />
                  <span>Collegata alla pagina esistente <strong>«{linkedPage.nome}»</strong>: titolo e sottotitolo aggiorneranno quella pagina.</span>
                </div>
              )}
              <InputField
                name="titolo"
                label={`Titolo ${linkedPage ? `(della pagina «${linkedPage.nome}»)` : '(titolo della pagina)'}`}
                className="gpag__f"
                value={form.titolo}
                onChange={e => set('titolo', e.target.value)}
                placeholder="Se vuoto usa il nome"
              />
              <InputField
                name="sottotitolo"
                label={`Sottotitolo ${linkedPage ? `(della pagina «${linkedPage.nome}»)` : '(sottotitolo della pagina)'}`}
                className="gpag__f"
                value={form.sottotitolo}
                onChange={e => set('sottotitolo', e.target.value)}
                placeholder="Opzionale"
              />
              <TextareaField
                name="icona"
                label="Icona (HTML icona Font Awesome)"
                className="gpag__f gpag__f-icona"
                value={form.icona}
                onChange={e => set('icona', e.target.value)}
                rows={2}
                placeholder='<i class="fa-regular fa-pen modify"></i>'
              />
              <div className="gpag__icona-preview">
                <span className="gpag__icona-preview-lbl">Anteprima</span>
                <span className="gpag__icona-preview-box" dangerouslySetInnerHTML={{ __html: form.icona || '' }} />
              </div>

              <div className="gpag__section">Gerarchia</div>
              <label className="gpag__f">
                <span>Parent (posizione nel menu)</span>
                <ParentSelect value={form.parentId} options={parentOptions} onChange={v => set('parentId', v)} />
              </label>
              {!isNew && selId && (
                <InputField
                  name="ordine"
                  label="Ordine"
                  className="gpag__f"
                  type="number"
                  value={pages.find(p => p.id === selId)?.ordine ?? 0}
                  onChange={e => updatePage(profilo.id, selId, { ordine: Number(e.target.value) || 0 })}
                />
              )}

              <div className="gpag__section">Stato</div>
              <CheckboxField
                name="visibile"
                label="Visibile in menu (pubblicata)"
                className="gpag__check"
                checked={form.visibile}
                onChange={e => set('visibile', e.target.checked)}
              />
              <CheckboxField
                name="productionReady"
                label="Production ready"
                className="gpag__check"
                checked={form.productionReady}
                onChange={e => set('productionReady', e.target.checked)}
              />
              <CheckboxField
                name="disabilitata"
                label="Disabilitata"
                className="gpag__check"
                checked={form.disabilitata}
                onChange={e => set('disabilitata', e.target.checked)}
              />

              <div className="gpag__panel-actions">
                <button type="button" className="gpag__btn gpag__btn--primary" onClick={save}>Salva</button>
                <button type="button" className="gpag__btn" onClick={cancel}>Annulla</button>
                {!isNew && selId && (
                  <button type="button" className="gpag__btn gpag__btn--danger" onClick={() => removePage(pages.find(p => p.id === selId)!)}>Elimina</button>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ── Modale profilo (nuovo / rinomina) ───────────────────────────── */}
      <Modal open={!!profModal} onClose={() => setProfModal(null)} title={profModal?.mode === 'new' ? 'Nuovo profilo' : 'Rinomina profilo'} size="sm">
        <div className="gpag-pmodal">
          <label className="gpag__f">
            <span>Nome profilo</span>
            <input className="sib-input" autoFocus value={profModal?.value ?? ''}
              onChange={e => setProfModal(m => (m ? { ...m, value: e.target.value } : m))}
              onKeyDown={e => { if (e.key === 'Enter') submitProfModal() }} />
          </label>
          <div className="gpag__panel-actions">
            <button type="button" className="gpag__btn gpag__btn--primary" onClick={submitProfModal}>Conferma</button>
            <button type="button" className="gpag__btn" onClick={() => setProfModal(null)}>Annulla</button>
          </div>
        </div>
      </Modal>

      {/* ── Modale stile menu ───────────────────────────────────────────── */}
      <Modal open={!!styleDraft} onClose={() => setStyleDraft(null)} title={`Stile menu — ${profilo.nome}`} size="lg">
        {styleDraft && (
          <StyleEditor
            draft={styleDraft}
            onChange={patch => setStyleDraft(d => (d ? { ...d, ...patch } : d))}
            onReset={() => setStyleDraft({ ...DEFAULT_STYLE })}
            onSave={() => { updateStyle(profilo.id, styleDraft); setStyleDraft(null); toast.success('Stile del menu aggiornato.', 'Gestione pagine') }}
            onCancel={() => setStyleDraft(null)}
            sampleNames={roots.slice(0, 4).map(r => r.nome)}
            sampleIcon={roots[0]?.icona ?? '<i class="fa-solid fa-house"></i>'}
          />
        )}
      </Modal>
    </div>
  )
}

// ── Editor stile menu ─────────────────────────────────────────────────────────
function StyleEditor({
  draft, onChange, onReset, onSave, onCancel, sampleNames, sampleIcon,
}: {
  draft: MenuStyle
  onChange: (p: Partial<MenuStyle>) => void
  onReset: () => void
  onSave: () => void
  onCancel: () => void
  sampleNames: string[]
  sampleIcon: string
}) {
  const previewVars = {
    '--gpag-font': FONT_STACKS[draft.fontFamily],
    '--gpag-size': `${draft.fontSize}px`,
    '--gpag-weight': draft.bold ? 700 : 500,
    '--gpag-transform': draft.uppercase ? 'uppercase' : 'none',
    '--gpag-color': draft.colorText,
    '--gpag-active': draft.colorActive,
    '--gpag-menu-bg': draft.colorBg,
    '--gpag-icon': draft.colorIcon,
  } as React.CSSProperties
  const names = sampleNames.length ? sampleNames : ['Voce di esempio', 'Seconda voce']

  return (
    <div className="gpag-style">
      <div className="gpag-style__grid">
        <SelectField
          name="fontFamily"
          label="Font"
          className="gpag__f"
          value={draft.fontFamily}
          onChange={e => onChange({ fontFamily: e.target.value as MenuStyle['fontFamily'] })}
          options={[
            { value: 'heading', label: 'Poppins (heading)' },
            { value: 'body', label: 'Open Sans (body)' },
            { value: 'mono', label: 'Monospace' },
          ]}
        />
        <label className="gpag__f">
          <span>Dimensione testo ({draft.fontSize}px)</span>
          <input type="range" min={11} max={20} value={draft.fontSize} onChange={e => onChange({ fontSize: Number(e.target.value) })} />
        </label>
        <CheckboxField
          name="bold"
          label="Grassetto"
          className="gpag__check"
          checked={draft.bold}
          onChange={e => onChange({ bold: e.target.checked })}
        />
        <CheckboxField
          name="uppercase"
          label="Maiuscolo"
          className="gpag__check"
          checked={draft.uppercase}
          onChange={e => onChange({ uppercase: e.target.checked })}
        />
        <label className="gpag__f gpag__f--color">
          <span>Colore testo</span>
          <input type="color" value={draft.colorText} onChange={e => onChange({ colorText: e.target.value })} />
        </label>
        <label className="gpag__f gpag__f--color">
          <span>Colore voce attiva</span>
          <input type="color" value={draft.colorActive} onChange={e => onChange({ colorActive: e.target.value })} />
        </label>
        <label className="gpag__f gpag__f--color">
          <span>Colore sfondo menu</span>
          <input type="color" value={draft.colorBg} onChange={e => onChange({ colorBg: e.target.value })} />
        </label>
        <label className="gpag__f gpag__f--color">
          <span>Colore icone</span>
          <input type="color" value={draft.colorIcon} onChange={e => onChange({ colorIcon: e.target.value })} />
        </label>
      </div>

      <div className="gpag-style__preview" style={previewVars}>
        <div className="gpag-style__preview-lbl">Anteprima menu</div>
        <div className="gpag-style__preview-menu">
          {names.map((n, i) => (
            <div key={i} className={`gpag-style__pv-row ${i === 0 ? 'is-active' : ''}`}>
              <span className="gpag-style__pv-ico" dangerouslySetInnerHTML={{ __html: sampleIcon }} />
              <span className="gpag-style__pv-name">{n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="gpag__panel-actions">
        <button type="button" className="gpag__btn gpag__btn--primary" onClick={onSave}>Salva stile</button>
        <button type="button" className="gpag__btn" onClick={onCancel}>Annulla</button>
        <button type="button" className="gpag__btn gpag__btn--ghost" onClick={onReset}>Ripristina default</button>
      </div>
    </div>
  )
}

// ── Combobox Parent ricercabile ──────────────────────────────────────────────
// Sostituisce la <select> nativa: con cataloghi lunghi la voce si trova subito
// digitando (filtra per nome o link), mantenendo l'indentazione gerarchica.
function ParentSelect({ value, options, onChange }: {
  value: string | null
  options: ParentOpt[]
  onChange: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const selected = value ? options.find(o => o.id === value) : null
  const term = q.trim().toLowerCase()
  const filtered = term
    ? options.filter(o => o.nome.toLowerCase().includes(term) || o.link.toLowerCase().includes(term))
    : options
  const showRoot = !term || '(root)'.includes(term)

  const pick = (v: string | null) => { onChange(v); setOpen(false); setQ('') }

  return (
    <div className={`gpag-psel ${open ? 'is-open' : ''}`} ref={ref}>
      <button type="button" className="gpag-psel__btn" onClick={() => setOpen(o => !o)}>
        <span className={`gpag-psel__val ${!value ? 'is-root' : ''}`}>{value ? (selected?.nome ?? '— voce rimossa —') : '(root)'}</span>
        <Ico n="chevd" s={14} c="var(--color-text-inactive)" />
      </button>
      {open && (
        <div className="gpag-psel__pop">
          <div className="gpag-psel__search">
            <Ico n="search" s={13} c="var(--color-text-inactive)" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca voce per nome o link…" />
          </div>
          <div className="gpag-psel__list">
            {showRoot && (
              <button type="button" className={`gpag-psel__opt ${value === null ? 'is-sel' : ''}`} onClick={() => pick(null)}>
                <span className="gpag-psel__opt-name">(root)</span>
              </button>
            )}
            {filtered.map(o => (
              <button key={o.id} type="button"
                className={`gpag-psel__opt ${value === o.id ? 'is-sel' : ''}`}
                style={{ '--gpag-opt-depth': o.depth } as React.CSSProperties}
                onClick={() => pick(o.id)}>
                <span className="gpag-psel__opt-name">{o.nome}</span>
                <span className="gpag-psel__opt-link">{o.link}</span>
              </button>
            ))}
            {!showRoot && filtered.length === 0 && <div className="gpag-psel__empty">Nessun risultato per «{q.trim()}»</div>}
          </div>
        </div>
      )}
    </div>
  )
}
