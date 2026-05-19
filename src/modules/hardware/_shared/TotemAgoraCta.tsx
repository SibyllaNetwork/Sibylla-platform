import React from 'react'
import './TotemAgoraCta.sass'

/**
 * CTA condivisa "Ordina su Agorà" con mockup totem Sibylla.
 * Usata in IMieiTotem e GestioneAdvertising.
 */
export default function TotemAgoraCta({
  title = 'Scegli e configura il tuo totem su Agorà',
  href  = 'https://agora.sibyllanetwork.com/marketplace/totem',
  showTitle  = true,
  showBanner = true,
}: {
  title?: string
  href?: string
  showTitle?: boolean
  showBanner?: boolean
}) {
  const Mockup = (
    <span className="totem-cta__mockup-inner">
      <span className="totem-cta__device" aria-hidden="true">
        <span className="totem-cta__screen">
          <span className="totem-cta__brand">
            <span className="totem-cta__brand-name">Sibylla</span>
            <span className="totem-cta__brand-tag">ITALIAN EXCELLENCE</span>
          </span>
        </span>
        <span className="totem-cta__stand" />
      </span>
      {showBanner && (
        <span className="totem-cta__banner">
          <i className="fa-light fa-cart-shopping" aria-hidden="true" />
          <span className="totem-cta__banner-line1">ORDINA SU</span>
          <span className="totem-cta__banner-line2">AGORÀ</span>
          <span className="totem-cta__banner-line3">MARKET SQUARE</span>
        </span>
      )}
    </span>
  )

  return (
    <section className="totem-cta">
      {showTitle && <h3 className="totem-cta__title">{title}</h3>}
      {showBanner ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="totem-cta__mockup"
          aria-label="Ordina il tuo totem su Agorà"
        >
          {Mockup}
        </a>
      ) : (
        <span className="totem-cta__mockup" aria-hidden="true">
          {Mockup}
        </span>
      )}
    </section>
  )
}
