import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, RadioGroup } from '../../../../../core/components/form'
import './Stagionalita.sass'

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']
const STAGIONI = ['Alta Stagione','Media Stagione','Bassa Stagione']

interface Riga { dayStart: number; monthStart: string; dayEnd: number; monthEnd: string; stagione: string }

interface Data {
  Listini: { Id: number; Nome: string }[]
  ListinoId: number | null
  Tipologia: 'Individuali' | 'Gruppi'
  rows: Riga[]
}

const FALLBACK: Data = {
  Listini: [{ Id: 1, Nome: 'Contratto 2025/2026' }],
  ListinoId: 1,
  Tipologia: 'Individuali',
  rows: [
    { dayStart: 1, monthStart: 'Gennaio', dayEnd: 31, monthEnd: 'Maggio',    stagione: 'Alta Stagione'  },
    { dayStart: 1, monthStart: 'Giugno',  dayEnd: 31, monthEnd: 'Dicembre',  stagione: 'Bassa Stagione' },
  ],
}

export default function Stagionalita() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetStagionalita', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const update = <K extends keyof Riga>(i: number, field: K, v: Riga[K]) => {
    const next = [...data.rows]
    next[i] = { ...next[i], [field]: v }
    setData({ ...data, rows: next })
  }
  const addRow = () => setData({ ...data, rows: [...data.rows, { dayStart: 1, monthStart: 'Gennaio', dayEnd: 28, monthEnd: 'Febbraio', stagione: 'Bassa Stagione' }] })
  const delRow = (i: number) => setData({ ...data, rows: data.rows.filter((_, idx) => idx !== i) })

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetStagionalita', { method: 'POST', body: data }) } catch { /* silent */ }
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className="stagionalita">
      <div className="stagionalita__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Stagionalità</strong>
      </div>

      <div className="stagionalita__filters">
        <SelectField
          name="contratto"
          label="Contratto"
          className="stagionalita__field"
          value={data.ListinoId ?? ''}
          onChange={(e) => setData({ ...data, ListinoId: e.target.value ? Number(e.target.value) : null })}
          options={data.Listini.map((l) => ({ value: l.Id, label: l.Nome }))}
        />
        <RadioGroup
          name="tipologia"
          label="Tipologia"
          className="stagionalita__field"
          value={data.Tipologia}
          onChange={(val) => setData({ ...data, Tipologia: val as Data['Tipologia'] })}
          options={[
            { value: 'Individuali', label: 'Individuali' },
            { value: 'Gruppi', label: 'Gruppi' },
          ]}
        />
        <button
          type="button"
          className="sib-btn sib-btn--secondary"
          onClick={() => setEditing((v) => !v)}
        >
          <i className="fa-light fa-pen" /> {editing ? 'Termina modifica' : 'Modifica stagioni'}
        </button>
      </div>

      <div className="stagionalita__table-wrap">
        <table className="stagionalita__table">
          <thead>
            <tr>
              <th>Data inizio</th>
              <th>Data fine</th>
              <th>Stagione</th>
              <th className="stagionalita__th--actions">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <span className="stagionalita__date-cell">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="sib-input sib-input--dense stagionalita__day"
                      value={r.dayStart}
                      disabled={!editing}
                      onChange={(e) => update(i, 'dayStart', Number(e.target.value) || 1)}
                      aria-label={`Giorno inizio ${i + 1}`}
                    />
                    <select
                      className="sib-select sib-select--dense stagionalita__month"
                      value={r.monthStart}
                      disabled={!editing}
                      onChange={(e) => update(i, 'monthStart', e.target.value)}
                      aria-label={`Mese inizio ${i + 1}`}
                    >
                      {MESI.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </span>
                </td>
                <td>
                  <span className="stagionalita__date-cell">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="sib-input sib-input--dense stagionalita__day"
                      value={r.dayEnd}
                      disabled={!editing}
                      onChange={(e) => update(i, 'dayEnd', Number(e.target.value) || 1)}
                      aria-label={`Giorno fine ${i + 1}`}
                    />
                    <select
                      className="sib-select sib-select--dense stagionalita__month"
                      value={r.monthEnd}
                      disabled={!editing}
                      onChange={(e) => update(i, 'monthEnd', e.target.value)}
                      aria-label={`Mese fine ${i + 1}`}
                    >
                      {MESI.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </span>
                </td>
                <td>
                  <select
                    className="sib-select sib-select--dense stagionalita__stagione"
                    value={r.stagione}
                    disabled={!editing}
                    onChange={(e) => update(i, 'stagione', e.target.value)}
                    aria-label={`Stagione ${i + 1}`}
                  >
                    {STAGIONI.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="stagionalita__td--actions">
                  {editing && i > 0 && (
                    <button
                      type="button"
                      className="sib-btn sib-btn--icon"
                      onClick={() => delRow(i)}
                      aria-label="Elimina stagione"
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="stagionalita__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={addRow}>
            <i className="fa-light fa-circle-plus" /> Aggiungi stagione
          </button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>
            Salva
          </button>
        </div>
      )}
    </div>
  )
}
