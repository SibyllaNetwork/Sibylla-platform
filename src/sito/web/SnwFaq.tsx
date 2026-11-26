import React, { useState } from 'react'
import { SearchField } from '../../core/components/form'
import { FOTO } from '../sitoData'
import { FAQ, TEMI_FAQ, TemaFaq } from '../sitoContenuti'
import { useSitoStore } from '../useSitoStore'
import { t } from '../i18n'
import SnwTestata from './SnwTestata'
import './SnwFaq.sass'

/**
 * Domande frequenti (sibyllanetwork.com/faq): ricerca, temi, risposte a
 * fisarmonica e, a lato, i contatti del booking human touch e l'apertura di
 * un preventivo ricevuto per e-mail.
 */
export default function SnwFaq() {
  const vai = useSitoStore(s => s.vai)
  const [q, setQ] = useState('')
  const [tema, setTema] = useState<TemaFaq | ''>('')
  const [aperta, setAperta] = useState<number | null>(0)
  const testo = q.trim().toLowerCase()
  const lista = FAQ.map((f, i) => ({ ...f, i })).filter(f => (!tema || f.tema === tema) && (!testo || `${t(f.d)} ${t(f.r)}`.toLowerCase().includes(testo)))

  return (
    <div className="snw-faq">
      <SnwTestata kicker={t('Assistenza')} titolo={t('Domande')} enfasi={t('frequenti')} icona="fa-circle-question" foto={FOTO.assistenza}
        sotto={t('Prenotazioni, pagamenti, cancellazioni, spedizioni e account: le risposte alle domande più comuni.')}
        briciole={[{ nome: t('Domande frequenti') }]} />
      <div className="snw__wrap snw-faq__layout">
        <section>
          <SearchField name="faq-cerca" placeholder={t('Cerca una domanda…')} value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} />
          <div className="snw-faq__temi" role="group" aria-label={t('Temi')}>
            <button type="button" aria-pressed={!tema} className={!tema ? 'snw-faq__tema snw-faq__tema--on' : 'snw-faq__tema'} onClick={() => setTema('')}>{t('Tutti')}</button>
            {TEMI_FAQ.map(x => (
              <button key={x.id} type="button" aria-pressed={tema === x.id} className={tema === x.id ? 'snw-faq__tema snw-faq__tema--on' : 'snw-faq__tema'} onClick={() => setTema(x.id)}>
                <i className={`fa-light ${x.icona}`} aria-hidden="true" />{t(x.nome)}
              </button>
            ))}
          </div>
          {lista.length ? (
            <ul className="snw-faq__lista">
              {lista.map(f => (
                <li key={f.i} className={aperta === f.i ? 'snw-faq__voce snw-faq__voce--on' : 'snw-faq__voce'}>
                  <button type="button" aria-expanded={aperta === f.i} onClick={() => setAperta(aperta === f.i ? null : f.i)}>
                    <span>{t(f.d)}</span><i className="fa-solid fa-chevron-down" aria-hidden="true" />
                  </button>
                  {aperta === f.i && <p>{t(f.r)}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="snw-faq__nessuna"><i className="fa-light fa-magnifying-glass" aria-hidden="true" /> {t('Nessuna risposta per «{q}». Scrivici: ti rispondiamo noi.', { q })}</p>
          )}
        </section>

        <aside className="snw-faq__lato">
          <div className="snw-faq__box">
            <i className="fa-light fa-headset" aria-hidden="true" />
            <h2>{t('Non hai trovato la risposta?')}</h2>
            <p>{t("Dietro al booking centralizzato c'è un team pronto ad aiutarti, 7 giorni su 7.")}</p>
            <a href="tel:00390691714070"><i className="fa-solid fa-phone" aria-hidden="true" /> +39 06 91714070</a>
            <a href="mailto:info@sibyllanetwork.com"><i className="fa-solid fa-envelope" aria-hidden="true" /> info@sibyllanetwork.com</a>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'info', id: 'contatti' })}>{t('Scrivici')}</button>
          </div>
          <div className="snw-faq__box">
            <i className="fa-light fa-file-invoice" aria-hidden="true" />
            <h2>{t('Hai ricevuto un preventivo?')}</h2>
            <p>{t("Aprilo con il codice che trovi nell'e-mail della struttura e confermalo online.")}</p>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => vai({ nome: 'preventivo' })}>{t('Apri il preventivo')}</button>
          </div>
          <div className="snw-faq__box">
            <i className="fa-light fa-bell-concierge" aria-hidden="true" />
            <h2>{t('Servizi su richiesta')}</h2>
            <button type="button" className="snw-faq__link" onClick={() => vai({ nome: 'richiesta', tipo: 'transfer' })}><i className="fa-light fa-van-shuttle" aria-hidden="true" /> {t('Trasferimenti')}</button>
            <button type="button" className="snw-faq__link" onClick={() => vai({ nome: 'richiesta', tipo: 'ristoranti' })}><i className="fa-light fa-utensils" aria-hidden="true" /> {t('Ristoranti per gruppi')}</button>
            <button type="button" className="snw-faq__link" onClick={() => vai({ nome: 'richiesta', tipo: 'bagagli' })}><i className="fa-light fa-suitcase-rolling" aria-hidden="true" /> {t('Deposito bagagli')}</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
