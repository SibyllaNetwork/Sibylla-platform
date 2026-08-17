import React from 'react'
import clsx from 'clsx'
import Tooltip from '../components/Tooltip'
import DeltaBadge from './DeltaBadge'
import Sparkline from './Sparkline'
import { useCountUp } from './useCountUp'
import { series as seriesColor } from './chartTheme'
import './KpiTile.sass'

// ─── KPI TILE ───────────────────────────────────────────────────────────────────
//  Riquadro indicatore della fascia in cima alle pagine BI: etichetta, valore
//  grande (contato in animazione), variazione di stato e micro-andamento.
//  NON è la vecchia "riga di stat-card" vietata dalle regole: porta valore +
//  variazione + serie storica, ed è ammessa nelle sole pagine BI (regole_ui.md §13).

export interface KpiTileProps {
  label: string
  /** Valore numerico: viene animato da 0 e formattato con `format`. */
  value: number
  format: (n: number) => string
  /** Variazione rispetto al riferimento (YoY, budget…). */
  delta?: number
  /** Testo della variazione se diverso dal default (es. '+3,1 pt YoY'). */
  deltaLabel?: string
  /** Metrica dove salire è peggio (costi, cancellazioni). */
  invertDelta?: boolean
  /** Serie per il micro-andamento. */
  spark?: number[]
  /** Indice dello slot categoriale usato dall'icona e dalla sparkline. */
  slot?: number
  icon?: string
  /** Testo della tooltip informativa (come si calcola, su cosa è confrontato). */
  info?: string
  /** Posizione nella fila: sfasa ingresso e animazioni. */
  index?: number
  className?: string
}

export default function KpiTile({
  label, value, format, delta, deltaLabel, invertDelta, spark,
  slot = 0, icon, info, index = 0, className,
}: KpiTileProps) {
  const shown = useCountUp(value)
  const color = seriesColor(slot)

  // Posizione del valore dentro il proprio minimo-massimo di periodo: dice se il
  // numero che stai leggendo è alto o basso PER TE, non solo quanto vale.
  // Sostituisce la vecchia banda colorata decorativa con un'informazione.
  const range = React.useMemo(() => {
    if (!spark || spark.length < 3) return null
    const min = Math.min(...spark)
    const max = Math.max(...spark)
    if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return null
    const ultimo = spark[spark.length - 1]
    const pos = Math.max(0, Math.min(100, ((ultimo - min) / (max - min)) * 100))
    return { min, max, pos }
  }, [spark])

  return (
    <div
      className={clsx('kpi-tile', className)}
      /* --kpi-c = colore dello slot categoriale, --kpi-i = posizione per lo
         sfasamento dell'animazione d'ingresso (valori runtime, non stili) */
      style={{ ['--kpi-c' as any]: color, ['--kpi-i' as any]: index }}
    >
      <div className="kpi-tile__head">
        {icon && (
          <span className="kpi-tile__ico">
            <i className={`fa-solid ${icon}`} aria-hidden="true" />
          </span>
        )}
        <span className="kpi-tile__label">{label}</span>
        {info && (
          <Tooltip text={info}>
            <i className="fa-solid fa-circle-info kpi-tile__info" aria-hidden="true" />
          </Tooltip>
        )}
      </div>

      <div className="kpi-tile__body">
        <div className="kpi-tile__figures">
          <span className="kpi-tile__val">{format(shown)}</span>
          {delta !== undefined && (
            <DeltaBadge value={delta} label={deltaLabel} invert={invertDelta} size="sm" />
          )}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline
            values={spark}
            color={color}
            height={38}
            delay={index * 90}
            className="kpi-tile__spark"
          />
        )}
      </div>

      {range && (
        <div
          className="kpi-tile__range"
          /* --kpi-pos = posizione del valore corrente nel proprio intervallo */
          style={{ ['--kpi-pos' as any]: `${range.pos}%` }}
        >
          <span className="kpi-tile__range-track">
            <span className="kpi-tile__range-mark" />
          </span>
          <span className="kpi-tile__range-legend">
            <span>min {format(range.min)}</span>
            <span>max {format(range.max)}</span>
          </span>
        </div>
      )}
    </div>
  )
}
