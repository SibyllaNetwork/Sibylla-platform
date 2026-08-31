import React, { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import './CfgMultiSelect.sass'

// ─── MULTISELECT (kit Configuratore) ─────────────────────────────────────────
//  Selezione multipla con trigger a riepilogo + pannello a checkbox, sullo
//  stampo di NazionalitaMultiSelect. Serve dove le opzioni possono essere
//  MOLTE: l'elenco vive in un pannello con altezza massima e scroll proprio,
//  così il form che lo contiene non si deforma al crescere delle opzioni.
//  In uso: Lotti mapping (tipologie camera), Configura Outlet (sale del turno).

export interface CfgMultiSelectProps {
  label: string
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  /** Testo del trigger a selezione vuota. */
  placeholder?: string
  /** Nome plurale delle opzioni, per il riepilogo ("3 sale selezionate"). */
  nomePlurale?: string
  /** Oltre questa soglia il pannello mostra il campo di ricerca. */
  sogliaRicerca?: number
  disabled?: boolean
  className?: string
}

/** Altezza stimata del pannello: serve solo a decidere il verso di apertura. */
const STIMA_PANNELLO = 300

export default function CfgMultiSelect({
  label, options, value, onChange,
  placeholder = 'Seleziona',
  nomePlurale = 'voci',
  sogliaRicerca = 7,
  disabled = false,
  className,
}: CfgMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  // Il pannello si apre verso l'alto quando sotto non c'è spazio: con molte
  // opzioni, aprendo in basso finirebbe fuori dallo schermo.
  const [verso, setVerso] = useState<'giu' | 'su'>('giu')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Chiudendo si azzera la ricerca: riaprendo si riparte dall'elenco completo
  useEffect(() => { if (!open) setQuery('') }, [open])

  // Verso di apertura deciso sullo spazio disponibile sotto al trigger
  const apri = () => {
    const el = wrapRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      const spazioSotto = window.innerHeight - r.bottom
      setVerso(spazioSotto < STIMA_PANNELLO && r.top > spazioSotto ? 'su' : 'giu')
    }
    setOpen(o => !o)
  }

  const conRicerca = options.length > sogliaRicerca

  const visibili = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter(o => o.toLowerCase().includes(q)) : options
  }, [options, query])

  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o])

  const riepilogo = value.length === 1
    ? value[0]
    : `${value.length} ${nomePlurale} selezionate`

  return (
    <div className={clsx('cfg-msel', className)} ref={wrapRef}>
      <span className="cfg-msel__label">{label}</span>
      <button
        type="button"
        className={clsx('cfg-msel__trigger', open && 'is-open')}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={apri}
      >
        {value.length === 0
          ? <span className="cfg-msel__ph">{placeholder}</span>
          : <span className="cfg-msel__summary">{riepilogo}</span>}
        <i className="fa-solid fa-chevron-down cfg-msel__chev" aria-hidden="true" />
      </button>

      {open && (
        <div className={clsx('cfg-msel__pop', verso === 'su' && 'cfg-msel__pop--su')}>
          {conRicerca && (
            <div className="cfg-msel__search">
              <i className="fa-light fa-magnifying-glass" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Cerca tra ${options.length} ${nomePlurale}…`}
                aria-label={`Cerca in ${label}`}
                autoFocus
              />
            </div>
          )}

          <div className="cfg-msel__list" role="listbox" aria-label={label} aria-multiselectable="true">
            {visibili.length === 0 ? (
              <p className="cfg-msel__empty">Nessun risultato</p>
            ) : visibili.map((o) => (
              <label key={o} className="cfg-msel__option" role="option" aria-selected={value.includes(o)}>
                <input
                  type="checkbox"
                  className="sib-checkbox"
                  checked={value.includes(o)}
                  onChange={() => toggle(o)}
                />
                <span className="cfg-msel__option-text">{o}</span>
              </label>
            ))}
          </div>

          <div className="cfg-msel__quick">
            <button type="button" onClick={() => onChange(visibili)}>
              {query ? 'Seleziona i risultati' : 'Tutte'}
            </button>
            <button type="button" onClick={() => onChange([])}>Nessuna</button>
            <span className="cfg-msel__count">{value.length}/{options.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}
