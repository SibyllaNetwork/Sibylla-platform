import React from 'react'
import clsx from 'clsx'
import './CfgToolbar.sass'

// ─── CFG TOOLBAR (riga filtri standard) ──────────────────────────────────────
//  Riga dei filtri dei pane (Struttura / Tipologia / Segmento / …), costruita
//  con i campi condivisi (SelectField, SearchField, RadioGroup, …) passati
//  come children. Garantisce allineamento in basso (le label dei campi hanno
//  altezze diverse), gap e wrapping coerenti; le `actions` restano a destra.

export interface CfgToolbarProps {
  /** Campi filtro (componenti condivisi di core/components/form). */
  children: React.ReactNode
  /** Azioni allineate a destra (bottoni export, "+ Aggiungi", …). */
  actions?: React.ReactNode
  className?: string
}

export default function CfgToolbar({ children, actions, className }: CfgToolbarProps) {
  return (
    <div className={clsx('cfg-toolbar', className)}>
      <div className="cfg-toolbar__filters">{children}</div>
      {actions && <div className="cfg-toolbar__actions">{actions}</div>}
    </div>
  )
}
