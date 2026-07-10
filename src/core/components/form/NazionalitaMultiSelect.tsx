import React, { useState, useRef, useLayoutEffect, useCallback, useId, useMemo } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { PAESI } from '../../utils/countryFlags'
import { FlagBadge } from './NazionalitaSelect'
import './NazionalitaMultiSelect.sass'

export interface NazionalitaMultiSelectProps {
  label?: string
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Multiselect delle nazionalità con bandierine tonde. Stesso pattern del
// NazionalitaSelect (dropdown custom in portale, position:fixed) ma con
// selezione multipla via checkbox, riepilogo a bandierine nel trigger e
// ricerca/azioni rapide nel dropdown.
export default function NazionalitaMultiSelect({
  label, value, onChange, placeholder = 'Seleziona paesi', disabled = false, className,
}: NazionalitaMultiSelectProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const trigRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const reposition = useCallback(() => {
    const trig = trigRef.current
    if (!trig) return
    const r = trig.getBoundingClientRect()
    const gap = 4
    const popH = popRef.current?.offsetHeight ?? 320
    const vh = window.innerHeight
    let top = r.bottom + gap
    if (top + popH > vh - 8 && r.top - gap - popH > 8) top = r.top - gap - popH
    setPos({ top, left: r.left, width: Math.max(r.width, 220) })
  }, [])

  useLayoutEffect(() => {
    if (!open) { setPos(null); return }
    reposition()
    const onScroll = () => reposition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, reposition])

  const toggle = (p: string) =>
    onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p])

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()
    return q ? PAESI.filter((p) => p.includes(q)) : PAESI
  }, [query])

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={id} className="text-[12px] font-semibold font-poppins text-primary">{label}</label>
      )}
      <div className="nazmulti">
        <button
          ref={trigRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={clsx('nazmulti__trigger', open && 'is-open')}
          onClick={() => !disabled && setOpen((o) => !o)}
        >
          {value.length === 0 ? (
            <span className="nazmulti__ph">{placeholder}</span>
          ) : (
            <span className="nazmulti__summary">
              <span className="nazmulti__flags">
                {value.slice(0, 10).map((v) => <FlagBadge key={v} name={v} />)}
              </span>
              <span className="nazmulti__count">{value.length} {value.length === 1 ? 'paese' : 'paesi'}</span>
            </span>
          )}
          <i className="fa-solid fa-chevron-down nazmulti__chev" aria-hidden="true" />
        </button>

        {open && createPortal(
          <>
            <div className="nazmulti__overlay" onClick={() => setOpen(false)} />
            <div
              ref={popRef}
              className="nazmulti__list"
              role="listbox"
              aria-multiselectable="true"
              style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width, visibility: pos ? 'visible' : 'hidden' }}
            >
              <div className="nazmulti__search">
                <i className="fa-light fa-magnifying-glass" aria-hidden="true" />
                <input
                  type="text"
                  value={query}
                  placeholder="Cerca paese…"
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="nazmulti__opts">
                {filtered.length === 0 ? (
                  <div className="nazmulti__empty">Nessun paese trovato.</div>
                ) : filtered.map((p) => {
                  const sel = value.includes(p)
                  return (
                    <button
                      key={p}
                      type="button"
                      role="option"
                      aria-selected={sel}
                      className={clsx('nazmulti__opt', sel && 'is-selected')}
                      onClick={() => toggle(p)}
                    >
                      <span className={clsx('nazmulti__box', sel && 'is-on')}>
                        {sel && <i className="fa-solid fa-check" aria-hidden="true" />}
                      </span>
                      <FlagBadge name={p} />
                      <span className="nazmulti__opt-name">{p}</span>
                    </button>
                  )
                })}
              </div>
              <div className="nazmulti__foot">
                <button type="button" className="nazmulti__foot-btn" onClick={() => onChange([...PAESI])}>Seleziona tutti</button>
                <button type="button" className="nazmulti__foot-btn" onClick={() => onChange([])} disabled={value.length === 0}>Pulisci</button>
              </div>
            </div>
          </>,
          document.body,
        )}
      </div>
    </div>
  )
}
