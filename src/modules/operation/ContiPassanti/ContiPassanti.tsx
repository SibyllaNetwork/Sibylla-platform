import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
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
    { id: 205, segmento: 'B2B', nominativo: 'Ovest Destination Italy', data: '14/04/2026', importo: 85.00, stato: 'Aperto', hasServizi: true, hasPagamento: true },
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

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('frontoffice/GetContiPassanti', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

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
    return rows
  }, [data.conti, search, statoFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { setPage(1) }, [search, statoFilter])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const toggleStato = (s: Stato) =>
    setStatoFilter((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  const toggleAllStati = () =>
    setStatoFilter((p) => (p.length === STATI_ALL.length ? [] : [...STATI_ALL]))

  return (
    <div className="conti-pass">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Conti passanti"
        subtitle="Conti aperti per clienti o agenzie esterne, non collegati a una prenotazione"
      />

      <div className="conti-pass__bar">
        <div className="conti-pass__bar-left">
          <div className="conti-pass__field">
            <label>Cerca</label>
            <div className="conti-pass__search">
              <input
                type="search"
                className="sib-input"
                placeholder="Id, segmento o nominativo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <i className="fa-light fa-magnifying-glass conti-pass__search-ico" />
            </div>
          </div>
          <button type="button" className="sib-btn sib-btn--icon conti-pass__xls" title="Esporta XLS" aria-label="Esporta XLS">
            <i className="fa-light fa-file-excel" />
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
              <th className="conti-pass__th-center">Segmento</th>
              <th className="conti-pass__th-center">Nominativo</th>
              <th className="conti-pass__th-center">Data</th>
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
                    {r.hasServizi && <i className="fa-light fa-martini-glass-citrus" title="Servizi" />}
                    {r.hasPagamento && <i className="fa-light fa-credit-card" title="Pagamento" />}
                  </div>
                </td>
                <td className="conti-pass__td-center">
                  <div className="conti-pass__actions">
                    <button type="button" className="sib-btn sib-btn--icon" title="Visualizza" aria-label="Visualizza"><i className="fa-light fa-eye" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Stampa PDF" aria-label="Stampa PDF"><i className="fa-light fa-file-pdf" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Modifica" aria-label="Modifica"><i className="fa-light fa-pen" /></button>
                    <button type="button" className="sib-btn sib-btn--icon" title="Elimina" aria-label="Elimina"><i className="fa-light fa-trash" /></button>
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
