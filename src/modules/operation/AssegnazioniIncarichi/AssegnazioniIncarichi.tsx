import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell,
  PieChart, Pie, Legend, Tooltip as RTooltip,
} from 'recharts'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { DateRangeField, InputField, SelectField, TextareaField, CheckboxField, SearchField } from '../../../core/components/form'
import { avatarUrl } from '../../../core/avatar'
import { exportTableToXls, exportElementToPdf } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import { useConfirmStore } from '../../../store/useConfirmStore'
import './AssegnazioniIncarichi.sass'

const PAGE_SIZE = 12

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Severita = 'media' | 'alta'
type StatoLav = 'nuova' | 'in-corso' | 'terminata'
type Reparto = 'Manutenzione' | 'Magazzino' | 'Pulizie' | 'Front Office'
type GenereIntervento = 'Elettrico' | 'Idraulico' | 'Edile' | 'Pulizie' | 'Altro'
type Priorita = 'Bassa' | 'Normale' | 'Alta' | 'Urgente'
type Tipologia = 'Ordinaria' | 'Straordinaria' | 'Urgente'

interface Operatore {
  id: number
  nominativo: string
  reparti: Reparto[]
  numeroAssegnazioni: number
  idAssegnazioni: number[]
}

interface PendingItem {
  id: number
  reparto: Reparto
  struttura: string
  camera: string
  descrizione: string
}

interface Incarico {
  id: number
  cameraNum: string
  dataAssegnazione: string // dd/mm/yyyy
  struttura: string
  reparto: Reparto
  descrizione: string
  severita: Severita
  assegnatoA: string
  statoLavorazione: StatoLav
}

// ─── COSTANTI ─────────────────────────────────────────────────────────────────

const STRUTTURE = ['Hotel Tutorial', 'Hotel Archimede', 'Hotel Azzurro Mare']
const REPARTI: Reparto[] = ['Manutenzione', 'Magazzino', 'Pulizie', 'Front Office']
const GENERI: GenereIntervento[] = ['Elettrico', 'Idraulico', 'Edile', 'Pulizie', 'Altro']
const PRIORITA: Priorita[] = ['Bassa', 'Normale', 'Alta', 'Urgente']
const TIPOLOGIE: Tipologia[] = ['Ordinaria', 'Straordinaria', 'Urgente']
const STATI_LAV: StatoLav[] = ['nuova', 'in-corso', 'terminata']
const CAMERE_DISTINCT = ['101', '102', '103', '104', '105', '106', '201', '219', '302', '319']

const STATO_LAV_LABEL: Record<StatoLav, string> = {
  'nuova':      'Nuova',
  'in-corso':   'In corso',
  'terminata':  'Terminata',
}
const SEVERITA_LABEL: Record<Severita, string> = {
  'media': 'Priorità media',
  'alta':  'Priorità alta',
}
// icona del reparto (con tooltip = nome reparto)
const REPARTO_ICON: Record<Reparto, string> = {
  'Manutenzione': 'fa-screwdriver-wrench',
  'Magazzino':    'fa-boxes-stacked',
  'Pulizie':      'fa-broom',
  'Front Office': 'fa-bell-concierge',
}

// ─── MOCK ─────────────────────────────────────────────────────────────────────

const MOCK: Incarico[] = [
  { id: 60, cameraNum: '219', dataAssegnazione: '07/04/2026', struttura: 'Hotel Tutorial', reparto: 'Manutenzione', descrizione: 'lampadina fulminata', severita: 'media', assegnatoA: 'dino tacchini', statoLavorazione: 'nuova' },
  { id: 61, cameraNum: '319', dataAssegnazione: '07/04/2026', struttura: 'Hotel Tutorial', reparto: 'Manutenzione', descrizione: 'junhjuhyb',           severita: 'alta',  assegnatoA: 'dino tacchini', statoLavorazione: 'nuova' },
  { id: 62, cameraNum: '103', dataAssegnazione: '07/04/2026', struttura: 'Hotel Tutorial', reparto: 'Manutenzione', descrizione: '',                    severita: 'alta',  assegnatoA: 'dino tacchini', statoLavorazione: 'nuova' },
  { id: 63, cameraNum: '101', dataAssegnazione: '08/04/2026', struttura: 'Hotel Tutorial', reparto: 'Manutenzione', descrizione: 'test',                severita: 'media', assegnatoA: 'dino tacchini', statoLavorazione: 'terminata' },
  { id: 64, cameraNum: '302', dataAssegnazione: '09/04/2026', struttura: 'Hotel Tutorial', reparto: 'Magazzino',    descrizione: '',                    severita: 'media', assegnatoA: 'dino tacchini', statoLavorazione: 'terminata' },
  { id: 65, cameraNum: '101', dataAssegnazione: '09/04/2026', struttura: 'Hotel Tutorial', reparto: 'Manutenzione', descrizione: '',                    severita: 'alta',  assegnatoA: 'dino tacchini', statoLavorazione: 'terminata' },
  { id: 65, cameraNum: '102', dataAssegnazione: '09/04/2026', struttura: 'Hotel Tutorial', reparto: 'Manutenzione', descrizione: '',                    severita: 'alta',  assegnatoA: 'dino tacchini', statoLavorazione: 'terminata' },
  { id: 65, cameraNum: '103', dataAssegnazione: '09/04/2026', struttura: 'Hotel Tutorial', reparto: 'Manutenzione', descrizione: '',                    severita: 'alta',  assegnatoA: 'dino tacchini', statoLavorazione: 'terminata' },
  { id: 65, cameraNum: '104', dataAssegnazione: '09/04/2026', struttura: 'Hotel Tutorial', reparto: 'Manutenzione', descrizione: '',                    severita: 'alta',  assegnatoA: 'dino tacchini', statoLavorazione: 'terminata' },
  { id: 66, cameraNum: '105', dataAssegnazione: '10/04/2026', struttura: 'Hotel Tutorial', reparto: 'Pulizie',      descrizione: 'pulizia straordinaria', severita: 'media', assegnatoA: 'Pieri Matteo', statoLavorazione: 'in-corso' },
  { id: 67, cameraNum: '106', dataAssegnazione: '11/04/2026', struttura: 'Hotel Tutorial', reparto: 'Front Office', descrizione: 'verifica telefono camera', severita: 'media', assegnatoA: 'Sara Conti', statoLavorazione: 'in-corso' },
  { id: 68, cameraNum: '201', dataAssegnazione: '12/04/2026', struttura: 'Hotel Archimede', reparto: 'Manutenzione', descrizione: 'rubinetto gocciolante', severita: 'alta',  assegnatoA: 'Pieri Matteo', statoLavorazione: 'nuova' },
]

const OPERATORI: Operatore[] = [
  { id: 20, nominativo: 'Pieri Matteo',  reparti: ['Magazzino', 'Pulizie', 'Manutenzione'], numeroAssegnazioni: 3, idAssegnazioni: [66, 68] },
  { id: 21, nominativo: 'dino tacchini', reparti: ['Manutenzione'],                          numeroAssegnazioni: 9, idAssegnazioni: [60, 61, 62, 63, 64, 65] },
  { id: 22, nominativo: 'Sara Conti',    reparti: ['Front Office', 'Pulizie'],               numeroAssegnazioni: 2, idAssegnazioni: [67] },
]

const SEGNALAZIONI_PENDING: PendingItem[] = [
  { id: 101, reparto: 'Manutenzione', struttura: 'Hotel Tutorial', camera: '210', descrizione: 'Perdita lavabo' },
  { id: 102, reparto: 'Pulizie',      struttura: 'Hotel Tutorial', camera: '108', descrizione: 'Moquette da pulire' },
]
const INCARICHI_PENDING: PendingItem[] = [
  { id: 201, reparto: 'Magazzino', struttura: 'Hotel Tutorial', camera: '-', descrizione: 'Rifornimento minibar piano 2' },
]

// dd/mm/yyyy corrente
const formatDate = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}
const parseData = (d: string) => {
  const [dd, mm, yy] = d.split('/').map(Number)
  return new Date(yy, mm - 1, dd).getTime()
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type ColFilterKey = 'cameraNum' | 'reparto' | 'severita' | 'assegnatoA'

export default function AssegnazioniIncarichi(_props: { navigate?: (p: string) => void } = {}) {
  const [rows, setRows] = useState<Incarico[]>(MOCK)
  const [page, setPage] = useState(1)
  const [dataDa, setDataDa] = useState('2026-04-01')
  const [dataA, setDataA] = useState('2026-06-30')
  const [reparto, setReparto] = useState<'Tutti' | Reparto>('Tutti')
  const [statoLav, setStatoLav] = useState<'Tutti' | StatoLav>('Tutti')
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  const [search, setSearch] = useState('')
  const [sortDataDir, setSortDataDir] = useState<'asc' | 'desc' | null>('asc')
  const tableRef = useRef<HTMLTableElement>(null)
  const confirm = useConfirmStore((s) => s.confirm)

  const [showStat, setShowStat] = useState(false)
  const [showManuale, setShowManuale] = useState(false)
  const [editRow, setEditRow] = useState<Incarico | null>(null)
  const [creaOpen, setCreaOpen] = useState(false)

  const [openFilter, setOpenFilter] = useState<ColFilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColFilterKey, string[]>>({
    cameraNum: [], reparto: [], severita: [], assegnatoA: [],
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

  const camereDistinct = useMemo(
    () => Array.from(new Set(rows.map((i) => i.cameraNum))).sort(),
    [rows],
  )
  const assegnatoADistinct = useMemo(
    () => Array.from(new Set(rows.map((i) => i.assegnatoA))).sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    let out = rows.filter((r) => r.struttura === struttura)
    if (reparto !== 'Tutti') out = out.filter((r) => r.reparto === reparto)
    if (statoLav !== 'Tutti') out = out.filter((r) => r.statoLavorazione === statoLav)
    const q = search.toLowerCase().trim()
    if (q) out = out.filter((r) =>
      r.cameraNum.toLowerCase().includes(q) ||
      r.descrizione.toLowerCase().includes(q) ||
      r.assegnatoA.toLowerCase().includes(q),
    )
    if (colFilters.cameraNum.length)  out = out.filter((r) => colFilters.cameraNum.includes(r.cameraNum))
    if (colFilters.reparto.length)    out = out.filter((r) => colFilters.reparto.includes(r.reparto))
    if (colFilters.severita.length)   out = out.filter((r) => colFilters.severita.includes(r.severita))
    if (colFilters.assegnatoA.length) out = out.filter((r) => colFilters.assegnatoA.includes(r.assegnatoA))
    if (sortDataDir) {
      const dir = sortDataDir === 'asc' ? 1 : -1
      out = [...out].sort((a, b) => (parseData(a.dataAssegnazione) - parseData(b.dataAssegnazione)) * dir)
    }
    return out
  }, [rows, struttura, reparto, statoLav, search, colFilters, sortDataDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [reparto, statoLav, struttura, colFilters, search, dataDa, dataA])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const toggleSortData = () => {
    if (sortDataDir === null) setSortDataDir('asc')
    else if (sortDataDir === 'asc') setSortDataDir('desc')
    else setSortDataDir(null)
  }

  const saveIncarico = (inc: Incarico, isNew: boolean) => {
    if (isNew) {
      const newId = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1
      setRows((prev) => [{ ...inc, id: newId }, ...prev])
      setStruttura(inc.struttura)
    } else {
      setRows((prev) => prev.map((r) => (r === editRow ? inc : r)))
    }
    setCreaOpen(false)
    setEditRow(null)
  }
  const deleteIncarico = async (target: Incarico) => {
    const ok = await confirm({
      title: 'Elimina incarico',
      message: <>Vuoi eliminare l’incarico <strong>#{target.id}</strong> (camera {target.cameraNum})? L’operazione non è reversibile.</>,
    })
    if (ok) setRows((prev) => prev.filter((r) => r !== target))
  }

  const esportaXls = () => {
    const header = ['ID', 'N° Camera', 'Data ass.', 'Struttura', 'Reparto', 'Descrizione', 'Status', 'Assegnato a', 'Stato lavorazione']
    const data = filtered.map((r) => [
      r.id, r.cameraNum, r.dataAssegnazione, r.struttura, r.reparto, r.descrizione,
      SEVERITA_LABEL[r.severita], r.assegnatoA, STATO_LAV_LABEL[r.statoLavorazione],
    ])
    exportTableToXls('assegnazione-incarichi.xls', header, data, 'Assegnazione incarichi')
  }
  const esportaPdf = () => exportElementToPdf(tableRef.current, 'assegnazione-incarichi.pdf', 'Assegnazione incarichi')

  return (
    <div className="ass-inc">
      <BtnBack />
      <PageHeader
        title="Assegnazione incarichi"
        subtitle="Creazione rapida e gestione di task operative con assegnazione automatica o manuale delle attività al personale disponibile"
      />

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="ass-inc__bar">
        <div className="ass-inc__bar-left">
          <div className="ass-inc__field">
            <DateRangeField
              nameFrom="dataDa" nameTo="dataA" label="Data"
              valueFrom={dataDa} valueTo={dataA}
              onChangeFrom={(e) => setDataDa(e.target.value)} onChangeTo={(e) => setDataA(e.target.value)}
            />
          </div>
          <div className="ass-inc__field">
            <SelectField
              name="reparto" label="Reparto" className="ass-inc__select"
              value={reparto} onChange={(e) => setReparto(e.target.value as 'Tutti' | Reparto)}
              options={[{ value: 'Tutti', label: 'Tutti' }, ...REPARTI.map((r) => ({ value: r, label: r }))]}
            />
          </div>
          <div className="ass-inc__field">
            <SelectField
              name="statoLav" label="Stato lavorazione" className="ass-inc__select"
              value={statoLav} onChange={(e) => setStatoLav(e.target.value as 'Tutti' | StatoLav)}
              options={[{ value: 'Tutti', label: 'Tutti' }, ...STATI_LAV.map((s) => ({ value: s, label: STATO_LAV_LABEL[s] }))]}
            />
          </div>
          <div className="ass-inc__field">
            <SelectField
              name="struttura" label="Strutture" className="ass-inc__select"
              value={struttura} onChange={(e) => setStruttura(e.target.value)}
              options={STRUTTURE.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div className="ass-inc__field">
            <label>Ricerca</label>
            <SearchField className="ass-inc__search" name="search" placeholder="Cerca"
              value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch('')} />
          </div>
        </div>

        <div className="ass-inc__bar-right">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setCreaOpen(true)}>
            <i className="fa-light fa-plus" /> Crea incarico
          </button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setShowStat(true)}>
            <i className="fa-light fa-chart-simple" /> Statistiche
          </button>
          <Tooltip text="Assegnazione manuale">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Assegnazione manuale" onClick={() => setShowManuale(true)}>
              <i className="fa-light fa-hand" />
            </button>
          </Tooltip>
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
        <table className="sib-table ass-inc__table" ref={tableRef}>
          <thead>
            <tr>
              <th className="ass-inc__th-center">ID</th>
              <th className="ass-inc__th-center">
                <ColFilterHeader label="N° Camera" center options={camereDistinct}
                  selected={colFilters.cameraNum} open={openFilter === 'cameraNum'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'cameraNum' ? null : 'cameraNum')}
                  onToggle={(v) => toggleColFilter('cameraNum', v)} onSelectAll={(s) => setAllColFilter('cameraNum', camereDistinct, s)} />
              </th>
              <th className="ass-inc__th-sortable" onClick={toggleSortData}>
                Data ass. {sortDataDir === null
                  ? <i className="fa-light fa-arrow-down-arrow-up ass-inc__sort-ico" />
                  : sortDataDir === 'asc'
                    ? <i className="fa-solid fa-arrow-up ass-inc__sort-ico" />
                    : <i className="fa-solid fa-arrow-down ass-inc__sort-ico" />}
              </th>
              <th>Struttura</th>
              <th className="ass-inc__th-center">
                <ColFilterHeader label="Reparto" center options={REPARTI}
                  selected={colFilters.reparto} open={openFilter === 'reparto'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'reparto' ? null : 'reparto')}
                  onToggle={(v) => toggleColFilter('reparto', v)} onSelectAll={(s) => setAllColFilter('reparto', REPARTI, s)} />
              </th>
              <th>Descrizione</th>
              <th className="ass-inc__th-center">
                <ColFilterHeader label="Status" center options={['media', 'alta']} optionLabel={(v) => SEVERITA_LABEL[v as Severita]}
                  selected={colFilters.severita} open={openFilter === 'severita'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'severita' ? null : 'severita')}
                  onToggle={(v) => toggleColFilter('severita', v)} onSelectAll={(s) => setAllColFilter('severita', ['media', 'alta'], s)} />
              </th>
              <th>
                <ColFilterHeader label="Assegnato a" options={assegnatoADistinct}
                  selected={colFilters.assegnatoA} open={openFilter === 'assegnatoA'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'assegnatoA' ? null : 'assegnatoA')}
                  onToggle={(v) => toggleColFilter('assegnatoA', v)} onSelectAll={(s) => setAllColFilter('assegnatoA', assegnatoADistinct, s)} />
              </th>
              <th>Stato lavorazione</th>
              <th className="ass-inc__th-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={10} className="sib-empty">Nessun incarico trovato.</td></tr>
            ) : pageRows.map((r, i) => (
              <tr key={`${r.id}-${r.cameraNum}-${i}`}>
                <td className="ass-inc__td-center">{r.id}</td>
                <td className="ass-inc__td-center">{r.cameraNum}</td>
                <td className="ass-inc__nowrap">{r.dataAssegnazione}</td>
                <td>{r.struttura}</td>
                <td className="ass-inc__td-center">
                  <Tooltip text={r.reparto}>
                    <i className={`fa-light ${REPARTO_ICON[r.reparto]} ass-inc__rep-ico`} />
                  </Tooltip>
                </td>
                <td>
                  {r.descrizione ? (
                    <Tooltip variant="light" position="top" content={
                      <div className="ass-inc__desc-info">
                        <div className="ass-inc__desc-info-title">Descrizione</div>
                        <div className="ass-inc__desc-info-text">{r.descrizione}</div>
                      </div>
                    }>
                      <span className="ass-inc__desc">{r.descrizione}</span>
                    </Tooltip>
                  ) : <span className="sib-cell--muted">-</span>}
                </td>
                <td className="ass-inc__td-center">
                  <Tooltip text={SEVERITA_LABEL[r.severita]}>
                    <i className={`fa-solid fa-triangle-exclamation ass-inc__sev ass-inc__sev--${r.severita}`} />
                  </Tooltip>
                </td>
                <td>
                  <span className="ass-inc__user">
                    <img className="ass-inc__avatar" src={avatarUrl(r.assegnatoA)} alt="" />
                    <span className="ass-inc__user-name">{r.assegnatoA}</span>
                  </span>
                </td>
                <td><span className={`ass-inc__stato ass-inc__stato--${r.statoLavorazione}`}>{STATO_LAV_LABEL[r.statoLavorazione]}</span></td>
                <td className="ass-inc__td-center">
                  <div className="ass-inc__actions">
                    <Tooltip text="Modifica incarico">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => setEditRow(r)}><i className="fa-light fa-pen" /></button>
                    </Tooltip>
                    <Tooltip text="Elimina incarico">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina" onClick={() => deleteIncarico(r)}><i className="fa-light fa-trash-can" /></button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ass-inc__pagination">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <IncaricoModal open={creaOpen || !!editRow} row={editRow} strutture={STRUTTURE} operatori={OPERATORI}
        onClose={() => { setCreaOpen(false); setEditRow(null) }} onSave={saveIncarico} />
      <StatisticheModal open={showStat} incarichi={rows} onClose={() => setShowStat(false)} />
      <AssegnazioneManualeModal open={showManuale} segnalazioni={SEGNALAZIONI_PENDING} incarichi={INCARICHI_PENDING} operatori={OPERATORI} onClose={() => setShowManuale(false)} />
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
    <div className={'ai-colfilter' + (center ? ' ai-colfilter--center' : '')}>
      <span>{label}</span>
      <button type="button" className={'ai-colfilter__btn' + (hasFilter ? ' ai-colfilter__btn--active' : '')}
        onClick={onToggleOpen} aria-label={`Filtra per ${label}`}>
        <i className="fa-solid fa-filter" />
      </button>
      {open && (
        <>
          <div className="ai-colfilter__overlay" onClick={onToggleOpen} />
          <div className="ai-colfilter__popup" onClick={(e) => e.stopPropagation()}>
            <div className="ai-colfilter__title">scelte multiple</div>
            <label className="ai-colfilter__option">
              <input type="checkbox" className="sib-checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} />
              <span>Tutti</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="ai-colfilter__option">
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

// ─── MODAL: Crea / Modifica incarico ─────────────────────────────────────────

const priToSev = (p: Priorita): Severita => (p === 'Alta' || p === 'Urgente' ? 'alta' : 'media')
const sevToPri = (s: Severita): Priorita => (s === 'alta' ? 'Alta' : 'Normale')

function IncaricoModal({ open, row, strutture, operatori, onClose, onSave }: {
  open: boolean
  row: Incarico | null
  strutture: string[]
  operatori: Operatore[]
  onClose: () => void
  onSave: (inc: Incarico, isNew: boolean) => void
}) {
  const [struttura, setStruttura] = useState(strutture[0])
  const [periodoDa, setPeriodoDa] = useState('2026-04-30')
  const [periodoA, setPeriodoA] = useState('2026-04-30')
  const [manutenzione, setManutenzione] = useState(false)
  const [camera, setCamera] = useState('')
  const [areaComune, setAreaComune] = useState('')
  const [genereIntervento, setGenereIntervento] = useState<GenereIntervento>('Elettrico')
  const [reparto, setReparto] = useState<Reparto>('Manutenzione')
  const [assegnatario, setAssegnatario] = useState(operatori[0]?.nominativo ?? '')
  const [priorita, setPriorita] = useState<Priorita>('Normale')
  const [tipologia, setTipologia] = useState<Tipologia>('Ordinaria')
  const [descrizione, setDescrizione] = useState('')

  useEffect(() => {
    if (!open) return
    setStruttura(row?.struttura ?? strutture[0])
    setCamera(row?.cameraNum ?? '')
    setReparto(row?.reparto ?? 'Manutenzione')
    setAssegnatario(row?.assegnatoA ?? operatori[0]?.nominativo ?? '')
    setPriorita(row ? sevToPri(row.severita) : 'Normale')
    setDescrizione(row?.descrizione ?? '')
    setAreaComune('')
    setManutenzione(false)
    setGenereIntervento('Elettrico')
    setTipologia('Ordinaria')
  }, [open, row, strutture, operatori])

  const handleSave = () => {
    const inc: Incarico = {
      id: row?.id ?? 0,
      cameraNum: camera || areaComune || '-',
      dataAssegnazione: row?.dataAssegnazione ?? formatDate(),
      struttura,
      reparto,
      descrizione: descrizione.trim(),
      severita: priToSev(priorita),
      assegnatoA: assegnatario,
      statoLavorazione: row?.statoLavorazione ?? 'nuova',
    }
    onSave(inc, !row)
  }

  return (
    <Modal open={open} onClose={onClose} title={row ? 'Modifica incarico' : 'Aggiungi incarico'} size="lg">
      <div className="ass-inc__modal-body">
        <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)}
          options={strutture.map((s) => ({ value: s, label: s }))} />

        <div className="ass-inc__modal-grid">
          <DateRangeField
            nameFrom="periodoDa" nameTo="periodoA" label="Periodo"
            valueFrom={periodoDa} valueTo={periodoA}
            onChangeFrom={(e) => setPeriodoDa(e.target.value)} onChangeTo={(e) => setPeriodoA(e.target.value)}
          />
          <div className="ass-inc__check-cell">
            <CheckboxField name="manutenzione" label="Metti in manutenzione" checked={manutenzione} onChange={(e) => setManutenzione(e.target.checked)} />
          </div>

          <SelectField name="camera" label="Camere" value={camera} onChange={(e) => setCamera(e.target.value)}
            options={[{ value: '', label: 'Seleziona' }, ...CAMERE_DISTINCT.map((c) => ({ value: c, label: c }))]} />
          <InputField name="areaComune" label="Area comune" value={areaComune} onChange={(e) => setAreaComune(e.target.value)} />

          <SelectField name="genereIntervento" label="Genere Intervento" value={genereIntervento} onChange={(e) => setGenereIntervento(e.target.value as GenereIntervento)}
            options={GENERI.map((g) => ({ value: g, label: g }))} />
          <SelectField name="reparto" label="Reparto" value={reparto} onChange={(e) => setReparto(e.target.value as Reparto)}
            options={REPARTI.map((r) => ({ value: r, label: r }))} />

          <SelectField name="assegnatario" label="Assegnatario" value={assegnatario} onChange={(e) => setAssegnatario(e.target.value)}
            options={[{ value: 'Da assegnare', label: 'Da assegnare' }, ...operatori.map((o) => ({ value: o.nominativo, label: o.nominativo }))]} />
          <SelectField name="priorita" label="Priorità" value={priorita} onChange={(e) => setPriorita(e.target.value as Priorita)}
            options={PRIORITA.map((p) => ({ value: p, label: p }))} />
        </div>

        <SelectField name="tipologia" label="Tipologia" value={tipologia} onChange={(e) => setTipologia(e.target.value as Tipologia)}
          options={TIPOLOGIE.map((t) => ({ value: t, label: t }))} />
        <TextareaField name="descrizione" label="Descrizione" rows={3} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
      </div>
      <div className="ass-inc__modal-foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={handleSave}>{row ? 'Salva' : 'Aggiungi'}</button>
      </div>
    </Modal>
  )
}

// ─── MODAL: Statistiche / Stato assegnazione ─────────────────────────────────

const CHART = {
  navy:   '#204769',
  blue:   '#5C9CD4',
  teal:   '#3BA99C',
  green:  '#1F9D55',
  orange: '#E0922A',
  red:    '#E2574C',
  grey:   '#C3C9D0',
}
const REPARTO_BAR_COLOR: Record<Reparto, string> = {
  'Manutenzione': CHART.navy,
  'Magazzino':    CHART.teal,
  'Pulizie':      CHART.blue,
  'Front Office': CHART.orange,
}
const STATO_COLOR: Record<StatoLav, string> = {
  'nuova':     CHART.orange,
  'in-corso':  CHART.blue,
  'terminata': CHART.green,
}

function countBy<T>(arr: T[], key: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>()
  arr.forEach((t) => { const k = key(t); m.set(k, (m.get(k) ?? 0) + 1) })
  return m
}

function StatisticheModal({ open, incarichi, onClose }: { open: boolean; incarichi: Incarico[]; onClose: () => void }) {
  const stats = useMemo(() => {
    const perOperatoreMap = countBy(incarichi, (i) => i.assegnatoA)
    const perOperatore = Array.from(perOperatoreMap, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    const perStato = STATI_LAV.map((s) => ({ name: STATO_LAV_LABEL[s], value: incarichi.filter((i) => i.statoLavorazione === s).length, color: STATO_COLOR[s] }))
    const perReparto = REPARTI.map((r) => ({ name: r, value: incarichi.filter((i) => i.reparto === r).length, color: REPARTO_BAR_COLOR[r] }))
    const perSeverita = (['media', 'alta'] as Severita[]).map((s) => ({ name: SEVERITA_LABEL[s], value: incarichi.filter((i) => i.severita === s).length, color: s === 'alta' ? CHART.red : CHART.orange }))
    const totale = incarichi.length
    const terminati = incarichi.filter((i) => i.statoLavorazione === 'terminata').length
    const completamento = totale ? Math.round((terminati / totale) * 100) : 0
    return { perOperatore, perStato, perReparto, perSeverita, totale, operatoriAttivi: perOperatoreMap.size, completamento }
  }, [incarichi])

  return (
    <Modal open={open} onClose={onClose} title="Statistiche assegnazioni" size="xl">
      <div className="ass-inc__modal-body">
        <p className="ass-inc__stat-summary">
          <strong>{stats.totale}</strong> incarichi · <strong>{stats.operatoriAttivi}</strong> operatori coinvolti · completamento <strong>{stats.completamento}%</strong>
        </p>

        <div className="ass-inc__stat-panels">
          <div className="ass-inc__stat-panel ass-inc__stat-panel--wide">
            <div className="ass-inc__stat-panel-title">Carico di lavoro per operatore</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.perOperatore} margin={{ top: 8, right: 12, left: 0, bottom: 4 }} barCategoryGap="28%">
                <CartesianGrid stroke="#E0E7EE" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6E7175' }} tickLine={false} axisLine={{ stroke: '#C3C9D0' }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6E7175' }} tickLine={false} axisLine={false} width={28} />
                <RTooltip formatter={(v) => [`${v} incarichi`, 'Assegnati']} />
                <Bar dataKey="value" name="Incarichi" fill={CHART.navy} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="ass-inc__stat-panel">
            <div className="ass-inc__stat-panel-title">Stato di lavorazione</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.perStato} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {stats.perStato.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <RTooltip />
                <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="ass-inc__stat-panel">
            <div className="ass-inc__stat-panel-title">Incarichi per reparto</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.perReparto} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 4 }} barCategoryGap="28%">
                <CartesianGrid stroke="#E0E7EE" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6E7175' }} tickLine={false} axisLine={{ stroke: '#C3C9D0' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6E7175' }} tickLine={false} axisLine={false} width={92} />
                <RTooltip formatter={(v) => [`${v} incarichi`, 'Reparto']} />
                <Bar dataKey="value" name="Incarichi" radius={[0, 4, 4, 0]} maxBarSize={26}>
                  {stats.perReparto.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="ass-inc__stat-panel">
            <div className="ass-inc__stat-panel-title">Priorità (Status)</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.perSeverita} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                  {stats.perSeverita.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <RTooltip />
                <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── MODAL: Assegnazione manuale ─────────────────────────────────────────────

function AssegnazioneManualeModal({ open, segnalazioni, incarichi, operatori, onClose }: {
  open: boolean
  segnalazioni: PendingItem[]
  incarichi: PendingItem[]
  operatori: Operatore[]
  onClose: () => void
}) {
  const [tab, setTab] = useState<'segnalazioni' | 'incarichi'>('segnalazioni')
  const [selItem, setSelItem] = useState<PendingItem | null>(null)
  const [repFilter, setRepFilter] = useState<'Tutti' | Reparto>('Tutti')
  const [operatoreSel, setOperatoreSel] = useState<number | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTab('segnalazioni'); setSelItem(null); setRepFilter('Tutti'); setOperatoreSel(null); setDone(null)
  }, [open])

  const lista = tab === 'segnalazioni' ? segnalazioni : incarichi

  const selectItem = (it: PendingItem) => {
    setSelItem(it)
    setRepFilter(it.reparto) // pre-filtra sugli operatori del reparto dell'elemento
    setOperatoreSel(null)
  }

  const operatoriView = useMemo(() => {
    const base = repFilter === 'Tutti' ? operatori : operatori.filter((o) => o.reparti.includes(repFilter))
    return [...base].sort((a, b) => {
      const am = selItem && a.reparti.includes(selItem.reparto) ? 0 : 1
      const bm = selItem && b.reparti.includes(selItem.reparto) ? 0 : 1
      return am - bm
    })
  }, [operatori, repFilter, selItem])

  const opSel = operatori.find((o) => o.id === operatoreSel) ?? null
  const canAssign = !!selItem && !!opSel

  return (
    <Modal open={open} onClose={onClose} title="Assegnazione manuale" size="xl">
      {done ? (
        <div className="ass-inc__man-done">
          <i className="fa-solid fa-circle-check ass-inc__man-done-ico" />
          <div className="ass-inc__man-done-title">Elemento assegnato a {done}</div>
          <div className="ass-inc__man-done-text">Una notifica è stata inviata a <strong>{done}</strong> per avvisarlo del nuovo incarico da gestire.</div>
          <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Chiudi</button>
        </div>
      ) : (
        <>
          <div className="ass-inc__modal-body">
            <p className="ass-inc__modal-subtitle">Scegli l’elemento da assegnare, poi l’operatore. Gli operatori del reparto dell’elemento sono consigliati.</p>

            <div className="ass-inc__man">
              {/* STEP 1 — elemento */}
              <section className="ass-inc__man-col">
                <div className="ass-inc__man-step"><span className="ass-inc__man-num">1</span> Elemento da assegnare</div>
                <div className="ass-inc__tabs">
                  <button type="button" className={'ass-inc__tab' + (tab === 'segnalazioni' ? ' ass-inc__tab--active' : '')} onClick={() => { setTab('segnalazioni'); setSelItem(null); setOperatoreSel(null) }}>Segnalazioni</button>
                  <button type="button" className={'ass-inc__tab' + (tab === 'incarichi' ? ' ass-inc__tab--active' : '')} onClick={() => { setTab('incarichi'); setSelItem(null); setOperatoreSel(null) }}>Incarichi</button>
                </div>
                <div className="ass-inc__man-list">
                  {lista.length === 0 ? (
                    <div className="sib-empty">Nessun elemento in attesa</div>
                  ) : lista.map((it) => (
                    <button key={it.id} type="button"
                      className={'ass-inc__man-item' + (selItem?.id === it.id ? ' ass-inc__man-item--sel' : '')}
                      onClick={() => selectItem(it)}>
                      <i className={`fa-light ${REPARTO_ICON[it.reparto]} ass-inc__man-item-ico`} />
                      <div className="ass-inc__man-item-body">
                        <div className="ass-inc__man-item-top">
                          <span className="ass-inc__man-item-desc">{it.descrizione || `Elemento #${it.id}`}</span>
                          <span className="ass-inc__man-item-cam">Camera {it.camera}</span>
                        </div>
                        <div className="ass-inc__man-item-meta">{it.struttura} · {it.reparto}</div>
                      </div>
                      {selItem?.id === it.id && <i className="fa-solid fa-circle-check ass-inc__man-item-check" />}
                    </button>
                  ))}
                </div>
              </section>

              {/* STEP 2 — operatore */}
              <section className="ass-inc__man-col">
                <div className="ass-inc__man-step"><span className="ass-inc__man-num">2</span> Operatore</div>
                {!selItem ? (
                  <div className="ass-inc__man-hint">
                    <i className="fa-light fa-arrow-left" /> Seleziona prima un elemento da assegnare
                  </div>
                ) : (
                  <>
                    <div className="ass-inc__man-chips">
                      <button type="button" className={'ass-inc__man-chip' + (repFilter === 'Tutti' ? ' ass-inc__man-chip--active' : '')} onClick={() => setRepFilter('Tutti')}>Tutti</button>
                      {REPARTI.map((r) => (
                        <button key={r} type="button" className={'ass-inc__man-chip' + (repFilter === r ? ' ass-inc__man-chip--active' : '')} onClick={() => setRepFilter(r)}>{r}</button>
                      ))}
                    </div>
                    <div className="ass-inc__man-list">
                      {operatoriView.length === 0 ? (
                        <div className="sib-empty">Nessun operatore per questo reparto</div>
                      ) : operatoriView.map((o) => {
                        const match = o.reparti.includes(selItem.reparto)
                        return (
                          <button key={o.id} type="button"
                            className={'ass-inc__man-op' + (operatoreSel === o.id ? ' ass-inc__man-op--sel' : '') + (match ? ' ass-inc__man-op--match' : '')}
                            onClick={() => setOperatoreSel(o.id)}>
                            <img className="ass-inc__man-op-avatar" src={avatarUrl(o.nominativo)} alt="" />
                            <div className="ass-inc__man-op-body">
                              <span className="ass-inc__man-op-name">{o.nominativo}</span>
                              <span className="ass-inc__man-op-rep">{o.reparti.join(', ')}</span>
                            </div>
                            {match && <span className="ass-inc__man-op-badge">Consigliato</span>}
                            <span className="ass-inc__man-op-load" title="Incarichi attivi">{o.numeroAssegnazioni}</span>
                            {operatoreSel === o.id && <i className="fa-solid fa-circle-check ass-inc__man-op-check" />}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>

          <div className="ass-inc__man-foot">
            <div className="ass-inc__man-summary">
              {canAssign ? (
                <><i className="fa-solid fa-arrow-right-arrow-left" /> Assegni <strong>{selItem!.descrizione || `#${selItem!.id}`}</strong> a <strong>{opSel!.nominativo}</strong></>
              ) : (
                'Seleziona un elemento e un operatore per procedere'
              )}
            </div>
            <div className="ass-inc__man-actions">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--primary" disabled={!canAssign} onClick={() => setDone(opSel!.nominativo)}>Assegna</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
