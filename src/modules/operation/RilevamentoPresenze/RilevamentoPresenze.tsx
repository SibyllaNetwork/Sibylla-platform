import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { DatePickerField, DateRangeField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import { exportTableToXls } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
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

// Intervalli per l'export XML (verso questura/ISTAT)
const INTERVALLI_XML = [
  { value: 'oggi',    label: 'Oggi' },
  { value: '7',       label: 'Ultimi 7 giorni' },
  { value: '15',      label: 'Ultimi 15 giorni' },
  { value: '30',      label: 'Ultimi 30 giorni' },
  { value: 'periodo', label: 'Periodo selezionato' },
]

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
  const [filterPaese, setFilterPaese] = useState('')
  const [filterProv,  setFilterProv]  = useState('')
  const [openFilter,  setOpenFilter]  = useState<'paese' | 'provincia' | null>(null)
  const [xmlOpen,     setXmlOpen]     = useState(false)
  const [xmlInterval, setXmlInterval] = useState('7')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<RigaNazione[]>('backoffice/GetRilevamentoPresenze', {
      method: 'POST',
      body: { struttura, data, periodoDa, periodoA },
    })
      .then((d) => { if (!cancelled) setItems(d?.length ? d : FALLBACK) })
      .catch(() => { /* mantiene i dati di esempio */ })
    return () => { cancelled = true }
  }, [struttura, data, periodoDa, periodoA])

  const filtered = useMemo(() => items.filter((r) => {
    if (filterPaese && !r.nazione.toLowerCase().includes(filterPaese.toLowerCase())) return false
    if (filterProv  && !(r.provincia ?? '').toLowerCase().includes(filterProv.toLowerCase())) return false
    return true
  }), [items, filterPaese, filterProv])

  // ── Export Excel ────────────────────────────────────────────────────────────
  const esportaXls = () => {
    const header = ['Paese di residenza', 'Provincia', 'Presenze', 'Arrivi', 'Partenze']
    const rows = filtered.map((r) => [r.nazione, r.provincia ?? '/', r.presenze, r.arrivi, r.partenze])
    exportTableToXls('rilevamento-presenze.xls', header, rows, 'Rilevamento presenze')
  }

  // ── Export XML (per intervallo) ───────────────────────────────────────────────
  const intervalRange = (): { dal: string; al: string } => {
    if (xmlInterval === 'periodo') return { dal: periodoDa, al: periodoA }
    if (xmlInterval === 'oggi')    return { dal: data, al: data }
    const n = Number(xmlInterval)
    const d = new Date(data)
    const from = new Date(d); from.setDate(d.getDate() - (n - 1))
    return { dal: from.toISOString().slice(0, 10), al: data }
  }
  const esportaXml = () => {
    const { dal, al } = intervalRange()
    const esc = (s: unknown) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const righe = filtered.map((r) =>
      `  <riga paese="${esc(r.nazione)}" iso="${esc(r.iso2 ?? '')}" provincia="${esc(r.provincia ?? '/')}" presenze="${r.presenze}" arrivi="${r.arrivi}" partenze="${r.partenze}" />`,
    ).join('\n')
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rilevamentoPresenze struttura="${esc(struttura)}" dal="${dal}" al="${al}">\n${righe}\n</rilevamentoPresenze>\n`
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
    const a = document.createElement('a')
    a.href = url; a.download = `rilevamento-presenze_${dal}_${al}.xml`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    setXmlOpen(false)
  }

  return (
    <div>
      <BtnBack />
      <PageHeader title="Rilevamento presenze" subtitle="Report dei dati aggregati per nazionalità e delle presenze registrate" />

      <div className="flex items-end gap-4 mb-5 flex-wrap">
        <div className="w-56">
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)} options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
        </div>
        <div className="w-44">
          <DatePickerField name="data" label="Data" value={data} onChange={(e) => setData(e.target.value)} />
        </div>

        <div className="ml-auto flex items-end gap-3 flex-wrap">
          <button className="sib-btn sib-btn--icon" title="Esporta in Excel" aria-label="Esporta in Excel" onClick={esportaXls}>
            <i className="fa-duotone fa-file-excel" />
          </button>

          {/* Esporta XML: scelta intervallo da popover */}
          <div className="relative">
            <button className="sib-btn sib-btn--icon" title="Esporta in XML" aria-label="Esporta in XML" onClick={() => setXmlOpen((o) => !o)}>
              <i className="fa-duotone fa-file-code" />
            </button>
            {xmlOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setXmlOpen(false)} />
                <div className="rilev-presenze__xml-pop">
                  <div className="rilev-presenze__xml-title">
                    <i className="fa-light fa-file-code" /> Esporta XML
                  </div>
                  <SelectField name="xmlInterval" label="Intervallo di giorni" value={xmlInterval}
                    onChange={(e) => setXmlInterval(e.target.value)} options={INTERVALLI_XML} />
                  <button type="button" className="sib-btn sib-btn--primary w-full" onClick={esportaXml}>
                    <i className="fa-light fa-download" /> Esporta XML
                  </button>
                </div>
              </>
            )}
          </div>
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
