import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './BufferPresenze.sass'

interface Riga { id: number; struttura: string; capienzaTotale: number; capienzaMaggiorata: number; bufferOn: boolean }
interface Data { rows: Riga[] }

const FALLBACK: Data = {
  rows: [
    { id: 1, struttura: 'ciao', capienzaTotale: 5, capienzaMaggiorata: 0, bufferOn: false },
    { id: 2, struttura: "Grim's Hotel", capienzaTotale: 59, capienzaMaggiorata: 59, bufferOn: true },
    { id: 3, struttura: 'Hotel Azzurro Mare', capienzaTotale: 1, capienzaMaggiorata: 0, bufferOn: false },
    { id: 4, struttura: 'Hotel Tutorial', capienzaTotale: 120, capienzaMaggiorata: 125, bufferOn: true },
    { id: 5, struttura: 'test', capienzaTotale: 3, capienzaMaggiorata: 0, bufferOn: false },
  ],
}

export default function BufferPresenze() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetBufferPresenze', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const update = (id: number, field: keyof Riga, v: any) => {
    setData({ ...data, rows: data.rows.map((r) => r.id === id ? { ...r, [field]: v } : r) })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetBufferPresenze', { method: 'POST', body: data }) } catch {}
    setSaving(false)
  }

  return (
    <div className="buffer-presenze">
      <div className="buffer-presenze__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Buffer presenze</strong>
      </div>

      <table className="buffer-presenze__table">
        <thead><tr><th>Struttura</th><th>Capienza totale</th><th>Capienza maggiorata</th><th>Buffer capienza</th></tr></thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.id}>
              <td>{r.struttura}</td>
              <td>{r.capienzaTotale}</td>
              <td>
                <input type="number" className="sib-input buffer-presenze__input" value={r.capienzaMaggiorata || ''} disabled={!r.bufferOn} onChange={(e) => update(r.id, 'capienzaMaggiorata', Number(e.target.value) || 0)} placeholder="0" />
              </td>
              <td>
                <label className="buffer-presenze__toggle">
                  <input type="checkbox" checked={r.bufferOn} onChange={(e) => update(r.id, 'bufferOn', e.target.checked)} />
                  <span className="buffer-presenze__slider" />
                  <span className="buffer-presenze__toggle-text">{r.bufferOn ? 'ON' : 'OFF'}</span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="buffer-presenze__actions">
        <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>Salva</button>
      </div>
    </div>
  )
}
