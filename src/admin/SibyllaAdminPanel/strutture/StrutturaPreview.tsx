// Componenti di anteprima della scheda struttura — usati sia dentro la
// StrutturaPlatformModal (sezione "Canali e prezzi") sia come stand-alone in
// StrutturaPreviewModal.
//
// PreviewPlatform → UI sibylla-platform (Agorà e B2B condividono lo stesso
//                    layout, cambia solo etichetta canale e destinazione).
// PreviewConsumer → UI sibyllanetwork.com (B2C).

import React from 'react'
import { Icon } from '../../../modules/purchasing/_shared/Icon'
import type { Struttura, CanaleVendita } from './types'
import './StrutturaPreview.sass'

interface PlatformProps {
  struttura: Struttura
  canale: 'agora' | 'b2b'
  destinazione: string
  color: string
  label: string
}

export function PreviewPlatform({ struttura, canale, destinazione, color, label }: PlatformProps) {
  const tag = struttura.canali[canale].tagline
  const minPrice = struttura.tipologieCamere
    .map(c => canale === 'agora' ? c.prezzoAgora : c.prezzoB2B)
    .filter(p => p > 0)
    .sort((a, b) => a - b)[0]

  return (
    <div className="sp-prev sp-prev--platform">
      <div className="sp-prev__img-wrap">
        {struttura.fotoPrincipale
          ? <img src={struttura.fotoPrincipale} alt={struttura.nome} />
          : <div className="sp-prev__img-placeholder">Foto principale</div>}
        <span
          className="sp-prev__badge"
          style={{ '--canale-color': color } as React.CSSProperties}
        >
          {label}
        </span>
        <span className="sp-prev__destination" title={destinazione}>
          {destinazione}
        </span>
      </div>
      <div className="sp-prev__body">
        <div className="sp-prev__head">
          <h4 className="sp-prev__title">{struttura.nome}</h4>
          <span className="sp-prev__stars">{struttura.classificazione}</span>
        </div>
        <p className="sp-prev__city">{struttura.citta}, {struttura.regione}</p>
        {tag && <p className="sp-prev__tag">{tag}</p>}
        <p className="sp-prev__desc">{struttura.descrizione}</p>

        {struttura.tipologieCamere.length > 0 && (
          <ul className="sp-prev__rooms">
            {struttura.tipologieCamere.map(c => {
              const prezzo = canale === 'agora' ? c.prezzoAgora : c.prezzoB2B
              return (
                <li key={c.id} className="sp-prev__room">
                  <span className="sp-prev__room-name">{c.nome}</span>
                  <span className="sp-prev__room-price">
                    {prezzo > 0 ? `€ ${prezzo.toFixed(0)} /notte` : '— non in vendita —'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <div className="sp-prev__cta-row">
          <span className="sp-prev__price">
            {minPrice ? <>da € {minPrice.toFixed(0)} <small>/notte</small></> : '— prezzo non definito —'}
          </span>
          <span className="sp-prev__btn-platform">Apri scheda</span>
        </div>
      </div>
    </div>
  )
}

interface ConsumerProps {
  struttura: Struttura
}

export function PreviewConsumer({ struttura }: ConsumerProps) {
  const tag = struttura.canali.b2c.tagline
  const minPrice = struttura.tipologieCamere
    .map(c => c.prezzoB2C)
    .filter(p => p > 0)
    .sort((a, b) => a - b)[0]

  return (
    <div className="sp-prev sp-prev--consumer">
      <div className="sp-prev-c__hero">
        {struttura.fotoPrincipale
          ? <img src={struttura.fotoPrincipale} alt={struttura.nome} />
          : <div className="sp-prev-c__hero-placeholder">Foto principale</div>}
        <div className="sp-prev-c__hero-overlay">
          <span className="sp-prev-c__stars">{struttura.classificazione}</span>
          <h4 className="sp-prev-c__title">{struttura.nome}</h4>
          <p className="sp-prev-c__city">{struttura.citta}, {struttura.regione}</p>
          {tag && <p className="sp-prev-c__tag">{tag}</p>}
        </div>
      </div>

      {struttura.galleria.length > 0 && (
        <div className="sp-prev-c__gallery">
          {struttura.galleria.slice(0, 5).map((u, i) => (
            <div key={i} className="sp-prev-c__gallery-thumb">
              <img src={u} alt={`thumb-${i}`} />
            </div>
          ))}
        </div>
      )}

      <div className="sp-prev-c__body">
        <p className="sp-prev-c__desc">{struttura.descrizione}</p>
        {struttura.descrizioneLocalita && (
          <p className="sp-prev-c__locality">
            <strong>La località — </strong>{struttura.descrizioneLocalita}
          </p>
        )}

        {struttura.tipologieCamere.length > 0 && (
          <div className="sp-prev-c__rooms">
            <span className="sp-prev-c__rooms-title">Tipologie disponibili</span>
            {struttura.tipologieCamere.map(c => (
              <div key={c.id} className="sp-prev-c__room">
                {c.immagineUrl && <img src={c.immagineUrl} alt={c.nome} />}
                <div className="sp-prev-c__room-info">
                  <div className="sp-prev-c__room-name">{c.nome}</div>
                  <div className="sp-prev-c__room-desc">{c.descrizione}</div>
                  <div className="sp-prev-c__room-meta">
                    {c.capacita} pax · {c.metratura} m² · {c.letti}
                  </div>
                </div>
                <div className="sp-prev-c__room-price">
                  {c.prezzoB2C > 0
                    ? <>€ {c.prezzoB2C.toFixed(0)}<small>/notte</small></>
                    : <span className="sp-prev-c__room-price-off">non disponibile</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="sp-prev-c__cta">
          <div>
            <span className="sp-prev-c__price-label">A partire da</span>
            <span className="sp-prev-c__price">
              {minPrice ? <>€ {minPrice.toFixed(0)} <small>/notte</small></> : '— prezzo non definito —'}
            </span>
          </div>
          <span className="sp-prev-c__btn">Prenota ora</span>
        </div>
      </div>
    </div>
  )
}

// Util: ritorna il canale di tipo "platform" preferito per il preview.
export function previewCanale(c: CanaleVendita): 'agora' | 'b2b' | 'b2c' {
  return c
}
