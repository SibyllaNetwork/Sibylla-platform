// ─── Cornice tablet ───────────────────────────────────────────────────────────
//  Su tablet le pagine operative di Food & Beverage vanno a tutto schermo, senza
//  sidenav, con la stessa testata delle versioni tablet dedicate (Sala, Comanda,
//  Cucina). Le pagine che non hanno un disegno tablet proprio (Dashboard,
//  Prenotazioni, Ospiti, Cassa) entrano qui così come sono, ingrandite per il
//  dito: restano tutte le loro funzioni. In testata si passa da una pagina
//  operativa all'altra con un tocco.
import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Foglio } from '../GestioneComanda/GestioneComandaTablet'
import { PAGINE_TABLET } from './paginaTablet'
import '../GestioneComanda/GestioneComandaTablet.sass'
import './TabletShell.sass'

/** Pulsante "Pagine" + foglio con le pagine operative: per le testate tablet. */
export function TabletMenu({ pagina, navigate }: { pagina: string; navigate?: (p: string) => void }) {
  const [aperto, setAperto] = useState(false)
  return (
    <>
      <button type="button" className="gctab__head-btn" onClick={() => setAperto(true)} aria-label="Pagine del servizio">
        <i className="fa-solid fa-grip" aria-hidden="true" />
      </button>
      {aperto && (
        <Foglio titolo="Pagine del servizio" onChiudi={() => setAperto(false)}>
          <div className="tshell__menu">
            {PAGINE_TABLET.map(p => (
              <button key={p.page} type="button" className={`tshell__menu-btn ${p.page === pagina ? 'is-on' : ''}`}
                onClick={() => { setAperto(false); navigate?.(p.page) }}>
                <i className={`fa-solid ${p.ico}`} aria-hidden="true" />
                <span>{p.label}</span>
              </button>
            ))}
            <button type="button" className="tshell__menu-btn" onClick={() => { setAperto(false); navigate?.('home') }}>
              <i className="fa-solid fa-house" aria-hidden="true" />
              <span>Home</span>
            </button>
          </div>
        </Foglio>
      )}
    </>
  )
}

export default function TabletShell({ pagina, titolo, navigate, children }: {
  pagina: string
  titolo: string
  navigate?: (p: string) => void
  children: React.ReactNode
}) {
  const [ora, setOra] = useState(() => new Date())
  useEffect(() => { const id = window.setInterval(() => setOra(new Date()), 30000); return () => window.clearInterval(id) }, [])

  return createPortal(
    <div className="gctab tshell" role="application" aria-label={titolo}>
      <header className="gctab__head">
        <TabletMenu pagina={pagina} navigate={navigate} />
        <nav className="tshell__nav" aria-label="Pagine del servizio">
          {PAGINE_TABLET.map(p => (
            <button key={p.page} type="button" className={`tshell__tab ${p.page === pagina ? 'is-on' : ''}`}
              onClick={() => navigate?.(p.page)} aria-current={p.page === pagina ? 'page' : undefined}>
              <i className={`fa-solid ${p.ico}`} aria-hidden="true" />
              <span>{p.label}</span>
            </button>
          ))}
        </nav>
        <span className="gctab__head-ora">{ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
      </header>
      <main className="tshell__corpo">
        <h1 className="tshell__titolo">{titolo}</h1>
        <div className="tshell__pagina">{children}</div>
      </main>
    </div>,
    document.body,
  )
}
