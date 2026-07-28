import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Pagination from '../../../core/components/Pagination'
import { SearchField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './ContiPassanti.sass'

const PAGE_SIZE = 12

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Stato = 'Aperto' | 'Chiuso' | 'Annullato'

interface Conto {
  id: number
  segmento: string
  nominativo: string
  data: string
  importo: number
  stato: Stato
  hasServizi: boolean
  hasPagamento: boolean
}

interface Data {
  conti: Conto[]
}

const FALLBACK: Data = {
  conti: [
    { id: 205, segmento: 'B2B',         nominativo: 'Ovest Destination Italy', data: '14/04/2026', importo: 85.00,   stato: 'Aperto',    hasServizi: true,  hasPagamento: true },
    { id: 206, segmento: 'Individuale', nominativo: 'Marco Bianchi',           data: '15/04/2026', importo: 42.50,   stato: 'Aperto',    hasServizi: true,  hasPagamento: false },
    { id: 207, segmento: 'Gruppo',      nominativo: 'Comitiva Alpe Adria',     data: '12/04/2026', importo: 1240.00, stato: 'Chiuso',    hasServizi: true,  hasPagamento: true },
    { id: 208, segmento: 'Corporate',   nominativo: 'Sibylla Network S.r.l.',  data: '10/04/2026', importo: 320.00,  stato: 'Aperto',    hasServizi: false, hasPagamento: true },
    { id: 209, segmento: 'OTA',         nominativo: 'Booking.com',             data: '09/04/2026', importo: 178.90,  stato: 'Chiuso',    hasServizi: true,  hasPagamento: true },
    { id: 210, segmento: 'Leisure',     nominativo: 'Famiglia Rossi',          data: '18/04/2026', importo: 96.00,   stato: 'Aperto',    hasServizi: true,  hasPagamento: false },
    { id: 211, segmento: 'B2B',         nominativo: 'Sud Travel Agency',       data: '08/04/2026', importo: 540.00,  stato: 'Annullato', hasServizi: false, hasPagamento: false },
    { id: 212, segmento: 'Individuale', nominativo: 'Anna Verdi',              data: '19/04/2026', importo: 30.00,   stato: 'Aperto',    hasServizi: false, hasPagamento: false },
    { id: 213, segmento: 'Gruppo',      nominativo: 'Scuola Media Manzoni',    data: '05/04/2026', importo: 2150.00, stato: 'Chiuso',    hasServizi: true,  hasPagamento: true },
    { id: 214, segmento: 'Corporate',   nominativo: 'Delta Industrie S.p.A.',  data: '17/04/2026', importo: 410.50,  stato: 'Aperto',    hasServizi: true,  hasPagamento: true },
    { id: 215, segmento: 'OTA',         nominativo: 'Expedia',                 data: '07/04/2026', importo: 205.00,  stato: 'Chiuso',    hasServizi: false, hasPagamento: true },
    { id: 216, segmento: 'Leisure',     nominativo: 'Luca Ferri',              data: '20/04/2026', importo: 64.00,   stato: 'Aperto',    hasServizi: true,  hasPagamento: false },
    { id: 217, segmento: 'B2B',         nominativo: 'Nord Incoming',           data: '03/04/2026', importo: 720.00,  stato: 'Chiuso',    hasServizi: true,  hasPagamento: true },
    { id: 218, segmento: 'Individuale', nominativo: 'Giulia Neri',             data: '21/04/2026', importo: 51.00,   stato: 'Annullato', hasServizi: false, hasPagamento: false },
    { id: 219, segmento: 'Corporate',   nominativo: 'Aurora Consulting',       data: '02/04/2026', importo: 388.00,  stato: 'Aperto',    hasServizi: false, hasPagamento: true },
    { id: 220, segmento: 'Gruppo',      nominativo: 'Tour Operator Egnazia',   data: '22/04/2026', importo: 1680.00, stato: 'Aperto',    hasServizi: true,  hasPagamento: true },
  ],
}

const STATI_ALL: Stato[] = ['Aperto', 'Chiuso', 'Annullato']

function fmtCurrency(v: number): string {
  return v.toFixed(2).replace('.', ',') + ' €'
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ContiPassanti({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statoFilter, setStatoFilter] = useState<Stato[]>([])
  const [statoOpen, setStatoOpen] = useState(false)
  const [segmentoFilter, setSegmentoFilter] = useState<string[]>([])
  const [segmentoOpen, setSegmentoOpen] = useState(false)
  const [sortData, setSortData] = useState<'asc' | 'desc' | null>(null)

  const SEGMENTI_ALL = useMemo(
    () => Array.from(new Set(data.conti.map((c) => c.segmento))).sort(),
    [data.conti],
  )

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('frontoffice/GetContiPassanti', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // dd/mm/yyyy → yyyymmdd (chiave ordinabile)
  const dataKey = (d: string) => {
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    return m ? `${m[3]}${m[2]}${m[1]}` : d
  }

  const filtered = useMemo(() => {
    let rows = data.conti
    const q = search.toLowerCase().trim()
    if (q) {
      rows = rows.filter((r) =>
        String(r.id).includes(q) ||
        r.segmento.toLowerCase().includes(q) ||
        r.nominativo.toLowerCase().includes(q),
      )
    }
    if (statoFilter.length) rows = rows.filter((r) => statoFilter.includes(r.stato))
    if (segmentoFilter.length) rows = rows.filter((r) => segmentoFilter.includes(r.segmento))
    if (sortData) {
      const dir = sortData === 'asc' ? 1 : -1
      rows = [...rows].sort((a, b) => dataKey(a.data).localeCompare(dataKey(b.data)) * dir)
    }
    return rows
  }, [data.conti, search, statoFilter, segmentoFilter, sortData])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, statoFilter, segmentoFilter])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const toggleStato = (s: Stato) =>
    setStatoFilter((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  const toggleAllStati = () =>
    setStatoFilter((p) => (p.length === STATI_ALL.length ? [] : [...STATI_ALL]))
  const toggleSegmento = (s: string) =>
    setSegmentoFilter((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  const toggleAllSegmenti = () =>
    setSegmentoFilter((p) => (p.length === SEGMENTI_ALL.length ? [] : [...SEGMENTI_ALL]))
  const toggleSortData = () =>
    setSortData((p) => (p === 'asc' ? 'desc' : p === 'desc' ? null : 'asc'))
  const sortIcon = sortData === 'asc' ? 'fa-arrow-up-short-wide' : sortData === 'desc' ? 'fa-arrow-down-wide-short' : 'fa-arrow-down-arrow-up'

  return (
    <div className="conti-pass">
      <PageHead
        title="Conti passanti"
        subtitle="Conti aperti per clienti o agenzie esterne, non collegati a una prenotazione"
      />

      <div className="conti-pass__bar">
        <div className="conti-pass__bar-left">
          <div className="conti-pass__field">
            <label>Cerca</label>
            <SearchField
              name="search"
              placeholder="Id, segmento o nominativo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
          <button type="button" className="sib-btn sib-btn--icon conti-pass__xls" title="Esporta XLS" aria-label="Esporta XLS">
            <i className="fa-regular fa-file-xls" />
          </button>
        </div>

        <button type="button" className="sib-btn sib-btn--primary conti-pass__new" onClick={() => navigate('nuovo-conto-passante')}>
          <i className="fa-light fa-file-circle-plus" /> Nuovo conto passante
        </button>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table conti-pass__table">
          <thead>
            <tr>
              <th className="conti-pass__th-center">ID</th>
              <th className="conti-pass__th-center">
                <span className="conti-pass__filter-head">
                  Segmento
                  <button
                    type="button"
                    className={'conti-pass__filter-btn' + (segmentoFilter.length ? ' conti-pass__filter-btn--active' : '')}
                    onClick={() => setSegmentoOpen(!segmentoOpen)}
                    aria-label="Filtra per segmento"
                  >
                    <i className="fa-solid fa-filter" />
                  </button>
                  {segmentoOpen && (
                    <>
                      <div className="conti-pass__filter-overlay" onClick={() => setSegmentoOpen(false)} />
                      <div className="conti-pass__filter-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="conti-pass__filter-title">scelte multiple</div>
                        <label className="conti-pass__filter-opt">
                          <input type="checkbox" className="sib-checkbox" checked={segmentoFilter.length === SEGMENTI_ALL.length} onChange={toggleAllSegmenti} />
                          <span>Tutti</span>
                        </label>
                        {SEGMENTI_ALL.map((s) => (
                          <label key={s} className="conti-pass__filter-opt">
                            <input type="checkbox" className="sib-checkbox" checked={segmentoFilter.includes(s)} onChange={() => toggleSegmento(s)} />
                            <span>{s}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </span>
              </th>
              <th className="conti-pass__th-center">Nominativo</th>
              <th className="conti-pass__th-center conti-pass__th-sort" onClick={toggleSortData} title="Ordina per data">
                <span className="conti-pass__sort-head">Data <i className={`fa-solid ${sortIcon}`} /></span>
              </th>
              <th className="conti-pass__th-center">Importo</th>
              <th className="conti-pass__th-center">
                <span className="conti-pass__filter-head">
                  Stato
                  <button
                    type="button"
                    className={'conti-pass__filter-btn' + (statoFilter.length ? ' conti-pass__filter-btn--active' : '')}
                    onClick={() => setStatoOpen(!statoOpen)}
                    aria-label="Filtra per stato"
                  >
                    <i className="fa-solid fa-filter" />
                  </button>
                  {statoOpen && (
                    <>
                      <div className="conti-pass__filter-overlay" onClick={() => setStatoOpen(false)} />
                      <div className="conti-pass__filter-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="conti-pass__filter-title">scelte multiple</div>
                        <label className="conti-pass__filter-opt">
                          <input
                            type="checkbox"
                            className="sib-checkbox"
                            checked={statoFilter.length === STATI_ALL.length}
                            onChange={toggleAllStati}
                          />
                          <span>Tutti</span>
                        </label>
                        {STATI_ALL.map((s) => (
                          <label key={s} className="conti-pass__filter-opt">
                            <input
                              type="checkbox"
                              className="sib-checkbox"
                              checked={statoFilter.includes(s)}
                              onChange={() => toggleStato(s)}
                            />
                            <span>{s}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </span>
              </th>
              <th className="conti-pass__th-center">Collegati</th>
              <th className="conti-pass__th-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={8} className="sib-empty">Nessun conto passante per i criteri selezionati.</td></tr>
            ) : pageRows.map((r) => (
              <tr key={r.id}>
                <td className="conti-pass__td-center">{r.id}</td>
                <td className="conti-pass__td-center">{r.segmento}</td>
                <td className="conti-pass__td-center">{r.nominativo}</td>
                <td className="conti-pass__td-center">{r.data}</td>
                <td className="conti-pass__td-center">{fmtCurrency(r.importo)}</td>
                <td className="conti-pass__td-center">
                  <span className={`conti-pass__stato conti-pass__stato--${r.stato.toLowerCase()}`}>{r.stato}</span>
                </td>
                <td className="conti-pass__td-center">
                  <div className="conti-pass__collegati">
                    {r.hasServizi && <i className="fa-solid fa-martini-glass-citrus" title="Servizi" />}
                    {r.hasPagamento && <i className="fa-solid fa-credit-card" title="Pagamento" />}
                  </div>
                </td>
                <td className="conti-pass__td-center">
                  <div className="conti-pass__actions">
                    <button type="button" className="sib-btn sib-btn--icon" title="Visualizza" aria-label="Visualizza"><i className="fa-solid fa-eye" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Stampa PDF" aria-label="Stampa PDF"><i className="fa-solid fa-file-pdf" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Modifica" aria-label="Modifica"><i className="fa-solid fa-pen" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Elimina" aria-label="Elimina"><i className="fa-solid fa-trash" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="conti-pass__pagination">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  )
}
