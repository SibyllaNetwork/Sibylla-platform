import React from 'react'
import clsx from 'clsx'
import './BiVerticalTabs.sass'

// ─── TAB VERTICALI (rail della card) ────────────────────────────────────────────
//  Commutano la vista dentro la stessa card — tipicamente TREND (grafico) e
//  DETTAGLIO (tabella) — senza allungare la pagina: è il meccanismo che permette
//  di tenere grafico e dati sotto lo stesso tetto a schermo fisso, invece di
//  mettere la tabella in fondo e generare scroll.

//  Solo testo: nessuna icona. Ruotata di 90°, un'icona resta ambigua e sposta
//  l'etichetta dal centro del rail.

export interface BiVerticalTab {
  id: string
  label: string
}

export interface BiVerticalTabsProps {
  tabs: BiVerticalTab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export default function BiVerticalTabs({ tabs, active, onChange, className }: BiVerticalTabsProps) {
  return (
    <div className={clsx('bi-vtabs', className)} role="tablist" aria-orientation="vertical">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === active}
          className={clsx('bi-vtabs__tab', t.id === active && 'bi-vtabs__tab--on')}
          onClick={() => onChange(t.id)}
        >
          <span className="bi-vtabs__lbl">{t.label}</span>
        </button>
      ))}
    </div>
  )
}
