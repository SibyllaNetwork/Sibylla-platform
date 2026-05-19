import React from 'react'
import Ico from '../../../core/icons/Ico'
import type { Cliente } from '../types'
import { tipologiaLabel } from '../constants'
import './ClientsSidebar.sass'

interface Props {
  clients: Cliente[]
  selId: number
  search: string
  onSearch: (v: string) => void
  onSelect: (id: number) => void
  onNewClient: () => void
}

export default function ClientsSidebar({ clients, selId, search, onSearch, onSelect, onNewClient }: Props) {
  const filtered = clients.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()))

  return (
    <aside className="csidebar">
      <div className="csidebar__head">
        <div className="csidebar__head-row">
          <div>
            <div className="csidebar__title">Clienti</div>
            <div className="csidebar__subtitle">Strutture configurabili</div>
          </div>
          <div className="csidebar__status-dot" />
        </div>
        <div className="csidebar__search">
          <Ico n="search" s={12} c="var(--color-text-disabled)" />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Cerca cliente..."
            className="sib-search-input"
          />
        </div>
      </div>

      <div className="csidebar__list">
        {filtered.map(c => {
          const active = selId === c.id
          const itemClass = `csidebar__item${active ? ' csidebar__item--active' : ''}`
          const avatarClass = `csidebar__avatar${active ? ' csidebar__avatar--active' : ''}`
          const nameClass = `csidebar__name${active ? ' csidebar__name--active' : ''}`
          const stateClass = `csidebar__state csidebar__state--${c.stato}`
          return (
            <div key={c.id} className={itemClass} onClick={() => onSelect(c.id)}>
              <div className={avatarClass}>{c.nome.slice(0, 2).toUpperCase()}</div>
              <div className="csidebar__meta">
                <div className={nameClass}>{c.nome}</div>
                <div className="csidebar__type">{tipologiaLabel(c)}</div>
              </div>
              <span className={stateClass}>{c.stato}</span>
            </div>
          )
        })}
      </div>

      <div className="csidebar__foot">
        <button className="sib-btn sib-btn--primary csidebar__new" onClick={onNewClient}>
          <Ico n="plus" s={12} c="#fff" />
          Nuovo cliente
        </button>
      </div>
    </aside>
  )
}
