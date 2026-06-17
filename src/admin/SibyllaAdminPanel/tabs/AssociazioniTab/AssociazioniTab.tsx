import React, { useEffect, useRef, useState } from 'react'
import Ico from '../../../../core/icons/Ico'
import { avatarUrl } from '../../../../core/avatar'
import type { Cliente, Ruolo, UserAssoc, UserRow } from '../../types'
import './AssociazioniTab.sass'

interface StrutturaOpt { id: number; nome: string }

interface Props {
  client: Cliente
  users: UserRow[]
  ruoli: Ruolo[]
  strutture: StrutturaOpt[]
  assoc: Record<number, UserAssoc>
  onChange: (userId: number, next: UserAssoc) => void
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tab "Gestione associazioni" — per ogni utente: le strutture collegate e, per
//  CIASCUNA struttura, i ruoli specifici (lo stesso utente può avere ruoli
//  diversi su strutture diverse). Persistito via useAdminConfigStore.
// ─────────────────────────────────────────────────────────────────────────────
export default function AssociazioniTab({ client, users, ruoli, strutture, onChange, assoc }: Props) {
  const ruoloOpts = ruoli.map(r => ({ value: r.id, label: r.nome }))
  const struttOpts = strutture.map(s => ({ value: String(s.id), label: s.nome }))
  const struttLabel = (id: string) => strutture.find(s => String(s.id) === id)?.nome ?? id

  return (
    <div className="assoc-tab">
      <div className="assoc-tab__head">
        <div>
          <div className="assoc-tab__title">Gestione associazioni</div>
          <div className="assoc-tab__sub">{client.nome} — per ogni utente, ruoli specifici per ciascuna struttura associata</div>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="assoc-tab__empty">Nessun utente. Aggiungilo dal tab «Utenti».</div>
      ) : (
        <div className="assoc-tab__list">
          {users.map(u => {
            const a: UserAssoc = assoc[u.id] || { strutture: {} }
            const assocIds = Object.keys(a.strutture)

            // Aggiunge/rimuove strutture mantenendo i ruoli di quelle già presenti.
            const onStrutture = (ids: string[]) => {
              const next: Record<string, string[]> = {}
              ids.forEach(id => { next[id] = a.strutture[id] ?? [] })
              onChange(u.id, { strutture: next })
            }
            const onRuoli = (sid: string, roleIds: string[]) =>
              onChange(u.id, { strutture: { ...a.strutture, [sid]: roleIds } })

            return (
              <div key={u.id} className="assoc-card">
                <div className="assoc-card__head">
                  <img className="assoc-card__avatar" src={avatarUrl(u.email || u.nome)} alt={u.nome} />
                  <div className="assoc-card__user">
                    <div className="assoc-card__name">{u.nome}</div>
                    <div className="assoc-card__mail">{u.email}</div>
                  </div>
                  <div className="assoc-card__strutture-sel">
                    <span className="assoc-card__sel-label">Strutture associate</span>
                    <MultiSelect
                      options={struttOpts}
                      selected={assocIds}
                      placeholder="Associa strutture"
                      emptyText="Nessuna struttura."
                      onChange={onStrutture}
                    />
                  </div>
                </div>

                {assocIds.length === 0 ? (
                  <div className="assoc-card__empty">Nessuna struttura associata a questo utente.</div>
                ) : (
                  <div className="assoc-card__rows">
                    <div className="assoc-card__rows-head">
                      <div>Struttura</div>
                      <div>Ruoli su questa struttura</div>
                    </div>
                    {assocIds.map(sid => (
                      <div key={sid} className="assoc-card__row">
                        <span className="assoc-card__struttura">
                          <Ico n="building" s={13} c="var(--color-primary)" />
                          {struttLabel(sid)}
                        </span>
                        <MultiSelect
                          options={ruoloOpts}
                          selected={a.strutture[sid] || []}
                          placeholder="Seleziona ruoli"
                          emptyText="Nessun ruolo — creane nel tab «Ruoli»."
                          onChange={v => onRuoli(sid, v)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Multi-select a checkbox (stile "N selezionati") ────────────────────────────
function MultiSelect({ options, selected, placeholder, emptyText, onChange }: {
  options: { value: string; label: string }[]
  selected: string[]
  placeholder: string
  emptyText: string
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])

  const label = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? (options.find(o => o.value === selected[0])?.label ?? '1 selezionato')
      : `${selected.length} selezionati`

  return (
    <div className="assoc-ms" ref={ref}>
      <button type="button" className={`assoc-ms__control${open ? ' assoc-ms__control--open' : ''}`} onClick={() => setOpen(o => !o)}>
        <span className={selected.length ? 'assoc-ms__value' : 'assoc-ms__placeholder'}>{label}</span>
        <Ico n="chevd" s={12} c="var(--color-text-inactive)" />
      </button>
      {open && (
        <div className="assoc-ms__panel">
          {options.length === 0 ? (
            <div className="assoc-ms__panel-empty">{emptyText}</div>
          ) : (
            options.map(o => (
              <label key={o.value} className="assoc-ms__opt">
                <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
                <span>{o.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}
