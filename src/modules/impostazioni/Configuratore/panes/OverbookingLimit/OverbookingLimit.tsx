import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, InputField } from '../../../../../core/components/form'
import './OverbookingLimit.sass'

interface Riga { id: number; tipologia: string; periodo: string; limit: number; protection: number }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  rows: Riga[]
}
const FALLBACK: Data = { Strutture: [], StrutturaId: null, rows: [] }
const TIPI_CAMERA = ['Singola Classic', 'Doppia Classic', 'Doppia Economy', 'Tripla Classic']
const PERIODI = ['Alta Stagione', 'Media Stagione', 'Bassa Stagione']

export default function OverbookingLimit() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Riga>({ id: 0, tipologia: 'Singola Classic', periodo: 'Alta Stagione', limit: 0, protection: 0 })

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetOverbookingLimit', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const add = () => {
    setData({ ...data, rows: [...data.rows, { ...draft, id: Date.now() }] })
    setOpen(false)
  }

  return (
    <div className="overbooking-limit">
      <div className="overbooking-limit__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Overbooking limit</strong>
      </div>

      <div className="overbooking-limit__bar">
        <SelectField
          name="struttura"
          label="Strutture"
          className="overbooking-limit__field"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={[{ value: '', label: 'Hotel Tutorial' }, ...data.Strutture.map((s) => ({ value: s.Id, label: s.nome }))]}
        />
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => setOpen(true)}>
          <i className="fa-light fa-plus" /> Aggiungi regola
        </button>
      </div>

      <div className="overbooking-limit__table-wrap">
        <table className="overbooking-limit__table">
          <thead><tr><th>Tipologia camera</th><th>Periodo</th><th>OverBooking limit</th><th>Protection</th><th /></tr></thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr><td colSpan={5} className="overbooking-limit__empty">Nessuna regola configurata.</td></tr>
            ) : data.rows.map((r) => (
              <tr key={r.id}>
                <td>{r.tipologia}</td><td>{r.periodo}</td><td>{r.limit}%</td><td>{r.protection}%</td>
                <td><button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-trash" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="overbooking-limit__modal-backdrop" onClick={() => setOpen(false)}>
          <div className="overbooking-limit__modal" onClick={(e) => e.stopPropagation()}>
            <div className="overbooking-limit__modal-header">
              <h3>Crea overbooking limit</h3>
              <button type="button" className="overbooking-limit__close" onClick={() => setOpen(false)}><i className="fa-light fa-xmark" /></button>
            </div>
            <div className="overbooking-limit__modal-body">
              <SelectField
                name="tipologia"
                label="Tipologia camera"
                className="overbooking-limit__field"
                value={draft.tipologia}
                onChange={(e) => setDraft({ ...draft, tipologia: e.target.value })}
                options={TIPI_CAMERA.map((t) => ({ value: t, label: t }))}
              />
              <SelectField
                name="periodo"
                label="Periodo"
                className="overbooking-limit__field"
                value={draft.periodo}
                onChange={(e) => setDraft({ ...draft, periodo: e.target.value })}
                options={PERIODI.map((p) => ({ value: p, label: p }))}
              />
              <div className="overbooking-limit__field-raw">
                <label>OverBooking limit</label>
                <div className="overbooking-limit__cell">
                  <input type="number" className="sib-input" value={draft.limit} onChange={(e) => setDraft({ ...draft, limit: Number(e.target.value) || 0 })} />
                  <span>%</span>
                </div>
              </div>
              <div className="overbooking-limit__field-raw">
                <label>Protection</label>
                <div className="overbooking-limit__cell">
                  <input type="number" className="sib-input" value={draft.protection} onChange={(e) => setDraft({ ...draft, protection: Number(e.target.value) || 0 })} />
                  <span>%</span>
                </div>
              </div>
            </div>
            <div className="overbooking-limit__modal-footer">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setOpen(false)}>Chiudi</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={add}>Salva</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
