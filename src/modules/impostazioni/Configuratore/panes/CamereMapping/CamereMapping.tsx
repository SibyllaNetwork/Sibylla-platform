import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './CamereMapping.sass'

interface Data {
  configured: boolean
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  rows: { tipoSibylla: string; tipoHotel: string }[]
}
const FALLBACK: Data = { configured: false, Strutture: [], StrutturaId: null, rows: [] }

export default function CamereMapping() {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetCamereMapping', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (!data.configured) {
    return (
      <div className="camere-mapping">
        <div className="camere-mapping__breadcrumb">
          Configuratore <i className="fa-light fa-chevron-right" /> <strong>Mapping camere</strong>
        </div>
        <div className="camere-mapping__empty">
          <i className="fa-light fa-bed-front" />
          <p>Per visualizzare la pagina è necessario configurare il mapping delle camere</p>
        </div>
      </div>
    )
  }

  return (
    <div className="camere-mapping">
      <div className="camere-mapping__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Mapping camere</strong>
      </div>
      <table className="camere-mapping__table">
        <thead><tr><th>Tipo Sibylla</th><th>Tipo Hotel</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}><td>{r.tipoSibylla}</td><td>{r.tipoHotel}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
