import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import FilterToolbar from '../../../core/components/FilterToolbar'
import Tooltip from '../../../core/components/Tooltip'
import ToggleSwitch from '../../../core/components/ToggleSwitch'
import Pagination from '../../../core/components/Pagination'
import FormGrid from '../../../core/components/FormGrid'
import FormActions from '../../../core/components/FormActions'
import Tabs from '../../../core/components/Tabs'
import { InputField, SelectField, TextareaField } from '../../../core/components/form'
import './InventarioCamere.sass'

type RoomKind = 'camera' | 'meeting' | 'dus' | 'oof'

interface Room {
  id: string
  numero?: string
  titolo: string
  sottotitolo: string
  struttura: string
  piano: string
  tipologia: string
  tipologiaOnline?: string
  descrizione?: string
  immaginePrincipale?: string | null
  gallery?: string[]
  enabled: boolean
  kind: RoomKind
}

interface Struttura {
  id: string
  nome: string
  pmsEsterno: boolean
}

const STRUTTURE: Struttura[] = [
  { id: 'sir', nome: 'Hotel Siracusa', pmsEsterno: false },
  { id: 'flo', nome: 'Hotel Floridia', pmsEsterno: true  },
  { id: 'lux', nome: 'Hotel Lux',      pmsEsterno: false },
  { id: 'lzo', nome: 'Hotel Lazio',    pmsEsterno: false },
]

const PIANI = ['Piano terra', 'Primo piano', 'Secondo piano', 'Terzo piano']

const TIPOLOGIE = [
  'Singola Classic',
  'Doppia Classic',
  'Doppia Economy',
  'Doppia convertibile in Tripla',
  'Doppia convertibile in Quadrupla',
  'Tripla Classic',
  'Suite',
  'DUS',
  'Sala',
]

const PAGE_SIZE = 21
const MAX_GALLERY = 5

function makeMock(): Room[] {
  const base: Omit<Room, 'id'>[] = [
    { numero: undefined, titolo: 'Sala Meeting SIR',           sottotitolo: '()',                                 struttura: 'Hotel Siracusa', piano: 'Piano terra',   tipologia: 'Sala',                              enabled: true,  kind: 'meeting' },
    { numero: undefined, titolo: 'Doppia Uso Singola',         sottotitolo: '(DUS)',                              struttura: 'Hotel Siracusa', piano: 'Primo piano',   tipologia: 'DUS',                               enabled: false, kind: 'dus' },
    { numero: '201',     titolo: 'XX - V*media*Int',           sottotitolo: '(Doppia convertibile in Tripla)',    struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Doppia convertibile in Tripla',     enabled: true,  kind: 'camera' },
    { numero: '202',     titolo: 'XX - V*grande*Int',          sottotitolo: '(Doppia convertibile in Tripla)',    struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Doppia convertibile in Tripla',     enabled: true,  kind: 'camera' },
    { numero: '203',     titolo: 'XX - V*grande*Int',          sottotitolo: '(Tripla Classic)',                   struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Tripla Classic',                    enabled: true,  kind: 'camera' },
    { numero: '204',     titolo: 'XX - V*grande*Marghera',     sottotitolo: '(Tripla Classic)',                   struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Tripla Classic',                    enabled: true,  kind: 'camera' },
    { numero: '205',     titolo: 'XX - V*Marsala/Marghera',    sottotitolo: '(Doppia Classic)',                   struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Doppia Classic',                    enabled: true,  kind: 'camera' },
    { numero: '206',     titolo: 'XX - V*grande*Marsala/Marghera', sottotitolo: '(Doppia Classic)',               struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Doppia Classic',                    enabled: true,  kind: 'camera' },
    { numero: '207',     titolo: 'XX - V*grande*Marghera',     sottotitolo: '(Doppia Classic)',                   struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Doppia Classic',                    enabled: true,  kind: 'camera' },
    { numero: '208',     titolo: 'XX - V*grande*Marghera',     sottotitolo: '(Doppia convertibile in Tripla)',    struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Doppia convertibile in Tripla',     enabled: true,  kind: 'camera' },
    { numero: '209',     titolo: 'XX - V*grande*Marghera',     sottotitolo: '(Doppia convertibile in Quadrupla)', struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Doppia convertibile in Quadrupla',  enabled: true,  kind: 'camera' },
    { numero: '210',     titolo: 'OUT OF ORDER',               sottotitolo: '(Doppia convertibile in Quadrupla)', struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Doppia convertibile in Quadrupla',  enabled: false, kind: 'oof' },
    { numero: '211',     titolo: 'OUT OF ORDER',               sottotitolo: '(Doppia convertibile in Quadrupla)', struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Doppia convertibile in Quadrupla',  enabled: false, kind: 'oof' },
    { numero: '212',     titolo: 'MAT - V*media*Marsala',      sottotitolo: '(Doppia convertibile in Tripla)',    struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Doppia convertibile in Tripla',     enabled: true,  kind: 'camera' },
    { numero: '213',     titolo: 'SGL - D*piccola*Marsala',    sottotitolo: '(Singola Classic)',                  struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Singola Classic',                   enabled: true,  kind: 'camera' },
    { numero: '214',     titolo: 'SGL - D*piccola*Marsala',    sottotitolo: '(Singola Classic)',                  struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'Singola Classic',                   enabled: true,  kind: 'camera' },
    { numero: '215',     titolo: 'FR - D*B*piccola*Marsala',   sottotitolo: '(DUS)',                              struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'DUS',                               enabled: true,  kind: 'camera' },
    { numero: '216',     titolo: 'FR - D*piccola*Marsala',     sottotitolo: '(DUS)',                              struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'DUS',                               enabled: true,  kind: 'camera' },
    { numero: '217',     titolo: 'FR - D*piccola*Marsala',     sottotitolo: '(DUS)',                              struttura: 'Hotel Siracusa', piano: 'Secondo piano', tipologia: 'DUS',                               enabled: true,  kind: 'camera' },
    { numero: '218',     titolo: 'XX - V*piccola*Marsala',     sottotitolo: '(Doppia Economy)',                   struttura: 'Hotel Siracusa', piano: 'Terzo piano',   tipologia: 'Doppia Economy',                    enabled: true,  kind: 'camera' },
    { numero: '219',     titolo: 'XX - V*piccola*Marsala',     sottotitolo: '(Doppia Economy)',                   struttura: 'Hotel Siracusa', piano: 'Terzo piano',   tipologia: 'Doppia Economy',                    enabled: true,  kind: 'camera' },
    { numero: '220',     titolo: 'XX - V*piccola*Marsala',     sottotitolo: '(Doppia Economy)',                   struttura: 'Hotel Siracusa', piano: 'Terzo piano',   tipologia: 'Doppia Economy',                    enabled: true,  kind: 'camera' },
    { numero: '301',     titolo: 'XX - Suite Etna',            sottotitolo: '(Suite)',                            struttura: 'Hotel Siracusa', piano: 'Terzo piano',   tipologia: 'Suite',                             enabled: true,  kind: 'camera' },
    { numero: '302',     titolo: 'XX - Suite Vulcano',         sottotitolo: '(Suite)',                            struttura: 'Hotel Siracusa', piano: 'Terzo piano',   tipologia: 'Suite',                             enabled: true,  kind: 'camera' },
  ]
  return base.map((b, i) => ({ ...b, id: `r${i + 1}` }))
}

export default function InventarioCamere({ navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState(STRUTTURE[0].id)
  const [piano, setPiano] = useState('')
  const [tipologia, setTipologia] = useState('')
  const [rooms, setRooms] = useState<Room[]>(makeMock())
  const [page, setPage] = useState(1)

  const [drawerMode, setDrawerMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const struttura = STRUTTURE.find(s => s.id === strutturaId)!
  const pmsEsterno = struttura.pmsEsterno

  const filtered = useMemo(() => {
    return rooms.filter(r => {
      if (r.struttura !== struttura.nome) return false
      if (piano && r.piano !== piano) return false
      if (tipologia && r.tipologia !== tipologia) return false
      return true
    })
  }, [rooms, struttura.nome, piano, tipologia])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [strutturaId, piano, tipologia])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const filteredPage = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  function toggleRoom(id: string) {
    setRooms(rs => rs.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  function openCreate() {
    setEditingRoom(null)
    setDrawerMode('create')
  }
  function openEdit(r: Room) {
    setEditingRoom(r)
    setDrawerMode('edit')
  }
  function closeDrawer() {
    setDrawerMode('closed')
    setEditingRoom(null)
  }

  return (
    <div className="inv-camere">
      <BtnBack />
      <PageHeader
        title="Inventario Camere"
        subtitle="Visualizza e gestisci l'allestimento delle camere"
      />

      <FilterToolbar
        actions={
          <Tooltip text={pmsEsterno ? 'Allestimento disabilitato con PMS esterno per questa struttura' : 'Allestisci nuova tipologia camera'}>
            <button
              type="button"
              className="sib-btn sib-btn--primary"
              disabled={pmsEsterno}
              onClick={openCreate}
            >
              <i className="fa-light fa-pen-to-square" aria-hidden="true" />
              Allestisci
            </button>
          </Tooltip>
        }
      >
        <SelectField
          name="struttura" label="Struttura"
          value={strutturaId}
          onChange={e => setStrutturaId(e.target.value)}
          options={STRUTTURE.map(s => ({ value: s.id, label: s.nome }))}
        />
        <SelectField
          name="piano" label="Piano"
          value={piano}
          onChange={e => setPiano(e.target.value)}
          options={[{ value: '', label: 'Tutti' }, ...PIANI.map(p => ({ value: p, label: p }))]}
        />
        <SelectField
          name="tipologia" label="Tipologia camera"
          value={tipologia}
          onChange={e => setTipologia(e.target.value)}
          options={[{ value: '', label: 'Tutte' }, ...TIPOLOGIE.map(t => ({ value: t, label: t }))]}
        />
      </FilterToolbar>

      {filteredPage.length === 0 ? (
        <div className="sib-empty-state">Nessuna camera trovata per i filtri selezionati.</div>
      ) : (
        <div className="inv-camere__grid">
          {filteredPage.map(r => (
            <RoomCard
              key={r.id}
              room={r}
              pmsEsterno={pmsEsterno}
              onEdit={() => openEdit(r)}
              onToggle={() => toggleRoom(r.id)}
            />
          ))}
        </div>
      )}

      <div className="inv-camere__pagination">
        <span className="inv-camere__pagination-info">
          {filtered.length > 0
            ? `Risultati ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, filtered.length)} di ${filtered.length}`
            : '0 risultati'}
        </span>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {drawerMode !== 'closed' && (
        <AllestisciDrawer
          mode={drawerMode}
          initial={editingRoom}
          onClose={closeDrawer}
          onSave={() => closeDrawer()}
        />
      )}
    </div>
  )
}

// ─── Card camera ──────────────────────────────────────────────────────
function RoomCard({
  room, pmsEsterno, onEdit, onToggle,
}: {
  room: Room
  pmsEsterno: boolean
  onEdit: () => void
  onToggle: () => void
}) {
  const isOOF     = room.kind === 'oof'
  const isMeeting = room.kind === 'meeting'
  const isDus     = room.kind === 'dus'
  const editTip = pmsEsterno
    ? 'Modifica disabilitata con PMS esterno per questa struttura'
    : 'Modifica camera'

  const cardCls = [
    'inv-camere__card',
    isOOF     ? 'inv-camere__card--oof'     : '',
    isMeeting ? 'inv-camere__card--meeting' : '',
    isDus     ? 'inv-camere__card--dus'     : '',
    !room.enabled ? 'inv-camere__card--off' : '',
  ].filter(Boolean).join(' ')

  return (
    <article className={cardCls}>
      <header className="inv-camere__card-head">
        <h4 className="inv-camere__card-title">{room.titolo}</h4>
        <p className="inv-camere__card-sub">{room.sottotitolo}</p>
        <p className="inv-camere__card-struct">{room.struttura}</p>
      </header>

      <div className="inv-camere__card-img" aria-hidden="true">
        <RoomPreview kind={room.kind} />
      </div>

      <footer className="inv-camere__card-foot">
        {room.numero && (
          <Tooltip text="Numero camera">
            <span className="inv-camere__num">{room.numero}</span>
          </Tooltip>
        )}
        <span className="inv-camere__card-actions">
          <Tooltip text={editTip}>
            <button
              type="button"
              className="sib-btn sib-btn--icon"
              disabled={pmsEsterno}
              onClick={onEdit}
              aria-label="Modifica camera"
            >
              <i className="fa-light fa-pen-to-square" aria-hidden="true" />
            </button>
          </Tooltip>
          <ToggleSwitch checked={room.enabled} onChange={onToggle} />
        </span>
      </footer>
    </article>
  )
}

function RoomPreview({ kind }: { kind: RoomKind }) {
  const icon =
    kind === 'meeting' ? 'fa-people-arrows' :
    kind === 'dus'     ? 'fa-bed-front' :
    kind === 'oof'     ? 'fa-triangle-exclamation' :
                         'fa-bed'
  return (
    <div className="inv-camere__preview">
      <i className={`fa-light ${icon}`} aria-hidden="true" />
    </div>
  )
}

// ─── Drawer "Allestisci tipologia camera" ─────────────────────────────
function AllestisciDrawer({
  mode, initial, onClose, onSave,
}: {
  mode: 'create' | 'edit'
  initial: Room | null
  onClose: () => void
  onSave: () => void
}) {
  const [tab, setTab] = useState<'anagrafica' | 'media'>('anagrafica')
  const [tipologia, setTipologia]     = useState(initial?.tipologia ?? 'Singola Classic')
  const [tipologiaOL, setTipologiaOL] = useState(initial?.tipologiaOnline ?? '')
  const [descrizione, setDescrizione] = useState(initial?.descrizione ?? '')
  const [main, setMain]               = useState<string | null>(initial?.immaginePrincipale ?? null)
  const [gallery, setGallery]         = useState<string[]>(initial?.gallery ?? [])

  function pickMainFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setMain(URL.createObjectURL(f))
  }
  function addGalleryFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setGallery(prev => [...prev, ...files.map(f => URL.createObjectURL(f))].slice(0, MAX_GALLERY))
  }
  function removeFromGallery(i: number) {
    setGallery(prev => prev.filter((_, idx) => idx !== i))
  }
  function clearMain() {
    setMain(null)
  }

  const title = mode === 'create' ? 'Allestisci tipologia camera' : `Modifica camera ${initial?.numero ?? ''}`.trim()
  const subtitle = mode === 'edit' && initial ? initial.titolo : 'Configura tipologia, descrizione e immagini'

  return (
    <div className="inv-camere__drawer-backdrop" onClick={onClose}>
      <aside className="inv-camere__drawer" onClick={e => e.stopPropagation()}>
        <header className="inv-camere__drawer-header">
          <div>
            <h3 className="inv-camere__drawer-title">{title}</h3>
            <p className="inv-camere__drawer-subtitle">{subtitle}</p>
          </div>
          <Tooltip text="Chiudi">
            <button type="button" className="sib-btn sib-btn--icon" onClick={onClose} aria-label="Chiudi">
              <i className="fa-light fa-xmark" aria-hidden="true" />
            </button>
          </Tooltip>
        </header>

        <div className="inv-camere__drawer-body">
          <Tabs
            active={tab}
            onChange={id => setTab(id as typeof tab)}
            tabs={[
              { id: 'anagrafica', label: 'Anagrafica' },
              { id: 'media',      label: 'Media & gallery' },
            ]}
          />

          <div className="inv-camere__drawer-content">
            {tab === 'anagrafica' && (
              <>
                <FormGrid cols={2}>
                  <SelectField
                    name="tipologia" label="Tipologia camera"
                    value={tipologia}
                    onChange={e => setTipologia(e.target.value)}
                    options={TIPOLOGIE.map(t => ({ value: t, label: t }))}
                  />
                  <InputField
                    name="tipologia-online" label="Tipologia camera on line"
                    placeholder="Es. Camera doppia vista mare"
                    value={tipologiaOL}
                    onChange={e => setTipologiaOL(e.target.value)}
                    hint="Nome visibile ai clienti sui canali online"
                  />
                </FormGrid>
                <TextareaField
                  name="descrizione" label="Breve descrizione"
                  rows={4}
                  placeholder="Descrivi la camera: comfort, vista, dotazioni…"
                  value={descrizione}
                  onChange={e => setDescrizione(e.target.value)}
                />
              </>
            )}

            {tab === 'media' && (
              <>
                <h3 className="sib-section-title">Immagine principale</h3>
                <p className="inv-camere__hint">
                  Mostrata come anteprima nella griglia inventario e sui canali online.
                </p>
                <ImageDropzone
                  value={main}
                  onPick={pickMainFile}
                  onClear={clearMain}
                />

                <h3 className="sib-section-title">Galleria</h3>
                <p className="inv-camere__hint">
                  Massimo {MAX_GALLERY} immagini in formato JPG, PNG o WEBP.
                </p>
                <GalleryGrid
                  images={gallery}
                  max={MAX_GALLERY}
                  onAdd={addGalleryFiles}
                  onRemove={removeFromGallery}
                />
              </>
            )}
          </div>
        </div>

        <footer className="inv-camere__drawer-footer">
          <FormActions
            onCancel={onClose}
            onConfirm={onSave}
            confirmLabel="Salva"
            confirmIcon="fa-floppy-disk"
          />
        </footer>
      </aside>
    </div>
  )
}

// ─── Drop-zone immagine principale ────────────────────────────────────
function ImageDropzone({
  value, onPick, onClear,
}: {
  value: string | null
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  if (value) {
    return (
      <div className="inv-camere__dropzone inv-camere__dropzone--filled">
        <img src={value} alt="Anteprima immagine principale" className="inv-camere__dropzone-img" />
        <span className="inv-camere__dropzone-actions">
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => inputRef.current?.click()}>
            <i className="fa-light fa-arrows-rotate" /> Sostituisci
          </button>
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={onClear}>
            <i className="fa-light fa-trash" /> Rimuovi
          </button>
        </span>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
      </div>
    )
  }

  return (
    <button
      type="button"
      className="inv-camere__dropzone"
      onClick={() => inputRef.current?.click()}
    >
      <i className="fa-light fa-cloud-arrow-up" aria-hidden="true" />
      <span className="inv-camere__dropzone-title">Trascina o seleziona un file</span>
      <span className="inv-camere__dropzone-hint">JPG, PNG, WEBP — max 5 MB</span>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
    </button>
  )
}

// ─── Grid galleria ────────────────────────────────────────────────────
function GalleryGrid({
  images, max, onAdd, onRemove,
}: {
  images: string[]
  max: number
  onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (i: number) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const canAdd = images.length < max
  return (
    <div className="inv-camere__gallery">
      {images.map((src, i) => (
        <div key={i} className="inv-camere__gallery-item">
          <img src={src} alt={`Immagine galleria ${i + 1}`} />
          <Tooltip text="Rimuovi">
            <button
              type="button"
              className="inv-camere__gallery-remove"
              onClick={() => onRemove(i)}
              aria-label="Rimuovi immagine"
            >
              <i className="fa-light fa-xmark" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      ))}
      {canAdd && (
        <button
          type="button"
          className="inv-camere__gallery-add"
          onClick={() => inputRef.current?.click()}
          aria-label="Aggiungi immagini alla galleria"
        >
          <i className="fa-light fa-circle-plus" aria-hidden="true" />
          <span>Aggiungi</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={onAdd}
      />
    </div>
  )
}
