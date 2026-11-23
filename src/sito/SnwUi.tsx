import React from 'react'
import { Offerta, eur, foto } from './sitoData'
import './SnwUi.sass'

/** Componenti minimi condivisi fra Sito web e Totem. */

export function SnwLogo({ chiaro }: { chiaro?: boolean }) {
  return (
    <span className={`snw-logo ${chiaro ? 'snw-logo--chiaro' : ''}`}>
      <span className="snw-logo__key" aria-hidden="true" />
      <span className="snw-logo__word"><b>Sibylla</b> Network</span>
    </span>
  )
}

export function SnwFoto({ id, w, h, alt, className }: { id: string; w?: number; h?: number; alt: string; className?: string }) {
  return <img src={foto(id, w, h)} alt={alt} loading="lazy" className={`snw-foto ${className ?? ''}`} />
}

export function SnwVoto({ o, compatto }: { o: Pick<Offerta, 'voto' | 'recensioni'>; compatto?: boolean }) {
  return (
    <span className="snw-voto">
      <i className="fa-solid fa-star" aria-hidden="true" />
      <b>{o.voto.toLocaleString('it-IT', { minimumFractionDigits: 1 })}</b>
      <span>{compatto ? `(${o.recensioni})` : `· ${o.recensioni.toLocaleString('it-IT')} recensioni`}</span>
    </span>
  )
}

export function SnwPrezzo({ o, grande }: { o: Offerta; grande?: boolean }) {
  return (
    <span className={`snw-prezzo ${grande ? 'snw-prezzo--grande' : ''}`}>
      {o.daPrezzo && <span className="snw-prezzo__da">da</span>}
      {o.prezzoPieno && <s className="snw-prezzo__pieno">{eur(o.prezzoPieno)}</s>}
      <b className={o.prezzoPieno ? 'snw-prezzo__val snw-prezzo__val--offerta' : 'snw-prezzo__val'}>{eur(o.prezzo)}</b>
      <span className="snw-prezzo__unita">{o.unita}</span>
    </span>
  )
}

const ICONA_ETICHETTA: Record<string, string> = {
  'Più scelto': 'fa-fire',
  'Novità': 'fa-sparkles',
  'Offerta': 'fa-tag',
  'Solo su Network': 'fa-key',
}

/** Etichetta sulla foto: targhetta squadrata (mai pillola), icona + testo. */
export function SnwEtichetta({ testo }: { testo?: string }) {
  if (!testo) return null
  return (
    <span className={`snw-etichetta snw-etichetta--${testo === 'Offerta' ? 'offerta' : 'std'}`}>
      <i className={`fa-solid ${ICONA_ETICHETTA[testo] ?? 'fa-circle'}`} aria-hidden="true" />{testo}
    </span>
  )
}

export function SnwStepper({ valore, onChange, min = 1, max = 20, etichetta, grande }: {
  valore: number; onChange: (v: number) => void; min?: number; max?: number; etichetta: string; grande?: boolean
}) {
  return (
    <span className={`snw-stepper ${grande ? 'snw-stepper--grande' : ''}`} role="group" aria-label={etichetta}>
      <button type="button" aria-label={`Diminuisci ${etichetta}`} disabled={valore <= min} onClick={() => onChange(valore - 1)}>
        <i className="fa-solid fa-minus" />
      </button>
      <output aria-live="polite">{valore}</output>
      <button type="button" aria-label={`Aumenta ${etichetta}`} disabled={valore >= max} onClick={() => onChange(valore + 1)}>
        <i className="fa-solid fa-plus" />
      </button>
    </span>
  )
}
