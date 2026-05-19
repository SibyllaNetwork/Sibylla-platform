import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './LottiMapping.sass'

interface Riga { tipo: string; tipologia: string; camere: number }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Tipologia: 'Individuali' | 'Gruppi'
  rows: Riga[]
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  Tipologia: 'Gruppi',
  rows: [
    { tipo: 'Lotto',     tipologia: 'Base doppia',   camere: 25 },
    { tipo: 'Lotto',     tipologia: 'Base multipla', camere: 25 },
    { tipo: 'Lotto',     tipologia: 'mista',         camere: 25 },
    { tipo: '1/2 Lotto', tipologia: 'Base doppia',   camere: 13 },
    { tipo: '1/2 Lotto', tipologia: 'Base multipla', camere: 13 },
    { tipo: '1/2 Lotto', tipologia: 'mista',         camere: 13 },
  ],
}

export default function LottiMapping() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetLottiMapping', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const update = (i: number, camere: number) => {
    const next = [...data.rows]; next[i] = { ...next[i], camere }
    setData({ ...data, rows: next })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetLottiMapping', { method: 'POST', body: data }) } catch {}
    setSaving(false)
  }

  return (
    <div className="lotti-mapping">
      <div className="lotti-mapping__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Lotti mapping</strong>
      </div>

      <div className="lotti-mapping__filters">
        <div className="lotti-mapping__field">
          <label>Struttura</label>
          <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Hotel Tutorial</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="lotti-mapping__field">
          <label>Tipologia</label>
          <select className="sib-select" value={data.Tipologia} onChange={(e) => setData({ ...data, Tipologia: e.target.value as any })}>
            <option value="Individuali">Individuali</option>
            <option value="Gruppi">Gruppi</option>
          </select>
        </div>
      </div>

      <div className="lotti-mapping__header">
        <span>Tipologie lotti</span><span>Tipologia base</span><span>Numero camere</span>
      </div>
      {data.rows.map((r, i) => (
        <div className="lotti-mapping__row" key={i}>
          <span>{r.tipo}</span>
          <span>{r.tipologia}</span>
          <div className="lotti-mapping__cell">
            <input type="number" className="sib-input lotti-mapping__input" value={r.camere} onChange={(e) => update(i, Number(e.target.value) || 0)} />
            <span className="lotti-mapping__unit">n°</span>
          </div>
        </div>
      ))}

      <div className="lotti-mapping__actions">
        <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>Salva</button>
      </div>
    </div>
  )
}
