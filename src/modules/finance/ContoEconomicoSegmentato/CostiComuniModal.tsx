import React from 'react'
import Modal from '../../../core/components/Modal'
import TruncatedText from '../../../core/components/TruncatedText'
import { BaseRiparto, BASI, Voce, fmtNum, fmtPct, tot } from './cesData'
import './CostiComuniModal.sass'

/**
 * "Costi comuni": sceglie il criterio con cui i costi fissi comuni vengono
 * allocati ai segmenti (peso % ricavi, peso % margine, numero di hotel) e
 * mostra subito l'effetto: pesi e quote per voce e per segmento.
 */
interface Props {
  open: boolean
  onClose: () => void
  base: BaseRiparto
  onChange: (b: BaseRiparto) => void
  /** Vista della singola struttura: "per numero di hotel" diventa "in parti uguali". */
  vistaStruttura: boolean
  voci: Voce[]
  comuni: Record<string, number>
  segmenti: string[]
  quote: Record<string, number[]>
  pesi: number[]
}

export default function CostiComuniModal({ open, onClose, base, onChange, vistaStruttura, voci, comuni, segmenti, quote, pesi }: Props) {
  const totale = voci.reduce((a, v) => a + (comuni[v.key] ?? 0), 0)
  return (
    <Modal open={open} onClose={onClose} title="Costi comuni" size="lg">
      <div className="cesc">
        <p className="cesc__intro">
          I costi fissi comuni ({fmtNum(totale)} €) non appartengono a un solo segmento: scegli come allocarli.
          Il criterio aggiorna la riga dei pesi, i costi comuni allocati, l'EBIT e l'EBITDA.
        </p>

        <div className="cesc__basi" role="radiogroup" aria-label="Criterio di riparto">
          {BASI.map(b => {
            const on = b.value === base
            const label = b.value === 'uguale' && vistaStruttura ? 'In parti uguali' : b.label
            return (
              <button key={b.value} type="button" role="radio" aria-checked={on}
                className={`cesc__base ${on ? 'cesc__base--on' : ''}`} onClick={() => onChange(b.value)}>
                <span className="cesc__base-head">
                  <i className={`fa-${on ? 'solid' : 'regular'} fa-circle${on ? '-dot' : ''}`} aria-hidden="true" />
                  {label}
                </span>
                <span className="cesc__base-desc">{b.desc}</span>
              </button>
            )
          })}
        </div>

        <table className="sib-table cesc__table">
          <colgroup>
            <col className="cesc__col-voce" />
            {segmenti.map(s => <col key={s} />)}
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>Voce comune</th>
              {segmenti.map(s => <th key={s} className="cesc__num"><TruncatedText text={s} className="cesc__seg" /></th>)}
              <th className="cesc__num">Totale</th>
            </tr>
          </thead>
          <tbody>
            <tr className="cesc__pesi">
              <td>Peso</td>
              {pesi.map((p, i) => <td key={i} className="cesc__num">{fmtPct(p, 1)}</td>)}
              <td className="cesc__num">100%</td>
            </tr>
            {voci.filter(v => comuni[v.key]).map(v => (
              <tr key={v.key}>
                <td><TruncatedText text={v.label} className="cesc__voce" /></td>
                {quote[v.key].map((q, i) => <td key={i} className="cesc__num">{fmtNum(q)}</td>)}
                <td className="cesc__num cesc__tot">{fmtNum(tot(quote[v.key]))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="cesc__footer">
          <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Fatto</button>
        </div>
      </div>
    </Modal>
  )
}
