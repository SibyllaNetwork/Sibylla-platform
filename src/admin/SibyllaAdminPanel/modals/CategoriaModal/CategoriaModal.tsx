import React from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import { ICON_OPTIONS, MACRO_AREE } from '../../catalogo/mockData'
import type { Categoria, CategoriaForm } from '../../catalogo/types'
import './CategoriaModal.sass'

interface Props {
  open: boolean
  editing: Categoria | null
  form: CategoriaForm
  setForm: (f: CategoriaForm) => void
  onClose: () => void
  onConfirm: () => void
}

export default function CategoriaModal({ open, editing, form, setForm, onClose, onConfirm }: Props) {
  const disabled = !form.nome.trim() || !form.macroArea
  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="cat-modal">
        <div className="cat-modal__head">
          <div>
            <h2 className="cat-modal__title">{editing ? 'Modifica categoria' : 'Nuova categoria merceologica'}</h2>
            <p className="cat-modal__sub">Le categorie alimentano le pagine Area Merceologica e Forniture</p>
          </div>
          <button className="cat-modal__close" onClick={onClose} aria-label="Chiudi">
            <Ico n="x" s={18} c="var(--color-text-disabled)" />
          </button>
        </div>

        <div className="cat-modal__form">
          <div>
            <label className="cat-modal__label">Nome categoria *</label>
            <input
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              className="sib-input"
              placeholder="Es. Vini e Bevande"
            />
          </div>
          <div>
            <label className="cat-modal__label">Macro-area *</label>
            <select
              value={form.macroArea}
              onChange={e => setForm({ ...form, macroArea: e.target.value })}
              className="sib-select"
            >
              <option value="">Seleziona macro-area...</option>
              {MACRO_AREE.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="cat-modal__label">Descrizione</label>
            <textarea
              value={form.descrizione}
              onChange={e => setForm({ ...form, descrizione: e.target.value })}
              className="sib-input cat-modal__textarea"
              rows={3}
              placeholder="Breve descrizione della categoria"
            />
          </div>
          <div>
            <label className="cat-modal__label">Icona</label>
            <div className="cat-modal__icons">
              {ICON_OPTIONS.map(ic => {
                const cls = `cat-modal__icon-pick${form.icona === ic ? ' cat-modal__icon-pick--active' : ''}`
                return (
                  <button
                    key={ic}
                    type="button"
                    className={cls}
                    onClick={() => setForm({ ...form, icona: ic })}
                    aria-label={ic}
                  >
                    <i className={`fa-duotone ${ic}`} />
                  </button>
                )
              })}
            </div>
          </div>
          <div className="cat-modal__actions">
            <button className="sib-btn sib-btn--toolbar" onClick={onClose}>Annulla</button>
            <button className="sib-btn sib-btn--primary" disabled={disabled} onClick={onConfirm}>
              {editing ? 'Aggiorna categoria' : 'Crea categoria'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
