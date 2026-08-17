import React from 'react'
import clsx from 'clsx'
import './BiLegend.sass'

// ─── LEGENDA GRAFICI ────────────────────────────────────────────────────────────
//  Con 2 o più serie la legenda è SEMPRE presente (con una sola serie non serve:
//  la nomina il titolo del grafico). Così l'identità della serie non è mai
//  affidata al solo colore. I nomi restano in colore testo: il pallino colorato
//  porta l'identità, non l'etichetta.
//  Passando `onToggle` le voci diventano cliccabili per accendere/spegnere la serie.

export interface BiLegendItem {
  key?: string
  name: string
  color: string
  /** Valore o quota da mostrare a destra del nome. */
  value?: string
  /** Serie tratteggiata (previsioni). */
  dashed?: boolean
  /** Serie spenta. */
  off?: boolean
}

export interface BiLegendProps {
  items: BiLegendItem[]
  /** 'row' per l'intestazione della card, 'column' per la colonna a fianco. */
  layout?: 'row' | 'column'
  onToggle?: (key: string) => void
  className?: string
}

export default function BiLegend({ items, layout = 'row', onToggle, className }: BiLegendProps) {
  return (
    <ul className={clsx('bi-legend', `bi-legend--${layout}`, className)}>
      {items.map((it) => {
        const k = it.key ?? it.name
        const dot = (
          <>
            {/* --leg-c = colore della serie (valore runtime) */}
            <span
              className={clsx('bi-legend__dot', it.dashed && 'bi-legend__dot--dashed')}
              style={{ ['--leg-c' as any]: it.color }}
            />
            <span className="bi-legend__name">{it.name}</span>
            {it.value && <span className="bi-legend__val">{it.value}</span>}
          </>
        )
        return (
          <li key={k} className={clsx('bi-legend__item', it.off && 'bi-legend__item--off')}>
            {onToggle ? (
              <button type="button" className="bi-legend__btn" onClick={() => onToggle(k)} aria-pressed={!it.off}>
                {dot}
              </button>
            ) : dot}
          </li>
        )
      })}
    </ul>
  )
}
