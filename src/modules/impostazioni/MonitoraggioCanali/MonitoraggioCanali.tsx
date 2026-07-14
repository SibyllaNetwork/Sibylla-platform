import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import { SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './MonitoraggioCanali.sass'

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

const FALLBACK_USER = 'Mario Rossi'
const FALLBACK_DATE = '2026-02-18T09:12:00'

const FALLBACK: Data = {
  Strutture: [{ Id: 1, nome: 'Hotel Tutorial' }],
  StrutturaId: 1,
  Movimenti: [
    { id: 1,  tipoOperazione: 'Tariffa', valore: 260.41, canale: '', utente: FALLBACK_USER, tipoCamera: 'Singola Classic',     dataModifica: FALLBACK_DATE, errore: '' },
    { id: 2,  tipoOperazione: 'Tariffa', valore: 294.72, canale: '', utente: FALLBACK_USER, tipoCamera: '',                    dataModifica: FALLBACK_DATE, errore: '' },
    { id: 3,  tipoOperazione: 'Tariffa', valore: 294.72, canale: '', utente: FALLBACK_USER, tipoCamera: '',                    dataModifica: FALLBACK_DATE, errore: '' },
    { id: 4,  tipoOperazione: 'Tariffa', valore: 313.84, canale: '', utente: FALLBACK_USER, tipoCamera: '',                    dataModifica: FALLBACK_DATE, errore: '' },
    { id: 5,  tipoOperazione: 'Tariffa', valore: 313.84, canale: '', utente: FALLBACK_USER, tipoCamera: 'Doppia Classic',      dataModifica: FALLBACK_DATE, errore: '' },
    { id: 6,  tipoOperazione: 'Tariffa', valore: 362.39, canale: '', utente: FALLBACK_USER, tipoCamera: 'Matrimoniale Superior', dataModifica: FALLBACK_DATE, errore: '' },
    { id: 7,  tipoOperazione: 'Tariffa', valore: 367.91, canale: '', utente: FALLBACK_USER, tipoCamera: '',                    dataModifica: FALLBACK_DATE, errore: '' },
    { id: 8,  tipoOperazione: 'Tariffa', valore: 367.91, canale: '', utente: FALLBACK_USER, tipoCamera: '',                    dataModifica: FALLBACK_DATE, errore: '' },
    { id: 9,  tipoOperazione: 'Tariffa', valore: 367.91, canale: '', utente: FALLBACK_USER, tipoCamera: 'Tripla Classic',      dataModifica: FALLBACK_DATE, errore: '' },
    { id: 10, tipoOperazione: 'Tariffa', valore: 389.41, canale: '', utente: FALLBACK_USER, tipoCamera: '',                    dataModifica: FALLBACK_DATE, errore: '' },
    { id: 11, tipoOperazione: 'Tariffa', valore: 386.17, canale: '', utente: FALLBACK_USER, tipoCamera: '',                    dataModifica: FALLBACK_DATE, errore: '' },
    { id: 12, tipoOperazione: 'Tariffa', valore: 277.04, canale: '', utente: FALLBACK_USER, tipoCamera: '',                    dataModifica: FALLBACK_DATE, errore: '' },
  ],
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
  const [data, setData] = useState<Data>(FALLBACK)
  const [allaData, setAllaData] = useState<string>(todayISO())
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<ColKey, string>>({ tipoOperazione: '', canale: '', utente: '', tipoCamera: '' })
  const [openFilter, setOpenFilter] = useState<ColKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetMonitoraggioCanali', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, allaData },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allaData, data.StrutturaId])

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
