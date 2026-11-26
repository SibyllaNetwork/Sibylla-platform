import React, { useState } from 'react'
import Tooltip from '../../core/components/Tooltip'
import { Offerta, nomeCategoria, rigaDa } from '../sitoData'
import { t } from '../i18n'
import { useSitoStore } from '../useSitoStore'
import { SnwEtichetta, SnwFoto, SnwPrezzo, SnwStepper, SnwVoto } from '../SnwUi'
import './SnwCard.sass'

/**
 * Card del catalogo: foto con etichetta e preferito, luogo, titolo, formula,
 * valutazione e prezzo. I prodotti si mettono nel carrello dalla card (con la
 * quantità); soggiorni, esperienze e servizi aprono la scheda per scegliere
 * date e orari.
 */
export default function SnwCard({ o }: { o: Offerta }) {
  const vai = useSitoStore(s => s.vai)
  const aggiungi = useSitoStore(s => s.aggiungi)
  const preferiti = useSitoStore(s => s.preferiti)
  const preferito = useSitoStore(s => s.preferito)
  const [qta, setQta] = useState(1)
  const fav = preferiti.includes(o.id)
  const apri = () => vai({ nome: 'scheda', id: o.id })

  return (
    <article className="snw-card">
      <div className="snw-card__media">
        <button type="button" className="snw-card__foto" onClick={apri} aria-label={t('Apri {titolo}', { titolo: t(o.titolo) })}>
          <SnwFoto id={o.foto[0]} w={640} h={440} alt={t(o.titolo)} />
        </button>
        <span className="snw-card__tag"><SnwEtichetta testo={o.etichetta} /></span>
        <Tooltip text={fav ? t('Togli dai preferiti') : t('Aggiungi ai preferiti')}>
          <button type="button" className={`snw-card__fav ${fav ? 'snw-card__fav--on' : ''}`} aria-pressed={fav}
            aria-label={fav ? t('Togli dai preferiti') : t('Aggiungi ai preferiti')} onClick={() => preferito(o.id)}>
            <i className={`${fav ? 'fa-solid' : 'fa-regular'} fa-heart`} />
          </button>
        </Tooltip>
      </div>
      <div className="snw-card__corpo">
        <span className="snw-card__luogo">
          <i className="fa-solid fa-location-dot" aria-hidden="true" />{t(o.citta)} · {nomeCategoria(o.cat)}
        </span>
        <h3 className="snw-card__tit">
          <button type="button" onClick={apri}>{t(o.titolo)}</button>
        </h3>
        <span className="snw-card__formula">{t(o.formula)}</span>
        <span className="snw-card__meta">
          <SnwVoto o={o} compatto />
          {o.cancellazione && <span className="snw-card__canc"><i className="fa-solid fa-circle-check" aria-hidden="true" />{t('Cancellazione gratuita')}</span>}
        </span>
        <div className="snw-card__piede">
          <SnwPrezzo o={o} />
          {o.cat === 'prodotti' ? (
            <div className="snw-card__compra">
              <SnwStepper valore={qta} onChange={setQta} etichetta={t('quantità')} />
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => aggiungi(rigaDa(o, { qta }))}>
                <i className="fa-solid fa-cart-plus" aria-hidden="true" /> {t('Aggiungi')}
              </button>
            </div>
          ) : (
            <button type="button" className="sib-btn sib-btn--primary snw-card__cta" onClick={apri}>
              {o.cat === 'soggiorni' ? t('Scegli le date') : t('Prenota')}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
