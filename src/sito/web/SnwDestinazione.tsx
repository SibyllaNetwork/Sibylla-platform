import React from 'react'
import { CATEGORIE, DESTINAZIONI, OFFERTE, destinazione, eur } from '../sitoData'
import { useSitoStore } from '../useSitoStore'
import { loc, t } from '../i18n'
import { SnwFoto } from '../SnwUi'
import SnwTestata from './SnwTestata'
import SnwCard from './SnwCard'
import './SnwDestinazione.sass'

/**
 * Pagina di una destinazione: racconto breve, numeri (offerte, prezzo da,
 * voto medio), offerte divise per categoria e le altre destinazioni.
 */
export default function SnwDestinazione({ citta }: { citta: string }) {
  const vai = useSitoStore(s => s.vai)
  const d = destinazione(citta) ?? DESTINAZIONI[0]
  const offerte = OFFERTE.filter(o => d.citta.includes(o.citta))
  const prezzoDa = offerte.length ? Math.min(...offerte.map(o => o.prezzo)) : 0
  const voto = offerte.length ? offerte.reduce((a, o) => a + o.voto, 0) / offerte.length : 0
  const tutti: Record<string, string> = {
    soggiorni: t('Tutti i soggiorni'), esperienze: t('Tutte le esperienze'), prodotti: t('Tutti i prodotti'), servizi: t('Tutti i servizi'),
  }

  return (
    <div className="snw-dst">
      <SnwTestata kicker={t(d.regione)} titolo={t('Scopri')} enfasi={t(d.nome)} sotto={t(d.intro)} foto={d.foto} icona="fa-location-dot"
        briciole={[{ nome: t('Destinazioni') }, { nome: t(d.nome) }]}
        extra={
          <ul className="snw-dst__numeri">
            <li><b>{offerte.length}</b><span>{t('offerte')}</span></li>
            <li><b>{prezzoDa ? eur(prezzoDa) : '—'}</b><span>{t('prezzo da')}</span></li>
            <li><b>{voto ? voto.toLocaleString(loc(), { maximumFractionDigits: 1 }) : '—'}</b><span>{t('voto medio')}</span></li>
          </ul>
        } />

      <div className="snw__wrap">
        {CATEGORIE.map(c => {
          const lista = offerte.filter(o => o.cat === c.id)
          if (!lista.length) return null
          return (
            <section key={c.id} className="snw-dst__sez snw-reveal">
              <header>
                <h2><i className={`fa-light ${c.icona}`} aria-hidden="true" /> {t('{categoria} a {luogo}', { categoria: t(c.nome), luogo: t(d.nome) })}</h2>
                <button type="button" className="snw-dst__link" onClick={() => vai({ nome: 'catalogo', cat: c.id })}>
                  {tutti[c.id]} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </button>
              </header>
              <div className="snw-dst__griglia">{lista.map(o => <SnwCard key={o.id} o={o} />)}</div>
            </section>
          )
        })}
        {!offerte.length && <p className="snw-dst__vuoto">{t('Le offerte per {luogo} sono in arrivo: torna a trovarci presto.', { luogo: t(d.nome) })}</p>}

        <section className="snw-dst__sez snw-reveal">
          <header><h2>{t('Altre destinazioni')}</h2></header>
          <div className="snw-dst__altre">
            {DESTINAZIONI.filter(x => x.nome !== d.nome).map(x => (
              <button key={x.nome} type="button" onClick={() => vai({ nome: 'destinazione', citta: x.nome })}>
                <SnwFoto id={x.foto} w={600} h={600} alt="" />
                <span><small>{t(x.regione)}</small><b>{t(x.nome)}</b></span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
