import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './FinestrePrenotazione.sass'

interface Window { from: number; to: number }
type Tipologia = 'Individuali' | 'Gruppi'

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Tipologia: Tipologia
  windows: Window[]
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  Tipologia: 'Gruppi',
  windows: [
    { from: 0, to: 9 }, { from: 9, to: 19 }, { from: 19, to: 50 },
    { from: 50, to: 65 }, { from: 65, to: 365 }, { from: 365, to: 999 },
  ],
}

export default function FinestrePrenotazione() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetFinestrePrenotazione', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
  }, [])

  const update = (i: number, field: 'from'|'to', v: number) => {
    const next = [...data.windows]
    next[i] = { ...next[i], [field]: v }
    setData({ ...data, windows: next })
  }
  const addRow = (after: number) => {
    const next = [...data.windows]
    const prev = next[after]?.to ?? 0
    next.splice(after + 1, 0, { from: prev, to: prev + 1 })
    setData({ ...data, windows: next })
  }
  const delRow = (i: number) => setData({ ...data, windows: data.windows.filter((_, idx) => idx !== i) })

  const save = async () => {
    setSaving(true)
    try {
      await apiFetchSibylla('configura/SetFinestrePrenotazione', { method: 'POST', body: data })
    } catch { /* silent */ }
    setSaving(false)
  }

  return (
    <div className="finestre-prenotazione">
      <div className="finestre-prenotazione__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Finestre prenotazione</strong>
      </div>

      <div className="finestre-prenotazione__filters">
        <div className="finestre-prenotazione__field">
          <label>Strutture</label>
          <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Hotel Tutorial</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>

        <div className="finestre-prenotazione__field">
          <label>Tipologia</label>
          <div className="finestre-prenotazione__radio-group">
            <label className="finestre-prenotazione__radio-item">
              <input type="radio" className="sib-radio" checked={data.Tipologia === 'Individuali'} onChange={() => setData({ ...data, Tipologia: 'Individuali' })} />
              <span>Individuali</span>
            </label>
            <label className="finestre-prenotazione__radio-item">
              <input type="radio" className="sib-radio" checked={data.Tipologia === 'Gruppi'} onChange={() => setData({ ...data, Tipologia: 'Gruppi' })} />
              <span>Gruppi</span>
            </label>
          </div>
        </div>
      </div>

      <div className="finestre-prenotazione__rules-header">
        <span>Dal</span>
        <span>Al</span>
      </div>

      <div className="finestre-prenotazione__rules">
        {data.windows.map((row, i) => (
          <div className="finestre-prenotazione__row" key={i}>
            <div className="finestre-prenotazione__cell">
              <input type="number" className="sib-input finestre-prenotazione__input" value={row.from} onChange={(e) => update(i, 'from', Number(e.target.value) || 0)} disabled={i === 0} />
              <span className="finestre-prenotazione__unit">gg</span>
            </div>
            <div className="finestre-prenotazione__cell">
              <input type="number" className="sib-input finestre-prenotazione__input" value={row.to} onChange={(e) => update(i, 'to', Number(e.target.value) || 0)} />
              <span className="finestre-prenotazione__unit">gg</span>
            </div>
            <div className="finestre-prenotazione__row-actions">
              <button type="button" className="sib-btn sib-btn--ghost" onClick={() => addRow(i)}>
                <i className="fa-light fa-plus" /> Aggiungi regola
              </button>
              {i > 0 && (
                <button type="button" className="sib-btn sib-btn--ghost" onClick={() => delRow(i)}>
                  <i className="fa-light fa-trash" /> Elimina
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="finestre-prenotazione__row finestre-prenotazione__row--last">
          <div className="finestre-prenotazione__cell">
            <input type="number" className="sib-input finestre-prenotazione__input" value={data.windows[data.windows.length - 1]?.to ?? 999} disabled />
            <span className="finestre-prenotazione__unit">gg</span>
          </div>
          <div className="finestre-prenotazione__cell">
            <input type="text" className="sib-input finestre-prenotazione__input" value="In Poi" disabled readOnly />
          </div>
          <div className="finestre-prenotazione__row-actions">
            <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>Salva</button>
          </div>
        </div>
      </div>
    </div>
  )
}
