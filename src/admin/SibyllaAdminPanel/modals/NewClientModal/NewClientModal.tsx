import React from 'react'
import Modal from '../../../../core/components/Modal'
import StructFields from './StructFields'
import type { NewClientForm } from '../../types'
import './NewClientModal.sass'

interface Props {
  open: boolean
  form: NewClientForm
  setForm: (f: NewClientForm) => void
  onClose: () => void
  onConfirm: () => void
  /** true = modale di modifica struttura esistente (titolo + cta diversi). */
  editMode?: boolean
}

export default function NewClientModal({ open, form, setForm, onClose, onConfirm, editMode = false }: Props) {
  const disabled = !form.nome.trim()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editMode ? 'Modifica struttura' : 'Nuova struttura cliente'}
      size="xl"
      className="ncm-box"
    >
      <StructFields form={form} setForm={setForm} />

      <div className="ncm__footer">
        <button className="sib-btn sib-btn--toolbar" onClick={onClose}>Annulla</button>
        <button className="sib-btn sib-btn--primary" disabled={disabled} onClick={onConfirm}>
          {editMode ? 'Salva modifica' : 'Crea struttura'}
        </button>
      </div>
    </Modal>
  )
}
