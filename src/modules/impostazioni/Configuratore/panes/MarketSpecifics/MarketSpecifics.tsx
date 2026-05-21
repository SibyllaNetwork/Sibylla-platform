import React, { useEffect, useMemo, useState } from 'react'
import { apiFetchSibylla } from '../../../../../services/api'
import Pagination from '../../../../../core/components/Pagination'
import './MarketSpecifics.sass'

interface Naz { id: number; nome: string; flagEmoji: string; sconto: number }
interface Data { naz: Naz[] }

const PAGE_SIZE = 10

const FALLBACK: Data = {
  naz: [
    { id: 1,  nome: 'ITALIA',          flagEmoji: '🇮🇹', sconto: 3 },
    { id: 2,  nome: 'GERMANIA',        flagEmoji: '🇩🇪', sconto: 3 },
    { id: 3,  nome: 'FRANCIA',         flagEmoji: '🇫🇷', sconto: 3 },
    { id: 4,  nome: 'SPAGNA',          flagEmoji: '🇪🇸', sconto: 3 },
    { id: 5,  nome: 'GRECIA',          flagEmoji: '🇬🇷', sconto: 3 },
    { id: 6,  nome: 'SVIZZERA',        flagEmoji: '🇨🇭', sconto: 3 },
    { id: 7,  nome: 'INGHILTERRA',     flagEmoji: '🇬🇧', sconto: 3 },
    { id: 8,  nome: 'USA',             flagEmoji: '🇺🇸', sconto: 3 },
    { id: 9,  nome: 'CANADA',          flagEmoji: '🇨🇦', sconto: 3 },
    { id: 10, nome: 'RUSSIA',          flagEmoji: '🇷🇺', sconto: 3 },
    { id: 11, nome: 'AUSTRIA',         flagEmoji: '🇦🇹', sconto: 3 },
    { id: 12, nome: 'BELGIO',          flagEmoji: '🇧🇪', sconto: 3 },
    { id: 13, nome: 'PAESI BASSI',     flagEmoji: '🇳🇱', sconto: 3 },
    { id: 14, nome: 'PORTOGALLO',      flagEmoji: '🇵🇹', sconto: 3 },
    { id: 15, nome: 'DANIMARCA',       flagEmoji: '🇩🇰', sconto: 3 },
    { id: 16, nome: 'SVEZIA',          flagEmoji: '🇸🇪', sconto: 3 },
    { id: 17, nome: 'NORVEGIA',        flagEmoji: '🇳🇴', sconto: 3 },
    { id: 18, nome: 'FINLANDIA',       flagEmoji: '🇫🇮', sconto: 3 },
    { id: 19, nome: 'POLONIA',         flagEmoji: '🇵🇱', sconto: 3 },
    { id: 20, nome: 'REPUBBLICA CECA', flagEmoji: '🇨🇿', sconto: 3 },
    { id: 21, nome: 'UNGHERIA',        flagEmoji: '🇭🇺', sconto: 3 },
    { id: 22, nome: 'ROMANIA',         flagEmoji: '🇷🇴', sconto: 3 },
    { id: 23, nome: 'IRLANDA',         flagEmoji: '🇮🇪', sconto: 3 },
    { id: 24, nome: 'TURCHIA',         flagEmoji: '🇹🇷', sconto: 3 },
    { id: 25, nome: 'CROAZIA',         flagEmoji: '🇭🇷', sconto: 3 },
    { id: 26, nome: 'SLOVENIA',        flagEmoji: '🇸🇮', sconto: 3 },
    { id: 27, nome: 'GIAPPONE',        flagEmoji: '🇯🇵', sconto: 3 },
    { id: 28, nome: 'CINA',            flagEmoji: '🇨🇳', sconto: 3 },
    { id: 29, nome: 'COREA DEL SUD',   flagEmoji: '🇰🇷', sconto: 3 },
    { id: 30, nome: 'INDIA',           flagEmoji: '🇮🇳', sconto: 3 },
    { id: 31, nome: 'BRASILE',         flagEmoji: '🇧🇷', sconto: 3 },
    { id: 32, nome: 'ARGENTINA',       flagEmoji: '🇦🇷', sconto: 3 },
    { id: 33, nome: 'AUSTRALIA',       flagEmoji: '🇦🇺', sconto: 3 },
    { id: 34, nome: 'NUOVA ZELANDA',   flagEmoji: '🇳🇿', sconto: 3 },
    { id: 35, nome: 'MESSICO',         flagEmoji: '🇲🇽', sconto: 3 },
  ],
}

export default function MarketSpecifics() {
  const [data, setData] = useState<Data>(FALLBACK)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('configura/GetMarketSpecifics', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  const totalPages = Math.max(1, Math.ceil(data.naz.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)

  const pageItems = useMemo(
    () => data.naz.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [data.naz, safePage]
  )

  const update = (id: number, sconto: number) => {
    setData({ naz: data.naz.map((n) => n.id === id ? { ...n, sconto } : n) })
  }

  const save = async () => {
    setSaving(true)
    try { await apiFetchSibylla('configura/SetMarketSpecifics', { method: 'POST', body: data }) } catch { /* silent */ }
    setSaving(false)
  }

  return (
    <div className="market-specifics">
      <div className="market-specifics__breadcrumb">
        Configuratore <i className="fa-light fa-chevron-right" /> <strong>Market specifics</strong>
      </div>

      <div className="market-specifics__table-wrap">
        <table className="market-specifics__table">
          <thead>
            <tr>
              <th>Nazionalità</th>
              <th className="market-specifics__th--sconto">Scontistica</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((n) => (
              <tr key={n.id}>
                <td className="market-specifics__td--naz">
                  <span className="market-specifics__naz">
                    <span className="market-specifics__flag">{n.flagEmoji}</span>
                    <span>{n.nome}</span>
                  </span>
                </td>
                <td>
                  <span className="market-specifics__cell">
                    <input
                      type="number"
                      className="sib-input sib-input--dense market-specifics__input"
                      value={n.sconto}
                      onChange={(e) => update(n.id, Number(e.target.value) || 0)}
                      aria-label={`Scontistica ${n.nome}`}
                    />
                    <span className="market-specifics__unit">%</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="market-specifics__footer">
        <div className="market-specifics__count">
          {data.naz.length} nazionalità · pagina {safePage} di {totalPages}
        </div>
        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <div className="market-specifics__actions">
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
