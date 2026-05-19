import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './VincoloMatriosca.sass'

interface Riga { id: number; tipo: string; equivalenti: string[] }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  rows: Riga[]
}

const FALLBACK: Data = {
  Strutture: [], StrutturaId: null,
  rows: [
    { id: 1, tipo: 'Doppia + X',          equivalenti: ['Doppia + XX','Matrimoniale + X','Tripla Classic','Matrimoniale + XX'] },
    { id: 2, tipo: 'Doppia + XX',         equivalenti: ['Matrimoniale + XX'] },
    { id: 3, tipo: 'Doppia Classic',      equivalenti: ['Doppia + X','Doppia + XX','Matrimoniale Economy','Tripla Classic','Matrimoniale + X','Doppia Economy'] },
    { id: 4, tipo: 'Doppia Economy',      equivalenti: ['Doppia + XX','Matrimoniale Economy','Doppia Classic','Doppia + X','Singola Classic','Matrimoniale + X','Tripla Classic','Matrimoniale Classic'] },
    { id: 5, tipo: 'Doppia Uso Singola',  equivalenti: ['Matrimoniale Economy','Doppia + XX','Doppia + X','Doppia Classic','Doppia Economy','Matrimoniale Classic','Matrimoniale + X','Tripla Classic'] },
    { id: 6, tipo: 'Matrimoniale + X',    equivalenti: ['Doppia + X','Doppia + XX','Tripla Classic'] },
    { id: 7, tipo: 'Matrimoniale Classic',equivalenti: ['Doppia + XX','Matrimoniale + X','Doppia Classic','Doppia + X','Tripla Classic'] },
  ],
}

export default function VincoloMatriosca() {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetVincoloMatriosca', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <div className="vincolo-matriosca">
      <div className="vincolo-matriosca__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Vincolo matriosca</strong>
      </div>
      <div className="vincolo-matriosca__field">
        <label>Struttura</label>
        <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Hotel Siracusa</option>
          {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
        </select>
      </div>

      <table className="vincolo-matriosca__table">
        <thead><tr><th>Tipo camera</th><th>Tipo camera equivalente</th><th>Azioni</th></tr></thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.id}>
              <td className="vincolo-matriosca__name">{r.tipo}</td>
              <td>{r.equivalenti.join(', ')}</td>
              <td><button type="button" className="sib-btn sib-btn--primary">Modifica</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
