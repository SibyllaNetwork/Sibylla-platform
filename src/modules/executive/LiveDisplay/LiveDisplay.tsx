import React, { useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { InputField, SelectField, TextareaField } from '../../../core/components/form'
import {
  useLiveDisplayStore, FONTS, fontStack, CARD_META, CARD_TYPES,
  type CardType, type ColCount, type Row, type Slot, type CardData, type LiveConfig, type SlotRef,
} from '../../../store/useLiveDisplayStore'
import './LiveDisplay.sass'

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=900&q=70&auto=format&fit=crop`

// Copertine selezionabili per l'hero (esempi di stile).
const COVERS: { id: string; label: string; url: string }[] = [
  { id: 'mediterraneo', label: 'Mediterraneo', url: IMG('photo-1507525428034-b723cf961d3e') },
  { id: 'esploratore',  label: 'Esploratore',  url: IMG('photo-1469854523086-cc02fe5d8800') },
  { id: 'editoriale',   label: 'Città d\'arte', url: IMG('photo-1499678329028-101435549a4e') },
  { id: 'luxury',       label: 'Luxury',        url: IMG('photo-1540555700478-4be289fbecef') },
  { id: 'montagna',     label: 'Montagna',      url: IMG('photo-1464822759023-fed622ff2c3b') },
]
// Se l'id corrisponde a un preset usa la sua immagine, altrimenti l'id è già
// un URL o un'immagine caricata (data URL).
const coverUrl = (id: string) => COVERS.find((c) => c.id === id)?.url ?? (id || COVERS[0].url)

const MAX_IMG_BYTES = 3 * 1024 * 1024 // 3 MB
const eur = (n: number) => `€ ${(n || 0).toLocaleString('it-IT')}`

// Campo immagine riutilizzabile: anteprima + upload (max 3 MB) + URL.
function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [err, setErr] = useState('')
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) { setErr('Seleziona un file immagine'); return }
    if (f.size > MAX_IMG_BYTES) { setErr('Immagine troppo grande (max 3 MB)'); return }
    setErr('')
    const r = new FileReader()
    r.onload = () => onChange(String(r.result))
    r.readAsDataURL(f)
  }
  const caricata = value.startsWith('data:')
  return (
    <div className="ld__img">
      <span className="ld__img-thumb" style={{ backgroundImage: `url(${value})` }} aria-hidden="true" />
      <div className="ld__img-ctrl">
        <label className="ld__img-btn">
          <i className="fa-light fa-arrow-up-from-bracket" aria-hidden="true" /> Carica
          <input type="file" accept="image/*" onChange={onFile} hidden />
        </label>
        <input
          className="sib-input"
          placeholder={caricata ? 'Immagine caricata · incolla un URL per sostituire' : 'oppure URL immagine'}
          value={caricata ? '' : value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {err && <span className="ld__img-err"><i className="fa-light fa-circle-exclamation" aria-hidden="true" /> {err}</span>}
    </div>
  )
}

// ─── Anteprima di una card piena (presentazionale) ────────────────────────────
function SlotCard({ slot, contatti }: { slot: Slot; contatti: LiveConfig['contatti'] }) {
  const d = slot.data
  switch (slot.type) {
    case 'hero':
      return (
        <div className={`vt-card vt-card--hero vt-card--hero-${d.align ?? 'left'}`}
          style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.58)), url(${coverUrl(d.coverId ?? '')})` }}>
          {d.payoff && <span className="vt-card__payoff">{d.payoff}</span>}
          <h2 className="vt-card__hero-title">{d.titolo}</h2>
          {d.sottotitolo && <p className="vt-card__hero-sub">{d.sottotitolo}</p>}
          {d.ctaLabel && <span className="vt-cta">{d.ctaLabel}</span>}
        </div>
      )
    case 'immagine':
      return (
        <div className="vt-card vt-card--photo" style={{ backgroundImage: `url(${d.img})` }}>
          {d.tag && <span className="vt-card__tag">{d.tag}</span>}
          <span className="vt-card__photo-info">
            <strong>{d.nome}</strong>
            {!!d.da && <span>da {eur(d.da)}</span>}
          </span>
        </div>
      )
    case 'struttura':
      return (
        <div className="vt-card vt-card--struct">
          <span className="vt-card__struct-img" style={{ backgroundImage: `url(${d.img})` }} />
          <span className="vt-card__struct-name">{d.nome}</span>
          <span className="vt-card__struct-meta">{d.citta}</span>
        </div>
      )
    case 'pacchetto':
      return (
        <div className="vt-card vt-card--pkg">
          <strong>{d.nome}</strong>
          <span className="vt-card__pkg-meta">{d.notti} notti</span>
          <span className="vt-card__pkg-price">da {eur(d.da ?? 0)}</span>
          {d.ctaLabel && <span className="vt-cta vt-cta--sm">{d.ctaLabel}</span>}
        </div>
      )
    case 'testo':
      return (
        <div className="vt-card vt-card--text">
          <h3>{d.heading}</h3>
          <p>{d.body}</p>
        </div>
      )
    case 'servizi':
      return (
        <div className="vt-card vt-card--serv">
          {(d.servizi ?? []).map((sv, i) => (
            <span key={i} className="vt-card__chip"><i className={`fa-light fa-${sv.icon}`} aria-hidden="true" /> {sv.label}</span>
          ))}
        </div>
      )
    case 'contatti':
      return (
        <div className="vt-card vt-card--contatti">
          <span><i className="fa-light fa-envelope" aria-hidden="true" /> {contatti.email}</span>
          <span><i className="fa-light fa-phone" aria-hidden="true" /> {contatti.telefono}</span>
          <span><i className="fa-light fa-location-dot" aria-hidden="true" /> {contatti.indirizzo}</span>
        </div>
      )
    default:
      return null
  }
}

// ─── Selettore disposizione riga (1 · 2 · 3 · 4 card) ─────────────────────────
function RowAdder({ onPick, variant = 'slim' }: { onPick: (c: ColCount) => void; variant?: 'empty' | 'slim' }) {
  const [open, setOpen] = useState(variant === 'empty')
  if (!open)
    return (
      <button type="button" className="vt-adder vt-adder--slim" onClick={() => setOpen(true)}>
        <i className="fa-light fa-plus" aria-hidden="true" /> Aggiungi riga
      </button>
    )
  return (
    <div className={`vt-adder vt-adder--choose${variant === 'empty' ? ' vt-adder--empty' : ''}`}>
      <span className="vt-adder__label">
        {variant === 'empty' ? 'La vetrina è vuota — scegli la disposizione della prima riga' : 'Quante card in questa riga?'}
      </span>
      <div className="vt-adder__opts">
        {([1, 2, 3, 4] as ColCount[]).map((n) => (
          <button key={n} type="button" className="vt-adder__opt" onClick={() => { onPick(n); if (variant !== 'empty') setOpen(false) }}>
            <span className="vt-adder__diag" data-cols={n}>{Array.from({ length: n }).map((_, i) => <i key={i} />)}</span>
            <span className="vt-adder__opt-lbl">{n === 1 ? 'Card unica' : `${n} card`}</span>
          </button>
        ))}
      </div>
      {variant !== 'empty' && (
        <button type="button" className="vt-adder__cancel" onClick={() => setOpen(false)}>Annulla</button>
      )}
    </div>
  )
}

// ─── Editor contestuale della card selezionata ───────────────────────────────
function SlotEditor({ slot, onChange, onClear }: { slot: Slot; onChange: (p: CardData) => void; onClear: () => void }) {
  const d = slot.data
  const meta = slot.type ? CARD_META[slot.type] : null
  const servizi = d.servizi ?? []
  const setServizio = (i: number, p: Partial<{ label: string; icon: string }>) =>
    onChange({ servizi: servizi.map((s, j) => (j === i ? { ...s, ...p } : s)) })
  return (
    <div className="ld__card ld__card--ctx">
      <h3 className="ld__card-title">
        <i className={`fa-light fa-${meta?.icon ?? 'sliders'}`} aria-hidden="true" /> Card · {meta?.label}
        <button type="button" className="ld__ctx-clear" onClick={onClear} title="Svuota la card">
          <i className="fa-light fa-trash" aria-hidden="true" /> Svuota
        </button>
      </h3>

      {slot.type === 'hero' && <>
        <InputField className="ld__field" name="hero-payoff" label="Payoff" value={d.payoff ?? ''} onChange={(e) => onChange({ payoff: e.target.value })} />
        <InputField className="ld__field" name="hero-titolo" label="Titolo" value={d.titolo ?? ''} onChange={(e) => onChange({ titolo: e.target.value })} />
        <TextareaField className="ld__field" name="hero-sottotitolo" label="Sottotitolo" rows={2} value={d.sottotitolo ?? ''} onChange={(e) => onChange({ sottotitolo: e.target.value })} />
        <div className="ld__row2">
          <InputField className="ld__field" name="hero-ctaLabel" label="Testo pulsante" value={d.ctaLabel ?? ''} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
          <InputField className="ld__field" name="hero-ctaUrl" label="Link pulsante" value={d.ctaUrl ?? ''} onChange={(e) => onChange({ ctaUrl: e.target.value })} />
        </div>
        <div className="ld__field-raw">
          <span>Allineamento</span>
          <div className="ld__seg">
            {(['left', 'center'] as const).map((a) => (
              <button key={a} type="button" className={`ld__seg-btn${(d.align ?? 'left') === a ? ' is-active' : ''}`} onClick={() => onChange({ align: a })}>
                <i className={`fa-light fa-align-${a}`} aria-hidden="true" /> {a === 'left' ? 'Sinistra' : 'Centro'}
              </button>
            ))}
          </div>
        </div>
        <SelectField
          className="ld__field" name="hero-coverId" label="Copertina"
          value={COVERS.some((c) => c.id === d.coverId) ? d.coverId : ''}
          onChange={(e) => onChange({ coverId: e.target.value })}
          options={[
            ...COVERS.map((c) => ({ value: c.id, label: c.label })),
            ...(!COVERS.some((c) => c.id === d.coverId) ? [{ value: '', label: 'Personalizzata' }] : []),
          ]}
        />
        <label className="ld__field-raw"><span>Copertina personalizzata</span>
          <ImageField value={coverUrl(d.coverId ?? '')} onChange={(v) => onChange({ coverId: v })} />
        </label>
      </>}

      {slot.type === 'immagine' && <>
        <InputField className="ld__field" name="img-nome" label="Titolo" value={d.nome ?? ''} onChange={(e) => onChange({ nome: e.target.value })} />
        <div className="ld__row2">
          <InputField className="ld__field" name="img-tag" label="Tag" value={d.tag ?? ''} onChange={(e) => onChange({ tag: e.target.value })} />
          <InputField className="ld__field" name="img-da" label="Prezzo da (€)" type="number" value={d.da ?? 0} onChange={(e) => onChange({ da: Number(e.target.value) || 0 })} />
        </div>
        <label className="ld__field-raw"><span>Immagine</span><ImageField value={d.img ?? ''} onChange={(v) => onChange({ img: v })} /></label>
      </>}

      {slot.type === 'struttura' && <>
        <div className="ld__row2">
          <InputField className="ld__field" name="struct-nome" label="Nome" value={d.nome ?? ''} onChange={(e) => onChange({ nome: e.target.value })} />
          <InputField className="ld__field" name="struct-citta" label="Città" value={d.citta ?? ''} onChange={(e) => onChange({ citta: e.target.value })} />
        </div>
        <label className="ld__field-raw"><span>Immagine</span><ImageField value={d.img ?? ''} onChange={(v) => onChange({ img: v })} /></label>
      </>}

      {slot.type === 'pacchetto' && <>
        <InputField className="ld__field" name="pkg-nome" label="Nome" value={d.nome ?? ''} onChange={(e) => onChange({ nome: e.target.value })} />
        <div className="ld__row2">
          <InputField className="ld__field" name="pkg-notti" label="Notti" type="number" value={d.notti ?? 0} onChange={(e) => onChange({ notti: Number(e.target.value) || 0 })} />
          <InputField className="ld__field" name="pkg-da" label="Prezzo da (€)" type="number" value={d.da ?? 0} onChange={(e) => onChange({ da: Number(e.target.value) || 0 })} />
        </div>
        <div className="ld__row2">
          <InputField className="ld__field" name="pkg-ctaLabel" label="Testo pulsante" value={d.ctaLabel ?? ''} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
          <InputField className="ld__field" name="pkg-ctaUrl" label="Link pulsante" value={d.ctaUrl ?? ''} onChange={(e) => onChange({ ctaUrl: e.target.value })} />
        </div>
      </>}

      {slot.type === 'testo' && <>
        <InputField className="ld__field" name="testo-heading" label="Titolo" value={d.heading ?? ''} onChange={(e) => onChange({ heading: e.target.value })} />
        <TextareaField className="ld__field" name="testo-body" label="Testo" rows={4} value={d.body ?? ''} onChange={(e) => onChange({ body: e.target.value })} />
      </>}

      {slot.type === 'servizi' && <>
        <div className="ld__items">
          <div className="ld__items-head"><span>Servizi</span>
            <button type="button" className="ld__add" onClick={() => onChange({ servizi: [...servizi, { label: 'Servizio', icon: 'star' }] })}>
              <i className="fa-light fa-plus" aria-hidden="true" /> Aggiungi
            </button>
          </div>
          {servizi.map((sv, i) => (
            <div key={i} className="ld__item-row">
              <input className="sib-input" placeholder="Etichetta" value={sv.label} onChange={(e) => setServizio(i, { label: e.target.value })} />
              <input className="sib-input ld__icon-input" placeholder="icona FA" value={sv.icon} onChange={(e) => setServizio(i, { icon: e.target.value })} />
              <button type="button" className="ld__del" onClick={() => onChange({ servizi: servizi.filter((_, j) => j !== i) })} aria-label="Rimuovi"><i className="fa-light fa-trash" aria-hidden="true" /></button>
            </div>
          ))}
        </div>
      </>}

      {slot.type === 'contatti' && (
        <p className="ld__hint">Questa card mostra automaticamente i recapiti impostati in <strong>Contatti & social</strong> qui sotto.</p>
      )}
    </div>
  )
}

// ─── Pagina builder ─────────────────────────────────────────────────────────
export default function LiveDisplay({ navigate }: { navigate: (p: string) => void }) {
  const pages = useLiveDisplayStore((s) => s.pages)
  const currentId = useLiveDisplayStore((s) => s.currentId)
  const {
    newPage, selectPage, renamePage, deletePage, duplicatePage,
    setBrand, setTheme, setContatti, setSocial,
    addRow, setRowCols, moveRow, removeRow, duplicateRow,
    setSlotType, updateSlot, clearSlot, reset,
  } = useLiveDisplayStore()
  const [salvato, setSalvato] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selected, setSelected] = useState<SlotRef | null>(null)
  const [picking, setPicking] = useState<SlotRef | null>(null)

  const current = pages.find((p) => p.id === currentId) ?? pages[0]
  const config = current.config
  const { brand, theme, layout, contatti, social } = config

  const shareLink = `https://vetrine.sibyllanetwork.it/${current.slug}`
  const copyLink = async () => {
    try { await navigator.clipboard?.writeText(shareLink) } catch { /* no-op */ }
    setCopied(true); window.setTimeout(() => setCopied(false), 2000)
  }
  const salva = () => { setSalvato(true); window.setTimeout(() => setSalvato(false), 2500) }

  // Card selezionata (per l'editor contestuale).
  const selRow = selected ? layout.find((r) => r.id === selected.rowId) : undefined
  const selSlot = selRow && selected ? selRow.slots.find((sl) => sl.id === selected.slotId) : undefined

  // Voci di menu derivate dai titoli delle card "Testo".
  const navLinks = layout.flatMap((r) => r.slots).filter((s) => s.type === 'testo' && s.data.heading).map((s) => s.data.heading as string)

  const vars = {
    ['--vt-primary' as string]: theme.primary,
    ['--vt-accent' as string]: theme.accent,
    ['--vt-bg' as string]: theme.bg,
    ['--vt-text' as string]: theme.text,
    ['--vt-font' as string]: fontStack(theme.font),
    ['--vt-radius' as string]: `${theme.radius}px`,
  } as React.CSSProperties

  // Render di una singola riga con i suoi slot e i tool.
  const renderRow = (row: Row, idx: number) => (
    <div className="vt-row" key={row.id} style={{ ['--vt-cols' as string]: row.cols }}>
      <div className="vt-row__tools">
        <div className="vt-row__cols">
          {([1, 2, 3, 4] as ColCount[]).map((n) => (
            <button key={n} type="button" className={`vt-row__col-btn${row.cols === n ? ' is-active' : ''}`} title={`${n} card`} onClick={() => setRowCols(row.id, n)}>{n}</button>
          ))}
        </div>
        <span className="vt-row__sep" />
        <button type="button" className="vt-row__tool" title="Sposta su" disabled={idx === 0} onClick={() => moveRow(row.id, -1)}><i className="fa-solid fa-arrow-up" aria-hidden="true" /></button>
        <button type="button" className="vt-row__tool" title="Sposta giù" disabled={idx === layout.length - 1} onClick={() => moveRow(row.id, 1)}><i className="fa-solid fa-arrow-down" aria-hidden="true" /></button>
        <button type="button" className="vt-row__tool" title="Duplica riga" onClick={() => duplicateRow(row.id)}><i className="fa-solid fa-copy" aria-hidden="true" /></button>
        <button type="button" className="vt-row__tool vt-row__tool--danger" title="Elimina riga" onClick={() => { removeRow(row.id); setSelected(null); setPicking(null) }}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
      </div>
      <div className="vt-row__grid">
        {row.slots.map((slot) => {
          const isPicking = picking?.rowId === row.id && picking?.slotId === slot.id
          const isSelected = selected?.rowId === row.id && selected?.slotId === slot.id
          if (!slot.type)
            return (
              <div key={slot.id} className={`vt-slot vt-slot--empty${isPicking ? ' is-picking' : ''}`}>
                {isPicking ? (
                  <div className="vt-pick">
                    <span className="vt-pick__label">Scegli un contenuto</span>
                    <div className="vt-pick__grid">
                      {CARD_TYPES.map((t) => (
                        <button key={t} type="button" className="vt-pick__opt" title={CARD_META[t].hint}
                          onClick={() => { setSlotType(row.id, slot.id, t); setSelected({ rowId: row.id, slotId: slot.id }); setPicking(null) }}>
                          <i className={`fa-light fa-${CARD_META[t].icon}`} aria-hidden="true" />
                          <span>{CARD_META[t].label}</span>
                        </button>
                      ))}
                    </div>
                    <button type="button" className="vt-pick__cancel" onClick={() => setPicking(null)}>Annulla</button>
                  </div>
                ) : (
                  <button type="button" className="vt-slot__add" onClick={() => { setPicking({ rowId: row.id, slotId: slot.id }); setSelected(null) }}>
                    <i className="fa-light fa-plus" aria-hidden="true" />
                    <span>Aggiungi contenuto</span>
                  </button>
                )}
              </div>
            )
          return (
            <div key={slot.id} className={`vt-slot vt-slot--filled${isSelected ? ' is-selected' : ''}`}
              onClick={() => { setSelected({ rowId: row.id, slotId: slot.id }); setPicking(null) }}>
              <div className="vt-slot__tools">
                <button type="button" className="vt-slot__tool" title="Modifica" onClick={(e) => { e.stopPropagation(); setSelected({ rowId: row.id, slotId: slot.id }) }}><i className="fa-solid fa-pen" aria-hidden="true" /></button>
                <button type="button" className="vt-slot__tool" title="Svuota" onClick={(e) => { e.stopPropagation(); clearSlot(row.id, slot.id); if (isSelected) setSelected(null) }}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
              </div>
              <SlotCard slot={slot} contatti={contatti} />
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="ld">
      <PageHead
        title="Live display"
        subtitle="Componi la tua vetrina a griglia: aggiungi righe, scegli la disposizione e riempi le card"
        actions={
          <div className="ld__top-actions">
            {salvato && <span className="ld__saved"><i className="fa-light fa-circle-check" aria-hidden="true" /> Pagina pubblicata</span>}
            <button type="button" className="sib-btn sib-btn--ghost" onClick={() => { reset(); setSelected(null); setPicking(null) }}><i className="fa-light fa-arrow-rotate-left" aria-hidden="true" /> Svuota vetrina</button>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => window.open(shareLink, '_blank', 'noopener')}><i className="fa-light fa-arrow-up-right-from-square" aria-hidden="true" /> Anteprima</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={salva}><i className="fa-light fa-cloud-arrow-up" aria-hidden="true" /> Pubblica</button>
          </div>
        }
      />

      {/* ── Le mie pagine: salva con nome, modifica, elimina, link condivisione ── */}
      <div className="ld__pages">
        <div className="ld__pages-list">
          {pages.map((p) => (
            <button key={p.id} type="button" className={`ld__page${p.id === currentId ? ' is-active' : ''}`} onClick={() => { selectPage(p.id); setSelected(null); setPicking(null) }} title={p.nome}>
              <i className="fa-light fa-window-maximize" aria-hidden="true" /> {p.nome}
            </button>
          ))}
          <button type="button" className="ld__page-add" onClick={newPage}><i className="fa-light fa-plus" aria-hidden="true" /> Nuova pagina</button>
        </div>
        <div className="ld__pages-bar">
          <InputField
            className="ld__pages-name" name="page-nome" label="Nome pagina"
            value={current.nome} onChange={(e) => renamePage(current.id, e.target.value)}
          />
          <button type="button" className="sib-btn sib-btn--icon" title="Duplica pagina" onClick={() => duplicatePage(current.id)}><i className="fa-light fa-copy" aria-hidden="true" /></button>
          <button type="button" className="sib-btn sib-btn--icon" title="Elimina pagina" onClick={() => deletePage(current.id)} disabled={pages.length <= 1}><i className="fa-light fa-trash" aria-hidden="true" /></button>
          <div className="ld__share">
            <i className="fa-light fa-link ld__share-ico" aria-hidden="true" />
            <input className="sib-input ld__share-url" readOnly value={shareLink} onFocus={(e) => e.target.select()} />
            <button type="button" className="sib-btn sib-btn--secondary" onClick={copyLink}>
              <i className={`fa-light fa-${copied ? 'check' : 'copy'}`} aria-hidden="true" /> {copied ? 'Copiato' : 'Copia link'}
            </button>
          </div>
        </div>
      </div>

      <div className="ld__workspace">
        {/* ── Editor ──────────────────────────────────────────────────────────── */}
        <aside className="ld__editor">
          {/* Brand */}
          <div className="ld__card">
            <h3 className="ld__card-title"><i className="fa-light fa-store" aria-hidden="true" /> Brand & dominio</h3>
            <InputField className="ld__field" name="brand-nome" label="Nome vetrina" value={brand.nome} onChange={(e) => setBrand({ nome: e.target.value })} />
            <InputField className="ld__field" name="brand-payoff" label="Payoff" value={brand.payoff} onChange={(e) => setBrand({ payoff: e.target.value })} />
            <InputField className="ld__field" name="brand-sito" label="Dominio / sito" value={social.sito} onChange={(e) => setSocial({ sito: e.target.value })} />
          </div>

          {/* Card selezionata (editor contestuale) */}
          {selSlot ? (
            <SlotEditor
              slot={selSlot}
              onChange={(p) => updateSlot(selected!.rowId, selected!.slotId, p)}
              onClear={() => { clearSlot(selected!.rowId, selected!.slotId); setSelected(null) }}
            />
          ) : (
            <div className="ld__card ld__card--ctx ld__card--ctx-empty">
              <h3 className="ld__card-title"><i className="fa-light fa-hand-pointer" aria-hidden="true" /> Contenuto</h3>
              <p className="ld__hint">Seleziona una card nell'anteprima per modificarne i contenuti, oppure clicca un'area tratteggiata per inserire una nuova card.</p>
            </div>
          )}

          {/* Aspetto */}
          <div className="ld__card">
            <h3 className="ld__card-title"><i className="fa-light fa-palette" aria-hidden="true" /> Aspetto</h3>
            <div className="ld__colors">
              {([
                ['primary', 'Primario'], ['accent', 'Accento'], ['bg', 'Sfondo'], ['text', 'Testo'],
              ] as const).map(([k, lbl]) => (
                <label key={k} className="ld__color">
                  <span className="ld__color-swatch" style={{ background: theme[k] }}>
                    <input type="color" value={theme[k]} onChange={(e) => setTheme({ [k]: e.target.value } as Partial<typeof theme>)} />
                  </span>
                  <span className="ld__color-lbl">{lbl}</span>
                </label>
              ))}
            </div>
            <SelectField
              className="ld__field" name="theme-font" label="Font"
              value={theme.font}
              onChange={(e) => setTheme({ font: e.target.value as typeof theme.font })}
              options={FONTS.map((f) => ({ value: f.key, label: f.label }))}
            />
            <label className="ld__field-raw"><span>Arrotondamento angoli — {theme.radius}px</span>
              <input type="range" min={0} max={28} value={theme.radius} onChange={(e) => setTheme({ radius: Number(e.target.value) })} />
            </label>
          </div>

          {/* Contatti & social */}
          <div className="ld__card">
            <h3 className="ld__card-title"><i className="fa-light fa-address-book" aria-hidden="true" /> Contatti & social</h3>
            <InputField className="ld__field" name="contatti-email" label="Email" value={contatti.email} onChange={(e) => setContatti({ email: e.target.value })} />
            <div className="ld__row2">
              <InputField className="ld__field" name="contatti-telefono" label="Telefono" value={contatti.telefono} onChange={(e) => setContatti({ telefono: e.target.value })} />
              <InputField className="ld__field" name="contatti-indirizzo" label="Indirizzo" value={contatti.indirizzo} onChange={(e) => setContatti({ indirizzo: e.target.value })} />
            </div>
            <div className="ld__row2">
              <InputField className="ld__field" name="social-instagram" label="Instagram" value={social.instagram} onChange={(e) => setSocial({ instagram: e.target.value })} />
              <InputField className="ld__field" name="social-facebook" label="Facebook" value={social.facebook} onChange={(e) => setSocial({ facebook: e.target.value })} />
            </div>
          </div>
        </aside>

        {/* ── Anteprima live ──────────────────────────────────────────────────── */}
        <div className="ld__stage">
          <div className="ld__browser">
            <div className="ld__browser-bar">
              <span className="ld__dot" /><span className="ld__dot" /><span className="ld__dot" />
              <span className="ld__browser-url"><i className="fa-light fa-lock" aria-hidden="true" /> {shareLink.replace(/^https?:\/\//, '')}</span>
            </div>
            <div className="ld__browser-scroll">
              <div className="vt" style={vars}>
                {/* Nav */}
                <header className="vt__nav">
                  <span className="vt__brand">{brand.nome}</span>
                  {navLinks.length > 0 && <nav className="vt__menu">{navLinks.map((l, i) => <span key={i}>{l}</span>)}</nav>}
                </header>

                {/* Builder a righe */}
                <div className="vt__builder">
                  {layout.length === 0 ? (
                    <RowAdder key="adder-empty" variant="empty" onPick={(c) => addRow(c)} />
                  ) : (
                    <>
                      <RowAdder key="adder-top" onPick={(c) => addRow(c, null)} />
                      {layout.map((row, idx) => (
                        <React.Fragment key={row.id}>
                          {renderRow(row, idx)}
                          <RowAdder key={`adder-${row.id}`} onPick={(c) => addRow(c, row.id)} />
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </div>

                {/* Footer */}
                <footer className="vt__footer">
                  <span>© {brand.nome}</span>
                  <span className="vt__footer-social">
                    {social.instagram && <i className="fa-brands fa-instagram" aria-hidden="true" />}
                    {social.facebook && <i className="fa-brands fa-facebook" aria-hidden="true" />}
                  </span>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
