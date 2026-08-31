import React from 'react'
import clsx from 'clsx'
import Tooltip from '../../../core/components/Tooltip'
import CfgBadge from '../../../core/cfg/CfgBadge'
import {
  nextStepAmong,
  type CfgCompletion,
  type CfgDisplayStatus,
} from '../../../store/useConfiguratoreStore'
import type { ConfiguratoreId } from './registry'
import type { SidebarLane } from './ConfiguratoreSidebar'
import './ConfiguratoreHub.sass'

// ─── HUB D'INGRESSO (Configuratore) ──────────────────────────────────────────
//  Pagina d'apertura della sezione: le 7 corsie tematiche come card, ognuna
//  con la progressione (n configurati / n totali), le voci come pill con lo
//  stato (check verde / dot warning / lucchetto con motivo nel tooltip) e la
//  CTA "Riprendi da…" sul prossimo passo suggerito della corsia.
//  NIENTE riga di stat-card in cima: la progressione vive dentro le card.

export interface ConfiguratoreHubProps {
  lanes: SidebarLane[]
  completion: Record<string, CfgCompletion>
  onOpen: (id: ConfiguratoreId) => void
  onOpenPalette: () => void
}

const STATUS_ICONS: Record<CfgDisplayStatus, string> = {
  configured: 'fa-solid fa-check',
  partial:    'fa-solid fa-circle-half-stroke',
  empty:      'fa-regular fa-circle',
  locked:     'fa-solid fa-lock',
  soon:       'fa-solid fa-hourglass-half',
}

export default function ConfiguratoreHub({ lanes, completion, onOpen, onOpenPalette }: ConfiguratoreHubProps) {
  return (
    <div className="cfg-hub">
      <div className="cfg-hub__topbar">
        <button type="button" className="cfg-hub__search" onClick={onOpenPalette}>
          <i className="fa-light fa-magnifying-glass" aria-hidden="true" />
          <span>Cerca un configuratore per nome, descrizione o sinonimo…</span>
          <kbd className="cfg-hub__kbd">⌘K</kbd>
        </button>
      </div>

      <div className="cfg-hub__grid">
        {lanes.map((lane, idx) => {
          const next = nextStepAmong(completion, lane.items.map(i => i.def))
          const done = lane.total > 0 && lane.configured === lane.total
          const pct = lane.total > 0 ? Math.round((lane.configured / lane.total) * 100) : 0
          return (
            <section
              key={lane.group.id}
              className="cfg-hub__card"
              /* --cfg-i = posizione nella griglia per lo sfasamento dell'ingresso */
              style={{ ['--cfg-i' as any]: idx, ['--cfg-pct' as any]: `${pct}%` }}
            >
              <header className="cfg-hub__card-head">
                <span className="cfg-hub__card-icon" aria-hidden="true">
                  <i className={`fa-light fa-${lane.group.icon}`} />
                </span>
                <h3 className="cfg-hub__card-title">{lane.group.label}</h3>
                <span className="cfg-hub__card-count">
                  <strong>{lane.configured}</strong>/{lane.total} configurati
                </span>
              </header>

              <div className="cfg-hub__progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <span className="cfg-hub__progress-fill" />
              </div>

              <div className="cfg-hub__pills">
                {lane.items.map(({ def, status }) => {
                  const pill = (
                    <button
                      key={def.id}
                      type="button"
                      className={clsx('cfg-hub__pill', `cfg-hub__pill--${status}`)}
                      onClick={() => onOpen(def.id)}
                    >
                      <i className={clsx(STATUS_ICONS[status], 'cfg-hub__pill-icon')} aria-hidden="true" />
                      <span className="cfg-hub__pill-label">{def.label}</span>
                    </button>
                  )
                  if (status === 'locked' && def.requires) {
                    return (
                      <Tooltip key={def.id} text={def.requires.reason} variant="dark">
                        {pill}
                      </Tooltip>
                    )
                  }
                  if (status === 'soon') {
                    return (
                      <Tooltip key={def.id} text="In arrivo: pane in costruzione" variant="dark">
                        {pill}
                      </Tooltip>
                    )
                  }
                  return pill
                })}
              </div>

              <footer className="cfg-hub__card-foot">
                {done ? (
                  <span className="cfg-hub__done">
                    <i className="fa-solid fa-circle-check" aria-hidden="true" />
                    Corsia completata
                  </span>
                ) : next ? (
                  <button type="button" className="cfg-hub__resume" onClick={() => onOpen(next.id)}>
                    Riprendi da <strong>{next.label}</strong>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="cfg-hub__pending">
                    <CfgBadge status={firstPendingStatus(lane)} compact />
                    In attesa dei prerequisiti o dei pane in arrivo
                  </span>
                )}
              </footer>
            </section>
          )
        })}
      </div>
    </div>
  )
}

// Stato rappresentativo per il footer quando non c'è un passo riprendibile:
// privilegia 'locked' (c'è un prerequisito da completare altrove).
function firstPendingStatus(lane: SidebarLane): CfgDisplayStatus {
  const locked = lane.items.find(i => i.status === 'locked')
  if (locked) return 'locked'
  return 'soon'
}
