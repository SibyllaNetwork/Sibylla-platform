import React from 'react'
import Modal from '../../../../../core/components/Modal'
import './HrFormModal.sass'

// ─── Modale crea/modifica dei pane «Risorse umane» ───────────────────────────
//  Corpo a colonna con gap standard, righe a 2/3 colonne (`.hrcfg-modal__row`,
//  `--3`) e footer Annulla / Conferma.

export default function HrFormModal({ open, title, onClose, onSubmit, submitLabel, canSubmit = true, size = 'md', children }: {
  open: boolean
  title: string
  onClose: () => void
  onSubmit: () => void
  submitLabel: string
  canSubmit?: boolean
  size?: 'md' | 'lg'
  children: React.ReactNode
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size={size === 'lg' ? 'xl' : 'md'} className={`hrcfg-modal hrcfg-modal--${size}`}>
      <div className="hrcfg-modal__body">{children}</div>
      <div className="hrcfg-modal__footer">
        <button type="button" className="sib-btn sib-btn--ghost" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!canSubmit} onClick={onSubmit}>{submitLabel}</button>
      </div>
    </Modal>
  )
}
