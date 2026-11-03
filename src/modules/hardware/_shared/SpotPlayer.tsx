import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import type { Elemento, Inserzione, Progetto, Slide } from '../../../store/useTotemStore'
import { eurT } from '../../../store/useTotemStore'
import './SpotPlayer.sass'

/**
 * Riproduce uno spot (progetto dell'Editor palinsesti) in formato verticale 9:16.
 * Le posizioni degli elementi sono in % e le dimensioni del testo sono riferite a
 * una slide larga 360 px: tutto scala con il contenitore (container query units),
 * quindi lo stesso spot si vede uguale nella miniatura, nel totem e nell'editor.
 * I valori runtime (posizione, colore, corpo) passano come CSS custom property.
 */

export const varsElemento = (e: Elemento) => ({
  '--x': `${e.x}%`, '--y': `${e.y}%`, '--w': `${e.w}%`, '--h': `${e.h}%`,
  '--size': e.size ?? 16, '--color': e.colore ?? '#FFFFFF', '--bg': e.sfondo ?? 'transparent',
  '--radius': `${e.raggio ?? 0}px`, '--weight': e.peso ?? 400,
  '--font': `'${e.font ?? 'Poppins'}'`, '--align': e.allinea ?? 'left',
} as React.CSSProperties)

export function ElementoView({ e }: { e: Elemento }) {
  return (
    <div className={`spot-el spot-el--${e.tipo}`} style={varsElemento(e)}>
      {e.tipo === 'testo' && <span className="spot-el__txt">{e.testo}</span>}
      {e.tipo === 'prezzo' && (
        <span className="spot-el__prezzo">
          <span className="spot-el__txt">{eurT(e.prezzo ?? 0)}</span>
          {e.prezzoModo === 'dinamico' && <span className="spot-el__live">prezzo del giorno</span>}
        </span>
      )}
      {e.tipo === 'icona' && <i className={`fa-solid fa-${e.icona ?? 'star'} spot-el__ico`} aria-hidden="true" />}
      {e.tipo === 'immagine' && (e.src ? <img className="spot-el__img" src={e.src} alt="" /> : <span className="spot-el__placeholder"><i className="fa-solid fa-image" aria-hidden="true" /></span>)}
    </div>
  )
}

export function SlideView({ slide, className, children }: { slide: Slide; className?: string; children?: React.ReactNode }) {
  return (
    <div className={clsx('spot', `spot--${slide.sfondo}`, className)}>
      <div className={`spot__stage spot__stage--${slide.transizione}`} key={slide.id}>
        {slide.elementi.map(e => <ElementoView key={e.id} e={e} />)}
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
  /** Barra di avanzamento delle slide in basso. */
  progress?: boolean
}

export default function SpotPlayer({ progetto, play = true, indice, className, progress = true }: PlayerProps) {
  const [i, setI] = useState(0)
  const slides = useMemo(() => progetto?.slides ?? [], [progetto?.slides])
  const cur = indice ?? i

  useEffect(() => { setI(0) }, [progetto?.id])
  useEffect(() => {
    if (!play || indice != null || slides.length < 2) return
    const t = window.setTimeout(() => setI(x => (x + 1) % slides.length), (slides[cur % slides.length]?.durata ?? 5) * 1000)
    return () => window.clearTimeout(t)
  }, [play, indice, cur, slides])

  const slide = slides[cur % Math.max(1, slides.length)]
  if (!slide) return <div className={clsx('spot spot--vuoto', className)}><span className="spot__vuoto">Nessuno spot in onda</span></div>
  return (
    <SlideView slide={slide} className={className}>
      {progress && slides.length > 1 && (
        <div className="spot__progress">
          {slides.map((s, k) => (
            <span key={s.id} className={clsx('spot__seg', k < cur % slides.length && 'spot__seg--done', k === cur % slides.length && play && 'spot__seg--run')}
              style={{ '--dur': `${s.durata}s` } as React.CSSProperties} />
          ))}
        </div>
      )}
    </SlideView>
  )
}

/** Anteprima della creatività proposta da un inserzionista terzo. */
export function CreativitaView({ c, className }: { c: Inserzione['creativita']; className?: string }) {
  return (
    <div className={clsx('spot', `spot--${c.sfondo}`, 'spot--creativita', className)}>
      <div className="spot__stage spot__stage--dissolvenza">
        <i className={`fa-solid fa-${c.icona} spot-cr__ico`} aria-hidden="true" />
        <span className="spot-cr__tit">{c.titolo}</span>
        {c.sottotitolo && <span className="spot-cr__sub">{c.sottotitolo}</span>}
        <span className="spot-cr__tag">Sponsorizzato</span>
      </div>
    </div>
  )
}

/** Cornice del totem verticale (schermo + base) attorno a uno spot. */
export function TotemFrame({ children, caption, className, spento }: { children: React.ReactNode; caption?: React.ReactNode; className?: string; spento?: boolean }) {
  return (
    <figure className={clsx('totem-frame', spento && 'totem-frame--off', className)}>
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
