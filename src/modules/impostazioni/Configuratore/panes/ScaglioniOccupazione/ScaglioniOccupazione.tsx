import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField, RadioGroup } from '../../../../../core/components/form'
import './ScaglioniOccupazione.sass'

interface Scaglione { from: number; to: number }
type Tipologia = 'Individuali' | 'Gruppi'

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Tipologia: Tipologia
  scaglioni: Scaglione[]
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  Tipologia: 'Gruppi',
  scaglioni: [
    { from: 0, to: 30 }, { from: 30, to: 45 }, { from: 45, to: 60 },
    { from: 60, to: 70 }, { from: 70, to: 80 }, { from: 80, to: 85 },
    { from: 85, to: 90 }, { from: 90, to: 95 },
  ],
}

export default function ScaglioniOccupazione() {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetScaglioniOccupazione', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
  }, [])

  const updateRow = (i: number, field: 'from'|'to', value: number) => {
    const next = [...data.scaglioni]
    next[i] = { ...next[i], [field]: value }
    setData({ ...data, scaglioni: next })
  }

  const addRow = (afterIdx: number) => {
    const next = [...data.scaglioni]
    const prev = next[afterIdx]?.to ?? 0
    next.splice(afterIdx + 1, 0, { from: prev, to: prev + 5 })
    setData({ ...data, scaglioni: next })
  }

  const deleteRow = (i: number) => {
    setData({ ...data, scaglioni: data.scaglioni.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="scaglioni-occupazione">
      <div className="scaglioni-occupazione__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Scaglioni occupazione</strong>
      </div>

      <div className="scaglioni-occupazione__filters">
        <SelectField
          name="strutture"
          label="Strutture"
          className="scaglioni-occupazione__field"
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
          className="scaglioni-occupazione__field"
          value={data.Tipologia}
          onChange={(val) => setData({ ...data, Tipologia: val as Tipologia })}
          options={[
            { value: 'Individuali', label: 'Individuali' },
            { value: 'Gruppi', label: 'Gruppi' },
          ]}
        />
      </div>

      <div className="scaglioni-occupazione__table" role="table">
        <div className="scaglioni-occupazione__head" role="row">
          <span role="columnheader">Dal</span>
          <span role="columnheader">Al</span>
          <span role="columnheader" className="scaglioni-occupazione__head--actions">Azioni</span>
        </div>

        {data.scaglioni.map((row, i) => (
          <div className="scaglioni-occupazione__row" key={i} role="row">
            <div className="scaglioni-occupazione__cell">
              <input
                type="number"
                className="sib-input sib-input--dense scaglioni-occupazione__input"
                value={row.from}
                onChange={(e) => updateRow(i, 'from', Number(e.target.value) || 0)}
                disabled={i === 0}
                aria-label={`Dal scaglione ${i + 1}`}
              />
              <span className="scaglioni-occupazione__unit">%</span>
            </div>
            <div className="scaglioni-occupazione__cell">
              <input
                type="number"
                className="sib-input sib-input--dense scaglioni-occupazione__input"
                value={row.to}
                onChange={(e) => updateRow(i, 'to', Number(e.target.value) || 0)}
                aria-label={`Al scaglione ${i + 1}`}
              />
              <span className="scaglioni-occupazione__unit">%</span>
            </div>
            <div className="scaglioni-occupazione__row-actions">
              <button
                type="button"
                className="scaglioni-occupazione__act"
                onClick={() => addRow(i)}
                title="Aggiungi una regola sotto"
              >
                <i className="fa-light fa-plus" />
                <span>Aggiungi</span>
              </button>
              {i > 0 && (
                <button
                  type="button"
                  className="scaglioni-occupazione__act scaglioni-occupazione__act--del"
                  onClick={() => deleteRow(i)}
                  title="Elimina questa regola"
                >
                  <i className="fa-light fa-trash" />
                  <span>Elimina</span>
                </button>
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          className="scaglioni-occupazione__add-row"
          onClick={() => addRow(data.scaglioni.length - 1)}
        >
          <i className="fa-light fa-plus" />
          <span>Aggiungi scaglione</span>
        </button>
      </div>
    </div>
  )
}
