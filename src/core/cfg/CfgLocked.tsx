import React from 'react'
import clsx from 'clsx'
import './CfgLocked.sass'

// ─── STATO BLOCCATO (kit Configuratore) ──────────────────────────────────────
//  Una voce con prerequisito non soddisfatto NON è un grigio muto: spiega il
//  motivo del blocco e offre la CTA che porta dritto al configuratore
//  richiesto ("Completa Stagionalità →").

export interface CfgLockedProps {
  /** Nome della voce bloccata. */
  title: string
  /** Nome del configuratore prerequisito (per la CTA). */
  requirementLabel: string
  /** Motivo leggibile del blocco. */
  reason: string
  /** Naviga al configuratore prerequisito. */
  onGoToRequirement?: () => void
  className?: string
}

export default function CfgLocked({ title, requirementLabel, reason, onGoToRequirement, className }: CfgLockedProps) {
  return (
    <div className={clsx('cfg-locked', className)}>
      <span className="cfg-locked__icon-ring">
        <i className="fa-light fa-lock" aria-hidden="true" />
      </span>
      <div className="cfg-locked__title">{title} non è ancora attivabile</div>
      <p className="cfg-locked__reason">{reason}</p>
      {onGoToRequirement && (
        <button
          type="button"
          className="sib-btn sib-btn--primary cfg-locked__cta"
          onClick={onGoToRequirement}
        >
          Completa {requirementLabel}
          <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
