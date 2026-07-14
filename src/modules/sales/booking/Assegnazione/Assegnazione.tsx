import React, { useState } from 'react'
import T from '../../../../core/tokens'
import Ico from '../../../../core/icons/Ico'
import Tooltip from '../../../../core/components/Tooltip'
import PageHead from '../../../../core/components/PageHead'
import Pagination from '../../../../core/components/Pagination'
import { SelectField, DateRangeField } from '../../../../core/components/form'
import './Assegnazione.sass'

// ── Tipi ─────────────────────────────────────────────────────────────────────
interface Camera {
  id:           number
  numero:       string
  piano:        string
  nome:         string
  tipo:         string
  tipoRichiesto:string
  checkIn:      string
  stato:        string
  prenotazioneId: string
}

interface Prenotazione {
  id:       string
  dateIn:   string
  dateOut:  string
  nCamere:  number
  nPersone: number
  genere:   string
  naz:      string
  checkIn:  string
  nome:     string
  stato:    string
  piano:    string
  dataOpt:  string
  camera:   string
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_CAMERE: Camera[] = [
  { id:101, numero:'101', piano:'Primo Piano',  nome:'SGL CLASSICA',          tipo:'Singola Classic',  tipoRichiesto:'SNGL', checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:103, numero:'103', piano:'Primo Piano',  nome:'MAT ECONOMY',           tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:104, numero:'104', piano:'Primo Piano',  nome:'Doppia Classic',        tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:105, numero:'105', piano:'Primo Piano',  nome:'Doppia Classic',        tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:106, numero:'106', piano:'Primo Piano',  nome:'DOPPIA CLASSIC',        tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:107, numero:'107', piano:'Primo Piano',  nome:'MATRIMONIALE CLASSIC',  tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:108, numero:'108', piano:'Primo Piano',  nome:'DOPPIA CLASSIC',        tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:1,   numero:'1',   piano:'Piano Terra',  nome:'MAT + X',               tipo:'Tripla Classic',   tipoRichiesto:'TPL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:403, numero:'403', piano:'Quarto Piano', nome:'MAT ECONOMY',           tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:404, numero:'404', piano:'Quarto Piano', nome:'MAT ECONOMY',           tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:405, numero:'405', piano:'Quarto Piano', nome:'MAT ECONOMY',           tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:406, numero:'406', piano:'Quarto Piano', nome:'DOPPIA CLASSIC',        tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:407, numero:'407', piano:'Quarto Piano', nome:'DOPPIA CLASSIC',        tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
  { id:408, numero:'408', piano:'Quarto Piano', nome:'DOPPIA CLASSIC',        tipo:'Doppia Classic',   tipoRichiesto:'DBL',  checkIn:'No', stato:'',          prenotazioneId:'PREN-001' },
]

const MOCK_PRENOTAZIONE: Prenotazione = {
  id:        'PREN-001',
  dateIn:    '11/04/2026',
  dateOut:   '15/04/2026',
  nCamere:   8,
  nPersone:  16,
  genere:    'Studenti',
  naz:       'ITALIA',
  checkIn:   'No',
  nome:      '',
  stato:     'Opzionata',
  piano:     'Primo Piano',
  dataOpt:   '10/04/2026',
  camera:    '101',
}

const STRUTTURE = ['Hotel Tutorial', 'Grim\'s Hotel', 'Hotel Azzurro Mare']

// Camere disponibili per piano (mock) — usate in "Modifica assegnazione".
const AVAILABLE_ROOMS: Record<string, string[]> = {
  'Piano Terra':   ['2', '4', '6'],
  'Primo Piano':   ['102', '109', '110'],
  'Secondo Piano': ['201', '202', '205', '207'],
  'Terzo Piano':   ['301', '303', '308'],
  'Quarto Piano':  ['401', '402', '409'],
}
const PIANI = Object.keys(AVAILABLE_ROOMS)

// Colonne filtrabili della tabella
const COLS = [
  { key: 'numero',        label: 'Camera' },
  { key: 'piano',         label: 'Piano' },
  { key: 'nome',          label: 'Nome' },
  { key: 'tipo',          label: 'Tipo' },
  { key: 'tipoRichiesto', label: 'Tipo richiesto' },
  { key: 'checkIn',       label: 'Check-in' },
  { key: 'stato',         label: 'Stato' },
] as const

// Filtro colonna a imbuto: multi-selezione dei valori distinti della colonna.
function ColFilter({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const active = selected.length > 0
  const allSel = options.length > 0 && options.every(o => selected.includes(o))
  const toggle = (o: string) => onChange(selected.includes(o) ? selected.filter(x => x !== o) : [...selected, o])
  return (
    <span className="assegnazione__colh">
      <span className="assegnazione__colh-label">{label}</span>
      <button
        type="button"
        className={`assegnazione__filter-btn ${active ? 'is-on' : ''}`}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        aria-label={`Filtra ${label}`}
      >
        <i className="fa-solid fa-filter" aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="assegnazione__filter-overlay" onClick={e => { e.stopPropagation(); setOpen(false) }} />
          <div className="assegnazione__filter-pop" onClick={e => e.stopPropagation()}>
            <label className="assegnazione__filter-opt">
              <input type="checkbox" className="sib-checkbox" checked={allSel} onChange={() => onChange(allSel ? [] : [...options])} />
              <span>Tutti</span>
            </label>
            <div className="assegnazione__filter-sep" />
            {options.map(o => (
              <label key={o || '(vuoto)'} className="assegnazione__filter-opt">
                <input type="checkbox" className="sib-checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
                <span>{o || '(vuoto)'}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </span>
  )
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function Assegnazione({ navigate }: { navigate: (p: string) => void }) {
  const [calendario, setCalendario] = useState('2026-04-13')
  const [calendarioFine, setCalendarioFine] = useState('2026-04-14')
  const [struttura, setStruttura] = useState(STRUTTURE[0])

  const [cameras, setCameras]   = useState<Camera[]>(MOCK_CAMERE)
  const [selectedId, setSelectedId] = useState<number | null>(MOCK_CAMERE[0].id)
  // Modalità modifica assegnazione (cambio piano + scelta nuova camera).
  const [editMode, setEditMode]     = useState(false)
  const [editPiano, setEditPiano]   = useState(MOCK_CAMERE[0].piano)
  const [editCamera, setEditCamera] = useState<string | null>(null)

  // Filtri di colonna (imbuto): per ogni colonna una lista di valori ammessi.
  const [filters, setFilters] = useState<Record<string, string[]>>({})
  const distinct = (key: string) => Array.from(new Set(MOCK_CAMERE.map(c => String((c as any)[key])))).sort()
  const filteredCameras = cameras.filter(cam =>
    COLS.every(col => {
      const sel = filters[col.key]
      return !sel || sel.length === 0 || sel.includes(String((cam as any)[col.key]))
    }),
  )

  // Paginazione: 15 elementi per pagina
  const PAGE_SIZE = 15
  const [page, setPage] = useState(1)
  const setColFilter = (key: string, v: string[]) => { setFilters(f => ({ ...f, [key]: v })); setPage(1) }
  const totalPages = Math.max(1, Math.ceil(filteredCameras.length / PAGE_SIZE))
  const curPage = Math.min(page, totalPages)
  const pageCameras = filteredCameras.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE)

  const selectedCamera = cameras.find(c => c.id === selectedId) ?? null
  const prenotazione   = selectedCamera ? MOCK_PRENOTAZIONE : null
  const availableRooms = AVAILABLE_ROOMS[editPiano] ?? []

  // Visualizza dettagli: seleziona la camera ed esce dall'eventuale modifica.
  const viewCamera = (cam: Camera) => {
    setSelectedId(cam.id)
    setEditMode(false)
  }
  // Modifica assegnazione: seleziona la camera e apre l'editor (piano + camera).
  const editCameraStart = (cam: Camera) => {
    setSelectedId(cam.id)
    setEditPiano(cam.piano)
    setEditCamera(null)
    setEditMode(true)
  }
  const confermaAssegnazione = () => {
    if (!selectedCamera || !editCamera) return
    setCameras(prev => prev.map(c =>
      c.id === selectedCamera.id ? { ...c, piano: editPiano, numero: editCamera } : c,
    ))
    setEditMode(false)
  }

  return (
    <div className="assegnazione">
      <PageHead title="Assegnazione" subtitle="Visualizzazione dell'assegnazione delle camere proposte dall'AI di Sibylla e possibilità di modifica"/>

      {/* ── Filtri ── */}
      <div className="assegnazione__filters">
        <DateRangeField
          label="Calendario"
          nameFrom="calendario-da"
          nameTo="calendario-a"
          valueFrom={calendario}
          valueTo={calendarioFine}
          onChangeFrom={e => setCalendario(e.target.value)}
          onChangeTo={e => setCalendarioFine(e.target.value)}
        />
        <SelectField
          label="Strutture"
          name="struttura"
          className="w-[180px]"
          value={struttura}
          onChange={e => setStruttura(e.target.value)}
          options={STRUTTURE.map(s => ({ value: s, label: s }))}
        />
      </div>

      {/* ── Body ── */}
      <div className="assegnazione__body">

        {/* Tabella assegnazione */}
        <div className="assegnazione__table-card">
          <div className="assegnazione__table-wrap">
            <table className="sib-table assegnazione__table">
              <thead>
                <tr>
                  {COLS.map(col => (
                    <th key={col.key} className="assegnazione__th">
                      <ColFilter
                        label={col.label}
                        options={distinct(col.key)}
                        selected={filters[col.key] ?? []}
                        onChange={v => setColFilter(col.key, v)}
                      />
                    </th>
                  ))}
                  <th className="assegnazione__th">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {pageCameras.map(cam => (
                  <tr
                    key={cam.id}
                    className={`assegnazione__tr ${selectedId === cam.id ? 'assegnazione__tr--selected' : ''}`}
                    onClick={() => viewCamera(cam)}
                  >
                    <td><span className="assegnazione__camera-num">{cam.numero}</span></td>
                    <td>{cam.piano}</td>
                    <td>{cam.nome}</td>
                    <td>{cam.tipo}</td>
                    <td>
                      <span className="assegnazione__tipo-badge">
                        {cam.tipoRichiesto}
                      </span>
                    </td>
                    <td className={`assegnazione__checkin ${cam.checkIn === 'Sì' ? 'assegnazione__checkin--yes' : 'assegnazione__checkin--no'}`}>
                      {cam.checkIn}
                    </td>
                    <td>
                      {cam.stato
                        ? <span className={`assegnazione__stato-badge assegnazione__stato-badge--attivo`}>
                            {cam.stato}
                          </span>
                        : <span className="assegnazione__dash">—</span>
                      }
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Tooltip text="Visualizza dettagli">
                          <button className="sib-btn sib-btn--icon"
                            onClick={e => { e.stopPropagation(); viewCamera(cam) }} aria-label="Visualizza dettagli">
                            <i className="fa-solid fa-eye" aria-hidden="true" />
                          </button>
                        </Tooltip>
                        <Tooltip text="Modifica assegnazione">
                          <button className="sib-btn sib-btn--icon"
                            onClick={e => { e.stopPropagation(); editCameraStart(cam) }} aria-label="Modifica assegnazione">
                            <i className="fa-solid fa-pen" aria-hidden="true" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="assegnazione__pagination">
            <Pagination
              page={curPage}
              totalPages={totalPages}
              onPageChange={setPage}
              total={filteredCameras.length}
              pageSize={PAGE_SIZE}
            />
          </div>
        </div>

        {/* Pannello dettaglio */}
        <div className="assegnazione__detail-panel">
          <h2 className="assegnazione__detail-title">
            {editMode ? 'Modifica assegnazione' : 'Dettagli prenotazione'}
          </h2>
          {!prenotazione ? (
            <div className="assegnazione__detail-empty">
              <Ico n="eye" s={28} c={T.textDisabled} />
              <span>Seleziona una camera per vedere i dettagli della prenotazione</span>
            </div>
          ) : (
            <>
              <div className="assegnazione__detail-body">
                <div className="assegnazione__detail-grid">
                  <div className="assegnazione__detail-item">
                    <span className="assegnazione__detail-label">Date</span>
                    <span className="assegnazione__detail-value">{prenotazione.dateIn} - {prenotazione.dateOut}</span>
                  </div>
                  <div className="assegnazione__detail-item">
                    <span className="assegnazione__detail-label">N° camere</span>
                    <span className="assegnazione__detail-value">{prenotazione.nCamere}</span>
                  </div>
                  <div className="assegnazione__detail-item">
                    <span className="assegnazione__detail-label">N° persone</span>
                    <span className="assegnazione__detail-value">{prenotazione.nPersone}</span>
                  </div>
                  <div className="assegnazione__detail-item">
                    <span className="assegnazione__detail-label">Genere</span>
                    <span className="assegnazione__detail-value--normal assegnazione__detail-value">{prenotazione.genere}</span>
                  </div>
                  <div className="assegnazione__detail-item">
                    <span className="assegnazione__detail-label">Nazionalità</span>
                    <span className="assegnazione__detail-value--normal assegnazione__detail-value">{prenotazione.naz}</span>
                  </div>
                  <div className="assegnazione__detail-item">
                    <span className="assegnazione__detail-label">Check-in</span>
                    <span className="assegnazione__detail-value--normal assegnazione__detail-value">{prenotazione.checkIn}</span>
                  </div>
                  <div className="assegnazione__detail-item">
                    <span className="assegnazione__detail-label">Nome</span>
                    <span className="assegnazione__detail-value--normal assegnazione__detail-value">
                      {prenotazione.nome || <span className="assegnazione__dash">—</span>}
                    </span>
                  </div>
                  <div className="assegnazione__detail-item">
                    <span className="assegnazione__detail-label">Stato</span>
                    <span className="assegnazione__detail-value assegnazione__detail-value--warning">
                      {prenotazione.stato}
                    </span>
                  </div>
                  {/* Piano: in modifica diventa una select per cambiare piano */}
                  <div className="assegnazione__detail-item">
                    <span className="assegnazione__detail-label">Piano</span>
                    {editMode ? (
                      <SelectField
                        name="edit-piano"
                        value={editPiano}
                        onChange={e => { setEditPiano(e.target.value); setEditCamera(null) }}
                        options={PIANI.map(p => ({ value: p, label: p }))}
                      />
                    ) : (
                      <span className="assegnazione__detail-value--normal assegnazione__detail-value">{selectedCamera?.piano}</span>
                    )}
                  </div>
                  <div className="assegnazione__detail-item">
                    <span className="assegnazione__detail-label">Data opt</span>
                    <span className="assegnazione__detail-value--normal assegnazione__detail-value">{prenotazione.dataOpt}</span>
                  </div>
                  <div className="assegnazione__detail-item assegnazione__detail-item--full">
                    <span className="assegnazione__detail-label">Camera assegnata</span>
                    <span className="assegnazione__detail-value">{editMode ? (editCamera ?? selectedCamera?.numero) : selectedCamera?.numero}</span>
                  </div>
                </div>

                {/* Modifica: lista camere disponibili per il piano scelto */}
                {editMode && (
                  <div className="assegnazione__assign">
                    <span className="assegnazione__assign-title">Camere disponibili — {editPiano}</span>
                    {availableRooms.length ? (
                      <div className="assegnazione__rooms">
                        {availableRooms.map(r => (
                          <button
                            key={r}
                            type="button"
                            className={`assegnazione__room ${editCamera === r ? 'assegnazione__room--sel' : ''}`}
                            onClick={() => setEditCamera(r)}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="assegnazione__dash">Nessuna camera disponibile su questo piano</span>
                    )}
                  </div>
                )}
              </div>

              {editMode ? (
                <div className="assegnazione__detail-actions">
                  <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setEditMode(false)}>
                    Annulla
                  </button>
                  <button type="button" className="sib-btn sib-btn--primary" disabled={!editCamera} onClick={confermaAssegnazione}>
                    Assegna nuova camera
                  </button>
                </div>
              ) : (
                <button type="button" className="assegnazione__back-arrow" onClick={() => navigate('analisi-booking')}>
                  <Ico n="arrow-right" s={14} c={T.blue} />
                  Vai alla prenotazione completa
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
