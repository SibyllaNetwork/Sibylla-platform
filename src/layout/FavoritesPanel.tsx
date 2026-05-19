import React, { useState, useRef, useEffect } from 'react'
import T from '../core/tokens'
import Ico from '../core/icons/Ico'
import MenuIco from '../core/icons/MenuIco'
import MENU from '../navigation/menu'
import { findByPage } from '../navigation/menuHelpers'
import './favorites.sass'

interface Props {
  favorites: string[]
  onToggle:  (pageId: string) => void
  onClose:   () => void
}

// Raccoglie tutti i nodi foglia (con page) da un sottoalbero
function getLeaves(items: any[]): any[] {
  const r: any[] = []
  for (const it of items) {
    if (it.page) r.push(it)
    if (it.children) r.push(...getLeaves(it.children))
  }
  return r
}

// Filtra foglie per query
function filterLeaves(items: any[], q: string): any[] {
  return getLeaves(items).filter(l =>
    l.label.toLowerCase().includes(q.toLowerCase())
  )
}

export default function FavoritesPanel({ favorites, onToggle, onClose }: Props) {
  const [query,      setQuery]      = useState('')
  const [openSec,    setOpenSec]    = useState<Set<string>>(new Set(['impresa']))
  const [openMod,    setOpenMod]    = useState<Set<string>>(new Set())
  const ref     = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Chiudi cliccando fuori
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  // Apri tutte le sezioni quando si cerca
  useEffect(() => {
    if (query) {
      setOpenSec(new Set(MENU.map(s => s.id)))
      setOpenMod(new Set(
        MENU.flatMap(s => (s.children || []).map((c: any) => c.id))
      ))
    }
  }, [query])

  const toggleSec = (id: string) => setOpenSec(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })
  const toggleMod = (id: string) => setOpenMod(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  // Renderizza la lista filtrata quando c'è una query
  const renderFiltered = () => {
    const all = filterLeaves(MENU, query)
    if (all.length === 0) return (
      <div className="fav-panel__no-results">
        Nessuna pagina trovata per "<strong>{query}</strong>"
      </div>
    )
    return all.map(leaf => (
      <PageRow key={leaf.page} item={leaf} favorites={favorites} onToggle={onToggle} indent={14} />
    ))
  }

  // Renderizza la lista gerarchica completa
  const renderHierarchy = () =>
    MENU.map(section => {
      const children = section.children || []
      const allLeaves = section.page ? [section] : getLeaves(children)
      if (allLeaves.length === 0 && !section.page) return null
      const isOpen = openSec.has(section.id)
      const favCount = allLeaves.filter(l => favorites.includes(l.page)).length

      return (
        <div key={section.id}>
          <button className="fav-panel__section-btn" onClick={() => toggleSec(section.id)}>
            <span className="fav-panel__section-label">
              {section.label}
              {favCount > 0 && (
                <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: T.blue,
                  background: T.blue + '18', borderRadius: 8, padding: '1px 6px' }}>
                  {favCount}
                </span>
              )}
            </span>
            <span className={`fav-panel__section-chevron ${isOpen ? 'fav-panel__section-chevron--open' : ''}`}>
              <Ico n="chevd" s={12} c={T.textDisabled} />
            </span>
          </button>

          {isOpen && (
            <div>
              {/* Pagina diretta della sezione (es. Home) */}
              {section.page && (
                <PageRow item={section} favorites={favorites} onToggle={onToggle} indent={14} />
              )}
              {/* Moduli figli */}
              {children.map((mod: any) => {
                const modLeaves = getLeaves(mod.children || (mod.page ? [mod] : []))
                const isModOpen = openMod.has(mod.id)
                const modFavCount = modLeaves.filter(l => favorites.includes(l.page)).length

                if (mod.page) {
                  return <PageRow key={mod.id} item={mod} favorites={favorites} onToggle={onToggle} indent={24} />
                }

                return (
                  <div key={mod.id}>
                    <button className="fav-panel__module-btn" onClick={() => toggleMod(mod.id)}>
                      <MenuIco id={mod.id} s={12} c={T.primary} />
                      <span className="fav-panel__module-label">
                        {mod.label}
                        {modFavCount > 0 && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: T.blue,
                            background: T.blue + '18', borderRadius: 8, padding: '1px 5px', fontWeight: 700 }}>
                            {modFavCount}
                          </span>
                        )}
                      </span>
                      <span className={`fav-panel__module-chevron ${isModOpen ? 'fav-panel__module-chevron--open' : ''}`}>
                        <Ico n="chevd" s={11} c={T.textDisabled} />
                      </span>
                    </button>
                    {isModOpen && modLeaves.map(leaf => (
                      <PageRow key={leaf.page} item={leaf} favorites={favorites} onToggle={onToggle} indent={36} />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    })

  return (
    <div ref={ref} className="fav-panel">

      {/* ── Header ── */}
      <div className="fav-panel__header">
        <h3 className="fav-panel__title">
          I miei preferiti
          {favorites.length > 0 && (
            <span className="fav-panel__count">{favorites.length}</span>
          )}
        </h3>
        <button className="fav-panel__close" onClick={onClose}>
          <Ico n="x" s={15} c={T.textDisabled} />
        </button>
      </div>

      {/* ── Chips preferiti attivi ── */}
      <div className="fav-panel__active">
        <div className="fav-panel__active-label">Preferiti attivi</div>
        <div className="fav-panel__chips">
          {favorites.length === 0 ? (
            <span className="fav-panel__empty-chips">Nessun preferito — aggiungi con ★</span>
          ) : favorites.map(pageId => {
            const item = findByPage(MENU, pageId)
            if (!item) return null
            return (
              <div key={pageId} className="fav-panel__chip">
                <MenuIco id={item.id} s={10} c={T.primary} />
                <span className="fav-panel__chip-label" title={item.label}>{item.label}</span>
                <button className="fav-panel__chip-remove" onClick={() => onToggle(pageId)}>
                  <Ico n="x" s={10} c="currentColor" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Ricerca ── */}
      <div className="fav-panel__search">
        <Ico n="search" s={13} c={T.textDisabled} />
        <input
          ref={inputRef}
          className="sib-search-input"
          placeholder="Cerca pagina..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <Ico n="x" s={11} c={T.textDisabled} />
          </button>
        )}
      </div>

      {/* ── Lista ── */}
      <div className="fav-panel__list">
        {query ? renderFiltered() : renderHierarchy()}
      </div>

      {/* ── Footer ── */}
      <div className="fav-panel__footer">
        Clicca ★ per aggiungere o rimuovere dai preferiti
      </div>

    </div>
  )
}

// ── Componente riga pagina ────────────────────────────────────────────────────
function PageRow({ item, favorites, onToggle, indent }: {
  item:      any
  favorites: string[]
  onToggle:  (p: string) => void
  indent:    number
}) {
  const isFav = favorites.includes(item.page)
  return (
    <div
      className={`fav-panel__page ${isFav ? 'fav-panel__page--active' : ''}`}
      style={{ paddingLeft: indent }}
      onClick={() => onToggle(item.page)}
    >
      <MenuIco id={item.id} s={12} c={isFav ? T.primary : T.textDisabled} />
      <span className="fav-panel__page-label">{item.label}</span>
      <button className="fav-panel__star" onClick={e => { e.stopPropagation(); onToggle(item.page) }}>
        {isFav
          ? <Ico n="star" s={14} c={T.accent} w="solid" />
          : <Ico n="star" s={14} c={T.textDisabled} />
        }
      </button>
    </div>
  )
}
