import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField } from '../../../core/components/form'
import { exportTableToXls, exportElementToPdf } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import './CabinaControllo.sass'

/**
 * Cabina di controllo — conto economico di gestione. Per ogni periodo (mese o
 * trimestre/anno totale) si vedono 4 valori: LY (anno precedente), Budget,
 * Actual e Scostamento. Consultabile a trimestri (3 mesi) o per l'intero anno
 * (12 mesi con slider). La prima colonna (voci) resta sempre fissa.
 */

const ANNI = ['2024', '2025', '2026', '2027']
const STRUTTURE = ['Hotel Tutorial', 'Grim’s Hotel', 'Hotel Azzurro Mare', 'Hotel Archimede', 'Hotel LUX', 'Hotel Lazio']
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

const INTERVALLI = [
  { id: 'Q1', label: 'Quarter 1', months: [0, 1, 2] },
  { id: 'Q2', label: 'Quarter 2', months: [3, 4, 5] },
  { id: 'Q3', label: 'Quarter 3', months: [6, 7, 8] },
  { id: 'Q4', label: 'Quarter 4', months: [9, 10, 11] },
  { id: 'Y',  label: 'Year',      months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
]

// Stagionalità tipica di una struttura ricettiva (bassa d'inverno, alta d'estate)
const SEASON = [0.58, 0.60, 0.74, 0.90, 1.06, 1.28, 1.50, 1.55, 1.16, 0.94, 0.68, 0.82]

type Serie = { ly: number[]; budget: number[]; actual: number[] }
type Dataset = Record<string, Serie>

const round100 = (n: number) => Math.round(n / 100) * 100

function buildData(anno: string): Dataset {
  const yf = 1 + (Number(anno) - 2025) * 0.04
  const mk = (budget: number[]): Serie => ({
    budget,
    ly:     budget.map((b, m) => round100(b * (0.90 + ((m * 5) % 7) / 100))),
    actual: budget.map((b, m) => round100(b * (1 + (((m * 7 + 3) % 11) - 5) / 100))),
  })
  const venditeB  = SEASON.map(s => round100(90000 * s * yf))
  const proventiB = venditeB.map(v => round100(v * 0.06))
  const cvB       = venditeB.map(v => round100(v * 0.32))
  const cfB       = SEASON.map(() => round100(38000 * yf))

  const vendite = mk(venditeB), proventi = mk(proventiB), cv = mk(cvB), cf = mk(cfB)
  const comb = (a: Serie, b: Serie, op: (x: number, y: number) => number): Serie => ({
    ly:     a.ly.map((x, i) => op(x, b.ly[i])),
    budget: a.budget.map((x, i) => op(x, b.budget[i])),
    actual: a.actual.map((x, i) => op(x, b.actual[i])),
  })
  const totRic   = comb(vendite, proventi, (x, y) => x + y)
  const totCosti = comb(cv, cf, (x, y) => x + y)
  const mol      = comb(totRic, totCosti, (x, y) => x - y)
  return { vendite, proventi, totRic, cv, cf, totCosti, mol }
}

type Polarity = 'pos' | 'neg'
interface RowCfg { key: string; label: string; totale?: boolean; polarity: Polarity }
interface SectionCfg { title: string; variant: 'ricavi' | 'costi' | 'margine'; rows: RowCfg[] }

const SEZIONI: SectionCfg[] = [
  { title: 'Valore della produzione', variant: 'ricavi', rows: [
    { key: 'vendite',  label: 'Ricavi delle vendite e delle prestazioni', polarity: 'pos' },
    { key: 'proventi', label: 'Ricavi e proventi diversi',                polarity: 'pos' },
    { key: 'totRic',   label: 'Totale Ricavi', totale: true,              polarity: 'pos' },
  ] },
  { title: 'Costi della produzione', variant: 'costi', rows: [
    { key: 'cv',       label: 'Costi Variabili', polarity: 'neg' },
    { key: 'cf',       label: 'Costi Fissi',     polarity: 'neg' },
    { key: 'totCosti', label: 'Totale Costi', totale: true, polarity: 'neg' },
  ] },
  { title: 'Margine operativo', variant: 'margine', rows: [
    { key: 'mol', label: 'MOL — Margine operativo lordo', totale: true, polarity: 'pos' },
  ] },
]

function fmtEuro(v: number): string {
  const sign = v < 0 ? '-' : ''
  return `${sign}${Math.abs(v).toLocaleString('it-IT')} €`
}

interface Col { label: string; months: number[]; totale?: boolean }

function colonne(ivId: string): Col[] {
  if (ivId === 'Y') {
    return [
      ...MESI.map((_, m) => ({ label: MESI[m], months: [m] })),
      { label: 'Year', months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], totale: true },
    ]
  }
  const iv = INTERVALLI.find(i => i.id === ivId) ?? INTERVALLI[0]
  return [
    ...iv.months.map(m => ({ label: MESI[m], months: [m] })),
    { label: 'Totale', months: iv.months, totale: true },
  ]
}

export default function CabinaControllo({ navigate }: { navigate: (p: string) => void }) {
  const [anno, setAnno] = useState('2026')
  const [struttura, setStruttura] = useState('Hotel Tutorial')
  const [intervallo, setIntervallo] = useState('Q1')

  const data = useMemo(() => buildData(anno), [anno])
  const cols = useMemo(() => colonne(intervallo), [intervallo])

  const agg = (key: string, months: number[]) => {
    const s = data[key]
    const ly     = months.reduce((a, m) => a + s.ly[m], 0)
    const budget = months.reduce((a, m) => a + s.budget[m], 0)
    const actual = months.reduce((a, m) => a + s.actual[m], 0)
    return { ly, budget, actual, scost: actual - budget }
  }

  const periodoLabel = INTERVALLI.find(i => i.id === intervallo)?.label ?? ''

  // ── Export PDF / Excel ───────────────────────────────────────────────
  const tableRef = useRef<HTMLTableElement>(null)
  function buildExport() {
    const header = ['Voce']
    cols.forEach(c => header.push(`${c.label} LY`, `${c.label} Budget`, `${c.label} Actual`, `${c.label} Scost.`))
    const rows: (string | number)[][] = []
    SEZIONI.forEach(sez => {
      rows.push([sez.title.toUpperCase()])
      sez.rows.forEach(r => {
        const row: (string | number)[] = [r.label]
        cols.forEach(c => {
          const a = agg(r.key, c.months)
          row.push(a.ly, a.budget, a.actual, a.scost)
        })
        rows.push(row)
      })
    })
    return { header, rows }
  }
  function exportXls() {
    const { header, rows } = buildExport()
    exportTableToXls(`cabina-controllo-${anno}-${intervallo}.xls`, header, rows, `Cabina di controllo — ${periodoLabel} ${anno} · ${struttura}`)
  }
  function exportPdf() {
    exportElementToPdf(tableRef.current, `cabina-controllo-${anno}-${intervallo}.pdf`, `Cabina di controllo — ${periodoLabel} ${anno} · ${struttura}`)
  }

  // ── Slider orizzontale (per l'anno): prima colonna sempre fissa ──────────
  const wrapRef = useRef<HTMLDivElement>(null)
  const [nav, setNav] = useState({ prev: false, next: false })
  const updateNav = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    setNav({ prev: el.scrollLeft > 4, next: el.scrollLeft < el.scrollWidth - el.clientWidth - 4 })
  }, [])
  useEffect(() => {
    updateNav()
    window.addEventListener('resize', updateNav)
    return () => window.removeEventListener('resize', updateNav)
  }, [cols, updateNav])
  const scrollX = (dir: number) => {
    const el = wrapRef.current
    if (el) el.scrollBy({ left: dir * Math.max(360, el.clientWidth * 0.7), behavior: 'smooth' })
  }

  return (
    <div className="cabina">
      <PageHead title="Cabina di controllo" subtitle="Conto economico di gestione: LY · Budget · Actual · Scostamento, per trimestre o intero anno" />

      {/* Toolbar */}
      <div className="cabina__toolbar">
        <div className="cabina__filters">
          <SelectField name="anno" label="Anno" value={anno} onChange={e => setAnno(e.target.value)} options={ANNI.map(a => ({ value: a, label: a }))} className="w-24" />
          <SelectField name="intervallo" label="Periodo" value={intervallo} onChange={e => setIntervallo(e.target.value)} options={INTERVALLI.map(i => ({ value: i.id, label: i.label }))} className="w-36" />
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={e => setStruttura(e.target.value)} options={STRUTTURE.map(s => ({ value: s, label: s }))} className="w-56" />
        </div>
        <div className="cabina__actions">
          <Tooltip text="Esporta PDF"><button className="sib-btn sib-btn--icon" aria-label="Esporta PDF" onClick={exportPdf}><i className="fa-light fa-file-pdf" /></button></Tooltip>
          <Tooltip text="Esporta Excel"><button className="sib-btn sib-btn--icon" aria-label="Esporta Excel" onClick={exportXls}><i className="fa-light fa-file-excel" /></button></Tooltip>
        </div>
      </div>

      {/* Conto economico — per ogni periodo: LY / Budget / Actual / Scostamento.
          Prima colonna (voci) sempre fissa; mesi scorrevoli con lo slider. */}
      <div className="cabina__timeline">
        {nav.prev && (
          <button type="button" className="cabina__nav cabina__nav--prev" onClick={() => scrollX(-1)} aria-label="Mesi precedenti"><i className="fa-solid fa-chevron-left" /></button>
        )}
        {nav.next && (
          <button type="button" className="cabina__nav cabina__nav--next" onClick={() => scrollX(1)} aria-label="Mesi successivi"><i className="fa-solid fa-chevron-right" /></button>
        )}
        <div className="sib-table-wrap cabina__wrap" ref={wrapRef} onScroll={updateNav}>
          <table className="sib-table cabina__pl" ref={tableRef}>
            <thead>
              <tr>
                <th className="cabina__pl-voce cabina__pl-voce--head">Anno {anno}</th>
                {cols.map(c => (
                  <th key={c.label} className={`cabina__colhead ${c.totale ? 'cabina__col-tot' : ''}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEZIONI.map(sez => (
                <React.Fragment key={sez.variant}>
                  <tr className="cabina__section">
                    <td className={`cabina__pl-voce cabina__section-cell cabina__section-cell--${sez.variant}`}>{sez.title}</td>
                    <td colSpan={cols.length} className={`cabina__section-cell cabina__section-cell--${sez.variant}`} />
                  </tr>
                  {sez.rows.map(r => (
                    <tr key={r.key} className={`cabina__row cabina__row--${sez.variant} ${r.totale ? 'cabina__row--totale' : ''}`}>
                      <td className="cabina__pl-voce">{r.label}</td>
                      {cols.map(c => {
                        const a = agg(r.key, c.months)
                        const tone = a.scost === 0 ? 'neutral' : (r.polarity === 'pos' ? a.scost >= 0 : a.scost <= 0) ? 'pos' : 'neg'
                        return (
                          <td key={c.label} className={`cabina__cell ${c.totale ? 'cabina__col-tot' : ''}`}>
                            <div className="cabina__metric"><span className="cabina__metric-lbl">LY</span><span className="cabina__metric-val cabina__metric-val--ly">{fmtEuro(a.ly)}</span></div>
                            <div className="cabina__metric"><span className="cabina__metric-lbl">Budget</span><span className="cabina__metric-val">{fmtEuro(a.budget)}</span></div>
                            <div className="cabina__metric"><span className="cabina__metric-lbl">Actual</span><span className="cabina__metric-val cabina__metric-val--actual">{fmtEuro(a.actual)}</span></div>
                            <div className="cabina__metric"><span className="cabina__metric-lbl">Scost.</span>
                              <span className={`cabina__metric-val cabina__scost cabina__scost--${tone}`}>
                                {tone !== 'neutral' && <i className={`fa-solid fa-caret-${a.scost >= 0 ? 'up' : 'down'}`} />}
                                {fmtEuro(a.scost)}
                              </span>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
