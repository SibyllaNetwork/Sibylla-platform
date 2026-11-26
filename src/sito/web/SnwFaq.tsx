import React, { useState } from 'react'
import { SearchField } from '../../core/components/form'
import { FOTO } from '../sitoData'
import { FAQ, TEMI_FAQ, TemaFaq } from '../sitoContenuti'
import { useSitoStore } from '../useSitoStore'
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
  const lista = FAQ.map((f, i) => ({ ...f, i })).filter(f => (!tema || f.tema === tema) && (!testo || `${f.d} ${f.r}`.toLowerCase().includes(testo)))

  return (
    <div className="snw-faq">
      <SnwTestata kicker="Assistenza" titolo="Domande" enfasi="frequenti" icona="fa-circle-question" foto={FOTO.assistenza}
        sotto="Prenotazioni, pagamenti, cancellazioni, spedizioni e account: le risposte alle domande più comuni."
        briciole={[{ nome: 'Domande frequenti' }]} />
      <div className="snw__wrap snw-faq__layout">
        <section>
          <SearchField name="faq-cerca" placeholder="Cerca una domanda…" value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} />
          <div className="snw-faq__temi" role="group" aria-label="Temi">
            <button type="button" aria-pressed={!tema} className={!tema ? 'snw-faq__tema snw-faq__tema--on' : 'snw-faq__tema'} onClick={() => setTema('')}>Tutti</button>
            {TEMI_FAQ.map(t => (
              <button key={t.id} type="button" aria-pressed={tema === t.id} className={tema === t.id ? 'snw-faq__tema snw-faq__tema--on' : 'snw-faq__tema'} onClick={() => setTema(t.id)}>
                <i className={`fa-light ${t.icona}`} aria-hidden="true" />{t.nome}
              </button>
            ))}
          </div>
          {lista.length ? (
            <ul className="snw-faq__lista">
              {lista.map(f => (
                <li key={f.i} className={aperta === f.i ? 'snw-faq__voce snw-faq__voce--on' : 'snw-faq__voce'}>
                  <button type="button" aria-expanded={aperta === f.i} onClick={() => setAperta(aperta === f.i ? null : f.i)}>
                    <span>{f.d}</span><i className="fa-solid fa-chevron-down" aria-hidden="true" />
                  </button>
                  {aperta === f.i && <p>{f.r}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="snw-faq__nessuna"><i className="fa-light fa-magnifying-glass" aria-hidden="true" /> Nessuna risposta per «{q}». Scrivici: ti rispondiamo noi.</p>
          )}
        </section>

        <aside className="snw-faq__lato">
          <div className="snw-faq__box">
            <i className="fa-light fa-headset" aria-hidden="true" />
            <h2>Non hai trovato la risposta?</h2>
            <p>Dietro al booking centralizzato c'è un team pronto ad aiutarti, 7 giorni su 7.</p>
            <a href="tel:00390691714070"><i className="fa-solid fa-phone" aria-hidden="true" /> +39 06 91714070</a>
            <a href="mailto:info@sibyllanetwork.com"><i className="fa-solid fa-envelope" aria-hidden="true" /> info@sibyllanetwork.com</a>
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => vai({ nome: 'info', id: 'contatti' })}>Scrivici</button>
          </div>
          <div className="snw-faq__box">
            <i className="fa-light fa-file-invoice" aria-hidden="true" />
            <h2>Hai ricevuto un preventivo?</h2>
            <p>Aprilo con il codice che trovi nell'e-mail della struttura e confermalo online.</p>
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => vai({ nome: 'preventivo' })}>Apri il preventivo</button>
          </div>
          <div className="snw-faq__box">
            <i className="fa-light fa-bell-concierge" aria-hidden="true" />
            <h2>Servizi su richiesta</h2>
            <button type="button" className="snw-faq__link" onClick={() => vai({ nome: 'richiesta', tipo: 'transfer' })}><i className="fa-light fa-van-shuttle" aria-hidden="true" /> Trasferimenti</button>
            <button type="button" className="snw-faq__link" onClick={() => vai({ nome: 'richiesta', tipo: 'ristoranti' })}><i className="fa-light fa-utensils" aria-hidden="true" /> Ristoranti per gruppi</button>
            <button type="button" className="snw-faq__link" onClick={() => vai({ nome: 'richiesta', tipo: 'bagagli' })}><i className="fa-light fa-suitcase-rolling" aria-hidden="true" /> Deposito bagagli</button>
          </div>
        </aside>
      </div>
    </div>
  )
}
