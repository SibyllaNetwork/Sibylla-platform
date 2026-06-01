import React from 'react'
import type { Strategia } from '../strategieData'
import './StrategyTooltip.sass'

export interface StrategyTooltipState {
  strat: Strategia
  date:  Date
  x:     number
  y:     number
  /** Etichetta opzionale (es. riga "Tariffarie" del Calendario Master). */
  rowLabel?: string
}

const DATE_FMT = new Intl.DateTimeFormat('it-IT', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

export default function StrategyTooltip({ tip }: { tip: StrategyTooltipState }) {
  return (
    <div
      className="strat-tip"
      role="tooltip"
      style={{
        '--tip-x':      `${tip.x}px`,
        '--tip-y':      `${tip.y}px`,
        '--day-color':  tip.strat.colore,
      } as React.CSSProperties}
    >
      <div className="strat-tip__header">
        <span className="strat-tip__dot" aria-hidden="true"/>
        <span className="strat-tip__title">{tip.strat.nome}</span>
        <span className="strat-tip__tag">{tip.rowLabel ?? tip.strat.tipo}</span>
      </div>
      <div className="strat-tip__date">
        <i className="fa-duotone fa-calendar-day" aria-hidden="true"/>
        {DATE_FMT.format(tip.date)}
      </div>
      <div className="strat-tip__desc">{tip.strat.descrizione}</div>
    </div>
  )
}
