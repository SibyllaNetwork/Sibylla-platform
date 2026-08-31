import React from 'react'
import clsx from 'clsx'
import './CfgBadge.sass'

// ─── BADGE DI STATO (kit Configuratore) ──────────────────────────────────────
//  Stato di una voce del Configuratore, ovunque serva (hub, sidebar, palette):
//   configured → verde success  "Configurato"
//   partial    → warning        "Da completare"
//   empty      → neutro         "Da configurare"
//   locked     → disabled       "Bloccato" (lucchetto)
//   soon       → neutro primary "In arrivo"
//  `compact` riduce il badge al solo indicatore (dot/icona) per i contesti
//  densi come le righe della sidebar.

export type CfgBadgeStatus = 'configured' | 'partial' | 'empty' | 'locked' | 'soon'

export interface CfgBadgeProps {
  status: CfgBadgeStatus
  /** Solo indicatore, senza etichetta (sidebar / pill dense). */
  compact?: boolean
  className?: string
}

const LABELS: Record<CfgBadgeStatus, string> = {
  configured: 'Configurato',
  partial:    'Da completare',
  empty:      'Da configurare',
  locked:     'Bloccato',
  soon:       'In arrivo',
}

const ICONS: Record<CfgBadgeStatus, string | null> = {
  configured: 'fa-solid fa-check',
  partial:    null,
  empty:      null,
  locked:     'fa-solid fa-lock',
  soon:       'fa-solid fa-hourglass-half',
}

export default function CfgBadge({ status, compact = false, className }: CfgBadgeProps) {
  const icon = ICONS[status]
  return (
    <span
      className={clsx('cfg-badge', `cfg-badge--${status}`, compact && 'cfg-badge--compact', className)}
      role="status"
      aria-label={LABELS[status]}
    >
      {icon
        ? <i className={clsx(icon, 'cfg-badge__icon')} aria-hidden="true" />
        : <span className="cfg-badge__dot" aria-hidden="true" />}
      {!compact && <span className="cfg-badge__label">{LABELS[status]}</span>}
    </span>
  )
}
