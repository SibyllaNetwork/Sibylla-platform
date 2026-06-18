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
  /** Override del titolo (es. uso in piattaforma, fuori dalla sezione admin). */
  title?: string
  /** Override della label del pulsante di conferma. */
  confirmLabel?: string
}

export default function NewClientModal({ open, form, setForm, onClose, onConfirm, editMode = false, title, confirmLabel }: Props) {
  const disabled = !form.nome.trim()
  const heading = title ?? (editMode ? 'Modifica struttura' : 'Nuova struttura cliente')
  const cta = confirmLabel ?? (editMode ? 'Salva modifica' : 'Crea struttura')

  return (
    <Modal open={open} onClose={onClose} title={heading} size="xl" className="ncm-box">
      <StructFields form={form} setForm={setForm} />

      <div className="ncm__footer">
        <button className="sib-btn sib-btn--toolbar" onClick={onClose}>Annulla</button>
        <button className="sib-btn sib-btn--primary" disabled={disabled} onClick={onConfirm}>{cta}</button>
      </div>
    </Modal>
  )
}
