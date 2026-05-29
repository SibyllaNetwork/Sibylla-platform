import React, { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import Ico from '../core/icons/Ico'
import Logo from './Logo'
import NavItem from './NavItem'
import MENU from '../navigation/menu'
import { useOrgStore } from '../store/useOrgStore'

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
          'fixed top-0 h-screen w-[272px] min-w-[272px] z-50 transition-[left] duration-300 ease-sidebar',
          sideOpen ? 'left-0 shadow-[12px_0_40px_rgba(0,0,0,0.95)]' : '-left-[300px] shadow-none',
        ]
      : [
          'transition-[width,min-width] duration-200 ease-sidebar',
          sideOpen ? 'w-[260px] min-w-[260px]' : 'w-16 min-w-16',
        ],
  )

  return (
    <div className={rootClass}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={clsx(
        'h-16 flex items-center gap-2 shrink-0',
        sideOpen ? 'px-3.5 justify-between' : 'p-0 justify-center',
      )}>
        {sideOpen && <Logo />}
        {!sideOpen && !isMobile && (
          <div className="w-[34px] h-[34px] rounded-full bg-[rgba(162,134,76,0.2)] flex items-center justify-center text-[11px] font-extrabold text-[#a2864c]">
            S
          </div>
        )}
        {sideOpen && !isMobile && (
          <button
            className="bg-transparent border-0 cursor-pointer p-[5px] opacity-60 flex transition-opacity duration-150 text-white hover:opacity-100"
            onClick={() => setSideOpen(false)}
          >
            <Ico n="menu" s={17} />
          </button>
        )}
        {isMobile && sideOpen && (
          <button
            className="bg-white/10 border-0 cursor-pointer p-1.5 rounded-lg flex items-center hover:bg-white/20"
            onClick={() => setSideOpen(false)}
          >
            <Ico n="x" s={18} c="rgba(255,255,255,0.8)" />
          </button>
        )}
      </div>

      {/* ── User (con switcher struttura integrato nella riga ruolo) ───────── */}
      <div
        ref={structRef}
        className={clsx(
          'relative flex items-center gap-2.5 border-t border-b border-white/[0.08]',
          sideOpen ? 'px-4 py-3' : 'px-0 py-3 justify-center',
        )}
      >
        <div className="w-[34px] h-[34px] rounded-full bg-link shrink-0 flex items-center justify-center text-xs font-bold text-white">
          LH
        </div>

        {sideOpen && (
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-white font-poppins leading-tight">Luca H.</div>

            {isMultistruttura && strutture.length > 0 ? (
              <button
                type="button"
                onClick={() => setStructOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={structOpen}
                className={clsx(
                  'group mt-0.5 -mx-1 px-1 py-0.5 rounded-md flex items-center gap-1.5 max-w-full',
                  'text-[10px] cursor-pointer transition-colors duration-150 bg-transparent border-0',
                  structOpen
                    ? 'bg-white/[0.08] text-white/80'
                    : 'text-white/40 hover:bg-white/[0.05] hover:text-white/70',
                )}
              >
                <span className="truncate min-w-0 text-left">
                  Amministratore · {activeStruttura}
                </span>
                <i
                  className={clsx(
                    'fa-solid fa-chevron-down text-[8px] shrink-0 transition-transform duration-200',
                    structOpen && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <div className="mt-0.5 text-[10px] text-white/40">
                Amministratore{activeStruttura ? ` · ${activeStruttura}` : ''}
              </div>
            )}
          </div>
        )}

        {/* Dropdown overlay — non spinge la nav, galleggia sopra */}
        {sideOpen && isMultistruttura && structOpen && (
          <div
            className={clsx(
              'absolute left-2 right-2 top-full mt-1 z-30',
              'bg-primary-800 border border-white/[0.12] rounded-lg overflow-hidden',
              'shadow-[0_12px_32px_rgba(0,0,0,0.4)] max-h-60 overflow-y-auto',
              SCROLLBAR,
            )}
            role="listbox"
          >
            <div className="pt-2 pb-1.5 px-3 text-[10px] font-bold text-white/35 uppercase tracking-[0.5px]">
              Cambia struttura
            </div>
            {strutture.map(s => {
              const active = s === activeStruttura
              return (
                <button
                  key={s}
                  role="option"
                  aria-selected={active}
                  className={clsx(
                    'w-full flex items-center gap-2 py-[9px] px-3 bg-transparent border-0 cursor-pointer',
                    'font-opensans text-xs text-left transition-colors duration-100',
                    active
                      ? 'bg-white/[0.06] text-white font-semibold'
                      : 'text-white/80 hover:bg-white/[0.08]',
                  )}
                  onClick={() => {
                    setActiveStruttura(s)
                    setStructOpen(false)
                  }}
                >
                  <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{s}</span>
                  {active && <i className="fa-solid fa-check text-[11px] text-link shrink-0" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Expand button (solo sidebar chiusa desktop) ─────────────────────── */}
      {!sideOpen && !isMobile && (
        <button
          className="bg-transparent border-0 cursor-pointer py-2.5 px-0 flex justify-center text-white/50 transition-colors duration-150 hover:text-white/90"
          onClick={() => setSideOpen(true)}
        >
          <Ico n="menu" s={17} />
        </button>
      )}

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav className={clsx('flex-1 overflow-y-auto overflow-x-hidden py-2', SCROLLBAR)}>
        {MENU.map(item => (
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
        ))}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="py-2.5 border-t border-white/[0.08] flex items-center justify-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-success" />
        {sideOpen && <span className="text-[10px] text-white/30">v 2.4.1 · Sistema operativo</span>}
      </div>
    </div>
  )
}
