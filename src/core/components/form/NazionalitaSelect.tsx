import React, { useState, useRef, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { PAESI, countryFlag } from '../../utils/countryFlags'
import './NazionalitaSelect.sass'

// Bandiera "tonda": l'emoji-bandiera (rettangolare) viene ingrandita e ritagliata
// dentro un cerchio con overflow:hidden. Self-contained (nessun asset esterno);
// degrada alla sigla a 2 lettere solo su Windows datati, come le altre bandiere.
export function FlagBadge({ name, className }: { name?: string; className?: string }) {
  const f = countryFlag(name)
  return (
    <span className={clsx('nazsel__flag', className)} aria-hidden="true">
      <em>{f || '🏳️'}</em>
    </span>
  )
}

export interface NazionalitaSelectProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Select delle nazionalità con bandierine tonde. Dropdown custom (le <option>
// native non possono contenere immagini/HTML), reso in un portale con
// position:fixed per non essere mai tagliato dalle card contenitrici.
export default function NazionalitaSelect({
  value, onChange, placeholder = 'Seleziona nazionalità', disabled = false, className,
}: NazionalitaSelectProps) {
  const [open, setOpen] = useState(false)
  const trigRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const reposition = useCallback(() => {
    const trig = trigRef.current
    if (!trig) return
    const r = trig.getBoundingClientRect()
    const gap = 4
    const popH = popRef.current?.offsetHeight ?? 280
    const vh = window.innerHeight
    let top = r.bottom + gap
    if (top + popH > vh - 8 && r.top - gap - popH > 8) top = r.top - gap - popH
    setPos({ top, left: r.left, width: Math.max(r.width, 200) })
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

  return (
    <div className={clsx('nazsel', className)}>
      <button
        ref={trigRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="nazsel__trigger"
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        {value
          ? (<><FlagBadge name={value} /><span className="nazsel__val">{value}</span></>)
          : (<span className="nazsel__ph">{placeholder}</span>)}
        <i className="fa-solid fa-chevron-down nazsel__chev" aria-hidden="true" />
      </button>

      {open && createPortal(
        <>
          <div className="nazsel__overlay" onClick={() => setOpen(false)} />
          <div
            ref={popRef}
            className="nazsel__list"
            role="listbox"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: pos?.width, visibility: pos ? 'visible' : 'hidden' }}
          >
            {PAESI.map((p) => (
              <button
                key={p}
                type="button"
                role="option"
                aria-selected={value === p}
                className={clsx('nazsel__opt', value === p && 'is-selected')}
                onClick={() => { onChange(p); setOpen(false) }}
              >
                <FlagBadge name={p} />
                <span className="nazsel__opt-name">{p}</span>
                {value === p && <i className="fa-solid fa-check nazsel__opt-check" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}
