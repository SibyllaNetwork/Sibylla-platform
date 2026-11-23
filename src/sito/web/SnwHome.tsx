import React, { useEffect, useRef, useState } from 'react'
import { DateRangeField, SelectField } from '../../core/components/form'
import { useCountUp } from '../../core/bi'
import { CATEGORIE, Categoria, DESTINAZIONI, FOTO, OFFERTE, eur, trova } from '../sitoData'
import { useSitoStore } from '../useSitoStore'
import { SnwFoto } from '../SnwUi'
import SnwCard from './SnwCard'
import './SnwHome.sass'

/**
 * Home del sito, stile e-commerce d'impatto: hero a tutto schermo con foto che
 * si alternano (zoom lento) e parola-destinazione che cambia, ricerca in vetro
 * smerigliato, nastro scorrevole, categorie a tutta foto, caroselli, offerta
 * lampo con conto alla rovescia, destinazioni a mosaico, numeri della rete,
 * human touch e ipernetwork. Le sezioni entrano allo scroll (.snw-reveal).
 */
const CITTA = Array.from(new Set(OFFERTE.map(o => o.citta)))

const SLIDE = [
  { foto: FOTO.colosseo, luogo: 'Roma', cat: 'esperienze' as Categoria },
  { foto: FOTO.vernazza, luogo: 'Cinque Terre', cat: 'esperienze' as Categoria },
  { foto: FOTO.rialto, luogo: 'Venezia', cat: 'soggiorni' as Categoria },
  { foto: FOTO.mare, luogo: 'Sardegna', cat: 'soggiorni' as Categoria },
]
const FOTO_CAT: Record<Categoria, string> = {
  soggiorni: FOTO.cameraClassica,
  esperienze: FOTO.trevi,
  prodotti: FOTO.olio,
  servizi: FOTO.valigia,
}
const NASTRO = ['Soggiorni selezionati', 'Esperienze autentiche', 'Made in Italy a casa tua', 'Servizi per il viaggio', 'Cancellazione gratuita', 'Persone vere, 7 giorni su 7', 'Partner verificati']

const RETE = [
  { tit: 'Hotel', prod: 'Sibylla Platform', icona: 'fa-hotel', url: 'https://www.sibyllaecosystem.it/soluzioni/platform/',
    txt: "Dal check-in alla distribuzione, dai dati alla marginalità: l'operatività della struttura in un'unica piattaforma." },
  { tit: 'Tour operator', prod: 'Sibylla Tableau', icona: 'fa-route', url: 'https://www.sibyllaecosystem.it/soluzioni/tableau/',
    txt: 'TO e hotel in un ambiente digitale unico: prenotazioni, disponibilità e relazioni B2B senza interruzioni.' },
  { tit: 'Fornitori', prod: 'Sibylla Agorà', icona: 'fa-store', url: 'https://www.sibyllaecosystem.it/soluzioni/agora/',
    txt: 'Il marketplace specializzato dove proporre soluzioni su misura e crescere con una rete selezionata.' },
]

// Offerta lampo: scade a mezzanotte
function useMezzanotte() {
  const calc = () => { const f = new Date(); f.setHours(24, 0, 0, 0); return Math.max(0, f.getTime() - Date.now()) }
  const [ms, setMs] = useState(calc)
  useEffect(() => { const t = window.setInterval(() => setMs(calc()), 1000); return () => clearInterval(t) }, [])
  const s = Math.floor(ms / 1000)
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(n => String(n).padStart(2, '0'))
}

function Numero({ valore, decimali = 0, suffisso = '', etichetta }: { valore: number; decimali?: number; suffisso?: string; etichetta: string }) {
  const v = useCountUp(valore, 1600)
  return (
    <div className="snw-home__num">
      <b>{v.toLocaleString('it-IT', { minimumFractionDigits: decimali, maximumFractionDigits: decimali })}{suffisso}</b>
      <span>{etichetta}</span>
    </div>
  )
}

export default function SnwHome() {
  const vai = useSitoStore(s => s.vai)
  const aggiungi = useSitoStore(s => s.aggiungi)
  const [slide, setSlide] = useState(0)
  const [cat, setCat] = useState<Categoria>('soggiorni')
  const [dove, setDove] = useState('')
  const [dal, setDal] = useState('')
  const [al, setAl] = useState('')
  const [ospiti, setOspiti] = useState('2')
  const [hh, mm, ss] = useMezzanotte()
  const carosello = useRef<HTMLDivElement>(null)
  const di = (c: Categoria) => OFFERTE.filter(o => o.cat === c)
  const lampo = trova('colosseo-prioritario')!

  // Le foto dell'hero si alternano ogni 6 secondi
  useEffect(() => {
    const t = window.setInterval(() => setSlide(s => (s + 1) % SLIDE.length), 6000)
    return () => clearInterval(t)
  }, [])

  const scorri = (dir: number) => carosello.current?.scrollBy({ left: dir * 340, behavior: 'smooth' })
  const recensioni = OFFERTE.reduce((a, o) => a + o.recensioni, 0)
  const votoMedio = OFFERTE.reduce((a, o) => a + o.voto, 0) / OFFERTE.length

  return (
    <div className="snw-home">
      {/* ── Hero a tutto schermo ─────────────────────────────────────── */}
      <section className="snw-home__hero">
        {SLIDE.map((s, i) => (
          <div key={s.foto} className={`snw-home__slide ${i === slide ? 'snw-home__slide--on' : ''}`} aria-hidden={i !== slide}>
            <SnwFoto id={s.foto} w={2000} h={1200} alt="" />
          </div>
        ))}
        <div className="snw-home__hero-velo" />
        <div className="snw__wrap snw-home__hero-in">
          <span className="snw-home__occhiello"><i className="fa-solid fa-key" aria-hidden="true" /> Change the way of buying travel</span>
          <h1>
            Vivi
            <span className="snw-home__rotore" aria-live="polite">
              {SLIDE.map((s, i) => <span key={s.luogo} className={i === slide ? 'snw-home__parola snw-home__parola--on' : 'snw-home__parola'}>{s.luogo}</span>)}
            </span>
            <br />come chi ci abita.
          </h1>
          <p>Soggiorni scelti, esperienze autentiche e il meglio del Made in Italy, da un'unica rete di imprese del turismo.</p>

          <form className="snw-home__cerca" onSubmit={e => { e.preventDefault(); vai({ nome: 'catalogo', cat, dove: dove || undefined }) }}>
            <div className="snw-home__cerca-tab" role="tablist" aria-label="Cosa cerchi">
              {CATEGORIE.map(c => (
                <button key={c.id} type="button" role="tab" aria-selected={cat === c.id}
                  className={cat === c.id ? 'snw-home__tab snw-home__tab--on' : 'snw-home__tab'} onClick={() => setCat(c.id)}>
                  <i className={`fa-light ${c.icona}`} aria-hidden="true" />{c.nome}
                </button>
              ))}
            </div>
            <div className="snw-home__cerca-campi">
              <SelectField name="dove" label="Dove" value={dove} onChange={e => setDove(e.target.value)}
                options={[{ value: '', label: 'Tutte le destinazioni' }, ...CITTA.map(c => ({ value: c, label: c }))]} />
              <DateRangeField label={cat === 'soggiorni' ? 'Check-in e check-out' : 'Quando'} nameFrom="dal" nameTo="al"
                valueFrom={dal} valueTo={al} onChangeFrom={e => setDal(e.target.value)} onChangeTo={e => setAl(e.target.value)} />
              <SelectField name="ospiti" label="Ospiti" value={ospiti} onChange={e => setOspiti(e.target.value)}
                options={[1, 2, 3, 4, 5, 6].map(n => ({ value: String(n), label: `${n} ${n === 1 ? 'ospite' : 'ospiti'}` }))} />
              <button type="submit" className="snw-home__cerca-btn">
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Cerca
              </button>
            </div>
          </form>
        </div>

        <div className="snw-home__dots" role="tablist" aria-label="Destinazioni in primo piano">
          {SLIDE.map((s, i) => (
            <button key={s.luogo} type="button" role="tab" aria-selected={i === slide} aria-label={s.luogo}
              className={i === slide ? 'snw-home__dot snw-home__dot--on' : 'snw-home__dot'} onClick={() => setSlide(i)}>
              <span className="snw-home__dot-bar"><span /></span>{s.luogo}
            </button>
          ))}
        </div>
      </section>

      {/* ── Nastro scorrevole ────────────────────────────────────────── */}
      <div className="snw-home__nastro" aria-hidden="true">
        <div className="snw-home__nastro-in">
          {[...NASTRO, ...NASTRO].map((t, i) => <span key={i}>{t}<i className="fa-solid fa-sparkle" /></span>)}
        </div>
      </div>

      {/* ── Categorie a tutta foto ───────────────────────────────────── */}
      <section className="snw__wrap snw-home__sez snw-reveal">
        <header className="snw-home__sez-head">
          <div>
            <span className="snw-home__kicker">Cosa cerchi oggi?</span>
            <h2>Quattro modi di viaggiare</h2>
          </div>
        </header>
        <div className="snw-home__cat">
          {CATEGORIE.map((c, i) => (
            <button key={c.id} type="button" className={`snw-home__cat-voce snw-home__cat-voce--${i}`} onClick={() => vai({ nome: 'catalogo', cat: c.id })}>
              <SnwFoto id={FOTO_CAT[c.id]} w={700} h={900} alt="" />
              <span className="snw-home__cat-velo" />
              <span className="snw-home__cat-txt">
                <span className="snw-home__cat-anello"><i className={`fa-light ${c.icona}`} aria-hidden="true" /></span>
                <b>{c.nome}</b>
                <small>{c.claim}</small>
                <span className="snw-home__cat-n">{di(c.id).length} offerte <i className="fa-solid fa-arrow-right" aria-hidden="true" /></span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Carosello esperienze ─────────────────────────────────────── */}
      <section className="snw__wrap snw-home__sez snw-reveal">
        <header className="snw-home__sez-head">
          <div>
            <span className="snw-home__kicker">Le più prenotate</span>
            <h2>Esperienze che restano</h2>
          </div>
          <span className="snw-home__frecce">
            <button type="button" aria-label="Precedenti" onClick={() => scorri(-1)}><i className="fa-solid fa-arrow-left" /></button>
            <button type="button" aria-label="Successive" onClick={() => scorri(1)}><i className="fa-solid fa-arrow-right" /></button>
          </span>
        </header>
        <div className="snw-home__carosello" ref={carosello}>
          {di('esperienze').map(o => <div key={o.id} className="snw-home__car-item"><SnwCard o={o} /></div>)}
        </div>
      </section>

      {/* ── Offerta lampo ────────────────────────────────────────────── */}
      <section className="snw__wrap snw-home__sez snw-reveal">
        <div className="snw-home__lampo">
          <div className="snw-home__lampo-foto"><SnwFoto id={lampo.foto[0]} w={1200} h={900} alt="" /></div>
          <div className="snw-home__lampo-txt">
            <span className="snw-home__lampo-tag"><i className="fa-solid fa-bolt" aria-hidden="true" /> Offerta lampo · solo oggi</span>
            <h2>{lampo.titolo}</h2>
            <p>{lampo.descrizione}</p>
            <div className="snw-home__conto" aria-label={`Scade tra ${hh} ore, ${mm} minuti e ${ss} secondi`}>
              {[[hh, 'ore'], [mm, 'min'], [ss, 'sec']].map(([v, l]) => (
                <span key={l}><b>{v}</b><small>{l}</small></span>
              ))}
            </div>
            <div className="snw-home__lampo-prezzo">
              <s>{eur(lampo.prezzoPieno ?? lampo.prezzo)}</s>
              <b>{eur(lampo.prezzo)}</b>
              <span>a persona · −{Math.round((1 - lampo.prezzo / (lampo.prezzoPieno ?? lampo.prezzo)) * 100)}%</span>
            </div>
            <div className="snw-home__lampo-cta">
              <button type="button" className="snw-home__btn-oro" onClick={() => vai({ nome: 'scheda', id: lampo.id })}>Prenota ora</button>
              <button type="button" className="snw-home__btn-vetro" onClick={() => vai({ nome: 'catalogo', cat: 'esperienze' })}>Altre esperienze</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Destinazioni a mosaico ───────────────────────────────────── */}
      <section className="snw__wrap snw-home__sez snw-reveal">
        <header className="snw-home__sez-head">
          <div>
            <span className="snw-home__kicker">Dove ti portiamo</span>
            <h2>Destinazioni della rete</h2>
          </div>
        </header>
        <div className="snw-home__dest">
          {DESTINAZIONI.map(d => {
            const n = OFFERTE.filter(o => o.citta === d.nome).length
            return (
              <button key={d.nome} type="button" className="snw-home__dest-voce"
                onClick={() => vai({ nome: 'catalogo', dove: n ? d.nome : undefined })}>
                <SnwFoto id={d.foto} w={900} h={900} alt="" />
                <span className="snw-home__dest-txt">
                  <small>{d.regione}</small>
                  <b>{d.nome}</b>
                  <span>{n ? `${n} offerte` : 'Scopri'} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── Numeri della rete ────────────────────────────────────────── */}
      <section className="snw-home__numeri snw-reveal">
        <div className="snw__wrap snw-home__numeri-in">
          <Numero valore={OFFERTE.length} etichetta="offerte in vetrina" />
          <Numero valore={CITTA.length} etichetta="destinazioni" />
          <Numero valore={votoMedio} decimali={1} suffisso="/5" etichetta="voto medio" />
          <Numero valore={recensioni} etichetta="recensioni verificate" />
        </div>
      </section>

      {/* ── Soggiorni + prodotti ─────────────────────────────────────── */}
      <Vetrina kicker="Dormire bene" titolo="Soggiorni selezionati" offerte={di('soggiorni').slice(0, 4)} onTutte={() => vai({ nome: 'catalogo', cat: 'soggiorni' })} />

      <section className="snw__wrap snw-home__sez snw-reveal">
        <div className="snw-home__made">
          <div className="snw-home__made-txt">
            <span className="snw-home__kicker">Made in Italy</span>
            <h2>Il viaggio continua a casa</h2>
            <p>Olio, vino e sapori dei produttori della rete, spediti in 48 ore. Ogni acquisto sostiene un'impresa del territorio.</p>
            <button type="button" className="snw-home__btn-oro" onClick={() => vai({ nome: 'catalogo', cat: 'prodotti' })}>Vai alla bottega</button>
          </div>
          <div className="snw-home__made-griglia">
            {di('prodotti').map(o => (
              <article key={o.id} className="snw-home__prod">
                <button type="button" className="snw-home__prod-foto" onClick={() => vai({ nome: 'scheda', id: o.id })} aria-label={`Apri ${o.titolo}`}>
                  <SnwFoto id={o.foto[0]} w={500} h={500} alt="" />
                </button>
                <span className="snw-home__prod-txt">
                  <b>{o.titolo}</b>
                  <span>{eur(o.prezzo)}</span>
                </span>
                <button type="button" className="snw-home__prod-add" aria-label={`Aggiungi ${o.titolo} al carrello`}
                  onClick={() => aggiungi({ id: o.id, qta: 1, prezzo: o.prezzo, dettaglio: '1 pz' })}>
                  <i className="fa-solid fa-plus" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Vetrina kicker="Senza pensieri" titolo="Servizi per il viaggio" offerte={di('servizi')} onTutte={() => vai({ nome: 'catalogo', cat: 'servizi' })} />

      {/* ── Human touch ──────────────────────────────────────────────── */}
      <section className="snw__wrap snw-home__sez snw-reveal">
        <div className="snw-home__human">
          <SnwFoto id={FOTO.assistenza} w={1200} h={800} alt="" className="snw-home__human-foto" />
          <div className="snw-home__human-txt">
            <span className="snw-home__kicker">La soluzione human touch</span>
            <h2>Dietro ogni prenotazione c'è una persona.</h2>
            <p>Il booking centralizzato di Sibylla ti segue prima, durante e dopo il viaggio: personalizza l'itinerario, risolve gli imprevisti e parla la tua lingua.</p>
            <div className="snw-home__lampo-cta">
              <a className="snw-home__btn-oro" href="tel:00390691714070"><i className="fa-solid fa-phone" aria-hidden="true" /> Chiama il booking</a>
              <a className="snw-home__btn-vetro" href="https://www.sibyllaecosystem.it/servizi/booking/" target="_blank" rel="noreferrer">Scopri Sibylla Booking</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Ipernetwork ──────────────────────────────────────────────── */}
      <section className="snw-home__rete snw-reveal">
        <div className="snw__wrap">
          <header className="snw-home__sez-head">
            <div>
              <span className="snw-home__kicker">Per le imprese del turismo</span>
              <h2>L'ipernetwork che crea valore</h2>
            </div>
          </header>
          <div className="snw-home__rete-grid">
            {RETE.map(r => (
              <a key={r.tit} href={r.url} target="_blank" rel="noreferrer" className="snw-home__rete-card">
                <i className={`fa-light ${r.icona}`} aria-hidden="true" />
                <span className="snw-home__rete-prod">{r.prod}</span>
                <h3>{r.tit}</h3>
                <p>{r.txt}</p>
                <span className="snw-home__rete-cta">Scopri di più <i className="fa-solid fa-arrow-right" aria-hidden="true" /></span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function Vetrina({ kicker, titolo, offerte, onTutte }: { kicker: string; titolo: string; offerte: typeof OFFERTE; onTutte: () => void }) {
  return (
    <section className="snw__wrap snw-home__sez snw-reveal">
      <header className="snw-home__sez-head">
        <div>
          <span className="snw-home__kicker">{kicker}</span>
          <h2>{titolo}</h2>
        </div>
        <button type="button" className="snw-home__link" onClick={onTutte}>
          Vedi tutto <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </button>
      </header>
      <div className="snw-home__griglia">
        {offerte.map(o => <SnwCard key={o.id} o={o} />)}
      </div>
    </section>
  )
}
