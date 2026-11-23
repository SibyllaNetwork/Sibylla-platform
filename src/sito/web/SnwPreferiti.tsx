import React from 'react'
import { FOTO, OFFERTE } from '../sitoData'
import { useSitoStore } from '../useSitoStore'
import SnwTestata from './SnwTestata'
import SnwCard from './SnwCard'
import './SnwPreferiti.sass'

/** Preferiti: le offerte salvate con il cuore, nei tre formati. */
export default function SnwPreferiti() {
  const preferiti = useSitoStore(s => s.preferiti)
  const vai = useSitoStore(s => s.vai)
  const lista = OFFERTE.filter(o => preferiti.includes(o.id))
  return (
    <div className="snw-pref">
      <SnwTestata kicker="La tua lista" titolo="I tuoi" enfasi="preferiti" icona="fa-heart" foto={FOTO.manarola}
        sotto={lista.length ? `${lista.length} ${lista.length === 1 ? 'offerta salvata' : 'offerte salvate'} su questo dispositivo.` : 'Tocca il cuore su una card per salvarla qui.'}
        briciole={[{ nome: 'Preferiti' }]} />
      <div className="snw__wrap">
        {lista.length ? (
          <div className="snw-pref__griglia">{lista.map(o => <SnwCard key={o.id} o={o} />)}</div>
        ) : (
          <div className="snw-pref__vuoto">
            <i className="fa-light fa-heart" aria-hidden="true" />
            <b>Ancora nessun preferito</b>
            <span>Salva soggiorni, esperienze e prodotti per ritrovarli e prenotarli quando vuoi.</span>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'catalogo' })}>Esplora le offerte</button>
          </div>
        )}
      </div>
    </div>
  )
}
