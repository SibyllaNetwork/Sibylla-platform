import React from 'react'
import Ico from '../../../../core/icons/Ico'
import type { Cliente, Ruolo } from '../../types'
import './RuoliTab.sass'

interface Props {
  client: Cliente
  ruoli: Ruolo[]
  onCreate: () => void
  onEdit: (r: Ruolo) => void
  onDelete: (id: string) => void
  onConfigureFunzioni: (id: string) => void
}

export default function RuoliTab({ client, ruoli, onCreate, onEdit, onDelete, onConfigureFunzioni }: Props) {
  return (
    <div className="ruoli-tab">
      <div className="ruoli-tab__head">
        <div>
          <div className="ruoli-tab__title">Ruoli</div>
          <div className="ruoli-tab__sub">Definisci i ruoli assegnabili agli utenti di {client.nome}</div>
        </div>
        <button className="sib-btn sib-btn--primary ruoli-tab__btn-new" onClick={onCreate}>
          <Ico n="plus" s={12} c="#fff" />
          Nuovo ruolo
        </button>
      </div>

      {ruoli.length === 0 ? (
        <div className="ruoli-tab__empty">
          <Ico n="org" s={28} c="var(--color-text-disabled)" />
          <p className="ruoli-tab__empty-text">Nessun ruolo definito. Crea il primo ruolo.</p>
        </div>
      ) : (
        <div className="ruoli-tab__list">
          {ruoli.map(r => (
            // --ruolo-color: colore scelto dall'utente fra 8 valori, non
            // esprimibile come classe statica → CSS custom property
            <div key={r.id} className="ruoli-tab__row" style={{ ['--ruolo-color' as any]: r.colore }}>
              <div className="ruoli-tab__avatar">
                <Ico n="org" s={16} c="#fff" />
              </div>
              <div className="ruoli-tab__meta">
                <div className="ruoli-tab__name">{r.nome}</div>
                {r.desc && <div className="ruoli-tab__desc">{r.desc}</div>}
              </div>
              <div className="ruoli-tab__actions">
                <button className="ruoli-tab__configure" onClick={() => onConfigureFunzioni(r.id)}>
                  <Ico n="gear" s={11} c="var(--color-link)" /> Configura funzioni
                </button>
                <button className="ruoli-tab__icon-btn ruoli-tab__icon-btn--edit" onClick={() => onEdit(r)} aria-label="Modifica ruolo">
                  <Ico n="edit" s={12} c="var(--color-link)" />
                </button>
                <button className="ruoli-tab__icon-btn ruoli-tab__icon-btn--del" onClick={() => onDelete(r.id)} aria-label="Elimina ruolo">
                  <Ico n="trash" s={12} c="var(--color-error)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
