import React, { useState } from 'react'
import clsx from 'clsx'
import { isoFromFlagEmoji, countryIso } from '../utils/countryFlags'
import './FlagCircle.sass'

// ─── BANDIERA TONDA ──────────────────────────────────────────────────────────
//  Standard piattaforma per le bandiere: SVG circolare da `public/flags/<iso>.svg`
//  (set circle-flags, MIT), non l'emoji-bandiera. L'emoji è un rettangolo con
//  margini propri: ritagliata in un cerchio resta un rettangolino storto e
//  cambia da sistema a sistema, mentre l'SVG è già disegnato tondo e identico
//  ovunque.
//
//  Il paese si può passare come codice ISO ('it'), come emoji ('🇮🇹' — utile
//  quando il dato arriva già così dall'API) o come nome italiano ('Italia').
//  Se il paese non è tra gli SVG disponibili si ripiega sull'emoji.

export interface FlagCircleProps {
  /** ISO 3166-1 alpha-2, maiuscolo o minuscolo. */
  code?: string
  /** Emoji-bandiera: convertita in ISO (i regional indicator SONO le due lettere). */
  emoji?: string
  /** Nome del paese in italiano (es. 'Paesi Bassi'). */
  name?: string
  /** Diametro in px (default 22). */
  size?: number
  className?: string
}

export default function FlagCircle({ code, emoji, name, size = 22, className }: FlagCircleProps) {
  const [failed, setFailed] = useState(false)
  const iso = (code || isoFromFlagEmoji(emoji) || countryIso(name) || '').toLowerCase()
  const src = iso ? `${process.env.PUBLIC_URL}/flags/${iso}.svg` : ''

  return (
    <span
      className={clsx('flag-circle', className)}
      /* --flag-size: diametro dinamico (custom property, letta dal .sass —
         l'inline style diretto è vietato) */
      style={{ ['--flag-size' as any]: `${size}px` }}
      aria-hidden="true"
    >
      {src && !failed ? (
        <img
          className="flag-circle__img"
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flag-circle__fallback">{emoji || '🏳️'}</span>
      )}
    </span>
  )
}
