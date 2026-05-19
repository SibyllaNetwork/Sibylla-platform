import React, { useState, useRef, useEffect } from 'react'
import Ico from '../core/icons/Ico'
import { useViewModeStore, ViewMode } from '../store/useViewModeStore'
import './PreferencesMenu.sass'

interface Option {
  id:          ViewMode
  label:       string
  description: string
}

const OPTIONS: Option[] = [
  { id: 'classic', label: 'Classica', description: 'Una pagina alla volta, navigazione standard.' },
  { id: 'tabs',    label: 'A tab',    description: 'Tab in cima ad ogni pagina per passare velocemente da una sezione all\'altra.' },
]

const C = { normal: 'rgba(255,255,255,0.80)' }

export default function PreferencesMenu() {
  const mode      = useViewModeStore(s => s.mode)
  const setMode   = useViewModeStore(s => s.setMode)
  const clearTabs = useViewModeStore(s => s.clearTabs)

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

  const onSelect = (m: ViewMode) => {
    if (m !== mode) {
      setMode(m)
      if (m === 'classic') clearTabs()
    }
    setOpen(false)
  }

  return (
    <div className="prefs-menu" ref={wrapRef}>
      <button
        className={`prefs-menu__trigger${open ? ' prefs-menu__trigger--open' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Preferenze visualizzazione"
      >
        <Ico n="sliders" s={18} c={C.normal} />
      </button>

      {open && (
        <div className="prefs-menu__dropdown">
          <div className="prefs-menu__title">Preferenze visualizzazione</div>
          <div className="prefs-menu__subtitle">Scegli come mostrare l'applicazione</div>

          {OPTIONS.map(o => {
            const active = o.id === mode
            return (
              <button
                key={o.id}
                className={`prefs-menu__item${active ? ' prefs-menu__item--active' : ''}`}
                onClick={() => onSelect(o.id)}
              >
                <span className={`prefs-menu__preview prefs-menu__preview--${o.id}`}>
                  {o.id === 'tabs' && (
                    <>
                      <span className="prefs-menu__preview-tabs">
                        <span className="prefs-menu__preview-tab prefs-menu__preview-tab--active" />
                        <span className="prefs-menu__preview-tab" />
                        <span className="prefs-menu__preview-tab" />
                      </span>
                      <span className="prefs-menu__preview-page" />
                    </>
                  )}
                  {o.id === 'classic' && (
                    <span className="prefs-menu__preview-page prefs-menu__preview-page--full" />
                  )}
                </span>

                <span className="prefs-menu__item-text">
                  <span className="prefs-menu__item-label">{o.label}</span>
                  <span className="prefs-menu__item-desc">{o.description}</span>
                </span>

                {active && <i className="fa-solid fa-check prefs-menu__check" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
