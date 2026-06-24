import React, { useEffect, useState } from 'react'
import MENU from '../../../navigation/menu'
import { useAccessStore, enabledPagesForModuli } from '../../../store/useAccessStore'
import { useModuliStore } from '../../../store/useModuliStore'
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

export default function Timone() {
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

  // Una classe per ogni segmento da disabilitare (CSS: .is-dim-<key> #seg-<key>),
  // applicata solo dopo l'animazione.
  const dimClasses = settled
    ? SEGMENTS.filter(s => !isLit(s.key)).map(s => `is-dim-${s.key}`).join(' ')
    : ''

  return (
    <div
      className={`timone ${entered ? 'timone--in' : ''} ${settled ? 'timone--live' : ''} ${dimClasses}`}
      role="img"
      aria-label="Timone Sibylla — moduli sottoscritti"
    >
      <TimoneSvg className="timone__svg" />
    </div>
  )
}
