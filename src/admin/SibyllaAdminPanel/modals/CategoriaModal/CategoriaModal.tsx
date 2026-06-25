import React from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import { InputField, SelectField, TextareaField } from '../../../../core/components/form'
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
          <InputField
            name="nome"
            label="Nome categoria *"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            placeholder="Es. Vini e Bevande"
          />
          <SelectField
            name="macro-area"
            label="Macro-area *"
            value={form.macroArea}
            onChange={e => setForm({ ...form, macroArea: e.target.value })}
            placeholder="Seleziona macro-area..."
            options={MACRO_AREE.map(m => ({ value: m.id, label: m.label }))}
          />
          <TextareaField
            name="descrizione"
            label="Descrizione"
            value={form.descrizione}
            onChange={e => setForm({ ...form, descrizione: e.target.value })}
            rows={3}
            placeholder="Breve descrizione della categoria"
          />
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
