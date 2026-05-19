import React, { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import './PageToolbar.css'

export type ViewMode = 'grid' | 'list'

interface SearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

interface PageToolbarProps {
  search?: SearchProps
  view: ViewMode
  onViewChange: (view: ViewMode) => void
  filterPanel?: ReactNode
  filtersDirty?: boolean
  onResetFilters?: () => void
  /** Azioni pagina renderizzate accanto ai Filtri (es. "Crea prodotto"). */
  extraActions?: ReactNode
}

export function PageToolbar({
  search, view, onViewChange, filtersDirty = false, onResetFilters, filterPanel, extraActions,
}: PageToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filtersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!filtersOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) setFiltersOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFiltersOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [filtersOpen])

  return (
    <div className="page-toolbar">
      {search && (
        <div className="page-toolbar__search">
          <Icon family="regular" name="magnifying-glass" className="page-toolbar__search-icon" />
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? 'Cerca…'}
            className="sib-input page-toolbar__search-input"
          />
        </div>
      )}

      <div className="page-toolbar__actions">
        {extraActions}
        {filterPanel !== undefined && (
          <div className="page-toolbar__filters" ref={filtersRef}>
            <button
              type="button"
              className="sib-btn sib-btn--secondary"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              aria-haspopup="dialog"
            >
              <Icon family="regular" name="sliders" />
              Filtri
              {filtersDirty && <span className="page-toolbar__filters-dot" aria-hidden="true" />}
            </button>

            {filtersOpen && (
              <div className="page-toolbar__filters-panel" role="dialog" aria-label="Filtri">
                {filterPanel}
                <div className="page-toolbar__filters-footer">
                  <button type="button" className="page-toolbar__filters-reset" onClick={onResetFilters} disabled={!filtersDirty}>
                    Ripristina
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="page-toolbar__view-switch" role="group" aria-label="Modalità di visualizzazione">
          <button
            type="button"
            className={`page-toolbar__view-btn${view === 'grid' ? ' page-toolbar__view-btn--active' : ''}`}
            onClick={() => onViewChange('grid')}
            aria-pressed={view === 'grid'}
            aria-label="Vista a griglia"
          >
            <Icon family="regular" name="grid-2" />
          </button>
          <button
            type="button"
            className={`page-toolbar__view-btn${view === 'list' ? ' page-toolbar__view-btn--active' : ''}`}
            onClick={() => onViewChange('list')}
            aria-pressed={view === 'list'}
            aria-label="Vista a lista"
          >
            <Icon family="regular" name="list" />
          </button>
        </div>
      </div>
    </div>
  )
}
