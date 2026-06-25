import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField } from '../../../../../core/components/form'
import './ListiniIndividuali.sass'

interface Standard { id: number; nome: string; prezzo: number }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Tariffa: 'Per Camera' | 'Per Persona'
  Stagionalita: 'Alta Stagione' | 'Media Stagione' | 'Bassa Stagione'
  Listini: { Id: number; Nome: string }[]
  ListinoId: number | null
  Camere: { Id: number; Nome: string }[]
  CameraId: number | null
  Standard: Standard[]
}

const FALLBACK: Data = {
  Strutture: [], StrutturaId: null,
  Tariffa: 'Per Camera', Stagionalita: 'Alta Stagione',
  Listini: [{ Id: 1, Nome: 'Contratto 2025/2026' }], ListinoId: 1,
  Camere: [{ Id: 1, Nome: 'Singola Classic' }], CameraId: 1,
  Standard: [{ id: 1, nome: 'Singola Classic', prezzo: 0 }],
}

export default function ListiniIndividuali() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetListiniIndividuali', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const updatePrezzo = (id: number, prezzo: number) => {
    setData({ ...data, Standard: data.Standard.map((s) => s.id === id ? { ...s, prezzo } : s) })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetListiniIndividuali', { method: 'POST', body: data }) } catch {}
    setSaving(false)
  }

  return (
    <div className="listini-individuali">
      <div className="listini-individuali__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Listini individuali</strong>
      </div>

      <div className="listini-individuali__filters">
        <SelectField
          name="struttura"
          label="Struttura"
          className="listini-individuali__field"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={[
            { value: '', label: 'ciao' },
            ...data.Strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />
        <SelectField
          name="tariffa"
          label="Tariffa"
          className="listini-individuali__field"
          value={data.Tariffa}
          onChange={(e) => setData({ ...data, Tariffa: e.target.value as any })}
          options={[
            { value: 'Per Camera', label: 'Per Camera' },
            { value: 'Per Persona', label: 'Per Persona' },
          ]}
        />
        <SelectField
          name="stagionalita"
          label="Stagionalità"
          className="listini-individuali__field"
          value={data.Stagionalita}
          onChange={(e) => setData({ ...data, Stagionalita: e.target.value as any })}
          options={[
            { value: 'Alta Stagione', label: 'Alta Stagione' },
            { value: 'Media Stagione', label: 'Media Stagione' },
            { value: 'Bassa Stagione', label: 'Bassa Stagione' },
          ]}
        />
        <SelectField
          name="listino"
          label="Listino"
          className="listini-individuali__field"
          value={data.ListinoId ?? ''}
          onChange={(e) => setData({ ...data, ListinoId: e.target.value ? Number(e.target.value) : null })}
          options={data.Listini.map((l) => ({ value: l.Id, label: l.Nome }))}
        />
        <SelectField
          name="camere"
          label="Camere"
          className="listini-individuali__field"
          value={data.CameraId ?? ''}
          onChange={(e) => setData({ ...data, CameraId: e.target.value ? Number(e.target.value) : null })}
          options={data.Camere.map((c) => ({ value: c.Id, label: c.Nome }))}
        />
      </div>

      <div className="listini-individuali__header"><span>Standard Sibylla</span><span>Prezzo</span></div>
      <hr className="listini-individuali__divider" />
      {data.Standard.map((s) => (
        <div className="listini-individuali__row" key={s.id}>
          <span>{s.nome}</span>
          <div className="listini-individuali__cell">
            <input type="number" step="0.01" className="sib-input listini-individuali__input" value={s.prezzo} onChange={(e) => updatePrezzo(s.id, Number(e.target.value) || 0)} />
            <span className="listini-individuali__unit">€</span>
          </div>
        </div>
      ))}

      <div className="listini-individuali__actions">
        <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>Salva</button>
      </div>
    </div>
  )
}
