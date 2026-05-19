import React from 'react'
import type { Strategia } from '../strategieData'
import './MasterDayTooltip.sass'

export interface MasterLayerEntry {
  label:  string
  icon:   string
  strat:  Strategia | null
}

export interface MasterDayTooltipState {
  date:    Date
  layers:  MasterLayerEntry[]
  x:       number
  y:       number
}

const DATE_FMT = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

export default function MasterDayTooltip({ tip }: { tip: MasterDayTooltipState }) {
  return (
    <div
      className="master-tip"
      role="tooltip"
      style={{ left: tip.x, top: tip.y } as React.CSSProperties}
    >
      <div className="master-tip__date">
        <i className="fa-duotone fa-calendar-day" aria-hidden="true"/>
        {DATE_FMT.format(tip.date)}
      </div>
      <ul className="master-tip__list">
        {tip.layers.map(layer => (
          <li key={layer.label} className="master-tip__row">
            <span className="master-tip__row-head">
              <i className={`fa-duotone ${layer.icon}`} aria-hidden="true"/>
              {layer.label}
            </span>
            {layer.strat ? (
              <span
                className="master-tip__row-strat"
                style={{ '--day-color': layer.strat.colore } as React.CSSProperties}
              >
                <span className="master-tip__row-dot" aria-hidden="true"/>
                <span className="master-tip__row-name">{layer.strat.nome}</span>
              </span>
            ) : (
              <span className="master-tip__row-empty">Nessuna strategia</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
