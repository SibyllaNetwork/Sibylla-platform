import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import Pagination from '../../../../core/components/Pagination'
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

export default function MieiContratti({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('contratti/GetVendita', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return data.Contratti
    return data.Contratti.filter((c) =>
      String(c.id).includes(q) ||
      c.ragioneSociale.toLowerCase().includes(q) ||
      c.struttura.toLowerCase().includes(q),
    )
  }, [data.Contratti, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="miei-contratti">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Contratti di vendita"
        subtitle="Gestione automatizzata delle anagrafiche e degli accordi commerciali"
      />

      <div className="miei-contratti__bar">
        <div className="miei-contratti__field">
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
              <th>Struttura</th>
              <th>Categoria</th>
              <th>Contatti</th>
              <th>Periodi</th>
              <th>Camera</th>
              <th>Persona</th>
              <th>Supplemento</th>
              <th>Sconto</th>
              <th>Mercato</th>
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
                    {c.hasInfo && <i className="fa-light fa-circle-info miei-contratti__info" />}
                  </span>
                </td>
                <td>
                  <span className="miei-contratti__contatti">
                    {c.emailAttiva && <i className="fa-light fa-envelope" title="Email" />}
                    {c.contattiAttivi && <i className="fa-light fa-id-card" title="Contatti" />}
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
                    <button type="button" className="miei-contratti__icon-btn" title="Conferma" aria-label="Conferma">
                      <i className="fa-light fa-circle-check" />
                    </button>
                    <button
                      type="button"
                      className="miei-contratti__icon-btn"
                      title="Modifica"
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
                      <i className="fa-light fa-pen-to-square" />
                    </button>
                    <button type="button" className="miei-contratti__icon-btn miei-contratti__icon-btn--pdf" title="Esporta PDF" aria-label="Esporta PDF">
                      <i className="fa-light fa-file-pdf" />
                    </button>
                    <button
                      type="button"
                      className="miei-contratti__icon-btn"
                      title="Visualizza"
                      aria-label="Visualizza"
                      onClick={() => navigate('visualizza-contratto-v')}
                    >
                      <i className="fa-light fa-eye" />
                    </button>
                    <button type="button" className="miei-contratti__icon-btn" title="Elimina" aria-label="Elimina">
                      <i className="fa-light fa-trash" />
                    </button>
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
