import React, { useState } from 'react'
import Ico from '../../../core/icons/Ico'
import { useAccessStore, enabledPagesForProfile } from '../../../store/useAccessStore'
import { useModuliStore } from '../../../store/useModuliStore'
import './ProfileLogin.sass'

const initials = (nome: string) =>
  nome.split(/\s+/).filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase() || '?'

// ─────────────────────────────────────────────────────────────────────────────
//  ProfileLogin — Login dei profili: carica un'utenza fittizia (→ menu filtrato
//  sui moduli del suo contratto) e permette di inserire nuove utenze.
//  Overlay a tutto schermo, apribile dalla topbar. Nessun gate: chiudibile.
// ─────────────────────────────────────────────────────────────────────────────
export default function ProfileLogin() {
  const profiles         = useAccessStore(s => s.profiles)
  const modules          = useModuliStore(s => s.moduli)
  const currentProfileId = useAccessStore(s => s.currentProfileId)
  const loginAs          = useAccessStore(s => s.loginAs)
  const addProfile       = useAccessStore(s => s.addProfile)
  const removeProfile    = useAccessStore(s => s.removeProfile)
  const closeAccess      = useAccessStore(s => s.closeAccess)

  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', password: 'demo', cliente: '', ruolo: 'Manager', moduli: [] as string[] })

  const toggleMod = (id: string) =>
    setForm(f => ({ ...f, moduli: f.moduli.includes(id) ? f.moduli.filter(m => m !== id) : [...f.moduli, id] }))

  const canCreate = !!form.nome.trim() && !!form.email.trim() && form.moduli.length > 0
  const create = () => {
    if (!canCreate) return
    const id = addProfile({
      nome: form.nome.trim(), email: form.email.trim(), password: form.password || 'demo',
      cliente: form.cliente.trim() || '—', ruolo: form.ruolo || 'Operatore', moduli: form.moduli,
    })
    loginAs(id)
  }

  const moduleLabel = (mid: string) => modules.find(m => m.id === mid)?.label ?? mid

  return (
    <div className="plogin">
      <div className="plogin__panel">
        <button className="plogin__close" onClick={closeAccess} aria-label="Chiudi">
          <Ico n="x" s={18} c="var(--color-text-disabled)" />
        </button>

        <div className="plogin__head">
          <div className="plogin__brand">
            <span className="plogin__brand-name">Sibylla</span>
            <span className="plogin__brand-suffix">Platform</span>
          </div>
          <h2 className="plogin__title">Accesso profili</h2>
          <p className="plogin__sub">Carica un'utenza: il menu mostrato sarà quello dei moduli sottoscritti dal suo contratto.</p>
        </div>

        <div className="plogin__grid">
          <button
            className={`plogin__card plogin__card--full${currentProfileId === null ? ' plogin__card--active' : ''}`}
            onClick={() => loginAs(null)}
          >
            <span className="plogin__avatar plogin__avatar--full"><Ico n="layers" s={18} c="#fff" /></span>
            <span className="plogin__card-name">Sibylla Admin</span>
            <span className="plogin__card-client">Tutti i moduli · menu completo</span>
          </button>

          {profiles.map(p => {
            const count = enabledPagesForProfile(p, modules).size
            const active = currentProfileId === p.id
            return (
              <div
                key={p.id}
                className={`plogin__card${active ? ' plogin__card--active' : ''}`}
                onClick={() => loginAs(p.id)}
                role="button"
                tabIndex={0}
              >
                <button className="plogin__del" onClick={e => { e.stopPropagation(); removeProfile(p.id) }} aria-label="Elimina utenza">
                  <Ico n="trash" s={12} c="var(--color-text-inactive)" />
                </button>
                <span className="plogin__avatar">{initials(p.nome)}</span>
                <span className="plogin__card-name">{p.nome}</span>
                <span className="plogin__card-client">{p.cliente} · {p.ruolo}</span>
                <span className="plogin__badges">
                  {p.moduli.map(m => <span key={m} className="plogin__badge">{moduleLabel(m)}</span>)}
                </span>
                <span className="plogin__pages">{count} pagine</span>
              </div>
            )
          })}
        </div>

        {!adding ? (
          <button className="plogin__add-toggle" onClick={() => setAdding(true)}>
            <Ico n="plus" s={13} c="var(--color-primary)" /> Inserisci nuova utenza
          </button>
        ) : (
          <div className="plogin__form">
            <div className="plogin__form-head">Nuova utenza</div>
            <div className="plogin__form-grid">
              <input className="sib-input" placeholder="Nome e cognome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
              <input className="sib-input" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <input className="sib-input" placeholder="Cliente / struttura" value={form.cliente} onChange={e => setForm({ ...form, cliente: e.target.value })} />
              <input className="sib-input" placeholder="Ruolo" value={form.ruolo} onChange={e => setForm({ ...form, ruolo: e.target.value })} />
            </div>
            <div className="plogin__mods-label">Moduli sottoscritti dal contratto</div>
            <div className="plogin__mods">
              {modules.map(m => (
                <label key={m.id} className={`plogin__chip${form.moduli.includes(m.id) ? ' plogin__chip--on' : ''}`}>
                  <input type="checkbox" checked={form.moduli.includes(m.id)} onChange={() => toggleMod(m.id)} />
                  {m.label}
                </label>
              ))}
            </div>
            <div className="plogin__form-actions">
              <button className="sib-btn sib-btn--toolbar" onClick={() => setAdding(false)}>Annulla</button>
              <button className="sib-btn sib-btn--primary" disabled={!canCreate} onClick={create}>Crea e accedi</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
