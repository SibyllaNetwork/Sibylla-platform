import React, { useEffect, useState } from 'react'
import { CheckboxField, InputField, TextareaField } from '../../core/components/form'
import { FOTO, PARTNER } from '../sitoData'
import { SnwFoto } from '../SnwUi'
import './SnwRete.sass'

/**
 * La rete: le pagine istituzionali del sito attuale riunite in una pagina con
 * indice — Chi siamo, Partner, Programma di rete I.M.T., Lavora con noi,
 * Contatti, Dati societari.
 */
const VALORI = [
  { icona: 'fa-water', tit: 'Immersione', txt: 'Soggiorni, sapori ed emozioni pensati per farti sentire parte del luogo, non solo un visitatore.' },
  { icona: 'fa-circle-nodes', tit: 'Ecosistema', txt: 'Ogni struttura e fornitore è parte attiva di una rete autentica e sostenibile. Qui nulla è lasciato al caso.' },
  { icona: 'fa-brain-circuit', tit: 'Intelligenza', txt: "Dietro ogni scelta c'è una strategia: i dati migliorano la tua esperienza e aiutano le imprese a crescere." },
  { icona: 'fa-tablet-screen', tit: 'Connessione', txt: "Totem e accessi digitali ti connettono all'offerta locale in ogni momento del viaggio." },
]
const OBIETTIVI = [
  { tit: 'Collaborazione e innovazione', txt: 'Una rete che favorisce sicurezza, sostenibilità e risparmi sugli acquisti, una gestione più efficiente del personale e camere più redditizie.' },
  { tit: 'Più profitto per le imprese', txt: 'Riduzione dei costi, ottimizzazione delle vendite e nuove opportunità commerciali generate da Sibylla Platform.' },
  { tit: 'Economie di scala', txt: "Risorse condivise e acquisti collettivi di beni e servizi per abbattere i costi complessivi." },
]
const POSIZIONI = [
  { tit: 'Sales agent', txt: 'Passione per le relazioni e fiuto per le opportunità: fai crescere un network di valore.' },
  { tit: 'Senior developer', txt: 'Piattaforme modulari, intelligenti e interconnesse, con un impatto reale.' },
  { tit: 'Operation manager', txt: 'Mente organizzativa e pensiero sistemico per coordinare processi, team e progetti.' },
]
const INDICE = [
  { id: 'chi-siamo', nome: 'Chi siamo' },
  { id: 'partner', nome: 'Partner' },
  { id: 'imt', nome: 'Programma I.M.T.' },
  { id: 'lavora', nome: 'Lavora con noi' },
  { id: 'contatti', nome: 'Contatti' },
  { id: 'societa', nome: 'Dati societari' },
]
type Tipo = keyof typeof PARTNER
const TIPI: { id: Tipo; nome: string; icona: string }[] = [
  { id: 'hotel', nome: 'Hotel', icona: 'fa-hotel' },
  { id: 'to', nome: 'Tour operator', icona: 'fa-route' },
  { id: 'fornitori', nome: 'Fornitori', icona: 'fa-store' },
]

export default function SnwRete({ ancora }: { ancora?: string }) {
  const [tipo, setTipo] = useState<Tipo>('hotel')
  const [fase, setFase] = useState(1)
  const [inviato, setInviato] = useState(false)
  const [privacy, setPrivacy] = useState(false)

  useEffect(() => {
    if (ancora) document.getElementById(`snw-rete-${ancora}`)?.scrollIntoView({ block: 'start' })
  }, [ancora])
  const vaiA = (id: string) => document.getElementById(`snw-rete-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="snw-rete">
      <section className="snw-rete__hero">
        <SnwFoto id={FOTO.sanPietro} w={1800} h={700} alt="" className="snw-rete__hero-foto" />
        <div className="snw-rete__hero-velo" />
        <div className="snw__wrap snw-rete__hero-in">
          <span className="snw-home__occhiello">Sibylla Network</span>
          <h1>Il nuovo modo di vivere il turismo</h1>
          <p>Il volto accessibile dell'ecosistema Sibylla: un portale che connette viaggiatori, territori e imprese locali in un'esperienza digitale fluida, sostenibile e autentica.</p>
        </div>
      </section>

      <nav className="snw-rete__indice" aria-label="In questa pagina">
        <div className="snw__wrap">
          {INDICE.map(x => <button key={x.id} type="button" onClick={() => vaiA(x.id)}>{x.nome}</button>)}
        </div>
      </nav>

      <div className="snw__wrap">
        <section id="snw-rete-chi-siamo" className="snw-rete__sez">
          <h2>Perché Sibylla Network è diverso</h2>
          <p className="snw-rete__lead">Non un semplice portale turistico, ma una rete diffusa di esperienze, persone e servizi che lavora insieme per offrire valore reale, condiviso e tracciabile. Ogni acquisto supporta un'economia più locale, più umana, più intelligente.</p>
          <div className="snw-rete__valori">
            {VALORI.map(v => (
              <article key={v.tit}>
                <i className={`fa-light ${v.icona}`} aria-hidden="true" />
                <h3>{v.tit}</h3>
                <p>{v.txt}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="snw-rete-partner" className="snw-rete__sez">
          <h2>I partner di Sibylla</h2>
          <p className="snw-rete__lead">Imprese, enti, consorzi e professionisti del turismo che costruiscono con noi un ecosistema dinamico, sostenibile e condiviso.</p>
          <div className="snw-rete__partner">
            <div className="snw-rete__tipi" role="tablist" aria-label="Categoria partner">
              {TIPI.map(t => (
                <button key={t.id} type="button" role="tab" aria-selected={tipo === t.id}
                  className={tipo === t.id ? 'snw-rete__tipo snw-rete__tipo--on' : 'snw-rete__tipo'} onClick={() => setTipo(t.id)}>
                  <i className={`fa-light ${t.icona}`} aria-hidden="true" />
                  <b>{t.nome}</b>
                  <small>{PARTNER[t.id].length} aziende</small>
                </button>
              ))}
            </div>
            <ul className="snw-rete__aziende">
              {PARTNER[tipo].map(a => (
                <li key={a}><span className="snw-rete__iniz">{a.replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('')}</span>{a}</li>
              ))}
            </ul>
          </div>
        </section>

        <section id="snw-rete-imt" className="snw-rete__sez">
          <span className="snw-home__occhiello snw-home__occhiello--oro">Innovation meets travel</span>
          <h2>Programma di rete I.M.T.</h2>
          <div className="snw-rete__fasi" role="tablist" aria-label="Fasi del programma">
            {[1, 2, 3].map(f => (
              <button key={f} type="button" role="tab" aria-selected={fase === f} className={fase === f ? 'snw-rete__fase snw-rete__fase--on' : 'snw-rete__fase'} onClick={() => setFase(f)}>
                Fase {f}
              </button>
            ))}
          </div>
          {fase === 1 ? (
            <div className="snw-rete__obiettivi">
              {OBIETTIVI.map((o, i) => (
                <article key={o.tit}>
                  <span className="snw-rete__num">{i + 1}</span>
                  <h3>{o.tit}</h3>
                  <p>{o.txt}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="snw-rete__lead">Gli obiettivi della fase {fase} saranno pubblicati all'avvio della fase.</p>
          )}
          <div className="snw-rete__doc">
            <button type="button" className="sib-btn sib-btn--secondary"><i className="fa-regular fa-file-pdf" aria-hidden="true" /> Regolamento decoro urbano</button>
            <button type="button" className="sib-btn sib-btn--secondary"><i className="fa-regular fa-file-pdf" aria-hidden="true" /> Contratto I.M.T.</button>
          </div>
        </section>

        <section id="snw-rete-lavora" className="snw-rete__sez">
          <h2>Lavora con noi</h2>
          <p className="snw-rete__lead">Vuoi contribuire all'evoluzione del turismo in un ecosistema innovativo, collaborativo e umano? Il tuo posto potrebbe essere qui.</p>
          <div className="snw-rete__posizioni">
            {POSIZIONI.map(p => (
              <article key={p.tit}>
                <h3>{p.tit}</h3>
                <p>{p.txt}</p>
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => vaiA('contatti')}>Candidati</button>
              </article>
            ))}
          </div>
        </section>

        <section id="snw-rete-contatti" className="snw-rete__sez snw-rete__contatti">
          <div>
            <h2>Contattaci</h2>
            <p className="snw-rete__lead">Gestisci una struttura, offri esperienze sul territorio o sei un fornitore del settore? Entra nell'ecosistema Sibylla: ti ricontattiamo per costruire insieme visibilità, vendite e crescita.</p>
            <ul className="snw-rete__diretti">
              <li><i className="fa-solid fa-phone" aria-hidden="true" /> +39 06 91714070</li>
              <li><i className="fa-solid fa-envelope" aria-hidden="true" /> info@sibyllanetwork.com</li>
              <li><i className="fa-solid fa-globe" aria-hidden="true" /> www.sibyllaecosystem.it</li>
            </ul>
          </div>
          {inviato ? (
            <div className="snw-rete__grazie">
              <i className="fa-light fa-paper-plane" aria-hidden="true" />
              <b>Messaggio inviato</b>
              <span>Ti risponderemo entro un giorno lavorativo.</span>
            </div>
          ) : (
            <form className="snw-rete__form" onSubmit={e => { e.preventDefault(); if (privacy) setInviato(true) }}>
              <InputField name="nominativo" label="Nominativo" required />
              <InputField name="mail" type="email" label="E-mail" required />
              <TextareaField name="messaggio" label="Messaggio" rows={5} />
              <CheckboxField name="privacy-contatti" label="Accetto le condizioni di privacy" checked={privacy} onChange={e => setPrivacy(e.target.checked)} />
              <button type="submit" className="sib-btn sib-btn--primary" disabled={!privacy}>Invia</button>
            </form>
          )}
        </section>

        <section id="snw-rete-societa" className="snw-rete__sez">
          <h2>Dati societari</h2>
          <dl className="snw-rete__societa">
            <div><dt>Ragione sociale</dt><dd>Sibylla S.r.l.</dd></div>
            <div><dt>Capitale sociale</dt><dd>50.000,00 €</dd></div>
            <div><dt>Sede legale</dt><dd>Via Vicenza 5/A, 00185 Roma</dd></div>
            <div><dt>Codice fiscale e REA</dt><dd>15953321005 · REA 1625640</dd></div>
            <div><dt>PEC</dt><dd>sibylla.srl@legalmail.it</dd></div>
            <div><dt>Codice SDI</dt><dd>M5UXCR1</dd></div>
          </dl>
        </section>
      </div>
    </div>
  )
}
