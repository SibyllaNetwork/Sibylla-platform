import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { DatePickerField, DateRangeField, SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import { exportTableToXls } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import './RilevamentoPresenze.sass'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import { pmsAttivo, usePmsStore } from '../_data/pmsDemo'

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


// Intervalli per l'export XML (verso questura/ISTAT)
const INTERVALLI_XML = [
  { value: 'oggi',    label: 'Oggi' },
  { value: '7',       label: 'Ultimi 7 giorni' },
  { value: '15',      label: 'Ultimi 15 giorni' },
  { value: '30',      label: 'Ultimi 30 giorni' },
  { value: 'periodo', label: 'Periodo selezionato' },
]

// ── Dati demo: ospiti del gestionale demo della struttura selezionata ─────────
//  Presenze, arrivi e partenze del giorno raggruppati per paese di residenza
//  (dedotto dal cognome; per l'Italia la provincia).
const PAESE_DI: Array<[string, string, string]> = [
  ['Müller', 'GERMANIA', 'DE'], ['Schneider', 'GERMANIA', 'DE'], ['Smith', 'REGNO UNITO', 'GB'],
  ['Johnson', 'STATI UNITI', 'US'], ['Dubois', 'FRANCIA', 'FR'], ['Martin', 'FRANCIA', 'FR'],
  ['García', 'SPAGNA', 'ES'], ['Fernández', 'SPAGNA', 'ES'], ['Tanaka', 'GIAPPONE', 'JP'], ['O’Brien', 'IRLANDA', 'IE'],
]
const PROVINCE_IT = ['RM', 'MI', 'NA', 'TO', 'PA', 'CT', 'FI', 'BO', 'BA', 'VE']
const isoDi = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function righeDemo(dataIso: string): RigaNazione[] {
  const m = new Map<string, RigaNazione>()
  pmsAttivo().prenotazioni.filter((x) => x.stato !== 'noshow').forEach((x) => {
    const presente = x.checkIn <= dataIso && dataIso < x.checkOut
    const arriva = x.checkIn === dataIso
    const parte = x.checkOut === dataIso
    if (!presente && !arriva && !parte) return
    x.ospiti.forEach((o) => {
      const estero = PAESE_DI.find(([c]) => o.nome.startsWith(c + ' '))
      const nazione = estero ? estero[1] : 'ITALIA'
      const provincia = estero ? '/' : PROVINCE_IT[(o.nome.charCodeAt(0) + o.nome.length) % PROVINCE_IT.length]
      const k = `${nazione}|${provincia}`
      const r = m.get(k) ?? { id: m.size + 1, nazione, iso2: estero ? estero[2] : 'IT', provincia, presenze: 0, arrivi: 0, partenze: 0 }
      if (presente) r.presenze += 1
      if (arriva) r.arrivi += 1
      if (parte) r.partenze += 1
      m.set(k, r)
    })
  })
  return Array.from(m.values()).sort((a, b) => b.presenze - a.presenze)
}

function flagEmoji(iso2?: string): string {
  if (!iso2 || iso2.length !== 2) return '🏳️'
  const A = 0x1F1E6
  const a = 'A'.charCodeAt(0)
  const c1 = String.fromCodePoint(A + (iso2.toUpperCase().charCodeAt(0) - a))
  const c2 = String.fromCodePoint(A + (iso2.toUpperCase().charCodeAt(1) - a))
  return c1 + c2
}

export default function RilevamentoPresenze({ navigate }: { navigate: (p: string) => void }) {
  // Struttura selezionata in alto; giorno = oggi, periodo = mese precedente.
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()
  const versionePms = usePmsStore((st) => st.versione)
  const [data, setData] = useState(() => isoDi(new Date()))
  const [periodoDa, setPeriodoDa] = useState(() => { const d = new Date(); return isoDi(new Date(d.getFullYear(), d.getMonth() - 1, 1)) })
  const [periodoA,  setPeriodoA]  = useState(() => { const d = new Date(); return isoDi(new Date(d.getFullYear(), d.getMonth(), 0)) })
  const [items, setItems] = useState<RigaNazione[]>(() => righeDemo(isoDi(new Date())))
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
      .then((d) => { if (!cancelled) setItems(d?.length ? d : righeDemo(data)) })
      .catch(() => { if (!cancelled) setItems(righeDemo(data)) })
    return () => { cancelled = true }
  }, [struttura, data, periodoDa, periodoA, versionePms])

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
      <PageHead title="Rilevamento presenze" subtitle="Report dei dati aggregati per nazionalità e delle presenze registrate" />

      <div className="flex items-end gap-4 mb-5 flex-wrap">
        <div className="w-56">
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)} options={opzioniStrutture} />
        </div>
        <div className="w-44">
          <DatePickerField name="data" label="Data" value={data} onChange={(e) => setData(e.target.value)} />
        </div>

        <div className="rilev-presenze__bar-right ml-auto flex items-end gap-3 flex-wrap">
          <button className="sib-btn sib-btn--icon" title="Esporta in Excel" aria-label="Esporta in Excel" onClick={esportaXls}>
            <i className="fa-regular fa-file-xls" />
          </button>

          {/* Esporta XML: scelta intervallo da popover */}
          <div className="relative">
            <button className="sib-btn sib-btn--icon" title="Esporta in XML" aria-label="Esporta in XML" onClick={() => setXmlOpen((o) => !o)}>
              <i className="fa-regular fa-file-code" />
            </button>
            {xmlOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setXmlOpen(false)} />
                <div className="rilev-presenze__xml-pop">
                  <div className="rilev-presenze__xml-title">
                    <i className="fa-regular fa-file-code" /> Esporta XML
                  </div>
                  <SelectField name="xmlInterval" label="Intervallo di giorni" value={xmlInterval}
                    onChange={(e) => setXmlInterval(e.target.value)} options={INTERVALLI_XML} />
                  <button type="button" className="sib-btn sib-btn--primary w-full" onClick={esportaXml}>
                    <i className="fa-regular fa-download" /> Esporta XML
                  </button>
                </div>
              </>
            )}
          </div>
          <DateRangeField nameFrom="periodoDa" nameTo="periodoA" label="Periodo" valueFrom={periodoDa} valueTo={periodoA} onChangeFrom={(e) => setPeriodoDa(e.target.value)} onChangeTo={(e) => setPeriodoA(e.target.value)} />
          <button className="sib-btn sib-btn--icon" title="Scarica report">
            <i className="fa-regular fa-download" />
          </button>
          <button className="sib-btn sib-btn--icon" title="Invia per email">
            <i className="fa-regular fa-envelope" />
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
