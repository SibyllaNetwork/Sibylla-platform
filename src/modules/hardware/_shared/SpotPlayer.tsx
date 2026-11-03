import React, { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import QRCode from 'qrcode'
import type { AnimFx, Elemento, Inserzione, Progetto, Slide, FormatoSpot } from '../../../store/useTotemStore'
import { eurT, meteoMock, prezzoDelGiorno, durataProgetto } from '../../../store/useTotemStore'
import './SpotPlayer.sass'

/**
 * Riproduce uno spot (progetto dell'Editor palinsesti) in verticale 9:16 o orizzontale 16:9.
 * Posizioni in % e corpi riferiti a una slide larga 360 px (640 in orizzontale): tutto
 * scala con il contenitore (container query units), quindi lo spot si vede uguale nella
 * miniatura, nel totem e nell'editor. I valori runtime passano come CSS custom property.
 *
 * Il tempo guida le animazioni: con `t` (secondi dall'inizio della slide) ogni elemento
 * entra a `inizio`, esce a `fine` e il suo avanzamento d'ingresso/uscita è `--p` (0→1),
 * che il .sass traduce in opacità, spostamento o scala secondo l'animazione scelta.
 * Senza `t` (miniature) la slide si vede completa e ferma.
 */

export interface ContestoSpot {
  /** Città del totem: la usa il widget meteo. */
  citta?: string
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
const easeBack = (x: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

export const durIngressoDi = (e: Elemento) => e.durIngresso ?? (e.ingresso === 'scrivi' ? 1.5 : 0.6)
export const DUR_USCITA = 0.5

/** Stato di un elemento al tempo `t` della slide. */
export function statoFx(e: Elemento, t: number | undefined, durata: number): { visibile: boolean; fx?: AnimFx; p: number } {
  if (t == null) return { visibile: true, p: 1 }
  const ini = e.inizio ?? 0
  const fin = Math.min(e.fine ?? durata, durata)
  if (t < ini || t >= fin) return { visibile: false, p: 0 }
  const dIn = durIngressoDi(e)
  if (e.ingresso && e.ingresso !== 'nessuna' && t - ini < dIn) {
    const x = clamp01((t - ini) / dIn)
    return { visibile: true, fx: e.ingresso, p: e.ingresso === 'rimbalzo' ? easeBack(x) : e.ingresso === 'scrivi' ? x : easeOut(x) }
  }
  if (e.uscita && e.uscita !== 'nessuna' && e.uscita !== 'scrivi' && fin - t < DUR_USCITA)
    return { visibile: true, fx: e.uscita, p: easeOut(clamp01((fin - t) / DUR_USCITA)) }
  return { visibile: true, p: 1 }
}

/** Slide e tempo locale a un istante `t` dello spot. */
export function posizioneTempo(slides: Slide[], t: number) {
  let acc = 0
  for (let i = 0; i < slides.length; i++) {
    if (t < acc + slides[i].durata) return { i, locale: t - acc, inizio: acc }
    acc += slides[i].durata
  }
  const last = Math.max(0, slides.length - 1)
  return { i: last, locale: slides[last]?.durata ?? 0, inizio: acc - (slides[last]?.durata ?? 0) }
}

const OMBRE: Record<string, string> = {
  morbida: 'drop-shadow(0 calc(2 * var(--u)) calc(6 * var(--u)) rgba(0, 0, 0, .38))',
  forte: 'drop-shadow(0 calc(4 * var(--u)) calc(2 * var(--u)) rgba(0, 0, 0, .6))',
  bagliore: 'drop-shadow(0 0 calc(8 * var(--u)) rgba(255, 255, 255, .8))',
}
const FILTRI: Record<string, string> = {
  bn: 'grayscale(1)', seppia: 'sepia(.8)', caldo: 'sepia(.3) saturate(1.3) hue-rotate(-10deg)',
  freddo: 'saturate(.9) hue-rotate(15deg) brightness(1.05)', vivido: 'saturate(1.5) contrast(1.1)',
}
const JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' } as const

export const varsElemento = (e: Elemento) => {
  const bg = e.tipo === 'immagine' ? 'transparent'
    : e.sfondo2 && e.sfondo ? `linear-gradient(135deg, ${e.sfondo}, ${e.sfondo2})` : e.sfondo ?? 'transparent'
  const filtro = [e.tipo === 'immagine' && e.filtro ? FILTRI[e.filtro] : '', e.ombra ? OMBRE[e.ombra] ?? '' : ''].filter(Boolean).join(' ') || 'none'
  return {
    '--x': `${e.x}%`, '--y': `${e.y}%`, '--w': `${e.w}%`, '--h': `${e.h}%`,
    '--rot': `${e.rot ?? 0}deg`, '--op': (e.opacita ?? 100) / 100,
    '--size': e.size ?? 16, '--color': e.colore ?? '#FFFFFF', '--bg': bg,
    '--radius': `calc(${e.raggio ?? 0} * var(--u))`, '--weight': e.peso ?? 400,
    '--font': `'${e.font ?? 'Poppins'}'`, '--align': e.allinea ?? 'center', '--justify': JUSTIFY[e.allinea ?? 'center'],
    '--bw': `calc(${e.bordo ?? 0} * var(--u))`, '--bc': e.bordoColore ?? '#FFFFFF',
    '--ls': `${(e.spaziatura ?? 0) / 100}em`, '--lh': (e.interlinea ?? 110) / 100,
    '--fstyle': e.corsivo ? 'italic' : 'normal', '--tt': e.maiuscolo ? 'uppercase' : 'none',
    '--fit': e.adatta ?? 'cover', '--filtro': filtro,
    '--pad': (e.tipo === 'testo' || e.tipo === 'widget') && e.sfondo ? '0 .45em' : e.tipo === 'qr' ? '4%' : '0',
  } as React.CSSProperties
}

// ── QR code (cache per non rigenerarlo a ogni fotogramma) ──
const qrCache = new Map<string, string>()
function QrImg({ link, fg, bg }: { link: string; fg: string; bg: string }) {
  const key = `${link}|${fg}|${bg}`
  const [src, setSrc] = useState(() => qrCache.get(key) ?? '')
  useEffect(() => {
    const c = qrCache.get(key)
    if (c) { setSrc(c); return }
    let vivo = true
    const hex = (x: string, d: string) => /^#[0-9a-f]{6}$/i.test(x) ? x : d
    QRCode.toDataURL(link || 'https://sibylla.it', { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark: hex(fg, '#000000'), light: hex(bg, '#FFFFFF') } })
      .then(u => { qrCache.set(key, u); if (vivo) setSrc(u) })
      .catch(() => undefined)
    return () => { vivo = false }
  }, [key, link, fg, bg])
  return src ? <img className="spot-el__qr" src={src} alt="" /> : <i className="fa-solid fa-qrcode spot-el__ico" aria-hidden="true" />
}

/** Testo dei widget dinamici (ora, data, meteo, countdown). */
export function testoWidget(e: Elemento, ctx?: ContestoSpot): { ico: string; txt: string } {
  const now = new Date()
  switch (e.widget) {
    case 'data': return { ico: 'calendar-day', txt: now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) }
    case 'meteo': { const m = meteoMock(ctx?.citta); return { ico: m.icona, txt: `${m.gradi}° ${m.label}` } }
    case 'countdown': {
      const d = e.countdownA ? new Date(e.countdownA).getTime() - now.getTime() : NaN
      if (Number.isNaN(d)) return { ico: 'hourglass-half', txt: 'Imposta la data' }
      if (d <= 0) return { ico: 'champagne-glasses', txt: 'È iniziato!' }
      const g = Math.floor(d / 86400000), h = Math.floor(d / 3600000) % 24, m = Math.floor(d / 60000) % 60
      return { ico: 'hourglass-half', txt: g > 0 ? `${g} g ${h} h ${m} min` : `${h} h ${m} min` }
    }
    default: return { ico: 'clock', txt: now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) }
  }
}

interface ElProps {
  e: Elemento
  /** Secondi dall'inizio della slide: attiva animazioni e tempi. */
  t?: number
  durata?: number
  /** Con `t`: mostra fermi (p=1) gli elementi in scena e "fantasmi" quelli fuori tempo (editor). */
  statico?: boolean
  ctx?: ContestoSpot
}

export function ElementoView({ e, t, durata = 999, statico, ctx }: ElProps) {
  if (e.nascosto) return null
  const st = statoFx(e, t, durata)
  if (!st.visibile && !statico) return null
  const fx = statico ? undefined : st.fx
  const p = statico ? 1 : st.p
  const loop = t != null && !statico && e.loop && e.loop !== 'nessuna' ? e.loop : null
  let txt = e.testo ?? ''
  if (fx === 'scrivi') txt = txt.slice(0, Math.round(txt.length * p))

  let contenuto: React.ReactNode = null
  if (e.tipo === 'testo') contenuto = <span className="spot-el__txt">{txt}</span>
  else if (e.tipo === 'prezzo') {
    const v = e.prezzoModo === 'dinamico' ? prezzoDelGiorno(e.fonte, e.prezzo ?? 0) : e.prezzo ?? 0
    contenuto = (
      <span className="spot-el__prezzo">
        {e.prefisso && <span className="spot-el__pre">{e.prefisso}</span>}
        <span className="spot-el__val">
          {!!e.prezzoPrima && <s className="spot-el__old">{eurT(e.prezzoPrima)}</s>}
          <span className="spot-el__txt">{eurT(v)}</span>
        </span>
        {e.suffisso && <span className="spot-el__pre">{e.suffisso}</span>}
        {e.prezzoModo === 'dinamico' && e.bollino !== false && <span className="spot-el__live">prezzo del giorno</span>}
      </span>
    )
  } else if (e.tipo === 'icona') contenuto = <i className={`fa-solid fa-${e.icona ?? 'star'} spot-el__ico`} aria-hidden="true" />
  else if (e.tipo === 'immagine') contenuto = e.src ? <img className="spot-el__img" src={e.src} alt="" /> : <span className="spot-el__placeholder"><i className="fa-solid fa-image" aria-hidden="true" /></span>
  else if (e.tipo === 'qr') contenuto = <QrImg link={e.link ?? ''} fg={e.colore ?? '#000000'} bg={e.sfondo ?? '#FFFFFF'} />
  else if (e.tipo === 'widget') { const w = testoWidget(e, ctx); contenuto = <span className="spot-el__widget"><i className={`fa-solid fa-${w.ico}`} aria-hidden="true" /><span>{w.txt}</span></span> }

  return (
    <div className={clsx('spot-el', `spot-el--${e.tipo}`, e.forma && `spot-el--f-${e.forma}`, fx && fx !== 'scrivi' && `spot-el--fx-${fx}`,
      !st.visibile && 'spot-el--fuori', loop && `spot-el--loop-${loop}`)}
      style={{ ...varsElemento(e), '--p': p } as React.CSSProperties}>
      <div className="spot-el__in">{contenuto}</div>
    </div>
  )
}

/** Sfondo della slide: preset, colore, sfumatura o immagine con velatura. */
function SfondoView({ slide }: { slide: Slide }) {
  const b = slide.bg
  if (!b) return <div className={`spot__bg spot-bg--${slide.sfondo}`} />
  if (b.modo === 'immagine') return (
    <div className="spot__bg spot__bg--img" style={{ '--dur': `${slide.durata}s`, '--blur': `calc(${b.sfocatura ?? 0} * var(--u))`, '--velo': (b.velatura ?? 0) / 100 } as React.CSSProperties}>
      {b.src ? <img className={clsx('spot__bgimg', b.kenBurns && 'spot__bgimg--kb')} src={b.src} alt="" /> : <div className={`spot__bg spot-bg--${slide.sfondo}`} />}
      <span className="spot__velo" />
    </div>
  )
  const val = b.modo === 'colore' ? b.c1 : b.radiale ? `radial-gradient(circle at 50% 30%, ${b.c1}, ${b.c2})` : `linear-gradient(${b.angolo}deg, ${b.c1}, ${b.c2})`
  return <div className="spot__bg spot__bg--custom" style={{ '--slide-bg': val } as React.CSSProperties} />
}

interface SlideProps {
  slide: Slide
  formato?: FormatoSpot
  className?: string
  children?: React.ReactNode
  /** Secondi dall'inizio della slide (vedi ElementoView). */
  t?: number
  statico?: boolean
  ctx?: ContestoSpot
  /** Non disegna gli elementi (l'editor li disegna da sé). */
  senzaElementi?: boolean
}

export function SlideView({ slide, formato = 'verticale', className, children, t, statico, ctx, senzaElementi }: SlideProps) {
  return (
    <div className={clsx('spot', `spot--${formato}`, className)}>
      <div className={`spot__stage spot__stage--${slide.transizione}`} key={slide.id}>
        <SfondoView slide={slide} />
        {!senzaElementi && slide.elementi.map(e => <ElementoView key={e.id} e={e} t={t} durata={slide.durata} statico={statico} ctx={ctx} />)}
      </div>
      {children}
    </div>
  )
}

interface PlayerProps {
  progetto: Progetto | null | undefined
  /** In pausa mostra solo la prima slide (o `indice`). */
  play?: boolean
  indice?: number
  className?: string
  /** Barra di avanzamento delle slide in alto. */
  progress?: boolean
  ctx?: ContestoSpot
}

export default function SpotPlayer({ progetto, play = true, indice, className, progress = true, ctx }: PlayerProps) {
  const slides = useMemo(() => progetto?.slides ?? [], [progetto?.slides])
  const tot = progetto ? durataProgetto(progetto) : 0
  const [t, setT] = useState(0)
  const tRef = useRef(0)
  tRef.current = t

  useEffect(() => { setT(0) }, [progetto?.id])
  useEffect(() => {
    if (!play || indice != null || !tot) return
    const t0 = performance.now() - tRef.current * 1000
    const id = window.setInterval(() => setT(((performance.now() - t0) / 1000) % tot), 50)
    return () => window.clearInterval(id)
  }, [play, indice, tot])

  if (!slides.length) return <div className={clsx('spot spot--vuoto', className)}><span className="spot__vuoto">Nessuno spot in onda</span></div>
  const animato = play && indice == null
  const pos = animato ? posizioneTempo(slides, t) : { i: indice ?? 0, locale: 0 }
  const slide = slides[pos.i % slides.length]
  return (
    <SlideView slide={slide} formato={progetto?.formato} className={className} t={animato ? pos.locale : undefined} ctx={ctx}>
      {progress && slides.length > 1 && (
        <div className="spot__progress">
          {slides.map((s, k) => (
            <span key={s.id} className="spot__seg"
              style={{ '--fill': k < pos.i ? 1 : k === pos.i && animato ? pos.locale / s.durata : 0 } as React.CSSProperties} />
          ))}
        </div>
      )}
    </SlideView>
  )
}

/** Anteprima della creatività proposta da un inserzionista terzo. */
export function CreativitaView({ c, className }: { c: Inserzione['creativita']; className?: string }) {
  return (
    <div className={clsx('spot spot--verticale spot--creativita', className)}>
      <div className="spot__stage spot__stage--dissolvenza">
        <div className={`spot__bg spot-bg--${c.sfondo}`} />
        <i className={`fa-solid fa-${c.icona} spot-cr__ico`} aria-hidden="true" />
        <span className="spot-cr__tit">{c.titolo}</span>
        {c.sottotitolo && <span className="spot-cr__sub">{c.sottotitolo}</span>}
        <span className="spot-cr__tag">Sponsorizzato</span>
      </div>
    </div>
  )
}

/** Cornice del totem (schermo + base) attorno a uno spot. */
export function TotemFrame({ children, caption, className, spento, orizzontale }: { children: React.ReactNode; caption?: React.ReactNode; className?: string; spento?: boolean; orizzontale?: boolean }) {
  return (
    <figure className={clsx('totem-frame', spento && 'totem-frame--off', orizzontale && 'totem-frame--oriz', className)}>
      <div className="totem-frame__body">
        <div className="totem-frame__screen">{children}</div>
        <span className="totem-frame__cam" aria-hidden="true" />
      </div>
      <div className="totem-frame__neck" aria-hidden="true" />
      <div className="totem-frame__base" aria-hidden="true" />
      {caption && <figcaption className="totem-frame__caption">{caption}</figcaption>}
    </figure>
  )
}
