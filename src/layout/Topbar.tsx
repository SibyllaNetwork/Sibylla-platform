import React, { useState, useRef, useEffect, useCallback } from 'react'
import Ico from '../core/icons/Ico'
import MenuIco from '../core/icons/MenuIco'
import NotifMenu from './NotifMenu'
import FavoritesPanel from './FavoritesPanel'
import Tooltip from '../core/components/Tooltip'
import MENU from '../navigation/menu'
import { findByPage, searchMenu, SearchResult } from '../navigation/menuHelpers'
import { useChatStore } from '../store/useChatStore'
import { useCartStore } from '../store/useCartStore'

interface Props {
  crumbs          : any[]
  isMobile        : boolean
  sideOpen        : boolean
  setSideOpen     : (v: boolean | ((p: boolean) => boolean)) => void
  navigate        : (p: string) => void
  favorites       : string[]
  toggleFavorite  : (pageId: string) => void
  showFavPanel    : boolean
  setShowFavPanel : (v: boolean | ((p: boolean) => boolean)) => void
  currentPage     : string
}

const C = {
  bright: 'rgba(255,255,255,0.95)',
  normal: 'rgba(255,255,255,0.80)',
  muted:  'rgba(255,255,255,0.55)',
}

export default function Topbar({
  crumbs, isMobile, sideOpen, setSideOpen, navigate,
  favorites, toggleFavorite, showFavPanel, setShowFavPanel, currentPage,
}: Props) {
  const chatUnread = useChatStore(s => s.conversations.reduce((acc, c) => acc + c.unreadCount, 0))
  const cartCount = useCartStore(s => s.totaleItems())

  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [selIdx,   setSelIdx]   = useState(-1)
  const [open,     setOpen]     = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)

  // Aggiorna risultati al cambio query
  useEffect(() => {
    const r = searchMenu(query)
    setResults(r)
    setSelIdx(-1)
    setOpen(query.length > 0)
  }, [query])

  // Chiudi cliccando fuori
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = selIdx >= 0 ? results[selIdx] : results[0]
      if (target) goTo(target)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  const goTo = (r: SearchResult) => {
    navigate(r.page)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  // Evidenzia il testo corrispondente
  const highlight = (text: string, q: string) => {
    if (!q.trim()) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase())
    if (idx < 0) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'rgba(92,156,212,0.35)', color: '#fff', borderRadius: 2, padding: '0 1px' }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div className="topbar">

      {/* ── Hamburger mobile ── */}
      {isMobile && (
        <button className="topbar__hamburger" onClick={() => setSideOpen(v => !v)}>
          <Ico n="menu" s={22} c={C.bright} />
        </button>
      )}

      {/* ── Breadcrumbs ── */}
      <div className="topbar__crumbs">
        <button className="topbar__crumb-home" onClick={() => navigate('home')}>
          <Ico n="home" s={14} c={C.normal} />
        </button>
        {crumbs.slice(1).map((c: any, i: number) => (
          <span key={c.id} className="topbar__crumb-item">
            <Ico n="chevr" s={12} c="#ffffff" />
            <button
              className={`topbar__crumb-btn ${i === crumbs.length - 2 ? 'topbar__crumb-btn--last' : 'topbar__crumb-btn--prev'}`}
              onClick={() => {
                if (c.page) navigate(c.page)
                else if (c.children?.[0]?.page) navigate(c.children[0].page)
              }}
            >
              {c.label}
            </button>
          </span>
        ))}
      </div>

      {/* ── Favorites ── */}
      {!isMobile && (
        <div className="topbar__favorites">
          <button
            className={`topbar__fav-btn ${showFavPanel ? 'topbar__fav-btn--active' : ''}`}
            onClick={() => setShowFavPanel(v => !v)}
          >
            I miei preferiti
          </button>
          {favorites.slice(0, 5).map(pageId => {
            const it = findByPage(MENU, pageId)
            return it ? (
              <button key={pageId} className="topbar__fav-page" onClick={() => navigate(pageId)} title={it.label}>
                <MenuIco id={it.id} s={15} c={C.normal} />
              </button>
            ) : null
          })}
          {showFavPanel && (
            <FavoritesPanel favorites={favorites} onToggle={toggleFavorite} onClose={() => setShowFavPanel(false)} />
          )}
        </div>
      )}

      {!isMobile && <div className="topbar__divider" />}

      {/* ── Icon buttons ── */}
      {!isMobile && (
        <button className="topbar__icon-btn" onClick={() => navigate('tariffe-disp')} title="Distribuzione di rete">
          <Ico n="org" s={18} c={C.normal} />
        </button>
      )}
      <NotifMenu navigate={navigate} />
      <button className="topbar__icon-btn" onClick={() => navigate('scadenzario')} title="Scadenzario">
        <Ico n="calendar" s={18} c={C.normal} />
      </button>
      <button className="topbar__icon-btn" title="Assistenza">
        <Ico n="headset" s={18} c={C.normal} />
      </button>
      <button className="topbar__icon-btn" onClick={() => navigate('portafoglio-aziendale')} title="Portafoglio aziendale">
        <Ico n="database" s={18} c={C.normal} />
      </button>
      <button
        className="topbar__icon-btn topbar__icon-btn--chat"
        onClick={() => navigate('chat')}
        title="Chat"
      >
        <i className="fa-light fa-comments topbar__chat-icon" aria-hidden="true" />
        {chatUnread > 0 && (
          <span className="topbar__chat-badge">
            {chatUnread > 99 ? '99+' : chatUnread}
          </span>
        )}
      </button>
      <button
        className="topbar__icon-btn topbar__icon-btn--cart"
        onClick={() => navigate('catalogo-cart')}
        title={cartCount > 0 ? `Carrello (${cartCount})` : 'Carrello'}
      >
        <Ico n="cart" s={18} c={C.normal} />
        {cartCount > 0 && (
          <span className="topbar__cart-badge">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </button>

      {/* ── Search ── */}
      <div className="topbar__search-wrap" ref={wrapRef}>
        <div className="topbar__search">
          <Ico n="search" s={13} c={C.muted} />
          <input
            ref={inputRef}
            className="sib-search-input"
            placeholder="Cerca… ⌘K"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { if (query) setOpen(true) }}
            onKeyDown={handleKey}
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setOpen(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', display: 'flex' }}
            >
              <Ico n="x" s={11} c={C.muted} />
            </button>
          )}
        </div>

        {/* ── Dropdown risultati ── */}
        {open && (
          <div className="topbar__search-dropdown">
            {results.length === 0 ? (
              <div className="topbar__search-empty">
                <Ico n="search" s={16} c="rgba(255,255,255,0.2)" />
                <span>Nessun risultato per <strong>"{query}"</strong></span>
              </div>
            ) : (
              <>
                <div className="topbar__search-header">
                  {results.length} risultat{results.length === 1 ? 'o' : 'i'}
                </div>
                {results.map((r, i) => (
                  <button
                    key={r.page}
                    className={`topbar__search-item ${i === selIdx ? 'topbar__search-item--selected' : ''}`}
                    onClick={() => goTo(r)}
                    onMouseEnter={() => setSelIdx(i)}
                  >
                    <div
                      className="topbar__search-item-ico"
                      style={{ background: `${r.color}22`, border: `1px solid ${r.color}44` }}
                    >
                      <MenuIco id={r.page.split('-')[0]} s={12} c={r.color} />
                    </div>
                    <div className="topbar__search-item-text">
                      <div className="topbar__search-item-label">
                        {highlight(r.label, query)}
                      </div>
                      {r.path.length > 0 && (
                        <div className="topbar__search-item-path">
                          {r.path.join(' › ')}
                        </div>
                      )}
                    </div>
                    <Ico n="chevr" s={10} c="rgba(255,255,255,0.3)" />
                  </button>
                ))}
                <div className="topbar__search-footer">
                  <span>↑↓ naviga</span>
                  <span>↵ apri</span>
                  <span>Esc chiudi</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Preferenze tema e visualizzazione spostate in Profilo › Modifica profilo › Preferenze */}

      {/* ── Admin ── */}
      <Tooltip text="Sibylla Admin Panel">
        <button
          className={`topbar__icon-btn ${currentPage === 'sibylla-admin' ? 'topbar__icon-btn--active' : ''}`}
          onClick={() => navigate('sibylla-admin')}
        >
          <Ico n="layers" s={18} c={C.normal} />
        </button>
      </Tooltip>

      {/* ── Disconnetti ── */}
      <button className="topbar__icon-btn" title="Disconnetti">
        <Ico n="power" s={18} c={C.muted} />
      </button>

    </div>
  )
}
