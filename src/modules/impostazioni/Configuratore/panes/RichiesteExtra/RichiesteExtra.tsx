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

  const update = (i: number, field: keyof Regola, v: any) => {
    const next = [...data.options]
    next[i] = { ...next[i], [field]: v }
    setData({ ...data, options: next })
  }
  const addRow = () => setData({ ...data, options: [...data.options, { Nome: '', giorni: 0, fee: 0 }] })
  const delRow = (i: number) => setData({ ...data, options: data.options.filter((_, idx) => idx !== i) })

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetRichiesteExtra', { method: 'POST', body: data }) } catch {}
    setSaving(false)
  }

  return (
    <div className="richieste-extra">
      <div className="richieste-extra__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Richieste extra</strong>
      </div>

      <div className="richieste-extra__filters">
        <div className="richieste-extra__field">
          <label>Strutture</label>
          <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Hotel Tutorial</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="richieste-extra__field">
          <label>Tipologia</label>
          <div className="richieste-extra__radio-group">
            <label className="richieste-extra__radio-item">
              <input type="radio" className="sib-radio" checked={isOpzionata} onChange={() => setData({ ...data, Tipologia: 'Opzionata' })} />
              <span>Opzionata</span>
            </label>
            <label className="richieste-extra__radio-item">
              <input type="radio" className="sib-radio" checked={!isOpzionata} onChange={() => setData({ ...data, Tipologia: 'Garantita' })} />
              <span>Garantita</span>
            </label>
          </div>
        </div>
      </div>

      <div className="richieste-extra__header">
        <span>Condizione</span>
        <span>Nome</span>
        {isOpzionata && <span>A</span>}
        <span>Fee Extra</span>
        <span />
      </div>

      <div className="richieste-extra__rows">
        {data.options.map((row, i) => (
          <div className={`richieste-extra__row ${isOpzionata ? '' : 'richieste-extra__row--garantita'}`} key={i}>
            <button type="button" className="sib-btn sib-btn--secondary" disabled>Accetta</button>
            <input type="text" className="sib-input" value={row.Nome} onChange={(e) => update(i, 'Nome', e.target.value)} />
            {isOpzionata && (
              <div className="richieste-extra__cell">
                <input type="number" className="sib-input richieste-extra__short" value={row.giorni} onChange={(e) => update(i, 'giorni', Number(e.target.value) || 0)} />
                <span className="richieste-extra__unit">gg</span>
              </div>
            )}
            <div className="richieste-extra__cell">
              <input type="number" step="0.01" className="sib-input richieste-extra__short" value={row.fee} onChange={(e) => update(i, 'fee', Number(e.target.value) || 0)} />
              <span className="richieste-extra__unit">€</span>
            </div>
            <div className="richieste-extra__row-actions">
              <button type="button" className="sib-btn sib-btn--ghost" onClick={addRow}><i className="fa-light fa-plus" /> Aggiungi regola</button>
              {i > 0 && <button type="button" className="sib-btn sib-btn--ghost" onClick={() => delRow(i)}><i className="fa-light fa-trash" /> Elimina</button>}
            </div>
          </div>
        ))}

        <div className={`richieste-extra__row richieste-extra__row--rifiuta ${isOpzionata ? '' : 'richieste-extra__row--garantita'}`}>
          <button type="button" className="sib-btn sib-btn--danger" disabled>Rifiuta</button>
          <input type="text" className="sib-input" disabled />
          {isOpzionata && <input type="text" className="sib-input richieste-extra__short" disabled />}
          <input type="text" className="sib-input richieste-extra__short" value="null" disabled readOnly />
          <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>Salva</button>
        </div>
      </div>
    </div>
  )
}
