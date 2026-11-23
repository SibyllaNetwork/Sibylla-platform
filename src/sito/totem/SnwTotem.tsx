import React, { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import TouchKeyboard from '../../core/components/TouchKeyboard/TouchKeyboard'
import FlagCircle from '../../core/components/FlagCircle'
import { useConfirmStore } from '../../store/useConfirmStore'
import { CATEGORIE, Categoria, FOTO, OFFERTE, STRUTTURA_OSPITE, eur, oggiIso, rigaDa, trova } from '../sitoData'
import { VersioneHome, useSitoStore } from '../useSitoStore'
import { SnwFoto, SnwLogo, SnwStepper, SnwVoto } from '../SnwUi'
import './SnwTotem.sass'

/**
 * Totem interattivo (verticale 9:16, touch) per le strutture ricettive.
 * Stessi dati e carrello del sito web; interfaccia a corpo grande, niente
 * hover, bersagli ≥ 2 cm. Flusso: attesa → home (5 categorie, compresa la
 * Struttura che ospita il totem) → elenco → scheda → carrello → pagamento con
 * QR sul telefono o addebito in camera. Dopo 75 s senza tocchi chiede se c'è
 * ancora qualcuno e poi si azzera (carrello svuotato: privacy del cliente).
 * Le misure sono in em sul font del riquadro (2,5cqw): su un totem
 * 1080×1920 il corpo base vale 27px, in anteprima scala con la finestra.
 * Tre formati come il sito: A Impatto (scuro, foto a tutto campo, carosello),
 * B Editoriale (da rivista: filetti, corsivi, elenchi numerati), C Mosaico
 * (riquadri colorati e angoli ampi). Il formato si sceglie dal pannello demo.
 */
type Vista =
  | { n: 'home' }
  | { n: 'cat'; cat: Categoria }
  | { n: 'struttura' }
  | { n: 'scheda'; id: string }
  | { n: 'carrello' }
  | { n: 'pagato'; come: 'telefono' | 'camera'; ordine: string }

const INATTIVO_S = 75
const CONFERMA_S = 15
const LINGUE = ['it', 'gb', 'de', 'fr', 'es']
const SLIDE = [FOTO.colosseo, FOTO.trevi, FOTO.vernazza, FOTO.rialto]

const FORMATI: { id: VersioneHome; lettera: string; nome: string }[] = [
  { id: 'impatto', lettera: 'A', nome: 'Impatto' },
  { id: 'editoriale', lettera: 'B', nome: 'Editoriale' },
  { id: 'bento', lettera: 'C', nome: 'Mosaico' },
]

const giorno = (piu: number) => {
  const d = new Date(); d.setDate(d.getDate() + piu)
  return { iso: oggiIso(piu), nome: piu === 0 ? 'Oggi' : piu === 1 ? 'Domani' : d.toLocaleDateString('it-IT', { weekday: 'short' }), num: d.getDate() }
}

export default function SnwTotem() {
  const carrello = useSitoStore(s => s.carrello)
  const svuota = useSitoStore(s => s.svuota)
  const setModo = useSitoStore(s => s.setModo)
  const chiudi = useSitoStore(s => s.chiudi)
  const versione = useSitoStore(s => s.versione)
  const setVersione = useSitoStore(s => s.setVersione)
  const [attesa, setAttesa] = useState(true)
  const [lingua, setLingua] = useState('it')
  const [storia, setStoria] = useState<Vista[]>([{ n: 'home' }])
  const [inattivo, setInattivo] = useState(0)
  const [slide, setSlide] = useState(0)
  const [ora, setOra] = useState(() => new Date())
  const scroll = useRef<HTMLDivElement>(null)
  const vista = storia[storia.length - 1]
  const pezzi = carrello.reduce((a, r) => a + r.qta, 0)

  const vai = (v: Vista) => { setStoria(s => [...s, v]); scroll.current?.scrollTo({ top: 0 }) }
  const indietro = () => { setStoria(s => (s.length > 1 ? s.slice(0, -1) : s)); scroll.current?.scrollTo({ top: 0 }) }
  const home = () => { setStoria([{ n: 'home' }]); scroll.current?.scrollTo({ top: 0 }) }
  const azzera = useCallback(() => { svuota(); setStoria([{ n: 'home' }]); setAttesa(true); setInattivo(0) }, [svuota])

  // Orologio, foto dell'attesa, contatore di inattività
  useEffect(() => {
    const t = window.setInterval(() => {
      setOra(new Date())
      setSlide(s => (s + 1) % SLIDE.length)
    }, 5000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (attesa) return
    const t = window.setInterval(() => setInattivo(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [attesa])
  useEffect(() => { if (inattivo >= INATTIVO_S + CONFERMA_S) azzera() }, [inattivo, azzera])

  const tocco = () => { if (inattivo < INATTIVO_S) setInattivo(0) }

  return (
    <div className={`snw-tot snw--${versione}`} data-section="sito">
      {/* Comandi dell'anteprima (fuori dallo schermo del totem) */}
      <aside className="snw-tot__demo" aria-label="Anteprima totem">
        <span className="snw-tot__demo-tit"><i className="fa-solid fa-tablet-screen" aria-hidden="true" /> Anteprima totem</span>
        <small>Schermo verticale 1080×1920, touch. Dopo {INATTIVO_S} s senza tocchi si azzera.</small>
        <span className="snw-tot__demo-lbl">Formato</span>
        <div className="snw-tot__formati" role="group" aria-label="Formato del totem">
          {FORMATI.map(f => (
            <button key={f.id} type="button" aria-pressed={versione === f.id}
              className={versione === f.id ? 'snw-tot__formato snw-tot__formato--on' : 'snw-tot__formato'}
              onClick={() => { setVersione(f.id); useSitoStore.getState().setModo('totem') }}>
              <b>{f.lettera}</b>{f.nome}
            </button>
          ))}
        </div>
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setModo('web')}><i className="fa-solid fa-display" aria-hidden="true" /> Vai al sito web</button>
        <button type="button" className="sib-btn sib-btn--ghost" onClick={azzera}><i className="fa-solid fa-rotate-left" aria-hidden="true" /> Azzera il totem</button>
        <button type="button" className="sib-btn sib-btn--ghost" onClick={chiudi}><i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Torna in Platform</button>
      </aside>

      <div className="snw-tot__cornice">
        <div className="snw-tot__schermo" onPointerDown={tocco}>
          {attesa ? (
            <div className="snw-tot__attesa" role="button" tabIndex={0} aria-label="Tocca per iniziare"
              onClick={() => { setAttesa(false); setInattivo(0) }} onKeyDown={e => { if (e.key === 'Enter') { setAttesa(false); setInattivo(0) } }}>
              {SLIDE.map((f, i) => (
                <span key={f} className={i === slide ? 'snw-tot__att-foto snw-tot__att-foto--on' : 'snw-tot__att-foto'}><SnwFoto id={f} w={1200} h={2100} alt="" /></span>
              ))}
              <span className="snw-tot__att-velo" />
              <span className="snw-tot__att-top"><SnwLogo chiaro /></span>
              <span className="snw-tot__att-txt">
                <small>Benvenuti a</small>
                <b>{STRUTTURA_OSPITE.nome}</b>
                <span>Esperienze, servizi e sapori della città, prenotabili qui in un minuto.</span>
              </span>
              <span className="snw-tot__att-tocca"><i className="fa-solid fa-hand-pointer" aria-hidden="true" /> Tocca lo schermo per iniziare</span>
              <span className="snw-tot__att-lingue">
                {LINGUE.map(l => (
                  <button key={l} type="button" aria-label={`Lingua ${l}`} aria-pressed={l === lingua}
                    className={l === lingua ? 'snw-tot__lingua snw-tot__lingua--on' : 'snw-tot__lingua'}
                    onClick={e => { e.stopPropagation(); setLingua(l) }}>
                    <FlagCircle code={l} size={44} />
                  </button>
                ))}
              </span>
            </div>
          ) : (
            <>
              <header className="snw-tot__head">
                <button type="button" className="snw-tot__brand" onClick={home} aria-label="Home"><SnwLogo chiaro={versione === 'impatto'} /></button>
                <span className="snw-tot__ospite">
                  <b>{STRUTTURA_OSPITE.nome}</b>
                  <span>{ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · {ora.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                </span>
                <FlagCircle code={lingua} size={40} />
              </header>

              <div className="snw-tot__scroll" ref={scroll}>
                {vista.n === 'home' && <Home vai={vai} versione={versione} />}
                {vista.n === 'cat' && <Elenco cat={vista.cat} vai={vai} versione={versione} />}
                {vista.n === 'struttura' && <Struttura />}
                {vista.n === 'scheda' && <Scheda key={vista.id} id={vista.id} onAggiunto={() => vai({ n: 'carrello' })} />}
                {vista.n === 'carrello' && <Carrello vai={vai} />}
                {vista.n === 'pagato' && <Pagato come={vista.come} ordine={vista.ordine} onFine={azzera} />}
              </div>

              <nav className="snw-tot__nav" aria-label="Navigazione totem">
                <button type="button" onClick={home} className={vista.n === 'home' ? 'snw-tot__nav-on' : ''}><i className="fa-light fa-house" aria-hidden="true" />Home</button>
                <button type="button" onClick={indietro} disabled={storia.length < 2}><i className="fa-light fa-arrow-left" aria-hidden="true" />Indietro</button>
                <button type="button" onClick={() => vai({ n: 'struttura' })} className={vista.n === 'struttura' ? 'snw-tot__nav-on' : ''}><i className="fa-light fa-bell-concierge" aria-hidden="true" />Hotel</button>
                <button type="button" onClick={() => vai({ n: 'carrello' })} className={vista.n === 'carrello' ? 'snw-tot__nav-on' : ''}>
                  <i className="fa-light fa-cart-shopping" aria-hidden="true" />Carrello
                  {pezzi > 0 && <span className="snw-tot__badge">{pezzi}</span>}
                </button>
              </nav>

              <TouchKeyboard within=".snw-tot__schermo" />

              {inattivo >= INATTIVO_S && (
                <div className="snw-tot__ancora" role="alertdialog" aria-label="Sei ancora qui?">
                  <div>
                    <i className="fa-light fa-hourglass-half" aria-hidden="true" />
                    <b>Sei ancora qui?</b>
                    <span>Tra {Math.max(0, INATTIVO_S + CONFERMA_S - inattivo)} secondi il totem ricomincia da capo e il carrello verrà svuotato.</span>
                    <button type="button" className="snw-tot__btn" onClick={() => setInattivo(0)}>Sì, continuo</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Home del totem (una per formato) ─────────────────────────────────
type PropsPag = { vai: (v: Vista) => void; versione: VersioneHome }

function Anelli({ vai }: { vai: (v: Vista) => void }) {
  return (
    <div className="snw-tot__anelli">
      {CATEGORIE.map(c => (
        <button key={c.id} type="button" onClick={() => vai({ n: 'cat', cat: c.id })}>
          <span className="snw-tot__anello"><i className={`fa-thin ${c.icona}`} aria-hidden="true" /></span>{c.nome}
        </button>
      ))}
      <button type="button" onClick={() => vai({ n: 'struttura' })}>
        <span className="snw-tot__anello snw-tot__anello--hotel"><i className="fa-thin fa-hotel" aria-hidden="true" /></span>Struttura
      </button>
    </div>
  )
}

function Porta() {
  return (
    <section className="snw-tot__porta">
      <i className="fa-light fa-mobile-screen-button" aria-hidden="true" />
      <span><b>Continua dal tuo telefono</b>Al pagamento puoi inquadrare un QR code e chiudere l'acquisto sul tuo smartphone.</span>
    </section>
  )
}

function Home({ vai, versione }: PropsPag) {
  const top = OFFERTE.filter(o => o.cat === 'esperienze').slice(0, 4)

  if (versione === 'editoriale') {
    const oggi = new Date()
    return (
      <div className="snw-tot__pag">
        <header className="snw-tot__ed-testa">
          <small>{oggi.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} · La guida di {STRUTTURA_OSPITE.nome}</small>
          <h1>Cosa facciamo <em>oggi</em>?</h1>
          <p>Le proposte scelte dal concierge per chi soggiorna qui: si prenotano in un minuto.</p>
        </header>
        <Anelli vai={vai} />
        <div className="snw-tot__ed-copertina">
          <SnwFoto id={FOTO.colosseoArchi} w={1200} h={700} alt="" />
          <span><small>In copertina</small><b>Roma è a <em>due passi</em></b></span>
        </div>
        <h2 className="snw-tot__tit">Le esperienze più scelte</h2>
        <ol className="snw-tot__lista">
          {top.map((o, i) => <RigaTotem key={o.id} id={o.id} n={i + 1} vai={vai} />)}
        </ol>
        <Porta />
      </div>
    )
  }

  if (versione === 'bento') {
    return (
      <div className="snw-tot__pag">
        <div className="snw-tot__mosaico">
          <section className="snw-tot__benv snw-tot__mos-hero">
            <SnwFoto id={FOTO.colosseoArchi} w={1200} h={600} alt="" />
            <span><small>Cosa facciamo oggi?</small><b>Roma è a due passi</b></span>
          </section>
          {CATEGORIE.map((c, i) => (
            <button key={c.id} type="button" className={`snw-tot__tile snw-tot__tile--${i + 1}`} onClick={() => vai({ n: 'cat', cat: c.id })}>
              <i className={`fa-thin ${c.icona}`} aria-hidden="true" />
              <b>{c.nome}</b>
              <small>{OFFERTE.filter(o => o.cat === c.id).length} proposte</small>
            </button>
          ))}
          <button type="button" className="snw-tot__tile snw-tot__tile--hotel" onClick={() => vai({ n: 'struttura' })}>
            <SnwFoto id={STRUTTURA_OSPITE.foto[0]} w={900} h={400} alt="" />
            <span><i className="fa-thin fa-hotel" aria-hidden="true" /><b>{STRUTTURA_OSPITE.nome}</b><small>Servizi dell'hotel e reception</small></span>
          </button>
        </div>
        <h2 className="snw-tot__tit">Le esperienze più scelte</h2>
        <div className="snw-tot__griglia">
          {top.map(o => <CardTotem key={o.id} id={o.id} vai={vai} />)}
        </div>
        <Porta />
      </div>
    )
  }

  return (
    <div className="snw-tot__pag">
      <section className="snw-tot__benv snw-tot__benv--hero">
        <SnwFoto id={FOTO.colosseoArchi} w={1200} h={900} alt="" />
        <span>
          <small>Cosa facciamo oggi?</small>
          <b>Roma è a due passi</b>
        </span>
      </section>
      <Anelli vai={vai} />
      <h2 className="snw-tot__tit">Le esperienze più scelte</h2>
      <div className="snw-tot__carosello">
        {top.map(o => <CardTotem key={o.id} id={o.id} vai={vai} foto />)}
      </div>
      <Porta />
    </div>
  )
}

function CardTotem({ id, vai, foto }: { id: string; vai: (v: Vista) => void; foto?: boolean }) {
  const o = trova(id)!
  return (
    <button type="button" className={foto ? 'snw-tot__card snw-tot__card--foto' : 'snw-tot__card'} onClick={() => vai({ n: 'scheda', id })}>
      <span className="snw-tot__card-foto"><SnwFoto id={o.foto[0]} w={700} h={foto ? 900 : 500} alt="" /></span>
      <span className="snw-tot__card-txt">
        <small>{o.citta}</small>
        <b>{o.titolo}</b>
        <span className="snw-tot__card-piede">
          <span>{o.daPrezzo && 'da '}<b>{eur(o.prezzo)}</b></span>
          <SnwVoto o={o} compatto />
        </span>
        <span className="snw-tot__card-cta"><i className="fa-solid fa-cart-shopping" aria-hidden="true" /> {o.cat === 'prodotti' ? 'Acquista' : 'Prenota'}</span>
      </span>
    </button>
  )
}

function RigaTotem({ id, n, vai }: { id: string; n: number; vai: (v: Vista) => void }) {
  const o = trova(id)!
  return (
    <li>
      <button type="button" className="snw-tot__riga-ed" onClick={() => vai({ n: 'scheda', id })}>
        <span className="snw-tot__riga-num">{String(n).padStart(2, '0')}</span>
        <span className="snw-tot__riga-corpo">
          <small>{o.citta} · {o.formula}</small>
          <b>{o.titolo}</b>
          <span>{o.daPrezzo && 'da '}<b>{eur(o.prezzo)}</b> <SnwVoto o={o} compatto /></span>
        </span>
        <span className="snw-tot__riga-img"><SnwFoto id={o.foto[0]} w={400} h={400} alt="" /></span>
      </button>
    </li>
  )
}

function Elenco({ cat, vai, versione }: { cat: Categoria } & PropsPag) {
  const info = CATEGORIE.find(c => c.id === cat)!
  const lista = OFFERTE.filter(o => o.cat === cat)
  return (
    <div className="snw-tot__pag">
      <header className="snw-tot__pag-head">
        <span className="snw-tot__anello snw-tot__anello--piccolo"><i className={`fa-thin ${info.icona}`} aria-hidden="true" /></span>
        <span><h1>{info.nome}</h1><small>{info.claim} · {lista.length} proposte</small></span>
      </header>
      {versione === 'editoriale' ? (
        <ol className="snw-tot__lista">
          {lista.map((o, i) => <RigaTotem key={o.id} id={o.id} n={i + 1} vai={vai} />)}
        </ol>
      ) : (
        <div className="snw-tot__griglia">
          {lista.map(o => <CardTotem key={o.id} id={o.id} vai={vai} foto={versione === 'impatto'} />)}
        </div>
      )}
    </div>
  )
}

// ── La struttura che ospita il totem ─────────────────────────────────────
function Struttura() {
  const s = STRUTTURA_OSPITE
  return (
    <div className="snw-tot__pag">
      <section className="snw-tot__benv snw-tot__benv--alto">
        <SnwFoto id={s.foto[0]} w={1200} h={800} alt="" />
        <span>
          <small>{'★'.repeat(s.stelle)} · {s.indirizzo}</small>
          <b>{s.nome}</b>
        </span>
      </section>
      <h2 className="snw-tot__tit">I servizi dell'hotel</h2>
      <div className="snw-tot__servizi">
        {s.servizi.map(x => (
          <div key={x.nome}>
            <i className={`fa-light ${x.icona}`} aria-hidden="true" />
            <b>{x.nome}</b>
            <span>{x.info}</span>
          </div>
        ))}
      </div>
      <div className="snw-tot__reception">
        <i className="fa-light fa-phone-volume" aria-hidden="true" />
        <span><b>Serve aiuto?</b>Dal telefono della camera premi <b>{s.telefonoReception}</b>: la reception risponde 24 ore su 24.</span>
      </div>
    </div>
  )
}

// ── Scheda ───────────────────────────────────────────────────────────────
function Scheda({ id, onAggiunto }: { id: string; onAggiunto: () => void }) {
  const o = trova(id)!
  const aggiungi = useSitoStore(s => s.aggiungi)
  const sogg = o.cat === 'soggiorni'
  const prodotto = o.cat === 'prodotti'
  const [g, setG] = useState(sogg ? 0 : 1)
  const [notti, setNotti] = useState(2)
  const [orario, setOrario] = useState(o.orari?.[0])
  const [qta, setQta] = useState(o.unita === 'a persona' ? 2 : 1)
  const data = oggiIso(g)
  const riga = rigaDa(o, { qta, data: prodotto ? undefined : data, dataFine: sogg ? oggiIso(g + notti) : undefined, orario: sogg || prodotto ? undefined : orario })
  const etichetta = sogg ? 'Camere' : prodotto ? 'Quantità' : o.unita === 'a persona' ? 'Persone' : 'Quantità'

  return (
    <div className="snw-tot__pag snw-tot__scheda">
      <div className="snw-tot__sch-foto"><SnwFoto id={o.foto[0]} w={1200} h={800} alt={o.titolo} /></div>
      <h1>{o.titolo}</h1>
      <span className="snw-tot__sch-meta"><SnwVoto o={o} /> · {o.formula}</span>
      <p>{o.descrizione}</p>
      <ul className="snw-tot__incl">{o.include.map(x => <li key={x}><i className="fa-solid fa-check" aria-hidden="true" />{x}</li>)}</ul>

      {!prodotto && (
        <section className="snw-tot__scelta">
          <h3>{sogg ? 'Arrivo' : 'Quando'}</h3>
          <div className="snw-tot__giorni">
            {[0, 1, 2, 3, 4, 5].map(n => {
              const d = giorno(n)
              return (
                <button key={n} type="button" className={g === n ? 'snw-tot__giorno snw-tot__giorno--on' : 'snw-tot__giorno'} onClick={() => setG(n)}>
                  <small>{d.nome}</small><b>{d.num}</b>
                </button>
              )
            })}
          </div>
        </section>
      )}
      {!sogg && !prodotto && o.orari && (
        <section className="snw-tot__scelta">
          <h3>Orario</h3>
          <div className="snw-tot__orari">
            {o.orari.map(h => (
              <button key={h} type="button" className={orario === h ? 'snw-tot__ora snw-tot__ora--on' : 'snw-tot__ora'} onClick={() => setOrario(h)}>{h}</button>
            ))}
          </div>
        </section>
      )}
      <section className="snw-tot__scelta snw-tot__scelta--riga">
        {sogg && <span><h3>Notti</h3><SnwStepper grande valore={notti} onChange={setNotti} max={14} etichetta="notti" /></span>}
        <span><h3>{etichetta}</h3><SnwStepper grande valore={qta} onChange={setQta} max={prodotto ? 20 : 10} etichetta={etichetta.toLowerCase()} /></span>
      </section>

      <div className="snw-tot__totale">
        <span><small>{riga.dettaglio}</small><b>{eur(riga.prezzo * qta)}</b></span>
        <button type="button" className="snw-tot__btn" onClick={() => { aggiungi(riga); useSitoStore.getState().setDrawer(false); onAggiunto() }}>
          <i className="fa-solid fa-cart-plus" aria-hidden="true" /> Aggiungi
        </button>
      </div>
    </div>
  )
}

// ── Carrello e pagamento ─────────────────────────────────────────────────
function Carrello({ vai }: { vai: (v: Vista) => void }) {
  const carrello = useSitoStore(s => s.carrello)
  const setQta = useSitoStore(s => s.qta)
  const rimuovi = useSitoStore(s => s.rimuovi)
  const svuota = useSitoStore(s => s.svuota)
  const confirm = useConfirmStore(s => s.confirm)
  const [modo, setModo] = useState<'scegli' | 'telefono' | 'camera'>('scegli')
  const [qr, setQr] = useState('')
  const [camera, setCamera] = useState('')
  const [cognome, setCognome] = useState('')
  const totale = carrello.reduce((a, r) => a + r.prezzo * r.qta, 0)
  const ordine = useRef(`TT-${Math.floor(Math.random() * 900000) + 100000}`).current

  useEffect(() => {
    if (modo !== 'telefono') return
    QRCode.toDataURL(`https://www.sibyllanetwork.com/checkout/${ordine}`, { margin: 1, width: 520, color: { dark: '#111111', light: '#ffffff' } })
      .then(setQr).catch(() => setQr(''))
  }, [modo, ordine])

  const chiudiOrdine = (come: 'telefono' | 'camera') => { svuota(); vai({ n: 'pagato', come, ordine }) }

  if (!carrello.length) {
    return (
      <div className="snw-tot__pag snw-tot__vuoto">
        <i className="fa-thin fa-cart-shopping" aria-hidden="true" />
        <b>Il carrello è vuoto</b>
        <button type="button" className="snw-tot__btn" onClick={() => vai({ n: 'home' })}>Scopri le proposte</button>
      </div>
    )
  }

  return (
    <div className="snw-tot__pag">
      <h1 className="snw-tot__tit">Il tuo carrello</h1>
      <ul className="snw-tot__righe">
        {carrello.map(r => {
          const o = trova(r.id)
          if (!o) return null
          return (
            <li key={r.key}>
              <span className="snw-tot__riga-foto"><SnwFoto id={o.foto[0]} w={300} h={300} alt="" /></span>
              <span className="snw-tot__riga-txt"><b>{o.titolo}</b><small>{r.dettaglio}</small><b>{eur(r.prezzo * r.qta)}</b></span>
              <span className="snw-tot__riga-az">
                <SnwStepper valore={r.qta} onChange={v => setQta(r.key, v)} etichetta="quantità" grande />
                <button type="button" aria-label={`Rimuovi ${o.titolo}`}
                  onClick={async () => { if (await confirm({ title: 'Rimuovere dal carrello?', message: `«${o.titolo}» verrà tolto dal carrello.`, confirmLabel: 'Rimuovi' })) rimuovi(r.key) }}>
                  <i className="fa-light fa-trash-can" />
                </button>
              </span>
            </li>
          )
        })}
      </ul>
      <div className="snw-tot__somma"><span>Totale</span><b>{eur(totale)}</b></div>

      {modo === 'scegli' && (
        <>
          <h2 className="snw-tot__tit">Come vuoi pagare?</h2>
          <div className="snw-tot__pagamenti">
            <button type="button" onClick={() => setModo('telefono')}>
              <i className="fa-light fa-qrcode" aria-hidden="true" />
              <b>Con il tuo telefono</b>
              <span>Inquadra il QR code e paga con carta, Apple Pay o Google Pay</span>
            </button>
            <button type="button" onClick={() => setModo('camera')}>
              <i className="fa-light fa-door-closed" aria-hidden="true" />
              <b>Addebito in camera</b>
              <span>Lo trovi sul conto al check-out di {STRUTTURA_OSPITE.nome}</span>
            </button>
          </div>
        </>
      )}

      {modo === 'telefono' && (
        <section className="snw-tot__qr">
          {qr ? <img src={qr} alt="QR code per completare il pagamento sul telefono" /> : <i className="fa-light fa-qrcode" aria-hidden="true" />}
          <span>
            <b>Inquadra con la fotocamera</b>
            Si apre la pagina di pagamento sicuro con il tuo carrello (ordine {ordine}). Puoi allontanarti dal totem.
          </span>
          <button type="button" className="snw-tot__btn" onClick={() => chiudiOrdine('telefono')}>Ho pagato sul telefono</button>
          <button type="button" className="snw-tot__btn snw-tot__btn--sec" onClick={() => setModo('scegli')}>Cambia metodo</button>
        </section>
      )}

      {modo === 'camera' && (
        <form className="snw-tot__camera" onSubmit={e => { e.preventDefault(); if (camera && cognome) chiudiOrdine('camera') }}>
          <label>Numero di camera
            <input type="number" inputMode="numeric" value={camera} onChange={e => setCamera(e.target.value)} placeholder="Es. 214" />
          </label>
          <label>Cognome dell'intestatario
            <input type="text" value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Come al check-in" />
          </label>
          <button type="submit" className="snw-tot__btn" disabled={!camera || !cognome}>Conferma l'addebito</button>
          <button type="button" className="snw-tot__btn snw-tot__btn--sec" onClick={() => setModo('scegli')}>Cambia metodo</button>
        </form>
      )}
    </div>
  )
}

function Pagato({ come, ordine, onFine }: { come: 'telefono' | 'camera'; ordine: string; onFine: () => void }) {
  const [s, setS] = useState(20)
  useEffect(() => {
    const t = window.setInterval(() => setS(x => x - 1), 1000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { if (s <= 0) onFine() }, [s, onFine])
  return (
    <div className="snw-tot__pag snw-tot__vuoto">
      <i className="fa-thin fa-circle-check" aria-hidden="true" />
      <b>Fatto, buon divertimento!</b>
      <span>Ordine {ordine}. {come === 'camera' ? "L'importo è stato addebitato sul conto della camera." : 'La conferma e i voucher arrivano sul tuo telefono.'}</span>
      <button type="button" className="snw-tot__btn" onClick={onFine}>Fine ({s})</button>
    </div>
  )
}
