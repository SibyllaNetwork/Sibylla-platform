import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
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
    { id: 1, nome: 'Room Only',         icon: 'bed',           costo: 0, importo: 0, attivo: false, colazione: false, pranzo: false, cena: false, iniziaCon: 'nessuno', finisciCon: 'nessuno' },
    { id: 2, nome: 'Bed and breakfast', icon: 'mug-hot',       costo: 0, importo: 0, attivo: false, colazione: false, pranzo: false, cena: false, iniziaCon: 'nessuno', finisciCon: 'nessuno' },
    { id: 3, nome: 'Mezza pensione',    icon: 'burger',        costo: 0, importo: 0, attivo: false, colazione: false, pranzo: false, cena: false, iniziaCon: 'nessuno', finisciCon: 'nessuno' },
    { id: 4, nome: 'Pensione completa', icon: 'plate-utensils',costo: 0, importo: 0, attivo: false, colazione: false, pranzo: false, cena: false, iniziaCon: 'nessuno', finisciCon: 'nessuno' },
  ],
}

export default function Arrangiamenti() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetArrangiamenti', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const update = (id: number, field: keyof Arr, v: any) => {
    setData({ ...data, arr: data.arr.map((a) => a.id === id ? { ...a, [field]: v } : a) })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetArrangiamenti', { method: 'POST', body: data }) } catch {}
    setSaving(false)
  }

  return (
    <div className="arrangiamenti">
      <div className="arrangiamenti__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Arrangiamenti</strong>
      </div>
      <div className="arrangiamenti__filters">
        <div className="arrangiamenti__field"><label>Struttura</label>
          <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Hotel Siracusa</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="arrangiamenti__field"><label>Segmento</label>
          <select className="sib-select" value={data.Segmento} onChange={(e) => setData({ ...data, Segmento: e.target.value as any })}>
            <option value="B2B">B2B</option><option value="B2C">B2C</option><option value="Gruppi">Gruppi</option><option value="Dirette">Dirette</option>
          </select>
        </div>
      </div>

      <table className="arrangiamenti__table">
        <thead><tr>
          <th>Arrangiamento</th><th>Costo</th><th>Importo di Vendita</th><th>Attivo</th>
          <th>Colazione</th><th>Pranzo</th><th>Cena</th><th>Inizia con</th><th>Finisci con</th>
        </tr></thead>
        <tbody>
          {data.arr.map((a) => {
            const ro = a.id === 1
            return (
              <tr key={a.id}>
                <td className="arrangiamenti__name"><i className={`fa-light fa-${a.icon}`} /> {a.nome}</td>
                <td>{ro ? '-' : <div className="arrangiamenti__cell"><input type="number" className="sib-input arrangiamenti__short" value={a.costo} onChange={(e) => update(a.id, 'costo', Number(e.target.value) || 0)} /><span>€</span></div>}</td>
                <td>{ro ? '-' : <div className="arrangiamenti__cell"><input type="number" className="sib-input arrangiamenti__short" value={a.importo} onChange={(e) => update(a.id, 'importo', Number(e.target.value) || 0)} /><span>€</span></div>}</td>
                <td className="arrangiamenti__center">{ro ? '-' : <input type="checkbox" className="sib-checkbox" checked={a.attivo} onChange={(e) => update(a.id, 'attivo', e.target.checked)} />}</td>
                <td className="arrangiamenti__center">{ro ? '-' : <input type="checkbox" className="sib-checkbox" checked={a.colazione} onChange={(e) => update(a.id, 'colazione', e.target.checked)} />}</td>
                <td className="arrangiamenti__center">{ro ? '-' : <input type="checkbox" className="sib-checkbox" checked={a.pranzo} onChange={(e) => update(a.id, 'pranzo', e.target.checked)} />}</td>
                <td className="arrangiamenti__center">{ro ? '-' : <input type="checkbox" className="sib-checkbox" checked={a.cena} onChange={(e) => update(a.id, 'cena', e.target.checked)} />}</td>
                <td>{ro ? '-' : (
                  <select className="sib-select" value={a.iniziaCon} onChange={(e) => update(a.id, 'iniziaCon', e.target.value)}>
                    <option value="nessuno">Nessuno</option><option value="colazione">Colazione</option><option value="pranzo">Pranzo</option><option value="cena">Cena</option>
                  </select>
                )}</td>
                <td>{ro ? '-' : (
                  <select className="sib-select" value={a.finisciCon} onChange={(e) => update(a.id, 'finisciCon', e.target.value)}>
                    <option value="nessuno">Nessuno</option><option value="colazione">Colazione</option><option value="pranzo">Pranzo</option><option value="cena">Cena</option>
                  </select>
                )}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="arrangiamenti__actions">
        <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>Salva</button>
      </div>
    </div>
  )
}
