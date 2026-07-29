import React, { useState } from 'react'
import Tooltip from './Tooltip'
import './ColFilters.sass'

export type SortState = { k: string; dir: 'asc' | 'desc' } | null

export interface ColFilterCfg {
  /** Valori del filtro a imbuto (scelte multiple). */
  options?: string[]
  /** Icona lente con campo di ricerca testuale sulla colonna. */
  search?: boolean
  /** Icona di ordinamento: asc → desc → nessun ordinamento. */
  sort?: boolean
  /** Popup allineato a destra, per le colonne a filo del bordo tabella. */
  right?: boolean
}

interface ColFiltersProps {
  colKey:        string
  label:         string
  cfg:           ColFilterCfg
  text:          Record<string, string>
  multi:         Record<string, string[]>
  sort:          SortState
  open:          string | null
  onOpen:        (k: string | null) => void
  onText:        (k: string, v: string) => void
  onToggleMulti: (k: string, v: string) => void
  onToggleSort:  (k: string) => void
}

function ColFilters({
  colKey, label, cfg, text, multi, sort, open, onOpen, onText, onToggleMulti, onToggleSort,
}: ColFiltersProps) {
  const fKey = `${colKey}:f`, sKey = `${colKey}:s`
  const popCls = 'sib-colf__pop' + (cfg.right ? ' sib-colf__pop--right' : '')
  const sortIco = sort?.k !== colKey ? 'fa-arrow-down-arrow-up'
    : sort.dir === 'asc' ? 'fa-arrow-up-short-wide' : 'fa-arrow-down-wide-short'
  const sortTip = sort?.k !== colKey ? `Ordina per ${label}`
    : sort.dir === 'asc' ? 'Ordine crescente — clicca per decrescente' : 'Ordine decrescente — clicca per rimuovere'

  return (
    <span className="sib-colf">
      {cfg.options && (
        <>
          <Tooltip text={`Filtra per ${label}`}>
            <button
              type="button"
              className={'sib-colf__btn' + (multi[colKey]?.length ? ' sib-colf__btn--on' : '')}
              aria-label={`Filtra per ${label}`}
              onClick={() => onOpen(open === fKey ? null : fKey)}
            >
              <i className="fa-solid fa-filter" aria-hidden="true" />
            </button>
          </Tooltip>
          {open === fKey && (
            <>
              <div className="sib-colf__overlay" onClick={() => onOpen(null)} />
              <div className={popCls} onClick={e => e.stopPropagation()}>
                <div className="sib-colf__pop-title">scelte multiple</div>
                {cfg.options.map(o => (
                  <label key={o} className="sib-colf__opt">
                    <input
                      type="checkbox"
                      checked={(multi[colKey] ?? []).includes(o)}
                      onChange={() => onToggleMulti(colKey, o)}
                    />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {cfg.search && (
        <>
          <Tooltip text={`Cerca in ${label}`}>
            <button
              type="button"
              className={'sib-colf__btn' + (text[colKey] ? ' sib-colf__btn--on' : '')}
              aria-label={`Cerca in ${label}`}
              onClick={() => onOpen(open === sKey ? null : sKey)}
            >
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            </button>
          </Tooltip>
          {open === sKey && (
            <>
              <div className="sib-colf__overlay" onClick={() => onOpen(null)} />
              <div className={popCls} onClick={e => e.stopPropagation()}>
                <input
                  className="sib-colf__input"
                  autoFocus
                  value={text[colKey] || ''}
                  onChange={e => onText(colKey, e.target.value)}
                  placeholder={`Cerca ${label.toLowerCase()}…`}
                />
              </div>
            </>
          )}
        </>
      )}

      {cfg.sort && (
        <Tooltip text={sortTip}>
          <button
            type="button"
            className={'sib-colf__btn' + (sort?.k === colKey ? ' sib-colf__btn--on' : '')}
            aria-label={`Ordina per ${label}`}
            onClick={() => onToggleSort(colKey)}
          >
            <i className={`fa-solid ${sortIco}`} aria-hidden="true" />
          </button>
        </Tooltip>
      )}
    </span>
  )
}

/**
 * Filtri nell'intestazione di colonna: imbuto (scelte multiple), lente
 * (ricerca testo) e ordinamento. Restituisce lo stato, gli helper per
 * filtrare/ordinare le righe e `th()` che rende il cluster di icone.
 *
 * Uso tipico:
 *   const cf = useColFilters()
 *   const filtered = useMemo(() => ROWS.filter(r =>
 *     cf.matchMulti(r.stato, 'stato') && cf.matchText(r.nome, 'nome')
 *   ), [cf.text, cf.multi])
 *   const rows = cf.sortRows(filtered)
 *   …
 *   <th><span className="sib-colf-head">Stato{cf.th('stato', 'stato', { options: STATI })}</span></th>
 */
export function useColFilters() {
  const [text, setText] = useState<Record<string, string>>({})
  const [multi, setMulti] = useState<Record<string, string[]>>({})
  const [sort, setSort] = useState<SortState>(null)
  const [open, setOpen] = useState<string | null>(null)

  const onText = (k: string, v: string) => setText(p => ({ ...p, [k]: v }))
  const onToggleMulti = (k: string, v: string) => setMulti(p => {
    const cur = p[k] ?? []
    return { ...p, [k]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }
  })
  const onToggleSort = (k: string) => setSort(p =>
    p?.k !== k ? { k, dir: 'asc' } : p.dir === 'asc' ? { k, dir: 'desc' } : null
  )

  /** true se il valore passa il filtro testuale della colonna (match parziale). */
  const matchText = (val: string, k: string) => {
    const f = text[k]
    return !f || val.toLowerCase().includes(f.toLowerCase())
  }

  /** true se il valore è tra le scelte selezionate (nessuna scelta = tutte). */
  const matchMulti = (val: string, k: string) => {
    const f = multi[k]
    return !f || f.length === 0 || f.includes(val)
  }

  /** Ordina per la colonna attiva. Le date in formato aaaa-mm-gg si ordinano
   *  correttamente per confronto lessicografico. */
  const sortRows = <T,>(rows: T[]): T[] => {
    if (!sort) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sort.k]
      const bv = (b as unknown as Record<string, unknown>)[sort.k]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }

  const th = (colKey: string, label: string, cfg: ColFilterCfg) => (
    <ColFilters
      colKey={colKey}
      label={label}
      cfg={cfg}
      text={text}
      multi={multi}
      sort={sort}
      open={open}
      onOpen={setOpen}
      onText={onText}
      onToggleMulti={onToggleMulti}
      onToggleSort={onToggleSort}
    />
  )

  return { text, multi, sort, matchText, matchMulti, sortRows, th }
}

export default ColFilters
