import React, { useState, useRef, useEffect } from 'react'
import { useThemeStore, THEMES, Theme } from '../../store/useThemeStore'
import './ThemeSwitcher.sass'

// Swatch-grid di preview per ciascun tema (mostrate come dischi colorati
// nel dropdown). Mantengono la stessa gerarchia: primary / surface / accent.
const PREVIEWS: Record<Theme, { primary: string; surface: string; accent: string; text: string }> = {
  classic:    { primary: '#204769', surface: '#F8FCFF', accent: '#C9A84C', text: '#4A4D53' },
  editorial:  { primary: '#2C2A26', surface: '#FAF7F2', accent: '#C9A84C', text: '#2C2A26' },
  swiss:      { primary: '#0A0A0A', surface: '#FFFFFF', accent: '#FF4D00', text: '#0A0A0A' },
  terracotta: { primary: '#8B3A1F', surface: '#FBF4EB', accent: '#D4923A', text: '#3D2416' },
}

export default function ThemeSwitcher() {
  const theme    = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)

  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const current = PREVIEWS[theme]
  const label   = THEMES.find(t => t.id === theme)?.label ?? theme

  return (
    <div className="theme-switcher" ref={wrapRef}>
      <button
        className="theme-switcher__trigger"
        onClick={() => setOpen(v => !v)}
        title="Cambia aspetto della piattaforma"
      >
        <span className="theme-switcher__swatch-group">
          <span className="theme-switcher__dot" style={{ background: current.primary }} />
          <span className="theme-switcher__dot" style={{ background: current.accent }} />
          <span className="theme-switcher__dot" style={{ background: current.surface, border: '1px solid rgba(255,255,255,0.25)' }} />
        </span>
        <span className="theme-switcher__label">{label}</span>
        <i className={`fa-solid fa-chevron-down theme-switcher__chev${open ? ' theme-switcher__chev--open' : ''}`} />
      </button>

      {open && (
        <div className="theme-switcher__menu">
          <div className="theme-switcher__menu-title">Aspetto piattaforma</div>

          {THEMES.map(t => {
            const p = PREVIEWS[t.id]
            const active = t.id === theme
            return (
              <button
                key={t.id}
                className={`theme-switcher__item${active ? ' theme-switcher__item--active' : ''}`}
                onClick={() => { setTheme(t.id); setOpen(false) }}
              >
                <span className="theme-switcher__item-preview" style={{ background: p.surface }}>
                  <span className="theme-switcher__preview-bar" style={{ background: p.primary }} />
                  <span className="theme-switcher__preview-dot" style={{ background: p.accent }} />
                </span>

                <span className="theme-switcher__item-text">
                  <span className="theme-switcher__item-label">{t.label}</span>
                  <span className="theme-switcher__item-desc">{t.description}</span>
                </span>

                {active && <i className="fa-solid fa-check theme-switcher__check" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
