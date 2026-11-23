import React, { useEffect, useState } from 'react'
import { SelectField } from '../../core/components/form'
import { CATEGORIE, Categoria, FOTO, OFFERTE, eur, trova } from '../sitoData'
import { useSitoStore } from '../useSitoStore'
import { SnwFoto, SnwVoto } from '../SnwUi'
import SnwCard from './SnwCard'
import './SnwHomeBento.sass'

/**
 * Home — versione C «Mosaico» (id interno 'bento'): la home come una griglia di riquadri modulari
 * di misure diverse (hero, ricerca, offerta lampo, categorie colorate, top
 * della rete, destinazione, numeri, human touch, totem), poi una vetrina
 * filtrabile per categoria. Dinamica, molto "app".
 */
const CITTA = Array.from(new Set(OFFERTE.map(o => o.citta)))

function useConto() {
  const calc = () => { const f = new Date(); f.setHours(24, 0, 0, 0); return Math.max(0, f.getTime() - Date.now()) }
  const [ms, setMs] = useState(calc)
  useEffect(() => { const t = window.setInterval(() => setMs(calc()), 1000); return () => clearInterval(t) }, [])
  const s = Math.floor(ms / 1000)
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(n => String(n).padStart(2, '0')).join(':')
}

export default function SnwHomeBento() {
  const vai = useSitoStore(s => s.vai)
  const [dove, setDove] = useState('')
  const [filtro, setFiltro] = useState<Categoria | 'tutto'>('tutto')
  const conto = useConto()
  const lampo = trova('palazzo-esquilino')!
  const top = [...OFFERTE].sort((a, b) => b.voto - a.voto || b.recensioni - a.recensioni).slice(0, 4)
  const vetrina = OFFERTE.filter(o => filtro === 'tutto' || o.cat === filtro).slice(0, 8)
  const media = OFFERTE.reduce((a, o) => a + o.voto, 0) / OFFERTE.length

  return (
    <div className="snw__wrap snw-bento">
      <div className="snw-bento__griglia">
        {/* Hero */}
        <section className="snw-bento__t snw-bento__hero">
          <SnwFoto id={FOTO.vernazza} w={1600} h={1000} alt="" />
          <div className="snw-bento__hero-txt">
            <span className="snw-bento__tag"><i className="fa-solid fa-location-dot" aria-hidden="true" /> Cinque Terre · Liguria</span>
            <h1>Prenota l'Italia<br />in tre tocchi.</h1>
            <div className="snw-bento__hero-cta">
              <button type="button" className="snw-bento__btn" onClick={() => vai({ nome: 'catalogo' })}>Inizia a esplorare <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
              <span><b>{OFFERTE.length}</b> offerte · <b>{CITTA.length}</b> destinazioni</span>
            </div>
          </div>
        </section>

        {/* Ricerca */}
        <form className="snw-bento__t snw-bento__cerca" onSubmit={e => { e.preventDefault(); vai({ nome: 'catalogo', dove: dove || undefined }) }}>
          <span className="snw-bento__t-tit"><i className="fa-solid fa-magnifying-glass" aria-hidden="true" /> Dove vuoi andare?</span>
          <SelectField name="dove-bento" label="Destinazione" value={dove} onChange={e => setDove(e.target.value)}
            options={[{ value: '', label: 'Ovunque in Italia' }, ...CITTA.map(c => ({ value: c, label: c }))]} />
          <button type="submit" className="sib-btn sib-btn--primary">Cerca</button>
        </form>

        {/* Offerta lampo */}
        <button type="button" className="snw-bento__t snw-bento__lampo" onClick={() => vai({ nome: 'scheda', id: lampo.id })}>
          <span className="snw-bento__t-tit"><i className="fa-solid fa-bolt" aria-hidden="true" /> Offerta lampo</span>
          <b className="snw-bento__conto">{conto}</b>
          <span>{lampo.titolo} · <s>{eur(lampo.prezzoPieno!)}</s> <b>{eur(lampo.prezzo)}</b> a notte</span>
        </button>

        {/* Categorie */}
        {CATEGORIE.map((c, i) => (
          <button key={c.id} type="button" className={`snw-bento__t snw-bento__cat snw-bento__cat--${i}`} onClick={() => vai({ nome: 'catalogo', cat: c.id })}>
            <i className={`fa-light ${c.icona}`} aria-hidden="true" />
            <b>{c.nome}</b>
            <small>{OFFERTE.filter(o => o.cat === c.id).length} offerte</small>
            <i className="fa-solid fa-arrow-up-right snw-bento__freccia" aria-hidden="true" />
          </button>
        ))}

        {/* Top della rete */}
        <section className="snw-bento__t snw-bento__top">
          <span className="snw-bento__t-tit"><i className="fa-solid fa-trophy" aria-hidden="true" /> I più amati</span>
          <ol>
            {top.map((o, i) => (
              <li key={o.id}>
                <button type="button" onClick={() => vai({ nome: 'scheda', id: o.id })}>
                  <span className="snw-bento__pos">{i + 1}</span>
                  <span className="snw-bento__mini"><SnwFoto id={o.foto[0]} w={160} h={160} alt="" /></span>
                  <span className="snw-bento__top-txt"><b>{o.titolo}</b><SnwVoto o={o} compatto /></span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        {/* Destinazione */}
        <button type="button" className="snw-bento__t snw-bento__dest" onClick={() => vai({ nome: 'destinazione', citta: 'Venezia' })}>
          <SnwFoto id={FOTO.rialto} w={900} h={1000} alt="" />
          <span className="snw-bento__dest-txt"><small>Destinazione del mese</small><b>Venezia</b></span>
        </button>

        {/* Numeri */}
        <div className="snw-bento__t snw-bento__voto">
          <b>{media.toLocaleString('it-IT', { maximumFractionDigits: 1 })}</b>
          <span><i className="fa-solid fa-star" aria-hidden="true" /> voto medio della rete</span>
        </div>

        {/* Human touch */}
        <a className="snw-bento__t snw-bento__human" href="tel:00390691714070">
          <i className="fa-light fa-headset" aria-hidden="true" />
          <span><b>Persone vere</b>Il booking risponde 7 giorni su 7</span>
        </a>

        {/* Totem */}
        <section className="snw-bento__t snw-bento__totem">
          <span className="snw-bento__t-tit"><i className="fa-solid fa-tablet-screen" aria-hidden="true" /> Anche in hotel</span>
          <p>Trovi Sibylla Network sui totem delle strutture della rete: prenoti e paghi dal tuo telefono o addebiti in camera.</p>
          <button type="button" className="snw-bento__link" onClick={() => useSitoStore.getState().setModo('totem')}>
            Prova il totem <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </button>
        </section>
      </div>

      {/* ── Vetrina filtrabile ───────────────────────────────────────── */}
      <section className="snw-bento__vetrina snw-reveal">
        <header>
          <h2>Scelti per te</h2>
          <div className="snw-bento__filtri" role="tablist" aria-label="Filtra per categoria">
            {[{ id: 'tutto' as const, nome: 'Tutto' }, ...CATEGORIE].map(c => (
              <button key={c.id} type="button" role="tab" aria-selected={filtro === c.id}
                className={filtro === c.id ? 'snw-bento__f snw-bento__f--on' : 'snw-bento__f'} onClick={() => setFiltro(c.id)}>{c.nome}</button>
            ))}
          </div>
        </header>
        <div className="snw-bento__cards" key={filtro}>
          {vetrina.map(o => <SnwCard key={o.id} o={o} />)}
        </div>
      </section>
    </div>
  )
}
