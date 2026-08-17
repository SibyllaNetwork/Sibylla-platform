import React from 'react'
import clsx from 'clsx'
import TruncatedText from '../components/TruncatedText'
import BiLegend, { type BiLegendItem } from './BiLegend'
import './ChartCard.sass'

// ─── CHART CARD ─────────────────────────────────────────────────────────────────
//  Contenitore standard di ogni grafico BI: intestazione (titolo, sottotitolo,
//  badge del totale, legenda, azioni), corpo elastico che riempie l'altezza
//  disponibile e piede opzionale.
//  Il corpo ha `min-height: 0`: è ciò che permette ai grafici di stare dentro una
//  griglia a schermo fisso senza generare scroll (regole_ui.md §13).
//  `rail` monta una barra verticale a sinistra (es. tab TREND/DETTAGLIO).

export interface ChartCardProps {
  title: string
  subtitle?: string
  /** Valore di sintesi mostrato come pillola accanto al titolo (es. il totale). */
  badge?: React.ReactNode
  legend?: BiLegendItem[]
  onLegendToggle?: (key: string) => void
  /** Azioni in alto a destra (export, info, cambio vista). */
  actions?: React.ReactNode
  /** Barra verticale a sinistra della card. */
  rail?: React.ReactNode
  footer?: React.ReactNode
  /** Posizione nella griglia: sfasa l'animazione d'ingresso. */
  index?: number
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}

export default function ChartCard({
  title, subtitle, badge, legend, onLegendToggle, actions, rail, footer,
  index = 0, className, bodyClassName, children,
}: ChartCardProps) {
  return (
    <section
      className={clsx('chart-card', rail && 'chart-card--railed', className)}
      /* --cc-i = posizione nella griglia per lo sfasamento dell'ingresso */
      style={{ ['--cc-i' as any]: index }}
    >
      {rail && <div className="chart-card__rail">{rail}</div>}

      <div className="chart-card__inner">
        <header className="chart-card__head">
          <div className="chart-card__titles">
            <h3 className="chart-card__title">
              {/* Titolo e sottotitolo sempre su UNA riga: se non entrano vengono
                  troncati con i puntini e la tooltip mostra il testo completo. */}
              <TruncatedText text={title} className="chart-card__title-txt" />
              {badge && <span className="chart-card__badge">{badge}</span>}
            </h3>
            {subtitle && (
              <p className="chart-card__sub">
                <TruncatedText text={subtitle} />
              </p>
            )}
          </div>
          {legend && legend.length > 1 && (
            <BiLegend items={legend} onToggle={onLegendToggle} className="chart-card__legend" />
          )}
          {actions && <div className="chart-card__actions">{actions}</div>}
        </header>

        <div className={clsx('chart-card__body', bodyClassName)}>{children}</div>

        {footer && <footer className="chart-card__footer">{footer}</footer>}
      </div>
    </section>
  )
}
