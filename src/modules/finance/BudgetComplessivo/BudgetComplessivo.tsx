import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { SelectField, RadioGroup } from '../../../core/components/form'
import './BudgetComplessivo.sass'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import { useScenariBudgetStore } from '../../../store/useScenariBudgetStore'

/**
 * Budget complessivo — pianificazione strategica del conto economico, per voce
 * e per mese (vista annuale, 12 mesi). I mesi già trascorsi sono in sola
 * lettura; i mesi futuri sono editabili. Totali e MOL sono calcolati.
 * Tutti i 12 mesi e il Totale stanno nella pagina, senza scroll orizzontale:
 * tabella a larghezze fisse, importi interi (unità in testata) e, sui
 * contenitori stretti, importi in migliaia con il valore completo nel tooltip.
 */

const ANNI = ['2024', '2025', '2026', '2027']
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

// Importi delle celle: interi con punto delle migliaia (unità "€" in testata)
const INT = new Intl.NumberFormat('it-IT', { useGrouping: 'always', maximumFractionDigits: 0 } as unknown as Intl.NumberFormatOptions)
const fmtInt = (v: number) => `${v < 0 ? '−' : ''}${INT.format(Math.abs(Math.round(v)))}`
const fmtK = (v: number) => (Math.abs(v) >= 1000 ? `${v < 0 ? '−' : ''}${INT.format(Math.round(Math.abs(v) / 1000))}k` : fmtInt(v))

/** Importo che passa in migliaia quando la colonna è stretta (container query). */
function Importo({ v }: { v: number }) {
  return (
    <>
      <span className="bc__v-full">{fmtInt(v)}</span>
      <Tooltip text={fmtEuro(v)}><span className="bc__v-k">{fmtK(v)}</span></Tooltip>
    </>
  )
}

function fmtEuro(v: number): string {
  return `${v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export default function BudgetComplessivo({ navigate }: { navigate: (p: string) => void }) {
  const [anno, setAnno] = useState('2026')
  // Parte dalla struttura selezionata in alto (strutture del cliente corrente).
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()
  const [modo, setModo] = useState<'Diretto' | 'Simulato'>('Diretto')
  const [scenario, setScenario] = useState('')
  const [vals, setVals] = useState<Inputs>(blankInputs)

  // Scenari portati da altre pagine (BEP analysis → "Usa come budget complessivo")
  const { scenari: scenariSalvati, daAprire, apri } = useScenariBudgetStore()
  const opzioniScenario = useMemo(() => [
    ...SCENARI.map(s => ({ value: s, label: s })),
    ...scenariSalvati.map(s => ({ value: s.id, label: `${s.nome} (${s.anno})` })),
  ], [scenariSalvati])
  const scenarioSalvato = scenariSalvati.find(s => s.id === scenario)

  // All'arrivo dalla BEP analysis: apre lo scenario appena salvato
  useEffect(() => {
    const s = daAprire ? scenariSalvati.find(x => x.id === daAprire) : undefined
    if (!s) return
    setModo('Simulato')
    setAnno(String(s.anno))
    setScenario(s.id)
    apri(null)
  }, [daAprire, scenariSalvati, apri])

  useEffect(() => {
    setVals(modo === 'Simulato' && scenarioSalvato ? { ...scenarioSalvato.mesi } : blankInputs())
  }, [anno, struttura, modo, scenarioSalvato])

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

  const months = useMemo(() => MESI.map((_, m) => m), [])

  // Totale di riga: somma dei 12 mesi (colonna "Totale" dopo i mesi)
  const rowTotal = useCallback(
    (key: string): number => months.reduce((s, m) => s + monthVal(key, m), 0),
    [months, monthVal],
  )

  const renderRow = (r: RowCfg, variant: 'ricavi' | 'costi' | 'margine') => (
    <tr key={r.key} className={`bc__row bc__row--${variant} ${r.totale ? 'bc__row--totale' : ''}`}>
      <td className="bc__voce"><TruncatedText text={r.label} className="bc__voce-txt" /></td>
      {months.map(m => {
        // Valori a sola lettura; i mesi già trascorsi sono sbiaditi
        const pastCls = isPast(m) ? 'bc__cell--past' : ''
        return <td key={m} className={`bc__num bc__cell ${pastCls}`}><Importo v={monthVal(r.key, m)} /></td>
      })}
      <td className="bc__num bc__tot"><Importo v={rowTotal(r.key)} /></td>
    </tr>
  )

  return (
    <div className="bc">
      <PageHead title="Budget complessivo" subtitle="Pianificazione strategica suddivisa per le diverse voci dei ricavi e dei costi" />

      {/* Toolbar (stile screen: controlli compatti) */}
      <div className="bc__toolbar">
        <div className="bc__filters">
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={e => setStruttura(e.target.value)} options={opzioniStrutture} className="w-56" />
          <RadioGroup name="modo" label="Modalità" value={modo} onChange={v => setModo(v as 'Diretto' | 'Simulato')} options={MODI} />
          {modo === 'Simulato' && (
            <SelectField name="scenario" label="Scenario" value={scenario} onChange={e => setScenario(e.target.value)} placeholder="Seleziona Scenario" options={opzioniScenario} className="w-52" />
          )}
          <SelectField name="anno" label="Anno" value={anno} onChange={e => setAnno(e.target.value)} options={ANNI.map(a => ({ value: a, label: a }))} className="w-24" />
        </div>
        <div className="bc__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('cabina-controllo')}>
            <i className="fa-light fa-magnifying-glass-chart" /> Cabina di controllo
          </button>
        </div>
      </div>

      {modo === 'Simulato' && scenarioSalvato && (
        <p className="bc__scen-nota">
          <i className="fa-solid fa-flask" aria-hidden="true" />
          {scenarioSalvato.origine === 'simulatore' ? 'Scenario dal Simulatore di scenari' : 'Scenario dalla Break-even point analysis'} ({scenarioSalvato.struttura}):{' '}
          {scenarioSalvato.origine === 'simulatore' ? 'ricavi' : 'ricavi obiettivo'} <strong>{fmtEuro(scenarioSalvato.ricaviObiettivo)}</strong>,{' '}
          {scenarioSalvato.origine === 'simulatore' ? 'profitto' : 'margine obiettivo'} <strong>{fmtEuro(scenarioSalvato.margineObiettivo)}</strong>,
          ripartiti sui mesi con la stagionalità dell'anno.
          <button type="button" className="bc__scen-link" onClick={() => navigate(scenarioSalvato.origine === 'simulatore' ? 'simulatore' : 'break-even')}>
            {scenarioSalvato.origine === 'simulatore' ? 'Apri Simulatore di scenari' : 'Apri Break-even point analysis'} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </button>
        </p>
      )}

      {/* Tabella annuale: 12 mesi + Totale nella larghezza della pagina */}
      <div className="bc__timeline">
        <div className="sib-table-wrap bc__wrap">
          <table className="sib-table bc__pl">
            <colgroup>
              <col className="bc__col-voce" />
              {months.map(m => <col key={m} />)}
              <col className="bc__col-tot" />
            </colgroup>
            <thead>
              <tr>
                <th className="bc__voce bc__voce--head">
                  {anno}
                  <span className="bc__unit">Valori in €</span>
                </th>
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
