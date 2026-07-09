import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import ToggleSwitch from '../../../core/components/ToggleSwitch'
import Pagination from '../../../core/components/Pagination'
import { InputField, SelectField, TextareaField, CheckboxField } from '../../../core/components/form'
import './InventarioCamere.sass'

type RoomKind = 'camera' | 'meeting' | 'dus' | 'oof'

interface Room {
  id: string
  numero?: string
  nome: string
  tipologia: string
  struttura: string
  piano: string
  postiBase: number
  postiAggiuntivi: number
  descrizione?: string
  tipologiaOnline?: string
  amenities?: string[]
  immaginePrincipale?: string | null
  gallery?: string[]
  enabled: boolean
  kind: RoomKind
}

interface Struttura { nome: string; pms: boolean }
const STRUTTURE: Struttura[] = [
  { nome: 'Hotel California', pms: false },
  { nome: "Grim's Hotel", pms: false },
  { nome: 'Hotel Floridia', pms: true },
]
const PIANI = ['Piano terra', 'Primo piano', 'Secondo piano', 'Terzo piano']
const TIPOLOGIE = ['Singola Classic', 'Doppia Classic', 'Tripla Classic', 'Quadrupla', 'Matrimoniale Deluxe', 'Suite', 'DUS', 'Sala']

const AMENITIES = [
  'Aria condizionata', 'Balcone', 'Vasca', 'TV a schermo piatto', 'Terrazza', 'Bollitore elettrico', 'Armadio o guardaroba', 'Riscaldamento',
  'Cassaforte', 'Insonorizzazione', 'Scrivania', 'Presa elettrica vicino al letto', 'Bagno privato', 'Bagno in comune', 'Bidet', 'Accappatoio',
  'Prodotti da bagno in omaggio', 'Asciugacapelli', 'Pantofole', 'Vino/champagne', 'Asciugamani', 'Accesso disabili', 'Dep. bagagli', 'Colazione', 'Reception h24',
]
const POSTI: Record<string, [number, number]> = {
  'Singola Classic': [1, 0], 'Doppia Classic': [2, 1], 'Tripla Classic': [3, 1], 'Quadrupla': [4, 1],
  'Matrimoniale Deluxe': [2, 1], 'Suite': [2, 2], 'DUS': [1, 0], 'Sala': [0, 0],
}

const PAGE_SIZE = 12
const MAX_GALLERY = 6

// ─── Immagine "blueprint" della camera (SVG inline, tinta per tipologia) ──────
const GRAD: Record<string, [string, string]> = {
  'Singola Classic': ['#3b6ea5', '#28456b'], 'Doppia Classic': ['#2f8f86', '#1f5e58'], 'Tripla Classic': ['#5b6bb0', '#363f78'],
  'Quadrupla': ['#b08a2f', '#7a5e1f'], 'Matrimoniale Deluxe': ['#b08a2f', '#7a5e1f'], 'Suite': ['#b08a2f', '#6b4f1a'],
  'DUS': ['#8a6bb0', '#553f78'], 'Sala': ['#2f8f86', '#1f5e58'],
}
const KIND_GRAD: Record<RoomKind, [string, string]> = {
  camera: ['#3b6ea5', '#28456b'], meeting: ['#2f8f86', '#1f5e58'], dus: ['#8a6bb0', '#553f78'], oof: ['#9a5a5a', '#6b3a3a'],
}
function roomImg(room: Room): string {
  const [a1, a2] = GRAD[room.tipologia] ?? KIND_GRAD[room.kind] // a1 = accento, a2 = accento scuro
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='380' viewBox='0 0 600 380'>` +
    `<defs>` +
    `<linearGradient id='wall' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#f6f9fd'/><stop offset='1' stop-color='#e7eef7'/></linearGradient>` +
    `<linearGradient id='duvet' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#ffffff'/><stop offset='1' stop-color='#eef2f8'/></linearGradient>` +
    `</defs>` +
    `<rect width='600' height='380' fill='url(#wall)'/>` +
    `<rect x='0' y='300' width='600' height='80' fill='#ece0cd'/>` +
    `<rect x='0' y='300' width='600' height='5' fill='#d8c3a5'/>` +
    `<ellipse cx='300' cy='344' rx='225' ry='22' fill='${a1}' opacity='0.13'/>` +
    // finestra con luce
    `<rect x='40' y='66' width='118' height='150' rx='6' fill='#ffffff' stroke='${a2}' stroke-width='3'/>` +
    `<rect x='48' y='74' width='102' height='134' rx='3' fill='#dcefff'/>` +
    `<circle cx='128' cy='100' r='15' fill='#ffe7a3'/>` +
    `<line x1='99' y1='74' x2='99' y2='208' stroke='${a2}' stroke-width='3'/><line x1='48' y1='141' x2='150' y2='141' stroke='${a2}' stroke-width='3'/>` +
    // quadro
    `<rect x='252' y='78' width='92' height='66' rx='4' fill='#ffffff' stroke='${a2}' stroke-width='3'/>` +
    `<path d='M264 134 L286 106 L300 122 L318 98 L332 134 Z' fill='${a1}' opacity='0.45'/>` +
    // pianta
    `<path d='M86 270 C66 234 58 256 78 270 M86 270 C106 230 120 254 96 270 M86 270 C86 224 86 246 86 270' fill='none' stroke='#6fa37a' stroke-width='7' stroke-linecap='round'/>` +
    `<path d='M70 268 h32 l-5 42 h-22 Z' fill='#c98a5a'/>` +
    // letto
    `<rect x='150' y='150' width='270' height='66' rx='12' fill='${a1}'/>` +
    `<rect x='140' y='250' width='292' height='58' rx='10' fill='${a2}'/>` +
    `<rect x='150' y='206' width='272' height='58' rx='16' fill='url(#duvet)'/>` +
    `<rect x='150' y='244' width='272' height='22' rx='10' fill='${a1}' opacity='0.5'/>` +
    `<rect x='166' y='196' width='112' height='42' rx='15' fill='#ffffff' stroke='${a1}' stroke-width='2.5'/>` +
    `<rect x='292' y='196' width='112' height='42' rx='15' fill='#ffffff' stroke='${a1}' stroke-width='2.5'/>` +
    // comodino + lampada
    `<rect x='446' y='244' width='54' height='64' rx='6' fill='#d8c3a5'/>` +
    `<rect x='466' y='206' width='14' height='40' fill='${a2}'/>` +
    `<path d='M456 206 L490 206 L482 184 L464 184 Z' fill='${a1}'/>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// ─── MOCK ─────────────────────────────────────────────────────────────────────
function makeMock(): Room[] {
  type D = [string | undefined, string, string, RoomKind, string]
  const def: D[] = [
    ['001', 'Palermo', 'Singola Classic', 'camera', 'Primo piano'],
    ['002', 'Trapani', 'Singola Classic', 'camera', 'Primo piano'],
    ['003', 'Cefalù', 'Singola Classic', 'camera', 'Primo piano'],
    ['004', 'Agrigento', 'Doppia Classic', 'camera', 'Primo piano'],
    ['005', 'Messina', 'Doppia Classic', 'camera', 'Secondo piano'],
    ['006', 'Isnello', 'Doppia Classic', 'camera', 'Secondo piano'],
    ['007', 'Tripla Classic', 'Tripla Classic', 'camera', 'Secondo piano'],
    ['008', 'Tripla Classic', 'Tripla Classic', 'camera', 'Secondo piano'],
    ['009', 'Etna', 'Quadrupla', 'camera', 'Terzo piano'],
    ['010', 'Vulcano', 'Suite', 'camera', 'Terzo piano'],
    ['011', 'Stromboli', 'DUS', 'dus', 'Terzo piano'],
    [undefined, 'Sala Meeting', 'Sala', 'meeting', 'Piano terra'],
    ['013', 'Lipari', 'Doppia Classic', 'oof', 'Secondo piano'],
    ['014', 'Salina', 'Doppia Classic', 'camera', 'Secondo piano'],
  ]
  return def.map(([numero, nome, tip, kind, piano], i) => ({
    id: `r${i + 1}`, numero, nome, tipologia: tip, struttura: 'Hotel California', piano,
    postiBase: (POSTI[tip] ?? [1, 0])[0], postiAggiuntivi: (POSTI[tip] ?? [1, 0])[1],
    enabled: kind !== 'oof' && kind !== 'dus', kind,
  }))
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function InventarioCamere(_props: { navigate?: (p: string) => void } = {}) {
  const [strutturaNome, setStrutturaNome] = useState(STRUTTURE[0].nome)
  const [piano, setPiano] = useState('')
  const [tipologia, setTipologia] = useState('')
  const [rooms, setRooms] = useState<Room[]>(makeMock())
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'grid' | 'form'>('grid')
  const [editing, setEditing] = useState<Room | null>(null)

  const pmsEsterno = STRUTTURE.find((s) => s.nome === strutturaNome)?.pms ?? false

  const filtered = useMemo(() => rooms.filter((r) => {
    if (r.struttura !== strutturaNome) return false
    if (piano && r.piano !== piano) return false
    if (tipologia && r.tipologia !== tipologia) return false
    return true
  }), [rooms, strutturaNome, piano, tipologia])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [strutturaNome, piano, tipologia])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE)
  const attive = filtered.filter((r) => r.enabled).length

  const toggleRoom = (id: string) => setRooms((rs) => rs.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)))
  const saveCamera = (upd: Room) => { setRooms((rs) => rs.map((r) => (r.id === upd.id ? upd : r))); setEditing(null) }

  if (view === 'form') {
    return <AllestisciPage onBack={() => setView('grid')} onSave={() => setView('grid')} />
  }

  return (
    <div className="invc">
      <PageHead title="Inventario camere" subtitle="Gestione completa delle tipologie e configurazione delle camere" />

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="invc__bar">
        <div className="invc__filters">
          <div className="invc__field">
            <SelectField name="struttura" label="Struttura" className="invc__select" value={strutturaNome} onChange={(e) => setStrutturaNome(e.target.value)}
              options={STRUTTURE.map((s) => ({ value: s.nome, label: s.pms ? `${s.nome} · PMS esterno` : s.nome }))} />
          </div>
          <div className="invc__field">
            <SelectField name="piano" label="Piano" className="invc__select" value={piano} onChange={(e) => setPiano(e.target.value)}
              options={[{ value: '', label: 'Tutti' }, ...PIANI.map((p) => ({ value: p, label: p }))]} />
          </div>
          <div className="invc__field">
            <SelectField name="tipologia" label="Tipologia camera" className="invc__select" value={tipologia} onChange={(e) => setTipologia(e.target.value)}
              options={[{ value: '', label: 'Tutte' }, ...TIPOLOGIE.map((t) => ({ value: t, label: t }))]} />
          </div>
        </div>
        <Tooltip text={pmsEsterno ? 'Allestimento disabilitato con PMS esterno per questa struttura' : 'Allestisci una tipologia camera'}>
          <button type="button" className="sib-btn sib-btn--primary invc__allestisci" disabled={pmsEsterno} onClick={() => setView('form')}>
            <i className="fa-light fa-wand-magic-sparkles" /> Allestisci tipologia
          </button>
        </Tooltip>
      </div>

      {/* ─── Griglia camere ────────────────────────────────────────────────── */}
      {pageRows.length === 0 ? (
        <div className="sib-empty">Nessuna camera trovata per i filtri selezionati.</div>
      ) : (
        <div className="invc__grid">
          {pageRows.map((r) => (
            <RoomCard key={r.id} room={r} pmsEsterno={pmsEsterno} onEdit={() => setEditing(r)} onToggle={() => toggleRoom(r.id)} />
          ))}
        </div>
      )}

      <div className="invc__footer">
        <span className="invc__count">{filtered.length} camere · <strong>{attive}</strong> attive</span>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <ModificaCameraModal room={editing} onClose={() => setEditing(null)} onSave={saveCamera} />
    </div>
  )
}

// ─── Card camera ──────────────────────────────────────────────────────────────

function RoomCard({ room, pmsEsterno, onEdit, onToggle }: { room: Room; pmsEsterno: boolean; onEdit: () => void; onToggle: () => void }) {
  const stato = room.kind === 'oof' ? { label: 'Out of order', cls: 'oof' }
    : room.kind === 'meeting' ? { label: 'Sala', cls: 'meeting' }
    : room.kind === 'dus' ? { label: 'DUS', cls: 'dus' }
    : room.enabled ? { label: 'Attiva', cls: 'on' } : { label: 'Disattivata', cls: 'off' }

  return (
    <article className={'invc__card' + (room.enabled ? '' : ' invc__card--off')}>
      <div className="invc__media">
        <img src={roomImg(room)} alt={room.tipologia} />
        <span className={`invc__status invc__status--${stato.cls}`}>{stato.label}</span>
        <div className="invc__media-top">
          <h4 className="invc__card-title">{room.nome}</h4>
          <span className="invc__card-tip">{room.tipologia}</span>
          <span className="invc__card-struct">{room.struttura} · {room.piano}</span>
        </div>
        <div className="invc__media-foot">
          {room.numero && <Tooltip text="Numero camera"><span className="invc__num">{room.numero}</span></Tooltip>}
          <span className="invc__actions">
            <Tooltip text={pmsEsterno ? 'Modifica disabilitata con PMS esterno per questa struttura' : 'Modifica camera'}>
              <button type="button" className="invc__act" aria-label="Modifica" disabled={pmsEsterno} onClick={onEdit}><i className="fa-light fa-pen" /></button>
            </Tooltip>
            <Tooltip text={pmsEsterno ? 'Non modificabile con PMS esterno per questa struttura' : room.enabled ? 'Disattiva camera' : 'Attiva camera'}>
              <span className="invc__toggle"><ToggleSwitch checked={room.enabled} disabled={pmsEsterno} onChange={onToggle} /></span>
            </Tooltip>
          </span>
        </div>
      </div>
    </article>
  )
}

// ─── Modal "Modifica camera" ──────────────────────────────────────────────────

function ModificaCameraModal({ room, onClose, onSave }: { room: Room | null; onClose: () => void; onSave: (r: Room) => void }) {
  const [numero, setNumero] = useState('')
  const [nome, setNome] = useState('')
  const [postiBase, setPostiBase] = useState('1')
  const [postiAgg, setPostiAgg] = useState('0')
  const [disponibile, setDisponibile] = useState(true)
  const [amenities, setAmenities] = useState<string[]>([])

  useEffect(() => {
    if (!room) return
    setNumero(room.numero ?? '')
    setNome(room.nome)
    setPostiBase(String(room.postiBase))
    setPostiAgg(String(room.postiAggiuntivi))
    setDisponibile(room.enabled)
    setAmenities(room.amenities ?? [])
  }, [room])

  const toggle = (a: string) => setAmenities((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))

  return (
    <Modal open={!!room} onClose={onClose} title="Modifica camera" size="xl">
      {room && (
        <div className="invc-mod">
          <div className="invc-mod__grid">
            <InputField name="numero" label="Numero camera" value={numero} onChange={(e) => setNumero(e.target.value)} />
            <InputField name="nome" label="Nome camera" value={nome} onChange={(e) => setNome(e.target.value)} />
            <InputField name="postiBase" label="Posti base" type="number" value={postiBase} onChange={(e) => setPostiBase(e.target.value)} />
            <InputField name="postiAgg" label="Posti aggiuntivi" type="number" value={postiAgg} onChange={(e) => setPostiAgg(e.target.value)} />
            <div className="invc-mod__disp">
              <CheckboxField name="disponibile" label="Disponibile" checked={disponibile} onChange={(e) => setDisponibile(e.target.checked)} />
            </div>
          </div>

          <div className="invc-mod__sec-title"><i className="fa-light fa-list-check" /> Caratteristiche <span className="invc-mod__count">{amenities.length}</span></div>
          <div className="invc-mod__amenities">
            {AMENITIES.map((a) => {
              const on = amenities.includes(a)
              return (
                <button key={a} type="button" className={'invc-mod__amenity' + (on ? ' is-on' : '')} onClick={() => toggle(a)}>
                  <i className={`fa-${on ? 'solid fa-square-check' : 'light fa-square'}`} /> {a}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="invc-mod__foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => room && onSave({ ...room, numero, nome, postiBase: Number(postiBase) || 0, postiAggiuntivi: Number(postiAgg) || 0, enabled: disponibile, amenities })}>Salva</button>
      </div>
    </Modal>
  )
}

// ─── Pagina "Allestisci tipologia camera" ─────────────────────────────────────

function AllestisciPage({ onBack, onSave }: { onBack: () => void; onSave: () => void }) {
  const [tipologia, setTipologia] = useState('Singola Classic')
  const [tipologiaOL, setTipologiaOL] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [descrizione, setDescrizione] = useState('')
  const [main, setMain] = useState<string | null>(null)
  const [gallery, setGallery] = useState<string[]>([])

  const toggleAmenity = (a: string) => setAmenities((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))
  const pickMain = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setMain(URL.createObjectURL(f)); e.target.value = '' }
  const addGallery = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length) setGallery((p) => [...p, ...files.map((f) => URL.createObjectURL(f))].slice(0, MAX_GALLERY))
    e.target.value = ''
  }

  return (
    <div className="invc-form">
      <PageHead title="Allestisci tipologia camera" subtitle="Configura tipologia, caratteristiche, descrizione e immagini" onBack={onBack} />

      <section className="invc-form__card">
        <div className="invc-form__card-head"><i className="fa-light fa-bed" /> Tipologia</div>
        <div className="invc-form__grid-2">
          <SelectField name="tipologia" label="Tipologia camera" value={tipologia} onChange={(e) => setTipologia(e.target.value)}
            options={TIPOLOGIE.map((t) => ({ value: t, label: t }))} />
          <InputField name="tipologiaOL" label="Tipologia camera on line" placeholder="Nome visibile ai clienti online" value={tipologiaOL} onChange={(e) => setTipologiaOL(e.target.value)} />
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
        <div className="invc-form__card-head"><i className="fa-light fa-align-left" /> Breve descrizione</div>
        <TextareaField name="descrizione" rows={4} placeholder="Descrivi la camera: comfort, vista, dotazioni…" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
      </section>

      <section className="invc-form__card">
        <div className="invc-form__card-head"><i className="fa-light fa-images" /> Immagine principale & gallery</div>
        <p className="invc-form__hint">Carica l'immagine principale (anteprima in griglia e sui canali online) e altre immagini per la galleria.</p>
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
        <button type="button" className="sib-btn sib-btn--primary" onClick={onSave}><i className="fa-light fa-floppy-disk" /> Salva</button>
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
