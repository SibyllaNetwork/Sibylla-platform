import React, { useEffect, useRef, useState } from 'react'
import Tooltip from '../../core/components/Tooltip'
import { CATEGORIE, eur, trova } from '../sitoData'
import { VersioneHome, useSitoStore } from '../useSitoStore'
import { SnwFoto, SnwLogo } from '../SnwUi'
import SnwHome from './SnwHome'
import SnwHomeEditoriale from './SnwHomeEditoriale'
import SnwHomeBento from './SnwHomeBento'
import SnwCatalogo from './SnwCatalogo'
import SnwScheda from './SnwScheda'
import SnwCarrello from './SnwCarrello'
import SnwRete from './SnwRete'
import './SnwWeb.sass'

/**
 * Sito web Sibylla Network: barra istituzionale, header con categorie,
 * preferiti e carrello, pagina corrente, mini-carrello laterale e footer.
 * Router a stato (useSitoStore.pagina), come il resto della piattaforma.
 */
const VERSIONI: { id: VersioneHome; lettera: string; nome: string }[] = [
  { id: 'impatto', lettera: 'A', nome: 'Impatto' },
  { id: 'editoriale', lettera: 'B', nome: 'Editoriale' },
  { id: 'bento', lettera: 'C', nome: 'Mosaico' },
]

export default function SnwWeb() {
  const pagina = useSitoStore(s => s.pagina)
  const vai = useSitoStore(s => s.vai)
  const chiudi = useSitoStore(s => s.chiudi)
  const carrello = useSitoStore(s => s.carrello)
  const preferiti = useSitoStore(s => s.preferiti)
  const drawer = useSitoStore(s => s.drawer)
  const setDrawer = useSitoStore(s => s.setDrawer)
  const versione = useSitoStore(s => s.versione)
  const setVersione = useSitoStore(s => s.setVersione)
  const scroller = useRef<HTMLDivElement>(null)
  const [inCima, setInCima] = useState(true)
  const pezzi = carrello.reduce((a, r) => a + r.qta, 0)
  const totale = carrello.reduce((a, r) => a + r.prezzo * r.qta, 0)

  // Ogni cambio pagina riparte dall'alto
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); setInCima(true) }, [pagina, versione])

  // Sezioni che entrano allo scroll: .snw-reveal → .snw-reveal--in
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const io = new IntersectionObserver(voci => voci.forEach(v => {
      if (v.isIntersecting) { v.target.classList.add('snw-reveal--in'); io.unobserve(v.target) }
    }), { root, threshold: 0.12 })
    root.querySelectorAll('.snw-reveal:not(.snw-reveal--in)').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [pagina, versione])

  // Header trasparente sopra l'hero della versione Impatto
  const sopraHero = pagina.nome === 'home' && versione === 'impatto' && inCima

  const catAttiva = pagina.nome === 'catalogo' ? pagina.cat : pagina.nome === 'scheda' ? trova(pagina.id)?.cat : undefined

  return (
    <div className={`snw snw--${versione}`} data-section="sito" ref={scroller} onScroll={e => setInCima(e.currentTarget.scrollTop < 40)}>
      <div className="snw__strip">
        <div className="snw__wrap snw__strip-in">
          <span className="snw__versioni" role="tablist" aria-label="Versione della home">
            <span>Versione</span>
            {VERSIONI.map(v => (
              <button key={v.id} type="button" role="tab" aria-selected={versione === v.id}
                className={versione === v.id ? 'snw__versione snw__versione--on' : 'snw__versione'} onClick={() => setVersione(v.id)}>
                <b>{v.lettera}</b>{v.nome}
              </button>
            ))}
          </span>
          <span className="snw__strip-dx">
            <a href="tel:00390691714070"><i className="fa-solid fa-phone" aria-hidden="true" /> +39 06 91714070</a>
            <button type="button" onClick={() => vai({ nome: 'rete', ancora: 'contatti' })}>
              <i className="fa-solid fa-handshake" aria-hidden="true" /> Diventa partner
            </button>
            <button type="button" onClick={() => useSitoStore.getState().setModo('totem')}>
              <i className="fa-solid fa-tablet-screen" aria-hidden="true" /> Totem
            </button>
            <button type="button" onClick={chiudi}>
              <i className="fa-solid fa-right-to-bracket" aria-hidden="true" /> Area riservata
            </button>
          </span>
        </div>
      </div>

      <header className={`snw__head ${sopraHero ? 'snw__head--sopra' : ''}`}>
        <div className="snw__wrap snw__head-in">
          <button type="button" className="snw__brand" onClick={() => vai({ nome: 'home' })} aria-label="Sibylla Network, home">
            <SnwLogo chiaro={sopraHero} />
          </button>
          <nav className="snw__nav" aria-label="Categorie">
            {CATEGORIE.map(c => (
              <button key={c.id} type="button" className={`snw__nav-voce ${catAttiva === c.id ? 'snw__nav-voce--on' : ''}`}
                onClick={() => vai({ nome: 'catalogo', cat: c.id })}>
                <i className={`fa-light ${c.icona}`} aria-hidden="true" />{c.nome}
              </button>
            ))}
            <button type="button" className={`snw__nav-voce ${pagina.nome === 'rete' ? 'snw__nav-voce--on' : ''}`} onClick={() => vai({ nome: 'rete' })}>
              <i className="fa-light fa-circle-nodes" aria-hidden="true" />La rete
            </button>
          </nav>
          <div className="snw__azioni">
            <Tooltip text="Preferiti">
              <button type="button" className="snw__ico" aria-label={`Preferiti (${preferiti.length})`} onClick={() => vai({ nome: 'catalogo' })}>
                <i className="fa-regular fa-heart" />
                {preferiti.length > 0 && <span className="snw__conta">{preferiti.length}</span>}
              </button>
            </Tooltip>
            <Tooltip text="Carrello">
              <button type="button" className="snw__ico" aria-label={`Carrello (${pezzi})`} onClick={() => setDrawer(!drawer)}>
                <i className="fa-regular fa-cart-shopping" />
                {pezzi > 0 && <span className="snw__conta">{pezzi}</span>}
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="snw__main">
        {pagina.nome === 'home' && versione === 'impatto' && <SnwHome />}
        {pagina.nome === 'home' && versione === 'editoriale' && <SnwHomeEditoriale />}
        {pagina.nome === 'home' && versione === 'bento' && <SnwHomeBento />}
        {pagina.nome === 'catalogo' && <SnwCatalogo key={`${pagina.cat ?? ''}|${pagina.dove ?? ''}`} cat={pagina.cat} dove={pagina.dove} />}
        {pagina.nome === 'scheda' && <SnwScheda key={pagina.id} id={pagina.id} />}
        {(pagina.nome === 'carrello' || pagina.nome === 'conferma') && <SnwCarrello />}
        {pagina.nome === 'rete' && <SnwRete ancora={pagina.ancora} />}
      </main>

      <footer className="snw__foot">
        <div className="snw__wrap">
          <div className="snw__foot-grid">
            <div className="snw__foot-brand">
              <SnwLogo chiaro />
              <p>Il volto accessibile dell'ecosistema Sibylla: soggiorni, esperienze, prodotti e servizi di una rete di imprese del turismo.</p>
              <span><i className="fa-solid fa-phone" aria-hidden="true" /> +39 06 91714070</span>
              <span><i className="fa-solid fa-envelope" aria-hidden="true" /> info@sibyllanetwork.com</span>
            </div>
            <div>
              <h4>Rete</h4>
              <button type="button" onClick={() => vai({ nome: 'rete', ancora: 'partner' })}>Partner</button>
              <button type="button" onClick={() => vai({ nome: 'rete', ancora: 'imt' })}>Programma di Rete I.M.T.</button>
              <a href="https://www.sibyllaecosystem.it/" target="_blank" rel="noreferrer">sibyllaecosystem.it</a>
            </div>
            <div>
              <h4>Società</h4>
              <button type="button" onClick={() => vai({ nome: 'rete', ancora: 'chi-siamo' })}>Chi siamo</button>
              <button type="button" onClick={() => vai({ nome: 'rete', ancora: 'lavora' })}>Lavora con noi</button>
              <button type="button" onClick={() => vai({ nome: 'rete', ancora: 'contatti' })}>Contattaci</button>
              <button type="button" onClick={() => vai({ nome: 'rete', ancora: 'societa' })}>Dati societari</button>
            </div>
            <div>
              <h4>Seguici</h4>
              <a href="https://www.facebook.com/people/Sibylla/61552356982215/" target="_blank" rel="noreferrer"><i className="fa-brands fa-facebook" aria-hidden="true" /> Facebook</a>
              <a href="https://www.instagram.com/sibylla_official/" target="_blank" rel="noreferrer"><i className="fa-brands fa-instagram" aria-hidden="true" /> Instagram</a>
              <a href="https://www.linkedin.com/company/sibylla-s-r-l/" target="_blank" rel="noreferrer"><i className="fa-brands fa-linkedin" aria-hidden="true" /> LinkedIn</a>
            </div>
            <div>
              <h4>Pagamenti sicuri</h4>
              <span className="snw__pay">
                <i className="fa-brands fa-cc-visa" aria-label="Visa" />
                <i className="fa-brands fa-cc-mastercard" aria-label="Mastercard" />
                <i className="fa-brands fa-cc-amex" aria-label="American Express" />
                <i className="fa-brands fa-cc-paypal" aria-label="PayPal" />
                <i className="fa-brands fa-cc-apple-pay" aria-label="Apple Pay" />
              </span>
              <button type="button">Privacy policy</button>
              <button type="button">Cookie policy</button>
            </div>
          </div>
          <div className="snw__legal">
            © 2026 Sibylla S.r.l. · Via Vicenza 5/A, 00185 Roma · C.F. e P.IVA 15953321005 · REA 1625640 · Capitale sociale 50.000,00 €
          </div>
        </div>
      </footer>

      {/* ── Mini-carrello ───────────────────────────────────────────────── */}
      {drawer && <div className="snw__velo" onClick={() => setDrawer(false)} aria-hidden="true" />}
      <aside className={`snw__drawer ${drawer ? 'snw__drawer--on' : ''}`} aria-label="Carrello" aria-hidden={!drawer}>
        <header>
          <h3><i className="fa-solid fa-cart-shopping" aria-hidden="true" /> Il tuo carrello</h3>
          <button type="button" className="snw__ico" aria-label="Chiudi il carrello" onClick={() => setDrawer(false)}><i className="fa-solid fa-xmark" /></button>
        </header>
        {carrello.length === 0 ? (
          <p className="snw__drawer-vuoto">Il carrello è vuoto. Scegli un soggiorno, un'esperienza o un prodotto della rete.</p>
        ) : (
          <ul className="snw__drawer-righe">
            {carrello.map(r => {
              const o = trova(r.id)
              if (!o) return null
              return (
                <li key={r.key}>
                  <span className="snw__drawer-foto"><SnwFoto id={o.foto[0]} w={160} h={160} alt="" /></span>
                  <span className="snw__drawer-txt">
                    <b>{o.titolo}</b>
                    <small>{r.dettaglio}</small>
                  </span>
                  <b className="snw__drawer-eur">{eur(r.prezzo * r.qta)}</b>
                </li>
              )
            })}
          </ul>
        )}
        <footer>
          <span className="snw__drawer-tot">Totale <b>{eur(totale)}</b></span>
          <button type="button" className="sib-btn sib-btn--primary" disabled={!carrello.length} onClick={() => vai({ nome: 'carrello' })}>
            Vai al carrello <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </button>
        </footer>
      </aside>
    </div>
  )
}
