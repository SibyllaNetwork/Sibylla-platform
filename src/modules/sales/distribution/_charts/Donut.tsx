import React from 'react'
import './Donut.sass'

export interface DonutSlice {
  label: string
  value: number
  color: string
}

interface DonutProps {
  slices: DonutSlice[]
  /** Etichetta principale al centro del donut. */
  centerLabel?: string
  centerValue?: string
  /** Etichetta secondaria sotto il valore principale. */
  centerSubLabel?: string
  centerSubValue?: string
  /** Lato del SVG in px. */
  size?: number
  /** Spessore dell'anello (raggio esterno - raggio interno). */
  thickness?: number
}

const TAU = Math.PI * 2

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number): string {
  const sweep = end - start
  const large = sweep > Math.PI ? 1 : 0
  const x1 = cx + rOuter * Math.cos(start)
  const y1 = cy + rOuter * Math.sin(start)
  const x2 = cx + rOuter * Math.cos(end)
  const y2 = cy + rOuter * Math.sin(end)
  const x3 = cx + rInner * Math.cos(end)
  const y3 = cy + rInner * Math.sin(end)
  const x4 = cx + rInner * Math.cos(start)
  const y4 = cy + rInner * Math.sin(start)
  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ')
}

export function Donut({ slices, centerLabel, centerValue, centerSubLabel, centerSubValue, size = 240, thickness = 44 }: DonutProps) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0)
  const cx = size / 2
  const cy = size / 2
  const rOuter = size / 2 - 6
  const rInner = rOuter - thickness

  let cursor = -Math.PI / 2 // start at top

  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut__svg">
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={(rOuter + rInner) / 2} fill="none" stroke="#E0E7EE" strokeWidth={thickness} />
        ) : slices.map((s, i) => {
          const sweep = (Math.max(0, s.value) / total) * TAU
          const start = cursor
          const end = cursor + sweep
          cursor = end
          if (sweep === 0) return null
          return <path key={i} d={arcPath(cx, cy, rOuter, rInner, start, end)} fill={s.color} />
        })}
      </svg>

      {(centerLabel || centerValue) && (
        <div className="donut__center">
          {centerLabel && <div className="donut__center-label">{centerLabel}</div>}
          {centerValue && <div className="donut__center-value">{centerValue}</div>}
          {centerSubLabel && <div className="donut__center-sublabel">{centerSubLabel}</div>}
          {centerSubValue && <div className="donut__center-subvalue">{centerSubValue}</div>}
        </div>
      )}
    </div>
  )
}

export function DonutLegend({ slices, total }: { slices: DonutSlice[]; total: number }) {
  return (
    <div className="donut-legend">
      {slices.map((s, i) => {
        const pct = total > 0 ? ((Math.max(0, s.value) / total) * 100) : 0
        return (
          <span key={i} className="donut-legend__item">
            <span className="donut-legend__dot donut-legend__dot--dyn" style={{ '--legend-dot-bg': s.color } as React.CSSProperties} />
            <span className="donut-legend__label">{s.label}</span>
            <span className="donut-legend__pct">{pct.toFixed(2).replace('.', ',')}%</span>
          </span>
        )
      })}
    </div>
  )
}
