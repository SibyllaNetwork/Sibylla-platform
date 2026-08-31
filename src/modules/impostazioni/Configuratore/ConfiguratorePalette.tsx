import React, { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import SearchField from '../../../core/components/form/SearchField'
import CfgBadge from '../../../core/cfg/CfgBadge'
import type { CfgDisplayStatus } from '../../../store/useConfiguratoreStore'
import { CFG_GROUPS, type ConfiguratoreDef, type ConfiguratoreId } from './registry'
import './ConfiguratorePalette.sass'

// ─── COMMAND PALETTE (Configuratore) ─────────────────────────────────────────
//  Ricerca rapida delle voci (⌘K / clic sulla search): fuzzy su label,
//  descrizione e sinonimi (es. "no-show" → Politiche di prenotazione),
//  risultati raggruppati per corsia con badge di stato, navigazione completa
//  da tastiera (frecce / Enter / Esc).

export interface PaletteEntry {
  def: ConfiguratoreDef
  status: CfgDisplayStatus
}

export interface ConfiguratorePaletteProps {
  open: boolean
  onClose: () => void
  entries: PaletteEntry[]
  onSelect: (id: ConfiguratoreId) => void
}

// ── Fuzzy matching ─────────────────────────────────────────────────────────────
// Ogni token della query deve trovare posto in label, keywords o descrizione;
// il punteggio privilegia i match sul nome, poi i sinonimi, poi la descrizione.

function isSubsequence(needle: string, hay: string): boolean {
  let i = 0
  for (const ch of hay) {
    if (ch === needle[i]) i++
    if (i === needle.length) return true
  }
  return needle.length === 0
}

function tokenScore(token: string, def: ConfiguratoreDef): number {
  const label = def.label.toLowerCase()
  if (label.startsWith(token)) return 100
  if (label.includes(token)) return 80
  for (const kw of def.keywords) {
    const k = kw.toLowerCase()
    if (k.startsWith(token)) return 70
    if (k.includes(token)) return 60
  }
  if (def.description.toLowerCase().includes(token)) return 40
  if (token.length >= 3 && isSubsequence(token, label)) return 20
  return -1
}

function scoreOf(query: string, def: ConfiguratoreDef): number {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 0
  let total = 0
  for (const t of tokens) {
    const s = tokenScore(t, def)
    if (s < 0) return -1
    total += s
  }
  return total
}

export default function ConfiguratorePalette({ open, onClose, entries, onSelect }: ConfiguratorePaletteProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset + focus all'apertura
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  // Risultati: filtrati, ordinati per punteggio e raggruppati per corsia
  const results = useMemo(() => {
    const scored = entries
      .map(e => ({ ...e, score: scoreOf(query, e.def) }))
      .filter(e => e.score >= 0)
      .sort((a, b) => b.score - a.score)

    const byGroup = new Map<string, typeof scored>()
    for (const e of scored) {
      const list = byGroup.get(e.def.group) ?? []
      list.push(e)
      byGroup.set(e.def.group, list)
    }
    // Ordine corsie del registry; dentro la corsia l'ordine del punteggio
    const groups = CFG_GROUPS
      .filter(g => byGroup.has(g.id))
      .map(g => ({ group: g, items: byGroup.get(g.id)! }))
    const flat = groups.flatMap(g => g.items)
    return { groups, flat }
  }, [entries, query])

  // La selezione resta dentro i limiti quando cambiano i risultati
  useEffect(() => {
    setSelected(s => Math.min(s, Math.max(0, results.flat.length - 1)))
  }, [results.flat.length])

  // La voce selezionata resta visibile nello scroll
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-selected="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected, results.flat.length])

  if (!open) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, results.flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = results.flat[selected]
      if (hit) onSelect(hit.def.id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  let flatIndex = -1

  return (
    <div className="cfg-palette" role="dialog" aria-modal="true" aria-label="Cerca configuratore">
      <div className="cfg-palette__backdrop" onClick={onClose} />
      <div className="cfg-palette__panel" onKeyDown={handleKeyDown}>
        <div className="cfg-palette__search">
          <SearchField
            ref={inputRef}
            name="cfg-palette-search"
            value={query}
            placeholder="Cerca per nome, descrizione o sinonimo (es. no-show)…"
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onClear={() => { setQuery(''); setSelected(0) }}
          />
        </div>

        <div ref={listRef} className="cfg-palette__list" role="listbox">
          {results.flat.length === 0 ? (
            <div className="cfg-palette__empty">
              Nessun configuratore per «{query}»
            </div>
          ) : results.groups.map(({ group, items }) => (
            <div key={group.id} className="cfg-palette__group">
              <div className="cfg-palette__group-label">
                <i className={`fa-light fa-${group.icon}`} aria-hidden="true" />
                {group.label}
              </div>
              {items.map(entry => {
                flatIndex += 1
                const idx = flatIndex
                const isSelected = idx === selected
                return (
                  <button
                    key={entry.def.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-selected={isSelected || undefined}
                    className={clsx('cfg-palette__item', isSelected && 'cfg-palette__item--selected')}
                    onClick={() => onSelect(entry.def.id)}
                    onMouseMove={() => setSelected(idx)}
                  >
                    <i className={`fa-light fa-${entry.def.icon} cfg-palette__item-icon`} aria-hidden="true" />
                    <span className="cfg-palette__item-texts">
                      <span className="cfg-palette__item-label">{entry.def.label}</span>
                      <span className="cfg-palette__item-desc">{entry.def.description}</span>
                    </span>
                    <CfgBadge status={entry.status} className="cfg-palette__item-badge" />
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <footer className="cfg-palette__foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> naviga</span>
          <span><kbd>Invio</kbd> apri</span>
          <span><kbd>Esc</kbd> chiudi</span>
        </footer>
      </div>
    </div>
  )
}
