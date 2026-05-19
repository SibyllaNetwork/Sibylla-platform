import React, { useEffect, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { apiFetchSibylla } from '../../../../services/api'
import { HBars } from '../../distribution/_charts/HBars'
import './SegmentAnalysis.sass'

interface RankItem { label: string; value: number; color: string }
interface RevenueTrendPoint { date: string; values: Record<string, number> }

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  Segmenti: string[]
  SegmentoSel: string
  dataDa: string
  dataA: string
  losAgenzia: RankItem[]
  revenueNazione: RankItem[]
  trendSegmenti: RevenueTrendPoint[]
  losSegmento: RankItem[]
  averageLosTY: number
  averageLosLY: number
}

const SEG_COLORS: Record<string, string> = {
  'Dirette':   '#F59E0B',
  'Gruppi':    '#1F2E55',
  'B2C':       '#FBBF24',
  'Corporate': '#3FA34D',
  'B2B':       '#7A4FE0',
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  Segmenti: ['Tutti i segmenti'],
  SegmentoSel: 'Tutti i segmenti',
  dataDa: '2026-01-01',
  dataA: '2026-12-31',
  losAgenzia: [
    { label: 'Ovest Destination Italy', value: 3.00, color: '#D946C7' },
    { label: 'Nessuna',                 value: 2.79, color: '#A53FCF' },
    { label: 'Tour Operator Test',      value: 2.17, color: '#7A4FE0' },
    { label: 'Tour Del Mondo',          value: 2.00, color: '#5C5BD8' },
    { label: 'Nessuna',                 value: 1.60, color: '#3F7CD8' },
    { label: 'Ovest Destination Italy', value: 1.00, color: '#3FA8D8' },
  ],
  revenueNazione: [
    { label: 'SAINT LUCIA',           value: 3500.00, color: '#5550E8' },
    { label: "SAO TOME' E PRINCIPE",  value: 2008.00, color: '#5060E8' },
    { label: 'SAHARA SPAGNOLO',       value: 1716.67, color: '#3FA8D8' },
    { label: 'SEYCHELLES',            value: 1713.68, color: '#3FCFD8' },
    { label: 'PANAMA',                value: 1416.96, color: '#3FCFA0' },
    { label: 'TUVALU',                value: 1406.02, color: '#3FCF6F' },
    { label: 'S. VINCENT E GRENADINE', value: 1380.54, color: '#5FCF3F' },
    { label: 'HONDURAS',              value: 1290.78, color: '#7FCF3F' },
    { label: 'SUDAN',                 value: 1272.00, color: '#9FCF3F' },
  ],
  trendSegmenti: generateFallbackTrend(),
  losSegmento: [
    { label: 'Dirette',   value: 2.74, color: '#3FA34D' },
    { label: 'B2C',       value: 2.71, color: '#F59E0B' },
    { label: 'Gruppi',    value: 2.68, color: '#FBD737' },
    { label: 'B2B',       value: 2.00, color: '#1F4E5F' },
    { label: 'Corporate', value: 1.00, color: '#A53FCF' },
  ],
  averageLosTY: 2.23,
  averageLosLY: 1.31,
}

function generateFallbackTrend(): RevenueTrendPoint[] {
  // Genera ~50 punti tra 2026-01-01 e 2026-08-01 con pattern realistico
  const segments = ['Dirette', 'Gruppi', 'B2C', 'Corporate', 'B2B']
  const start = new Date('2026-01-01')
  const points: RevenueTrendPoint[] = []
  for (let i = 0; i < 50; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i * 4)
    const values: Record<string, number> = {}
    segments.forEach((s) => { values[s] = 0 })
    // Dirette: pattern wavy
    const x = i / 50
    values['Dirette'] = Math.max(0, 1500 + 1200 * Math.sin(x * Math.PI * 6) + (Math.random() - 0.5) * 800)
    if (i === 22) values['Dirette'] = 4500
    if (i > 30) values['Gruppi'] = 2700 + Math.random() * 500
    return points.length > 50 ? points : (points.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      values,
    }), points)
  }
  return points
}

function fmtNum(v: number): string {
  return v.toFixed(2).replace('.', ',')
}

export default function SegmentAnalysis({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('budget/GetSegmentAnalysis', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, segmento: data.SegmentoSel, da: data.dataDa, a: data.dataA },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="segment-analysis">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Segment analysis"
        subtitle="Analisi delle performance per cluster e segmenti di mercato"
      />

      <div className="segment-analysis__filters">
        <div className="segment-analysis__field">
          <label>Struttura</label>
          <select className="sib-select segment-analysis__select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Tutte le strutture</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="segment-analysis__field">
          <label>Segmenti</label>
          <select className="sib-select segment-analysis__select" value={data.SegmentoSel} onChange={(e) => setData({ ...data, SegmentoSel: e.target.value })}>
            {data.Segmenti.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="segment-analysis__field">
          <label>Intervallo</label>
          <div className="segment-analysis__date-range">
            <input type="date" className="sib-input" aria-label="Data da" value={data.dataDa} onChange={(e) => setData({ ...data, dataDa: e.target.value })} />
            <span>-</span>
            <input type="date" className="sib-input" aria-label="Data a" value={data.dataA} onChange={(e) => setData({ ...data, dataA: e.target.value })} />
          </div>
        </div>
        <button type="button" className="sib-btn sib-btn--primary segment-analysis__visualizza">
          <i className="fa-light fa-chart-line" /> Visualizza
        </button>
      </div>

      <div className="segment-analysis__cards">
        <div className="segment-analysis__card">
          <h3 className="segment-analysis__card-title">Length of stay per agenzia</h3>
          <HBars
            bars={data.losAgenzia.map((b) => ({ ...b, format: (v) => fmtNum(v) }))}
            labelWidth={170}
            showAxis ticks={7}
          />
        </div>

        <div className="segment-analysis__card segment-analysis__card--globe">
          <Globe />
        </div>

        <div className="segment-analysis__card">
          <h3 className="segment-analysis__card-title">Revenue per nazione</h3>
          <HBars
            bars={data.revenueNazione.map((b) => ({ ...b, format: (v) => `${fmtNum(v)} €` }))}
            labelWidth={180}
          />
        </div>
      </div>

      <div className="segment-analysis__trend">
        <div className="segment-analysis__side-tags">
          <div className="segment-analysis__side-tag">TABELLA TREND</div>
          <div className="segment-analysis__side-tag segment-analysis__side-tag--alt">GRAFICO TREND</div>
        </div>

        <div className="segment-analysis__trend-body">
          <h3 className="segment-analysis__card-title">Revenue trend per segmento</h3>
          <div className="segment-analysis__legend">
            {Object.entries(SEG_COLORS).map(([seg, color]) => (
              <span key={seg} className="segment-analysis__legend-item">
                <span className="segment-analysis__legend-dot" style={{ background: color }} />
                {seg}
              </span>
            ))}
          </div>
          <MultiLineChart points={data.trendSegmenti} colors={SEG_COLORS} />
        </div>

        <div className="segment-analysis__trend-side">
          <h3 className="segment-analysis__card-title">Length of stay per segmento</h3>
          <HBars
            bars={data.losSegmento.map((b) => ({ ...b, format: (v) => fmtNum(v) }))}
            labelWidth={90}
          />
          <div className="segment-analysis__avg">
            <span>Average length of stay</span>
            <strong>TY: {fmtNum(data.averageLosTY)}</strong>
            <strong>LY: {fmtNum(data.averageLosLY)}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── GLOBE (decorative SVG) ──────────────────────────────────────────────────
function Globe() {
  return (
    <svg viewBox="0 0 200 200" className="segment-analysis__globe" aria-hidden="true">
      <circle cx="100" cy="100" r="92" fill="#F0F4F8" />
      <ellipse cx="100" cy="100" rx="92" ry="40" fill="none" stroke="#CFD9E3" strokeWidth="0.7" />
      <ellipse cx="100" cy="100" rx="92" ry="80" fill="none" stroke="#CFD9E3" strokeWidth="0.7" />
      <line x1="8" y1="100" x2="192" y2="100" stroke="#CFD9E3" strokeWidth="0.7" />
      <line x1="100" y1="8" x2="100" y2="192" stroke="#CFD9E3" strokeWidth="0.7" />
      {/* Continenti stilizzati */}
      <path d="M 70 60 Q 90 55 110 70 Q 120 90 100 100 Q 80 105 70 90 Z" fill="#9FB3C8" />
      <path d="M 110 100 Q 130 95 145 110 Q 150 130 130 145 Q 110 145 105 125 Z" fill="#9FB3C8" />
      <path d="M 60 110 Q 75 115 80 140 Q 70 150 55 145 Q 45 130 50 115 Z" fill="#9FB3C8" />
      <circle cx="100" cy="100" r="92" fill="none" stroke="#B0BFCC" strokeWidth="1" />
    </svg>
  )
}

// ─── MULTI-LINE CHART ────────────────────────────────────────────────────────
function MultiLineChart({ points, colors }: { points: RevenueTrendPoint[]; colors: Record<string, string> }) {
  const W = 1100
  const H = 280
  const PAD_L = 60
  const PAD_R = 30
  const PAD_T = 16
  const PAD_B = 36
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  if (points.length === 0) {
    return <div className="segment-analysis__empty">Nessun dato disponibile</div>
  }

  const segments = Object.keys(colors)
  const allValues = points.flatMap((p) => segments.map((s) => p.values[s] ?? 0))
  const maxY = Math.max(...allValues, 1) * 1.05
  const yPos = (v: number) => PAD_T + innerH - (v / maxY) * innerH
  const xPos = (i: number) => PAD_L + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)

  const ticks = 5

  // X labels: ~8 distribuiti
  const xLabelStep = Math.max(1, Math.floor(points.length / 8))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="segment-analysis__svg" style={{ height: H }}>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (maxY / ticks) * i
        const y = yPos(v)
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#E0E7EE" strokeWidth={1} />
            <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#888">
              {v >= 1000 ? `${Math.round(v / 1000)}k €` : `${Math.round(v)} €`}
            </text>
          </g>
        )
      })}

      {segments.map((seg) => {
        const seriePts = points.map((p, i) => ({ x: xPos(i), y: yPos(p.values[seg] ?? 0) }))
        const path = seriePts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
        return (
          <g key={seg}>
            <path d={path} fill="none" stroke={colors[seg]} strokeWidth={1.5} opacity={0.85} />
            {seriePts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.2} fill={colors[seg]} />
            ))}
          </g>
        )
      })}

      {points.map((p, i) => {
        if (i % xLabelStep !== 0) return null
        return (
          <text key={i} x={xPos(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#888">
            {p.date}
          </text>
        )
      })}
    </svg>
  )
}
