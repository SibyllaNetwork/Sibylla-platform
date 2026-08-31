import React from 'react'
import clsx from 'clsx'
import Skeleton from '../components/Skeleton'
import './CfgPane.sass'

// ─── CFG PANE (guscio del singolo configuratore) ─────────────────────────────
//  Contenitore standard di ogni pane del Configuratore. È L'UNICO posto dove
//  compaiono il breadcrumb (`Configuratore › Gruppo › Voce`) e il titolo del
//  configuratore: i pane NON devono avere breadcrumb o titoli propri.
//
//  Struttura: header (crumbs + titolo + descrizione + slot azioni) · corpo
//  scrollabile · slot save bar sticky in fondo. Con `loading` il corpo mostra
//  uno skeleton (usato dalla shell durante la transizione/fetch).

export interface CfgPaneProps {
  /** Trail del breadcrumb PRIMA della voce corrente, es. ['Configuratore', 'Regole di vendita']. */
  trail: string[]
  /** Click su un elemento del trail (index nell'array) — es. 0 → torna all'hub. */
  onTrail?: (index: number) => void
  /** Nome della voce corrente (unico titolo del pane). */
  title: string
  /** Una riga: cosa configura questa voce. */
  description?: string
  /** Nome icona Font Awesome (senza prefisso). */
  icon?: string
  /** Azioni dell'header, allineate a destra (export, "+ Nuovo", …). */
  actions?: React.ReactNode
  /** Slot per la CfgSaveBar (sticky in fondo al pane). */
  saveBar?: React.ReactNode
  /** true = corpo in skeleton (transizione / fetch). */
  loading?: boolean
  children?: React.ReactNode
  className?: string
}

export default function CfgPane({
  trail, onTrail, title, description, icon, actions, saveBar, loading = false, children, className,
}: CfgPaneProps) {
  return (
    <section className={clsx('cfg-pane', className)}>
      <header className="cfg-pane__head">
        <nav className="cfg-pane__crumbs" aria-label="Percorso">
          {trail.map((crumb, i) => (
            <React.Fragment key={i}>
              {onTrail ? (
                <button type="button" className="cfg-pane__crumb" onClick={() => onTrail(i)}>
                  {crumb}
                </button>
              ) : (
                <span className="cfg-pane__crumb cfg-pane__crumb--static">{crumb}</span>
              )}
              <i className="fa-light fa-chevron-right cfg-pane__crumb-sep" aria-hidden="true" />
            </React.Fragment>
          ))}
          <span className="cfg-pane__crumb cfg-pane__crumb--current" aria-current="page">{title}</span>
        </nav>

        <div className="cfg-pane__title-row">
          {icon && (
            <span className="cfg-pane__icon" aria-hidden="true">
              <i className={`fa-light fa-${icon}`} />
            </span>
          )}
          <div className="cfg-pane__titles">
            <h2 className="cfg-pane__title">{title}</h2>
            {description && <p className="cfg-pane__desc">{description}</p>}
          </div>
          {actions && <div className="cfg-pane__actions">{actions}</div>}
        </div>
      </header>

      <div className="cfg-pane__body">
        {loading ? <CfgPaneSkeleton /> : children}
      </div>

      {saveBar}
    </section>
  )
}

// Skeleton del corpo: una riga filtri + un blocco tabella, quanto basta a
// tenere l'impianto stabile durante la transizione tra le voci.
function CfgPaneSkeleton() {
  return (
    <div className="cfg-pane__skeleton" aria-hidden="true">
      <div className="cfg-pane__skeleton-row">
        <Skeleton variant="rect" width={180} height={34} />
        <Skeleton variant="rect" width={180} height={34} />
      </div>
      <Skeleton variant="rect" width="100%" height={200} />
    </div>
  )
}
