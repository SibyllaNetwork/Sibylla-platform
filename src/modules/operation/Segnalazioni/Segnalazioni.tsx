import React, { useEffect, useMemo, useRef, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { DateRangeField, DatePickerField, InputField, RadioGroup, SelectField, TextareaField } from '../../../core/components/form'
import { avatarUrl } from '../../../core/avatar'
import { exportTableToXls, exportElementToPdf } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import './Segnalazioni.sass'

const PAGE_SIZE = 12

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Severita = 'media' | 'alta'
type StatoLav = 'da-assegnare' | 'in-corso' | 'completata'
type Reparto = 'Manutenzione' | 'Housekeeping' | 'Reception' | 'Cucina'
type GenereIntervento = 'Pulizia ordinaria' | 'Elettrico' | 'Manutenzione' | 'Idraulico'
type Priorita = 'Bassa' | 'Normale' | 'Alta' | 'Urgente'

interface Segnalazione {
  id: number
  segnalazioneDi: string
  severita: Severita
  reparto: Reparto
  hasFoto: boolean
  genereIntervento: GenereIntervento
  statoLavorazione: StatoLav
  descrizione: string
  struttura: string
  camera: string
  data: string // dd/mm/yyyy HH:MM
}

// ─── COSTANTI ─────────────────────────────────────────────────────────────────

const STRUTTURE = ['Hotel Tutorial', 'Hotel Archimede', 'Hotel Azzurro Mare']

const REPARTI: Reparto[] = ['Manutenzione', 'Housekeeping', 'Reception', 'Cucina']
const GENERI: GenereIntervento[] = ['Pulizia ordinaria', 'Elettrico', 'Manutenzione', 'Idraulico']
const PRIORITA: Priorita[] = ['Bassa', 'Normale', 'Alta', 'Urgente']
const STATI_LAV: StatoLav[] = ['da-assegnare', 'in-corso', 'completata']
const CAMERE_DISTINCT = ['101', '102', '103', '104', '105', '106']

const STATO_LAV_LABEL: Record<StatoLav, string> = {
  'da-assegnare': 'Da assegnare',
  'in-corso':     'In corso',
  'completata':   'Completata',
}

// icona del reparto (con tooltip = nome reparto)
const REPARTO_ICON: Record<Reparto, string> = {
  'Manutenzione': 'fa-screwdriver-wrench',
  'Housekeeping': 'fa-broom',
  'Reception':    'fa-bell-concierge',
  'Cucina':       'fa-utensils',
}

// icona del genere intervento (mostrata accanto al testo)
const GENERE_ICON: Record<GenereIntervento, string> = {
  'Pulizia ordinaria': 'fa-spray-can-sparkles',
  'Elettrico':         'fa-bolt',
  'Manutenzione':      'fa-toolbox',
  'Idraulico':         'fa-faucet-drip',
}

const SEVERITA_LABEL: Record<Severita, string> = {
  'media': 'Priorità media',
  'alta':  'Priorità alta',
}

// ─── MOCK ─────────────────────────────────────────────────────────────────────

const MOCK: Segnalazione[] = [
  { id: 1,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Housekeeping', hasFoto: true,  genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'in-corso',     descrizione: '',            struttura: 'Hotel Tutorial', camera: '101', data: '26/05/2026 17:16' },
  { id: 2,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Manutenzione', hasFoto: true,  genereIntervento: 'Elettrico',         statoLavorazione: 'in-corso',     descrizione: '',            struttura: 'Hotel Tutorial', camera: '101', data: '26/05/2026 17:15' },
  { id: 3,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Housekeeping', hasFoto: true,  genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'da-assegnare', descrizione: '',            struttura: 'Hotel Tutorial', camera: '101', data: '26/05/2026 16:59' },
  { id: 4,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Manutenzione', hasFoto: true,  genereIntervento: 'Manutenzione',      statoLavorazione: 'da-assegnare', descrizione: '',            struttura: 'Hotel Tutorial', camera: '101', data: '21/05/2026 14:49' },
  { id: 5,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Manutenzione', hasFoto: true,  genereIntervento: 'Elettrico',         statoLavorazione: 'da-assegnare', descrizione: '',            struttura: 'Hotel Tutorial', camera: '102', data: '24/06/2026 10:25' },
  { id: 6,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Housekeeping', hasFoto: true,  genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'da-assegnare', descrizione: '',            struttura: 'Hotel Tutorial', camera: '102', data: '21/05/2026 14:50' },
  { id: 7,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Manutenzione', hasFoto: true,  genereIntervento: 'Elettrico',         statoLavorazione: 'da-assegnare', descrizione: '',            struttura: 'Hotel Tutorial', camera: '102', data: '08/04/2026 12:03' },
  { id: 8,  segnalazioneDi: 'Rossi Mario', severita: 'alta',  reparto: 'Housekeeping', hasFoto: true,  genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'da-assegnare', descrizione: 'test 56',     struttura: 'Hotel Tutorial', camera: '103', data: '27/05/2026 10:19' },
  { id: 9,  segnalazioneDi: 'Rossi Mario', severita: 'alta',  reparto: 'Manutenzione', hasFoto: true,  genereIntervento: 'Manutenzione',      statoLavorazione: 'in-corso',     descrizione: '',            struttura: 'Hotel Tutorial', camera: '103', data: '07/04/2026 16:18' },
  { id: 10, segnalazioneDi: 'Rossi Mario', severita: 'alta',  reparto: 'Housekeeping', hasFoto: true,  genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'da-assegnare', descrizione: 'test Pulizie', struttura: 'Hotel Tutorial', camera: '104', data: '27/05/2026 10:18' },
  { id: 11, segnalazioneDi: 'Rossi Mario', severita: 'alta',  reparto: 'Manutenzione', hasFoto: true,  genereIntervento: 'Manutenzione',      statoLavorazione: 'in-corso',     descrizione: '',            struttura: 'Hotel Tutorial', camera: '104', data: '23/03/2026 11:52' },
  { id: 12, segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Housekeeping', hasFoto: true,  genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'in-corso',     descrizione: '',            struttura: 'Hotel Tutorial', camera: '105', data: '26/05/2026 17:09' },
  { id: 13, segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Manutenzione', hasFoto: false, genereIntervento: 'Idraulico',         statoLavorazione: 'completata',   descrizione: 'Perdita lavabo', struttura: 'Hotel Tutorial', camera: '105', data: '20/03/2026 09:30' },
  { id: 14, segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Reception',    hasFoto: false, genereIntervento: 'Elettrico',         statoLavorazione: 'completata',   descrizione: '',            struttura: 'Hotel Tutorial', camera: '106', data: '18/03/2026 08:12' },
]

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type ColFilterKey = 'severita' | 'reparto' | 'genereIntervento' | 'statoLavorazione' | 'camera'

export default function Segnalazioni(_props: { navigate?: (p: string) => void } = {}) {
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [dataDa, setDataDa] = useState('2026-01-01')
  const [dataA, setDataA] = useState('2026-06-26')
  const [reparto, setReparto] = useState<'Tutti' | Reparto>('Tutti')
  const [statoLav, setStatoLav] = useState<'Tutti' | StatoLav>('Tutti')
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [sortDataDir, setSortDataDir] = useState<'asc' | 'desc' | null>(null)
  const [editRow, setEditRow] = useState<Segnalazione | null>(null)
  const [assignRow, setAssignRow] = useState<Segnalazione | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const [openFilter, setOpenFilter] = useState<ColFilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColFilterKey, string[]>>({
    severita: [], reparto: [], genereIntervento: [], statoLavorazione: [], camera: [],
  })

  const toggleColFilter = (key: ColFilterKey, value: string) => {
    setColFilters((p) => {
      const cur = p[key]
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { ...p, [key]: next }
    })
  }
  const setAllColFilter = (key: ColFilterKey, all: string[], select: boolean) =>
    setColFilters((p) => ({ ...p, [key]: select ? [...all] : [] }))

  const parseData = (d: string) => {
    const [date] = d.split(' ')
    const [dd, mm, yy] = date.split('/').map(Number)
    const [, time] = d.split(' ')
    const [h, min] = (time ?? '00:00').split(':').map(Number)
    return new Date(yy, mm - 1, dd, h, min).getTime()
  }

  const filtered = useMemo(() => {
    let rows = MOCK.filter((r) => r.struttura === struttura)
    if (reparto !== 'Tutti') rows = rows.filter((r) => r.reparto === reparto)
    if (statoLav !== 'Tutti') rows = rows.filter((r) => r.statoLavorazione === statoLav)
    if (colFilters.severita.length)         rows = rows.filter((r) => colFilters.severita.includes(r.severita))
    if (colFilters.reparto.length)          rows = rows.filter((r) => colFilters.reparto.includes(r.reparto))
    if (colFilters.genereIntervento.length) rows = rows.filter((r) => colFilters.genereIntervento.includes(r.genereIntervento))
    if (colFilters.statoLavorazione.length) rows = rows.filter((r) => colFilters.statoLavorazione.includes(r.statoLavorazione))
    if (colFilters.camera.length)           rows = rows.filter((r) => colFilters.camera.includes(r.camera))
    if (sortDataDir) {
      const dir = sortDataDir === 'asc' ? 1 : -1
      rows = [...rows].sort((a, b) => (parseData(a.data) - parseData(b.data)) * dir)
    }
    return rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [struttura, reparto, statoLav, colFilters, sortDataDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [reparto, statoLav, struttura, colFilters, dataDa, dataA])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const toggleSortData = () => {
    if (sortDataDir === null) setSortDataDir('asc')
    else if (sortDataDir === 'asc') setSortDataDir('desc')
    else setSortDataDir(null)
  }

  const esportaXls = () => {
    const header = ['Segnalazione di', 'Priorità', 'Reparto', 'Foto', 'Genere intervento', 'Stato lavorazione', 'Descrizione', 'Struttura', 'Camera', 'Data']
    const rows = filtered.map((r) => [
      r.segnalazioneDi, SEVERITA_LABEL[r.severita], r.reparto, r.hasFoto ? 'Sì' : 'No',
      r.genereIntervento, STATO_LAV_LABEL[r.statoLavorazione], r.descrizione, r.struttura, r.camera, r.data,
    ])
    exportTableToXls('segnalazioni.xls', header, rows, 'Segnalazioni')
  }
  const esportaPdf = () => exportElementToPdf(tableRef.current, 'segnalazioni.pdf', 'Segnalazioni')

  return (
    <div className="segnal">
      <BtnBack />
      <PageHeader
        title="Segnalazioni"
        subtitle="Gestione delle richieste di intervento tecnico/operativo all'interno della struttura con tracking in tempo reale"
      />

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="segnal__bar">
        <div className="segnal__bar-left">
          <div className="segnal__field">
            <DateRangeField
              nameFrom="dataDa" nameTo="dataA" label="Data"
              valueFrom={dataDa} valueTo={dataA}
              onChangeFrom={(e) => setDataDa(e.target.value)} onChangeTo={(e) => setDataA(e.target.value)}
            />
          </div>
          <div className="segnal__field">
            <SelectField
              name="reparto" label="Reparto" className="segnal__select"
              value={reparto} onChange={(e) => setReparto(e.target.value as any)}
              options={[{ value: 'Tutti', label: 'Tutti' }, ...REPARTI.map((r) => ({ value: r, label: r }))]}
            />
          </div>
          <div className="segnal__field">
            <SelectField
              name="statoLav" label="Stato lavorazione" className="segnal__select"
              value={statoLav} onChange={(e) => setStatoLav(e.target.value as any)}
              options={[{ value: 'Tutti', label: 'Tutti' }, ...STATI_LAV.map((s) => ({ value: s, label: STATO_LAV_LABEL[s] }))]}
            />
          </div>
          <div className="segnal__field">
            <SelectField
              name="struttura" label="Strutture" className="segnal__select"
              value={struttura} onChange={(e) => setStruttura(e.target.value)}
              options={STRUTTURE.map((s) => ({ value: s, label: s }))}
            />
          </div>
        </div>

        <div className="segnal__bar-right">
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setShowModal(true)}>
            <i className="fa-light fa-plus" /> Crea segnalazione
          </button>
          <Tooltip text="Esporta in Excel">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta XLS" onClick={esportaXls}><i className="fa-light fa-file-excel" /></button>
          </Tooltip>
          <Tooltip text="Esporta in PDF">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta PDF" onClick={esportaPdf}><i className="fa-light fa-file-pdf" /></button>
          </Tooltip>
        </div>
      </div>

      {/* ─── Tabella ───────────────────────────────────────────────────────── */}
      <div className="sib-table-wrap">
        <table className="sib-table segnal__table" ref={tableRef}>
          <thead>
            <tr>
              <th>Segnalazione di</th>
              <th className="segnal__th-center">
                <ColFilterHeader label="Status" center options={['media', 'alta']} optionLabel={(v) => SEVERITA_LABEL[v as Severita]}
                  selected={colFilters.severita} open={openFilter === 'severita'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'severita' ? null : 'severita')}
                  onToggle={(v) => toggleColFilter('severita', v)} onSelectAll={(s) => setAllColFilter('severita', ['media', 'alta'], s)} />
              </th>
              <th className="segnal__th-center">
                <ColFilterHeader label="Reparto" center options={REPARTI}
                  selected={colFilters.reparto} open={openFilter === 'reparto'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'reparto' ? null : 'reparto')}
                  onToggle={(v) => toggleColFilter('reparto', v)} onSelectAll={(s) => setAllColFilter('reparto', REPARTI, s)} />
              </th>
              <th className="segnal__th-center">Foto</th>
              <th>
                <ColFilterHeader label="Genere intervento" options={GENERI}
                  selected={colFilters.genereIntervento} open={openFilter === 'genereIntervento'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'genereIntervento' ? null : 'genereIntervento')}
                  onToggle={(v) => toggleColFilter('genereIntervento', v)} onSelectAll={(s) => setAllColFilter('genereIntervento', GENERI, s)} />
              </th>
              <th>
                <ColFilterHeader label="Stato lavorazione" options={STATI_LAV} optionLabel={(v) => STATO_LAV_LABEL[v as StatoLav]}
                  selected={colFilters.statoLavorazione} open={openFilter === 'statoLavorazione'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'statoLavorazione' ? null : 'statoLavorazione')}
                  onToggle={(v) => toggleColFilter('statoLavorazione', v)} onSelectAll={(s) => setAllColFilter('statoLavorazione', STATI_LAV, s)} />
              </th>
              <th>Descrizione</th>
              <th>Struttura</th>
              <th className="segnal__th-center">
                <ColFilterHeader label="Camera" center options={CAMERE_DISTINCT}
                  selected={colFilters.camera} open={openFilter === 'camera'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'camera' ? null : 'camera')}
                  onToggle={(v) => toggleColFilter('camera', v)} onSelectAll={(s) => setAllColFilter('camera', CAMERE_DISTINCT, s)} />
              </th>
              <th className="segnal__th-sortable" onClick={toggleSortData}>
                Data {sortDataDir === null
                  ? <i className="fa-light fa-arrow-down-arrow-up segnal__sort-ico" />
                  : sortDataDir === 'asc'
                    ? <i className="fa-solid fa-arrow-up segnal__sort-ico" />
                    : <i className="fa-solid fa-arrow-down segnal__sort-ico" />}
              </th>
              <th className="segnal__th-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={11} className="sib-empty">Nessuna segnalazione trovata.</td></tr>
            ) : pageRows.map((s) => (
              <tr key={s.id}>
                <td>
                  <span className="segnal__user">
                    <img className="segnal__avatar" src={avatarUrl(s.segnalazioneDi)} alt="" />
                    <span className="segnal__user-name">{s.segnalazioneDi}</span>
                  </span>
                </td>
                <td className="segnal__td-center">
                  <Tooltip text={SEVERITA_LABEL[s.severita]}>
                    <i className={`fa-solid fa-triangle-exclamation segnal__sev segnal__sev--${s.severita}`} />
                  </Tooltip>
                </td>
                <td className="segnal__td-center">
                  <Tooltip text={s.reparto}>
                    <i className={`fa-light ${REPARTO_ICON[s.reparto]} segnal__rep-ico`} />
                  </Tooltip>
                </td>
                <td className="segnal__td-center">
                  {s.hasFoto ? (
                    <Tooltip text="Visualizza foto">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Visualizza foto"><i className="fa-light fa-eye" /></button>
                    </Tooltip>
                  ) : <span className="sib-cell--muted">-</span>}
                </td>
                <td>
                  <span className="segnal__genere">
                    <i className={`fa-light ${GENERE_ICON[s.genereIntervento]} segnal__gen-ico`} />
                    {s.genereIntervento}
                  </span>
                </td>
                <td><span className={`segnal__stato segnal__stato--${s.statoLavorazione}`}>{STATO_LAV_LABEL[s.statoLavorazione]}</span></td>
                <td>{s.descrizione || <span className="sib-cell--muted">-</span>}</td>
                <td>{s.struttura}</td>
                <td className="segnal__td-center">{s.camera}</td>
                <td className="segnal__nowrap">{s.data}</td>
                <td className="segnal__td-center">
                  <div className="segnal__actions">
                    <Tooltip text="Assegna intervento">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Assegna intervento" onClick={() => setAssignRow(s)}><i className="fa-light fa-user-gear" /></button>
                    </Tooltip>
                    <Tooltip text="Modifica segnalazione">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => setEditRow(s)}><i className="fa-light fa-pen" /></button>
                    </Tooltip>
                    <Tooltip text="Elimina segnalazione">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina"><i className="fa-light fa-trash-can" /></button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="segnal__pagination">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <CreaSegnalazioneModal open={showModal} strutture={STRUTTURE} onClose={() => setShowModal(false)} />
      <ModificaSegnalazioneModal row={editRow} strutture={STRUTTURE} onClose={() => setEditRow(null)} />
      <AssegnaInterventoModal row={assignRow} onClose={() => setAssignRow(null)} />
    </div>
  )
}

// ─── COL FILTER HEADER ────────────────────────────────────────────────────────

interface ColFilterHeaderProps {
  label: string
  options: string[]
  optionLabel?: (v: string) => string
  selected: string[]
  open: boolean
  center?: boolean
  onToggleOpen: () => void
  onToggle: (value: string) => void
  onSelectAll: (select: boolean) => void
}

function ColFilterHeader(props: ColFilterHeaderProps) {
  const { label, options, optionLabel, selected, open, center, onToggleOpen, onToggle, onSelectAll } = props
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0
  return (
    <div className={'sg-colfilter' + (center ? ' sg-colfilter--center' : '')}>
      <span>{label}</span>
      <button type="button" className={'sg-colfilter__btn' + (hasFilter ? ' sg-colfilter__btn--active' : '')}
        onClick={onToggleOpen} aria-label={`Filtra per ${label}`}>
        <i className="fa-solid fa-filter" />
      </button>
      {open && (
        <>
          <div className="sg-colfilter__overlay" onClick={onToggleOpen} />
          <div className="sg-colfilter__popup" onClick={(e) => e.stopPropagation()}>
            <div className="sg-colfilter__title">scelte multiple</div>
            <label className="sg-colfilter__option">
              <input type="checkbox" className="sib-checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} />
              <span>Tutti</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="sg-colfilter__option">
                <input type="checkbox" className="sib-checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
                <span>{optionLabel ? optionLabel(opt) : opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── MODAL: Aggiungi segnalazione ────────────────────────────────────────────

function CreaSegnalazioneModal({ open, strutture, onClose }: { open: boolean; strutture: string[]; onClose: () => void }) {
  const [struttura, setStruttura] = useState('')
  const [genereIntervento, setGenereIntervento] = useState<GenereIntervento>('Elettrico')
  const [reparto, setReparto] = useState<Reparto>('Manutenzione')
  const [priorita, setPriorita] = useState<Priorita>('Normale')
  const [camera, setCamera] = useState('')
  const [areaComune, setAreaComune] = useState('')
  const [descrizione, setDescrizione] = useState('')

  return (
    <Modal open={open} onClose={onClose} title="Aggiungi segnalazione" size="lg">
      <div className="segnal__modal-body">
        <div className="segnal__modal-grid">
          <SelectField
            name="struttura" label="Struttura"
            value={struttura} onChange={(e) => setStruttura(e.target.value)}
            options={[{ value: '', label: '' }, ...strutture.map((s) => ({ value: s, label: s }))]}
          />
          <SelectField
            name="genereIntervento" label="Genere Intervento"
            value={genereIntervento} onChange={(e) => setGenereIntervento(e.target.value as GenereIntervento)}
            options={GENERI.map((g) => ({ value: g, label: g }))}
          />
          <SelectField
            name="reparto" label="Reparto"
            value={reparto} onChange={(e) => setReparto(e.target.value as Reparto)}
            options={REPARTI.map((r) => ({ value: r, label: r }))}
          />
          <SelectField
            name="priorita" label="Priorità"
            value={priorita} onChange={(e) => setPriorita(e.target.value as Priorita)}
            options={PRIORITA.map((p) => ({ value: p, label: p }))}
          />
          <SelectField
            name="camera" label="Camere"
            value={camera} onChange={(e) => setCamera(e.target.value)}
            options={[{ value: '', label: 'Seleziona' }, ...CAMERE_DISTINCT.map((c) => ({ value: c, label: c }))]}
          />
          <InputField
            name="areaComune" label="Area comune"
            value={areaComune} onChange={(e) => setAreaComune(e.target.value)}
          />
        </div>
        <TextareaField
          name="descrizione" label="Descrizione" rows={3}
          value={descrizione} onChange={(e) => setDescrizione(e.target.value)}
        />
      </div>
      <div className="segnal__modal-foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Aggiungi</button>
      </div>
    </Modal>
  )
}

// ─── MODAL: Modifica segnalazione ────────────────────────────────────────────

// dd/mm/yyyy[ HH:MM] → yyyy-mm-dd (per l'input date nativo)
const toIsoDate = (d: string) => {
  const [dd, mm, yy] = d.split(' ')[0].split('/')
  return `${yy}-${mm}-${dd}`
}

function ModificaSegnalazioneModal({ row, strutture, onClose }: { row: Segnalazione | null; strutture: string[]; onClose: () => void }) {
  const [data, setData] = useState('')
  const [struttura, setStruttura] = useState('')
  const [reparto, setReparto] = useState<Reparto>('Manutenzione')
  const [camera, setCamera] = useState('')
  const [severita, setSeverita] = useState<Severita>('media')
  const [genereIntervento, setGenereIntervento] = useState<GenereIntervento>('Elettrico')
  const [statoLavorazione, setStatoLavorazione] = useState<StatoLav>('da-assegnare')
  const [descrizione, setDescrizione] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!row) return
    setData(toIsoDate(row.data))
    setStruttura(row.struttura)
    setReparto(row.reparto)
    setCamera(row.camera)
    setSeverita(row.severita)
    setGenereIntervento(row.genereIntervento)
    setStatoLavorazione(row.statoLavorazione)
    setDescrizione(row.descrizione)
    setNote('')
  }, [row])

  return (
    <Modal open={!!row} onClose={onClose} title="Modifica Segnalazione" size="xl">
      <div className="segnal__modal-body">
        <div className="segnal__modal-grid-4">
          <InputField name="utenza" label="Utenza" value={row?.segnalazioneDi ?? ''} onChange={() => {}} readOnly />
          <DatePickerField name="data" label="Data" value={data} onChange={(e) => setData(e.target.value)} />
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)}
            options={strutture.map((s) => ({ value: s, label: s }))} />
          <SelectField name="reparto" label="Reparto" value={reparto} onChange={(e) => setReparto(e.target.value as Reparto)}
            options={REPARTI.map((r) => ({ value: r, label: r }))} />

          <InputField name="camera" label="Camera" value={camera} onChange={(e) => setCamera(e.target.value)} />
          <RadioGroup name="severita" label="Status" value={severita} onChange={(v) => setSeverita(v as Severita)}
            options={[{ value: 'alta', label: 'Urgenti' }, { value: 'media', label: 'Ordinarie' }]} />
          <SelectField name="genere" label="Genere intervento" value={genereIntervento} onChange={(e) => setGenereIntervento(e.target.value as GenereIntervento)}
            options={GENERI.map((g) => ({ value: g, label: g }))} />
          <SelectField name="statoLav" label="Stato lavorazione" value={statoLavorazione} onChange={(e) => setStatoLavorazione(e.target.value as StatoLav)}
            options={STATI_LAV.map((s) => ({ value: s, label: STATO_LAV_LABEL[s] }))} />
        </div>
        <div className="segnal__modal-grid">
          <InputField name="descrizione" label="Descrizione" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
          <InputField name="note" label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div className="segnal__modal-foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Salva</button>
      </div>
    </Modal>
  )
}

// ─── MODAL: Assegna intervento ───────────────────────────────────────────────

interface Dipendente {
  nome: string
  reparto: Reparto
}

const DIPENDENTI: Dipendente[] = [
  { nome: 'dino tacchini', reparto: 'Manutenzione' },
  { nome: 'Scontrino test', reparto: 'Manutenzione' },
  { nome: 'Paolo Greco',    reparto: 'Manutenzione' },
  { nome: 'Andrea G Test',  reparto: 'Housekeeping' },
  { nome: 'Marco Campo',    reparto: 'Housekeeping' },
  { nome: 'Luca Ferri',     reparto: 'Reception' },
  { nome: 'Sara Conti',     reparto: 'Cucina' },
]

function AssegnaInterventoModal({ row, onClose }: { row: Segnalazione | null; onClose: () => void }) {
  // all'apertura la lista è filtrata sul reparto della segnalazione
  const [repFilter, setRepFilter] = useState<'Tutti' | Reparto>('Tutti')
  const [assegnato, setAssegnato] = useState<Dipendente | null>(null)

  useEffect(() => {
    if (!row) return
    setRepFilter(row.reparto)
    setAssegnato(null)
  }, [row])

  // gli utenti del reparto della segnalazione vengono mostrati per primi
  const lista = useMemo(() => {
    const base = repFilter === 'Tutti' ? DIPENDENTI : DIPENDENTI.filter((d) => d.reparto === repFilter)
    return [...base].sort((a, b) => {
      const am = a.reparto === row?.reparto ? 0 : 1
      const bm = b.reparto === row?.reparto ? 0 : 1
      return am - bm
    })
  }, [repFilter, row])

  return (
    <Modal open={!!row} onClose={onClose} title="Assegna intervento" size="sm">
      {assegnato ? (
        <div className="segnal__assign-done">
          <i className="fa-solid fa-circle-check segnal__assign-done-ico" />
          <div className="segnal__assign-done-title">Intervento assegnato a {assegnato.nome}</div>
          <div className="segnal__assign-done-text">
            Una notifica è stata inviata a <strong>{assegnato.nome}</strong> ({assegnato.reparto}) per avvisarlo del nuovo intervento da gestire.
          </div>
          <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Chiudi</button>
        </div>
      ) : (
        <>
          <div className="segnal__assign-meta">
            Segnalazione id: {row?.id} del {row?.data}<br />
            Struttura: {row?.struttura} - Camera: {row?.camera}<br />
            Genere intervento: {row?.genereIntervento} · Reparto: {row?.reparto}
          </div>
          <div className="segnal__assign-filter">
            <SelectField
              name="repFilter" label="Reparto"
              value={repFilter} onChange={(e) => setRepFilter(e.target.value as 'Tutti' | Reparto)}
              options={[{ value: 'Tutti', label: 'Tutti i reparti' }, ...REPARTI.map((r) => ({ value: r, label: r }))]}
            />
          </div>
          <div className="segnal__assign-title">Utenti</div>
          <div className="segnal__assign-list">
            {lista.length === 0 ? (
              <div className="sib-empty">Nessun utente per questo reparto.</div>
            ) : lista.map((d) => {
              const match = d.reparto === row?.reparto
              return (
                <button
                  key={d.nome} type="button"
                  className={'segnal__assign-item' + (match ? ' segnal__assign-item--match' : '')}
                  onClick={() => setAssegnato(d)}
                >
                  <img className="segnal__assign-avatar" src={avatarUrl(d.nome)} alt="" />
                  <span className="segnal__assign-name">{d.nome}</span>
                  {match && <span className="segnal__assign-badge">Consigliato</span>}
                  <span className="segnal__assign-rep">{d.reparto}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </Modal>
  )
}
