import React from 'react'
import './AreaTrend.sass'

export interface SeriesPoint { x: string; y: number }

interface AreaTrendProps {
  /** Serie principale (riempita ad area). */
  primary: SeriesPoint[]
  /** Serie comparativa (linea). */
  secondary?: SeriesPoint[]
  /** Etichetta serie primaria. */
  primaryLabel: string
  /** Etichetta serie secondaria. */
  secondaryLabel?: string
  /** Colore serie primaria. */
  primaryColor?: string
  /** Colore serie secondaria. */
  secondaryColor?: string
  height?: number
}

export function AreaTrend({
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  primaryColor = '#5C9CD4',
  secondaryColor = '#204769',
  height = 260,
}: AreaTrendProps) {
  const W = 1000
  const H = height
  const PAD_L = 56
  const PAD_R = 24
  const PAD_T = 16
  const PAD_B = 32
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const allY = [...primary.map((p) => p.y), ...(secondary?.map((p) => p.y) ?? [0])]
  const maxY = Math.max(...allY, 1)
  const yTicks = 4

  const len = primary.length
  const xPos = (i: number) => PAD_L + (len <= 1 ? innerW / 2 : (i / (len - 1)) * innerW)
  const yPos = (v: number) => PAD_T + innerH - (v / maxY) * innerH

  const buildPath = (pts: SeriesPoint[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(p.y)}`).join(' ')

  const areaPath =
    primary.length === 0
      ? ''
      : `${buildPath(primary)} L ${xPos(len - 1)} ${PAD_T + innerH} L ${xPos(0)} ${PAD_T + innerH} Z`

  // Decide quanti X labels mostrare (ogni 2 punti se molti)
  const xLabelStep = len > 16 ? Math.ceil(len / 14) : 1

  return (
    <div className="area-trend">
      <div className="area-trend__legend">
        <span className="area-trend__legend-item">
          <span className="area-trend__legend-dot" style={{ background: primaryColor }} />
          {primaryLabel}
        </span>
        {secondary && (
          <span className="area-trend__legend-item">
            <span className="area-trend__legend-dot" style={{ background: secondaryColor }} />
            {secondaryLabel ?? ''}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="area-trend__svg"
        style={{ height }}
      >
        {/* Y grid + labels */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = (maxY / yTicks) * i
          const y = yPos(v)
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#E0E7EE" strokeWidth={1} />
              <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#888">
                {v >= 1000 ? `${Math.round(v / 1000)}K €` : `${v.toFixed(0)} €`}
              </text>
            </g>
          )
        })}

        {/* Area primary */}
        {primary.length > 0 && (
          <>
            <path d={areaPath} fill={primaryColor} fillOpacity={0.18} />
            <path d={buildPath(primary)} fill="none" stroke={primaryColor} strokeWidth={2} />
            {primary.map((p, i) => (
              <circle key={`p-${i}`} cx={xPos(i)} cy={yPos(p.y)} r={3} fill={primaryColor} />
            ))}
          </>
        )}

        {/* Secondary line */}
        {secondary && secondary.length > 0 && (
          <>
            <path d={buildPath(secondary)} fill="none" stroke={secondaryColor} strokeWidth={2} strokeDasharray="0" />
            {secondary.map((p, i) => (
              <circle key={`s-${i}`} cx={xPos(i)} cy={yPos(p.y)} r={3} fill={secondaryColor} />
            ))}
          </>
        )}

        {/* X labels */}
        {primary.map((p, i) => {
          if (i % xLabelStep !== 0) return null
          return (
            <text
              key={`xl-${i}`}
              x={xPos(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#888"
            >
              {p.x}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
