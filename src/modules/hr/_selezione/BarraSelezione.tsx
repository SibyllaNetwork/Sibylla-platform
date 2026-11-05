import React from 'react'
import './BarraSelezione.sass'

export interface AzioneMassiva {
  label: string
  icona: string
  /** Righe selezionate su cui l'azione si applica (0 = pulsante disattivato). */
  quante: number
  onClick: () => void
  pericolo?: boolean
}

/**
 * Barra delle azioni sulle righe selezionate (sopra la tabella): conteggio,
 * "Deseleziona" e un pulsante per azione con il numero di righe su cui agisce.
 */
export default function BarraSelezione({ n, nome, azioni, onSvuota }: {
  n: number
  /** Singolare e plurale, es. ['richiesta', 'richieste']. */
  nome: [string, string]
  azioni: AzioneMassiva[]
  onSvuota: () => void
}) {
  if (!n) return null
  return (
    <div className="hrsel" role="region" aria-label="Azioni sulle righe selezionate">
      <span className="hrsel__count">
        <strong>{n}</strong> {n === 1 ? `${nome[0]} selezionata` : `${nome[1]} selezionate`}
      </span>
      <button type="button" className="hrsel__clear" onClick={onSvuota}>Deseleziona</button>
      <div className="hrsel__acts">
        {azioni.map(a => (
          <button key={a.label} type="button" disabled={!a.quante} onClick={a.onClick}
            className={`sib-btn ${a.pericolo ? 'sib-btn--danger' : 'sib-btn--secondary'} hrsel__btn`}>
            <i className={`fa-solid ${a.icona}`} aria-hidden="true" /> {a.label}{a.quante ? ` (${a.quante})` : ''}
          </button>
        ))}
      </div>
    </div>
  )
}
