import React from 'react'
import './BonificoIstruzioni.sass'

interface Props {
  codice: string   // codice transazione = causale
  importo: string   // importo formattato, es. "50,00 €"
  /** Traduzione dei testi (sito Sibylla Network multilingua); di default l'italiano. */
  tr?: (testo: string) => string
}

export default function BonificoIstruzioni({ codice, importo, tr = s => s }: Props) {
  return (
    <div className="bonifico">
      <i className="fa-light fa-building-columns bonifico__watermark" aria-hidden="true" />

      <p className="bonifico__intro">
        {tr('Hai deciso di pagare con bonifico bancario.')}<br />
        {tr('Ecco un breve riepilogo del tuo ordine:')}
      </p>

      <p className="bonifico__row"><strong>{tr('Codice transazione:')}</strong> {codice}</p>
      <p className="bonifico__row">
        <strong>{tr('La ricarica selezionata ha un importo di:')}</strong>{' '}
        <span className="bonifico__importo">{importo}</span>
      </p>
      <p className="bonifico__row"><strong>{tr('Bonifico intestato a:')}</strong> Sibylla S.R.L. IBAN: IT 80 E 03069 05088 100000006451</p>
      <p className="bonifico__row"><strong>{tr('Causale:')}</strong> {codice}</p>

      <p className="bonifico__outro">{tr("Troverai l'importo caricato nel wallet una volta ricevuto l'accredito, grazie.")}</p>
    </div>
  )
}

// Genera un codice transazione/causale tipo "RWB-24YNCHIB-COD3"
export function genBonificoCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `RWB-${s}-COD3`
}
