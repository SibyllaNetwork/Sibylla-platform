import React, { useEffect, useState } from 'react'
// Sub-app Outlet Manager vendorizzata (outlet-full/frontend). Le pagine sono
// JSX originali, montate qui senza riscritture (allowJs). Il routing è a stato,
// come nell'App originale: una pagina attiva + ctx per la navigazione incrociata.
import { SalaRistorante } from './app/pages/SalaRistorante'
import { LibroPrenotazioni } from './app/pages/LibroPrenotazioni'
import { OspitiGiorno } from './app/pages/OspitiGiorno'
import { GestioneSala } from './app/pages/GestioneSala'
import './app/outlet-app.css'

// ─────────────────────────────────────────────────────────────────────────────
//  OutletShell — punto di ingresso unico per le pagine Food & Beverage.
//  Mappa i link del menu Sibylla alle pagine operative dell'Outlet Manager e
//  replica le callback di navigazione incrociata dell'App originale (sala →
//  gestione comanda, sala ↔ prenotazioni). Lo stato resta interno alla sub-app,
//  in linea col modello state-based di Sibylla (come AgoraShell).
//
//  Le chiamate /api/* della sub-app sono instradate al backend Outlet dal proxy
//  di sviluppo (src/setupProxy.js); in produzione va replicato a livello di host.
// ─────────────────────────────────────────────────────────────────────────────

export type OutletSubPage = 'sala' | 'prenotazioni' | 'ospiti' | 'gestione'

interface Ctx {
  tavolo?: any
  sala?: any
  outlet?: any
  turno?: any
  editPren?: any
}

export default function OutletShell({ initialPage, navigate }: { initialPage: OutletSubPage; navigate?: (p: string) => void }) {
  const [page, setPage] = useState<OutletSubPage>(initialPage)
  const [ctx, setCtx] = useState<Ctx>({})

  // Cambio voce di menu Sibylla → cambia pagina operativa.
  useEffect(() => { setPage(initialPage) }, [initialPage])

  const handleGestione = (tavolo: any, sala: any, outlet: any, turno: any) => {
    setCtx({ tavolo, sala, outlet, turno })
    setPage('gestione')
  }

  return (
    <div className="outletmgr">
      {page === 'sala' && (
        <SalaRistorante
          onGestione={handleGestione}
          initSala={ctx.sala || null}
          initOutlet={ctx.outlet || null}
          onGoPrenotazioni={(pren: any, outlet: any, sala: any, turno: any) => {
            setCtx(c => ({ ...c, editPren: pren || null, outlet: outlet || c.outlet, sala: sala || c.sala, turno: turno || c.turno }))
            setPage('prenotazioni')
          }}
        />
      )}

      {page === 'prenotazioni' && (
        <LibroPrenotazioni
          initEditPren={ctx.editPren || null}
          initOutlet={ctx.outlet || null}
          initSala={ctx.sala || null}
          initTurno={ctx.turno || null}
          onClearCtx={() => setCtx(c => ({ ...c, editPren: null }))}
          onGoToSala={(outlet: any, sala: any, turno: any) => {
            setCtx(c => ({ ...c, outlet: outlet || c.outlet, sala: sala || c.sala, turno: turno || null }))
            setPage('sala')
          }}
        />
      )}

      {page === 'ospiti' && <OspitiGiorno navigate={navigate} />}

      {page === 'gestione' && (
        <GestioneSala
          tavolo={ctx.tavolo || null}
          sala={ctx.sala || null}
          outlet={ctx.outlet || null}
          turno={ctx.turno || null}
          onGoToSala={(sala: any, outlet: any) => {
            setCtx(c => ({ ...c, sala, outlet }))
            setPage('sala')
          }}
        />
      )}
    </div>
  )
}
