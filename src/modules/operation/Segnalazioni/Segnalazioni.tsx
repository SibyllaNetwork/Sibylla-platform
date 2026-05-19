import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import { apiFetchSibylla } from '../../../services/api'
import './Segnalazioni.sass'

const PAGE_SIZE = 10

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Status = 'aperta' | 'in-lavorazione' | 'risolta' | 'annullata'
type StatoLav = 'da-fare' | 'in-corso' | 'completata'
type Reparto = 'Manutenzione' | 'Housekeeping' | 'Reception' | 'Cucina'
type GenereIntervento = 'Elettrico' | 'Idraulico' | 'Edile' | 'Pulizie' | 'Altro'
type Priorita = 'Bassa' | 'Normale' | 'Alta' | 'Urgente'

interface Segnalazione {
  id: number
  segnalazioneDi: string
  status: Status
  reparto: Reparto
  hasFoto: boolean
  genereIntervento: GenereIntervento
  statoLavorazione: StatoLav
  descrizione: string
  struttura: string
  camera: string
  data: string
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number
  segnalazioni: Segnalazione[]
}

const FALLBACK: Data = {
  Strutture: [
    { Id: 1, nome: 'Hotel Archimede' },
    { Id: 2, nome: 'Hotel Tutorial' },
  ],
  StrutturaId: 1,
  segnalazioni: [],
}

const REPARTI: Reparto[] = ['Manutenzione', 'Housekeeping', 'Reception', 'Cucina']
const GENERI: GenereIntervento[] = ['Elettrico', 'Idraulico', 'Edile', 'Pulizie', 'Altro']
const PRIORITA: Priorita[] = ['Bassa', 'Normale', 'Alta', 'Urgente']
const STATI_LAV: StatoLav[] = ['da-fare', 'in-corso', 'completata']
const STATUS_ALL: Status[] = ['aperta', 'in-lavorazione', 'risolta', 'annullata']

const STATUS_LABEL: Record<Status, string> = {
  'aperta':         'Aperta',
  'in-lavorazione': 'In lavorazione',
  'risolta':        'Risolta',
  'annullata':      'Annullata',
}
const STATO_LAV_LABEL: Record<StatoLav, string> = {
  'da-fare':    'Da fare',
  'in-corso':   'In corso',
  'completata': 'Completata',
}

const CAMERE_DISTINCT: string[] = ['001', '002', '003', '004', '005', '006', '007', '008']

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type ColFilterKey = 'status' | 'reparto' | 'genereIntervento' | 'statoLavorazione' | 'camera'

export default function Segnalazioni({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [dataDa, setDataDa] = useState('2026-01-01')
  const [dataA, setDataA] = useState('2026-04-30')
  const [reparto, setReparto] = useState<'Tutti' | Reparto>('Tutti')
  const [statoLav, setStatoLav] = useState<'Tutti' | StatoLav>('Tutti')
  const [sortDataDir, setSortDataDir] = useState<'asc' | 'desc' | null>(null)

  const [openFilter, setOpenFilter] = useState<ColFilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColFilterKey, string[]>>({
    status: [],
    reparto: [],
    genereIntervento: [],
    statoLavorazione: [],
    camera: [],
  })

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('operation/GetSegnalazioni', {
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

  const filtered = useMemo(() => {
    let rows = data.segnalazioni
    if (reparto !== 'Tutti') rows = rows.filter((r) => r.reparto === reparto)
    if (statoLav !== 'Tutti') rows = rows.filter((r) => r.statoLavorazione === statoLav)
    if (colFilters.status.length)           rows = rows.filter((r) => colFilters.status.includes(r.status))
    if (colFilters.reparto.length)          rows = rows.filter((r) => colFilters.reparto.includes(r.reparto))
    if (colFilters.genereIntervento.length) rows = rows.filter((r) => colFilters.genereIntervento.includes(r.genereIntervento))
    if (colFilters.statoLavorazione.length) rows = rows.filter((r) => colFilters.statoLavorazione.includes(r.statoLavorazione))
    if (colFilters.camera.length)           rows = rows.filter((r) => colFilters.camera.includes(r.camera))
    if (sortDataDir) {
      const dir = sortDataDir === 'asc' ? 1 : -1
      const parse = (d: string) => {
        const [dd, mm, yy] = d.split('/').map(Number)
        return new Date(yy, mm - 1, dd).getTime()
      }
      rows = [...rows].sort((a, b) => (parse(a.data) - parse(b.data)) * dir)
    }
    return rows
  }, [data.segnalazioni, reparto, statoLav, colFilters, sortDataDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [reparto, statoLav, colFilters, dataDa, dataA, data.StrutturaId])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const toggleSortData = () => {
    if (sortDataDir === null) setSortDataDir('asc')
    else if (sortDataDir === 'asc') setSortDataDir('desc')
    else setSortDataDir(null)
  }

  return (
    <div className="segnal">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Segnalazioni"
        subtitle="Gestione delle richieste di intervento tecnico/operativo all'interno della struttura con tracking in tempo reale"
      />

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="segnal__bar">
        <div className="segnal__bar-left">
          <div className="segnal__field">
            <label>Data</label>
            <div className="segnal__date-range">
              <input type="date" className="sib-input" aria-label="Data da" value={dataDa} onChange={(e) => setDataDa(e.target.value)} />
              <span>-</span>
              <input type="date" className="sib-input" aria-label="Data a" value={dataA} onChange={(e) => setDataA(e.target.value)} />
            </div>
          </div>
          <div className="segnal__field">
            <label>Reparto</label>
            <select className="sib-select segnal__select" value={reparto} onChange={(e) => setReparto(e.target.value as any)}>
              <option value="Tutti">Tutti</option>
              {REPARTI.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="segnal__field">
            <label>Stato lavorazione</label>
            <select className="sib-select segnal__select" value={statoLav} onChange={(e) => setStatoLav(e.target.value as any)}>
              <option value="Tutti">Tutti</option>
              {STATI_LAV.map((s) => <option key={s} value={s}>{STATO_LAV_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="segnal__field">
            <label>Strutture</label>
            <select className="sib-select segnal__select" value={data.StrutturaId} onChange={(e) => setData({ ...data, StrutturaId: Number(e.target.value) })}>
              {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="segnal__bar-right">
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setShowModal(true)}>
            <i className="fa-light fa-plus" /> Crea segnalazione
          </button>
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta XLS" aria-label="Esporta XLS"><i className="fa-light fa-file-excel" /></button>
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta PDF" aria-label="Esporta PDF"><i className="fa-light fa-file-pdf" /></button>
        </div>
      </div>

      {/* ─── Tabella ───────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="segnal__table-block">
          <table className="sib-table segnal__head-only">
            <thead>
              <tr>
                <th>Segnalazione di</th>
                <th>
                  <ColFilterHeader label="Status" options={STATUS_ALL} optionLabel={(v) => STATUS_LABEL[v as Status]}
                    selected={colFilters.status} open={openFilter === 'status'}
                    onToggleOpen={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                    onToggle={(v) => toggleColFilter('status', v)} onSelectAll={(s) => setAllColFilter('status', STATUS_ALL, s)} />
                </th>
                <th>
                  <ColFilterHeader label="Reparto" options={REPARTI} selected={colFilters.reparto} open={openFilter === 'reparto'}
                    onToggleOpen={() => setOpenFilter(openFilter === 'reparto' ? null : 'reparto')}
                    onToggle={(v) => toggleColFilter('reparto', v)} onSelectAll={(s) => setAllColFilter('reparto', REPARTI, s)} />
                </th>
                <th>Foto</th>
                <th>
                  <ColFilterHeader label="Genere intervento" options={GENERI} selected={colFilters.genereIntervento} open={openFilter === 'genereIntervento'}
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
                <th>
                  <ColFilterHeader label="Camera" options={CAMERE_DISTINCT} selected={colFilters.camera} open={openFilter === 'camera'}
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
                <th>Azioni</th>
              </tr>
            </thead>
          </table>
          <div className="segnal__empty">Nessuna segnalazione trovata.</div>
        </div>
      ) : (
        <>
          <div className="sib-table-wrap">
            <table className="sib-table segnal__table">
              <thead>
                <tr>
                  <th>Segnalazione di</th>
                  <th>
                    <ColFilterHeader label="Status" options={STATUS_ALL} optionLabel={(v) => STATUS_LABEL[v as Status]}
                      selected={colFilters.status} open={openFilter === 'status'}
                      onToggleOpen={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
                      onToggle={(v) => toggleColFilter('status', v)} onSelectAll={(s) => setAllColFilter('status', STATUS_ALL, s)} />
                  </th>
                  <th>
                    <ColFilterHeader label="Reparto" options={REPARTI} selected={colFilters.reparto} open={openFilter === 'reparto'}
                      onToggleOpen={() => setOpenFilter(openFilter === 'reparto' ? null : 'reparto')}
                      onToggle={(v) => toggleColFilter('reparto', v)} onSelectAll={(s) => setAllColFilter('reparto', REPARTI, s)} />
                  </th>
                  <th>Foto</th>
                  <th>
                    <ColFilterHeader label="Genere intervento" options={GENERI} selected={colFilters.genereIntervento} open={openFilter === 'genereIntervento'}
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
                  <th>
                    <ColFilterHeader label="Camera" options={CAMERE_DISTINCT} selected={colFilters.camera} open={openFilter === 'camera'}
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
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.segnalazioneDi}</td>
                    <td><span className={`segnal__status segnal__status--${s.status}`}>{STATUS_LABEL[s.status]}</span></td>
                    <td>{s.reparto}</td>
                    <td>{s.hasFoto ? <i className="fa-light fa-image" /> : <span className="sib-cell--muted">-</span>}</td>
                    <td>{s.genereIntervento}</td>
                    <td>{STATO_LAV_LABEL[s.statoLavorazione]}</td>
                    <td>{s.descrizione}</td>
                    <td>{s.struttura}</td>
                    <td>{s.camera}</td>
                    <td>{s.data}</td>
                    <td>
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Visualizza"><i className="fa-light fa-eye" /></button>
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Modifica"><i className="fa-light fa-pen" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="segnal__pagination">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {showModal && <CreaSegnalazioneModal strutture={data.Strutture} onClose={() => setShowModal(false)} />}
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
    <div className="sg-colfilter">
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

function CreaSegnalazioneModal({ strutture, onClose }: { strutture: { Id: number; nome: string }[]; onClose: () => void }) {
  const [strutturaId, setStrutturaId] = useState(strutture[0]?.Id ?? 1)
  const [genereIntervento, setGenereIntervento] = useState<GenereIntervento>('Elettrico')
  const [reparto, setReparto] = useState<Reparto>('Manutenzione')
  const [priorita, setPriorita] = useState<Priorita>('Normale')
  const [camera, setCamera] = useState('')
  const [areaComune, setAreaComune] = useState('')
  const [descrizione, setDescrizione] = useState('')

  return (
    <div className="segnal__modal-overlay" onClick={onClose}>
      <div className="segnal__modal" onClick={(e) => e.stopPropagation()}>
        <div className="segnal__modal-head">
          <h3>Aggiungi segnalazione</h3>
          <button type="button" className="segnal__modal-close" aria-label="Chiudi" onClick={onClose}>
            <i className="fa-light fa-xmark" />
          </button>
        </div>
        <div className="segnal__modal-body">
          <div className="segnal__modal-grid">
            <div className="segnal__field">
              <label>Struttura</label>
              <select className="sib-select" value={strutturaId} onChange={(e) => setStrutturaId(Number(e.target.value))}>
                {strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="segnal__field">
              <label>Genere Intervento</label>
              <select className="sib-select" value={genereIntervento} onChange={(e) => setGenereIntervento(e.target.value as GenereIntervento)}>
                {GENERI.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="segnal__field">
              <label>Reparto</label>
              <select className="sib-select" value={reparto} onChange={(e) => setReparto(e.target.value as Reparto)}>
                {REPARTI.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="segnal__field">
              <label>Priorità</label>
              <select className="sib-select" value={priorita} onChange={(e) => setPriorita(e.target.value as Priorita)}>
                {PRIORITA.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="segnal__field">
              <label>Camere</label>
              <select className="sib-select" value={camera} onChange={(e) => setCamera(e.target.value)}>
                <option value="">Seleziona</option>
                {CAMERE_DISTINCT.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="segnal__field">
              <label>Area comune</label>
              <input className="sib-input" value={areaComune} onChange={(e) => setAreaComune(e.target.value)} />
            </div>
          </div>
          <div className="segnal__field">
            <label>Descrizione</label>
            <textarea className="sib-input segnal__textarea" rows={3} value={descrizione} onChange={(e) => setDescrizione(e.target.value)} />
          </div>
        </div>
        <div className="segnal__modal-foot">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Aggiungi</button>
        </div>
      </div>
    </div>
  )
}
