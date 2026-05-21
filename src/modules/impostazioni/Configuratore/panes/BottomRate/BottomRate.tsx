import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './BottomRate.sass'

interface Cam { id: number; nome: string; isRef: boolean; bottomRate: number }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  PianoTariffario: string
  rows: Cam[]
}

const TIPI = ['Singola Classic','Doppia Classic','Doppia Economy','Tripla Classic','Matrimoniale convertibile in Tripla','Matrimoniale Economy','Matrimoniale Classic','Doppia convertibile in Quadrupla','Doppia convertibile in Tripla']

const FALLBACK: Data = {
  Strutture: [], StrutturaId: null, PianoTariffario: 'BAR',
  rows: TIPI.map((t, i) => ({ id: i + 1, nome: t, isRef: i === 2, bottomRate: 0 })),
}

export default function BottomRate() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetBottomRate', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const updatePrezzo = (id: number, bottomRate: number) => {
    setData({ ...data, rows: data.rows.map((r) => r.id === id ? { ...r, bottomRate } : r) })
  }
  const setRef = (id: number) => {
    setData({ ...data, rows: data.rows.map((r) => ({ ...r, isRef: r.id === id })) })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetBottomRate', { method: 'POST', body: data }) } catch {}
    setSaving(false)
  }

  return (
    <div className="bottom-rate">
      <div className="bottom-rate__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Bottom rate</strong>
      </div>
      <div className="bottom-rate__filters">
        <div className="bottom-rate__field"><label>Strutture</label>
          <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Hotel Siracusa</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="bottom-rate__field"><label>Piano tariffario</label>
          <select className="sib-select" value={data.PianoTariffario} onChange={(e) => setData({ ...data, PianoTariffario: e.target.value })}>
            <option value="BAR">BAR</option>
            <option value="FIT">FIT</option>
          </select>
        </div>
      </div>

      <table className="bottom-rate__table">
        <thead>
          <tr>
            <th>Nome</th>
            <th className="bottom-rate__th--center">Camera di riferimento</th>
            <th className="bottom-rate__th--price">Bottom rate (prezzo minimo per camera)</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.id}>
              <td>{r.nome}</td>
              <td className="bottom-rate__center">
                <input
                  type="radio"
                  className="sib-radio"
                  checked={r.isRef}
                  onChange={() => setRef(r.id)}
                  name="bottom-rate-ref"
                  aria-label={`Camera di riferimento ${r.nome}`}
                />
              </td>
              <td className="bottom-rate__td--price">
                <span className="bottom-rate__cell">
                  <input
                    type="number"
                    step="0.01"
                    className="sib-input sib-input--dense bottom-rate__price-input"
                    value={r.bottomRate}
                    onChange={(e) => updatePrezzo(r.id, Number(e.target.value) || 0)}
                    aria-label={`Bottom rate ${r.nome}`}
                  />
                  <span className="bottom-rate__unit">€</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bottom-rate__actions">
        <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>Salva</button>
      </div>
    </div>
  )
}
