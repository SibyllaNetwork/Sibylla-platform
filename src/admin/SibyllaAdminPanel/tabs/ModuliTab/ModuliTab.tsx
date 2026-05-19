import React from 'react'
import Ico from '../../../../core/icons/Ico'
import type { Cliente, Modulo } from '../../types'
import './ModuliTab.sass'

interface Props {
  client: Cliente
  modules: Modulo[]
  assigned: Set<string>
  enabledCount: number
  onToggleAssign: (moduloId: string) => void
  onCreate: () => void
  onEdit: (m: Modulo) => void
  onDelete: (id: string) => void
}

export default function ModuliTab({
  client, modules, assigned, enabledCount,
  onToggleAssign, onCreate, onEdit, onDelete,
}: Props) {
  return (
    <div className="mod-tab">
      <div className="mod-tab__head">
        <div>
          <div className="mod-tab__title">Moduli configurati</div>
          <div className="mod-tab__sub">{modules.length} moduli disponibili</div>
        </div>
        <button className="sib-btn sib-btn--primary mod-tab__btn-new" onClick={onCreate}>
          <Ico n="plus" s={12} c="#fff" />
          Nuovo modulo
        </button>
      </div>

      {assigned.size > 0 && (
        <div className="mod-tab__assigned">
          <span className="mod-tab__assigned-name">{client.nome}:</span>
          {Array.from(assigned).map(mid => {
            const m = modules.find(x => x.id === mid)
            if (!m) return null
            return (
              <span key={mid} className="mod-tab__chip">
                {m.label}
                <button className="mod-tab__chip-close" onClick={() => onToggleAssign(mid)}>
                  <Ico n="x" s={10} c="var(--color-link)" />
                </button>
              </span>
            )
          })}
          <span className="mod-tab__assigned-count">{enabledCount} pagine abilitate</span>
        </div>
      )}

      <div className="mod-tab__list">
        {modules.map(m => {
          const isAssigned = assigned.has(m.id)
          const cardCls = `mod-tab__card${isAssigned ? ' mod-tab__card--assigned' : ''}`
          const checkCls = `mod-tab__check${isAssigned ? ' mod-tab__check--on' : ''}`
          const labelCls = `mod-tab__name${isAssigned ? ' mod-tab__name--on' : ''}`
          return (
            <div key={m.id} className={cardCls}>
              <div className={checkCls} onClick={() => onToggleAssign(m.id)} role="checkbox" aria-checked={isAssigned}>
                {isAssigned && (
                  <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
                    <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="mod-tab__body">
                <div className="mod-tab__head-row">
                  <span className={labelCls}>{m.label}</span>
                  <span className="mod-tab__pages-badge">{m.pages.length} pagine</span>
                  {isAssigned && <span className="mod-tab__assigned-badge">✓ Assegnato</span>}
                </div>
                <div className="mod-tab__desc">{m.desc || 'Nessuna descrizione'}</div>
              </div>
              <div className="mod-tab__row-actions">
                <button className="mod-tab__icon-btn mod-tab__icon-btn--edit" onClick={() => onEdit(m)} aria-label="Modifica modulo">
                  <Ico n="edit" s={13} c="var(--color-link)" />
                </button>
                <button className="mod-tab__icon-btn mod-tab__icon-btn--del" onClick={() => onDelete(m.id)} aria-label="Elimina modulo">
                  <Ico n="trash" s={13} c="var(--color-error)" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
