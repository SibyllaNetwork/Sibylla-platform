import React, { useState } from 'react'
import Ico from '../../../core/icons/Ico'
import { SelectField, CheckboxField } from '../../../core/components/form'
import './CommissioneDinamica.sass'

interface Props { navigate: (p: string) => void }

const AZIENDE = ['Sibylla', 'GAR S.R.L.', 'Reservation Hotel Italy']

export default function CommissioneDinamica({ navigate }: Props) {
  const [azienda, setAzienda] = useState('')
  const [flat, setFlat] = useState(false)

  return (
    <div className="cdn">
      <button type="button" className="cdn__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="cdn__head">
        <h1 className="cdn__title">Commissione Dinamica</h1>
        <p className="cdn__sub">Configura le commissioni dinamiche tra tour operator e hotel partner.</p>
      </div>

      <div className="cdn__toolbar">
        <SelectField
          name="azienda"
          label="Azienda"
          className="cdn__field"
          value={azienda}
          onChange={e => setAzienda(e.target.value)}
          placeholder="Seleziona Azienda"
          options={AZIENDE.map(a => ({ value: a, label: a }))}
        />
        <SelectField
          name="toPartner"
          label="Tour operator partner"
          className="cdn__field"
          disabled
          placeholder="Seleziona TO partner"
          options={[]}
        />
        <SelectField
          name="hotelPartner"
          label="Hotel partner"
          className="cdn__field"
          disabled
          placeholder="Seleziona Hotel partner"
          options={[]}
        />
        <CheckboxField
          name="flat"
          label="Flat"
          className="cdn__flat"
          checked={flat}
          onChange={e => setFlat(e.target.checked)}
        />
      </div>

      <div className="cdn__placeholder">
        <Ico n="sliders" s={26} c="var(--color-text-disabled)" />
        <p>Seleziona un’azienda e i partner per configurare la commissione dinamica.</p>
      </div>
    </div>
  )
}
