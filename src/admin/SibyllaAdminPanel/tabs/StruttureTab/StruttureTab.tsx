import React, { useState } from 'react'
import StruttureProprieView from './StruttureProprieView'
import ConnettoriPartnerView from './ConnettoriPartnerView'
import './StruttureTabWrapper.sass'

type SubTab = 'proprie' | 'partner'

const SUB_TABS: ReadonlyArray<readonly [SubTab, string, string, string]> = [
  ['proprie', 'Strutture proprie',   'fa-building',  'Anagrafica delle strutture pubblicate direttamente sui canali Sibylla'],
  ['partner', 'Connettori partner',  'fa-plug',      'Integrazioni API con OTA, channel manager e wholesaler esterni'],
] as const

export default function StruttureTab() {
  const [subTab, setSubTab] = useState<SubTab>('proprie')

  return (
    <div className="strutt-tab-wrap">
      <nav className="strutt-tab-wrap__subtabs" role="tablist">
        {SUB_TABS.map(([id, label, ic, hint]) => {
          const active = subTab === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              className={`strutt-tab-wrap__subtab${active ? ' strutt-tab-wrap__subtab--active' : ''}`}
              onClick={() => setSubTab(id)}
              title={hint}
            >
              <i className={`fa-duotone ${ic} strutt-tab-wrap__subtab-ico`} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="strutt-tab-wrap__panel">
        {subTab === 'proprie' && <StruttureProprieView />}
        {subTab === 'partner' && <ConnettoriPartnerView />}
      </div>
    </div>
  )
}
