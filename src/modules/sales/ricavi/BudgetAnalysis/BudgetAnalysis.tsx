import React, { useEffect, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { apiFetchSibylla } from '../../../../services/api'
import { DateRangeField } from '../../../../core/components/form'
import './BudgetAnalysis.sass'

type BudgetView = 'revenue' | 'cost' | 'profit'
type KpiView = 'revpar' | 'costpar' | 'gopar'

interface MonthData {
  label: string         // 'Apr', 'Mag'
  revenue: number
  costi: number
  profittoForecast: number  // box dashed
}

interface KpiPoint {
  label: string
  ty: number
  forecast: number
  ly: number
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  dataDa: string
  dataA: string
  budgetTotal: number
  kpiTotal: number
  budget: MonthData[]
  kpi: KpiPoint[]
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  dataDa: '2026-04-01',
  dataA: '2026-05-31',
  budgetTotal: 17265124.41,
  kpiTotal: 67.17,
  budget: [
    { label: 'Apr', revenue: 9700000, costi: 0, profittoForecast: 9000000 },
    { label: 'Mag', revenue: 7600000, costi: 0, profittoForecast: 7600000 },
  ],
  kpi: [
    { label: 'Apr', ty: 70, forecast: 70, ly: 63 },
    { label: 'Mag', ty: 95, forecast: 95, ly: 63 },
  ],
}

function fmtEuroTotal(v: number): string {
  // Italian format: 17.265.124,41 €
  const [int, dec] = v.toFixed(2).split('.')
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${withDots},${dec} €`
}

export default function BudgetAnalysis({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)
  const [budgetView, setBudgetView] = useState<BudgetView>('profit')
  const [kpiView, setKpiView] = useState<KpiView>('gopar')

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('budget/GetAnalysis', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: data.dataDa, a: data.dataA },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="budget-analysis">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Budget analysis"
        subtitle="Visualizza, monitora e analizza i budget per decisioni strategiche"
      />

      <div className="budget-analysis__filters">
        <div className="budget-analysis__field">
          <label>Struttura</label>
          <select
            className="sib-select budget-analysis__select"
            value={data.StrutturaId ?? ''}
            onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Tutte le strutture</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="budget-analysis__field">
          <DateRangeField
            nameFrom="dataDa"
            nameTo="dataA"
            label="Date"
            valueFrom={data.dataDa}
            valueTo={data.dataA}
            onChangeFrom={(e) => setData({ ...data, dataDa: e.target.value })}
            onChangeTo={(e) => setData({ ...data, dataA: e.target.value })}
          />
        </div>
        <button type="button" className="sib-btn sib-btn--primary budget-analysis__visualizza">
          <i className="fa-light fa-chart-line" /> Visualizza
        </button>
      </div>

      {/* ─── BUDGET PANEL ─────────────────────────────────────────────────── */}
      <div className="budget-analysis__panel">
        <div className="budget-analysis__panel-side">
          <div className="budget-analysis__total">{fmtEuroTotal(data.budgetTotal)}</div>
          <div className="budget-analysis__panel-label">Budget</div>
        </div>

        <div className="budget-analysis__panel-body">
          <div className="budget-analysis__tabs">
            {([
              { id: 'revenue', label: 'Revenue trend' },
              { id: 'cost',    label: 'Cost trend' },
              { id: 'profit',  label: 'Profit trend' },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                className={'budget-analysis__tab' + (budgetView === t.id ? ' budget-analysis__tab--on' : '')}
                onClick={() => setBudgetView(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="budget-analysis__legend">
            <span className="budget-analysis__legend-item"><span className="budget-analysis__sw budget-analysis__sw--revenue" /> Revenue</span>
            <span className="budget-analysis__legend-item"><span className="budget-analysis__sw budget-analysis__sw--costi" /> Costi</span>
            <span className="budget-analysis__legend-item"><span className="budget-analysis__sw budget-analysis__sw--dashed" /> Profitto</span>
            <span className="budget-analysis__legend-item"><span className="budget-analysis__sw budget-analysis__sw--line" /> Profit Line</span>
          </div>

          <BudgetChart data={data.budget} view={budgetView} />
        </div>
      </div>

      {/* ─── KPI PANEL ────────────────────────────────────────────────────── */}
      <div className="budget-analysis__panel">
        <div className="budget-analysis__panel-side">
          <div className="budget-analysis__total">{data.kpiTotal.toFixed(2).replace('.', ',')} €</div>
          <div className="budget-analysis__panel-label">KPI Trend</div>
        </div>

        <div className="budget-analysis__panel-body">
          <div className="budget-analysis__tabs">
            {([
              { id: 'revpar',  label: 'RevPar' },
              { id: 'costpar', label: 'CostPar' },
              { id: 'gopar',   label: 'GoPar' },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                className={'budget-analysis__tab' + (kpiView === t.id ? ' budget-analysis__tab--on' : '')}
                onClick={() => setKpiView(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="budget-analysis__legend">
            <span className="budget-analysis__legend-item"><span className="budget-analysis__dot budget-analysis__dot--ty" /> {kpiView.toUpperCase()} TY</span>
            <span className="budget-analysis__legend-item"><span className="budget-analysis__dot budget-analysis__dot--forecast" /> {kpiView.toUpperCase()} Forecast</span>
            <span className="budget-analysis__legend-item"><span className="budget-analysis__dot budget-analysis__dot--ly" /> {kpiView.toUpperCase()} LY</span>
          </div>

          <KpiChart data={data.kpi} />
        </div>
      </div>
    </div>
  )
}

// ─── BUDGET CHART (bars + dashed boxes + line) ───────────────────────────────
function BudgetChart({ data, view }: { data: MonthData[]; view: BudgetView }) {
  const W = 1100
  const H = 320
  const PAD_L = 70
  const PAD_R = 30
  const PAD_T = 16
  const PAD_B = 30
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const ticks = 5
  const allValues = data.flatMap((d) => [d.revenue, d.profittoForecast, d.costi]).filter(Boolean)
  const maxY = Math.max(...allValues, 1) * 1.05
  const yPos = (v: number) => PAD_T + innerH - (v / maxY) * innerH

  const barW = (innerW / data.length) * 0.32
  const profitBoxW = (innerW / data.length) * 0.34
  const slotW = innerW / data.length

  const showRevenue = view === 'revenue' || view === 'profit'
  const showCost    = view === 'cost'    || view === 'profit'
  const showProfit  = view === 'profit'

  // Profit Line points (revenue - cost)
  const profitPts = data.map((d, i) => ({
    x: PAD_L + slotW * i + slotW / 2,
    y: yPos(d.revenue - d.costi),
  }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="budget-analysis__svg budget-analysis__svg--budget">
      {/* Y grid */}
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (maxY / ticks) * i
        const y = yPos(v)
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#E0E7EE" strokeWidth={1} />
            <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#888">
              {Math.round(v).toLocaleString('it-IT')}
            </text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const slotX = PAD_L + slotW * i
        const barX = slotX + slotW / 2 - barW - 4
        const profitX = slotX + slotW / 2 + 4
        return (
          <g key={i}>
            {showRevenue && d.revenue > 0 && (
              <rect x={barX} y={yPos(d.revenue)} width={barW} height={H - PAD_B - yPos(d.revenue)} fill="#204769" />
            )}
            {showCost && d.costi > 0 && (
              <rect x={barX} y={yPos(d.costi)} width={barW} height={H - PAD_B - yPos(d.costi)} fill="#A22A2A" />
            )}
            {showProfit && d.profittoForecast > 0 && (
              <rect
                x={profitX}
                y={yPos(d.profittoForecast)}
                width={profitBoxW}
                height={H - PAD_B - yPos(d.profittoForecast)}
                fill="rgba(63, 163, 77, 0.10)"
                stroke="#3FA34D"
                strokeDasharray="6 4"
                strokeWidth={1.5}
              />
            )}
            <text x={slotX + slotW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#888">{d.label}</text>
          </g>
        )
      })}

      {showProfit && profitPts.length > 1 && (
        <>
          <path
            d={profitPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
            fill="none"
            stroke="#3FA34D"
            strokeWidth={2}
          />
          {profitPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#3FA34D" />)}
        </>
      )}
    </svg>
  )
}

// ─── KPI CHART (3 lines, dashed forecast) ────────────────────────────────────
function KpiChart({ data }: { data: KpiPoint[] }) {
  const W = 1100
  const H = 280
  const PAD_L = 60
  const PAD_R = 30
  const PAD_T = 16
  const PAD_B = 30
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const ticks = 5
  const allY = data.flatMap((d) => [d.ty, d.forecast, d.ly])
  const maxY = Math.max(...allY, 1) * 1.1
  const minY = Math.min(...allY, 0) * 0.95
  const range = maxY - minY || 1
  const yPos = (v: number) => PAD_T + innerH - ((v - minY) / range) * innerH
  const xPos = (i: number) => PAD_L + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)

  const path = (key: keyof Omit<KpiPoint, 'label'>) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(d[key])}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="budget-analysis__svg budget-analysis__svg--kpi">
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = minY + (range / ticks) * i
        const y = yPos(v)
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#E0E7EE" strokeWidth={1} />
            <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#888">{Math.round(v)}</text>
          </g>
        )
      })}

      {/* LY (gray) */}
      <path d={path('ly')} fill="none" stroke="#A0A4AA" strokeWidth={1.5} />
      {data.map((d, i) => <circle key={`ly-${i}`} cx={xPos(i)} cy={yPos(d.ly)} r={3} fill="#A0A4AA" />)}

      {/* Forecast (dashed orange) */}
      <path d={path('forecast')} fill="none" stroke="#F57D03" strokeWidth={2} strokeDasharray="6 4" />

      {/* TY (solid orange) */}
      {data.map((d, i) => <circle key={`ty-${i}`} cx={xPos(i)} cy={yPos(d.ty)} r={3.5} fill="#F57D03" />)}

      {data.map((d, i) => (
        <text key={`xl-${i}`} x={xPos(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#888">{d.label}</text>
      ))}
    </svg>
  )
}
