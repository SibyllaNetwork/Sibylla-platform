import React from 'react'
import Ico from '../../../../core/icons/Ico'
import { RUOLI_UTENTE } from '../../constants'
import type { UserRow } from '../../types'
import './UtentiTab.sass'

interface NewUser {
  nome: string
  email: string
  ruolo: string
}

interface Props {
  users: UserRow[]
  newUser: NewUser
  setNewUser: (v: NewUser) => void
  onAdd: () => void
  onRemove: (id: number) => void
}

export default function UtentiTab({ users, newUser, setNewUser, onAdd, onRemove }: Props) {
  return (
    <div className="utenti-tab">
      <div className="utenti-tab__title">Utenti del cliente</div>

      <div className="utenti-tab__table">
        {users.length === 0 ? (
          <div className="utenti-tab__empty">Nessun utente configurato</div>
        ) : users.map((u, i) => {
          const cls = `utenti-tab__row${i < users.length - 1 ? ' utenti-tab__row--bordered' : ''}`
          const stateCls = `utenti-tab__state${u.attivo ? ' utenti-tab__state--on' : ''}`
          return (
            <div key={u.id} className={cls}>
              <div className="utenti-tab__name">{u.nome}</div>
              <div className="utenti-tab__email">{u.email}</div>
              <div className="utenti-tab__role">{u.ruolo}</div>
              <div className="utenti-tab__actions">
                <span className={stateCls}>{u.attivo ? 'Attivo' : 'Inattivo'}</span>
                <button className="utenti-tab__del" onClick={() => onRemove(u.id)} aria-label="Rimuovi utente">
                  <Ico n="trash" s={13} c="var(--color-error)" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="utenti-tab__add">
        <div className="utenti-tab__add-title">Aggiungi utente</div>
        <div className="utenti-tab__add-grid">
          <div>
            <label className="utenti-tab__label">Nome</label>
            <input
              value={newUser.nome}
              onChange={e => setNewUser({ ...newUser, nome: e.target.value })}
              className="sib-input"
              placeholder="Nome cognome"
            />
          </div>
          <div>
            <label className="utenti-tab__label">Email</label>
            <input
              value={newUser.email}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              className="sib-input"
              placeholder="email@esempio.it"
            />
          </div>
          <div>
            <label className="utenti-tab__label">Ruolo</label>
            <select
              value={newUser.ruolo}
              onChange={e => setNewUser({ ...newUser, ruolo: e.target.value })}
              className="sib-select"
            >
              {RUOLI_UTENTE.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <button className="sib-btn sib-btn--primary utenti-tab__add-btn" onClick={onAdd}>
            + Aggiungi
          </button>
        </div>
      </div>
    </div>
  )
}
