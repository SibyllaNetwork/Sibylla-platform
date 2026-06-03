import React, { useState } from 'react'
import Modal from './Modal'
import './VerificaCodiceModal.sass'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void   // codice verificato → mostra la carta
}

export default function VerificaCodiceModal({ open, onClose, onConfirm }: Props) {
  const [codice, setCodice] = useState('')

  const handleConfirm = () => {
    if (!codice.trim()) return
    onConfirm()
    setCodice('')
  }

  const handleClose = () => {
    setCodice('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Verifica codice VCC" size="xl">
      <p className="verifica-vcc__text">
        Inserisci il codice arrivato per email per poter visualizzare nuovamente la VCC richiesta
      </p>
      <input
        className="sib-input verifica-vcc__input"
        type="text"
        placeholder="Codice"
        value={codice}
        onChange={(e) => setCodice(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
      />
      <div className="verifica-vcc__actions">
        <button type="button" className="sib-btn sib-btn--primary" onClick={handleConfirm} disabled={!codice.trim()}>
          Conferma
        </button>
      </div>
    </Modal>
  )
}
