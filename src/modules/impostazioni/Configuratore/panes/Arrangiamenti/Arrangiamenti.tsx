import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import { SelectField } from '../../../../../core/components/form'
import './Arrangiamenti.sass'

type Pasto = 'colazione' | 'pranzo' | 'cena' | 'nessuno'
interface Arr {
  id: number; nome: string; icon: string;
  costo: number; importo: number; attivo: boolean;
  colazione: boolean; pranzo: boolean; cena: boolean;
  iniziaCon: Pasto; finisciCon: Pasto;
}
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Segmento: 'B2B' | 'B2C' | 'Gruppi' | 'Dirette'
  arr: Arr[]
}

const FALLBACK: Data = {
  Strutture: [], StrutturaId: null, Segmento: 'B2B',
  arr: [
    { id: 1, nome: 'Room Only',         icon: 'bed',            costo: 0,  importo: 0,  attivo: false, colazione: false, pranzo: false, cena: false, iniziaCon: 'nessuno', finisciCon: 'nessuno' },
    { id: 2, nome: 'Bed and breakfast', icon: 'mug-hot',        costo: 5,  importo: 10, attivo: true,  colazione: true,  pranzo: false, cena: false, iniziaCon: 'nessuno', finisciCon: 'colazione' },
    { id: 3, nome: 'Mezza pensione',    icon: 'burger',         costo: 10, importo: 25, attivo: true,  colazione: true,  pranzo: false, cena: true,  iniziaCon: 'cena',    finisciCon: 'colazione' },
    { id: 4, nome: 'Pensione completa', icon: 'plate-utensils', costo: 15, importo: 50, attivo: true,  colazione: true,  pranzo: true,  cena: true,  iniziaCon: 'cena',    finisciCon: 'pranzo'    },
  ],
}

const PASTO_OPTIONS: { value: Pasto; label: string }[] = [
  { value: 'nessuno',   label: 'Nessuno'   },
  { value: 'colazione', label: 'Colazione' },
  { value: 'pranzo',    label: 'Pranzo'    },
  { value: 'cena',      label: 'Cena'      },
]

export default function Arrangiamenti() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetArrangiamenti', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const update = <K extends keyof Arr>(id: number, field: K, v: Arr[K]) => {
    setData({ ...data, arr: data.arr.map((a) => a.id === id ? { ...a, [field]: v } : a) })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetArrangiamenti', { method: 'POST', body: data }) } catch { /* silent */ }
    setSaving(false)
  }

  return (
    <div className="arrangiamenti">
      <div className="arrangiamenti__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Arrangiamenti</strong>
      </div>

      <div className="arrangiamenti__filters">
        <SelectField
          name="struttura"
          label="Struttura"
          className="arrangiamenti__field"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={[
            { value: '', label: 'Hotel Tutorial' },
            ...data.Strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />
        <SelectField
          name="segmento"
          label="Segmento"
          className="arrangiamenti__field"
          value={data.Segmento}
          onChange={(e) => setData({ ...data, Segmento: e.target.value as Data['Segmento'] })}
          options={[
            { value: 'B2B', label: 'B2B' },
            { value: 'B2C', label: 'B2C' },
            { value: 'Gruppi', label: 'Gruppi' },
            { value: 'Dirette', label: 'Dirette' },
          ]}
        />
      </div>

      <div className="arrangiamenti__table-wrap">
        <table className="arrangiamenti__table">
          <thead>
            <tr>
              <th className="arrangiamenti__th--name">Arrangiamento</th>
              <th className="arrangiamenti__th--num">Costo</th>
              <th className="arrangiamenti__th--num">Importo di Vendita</th>
              <th className="arrangiamenti__th--center">Attivo</th>
              <th className="arrangiamenti__th--center">Colazione</th>
              <th className="arrangiamenti__th--center">Pranzo</th>
              <th className="arrangiamenti__th--center">Cena</th>
              <th className="arrangiamenti__th--pasto">Inizia con</th>
              <th className="arrangiamenti__th--pasto">Finisci con</th>
            </tr>
          </thead>
          <tbody>
            {data.arr.map((a) => {
              const ro = a.id === 1
              return (
                <tr key={a.id}>
                  <td className="arrangiamenti__td arrangiamenti__td--name">
                    <span className="arrangiamenti__name">
                      <i className={`fa-light fa-${a.icon}`} aria-hidden="true" />
                      <span>{a.nome}</span>
                    </span>
                  </td>

                  <td className="arrangiamenti__td arrangiamenti__td--num">
                    {ro ? <span className="arrangiamenti__dash">—</span> : (
                      <span className="arrangiamenti__cell">
                        <input
                          type="number"
                          className="sib-input sib-input--dense arrangiamenti__input"
                          value={a.costo}
                          onChange={(e) => update(a.id, 'costo', Number(e.target.value) || 0)}
                          aria-label={`Costo ${a.nome}`}
                        />
                        <span className="arrangiamenti__unit">€</span>
                      </span>
                    )}
                  </td>

                  <td className="arrangiamenti__td arrangiamenti__td--num">
                    {ro ? <span className="arrangiamenti__dash">—</span> : (
                      <span className="arrangiamenti__cell">
                        <input
                          type="number"
                          className="sib-input sib-input--dense arrangiamenti__input"
                          value={a.importo}
                          onChange={(e) => update(a.id, 'importo', Number(e.target.value) || 0)}
                          aria-label={`Importo ${a.nome}`}
                        />
                        <span className="arrangiamenti__unit">€</span>
                      </span>
                    )}
                  </td>

                  <td className="arrangiamenti__td arrangiamenti__td--center">
                    {ro ? <span className="arrangiamenti__dash">—</span> : (
                      <input
                        type="checkbox"
                        className="sib-checkbox arrangiamenti__checkbox"
                        checked={a.attivo}
                        onChange={(e) => update(a.id, 'attivo', e.target.checked)}
                        aria-label={`Attivo ${a.nome}`}
                      />
                    )}
                  </td>

                  <td className="arrangiamenti__td arrangiamenti__td--center">
                    {ro ? <span className="arrangiamenti__dash">—</span> : (
                      <input
                        type="checkbox"
                        className="sib-checkbox arrangiamenti__checkbox"
                        checked={a.colazione}
                        onChange={(e) => update(a.id, 'colazione', e.target.checked)}
                        aria-label={`Colazione ${a.nome}`}
                      />
                    )}
                  </td>

                  <td className="arrangiamenti__td arrangiamenti__td--center">
                    {ro ? <span className="arrangiamenti__dash">—</span> : (
                      <input
                        type="checkbox"
                        className="sib-checkbox arrangiamenti__checkbox"
                        checked={a.pranzo}
                        onChange={(e) => update(a.id, 'pranzo', e.target.checked)}
                        aria-label={`Pranzo ${a.nome}`}
                      />
                    )}
                  </td>

                  <td className="arrangiamenti__td arrangiamenti__td--center">
                    {ro ? <span className="arrangiamenti__dash">—</span> : (
                      <input
                        type="checkbox"
                        className="sib-checkbox arrangiamenti__checkbox"
                        checked={a.cena}
                        onChange={(e) => update(a.id, 'cena', e.target.checked)}
                        aria-label={`Cena ${a.nome}`}
                      />
                    )}
                  </td>

                  <td className="arrangiamenti__td">
                    {ro ? <span className="arrangiamenti__dash">—</span> : (
                      <select
                        className="sib-select sib-select--dense arrangiamenti__select arrangiamenti__select--inline"
                        value={a.iniziaCon}
                        onChange={(e) => update(a.id, 'iniziaCon', e.target.value as Pasto)}
                      >
                        {PASTO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    )}
                  </td>

                  <td className="arrangiamenti__td">
                    {ro ? <span className="arrangiamenti__dash">—</span> : (
                      <select
                        className="sib-select sib-select--dense arrangiamenti__select arrangiamenti__select--inline"
                        value={a.finisciCon}
                        onChange={(e) => update(a.id, 'finisciCon', e.target.value as Pasto)}
                      >
                        {PASTO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="arrangiamenti__actions">
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
  )
}
