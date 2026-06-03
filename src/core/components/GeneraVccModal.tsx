import React, { useState } from 'react'
import Modal from './Modal'
import './GeneraVccModal.sass'

interface Props {
  open: boolean
  onClose: () => void
  creditoResiduo: number          // saldo disponibile mostrato come "Credito residuo"
  onGenera: (importo: number) => void
}

export default function GeneraVccModal({ open, onClose, creditoResiduo, onGenera }: Props) {
  const [importo, setImporto] = useState('')
  const [generating, setGenerating] = useState(false)

  const credito = creditoResiduo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleGenera = () => {
    if (generating) return
    const amt = parseFloat(importo) || 0
    // Spinner: simula la fase di generazione della carta
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      setImporto('')
      onGenera(amt)
    }, 1600)
  }

  const handleClose = () => {
    if (generating) return
    setImporto('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Genera VCC" size="md" className="genera-vcc">
      <div className="genera-vcc__credito">Credito residuo: {credito} €</div>

      <div className="genera-vcc__body">
        <div className="genera-vcc__form">
          <label className="genera-vcc__label" htmlFor="genera-vcc-importo">Genera VCC per un importo pari a:</label>
          <div className="genera-vcc__input-wrap">
            <span className="genera-vcc__currency">€</span>
            <input
              id="genera-vcc-importo"
              className="genera-vcc__input"
              type="number"
              min="0"
              placeholder="0"
              value={importo}
              disabled={generating}
              onChange={(e) => setImporto(e.target.value)}
            />
          </div>
        </div>
      </div>

      {generating && (
        <div className="genera-vcc__loading">
          <i className="fa-duotone fa-spinner genera-vcc__spinner" aria-hidden="true" />
          Generazione della carta in corso…
        </div>
      )}

      <div className="genera-vcc__actions">
        <button type="button" className="genera-vcc__btn genera-vcc__btn--primary" onClick={handleGenera} disabled={generating}>
          {generating ? (
            <><i className="fa-duotone fa-spinner genera-vcc__spinner" aria-hidden="true" /> Generazione…</>
          ) : 'Genera'}
        </button>
        <button type="button" className="genera-vcc__btn genera-vcc__btn--ghost" onClick={handleClose} disabled={generating}>Annulla</button>
      </div>
    </Modal>
  )
}
