import React from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import './ConfirmDeleteModal.sass'

interface Props {
  open: boolean
  title: string
  itemName: string
  onClose: () => void
  onConfirm: () => void
}

export default function ConfirmDeleteModal({ open, title, itemName, onClose, onConfirm }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="del-modal">
        <div className="del-modal__ico">
          <Ico n="trash" s={20} c="var(--color-error)" />
        </div>
        <h2 className="del-modal__title">{title}</h2>
        <p className="del-modal__name">{itemName}</p>
        <div className="del-modal__actions">
          <button className="sib-btn sib-btn--toolbar" onClick={onClose}>Annulla</button>
          <button className="sib-btn sib-btn--danger" onClick={onConfirm}>
            <Ico n="trash" s={13} c="#fff" /> Elimina
          </button>
        </div>
      </div>
    </Modal>
  )
}
