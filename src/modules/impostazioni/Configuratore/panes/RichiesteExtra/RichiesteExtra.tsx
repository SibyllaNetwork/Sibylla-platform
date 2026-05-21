import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './RichiesteExtra.sass'

interface Regola { Nome: string; giorni: number; fee: number }
type Tipologia = 'Opzionata' | 'Garantita'

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Tipologia: Tipologia
  options: Regola[]
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  Tipologia: 'Opzionata',
  options: [
    { Nome: '1gg - 0.00 €', giorni: 1, fee: 0 },
    { Nome: '1gg - 1.00 €', giorni: 1, fee: 1 },
    { Nome: '1gg - 1.50 €', giorni: 1, fee: 1.5 },
    { Nome: '1gg - 2.00 €', giorni: 1, fee: 2 },
  ],
}

export default function RichiesteExtra() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetRichiesteExtra', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
  }, [])

  const isOpzionata = data.Tipologia === 'Opzionata'

  const update = (i: number, field: keyof Regola, v: Regola[keyof Regola]) => {
    const next = [...data.options]
    next[i] = { ...next[i], [field]: v }
    setData({ ...data, options: next })
  }
  const addRow = () => setData({ ...data, options: [...data.options, { Nome: '', giorni: 0, fee: 0 }] })
  const delRow = (i: number) => setData({ ...data, options: data.options.filter((_, idx) => idx !== i) })

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetRichiesteExtra', { method: 'POST', body: data }) } catch { /* silent */ }
    setSaving(false)
  }

  const variantClass = isOpzionata ? '' : ' richieste-extra--garantita'

  return (
    <div className={`richieste-extra${variantClass}`}>
      <div className="richieste-extra__filters">
        <div className="richieste-extra__field">
          <label>Strutture</label>
          <select
            className="sib-select sib-select--dense richieste-extra__select"
            value={data.StrutturaId ?? ''}
            onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Hotel Tutorial</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="richieste-extra__field">
          <label>Tipologia</label>
          <div className="richieste-extra__radio-group">
            <label className="richieste-extra__radio-item">
              <input
                type="radio"
                className="sib-radio"
                checked={isOpzionata}
                onChange={() => setData({ ...data, Tipologia: 'Opzionata' })}
              />
              <span>Opzionata</span>
            </label>
            <label className="richieste-extra__radio-item">
              <input
                type="radio"
                className="sib-radio"
                checked={!isOpzionata}
                onChange={() => setData({ ...data, Tipologia: 'Garantita' })}
              />
              <span>Garantita</span>
            </label>
          </div>
        </div>
      </div>

      <div className="richieste-extra__table" role="table">
        <div className="richieste-extra__head" role="row">
          <span role="columnheader">Condizione</span>
          <span role="columnheader">Nome</span>
          {isOpzionata && <span role="columnheader">A</span>}
          <span role="columnheader">Fee Extra</span>
          <span role="columnheader" className="richieste-extra__head--actions">Azioni</span>
        </div>

        {data.options.map((row, i) => (
          <div className="richieste-extra__row" key={i} role="row">
            <span className="richieste-extra__tag richieste-extra__tag--ok">Accetta</span>
            <input
              type="text"
              className="sib-input sib-input--dense richieste-extra__input richieste-extra__input--name"
              value={row.Nome}
              onChange={(e) => update(i, 'Nome', e.target.value)}
              aria-label={`Nome regola ${i + 1}`}
            />
            {isOpzionata && (
              <div className="richieste-extra__cell">
                <input
                  type="number"
                  className="sib-input sib-input--dense richieste-extra__input"
                  value={row.giorni}
                  onChange={(e) => update(i, 'giorni', Number(e.target.value) || 0)}
                  aria-label={`Giorni regola ${i + 1}`}
                />
                <span className="richieste-extra__unit">gg</span>
              </div>
            )}
            <div className="richieste-extra__cell">
              <input
                type="number"
                step="0.01"
                className="sib-input sib-input--dense richieste-extra__input"
                value={row.fee}
                onChange={(e) => update(i, 'fee', Number(e.target.value) || 0)}
                aria-label={`Fee extra regola ${i + 1}`}
              />
              <span className="richieste-extra__unit">€</span>
            </div>
            <div className="richieste-extra__row-actions">
              <button type="button" className="richieste-extra__act" onClick={addRow} title="Aggiungi una regola">
                <i className="fa-light fa-plus" />
                <span>Aggiungi</span>
              </button>
              {i > 0 && (
                <button
                  type="button"
                  className="richieste-extra__act richieste-extra__act--del"
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

        <div className="richieste-extra__row richieste-extra__row--last" role="row">
          <span className="richieste-extra__tag richieste-extra__tag--ko">Rifiuta</span>
          <input type="text" className="sib-input sib-input--dense richieste-extra__input richieste-extra__input--name" disabled aria-label="Rifiuta (nome)" />
          {isOpzionata && (
            <div className="richieste-extra__cell">
              <input type="text" className="sib-input sib-input--dense richieste-extra__input" disabled aria-label="Rifiuta (giorni)" />
            </div>
          )}
          <div className="richieste-extra__cell">
            <input
              type="text"
              className="sib-input sib-input--dense richieste-extra__input"
              value="null"
              disabled
              readOnly
              aria-label="Rifiuta (fee)"
            />
          </div>
          <div className="richieste-extra__row-actions richieste-extra__row-actions--save">
            <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>
              {saving ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
