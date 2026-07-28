import React, { useState } from 'react'
import Modal from '../../../core/components/Modal'
import { RadioGroup, SelectField } from '../../../core/components/form'
import { CITY_TAX_ESENZIONI } from '../../finance/ReportCityTax/cityTaxExcel'
import type { CityTaxRecord } from '../../../store/useCityTaxStore'
import './CheckoutCityTaxModal.sass'

interface Props {
  ospite: string
  onClose: () => void
  onConfirm: (rec: CityTaxRecord) => void
}

const MOTIVO_OPTIONS = [
  { value: 'esenzione', label: 'Esenzione' },
  { value: 'rifiuto', label: 'Rifiuto del pagamento' },
]

// Pop-up mostrato al check-out quando l'ospite non ha pagato la tassa di
// soggiorno: si indica il motivo con radio button. Se "Esenzione", si sceglie
// la tipologia da una select; se "Rifiuto del pagamento" si registra il rifiuto.
export default function CheckoutCityTaxModal({ ospite, onClose, onConfirm }: Props) {
  const [motivo, setMotivo] = useState<'esenzione' | 'rifiuto'>('esenzione')
  const [tipoEsenzione, setTipoEsenzione] = useState('')

  const valid = motivo === 'rifiuto' || (motivo === 'esenzione' && tipoEsenzione !== '')

  const conferma = () => {
    if (!valid) return
    if (motivo === 'esenzione') onConfirm({ stato: 'esente', motivazione: tipoEsenzione })
    else onConfirm({ stato: 'non-pagato', motivazione: 'Rifiuto del pagamento' })
  }

  return (
    <Modal open onClose={onClose} size="sm" title="Tassa di soggiorno non pagata">
      <div className="cct">
        <p className="cct__msg">
          <strong>{ospite}</strong> non ha pagato la tassa di soggiorno al check-out.
          Indica il motivo del mancato pagamento.
        </p>

        <RadioGroup
          name="cct-motivo"
          label="Motivo"
          options={MOTIVO_OPTIONS}
          value={motivo}
          onChange={(v) => setMotivo(v as 'esenzione' | 'rifiuto')}
        />

        {motivo === 'esenzione' && (
          <SelectField
            name="cct-tipo-esenzione"
            label="Tipologia di esenzione"
            className="cct__esenzione"
            placeholder="Seleziona la tipologia…"
            value={tipoEsenzione}
            onChange={(e) => setTipoEsenzione(e.target.value)}
            options={CITY_TAX_ESENZIONI.map((t) => ({ value: t, label: t }))}
          />
        )}

        <div className="cct__foot">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" disabled={!valid} onClick={conferma}>
            Conferma e check-out
          </button>
        </div>
      </div>
    </Modal>
  )
}
