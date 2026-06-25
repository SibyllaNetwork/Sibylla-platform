import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField } from '../../../../../core/components/form'
import './LottiMapping.sass'

interface Riga { tipo: string; tipologia: string; camere: number }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Tipologia: 'Individuali' | 'Gruppi'
  rows: Riga[]
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  Tipologia: 'Gruppi',
  rows: [
    { tipo: 'Lotto',     tipologia: 'Base doppia',   camere: 25 },
    { tipo: 'Lotto',     tipologia: 'Base multipla', camere: 25 },
    { tipo: 'Lotto',     tipologia: 'mista',         camere: 25 },
    { tipo: '1/2 Lotto', tipologia: 'Base doppia',   camere: 13 },
    { tipo: '1/2 Lotto', tipologia: 'Base multipla', camere: 13 },
    { tipo: '1/2 Lotto', tipologia: 'mista',         camere: 13 },
  ],
}

export default function LottiMapping() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetLottiMapping', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const update = (i: number, camere: number) => {
    const next = [...data.rows]; next[i] = { ...next[i], camere }
    setData({ ...data, rows: next })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetLottiMapping', { method: 'POST', body: data }) } catch { /* silent */ }
    setSaving(false)
  }

  return (
    <div className="lotti-mapping">
      <div className="lotti-mapping__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Lotti mapping</strong>
      </div>

      <div className="lotti-mapping__filters">
        <SelectField
          name="struttura"
          label="Struttura"
          className="lotti-mapping__field"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={[
            { value: '', label: 'Hotel Tutorial' },
            ...data.Strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />
        <SelectField
          name="tipologia"
          label="Tipologia"
          className="lotti-mapping__field"
          value={data.Tipologia}
          onChange={(e) => setData({ ...data, Tipologia: e.target.value as Data['Tipologia'] })}
          options={[
            { value: 'Individuali', label: 'Individuali' },
            { value: 'Gruppi', label: 'Gruppi' },
          ]}
        />
      </div>

      <div className="lotti-mapping__table-wrap">
        <table className="lotti-mapping__table">
          <thead>
            <tr>
              <th>Tipologie lotti</th>
              <th>Tipologia base</th>
              <th className="lotti-mapping__th--num">Numero camere</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i}>
                <td className="lotti-mapping__td--name">{r.tipo}</td>
                <td>{r.tipologia}</td>
                <td>
                  <span className="lotti-mapping__cell">
                    <input
                      type="number"
                      className="sib-input sib-input--dense lotti-mapping__input"
                      value={r.camere}
                      onChange={(e) => update(i, Number(e.target.value) || 0)}
                      aria-label={`Numero camere ${r.tipo} ${r.tipologia}`}
                    />
                    <span className="lotti-mapping__unit">n°</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lotti-mapping__actions">
        <button
          type="button"
          className="sib-btn sib-btn--primary"
          onClick={save}
          disabled={saving}
        >
          Salva
        </button>
      </div>
    </div>
  )
}
