import React, { useState } from 'react'
import Ico from '../core/icons/Ico'
import { PLATFORM_ADMIN_MENU, PLATFORM_ADMIN_PLATFORM_PAGE } from '../navigation/platformAdminMenu'
import './PlatformAdminNav.sass'

interface Props {
  currentPage: string
  navigate: (p: string) => void
}

/*
 * PlatformAdminNav — menu dell'Amministrazione piattaforma reso nella sidenav
 * (al posto del menu utente). Gruppi collassabili con testi e icone neri, sul
 * fondo oro della console amministrativa.
 */
export default function PlatformAdminNav({ currentPage, navigate }: Props) {
  // Gruppi chiusi di default.
  const [open, setOpen] = useState<Record<string, boolean>>(
    () => Object.fromEntries(PLATFORM_ADMIN_MENU.map(g => [g.id, false])),
  )
  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }))

  return (
    <div className="pa-nav">
      {PLATFORM_ADMIN_MENU.map(g => (
        <div key={g.id} className="pa-nav__group">
          <button
            type="button"
            className="pa-nav__head"
            onClick={() => toggle(g.id)}
            aria-expanded={open[g.id]}
          >
            <span className="pa-nav__ico"><Ico n={g.icon} s={16} c="#2A2208" /></span>
            <span className="pa-nav__label">{g.label}</span>
            <span className={open[g.id] ? 'pa-nav__chev pa-nav__chev--open' : 'pa-nav__chev'}>
              <Ico n="chevd" s={11} c="#2A2208" />
            </span>
          </button>
          {open[g.id] && (
            <div className="pa-nav__items">
              {g.items.map(it => (
                <button
                  key={it.id}
                  type="button"
                  className={`pa-nav__item${currentPage === it.page ? ' pa-nav__item--active' : ''}`}
                  onClick={() => navigate(it.page)}
                >
                  {it.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Voce in fondo: apre il pannello in modalità Piattaforma */}
      <button
        type="button"
        className={`pa-nav__platform${currentPage === PLATFORM_ADMIN_PLATFORM_PAGE ? ' pa-nav__platform--active' : ''}`}
        onClick={() => navigate(PLATFORM_ADMIN_PLATFORM_PAGE)}
      >
        <span className="pa-nav__ico"><Ico n="layers" s={16} c="#2A2208" /></span>
        <span className="pa-nav__label">Sibylla admin</span>
      </button>
    </div>
  )
}
