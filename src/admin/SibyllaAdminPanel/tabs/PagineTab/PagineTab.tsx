import React from 'react'
import MenuTree from '../../MenuTree/MenuTree'
import './PagineTab.sass'

interface Props {
  /** Albero del menu con le pagine dei moduli della struttura. */
  items: any[]
  enabled: Set<string>
  enabledCount: number
  totalCount: number
  onTogglePage: (pageId: string) => void
  onToggleGroup: (children: any[]) => void
  onEnableAll: () => void
  onDisableAll: () => void
  onSave: () => void
}

export default function PagineTab({
  items, enabled, enabledCount, totalCount,
  onTogglePage, onToggleGroup, onEnableAll, onDisableAll, onSave,
}: Props) {
  return (
    <div className="pag-tab">
      <div className="pag-tab__head">
        <div>
          <div className="pag-tab__title">Pagine abilitate</div>
          <div className="pag-tab__sub">{enabledCount} pagine abilitate su {totalCount} disponibili</div>
        </div>
        <div className="pag-tab__actions">
          <button className="sib-btn sib-btn--toolbar" onClick={onEnableAll}>Abilita tutto</button>
          <button className="sib-btn sib-btn--danger-outline" onClick={onDisableAll}>Disabilita tutto</button>
        </div>
      </div>

      <div className="pag-tab__tree-wrap">
        <MenuTree
          items={items}
          selected={enabled}
          onTogglePage={onTogglePage}
          onToggleGroup={onToggleGroup}
        />
      </div>

      <div className="pag-tab__foot">
        <button className="sib-btn sib-btn--primary" onClick={onSave}>Salva pagine</button>
      </div>
    </div>
  )
}
