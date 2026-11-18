import React, { useEffect, useState } from 'react'
import Modal from '../../../core/components/Modal'
import { InputField } from '../../../core/components/form'
import { useIndiciParametriStore } from '../../../store/useIndiciParametriStore'
import { PARAMETRI_DEFAULT } from './indiciData'
import './ParametriIndiciModal.sass'

/**
 * Parametri dell'Analisi per indici: fattore IVA applicato al fatturato (DSO)
 * e agli acquisti di materie (DPO). Si salvano per tutte le strutture.
 */
const pct = (f: number) => `${Math.round((f - 1) * 100)}%`
const valido = (v: number) => isFinite(v) && v >= 1 && v <= 1.5

export default function ParametriIndiciModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ivaVendite, ivaAcquisti, set } = useIndiciParametriStore()
  const [vendite, setVendite] = useState(String(ivaVendite))
  const [acquisti, setAcquisti] = useState(String(ivaAcquisti))
  useEffect(() => {
    if (open) { setVendite(String(ivaVendite)); setAcquisti(String(ivaAcquisti)) }
  }, [open, ivaVendite, ivaAcquisti])

  const num = (s: string) => Number(s.replace(',', '.'))
  const v = num(vendite), a = num(acquisti)
  const ok = valido(v) && valido(a)

  function salva() {
    if (!ok) return
    set({ ivaVendite: v, ivaAcquisti: a })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Parametri degli indici" size="sm">
      <div className="aindp">
        <p className="aindp__intro">
          Fattore IVA con cui si maggiorano fatturato e acquisti nel calcolo dei tempi di incasso e di pagamento.
        </p>
        <InputField name="ivaVendite" label="Fattore IVA sul fatturato · DSO" type="number" step={0.01} min={1} max={1.5}
          value={vendite} onChange={e => setVendite(e.target.value)}
          hint={valido(v) ? `IVA media del ${pct(v)} sulle vendite` : 'Valore fra 1 e 1,5'} error={valido(v) ? undefined : 'Valore fra 1 e 1,5'} />
        <InputField name="ivaAcquisti" label="Fattore IVA sugli acquisti · DPO" type="number" step={0.01} min={1} max={1.5}
          value={acquisti} onChange={e => setAcquisti(e.target.value)}
          hint={valido(a) ? `IVA media del ${pct(a)} su materie e materiali di consumo` : 'Valore fra 1 e 1,5'} error={valido(a) ? undefined : 'Valore fra 1 e 1,5'} />
        <div className="aindp__footer">
          <button type="button" className="sib-btn sib-btn--ghost"
            onClick={() => { setVendite(String(PARAMETRI_DEFAULT.ivaVendite)); setAcquisti(String(PARAMETRI_DEFAULT.ivaAcquisti)) }}>
            Ripristina 1,2
          </button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" disabled={!ok} onClick={salva}>Salva</button>
        </div>
      </div>
    </Modal>
  )
}
