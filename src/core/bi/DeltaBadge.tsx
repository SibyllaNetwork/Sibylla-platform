import React from 'react'
import clsx from 'clsx'
import './DeltaBadge.sass'

// ─── DELTA BADGE ────────────────────────────────────────────────────────────────
//  Variazione rispetto a un riferimento (anno precedente, budget, periodo prec.).
//  Il colore è di STATO, non di serie: verde = miglioramento, rosso = peggioramento,
//  e viaggia sempre con freccia + testo, mai col colore da solo.
//  Per le metriche "al contrario" (costi, cancellazioni) si passa `invert`.

export interface DeltaBadgeProps {
  /** Variazione già calcolata: il segno decide freccia e colore. */
  value: number
  /** Testo mostrato (default: valore formattato con segno e suffisso). */
  label?: string
  /** Suffisso quando `label` non è passata (es. '%', ' pt', ' €'). */
  suffix?: string
  /** true per le metriche dove salire è peggio (costi, no-show). */
  invert?: boolean
  /** Variante compatta per le celle di tabella. */
  size?: 'md' | 'sm'
  className?: string
}

export default function DeltaBadge({
  value, label, suffix = '%', invert = false, size = 'md', className,
}: DeltaBadgeProps) {
  const up = value > 0
  const flat = value === 0
  const good = invert ? !up : up
  const text = label ?? `${up ? '+' : value < 0 ? '−' : ''}${new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 1, maximumFractionDigits: 1,
  }).format(Math.abs(value))}${suffix}`

  return (
    <span
      className={clsx('delta-badge', `delta-badge--${size}`,
        flat ? 'delta-badge--flat' : good ? 'delta-badge--good' : 'delta-badge--bad', className)}
    >
      <i
        className={clsx('fa-solid', flat ? 'fa-minus' : up ? 'fa-arrow-up' : 'fa-arrow-down')}
        aria-hidden="true"
      />
      {text}
    </span>
  )
}
