import React from 'react'
import clsx from 'clsx'
import CfgBadge from './CfgBadge'
import './CfgEmpty.sass'

// ─── EMPTY STATE (kit Configuratore) ─────────────────────────────────────────
//  Stato vuoto dei pane: nessun dato configurato, oppure — con `soon` —
//  configuratore previsto dal piano ma non ancora costruito ("In arrivo").

export interface CfgEmptyProps {
  /** Nome icona Font Awesome (senza prefisso), es. 'inbox'. */
  icon?: string
  title: string
  subtitle?: string
  /** CTA opzionale (es. <button className="sib-btn sib-btn--primary">). */
  action?: React.ReactNode
  /** true = pane non ancora costruito: mostra il badge "In arrivo". */
  soon?: boolean
  className?: string
}

export default function CfgEmpty({ icon = 'inbox', title, subtitle, action, soon = false, className }: CfgEmptyProps) {
  return (
    <div className={clsx('cfg-empty', className)}>
      <span className="cfg-empty__icon-ring">
        <i className={`fa-light fa-${icon}`} aria-hidden="true" />
      </span>
      <div className="cfg-empty__title">{title}</div>
      {subtitle && <p className="cfg-empty__subtitle">{subtitle}</p>}
      {soon && <CfgBadge status="soon" className="cfg-empty__soon" />}
      {action && <div className="cfg-empty__action">{action}</div>}
    </div>
  )
}
