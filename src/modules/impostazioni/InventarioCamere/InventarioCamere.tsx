import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import ToggleSwitch from '../../../core/components/ToggleSwitch'
import AlertBanner from '../../../core/components/AlertBanner'
import { toast } from '../../../core/components/Toast/useToast'
import { InputField, SelectField, TextareaField } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { useTipologieCamereStore, type TipologiaCamera } from '../../../store/useTipologieCamereStore'
import RoomIllustration from './RoomIllustration'
import './InventarioCamere.sass'
import { useStruttureCliente, useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'

const TIPI = ['Singola', 'Doppia', 'Twin', 'Matrimoniale', 'Tripla', 'Quadrupla', 'Family', 'Suite', 'Accessibile', 'DUS']
const MAX_CAPACITA = 8
const MAX_LETTI_EXTRA = 3
const MAX_GALLERY = 6

const AMENITIES = [
  'Aria condizionata', 'Balcone', 'Vasca', 'TV a schermo piatto', 'Terrazza', 'Bollitore elettrico', 'Armadio o guardaroba', 'Riscaldamento',
  'Cassaforte', 'Insonorizzazione', 'Scrivania', 'Presa elettrica vicino al letto', 'Bagno privato', 'Bagno in comune', 'Bidet', 'Accappatoio',
  'Prodotti da bagno in omaggio', 'Asciugacapelli', 'Pantofole', 'Vino/champagne', 'Asciugamani', 'Accesso disabili', 'Dep. bagagli', 'Colazione', 'Reception h24',
]

const ospiti = (n: number) => `${n} ${n === 1 ? 'ospite' : 'ospiti'}`

// ─── MOCK ─────────────────────────────────────────────────────────────────────
// Tipologie della struttura dalle schede demo: tutte le tipologie del catalogo,
// col numero di camere ripartito sul totale della struttura (stesso giro di
// tipologie del front office per quelle già presenti, almeno 1 per le altre).
const TIP_GIRO = ['Doppia Classic', 'Matrimoniale Deluxe', 'Singola Classic', 'Twin Classic', 'Tripla Classic', 'Matrimoniale Deluxe', 'DUS', 'Quadrupla']
const BASE: Record<string, { tipo: string; capacita: number; lettiExtra: number; descrizione: string }> = {
  'Singola Classic':     { tipo: 'Singola',      capacita: 1, lettiExtra: 0, descrizione: 'Letto singolo, scrivania e bagno privato con doccia.' },
  'Doppia Classic':      { tipo: 'Doppia',       capacita: 2, lettiExtra: 0, descrizione: 'Letto matrimoniale, spaziosa e accogliente: perfetta per le coppie.' },
  'Twin Classic':        { tipo: 'Twin',         capacita: 2, lettiExtra: 0, descrizione: 'Due letti singoli separati, ideale per amici o colleghi.' },
  'Matrimoniale Deluxe': { tipo: 'Matrimoniale', capacita: 2, lettiExtra: 1, descrizione: 'Letto king size, area relax e set di cortesia premium.' },
  'Tripla Classic':      { tipo: 'Tripla',       capacita: 3, lettiExtra: 0, descrizione: 'Letto matrimoniale più un singolo, ideale per tre ospiti.' },
  'Tripla con letto aggiunto': { tipo: 'Tripla', capacita: 3, lettiExtra: 1, descrizione: 'Tre posti letto più una brandina: per gruppi e famiglie numerose.' },
  'Quadrupla':           { tipo: 'Quadrupla',    capacita: 4, lettiExtra: 0, descrizione: 'Due letti matrimoniali, fino a quattro ospiti.' },
  'Family':              { tipo: 'Family',       capacita: 4, lettiExtra: 1, descrizione: 'Matrimoniale e letto a castello: spaziosa e versatile per le famiglie.' },
  'Suite':               { tipo: 'Suite',        capacita: 2, lettiExtra: 2, descrizione: 'Camera da letto e soggiorno separati, vista panoramica.' },
  'Camera accessibile':  { tipo: 'Accessibile',  capacita: 2, lettiExtra: 0, descrizione: 'Spazi di manovra, maniglioni di sostegno e bagno senza barriere.' },
  'DUS':                 { tipo: 'DUS',          capacita: 1, lettiExtra: 0, descrizione: 'Doppia a uso singola.' },
}

function tipologieDemo(scheda: { camere: number; seme: number; categoria: string }): TipologiaCamera[] {
  const nomi = Object.keys(BASE)
  const conta = new Map<string, number>(nomi.map((t) => [t, 1]))
  const n = scheda.camere
  const perPiano = n <= 8 ? n : n <= 40 ? 10 : n <= 100 ? 16 : 25
  for (let i = nomi.length; i < n; i++) {
    const piano = 1 + Math.floor(i / perPiano)
    const ultimo = piano === Math.ceil(n / perPiano)
    const tip = scheda.categoria === 'studentato' ? (i % 4 === 0 ? 'Twin Classic' : 'Singola Classic')
      : ultimo && i % perPiano >= perPiano - 2 ? 'Suite' : TIP_GIRO[(scheda.seme + i * 7) % TIP_GIRO.length]
    conta.set(tip, (conta.get(tip) ?? 0) + 1)
  }
  return nomi.map((nome) => ({
    id: `tip-${scheda.seme}-${nome}`, nome, ...BASE[nome], numero: conta.get(nome) ?? 1,
    nomeOnline: '', amenities: [], immagine: null, gallery: [], attiva: true,
  }))
}

let _seq = 0
const nuovoId = () => `tip-new-${Date.now()}-${++_seq}`
const nuovaTipologia = (): TipologiaCamera => ({
  id: nuovoId(), nome: '', tipo: 'Doppia', numero: 1, capacita: 2, lettiExtra: 0,
  descrizione: '', nomeOnline: '', amenities: [], immagine: null, gallery: [], attiva: true,
})

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function InventarioCamere(_props: { navigate?: (p: string) => void } = {}) {
  // Strutture (con camere) del cliente corrente, a partire da quella selezionata in alto.
  const schede = useStruttureCliente()
  const strutture = useMemo(() => schede.filter((x) => x.camere > 0), [schede])
  const [strutturaNome, setStrutturaNome] = useStrutturaPagina()
  const scheda = strutture.find((s) => s.nome === strutturaNome)
  const pmsEsterno = scheda ? scheda.seme % 7 === 0 : false

  const salvate = useTipologieCamereStore((s) => s.salvate[strutturaNome])
  const salva = useTipologieCamereStore((s) => s.salva)
  const confirm = useConfirmStore((s) => s.confirm)

  const iniziali = useMemo(() => salvate ?? (scheda ? tipologieDemo(scheda) : []), [salvate, scheda])
  const [draft, setDraft] = useState<TipologiaCamera[]>(iniziali)
  useEffect(() => { setDraft(iniziali) }, [iniziali])

  const [aperta, setAperta] = useState<string | null>(null)
  const [scheda_, setSchedaId] = useState<string | null>(null)
  const [errori, setErrori] = useState<Set<string>>(new Set())
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const salvatePerId = useMemo(() => new Map(iniziali.map((t) => [t.id, JSON.stringify(t)])), [iniziali])
  const modificata = (t: TipologiaCamera) => salvatePerId.get(t.id) !== JSON.stringify(t)
  const dirty = JSON.stringify(draft) !== JSON.stringify(iniziali)

  const update = (id: string, patch: Partial<TipologiaCamera>) => {
    setDraft((d) => d.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    if (patch.nome?.trim()) setErrori((e) => { const n = new Set(e); n.delete(id); return n })
  }
  const aggiungi = () => {
    const t = nuovaTipologia()
    setDraft((d) => [...d, t])
    setAperta(t.id)
  }
  const duplica = (id: string) => setDraft((d) => {
    const i = d.findIndex((t) => t.id === id)
    const copia = { ...d[i], id: nuovoId(), nome: `${d[i].nome} (copia)` }
    return [...d.slice(0, i + 1), copia, ...d.slice(i + 1)]
  })
  const elimina = async (t: TipologiaCamera) => {
    const ok = await confirm({ message: <>Eliminare la tipologia <strong>{t.nome || 'senza nome'}</strong>? Le camere associate restano da riassegnare.</> })
    if (ok) setDraft((d) => d.filter((x) => x.id !== t.id))
  }
  const sposta = (from: string, to: string) => setDraft((d) => {
    const src = d.findIndex((t) => t.id === from)
    const dst = d.findIndex((t) => t.id === to)
    if (src < 0 || dst < 0 || src === dst) return d
    const next = [...d]
    const [x] = next.splice(src, 1)
    next.splice(dst, 0, x)
    return next
  })

  const annulla = () => { setDraft(iniziali); setErrori(new Set()); setAperta(null) }
  const salvaTutto = () => {
    const vuote = draft.filter((t) => !t.nome.trim()).map((t) => t.id)
    if (vuote.length) {
      setErrori(new Set(vuote))
      toast.error('Dai un nome a tutte le tipologie prima di salvare.')
      return
    }
    salva(strutturaNome, draft)
    setAperta(null)
    toast.success(`Tipologie di ${strutturaNome} salvate.`)
  }

  const inScheda = draft.find((t) => t.id === scheda_)
  if (inScheda) {
    return <SchedaTipologia tipologia={inScheda} onBack={() => setSchedaId(null)} onApply={(upd) => { update(upd.id, upd); setSchedaId(null) }} />
  }

  const camere = draft.reduce((s, t) => s + (t.attiva ? t.numero : 0), 0)
  const attive = draft.filter((t) => t.attiva).length

  return (
    <div className="invc">
      <PageHead title="Inventario camere" subtitle="Tipologie di camera della struttura: numero, capacità e letti extra"
        actions={
          <Tooltip text={pmsEsterno ? 'Non disponibile con PMS esterno per questa struttura' : 'Aggiungi una nuova tipologia di camera'}>
            <button type="button" className="sib-btn sib-btn--primary" disabled={pmsEsterno} onClick={aggiungi}>
              <i className="fa-light fa-plus" /> Aggiungi tipologia
            </button>
          </Tooltip>
        } />

      <div className="invc__bar">
        <SelectField name="struttura" label="Struttura" className="invc__select" value={strutturaNome} onChange={(e) => setStrutturaNome(e.target.value)}
          options={strutture.map((s) => ({ value: s.nome, label: s.nome }))} />
      </div>

      {pmsEsterno && (
        <AlertBanner type="info">Questa struttura usa un PMS esterno: l'inventario arriva dal PMS e non è modificabile da qui.</AlertBanner>
      )}

      <section className="invc__panel">
        <header className="invc__panel-head">
          <h3 className="invc__panel-title">Tipologie inserite <span className="invc__panel-count">{draft.length}</span></h3>
          <span className={'invc__state' + (dirty ? ' invc__state--draft' : '')}>{dirty ? 'In bozza' : 'Salvato'}</span>
        </header>

        {draft.length === 0 ? (
          <div className="sib-empty">Nessuna tipologia: aggiungine una per iniziare.</div>
        ) : (
          <ul className="invc__list">
            {draft.map((t) => (
              <TipologiaRow key={t.id} t={t} disabled={pmsEsterno}
                aperta={aperta === t.id} evidenziata={modificata(t)} errore={errori.has(t.id)}
                dragging={dragId === t.id} over={overId === t.id && dragId !== t.id}
                onChange={(p) => update(t.id, p)}
                onToggleDettagli={() => setAperta((a) => (a === t.id ? null : t.id))}
                onScheda={() => setSchedaId(t.id)}
                onDuplica={() => duplica(t.id)}
                onElimina={() => elimina(t)}
                onDragStart={() => setDragId(t.id)}
                onDragEnter={() => { if (dragId) { setOverId(t.id); sposta(dragId, t.id) } }}
                onDragEnd={() => { setDragId(null); setOverId(null) }} />
            ))}
          </ul>
        )}

        <footer className="invc__panel-foot">
          <span className="invc__summary">{attive} tipologie attive · <strong>{camere}</strong> camere in vendita</span>
          <span className="invc__foot-acts">
            <button type="button" className="sib-btn sib-btn--secondary" disabled={!dirty} onClick={annulla}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--primary" disabled={!dirty || pmsEsterno} onClick={salvaTutto}>
              <i className="fa-light fa-floppy-disk" /> Salva
            </button>
          </span>
        </footer>
      </section>
    </div>
  )
}

// ─── Riga tipologia ───────────────────────────────────────────────────────────

interface RowProps {
  t: TipologiaCamera
  disabled: boolean
  aperta: boolean
  evidenziata: boolean
  errore: boolean
  dragging: boolean
  over: boolean
  onChange: (p: Partial<TipologiaCamera>) => void
  onToggleDettagli: () => void
  onScheda: () => void
  onDuplica: () => void
  onElimina: () => void
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
}

function TipologiaRow({ t, disabled, aperta, evidenziata, errore, dragging, over, onChange, onToggleDettagli, onScheda, onDuplica, onElimina, onDragStart, onDragEnter, onDragEnd }: RowProps) {
  // La riga è trascinabile solo partendo dalla maniglia, così i campi restano selezionabili.
  const [armata, setArmata] = useState(false)
  const totale = t.capacita + t.lettiExtra

  return (
    <li
      className={'invc__row' + (evidenziata ? ' invc__row--draft' : '') + (dragging ? ' invc__row--dragging' : '') + (over ? ' invc__row--over' : '') + (t.attiva ? '' : ' invc__row--off')}
      draggable={armata && !disabled}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={() => { setArmata(false); onDragEnd() }}
    >
      <Letti tipo={t.tipo} capacita={t.capacita} extra={t.lettiExtra} />

      <Tooltip text="Trascina per riordinare">
        <span className="invc__handle" onMouseDown={() => setArmata(true)} onMouseUp={() => setArmata(false)}>
          <i className="fa-solid fa-grip-dots-vertical" />
        </span>
      </Tooltip>

      <div className="invc__main">
        <div className="invc__fields">
          <InputField name={`nome-${t.id}`} label="Nome tipologia" placeholder="Es. Doppia con letto aggiunto" className="invc__f-nome"
            value={t.nome} disabled={disabled} error={errore ? 'Obbligatorio' : undefined} onChange={(e) => onChange({ nome: e.target.value })} />
          <SelectField name={`tipo-${t.id}`} label="Tipo" className="invc__f-tipo" value={t.tipo} disabled={disabled}
            options={TIPI.map((x) => ({ value: x, label: x }))} onChange={(e) => onChange({ tipo: e.target.value })} />
          <InputField name={`numero-${t.id}`} label="N. camere" type="number" min={0} className="invc__f-num" value={t.numero} disabled={disabled}
            onChange={(e) => onChange({ numero: Math.max(0, Number(e.target.value) || 0) })} />
          <SelectField name={`cap-${t.id}`} label="Capacità" className="invc__f-cap" value={t.capacita} disabled={disabled}
            options={Array.from({ length: MAX_CAPACITA }, (_, i) => ({ value: i + 1, label: ospiti(i + 1) }))}
            onChange={(e) => onChange({ capacita: Number(e.target.value) })} />
          <SelectField name={`extra-${t.id}`} label="Letti extra" className="invc__f-extra" value={t.lettiExtra} disabled={disabled}
            options={Array.from({ length: MAX_LETTI_EXTRA + 1 }, (_, i) => ({ value: i, label: i === 0 ? 'Nessuno' : String(i) }))}
            onChange={(e) => onChange({ lettiExtra: Number(e.target.value) })} />
        </div>

        <div className="invc__meta">
          <span className="invc__cap">
            <i className="fa-solid fa-user-group" /> Fino a <strong>{ospiti(totale)}</strong>{t.lettiExtra > 0 && ` (${t.capacita}+${t.lettiExtra})`}
          </span>
          {t.descrizione && !aperta && <span className="invc__desc">{t.descrizione}</span>}
          {!disabled && (
            <button type="button" className="invc__link" onClick={onToggleDettagli}>
              <i className={`fa-light ${aperta ? 'fa-chevron-up' : t.descrizione ? 'fa-pen-line' : 'fa-plus'}`} />
              {aperta ? 'Chiudi dettagli' : t.descrizione ? 'Modifica dettagli' : 'Aggiungi dettagli'}
            </button>
          )}
        </div>

        {aperta && (
          <div className="invc__details">
            <InputField name={`online-${t.id}`} label="Nome sui canali online" placeholder="Nome visibile ai clienti online"
              value={t.nomeOnline} onChange={(e) => onChange({ nomeOnline: e.target.value })} />
            <TextareaField name={`desc-${t.id}`} label="Descrizione" rows={2} placeholder="Comfort, vista, dotazioni…"
              value={t.descrizione} onChange={(e) => onChange({ descrizione: e.target.value })} />
          </div>
        )}
      </div>

      <div className="invc__acts">
        <Tooltip text={disabled ? 'Non modificabile con PMS esterno' : 'Scheda completa: caratteristiche e immagini'}>
          <button type="button" className="invc__edit" aria-label="Modifica scheda" disabled={disabled} onClick={onScheda}>
            <i className="fa-solid fa-pen" />
          </button>
        </Tooltip>
        <Tooltip text={t.attiva ? 'Disattiva tipologia' : 'Attiva tipologia'}>
          <label className="invc__active">
            <span>{t.attiva ? 'Attiva' : 'Inattiva'}</span>
            <ToggleSwitch checked={t.attiva} disabled={disabled} onChange={(v) => onChange({ attiva: v })} />
          </label>
        </Tooltip>
        <RowMenu disabled={disabled} onDuplica={onDuplica} onElimina={onElimina} />
      </div>
    </li>
  )
}

// Illustrazione della tipologia (con brandina se ci sono letti extra).
function Letti({ tipo, capacita, extra }: { tipo: string; capacita: number; extra: number }) {
  return (
    <div className="invc__beds">
      <Tooltip text={`${tipo} · ${ospiti(capacita)}${extra ? ` + ${extra} ${extra === 1 ? 'letto extra' : 'letti extra'}` : ''}`}>
        <RoomIllustration tipo={tipo} lettiExtra={extra} fill />
      </Tooltip>
    </div>
  )
}

function RowMenu({ disabled, onDuplica, onElimina }: { disabled: boolean; onDuplica: () => void; onElimina: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="invc__menu-wrap" ref={ref}>
      <Tooltip text="Altre azioni">
        <button type="button" className="invc__kebab" aria-label="Altre azioni" aria-expanded={open} disabled={disabled} onClick={() => setOpen((v) => !v)}>
          <i className="fa-solid fa-ellipsis-vertical" />
        </button>
      </Tooltip>
      {open && (
        <div className="invc__menu" role="menu">
          <button type="button" role="menuitem" className="invc__menu-item" onClick={() => { setOpen(false); onDuplica() }}>
            <i className="fa-light fa-copy" /> Duplica
          </button>
          <button type="button" role="menuitem" className="invc__menu-item invc__menu-item--danger" onClick={() => { setOpen(false); onElimina() }}>
            <i className="fa-light fa-trash-can" /> Elimina
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Scheda completa della tipologia ──────────────────────────────────────────

function SchedaTipologia({ tipologia, onBack, onApply }: { tipologia: TipologiaCamera; onBack: () => void; onApply: (t: TipologiaCamera) => void }) {
  const [nomeOnline, setNomeOnline] = useState(tipologia.nomeOnline)
  const [amenities, setAmenities] = useState<string[]>(tipologia.amenities)
  const [descrizione, setDescrizione] = useState(tipologia.descrizione)
  const [main, setMain] = useState<string | null>(tipologia.immagine)
  const [gallery, setGallery] = useState<string[]>(tipologia.gallery)

  const toggleAmenity = (a: string) => setAmenities((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))
  const pickMain = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setMain(URL.createObjectURL(f)); e.target.value = '' }
  const addGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) setGallery((p) => [...p, ...files.map((f) => URL.createObjectURL(f))].slice(0, MAX_GALLERY))
    e.target.value = ''
  }

  return (
    <div className="invc-form">
      <PageHead title={tipologia.nome || 'Nuova tipologia'} subtitle="Caratteristiche, descrizione e immagini della tipologia" onBack={onBack} />

      <section className="invc-form__card">
        <div className="invc-form__card-head"><span><i className="fa-light fa-bed" /> Presentazione</span></div>
        <div className="invc-form__grid-2">
          <InputField name="nomeOnline" label="Nome sui canali online" placeholder="Nome visibile ai clienti online" value={nomeOnline} onChange={(e) => setNomeOnline(e.target.value)} />
          <TextareaField name="descrizione" label="Descrizione" rows={3} placeholder="Comfort, vista, dotazioni…" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
        </div>
      </section>

      <section className="invc-form__card">
        <div className="invc-form__card-head">
          <span><i className="fa-light fa-list-check" /> Caratteristiche</span>
          <span className="invc-form__sel-count">{amenities.length} selezionate</span>
        </div>
        <div className="invc-form__amenities">
          {AMENITIES.map((a) => {
            const on = amenities.includes(a)
            return (
              <button key={a} type="button" className={'invc-form__amenity' + (on ? ' is-on' : '')} onClick={() => toggleAmenity(a)}>
                <span className="invc-form__amenity-check"><i className={`fa-${on ? 'solid fa-circle-check' : 'light fa-circle'}`} /></span>{a}
              </button>
            )
          })}
        </div>
      </section>

      <section className="invc-form__card">
        <div className="invc-form__card-head"><span><i className="fa-light fa-images" /> Immagine principale & gallery</span></div>
        <p className="invc-form__hint">L'immagine principale compare sui canali online; le altre formano la galleria.</p>
        <div className="invc-form__media">
          <div>
            <div className="invc-form__media-label">Immagine principale</div>
            <ImageDropzone value={main} onPick={pickMain} onClear={() => setMain(null)} />
          </div>
          <div>
            <div className="invc-form__media-label">Altre immagini <span className="invc-form__muted">(max {MAX_GALLERY})</span></div>
            <GalleryGrid images={gallery} max={MAX_GALLERY} onAdd={addGallery} onRemove={(i) => setGallery((p) => p.filter((_, idx) => idx !== i))} />
          </div>
        </div>
      </section>

      <div className="invc-form__actions">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onBack}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary"
          onClick={() => onApply({ ...tipologia, nomeOnline, amenities, descrizione, immagine: main, gallery })}>
          <i className="fa-light fa-check" /> Applica
        </button>
      </div>
    </div>
  )
}

// ─── Dropzone + Gallery ───────────────────────────────────────────────────────

function ImageDropzone({ value, onPick, onClear }: { value: string | null; onPick: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  if (value) {
    return (
      <div className="invc-form__dz invc-form__dz--filled">
        <img src={value} alt="Anteprima" />
        <span className="invc-form__dz-acts">
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => ref.current?.click()}><i className="fa-light fa-arrows-rotate" /> Sostituisci</button>
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={onClear}><i className="fa-light fa-trash-can" /> Rimuovi</button>
        </span>
        <input ref={ref} type="file" accept="image/*" hidden onChange={onPick} />
      </div>
    )
  }
  return (
    <button type="button" className="invc-form__dz" onClick={() => ref.current?.click()}>
      <i className="fa-light fa-cloud-arrow-up" />
      <span className="invc-form__dz-title">Trascina o seleziona un file</span>
      <span className="invc-form__dz-hint">JPG, PNG, WEBP</span>
      <input ref={ref} type="file" accept="image/*" hidden onChange={onPick} />
    </button>
  )
}

function GalleryGrid({ images, max, onAdd, onRemove }: { images: string[]; max: number; onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove: (i: number) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="invc-form__gallery">
      {images.map((src, i) => (
        <div key={i} className="invc-form__gallery-item">
          <img src={src} alt={`Immagine ${i + 1}`} />
          <button type="button" className="invc-form__gallery-rm" aria-label="Rimuovi" onClick={() => onRemove(i)}><i className="fa-solid fa-xmark" /></button>
        </div>
      ))}
      {images.length < max && (
        <button type="button" className="invc-form__gallery-add" onClick={() => ref.current?.click()}>
          <i className="fa-light fa-circle-plus" /><span>Aggiungi</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={onAdd} />
    </div>
  )
}
