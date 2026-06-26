import React, { useEffect, useMemo, useRef, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import SearchField from '../../../../core/components/form/SearchField'
import Pagination from '../../../../core/components/Pagination'
import Tooltip from '../../../../core/components/Tooltip'
import { apiFetchSibylla } from '../../../../services/api'
import './IMieiPreventivi.sass'

/**
 * Gestione preventivi — replica `Views/Impostazioni/gestioneDeiPreventivi.cshtml`.
 * BE Razor: `PreventiviController.GetPreventivi` → catch-all
 * `/Sibylla/preventivi/GetPreventivi`.
 */

interface Preventivo {
  id?: number
  codice?: string
  stato?: string
  utente?: string
  data_creazione?: string
  data_scadenza?: string
  cliente?: string
  email?: string
  camere?: number
  checkin?: string
  checkout?: string
  prezzo?: number
  [key: string]: unknown
}

const FALLBACK: Preventivo[] = [
  { id: 16, codice: 'PRV-16', stato: 'Bozza', utente: 'Mario Rossi', data_creazione: '22/05/2026', data_scadenza: '29/05/2026 00:00', cliente: 'nana nana',     email: '',                            camere: 1, checkin: '22/05/2026', checkout: '23/05/2026', prezzo: 420.87 },
  { id: 18, codice: 'PRV-18', stato: 'Bozza', utente: 'Mario Rossi', data_creazione: '22/05/2026', data_scadenza: '29/05/2026 00:00', cliente: 'nana nana',     email: 'nana@test.com',               camere: 2, checkin: '22/05/2026', checkout: '23/05/2026', prezzo: 771.66 },
  { id: 21, codice: 'PRV-21', stato: 'Bozza', utente: 'Mario Rossi', data_creazione: '22/05/2026', data_scadenza: '29/05/2026 00:00', cliente: 'Hassan Akkari',  email: 'h.akkari@sibyllanetwork.com', camere: 1, checkin: '22/05/2026', checkout: '23/05/2026', prezzo: 420.87 },
  { id: 23, codice: 'PRV-23', stato: 'Bozza', utente: 'Mario Rossi', data_creazione: '22/05/2026', data_scadenza: '29/05/2026 00:00', cliente: 'Hassan Akkari',  email: 'h.akkari@sibyllanetwork.com', camere: 1, checkin: '22/05/2026', checkout: '23/05/2026', prezzo: 420.87 },
  { id: 25, codice: 'PRV-25', stato: 'Bozza', utente: 'Mario Rossi', data_creazione: '22/05/2026', data_scadenza: '29/05/2026 00:00', cliente: 'Hassan Akkari',  email: 'h.akkari@sibyllanetwork.com', camere: 1, checkin: '22/05/2026', checkout: '23/05/2026', prezzo: 420.87 },
  { id: 30, codice: 'PRV-30', stato: 'Letto', utente: 'Mario Rossi', data_creazione: '22/05/2026', data_scadenza: '29/05/2026 00:00', cliente: 'Hassan Akkari',  email: 'h.akkari@sibyllanetwork.com', camere: 1, checkin: '22/05/2026', checkout: '25/05/2026', prezzo: 1262.61 },
  { id: 33, codice: 'PRV-33', stato: 'Letto', utente: 'Mario Rossi', data_creazione: '25/05/2026', data_scadenza: '01/06/2026 00:00', cliente: 'nana p',         email: 'hassan.akkari01@gmail.com',  camere: 1, checkin: '25/05/2026', checkout: '26/05/2026', prezzo: 427.87 },
  { id: 35, codice: 'PRV-35', stato: 'Bozza', utente: 'Mario Rossi', data_creazione: '25/05/2026', data_scadenza: '01/06/2026 00:00', cliente: 'nana nana',     email: '',                            camere: 1, checkin: '25/05/2026', checkout: '26/05/2026', prezzo: 420.87 },
  { id: 36, codice: 'PRV-36', stato: 'Letto', utente: 'Mario Rossi', data_creazione: '25/05/2026', data_scadenza: '01/06/2026 00:00', cliente: 'nana nana',     email: '',                            camere: 1, checkin: '25/05/2026', checkout: '26/05/2026', prezzo: 420.87 },
  { id: 38, codice: 'PRV-38', stato: 'Letto', utente: 'Mario Rossi', data_creazione: '25/05/2026', data_scadenza: '01/06/2026 00:00', cliente: 'nana nana',     email: '',                            camere: 1, checkin: '25/05/2026', checkout: '26/05/2026', prezzo: 405.00 },
]

const STATI = ['Bozza', 'Letto', 'Inviato', 'Accettato', 'Rifiutato', 'Scaduto']

const PAGE_SIZE = 10

/** Parsa "dd/mm/yyyy" o "dd/mm/yyyy HH:MM" → Date (o null). */
function parseDate(s?: string): Date | null {
  if (!s) return null
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
  if (!m) return null
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0))
}

function isScaduto(p: Preventivo): boolean {
  const d = parseDate(p.data_scadenza)
  return !!d && d.getTime() < Date.now()
}

export default function IMieiPreventivi({ navigate }: { navigate: (p: string) => void }) {
  const [items, setItems] = useState<Preventivo[]>(FALLBACK)
  const [search, setSearch] = useState('')
  const [statiSel, setStatiSel] = useState<string[]>([])
  const [statiOpen, setStatiOpen] = useState(false)
  const [sortAsc, setSortAsc] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const statiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Preventivo[]>('preventivi/GetPreventivi', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setItems(d) })
      .catch(() => { /* mantiene i dati di esempio */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (statiRef.current && !statiRef.current.contains(e.target as Node)) setStatiOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = useMemo(() => {
    const rows = items.filter((p) => {
      const matchSearch = !search || `${p.codice ?? ''} ${p.cliente ?? ''} ${p.email ?? ''} ${p.utente ?? ''}`.toLowerCase().includes(search.toLowerCase())
      const matchStato = statiSel.length === 0 || statiSel.includes(p.stato ?? '')
      return matchSearch && matchStato
    })
    return rows.sort((a, b) => {
      const da = parseDate(a.data_creazione)?.getTime() ?? 0
      const db = parseDate(b.data_creazione)?.getTime() ?? 0
      return sortAsc ? da - db : db - da
    })
  }, [items, search, statiSel, sortAsc])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageStart = (page - 1) * PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  const allPageSelected = pageRows.length > 0 && pageRows.every((p) => selected.has(p.id!))

  const toggleSel = (id: number) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleSelAll = () => setSelected((s) => {
    const n = new Set(s)
    if (allPageSelected) pageRows.forEach((p) => n.delete(p.id!))
    else pageRows.forEach((p) => n.add(p.id!))
    return n
  })
  const toggleExpand = (id: number) => setExpanded((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleStato = (s: string) => { setStatiSel((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]); setPage(1) }

  const statiLabel = statiSel.length === 0 ? 'Scelte multiple' : statiSel.length === 1 ? statiSel[0] : `${statiSel.length} stati`

  return (
    <div className="gest-prev">
      <BtnBack />
      <PageHeader title="I miei preventivi" />

      <div className="gest-prev__toolbar">
        <div className="gest-prev__field" ref={statiRef}>
          <label className="gest-prev__label">Stati preventivo</label>
          <button type="button" className="gest-prev__multi" onClick={() => setStatiOpen((o) => !o)}>
            <span className={statiSel.length ? '' : 'gest-prev__multi-ph'}>{statiLabel}</span>
            <i className="fa-light fa-chevron-down" aria-hidden="true" />
          </button>
          {statiOpen && (
            <div className="gest-prev__multi-menu">
              {STATI.map((s) => (
                <label key={s} className="gest-prev__multi-item">
                  <input type="checkbox" checked={statiSel.includes(s)} onChange={() => toggleStato(s)} />
                  {s}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="gest-prev__field gest-prev__field--search">
          <label className="gest-prev__label">Cerca</label>
          <SearchField value={search} placeholder="Cerca..." onChange={(e) => { setSearch(e.target.value); setPage(1) }} onClear={() => { setSearch(''); setPage(1) }} />
        </div>

        <Tooltip text="Esporta in Excel">
          <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta in Excel">
            <i className="fa-light fa-file-excel" aria-hidden="true" />
          </button>
        </Tooltip>

        <button className="sib-btn sib-btn--primary gest-prev__new" onClick={() => navigate('crea-preventivo')}>
          <i className="fa-light fa-file" aria-hidden="true" /> Nuovo Preventivo
        </button>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table gest-prev__table">
          <thead>
            <tr>
              <th className="gest-prev__col-check">
                <input type="checkbox" checked={allPageSelected} onChange={toggleSelAll} aria-label="Seleziona tutti" />
              </th>
              <th className="gest-prev__col-exp" />
              <th>ID preventivo</th>
              <th>Stato</th>
              <th>Utente</th>
              <th>
                <button type="button" className="gest-prev__sort" onClick={() => setSortAsc((a) => !a)}>
                  Data creazione
                  <i className={`fa-light ${sortAsc ? 'fa-arrow-up-short-wide' : 'fa-arrow-down-wide-short'}`} aria-hidden="true" />
                </button>
              </th>
              <th>Data scadenza</th>
              <th>Cliente</th>
              <th>Email</th>
              <th className="gest-prev__col-num">Camere</th>
              <th>In/Out</th>
              <th className="gest-prev__col-num">Prezzo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p) => (
              <React.Fragment key={p.id}>
                <tr>
                  <td className="gest-prev__col-check">
                    <input type="checkbox" checked={selected.has(p.id!)} onChange={() => toggleSel(p.id!)} aria-label={`Seleziona ${p.codice}`} />
                  </td>
                  <td className="gest-prev__col-exp">
                    <button type="button" className="gest-prev__exp-btn" onClick={() => toggleExpand(p.id!)} aria-label="Espandi">
                      <i className={`fa-light fa-chevron-down ${expanded.has(p.id!) ? 'is-open' : ''}`} aria-hidden="true" />
                    </button>
                  </td>
                  <td><strong>{p.codice}</strong></td>
                  <td><span className={`gest-prev__stato gest-prev__stato--${(p.stato ?? '').toLowerCase()}`}>{p.stato}</span></td>
                  <td>{p.utente}</td>
                  <td>{p.data_creazione}</td>
                  <td className={isScaduto(p) ? 'gest-prev__scaduto' : ''}>{p.data_scadenza}</td>
                  <td>{p.cliente}</td>
                  <td className="gest-prev__email" title={p.email}>{p.email}</td>
                  <td className="gest-prev__col-num">{p.camere}</td>
                  <td className="gest-prev__nowrap" title={`${p.checkin} → ${p.checkout}`}>{p.checkin?.slice(0, 5)} → {p.checkout?.slice(0, 5)}</td>
                  <td className="gest-prev__col-num">{p.prezzo?.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €</td>
                  <td>
                    <div className="gest-prev__actions">
                      <Tooltip text="Visualizza">
                        <button type="button" className="sib-btn sib-btn--icon w-7 h-7" aria-label="Visualizza" onClick={() => navigate('crea-preventivo')}><i className="fa-light fa-eye" aria-hidden="true" /></button>
                      </Tooltip>
                      <Tooltip text="Scarica PDF">
                        <button type="button" className="sib-btn sib-btn--icon w-7 h-7" aria-label="Scarica PDF"><i className="fa-light fa-file-pdf" aria-hidden="true" /></button>
                      </Tooltip>
                      <Tooltip text="Invia email">
                        <button type="button" className="sib-btn sib-btn--icon w-7 h-7" aria-label="Invia email"><i className="fa-light fa-envelope" aria-hidden="true" /></button>
                      </Tooltip>
                      <Tooltip text="Modifica">
                        <button type="button" className="sib-btn sib-btn--icon w-7 h-7" aria-label="Modifica" onClick={() => navigate('crea-preventivo')}><i className="fa-light fa-pen" aria-hidden="true" /></button>
                      </Tooltip>
                      <Tooltip text="Elimina">
                        <button type="button" className="sib-btn sib-btn--icon w-7 h-7" aria-label="Elimina"><i className="fa-light fa-trash" aria-hidden="true" /></button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
                {expanded.has(p.id!) && (
                  <tr className="gest-prev__detail-row">
                    <td colSpan={13}>
                      <div className="gest-prev__detail">
                        <div><span>Check-in</span>{p.checkin}</div>
                        <div><span>Check-out</span>{p.checkout}</div>
                        <div><span>Camere</span>{p.camere}</div>
                        <div><span>Prezzo</span>{p.prezzo?.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €</div>
                        <div><span>Email</span>{p.email || '—'}</div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={13} className="sib-empty">Nessun preventivo trovato.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination className="gest-prev__pager" page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
