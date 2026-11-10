// ─── Magazzino ristorazione: mattoncini delle modali ─────────────────────────
//  Corpo, griglia dei campi, piede con Annulla/Conferma (che diventa "Riprova"
//  dopo un errore, con la stessa chiave) ed errore di Op mostrato così com'è.

import React from 'react'
import './MagModale.sass'

export function MagCorpo({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`magmod ${className ?? ''}`}>{children}</div>
}

export function MagGriglia({ children, colonne = 2 }: { children: React.ReactNode; colonne?: 2 | 3 | 4 }) {
  return <div className={`magmod__griglia magmod__griglia--${colonne}`}>{children}</div>
}

export function MagSezione({ titolo, azioni, children }: { titolo: string; azioni?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="magmod__sezione">
      <header className="magmod__sez-head">
        <span className="magmod__sez-tit">{titolo}</span>
        {azioni}
      </header>
      {children}
    </section>
  )
}

export function MagErrore({ testo }: { testo: string | null }) {
  if (!testo) return null
  return (
    <p className="magmod__errore" role="alert">
      <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {testo}
    </p>
  )
}

export function MagAvvisi({ avvisi }: { avvisi: string[] }) {
  if (!avvisi.length) return null
  return (
    <ul className="magmod__avvisi">
      {avvisi.map((a, i) => (
        <li key={i}><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {a}</li>
      ))}
    </ul>
  )
}

interface PiedeProps {
  onAnnulla: () => void
  onConferma?: () => void
  etichetta: string
  icona?: string
  inCorso?: boolean
  daRiprovare?: boolean
  disabilitato?: boolean
  pericolo?: boolean
  sinistra?: React.ReactNode
}

export function MagPiede({ onAnnulla, onConferma, etichetta, icona = 'fa-check', inCorso, daRiprovare, disabilitato, pericolo, sinistra }: PiedeProps) {
  return (
    <footer className="magmod__piede">
      <div className="magmod__piede-sx">{sinistra}</div>
      <button type="button" className="sib-btn sib-btn--secondary" onClick={onAnnulla} disabled={inCorso}>Annulla</button>
      {onConferma && (
        <button
          type="button"
          className={`sib-btn ${pericolo ? 'sib-btn--danger' : 'sib-btn--primary'} ${inCorso ? 'sib-btn--loading' : ''}`}
          onClick={onConferma} disabled={inCorso || disabilitato}
        >
          <i className={`fa-solid ${daRiprovare ? 'fa-rotate-right' : icona}`} aria-hidden="true" /> {daRiprovare ? 'Riprova' : etichetta}
        </button>
      )}
    </footer>
  )
}

export function MagNota({ children }: { children: React.ReactNode }) {
  return <p className="magmod__nota">{children}</p>
}
