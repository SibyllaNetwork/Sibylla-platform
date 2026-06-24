import React, { useState, useRef, useEffect } from 'react'
import PageContent from './router/PageContent'
import Sidebar from './layout/Sidebar'
import Topbar from './layout/Topbar'
import TabsBar from './layout/TabsBar'
import LoginPage from './modules/auth/LoginPage/LoginPage'
import ProfileLogin from './modules/auth/ProfileLogin/ProfileLogin'
import { useAccessStore } from './store/useAccessStore'
import { isPlatformAdminPage } from './navigation/platformAdminMenu'
import { useAuth } from './hooks/useAuth'
import { buildCrumbs, findByPage } from './navigation/menuHelpers'
import MENU from './navigation/menuFull'
import { useViewModeStore } from './store/useViewModeStore'
import { useSectionThemeStore, sectionForPage, SECTION_COLORS } from './store/useSectionThemeStore'
import { useNavGuard } from './store/useNavGuard'
import { useLoadStrutture } from './hooks/useLoadStrutture'
import T from './core/tokens'
import Ico from './core/icons/Ico'

// ── ContextMenu (right-click su voce menu) ───────────────────────────────────
function ContextMenu({ x, y, pageId, label, favorites, onToggle, onClose }: {
  x: number; y: number; pageId: string; label: string;
  favorites: string[]; onToggle: (p: string) => void; onClose: () => void;
}) {
  const isFav = favorites.includes(pageId)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hM = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    const hK = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', hM)
    document.addEventListener('keydown', hK)
    return () => { document.removeEventListener('mousedown', hM); document.removeEventListener('keydown', hK) }
  }, [onClose])

  return (
    <div ref={ref} style={{ position: 'fixed', left: x, top: y, zIndex: 300, background: T.white, borderRadius: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.16)', border: `1px solid ${T.border}`, minWidth: 216, overflow: 'hidden' }}>
      <div style={{ padding: '7px 14px 5px', fontSize: 10, fontWeight: 700, color: T.textDisabled, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${T.border}` }}>{label}</div>
      <div
        onClick={() => { onToggle(pageId); onClose() }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', transition: 'background 0.1s' }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F8FCFF'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
      >
        {isFav
          ? <><Ico n="trash" s={14} c={T.error}/><span style={{ fontSize: 13, color: T.error }}>Rimuovi dai preferiti</span></>
          : <><Ico n="plus" s={14} c={T.primary}/><span style={{ fontSize: 13, color: T.textActive }}>Aggiungi ai preferiti</span></>
        }
      </div>
    </div>
  )
}

// ── AvatarMenu (dropdown utente in topbar) ───────────────────────────────────
function AvatarMenu({ navigate }: { navigate: (p: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: '4px 10px 4px 4px', cursor: 'pointer' }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'}
      >
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>LH</div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: "Poppins,sans-serif" }}>Luca H.</span>
        <Ico n="chevd" s={10} c="rgba(255,255,255,0.4)"/>
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 200, background: T.white, borderRadius: 12, boxShadow: '0 8px 32px rgba(32,71,105,0.15)', border: `1px solid ${T.border}`, overflow: 'hidden', zIndex: 50 }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.primary }}>Luca H.</div>
            <div style={{ fontSize: 11, color: T.textDisabled }}>Hotel Noto</div>
          </div>
          {[
            { icon: 'user', label: 'Il mio profilo', page: 'modifica-profilo', danger: false },
            { icon: 'gear', label: 'Impostazioni', page: 'crea-struttura', danger: false },
            { icon: 'logout', label: 'Esci', page: null as string | null, danger: true },
          ].map((item, i) => (
            <div
              key={i}
              onClick={() => { setOpen(false); if (item.page) navigate(item.page) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', color: item.danger ? T.error : T.textActive, borderTop: i === 2 ? `1px solid ${T.border}` : 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = item.danger ? T.errorLight : '#F8FCFF'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <Ico n={item.icon} s={15} c={item.danger ? T.error : T.textInactive}/>
              <span style={{ fontSize: 13 }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// APP — Shell principale
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const { user, loading, handleLogin } = useAuth()

  const [currentPage, setCurrentPage] = useState('home')
  const [sideOpen, setSideOpen] = useState(true)
  const [favorites, setFavorites] = useState<string[]>([])
  const [showFavPanel, setShowFavPanel] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; pageId: string; label: string } | null>(null)
  const [navOpen, setNavOpen] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)

  const viewMode = useViewModeStore(s => s.mode)
  const addTab   = useViewModeStore(s => s.addTab)

  // Tema per sezione (Platform / Tableau / Agorà): in modalità dissociata le
  // pagine Tableau/Agorà adottano il colore istituzionale del prodotto, applicato
  // a tutta la app (sidenav + header + contenuto). Platform = palette originale.
  const dissociato = useSectionThemeStore(s => s.dissociato)

  // Login profili: overlay e profilo attualmente caricato (menu filtrato).
  const accessOpen       = useAccessStore(s => s.accessOpen)
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const assist           = useAccessStore(s => s.assist)
  const profiles         = useAccessStore(s => s.profiles)

  // Moduli effettivi dell'utente: assist (impersona un cliente) → profilo
  // caricato → nessun contratto (undefined). Servono a colorare le pagine
  // CONDIVISE tra moduli: le pagine verdi (Tableau) restano verdi solo per chi
  // ha il modulo Tour Operator, altrimenti diventano blu Platform.
  const effectiveModuli = assist
    ? assist.moduli
    : (currentProfileId ? profiles.find(p => p.id === currentProfileId)?.moduli : undefined)
  const section = sectionForPage(currentPage, effectiveModuli)
  const sectionOverride = dissociato && section !== 'platform'
  // Modalità admin (oro): include l'angolo curvo gold tra header e sidenav.
  const adminMode = !!assist || currentPage === 'sibylla-admin' || currentPage === 'assist-admin' || isPlatformAdminPage(currentPage)

  // Carica strutture dell'utente dal backend dopo il login.
  useLoadStrutture(!!user)

  const crumbs = buildCrumbs(MENU, currentPage) || []

  const labelForPage = (page: string): string => {
    const direct = findByPage(MENU, page)
    if (direct?.label) return direct.label
    const cr = buildCrumbs(MENU, page)
    return cr?.[cr.length - 1]?.label || page
  }

  const navigate = (page: string) => {
    // Una pagina con modifiche non salvate può bloccare il cambio pagina
    const guard = useNavGuard.getState().guard
    if (guard && !guard(page)) return
    setCurrentPage(page)
    if (isMobile) setSideOpen(false)
    if (viewMode === 'tabs') {
      addTab({ page, label: labelForPage(page) })
    }
  }

  // In modalità tabs, assicura che la pagina corrente sia presente fra i tab
  // (es. al primo accesso o appena dopo aver attivato la modalità tabs).
  useEffect(() => {
    if (viewMode === 'tabs') {
      addTab({ page: currentPage, label: labelForPage(currentPage) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, currentPage])

  const toggleFavorite = (pageId: string) =>
    setFavorites(prev =>
      prev.includes(pageId) ? prev.filter(f => f !== pageId) : [...prev, pageId]
    )

  const openCtx = (x: number, y: number, pageId: string, label: string) =>
    setCtxMenu({ x, y, pageId, label })

  // La sidenav è aperta di default; si chiude da sola SOLO quando si entra in
  // modalità compatta da desktop (vera transizione), non al primo caricamento.
  const prevMobile = useRef(true)
  useEffect(() => {
    const onResize = () => {
      const m = window.innerWidth < 1024
      setIsMobile(m)
      if (m && !prevMobile.current) setSideOpen(false)
      prevMobile.current = m
    }
    window.addEventListener('resize', onResize)
    onResize()
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Cambio profilo → torna alla Home (pagina sempre consentita), evitando di
  // restare su una pagina non più presente nel menu del nuovo contratto.
  useEffect(() => {
    setCurrentPage('home')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfileId])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="app-loading">
      <div className="app-loading__spinner" />
    </div>
  )

  // ── Login ──────────────────────────────────────────────────────────────────
  if (!user) return <LoginPage onLogin={handleLogin} />

  // ── App ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="app"
      data-section={sectionOverride ? section : undefined}
      style={sectionOverride ? ({ ['--color-primary' as string]: SECTION_COLORS[section] } as React.CSSProperties) : undefined}
    >
      {isMobile && sideOpen && (
        <div className="app__mobile-overlay" onClick={() => setSideOpen(false)} />
      )}

      <Sidebar
        sideOpen={sideOpen}
        setSideOpen={setSideOpen}
        currentPage={currentPage}
        navigate={navigate}
        favorites={favorites}
        isMobile={isMobile}
        navOpen={navOpen}
        setNavOpen={setNavOpen}
        openCtx={openCtx}
      />

      <div className={'app__main' + (adminMode ? ' app__main--admin' : '')}>
        <Topbar
          crumbs={crumbs}
          isMobile={isMobile}
          sideOpen={sideOpen}
          setSideOpen={setSideOpen}
          navigate={navigate}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          showFavPanel={showFavPanel}
          setShowFavPanel={setShowFavPanel}
          currentPage={currentPage}
        />
        {viewMode === 'tabs' && (
          <TabsBar currentPage={currentPage} navigate={navigate} />
        )}
        <div
          className={
            'app__content content-scroll' +
            (isMobile ? ' app__content--mobile' : '') +
            (viewMode === 'tabs' ? ' app__content--with-tabs' : '')
          }
        >
          <PageContent page={currentPage} navigate={navigate} />
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          pageId={ctxMenu.pageId}
          label={ctxMenu.label}
          favorites={favorites}
          onToggle={toggleFavorite}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {accessOpen && <ProfileLogin />}
    </div>
  )
}
