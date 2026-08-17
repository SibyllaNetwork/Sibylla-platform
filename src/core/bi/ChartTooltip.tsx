import React from 'react'
import './ChartTooltip.sass'

// ─── TOOLTIP GRAFICI (standard piattaforma: fondo scuro, testo bianco) ──────────
//  Unico tooltip di tutti i grafici BI: si passa a recharts come
//  `<RTooltip content={<ChartTooltip … />} />`. Mostra una riga per serie, con
//  il pallino del colore della serie, il nome e il valore formattato; le serie
//  senza valore (es. il forecast prima del taglio) vengono omesse.

export interface ChartTooltipProps {
  /** Iniettate da recharts. */
  active?: boolean
  payload?: any[]
  label?: string | number
  /** Etichetta di intestazione (default: la label dell'asse x). */
  title?: string
  /** dataKey → nome leggibile. */
  names?: Record<string, string>
  /** Formattatore del valore (default: numero locale). */
  format?: (v: number, dataKey?: string) => string
  /** Riga di chiusura opzionale (es. totale o variazione). */
  footer?: React.ReactNode
}

export default function ChartTooltip({
  active, payload, label, title, names, format, footer,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => p?.value !== null && p?.value !== undefined)
  if (!rows.length) return null

  return (
    <div className="chart-tip" role="tooltip">
      <span className="chart-tip__label">{title ?? label}</span>
      {rows.map((p) => (
        <span className="chart-tip__row" key={`${p.dataKey}-${p.name}`}>
          {/* Colore della serie: variabile CSS, così segue tema e dark mode */}
          <span className="chart-tip__dot" style={{ ['--tip-dot' as any]: p.stroke || p.fill || p.color }} />
          <span className="chart-tip__name">{names?.[p.dataKey] ?? p.name ?? p.dataKey}</span>
          <span className="chart-tip__val">
            {format ? format(p.value as number, p.dataKey as string) : p.value}
          </span>
        </span>
      ))}
      {footer && <span className="chart-tip__footer">{footer}</span>}
    </div>
  )
}
