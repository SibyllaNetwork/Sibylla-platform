import React from 'react'

const CFG: Record<string, { color: string; label: string; pct: number }> = {
  'very-high': { color: '#EF5350', label: 'VERY HIGH', pct: 0.95 },
  'high':      { color: '#FF7043', label: 'HIGH',      pct: 0.70 },
  'medium':    { color: '#FFC107', label: 'MEDIUM',    pct: 0.50 },
  'low':       { color: '#66BB6A', label: 'LOW',       pct: 0.30 },
  'very-low':  { color: '#42A5F5', label: 'VERY LOW',  pct: 0.08 },
}

const GaugeArc = ({ level }: { level: string }) => {
  const { color, label, pct } = CFG[level] || CFG['medium']
  const cx = 18, cy = 18, r = 13
  const θ  = Math.PI * (1 - pct)
  const ex = +(cx + r * Math.cos(θ)).toFixed(2)
  const ey = +(cy - r * Math.sin(θ)).toFixed(2)

  return (
    <div className="gauge-arc">
      <svg width={38} height={20} viewBox="0 0 38 20">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
          fill="none" stroke="#E8EAED" strokeWidth="3.5" strokeLinecap="round"
        />
        {pct > 0.02 && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${ex} ${ey}`}
            fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round"
          />
        )}
      </svg>
      <span className="gauge-arc__label" style={{ color }}>
        {label}
      </span>
    </div>
  )
}

export default GaugeArc
