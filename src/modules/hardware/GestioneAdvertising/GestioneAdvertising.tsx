import React, { useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Tooltip from '../../../core/components/Tooltip'
import TotemAgoraCta from '../_shared/TotemAgoraCta'
import TotemDettaglioModal from '../_shared/TotemDettaglioModal'
import './GestioneAdvertising.sass'

interface SpazioTotem {
  id: string
  struttura: string
  indirizzo: string
  citta: string
  lat: number
  lng: number
}

const SPAZI: SpazioTotem[] = [
  { id: 's1', struttura: 'Hotel Archimede',           indirizzo: 'Via dei Mille 19 - Roma',     citta: 'Roma', lat: 41.9028, lng: 12.4964 },
  { id: 's2', struttura: 'B&B Solare',                 indirizzo: 'Via Remo Remotti 2 - Roma',   citta: 'Roma', lat: 41.8902, lng: 12.5085 },
  { id: 's3', struttura: 'Centro Estetico - Saches',  indirizzo: 'Via delle Zattere 25 - Roma', citta: 'Roma', lat: 41.9100, lng: 12.4800 },
  { id: 's4', struttura: 'Hotel Centro',               indirizzo: 'Via delle Zattere 25 - Roma', citta: 'Roma', lat: 41.9050, lng: 12.4820 },
  { id: 's5', struttura: 'B&B Solare',                 indirizzo: 'Via Remo Remotti 2 - Roma',   citta: 'Roma', lat: 41.8950, lng: 12.5020 },
  { id: 's6', struttura: 'Centro Estetico - Saches',  indirizzo: 'Via delle Zattere 25 - Roma', citta: 'Roma', lat: 41.9150, lng: 12.4750 },
]

export default function GestioneAdvertising({ navigate }: { navigate: (p: string) => void }) {
  const [selectedCity, setSelectedCity] = useState('Roma')
  const [selectedSpace, setSelectedSpace] = useState<SpazioTotem | null>(null)
  const [dettaglio, setDettaglio] = useState<SpazioTotem | null>(null)
  const filtered = SPAZI.filter(s => s.citta === selectedCity)
  const center = selectedSpace ?? filtered[0] ?? SPAZI[0]
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${center.lng - 0.06}%2C${center.lat - 0.04}%2C${center.lng + 0.06}%2C${center.lat + 0.04}&layer=mapnik&marker=${center.lat}%2C${center.lng}`

  return (
    <div className="adv">
      <BtnBack onClick={() => navigate('i-miei-totem')} />
      <PageHeader title="Gestione Advertising" />

      <div className="adv__layout">
        {/* ── Sinistra: mappa ───────────────────────────────── */}
        <section className="adv__map-section">
          <h3 className="adv__section-title">Posizione geografica di interesse</h3>
          <p className="adv__section-sub">
            Scegli la posizione strategica del totem per raggiungere il tuo pubblico nel modo più efficace
          </p>
          <div className="adv__map">
            <iframe
              key={`${center.lat}-${center.lng}`}
              src={mapSrc}
              title="Mappa posizioni totem"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>

        {/* ── Centro: tabella spazi ─────────────────────────── */}
        <section className="adv__list-section">
          <h3 className="adv__section-title adv__section-title--small">
            Dettaglio località: <strong>{selectedCity}</strong>
          </h3>
          <div className="sib-table-wrap">
          <table className="sib-table adv__table">
            <thead>
              <tr>
                <th>Spazi disponibili</th>
                <th className="adv__th-center">Localizza</th>
                <th className="adv__th-center">Crea Campagna</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className={selectedSpace?.id === s.id ? 'adv__row--active' : ''}>
                  <td>
                    <button
                      type="button"
                      className="adv__pos adv__pos--btn"
                      onClick={() => setDettaglio(s)}
                      aria-label={`Dettaglio totem ${s.struttura}`}
                    >
                      <span className="adv__pos-icon" aria-hidden="true">
                        <i className="fa-light fa-mobile-screen" />
                      </span>
                      <span className="adv__pos-text">
                        <strong>{s.struttura}</strong>
                        <span>{s.indirizzo}</span>
                      </span>
                    </button>
                  </td>
                  <td className="adv__td-center">
                    <Tooltip text="Localizza sulla mappa">
                      <button
                        type="button"
                        className="adv__locate-btn"
                        aria-label="Localizza sulla mappa"
                        onClick={() => setSelectedSpace(s)}
                      >
                        <i className="fa-light fa-location-dot" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </td>
                  <td className="adv__td-center">
                    <Tooltip text="Crea campagna pubblicitaria">
                      <button
                        type="button"
                        className="adv__ad-btn"
                        onClick={() => navigate('noleggia-spazi')}
                      >
                        Ad
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        {/* ── Destra: CTA Agorà ─────────────────────────────── */}
        <TotemAgoraCta />
      </div>

    </div>
  )
}
