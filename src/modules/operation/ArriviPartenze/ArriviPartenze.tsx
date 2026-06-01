import React, { useEffect, useMemo, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Tooltip from '../../../core/components/Tooltip'
import { apiFetchSibylla } from '../../../services/api'
import 'react-day-picker/dist/style.css'
import './ArriviPartenze.sass'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface OspitiCount { adulti: number; bambini: number; infanti: number }

type AzioneStato = 'Check-in completo' | 'Check-in parziale' | 'Check-in da fare' | 'No Show'
type StatoPren   = 'Confermata' | 'Opzionata' | 'In attesa' | 'Annullata'

interface Arrivo {
  id: number
  prenotazioneNum: string
  camera: string
  nominativo: string
  ospiti: OspitiCount
  ospitiTot: { adulti: number; bambini: number; infanti: number }
  arrivo: string       // dd/MM/yyyy
  partenza: string     // dd/MM/yyyy
  arrangiamento: string
  arrangiamentoIcon: string
  agenzia: string
  tipoPren: string
  importo: number
  azione: AzioneStato
  vip: boolean
  statoPren: StatoPren
  dataOpzione?: string
}

interface Partenza {
  id: number
  prenotazioneNum: string
  camera: string
  ospite: string
  fasciaEta: string
  arrivo: string
  partenza: string
  arrangiamento: string
  canale: string
  tipoPrenotazione: string
  residuo: number
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  inArrivo: Arrivo[]
  inPartenza: Partenza[]
}

const FALLBACK: Data = {
  Strutture: [{ Id: 1, nome: 'Hotel Tutorial' }],
  StrutturaId: 1,
  inArrivo: [
    {
      id: 1, prenotazioneNum: '14997', camera: '307', nominativo: 'Novi Ruggero',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 2, bambini: 0, infanti: 0 },
      arrivo: '30/04/2026', partenza: '03/05/2026',
      arrangiamento: 'Bed and breakfast', arrangiamentoIcon: 'bed',
      agenzia: 'Nessuna', tipoPren: 'Individuale', importo: 781.60,
      azione: 'Check-in da fare', vip: false, statoPren: 'Confermata',
    },
    {
      id: 2, prenotazioneNum: '15185', camera: '107', nominativo: 'Ovest Destination Italy',
      ospiti: { adulti: 0, bambini: 0, infanti: 0 }, ospitiTot: { adulti: 2, bambini: 0, infanti: 0 },
      arrivo: '30/04/2026', partenza: '01/05/2026',
      arrangiamento: 'Mezza pensione', arrangiamentoIcon: 'bell-concierge',
      agenzia: 'Ovest Destination Italy', tipoPren: 'Individuale', importo: 313.84,
      azione: 'Check-in da fare', vip: false, statoPren: 'Confermata',
    },
  ],
  inPartenza: [],
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtCurrency(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type ColFilterKey = 'agenzia' | 'azione' | 'statoPren'

const AZIONI_ALL: AzioneStato[] = ['Check-in completo', 'Check-in parziale', 'Check-in da fare', 'No Show']
const STATI_ALL: StatoPren[]    = ['Confermata', 'Opzionata', 'In attesa', 'Annullata']

const REPORT_SERVIZIO_OPTIONS = ['Colazione', 'Pranzo', 'Cena', 'Bar', 'Spa'] as const

export default function ArriviPartenze({ navigate }: { navigate: (p: string) => void }) {
  const today = todayISO()
  const [data, setData] = useState<Data>(FALLBACK)
  const [searchArr, setSearchArr] = useState('')
  const [searchPart, setSearchPart] = useState('')
  const [dataDa, setDataDa] = useState(today)
  const [dataA, setDataA] = useState(today)
  const [reportMenuOpen, setReportMenuOpen] = useState(false)
  const [dateRangeOpen, setDateRangeOpen] = useState(false)

  const stampaPromemoriaServizio = (servizio: string) => {
    // TODO: hook a stampa promemoria servizio
    // params: strutturaId, dataDa, dataA, servizio
    window.print()
    setReportMenuOpen(false)
  }

  const selectedRange: DateRange | undefined = dataDa
    ? { from: parseISO(dataDa), to: dataA ? parseISO(dataA) : undefined }
    : undefined

  const handleRangeSelect = (r: DateRange | undefined) => {
    setDataDa(r?.from ? format(r.from, 'yyyy-MM-dd') : '')
    setDataA(r?.to   ? format(r.to,   'yyyy-MM-dd') : '')
    if (r?.from && r?.to) setDateRangeOpen(false)
  }

  const dateRangeLabel = dataDa
    ? `${format(parseISO(dataDa), 'dd/MM/yyyy')} – ${dataA ? format(parseISO(dataA), 'dd/MM/yyyy') : '…'}`
    : 'Seleziona periodo'

  // Column filters (multi-select)
  const [openFilter, setOpenFilter] = useState<ColFilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColFilterKey, string[]>>({
    agenzia: [],
    azione: [],
    statoPren: [],
  })

  const toggleColFilter = (key: ColFilterKey, value: string) => {
    setColFilters((p) => {
      const cur = p[key]
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      return { ...p, [key]: next }
    })
  }
  const setAllColFilter = (key: ColFilterKey, allValues: string[], select: boolean) => {
    setColFilters((p) => ({ ...p, [key]: select ? [...allValues] : [] }))
  }

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('frontoffice/GetArriviPartenze', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: dataDa, a: dataA },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataDa, dataA, data.StrutturaId])

  const arrivi = useMemo(() => {
    let rows = data.inArrivo
    const q = searchArr.toLowerCase().trim()
    if (q) {
      rows = rows.filter((r) =>
        r.prenotazioneNum.includes(q) ||
        r.nominativo.toLowerCase().includes(q) ||
        r.camera.toLowerCase().includes(q),
      )
    }
    if (colFilters.agenzia.length)   rows = rows.filter((r) => colFilters.agenzia.includes(r.agenzia))
    if (colFilters.azione.length)    rows = rows.filter((r) => colFilters.azione.includes(r.azione))
    if (colFilters.statoPren.length) rows = rows.filter((r) => colFilters.statoPren.includes(r.statoPren))
    return rows
  }, [data.inArrivo, searchArr, colFilters])

  const agenzieDistinct = useMemo(
    () => Array.from(new Set(data.inArrivo.map((r) => r.agenzia))).sort(),
    [data.inArrivo],
  )

  const partenze = useMemo(() => {
    const q = searchPart.toLowerCase().trim()
    if (!q) return data.inPartenza
    return data.inPartenza.filter((r) =>
      r.prenotazioneNum.includes(q) ||
      r.ospite.toLowerCase().includes(q) ||
      r.camera.toLowerCase().includes(q),
    )
  }, [data.inPartenza, searchPart])

  // Stats
  const totPresenze = arrivi.reduce((s, a) => s + a.ospitiTot.adulti + a.ospitiTot.bambini + a.ospitiTot.infanti, 0)
  const totCamere = new Set(arrivi.map((a) => a.camera)).size
  const totGruppi = arrivi.filter((a) => a.tipoPren?.toLowerCase().includes('gruppo')).length
  const pctGruppi = arrivi.length ? Math.round((totGruppi / arrivi.length) * 100) : 0
  const pctIndividuali = 100 - pctGruppi

  const totPartCamere = new Set(partenze.map((p) => p.camera)).size
  const totPartGruppi = partenze.filter((p) => p.tipoPrenotazione?.toLowerCase().includes('gruppo')).length
  const partPctGruppi = partenze.length ? Math.round((totPartGruppi / partenze.length) * 100) : 0
  const partPctIndividuali = partenze.length ? 100 - partPctGruppi : 0

  return (
    <div className="arrivi-partenze">
      <BtnBack onClick={() => navigate('home')} />

      {/* ─── IN ARRIVO ──────────────────────────────────────────────────────── */}
      <PageHeader
        title="In arrivo"
        subtitle="Gestione e monitoraggio del flusso giornaliero dei check-in"
      />

      <div className="arrivi-partenze__toolbar">
        {/* Filtri sx */}
        <div className="arrivi-partenze__field arrivi-partenze__field--search">
          <input
            type="search"
            className="sib-input arrivi-partenze__search-input"
            placeholder="Cerca"
            value={searchArr}
            onChange={(e) => setSearchArr(e.target.value)}
          />
          <i className="fa-light fa-magnifying-glass arrivi-partenze__search-icon" />
        </div>

        <div className="arrivi-partenze__field">
          <label className="arrivi-partenze__label" htmlFor="ap-strutture">Strutture</label>
          <select
            id="ap-strutture"
            className="sib-select arrivi-partenze__select"
            value={data.StrutturaId ?? ''}
            onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          >
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>

        <div className="arrivi-partenze__field arrivi-partenze__field--date">
          <label className="arrivi-partenze__label" htmlFor="ap-date-range">Data</label>
          <button
            id="ap-date-range"
            type="button"
            className="arrivi-partenze__date-range"
            onClick={() => setDateRangeOpen((o) => !o)}
            aria-haspopup="dialog"
            aria-expanded={dateRangeOpen}
          >
            <span className="arrivi-partenze__date-range-label">{dateRangeLabel}</span>
            <i className="fa-light fa-calendar arrivi-partenze__date-icon" aria-hidden="true" />
          </button>

          {dateRangeOpen && (
            <>
              <div
                className="arrivi-partenze__date-overlay"
                onClick={() => setDateRangeOpen(false)}
              />
              <div
                className="arrivi-partenze__date-popover"
                role="dialog"
                aria-label="Seleziona intervallo date"
                onClick={(e) => e.stopPropagation()}
              >
                <DayPicker
                  mode="range"
                  numberOfMonths={2}
                  pagedNavigation
                  weekStartsOn={1}
                  locale={it}
                  selected={selectedRange}
                  onSelect={handleRangeSelect}
                  defaultMonth={selectedRange?.from ?? new Date()}
                />
              </div>
            </>
          )}
        </div>

        {/* Azioni rapide (icona) */}
        <div className="arrivi-partenze__toolbar-icons">
          <Tooltip text="Check-in libero">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Check-in libero">
              <i className="fa-light fa-calendar-clock" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip text="Planner operativo">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Planner operativo" onClick={() => navigate('planner')}>
              <i className="fa-light fa-building" aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip text="Ospiti in casa">
            <button type="button" className="sib-btn sib-btn--icon" aria-label="Ospiti in casa" onClick={() => navigate('ospiti-in-casa')}>
              <i className="fa-light fa-house" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>

        {/* Stats inline */}
        <div className="arrivi-partenze__stats">
          <span className="arrivi-partenze__stat"><i className="fa-light fa-user" aria-hidden="true" /> Presenze: <strong>{totPresenze}</strong></span>
          <span className="arrivi-partenze__stat"><i className="fa-light fa-bed-front" aria-hidden="true" /> Camere: <strong>{totCamere}</strong></span>
          <span className="arrivi-partenze__stat"><i className="fa-light fa-users" aria-hidden="true" /> Gruppi: <strong>{pctGruppi}%</strong></span>
          <span className="arrivi-partenze__stat"><i className="fa-light fa-user-check" aria-hidden="true" /> Individuali: <strong>{pctIndividuali}%</strong></span>
        </div>

        {/* Report servizio (stampa promemoria del giorno) + export tabella (dx) */}
        <div className="arrivi-partenze__toolbar-right">
          <div className="arrivi-partenze__report-menu">
            <button
              type="button"
              className="sib-btn sib-btn--primary arrivi-partenze__report-btn"
              onClick={() => setReportMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={reportMenuOpen}
            >
              <i className="fa-light fa-print" aria-hidden="true" />
              Stampa promemoria
              <i className="fa-light fa-chevron-down arrivi-partenze__report-btn-chevron" aria-hidden="true" />
            </button>

            {reportMenuOpen && (
              <>
                <div
                  className="arrivi-partenze__report-menu-overlay"
                  onClick={() => setReportMenuOpen(false)}
                />
                <div
                  className="arrivi-partenze__report-menu-list"
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="arrivi-partenze__report-menu-heading">
                    Scegli il servizio
                  </div>
                  {REPORT_SERVIZIO_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      role="menuitem"
                      className="arrivi-partenze__report-menu-item"
                      onClick={() => stampaPromemoriaServizio(opt)}
                    >
                      <i className="fa-light fa-print" aria-hidden="true" />
                      <span>Stampa promemoria di <strong>{opt}</strong></span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="arrivi-partenze__toolbar-icons">
            <Tooltip text="Grafico">
              <button type="button" className="sib-btn sib-btn--icon" aria-label="Grafico">
                <i className="fa-light fa-chart-line" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip text="Esporta PDF">
              <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta PDF">
                <i className="fa-light fa-file-pdf" aria-hidden="true" />
              </button>
            </Tooltip>
            <Tooltip text="Esporta XLS">
              <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta XLS">
                <i className="fa-light fa-file-excel" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table arrivi-partenze__table">
          <thead>
            <tr>
              <th rowSpan={2}>Prenotazione n°</th>
              <th rowSpan={2}>Camera</th>
              <th rowSpan={2}>Nominativo</th>
              <th colSpan={3} className="arrivi-partenze__th-center">Ospiti</th>
              <th rowSpan={2}>Arrivo</th>
              <th rowSpan={2}>Partenza</th>
              <th rowSpan={2}>Arrangiamento</th>
              <th rowSpan={2}>
                <ColFilterHeader
                  label="Agenzia"
                  popupTitle="Tutti"
                  options={agenzieDistinct}
                  selected={colFilters.agenzia}
                  open={openFilter === 'agenzia'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'agenzia' ? null : 'agenzia')}
                  onToggle={(v) => toggleColFilter('agenzia', v)}
                  onSelectAll={(s) => setAllColFilter('agenzia', agenzieDistinct, s)}
                />
              </th>
              <th rowSpan={2}>Tipo pren.</th>
              <th rowSpan={2}>Importo</th>
              <th rowSpan={2}>
                <ColFilterHeader
                  label="Azioni"
                  popupTitle="scelte multiple"
                  options={AZIONI_ALL}
                  selected={colFilters.azione}
                  open={openFilter === 'azione'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'azione' ? null : 'azione')}
                  onToggle={(v) => toggleColFilter('azione', v)}
                  onSelectAll={(s) => setAllColFilter('azione', AZIONI_ALL, s)}
                />
              </th>
              <th rowSpan={2}>Vip</th>
              <th rowSpan={2}>
                <ColFilterHeader
                  label="Stato pren."
                  popupTitle="Tutti"
                  options={STATI_ALL}
                  selected={colFilters.statoPren}
                  open={openFilter === 'statoPren'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'statoPren' ? null : 'statoPren')}
                  onToggle={(v) => toggleColFilter('statoPren', v)}
                  onSelectAll={(s) => setAllColFilter('statoPren', STATI_ALL, s)}
                />
              </th>
              <th rowSpan={2}>Data Opzione <i className="fa-solid fa-arrow-up arrivi-partenze__sort-ico" /></th>
            </tr>
            <tr>
              <th className="arrivi-partenze__th-sub"><i className="fa-light fa-people-simple" /></th>
              <th className="arrivi-partenze__th-sub"><i className="fa-light fa-child" /></th>
              <th className="arrivi-partenze__th-sub"><i className="fa-light fa-baby-carriage" /></th>
            </tr>
          </thead>
          <tbody>
            {arrivi.length === 0 ? (
              <tr><td colSpan={16} className="sib-empty">Nessun arrivo per i criteri selezionati.</td></tr>
            ) : arrivi.map((r) => (
              <tr key={r.id}>
                <td><span className="arrivi-partenze__pren-badge"><i className="fa-light fa-id-card" /> {r.prenotazioneNum}</span></td>
                <td>{r.camera}</td>
                <td>{r.nominativo}</td>
                <td className="arrivi-partenze__td-center">{r.ospiti.adulti} / {r.ospitiTot.adulti}</td>
                <td className="arrivi-partenze__td-center">{r.ospiti.bambini} / {r.ospitiTot.bambini}</td>
                <td className="arrivi-partenze__td-center">{r.ospiti.infanti} / {r.ospitiTot.infanti}</td>
                <td>{r.arrivo}</td>
                <td>{r.partenza}</td>
                <td className="arrivi-partenze__td-center"><i className={`fa-light fa-${r.arrangiamentoIcon}`} title={r.arrangiamento} /></td>
                <td className={r.agenzia === '-' ? 'sib-cell--muted' : ''}>{r.agenzia}</td>
                <td className="arrivi-partenze__td-center"><i className={`fa-light fa-${r.tipoPren?.toLowerCase().includes('gruppo') ? 'users' : 'user'}`} title={r.tipoPren} /></td>
                <td>{fmtCurrency(r.importo)}</td>
                <td className="arrivi-partenze__td-center">
                  <button type="button" className="sib-btn sib-btn--icon" aria-label="Schedina"><i className="fa-light fa-id-card" /></button>
                </td>
                <td className="arrivi-partenze__td-center">{r.vip ? <i className="fa-solid fa-star arrivi-partenze__vip" /> : ''}</td>
                <td><span className={`arrivi-partenze__stato arrivi-partenze__stato--${r.statoPren.toLowerCase()}`}>{r.statoPren}</span></td>
                <td className="sib-cell--muted">{r.dataOpzione ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── IN PARTENZA ────────────────────────────────────────────────────── */}
      <PageHeader
        title="In partenza"
        subtitle="Gestione e monitoraggio del flusso giornaliero dei check-out"
      />

      <div className="arrivi-partenze__bar">
        <div className="arrivi-partenze__bar-left">
          <div className="arrivi-partenze__field arrivi-partenze__field--search">
            <input
              type="search"
              className="sib-input arrivi-partenze__search-input"
              placeholder="Cerca"
              value={searchPart}
              onChange={(e) => setSearchPart(e.target.value)}
            />
            <i className="fa-light fa-magnifying-glass arrivi-partenze__search-icon" />
          </div>
        </div>

        <div className="arrivi-partenze__bar-right">
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm">
            <i className="fa-light fa-bed-front" /> Checkout camere
          </button>
        </div>
      </div>

      <div className="arrivi-partenze__bar arrivi-partenze__bar--info">
        <div className="arrivi-partenze__stats">
          <span className="arrivi-partenze__stat"><i className="fa-light fa-bed-front" /> Camere: <strong>{totPartCamere}</strong></span>
          <span className="arrivi-partenze__stat"><i className="fa-light fa-users" /> Gruppi: <strong>{partPctGruppi}%</strong></span>
          <span className="arrivi-partenze__stat"><i className="fa-light fa-user-check" /> Individuali: <strong>{partPctIndividuali}%</strong></span>
        </div>
        <div className="arrivi-partenze__exports">
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta PDF" aria-label="Esporta PDF"><i className="fa-light fa-file-pdf" /></button>
          <button type="button" className="sib-btn sib-btn--icon" title="Esporta XLS" aria-label="Esporta XLS"><i className="fa-light fa-file-excel" /></button>
        </div>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th>Prenotazione n°</th>
              <th>Camera</th>
              <th>Ospite</th>
              <th>Fascia età</th>
              <th>Arrivo</th>
              <th>Partenza</th>
              <th>Arrangiamento</th>
              <th>Canale</th>
              <th>Tipo prenotazione</th>
              <th>Residuo da pagare</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {partenze.length === 0 ? (
              <tr><td colSpan={11} className="sib-empty">Nessuna partenza per i criteri selezionati.</td></tr>
            ) : partenze.map((p) => (
              <tr key={p.id}>
                <td>{p.prenotazioneNum}</td>
                <td>{p.camera}</td>
                <td>{p.ospite}</td>
                <td>{p.fasciaEta}</td>
                <td>{p.arrivo}</td>
                <td>{p.partenza}</td>
                <td>{p.arrangiamento}</td>
                <td>{p.canale}</td>
                <td>{p.tipoPrenotazione}</td>
                <td>{fmtCurrency(p.residuo)}</td>
                <td>
                  <button type="button" className="sib-btn sib-btn--icon" aria-label="Dettagli"><i className="fa-light fa-id-card" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── COL FILTER HEADER ────────────────────────────────────────────────────────

interface ColFilterHeaderProps {
  label: string
  popupTitle: string
  options: string[]
  selected: string[]
  open: boolean
  onToggleOpen: () => void
  onToggle: (value: string) => void
  onSelectAll: (select: boolean) => void
}

function ColFilterHeader(props: ColFilterHeaderProps) {
  const { label, popupTitle, options, selected, open, onToggleOpen, onToggle, onSelectAll } = props
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0

  return (
    <div className="ap-colfilter">
      <span>{label}</span>
      <button
        type="button"
        className={'ap-colfilter__btn' + (hasFilter ? ' ap-colfilter__btn--active' : '')}
        onClick={onToggleOpen}
        aria-label={`Filtra per ${label}`}
      >
        <i className="fa-solid fa-filter" />
      </button>
      {open && (
        <>
          <div className="ap-colfilter__overlay" onClick={onToggleOpen} />
          <div className="ap-colfilter__popup" onClick={(e) => e.stopPropagation()}>
            <div className="ap-colfilter__title">{popupTitle}</div>
            <label className="ap-colfilter__option">
              <input
                type="checkbox"
                className="sib-checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
              <span>Tutti</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="ap-colfilter__option">
                <input
                  type="checkbox"
                  className="sib-checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => onToggle(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
