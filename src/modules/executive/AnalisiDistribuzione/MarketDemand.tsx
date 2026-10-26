import React from 'react'
import Tooltip from '../../../core/components/Tooltip'
import './MarketDemand.sass'

// Market demand compatto (Analisi della distribuzione, hotel e Tour Operator):
// segnale a 3 barre (1 = basso … 3 = alto) + etichetta, su una sola riga.
export const MARKET_LABEL: Record<string, string> = { basso: 'Basso', medio: 'Medio', alto: 'Alto' }
export const MARKET_LIV: Record<string, number> = { basso: 1, medio: 2, alto: 3 }

export default function MarketDemand({ level }: { level: string }) {
  const lv = MARKET_LIV[level] ? level : 'medio'
  const n = MARKET_LIV[lv]
  return (
    <Tooltip text={`Market demand: ${MARKET_LABEL[lv]}`}>
      <span className={`md-signal md-signal--${lv}`}>
        <span className="md-signal__bars" aria-hidden="true">
          {[1, 2, 3].map(b => <span key={b} className={'md-signal__bar' + (b <= n ? ' is-on' : '')} />)}
        </span>
        {MARKET_LABEL[lv]}
      </span>
    </Tooltip>
  )
}
