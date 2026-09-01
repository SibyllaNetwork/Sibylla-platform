import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import Tooltip from '../../../core/components/Tooltip'
import CfgBadge, { CFG_STATUS_HINTS, CFG_STATUS_LABELS } from '../../../core/cfg/CfgBadge'
import { withAcronimi } from '../../../core/components/Acronimo'
import type { CfgDisplayStatus } from '../../../store/useConfiguratoreStore'
import type { CfgGroup, ConfiguratoreDef, ConfiguratoreId, CfgGroupId } from './registry'
import './ConfiguratoreSidebar.sass'

// ─── SIDEBAR A GRUPPI (Configuratore) ────────────────────────────────────────
//  Navigazione contestuale dentro il Configuratore: le 7 corsie tematiche come
//  gruppi collassabili (il gruppo attivo resta aperto), con conteggio
//  configurati/totale, badge di stato per voce e voci bloccate riconoscibili.
//  L'indicatore della voce attiva SCORRE tra le voci (animazione di layout via
//  custom property --cfgsb-ind-*, non un semplice cambio di sfondo).
//  I simboli di stato (check, pallino, lucchetto, clessidra) sono spiegati da un
//  tooltip standard: qui si vede solo il simbolo, non l'etichetta del badge.

export interface SidebarLane {
  group: CfgGroup
  items: { def: ConfiguratoreDef; status: CfgDisplayStatus }[]
  configured: number
  total: number
}

export interface ConfiguratoreSidebarProps {
  lanes: SidebarLane[]
  activeId: ConfiguratoreId
  onSelect: (id: ConfiguratoreId) => void
  /** Torna all'hub (panoramica delle corsie). */
  onHub: () => void
  /** Apre la command palette (clic sulla search / ⌘K). */
  onOpenPalette: () => void
}

/** Titolo + spiegazione del simbolo di stato mostrato sulla voce. */
function statusTip(status: CfgDisplayStatus, def: ConfiguratoreDef) {
  const hint = status === 'locked' && def.requires
    ? def.requires.reason
    : CFG_STATUS_HINTS[status]
  return (
    <span className="cfgsb__tip">
      <strong className="cfgsb__tip-title">{CFG_STATUS_LABELS[status]}</strong>
      <span className="cfgsb__tip-text">{hint}</span>
    </span>
  )
}

export default function ConfiguratoreSidebar({
  lanes, activeId, onSelect, onHub, onOpenPalette,
}: ConfiguratoreSidebarProps) {
  const activeGroup = lanes.find(l => l.items.some(i => i.def.id === activeId))?.group.id ?? null
  const [openGroups, setOpenGroups] = useState<Set<CfgGroupId>>(
    () => new Set(activeGroup ? [activeGroup] : []),
  )
  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<Partial<Record<string, HTMLButtonElement | null>>>({})

  // Il gruppo della voce attiva resta sempre aperto.
  useEffect(() => {
    if (!activeGroup) return
    setOpenGroups(prev => {
      if (prev.has(activeGroup)) return prev
      const next = new Set(prev)
      next.add(activeGroup)
      return next
    })
  }, [activeGroup])

  const toggleGroup = (gid: CfgGroupId) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(gid)) next.delete(gid)
      else next.add(gid)
      return next
    })
  }

  // Indicatore che scorre: posizione/altezza della voce attiva → custom
  // properties sul nav (il .sass le usa e le anima). Con il gruppo attivo
  // chiuso l'indicatore si spegne (--cfgsb-ind-o: 0).
  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const el = itemRefs.current[activeId]
    const visible = !!el && !!activeGroup && openGroups.has(activeGroup)
    const apply = () => {
      if (visible && el) {
        const navBox = nav.getBoundingClientRect()
        const box = el.getBoundingClientRect()
        nav.style.setProperty('--cfgsb-ind-y', `${box.top - navBox.top + nav.scrollTop}px`)
        nav.style.setProperty('--cfgsb-ind-h', `${box.height}px`)
        nav.style.setProperty('--cfgsb-ind-o', '1')
      } else {
        nav.style.setProperty('--cfgsb-ind-o', '0')
      }
    }
    // Due misure: subito e a fine transizione di apertura/chiusura dei gruppi.
    apply()
    const t = setTimeout(apply, 280)
    return () => clearTimeout(t)
  }, [activeId, openGroups, lanes, activeGroup])

  return (
    <aside className="cfgsb">
      <div className="cfgsb__head">
        <button type="button" className="cfgsb__search" onClick={onOpenPalette}>
          <i className="fa-light fa-magnifying-glass" aria-hidden="true" />
          <span className="cfgsb__search-label">Cerca configuratore…</span>
          <kbd className="cfgsb__kbd">⌘K</kbd>
        </button>

        <button type="button" className="cfgsb__hub-link" onClick={onHub}>
          <i className="fa-light fa-grid-2" aria-hidden="true" />
          <span>Panoramica</span>
        </button>
      </div>

      <nav ref={navRef} className="cfgsb__nav" aria-label="Configuratori">
        <span className="cfgsb__indicator" aria-hidden="true" />

        {lanes.map(lane => {
          const open = openGroups.has(lane.group.id)
          return (
            <div key={lane.group.id} className={clsx('cfgsb__group', open && 'cfgsb__group--open')}>
              <button
                type="button"
                className="cfgsb__group-head"
                onClick={() => toggleGroup(lane.group.id)}
                aria-expanded={open}
              >
                <i className={`fa-light fa-${lane.group.icon} cfgsb__group-icon`} aria-hidden="true" />
                <span className="cfgsb__group-label">{lane.group.label}</span>
                <span className="cfgsb__group-count-tip">
                  <Tooltip
                    position="right"
                    content={(
                      <span className="cfgsb__tip">
                        <strong className="cfgsb__tip-title">{lane.configured} di {lane.total} configurati</strong>
                        <span className="cfgsb__tip-text">
                          Voci con impostazioni complete in questa corsia.
                        </span>
                      </span>
                    )}
                  >
                    <span className="cfgsb__group-count">{lane.configured}/{lane.total}</span>
                  </Tooltip>
                </span>
                <i className="fa-light fa-chevron-down cfgsb__group-chev" aria-hidden="true" />
              </button>

              <div className="cfgsb__group-body">
                <div className="cfgsb__group-items">
                  {lane.items.map(({ def, status }) => (
                    <button
                      key={def.id}
                      ref={el => { itemRefs.current[def.id] = el }}
                      type="button"
                      className={clsx(
                        'cfgsb__item',
                        def.id === activeId && 'cfgsb__item--active',
                        status === 'locked' && 'cfgsb__item--locked',
                        status === 'soon' && 'cfgsb__item--soon',
                      )}
                      onClick={() => onSelect(def.id)}
                      aria-current={def.id === activeId ? 'page' : undefined}
                    >
                      <i className={`fa-light fa-${def.icon} cfgsb__item-icon`} aria-hidden="true" />
                      <span className="cfgsb__item-label">{withAcronimi(def.label)}</span>
                      <span className="cfgsb__item-badge-tip">
                        <Tooltip position="right" content={statusTip(status, def)}>
                          <CfgBadge status={status} compact className="cfgsb__item-badge" />
                        </Tooltip>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
