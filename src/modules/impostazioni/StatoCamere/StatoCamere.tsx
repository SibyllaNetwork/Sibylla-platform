import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import { SelectField } from '../../../core/components/form'
import Tooltip from '../../../core/components/Tooltip'
import { apiFetchSibylla } from '../../../services/api'
import './StatoCamere.sass'
import { useStruttureCliente, useStrutturaCorrente } from '../../../hooks/useStrutturaCorrente'
import { idStruttura, type SchedaDemo } from '../../../core/demo/struttureDemo'
import { generaPms } from '../../operation/_data/pmsDemo'

const PAGE_SIZE = 12

// ─── TYPES ────────────────────────────────────────────────────────────────────

type StatoPulizia = 'pulita' | 'in-pulizia' | 'da-pulire'
type StatoLavorazione = 'completata' | 'in-corso' | 'da-fare'

interface Camera {
  id: string
  nome: string
  struttura: string
  stato: StatoPulizia
  statoLavorazione: StatoLavorazione
  vip: boolean
  segnalazioni: string
  note: string
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  camere: Camera[]
}

const TIPOLOGIE = [
  'Doppia Classic',
  'Doppia convertibile in Tripla',
  'DUS',
  'Singola Classic',
  'Matrimoniale Economy',
]

// Senza backend: le camere della struttura dal gestionale demo (stessi numeri e
// tipologie di Planner e Inventario), con lo stato pulizie di oggi.
function genFallback(schede: SchedaDemo[], strutturaId: number | null): Data {
  const hotel = schede.filter((x) => x.camere > 0)
  const sel = hotel.find((x) => idStruttura(x.nome) === strutturaId) ?? hotel[0]
  const camere: Camera[] = []
  if (sel) {
    const pms = generaPms({ nome: sel.nome, categoria: sel.categoria, camere: sel.camere })
    const oggi = new Date().toISOString().slice(0, 10)
    const stati: StatoPulizia[] = ['pulita', 'in-pulizia', 'da-pulire']
    const statiLav: StatoLavorazione[] = ['completata', 'in-corso', 'da-fare']
    pms.camere.forEach((c, i) => {
      const parte = pms.prenotazioni.some((p) => p.camera === c.numero && p.checkOut === oggi)
      const k = (sel.seme + i * 7919) % 100
      camere.push({
        id: c.numero, nome: `${c.tipo} - ${c.numero}`, struttura: sel.nome,
        stato: parte ? 'da-pulire' : stati[k % 3], statoLavorazione: statiLav[(k >> 2) % 3],
        vip: pms.prenotazioni.some((p) => p.camera === c.numero && p.vip && p.checkIn <= oggi && oggi < p.checkOut),
        segnalazioni: k < 6 ? 'Manutenzione' : 'N/A', note: k < 6 ? 'Intervento richiesto' : 'Nessuna segnalazione',
      })
    })
  }
  return { Strutture: hotel.map((x) => ({ Id: idStruttura(x.nome), nome: x.nome })), StrutturaId: sel ? idStruttura(sel.nome) : null, camere }
}

const STATO_LABEL: Record<StatoPulizia, string> = {
  'pulita':     'Pulita',
  'in-pulizia': 'In pulizia',
  'da-pulire':  'Da pulire',
}

const STATO_LAV_LABEL: Record<StatoLavorazione, string> = {
  'completata': 'Completata',
  'in-corso':   'In corso',
  'da-fare':    'Da fare',
}

// Colore = livello di completezza: rosso (in lavorazione) → arancio (a breve
// conclusa) → verde (conclusa). Un'unica icona per colonna, colorata di conseguenza.
const PULIZIA_COLOR: Record<StatoPulizia, string> = {
  'da-pulire':  'rosso',
  'in-pulizia': 'arancio',
  'pulita':     'verde',
}
const LAV_COLOR: Record<StatoLavorazione, string> = {
  'da-fare':    'rosso',
  'in-corso':   'arancio',
  'completata': 'verde',
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

type ColFilterKey = 'stato' | 'statoLavorazione' | 'segnalazioni'

export default function StatoCamere({ navigate }: { navigate: (p: string) => void }) {
  const schede = useStruttureCliente()
  const { struttura: strutturaCorrente } = useStrutturaCorrente()
  const [data, setData] = useState<Data>(() => genFallback(schede, idStruttura(strutturaCorrente)))
  // Cambiata la struttura selezionata in alto: si riparte da quella.
  useEffect(() => { setData(genFallback(schede, idStruttura(strutturaCorrente))) }, [schede, strutturaCorrente])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [openFilter, setOpenFilter] = useState<ColFilterKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColFilterKey, string[]>>({
    stato: [],
    statoLavorazione: [],
    segnalazioni: [],
  })

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('operation/GetStatoCamere', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData((d) => (d.camere.length && d.camere[0].struttura === d.Strutture.find((x) => x.Id === d.StrutturaId)?.nome ? d : genFallback(schede, d.StrutturaId))) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.StrutturaId])

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

  const segnalazioniDistinct = useMemo(
    () => Array.from(new Set(data.camere.map((c) => c.segnalazioni))).sort(),
    [data.camere],
  )

  const filtered = useMemo(() => {
    let rows = data.camere
    const q = search.toLowerCase().trim()
    if (q) rows = rows.filter((c) => c.nome.toLowerCase().includes(q) || c.id.includes(q))
    if (colFilters.stato.length)
      rows = rows.filter((c) => colFilters.stato.includes(c.stato))
    if (colFilters.statoLavorazione.length)
      rows = rows.filter((c) => colFilters.statoLavorazione.includes(c.statoLavorazione))
    if (colFilters.segnalazioni.length)
      rows = rows.filter((c) => colFilters.segnalazioni.includes(c.segnalazioni))
    return rows
  }, [data.camere, search, colFilters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, colFilters, data.StrutturaId])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  return (
    <div className="stato-cam">
      <PageHead
        back
        title="Stato camere"
        subtitle="Gestione centralizzata e aggiornata in tempo reale delle condizioni delle camere"
      />

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="stato-cam__bar">
        <SelectField
          name="struttura"
          label="Strutture"
          className="stato-cam__field stato-cam__select"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={data.Strutture.map((s) => ({ value: s.Id, label: s.nome }))}
        />

        <div className="stato-cam__field stato-cam__field-raw">
          <span>Cerca</span>
          <div className="stato-cam__search">
            <input
              type="search"
              className="sib-input"
              placeholder="Cerca per n° camera..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <i className="fa-regular fa-magnifying-glass stato-cam__search-ico" />
          </div>
        </div>

        <button type="button" className="sib-btn sib-btn--icon stato-cam__refresh" title="Aggiorna" aria-label="Aggiorna">
          <i className="fa-regular fa-arrows-rotate" />
        </button>

        <div className="stato-cam__bar-actions">
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('previsione-movimenti')}>
            <i className="fa-light fa-chart-line" /> Previsione movimenti camere
          </button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('piano-camere')}>
            <i className="fa-light fa-calendar-days" /> Piano camere giornaliero
          </button>
        </div>
      </div>

      {/* ─── Tabella ───────────────────────────────────────────────────────── */}
      <div className="sib-table-wrap">
        <table className="sib-table stato-cam__table">
          <thead>
            <tr>
              <th>N° Camera</th>
              <th>Struttura</th>
              <th className="stato-cam__th-center">VIP</th>
              <th className="stato-cam__th-icons">
                <ColFilterHeader
                  label="Stato"
                  options={['pulita', 'in-pulizia', 'da-pulire']}
                  optionLabel={(v) => STATO_LABEL[v as StatoPulizia]}
                  selected={colFilters.stato}
                  open={openFilter === 'stato'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'stato' ? null : 'stato')}
                  onToggle={(v) => toggleColFilter('stato', v)}
                  onSelectAll={(s) => setAllColFilter('stato', ['pulita', 'in-pulizia', 'da-pulire'], s)}
                />
              </th>
              <th className="stato-cam__th-icons">
                <ColFilterHeader
                  label="Stato lavorazione"
                  options={['completata', 'in-corso', 'da-fare']}
                  optionLabel={(v) => STATO_LAV_LABEL[v as StatoLavorazione]}
                  selected={colFilters.statoLavorazione}
                  open={openFilter === 'statoLavorazione'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'statoLavorazione' ? null : 'statoLavorazione')}
                  onToggle={(v) => toggleColFilter('statoLavorazione', v)}
                  onSelectAll={(s) => setAllColFilter('statoLavorazione', ['completata', 'in-corso', 'da-fare'], s)}
                />
              </th>
              <th>
                <ColFilterHeader
                  label="Segnalazioni"
                  options={segnalazioniDistinct}
                  selected={colFilters.segnalazioni}
                  open={openFilter === 'segnalazioni'}
                  onToggleOpen={() => setOpenFilter(openFilter === 'segnalazioni' ? null : 'segnalazioni')}
                  onToggle={(v) => toggleColFilter('segnalazioni', v)}
                  onSelectAll={(s) => setAllColFilter('segnalazioni', segnalazioniDistinct, s)}
                />
              </th>
              <th>Note di assegnazione</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={7} className="sib-empty">Nessuna camera per i criteri selezionati.</td></tr>
            ) : pageRows.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{c.struttura}</td>
                <td className="stato-cam__td-center">
                  <Tooltip text={c.vip ? 'VIP' : 'Standard'}>
                    <i className={`fa-${c.vip ? 'solid' : 'regular'} fa-star stato-cam__vip ${c.vip ? 'stato-cam__vip--on' : ''}`} aria-hidden="true" />
                  </Tooltip>
                </td>
                <td className="stato-cam__td-center">
                  <Tooltip text={STATO_LABEL[c.stato]}>
                    <i className={`fa-solid fa-broom stato-cam__ico stato-cam__ico--${PULIZIA_COLOR[c.stato]}`} aria-hidden="true" />
                  </Tooltip>
                </td>
                <td className="stato-cam__td-center">
                  <Tooltip text={STATO_LAV_LABEL[c.statoLavorazione]}>
                    <i className={`fa-solid fa-screwdriver-wrench stato-cam__ico stato-cam__ico--${LAV_COLOR[c.statoLavorazione]}`} aria-hidden="true" />
                  </Tooltip>
                </td>
                <td>{c.segnalazioni}</td>
                <td>{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stato-cam__pagination">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
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
    <div className="sc-colfilter">
      <span>{label}</span>
      <button
        type="button"
        className={'sc-colfilter__btn' + (hasFilter ? ' sc-colfilter__btn--active' : '')}
        onClick={onToggleOpen}
        aria-label={`Filtra per ${label}`}
      >
        <i className="fa-solid fa-filter" />
      </button>
      {open && (
        <>
          <div className="sc-colfilter__overlay" onClick={onToggleOpen} />
          <div className="sc-colfilter__popup" onClick={(e) => e.stopPropagation()}>
            <div className="sc-colfilter__title">scelte multiple</div>
            <label className="sc-colfilter__option">
              <input
                type="checkbox"
                className="sib-checkbox"
                checked={allSelected}
                onChange={(e) => onSelectAll(e.target.checked)}
              />
              <span>Tutti</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="sc-colfilter__option">
                <input
                  type="checkbox"
                  className="sib-checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => onToggle(opt)}
                />
                <span>{optionLabel ? optionLabel(opt) : opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
