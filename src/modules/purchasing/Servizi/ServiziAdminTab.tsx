import React, { useState } from 'react'
import GestioneServizi from './GestioneServizi'
import TipiServizioView from './TipiServizioView'
import ConnettoriFornitoriView from './ConnettoriFornitoriView'
import './ServiziAdminTab.sass'

type SubTab = 'servizi' | 'tipi' | 'fornitori'

const SUB_TABS: ReadonlyArray<readonly [SubTab, string, string]> = [
  ['servizi',   'Servizi',              'fa-concierge-bell'],
  ['tipi',      'Tipi di servizio',     'fa-list-check'],
  // Servizi di fornitori terzi importati via API e rivenduti sui nostri canali
  ['fornitori', 'Connettori fornitori', 'fa-plug'],
] as const

export default function ServiziAdminTab() {
  const [subTab, setSubTab] = useState<SubTab>('servizi')

  return (
    <div className="srv-admin-tab">
      <nav className="srv-admin-tab__subtabs" role="tablist">
        {SUB_TABS.map(([id, label, ic]) => {
          const active = subTab === id
          const cls = `srv-admin-tab__subtab${active ? ' srv-admin-tab__subtab--active' : ''}`
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              className={cls}
              onClick={() => setSubTab(id)}
            >
              <i className={`fa-duotone ${ic} srv-admin-tab__subtab-ico`} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="srv-admin-tab__panel">
        {subTab === 'servizi'   && <GestioneServizi embedded />}
        {subTab === 'tipi'      && <TipiServizioView />}
        {subTab === 'fornitori' && <ConnettoriFornitoriView />}
      </div>
    </div>
  )
}
