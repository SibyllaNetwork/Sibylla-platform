import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField, RadioGroup } from '../../../core/components/form'
import StimaCostiVariabiliModal, { MeseStima } from './StimaCostiVariabiliModal'
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
const GIORNI_MESE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

// Costi anno precedente (Costi totali) — base per le derivazioni fissi/variabili
const PREV_TOTALI = [
  1119503.35, 986251.04, 1120213.35, 1110521.59, 1140913.81, 1147795.13,
  33223.93, 24537.85, 22015.88, 22627.09, 21897.18, 22627.09,
]
const DELTA_DEFAULT = [5, 4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4]

// ── Suggerimento budget: driver della stima dei costi variabili ──────────────
// I costi variabili variano in funzione dell'occupazione: la stima nasce dal
// CostPor (costo per camera occupata) applicato alle camere occupate del mese.
const CAMERE_INVENTARIO = 120
const COSTPOR = 38.5
const OCCUPANCY_MESE = [42.5, 45.8, 52.4, 61.2, 68.7, 79.3, 88.6, 92.1, 74.5, 58.2, 46.9, 50.4]

function prevFor(t: CostType): number[] {
  if (t === 'fissi')     return PREV_TOTALI.map(v => Math.round(v * 0.6 * 100) / 100)
  if (t === 'variabili') return PREV_TOTALI.map(v => Math.round(v * 0.4 * 100) / 100)
  return PREV_TOTALI
}

function fmtEuro(v: number): string {
  return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function fmtPct(v: number): string {
  return v.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}

export default function BudgetCosti({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura] = useState('Gruppo Raeli')
  const [anno, setAnno]           = useState('2026')
  const [costType, setCostType]   = useState<CostType>('totali')
  const [deltas, setDeltas]       = useState<number[]>(DELTA_DEFAULT.slice())
  const [actuals, setActuals]     = useState<number[]>(Array(12).fill(0))
  // Toast "Suggerimento budget" (toggle dall'icona lampadina in toolbar)
  const [showSugg, setShowSugg]   = useState(true)
  const [showStima, setShowStima] = useState(false)

  const prev = useMemo(() => prevFor(costType), [costType])

  // Mesi passati dell'anno selezionato (per evidenziazione + dato atteso)
  const now = new Date()
  const isPast = (i: number) => {
    const y = Number(anno)
    return y < now.getFullYear() || (y === now.getFullYear() && i < now.getMonth())
  }

  // Budget = anno precedente × (1 + Δ%)
  const previsione = useMemo(
    () => prev.map((p, i) => p * (1 + deltas[i] / 100)),
    [prev, deltas],
  )
  // %CT vs BDG = (consuntivo − budget) / budget
  const deltaCorrente = (i: number): number | null =>
    actuals[i] > 0 && previsione[i] > 0 ? ((actuals[i] - previsione[i]) / previsione[i]) * 100 : null

  const tot = useMemo(() => {
    const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
    const prevTot = sum(prev)
    const prevsTot = sum(previsione)
    const actTot = sum(actuals)
    return {
      prev: prevTot,
      previsione: prevsTot,
      actual: actTot,
      deltaCorr: actTot > 0 && prevsTot > 0 ? ((actTot - prevsTot) / prevsTot) * 100 : 0,
    }
  }, [prev, previsione, actuals])

  // ── Stima dei costi variabili (toast + pop-up) ─────────────────────────────
  const stima = useMemo(() => {
    const mesi: MeseStima[] = MESI.map((m, i) => {
      const disponibili = CAMERE_INVENTARIO * GIORNI_MESE[i]
      const occupate = Math.round(disponibili * OCCUPANCY_MESE[i] / 100)
      return {
        mese: m,
        occupancy: OCCUPANCY_MESE[i],
        occupate,
        costiVariabili: Math.round(occupate * COSTPOR * 100) / 100,
        consolidato: isPast(i),
      }
    })
    const occupate = mesi.reduce((s, m) => s + m.occupate, 0)
    const disponibili = GIORNI_MESE.reduce((s, g) => s + g, 0) * CAMERE_INVENTARIO
    return {
      mesi,
      totale: mesi.reduce((s, m) => s + m.costiVariabili, 0),
      occupancyAttuale: disponibili ? (occupate / disponibili) * 100 : 0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anno])

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
            className="budget-costi__costi"
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
          <Tooltip text="Suggerimento budget">
            <button
              type="button"
              className={'sib-btn sib-btn--icon budget-costi__sugg-btn' + (showSugg ? ' is-active' : '')}
              aria-label="Suggerimento budget" aria-pressed={showSugg}
              onClick={() => setShowSugg(v => !v)}
            >
              <i className="fa-solid fa-lightbulb-on" />
            </button>
          </Tooltip>
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
            {/* Sopra-header: macro-aree, come nel Budget dei ricavi */}
            <tr className="budget-costi__super">
              <th rowSpan={2} className="budget-costi__mese-th">Mese</th>
              <th className="budget-costi__grp budget-costi__grp--prec budget-costi__gsep">Anno Precedente</th>
              <th className="budget-costi__grp budget-costi__grp--imp budget-costi__gsep">
                {costType === 'fissi' ? 'Impostazione Rapida' : 'Variazioni vs LY'}
              </th>
              <th className="budget-costi__grp budget-costi__grp--bdg budget-costi__gsep">Budget</th>
              <th colSpan={2} className="budget-costi__grp budget-costi__grp--corr budget-costi__gsep">Anno corrente</th>
            </tr>
            {/* Leader: intestazioni colonna */}
            <tr className="budget-costi__leader">
              <th className="budget-costi__gsep">Costi totali</th>
              <th className="budget-costi__gsep">% Costi</th>
              <th className="budget-costi__gsep">Costi totali</th>
              <th className="budget-costi__gsep">Costi totali</th>
              <th>%CT vs BDG</th>
            </tr>
          </thead>
          <tbody>
            {MESI.map((m, i) => {
              const past = isPast(i)
              const dc = deltaCorrente(i)
              return (
                <tr key={m} className={past ? 'budget-costi__row budget-costi__row--past' : 'budget-costi__row'}>
                  <td className="budget-costi__mese-cell">
                    <span className={'budget-costi__cal' + (past ? ' budget-costi__cal--past' : '')} aria-label={`${m} ${anno}`}>
                      <span className="budget-costi__cal-head">{anno}</span>
                      <span className="budget-costi__cal-day">{m}</span>
                    </span>
                  </td>
                  <td className="budget-costi__prev budget-costi__gsep">{fmtEuro(prev[i])}</td>
                  <td className="budget-costi__gsep">
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
                  <td className="budget-costi__prevision budget-costi__gsep">{fmtEuro(previsione[i])}</td>
                  <td className="budget-costi__gsep">
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
                  <td>
                    {dc === null ? <span className="sib-cell--muted">--%</span> : fmtPct(dc)}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="budget-costi__total-row">
              <td>Totale</td>
              <td className="budget-costi__gsep">{fmtEuro(tot.prev)}</td>
              <td className="sib-cell--muted budget-costi__gsep">---</td>
              <td className="budget-costi__gsep">{fmtEuro(tot.previsione)}</td>
              <td className="budget-costi__gsep">{fmtEuro(tot.actual)}</td>
              <td>{fmtPct(tot.deltaCorr)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Toast "Suggerimento budget" ───────────────────────────────── */}
      {showSugg && (
        <div className="budget-costi__sugg" role="status">
          <i className="fa-solid fa-lightbulb-on budget-costi__sugg-ico" />
          <div className="budget-costi__sugg-body">
            <div className="budget-costi__sugg-title">Suggerimento budget</div>
            <p className="budget-costi__sugg-text">
              In funzione di un'occupancy attuale del <strong>{fmtPct(stima.occupancyAttuale)}</strong> e
              di un CostPor di <strong>{fmtEuro(COSTPOR)}</strong>, la stima dei costi variabili è
              di <strong>{fmtEuro(stima.totale)}</strong>.
            </p>
            <p className="budget-costi__sugg-note">
              I costi variabili variano in funzione dell'occupazione.
            </p>
            <div className="budget-costi__sugg-actions">
              <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => setShowStima(true)}>
                <i className="fa-regular fa-chart-line" /> Maggiori info
              </button>
            </div>
          </div>
          <button type="button" className="budget-costi__sugg-close" aria-label="Chiudi suggerimento" onClick={() => setShowSugg(false)}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      <StimaCostiVariabiliModal
        open={showStima}
        onClose={() => setShowStima(false)}
        anno={anno}
        struttura={struttura}
        occupancyAttuale={stima.occupancyAttuale}
        costPor={COSTPOR}
        mesi={stima.mesi}
      />
    </div>
  )
}
