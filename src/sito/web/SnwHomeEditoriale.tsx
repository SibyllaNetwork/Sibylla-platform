import React, { useState } from 'react'
import { InputField, SelectField } from '../../core/components/form'
import { CATEGORIE, Categoria, FOTO, OFFERTE, eur, trova } from '../sitoData'
import { useSitoStore } from '../useSitoStore'
import { SnwFoto, SnwVoto } from '../SnwUi'
import './SnwHomeEditoriale.sass'

/**
 * Home — versione B «Editoriale»: la rete raccontata come una rivista di
 * viaggio. Hero divisa (titolo grande + collage asimmetrico), indice delle
 * categorie a grandi lettere con anteprima foto, racconto di copertina,
 * itinerari numerati a zig-zag, scaffale della bottega, citazione e newsletter.
 */
const CITTA = Array.from(new Set(OFFERTE.map(o => o.citta)))

const ITINERARIO = [
  { id: 'colosseo-prioritario', ora: 'Mattina', txt: "Si entra nell'arena prima della folla, con un'archeologa che racconta il Colosseo pietra per pietra." },
  { id: 'corso-pasta', ora: 'Pranzo', txt: 'A Trastevere si impasta con una sfoglina romana, poi a tavola con quello che si è preparato.' },
  { id: 'dolce-vita-notte', ora: 'Sera', txt: "In Fiat 500 d'epoca fra le piazze illuminate, fino al brindisi con vista sui Fori." },
]

export default function SnwHomeEditoriale() {
  const vai = useSitoStore(s => s.vai)
  const aggiungi = useSitoStore(s => s.aggiungi)
  const [anteprima, setAnteprima] = useState<Categoria>('soggiorni')
  const [dove, setDove] = useState('')
  const [iscritto, setIscritto] = useState(false)
  const FOTO_CAT: Record<Categoria, string> = { soggiorni: FOTO.camera, esperienze: FOTO.colosseoArchi, prodotti: FOTO.vino, servizi: FOTO.valigia }
  const copertina = trova('cinque-terre')!

  return (
    <div className="snw-ed">
      {/* ── Hero divisa ──────────────────────────────────────────────── */}
      <section className="snw__wrap snw-ed__hero">
        <div className="snw-ed__hero-txt">
          <span className="snw-ed__numero">N° 01 · Inverno 2026</span>
          <h1>L'Italia<br /><em>che non trovi</em><br />nelle guide.</h1>
          <p>Hotel scelti uno a uno, esperienze raccontate da chi le vive ogni giorno e i sapori dei produttori della rete Sibylla.</p>
          <form className="snw-ed__cerca" onSubmit={e => { e.preventDefault(); vai({ nome: 'catalogo', dove: dove || undefined }) }}>
            <SelectField name="dove-ed" label="Dove vuoi andare?" value={dove} onChange={e => setDove(e.target.value)}
              options={[{ value: '', label: 'Tutte le destinazioni' }, ...CITTA.map(c => ({ value: c, label: c }))]} />
            <button type="submit" className="sib-btn sib-btn--primary">Esplora <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
          </form>
        </div>
        <div className="snw-ed__collage" aria-hidden="true">
          <div className="snw-ed__c1"><SnwFoto id={FOTO.trevi} w={900} h={1200} alt="" /></div>
          <div className="snw-ed__c2"><SnwFoto id={FOTO.manarola} w={700} h={700} alt="" /></div>
          <div className="snw-ed__c3"><SnwFoto id={FOTO.pasta} w={600} h={600} alt="" /></div>
          <span className="snw-ed__didascalia"><b>Fontana di Trevi</b> all'alba, a due passi dalla Residenza Trevi Suites</span>
        </div>
      </section>

      {/* ── Indice delle categorie ───────────────────────────────────── */}
      <section className="snw__wrap snw-ed__indice snw-reveal">
        <span className="snw-ed__sezione">Sommario</span>
        <div className="snw-ed__indice-grid">
          <ol>
            {CATEGORIE.map((c, i) => (
              <li key={c.id}>
                <button type="button" className={anteprima === c.id ? 'snw-ed__voce snw-ed__voce--on' : 'snw-ed__voce'}
                  onMouseEnter={() => setAnteprima(c.id)} onFocus={() => setAnteprima(c.id)} onClick={() => vai({ nome: 'catalogo', cat: c.id })}>
                  <span className="snw-ed__voce-n">0{i + 1}</span>
                  <span className="snw-ed__voce-nome">{c.nome}</span>
                  <span className="snw-ed__voce-claim">{c.claim}</span>
                  <i className="fa-light fa-arrow-right-long" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
          <div className="snw-ed__anteprima">
            {CATEGORIE.map(c => (
              <div key={c.id} className={anteprima === c.id ? 'snw-ed__ant snw-ed__ant--on' : 'snw-ed__ant'}>
                <SnwFoto id={FOTO_CAT[c.id]} w={900} h={1100} alt="" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Racconto di copertina ────────────────────────────────────── */}
      <section className="snw-ed__cover snw-reveal">
        <SnwFoto id={copertina.foto[1] ?? copertina.foto[0]} w={2000} h={1100} alt="" className="snw-ed__cover-foto" />
        <div className="snw__wrap snw-ed__cover-in">
          <article className="snw-ed__cover-box">
            <span className="snw-ed__sezione">Storia di copertina</span>
            <h2>Cinque Terre, quando il sole scende sul mare</h2>
            <p>Partiamo dal porticciolo di Manarola con lo skipper Davide: due ore di costa, un bagno in una caletta che non compare sulle mappe e un aperitivo ligure mentre Vernazza si accende.</p>
            <span className="snw-ed__cover-meta"><SnwVoto o={copertina} /> · {eur(copertina.prezzo)} a persona</span>
            <button type="button" className="snw-ed__leggi" onClick={() => vai({ nome: 'scheda', id: copertina.id })}>
              Leggi e prenota <i className="fa-light fa-arrow-right-long" aria-hidden="true" />
            </button>
          </article>
        </div>
      </section>

      {/* ── Itinerario a zig-zag ─────────────────────────────────────── */}
      <section className="snw__wrap snw-ed__iti">
        <header className="snw-ed__iti-head snw-reveal">
          <span className="snw-ed__sezione">Itinerario</span>
          <h2>Un giorno a Roma, <em>con calma</em></h2>
        </header>
        {ITINERARIO.map((t, i) => {
          const o = trova(t.id)!
          return (
            <article key={t.id} className={`snw-ed__tappa snw-reveal ${i % 2 ? 'snw-ed__tappa--dx' : ''}`}>
              <div className="snw-ed__tappa-foto"><SnwFoto id={o.foto[0]} w={1100} h={800} alt="" /></div>
              <div className="snw-ed__tappa-txt">
                <span className="snw-ed__tappa-n">0{i + 1}</span>
                <span className="snw-ed__sezione">{t.ora}</span>
                <h3>{o.titolo}</h3>
                <p>{t.txt}</p>
                <span className="snw-ed__tappa-meta">{o.durata} · da {eur(o.prezzo)}</span>
                <button type="button" className="snw-ed__leggi" onClick={() => vai({ nome: 'scheda', id: o.id })}>
                  Prenota questa tappa <i className="fa-light fa-arrow-right-long" aria-hidden="true" />
                </button>
              </div>
            </article>
          )
        })}
      </section>

      {/* ── Scaffale della bottega ───────────────────────────────────── */}
      <section className="snw-ed__bottega snw-reveal">
        <div className="snw__wrap">
          <header className="snw-ed__bottega-head">
            <div>
              <span className="snw-ed__sezione">La bottega</span>
              <h2>Da mettere in valigia</h2>
            </div>
            <button type="button" className="snw-ed__leggi" onClick={() => vai({ nome: 'catalogo', cat: 'prodotti' })}>
              Tutti i prodotti <i className="fa-light fa-arrow-right-long" aria-hidden="true" />
            </button>
          </header>
          <div className="snw-ed__scaffale">
            {OFFERTE.filter(o => o.cat === 'prodotti').map(o => (
              <article key={o.id} className="snw-ed__prod">
                <button type="button" className="snw-ed__prod-foto" onClick={() => vai({ nome: 'scheda', id: o.id })} aria-label={`Apri ${o.titolo}`}>
                  <SnwFoto id={o.foto[0]} w={600} h={750} alt="" />
                </button>
                <span className="snw-ed__prod-reg">{o.regione}</span>
                <b>{o.titolo}</b>
                <span className="snw-ed__prod-piede">
                  <span>{eur(o.prezzo)}</span>
                  <button type="button" onClick={() => aggiungi({ id: o.id, qta: 1, prezzo: o.prezzo, dettaglio: '1 pz' })}>
                    Aggiungi <i className="fa-light fa-plus" aria-hidden="true" />
                  </button>
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Citazione ────────────────────────────────────────────────── */}
      <section className="snw__wrap snw-ed__cit snw-reveal">
        <i className="fa-solid fa-quote-left" aria-hidden="true" />
        <blockquote>Ogni acquisto che fai supporta un'economia più locale, più umana, più intelligente.</blockquote>
        <cite>Il manifesto di Sibylla Network</cite>
      </section>

      {/* ── Newsletter ───────────────────────────────────────────────── */}
      <section className="snw__wrap snw-ed__news snw-reveal">
        <div>
          <span className="snw-ed__sezione">La lettera della rete</span>
          <h2>Un'idea di viaggio ogni mese</h2>
          <p>Itinerari, novità dei partner e offerte riservate agli iscritti. Niente spam, promesso.</p>
        </div>
        {iscritto ? (
          <p className="snw-ed__grazie"><i className="fa-light fa-envelope-open-text" aria-hidden="true" /> Grazie! Controlla la tua casella per confermare.</p>
        ) : (
          <form className="snw-ed__news-form" onSubmit={e => { e.preventDefault(); setIscritto(true) }}>
            <InputField name="news-mail" type="email" label="La tua e-mail" iconLeft="fa-regular fa-envelope" required />
            <button type="submit" className="sib-btn sib-btn--primary">Iscriviti</button>
          </form>
        )}
      </section>
    </div>
  )
}
