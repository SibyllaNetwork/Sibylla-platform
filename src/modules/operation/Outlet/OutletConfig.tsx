import React from 'react'
// Pagine di configurazione dell'Outlet Manager (vendorizzate da ConfigPages.jsx),
// montate dentro la sezione Food & Beverage del Configuratore Sibylla.
import {
  OutletPage, SalePage, TurniPage, AllergeniPage, TipiMenuPage,
  CategorieMenuPage, CategorieClientePage, VociMenuPage, MenuDelGiornoPage,
  StampantiPage, ServiceMonitorPage, WebMenuPage,
} from './app/pages/ConfigPages'
import './app/outlet-app.css'

// Mappa: id voce F&B del Configuratore → pagina di configurazione Outlet.
const PAGES: Record<string, React.ComponentType<any>> = {
  'fb-outlet':          OutletPage,
  'fb-sale-tavoli':     SalePage,
  'fb-turni':           TurniPage,
  'fb-categorie':       CategorieMenuPage,
  'fb-voci-menu':       VociMenuPage,
  'fb-crea-menu':       MenuDelGiornoPage,
  'fb-lista-menu':      WebMenuPage,
  'fb-tipi-menu':       TipiMenuPage,
  'fb-web-menu':        WebMenuPage,
  'fb-menu-giorno':     MenuDelGiornoPage,
  'fb-allergeni':       AllergeniPage,
  'fb-categoria-ospite': CategorieClientePage,
  'fb-stampanti':       StampantiPage,
  'fb-service-monitor': ServiceMonitorPage,
}

/** True se l'id F&B ha una pagina Outlet collegata. */
export function hasOutletConfig(id: string): boolean {
  return id in PAGES
}

export default function OutletConfig({ id }: { id: string }) {
  const Page = PAGES[id]
  if (!Page) return null
  return (
    <div className="outletmgr outletmgr--doc">
      <Page />
    </div>
  )
}
