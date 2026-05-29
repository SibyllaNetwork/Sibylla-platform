import React from 'react'
import Modal from '../../../../core/components/Modal'
import './AttenzioneCapienzaModal.sass'

interface StrutturaAlert {
  nome: string
  licenza: number
  inventario: number
}

interface Props {
  open: boolean
  onClose: () => void
  strutture: StrutturaAlert[]
}

export default function AttenzioneCapienzaModal({ open, onClose, strutture }: Props) {
  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="att-cap">
        <div className="att-cap__icon" aria-hidden="true">
          <i className="fa-duotone fa-triangle-exclamation" />
        </div>

        <h2 className="att-cap__title">Attenzione</h2>
        <p className="att-cap__text">
          La capienza registrata come licenza ospiti è diversa da quella registrata
          nell'inventario camere per alcune strutture.
        </p>

        <div className="att-cap__list">
          {strutture.map((s, i) => (
            <div className="att-cap__row" key={i}>
              <div className="att-cap__hotel">{s.nome}</div>
              <div className="att-cap__meta">
                <span className="att-cap__meta-label">Licenza :</span>
                <span className="att-cap__meta-val">{s.licenza}</span>
                <span className="att-cap__sep" aria-hidden="true" />
                <span className="att-cap__meta-label">Inventario :</span>
                <span className="att-cap__meta-val">{s.inventario}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="att-cap__footer">
          <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>
            Continua
          </button>
        </div>
      </div>
    </Modal>
  )
}
