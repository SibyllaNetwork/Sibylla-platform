import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import { DateRangeField, DatePickerField, InputField, RadioGroup, SelectField, TextareaField } from '../../../core/components/form'
import { avatarUrl } from '../../../core/avatar'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { exportTableToXls, exportElementToPdf } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import './Segnalazioni.sass'

const PAGE_SIZE = 12

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Severita = 'media' | 'alta'
type StatoLav = 'da-assegnare' | 'assegnato' | 'in-corso' | 'completata'
type Reparto = 'Manutenzione' | 'Housekeeping' | 'Reception' | 'Cucina'
type GenereIntervento = 'Pulizia ordinaria' | 'Elettrico' | 'Manutenzione' | 'Idraulico'
type Priorita = 'Bassa' | 'Normale' | 'Alta' | 'Urgente'

interface Segnalazione {
  id: number
  segnalazioneDi: string
  severita: Severita
  reparto: Reparto
  hasFoto: boolean
  foto?: string[] // data URL delle foto documentali (scattate o caricate)
  genereIntervento: GenereIntervento
  statoLavorazione: StatoLav
  descrizione: string
  struttura: string
  camera: string
  data: string // dd/mm/yyyy HH:MM
  assegnazione?: Assegnazione
}

interface Assegnazione {
  assegnatario: string
  reparto: Reparto
  data: string // dd/mm/yyyy HH:MM
}

// ─── COSTANTI ─────────────────────────────────────────────────────────────────

const STRUTTURE = ['Hotel Tutorial', 'Hotel Archimede', 'Hotel Azzurro Mare']

const REPARTI: Reparto[] = ['Manutenzione', 'Housekeeping', 'Reception', 'Cucina']
const GENERI: GenereIntervento[] = ['Pulizia ordinaria', 'Elettrico', 'Manutenzione', 'Idraulico']
const PRIORITA: Priorita[] = ['Bassa', 'Normale', 'Alta', 'Urgente']
const STATI_LAV: StatoLav[] = ['da-assegnare', 'assegnato', 'in-corso', 'completata']
const CAMERE_DISTINCT = ['101', '102', '103', '104', '105', '106']

const STATO_LAV_LABEL: Record<StatoLav, string> = {
  'da-assegnare': 'Da assegnare',
  'assegnato':    'Assegnato',
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

// ─── FOTO DI ESEMPIO (SVG inline, nessuna risorsa esterna) ─────────────────────

const samplePhoto = (emoji: string, caption: string, c1: string, c2: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>` +
    `<rect width='800' height='600' fill='url(#g)'/>` +
    `<text x='400' y='285' font-size='240' text-anchor='middle' dominant-baseline='central'>${emoji}</text>` +
    `<text x='400' y='520' font-size='44' fill='rgba(255,255,255,0.95)' font-family='sans-serif' text-anchor='middle'>${caption}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const FOTO_PULIZIA = [
  samplePhoto('🧹', 'Camera da pulire', '#0f766e', '#14b8a6'),
  samplePhoto('🧽', 'Bagno da sanificare', '#155e75', '#22d3ee'),
]
const FOTO_ELETTRICO = [
  samplePhoto('⚡', 'Quadro elettrico', '#1e3a8a', '#3b82f6'),
  samplePhoto('🔌', 'Presa danneggiata', '#334155', '#64748b'),
]
const FOTO_MANUT = [
  samplePhoto('🔧', 'Infisso da riparare', '#7c2d12', '#ea580c'),
]
const FOTO_IDRAULICO = [
  samplePhoto('💧', 'Perdita lavabo', '#1e40af', '#60a5fa'),
  samplePhoto('🚿', 'Scarico doccia', '#0369a1', '#38bdf8'),
]

// ─── MOCK ─────────────────────────────────────────────────────────────────────

const MOCK: Segnalazione[] = [
  { id: 1,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Housekeeping', hasFoto: true,  foto: FOTO_PULIZIA,   genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'in-corso',     descrizione: 'Pulizia camera dopo check-out', struttura: 'Hotel Tutorial', camera: '101', data: '26/05/2026 17:16' },
  { id: 2,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Manutenzione', hasFoto: true,  foto: FOTO_ELETTRICO, genereIntervento: 'Elettrico',         statoLavorazione: 'in-corso',     descrizione: 'Presa corrente non funzionante', struttura: 'Hotel Tutorial', camera: '101', data: '26/05/2026 17:15' },
  { id: 3,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Housekeeping', hasFoto: true,  genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'da-assegnare', descrizione: '',            struttura: 'Hotel Tutorial', camera: '101', data: '26/05/2026 16:59' },
  { id: 4,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Manutenzione', hasFoto: true,  genereIntervento: 'Manutenzione',      statoLavorazione: 'da-assegnare', descrizione: '',            struttura: 'Hotel Tutorial', camera: '101', data: '21/05/2026 14:49' },
  { id: 5,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Manutenzione', hasFoto: true,  genereIntervento: 'Elettrico',         statoLavorazione: 'da-assegnare', descrizione: '',            struttura: 'Hotel Tutorial', camera: '102', data: '24/06/2026 10:25' },
  { id: 6,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Housekeeping', hasFoto: true,  genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'da-assegnare', descrizione: '',            struttura: 'Hotel Tutorial', camera: '102', data: '21/05/2026 14:50' },
  { id: 7,  segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Manutenzione', hasFoto: true,  genereIntervento: 'Elettrico',         statoLavorazione: 'da-assegnare', descrizione: '',            struttura: 'Hotel Tutorial', camera: '102', data: '08/04/2026 12:03' },
  { id: 8,  segnalazioneDi: 'Rossi Mario', severita: 'alta',  reparto: 'Housekeeping', hasFoto: true,  foto: FOTO_PULIZIA, genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'da-assegnare', descrizione: 'Macchie su moquette e tende', struttura: 'Hotel Tutorial', camera: '103', data: '27/05/2026 10:19' },
  { id: 9,  segnalazioneDi: 'Rossi Mario', severita: 'alta',  reparto: 'Manutenzione', hasFoto: true,  foto: FOTO_MANUT,   genereIntervento: 'Manutenzione',      statoLavorazione: 'in-corso',     descrizione: 'Maniglia finestra rotta',     struttura: 'Hotel Tutorial', camera: '103', data: '07/04/2026 16:18' },
  { id: 10, segnalazioneDi: 'Rossi Mario', severita: 'alta',  reparto: 'Housekeeping', hasFoto: true,  genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'da-assegnare', descrizione: 'test Pulizie', struttura: 'Hotel Tutorial', camera: '104', data: '27/05/2026 10:18' },
  { id: 11, segnalazioneDi: 'Rossi Mario', severita: 'alta',  reparto: 'Manutenzione', hasFoto: true,  genereIntervento: 'Manutenzione',      statoLavorazione: 'in-corso',     descrizione: '',            struttura: 'Hotel Tutorial', camera: '104', data: '23/03/2026 11:52' },
  { id: 12, segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Housekeeping', hasFoto: true,  genereIntervento: 'Pulizia ordinaria', statoLavorazione: 'in-corso',     descrizione: '',            struttura: 'Hotel Tutorial', camera: '105', data: '26/05/2026 17:09' },
  { id: 13, segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Manutenzione', hasFoto: true, foto: FOTO_IDRAULICO, genereIntervento: 'Idraulico',         statoLavorazione: 'completata',   descrizione: 'Perdita lavabo', struttura: 'Hotel Tutorial', camera: '105', data: '20/03/2026 09:30' },
  { id: 14, segnalazioneDi: 'Rossi Mario', severita: 'media', reparto: 'Reception',    hasFoto: false, genereIntervento: 'Elettrico',         statoLavorazione: 'completata',   descrizione: '',            struttura: 'Hotel Tutorial', camera: '106', data: '18/03/2026 08:12' },
]

// data/ora corrente nel formato dd/mm/yyyy HH:MM
const formatNow = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type ColFilterKey = 'severita' | 'reparto' | 'genereIntervento' | 'statoLavorazione' | 'camera'

export default function Segnalazioni(_props: { navigate?: (p: string) => void } = {}) {
  const [rows, setRows] = useState<Segnalazione[]>(MOCK)
  const confirm = useConfirmStore((s) => s.confirm)
  const deleteSegnalazione = async (target: Segnalazione) => {
    const ok = await confirm({
      title: 'Elimina segnalazione',
      message: <>Vuoi eliminare la segnalazione <strong>#{target.id}</strong> (camera {target.camera})? L’operazione non è reversibile.</>,
    })
    if (ok) setRows((prev) => prev.filter((r) => r !== target))
  }
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [dataDa, setDataDa] = useState('2026-01-01')
  const [dataA, setDataA] = useState('2026-06-26')
  const [reparto, setReparto] = useState<'Tutti' | Reparto>('Tutti')
  const [statoLav, setStatoLav] = useState<'Tutti' | StatoLav>('Tutti')
  const [struttura, setStruttura] = useState(STRUTTURE[0])
  // default: le segnalazioni più recenti in cima
  const [sortDataDir, setSortDataDir] = useState<'asc' | 'desc' | null>('desc')
  const [editRow, setEditRow] = useState<Segnalazione | null>(null)
  const [assignRow, setAssignRow] = useState<Segnalazione | null>(null)
  const [photoRow, setPhotoRow] = useState<Segnalazione | null>(null)
  const [flashId, setFlashId] = useState<number | null>(null)
  const flashTimer = useRef<number | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  // crea una segnalazione, la porta in cima e la evidenzia (lampeggio)
  const addSegnalazione = (dati: Omit<Segnalazione, 'id' | 'data'>) => {
    const newId = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1
    const newRow: Segnalazione = { ...dati, id: newId, data: formatNow() }
    setRows((prev) => [newRow, ...prev])
    // azzera i filtri per garantire che la nuova segnalazione sia subito visibile
    setStruttura(newRow.struttura)
    setReparto('Tutti')
    setStatoLav('Tutti')
    setColFilters({ severita: [], reparto: [], genereIntervento: [], statoLavorazione: [], camera: [] })
    setSortDataDir('desc')
    setPage(1)
    setShowModal(false)
    setFlashId(newId)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlashId(null), 3500)
  }
  useEffect(() => () => { if (flashTimer.current) window.clearTimeout(flashTimer.current) }, [])

  // assegna l'intervento: stato → "Assegnato" + dettagli per l'hover
  const assegnaIntervento = (segnalazioneId: number, assegnatario: { nome: string; reparto: Reparto }) => {
    setRows((prev) => prev.map((r) =>
      r.id === segnalazioneId
        ? { ...r, statoLavorazione: 'assegnato', assegnazione: { assegnatario: assegnatario.nome, reparto: assegnatario.reparto, data: formatNow() } }
        : r
    ))
  }

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
    let out = rows.filter((r) => r.struttura === struttura)
    if (reparto !== 'Tutti') out = out.filter((r) => r.reparto === reparto)
    if (statoLav !== 'Tutti') out = out.filter((r) => r.statoLavorazione === statoLav)
    if (colFilters.severita.length)         out = out.filter((r) => colFilters.severita.includes(r.severita))
    if (colFilters.reparto.length)          out = out.filter((r) => colFilters.reparto.includes(r.reparto))
    if (colFilters.genereIntervento.length) out = out.filter((r) => colFilters.genereIntervento.includes(r.genereIntervento))
    if (colFilters.statoLavorazione.length) out = out.filter((r) => colFilters.statoLavorazione.includes(r.statoLavorazione))
    if (colFilters.camera.length)           out = out.filter((r) => colFilters.camera.includes(r.camera))
    if (sortDataDir) {
      const dir = sortDataDir === 'asc' ? 1 : -1
      out = [...out].sort((a, b) => (parseData(a.data) - parseData(b.data)) * dir)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, struttura, reparto, statoLav, colFilters, sortDataDir])

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
      <PageHead
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
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta XLS" onClick={esportaXls}><i className="fa-regular fa-file-excel" /></button>
          </Tooltip>
          <Tooltip text="Esporta in PDF">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta PDF" onClick={esportaPdf}><i className="fa-regular fa-file-pdf" /></button>
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
              <th className="segnal__th-center">Descrizione</th>
              <th>Struttura</th>
              <th className="segnal__th-center">
                <ColFilterHeader label="Camera" center options={CAMERE_DISTINCT}
                  selected={colFilters.camera} open={openFilter === 'camera'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'camera' ? null : 'camera')}
                  onToggle={(v) => toggleColFilter('camera', v)} onSelectAll={(s) => setAllColFilter('camera', CAMERE_DISTINCT, s)} />
              </th>
              <th className="segnal__th-sortable" onClick={toggleSortData}>
                Data {sortDataDir === null
                  ? <i className="fa-solid fa-arrow-down-arrow-up segnal__sort-ico" />
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
              <tr key={s.id} className={s.id === flashId ? 'segnal__row--flash' : undefined}>
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
                    <i className={`fa-solid ${REPARTO_ICON[s.reparto]} segnal__rep-ico`} />
                  </Tooltip>
                </td>
                <td className="segnal__td-center">
                  {s.hasFoto ? (
                    <Tooltip text="Visualizza foto">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Visualizza foto" onClick={() => setPhotoRow(s)}><i className="fa-solid fa-eye" /></button>
                    </Tooltip>
                  ) : <span className="sib-cell--muted">-</span>}
                </td>
                <td>
                  <span className="segnal__genere">
                    <i className={`fa-solid ${GENERE_ICON[s.genereIntervento]} segnal__gen-ico`} />
                    {s.genereIntervento}
                  </span>
                </td>
                <td>
                  {s.statoLavorazione === 'assegnato' && s.assegnazione ? (
                    <Tooltip variant="light" position="top" content={
                      <div className="segnal__assign-info">
                        <div className="segnal__assign-info-title">Dettagli assegnazione</div>
                        <div className="segnal__assign-info-row"><span>Assegnatario</span><strong>{s.assegnazione.assegnatario}</strong></div>
                        <div className="segnal__assign-info-row"><span>Reparto</span><strong>{s.assegnazione.reparto}</strong></div>
                        <div className="segnal__assign-info-row"><span>Data e ora</span><strong>{s.assegnazione.data}</strong></div>
                      </div>
                    }>
                      <span className={`segnal__stato segnal__stato--${s.statoLavorazione} segnal__stato--hint`}>
                        {STATO_LAV_LABEL[s.statoLavorazione]}
                        <i className="fa-solid fa-circle-info segnal__stato-ico" />
                      </span>
                    </Tooltip>
                  ) : (
                    <span className={`segnal__stato segnal__stato--${s.statoLavorazione}`}>{STATO_LAV_LABEL[s.statoLavorazione]}</span>
                  )}
                </td>
                <td className="segnal__td-center">
                  {s.descrizione ? (
                    <Tooltip variant="light" position="top" content={
                      <div className="segnal__desc-info">
                        <div className="segnal__desc-info-title">Descrizione</div>
                        <div className="segnal__desc-info-text">{s.descrizione}</div>
                      </div>
                    }>
                      <i className="fa-solid fa-circle-info segnal__desc-ico" />
                    </Tooltip>
                  ) : <span className="sib-cell--muted">-</span>}
                </td>
                <td>{s.struttura}</td>
                <td className="segnal__td-center">{s.camera}</td>
                <td className="segnal__nowrap">{s.data}</td>
                <td className="segnal__td-center">
                  <div className="segnal__actions">
                    <Tooltip text="Assegna intervento">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Assegna intervento" onClick={() => setAssignRow(s)}><i className="fa-solid fa-user-gear" /></button>
                    </Tooltip>
                    <Tooltip text="Modifica segnalazione">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica" onClick={() => setEditRow(s)}><i className="fa-solid fa-pen" /></button>
                    </Tooltip>
                    <Tooltip text="Elimina segnalazione">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina" onClick={() => deleteSegnalazione(s)}><i className="fa-solid fa-trash-can" /></button>
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

      <CreaSegnalazioneModal open={showModal} strutture={STRUTTURE} onClose={() => setShowModal(false)} onCreate={addSegnalazione} />
      <ModificaSegnalazioneModal row={editRow} strutture={STRUTTURE} onClose={() => setEditRow(null)} />
      <AssegnaInterventoModal row={assignRow} onClose={() => setAssignRow(null)} onAssign={assegnaIntervento} />
      <VisualizzaFotoModal row={photoRow} onClose={() => setPhotoRow(null)} />
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

function CreaSegnalazioneModal({ open, strutture, onClose, onCreate }: {
  open: boolean
  strutture: string[]
  onClose: () => void
  onCreate: (dati: Omit<Segnalazione, 'id' | 'data'>) => void
}) {
  const [struttura, setStruttura] = useState('')
  const [genereIntervento, setGenereIntervento] = useState<GenereIntervento>('Elettrico')
  const [reparto, setReparto] = useState<Reparto>('Manutenzione')
  const [priorita, setPriorita] = useState<Priorita>('Normale')
  const [camera, setCamera] = useState('')
  const [areaComune, setAreaComune] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [descErr, setDescErr] = useState('')
  const [foto, setFoto] = useState<string[]>([])
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const onFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((f) => {
      const reader = new FileReader()
      reader.onload = () => setFoto((prev) => [...prev, reader.result as string])
      reader.readAsDataURL(f)
    })
  }
  const removeFoto = (i: number) => setFoto((prev) => prev.filter((_, idx) => idx !== i))

  const handleCreate = () => {
    if (!descrizione.trim()) {
      setDescErr('La descrizione è obbligatoria')
      return
    }
    onCreate({
      segnalazioneDi: 'Rossi Mario',
      severita: priorita === 'Alta' || priorita === 'Urgente' ? 'alta' : 'media',
      reparto,
      hasFoto: foto.length > 0,
      foto,
      genereIntervento,
      statoLavorazione: 'da-assegnare',
      descrizione: descrizione.trim(),
      struttura: struttura || strutture[0],
      camera,
    })
    // reset per la prossima apertura
    setFoto([])
    setDescrizione('')
    setAreaComune('')
  }

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
          name="descrizione" label="Descrizione" rows={3} required error={descErr}
          value={descrizione} onChange={(e) => { setDescrizione(e.target.value); if (descErr) setDescErr('') }}
        />
        <div className="segnal__photo">
          <div className="segnal__photo-label">Foto documentali</div>
          <div className="segnal__photo-actions">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => cameraRef.current?.click()}>
              <i className="fa-light fa-camera" /> Scatta foto
            </button>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => galleryRef.current?.click()}>
              <i className="fa-light fa-image" /> Carica da galleria
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
            onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
          <input ref={galleryRef} type="file" accept="image/*" multiple hidden
            onChange={(e) => { onFiles(e.target.files); e.target.value = '' }} />
          {foto.length > 0 && (
            <div className="segnal__photo-grid">
              {foto.map((src, i) => (
                <div key={i} className="segnal__photo-thumb">
                  <img src={src} alt={`Foto ${i + 1}`} />
                  <button type="button" className="segnal__photo-del" aria-label="Rimuovi foto" onClick={() => removeFoto(i)}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="segnal__modal-foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={handleCreate}>Aggiungi</button>
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

function AssegnaInterventoModal({ row, onClose, onAssign }: {
  row: Segnalazione | null
  onClose: () => void
  onAssign: (segnalazioneId: number, assegnatario: { nome: string; reparto: Reparto }) => void
}) {
  // all'apertura la lista è filtrata sul reparto della segnalazione
  const [repFilter, setRepFilter] = useState<'Tutti' | Reparto>('Tutti')
  const [assegnato, setAssegnato] = useState<Dipendente | null>(null)

  const handleSelect = (d: Dipendente) => {
    setAssegnato(d)
    if (row) onAssign(row.id, { nome: d.nome, reparto: d.reparto })
  }

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
                  onClick={() => handleSelect(d)}
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

// ─── MODAL: Visualizza foto ──────────────────────────────────────────────────

function VisualizzaFotoModal({ row, onClose }: { row: Segnalazione | null; onClose: () => void }) {
  const foto = row?.foto ?? []
  return (
    <Modal open={!!row} onClose={onClose} title="Foto documentali" size="lg">
      <div className="segnal__viewer-meta">
        Segnalazione id: {row?.id} del {row?.data} · {row?.struttura} - Camera: {row?.camera}
      </div>
      {foto.length > 0 ? (
        <div className="segnal__viewer-grid">
          {foto.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noreferrer" className="segnal__viewer-cell">
              <img src={src} alt={`Foto ${i + 1}`} className="segnal__viewer-img" />
            </a>
          ))}
        </div>
      ) : (
        <div className="sib-empty">Nessuna anteprima disponibile per questa segnalazione.</div>
      )}
    </Modal>
  )
}
