import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './FasceEta.sass'

interface Fascia { da: number; a: number; perc: number; attiva: boolean }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Infanti: Fascia
  Bambini: Fascia
  Ragazzi: Fascia
  numAdultiExtra: number
  adulto1: number; adulto2: number; adulto3: number
}

const FALLBACK: Data = {
  Strutture: [], StrutturaId: null,
  Infanti: { da: 0, a: 0, perc: 0, attiva: true },
  Bambini: { da: 0, a: 0, perc: 0, attiva: true },
  Ragazzi: { da: 0, a: 0, perc: 0, attiva: true },
  numAdultiExtra: 0, adulto1: 0, adulto2: 0, adulto3: 0,
}

export default function FasceEta() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetFasceEta', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const updateFascia = (key: 'Infanti'|'Bambini'|'Ragazzi', f: Partial<Fascia>) => {
    setData({ ...data, [key]: { ...data[key], ...f } })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetFasceEta', { method: 'POST', body: data }) } catch {}
    setSaving(false)
  }

  const renderFascia = (label: string, key: 'Infanti'|'Bambini'|'Ragazzi', icon: string) => {
    const f = data[key]
    return (
      <div className="fasce-eta__group">
        <div className="fasce-eta__group-title">
          {label} <i className="fa-light fa-check fasce-eta__check" />
        </div>
        <div className="fasce-eta__range">
          <span className="fasce-eta__lbl">Da</span>
          <input type="number" className="sib-input fasce-eta__short" value={f.da || ''} placeholder="0" onChange={(e) => updateFascia(key, { da: Number(e.target.value) || 0 })} />
          <span className="fasce-eta__lbl">a</span>
          <input type="number" className="sib-input fasce-eta__short" value={f.a || ''} placeholder="0" onChange={(e) => updateFascia(key, { a: Number(e.target.value) || 0 })} />
        </div>
        <div className="fasce-eta__perc">
          <i className={`fa-light fa-${icon}`} />
          <input type="number" className="sib-input fasce-eta__short" value={f.perc || ''} placeholder="-" onChange={(e) => updateFascia(key, { perc: Number(e.target.value) || 0 })} />
          <span>%</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fasce-eta">
      <div className="fasce-eta__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Fasce d'età</strong>
      </div>
      <h3 className="fasce-eta__title">Variazione del prezzo rispetto a fascia di età adulti</h3>
      <div className="fasce-eta__field">
        <label>Struttura</label>
        <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Hotel Siracusa</option>
          {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
        </select>
      </div>

      <div className="fasce-eta__row">
        {renderFascia('Infanti', 'Infanti', 'baby')}
        {renderFascia('Bambini', 'Bambini', 'child')}
        {renderFascia('Ragazzi', 'Ragazzi', 'person')}
      </div>

      <div className="fasce-eta__adulti">
        <label className="fasce-eta__lbl">Adulti extra</label>
        <select className="sib-select fasce-eta__select" value={data.numAdultiExtra} onChange={(e) => setData({ ...data, numAdultiExtra: Number(e.target.value) })}>
          <option value={0}>Nessuno</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
        </select>
        {data.numAdultiExtra >= 1 && (
          <div className="fasce-eta__adulto"><span>Adulto 1</span><input type="number" className="sib-input fasce-eta__short" value={data.adulto1} onChange={(e) => setData({ ...data, adulto1: Number(e.target.value) || 0 })} /><span>%</span></div>
        )}
        {data.numAdultiExtra >= 2 && (
          <div className="fasce-eta__adulto"><span>Adulto 2</span><input type="number" className="sib-input fasce-eta__short" value={data.adulto2} onChange={(e) => setData({ ...data, adulto2: Number(e.target.value) || 0 })} /><span>%</span></div>
        )}
        {data.numAdultiExtra >= 3 && (
          <div className="fasce-eta__adulto"><span>Adulto 3</span><input type="number" className="sib-input fasce-eta__short" value={data.adulto3} onChange={(e) => setData({ ...data, adulto3: Number(e.target.value) || 0 })} /><span>%</span></div>
        )}
      </div>

      <div className="fasce-eta__actions">
        <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>Salva</button>
      </div>
    </div>
  )
}
