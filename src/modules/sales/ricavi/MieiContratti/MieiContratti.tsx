import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import Pagination from '../../../../core/components/Pagination'
import Tooltip from '../../../../core/components/Tooltip'
import { apiFetchSibylla } from '../../../../services/api'
import { setEditingContract } from '../InserisciContrattoVendita/_state'
import './MieiContratti.sass'

interface Contratto {
  id: number
  ragioneSociale: string
  struttura: string
  categoria: number   // numero stelle (0-5)
  hasInfo: boolean
  emailAttiva: boolean
  contattiAttivi: boolean
  periodo: string     // dd/MM/yyyy - dd/MM/yyyy
  camera: number      // €
  persona: number     // €
  supplemento: number // €
  sconto: number      // %
  mercato: string     // ISO 3166-1 alpha-2
  attivo: boolean
}

interface Data {
  Contratti: Contratto[]
}

const FALLBACK: Data = {
  Contratti: [
    { id: 234, ragioneSociale: 'Tour Operator Test', struttura: '-',             categoria: 3, hasInfo: true,  emailAttiva: true, contattiAttivi: true, periodo: '11/02/2026 - 31/12/2026', camera: 120,  persona: 25, supplemento: 3, sconto: 0, mercato: 'it', attivo: true  },
    { id: 216, ragioneSociale: 'Tour Operator Test', struttura: '-',             categoria: 3, hasInfo: true,  emailAttiva: true, contattiAttivi: true, periodo: '19/12/2025 - 31/12/2026', camera: 40,   persona: 10, supplemento: 3, sconto: 0, mercato: 'it', attivo: true  },
    { id: 211, ragioneSociale: 'Tour Operator Test', struttura: 'Hotel Tutorial',categoria: 0, hasInfo: false, emailAttiva: true, contattiAttivi: true, periodo: '19/12/2025 - 31/12/2027', camera: 50,   persona: 3,  supplemento: 0, sconto: 0, mercato: 'it', attivo: true  },
    { id: 196, ragioneSociale: 'Tour Operator Test', struttura: 'Hotel Torino',  categoria: 0, hasInfo: false, emailAttiva: true, contattiAttivi: true, periodo: '01/11/2025 - 31/12/2025', camera: 10,   persona: 10, supplemento: 3, sconto: 0, mercato: 'it', attivo: true  },
    { id: 185, ragioneSociale: 'Tour Operator Test', struttura: 'Hotel Torino',  categoria: 0, hasInfo: false, emailAttiva: true, contattiAttivi: true, periodo: '01/11/2025 - 31/12/2025', camera: 10,   persona: 10, supplemento: 3, sconto: 0, mercato: 'cz', attivo: true  },
    { id: 180, ragioneSociale: 'Tour Operator Test', struttura: 'Hotel Torino',  categoria: 0, hasInfo: false, emailAttiva: true, contattiAttivi: true, periodo: '01/11/2025 - 31/12/2025', camera: 10,   persona: 10, supplemento: 3, sconto: 0, mercato: 'fr', attivo: true  },
    { id: 179, ragioneSociale: 'Tour Operator Test', struttura: 'Hotel Catania', categoria: 0, hasInfo: false, emailAttiva: true, contattiAttivi: true, periodo: '01/11/2025 - 31/12/2025', camera: 44,   persona: 6,  supplemento: 3, sconto: 0, mercato: 'jp', attivo: true  },
    { id: 177, ragioneSociale: 'Tour Operator Test', struttura: 'Hotel Catania', categoria: 0, hasInfo: false, emailAttiva: true, contattiAttivi: true, periodo: '01/11/2025 - 31/12/2025', camera: 44,   persona: 6,  supplemento: 3, sconto: 0, mercato: 'au', attivo: true  },
    { id: 174, ragioneSociale: 'Tour Operator Test', struttura: 'Hotel Catania', categoria: 0, hasInfo: false, emailAttiva: true, contattiAttivi: true, periodo: '01/11/2025 - 31/12/2025', camera: 44,   persona: 6,  supplemento: 3, sconto: 0, mercato: 'gb', attivo: true  },
    { id: 173, ragioneSociale: 'Tour Operator Test', struttura: 'Hotel Catania', categoria: 0, hasInfo: false, emailAttiva: true, contattiAttivi: true, periodo: '01/01/2026 - 31/10/2026', camera: 50,   persona: 10, supplemento: 3, sconto: 0, mercato: 'de', attivo: true  },
  ],
}

const PAGE_SIZE = 10

function fmtEuro(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} €`
}

function fmtPercent(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} %`
}

type ColKey = 'struttura' | 'categoria' | 'mercato'

export default function MieiContratti({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Filtri per colonna (multi-scelta), standard di piattaforma.
  const [openFilter, setOpenFilter] = useState<ColKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<ColKey, string[]>>({ struttura: [], categoria: [], mercato: [] })
  const toggleCol = (k: ColKey, v: string) =>
    setColFilters((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }))
  const setAllCol = (k: ColKey, all: string[], sel: boolean) =>
    setColFilters((p) => ({ ...p, [k]: sel ? [...all] : [] }))

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('contratti/GetVendita', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const strutture = useMemo(() => Array.from(new Set(data.Contratti.map((c) => c.struttura))).sort(), [data.Contratti])
  const categorie = useMemo(() => Array.from(new Set(data.Contratti.map((c) => String(c.categoria)))).sort(), [data.Contratti])
  const mercati   = useMemo(() => Array.from(new Set(data.Contratti.map((c) => c.mercato))).sort(), [data.Contratti])

  const filtered = useMemo(() => {
    let rows = data.Contratti
    const q = search.toLowerCase().trim()
    if (q) rows = rows.filter((c) =>
      String(c.id).includes(q) ||
      c.ragioneSociale.toLowerCase().includes(q) ||
      c.struttura.toLowerCase().includes(q),
    )
    if (colFilters.struttura.length) rows = rows.filter((c) => colFilters.struttura.includes(c.struttura))
    if (colFilters.categoria.length) rows = rows.filter((c) => colFilters.categoria.includes(String(c.categoria)))
    if (colFilters.mercato.length)   rows = rows.filter((c) => colFilters.mercato.includes(c.mercato))
    return rows
  }, [data.Contratti, search, colFilters])

  useEffect(() => { setPage(1) }, [search, colFilters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="miei-contratti">
      <PageHead
        title="Contratti di vendita"
        subtitle="Gestione automatizzata delle anagrafiche e degli accordi commerciali"
      />

      <div className="miei-contratti__bar">
        <div className="miei-contratti__field miei-contratti__field-raw">
          <label>Cerca</label>
          <div className="miei-contratti__search">
            <input
              type="search"
              className="sib-input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <i className="fa-light fa-magnifying-glass miei-contratti__search-icon" />
          </div>
        </div>
        <button
          type="button"
          className="sib-btn sib-btn--secondary miei-contratti__inserisci"
          onClick={() => navigate('inserisci-contratto-v')}
        >
          <i className="fa-light fa-circle-plus" /> Inserisci contratto
        </button>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table miei-contratti__table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ragione Sociale</th>
              <th>
                <ColFilterHeader
                  label="Struttura" options={strutture} selected={colFilters.struttura}
                  open={openFilter === 'struttura'} onToggleOpen={() => setOpenFilter(openFilter === 'struttura' ? null : 'struttura')}
                  onToggle={(v) => toggleCol('struttura', v)} onSelectAll={(s) => setAllCol('struttura', strutture, s)}
                />
              </th>
              <th>
                <ColFilterHeader
                  label="Categoria" options={categorie} selected={colFilters.categoria}
                  open={openFilter === 'categoria'} onToggleOpen={() => setOpenFilter(openFilter === 'categoria' ? null : 'categoria')}
                  onToggle={(v) => toggleCol('categoria', v)} onSelectAll={(s) => setAllCol('categoria', categorie, s)}
                  labelFor={(o) => (o === '0' ? 'Nessuna' : `${o} stelle`)}
                />
              </th>
              <th>Contatti</th>
              <th>Periodi</th>
              <th>Camera</th>
              <th>Persona</th>
              <th>Supplemento</th>
              <th>Sconto</th>
              <th>
                <ColFilterHeader
                  label="Mercato" options={mercati} selected={colFilters.mercato}
                  open={openFilter === 'mercato'} onToggleOpen={() => setOpenFilter(openFilter === 'mercato' ? null : 'mercato')}
                  onToggle={(v) => toggleCol('mercato', v)} onSelectAll={(s) => setAllCol('mercato', mercati, s)}
                  labelFor={(o) => o.toUpperCase()}
                />
              </th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={12} className="sib-empty">Nessun contratto trovato.</td></tr>
            ) : pageRows.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.ragioneSociale}</td>
                <td className={c.struttura === '-' ? 'sib-cell--muted' : ''}>{c.struttura}</td>
                <td>
                  <span className="miei-contratti__cat">
                    {c.categoria > 0 ? <Stars n={c.categoria} /> : <span className="sib-cell--muted">-</span>}
                    {c.hasInfo && <i className="fa-solid fa-circle-info miei-contratti__info" />}
                  </span>
                </td>
                <td>
                  <span className="miei-contratti__contatti">
                    {c.emailAttiva && <Tooltip text="Email"><i className="fa-solid fa-envelope" /></Tooltip>}
                    {c.contattiAttivi && <Tooltip text="Contatti"><i className="fa-solid fa-address-book" /></Tooltip>}
                  </span>
                </td>
                <td>{c.periodo}</td>
                <td>{fmtEuro(c.camera)}</td>
                <td>{fmtEuro(c.persona)}</td>
                <td>{fmtEuro(c.supplemento)}</td>
                <td>{c.sconto > 0 ? fmtPercent(c.sconto) : '0 €'}</td>
                <td className="miei-contratti__mercato">
                  <img
                    src={`https://flagcdn.com/w40/${c.mercato}.png`}
                    srcSet={`https://flagcdn.com/w80/${c.mercato}.png 2x`}
                    alt={c.mercato.toUpperCase()}
                    title={c.mercato.toUpperCase()}
                    loading="lazy"
                  />
                </td>
                <td>
                  <span className="miei-contratti__azioni">
                    <Tooltip text="Conferma">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Conferma">
                        <i className="fa-solid fa-circle-check" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Modifica">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        aria-label="Modifica"
                        onClick={() => {
                          const [pi, pf] = (c.periodo ?? '').split(' - ').map(s => s.trim())
                          setEditingContract({
                            id: c.id,
                            ragioneSociale: c.ragioneSociale,
                            periodoInizio: pi ? pi.split('/').reverse().join('-') : undefined,
                            periodoFine:   pf ? pf.split('/').reverse().join('-') : undefined,
                            camera:        c.camera,
                            persona:       c.persona,
                            supplemento:   c.supplemento,
                            sconto:        c.sconto,
                          })
                          navigate('modifica-contratto-v')
                        }}
                      >
                        <i className="fa-solid fa-pen-to-square" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Esporta PDF">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Esporta PDF">
                        <i className="fa-solid fa-file-pdf" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Visualizza">
                      <button
                        type="button"
                        className="sib-btn sib-btn--icon"
                        aria-label="Visualizza"
                        onClick={() => navigate('visualizza-contratto-v')}
                      >
                        <i className="fa-solid fa-eye" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Elimina">
                      <button type="button" className="sib-btn sib-btn--icon" aria-label="Elimina">
                        <i className="fa-solid fa-trash" />
                      </button>
                    </Tooltip>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        className="miei-contratti__pagination"
      />
    </div>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span className="miei-contratti__stars">
      {Array.from({ length: 5 }, (_, i) => (
        <i key={i} className={`fa-solid fa-star miei-contratti__star${i < n ? ' miei-contratti__star--on' : ''}`} />
      ))}
    </span>
  )
}

// ─── COL FILTER HEADER (multi-scelta, standard) ─────────────────────────────────
interface ColFilterHeaderProps {
  label: string
  options: string[]
  selected: string[]
  open: boolean
  onToggleOpen: () => void
  onToggle: (value: string) => void
  onSelectAll: (select: boolean) => void
  labelFor?: (option: string) => string
}

function ColFilterHeader({ label, options, selected, open, onToggleOpen, onToggle, onSelectAll, labelFor }: ColFilterHeaderProps) {
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0

  return (
    <div className="mc-colfilter">
      <span>{label}</span>
      <button
        type="button"
        className={'mc-colfilter__btn' + (hasFilter ? ' mc-colfilter__btn--active' : '')}
        onClick={onToggleOpen}
        aria-label={`Filtra per ${label}`}
      >
        <i className="fa-solid fa-filter" />
      </button>
      {open && (
        <>
          <div className="mc-colfilter__overlay" onClick={onToggleOpen} />
          <div className="mc-colfilter__popup" onClick={(e) => e.stopPropagation()}>
            <div className="mc-colfilter__title">Filtra</div>
            <label className="mc-colfilter__option">
              <input type="checkbox" className="sib-checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} />
              <span>Tutti</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="mc-colfilter__option">
                <input type="checkbox" className="sib-checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
                <span>{labelFor ? labelFor(opt) : opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
