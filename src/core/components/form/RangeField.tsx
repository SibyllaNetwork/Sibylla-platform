import React from 'react'
import clsx from 'clsx'
import './RangeField.sass'

// ─── RANGE FIELD (cursore) ──────────────────────────────────────────────────────
//  Campo condiviso per impostare un valore trascinando un cursore: serve alle
//  simulazioni (WIF analysis, scenari) dove si muove una leva e si guarda l'effetto.
//  Etichetta, valore corrente e azzeramento stanno nel componente, così il
//  comportamento è identico su tutte le pagine che lo useranno.
//
//  Standard piattaforma rispettati: etichetta Poppins 12/600 in colore primary,
//  nessuno stile inline, colori dai token.

export interface RangeFieldProps {
  label: string
  name: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Testo del valore corrente (default: il numero con segno e suffisso). */
  valueLabel?: string
  /** Suffisso usato quando `valueLabel` non è passato. */
  suffix?: string
  /** Valore a cui riporta il pulsante di azzeramento (default 0). */
  resetTo?: number
  /** Nasconde il pulsante di azzeramento. */
  hideReset?: boolean
  /** Riga di contesto sotto il cursore (es. il valore risultante). */
  hint?: React.ReactNode
  disabled?: boolean
  className?: string
}

export default function RangeField({
  label, name, value, onChange, min = -20, max = 20, step = 1,
  valueLabel, suffix = '%', resetTo = 0, hideReset = false, hint, disabled, className,
}: RangeFieldProps) {
  const id = `range-${name}`
  const testo = valueLabel ?? `${value > 0 ? '+' : value < 0 ? '−' : ''}${new Intl.NumberFormat('it-IT', {
    maximumFractionDigits: 1,
  }).format(Math.abs(value))}${suffix}`

  // Posizione del cursore in percentuale: serve alla traccia colorata
  const pos = max === min ? 0 : ((value - min) / (max - min)) * 100

  return (
    <div className={clsx('range-field', disabled && 'range-field--disabled', className)}>
      <div className="range-field__head">
        <label className="range-field__label" htmlFor={id}>{label}</label>
        <span className={clsx('range-field__value', value !== resetTo && 'range-field__value--changed')}>
          {testo}
        </span>
        {!hideReset && (
          <button
            type="button"
            className="range-field__reset"
            onClick={() => onChange(resetTo)}
            disabled={disabled || value === resetTo}
            aria-label={`Azzera ${label}`}
          >
            <i className="fa-solid fa-rotate-left" aria-hidden="true" />
          </button>
        )}
      </div>

      <input
        id={id}
        name={name}
        type="range"
        className="range-field__input"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        /* --pos = posizione del cursore, usata per riempire la traccia */
        style={{ ['--pos' as any]: `${pos}%` }}
      />

      {hint && <span className="range-field__hint">{hint}</span>}
    </div>
  )
}
