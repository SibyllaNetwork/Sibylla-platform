import React, { useState, useRef, useMemo, useId, useLayoutEffect, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import './SearchSelectField.sass'

export interface SearchSelectOption {
  value: string
  label: string
  hint?: string      // riga secondaria (es. città, P.IVA)
}

export interface SearchSelectFieldProps {
  label?:       string
  name:         string
  value:        string                       // label/valore selezionato ('' = nessuno)
  onChange:     (value: string, option?: SearchSelectOption) => void
  options:      SearchSelectOption[]
  placeholder?: string
  /** Voce "Nessuna/Nessuno" in cima alla lista (default: attiva) */
  allowNone?:   boolean
  noneLabel?:   string
  /** Voce di creazione al volo: se passata mostra la riga "+ <createLabel>" */
  createLabel?: string
  onCreate?:    (query: string) => void
  emptyLabel?:  string
  disabled?:    boolean
  required?:    boolean
  error?:       string
  className?:   string
}

type Row =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'opt'; opt: SearchSelectOption }

// Combobox con ricerca: input di testo che filtra le opzioni e mostra un
// dropdown con la voce "Nessuna" e (opzionale) la voce di creazione anagrafica.
// La lista è renderizzata in un portale con position:fixed per non essere
// tagliata dalle card contenitrici (overflow:hidden).
export default function SearchSelectField({
  label, name, value, onChange, options, placeholder,
  allowNone = true, noneLabel = 'Nessuna',
  createLabel, onCreate, emptyLabel = 'Nessun risultato trovato',
  disabled = false, required = false, error, className,
}: SearchSelectFieldProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState<string | null>(null)   // null = mostra il valore selezionato
  const [active, setActive] = useState(0)

  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const q = (query ?? '').trim().toLowerCase()
  const filtered = useMemo(
    () => (q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options),
    [options, q],
  )

  const rows = useMemo<Row[]>(() => [
    ...(allowNone ? [{ kind: 'none' } as Row] : []),
    ...(createLabel && onCreate ? [{ kind: 'create' } as Row] : []),
    ...filtered.map((opt) => ({ kind: 'opt', opt } as Row)),
  ], [allowNone, createLabel, onCreate, filtered])

  const reposition = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 4
    const popH = popRef.current?.offsetHeight ?? 260
    let top = r.bottom + gap
    if (top + popH > window.innerHeight - 8 && r.top - gap - popH > 8) top = r.top - gap - popH
    setPos({ top, left: r.left, width: r.width })
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
  }, [open, reposition, rows.length])

  useEffect(() => { setActive(0) }, [q, open])

  const close = () => { setOpen(false); setQuery(null) }

  const pick = (row: Row) => {
    if (row.kind === 'none') { onChange(''); close(); return }
    // niente setQuery residuo: dopo il salvataggio dell'anagrafica il campo
    // deve mostrare il valore selezionato, non il testo cercato
    if (row.kind === 'create') { onCreate?.((query ?? '').trim()); close(); return }
    onChange(row.opt.value, row.opt)
    close()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { close(); return }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { setOpen(true); setQuery(''); return }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (rows[active]) pick(rows[active]) }
  }

  return (
    <div className={clsx('sselect', className)}>
      {label && (
        <label htmlFor={id} className="text-[12px] font-semibold font-poppins text-primary">
          {label}{required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}

      <div className="sselect__box" ref={wrapRef}>
        <i className="fa-light fa-magnifying-glass sselect__ico" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          autoComplete="off"
          className={clsx('sib-input sselect__input', error && 'sib-input--error')}
          placeholder={placeholder}
          value={query ?? value}
          disabled={disabled}
          title={value || undefined}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { setQuery(''); setOpen(true) }}
          onKeyDown={onKeyDown}
        />
        {value && !open && (
          <button
            type="button"
            className="sselect__clear"
            aria-label="Svuota"
            onClick={() => onChange('')}
          >
            <i className="fa-light fa-xmark" aria-hidden="true" />
          </button>
        )}
      </div>

      {error && <span className="text-[11px] font-opensans text-error"><i className="fa-light fa-circle-exclamation mr-1" aria-hidden="true" />{error}</span>}

      {open && createPortal(
        <>
          <div className="sselect__overlay" onClick={close} />
          <div
            ref={popRef}
            id={`${id}-list`}
            role="listbox"
            className="sselect__list"
            style={{
              top: pos?.top ?? -9999, left: pos?.left ?? -9999,
              width: pos?.width, visibility: pos ? 'visible' : 'hidden',
            }}
          >
            {rows.map((row, i) => {
              const isActive = i === active
              if (row.kind === 'none') return (
                <button
                  key="__none" type="button" role="option" aria-selected={!value}
                  className={clsx('sselect__opt', isActive && 'is-active')}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(row)}
                >
                  <i className="fa-light fa-ban sselect__opt-ico" aria-hidden="true" />
                  <span className="sselect__opt-name">{noneLabel}</span>
                </button>
              )
              if (row.kind === 'create') return (
                <button
                  key="__create" type="button" role="option" aria-selected={false}
                  className={clsx('sselect__opt sselect__opt--create', isActive && 'is-active')}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(row)}
                >
                  <i className="fa-light fa-plus sselect__opt-ico" aria-hidden="true" />
                  <span className="sselect__opt-name">{createLabel}</span>
                </button>
              )
              return (
                <button
                  key={row.opt.value} type="button" role="option" aria-selected={value === row.opt.value}
                  className={clsx('sselect__opt', isActive && 'is-active', value === row.opt.value && 'is-selected')}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(row)}
                >
                  <span className="sselect__opt-name">
                    {row.opt.label}
                    {row.opt.hint && <em className="sselect__opt-hint">{row.opt.hint}</em>}
                  </span>
                  {value === row.opt.value && <i className="fa-solid fa-check sselect__opt-check" aria-hidden="true" />}
                </button>
              )
            })}

            {filtered.length === 0 && <div className="sselect__empty">{emptyLabel}</div>}
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}
