import React from 'react'
import clsx from 'clsx'
import Tooltip from './Tooltip'
import { ACRONIMI, ACRONIMI_RE } from './acronimi'
import './Acronimo.sass'

// ─── ACRONIMO (sigla spiegata) ───────────────────────────────────────────────
//  Una sigla dell'interfaccia (B.A.R., F.I.T., PMS…) resa con sottolineatura
//  puntinata e spiegata dal tooltip standard scuro: scioglimento della sigla +
//  una riga di significato. Il glossario vive in `acronimi.ts`.
//
//  `withAcronimi(testo)` fa lo stesso lavoro su una stringa qualsiasi: ritorna
//  il testo con le sigle riconosciute già avvolte, così le etichette dei
//  componenti (titoli pane, colonne, voci di menu) non vanno riscritte a mano.

export interface AcronimoProps {
  /** La sigla, esattamente com'è a schermo (chiave del glossario). */
  sigla: string
  className?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Acronimo({ sigla, className, position = 'top' }: AcronimoProps) {
  const def = ACRONIMI[sigla]
  if (!def) return <>{sigla}</>
  return (
    <Tooltip
      position={position}
      content={(
        <span className="acronimo__tip">
          <strong className="acronimo__tip-title">{sigla} · {def.esteso}</strong>
          <span className="acronimo__tip-text">{def.spiegazione}</span>
        </span>
      )}
    >
      <abbr className={clsx('acronimo', className)} aria-label={`${sigla}: ${def.esteso}`}>
        {sigla}
      </abbr>
    </Tooltip>
  )
}

/**
 * Avvolge in <Acronimo/> ogni sigla del glossario trovata nel testo.
 * Se non ce ne sono, ritorna la stringa originale (nessun nodo in più).
 */
export function withAcronimi(text: React.ReactNode): React.ReactNode {
  if (typeof text !== 'string' || !text) return text
  const parts = text.split(ACRONIMI_RE)
  if (parts.length === 1) return text
  return parts.map((p, i) => (ACRONIMI[p] ? <Acronimo key={i} sigla={p} /> : p))
}
