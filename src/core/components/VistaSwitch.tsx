import React from 'react'
import './VistaSwitch.sass'

/**
 * Selettore di vista a segmenti (es. Giornaliera / Dettagliata): ogni opzione ha
 * icona, nome e una riga di aiuto; l'evidenziatore scorre sotto l'opzione attiva.
 * Da usare nelle azioni di PageHead quando una pagina ha due modi di leggere gli
 * stessi dati.
 */

export interface VistaOpzione<T extends string> {
  value: T
  label: string
  /** Classe Font Awesome, es. "fa-calendar-days". */
  icon: string
  hint?: string
}

interface Props<T extends string> {
  value: T
  options: VistaOpzione<T>[]
  onChange: (v: T) => void
  ariaLabel?: string
}

export default function VistaSwitch<T extends string>({ value, options, onChange, ariaLabel = 'Vista' }: Props<T>) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value))
  return (
    <div className="vsw" role="radiogroup" aria-label={ariaLabel}
      style={{ '--vsw-n': options.length, '--vsw-i': idx } as React.CSSProperties}>
      <span className="vsw__thumb" aria-hidden="true" />
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on}
            className={`vsw__opt${on ? ' vsw__opt--on' : ''}`} onClick={() => onChange(o.value)}>
            <span className="vsw__ico"><i className={`fa-solid ${o.icon}`} aria-hidden="true" /></span>
            <span className="vsw__txt">
              <span className="vsw__label">{o.label}</span>
              {o.hint && <span className="vsw__hint">{o.hint}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
