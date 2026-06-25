import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { SelectField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import './SalesOverview.sass'

interface TrendPoint { date: string; revenue: number; revenueLY: number; forecast: number | null }
interface SegmentBar { label: string; total: number; totalLY: number; budget: number }
interface BookingDay { label: string; ty: number; ly: number; delta: number }

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  dataDa: string
  dataA: string
  revenue: number
  revenueSDLY: number
  forecast: number
  forecastSDLY: number
  vsBudgetPct: number
  budget: number
  bookings: BookingDay[]
  grandTotal: number
  grandTotalLY: number
  trend: TrendPoint[]
  segmenti: SegmentBar[]
  occupazione: number
  occupazioneLY: number
  occupazioneSpark: number[]
  adr: number
  adrLY: number
  adrSpark: number[]
}

function genTrend(): TrendPoint[] {
  const days = 30
  const points: TrendPoint[] = []
  const start = new Date('2026-04-01')
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i)
    const x = i / days
    const revenue   = 35000 + 25000 * Math.sin(x * Math.PI * 4) + (Math.random() - 0.5) * 6000
    const revenueLY = 55000 + 12000 * Math.sin(x * Math.PI * 3 + 1) + (Math.random() - 0.5) * 5000
    const forecast  = i >= days - 1 ? 50000 : null
    const dateLabel = `${String(d.getDate()).padStart(2, '0')}.04.2026`
    points.push({ date: dateLabel, revenue: Math.max(20000, revenue), revenueLY: Math.max(20000, revenueLY), forecast })
  }
  return points
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  dataDa: '2026-04-01',
  dataA: '2026-04-30',
  revenue: 1510000,
  revenueSDLY: 1430000,
  forecast: 69660,
  forecastSDLY: 0,
  vsBudgetPct: 2.31,
  budget: 1470000,
  bookings: [
    { label: 'IERI',    ty: 411, ly: 329, delta: 82 },
    { label: 'OGGI',    ty: 558, ly: 294, delta: 264 },
    { label: 'DOMANI',  ty: 0,   ly: 0,   delta: 0 },
  ],
  grandTotal: 1580000,
  grandTotalLY: 1430000,
  trend: genTrend(),
  segmenti: [
    { label: 'B2B',       total: 90000,   totalLY: 0,       budget: 100000 },
    { label: 'B2C',       total: 700000,  totalLY: 850000,  budget: 720000 },
    { label: 'Dirette',   total: 80000,   totalLY: 100000,  budget: 90000 },
    { label: 'Corporate', total: 50000,   totalLY: 60000,   budget: 70000 },
    { label: 'Gruppi',    total: 600000,  totalLY: 720000,  budget: 750000 },
  ],
  occupazione: 70.79,
  occupazioneLY: 59.41,
  occupazioneSpark: [55, 58, 60, 62, 60, 64, 70, 70.79],
  adr: 123.16,
  adrLY: 121.55,
  adrSpark: [124, 122, 121, 122, 123, 122, 123, 123.16],
}

function fmtMln(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2).replace('.', ',')}M €`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(2).replace('.', ',')}K €`
  return `${v.toFixed(2).replace('.', ',')} €`
}

function fmtPct(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} %`
}

export default function SalesOverview({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('sales/GetOverview', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: data.dataDa, a: data.dataA },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="sales-overview">
      <BtnBack />
      <PageHeader
        title="Sales overview"
        subtitle="Analisi performance commerciale, ricavi e marginalità"
      />

      <div className="sales-overview__filters">
        <SelectField
          name="struttura"
          label="Struttura"
          className="sales-overview__field"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={[
            { value: '', label: 'Tutte le strutture' },
            ...data.Strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
        />
        <div className="sales-overview__field-raw">
          <label>Intervallo</label>
          <div className="sales-overview__date-range">
            <input type="date" className="sib-input" value={data.dataDa} onChange={(e) => setData({ ...data, dataDa: e.target.value })} />
            <span>-</span>
            <input type="date" className="sib-input" value={data.dataA} onChange={(e) => setData({ ...data, dataA: e.target.value })} />
          </div>
        </div>
        <button type="button" className="sib-btn sib-btn--primary sales-overview__visualizza">
          <i className="fa-light fa-chart-line" /> Visualizza
        </button>
        <button type="button" className="sib-btn sib-btn--icon sales-overview__info" title="Info" aria-label="Info">
          <i className="fa-light fa-circle-info" />
        </button>
      </div>

      {/* ─── Stats row ───────────────────────────────────────────────────────── */}
      <div className="sales-overview__stats">
        <div className="sales-overview__stat-card">
          <i className="fa-light fa-receipt sales-overview__stat-ico" />
          <div className="sales-overview__stat-body">
            <div className="sales-overview__stat-label">Revenue</div>
            <div className="sales-overview__stat-value">{fmtMln(data.revenue)}</div>
            <div className="sales-overview__stat-foot">SDLY: {fmtMln(data.revenueSDLY)}</div>
          </div>
        </div>

        <div className="sales-overview__stat-card">
          <div className="sales-overview__stat-body">
            <div className="sales-overview__stat-label">Forecast</div>
            <div className="sales-overview__stat-value">{fmtMln(data.forecast)}</div>
            <div className="sales-overview__stat-foot">SDLY: {fmtMln(data.forecastSDLY)}</div>
          </div>
        </div>

        <div className="sales-overview__stat-card">
          <div className="sales-overview__stat-body">
            <div className="sales-overview__stat-label">Grand total vs budget</div>
            <div className={'sales-overview__stat-value ' + (data.vsBudgetPct >= 0 ? 'sales-overview__stat-value--pos' : 'sales-overview__stat-value--neg')}>
              {fmtPct(data.vsBudgetPct)}
            </div>
            <div className="sales-overview__stat-foot">Budget {fmtMln(data.budget)}</div>
          </div>
        </div>

        <div className="sales-overview__bookings">
          <div className="sales-overview__bookings-tag">BUDGET ANALYSIS</div>
          <table className="sales-overview__bookings-table">
            <thead>
              <tr>
                <th />
                <th>Bookings TY</th>
                <th>Bookings LY</th>
                <th>Δ Bookings</th>
              </tr>
            </thead>
            <tbody>
              {data.bookings.map((b) => (
                <tr key={b.label} className={b.label === 'OGGI' ? 'sales-overview__bookings-row--today' : ''}>
                  <td>{b.label}</td>
                  <td>{b.ty}</td>
                  <td>{b.ly}</td>
                  <td>{b.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Trend chart ────────────────────────────────────────────────────── */}
      <div className="sales-overview__trend">
        <div className="sales-overview__trend-side">
          <div className="sales-overview__trend-value">{fmtMln(data.grandTotal)}</div>
          <div className="sales-overview__trend-label">Grand total</div>
          <div className="sales-overview__trend-foot">LY: {fmtMln(data.grandTotalLY)}</div>
        </div>
        <div className="sales-overview__trend-body">
          <div className="sales-overview__trend-legend">
            <span><span className="sales-overview__dot sales-overview__dot--ly" /> Revenue LY</span>
            <span><span className="sales-overview__dot sales-overview__dot--rev" /> Revenue</span>
            <span><span className="sales-overview__dot sales-overview__dot--forecast" /> Forecast</span>
          </div>
          <TrendChart points={data.trend} />
        </div>
        <div className="sales-overview__trend-tags">
          <div className="sales-overview__side-tag">FORECAST ANALYSIS</div>
          <div className="sales-overview__side-tag sales-overview__side-tag--alt">MONTHLY ANALYSIS</div>
        </div>
      </div>

      {/* ─── Bottom row ─────────────────────────────────────────────────────── */}
      <div className="sales-overview__bottom">
        <div className="sales-overview__segments-card">
          <div className="sales-overview__segments-icon">
            <i className="fa-light fa-people-group" />
          </div>
          <div className="sales-overview__segments-body">
            <SegmentBars bars={data.segmenti} />
            <div className="sales-overview__segments-legend">
              <span><span className="sales-overview__sw sales-overview__sw--total" /> Grand Total</span>
              <span><span className="sales-overview__sw sales-overview__sw--ly" /> Grand Total LY</span>
              <span><span className="sales-overview__sw sales-overview__sw--budget" /> Budget</span>
            </div>
          </div>
        </div>

        <div className="sales-overview__kpi-list">
          <div className="sales-overview__kpi-card">
            <div className="sales-overview__kpi-icon"><i className="fa-light fa-bed-front" /></div>
            <div className="sales-overview__kpi-text">
              <div className="sales-overview__kpi-label">Occupazione</div>
              <div className="sales-overview__kpi-value">{fmtPct(data.occupazione)}</div>
              <div className="sales-overview__kpi-foot">LY: {fmtPct(data.occupazioneLY)}</div>
            </div>
            <Sparkline values={data.occupazioneSpark} color="#3FA34D" />
          </div>

          <div className="sales-overview__kpi-card">
            <div className="sales-overview__kpi-icon"><i className="fa-light fa-hotel" /></div>
            <div className="sales-overview__kpi-text">
              <div className="sales-overview__kpi-label">Average daily rate</div>
              <div className="sales-overview__kpi-value">{data.adr.toFixed(2).replace('.', ',')} €</div>
              <div className="sales-overview__kpi-foot">LY: {data.adrLY.toFixed(2).replace('.', ',')} €</div>
            </div>
            <Sparkline values={data.adrSpark} color="#1F4E5F" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TREND CHART (3 series, with forecast dashed tail) ───────────────────────
function TrendChart({ points }: { points: TrendPoint[] }) {
  const W = 1300
  const H = 320
  const PAD_L = 60
  const PAD_R = 20
  const PAD_T = 16
  const PAD_B = 36
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const ticks = 6
  const allY = points.flatMap((p) => [p.revenue, p.revenueLY, p.forecast ?? 0])
  const maxY = Math.max(...allY, 1)
  const yPos = (v: number) => PAD_T + innerH - (v / maxY) * innerH
  const xPos = (i: number) => PAD_L + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)

  const linePath = (key: 'revenue' | 'revenueLY') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(p[key])}`).join(' ')

  // Forecast: only points where it's not null, connecting from last revenue
  const forecastPts: { x: number; y: number }[] = []
  const lastRevenueIdx = points.length - 1
  if (points[lastRevenueIdx]) {
    forecastPts.push({ x: xPos(lastRevenueIdx), y: yPos(points[lastRevenueIdx].revenue) })
    points.forEach((p, i) => {
      if (p.forecast !== null && i === lastRevenueIdx) {
        forecastPts.push({ x: xPos(i) + 30, y: yPos(p.forecast!) })
      }
    })
  }

  const xLabelStep = Math.max(1, Math.floor(points.length / 15))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="sales-overview__svg sales-overview__svg--trend">
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (maxY / ticks) * i
        const y = yPos(v)
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#E0E7EE" strokeWidth={1} />
            <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#888">
              {v >= 1000 ? `${Math.round(v / 1000)}K €` : `${Math.round(v)} €`}
            </text>
          </g>
        )
      })}

      {/* Revenue LY */}
      <path d={linePath('revenueLY')} fill="none" stroke="#A0A4AA" strokeWidth={2} />
      {points.map((p, i) => <circle key={`ly-${i}`} cx={xPos(i)} cy={yPos(p.revenueLY)} r={2.5} fill="#A0A4AA" />)}

      {/* Revenue */}
      <path d={linePath('revenue')} fill="none" stroke="#1F4E5F" strokeWidth={2.2} />
      {points.map((p, i) => <circle key={`r-${i}`} cx={xPos(i)} cy={yPos(p.revenue)} r={2.8} fill="#1F4E5F" />)}

      {/* Forecast (dashed tail from last point) */}
      {forecastPts.length > 1 && (
        <path d={forecastPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} fill="none" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 4" />
      )}

      {/* X labels */}
      {points.map((p, i) => {
        if (i % xLabelStep !== 0) return null
        return (
          <text key={i} x={xPos(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#888">{p.date}</text>
        )
      })}
    </svg>
  )
}

// ─── SEGMENT BARS (Grand Total + LY + Budget bullet) ─────────────────────────
function SegmentBars({ bars }: { bars: SegmentBar[] }) {
  const max = bars.reduce((m, b) => Math.max(m, b.total, b.totalLY, b.budget), 0) || 1

  return (
    <div className="sales-overview__seg-bars">
      {bars.map((b, i) => {
        const totalPct = (b.total / max) * 100
        const lyPct = (b.totalLY / max) * 100
        const budgetPct = (b.budget / max) * 100
        return (
          <div className="sales-overview__seg-row" key={i}>
            <span className="sales-overview__seg-label">{b.label}</span>
            <div className="sales-overview__seg-track">
              <div className="sales-overview__seg-bar sales-overview__seg-bar--total" style={{ '--seg-bar-w': `${totalPct}%` } as React.CSSProperties} />
              <div className="sales-overview__seg-bar sales-overview__seg-bar--ly"    style={{ '--seg-bar-w': `${lyPct}%` } as React.CSSProperties} />
              <div className="sales-overview__seg-bullet" style={{ '--seg-bullet-left': `${budgetPct}%` } as React.CSSProperties} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── SPARKLINE ───────────────────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 220
  const H = 60
  const PAD = 6
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const xs = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2)
  const ys = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2)
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(v)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sales-overview__sparkline" width={W} height={H}>
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={xs(i)} cy={ys(v)} r={2.5} fill={color} />
      ))}
    </svg>
  )
}
