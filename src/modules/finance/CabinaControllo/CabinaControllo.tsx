import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import { SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './CabinaControllo.sass'

/**
 * Cabina di controllo — replica `Views/Budget/CabinaControllo.cshtml`.
 * BE: `BudgetController.GetCabinaControllo` → catch-all
 * `/Sibylla/budget/GetCabinaControllo`.
 */

const ANNI = ['2024', '2025', '2026', '2027']
const PERIODI = ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4', 'Year']
const STRUTTURE = ['Hotel Tutorial', 'Grim’s Hotel', 'Hotel Azzurro Mare', 'Hotel Archimede', 'Hotel LUX', 'Hotel Lazio']

const MESI = ['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO', 'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE']

interface CellData { ly?: number | null; budget?: number | null; actual?: number | null; scostamento?: number | null }
type RowData = Record<number, CellData> // monthIndex (0-11) -> CellData

interface RowDef {
  key: string
  label: string
  type: 'voce' | 'totale'
}

interface SectionDef {
  key: string
  title: string
  variant: 'ricavi' | 'costi' | 'margine'
  rows: RowDef[]
}

const SEZIONI: SectionDef[] = [
  {
    key: 'valore', title: 'VALORE DELLA PRODUZIONE', variant: 'ricavi',
    rows: [
      { key: 'ricavi_vendite',  label: 'Ricavi delle vendite e delle prestazioni', type: 'voce' },
      { key: 'ricavi_diversi',  label: 'Ricavi e proventi diversi',                type: 'voce' },
      { key: 'tot_ricavi',      label: 'Totale Ricavi',                            type: 'totale' },
    ],
  },
  {
    key: 'costi', title: 'COSTI DELLA PRODUZIONE', variant: 'costi',
    rows: [
      { key: 'costi_variabili', label: 'Costi Variabili', type: 'voce' },
      { key: 'costi_fissi',     label: 'Costi Fissi',     type: 'voce' },
      { key: 'tot_costi',       label: 'Totale Costi',    type: 'totale' },
    ],
  },
  {
    key: 'margine', title: 'MARGINE OPERATIVO', variant: 'margine',
    rows: [
      { key: 'mol', label: 'MOL', type: 'voce' },
    ],
  },
]

function periodMonths(periodo: string): number[] {
  switch (periodo) {
    case 'Quarter 1': return [0, 1, 2]
    case 'Quarter 2': return [3, 4, 5]
    case 'Quarter 3': return [6, 7, 8]
    case 'Quarter 4': return [9, 10, 11]
    default: return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  }
}

function buildEmptyData(): Record<string, RowData> {
  const data: Record<string, RowData> = {}
  for (const sez of SEZIONI) {
    for (const r of sez.rows) {
      data[r.key] = {}
      for (let m = 0; m < 12; m++) data[r.key][m] = { ly: 0, budget: 0, actual: 0, scostamento: null }
    }
  }
  // Lascio una riga "Ricavi e proventi diversi" con cell vuote per matchare lo screenshot
  for (let m = 0; m < 12; m++) data['ricavi_diversi'][m] = { ly: null, budget: null, actual: null, scostamento: null }
  return data
}

function fmtEuro(v: number | null | undefined): string {
  if (v === null || v === undefined) return '--'
  return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default function CabinaControllo({ navigate }: { navigate: (p: string) => void }) {
  const [anno, setAnno] = useState('2026')
  const [periodo, setPeriodo] = useState('Quarter 1')
  const [struttura, setStruttura] = useState('Hotel Tutorial')
  const [data, setData] = useState<Record<string, RowData>>(buildEmptyData())
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const months = useMemo(() => periodMonths(periodo), [periodo])

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Record<string, RowData>>('budget/GetCabinaControllo', {
      method: 'POST',
      body: { anno, periodo, struttura },
    })
      .then((d) => { if (!cancelled) { setData(d); setLoaded(true) } })
      .catch((err) => { if (!cancelled) { setError(err?.message ?? 'Errore'); setLoaded(true) } })
    return () => { cancelled = true }
  }, [anno, periodo, struttura])

  function shiftPeriod(dir: 1 | -1) {
    const idx = PERIODI.indexOf(periodo)
    const next = Math.min(Math.max(0, idx + dir), PERIODI.length - 1)
    setPeriodo(PERIODI[next])
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Cabina di controllo" subtitle="Bilancio sulle diverse voci dei ricavi e dei costi" />

      {error && loaded && (
        <AlertBanner type="warning">Backend non raggiungibile — mostro dati di esempio. ({error})</AlertBanner>
      )}

      {/* Toolbar */}
      <div className="flex items-end gap-3 mb-3 flex-wrap">
        <SelectField name="anno"    label=" " value={anno}    onChange={(e) => setAnno(e.target.value)}    options={ANNI.map((a) => ({ value: a, label: a }))}    className="w-24" />
        <SelectField name="periodo" label=" " value={periodo} onChange={(e) => setPeriodo(e.target.value)} options={PERIODI.map((p) => ({ value: p, label: p }))} className="w-32" />
        <button className="sib-btn sib-btn--icon" title="Esporta PDF">
          <i className="fa-duotone fa-file-pdf" />
        </button>
        <button className="sib-btn sib-btn--icon" title="Esporta XLS">
          <i className="fa-duotone fa-file-excel" />
        </button>
        <button className="sib-btn sib-btn--icon ml-auto" title="Periodo precedente" onClick={() => shiftPeriod(-1)}>
          <i className="fa-solid fa-chevrons-left" />
        </button>
        <button className="sib-btn sib-btn--icon" title="Periodo successivo" onClick={() => shiftPeriod(1)}>
          <i className="fa-solid fa-chevrons-right" />
        </button>
      </div>

      <div className="mb-4 max-w-xs">
        <SelectField name="struttura" label="Struttura" value={struttura} onChange={(e) => setStruttura(e.target.value)} options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
      </div>

      {/* Tabella */}
      <div className="sib-table-wrap">
        <table className="sib-table">
          <thead>
            {/* Riga mesi */}
            <tr>
              <th />
              {months.map((m) => (
                <th key={`m-${m}`} colSpan={4} className="text-center !text-[12px] !text-ink !bg-canvas border-l border-line">
                  {MESI[m]}
                </th>
              ))}
            </tr>
            {/* Riga sub-header LY/Budget/Actual/Scostamento */}
            <tr>
              <th />
              {months.flatMap((m) => (
                ['LY', 'Budget', 'Actual', 'Scostamento'].map((sub, i) => (
                  <th key={`s-${m}-${i}`} className={`text-center !font-semibold ${i === 0 ? 'border-l border-line' : ''}`}>
                    {sub}
                  </th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {SEZIONI.map((sez) => {
              return (
              <React.Fragment key={sez.key}>
                <tr>
                  <td colSpan={1 + months.length * 4} className={`!py-3 !font-bold !uppercase tracking-wide text-[12px] cabina__title cabina__title--${sez.variant}`}>
                    {sez.title}
                  </td>
                </tr>
                {sez.rows.map((r) => (
                  <tr key={r.key} className={`cabina__row cabina__row--${sez.variant} cabina__row--${r.type === 'totale' ? 'totale' : 'voce'}`}>
                    <td className={`text-right pr-4 ${r.type === 'totale' ? '!font-bold' : ''}`}>{r.label}</td>
                    {months.flatMap((m) => {
                      const cell = data[r.key]?.[m] ?? {}
                      return (
                        ['ly', 'budget', 'actual', 'scostamento'].map((field, i) => (
                          <td key={`${r.key}-${m}-${field}`} className={`text-center text-[12px] ${i === 0 ? 'border-l border-line' : ''} ${r.type === 'totale' ? '!font-semibold' : ''}`}>
                            {fmtEuro((cell as any)[field])}
                          </td>
                        ))
                      )
                    })}
                  </tr>
                ))}
              </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
