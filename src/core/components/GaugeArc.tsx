import React from 'react'

// Indicatore a barra orizzontale a 3 livelli: Basso / Medio / Alto.
// Usato per Market demand e Occupancy nell'Analisi della distribuzione.
const CFG: Record<string, { label: string; pct: number }> = {
  'basso': { label: 'Basso', pct: 0.34 },
  'medio': { label: 'Medio', pct: 0.67 },
  'alto':  { label: 'Alto',  pct: 1 },
}

const GaugeArc = ({ level }: { level: string }) => {
  const lv = CFG[level] ? level : 'medio'
  const cfg = CFG[lv]
  return (
    <div className={`gauge-bar gauge-bar--${lv}`} style={{ ['--w' as any]: `${Math.round(cfg.pct * 100)}%` }}>
      <span className="gauge-bar__track"><span className="gauge-bar__fill" /></span>
      <span className="gauge-bar__label">{cfg.label}</span>
    </div>
  )
}

export default GaugeArc
