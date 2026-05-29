import React, { useState, useEffect } from 'react'
import Modal from '../../../../core/components/Modal'
import { Icon } from '../../../../modules/purchasing/_shared/Icon'
import { CANALI_VENDITA, type Struttura, type CanaleVendita } from '../../strutture/types'
import { PreviewPlatform, PreviewConsumer } from '../../strutture/StrutturaPreview'
import './StrutturaPreviewModal.sass'

interface Props {
  open: boolean
  struttura: Struttura | null
  initialCanale?: CanaleVendita
  onClose: () => void
}

export default function StrutturaPreviewModal({
  open, struttura, initialCanale, onClose,
}: Props) {
  const [canale, setCanale] = useState<CanaleVendita>(initialCanale || 'agora')

  useEffect(() => {
    if (open && initialCanale) setCanale(initialCanale)
  }, [open, initialCanale])

  if (!struttura) return null

  const cMeta = CANALI_VENDITA.find(c => c.id === canale)!
  const pubblicata = struttura.canali[canale].pubblicata

  return (
    <Modal open={open} onClose={onClose} title={`Anteprima — ${struttura.nome}`} size="xl">
      <div className="strprev-modal">
        <nav className="strprev-modal__tabs" role="tablist" aria-label="Canale anteprima">
          {CANALI_VENDITA.map(c => {
            const active = canale === c.id
            const on = struttura.canali[c.id].pubblicata
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={active}
                className={`strprev-modal__tab${active ? ' strprev-modal__tab--active' : ''}`}
                style={{ '--canale-color': c.color } as React.CSSProperties}
                onClick={() => setCanale(c.id)}
              >
                <span className="strprev-modal__tab-dot" />
                <span className="strprev-modal__tab-label">{c.label}</span>
                <span className="strprev-modal__tab-dest">→ {c.destinazione}</span>
                <span className={`strprev-modal__tab-status${on ? ' strprev-modal__tab-status--on' : ''}`}>
                  {on ? 'pubblicata' : 'non pubblicata'}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="strprev-modal__hint">
          <Icon family="regular" name="circle-info" />
          <span>
            Questa è l'anteprima della scheda struttura come apparirà su <strong>{cMeta.destinazione}</strong>.
            {!pubblicata && <em> Il canale risulta attualmente disattivato.</em>}
          </span>
        </div>

        <div className="strprev-modal__stage">
          {canale === 'b2c'
            ? <PreviewConsumer struttura={struttura} />
            : <PreviewPlatform
                struttura={struttura}
                canale={canale}
                destinazione={cMeta.destinazione}
                color={cMeta.color}
                label={cMeta.label}
              />}
        </div>

        <div className="strprev-modal__footer">
          <button type="button" className="sib-btn sib-btn--ghost" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </Modal>
  )
}
