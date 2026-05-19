import React, { useEffect, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import './MarketSpecifics.sass'

interface Naz { id: number; nome: string; flagEmoji: string; sconto: number }
interface Data { naz: Naz[] }

const FALLBACK: Data = {
  naz: [
    { id: 1, nome: 'ITALIA',     flagEmoji: '🇮🇹', sconto: 3 },
    { id: 2, nome: 'GERMANIA',   flagEmoji: '🇩🇪', sconto: 3 },
    { id: 3, nome: 'FRANCIA',    flagEmoji: '🇫🇷', sconto: 3 },
    { id: 4, nome: 'SPAGNA',     flagEmoji: '🇪🇸', sconto: 3 },
    { id: 5, nome: 'GRECIA',     flagEmoji: '🇬🇷', sconto: 3 },
    { id: 6, nome: 'SVIZZERA',   flagEmoji: '🇨🇭', sconto: 3 },
    { id: 7, nome: 'INGILTERRA', flagEmoji: '🇬🇧', sconto: 3 },
    { id: 8, nome: 'USA',        flagEmoji: '🇺🇸', sconto: 3 },
    { id: 9, nome: 'CANADA',     flagEmoji: '🇨🇦', sconto: 3 },
    { id: 10, nome: 'RUSSIA',    flagEmoji: '🇷🇺', sconto: 3 },
  ],
}

export default function MarketSpecifics() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetMarketSpecifics', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const update = (id: number, sconto: number) => {
    setData({ naz: data.naz.map((n) => n.id === id ? { ...n, sconto } : n) })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetMarketSpecifics', { method: 'POST', body: data }) } catch {}
    setSaving(false)
  }

  return (
    <div className="market-specifics">
      <div className="market-specifics__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Market specifics</strong>
      </div>
      <div className="market-specifics__header"><span>Nazionalità</span><span>Scontistica</span></div>
      <div className="market-specifics__list">
        {data.naz.map((n) => (
          <div className="market-specifics__row" key={n.id}>
            <div className="market-specifics__naz">
              <span className="market-specifics__flag">{n.flagEmoji}</span>
              <span>{n.nome}</span>
            </div>
            <div className="market-specifics__cell">
              <input type="number" className="sib-input market-specifics__input" value={n.sconto} onChange={(e) => update(n.id, Number(e.target.value) || 0)} />
              <span className="market-specifics__unit">%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="market-specifics__actions">
        <button type="button" className="sib-btn sib-btn--primary" onClick={save} disabled={saving}>Salva</button>
      </div>
    </div>
  )
}
