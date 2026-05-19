import React from 'react'
import './HBars.sass'

export interface HBar {
  label: string
  value: number
  color: string
  /** Formattatore opzionale per il valore mostrato a fianco della barra. */
  format?: (v: number) => string
}

interface HBarsProps {
  bars: HBar[]
  /** Mostra l'asse X con tick numerici. */
  showAxis?: boolean
  /** Numero di tick da mostrare sull'asse X. */
  ticks?: number
  /** Larghezza minima della label colonna a sinistra. */
  labelWidth?: number
}

function defaultFmt(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 2).replace('.', ',')}K €`
  return `${v.toFixed(2).replace('.', ',')} €`
}

export function HBars({ bars, showAxis = false, ticks = 5, labelWidth = 90 }: HBarsProps) {
  const max = bars.reduce((m, b) => Math.max(m, b.value), 0)
  const safeMax = max === 0 ? 1 : max

  return (
    <div className="hbars">
      <div className="hbars__rows">
        {bars.map((b, i) => {
          const pct = (b.value / safeMax) * 100
          return (
            <div className="hbars__row" key={i}>
              <span className="hbars__label" style={{ minWidth: labelWidth }}>{b.label}</span>
              <span className="hbars__track">
                <span
                  className="hbars__bar"
                  style={{ width: `${Math.max(0.5, pct)}%`, background: b.color }}
                />
              </span>
              <span className="hbars__value">{(b.format ?? defaultFmt)(b.value)}</span>
            </div>
          )
        })}
      </div>

      {showAxis && (
        <div className="hbars__axis" style={{ marginLeft: labelWidth + 8 }}>
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const v = (max / ticks) * i
            return <span key={i} className="hbars__tick">{defaultFmt(v)}</span>
          })}
        </div>
      )}
    </div>
  )
}
