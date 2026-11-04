import React from 'react'
import './HrColore.sass'

// ─── Colore di reparti e turni (palette --chart-1..8) ────────────────────────

export const HR_COLORI = [1, 2, 3, 4, 5, 6, 7, 8]

export function HrDot({ colore, className = '' }: { colore: number; className?: string }) {
  return <span className={`hrcfg-dot ${className}`} data-col={colore} aria-hidden="true" />
}

export function HrColorPicker({ value, onChange, label = 'Colore' }: { value: number; onChange: (c: number) => void; label?: string }) {
  return (
    <div className="hrcfg-colors">
      <span className="hrcfg-colors__label">{label}</span>
      <div className="hrcfg-colors__list" role="radiogroup" aria-label={label}>
        {HR_COLORI.map(c => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            aria-label={`Colore ${c}`}
            className={`hrcfg-colors__swatch${value === c ? ' is-active' : ''}`}
            data-col={c}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  )
}
