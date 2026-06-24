import React, { useEffect, useRef, useState } from 'react'
import T from '../../../core/tokens'
import Ico from '../../../core/icons/Ico'
import { useAccessStore } from '../../../store/useAccessStore'
import { useSectionThemeStore, SECTION_COLORS } from '../../../store/useSectionThemeStore'
import './GiornaleImpresaPeek.sass'

interface Props { navigate: (p: string) => void }

const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']
const WDAYS  = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']

// La linguetta è un'anteprima del Giornale impresa: come la pagina, mostra
// contenuti propri ai Tour Operator (modulo `tour-operator`) e versione standard
// agli altri moduli. Dati sintetici curati, specchio della pagina.
type PeekVariant = 'hotel' | 'to'
interface PeekData {
  location: string
  headline: { val: string; sub: string }
  numeri: { icon: string; label: string; val: string; delta: string; pos: boolean }[]
  feature: { cat: string; fonte: string; tempo: string; img: string; titolo: string; testo: string }
  eventiTitle: string
  eventi: { data: string; mese: string; titolo: string; luogo: string }[]
  vipTitle: string
  vip: { nome: string; nota: string }[]
  meteo: { city: string; temp: string; desc: string }
}

const PEEK_DATA: Record<PeekVariant, PeekData> = {
  hotel: {
    location: 'Hotel Noto',
    headline: { val: '85%', sub: 'occ.' },
    numeri: [
      { icon: 'bed',         label: 'Arrivi',         val: '18',      delta: '+6',    pos: true },
      { icon: 'arrow-right', label: 'Partenze',       val: '14',      delta: '+5',    pos: true },
      { icon: 'gauge',       label: 'Occupazione',    val: '85%',     delta: '+14pt', pos: true },
      { icon: 'dollar',      label: 'Av. Daily Rate', val: '131 €',   delta: '+6%',   pos: true },
      { icon: 'trend-up',    label: 'Revenue',        val: '5.380 €', delta: '+27%',  pos: true },
    ],
    feature: {
      cat: 'Economia', fonte: 'Il Sole 24 Ore', tempo: '2h',
      img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=70&auto=format&fit=crop',
      titolo: 'Turismo, presenze in crescita del 6% nel trimestre',
      testo: 'Il comparto ricettivo italiano chiude il trimestre con un incremento delle presenze trainato dal turismo internazionale e dall\'allungamento della stagione nelle località costiere.',
    },
    eventiTitle: 'Meteo & Eventi',
    eventi: [
      { data: '18', mese: 'GIU', titolo: 'Festival del Gusto Mediterraneo', luogo: 'Ostia · Lungomare' },
      { data: '24', mese: 'GIU', titolo: 'Notte Bianca dei Musei',           luogo: 'Roma · Centro storico' },
    ],
    vipTitle: 'Ospiti speciali',
    vip: [
      { nome: 'Famiglia Conti',   nota: 'Suite Belvedere · check-in 15:00' },
      { nome: 'Dott. M. Ferrara', nota: 'Late check-out · allergie segnalate' },
    ],
    meteo: { city: 'Milano', temp: '19°', desc: 'Velature sparse' },
  },
  to: {
    location: 'Sede centrale',
    headline: { val: '44%', sub: 'conv.' },
    numeri: [
      { icon: 'bar',         label: 'Pratiche aperte', val: '27',       delta: '+5',   pos: true },
      { icon: 'arrow-right', label: 'Preventivi',      val: '19',       delta: '+5',   pos: true },
      { icon: 'gauge',       label: 'Conversione',     val: '44%',      delta: '+6pt', pos: true },
      { icon: 'dollar',      label: 'Ticket medio',    val: '1.320 €',  delta: '+12%', pos: true },
      { icon: 'trend-up',    label: 'Fatturato',       val: '24.900 €', delta: '+35%', pos: true },
    ],
    feature: {
      cat: 'Mercato', fonte: 'TTG Italia', tempo: '3h',
      img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=70&auto=format&fit=crop',
      titolo: 'Mar Rosso e Maldive trainano le vendite del lungo raggio',
      testo: 'I tour operator italiani registrano un\'estate record sul lungo raggio: cresce l\'advance booking e aumenta il ticket medio dei pacchetti combinati volo + soggiorno.',
    },
    eventiTitle: 'Fiere & eventi',
    eventi: [
      { data: '12', mese: 'FEB', titolo: 'BIT — Borsa Internazionale del Turismo', luogo: 'Milano · Allianz MiCo' },
      { data: '09', mese: 'OTT', titolo: 'TTG Travel Experience',                  luogo: 'Rimini · Expo Centre' },
    ],
    vipTitle: 'Clienti VIP',
    vip: [
      { nome: 'Welcome Travel Group', nota: 'Top partner · 142 pratiche YTD' },
      { nome: 'Dott. M. Ferrara',     nota: 'Cliente luxury · proposta Giappone' },
    ],
    meteo: { city: 'Sharm el Sheikh', temp: '29°', desc: 'Sereno' },
  },
}

export default function GiornaleImpresaPeek({ navigate }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Variante per modulo + tema verde (solo in modalità dissociata, come la pagina).
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const assist           = useAccessStore(s => s.assist)
  const profiles         = useAccessStore(s => s.profiles)
  const dissociato       = useSectionThemeStore(s => s.dissociato)
  const moduli = assist ? assist.moduli : (currentProfileId ? profiles.find(p => p.id === currentProfileId)?.moduli : undefined)
  const isTO = !!moduli?.includes('tour-operator')
  const variant: PeekVariant = isTO ? 'to' : 'hotel'
  const D = PEEK_DATA[variant]
  const NUMERI = D.numeri
  const OCC = D.headline
  const FEATURE = D.feature
  const EVENTI = D.eventi
  const VIP = D.vip
  // In dissociata i TO usano il verde Tableau (accento + gradienti); altrimenti blu.
  const greenTheme = dissociato && isTO
  const accent = greenTheme ? SECTION_COLORS.tableau : T.primary
  const themeStyle = greenTheme
    ? ({ ['--color-primary' as string]: SECTION_COLORS.tableau, ['--gip-grad' as string]: 'linear-gradient(120deg, #2f8268 0%, #206953 55%, #184f3c 100%)' } as React.CSSProperties)
    : undefined

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const today = new Date()
  const dataStr = `${WDAYS[today.getDay()]} ${today.getDate()} ${MONTHS[today.getMonth()]}`

  const openFull = () => { setOpen(false); navigate('giornale-impresa') }

  return (
    <div className={`gip ${open ? 'is-open' : ''}`} ref={rootRef} style={themeStyle}>
      {/* Backdrop (solo quando aperto) */}
      <div className="gip__backdrop" onClick={() => setOpen(false)} aria-hidden="true" />

      {/* Linguetta (allineata a destra, stile "ribbon") */}
      <button
        type="button"
        className="gip__tab"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={`Apri l'anteprima del Giornale impresa · occupazione ${OCC.val}`}
      >
        <span className="gip__tab-orb">
          <Ico n="gauge" s={16} c="#fff" />
        </span>
        <span className="gip__tab-meta">
          <span className="gip__tab-eyebrow"><span className="gip__tab-livedot" />Giornale impresa</span>
          <span className="gip__tab-num">
            {OCC.val}
            <span className="gip__tab-num-sub"><Ico n="trend-up" s={9} c={T.success} />{OCC.sub}</span>
          </span>
        </span>
      </button>

      {/* Pannello anteprima */}
      <div className="gip__panel" role="dialog" aria-label="Anteprima Giornale impresa">
        {/* Header */}
        <div className="gip__head">
          <span className="gip__head-deco" aria-hidden="true" />
          <div className="gip__head-main">
            <div className="gip__head-titlewrap">
              <Ico n="gauge" s={18} c="#fff" />
              <h2 className="gip__head-title">Giornale impresa</h2>
              <span className="gip__live"><span className="gip__live-dot" />LIVE</span>
            </div>
            <div className="gip__head-date">{dataStr} · {D.location}</div>
          </div>
          <div className="gip__head-actions">
            <button type="button" className="gip__open-btn" onClick={openFull}>
              Apri <Ico n="arrow-right" s={13} c="currentColor" />
            </button>
            <button type="button" className="gip__close" onClick={() => setOpen(false)} aria-label="Chiudi">
              <Ico n="x" s={16} c="#cfe0f0" />
            </button>
          </div>
        </div>

        {/* Body scrollabile */}
        <div className="gip__body">
          {/* I numeri di oggi */}
          <section className="gip__sec gip__sec--d1">
            <header className="gip__sec-head">
              <span className="gip__sec-title"><Ico n="bar" s={13} c={accent} /> I numeri di oggi</span>
              <span className="gip__sdly">vs S.D.L.Y.</span>
            </header>
            <div className="gip__kpis">
              {NUMERI.map((k, i) => (
                <div key={i} className="gip__kpi">
                  <span className="gip__kpi-ico"><Ico n={k.icon} s={15} c={accent} /></span>
                  <span className="gip__kpi-val">{k.val}</span>
                  <span className="gip__kpi-label">{k.label}</span>
                  <span className={`gip__kpi-delta ${k.pos ? 'is-pos' : 'is-neg'}`}>
                    <Ico n={k.pos ? 'trend-up' : 'trend-down'} s={10} c="currentColor" />{k.delta}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="gip__cols">
            {/* Notizie dal mondo */}
            <section className="gip__sec gip__sec--d2 gip__news">
              <header className="gip__sec-head">
                <span className="gip__sec-title"><Ico n="globe" s={13} c={accent} /> Notizie dal mondo</span>
              </header>
              <article className="gip__feature" onClick={openFull}>
                <div className="gip__feature-media" style={{ '--img': `url(${FEATURE.img})` } as React.CSSProperties}>
                  <span className="gip__feature-cat">{FEATURE.cat}</span>
                </div>
                <div className="gip__feature-body">
                  <h3 className="gip__feature-title">{FEATURE.titolo}</h3>
                  <p className="gip__feature-text">{FEATURE.testo}</p>
                  <div className="gip__feature-meta">{FEATURE.fonte} · {FEATURE.tempo} fa</div>
                </div>
              </article>
            </section>

            {/* Colonna destra: Meteo & Eventi + Ospiti */}
            <div className="gip__col-right">
              <section className="gip__sec gip__sec--d3 gip__card">
                <header className="gip__sec-head">
                  <span className="gip__sec-title"><Ico n="cloud-sun" s={13} c={accent} /> {D.eventiTitle}</span>
                </header>
                <div className="gip__meteo">
                  <i className="fa-duotone fa-cloud-sun gip__meteo-icon" aria-hidden="true" />
                  <div className="gip__meteo-temp">{D.meteo.temp}</div>
                  <div className="gip__meteo-meta">
                    <span className="gip__meteo-city">{D.meteo.city}</span>
                    <span className="gip__meteo-desc">{D.meteo.desc}</span>
                  </div>
                </div>
                <div className="gip__events">
                  {EVENTI.map((ev, i) => (
                    <div key={i} className="gip__event">
                      <span className="gip__event-date"><strong>{ev.data}</strong>{ev.mese}</span>
                      <div className="gip__event-body">
                        <div className="gip__event-title">{ev.titolo}</div>
                        <div className="gip__event-loc">{ev.luogo}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="gip__sec gip__sec--d4 gip__card">
                <header className="gip__sec-head">
                  <span className="gip__sec-title"><Ico n="star" s={13} c={accent} /> {D.vipTitle}</span>
                </header>
                <div className="gip__vips">
                  {VIP.map((v, i) => (
                    <div key={i} className="gip__vip">
                      <span className="gip__vip-avatar">{v.nome.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
                      <div className="gip__vip-body">
                        <div className="gip__vip-name">{v.nome}</div>
                        <div className="gip__vip-note">{v.nota}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* Almanacco */}
          <section className="gip__sec gip__sec--d5 gip__alm">
            <Ico n="calendar" s={15} c={T.accent} />
            <p className="gip__alm-quote">
              «L'unica persona che sei destinato a essere è la persona che decidi di essere.»
              <span className="gip__alm-author">Ralph Waldo Emerson</span>
            </p>
          </section>

          {/* Footer CTA */}
          <button type="button" className="gip__cta" onClick={openFull}>
            Scopri di più nel Giornale impresa <Ico n="arrow-right" s={13} c="currentColor" />
          </button>
        </div>
      </div>
    </div>
  )
}
