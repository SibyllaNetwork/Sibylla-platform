import React, { useEffect, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { apiFetchSibylla } from '../../../services/api'
import { Donut } from '../../sales/distribution/_charts/Donut'
import { SelectField } from '../../../core/components/form'
import './GuestRoomAnalysis.sass'

interface SeriePoint { date: string; ty: number; forecast: number | null; ly: number }

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  dataDa: string
  dataA: string
  cameraOccupateValore: number
  cameraOccupateB2B: number
  cameraOccupateDirette: number
  revPar: number
  revGuest: number
  ospitiValore: number
  ospitiB2B: number
  ospitiDirette: number
  trendCamera: SeriePoint[]
  trendOspiti: SeriePoint[]
}

function genTrend(scale: number): SeriePoint[] {
  const out: SeriePoint[] = []
  const start = new Date('2026-04-01')
  for (let i = 0; i < 30; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i)
    const date = `${String(d.getDate()).padStart(2, '0')}.04.2026`
    const x = i / 30
    out.push({
      date,
      ty: Math.max(0, Math.round(scale * (Math.sin(x * Math.PI * 4) + 1) + (Math.random() - 0.5) * scale * 0.2)),
      forecast: i === 29 ? Math.round(scale * 0.6) : null,
      ly: Math.max(0, Math.round(scale * 0.6 * (Math.sin(x * Math.PI * 4) + 1))),
    })
  }
  return out
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  dataDa: '2026-04-01',
  dataA: '2026-04-30',
  cameraOccupateValore: 287,
  cameraOccupateB2B: 1.05,
  cameraOccupateDirette: 98.95,
  revPar: 0.27,
  revGuest: 2.65,
  ospitiValore: 742,
  ospitiB2B: 0.81,
  ospitiDirette: 99.19,
  trendCamera: genTrend(15),
  trendOspiti: genTrend(50),
}

function fmtEuro(v: number): string {
  return `${v.toFixed(2).replace('.', ',')}€`
}

export default function GuestRoomAnalysis({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('operation/GetGuestRoomAnalysis', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: data.dataDa, a: data.dataA },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="grm-analysis">
      <PageHead
        title="Guests & rooms analysis"
        subtitle="Monitoraggio e analisi degli ospiti e dell'occupazione delle camere"
      />

      <div className="grm-analysis__filters">
        <SelectField
          className="grm-analysis__field grm-analysis__select"
          label="Struttura"
          name="struttura"
          value={data.StrutturaId ?? ''}
          options={[
            { value: '', label: 'Tutte le strutture' },
            ...data.Strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
        />
        <div className="grm-analysis__field-raw">
          <label>Seleziona intervallo</label>
          <div className="grm-analysis__date-range">
            <input type="date" className="sib-input" value={data.dataDa} onChange={(e) => setData({ ...data, dataDa: e.target.value })} />
            <span>-</span>
            <input type="date" className="sib-input" value={data.dataA} onChange={(e) => setData({ ...data, dataA: e.target.value })} />
          </div>
        </div>
        <button type="button" className="sib-btn sib-btn--primary grm-analysis__visualizza">
          <i className="fa-light fa-chart-line" /> Visualizza
        </button>
        <button type="button" className="sib-btn sib-btn--icon grm-analysis__info" title="Info" aria-label="Info">
          <i className="fa-regular fa-circle-info" />
        </button>
      </div>

      <div className="grm-analysis__layout">
        {/* ─── Sx: 2 donut ─────────────────────────────────────────────────── */}
        <div className="grm-analysis__col">
          <div className="grm-analysis__donut-block">
            <span className="grm-analysis__donut-label grm-analysis__donut-label--top">B2B: {data.cameraOccupateB2B.toFixed(2).replace('.', ',')}%</span>
            <Donut
              slices={[
                { label: 'B2B',     value: data.cameraOccupateB2B,     color: '#1F4E5F' },
                { label: 'Dirette', value: data.cameraOccupateDirette, color: '#3FA34D' },
              ]}
              centerLabel={<><i className="fa-light fa-bed-front grm-analysis__center-ico" /></> as any}
              centerValue={fmtEuro(data.cameraOccupateValore)}
              centerSubLabel="Camera occupate"
              size={250}
              thickness={36}
            />
            <span className="grm-analysis__donut-label grm-analysis__donut-label--bottom">Dirette: {data.cameraOccupateDirette.toFixed(2).replace('.', ',')}%</span>
          </div>

          <div className="grm-analysis__kpis">
            <div className="grm-analysis__kpi">
              <div className="grm-analysis__kpi-label">RevPar</div>
              <div className="grm-analysis__kpi-value">{fmtEuro(data.revPar)}</div>
            </div>
            <div className="grm-analysis__kpi">
              <div className="grm-analysis__kpi-label">RevGuest</div>
              <div className="grm-analysis__kpi-value">{fmtEuro(data.revGuest)}</div>
            </div>
          </div>

          <div className="grm-analysis__donut-block">
            <span className="grm-analysis__donut-label grm-analysis__donut-label--top">B2B: {data.ospitiB2B.toFixed(2).replace('.', ',')}%</span>
            <Donut
              slices={[
                { label: 'B2B',     value: data.ospitiB2B,     color: '#1F4E5F' },
                { label: 'Dirette', value: data.ospitiDirette, color: '#3FA34D' },
              ]}
              centerLabel={<><i className="fa-light fa-users grm-analysis__center-ico" /></> as any}
              centerValue={fmtEuro(data.ospitiValore)}
              centerSubLabel="Ospiti"
              size={250}
              thickness={36}
            />
            <span className="grm-analysis__donut-label grm-analysis__donut-label--bottom">Dirette: {data.ospitiDirette.toFixed(2).replace('.', ',')}%</span>
          </div>
        </div>

        {/* ─── Dx: 2 trend ─────────────────────────────────────────────────── */}
        <div className="grm-analysis__col grm-analysis__col--charts">
          <div className="grm-analysis__chart-card">
            <div className="grm-analysis__chart-head">
              <h3 className="grm-analysis__chart-title">Trend camera</h3>
              <button type="button" className="sib-btn sib-btn--primary sib-btn--sm grm-analysis__dettaglio">DETTAGLIO</button>
            </div>
            <div className="grm-analysis__chart-legend">
              <span><span className="grm-analysis__sw grm-analysis__sw--ty" /> Camere occupate</span>
              <span><span className="grm-analysis__sw grm-analysis__sw--forecast" /> Camere occupate (forecast)</span>
              <span><span className="grm-analysis__sw grm-analysis__sw--ly" /> Camere occupate LY</span>
            </div>
            <SmoothAreaChart points={data.trendCamera} />
          </div>

          <div className="grm-analysis__chart-card">
            <h3 className="grm-analysis__chart-title">Trend ospiti</h3>
            <div className="grm-analysis__chart-legend">
              <span><span className="grm-analysis__sw grm-analysis__sw--ty" /> Numero ospiti</span>
              <span><span className="grm-analysis__sw grm-analysis__sw--forecast" /> Numero ospiti (forecast)</span>
              <span><span className="grm-analysis__sw grm-analysis__sw--ly" /> Numero ospiti LY</span>
            </div>
            <SmoothAreaChart points={data.trendOspiti} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SMOOTH AREA CHART (TY area + forecast dot + LY line) ────────────────────
function SmoothAreaChart({ points }: { points: SeriePoint[] }) {
  const W = 800
  const H = 240
  const PAD_L = 50
  const PAD_R = 16
  const PAD_T = 16
  const PAD_B = 30
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const allY = points.flatMap((p) => [p.ty, p.ly, p.forecast ?? 0])
  const maxY = Math.max(...allY, 1) * 1.05
  const ticks = 4
  const yPos = (v: number) => PAD_T + innerH - (v / maxY) * innerH
  const xPos = (i: number) => PAD_L + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)

  const tyLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(p.ty)}`).join(' ')
  const tyArea = points.length > 0
    ? `${tyLine} L ${xPos(points.length - 1)} ${PAD_T + innerH} L ${xPos(0)} ${PAD_T + innerH} Z`
    : ''
  const lyLine = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(p.ly)}`).join(' ')

  const xLabelStep = Math.max(1, Math.floor(points.length / 5))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="grm-analysis__svg grm-analysis__svg--h240">
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (maxY / ticks) * i
        const y = yPos(v)
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#E0E7EE" strokeWidth={1} />
            <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#888">{Math.round(v)}</text>
          </g>
        )
      })}

      <path d={tyArea} fill="rgba(143, 184, 200, 0.35)" />
      <path d={tyLine} fill="none" stroke="#1F4E5F" strokeWidth={2} />
      <path d={lyLine} fill="none" stroke="#A0A4AA" strokeWidth={1.5} opacity={0.7} />

      {points.map((p, i) => <circle key={`ty-${i}`} cx={xPos(i)} cy={yPos(p.ty)} r={2.5} fill="#1F4E5F" />)}
      {points.map((p, i) =>
        p.forecast !== null
          ? <circle key={`f-${i}`} cx={xPos(i)} cy={yPos(p.forecast!)} r={3.5} fill="#F59E0B" />
          : null,
      )}

      {points.map((p, i) => {
        if (i % xLabelStep !== 0) return null
        return <text key={i} x={xPos(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#888">{p.date}</text>
      })}
    </svg>
  )
}
