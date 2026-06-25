import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import { apiFetchSibylla } from '../../../services/api'
import { DateRangeField, InputField, SelectField, TextareaField, CheckboxField } from '../../../core/components/form'
import './AssegnazioniIncarichi.sass'

const PAGE_SIZE = 12

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Status = 'aperto' | 'in-lavorazione' | 'completato' | 'annullato'
type StatoLav = 'da-fare' | 'in-corso' | 'completata'
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

interface Incarico {
  id: number
  cameraNum: string
  dataAssegnazione: string
  struttura: string
  reparto: Reparto
  descrizione: string
  status: Status
  assegnatoA: string
  statoLavorazione: StatoLav
}

interface SegnaPending {
  id: number
  reparto: Reparto
  struttura: string
  camera: string
  descrizione: string
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number
  incarichi: Incarico[]
  operatori: Operatore[]
  segnalazioniPending: SegnaPending[]
  incarichiPending: SegnaPending[]
}

const FALLBACK: Data = {
  Strutture: [
    { Id: 1, nome: 'Hotel Archimede' },
    { Id: 2, nome: 'Hotel Tutorial' },
  ],
  StrutturaId: 1,
  incarichi: [],
  operatori: [
    { id: 20, nominativo: 'Pieri Matteo', reparti: ['Magazzino', 'Pulizie', 'Manutenzione'], numeroAssegnazioni: 1, idAssegnazioni: [20] },
  ],
  segnalazioniPending: [],
  incarichiPending: [],
}

const REPARTI: Reparto[] = ['Manutenzione', 'Magazzino', 'Pulizie', 'Front Office']
const GENERI: GenereIntervento[] = ['Elettrico', 'Idraulico', 'Edile', 'Pulizie', 'Altro']
const PRIORITA: Priorita[] = ['Bassa', 'Normale', 'Alta', 'Urgente']
const TIPOLOGIE: Tipologia[] = ['Ordinaria', 'Straordinaria', 'Urgente']
const STATI_LAV: StatoLav[] = ['da-fare', 'in-corso', 'completata']

const STATUS_LABEL: Record<Status, string> = {
  'aperto':         'Aperto',
  'in-lavorazione': 'In lavorazione',
  'completato':     'Completato',
  'annullato':      'Annullato',
}
const STATO_LAV_LABEL: Record<StatoLav, string> = {
  'da-fare':    'Da fare',
  'in-corso':   'In corso',
  'completata': 'Completata',
}

const REPARTO_ICONS: Record<Reparto, string> = {
  'Manutenzione': 'wrench',
  'Magazzino':    'boxes-stacked',
  'Pulizie':      'broom',
  'Front Office': 'user-tie',
}

const CAMERE_DISTINCT: string[] = ['001', '002', '003', '004', '005', '006', '007', '008']

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type ColFilterKey = 'cameraNum' | 'status' | 'assegnatoA'

export default function AssegnazioniIncarichi({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [page, setPage] = useState(1)
  const [dataDa, setDataDa] = useState('2026-01-30')
  const [dataA, setDataA] = useState('2026-04-30')
  const [reparto, setReparto] = useState<'Tutti' | Reparto>('Tutti')
  const [statoLav, setStatoLav] = useState<'Tutti' | StatoLav>('Tutti')
  const [search, setSearch] = useState('')
  const [sortDataDir, setSortDataDir] = useState<'asc' | 'desc' | null>('asc')

  const [openFilter, setOpenFilter] = useState<ColFilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColFilterKey, string[]>>({
    cameraNum: [],
    status: [],
    assegnatoA: [],
  })

  const [showCrea, setShowCrea] = useState(false)
  const [showStat, setShowStat] = useState(false)
  const [showManuale, setShowManuale] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('operation/GetAssegnaIncarichi', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: dataDa, a: dataA },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataDa, dataA, data.StrutturaId])

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
    () => Array.from(new Set([...CAMERE_DISTINCT, ...data.incarichi.map((i) => i.cameraNum)])).sort(),
    [data.incarichi],
  )
  const assegnatoADistinct = useMemo(
    () => Array.from(new Set(data.incarichi.map((i) => i.assegnatoA))).sort(),
    [data.incarichi],
  )

  const filtered = useMemo(() => {
    let rows = data.incarichi
    if (reparto !== 'Tutti') rows = rows.filter((r) => r.reparto === reparto)
    if (statoLav !== 'Tutti') rows = rows.filter((r) => r.statoLavorazione === statoLav)
    const q = search.toLowerCase().trim()
    if (q) rows = rows.filter((r) =>
      r.cameraNum.toLowerCase().includes(q) ||
      r.descrizione.toLowerCase().includes(q) ||
      r.assegnatoA.toLowerCase().includes(q),
    )
    if (colFilters.cameraNum.length)  rows = rows.filter((r) => colFilters.cameraNum.includes(r.cameraNum))
    if (colFilters.status.length)     rows = rows.filter((r) => colFilters.status.includes(r.status))
    if (colFilters.assegnatoA.length) rows = rows.filter((r) => colFilters.assegnatoA.includes(r.assegnatoA))
    if (sortDataDir) {
      const dir = sortDataDir === 'asc' ? 1 : -1
      const parse = (d: string) => {
        const [dd, mm, yy] = d.split('/').map(Number)
        return new Date(yy, mm - 1, dd).getTime()
      }
      rows = [...rows].sort((a, b) => (parse(a.dataAssegnazione) - parse(b.dataAssegnazione)) * dir)
    }
    return rows
  }, [data.incarichi, reparto, statoLav, search, colFilters, sortDataDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [reparto, statoLav, colFilters, search, dataDa, dataA, data.StrutturaId])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const toggleSortData = () => {
    if (sortDataDir === null) setSortDataDir('asc')
    else if (sortDataDir === 'asc') setSortDataDir('desc')
    else setSortDataDir(null)
  }

  return (
    <div className="ass-inc">
      <BtnBack />
      <PageHeader
        title="Assegnazione incarichi"
        subtitle="Creazione rapida e gestione di task operative con assegnazione automatica o manuale delle attività al personale disponibile"
      />

      <div className="ass-inc__bar">
        <div className="ass-inc__bar-left">
          <div className="ass-inc__field">
            <DateRangeField
              nameFrom="dataDa"
              nameTo="dataA"
              label="Data"
              valueFrom={dataDa}
              valueTo={dataA}
              onChangeFrom={(e) => setDataDa(e.target.value)}
              onChangeTo={(e) => setDataA(e.target.value)}
            />
          </div>
          <div className="ass-inc__field">
            <SelectField
              name="reparto"
              label="Reparto"
              className="ass-inc__select"
              value={reparto}
              onChange={(e) => setReparto(e.target.value as any)}
              options={[{ value: 'Tutti', label: 'Tutti' }, ...REPARTI.map((r) => ({ value: r, label: r }))]}
            />
          </div>
          <div className="ass-inc__field">
            <SelectField
              name="statoLav"
              label="Stato lavorazione"
              className="ass-inc__select"
              value={statoLav}
              onChange={(e) => setStatoLav(e.target.value as any)}
              options={[{ value: 'Tutti', label: 'Tutti' }, ...STATI_LAV.map((s) => ({ value: s, label: STATO_LAV_LABEL[s] }))]}
            />
          </div>
          <div className="ass-inc__field">
            <SelectField
              name="strutture"
              label="Strutture"
              className="ass-inc__select"
              value={data.StrutturaId}
              onChange={(e) => setData({ ...data, StrutturaId: Number(e.target.value) })}
              options={data.Strutture.map((s) => ({ value: s.Id, label: s.nome }))}
            />
          </div>
          <div className="ass-inc__field">
            <label>Cerca</label>
            <div className="ass-inc__search">
              <input type="search" className="sib-input" placeholder="Cerca" value={search} onChange={(e) => setSearch(e.target.value)} />
              <i className="fa-light fa-magnifying-glass ass-inc__search-ico" />
            </div>
          </div>
        </div>

        <div className="ass-inc__bar-right">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setShowCrea(true)}>
            <i className="fa-light fa-plus" /> Crea incarico
          </button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setShowStat(true)}>
            <i className="fa-light fa-chart-simple" /> Statistiche
          </button>
          <button type="button" className="sib-btn sib-btn--icon" title="Assegnazione manuale" aria-label="Assegnazione manuale" onClick={() => setShowManuale(true)}>
            <i className="fa-light fa-hand" />
          </button>
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta in Excel" aria-label="Esporta in Excel">
            <i className="fa-light fa-file-excel" />
          </button>
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta in PDF" aria-label="Esporta in PDF">
            <i className="fa-light fa-file-pdf" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="ass-inc__table-block">
          <table className="sib-table ass-inc__head-only">
            <thead>
              <tr>
                <th>ID</th>
                <th>
                  <ColFilterHeader label="N° Camera" options={camereDistinct} selected={colFilters.cameraNum} open={openFilter === 'cameraNum'}
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
                <th>Reparto</th>
                <th>Descrizione</th>
                <th>
                  <ColFilterHeader label="Status" options={['aperto', 'in-lavorazione', 'completato', 'annullato']} optionLabel={(v) => STATUS_LABEL[v as Status]}
                    selected={colFilters.status} open={openFilter === 'status'}
                    onToggleOpen={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                    onToggle={(v) => toggleColFilter('status', v)} onSelectAll={(s) => setAllColFilter('status', ['aperto', 'in-lavorazione', 'completato', 'annullato'], s)} />
                </th>
                <th>
                  <ColFilterHeader label="Assegnato a" options={assegnatoADistinct} selected={colFilters.assegnatoA} open={openFilter === 'assegnatoA'}
                    onToggleOpen={() => setOpenFilter(openFilter === 'assegnatoA' ? null : 'assegnatoA')}
                    onToggle={(v) => toggleColFilter('assegnatoA', v)} onSelectAll={(s) => setAllColFilter('assegnatoA', assegnatoADistinct, s)} />
                </th>
                <th>Stato lavorazione</th>
                <th>Azioni</th>
              </tr>
            </thead>
          </table>
          <div className="ass-inc__empty">Nessun incarico trovato.</div>
        </div>
      ) : (
        <>
          <div className="sib-table-wrap">
            <table className="sib-table ass-inc__table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>
                    <ColFilterHeader label="N° Camera" options={camereDistinct} selected={colFilters.cameraNum} open={openFilter === 'cameraNum'}
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
                  <th>Reparto</th>
                  <th>Descrizione</th>
                  <th>
                    <ColFilterHeader label="Status" options={['aperto', 'in-lavorazione', 'completato', 'annullato']} optionLabel={(v) => STATUS_LABEL[v as Status]}
                      selected={colFilters.status} open={openFilter === 'status'}
                      onToggleOpen={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                      onToggle={(v) => toggleColFilter('status', v)} onSelectAll={(s) => setAllColFilter('status', ['aperto', 'in-lavorazione', 'completato', 'annullato'], s)} />
                  </th>
                  <th>
                    <ColFilterHeader label="Assegnato a" options={assegnatoADistinct} selected={colFilters.assegnatoA} open={openFilter === 'assegnatoA'}
                      onToggleOpen={() => setOpenFilter(openFilter === 'assegnatoA' ? null : 'assegnatoA')}
                      onToggle={(v) => toggleColFilter('assegnatoA', v)} onSelectAll={(s) => setAllColFilter('assegnatoA', assegnatoADistinct, s)} />
                  </th>
                  <th>Stato lavorazione</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.cameraNum}</td>
                    <td>{r.dataAssegnazione}</td>
                    <td>{r.struttura}</td>
                    <td>{r.reparto}</td>
                    <td>{r.descrizione}</td>
                    <td><span className={`ass-inc__status ass-inc__status--${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                    <td>{r.assegnatoA}</td>
                    <td>{STATO_LAV_LABEL[r.statoLavorazione]}</td>
                    <td>
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Visualizza"><i className="fa-light fa-eye" /></button>
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica"><i className="fa-light fa-pen" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ass-inc__pagination">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {showCrea && <AggiungiIncaricoModal strutture={data.Strutture} onClose={() => setShowCrea(false)} />}
      {showStat && <StatisticheModal operatori={data.operatori} onClose={() => setShowStat(false)} />}
      {showManuale && <AssegnazioneManualeModal segnalazioni={data.segnalazioniPending} incarichi={data.incarichiPending} operatori={data.operatori} onClose={() => setShowManuale(false)} />}
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
  onToggleOpen: () => void
  onToggle: (value: string) => void
  onSelectAll: (select: boolean) => void
}

function ColFilterHeader(props: ColFilterHeaderProps) {
  const { label, options, optionLabel, selected, open, onToggleOpen, onToggle, onSelectAll } = props
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0
  return (
    <div className="ai-colfilter">
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

// ─── MODAL: Aggiungi incarico ────────────────────────────────────────────────

function AggiungiIncaricoModal({ strutture, onClose }: { strutture: { Id: number; nome: string }[]; onClose: () => void }) {
  const [strutturaId, setStrutturaId] = useState(strutture[0]?.Id ?? 1)
  const [periodoDa, setPeriodoDa] = useState('2026-04-30')
  const [periodoA, setPeriodoA] = useState('2026-04-30')
  const [manutenzione, setManutenzione] = useState(false)
  const [camera, setCamera] = useState('')
  const [areaComune, setAreaComune] = useState('')
  const [genereIntervento, setGenereIntervento] = useState<GenereIntervento>('Elettrico')
  const [reparto, setReparto] = useState<Reparto>('Manutenzione')
  const [assegnatario, setAssegnatario] = useState('da-assegnare')
  const [priorita, setPriorita] = useState<Priorita>('Normale')
  const [tipologia, setTipologia] = useState<Tipologia>('Ordinaria')
  const [descrizione, setDescrizione] = useState('')

  return (
    <div className="ass-inc__modal-overlay" onClick={onClose}>
      <div className="ass-inc__modal" onClick={(e) => e.stopPropagation()}>
        <div className="ass-inc__modal-head">
          <h3>Aggiungi incarico</h3>
          <button type="button" className="ass-inc__modal-close" aria-label="Chiudi" onClick={onClose}>
            <i className="fa-light fa-xmark" />
          </button>
        </div>
        <div className="ass-inc__modal-body">
          <div className="ass-inc__field">
            <SelectField
              name="strutturaId"
              label="Struttura"
              value={strutturaId}
              onChange={(e) => setStrutturaId(Number(e.target.value))}
              options={strutture.map((s) => ({ value: s.Id, label: s.nome }))}
            />
          </div>

          <div className="ass-inc__modal-grid">
            <div className="ass-inc__field ass-inc__field-raw">
              <label>Periodo</label>
              <div className="ass-inc__date-range">
                <input type="date" className="sib-input" value={periodoDa} onChange={(e) => setPeriodoDa(e.target.value)} />
                <span>-</span>
                <input type="date" className="sib-input" value={periodoA} onChange={(e) => setPeriodoA(e.target.value)} />
              </div>
            </div>
            <div className="ass-inc__field">
              <CheckboxField
                name="manutenzione"
                label="Metti in manutenzione"
                checked={manutenzione}
                onChange={(e) => setManutenzione(e.target.checked)}
              />
            </div>

            <div className="ass-inc__field">
              <SelectField
                name="camera"
                label="Camere"
                value={camera}
                onChange={(e) => setCamera(e.target.value)}
                options={[{ value: '', label: 'Seleziona' }, ...CAMERE_DISTINCT.map((c) => ({ value: c, label: c }))]}
              />
            </div>
            <div className="ass-inc__field">
              <InputField
                name="areaComune"
                label="Area comune"
                value={areaComune}
                onChange={(e) => setAreaComune(e.target.value)}
              />
            </div>

            <div className="ass-inc__field">
              <SelectField
                name="genereIntervento"
                label="Genere Intervento"
                value={genereIntervento}
                onChange={(e) => setGenereIntervento(e.target.value as GenereIntervento)}
                options={GENERI.map((g) => ({ value: g, label: g }))}
              />
            </div>
            <div className="ass-inc__field">
              <SelectField
                name="reparto"
                label="Reparto"
                value={reparto}
                onChange={(e) => setReparto(e.target.value as Reparto)}
                options={REPARTI.map((r) => ({ value: r, label: r }))}
              />
            </div>

            <div className="ass-inc__field">
              <SelectField
                name="assegnatario"
                label="Assegnatario"
                value={assegnatario}
                onChange={(e) => setAssegnatario(e.target.value)}
                options={[{ value: 'da-assegnare', label: 'Da assegnare' }, { value: 'pieri', label: 'Pieri Matteo' }]}
              />
            </div>
            <div className="ass-inc__field">
              <SelectField
                name="priorita"
                label="Priorità"
                value={priorita}
                onChange={(e) => setPriorita(e.target.value as Priorita)}
                options={PRIORITA.map((p) => ({ value: p, label: p }))}
              />
            </div>
          </div>

          <div className="ass-inc__field">
            <SelectField
              name="tipologia"
              label="Tipologia"
              value={tipologia}
              onChange={(e) => setTipologia(e.target.value as Tipologia)}
              options={TIPOLOGIE.map((t) => ({ value: t, label: t }))}
            />
          </div>
          <div className="ass-inc__field">
            <TextareaField
              name="descrizione"
              label="Descrizione"
              className="ass-inc__textarea"
              rows={3}
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
            />
          </div>
        </div>
        <div className="ass-inc__modal-foot">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Aggiungi</button>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL: Statistiche / Stato assegnazione ─────────────────────────────────

function StatisticheModal({ operatori, onClose }: { operatori: Operatore[]; onClose: () => void }) {
  return (
    <div className="ass-inc__modal-overlay" onClick={onClose}>
      <div className="ass-inc__modal ass-inc__modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="ass-inc__modal-head">
          <h3>Stato assegnazione</h3>
          <button type="button" className="ass-inc__modal-close" aria-label="Chiudi" onClick={onClose}>
            <i className="fa-light fa-xmark" />
          </button>
        </div>
        <div className="ass-inc__modal-body">
          <div className="ass-inc__stat-grid">
            <div className="ass-inc__stat-col">
              <div className="ass-inc__stat-head">Assegnatario</div>
              {operatori.map((o) => (
                <div key={o.id} className="ass-inc__stat-cell">
                  <div className="ass-inc__avatar"><i className="fa-light fa-user" /></div>
                  <span>{o.nominativo}</span>
                </div>
              ))}
            </div>
            <div className="ass-inc__stat-col">
              <div className="ass-inc__stat-head">Numero assegnazioni</div>
              {operatori.map((o) => (
                <div key={o.id} className="ass-inc__stat-cell">{o.numeroAssegnazioni}</div>
              ))}
            </div>
            <div className="ass-inc__stat-col">
              <div className="ass-inc__stat-head">ID assegnazione</div>
              {operatori.map((o) => (
                <div key={o.id} className="ass-inc__stat-cell ass-inc__stat-ids">
                  {o.idAssegnazioni.map((id) => (
                    <span key={id} className="ass-inc__id-pill">Id:{id}</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MODAL: Assegnazione manuale ─────────────────────────────────────────────

function AssegnazioneManualeModal({ segnalazioni, incarichi, operatori, onClose }: {
  segnalazioni: SegnaPending[]
  incarichi: SegnaPending[]
  operatori: Operatore[]
  onClose: () => void
}) {
  const [tab, setTab] = useState<'segnalazioni' | 'incarichi'>('segnalazioni')
  const [repartoSel, setRepartoSel] = useState<Reparto>('Manutenzione')
  const [operatoreSel, setOperatoreSel] = useState<number | null>(null)

  const operatoriFiltered = operatori.filter((o) => o.reparti.includes(repartoSel))
  const rows = tab === 'segnalazioni' ? segnalazioni : incarichi

  return (
    <div className="ass-inc__modal-overlay" onClick={onClose}>
      <div className="ass-inc__modal ass-inc__modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="ass-inc__modal-head">
          <div>
            <h3>Assegnazione manuale</h3>
            <p className="ass-inc__modal-subtitle">Seleziona la segnalazione e il nominativo</p>
          </div>
          <button type="button" className="ass-inc__modal-close" aria-label="Chiudi" onClick={onClose}>
            <i className="fa-light fa-xmark" />
          </button>
        </div>
        <div className="ass-inc__modal-body">
          <div className="ass-inc__tabs">
            <button type="button" className={'ass-inc__tab' + (tab === 'segnalazioni' ? ' ass-inc__tab--active' : '')} onClick={() => setTab('segnalazioni')}>Segnalazioni</button>
            <button type="button" className={'ass-inc__tab' + (tab === 'incarichi' ? ' ass-inc__tab--active' : '')} onClick={() => setTab('incarichi')}>Incarichi</button>
          </div>

          <div className="ass-inc__manuale-grid">
            <div className="ass-inc__manuale-list">
              <table className="sib-table ass-inc__manuale-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ID</th>
                    <th>Struttura</th>
                    <th>Camera</th>
                    <th>Reparto</th>
                    <th>Descrizione</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} className="ass-inc__manuale-empty">Nessun elemento</td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={r.id}>
                      <td><input type="radio" name="manuale-row" /></td>
                      <td>{r.id}</td>
                      <td>{r.struttura}</td>
                      <td>{r.camera}</td>
                      <td>{r.reparto}</td>
                      <td>{r.descrizione}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ass-inc__reparti">
              {REPARTI.map((r) => (
                <button key={r} type="button"
                  className={'ass-inc__reparto-btn' + (repartoSel === r ? ' ass-inc__reparto-btn--active' : '')}
                  onClick={() => setRepartoSel(r)}>
                  <i className={`fa-light fa-${REPARTO_ICONS[r]}`} />
                  <span>{r}</span>
                </button>
              ))}
            </div>

            <div className="ass-inc__manuale-list">
              <table className="sib-table ass-inc__manuale-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nominativo</th>
                    <th>Reparto</th>
                  </tr>
                </thead>
                <tbody>
                  {operatoriFiltered.length === 0 ? (
                    <tr><td colSpan={3} className="ass-inc__manuale-empty">Nessun operatore</td></tr>
                  ) : operatoriFiltered.map((o) => (
                    <tr key={o.id} className={operatoreSel === o.id ? 'ass-inc__row-sel' : ''}>
                      <td>
                        <input type="radio" name="manuale-op" checked={operatoreSel === o.id} onChange={() => setOperatoreSel(o.id)} />
                      </td>
                      <td>{o.nominativo}</td>
                      <td>{o.reparti.join(' ,')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="ass-inc__modal-foot">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={onClose} disabled={operatoreSel === null}>Assegna</button>
        </div>
      </div>
    </div>
  )
}
