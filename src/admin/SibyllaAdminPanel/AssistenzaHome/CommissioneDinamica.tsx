import React, { useState } from 'react'
import Ico from '../../../core/icons/Ico'
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
        <label className="cdn__field">
          <span>Azienda</span>
          <select className="sib-select" value={azienda} onChange={e => setAzienda(e.target.value)}>
            <option value="">Seleziona Azienda</option>{AZIENDE.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="cdn__field">
          <span>Tour operator partner</span>
          <select className="sib-select" disabled><option>Seleziona TO partner</option></select>
        </label>
        <label className="cdn__field">
          <span>Hotel partner</span>
          <select className="sib-select" disabled><option>Seleziona Hotel partner</option></select>
        </label>
        <label className="cdn__flat">
          <span>Flat</span>
          <input type="checkbox" checked={flat} onChange={e => setFlat(e.target.checked)} />
        </label>
      </div>

      <div className="cdn__placeholder">
        <Ico n="sliders" s={26} c="var(--color-text-disabled)" />
        <p>Seleziona un’azienda e i partner per configurare la commissione dinamica.</p>
      </div>
    </div>
  )
}
