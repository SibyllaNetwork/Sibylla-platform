import React, { useEffect, useRef, useState } from 'react'
import MENU from '../../../navigation/menu'
import { useAccessStore, enabledPagesForModuli } from '../../../store/useAccessStore'
import { useModuliStore } from '../../../store/useModuliStore'
import Ico from '../../../core/icons/Ico'
import { ReactComponent as TimoneSvg } from './timone.svg'
import './Timone.sass'

// ── Segmenti del timone → area di menu corrispondente (figli di "impresa") ──
// La chiave coincide con l'id del gruppo SVG (#seg-<key>).
const SEGMENTS = [
  { key: 'sales',      menuId: 'sales'      },
  { key: 'operation',  menuId: 'operation'  },
  { key: 'purchasing', menuId: 'purchasing' },
  { key: 'hr',         menuId: 'hr'         },
  { key: 'finance',    menuId: 'finance'    },
] as const

// Pagine foglia di ogni area; teniamo solo quelle ESCLUSIVE del segmento, così
// una pagina condivisa tra due aree non accende per sbaglio entrambe.
const impresa = (MENU as any[]).find(m => m.id === 'impresa')
const leafPages = (node: any, acc: string[] = []): string[] => {
  if (node.page) acc.push(node.page)
  node.children?.forEach((c: any) => leafPages(c, acc))
  return acc
}
const RAW_PAGES: Record<string, string[]> = Object.fromEntries(
  SEGMENTS.map(s => {
    const node = impresa?.children?.find((c: any) => c.id === s.menuId)
    return [s.key, node ? leafPages(node) : []]
  }),
)
const pageFreq: Record<string, number> = {}
for (const list of Object.values(RAW_PAGES)) {
  const seen: Record<string, true> = {}
  for (const pg of list) { if (seen[pg]) continue; seen[pg] = true; pageFreq[pg] = (pageFreq[pg] ?? 0) + 1 }
}
const SEGMENT_PAGES: Record<string, string[]> = Object.fromEntries(
  Object.entries(RAW_PAGES).map(([k, list]) => [k, list.filter(pg => pageFreq[pg] === 1)]),
)

// ── Menu radiale: voci che compaiono a destra al click di una freccia ──────────
// Colore = tinta reale del segmento nell'SVG del timone (non quella del menu).
interface RadialItem { label: string; page: string; icon: string }
interface RadialMenu { color: string; items: RadialItem[] }
const SEGMENT_MENU: Record<string, RadialMenu> = {
  sales: {
    color: '#d9773c',
    items: [
      { label: 'Suggerimenti Data driven', page: 'sugg-data-driven',  icon: 'crown' },
      { label: 'Screening Open Price',      page: 'screening-open',    icon: 'search-dollar' },
      { label: 'Pricing Benchmark',         page: 'pricing-benchmark', icon: 'chart-line' },
      { label: 'Pick up',                   page: 'pick-up',           icon: 'bar' },
      { label: 'Occupancy analysis',        page: 'occ-analysis',      icon: 'chart-area' },
      { label: 'ADR Analysis',              page: 'adr-analysis',      icon: 'chart-pie' },
      { label: 'Imposta distribuzione',     page: 'imposta-dist',      icon: 'building-circle' },
    ],
  },
  operation: {
    color: '#7f9c2a',
    items: [
      { label: 'Flusso di cassa',     page: 'flusso-cassa',        icon: 'money-bill' },
      { label: 'Conti passanti',      page: 'conti-passanti',      icon: 'arrows-rotate' },
      { label: 'Conti chiusi',        page: 'conti-chiusi',        icon: 'file-x' },
      { label: 'Conti aperti',        page: 'conti-aperti',        icon: 'file-check' },
      { label: 'Movimenti in attesa', page: 'movimenti-attesa',    icon: 'hourglass' },
      { label: 'Movimenti soggiorno', page: 'movimenti-soggiorno', icon: 'receipt' },
      { label: 'Cassa',               page: 'cassa',               icon: 'cash-register' },
    ],
  },
  purchasing: {
    color: '#f0c54e',
    items: [
      { label: 'I miei contratti',        page: 'miei-contratti-a',      icon: 'file' },
      { label: 'Inserisci contratto',     page: 'inserisci-contratto-a', icon: 'plus' },
      { label: 'Lista fornitori',         page: 'lista-fornitori',       icon: 'users' },
      { label: 'Area merceologica',       page: 'area-merceologica',     icon: 'archive' },
      { label: 'Crea acquisto condiviso', page: 'crea-acquisto',         icon: 'globe' },
      { label: 'Componi annunci',         page: 'componi-annunci',       icon: 'edit' },
      { label: 'Movimenti scorte',        page: 'movimenti-scorte',      icon: 'layers' },
    ],
  },
  hr: {
    color: '#79c5b5',
    items: [
      { label: 'Assegna obiettivo',         page: 'assegna-obiettivo',  icon: 'medal' },
      { label: 'HR Overview',               page: 'hr-overview',        icon: 'trend-up' },
      { label: 'Archivio del personale',    page: 'archivio-personale', icon: 'id-card' },
      { label: 'Crea anagrafica personale', page: 'crea-anagrafica',    icon: 'user-plus' },
      { label: 'Profile analysis',          page: 'profile-analysis',   icon: 'bar' },
      { label: 'Turni del personale',       page: 'turni-personale',    icon: 'list-check' },
      { label: 'Registro presenze',         page: 'registro-presenze',  icon: 'clock' },
    ],
  },
  finance: {
    color: '#e09545',
    items: [
      { label: 'Simulatore scenari',        page: 'simulatore',    icon: 'share-nodes' },
      { label: 'WIF analysis',              page: 'wif-analysis',  icon: 'chart-area' },
      { label: 'Benchmark finanziario',     page: 'benchmark-fin', icon: 'scale' },
      { label: 'Budget dei costi',          page: 'budget-costi',  icon: 'chart-pie' },
      { label: 'Imposta centro di costo',   page: 'centro-costo',  icon: 'dollar' },
      { label: 'Cost analysis',             page: 'cost-analysis', icon: 'gauge' },
      { label: 'Break even point analysis', page: 'break-even',    icon: 'bar' },
    ],
  },
}

// ── Hub centrale "Executive": 8 scorciatoie che orbitano attorno al timone ────
// `angle` = gradi dall'alto, orario (negativo = sinistra). Il fondo resta libero
// (lì c'è l'onda). Le bolle sono speculari sinistra/destra.
// Posizioni in % del box del timone (50/50 = centro). Disposizione a zigzag su
// due colonne per lato: riga1 interna, riga2 esterna, riga3 interna, riga4 esterna.
interface ExecItem { label: string; page: string; icon: string; x: number; y: number; disabled?: boolean }
const EXEC_ITEMS: ExecItem[] = [
  { label: 'Giornale impresa',    page: 'giornale-impresa',   icon: 'book',        x: 3,   y: 11 },
  { label: 'Executive overview',  page: 'executive-overview', icon: 'briefcase',   x: -17, y: 37 },
  { label: 'Simulatori scenari',  page: 'simulatore',         icon: 'share-nodes', x: 3,   y: 63 },
  { label: 'Sales overview',      page: 'sales-overview',     icon: 'chart-line',  x: -17, y: 89 },
  { label: 'Finance overview',    page: 'finance-overview',   icon: 'landmark',    x: 97,  y: 11 },
  { label: 'Cabina di controllo', page: 'cabina-controllo',   icon: 'gauge',       x: 117, y: 37 },
  { label: 'Decision tree',       page: 'decision-tree',      icon: 'org',         x: 97,  y: 63, disabled: true },
  { label: 'Panoramica acquisti', page: 'panoramica-acquisti', icon: 'cart',       x: 117, y: 89 },
]

interface Props { navigate?: (p: string) => void }

export default function Timone({ navigate }: Props) {
  const assist           = useAccessStore(s => s.assist)
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const profiles         = useAccessStore(s => s.profiles)
  const modules          = useModuliStore(s => s.moduli)

  // Moduli attivi: sessione di assistenza > profilo loggato > nessun limite.
  const moduli =
    assist?.moduli ??
    profiles.find(p => p.id === currentProfileId)?.moduli ??
    null
  const enabled = moduli ? enabledPagesForModuli(moduli, modules) : null
  const isLit = (key: string) =>
    !enabled || SEGMENT_PAGES[key].some(pg => enabled.has(pg))

  // Animazione d'ingresso al mount.
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const r = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(r)
  }, [])

  // I moduli non attivi si "spengono" (disabled) SOLO a fine ingresso: il
  // timone si assembla tutto a colori, poi i segmenti non sottoscritti sfumano.
  const [settled, setSettled] = useState(false)
  useEffect(() => {
    if (!entered) return
    const t = setTimeout(() => setSettled(true), 2650)
    return () => clearTimeout(t)
  }, [entered])

  // ── Stato: quale segmento è aperto, oppure modalità Executive (hub) ─────────
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [exec, setExec]       = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Solo dopo l'ingresso (settled) timone diventa interattivo.
  // Click al centro (hub) → Executive; click su un segmento acceso → suo menu.
  const onWheelClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!settled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    const dist = Math.hypot(dx, dy)
    // Hub centrale (cerchio "EXECUTIVE")
    if (dist < rect.width * 0.2) {
      setOpenKey(null)
      setExec(prev => !prev)
      return
    }
    const g = (e.target as Element).closest('[id^="seg-"]')
    const key = g?.id.replace('seg-', '')
    if (!key || !SEGMENT_MENU[key] || !isLit(key)) return
    setExec(false)
    setOpenKey(prev => (prev === key ? null : key))
  }

  // Chiusura su click esterno o Esc.
  const anyOpen = openKey || exec
  useEffect(() => {
    if (!anyOpen) return
    const close = () => { setOpenKey(null); setExec(false) }
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [anyOpen])

  // Una classe per ogni segmento da disabilitare (CSS: .is-dim-<key> #seg-<key>),
  // applicata solo dopo l'animazione.
  const dimClasses = settled
    ? SEGMENTS.filter(s => !isLit(s.key)).map(s => `is-dim-${s.key}`).join(' ')
    : ''

  const open = openKey ? SEGMENT_MENU[openKey] : null

  return (
    <div
      ref={rootRef}
      className={[
        'timone',
        entered ? 'timone--in' : '',
        settled ? 'timone--live' : '',
        settled ? 'timone--ready' : '',
        open ? 'timone--open' : '',
        exec ? 'timone--exec' : '',
        openKey ? `timone--sel-${openKey}` : '',
        dimClasses,
      ].filter(Boolean).join(' ')}
    >
      <div
        className="timone__wheel"
        role="img"
        aria-label="Timone Sibylla — moduli sottoscritti"
        onClick={onWheelClick}
      >
        <TimoneSvg className="timone__svg" />

        {/* Arco che si "disegna" sul lato destro del timone, tinta del segmento.
            key={openKey} → si rimonta a ogni cambio freccia e ri-anima il disegno. */}
        <svg
          key={openKey ?? 'closed'}
          className="timone__arc"
          viewBox="0 0 100 100"
          aria-hidden="true"
          style={open ? ({ ['--arc-color' as any]: open.color }) : undefined}
        >
          <path
            className="timone__arc-path"
            d="M50,2 A48,48 0 1 1 50,98"
            pathLength={100}
          />
        </svg>

        {/* Anello oro: trattamento "Executive" (approssimazione, in attesa SVG) */}
        <svg className="timone__exec-ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="40" pathLength={100} />
        </svg>
      </div>

      {/* Colonna di voci a destra */}
      {open && (
        <ul
          className="timone__menu"
          style={{ ['--menu-color' as any]: open.color }}
        >
          {open.items.map((it, i) => (
            <li key={it.page} className="timone__menu-item" style={{ ['--i' as any]: i }}>
              <button
                type="button"
                className="timone__menu-btn"
                onClick={() => navigate?.(it.page)}
              >
                <span className="timone__menu-ico">
                  <Ico n={it.icon} s={16} c="#fff" w="solid" />
                </span>
                <span className="timone__menu-label">{it.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Modalità Executive: bolle orbitanti */}
      {exec && (
        <div className="timone__exec">
          {EXEC_ITEMS.map((it, i) => (
            <button
              key={it.page}
              type="button"
              className={`timone__bubble ${it.disabled ? 'is-disabled' : ''}`}
              style={{ ['--bx' as any]: `${it.x}%`, ['--by' as any]: `${it.y}%`, ['--i' as any]: i }}
              disabled={it.disabled}
              onClick={() => !it.disabled && navigate?.(it.page)}
            >
              <span className="timone__bubble-ico">
                <Ico n={it.icon} s={20} c={it.disabled ? '#9fb0c0' : '#c2a15a'} w="duotone" />
              </span>
              <span className="timone__bubble-label">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
