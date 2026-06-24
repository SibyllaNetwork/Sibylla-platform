import React, { useState, useRef, useEffect, useMemo } from 'react'
import Ico from '../core/icons/Ico'
import MenuIco from '../core/icons/MenuIco'
import NotifMenu from './NotifMenu'
import FavoritesPanel from './FavoritesPanel'
import Tooltip from '../core/components/Tooltip'
import MENU_FULL from '../navigation/menuFull'
import { filterMenu, applyModuleLabels } from '../navigation/filterMenu'
import { findByPage, searchMenu, SearchResult } from '../navigation/menuHelpers'
import { useChatStore } from '../store/useChatStore'
import { useCartStore } from '../store/useCartStore'
import { useAccessStore, enabledPagesForProfile, enabledPagesForModuli } from '../store/useAccessStore'
import { useModuliStore } from '../store/useModuliStore'
import { useOrgStore } from '../store/useOrgStore'
import { isPlatformAdminPage } from '../navigation/platformAdminMenu'

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

export default function Topbar({
  crumbs, isMobile, sideOpen, setSideOpen, navigate,
  favorites, toggleFavorite, showFavPanel, setShowFavPanel, currentPage,
}: Props) {
  const chatUnread = useChatStore(s => s.conversations.reduce((acc, c) => acc + c.unreadCount, 0))
  const cartCount = useCartStore(s => s.totaleItems())
  // Modalità amministrativa: tema oro + accessi rapidi alla console. Attiva sia
  // nelle pagine della console (sibylla-admin / assist-admin) sia mentre si
  // assiste un cliente (impersonazione).
  const assist = useAccessStore(s => s.assist)
  const adminMode = !!assist || currentPage === 'sibylla-admin' || currentPage === 'assist-admin' || isPlatformAdminPage(currentPage)

  // Menu su cui cercare: stesso albero filtrato della sidenav (MENU_FULL ridotto
  // ai moduli dell'utente). Così la ricerca trova le pagine dei moduli Tour
  // Operator / Ristorazione, non solo quelle del menu Struttura ricettiva.
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)
  const modules          = useModuliStore(s => s.moduli)
  const searchMenuItems = useMemo(() => {
    if (assist) return applyModuleLabels(filterMenu(MENU_FULL as any[], enabledPagesForModuli(assist.moduli, modules)), assist.moduli)
    if (!currentProfileId) return MENU_FULL
    const profile = profiles.find(p => p.id === currentProfileId)
    if (!profile) return MENU_FULL
    return applyModuleLabels(filterMenu(MENU_FULL as any[], enabledPagesForProfile(profile, modules)), profile.moduli)
  }, [assist, currentProfileId, profiles, modules])
  // Colori di icone/testo: scuri (#2A2208) sull'oro admin, chiari sul blu standard.
  const C = adminMode
    ? { bright: '#2A2208', normal: '#2A2208', muted: 'rgba(42,34,8,0.6)' }
    : { bright: 'rgba(255,255,255,0.95)', normal: 'rgba(255,255,255,0.80)', muted: 'rgba(255,255,255,0.55)' }

  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [selIdx,   setSelIdx]   = useState(-1)
  const [open,     setOpen]     = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)

  // Select strutture: mostrato qui (prima della breadcrumb) quando la sidenav è
  // chiusa — i dati vengono dallo stesso store usato dalla sidebar.
  const tipologia       = useOrgStore(s => s.tipologia)
  const strutture       = useOrgStore(s => s.strutture)
  const activeStruttura = useOrgStore(s => s.activeStruttura)
  const setActiveStrutt = useOrgStore(s => s.setActiveStruttura)
  const showStruttSel   = !sideOpen && !adminMode && tipologia === 'Multistruttura' && strutture.length > 0
  const [struttOpen, setStruttOpen] = useState(false)
  const struttRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!struttOpen) return
    const h = (e: MouseEvent) => { if (!struttRef.current?.contains(e.target as Node)) setStruttOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [struttOpen])

  // Aggiorna risultati al cambio query
  useEffect(() => {
    const r = searchMenu(query, searchMenuItems)
    setResults(r)
    setSelIdx(-1)
    setOpen(query.length > 0)
  }, [query, searchMenuItems])

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
        <mark style={{ background: 'rgba(92,156,212,0.30)', color: '#1f2937', fontWeight: 700, borderRadius: 2, padding: '0 1px' }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    )
  }

  return (
    <div className={`topbar${adminMode ? ' topbar--admin' : ''}`} style={adminMode ? { background: '#c9a84c' } : undefined}>

      {/* ── Hamburger mobile ── */}
      {isMobile && (
        <button className="topbar__hamburger" onClick={() => setSideOpen(v => !v)}>
          <Ico n="menu" s={22} c={C.bright} />
        </button>
      )}

      {/* ── Console amministrativa: home + uscita (il titolo è nell'header della sidenav) ── */}
      {adminMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 4 }}>
          {currentPage !== 'sibylla-admin' && (
            <button
              type="button"
              onClick={() => { useAccessStore.getState().exitAssist(); navigate('sibylla-admin') }}
              title="Torna alla home della Sibylla System Administration Console"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(0,0,0,0.06)', color: '#2a2208', border: 0,
                borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
                fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
              }}
            >
              <Ico n="home" s={13} c="#2a2208" />
              Home Console
            </button>
          )}
          <button
            type="button"
            onClick={() => { useAccessStore.getState().exitAssist(); navigate('home') }}
            title="Esci dalla console di amministrazione"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,0,0,0.12)', color: '#2a2208', border: 0,
              borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
              fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap',
            }}
          >
            <Ico n="power" s={13} c="#2a2208" />
            Esci assistenza
          </button>
        </div>
      )}

      {/* ── Select strutture (solo a sidenav chiusa, prima della breadcrumb) ── */}
      {showStruttSel && (
        <div ref={struttRef} className="relative mr-3 shrink-0">
          <button
            type="button"
            onClick={() => setStruttOpen(o => !o)}
            aria-haspopup="listbox" aria-expanded={struttOpen}
            className="flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer text-white/90 transition-colors hover:text-white"
          >
            <i className="fa-light fa-hotel text-[14px]" aria-hidden="true" />
            <span className="text-[14px] font-semibold font-poppins max-w-[200px] truncate">{activeStruttura}</span>
            <i className={`fa-solid fa-chevron-down text-[9px] text-white/60 transition-transform duration-200 ${struttOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {struttOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 w-56 max-h-60 overflow-y-auto rounded-lg bg-white border border-black/10 shadow-[0_12px_32px_rgba(0,0,0,0.18)]" role="listbox">
              <div className="pt-2 pb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.5px] text-black/45">Cambia struttura</div>
              {strutture.map(s => {
                const active = s === activeStruttura
                return (
                  <button
                    key={s} role="option" aria-selected={active}
                    onClick={() => { setActiveStrutt(s); setStruttOpen(false) }}
                    className={`w-full flex items-center gap-2 py-[9px] px-3 text-[#1f2937] font-opensans text-xs text-left transition-colors ${active ? 'bg-[#eef4fa] font-semibold' : 'hover:bg-black/[0.04]'}`}
                  >
                    <span className="flex-1 truncate">{s}</span>
                    {active && <i className="fa-solid fa-check text-[11px] text-link shrink-0" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Breadcrumbs ── */}
      <div className="topbar__crumbs">
        {crumbs.slice(1).map((c: any, i: number) => (
          <span key={c.id} className="topbar__crumb-item">
            {i > 0 && <Ico n="chevr" s={12} c={C.normal} />}
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

      {/* ── Favorites (nascosti nelle viste admin) ── */}
      {!isMobile && !adminMode && (
        <div className="topbar__favorites">
          <button
            className={`topbar__fav-btn ${showFavPanel ? 'topbar__fav-btn--active' : ''}`}
            onClick={() => setShowFavPanel(v => !v)}
          >
            I miei preferiti
          </button>
          {favorites.slice(0, 5).map(pageId => {
            const it = findByPage(MENU_FULL, pageId)
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
      {!isMobile && !adminMode && (
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
          <Ico n="search" s={13} c="#6E7175" />
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
                <Ico n="search" s={16} c="rgba(0,0,0,0.25)" />
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
                    <Ico n="chevr" s={10} c="rgba(0,0,0,0.3)" />
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

      {/* ── Profili / accesso ── */}
      <Tooltip text="Profili & accesso">
        <button
          className="topbar__icon-btn"
          onClick={() => useAccessStore.getState().openAccess()}
        >
          <Ico n="user" s={18} c={C.normal} />
        </button>
      </Tooltip>

      {/* ── Admin ── */}
      <Tooltip text="Sibylla Admin Panel">
        <button
          className={`topbar__icon-btn ${currentPage === 'sibylla-admin' ? 'topbar__icon-btn--active' : ''}`}
          onClick={() => navigate('sibylla-admin')}
        >
          <Ico n="layers" s={18} c={C.normal} />
        </button>
      </Tooltip>

      {/* ── Disconnetti (scarica il profilo → menu completo) ── */}
      <button className="topbar__icon-btn" title="Disconnetti profilo" onClick={() => useAccessStore.getState().logout()}>
        <Ico n="power" s={18} c={C.muted} />
      </button>

    </div>
  )
}
