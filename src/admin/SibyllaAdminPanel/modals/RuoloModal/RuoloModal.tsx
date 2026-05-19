import React from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import { RUOLO_COLORS } from '../../constants'
import type { Ruolo, RuoloForm } from '../../types'
import './RuoloModal.sass'

interface Props {
  open: boolean
  editing: Ruolo | null
  form: RuoloForm
  setForm: (f: RuoloForm) => void
  onClose: () => void
  onConfirm: () => void
}

export default function RuoloModal({ open, editing, form, setForm, onClose, onConfirm }: Props) {
  const disabled = !form.nome.trim()
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="ruolo-modal">
        <div className="ruolo-modal__head">
          <h2 className="ruolo-modal__title">{editing ? 'Modifica ruolo' : 'Nuovo ruolo'}</h2>
          <button className="ruolo-modal__close" onClick={onClose} aria-label="Chiudi">
            <Ico n="x" s={16} c="var(--color-text-disabled)" />
          </button>
        </div>

        <div className="ruolo-modal__form">
          <div>
            <label className="ruolo-modal__label">Nome ruolo *</label>
            <input
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="Es. Receptionist"
              className="sib-input"
            />
          </div>
          <div>
            <label className="ruolo-modal__label">Descrizione</label>
            <input
              value={form.desc}
              onChange={e => setForm({ ...form, desc: e.target.value })}
              placeholder="Breve descrizione"
              className="sib-input"
            />
          </div>
          <div>
            <label className="ruolo-modal__label">Colore</label>
            <div className="ruolo-modal__colors">
              {RUOLO_COLORS.map(c => {
                const cls = `ruolo-modal__swatch${form.colore === c ? ' ruolo-modal__swatch--active' : ''}`
                // --swatch: il colore proviene dalla palette utente (8 valori)
                // — non rappresentabile con classi statiche
                return (
                  <button
                    key={c}
                    className={cls}
                    onClick={() => setForm({ ...form, colore: c })}
                    style={{ ['--swatch' as any]: c }}
                    aria-label={`Colore ${c}`}
                  />
                )
              })}
            </div>
          </div>
          <div className="ruolo-modal__actions">
            <button className="sib-btn sib-btn--toolbar" onClick={onClose}>Annulla</button>
            <button className="sib-btn sib-btn--primary" disabled={disabled} onClick={onConfirm}>
              {editing ? 'Aggiorna' : 'Crea ruolo'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
