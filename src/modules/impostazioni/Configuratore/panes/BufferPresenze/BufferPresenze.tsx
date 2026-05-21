import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './BufferPresenze.sass'

interface Riga { id: number; struttura: string; capienzaTotale: number; capienzaMaggiorata: number; bufferOn: boolean }
interface Data { rows: Riga[] }

const FALLBACK: Data = {
  rows: [
    { id: 2, struttura: "Grim's Hotel",       capienzaTotale: 59,  capienzaMaggiorata: 59,  bufferOn: true  },
    { id: 4, struttura: 'Hotel Tutorial',     capienzaTotale: 120, capienzaMaggiorata: 125, bufferOn: true  },
  ],
}

export default function BufferPresenze() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetBufferPresenze', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const update = <K extends keyof Riga>(id: number, field: K, v: Riga[K]) => {
    setData({ ...data, rows: data.rows.map((r) => r.id === id ? { ...r, [field]: v } : r) })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetBufferPresenze', { method: 'POST', body: data }) } catch { /* silent */ }
    setSaving(false)
  }

  return (
    <div className="buffer-presenze">
      <div className="buffer-presenze__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Buffer presenze</strong>
      </div>

      <div className="buffer-presenze__table-wrap">
        <table className="buffer-presenze__table">
          <thead>
            <tr>
              <th className="buffer-presenze__th--name">Struttura</th>
              <th className="buffer-presenze__th--num">Capienza totale</th>
              <th className="buffer-presenze__th--num">Capienza maggiorata</th>
              <th className="buffer-presenze__th--toggle">Buffer capienza</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.id}>
                <td className="buffer-presenze__td buffer-presenze__td--name">{r.struttura}</td>
                <td className="buffer-presenze__td buffer-presenze__td--num">{r.capienzaTotale}</td>
                <td className="buffer-presenze__td buffer-presenze__td--num">
                  <input
                    type="number"
                    className="sib-input sib-input--dense buffer-presenze__input"
                    value={r.capienzaMaggiorata || ''}
                    disabled={!r.bufferOn}
                    onChange={(e) => update(r.id, 'capienzaMaggiorata', Number(e.target.value) || 0)}
                    placeholder="0"
                    aria-label={`Capienza maggiorata ${r.struttura}`}
                  />
                </td>
                <td className="buffer-presenze__td buffer-presenze__td--toggle">
                  <label className="buffer-presenze__toggle">
                    <input
                      type="checkbox"
                      checked={r.bufferOn}
                      onChange={(e) => update(r.id, 'bufferOn', e.target.checked)}
                      aria-label={`Buffer capienza ${r.struttura}`}
                    />
                    <span className="buffer-presenze__slider" />
                    <span className="buffer-presenze__toggle-text">{r.bufferOn ? 'ON' : 'OFF'}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="buffer-presenze__actions">
        <button
          type="button"
          className="sib-btn sib-btn--primary"
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
