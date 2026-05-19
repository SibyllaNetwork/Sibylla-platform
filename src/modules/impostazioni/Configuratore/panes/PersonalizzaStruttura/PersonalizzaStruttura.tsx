import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './PersonalizzaStruttura.sass'

interface Row { struttura: string; localita: string; descrizione: string; codice: string }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Assegnazione1: string
  Assegnazione2: string
  rows: Row[]
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  Assegnazione1: 'A',
  Assegnazione2: 'A',
  rows: [
    { struttura: 'Hotel Archimede', localita: 'Ciampino Aeroporto', descrizione: 'Struttura Ricettiva', codice: 'HA' },
    { struttura: 'Hotel Luce', localita: 'Fiumicino Aeroporto', descrizione: 'Struttura ricettiva', codice: 'HL' },
    { struttura: 'Ristorante Tullio', localita: 'Urbe Aeroporto', descrizione: 'Ristorante Lounge Bar', codice: 'RT' },
    { struttura: 'B&B React', localita: 'Stazione Tiburtina', descrizione: 'Accoglienza H24', codice: 'BR' },
  ],
}

export default function PersonalizzaStruttura() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetPersonalizzaStruttura', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetPersonalizzaStruttura', { method: 'POST', body: data }) } catch {}
    setSaving(false)
  }

  return (
    <div className="personalizza-struttura">
      <div className="personalizza-struttura__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Personalizza struttura</strong>
      </div>

      <div className="personalizza-struttura__filters">
        <div className="personalizza-struttura__field">
          <label>Struttura</label>
          <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Hotel Archimede</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="personalizza-struttura__field">
          <label>Assegnazione</label>
          <div className="personalizza-struttura__row-cell">
            <select className="sib-select personalizza-struttura__short" value={data.Assegnazione1} onChange={(e) => setData({ ...data, Assegnazione1: e.target.value })}>
              <option value="A">A</option><option value="B">B</option><option value="C">C</option>
            </select>
            <select className="sib-select personalizza-struttura__short" value={data.Assegnazione2} onChange={(e) => setData({ ...data, Assegnazione2: e.target.value })}>
              <option value="A">A</option><option value="B">B</option><option value="C">C</option>
            </select>
          </div>
        </div>
        <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>Salva</button>
      </div>

      <h3 className="personalizza-struttura__title">Riepilogo assegnazioni</h3>

      <table className="personalizza-struttura__table">
        <thead>
          <tr>
            <th>Struttura</th><th>Località</th><th>Descrizione</th><th>Codice</th><th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td>{r.struttura}</td>
              <td>{r.localita}</td>
              <td>{r.descrizione}</td>
              <td>{r.codice}</td>
              <td className="personalizza-struttura__cell-actions">
                <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-pen" /></button>
                <button type="button" className="sib-btn sib-btn--icon"><i className="fa-light fa-trash" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
