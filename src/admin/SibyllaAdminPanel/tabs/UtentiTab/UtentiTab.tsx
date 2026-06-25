import React from 'react'
import Ico from '../../../../core/icons/Ico'
import { InputField, SelectField } from '../../../../core/components/form'
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
          <InputField
            name="utente-nome"
            label="Nome"
            value={newUser.nome}
            onChange={e => setNewUser({ ...newUser, nome: e.target.value })}
            placeholder="Nome cognome"
          />
          <InputField
            name="utente-email"
            label="Email"
            value={newUser.email}
            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="email@esempio.it"
          />
          <SelectField
            name="utente-ruolo"
            label="Ruolo"
            value={newUser.ruolo}
            onChange={e => setNewUser({ ...newUser, ruolo: e.target.value })}
            options={RUOLI_UTENTE.map(r => ({ value: r, label: r }))}
          />
          <button className="sib-btn sib-btn--primary utenti-tab__add-btn" onClick={onAdd}>
            + Aggiungi
          </button>
        </div>
      </div>
    </div>
  )
}
