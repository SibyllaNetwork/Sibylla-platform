import React from 'react'
import Modal from './Modal'
import { useConfirmStore } from '../../store/useConfirmStore'
import './ConfirmDialog.sass'

// Alert di conferma globale (standard piattaforma per le azioni distruttive).
// Va montato UNA volta nell'albero dell'app; reagisce a useConfirmStore.
export default function ConfirmDialog() {
  const open    = useConfirmStore((s) => s.open)
  const options = useConfirmStore((s) => s.options)
  const resolve = useConfirmStore((s) => s.resolve)

  const {
    title = 'Conferma eliminazione',
    message = 'Vuoi davvero eliminare questo elemento? L’operazione non è reversibile.',
    confirmLabel = 'Elimina',
    cancelLabel = 'Annulla',
    danger = true,
  } = options

  return (
    <Modal open={open} onClose={() => resolve(false)} title={title} size="sm">
      <div className="confirm-dialog">
        <div className={'confirm-dialog__icon' + (danger ? ' confirm-dialog__icon--danger' : '')}>
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        </div>
        <div className="confirm-dialog__message">{message}</div>
      </div>
      <div className="confirm-dialog__foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => resolve(false)}>{cancelLabel}</button>
        <button
          type="button"
          className={'sib-btn ' + (danger ? 'sib-btn--danger' : 'sib-btn--primary')}
          onClick={() => resolve(true)}
          autoFocus
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
