import React from 'react'
import { BASE_SPAZIO, eurT, type FattorePrezzo } from '../../../store/useTotemStore'
import './FattoriPrezzo.sass'

/** Scomposizione del prezzo Sibylla di uno spazio: base × coefficienti = prezzo del giorno. */
export default function FattoriPrezzo({ fattori, prezzo, titolo }: { fattori: FattorePrezzo[]; prezzo: number; titolo?: string }) {
  return (
    <span className="fpz">
      {titolo && <span className="fpz__title">{titolo}</span>}
      <span className="fpz__row"><span className="fpz__lbl">Base</span><span className="fpz__nota">spot di 15 s, fino a 6 passaggi l'ora</span><span className="fpz__val">{eurT(BASE_SPAZIO)}</span></span>
      {fattori.map(f => (
        <span key={f.id} className="fpz__row">
          <span className="fpz__lbl">{f.label}</span>
          <span className="fpz__nota">{f.nota}</span>
          <span className="fpz__val">×{f.valore.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
        </span>
      ))}
      <span className="fpz__row fpz__row--tot"><span className="fpz__lbl">Prezzo</span><span className="fpz__nota">al giorno</span><span className="fpz__val">{eurT(prezzo)}</span></span>
    </span>
  )
}
