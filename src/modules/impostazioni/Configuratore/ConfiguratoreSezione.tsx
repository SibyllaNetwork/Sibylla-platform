import React from 'react'
import clsx from 'clsx'
import { withAcronimi } from '../../../core/components/Acronimo'
import CfgBadge from '../../../core/cfg/CfgBadge'
import type { CfgDisplayStatus } from '../../../store/useConfiguratoreStore'
import type { ConfiguratoreDef, ConfiguratoreId } from './registry'
import './ConfiguratoreSezione.sass'

// ─── CONFIGURATORE DI SEZIONE (es. Human Resources › Configurazione) ─────────
//  Le voci di UN gruppo del registry impaginate come una pagina normale della
//  sezione: niente hub, sidebar né card del Configuratore di Impostazioni. Le
//  voci sono schede in alto; sotto, descrizione della voce e contenuto del pane.

export interface ConfiguratoreSezioneProps {
  items: { def: ConfiguratoreDef; status: CfgDisplayStatus }[]
  activeId: ConfiguratoreId
  onSelect: (id: ConfiguratoreId) => void
  children: React.ReactNode
}

export default function ConfiguratoreSezione({ items, activeId, onSelect, children }: ConfiguratoreSezioneProps) {
  const active = items.find(i => i.def.id === activeId)?.def
  return (
    <div className="cfg-sezione">
      <nav className="cfg-sezione__tabs" role="tablist" aria-label="Voci di configurazione">
        {items.map(({ def, status }) => (
          <button
            key={def.id}
            type="button"
            role="tab"
            aria-selected={def.id === activeId}
            className={clsx('cfg-sezione__tab', def.id === activeId && 'is-active')}
            onClick={() => onSelect(def.id)}
          >
            <i className={`fa-light fa-${def.icon}`} aria-hidden="true" />
            <span>{def.label}</span>
            {status !== 'configured' && <CfgBadge status={status} compact />}
          </button>
        ))}
      </nav>
      {active && <p className="cfg-sezione__desc">{withAcronimi(active.description)}</p>}
      <div className="cfg-sezione__body" key={activeId}>{children}</div>
    </div>
  )
}
