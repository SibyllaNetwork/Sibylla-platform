import React from 'react'
import Modal from '../../core/components/Modal'
import Button from '../../core/components/Button/Button'
import { toast } from '../../core/components/Toast/useToast'
import { formatoData, type InvitoOp } from './opApi'
import './OpInvitoModal.sass'

// ─── INVITO ALL'APP OP! ───────────────────────────────────────────────────────
//  Il codice arriva al dipendente via email; qui lo si mostra una volta per
//  consegnarlo anche di persona.
export default function OpInvitoModal({ invito, nome, onClose }: { invito: InvitoOp | null; nome: string; onClose: () => void }) {
  const copia = async () => {
    if (!invito) return
    try {
      await navigator.clipboard.writeText(invito.codice)
      toast.success('Codice copiato.', 'Invito App Op!')
    } catch {
      toast.warning('Copia non riuscita: seleziona il codice a mano.', 'Invito App Op!')
    }
  }
  return (
    <Modal open={invito !== null} onClose={onClose} title={`Invito per ${nome}`} size="sm">
      {invito && (
        <div className="op-invito">
          <p className="op-invito__testo">
            L’invito è partito per email a <strong>{invito.emailMascherata}</strong>. Il dipendente installa l’app Op!, sceglie
            «Accesso con invito» e inserisce il codice:
          </p>
          <p className="op-invito__codice">{invito.codice}</p>
          <p className="op-invito__scade">Valido fino al {formatoData(invito.scadeIl)}. Un nuovo invito annulla questo.</p>
          <div className="op-invito__azioni">
            <Button variant="secondary" icon="copy" onClick={copia}>Copia il codice</Button>
            <Button onClick={onClose}>Fatto</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
