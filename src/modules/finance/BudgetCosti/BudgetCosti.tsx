import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField, RadioGroup } from '../../../core/components/form'
import './BudgetCosti.sass'

const STRUTTURE = ['Gruppo Raeli', 'Hotel Tutorial', 'Hotel Azzurro Mare', 'Hotel Lux']
const ANNI = ['2024', '2025', '2026', '2027']
const COSTI_OPTS = [
  { value: 'totali',    label: 'Costi totali' },
  { value: 'fissi',     label: 'Costi fissi' },
  { value: 'variabili', label: 'Costi variabili' },
]
type CostType = 'totali' | 'fissi' | 'variabili'

const MESI = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC']

// Costi anno precedente (Costi totali) — base per le derivazioni fissi/variabili
const PREV_TOTALI = [
  1119503.35, 986251.04, 1120213.35, 1110521.59, 1140913.81, 1147795.13,
  33223.93, 24537.85, 22015.88, 22627.09, 21897.18, 22627.09,
]
const DELTA_DEFAULT = [5, 4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4]

function prevFor(t: CostType): number[] {
  if (t === 'fissi')     return PREV_TOTALI.map(v => Math.round(v * 0.6 * 100) / 100)
  if (t === 'variabili') return PREV_TOTALI.map(v => Math.round(v * 0.4 * 100) / 100)
  return PREV_TOTALI
}

function fmtEuro(v: number): string {
  return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default function BudgetCosti({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura] = useState('Gruppo Raeli')
  const [anno, setAnno]           = useState('2026')
  const [costType, setCostType]   = useState<CostType>('totali')
  const [deltas, setDeltas]       = useState<number[]>(DELTA_DEFAULT.slice())
  const [actuals, setActuals]     = useState<number[]>(Array(12).fill(0))

  const prev = useMemo(() => prevFor(costType), [costType])

  // Mesi passati dell'anno selezionato (per evidenziazione + dato atteso)
  const now = new Date()
  const isPast = (i: number) => {
    const y = Number(anno)
    return y < now.getFullYear() || (y === now.getFullYear() && i < now.getMonth())
  }

  // Previsione attesa = anno precedente × (1 + Δ%)
  const previsione = useMemo(
    () => prev.map((p, i) => p * (1 + deltas[i] / 100)),
    [prev, deltas],
  )
  // Δ% anno corrente = (actual − prev) / prev
  const deltaCorrente = (i: number): number | null =>
    actuals[i] > 0 && prev[i] > 0 ? ((actuals[i] - prev[i]) / prev[i]) * 100 : null

  const tot = useMemo(() => {
    const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
    const prevTot = sum(prev)
    const prevsTot = sum(previsione)
    const actTot = sum(actuals)
    return {
      prev: prevTot,
      previsione: prevsTot,
      actual: actTot,
      deltaCorr: actTot > 0 && prevTot > 0 ? ((actTot - prevTot) / prevTot) * 100 : 0,
    }
  }, [prev, previsione, actuals])

  const setDelta = (i: number, v: number) =>
    setDeltas(prev => prev.map((d, j) => (j === i ? v : d)))
  const setActual = (i: number, v: number) =>
    setActuals(prev => prev.map((d, j) => (j === i ? v : d)))

  function ripristina() {
    setDeltas(DELTA_DEFAULT.slice())
    setActuals(Array(12).fill(0))
  }

  return (
    <div className="budget-costi">
      <PageHead
        title="Budget dei costi"
        subtitle="Controllo di gestione su piano mensile per monitorare le spese, confrontare i dati storici, analizzare le previsioni e verificare l'andamento dell'anno corrente"
      />

      {/* ── Toolbar: filtri (sx) + azioni (dx) ────────────────────────── */}
      <div className="budget-costi__toolbar">
        <div className="budget-costi__filters">
          <SelectField
            name="struttura" label="Strutture"
            value={struttura} onChange={e => setStruttura(e.target.value)}
            options={STRUTTURE.map(s => ({ value: s, label: s }))}
            className="budget-costi__struttura"
          />
          <RadioGroup
            name="costType" label="Costi"
            options={COSTI_OPTS}
            value={costType}
            onChange={v => setCostType(v as CostType)}
          />
          <SelectField
            name="anno" label="Anno"
            value={anno} onChange={e => setAnno(e.target.value)}
            options={ANNI.map(a => ({ value: a, label: a }))}
            className="budget-costi__anno"
          />
        </div>

        <div className="budget-costi__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={ripristina}>
            <i className="fa-regular fa-eraser" /> Ripristina
          </button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('cabina-controllo')}>
            <i className="fa-regular fa-magnifying-glass-chart" /> Cabina di controllo
          </button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('budget-complessivo')}>
            <i className="fa-regular fa-sack-dollar" /> Budget complessivo
          </button>
        </div>
      </div>

      {/* ── Tabella piano mensile ─────────────────────────────────────── */}
      <div className="sib-table-wrap">
        <table className="sib-table budget-costi__table">
          <thead>
            <tr className="budget-costi__group-row">
              <th className="budget-costi__group-mese" />
              <th className="budget-costi__group">Anno Precedente</th>
              <th className="budget-costi__group">Variazioni vs LY</th>
              <th className="budget-costi__group">Previsione Attesa</th>
              <th className="budget-costi__group budget-costi__group--current" colSpan={2}>Anno corrente</th>
            </tr>
            <tr className="budget-costi__sub-row">
              <th>Mese</th>
              <th className="budget-costi__num">Costi totali</th>
              <th className="budget-costi__num">Δ% Costi</th>
              <th className="budget-costi__num">Costi totali</th>
              <th className="budget-costi__num budget-costi__col--current">Costi totali</th>
              <th className="budget-costi__num budget-costi__col--current">Δ% Costi</th>
            </tr>
          </thead>
          <tbody>
            {MESI.map((m, i) => {
              const past = isPast(i)
              const dc = deltaCorrente(i)
              return (
                <tr key={m} className={past ? 'budget-costi__row budget-costi__row--past' : 'budget-costi__row'}>
                  <td>
                    <span className={`budget-costi__cal${past ? ' budget-costi__cal--past' : ''}`}>{m}</span>
                  </td>
                  <td className="budget-costi__num budget-costi__prev">{fmtEuro(prev[i])}</td>
                  <td className="budget-costi__num">
                    <span className="budget-costi__delta-input">
                      <input
                        type="number" step={1}
                        value={deltas[i]}
                        onChange={e => setDelta(i, Number(e.target.value) || 0)}
                        aria-label={`Variazione ${m}`}
                      />
                      <em>%</em>
                    </span>
                  </td>
                  <td className="budget-costi__num budget-costi__prevision">{fmtEuro(previsione[i])}</td>
                  <td className="budget-costi__num budget-costi__col--current">
                    <span className="budget-costi__euro-input">
                      <input
                        type="number" step={0.01} min={0}
                        value={actuals[i] || ''}
                        placeholder="0,00"
                        onChange={e => setActual(i, Number(e.target.value) || 0)}
                        aria-label={`Costi anno corrente ${m}`}
                      />
                      <em>€</em>
                      {past && (
                        <Tooltip text="Mese chiuso: inserire i costi effettivi consuntivati">
                          <i className="fa-solid fa-circle-info budget-costi__info" />
                        </Tooltip>
                      )}
                    </span>
                  </td>
                  <td className="budget-costi__num budget-costi__col--current">
                    {dc === null ? <span className="sib-cell--muted">--%</span> : `${dc.toFixed(2).replace('.', ',')} %`}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="budget-costi__total-row">
              <td>Totale</td>
              <td className="budget-costi__num">{fmtEuro(tot.prev)}</td>
              <td className="budget-costi__num sib-cell--muted">---</td>
              <td className="budget-costi__num">{fmtEuro(tot.previsione)}</td>
              <td className="budget-costi__num budget-costi__col--current">{fmtEuro(tot.actual)}</td>
              <td className="budget-costi__num budget-costi__col--current">
                {tot.deltaCorr.toFixed(2).replace('.', ',')} %
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
