import React, { useState, useRef, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import Ico from '../core/icons/Ico'
import NavItem from './NavItem'
import MENU_FULL from '../navigation/menuFull'
import { filterMenu } from '../navigation/filterMenu'
import { isPlatformAdminPage } from '../navigation/platformAdminMenu'
import { CLIENTS_INIT } from '../admin/SibyllaAdminPanel/constants'
import PlatformAdminNav from './PlatformAdminNav'
import { useOrgStore } from '../store/useOrgStore'
import { useAccessStore, enabledPagesForProfile, enabledPagesForModuli } from '../store/useAccessStore'
import { useModuliStore } from '../store/useModuliStore'

interface Props {
  sideOpen    : boolean
  setSideOpen : (v: boolean | ((p: boolean) => boolean)) => void
  currentPage : string
  navigate    : (p: string) => void
  favorites   : string[]
  isMobile    : boolean
  navOpen     : string | null
  setNavOpen  : (v: string | null) => void
  openCtx     : (x: number, y: number, pageId: string, label: string) => void
}

// ── Scrollbar sottile: non esprimibile senza arbitrary-variants ────────────
const SCROLLBAR = '[&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-sm'

export default function Sidebar({
  sideOpen, setSideOpen, currentPage, navigate,
  favorites, isMobile, navOpen, setNavOpen, openCtx,
}: Props) {

  const tipologia          = useOrgStore(s => s.tipologia)
  const strutture          = useOrgStore(s => s.strutture)
  const activeStruttura    = useOrgStore(s => s.activeStruttura)
  const setActiveStruttura = useOrgStore(s => s.setActiveStruttura)

  const isMultistruttura = tipologia === 'Multistruttura'

  // Saluto in base all'ora (riga utente: "Buongiorno, <nome>").
  const greeting = (() => { const h = new Date().getHours(); return h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera' })()

  // ── Menu filtrato sul profilo (moduli sottoscritti) ─────────────────────────
  // currentProfileId = null → menu completo (nessun contratto caricato).
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)
  // Catalogo moduli LIVE (editabile dall'admin): così modificando un modulo il
  // menu filtrato della struttura che lo ha assegnato si aggiorna in tempo reale.
  const modules          = useModuliStore(s => s.moduli)
  // Sessione di assistenza (admin che impersona un cliente): ha precedenza e
  // filtra il menu sui moduli del contratto del cliente.
  const assist           = useAccessStore(s => s.assist)
  // Console amministrativa (landing): menu completo, nessun dettaglio utente.
  const onConsole        = currentPage === 'sibylla-admin'
  // Amministrazione piattaforma: la sidenav mostra il menu dedicato (pagine pa-*).
  const platformAdmin    = isPlatformAdminPage(currentPage)
  const adminMode        = !!assist || onConsole || platformAdmin || currentPage === 'assist-admin'
  // Struttura COMUNE filtrata: si parte sempre da MENU_FULL e si filtra
  // all'UNIONE delle pagine dei moduli sottoscritti (merge incrementale senza
  // duplicati). Nessun contratto / console → menu completo.
  const menu = useMemo(() => {
    if (onConsole) return MENU_FULL
    if (assist) return filterMenu(MENU_FULL as any[], enabledPagesForModuli(assist.moduli, modules))
    if (!currentProfileId) return MENU_FULL
    const profile = profiles.find(p => p.id === currentProfileId)
    if (!profile) return MENU_FULL
    return filterMenu(MENU_FULL as any[], enabledPagesForProfile(profile, modules))
  }, [onConsole, assist, currentProfileId, profiles, modules])

  // Durante l'assistenza lo switcher elenca le strutture del cliente (le stesse
  // dell'Admin Panel); altrimenti le strutture dell'organizzazione.
  const assistStrutture = useMemo(
    () => (assist ? CLIENTS_INIT.filter(c => assist.struttureIds.includes(c.id)).map(c => c.nome) : []),
    [assist],
  )
  const switcherList = assist ? assistStrutture : strutture
  const showSwitcher = assist ? assistStrutture.length > 0 : (isMultistruttura && strutture.length > 0)
  const activeStrutt = assist
    ? (assistStrutture.includes(activeStruttura) ? activeStruttura : assistStrutture[0])
    : activeStruttura

  const [structOpen, setStructOpen] = useState(false)
  const structRef = useRef<HTMLDivElement>(null)

  // Chiude il dropdown al click fuori
  useEffect(() => {
    if (!structOpen) return
    const handler = (e: MouseEvent) => {
      if (!structRef.current?.contains(e.target as Node)) setStructOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [structOpen])

  // Chiude il dropdown se la sidebar si chiude
  useEffect(() => { if (!sideOpen) setStructOpen(false) }, [sideOpen])

  const rootClass = clsx(
    // Allineato alla topbar: stessa CSS variable `--color-primary` per
    // garantire identico background fra sidenav e header su tutti i temi.
    'app__sidebar flex flex-col overflow-hidden bg-primary text-white',
    isMobile
      ? [
          'fixed top-0 h-screen w-[272px] min-w-[272px] z-50 transition-[left] duration-[450ms] ease-sidebar',
          sideOpen ? 'left-0 shadow-[12px_0_40px_rgba(0,0,0,0.95)]' : '-left-[300px] shadow-none',
        ]
      : [
          'transition-[width,min-width] duration-[420ms] ease-sidebar',
          sideOpen ? 'w-[260px] min-w-[260px]' : 'w-16 min-w-16',
        ],
  )

  return (
    <div className={rootClass} style={adminMode ? { background: '#c9a84c' } : undefined}>

      {/* ── Header: hamburger (1° elemento) + select struttura (chiara) ──────── */}
      <div
        ref={structRef}
        className={clsx(
          'relative h-16 flex items-center shrink-0',
          sideOpen ? 'flex-row gap-2.5 px-3.5' : 'justify-center px-0',
        )}
      >
        {/* Hamburger: apre/chiude la sidenav */}
        {!isMobile && (
          <button
            type="button"
            aria-label={sideOpen ? 'Comprimi menu' : 'Espandi menu'}
            onClick={() => setSideOpen(o => !o)}
            className="bg-transparent border-0 cursor-pointer p-[5px] opacity-70 flex shrink-0 transition-opacity duration-150 hover:opacity-100"
            style={{ color: adminMode ? '#2A2208' : '#fff' }}
          >
            <Ico n="menu" s={18} c={adminMode ? '#2A2208' : undefined} />
          </button>
        )}
        {isMobile && sideOpen && (
          <button
            className="bg-white/10 border-0 cursor-pointer p-1.5 rounded-lg flex items-center shrink-0 hover:bg-white/20"
            onClick={() => setSideOpen(false)}
            aria-label="Chiudi menu"
          >
            <Ico n="x" s={18} c="rgba(255,255,255,0.8)" />
          </button>
        )}

        {sideOpen && (adminMode ? (
          <button
            type="button"
            onClick={() => navigate('sibylla-admin')}
            title="Admin Console — Area riservata assistenza Sibylla"
            className="min-w-0 flex flex-col bg-transparent border-0 cursor-pointer text-left p-0"
          >
            <span className="font-poppins font-extrabold text-[16px] leading-tight" style={{ color: '#2A2208' }}>
              Admin Console
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.06em] mt-0.5" style={{ color: 'rgba(42,34,8,0.62)' }}>
              Area riservata · Sibylla
            </span>
          </button>
        ) : (
          // Trigger select: solo nome hotel + freccetta (niente box).
          // Il box bianco compare solo nel dropdown (lista strutture).
          showSwitcher ? (
            <button
              type="button"
              onClick={() => setStructOpen(o => !o)}
              aria-haspopup="listbox"
              aria-expanded={structOpen}
              className="group min-w-0 flex-1 flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer text-left"
            >
              <span
                className="truncate min-w-0 text-[14.5px] font-semibold font-poppins leading-tight"
                style={{ color: adminMode ? '#2A2208' : '#fff' }}
              >
                {activeStrutt}
              </span>
              <i
                className={clsx('fa-solid fa-chevron-down text-[10px] shrink-0 transition-transform duration-200', structOpen && 'rotate-180')}
                style={{ color: adminMode ? 'rgba(42,34,8,0.6)' : 'rgba(255,255,255,0.6)' }}
                aria-hidden="true"
              />
            </button>
          ) : (
            <span
              className="truncate min-w-0 flex-1 text-[14.5px] font-semibold font-poppins leading-tight"
              style={{ color: adminMode ? '#2A2208' : '#fff' }}
            >
              {activeStrutt}
            </span>
          )
        ))}

        {/* Dropdown struttura — solo a sidebar aperta (da chiusa è nella topbar) */}
        {sideOpen && showSwitcher && structOpen && (
          <div
            className={clsx(
              'absolute left-3 right-3 top-full mt-1 z-30 rounded-lg overflow-hidden max-h-60 overflow-y-auto',
              'bg-white border border-black/10 shadow-[0_12px_32px_rgba(0,0,0,0.18)]',
              SCROLLBAR,
            )}
            role="listbox"
          >
            <div className="pt-2 pb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.5px] text-black/45">
              Cambia struttura
            </div>
            {switcherList.map(s => {
              const active = s === activeStrutt
              return (
                <button
                  key={s}
                  role="option"
                  aria-selected={active}
                  className={clsx(
                    'w-full flex items-center gap-2 py-[9px] px-3 bg-transparent border-0 cursor-pointer text-[#1f2937]',
                    'font-opensans text-xs text-left transition-colors duration-100',
                    active ? 'bg-[#eef4fa] font-semibold' : 'hover:bg-black/[0.04]',
                  )}
                  onClick={() => {
                    setActiveStruttura(s)
                    setStructOpen(false)
                  }}
                >
                  <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{s}</span>
                  {active && <i className="fa-solid fa-check text-[11px] shrink-0 text-link" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Utente: solo saluto + nome + avatar (nascosto nelle viste admin) ─── */}
      {!onConsole && !platformAdmin && (
        <div className={clsx(
          'flex items-center gap-2.5 border-t border-b border-white/[0.08]',
          sideOpen ? 'px-4 py-3' : 'px-0 py-3 justify-center',
        )}>
          <div className="w-[34px] h-[34px] rounded-full bg-link shrink-0 flex items-center justify-center text-xs font-bold text-white">
            LH
          </div>
          {sideOpen && (
            <div className="min-w-0 flex-1 text-[13px] font-semibold font-poppins leading-tight" style={{ color: adminMode ? '#2A2208' : '#fff' }}>
              {greeting}, Luca H.
            </div>
          )}
        </div>
      )}

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className={clsx('flex-1 overflow-y-auto overflow-x-hidden py-2', SCROLLBAR, adminMode && 'app__nav--gold')}>
        {platformAdmin ? (
          <PlatformAdminNav currentPage={currentPage} navigate={navigate} />
        ) : (
          menu.map(item => (
            <NavItem
              key={item.id}
              item={item}
              depth={1}
              modColor={null}
              currentPage={currentPage}
              navigate={navigate}
              sideOpen={sideOpen}
              favorites={favorites}
              onCtxMenu={openCtx}
              openId={navOpen}
              setOpenId={setNavOpen}
            />
          ))
        )}
      </nav>

      {/* ── Voce Admin Panel (durante l'assistenza) — stile uguale alle altre voci ── */}
      {assist && !onConsole && !platformAdmin && (
        <button
          type="button"
          onClick={() => navigate('assist-admin')}
          title={!sideOpen ? 'Admin Panel' : undefined}
          style={{ color: '#2A2208' }}
          className={clsx(
            'w-full flex items-center gap-2.5 cursor-pointer border-l-[3px] transition-colors duration-150 font-poppins text-[13px] font-medium',
            sideOpen ? 'py-[9px] pr-3 pl-4' : 'justify-center py-[9px] px-0',
            currentPage === 'assist-admin'
              ? 'border-l-[#2A2208] bg-white/40'
              : 'border-l-transparent hover:bg-black/[0.06]',
          )}
        >
          <Ico n="layers" s={20} c="#2A2208" />
          {sideOpen && (
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">Admin Panel</span>
          )}
        </button>
      )}

      {/* ── Launcher S.S.P.I (nascosto nelle viste admin) ───────────────────
          In fondo alla sidebar. Quando la pagina è aperta, il link diventa il
          ritorno alla home della piattaforma ("Gestisci impresa"). */}
      {!adminMode && (() => {
        const onSspi = currentPage === 'sspi'
        const label  = onSspi ? 'Gestisci impresa (Sibylla platform)' : 'S.S.P.I. (Social Sustainable Profitable Index)'
        return (
          <button
            type="button"
            onClick={() => navigate(onSspi ? 'home' : 'sspi')}
            title={!sideOpen ? label : undefined}
            className={clsx(
              'group border-t border-white/[0.08] flex items-center cursor-pointer transition-colors duration-150',
              sideOpen ? 'gap-3 px-4 py-3' : 'justify-center py-3',
              onSspi ? 'bg-white/[0.06]' : 'hover:bg-white/[0.05]',
            )}
          >
            <span className={clsx(
              'w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150',
              onSspi ? 'bg-success/20 text-success' : 'bg-white/[0.06] text-white/70 group-hover:text-white',
            )}>
              <Ico n={onSspi ? 'wheel' : 'leaf'} s={16} c="currentColor" />
            </span>
            {sideOpen && (
              <span className="min-w-0 text-left">
                <span className="block text-[12px] font-semibold text-white/90 font-poppins leading-tight truncate">
                  {onSspi ? 'Gestisci impresa' : 'S.S.P.I.'}
                </span>
                <span className="block text-[9.5px] text-white/35 truncate">
                  {onSspi ? 'Torna alla piattaforma' : 'Social Sustainable Profitable Index'}
                </span>
              </span>
            )}
          </button>
        )
      })()}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="py-2.5 border-t border-white/[0.08] flex items-center justify-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-success" />
        {sideOpen && <span className="text-[10px] text-white/30">v 2.4.1 · Sistema operativo</span>}
      </div>
    </div>
  )
}
