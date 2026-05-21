import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './MappingSegmentoMercato.sass'

interface Sib { id: number; nome: string }
interface Hotel { id: number; nome: string; idSibylla: number | null }
interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  isPms: boolean
  segmentiSibylla: Sib[]
  segmentiHotel: Hotel[]
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  isPms: false,
  segmentiSibylla: [
    { id: 1, nome: 'Dirette' }, { id: 2, nome: 'Corporate' }, { id: 3, nome: 'B2C' },
    { id: 4, nome: 'Gruppi' }, { id: 5, nome: 'B2B' }, { id: 6, nome: 'Complementary' },
  ],
  segmentiHotel: [],
}

export default function MappingSegmentoMercato() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetSegmentiMapping', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const updateHotel = (id: number, idSibylla: number | null) => {
    setData({ ...data, segmentiHotel: data.segmentiHotel.map((h) => h.id === id ? { ...h, idSibylla } : h) })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetSegmentiMapping', { method: 'POST', body: data }) } catch {}
    setSaving(false)
  }

  return (
    <div className="mapping-segmento">
      <div className="mapping-segmento__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Mapping segmento di mercato</strong>
      </div>

      <div className="mapping-segmento__bar">
        <div className="mapping-segmento__field">
          <label>Segmenti Sibylla</label>
          <select className="sib-select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Hotel Tutorial</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {!data.isPms ? (
        <div className="mapping-segmento__list">
          {data.segmentiSibylla.map((s) => (
            <div className="mapping-segmento__row" key={s.id}>{s.nome}</div>
          ))}
        </div>
      ) : (
        <div className="mapping-segmento__table-wrap"><table className="mapping-segmento__table">
          <thead><tr><th>Segmenti hotel</th><th>Segmenti Sibylla</th><th /></tr></thead>
          <tbody>
            {data.segmentiHotel.map((h) => (
              <tr key={h.id}>
                <td>{h.nome}</td>
                <td>
                  <select className="sib-select" value={h.idSibylla ?? ''} onChange={(e) => updateHotel(h.id, e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Seleziona…</option>
                    {data.segmentiSibylla.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </td>
                <td>
                  {h.idSibylla !== null && (
                    <span className="mapping-segmento__badge">
                      <i className="fa-light fa-link" /> Parametro associato
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {data.isPms && (
        <div className="mapping-segmento__actions">
          <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>Salva</button>
        </div>
      )}
    </div>
  )
}
