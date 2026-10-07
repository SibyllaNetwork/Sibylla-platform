import React from 'react'
import clsx from 'clsx'
import type { HomeToView } from './useHomeToView'
import './HomeToLinks.sass'

// ─── HOME TOUR OPERATOR · collegamenti ────────────────────────────────────────
//  Scorciatoie alle pagine chiave del menu TO + link per passare all'altra
//  versione della Home. Usati da entrambe le viste.

export const TO_QUICK_LINKS = [
  { label: 'Tableau',               page: 'tableau-book',          ico: 'fa-table-list' },
  { label: 'Open board',            page: 'open-board',            ico: 'fa-table-columns' },
  { label: 'Monitoraggio pratiche', page: 'monitoraggio-pratiche', ico: 'fa-hourglass-half' },
  { label: 'Market lens',           page: 'market-lens',           ico: 'fa-magnifying-glass-chart' },
  { label: 'Action centre',         page: 'action-centre',         ico: 'fa-bolt' },
] as const

interface QuickProps {
  navigate: (p: string) => void
  /** 'hero' = pillole chiare sopra lo sfondo del timone; 'page' = in pagina. */
  tone?: 'hero' | 'page'
}

export function HomeToQuickLinks({ navigate, tone = 'page' }: QuickProps) {
  return (
    <nav className={clsx('home-to-quick', `home-to-quick--${tone}`)} aria-label="Accesso rapido">
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

interface SwitchProps {
  /** Vista attualmente mostrata: il link porta all'altra. */
  view: HomeToView
  onSwitch: (v: HomeToView) => void
}

export function HomeToSwitch({ view, onSwitch }: SwitchProps) {
  const to: HomeToView = view === 'timone' ? 'dashboard' : 'timone'
  return (
    <button type="button" className="home-to-switch" onClick={() => onSwitch(to)}>
      <i className={`fa-solid ${to === 'dashboard' ? 'fa-grid-2' : 'fa-dharmachakra'}`} aria-hidden="true" />
      <span>{to === 'dashboard' ? 'Passa alla dashboard' : 'Passa alla vista timone'}</span>
      <i className="fa-solid fa-arrow-right home-to-switch__arrow" aria-hidden="true" />
    </button>
  )
}
