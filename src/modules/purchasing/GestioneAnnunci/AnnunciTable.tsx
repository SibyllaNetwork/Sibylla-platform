import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import { useAnnunciStore, annuncioPerMe, type AnnuncioPubblicato } from '../../../store/useAnnunciStore'
import './AnnunciTable.sass'

const PAGE_SIZE = 10

type FiltroKey = 'ragioneSociale' | 'periodo' | 'tipologia' | 'struttura' | 'categoria' | 'genere' | 'destinatario'
const FILTRO_KEYS: FiltroKey[] = ['ragioneSociale', 'periodo', 'tipologia', 'struttura', 'categoria', 'genere', 'destinatario']

// Valore usato per filtro/opzioni della colonna (rispetta il mascheramento).
const rowVal = (a: AnnuncioPubblicato, k: FiltroKey): string => {
  const perMe = annuncioPerMe(a)
  switch (k) {
    case 'ragioneSociale': return perMe ? a.ragioneSociale : 'Riservato'
    case 'periodo':        return a.periodo
    case 'tipologia':      return a.tipologia
    case 'struttura':      return perMe ? a.struttura : 'Riservato'
    case 'categoria':      return `${a.categoria} stelle`
    case 'genere':         return a.genere
    case 'destinatario':   return perMe ? 'Destinato a te' : 'Non destinato a te'
  }
}

// Chiave numerica per l'ordinamento della data di pubblicazione (gg/mm/aaaa).
const dataKey = (s: string): number => {
  const [g, m, y] = s.split('/').map(Number)
  return (y || 0) * 10000 + (m || 0) * 100 + (g || 0)
}

// Stelle categoria struttura (oro).
function Stelle({ n }: { n: number }) {
  return (
    <span className="ann__stars" aria-label={`${n} stelle`}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className="fa-solid fa-star" aria-hidden="true" />
      ))}
    </span>
  )
}

// Tabella "Annunci" (destinazione delle pubblicazioni di Componi annunci),
// standard piattaforma. Router-agnostica: la navigazione arriva via callback.
export function AnnunciTable({ onBack, onMatchZone }: {
  onBack?: () => void
  onMatchZone: () => void
}) {
  const annunci = useAnnunciStore((s) => s.annunci)
  const [page, setPage] = useState(1)
  const [dettaglio, setDettaglio] = useState<AnnuncioPubblicato | null>(null)
  const [openFilter, setOpenFilter] = useState<FiltroKey | null>(null)
  const [colFilters, setColFilters] = useState<Record<FiltroKey, string[]>>({
    ragioneSociale: [], periodo: [], tipologia: [], struttura: [], categoria: [], genere: [], destinatario: [],
  })
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)

  // Opzioni distinte per ogni colonna filtrabile.
  const options = useMemo(() => {
    const o = {} as Record<FiltroKey, string[]>
    FILTRO_KEYS.forEach((k) => { o[k] = Array.from(new Set(annunci.map((a) => rowVal(a, k)))).sort() })
    return o
  }, [annunci])

  const toggleColFilter = (k: FiltroKey, v: string) => {
    setColFilters((p) => ({ ...p, [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v] }))
    setPage(1)
  }
  const setAllColFilter = (k: FiltroKey, all: string[], sel: boolean) => {
    setColFilters((p) => ({ ...p, [k]: sel ? all : [] }))
    setPage(1)
  }
  const toggleSort = () => {
    setSortDir((d) => (d === null ? 'desc' : d === 'desc' ? 'asc' : null))
    setPage(1)
  }

  const filtered = useMemo(() => {
    let out = annunci.filter((a) => FILTRO_KEYS.every((k) => {
      const sel = colFilters[k]
      return sel.length === 0 || sel.includes(rowVal(a, k))
    }))
    if (sortDir) {
      out = [...out].sort((x, y) => sortDir === 'asc'
        ? dataKey(x.pubblicazione) - dataKey(y.pubblicazione)
        : dataKey(y.pubblicazione) - dataKey(x.pubblicazione))
    }
    return out
  }, [annunci, colFilters, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )

  // Header di colonna con filtro a imbuto.
  const filterHead = (k: FiltroKey, label: string) => (
    <ColFilter
      label={label}
      options={options[k]}
      selected={colFilters[k]}
      open={openFilter === k}
      onToggleOpen={() => setOpenFilter(openFilter === k ? null : k)}
      onToggle={(v) => toggleColFilter(k, v)}
      onSelectAll={(s) => setAllColFilter(k, options[k], s)}
    />
  )

  return (
    <div className="ann">
      <BtnBack onClick={onBack} />

      <div className="ann__top">
        <PageHeader
          title="Annunci"
          subtitle="Il centro di scambio dove le opportunità si incontrano, le relazioni crescono e il valore si moltiplica."
        />
        <button type="button" className="sib-btn sib-btn--secondary ann__matchzone" onClick={onMatchZone}>
          <i className="fa-light fa-arrows-repeat" aria-hidden="true" /> Match zone
        </button>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table ann__table">
          <thead>
            <tr>
              <th className="ann__c-logo" aria-label="Logo" />
              <th>{filterHead('ragioneSociale', 'Ragione sociale')}</th>
              <th>{filterHead('periodo', 'Periodo')}</th>
              <th>{filterHead('tipologia', 'Tipologia')}</th>
              <th className="ann__c-num">Lotti</th>
              <th>{filterHead('struttura', 'Struttura')}</th>
              <th>{filterHead('categoria', 'Categoria')}</th>
              <th className="ann__c-num">Camere</th>
              <th>
                <button type="button" className={`ann__sort${sortDir ? ' ann__sort--active' : ''}`} onClick={toggleSort}>
                  Pubblicazione
                  <i className={`fa-solid ${sortDir === 'asc' ? 'fa-arrow-up-short-wide' : sortDir === 'desc' ? 'fa-arrow-down-wide-short' : 'fa-sort'}`} aria-hidden="true" />
                </button>
              </th>
              <th>{filterHead('genere', 'Genere')}</th>
              <th className="ann__c-center">{filterHead('destinatario', 'Destinatario')}</th>
              <th className="ann__c-center">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((a: AnnuncioPubblicato) => {
              const perMe = annuncioPerMe(a)
              const g = a.genere.toLowerCase()
              return (
                <tr key={a.id} className={`ann__row ann__row--${g}${perMe ? '' : ' ann__row--reserved'}`}>
                  <td className="ann__c-logo">
                    {perMe && a.logo
                      ? <img src={a.logo} alt="" className="ann__logo" />
                      : <span className="ann__logo ann__logo--ph"><i className="fa-light fa-hotel" aria-hidden="true" /></span>}
                  </td>
                  <td>{perMe ? a.ragioneSociale : <span className="ann__masked">Riservato</span>}</td>
                  <td className="ann__nowrap">{a.periodo}</td>
                  <td>{a.tipologia}</td>
                  <td className="ann__c-num">{a.lotti}</td>
                  <td>{perMe ? a.struttura : <span className="ann__masked">Riservato</span>}</td>
                  <td><Stelle n={a.categoria} /></td>
                  <td className="ann__c-num">{a.camere}</td>
                  <td className="ann__nowrap">{a.pubblicazione}</td>
                  <td>
                    <span className={`ann__genere ann__genere--${g}`}>
                      <i className={`fa-solid ${a.genere === 'Vendita' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} aria-hidden="true" />
                      {a.genere}
                    </span>
                  </td>
                  <td className="ann__c-center">
                    <div className="ann__actions">
                      <Tooltip text={perMe ? 'Destinato a te' : 'Non destinato a te'}>
                        <span className={`ann__dest${perMe ? '' : ' ann__dest--off'}`}>
                          <i className={`fa-light ${perMe ? 'fa-eye' : 'fa-eye-slash'}`} aria-hidden="true" />
                        </span>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="ann__c-center">
                    <div className="ann__actions">
                      <Tooltip text="Dettaglio annuncio">
                        <button type="button" className="sib-btn sib-btn--icon" aria-label="Dettaglio annuncio" onClick={() => setDettaglio(a)}>
                          <i className="fa-light fa-circle-info" aria-hidden="true" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="ann__empty">Nessun annuncio trovato.</div>
      )}

      {totalPages > 1 && (
        <div className="ann__pager">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {dettaglio && <DettaglioModal a={dettaglio} onClose={() => setDettaglio(null)} />}
    </div>
  )
}

// ─── Header di colonna con filtro a imbuto (scelte multiple) ─────────────────────
function ColFilter({ label, options, selected, open, onToggleOpen, onToggle, onSelectAll }: {
  label: string; options: string[]; selected: string[]; open: boolean
  onToggleOpen: () => void; onToggle: (v: string) => void; onSelectAll: (s: boolean) => void
}) {
  const allSelected = options.length > 0 && options.every((o) => selected.includes(o))
  const hasFilter = selected.length > 0
  return (
    <div className="ann-colfilter">
      <span>{label}</span>
      <button type="button" className={'ann-colfilter__btn' + (hasFilter ? ' ann-colfilter__btn--active' : '')} onClick={onToggleOpen} aria-label={`Filtra per ${label}`} disabled={options.length === 0}>
        <i className="fa-solid fa-filter" aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="ann-colfilter__overlay" onClick={onToggleOpen} />
          <div className="ann-colfilter__popup" onClick={(e) => e.stopPropagation()}>
            <div className="ann-colfilter__title">scelte multiple</div>
            <label className="ann-colfilter__option"><input type="checkbox" className="sib-checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} /><span>Tutti</span></label>
            {options.map((opt) => (
              <label key={opt} className="ann-colfilter__option"><input type="checkbox" className="sib-checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} /><span>{opt}</span></label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Modale "Dettaglio annuncio" ─────────────────────────────────────────────────
function DettaglioModal({ a, onClose }: { a: AnnuncioPubblicato; onClose: () => void }) {
  const perMe = annuncioPerMe(a)
  const mask = (v: string) => (perMe ? v : 'Riservato')
  const dimLotto = Math.round(a.camere / Math.max(1, a.lotti))
  const righe: [string, string][] = [
    ['Quantità lotti', String(a.lotti)],
    ['Tipologia', a.ospiti || 'Gruppi'],
    ['Genere', a.tipologia],
    ['Dimensione Lotto', `${dimLotto} Camere`],
    ['Struttura', mask(a.struttura)],
    ['Quantità massima acquistabile', String(a.quantitaMax ?? a.lotti)],
    ['Garanzie richieste', a.garanzie || 'Nessuna'],
    ['Tipologia pagamento', a.pagamento || 'VCC'],
    ['Annuncio rilasciato da', mask(a.ragioneSociale)],
  ]
  return (
    <div className="ann-modal" role="dialog" aria-modal="true" aria-label="Dettaglio annuncio" onClick={onClose}>
      <div className="ann-modal__card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ann-modal__close" aria-label="Chiudi" onClick={onClose}>
          <i className="fa-light fa-xmark" aria-hidden="true" />
        </button>
        <h2 className="ann-modal__title">Dettaglio annuncio</h2>
        <div className="ann-modal__body">
          <h3 className="ann-modal__section">Dettaglio Contratti</h3>
          <dl className="ann-modal__grid">
            {righe.map(([k, v]) => (
              <div key={k} className="ann-modal__row">
                <dt>{k}:</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
