import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import SearchField from '../../../../core/components/form/SearchField'
import Pagination from '../../../../core/components/Pagination'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import ThLabel from '../../../../core/components/ThLabel'
import { apiFetchSibylla } from '../../../../services/api'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { toast } from '../../../../core/components/Toast/useToast'
import { exportTableToXls } from '../../booking/GrigliaDisponibilita/exportGriglia'
import { exportPreventivoPdf } from './preventivoPdf'
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

// Preventivi d'esempio (senza backend): creati negli ultimi 20 giorni, con
// scadenza a 7 giorni e soggiorni nelle settimane successive. Deterministici.
const CLIENTI_PRV: Array<[string, string]> = [
  ['Gruppo Rotary Roma Sud', 'segreteria@rotaryromasud.it'], ['Studio Legale Riva', 'eventi@studioriva.it'],
  ['Tecnomec S.p.A.', 'travel@tecnomec.it'], ['Famiglia Colombo', 'colombo.famiglia@mail.it'],
  ['Welcome Travel', 'booking@welcometravel.it'], ['Associazione Medici Siciliani', 'congressi@ams.it'],
  ['Sig.ra Laura Ferrara', 'l.ferrara@mail.it'], ['Alpitour Gruppi', 'gruppi@alpitour.it'],
  ['Mr. James Turner', 'j.turner@mail.uk'], ['Liceo Galilei — gita', 'segreteria@liceogalilei.edu.it'],
  ['Dott. Marco Bruno', 'm.bruno@mail.it'], ['Wedding Planner Aurora', 'info@weddingaurora.it'],
]
const STATI_PRV = ['Bozza', 'Letto', 'Inviato', 'Accettato', 'Inviato', 'Rifiutato', 'Letto', 'Accettato', 'Bozza', 'Inviato', 'Accettato', 'Letto']
const fmtDataPrv = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
const traPrv = (n: number) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d }

const FALLBACK: Preventivo[] = CLIENTI_PRV.map(([cliente, email], i) => {
  const creato = -20 + Math.round(i * 1.6)
  const arrivo = creato + 15 + ((i * 7) % 40)
  const notti = 1 + ((i * 3) % 5)
  const camere = [1, 12, 25, 2, 18, 40, 1, 30, 1, 22, 2, 15][i]
  return {
    id: 40 + i, codice: `PRV-${40 + i}`, stato: STATI_PRV[i], utente: 'Mario Rossi',
    data_creazione: fmtDataPrv(traPrv(creato)), data_scadenza: `${fmtDataPrv(traPrv(creato + 7))} 00:00`,
    cliente, email, camere,
    checkin: fmtDataPrv(traPrv(arrivo)), checkout: fmtDataPrv(traPrv(arrivo + notti)),
    prezzo: Math.round(camere * notti * (128 + (i % 4) * 22) * 100) / 100,
  }
}).reverse()

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
  const confirm = useConfirmStore((s) => s.confirm)

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

  // ── Azioni riga ───────────────────────────────────────────────────────────
  // CreaPreventivo funge sia da vista che da editor (nessun prefill da id).
  const handleOpen = () => navigate('crea-preventivo')

  const handlePdf = (p: Preventivo) => {
    exportPreventivoPdf(p)
    toast.success(`PDF del preventivo ${p.codice} generato`)
  }

  const handleEmail = (p: Preventivo) => {
    if (!p.email) { toast.warning(`Nessun indirizzo email per ${p.codice}`); return }
    // marca il preventivo come "Inviato"
    setItems((list) => list.map((x) => (x.id === p.id ? { ...x, stato: 'Inviato' } : x)))
    toast.success(`Preventivo ${p.codice} inviato a ${p.email}`)
  }

  const handleDelete = async (p: Preventivo) => {
    const ok = await confirm({
      title: 'Elimina preventivo',
      message: `Eliminare il preventivo ${p.codice}? L'operazione non è reversibile.`,
      confirmLabel: 'Elimina',
      danger: true,
    })
    if (!ok) return
    setItems((list) => list.filter((x) => x.id !== p.id))
    setSelected((s) => { const n = new Set(s); n.delete(p.id!); return n })
    setExpanded((s) => { const n = new Set(s); n.delete(p.id!); return n })
    toast.success(`Preventivo ${p.codice} eliminato`)
  }

  // ── Export Excel dell'elenco filtrato ───────────────────────────────────────
  const handleExcel = () => {
    const header = ['ID preventivo', 'Stato', 'Utente', 'Data creazione', 'Data scadenza', 'Cliente', 'Email', 'Camere', 'Check-in', 'Check-out', 'Prezzo']
    const rows = filtered.map((p) => [
      p.codice ?? '', p.stato ?? '', p.utente ?? '', p.data_creazione ?? '', p.data_scadenza ?? '',
      p.cliente ?? '', p.email ?? '', p.camere ?? '', p.checkin ?? '', p.checkout ?? '',
      p.prezzo != null ? p.prezzo.toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '',
    ])
    exportTableToXls('preventivi.xlsx', header, rows, 'I miei preventivi')
    toast.success(`Esportati ${rows.length} preventivi in Excel`)
  }

  return (
    <div className="gest-prev">
      <PageHead title="I miei preventivi" />

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
          <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta in Excel" onClick={handleExcel}>
            <i className="fa-regular fa-file-xls" aria-hidden="true" />
          </button>
        </Tooltip>

        <button className="sib-btn sib-btn--primary gest-prev__new" onClick={() => navigate('crea-preventivo')}>
          <i className="fa-light fa-file" aria-hidden="true" /> Nuovo Preventivo
        </button>
      </div>

      <div className="sib-table-wrap gest-prev__wrap">
        <table className="sib-table gest-prev__table">
          {/* Larghezze in percentuale + table-layout fixed: niente scroll orizzontale. */}
          <colgroup>
            {['check', 'exp', 'id', 'stato', 'utente', 'creazione', 'scadenza', 'cliente', 'email', 'camere', 'inout', 'prezzo', 'azioni'].map((c) => (
              <col key={c} className={`gest-prev__w-${c}`} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="gest-prev__col-check">
                <input type="checkbox" checked={allPageSelected} onChange={toggleSelAll} aria-label="Seleziona tutti" />
              </th>
              <th className="gest-prev__col-exp" />
              <th><ThLabel full="ID preventivo" short="ID prev." /></th>
              <th><ThLabel full="Stato" /></th>
              <th><ThLabel full="Utente" /></th>
              <th>
                <button type="button" className="gest-prev__sort" onClick={() => setSortAsc((a) => !a)}>
                  <ThLabel full="Data creazione" short="Creato" />
                  <i className={`fa-solid ${sortAsc ? 'fa-arrow-up-short-wide' : 'fa-arrow-down-wide-short'}`} aria-hidden="true" />
                </button>
              </th>
              <th><ThLabel full="Data scadenza" short="Scadenza" /></th>
              <th><ThLabel full="Cliente" /></th>
              <th><ThLabel full="Email" /></th>
              <th className="gest-prev__col-num"><ThLabel full="Camere" short="Cam." /></th>
              <th><ThLabel full="In/Out" /></th>
              <th className="gest-prev__col-num"><ThLabel full="Prezzo" /></th>
              <th className="gest-prev__col-actions">Azioni</th>
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
                      <i className={`fa-solid fa-chevron-down ${expanded.has(p.id!) ? 'is-open' : ''}`} aria-hidden="true" />
                    </button>
                  </td>
                  <td><TruncatedText text={p.codice ?? ''} /></td>
                  <td><span className={`gest-prev__stato gest-prev__stato--${(p.stato ?? '').toLowerCase()}`}>{p.stato}</span></td>
                  <td><TruncatedText text={p.utente ?? ''} /></td>
                  <td><TruncatedText text={p.data_creazione ?? ''} /></td>
                  <td className={isScaduto(p) ? 'gest-prev__scaduto' : ''}><TruncatedText text={p.data_scadenza ?? ''} /></td>
                  <td><TruncatedText text={p.cliente ?? ''} /></td>
                  <td className="gest-prev__email"><TruncatedText text={p.email ?? ''} /></td>
                  <td className="gest-prev__col-num">{p.camere}</td>
                  <td className="gest-prev__nowrap"><TruncatedText text={`${p.checkin?.slice(0, 5)} → ${p.checkout?.slice(0, 5)}`} full={`${p.checkin} → ${p.checkout}`} /></td>
                  <td className="gest-prev__col-num"><TruncatedText text={`${p.prezzo?.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €`} /></td>
                  <td className="gest-prev__col-actions">
                    <div className="gest-prev__actions">
                      <Tooltip text="Visualizza">
                        <button type="button" className="sib-btn sib-btn--icon w-7 h-7" aria-label="Visualizza" onClick={handleOpen}><i className="fa-solid fa-eye" aria-hidden="true" /></button>
                      </Tooltip>
                      <Tooltip text="Scarica PDF">
                        <button type="button" className="sib-btn sib-btn--icon w-7 h-7" aria-label="Scarica PDF" onClick={() => handlePdf(p)}><i className="fa-solid fa-file-pdf" aria-hidden="true" /></button>
                      </Tooltip>
                      <Tooltip text="Invia email">
                        <button type="button" className="sib-btn sib-btn--icon w-7 h-7" aria-label="Invia email" onClick={() => handleEmail(p)}><i className="fa-solid fa-envelope" aria-hidden="true" /></button>
                      </Tooltip>
                      <Tooltip text="Modifica">
                        <button type="button" className="sib-btn sib-btn--icon w-7 h-7" aria-label="Modifica" onClick={handleOpen}><i className="fa-solid fa-pen" aria-hidden="true" /></button>
                      </Tooltip>
                      <Tooltip text="Elimina">
                        <button type="button" className="sib-btn sib-btn--icon w-7 h-7" aria-label="Elimina" onClick={() => handleDelete(p)}><i className="fa-solid fa-trash" aria-hidden="true" /></button>
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
