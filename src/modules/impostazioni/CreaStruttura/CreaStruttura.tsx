import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import FormGrid from '../../../core/components/FormGrid'
import FormActions from '../../../core/components/FormActions'
import Tabs from '../../../core/components/Tabs'
import FilterToolbar from '../../../core/components/FilterToolbar'
import Pagination from '../../../core/components/Pagination'
import {
  InputField,
  SelectField,
  TextareaField,
  CheckboxField,
  RadioGroup,
  SearchField,
} from '../../../core/components/form'
import Ico from '../../../core/icons/Ico'
import NewClientModal from '../../../admin/SibyllaAdminPanel/modals/NewClientModal/NewClientModal'
import { EMPTY_NEW_CLIENT } from '../../../admin/SibyllaAdminPanel/constants'
import type { NewClientForm, TipologiaCategoria } from '../../../admin/SibyllaAdminPanel/types'
import './CreaStruttura.sass'

type StructureType = 'hotel' | 'bnb' | 'apartment' | 'outlet'
type PmsType = 'sibylla' | 'esterno'
type FilterType = 'all' | StructureType

interface StructureRow {
  id: string
  nome: string
  tipo: StructureType
  citta: string
  categoria: number
  pms: PmsType
  active: boolean
}

const TIPO_LABEL: Record<StructureType, string> = {
  hotel:     'Hotel',
  bnb:       'B&B',
  apartment: 'Appartamento',
  outlet:    'Outlet',
}

const TIPO_ICON: Record<StructureType, string> = {
  hotel:     'hotel',
  bnb:       'bed',
  apartment: 'apartment',
  outlet:    'utensils',
}

const TYPE_OPTIONS: StructureType[] = ['hotel', 'bnb', 'apartment', 'outlet']

// Mapping tra il tipo scelto nel picker e la "Tipologia struttura" della modale.
const TYPE_TO_CAT: Record<StructureType, TipologiaCategoria> = {
  hotel: 'hotel', bnb: 'bnb', apartment: 'appartamenti', outlet: 'ristorante',
}
const CAT_TO_TYPE: Record<string, StructureType> = {
  hotel: 'hotel', bnb: 'bnb', appartamenti: 'apartment', 'case-vacanze': 'apartment',
  ostello: 'apartment', studentato: 'apartment', ristorante: 'outlet', bar: 'outlet', 'centro-sportivo': 'outlet',
}

const TIPOLOGIA_STRUTTURA_OPTIONS = [
  { value: 'hotel',       label: 'Hotel' },
  { value: 'bnb',         label: 'B&B' },
  { value: 'apartment',   label: 'Appartamento' },
  { value: 'resort',      label: 'Resort' },
  { value: 'agriturismo', label: 'Agriturismo' },
  { value: 'casavac',     label: 'Casa vacanze' },
]

const TIPOLOGIA_OUTLET_OPTIONS = [
  { value: 'ristorante', label: 'Ristorante' },
  { value: 'bar',        label: 'Bar' },
  { value: 'spa',        label: 'Spa / Centro benessere' },
  { value: 'palestra',   label: 'Palestra' },
  { value: 'tennis',     label: 'Campo da tennis' },
  { value: 'shop',       label: 'Shop' },
]

const PMS_OPTIONS = [
  { value: 'sibylla', label: 'Sibylla' },
  { value: 'esterno', label: 'Esterno' },
]

const ROOM_TYPES = ['SNGL', 'DBL', 'DBLECO', 'TPL', 'MATDEC', 'MATECO', 'MAT', 'DBL+2', 'MATSUI']

const FEATURES = [
  'Aria condizionata', 'Balcone', 'Vasca', 'TV a schermo piatto',
  'Terrazza', 'Bollitore elettrico', 'Armadio o guardaroba', 'Riscaldamento',
  'Cassaforte', 'Insonorizzazione', 'Scrivania', 'Presa elettrica vicino al letto',
  'Bagno privato', 'Bagno in comune', 'Bidet', 'Accappatoio',
  'Prodotti da bagno in omaggio', 'Asciugacapelli', 'Pantofole', 'Vino/champagne',
]

const INITIAL_ROWS: StructureRow[] = [
  { id: 's1',  nome: 'Hotel Archimede',     tipo: 'hotel',     citta: 'Roma',     categoria: 4, pms: 'sibylla', active: true  },
  { id: 's2',  nome: 'Hotel Lazio',         tipo: 'hotel',     citta: 'Roma',     categoria: 3, pms: 'sibylla', active: true  },
  { id: 's3',  nome: 'Hotel Siracusa',      tipo: 'hotel',     citta: 'Siracusa', categoria: 3, pms: 'sibylla', active: true  },
  { id: 's4',  nome: 'Hotel Floridia',      tipo: 'hotel',     citta: 'Floridia', categoria: 3, pms: 'esterno', active: true  },
  { id: 's5',  nome: 'Hotel Luce',          tipo: 'hotel',     citta: 'Milano',   categoria: 4, pms: 'sibylla', active: true  },
  { id: 's6',  nome: 'Hotel Lux',           tipo: 'hotel',     citta: 'Roma',     categoria: 4, pms: 'esterno', active: true  },
  { id: 's7',  nome: 'Hotel Noto',          tipo: 'hotel',     citta: 'Noto',     categoria: 3, pms: 'sibylla', active: true  },
  { id: 's8',  nome: 'Hotel Regio',         tipo: 'hotel',     citta: 'Torino',   categoria: 3, pms: 'sibylla', active: true  },
  { id: 's9',  nome: 'B&B Tramonto',        tipo: 'bnb',       citta: 'Firenze',  categoria: 3, pms: 'sibylla', active: true  },
  { id: 's10', nome: 'Casa al Mare',        tipo: 'apartment', citta: 'Rimini',   categoria: 0, pms: 'sibylla', active: true  },
  { id: 's11', nome: 'Ristorante Belvista', tipo: 'outlet',    citta: 'Milano',   categoria: 0, pms: 'sibylla', active: true  },
  { id: 's12', nome: 'Ristorante Il Borgo', tipo: 'outlet',    citta: 'Firenze',  categoria: 0, pms: 'sibylla', active: true  },
  { id: 's13', nome: 'Sede Raeli',          tipo: 'hotel',     citta: 'Roma',     categoria: 0, pms: 'sibylla', active: false },
  { id: 's14', nome: 'Test',                tipo: 'hotel',     citta: 'Roma',     categoria: 4, pms: 'esterno', active: false },
]

const PAGE_SIZE = 10

const FILTER_CHIPS: { id: FilterType; label: string }[] = [
  { id: 'all',       label: 'Tutte' },
  { id: 'hotel',     label: 'Hotel' },
  { id: 'bnb',       label: 'B&B' },
  { id: 'apartment', label: 'Appartamenti' },
  { id: 'outlet',    label: 'Outlet' },
]

export default function CreaStruttura({
  navigate,
  autoOpenType,
  embedded = false,
}: {
  navigate: (p: string) => void
  autoOpenType?: StructureType
  /**
   * Montata dentro un contenitore con la propria intestazione (il pane del
   * Configuratore): salta il PageHead, così non compare un secondo titolo.
   */
  embedded?: boolean
}) {
  const [rows, setRows] = useState<StructureRow[]>(INITIAL_ROWS)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(1)

  // Pagina dedicata "Crea outlet": apre la stessa pagina di Crea struttura con il
  // picker già aperto e "Outlet" pre-selezionato (come scegliere Crea struttura → Outlet).
  const [pickerOpen, setPickerOpen] = useState(autoOpenType === 'outlet')
  const [pickerSel, setPickerSel] = useState<StructureType | null>(autoOpenType ?? null)
  const [drawerType, setDrawerType] = useState<StructureType | null>(null)
  const [editingRow, setEditingRow] = useState<StructureRow | null>(null)

  // Modale "Nuova struttura" (stessa della sezione admin, UI platform).
  const [newOpen, setNewOpen] = useState(false)
  const [newForm, setNewForm] = useState<NewClientForm>({ ...EMPTY_NEW_CLIENT })

  const [confirmDelete,  setConfirmDelete]  = useState<StructureRow | null>(null)
  const [confirmDisable, setConfirmDisable] = useState<StructureRow | null>(null)
  const [qrFor,          setQrFor]          = useState<StructureRow | null>(null)
  const [outletModal,    setOutletModal]    = useState<StructureRow | null>(null)
  const [configModal,    setConfigModal]    = useState<StructureRow | null>(null)

  const counts = useMemo(() => ({
    all:       rows.length,
    hotel:     rows.filter(r => r.tipo === 'hotel').length,
    bnb:       rows.filter(r => r.tipo === 'bnb').length,
    apartment: rows.filter(r => r.tipo === 'apartment').length,
    outlet:    rows.filter(r => r.tipo === 'outlet').length,
  }), [rows])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return rows.filter(r => {
      if (filter !== 'all' && r.tipo !== filter) return false
      if (!s) return true
      return r.nome.toLowerCase().includes(s) || r.citta.toLowerCase().includes(s)
    })
  }, [rows, search, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, filter])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const filteredPage = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  function openPicker() {
    setEditingRow(null)
    setPickerSel(null)
    setPickerOpen(true)
  }
  function confirmPicker() {
    if (!pickerSel) return
    // Apre la modale "Nuova struttura" con la Tipologia precompilata dalla scelta.
    setNewForm({ ...EMPTY_NEW_CLIENT, categoria: TYPE_TO_CAT[pickerSel] })
    setPickerOpen(false)
    setNewOpen(true)
  }
  function addStruttura() {
    const f = newForm
    if (!f.nome.trim()) return
    const tipo = CAT_TO_TYPE[f.categoria] || 'hotel'
    const row: StructureRow = {
      id: `st-${Date.now()}`,
      nome: f.nome.trim(),
      tipo,
      citta: f.citta,
      categoria: parseInt(f.classificazione) || 0,
      pms: f.pms === 'Esterno' ? 'esterno' : 'sibylla',
      active: true,
    }
    setRows(rs => [row, ...rs])
    setNewOpen(false)
  }
  function openEdit(r: StructureRow) {
    setEditingRow(r)
    setDrawerType(r.tipo)
  }
  function closeDrawer() {
    setDrawerType(null)
    setEditingRow(null)
  }
  function toggleActive(id: string) {
    setRows(rs => rs.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }
  function requestToggleActive(r: StructureRow) {
    if (r.active) setConfirmDisable(r)
    else toggleActive(r.id)
  }
  function doDisable() {
    if (!confirmDisable) return
    toggleActive(confirmDisable.id)
    setConfirmDisable(null)
  }
  function doDelete() {
    if (!confirmDelete) return
    setRows(rs => rs.filter(r => r.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  return (
    <div className="crea-struttura">
      {!embedded && (
        <PageHead
          title="Crea struttura"
          subtitle="Imposta, aggiungi e verifica i dati delle tue strutture ricettive"
        />
      )}

      <FilterToolbar
        actions={
          <button type="button" className="sib-btn sib-btn--primary" onClick={openPicker}>
            <i className="fa-light fa-circle-plus" aria-hidden="true" />
            Nuova struttura
          </button>
        }
      >
        <div className="crea-struttura__search">
          <label className="crea-struttura__search-label" htmlFor="search">Cerca</label>
          <SearchField
            placeholder="Cerca per nome o città"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <div className="crea-struttura__chip-filters">
          {FILTER_CHIPS.map(c => (
            <button
              key={c.id}
              type="button"
              className={
                'crea-struttura__chip' +
                (filter === c.id ? ' crea-struttura__chip--active' : '')
              }
              onClick={() => setFilter(c.id)}
            >
              {c.label}
              <span className="crea-struttura__chip-count">{counts[c.id]}</span>
            </button>
          ))}
        </div>
      </FilterToolbar>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Tipologia struttura</th>
              <th>Categoria</th>
              <th>Nome</th>
              <th>Tecnologia</th>
              <th>Città</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filteredPage.length === 0 && (
              <tr><td colSpan={6} className="sib-empty">Nessuna struttura trovata.</td></tr>
            )}
            {filteredPage.map(r => (
              <tr key={r.id} className={r.active ? '' : 'crea-struttura__row--inactive'}>
                <td>{TIPO_LABEL[r.tipo]}</td>
                <td>
                  {r.categoria > 0 ? (
                    <span className="crea-struttura__cat-stars">
                      {Array.from({ length: r.categoria }).map((_, i) => (
                        <i key={i} className="fa-solid fa-star" aria-hidden="true" />
                      ))}
                    </span>
                  ) : (
                    <span className="crea-struttura__cat-empty">
                      <i className="fa-light fa-circle" aria-hidden="true" />
                    </span>
                  )}
                </td>
                <td>{r.nome}</td>
                <td><PmsIcon pms={r.pms} /></td>
                <td>{r.citta}</td>
                <td>
                  <span className="crea-struttura__row-actions">
                    <Tooltip text="Qrcode">
                      <button type="button" className="sib-btn sib-btn--icon" onClick={() => setQrFor(r)} aria-label="Qrcode">
                        <i className="fa-solid fa-qrcode" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <Tooltip text={r.active ? 'Disattiva struttura' : 'Riattiva struttura'}>
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon crea-struttura__action-power"
                        onClick={() => requestToggleActive(r)}
                        aria-label={r.active ? 'Disattiva struttura' : 'Riattiva struttura'}
                      >
                        <i className="fa-solid fa-power-off" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Cambia Configurazione">
                      <button type="button" className="sib-btn sib-btn--icon" onClick={() => setConfigModal(r)} aria-label="Cambia Configurazione">
                        <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Outlet">
                      <button type="button" className="sib-btn sib-btn--icon" onClick={() => setOutletModal(r)} aria-label="Outlet">
                        <i className="fa-solid fa-building-circle-check" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Modifica struttura">
                      <button type="button" className="sib-btn sib-btn--icon" onClick={() => openEdit(r)} aria-label="Modifica struttura">
                        <i className="fa-solid fa-pen-to-square" aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Elimina">
                      <button type="button" className="sib-btn sib-btn--icon" onClick={() => setConfirmDelete(r)} aria-label="Elimina">
                        <i className="fa-solid fa-trash" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="crea-struttura__pagination">
        <span className="crea-struttura__pagination-info">
          {filtered.length > 0
            ? `Risultati ${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, filtered.length)} di ${filtered.length}`
            : '0 risultati'}
        </span>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* ── Drawer form ────────────────────────────────────────── */}
      {drawerType && (
        <Drawer
          title={`${editingRow ? 'Modifica' : 'Nuovo'} ${TIPO_LABEL[drawerType]}`}
          subtitle={editingRow ? editingRow.nome : 'Compila i dati della struttura'}
          onClose={closeDrawer}
        >
          {drawerType === 'outlet' ? (
            <OutletForm rows={rows} initial={editingRow} onSave={closeDrawer} onCancel={closeDrawer} />
          ) : (
            <StrutturaForm tipo={drawerType} initial={editingRow} onSave={closeDrawer} onCancel={closeDrawer} />
          )}
        </Drawer>
      )}

      {/* ── Modal type picker ─────────────────────────────────── */}
      {pickerOpen && (
        <div className="crea-struttura__modal-backdrop" onClick={() => setPickerOpen(false)}>
          <div className="crea-struttura__modal" onClick={e => e.stopPropagation()}>
            <h3 className="crea-struttura__modal-title">Che tipo di struttura vuoi creare?</h3>
            <div className="crea-struttura__type-grid">
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t}
                  type="button"
                  className={
                    'crea-struttura__type-card' +
                    (pickerSel === t ? ' crea-struttura__type-card--selected' : '')
                  }
                  onClick={() => setPickerSel(t)}
                >
                  <span className="crea-struttura__type-icon">
                    <Ico n={TIPO_ICON[t]} s={32} c="#204769" w="duotone" />
                  </span>
                  <span className="crea-struttura__type-label">{TIPO_LABEL[t]}</span>
                </button>
              ))}
            </div>
            <FormActions
              onCancel={() => setPickerOpen(false)}
              onConfirm={confirmPicker}
              confirmLabel="Continua"
              confirmDisabled={!pickerSel}
            />
          </div>
        </div>
      )}

      {/* ── Modal QR ─────────────────────────────────────────── */}
      {qrFor && (
        <div className="crea-struttura__modal-backdrop" onClick={() => setQrFor(null)}>
          <div className="crea-struttura__modal" onClick={e => e.stopPropagation()}>
            <h3 className="crea-struttura__modal-title">QR code — {qrFor.nome}</h3>
            <div className="crea-struttura__qr-box">
              <Ico n="qrcode" s={180} c="#204769" w="solid" />
            </div>
            <FormActions
              onCancel={() => setQrFor(null)}
              onConfirm={() => setQrFor(null)}
              cancelLabel="Chiudi"
              confirmLabel="Scarica PDF"
              confirmIcon="fa-download"
            />
          </div>
        </div>
      )}

      {/* ── Modal conferma elimina ───────────────────────────── */}
      {confirmDelete && (
        <div className="crea-struttura__modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="crea-struttura__modal" onClick={e => e.stopPropagation()}>
            <h3 className="crea-struttura__modal-title">Eliminare la struttura?</h3>
            <p className="crea-struttura__confirm-text">
              Stai per eliminare <strong>{confirmDelete.nome}</strong>. L'operazione non è reversibile.
            </p>
            <FormActions
              onCancel={() => setConfirmDelete(null)}
              onConfirm={doDelete}
              confirmLabel="Elimina"
              confirmIcon="fa-trash"
            />
          </div>
        </div>
      )}

      {/* ── Modal conferma disattivazione ────────────────────── */}
      {confirmDisable && (
        <div className="crea-struttura__modal-backdrop" onClick={() => setConfirmDisable(null)}>
          <div className="crea-struttura__modal" onClick={e => e.stopPropagation()}>
            <h3 className="crea-struttura__modal-title">Disattivare la struttura?</h3>
            <p className="crea-struttura__confirm-text">
              Stai per disattivare <strong>{confirmDisable.nome}</strong>. La struttura non sarà più operativa fino alla riattivazione.
            </p>
            <FormActions
              onCancel={() => setConfirmDisable(null)}
              onConfirm={doDisable}
              confirmLabel="Disattiva"
              confirmIcon="fa-power-off"
            />
          </div>
        </div>
      )}

      {/* ── Modal Cambia Configurazione ──────────────────────── */}
      {configModal && (
        <div className="crea-struttura__modal-backdrop" onClick={() => setConfigModal(null)}>
          <div className="crea-struttura__modal" onClick={e => e.stopPropagation()}>
            <h3 className="crea-struttura__modal-title">Cambia configurazione — {configModal.nome}</h3>
            <FormGrid cols={2}>
              <SelectField
                name="cfg-pms" label="PMS"
                defaultValue={configModal.pms}
                options={[
                  { value: 'sibylla', label: 'PMS Sibylla' },
                  { value: 'esterno', label: 'PMS Esterno' },
                ]}
              />
              <SelectField
                name="cfg-tipo" label="Tipologia struttura"
                defaultValue={configModal.tipo}
                options={TIPOLOGIA_STRUTTURA_OPTIONS}
              />
            </FormGrid>
            <FormActions
              onCancel={() => setConfigModal(null)}
              onConfirm={() => setConfigModal(null)}
              confirmLabel="Salva"
              confirmIcon="fa-floppy-disk"
            />
          </div>
        </div>
      )}

      {/* ── Modal Outlet (placeholder) ───────────────────────── */}
      {outletModal && (
        <div className="crea-struttura__modal-backdrop" onClick={() => setOutletModal(null)}>
          <div className="crea-struttura__modal" onClick={e => e.stopPropagation()}>
            <h3 className="crea-struttura__modal-title">Outlet di {outletModal.nome}</h3>
            <p className="crea-struttura__confirm-text">
              Nessun outlet associato a questa struttura.
            </p>
            <FormActions
              onCancel={() => setOutletModal(null)}
              onConfirm={() => { setOutletModal(null); setEditingRow(null); setDrawerType('outlet') }}
              cancelLabel="Chiudi"
              confirmLabel="Nuovo outlet"
              confirmIcon="fa-circle-plus"
            />
          </div>
        </div>
      )}

      {/* ── Modale "Nuova struttura" (stessa della sezione admin, UI platform) ── */}
      <NewClientModal
        open={newOpen}
        title="Nuova struttura"
        confirmLabel="Crea struttura"
        form={newForm}
        setForm={setNewForm}
        onClose={() => setNewOpen(false)}
        onConfirm={addStruttura}
      />
    </div>
  )
}

// ─── Drawer laterale ─────────────────────────────────────────────────
function Drawer({
  title, subtitle, onClose, children,
}: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="crea-struttura__drawer-backdrop" onClick={onClose}>
      <aside className="crea-struttura__drawer" onClick={e => e.stopPropagation()}>
        <header className="crea-struttura__drawer-header">
          <div>
            <h3 className="crea-struttura__drawer-title">{title}</h3>
            {subtitle && <p className="crea-struttura__drawer-subtitle">{subtitle}</p>}
          </div>
          <Tooltip text="Chiudi">
            <button
              type="button"
              className="sib-btn sib-btn--icon"
              onClick={onClose}
              aria-label="Chiudi"
            >
              <i className="fa-light fa-xmark" aria-hidden="true" />
            </button>
          </Tooltip>
        </header>
        <div className="crea-struttura__drawer-body">{children}</div>
      </aside>
    </div>
  )
}

// ─── Form Hotel / B&B / Appartamento ──────────────────────────────────
function StrutturaForm({
  tipo, initial, onSave, onCancel,
}: {
  tipo: StructureType
  initial: StructureRow | null
  onSave: () => void
  onCancel: () => void
}) {
  const [tab, setTab] = useState<'anagrafica' | 'camere' | 'tariffe' | 'caratteristiche'>('anagrafica')

  const [pms, setPms] = useState<PmsType>(initial?.pms ?? 'sibylla')
  const [stars, setStars] = useState(initial?.categoria ?? 0)
  const [tipologia, setTipologia] = useState<string>(initial?.tipo ?? tipo)
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [citta, setCitta] = useState(initial?.citta ?? '')
  const [numPiani, setNumPiani] = useState(0)
  const [piani, setPiani] = useState<{ nome: string; rooms: Record<string, number> }[]>([])

  function setNumPianiSafe(n: number) {
    const safe = Math.max(0, Math.min(50, isNaN(n) ? 0 : n))
    setNumPiani(safe)
    setPiani(prev => {
      const next = prev.slice(0, safe)
      while (next.length < safe) {
        next.push({ nome: '', rooms: Object.fromEntries(ROOM_TYPES.map(rt => [rt, 0])) })
      }
      return next
    })
  }
  function updatePianoNome(i: number, val: string) {
    setPiani(prev => prev.map((p, idx) => (idx === i ? { ...p, nome: val } : p)))
  }
  function updatePianoRoom(i: number, key: string, val: number) {
    setPiani(prev =>
      prev.map((p, idx) =>
        idx === i ? { ...p, rooms: { ...p.rooms, [key]: Number(val) || 0 } } : p
      )
    )
  }
  const totals = ROOM_TYPES.reduce<Record<string, number>>((acc, rt) => {
    acc[rt] = piani.reduce((s, p) => s + (p.rooms[rt] || 0), 0)
    return acc
  }, {})

  return (
    <div className="crea-struttura__drawer-form">
      <Tabs
        active={tab}
        onChange={id => setTab(id as typeof tab)}
        tabs={[
          { id: 'anagrafica',     label: 'Anagrafica' },
          { id: 'camere',         label: 'Camere & piani' },
          { id: 'tariffe',        label: 'Tariffe & media' },
          { id: 'caratteristiche', label: 'Caratteristiche' },
        ]}
      />

      <div className="crea-struttura__drawer-content">
        {tab === 'anagrafica' && (
          <>
            <FormGrid cols={2}>
              <RadioGroup
                name="pms" label="PMS" options={PMS_OPTIONS}
                value={pms} onChange={v => setPms(v as PmsType)}
              />
              <SelectField
                name="tipologia" label="Tipologia struttura"
                value={tipologia} onChange={e => setTipologia(e.target.value)}
                options={TIPOLOGIA_STRUTTURA_OPTIONS}
              />
            </FormGrid>
            <FormGrid cols={2}>
              <InputField name="nome" label="Nome struttura" value={nome} onChange={e => setNome(e.target.value)} />
              <div>
                <label className="text-[12px] font-semibold font-poppins text-primary mb-1 block">Categoria</label>
                <div className="crea-struttura__rating">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n} type="button"
                      className={'crea-struttura__rating-star' + (n <= stars ? ' crea-struttura__rating-star--filled' : '')}
                      onClick={() => setStars(n === stars ? 0 : n)}
                      aria-label={`${n} stelle`}
                    >
                      <i className="fa-solid fa-star" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            </FormGrid>

            <h3 className="sib-section-title">Indirizzo</h3>
            <FormGrid cols={4}>
              <InputField name="indirizzo" label="Indirizzo" />
              <InputField name="citta"     label="Città" value={citta} onChange={e => setCitta(e.target.value)} />
              <InputField name="cap"       label="Cap" />
              <InputField name="nazione"   label="Nazione" />
            </FormGrid>
          </>
        )}

        {tab === 'camere' && (
          <>
            <FormGrid cols={2}>
              <InputField
                name="numPiani" label="Numero piani" type="number" min={0}
                value={numPiani} onChange={e => setNumPianiSafe(Number(e.target.value))}
              />
            </FormGrid>
            <div className="crea-struttura__floors">
              <table className="crea-struttura__floors-table">
                <thead>
                  <tr>
                    <th>Piani</th>
                    <th>Nome</th>
                    {ROOM_TYPES.map(rt => <th key={rt}>{rt}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {piani.length === 0 && (
                    <tr><td colSpan={2 + ROOM_TYPES.length} className="sib-empty">Imposta il numero di piani per generare la tabella.</td></tr>
                  )}
                  {piani.map((p, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <input
                          className="crea-struttura__floor-name"
                          value={p.nome}
                          onChange={e => updatePianoNome(i, e.target.value)}
                        />
                      </td>
                      {ROOM_TYPES.map(rt => (
                        <td key={rt}>
                          <input
                            className="crea-struttura__floor-input"
                            type="number" min={0}
                            value={p.rooms[rt]}
                            onChange={e => updatePianoRoom(i, rt, Number(e.target.value))}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {piani.length > 0 && (
                    <tr className="crea-struttura__totale-row">
                      <td colSpan={2}>Totale</td>
                      {ROOM_TYPES.map(rt => <td key={rt}>{totals[rt]}</td>)}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'tariffe' && (
          <>
            <FormGrid cols={3}>
              <InputField name="tassa" label="Tassa giornaliera" type="number" step={0.01} />
              <FileField label="Immagine principale" />
              <FileField label="Logo struttura" />
            </FormGrid>
            <FormGrid cols={2}>
              <FileField label="Crea gallery" multiple />
              <TextareaField name="descrizione" label="Breve descrizione" rows={3} />
            </FormGrid>
          </>
        )}

        {tab === 'caratteristiche' && (
          <FormGrid cols={4}>
            {FEATURES.map(f => (
              <CheckboxField key={f} name={`feat-${f}`} label={f} />
            ))}
          </FormGrid>
        )}
      </div>

      <footer className="crea-struttura__drawer-footer">
        <FormActions
          onCancel={onCancel}
          onConfirm={onSave}
          confirmLabel="Salva"
          confirmIcon="fa-floppy-disk"
        />
      </footer>
    </div>
  )
}

// ─── Form Outlet ──────────────────────────────────────────────────────
function OutletForm({
  rows, initial, onSave, onCancel,
}: {
  rows: StructureRow[]
  initial: StructureRow | null
  onSave: () => void
  onCancel: () => void
}) {
  const strutture = rows.filter(r => r.tipo !== 'outlet')
  const [tab, setTab] = useState<'anagrafica' | 'indirizzo' | 'media'>('anagrafica')
  const [nome, setNome] = useState(initial?.nome ?? '')
  const [citta, setCitta] = useState(initial?.citta ?? '')

  return (
    <div className="crea-struttura__drawer-form">
      <Tabs
        active={tab}
        onChange={id => setTab(id as typeof tab)}
        tabs={[
          { id: 'anagrafica', label: 'Anagrafica' },
          { id: 'indirizzo',  label: 'Indirizzo' },
          { id: 'media',      label: 'Media & descrizione' },
        ]}
      />

      <div className="crea-struttura__drawer-content">
        {tab === 'anagrafica' && (
          <>
            <FormGrid cols={2}>
              <SelectField
                name="tipologia-outlet" label="Tipologia outlet"
                placeholder="Tipologia outlet"
                options={TIPOLOGIA_OUTLET_OPTIONS}
              />
              <SelectField
                name="struttura-associata" label="Struttura associata"
                placeholder="Seleziona..."
                options={strutture.map(s => ({ value: s.id, label: s.nome }))}
              />
            </FormGrid>
            <FormGrid cols={2}>
              <InputField name="nome-outlet" label="Nome" value={nome} onChange={e => setNome(e.target.value)} />
              <InputField name="tel-outlet"  label="Numero telefonico" type="tel" />
            </FormGrid>
          </>
        )}

        {tab === 'indirizzo' && (
          <FormGrid cols={4}>
            <InputField name="ind-outlet"   label="Indirizzo" />
            <InputField name="citta-outlet" label="Città" value={citta} onChange={e => setCitta(e.target.value)} />
            <InputField name="cap-outlet"   label="Cap" />
            <InputField name="naz-outlet"   label="Nazione" />
          </FormGrid>
        )}

        {tab === 'media' && (
          <>
            <FormGrid cols={2}>
              <FileField label="Immagine principale" />
              <FileField label="Logo struttura" optionalLabel="(opzionale)" />
            </FormGrid>
            <FormGrid cols={2}>
              <TextareaField name="desc-outlet" label="Breve descrizione" rows={3} />
              <FileField label="Crea Gallery" multiple />
            </FormGrid>
          </>
        )}
      </div>

      <footer className="crea-struttura__drawer-footer">
        <FormActions
          onCancel={onCancel}
          onConfirm={onSave}
          confirmLabel="Salva"
          confirmIcon="fa-floppy-disk"
        />
      </footer>
    </div>
  )
}

// ─── Icona PMS (S di Sibylla per Sibylla, server per Esterno) ─────────
function PmsIcon({ pms }: { pms: PmsType }) {
  const isSib = pms === 'sibylla'
  return (
    <Tooltip text={isSib ? 'PMS Sibylla' : 'PMS Esterno'}>
      <span className="crea-struttura__pms-icon" aria-label={isSib ? 'PMS Sibylla' : 'PMS Esterno'}>
        {isSib ? (
          <svg width={18} height={18} viewBox="88 80 62 56" aria-hidden="true">
            <path fill="#a2864c" d="M135.1,88.8c-3.4-3.4-4.8-4.3-8.1-5.9-6.4-3.1-15.2-3.3-21.7-.4-5.4,2.4-10.2,6.9-13,13.1-2.8,8.3-1.6,15.6-1.6,15.6h42.9s-1.3,6.3-6.7,9.6c-6.2,3.9-14.4,4.5-21.4.4-5.9-3.4-7.8-7.1-7.8-7.1h-6.7c0,0,3.4,8.6,12.8,12.8,5.2,2.3,12.3,4,19.8,1.8,7.4-2.1,14.8-9.7,16.7-17.1.7-2.6.7-6.3.7-6.3h-43.5s0-2.5.3-3.8c.9-4.6,3.8-8.8,7.2-11.2,3.7-2.5,9.9-3.6,13.7-2.9,6.7,1.2,12.6,6.2,14.6,12.2.5,1.5,1,2.8,1,2.8h6.8s-.1-1.8-.4-3.3c-.3-1.3-.7-2.6-1.2-3.9-.3-.8-2.1-4.3-4.2-6.4"/>
          </svg>
        ) : (
          <i className="fa-solid fa-server" aria-hidden="true" />
        )}
      </span>
    </Tooltip>
  )
}

// ─── File picker ──────────────────────────────────────────────────────
function FileField({
  label, optionalLabel, multiple = false,
}: { label: string; optionalLabel?: string; multiple?: boolean }) {
  const [name, setName] = useState('Nessun file selezionato')
  const inputRef = React.useRef<HTMLInputElement>(null)
  return (
    <div className="crea-struttura__file-field">
      <label className="text-[12px] font-semibold font-poppins text-primary">
        {label}
        {optionalLabel && <em className="crea-struttura__label-opt"> {optionalLabel}</em>}
      </label>
      <div className="crea-struttura__file">
        <button type="button" className="crea-struttura__file-btn" onClick={() => inputRef.current?.click()}>
          Seleziona
        </button>
        <span className="crea-struttura__file-name">{name}</span>
        <input
          ref={inputRef} type="file" multiple={multiple}
          className="crea-struttura__file-input"
          onChange={e => {
            const files = e.target.files
            if (!files || files.length === 0) { setName('Nessun file selezionato'); return }
            setName(files.length === 1 ? files[0].name : `${files.length} file selezionati`)
          }}
        />
      </div>
    </div>
  )
}
