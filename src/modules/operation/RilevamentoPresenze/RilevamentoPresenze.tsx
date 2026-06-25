import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import { DatePickerField, DateRangeField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './RilevamentoPresenze.sass'

/**
 * Rilevamento presenze — replica `Views/FrontOffice/RilevamentoPresenze.cshtml`.
 * Report aggregato per nazionalità ai fini ISTAT/Polizia.
 *
 * BE Razor: `BackOfficeController.GetRilevamentoPresenze` → catch-all
 * `/Sibylla/backoffice/GetRilevamentoPresenze`.
 */

interface RigaNazione {
  id?: number | string
  nazione: string
  iso2?: string
  provincia?: string
  presenze: number
  arrivi: number
  partenze: number
  [key: string]: unknown
}

const STRUTTURE = ['Hotel Tutorial', 'Grim’s Hotel', 'Hotel Azzurro Mare', 'Hotel Archimede', 'Hotel LUX', 'Hotel Lazio']

const FALLBACK: RigaNazione[] = Array.from({ length: 6 }).map((_, i) => ({
  id: i + 1,
  nazione: 'BULGARIA',
  iso2: 'BG',
  provincia: '/',
  presenze: 1,
  arrivi: 0,
  partenze: 0,
}))

function flagEmoji(iso2?: string): string {
  if (!iso2 || iso2.length !== 2) return '🏳️'
  const A = 0x1F1E6
  const a = 'A'.charCodeAt(0)
  const c1 = String.fromCodePoint(A + (iso2.toUpperCase().charCodeAt(0) - a))
  const c2 = String.fromCodePoint(A + (iso2.toUpperCase().charCodeAt(1) - a))
  return c1 + c2
}

export default function RilevamentoPresenze({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura] = useState('Hotel Tutorial')
  const [data, setData] = useState('2026-04-28')
  const [periodoDa, setPeriodoDa] = useState('2026-03-01')
  const [periodoA,  setPeriodoA]  = useState('2026-03-31')
  const [items, setItems] = useState<RigaNazione[]>(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterPaese, setFilterPaese] = useState('')
  const [filterProv,  setFilterProv]  = useState('')
  const [openFilter,  setOpenFilter]  = useState<'paese' | 'provincia' | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<RigaNazione[]>('backoffice/GetRilevamentoPresenze', {
      method: 'POST',
      body: { struttura, data, periodoDa, periodoA },
    })
      .then((d) => { if (!cancelled) { setItems(d?.length ? d : FALLBACK); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [struttura, data, periodoDa, periodoA])

  const filtered = useMemo(() => items.filter((r) => {
    if (filterPaese && !r.nazione.toLowerCase().includes(filterPaese.toLowerCase())) return false
    if (filterProv  && !(r.provincia ?? '').toLowerCase().includes(filterProv.toLowerCase())) return false
    return true
  }), [items, filterPaese, filterProv])

  return (
    <div>
      <BtnBack />
      <PageHeader title="Rilevamento presenze" subtitle="Report dei dati aggregati per nazionalità e delle presenze registrate" />

      {error && loaded && (
        <AlertBanner type="warning">Backend non raggiungibile — mostro dati di esempio. ({error})</AlertBanner>
      )}

      <div className="flex items-end gap-4 mb-5 flex-wrap">
        <div className="w-56">
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)} options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
        </div>
        <div className="w-44">
          <DatePickerField name="data" label="Data" value={data} onChange={(e) => setData(e.target.value)} />
        </div>

        <div className="ml-auto flex items-end gap-3 flex-wrap">
          <button className="sib-btn sib-btn--icon" title="Esporta XLS">
            <i className="fa-duotone fa-file-excel" />
          </button>
          <button className="sib-btn sib-btn--icon" title="Esporta XML">
            <i className="fa-duotone fa-file-code" />
          </button>
          <DateRangeField nameFrom="periodoDa" nameTo="periodoA" label="Periodo" valueFrom={periodoDa} valueTo={periodoA} onChangeFrom={(e) => setPeriodoDa(e.target.value)} onChangeTo={(e) => setPeriodoA(e.target.value)} />
          <button className="sib-btn sib-btn--icon" title="Scarica report">
            <i className="fa-duotone fa-download" />
          </button>
          <button className="sib-btn sib-btn--icon" title="Invia per email">
            <i className="fa-duotone fa-envelope" />
          </button>
        </div>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            <tr>
              <th className="relative">
                <span className="inline-flex items-center gap-2">
                  Paese di residenza
                  <button type="button" className="text-ink-muted hover:text-text" onClick={() => setOpenFilter(openFilter === 'paese' ? null : 'paese')} title="Filtra">
                    <i className="fa-solid fa-filter" />
                  </button>
                </span>
                {openFilter === 'paese' && (
                  <div className="absolute z-10 top-full left-0 mt-1 bg-white border border-line rounded shadow-md p-2 w-48">
                    <input autoFocus className="sib-input" placeholder="Filtra paese" value={filterPaese} onChange={(e) => setFilterPaese(e.target.value)} />
                    <div className="flex justify-between mt-2">
                      <button type="button" className="sib-btn sib-btn--ghost text-xs" onClick={() => { setFilterPaese(''); setOpenFilter(null) }}>Reset</button>
                      <button type="button" className="sib-btn sib-btn--primary text-xs" onClick={() => setOpenFilter(null)}>OK</button>
                    </div>
                  </div>
                )}
              </th>
              <th className="relative">
                <span className="inline-flex items-center gap-2">
                  Provincia
                  <button type="button" className="text-ink-muted hover:text-text" onClick={() => setOpenFilter(openFilter === 'provincia' ? null : 'provincia')} title="Filtra">
                    <i className="fa-solid fa-filter" />
                  </button>
                </span>
                {openFilter === 'provincia' && (
                  <div className="absolute z-10 top-full left-0 mt-1 bg-white border border-line rounded shadow-md p-2 w-48">
                    <input autoFocus className="sib-input" placeholder="Filtra provincia" value={filterProv} onChange={(e) => setFilterProv(e.target.value)} />
                    <div className="flex justify-between mt-2">
                      <button type="button" className="sib-btn sib-btn--ghost text-xs" onClick={() => { setFilterProv(''); setOpenFilter(null) }}>Reset</button>
                      <button type="button" className="sib-btn sib-btn--primary text-xs" onClick={() => setOpenFilter(null)}>OK</button>
                    </div>
                  </div>
                )}
              </th>
              <th>Presenze</th>
              <th>Arrivi</th>
              <th>Partenze</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={`${r.id ?? i}-${r.nazione}`}>
                <td>
                  <span className="inline-flex items-center gap-2">
                    <span className="rilev-presenze__flag">{flagEmoji(r.iso2)}</span>
                    <span>{r.nazione}</span>
                  </span>
                </td>
                <td className="border-l border-line">{r.provincia ?? '/'}</td>
                <td className="border-l border-line">{r.presenze}</td>
                <td className="border-l border-line">{r.arrivi}</td>
                <td className="border-l border-line">{r.partenze}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="sib-empty">Nessun dato per i filtri selezionati.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
