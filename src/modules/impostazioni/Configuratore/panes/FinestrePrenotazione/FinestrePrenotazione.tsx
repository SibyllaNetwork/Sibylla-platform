import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, RadioGroup } from '../../../../../core/components/form'
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
    { from: 50, to: 65 }, { from: 65, to: 365 },
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

  const lastTo = data.windows[data.windows.length - 1]?.to ?? 365

  return (
    <div className="finestre-prenotazione">
      <div className="finestre-prenotazione__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Finestre prenotazione</strong>
      </div>

      <div className="finestre-prenotazione__filters">
        <SelectField
          name="strutture"
          label="Strutture"
          className="finestre-prenotazione__field"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={[
            { value: '', label: 'Hotel Tutorial' },
            ...data.Strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />

        <RadioGroup
          name="tipologia"
          label="Tipologia"
          className="finestre-prenotazione__field"
          value={data.Tipologia}
          onChange={(val) => setData({ ...data, Tipologia: val as Tipologia })}
          options={[
            { value: 'Individuali', label: 'Individuali' },
            { value: 'Gruppi', label: 'Gruppi' },
          ]}
        />
      </div>

      <div className="finestre-prenotazione__table" role="table">
        <div className="finestre-prenotazione__head" role="row">
          <span role="columnheader">Dal</span>
          <span role="columnheader">Al</span>
          <span role="columnheader" className="finestre-prenotazione__head--actions">Azioni</span>
        </div>

        {data.windows.map((row, i) => (
          <div className="finestre-prenotazione__row" key={i} role="row">
            <div className="finestre-prenotazione__cell">
              <input
                type="number"
                className="sib-input sib-input--dense finestre-prenotazione__input"
                value={row.from}
                onChange={(e) => update(i, 'from', Number(e.target.value) || 0)}
                disabled={i === 0}
                aria-label={`Da giorni finestra ${i + 1}`}
              />
              <span className="finestre-prenotazione__unit">gg</span>
            </div>
            <div className="finestre-prenotazione__cell">
              <input
                type="number"
                className="sib-input sib-input--dense finestre-prenotazione__input"
                value={row.to}
                onChange={(e) => update(i, 'to', Number(e.target.value) || 0)}
                aria-label={`A giorni finestra ${i + 1}`}
              />
              <span className="finestre-prenotazione__unit">gg</span>
            </div>
            <div className="finestre-prenotazione__row-actions">
              <button
                type="button"
                className="finestre-prenotazione__act"
                onClick={() => addRow(i)}
                title="Aggiungi una regola sotto"
              >
                <i className="fa-light fa-plus" />
                <span>Aggiungi</span>
              </button>
              {i > 0 && (
                <button
                  type="button"
                  className="finestre-prenotazione__act finestre-prenotazione__act--del"
                  onClick={() => delRow(i)}
                  title="Elimina questa regola"
                >
                  <i className="fa-light fa-trash" />
                  <span>Elimina</span>
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="finestre-prenotazione__row finestre-prenotazione__row--last" role="row">
          <div className="finestre-prenotazione__cell">
            <input
              type="number"
              className="sib-input sib-input--dense finestre-prenotazione__input"
              value={lastTo}
              disabled
              aria-label="Da giorni finestra finale"
            />
            <span className="finestre-prenotazione__unit">gg</span>
          </div>
          <div className="finestre-prenotazione__cell">
            <input
              type="text"
              className="sib-input sib-input--dense finestre-prenotazione__input finestre-prenotazione__input--wide"
              value="In Poi"
              disabled
              readOnly
              aria-label="A giorni finestra finale"
            />
          </div>
          <div className="finestre-prenotazione__row-actions finestre-prenotazione__row-actions--save">
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
      </div>
    </div>
  )
}
