import React, { useEffect, useState } from 'react'
import { SelectField } from '../../../../../core/components/form'
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

type FasciaKey = 'Infanti' | 'Bambini' | 'Ragazzi'

const FASCE: { key: FasciaKey; label: string; icon: string }[] = [
  { key: 'Infanti', label: 'Infanti', icon: 'baby'   },
  { key: 'Bambini', label: 'Bambini', icon: 'child'  },
  { key: 'Ragazzi', label: 'Ragazzi', icon: 'person' },
]

const FALLBACK: Data = {
  Strutture: [], StrutturaId: null,
  Infanti: { da: 0, a: 4,  perc: 100, attiva: true  },
  Bambini: { da: 5, a: 12, perc: 50,  attiva: true  },
  Ragazzi: { da: 0, a: 0,  perc: 0,   attiva: false },
  numAdultiExtra: 3, adulto1: 20, adulto2: 30, adulto3: 40,
}

export default function FasceEta() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetFasceEta', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const updateFascia = (key: FasciaKey, f: Partial<Fascia>) => {
    setData({ ...data, [key]: { ...data[key], ...f } })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetFasceEta', { method: 'POST', body: data }) } catch { /* silent */ }
    setSaving(false)
  }

  return (
    <div className="fasce-eta">
      <div className="fasce-eta__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Fasce d'età</strong>
      </div>

      <h3 className="fasce-eta__title">Variazione del prezzo rispetto a fascia di età adulti</h3>

      <div className="fasce-eta__filters">
        <SelectField
          name="struttura"
          label="Struttura"
          className="fasce-eta__field"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={[
            { value: '', label: 'Hotel Tutorial' },
            ...data.Strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />
      </div>

      <div className="fasce-eta__table-wrap">
        <table className="fasce-eta__table">
          <thead>
            <tr>
              <th>Fascia</th>
              <th className="fasce-eta__th--num">Da</th>
              <th className="fasce-eta__th--num">A</th>
              <th className="fasce-eta__th--num">Percentuale</th>
              <th className="fasce-eta__th--center">Attiva</th>
            </tr>
          </thead>
          <tbody>
            {FASCE.map(({ key, label, icon }) => {
              const f = data[key]
              return (
                <tr key={key}>
                  <td className="fasce-eta__td--name">
                    <span className="fasce-eta__name">
                      <i className={`fa-light fa-${icon}`} aria-hidden="true" />
                      <span>{label}</span>
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="sib-input sib-input--dense fasce-eta__short"
                      value={f.da}
                      disabled={!f.attiva}
                      onChange={(e) => updateFascia(key, { da: Number(e.target.value) || 0 })}
                      aria-label={`${label} da`}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="sib-input sib-input--dense fasce-eta__short"
                      value={f.a}
                      disabled={!f.attiva}
                      onChange={(e) => updateFascia(key, { a: Number(e.target.value) || 0 })}
                      aria-label={`${label} a`}
                    />
                  </td>
                  <td>
                    <span className="fasce-eta__cell">
                      <input
                        type="number"
                        className="sib-input sib-input--dense fasce-eta__short"
                        value={f.perc}
                        disabled={!f.attiva}
                        onChange={(e) => updateFascia(key, { perc: Number(e.target.value) || 0 })}
                        aria-label={`${label} percentuale`}
                      />
                      <span className="fasce-eta__unit">%</span>
                    </span>
                  </td>
                  <td className="fasce-eta__td--center">
                    <input
                      type="checkbox"
                      className="sib-checkbox"
                      checked={f.attiva}
                      onChange={(e) => updateFascia(key, { attiva: e.target.checked })}
                      aria-label={`${label} attiva`}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="fasce-eta__adulti">
        <SelectField
          name="numAdultiExtra"
          label="Adulti extra"
          className="fasce-eta__field fasce-eta__select-adulti"
          value={data.numAdultiExtra}
          onChange={(e) => setData({ ...data, numAdultiExtra: Number(e.target.value) })}
          options={[
            { value: 0, label: 'Nessuno' },
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
          ]}
        />
        {[1, 2, 3].map((n) => data.numAdultiExtra >= n && (
          <div className="fasce-eta__field-raw" key={n}>
            <label>Adulto {n}</label>
            <span className="fasce-eta__cell">
              <input
                type="number"
                className="sib-input sib-input--dense fasce-eta__short"
                value={data[`adulto${n}` as 'adulto1' | 'adulto2' | 'adulto3']}
                onChange={(e) => setData({ ...data, [`adulto${n}`]: Number(e.target.value) || 0 })}
                aria-label={`Adulto ${n} percentuale`}
              />
              <span className="fasce-eta__unit">%</span>
            </span>
          </div>
        ))}
      </div>

      <div className="fasce-eta__actions">
        <button
          type="button"
          className="sib-btn sib-btn--primary"
          onClick={save}
          disabled={saving}
        >
          Salva
        </button>
      </div>
    </div>
  )
}
