import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import { SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './MonitoraggioCanali.sass'
import { useStruttureCliente, useStrutturaCorrente } from '../../../hooks/useStrutturaCorrente'
import { idStruttura, type SchedaDemo } from '../../../core/demo/struttureDemo'

interface Movimento {
  id: number
  tipoOperazione: string
  valore: number
  canale: string
  utente: string
  tipoCamera: string
  dataModifica: string  // ISO
  errore: string
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Movimenti: Movimento[]
}

// Senza backend: movimenti verso i canali degli ultimi giorni per la struttura
// scelta fra quelle del cliente (valori deterministici, prezzi per categoria).
const UTENTI = ['Mario Rossi', 'Giulia Neri', 'Revenue bot', 'Luca Bianchi']
const CANALI_MOV = ['', 'Booking.com', 'Expedia', 'Sito web', 'Airbnb']
const TIPI_CAMERA = ['Singola Classic', 'Doppia Classic', 'Matrimoniale Superior', 'Tripla Classic', 'Suite', '']
const OPERAZIONI = ['Tariffa', 'Tariffa', 'Tariffa', 'Disponibilità', 'Restrizione']

function genFallback(schede: SchedaDemo[], strutturaId: number | null): Data {
  const strutture = schede.map((x) => ({ Id: idStruttura(x.nome), nome: x.nome }))
  const sel = schede.find((x) => idStruttura(x.nome) === strutturaId) ?? schede[0]
  const livello = !sel ? 1 : sel.stelle >= 5 ? 1.6 : sel.stelle === 4 ? 1.1 : 0.85
  const seme = sel?.seme ?? 1
  const ora = Date.now()
  const Movimenti: Movimento[] = Array.from({ length: 36 }, (_, i) => {
    const r = ((seme + i * 2654435761) >>> 0) % 1000
    const op = OPERAZIONI[r % OPERAZIONI.length]
    const d = new Date(ora - (i * 5 + (r % 5)) * 3600000)
    return {
      id: i + 1, tipoOperazione: op,
      valore: op === 'Tariffa' ? Math.round((120 + (r % 160)) * livello * 100) / 100 : op === 'Disponibilità' ? r % 12 : 0,
      canale: CANALI_MOV[(r >> 3) % CANALI_MOV.length], utente: UTENTI[(r >> 5) % UTENTI.length],
      tipoCamera: TIPI_CAMERA[(r >> 2) % TIPI_CAMERA.length],
      dataModifica: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`,
      errore: r % 29 === 0 ? 'Timeout del channel manager: ritrasmesso' : '',
    }
  })
  return { Strutture: strutture, StrutturaId: sel ? idStruttura(sel.nome) : null, Movimenti }
}

const PAGE_SIZE = 12

type ColKey = 'tipoOperazione' | 'canale' | 'utente' | 'tipoCamera'
type SortDir = 'asc' | 'desc' | null

function fmtCurrency(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yy} - ${hh}:${mi}`
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function MonitoraggioCanali({ navigate }: { navigate: (p: string) => void }) {
  const schede = useStruttureCliente()
  const { struttura: strutturaCorrente } = useStrutturaCorrente()
  const [data, setData] = useState<Data>(() => genFallback(schede, idStruttura(strutturaCorrente)))
  const [allaData, setAllaData] = useState<string>(todayISO())
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<ColKey, string>>({ tipoOperazione: '', canale: '', utente: '', tipoCamera: '' })
  const [openFilter, setOpenFilter] = useState<ColKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)

  // Cambiata la struttura selezionata in alto: si riparte da quella.
  useEffect(() => { setData((d) => ({ ...d, StrutturaId: idStruttura(strutturaCorrente) })) }, [strutturaCorrente])

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetMonitoraggioCanali', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, allaData },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData((d) => genFallback(schede, d.StrutturaId)) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allaData, data.StrutturaId, schede])

  const filtered = useMemo(() => {
    let rows = data.Movimenti
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((r) =>
        r.tipoOperazione.toLowerCase().includes(q) ||
        r.canale.toLowerCase().includes(q) ||
        r.utente.toLowerCase().includes(q) ||
        r.tipoCamera.toLowerCase().includes(q) ||
        r.errore.toLowerCase().includes(q),
      )
    }
    if (filters.tipoOperazione) rows = rows.filter((r) => r.tipoOperazione === filters.tipoOperazione)
    if (filters.canale)         rows = rows.filter((r) => r.canale === filters.canale)
    if (filters.utente)         rows = rows.filter((r) => r.utente === filters.utente)
    if (filters.tipoCamera)     rows = rows.filter((r) => r.tipoCamera === filters.tipoCamera)
    if (sortDir) {
      const dir = sortDir === 'asc' ? 1 : -1
      rows = [...rows].sort((a, b) => (a.dataModifica.localeCompare(b.dataModifica)) * dir)
    }
    return rows
  }, [data.Movimenti, search, filters, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const distinct = (key: ColKey) => Array.from(new Set(data.Movimenti.map((r) => r[key]).filter((v) => v !== '')))

  const setFilterValue = (key: ColKey, val: string) => {
    setFilters((f) => ({ ...f, [key]: val }))
    setOpenFilter(null)
    setPage(1)
  }

  const ColumnFilter = ({ k, label }: { k: ColKey; label: string }) => (
    <div className="monitoraggio-canali__th-cell">
      <span>{label}</span>
      <button
        type="button"
        className={'monitoraggio-canali__filter-btn' + (filters[k] ? ' monitoraggio-canali__filter-btn--active' : '')}
        onClick={() => setOpenFilter((o) => o === k ? null : k)}
        aria-label={`Filtra per ${label}`}
      >
        <i className="fa-solid fa-filter" />
      </button>
      {openFilter === k && (
        <div className="monitoraggio-canali__filter-popup">
          <button type="button" className="monitoraggio-canali__filter-option" onClick={() => setFilterValue(k, '')}>
            <i className="fa-solid fa-circle-xmark" /> Rimuovi filtro
          </button>
          {distinct(k).map((v) => (
            <button
              key={v}
              type="button"
              className={'monitoraggio-canali__filter-option' + (filters[k] === v ? ' monitoraggio-canali__filter-option--active' : '')}
              onClick={() => setFilterValue(k, v)}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const SortHeader = () => (
    <div className="monitoraggio-canali__th-cell">
      <span>Data modifica</span>
      <button
        type="button"
        className="monitoraggio-canali__sort-btn"
        onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc')}
        aria-label="Ordina per data modifica"
      >
        <i className={`fa-solid fa-arrow-${sortDir === 'desc' ? 'down' : 'up'}`} />
      </button>
    </div>
  )

  return (
    <div className="monitoraggio-canali">
      <PageHead
        back
        title="Monitoraggio canali"
        subtitle="Sintesi dei movimenti per tariffe e disponibilità verso i canali di vendita"
      />

      <div className="monitoraggio-canali__filters">
        <SelectField
          name="struttura"
          label="Struttura"
          className="monitoraggio-canali__field"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={data.Strutture.map((s) => ({ value: s.Id, label: s.nome }))}
        />
        <label className="monitoraggio-canali__field monitoraggio-canali__field-raw">
          <span>Alla data</span>
          <input
            type="date"
            className="sib-input"
            value={allaData}
            onChange={(e) => setAllaData(e.target.value)}
          />
        </label>
        <div className="monitoraggio-canali__field monitoraggio-canali__field--search monitoraggio-canali__field-raw">
          <span>Cerca</span>
          <div className="monitoraggio-canali__search">
            <input
              type="search"
              className="sib-input"
              placeholder="Cerca"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <i className="fa-light fa-magnifying-glass monitoraggio-canali__search-icon" />
          </div>
        </div>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th><ColumnFilter k="tipoOperazione" label="Tipo operazione" /></th>
              <th>Valore</th>
              <th><ColumnFilter k="canale" label="Canale" /></th>
              <th><ColumnFilter k="utente" label="Utente" /></th>
              <th><ColumnFilter k="tipoCamera" label="Tipo camera" /></th>
              <th><SortHeader /></th>
              <th>Errore</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={7} className="sib-empty">Nessun movimento trovato per i criteri selezionati.</td></tr>
            ) : pageRows.map((r) => (
              <tr key={r.id}>
                <td>{r.tipoOperazione}</td>
                <td>{fmtCurrency(r.valore)}</td>
                <td className={r.canale ? '' : 'sib-cell--muted'}>{r.canale || '-'}</td>
                <td>{r.utente}</td>
                <td className={r.tipoCamera ? '' : 'sib-cell--muted'}>{r.tipoCamera || '-'}</td>
                <td className="sib-cell--muted">{fmtDateTime(r.dataModifica)}</td>
                <td className={r.errore ? 'sib-cell--error' : 'sib-cell--muted'}>{r.errore || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        className="monitoraggio-canali__pagination"
      />
    </div>
  )
}
