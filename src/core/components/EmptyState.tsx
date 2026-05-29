import React from 'react'

interface EmptyStateProps {
  /** Nome icona FontAwesome (resa con fa-light), es. 'inbox', 'magnifying-glass' */
  icon?: string
  title: string
  subtitle?: string
  /** Eventuale CTA (es. un <button className="sib-btn sib-btn--primary">) */
  action?: React.ReactNode
}

/**
 * Stato vuoto standard: icona + titolo + sottotesto opzionale + CTA opzionale.
 * Stili in src/styles/_components.sass (.empty-state).
 */
const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'inbox', title, subtitle, action }) => (
  <div className="empty-state">
    <i className={`fa-light fa-${icon} empty-state__icon`} aria-hidden="true" />
    <div className="empty-state__title">{title}</div>
    {subtitle && <div className="empty-state__subtitle">{subtitle}</div>}
    {action && <div className="empty-state__action">{action}</div>}
  </div>
)

export default EmptyState
