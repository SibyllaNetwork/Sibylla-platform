import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { SelectField, RadioGroup } from '../../../core/components/form'
import './BudgetComplessivo.sass'

/**
 * Budget complessivo — pianificazione strategica del conto economico, per voce
 * e per mese (vista annuale, 12 mesi). I mesi già trascorsi sono in sola
 * lettura; i mesi futuri sono editabili. Totali e MOL sono calcolati.
 * Prima colonna fissa + slider in stile Cabina di controllo.
 */

const ANNI = ['2024', '2025', '2026', '2027']
const STRUTTURE = ['Hotel Tutorial', 'Grim’s Hotel', 'Hotel Azzurro Mare', 'Hotel Archimede', 'Hotel LUX', 'Hotel Lazio']
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const SCENARI = ['Scenario base', 'Scenario ottimistico', 'Scenario prudenziale']
const MODI = [{ value: 'Diretto', label: 'Diretto' }, { value: 'Simulato', label: 'Simulato' }]

type Inputs = Record<'vendite' | 'proventi' | 'fisso' | 'variabile', number[]>
const ZERO12 = (): number[] => Array(12).fill(0)
const blankInputs = (): Inputs => ({ vendite: ZERO12(), proventi: ZERO12(), fisso: ZERO12(), variabile: ZERO12() })

interface RowCfg { key: string; label: string; input?: boolean; totale?: boolean }
interface SectionCfg { title: string; variant: 'ricavi' | 'costi'; rows: RowCfg[] }

const SEZIONI: SectionCfg[] = [
  { title: 'Valore della produzione', variant: 'ricavi', rows: [
    { key: 'vendite',  label: 'Ricavi delle vendite e delle prestazioni', input: true },
    { key: 'proventi', label: 'Ricavi e proventi diversi',                input: true },
    { key: 'totRic',   label: 'Totale ricavi', totale: true },
  ] },
  { title: 'Costi della produzione', variant: 'costi', rows: [
    { key: 'fisso',     label: 'Costo Fisso',     input: true },
    { key: 'variabile', label: 'Costo Variabile', input: true },
    { key: 'totCosti',  label: 'Totale costi', totale: true },
  ] },
]

function fmtEuro(v: number): string {
  return `${v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export default function BudgetComplessivo({ navigate }: { navigate: (p: string) => void }) {
  const [anno, setAnno] = useState('2026')
  const [struttura, setStruttura] = useState('Grim’s Hotel')
  const [modo, setModo] = useState<'Diretto' | 'Simulato'>('Diretto')
  const [scenario, setScenario] = useState('')
  const [vals, setVals] = useState<Inputs>(blankInputs)

  useEffect(() => { setVals(blankInputs()) }, [anno, struttura, modo])

  // Mesi già trascorsi (read-only) in base all'anno selezionato
  const now = new Date()
  const curMonth = Number(anno) < now.getFullYear() ? 12
    : Number(anno) > now.getFullYear() ? -1
    : now.getMonth()
  const isPast = (m: number) => m < curMonth

  const monthVal = useCallback((key: string, m: number): number => {
    switch (key) {
      case 'totRic':   return vals.vendite[m] + vals.proventi[m]
      case 'totCosti': return vals.fisso[m] + vals.variabile[m]
      case 'mol':      return (vals.vendite[m] + vals.proventi[m]) - (vals.fisso[m] + vals.variabile[m])
      default:         return (vals as any)[key]?.[m] ?? 0
    }
  }, [vals])

  // ── Slider (12 mesi): prima colonna sempre fissa ─────────────────────
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
  }, [updateNav])
  const scrollX = (dir: number) => {
    const el = wrapRef.current
    if (el) el.scrollBy({ left: dir * Math.max(360, el.clientWidth * 0.7), behavior: 'smooth' })
  }

  const months = useMemo(() => MESI.map((_, m) => m), [])

  // Totale di riga: somma dei 12 mesi (colonna "Totale" dopo i mesi)
  const rowTotal = useCallback(
    (key: string): number => months.reduce((s, m) => s + monthVal(key, m), 0),
    [months, monthVal],
  )

  const renderRow = (r: RowCfg, variant: 'ricavi' | 'costi' | 'margine') => (
    <tr key={r.key} className={`bc__row bc__row--${variant} ${r.totale ? 'bc__row--totale' : ''}`}>
      <td className="bc__voce">{r.label}</td>
      {months.map(m => {
        // Valori a sola lettura; i mesi già trascorsi sono sbiaditi
        const pastCls = isPast(m) ? 'bc__cell--past' : ''
        return <td key={m} className={`bc__num bc__cell ${pastCls}`}>{fmtEuro(monthVal(r.key, m))}</td>
      })}
      <td className="bc__num bc__tot">{fmtEuro(rowTotal(r.key))}</td>
    </tr>
  )

  return (
    <div className="bc">
      <PageHead title="Budget complessivo" subtitle="Pianificazione strategica suddivisa per le diverse voci dei ricavi e dei costi" />

      {/* Toolbar (stile screen: controlli compatti) */}
      <div className="bc__toolbar">
        <div className="bc__filters">
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={e => setStruttura(e.target.value)} options={STRUTTURE.map(s => ({ value: s, label: s }))} className="w-56" />
          <RadioGroup name="modo" label="Modalità" value={modo} onChange={v => setModo(v as 'Diretto' | 'Simulato')} options={MODI} />
          {modo === 'Simulato' && (
            <SelectField name="scenario" label="Scenario" value={scenario} onChange={e => setScenario(e.target.value)} placeholder="Seleziona Scenario" options={SCENARI.map(s => ({ value: s, label: s }))} className="w-52" />
          )}
          <SelectField name="anno" label="Anno" value={anno} onChange={e => setAnno(e.target.value)} options={ANNI.map(a => ({ value: a, label: a }))} className="w-24" />
        </div>
        <div className="bc__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('cabina-controllo')}>
            <i className="fa-light fa-magnifying-glass-chart" /> Cabina di controllo
          </button>
        </div>
      </div>

      {/* Tabella annuale — prima colonna fissa, mesi scorrevoli con lo slider */}
      <div className="bc__timeline">
        {nav.prev && (
          <button type="button" className="bc__nav bc__nav--prev" onClick={() => scrollX(-1)} aria-label="Mesi precedenti"><i className="fa-solid fa-chevron-left" /></button>
        )}
        {nav.next && (
          <button type="button" className="bc__nav bc__nav--next" onClick={() => scrollX(1)} aria-label="Mesi successivi"><i className="fa-solid fa-chevron-right" /></button>
        )}
        <div className="sib-table-wrap bc__wrap" ref={wrapRef} onScroll={updateNav}>
          <table className="sib-table bc__pl">
            <thead>
              <tr>
                <th className="bc__voce bc__voce--head">{anno}</th>
                {months.map(m => (
                  <th key={m} className={`bc__num bc__colhead ${isPast(m) ? 'bc__colhead--past' : ''}`}>{MESI[m]}</th>
                ))}
                <th className="bc__num bc__colhead bc__tot bc__tot--head">Totale</th>
              </tr>
            </thead>
            <tbody>
              {SEZIONI.map(sez => (
                <React.Fragment key={sez.variant}>
                  <tr className="bc__section">
                    <td className={`bc__voce bc__section-cell bc__section-cell--${sez.variant}`}>{sez.title}</td>
                    <td colSpan={months.length + 1} className={`bc__section-cell bc__section-cell--${sez.variant}`} />
                  </tr>
                  {sez.rows.map(r => renderRow(r, sez.variant))}
                </React.Fragment>
              ))}
              {renderRow({ key: 'mol', label: 'Margine Operativo Lordo', totale: true }, 'margine')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
