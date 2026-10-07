import React from 'react'
import './HomeToLinks.sass'

// ─── HOME TOUR OPERATOR · collegamenti ────────────────────────────────────────
//  Scorciatoie alle pagine chiave del menu TO in testa alla Home.

export const TO_QUICK_LINKS = [
  { label: 'Tableau',               page: 'tableau-book',          ico: 'fa-table-list' },
  { label: 'Open board',            page: 'open-board',            ico: 'fa-table-columns' },
  { label: 'Monitoraggio pratiche', page: 'monitoraggio-pratiche', ico: 'fa-hourglass-half' },
  { label: 'Market lens',           page: 'market-lens',           ico: 'fa-magnifying-glass-chart' },
  { label: 'Action centre',         page: 'action-centre',         ico: 'fa-bolt' },
] as const

export function HomeToQuickLinks({ navigate }: { navigate: (p: string) => void }) {
  return (
    <nav className="home-to-quick" aria-label="Accesso rapido">
      {TO_QUICK_LINKS.map((l, i) => (
        <button
          key={l.page}
          type="button"
          className="home-to-quick__btn"
          style={{ ['--i' as any]: i }}
          onClick={() => navigate(l.page)}
        >
          <i className={`fa-solid ${l.ico}`} aria-hidden="true" />
          <span>{l.label}</span>
        </button>
      ))}
    </nav>
  )
}
