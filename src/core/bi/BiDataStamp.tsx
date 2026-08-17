import React from 'react'
import clsx from 'clsx'
import { fmtStamp } from './chartTheme'
import './BiDataStamp.sass'

// ─── TIMBRO "DATI BI" ───────────────────────────────────────────────────────────
//  Dice all'utente A CHE ORA sono fermi i numeri che sta guardando: in una pagina
//  BI è un'informazione di merito, non un ornamento (i dati arrivano da un carico
//  periodico, non sono in tempo reale). Va nelle azioni del PageHead.
//  `onRefresh` mostra il pulsante di ricarica; durante il carico l'icona gira.

export interface BiDataStampProps {
  /** Momento dell'ultimo aggiornamento del dato. */
  at: Date
  onRefresh?: () => void
  loading?: boolean
  className?: string
}

export default function BiDataStamp({ at, onRefresh, loading = false, className }: BiDataStampProps) {
  return (
    <span className={clsx('bi-stamp', className)}>
      {onRefresh ? (
        <button
          type="button"
          className="bi-stamp__btn"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Aggiorna i dati"
        >
          <i className={clsx('fa-solid fa-arrows-rotate', loading && 'bi-stamp__spin')} aria-hidden="true" />
        </button>
      ) : (
        <i className="fa-solid fa-database bi-stamp__ico" aria-hidden="true" />
      )}
      <span className="bi-stamp__label">Dati BI</span>
      <time className="bi-stamp__time" dateTime={at.toISOString()}>{fmtStamp(at)}</time>
    </span>
  )
}
