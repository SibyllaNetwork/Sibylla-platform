import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { apiFetchSibylla } from '../../../services/api'
import { Donut } from '../../sales/distribution/_charts/Donut'
import './OperationOverview.sass'

interface ChartPoint {
  date: string
  capienza: number
  occupate: number
  occupateForecast: number | null
  inManutenzione: number
}

interface SegnalazioneHotel {
  id: number
  nome: string
  open: number
  total: number
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  dataDa: string
  dataA: string
  pctManutenzione: number
  pctManutenzioneLY: number
  tassoIndisponibilita: number
  trend: ChartPoint[]
  indisponibili: number
  totale: number
  rooms: { id: number; nome: string }[]
  roomsSelected: string
  segnalazioniHotel: SegnalazioneHotel[]
}

function genTrend(): ChartPoint[] {
  const out: ChartPoint[] = []
  const start = new Date('2026-01-01')
  for (let i = 0; i < 120; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i)
    const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
    const x = i / 120
    out.push({
      date,
      capienza: 100,
      occupate: Math.max(2, Math.round(8 + 12 * Math.sin(x * Math.PI * 4) + (Math.random() - 0.5) * 4)),
      occupateForecast: i > 100 ? Math.max(2, Math.round(7 + Math.random() * 4)) : null,
      inManutenzione: Math.max(0, Math.round(2 + Math.random() * 3)),
    })
  }
  return out
}

const FALLBACK: Data = {
  Strutture: [],
  StrutturaId: null,
  dataDa: '2026-01-01',
  dataA: '2026-04-30',
  pctManutenzione: 5.40,
  pctManutenzioneLY: 0.00,
  tassoIndisponibilita: 5.40,
  trend: genTrend(),
  indisponibili: 5.4,
  totale: 100,
  rooms: [{ id: 1, nome: 'ciao' }],
  roomsSelected: 'ciao',
  segnalazioniHotel: [
    { id: 1, nome: 'Hotel Tutorial', open: 7, total: 25 },
    { id: 2, nome: "Grim's Hotel",   open: 3, total: 25 },
  ],
}

export default function OperationOverview({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('operation/GetOverview', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: data.dataDa, a: data.dataA },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fmtPct = (v: number) => `${v.toFixed(2).replace('.', ',')} %`

  return (
    <div className="op-overview">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader
        title="Operation overview"
        subtitle="Monitoraggio e confronto delle performance operative"
      />

      <div className="op-overview__filters">
        <div className="op-overview__field">
          <label>Struttura</label>
          <select className="sib-select op-overview__select" value={data.StrutturaId ?? ''} onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Tutte le strutture</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="op-overview__field">
          <label>Scegli intervallo</label>
          <div className="op-overview__date-range">
            <input type="date" className="sib-input" value={data.dataDa} onChange={(e) => setData({ ...data, dataDa: e.target.value })} />
            <span>-</span>
            <input type="date" className="sib-input" value={data.dataA} onChange={(e) => setData({ ...data, dataA: e.target.value })} />
          </div>
        </div>
        <button type="button" className="sib-btn sib-btn--primary op-overview__visualizza">
          <i className="fa-light fa-chart-line" /> Visualizza
        </button>
        <button type="button" className="sib-btn sib-btn--icon op-overview__info" title="Info" aria-label="Info">
          <i className="fa-light fa-circle-info" />
        </button>
      </div>

      {/* Stats row */}
      <div className="op-overview__stats">
        <div className="op-overview__manut">
          <div className="op-overview__manut-tile">{fmtPct(data.pctManutenzione)}</div>
          <div className="op-overview__manut-text">
            <div className="op-overview__manut-label">In manutenzione</div>
            <div className="op-overview__manut-foot">LY: {fmtPct(data.pctManutenzioneLY)}</div>
          </div>
        </div>
        <div className="op-overview__indispon">
          <span>Tasso di indisponibilità</span>
          <strong>{fmtPct(data.tassoIndisponibilita)}</strong>
        </div>
      </div>

      {/* Trend + donut */}
      <div className="op-overview__trend-row">
        <div className="op-overview__trend-card">
          <h3 className="op-overview__card-title">Occupate vs in manutenzione</h3>
          <TrendChart points={data.trend} />
          <div className="op-overview__legend">
            <span><span className="op-overview__dot op-overview__dot--capienza" /> Capienza</span>
            <span><span className="op-overview__dot op-overview__dot--occupate" /> Occupate</span>
            <span><span className="op-overview__dot op-overview__dot--forecast" /> Occupate Forecast</span>
            <span><span className="op-overview__dot op-overview__dot--manut" /> In Manutenzione</span>
          </div>
        </div>

        <div className="op-overview__side-tag">MAINTENANCE OVERVIEW</div>

        <div className="op-overview__donut-card">
          <h3 className="op-overview__card-title">Indisponibili vs Totale</h3>
          <p className="op-overview__hint">Tocca per dettaglio</p>
          <Donut
            slices={[
              { label: 'Indisponibili', value: data.indisponibili, color: '#F59E0B' },
              { label: 'Disponibili',   value: data.totale - data.indisponibili, color: '#1F4E5F' },
            ]}
            centerLabel=""
            centerValue={`${data.indisponibili.toFixed(1).replace('.', ',')}%`}
            centerSubLabel="Indisp."
            size={210}
            thickness={36}
          />
        </div>
      </div>

      {/* Bottom split: Rooms + Segnalazioni */}
      <div className="op-overview__bottom">
        <div className="op-overview__side-tag op-overview__side-tag--alt">OSPITI SOGGIORNO</div>

        <div className="op-overview__rooms">
          <select
            className="sib-select op-overview__rooms-select"
            value={data.roomsSelected}
            onChange={(e) => setData({ ...data, roomsSelected: e.target.value })}
          >
            {data.rooms.map((r) => <option key={r.id} value={r.nome}>{r.nome}</option>)}
          </select>
          <h3 className="op-overview__card-title op-overview__rooms-title">Rooms</h3>
          <p className="op-overview__rooms-empty">Non sono presenti segnalazioni aperte per la giornata odierna</p>
        </div>

        <div className="op-overview__segnalazioni">
          <h3 className="op-overview__card-title">Segnalazioni</h3>
          {data.segnalazioniHotel.map((h) => (
            <div className="op-overview__seg-row" key={h.id}>
              <div className="op-overview__seg-head">
                <i className="fa-light fa-building" />
                <span className="op-overview__seg-name">{h.nome}</span>
                <span className="op-overview__seg-count">{h.open}</span>
              </div>
              <div className="op-overview__seg-bar">
                <div className="op-overview__seg-fill" style={{ '--fill-w': `${(h.open / Math.max(1, h.total)) * 100}%` } as React.CSSProperties} />
              </div>
              <div className="op-overview__seg-axis">
                <span>0</span>
                <span>{h.total}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="op-overview__side-tag op-overview__side-tag--alt">STATO AVANZAMENTO</div>
      </div>
    </div>
  )
}

// ─── TREND CHART (multi-line + dashed forecast) ──────────────────────────────
function TrendChart({ points }: { points: ChartPoint[] }) {
  const W = 1100
  const H = 280
  const PAD_L = 48
  const PAD_R = 16
  const PAD_T = 16
  const PAD_B = 30
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const ticks = 5
  const allY = points.flatMap((p) => [p.capienza, p.occupate, p.occupateForecast ?? 0, p.inManutenzione])
  const maxY = Math.max(...allY, 1)
  const yPos = (v: number) => PAD_T + innerH - (v / maxY) * innerH
  const xPos = (i: number) => PAD_L + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)

  const xLabelStep = Math.max(1, Math.floor(points.length / 12))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="op-overview__svg op-overview__svg--h280">
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (maxY / ticks) * i
        const y = yPos(v)
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#E0E7EE" strokeWidth={1} />
          </g>
        )
      })}

      {/* Capienza dots */}
      {points.map((p, i) => <circle key={`c-${i}`} cx={xPos(i)} cy={yPos(p.capienza)} r={2} fill="#A0A4AA" opacity={0.6} />)}

      {/* Occupate dots */}
      {points.map((p, i) => <circle key={`o-${i}`} cx={xPos(i)} cy={yPos(p.occupate)} r={2.5} fill="#1F4E5F" />)}

      {/* In Manutenzione dots */}
      {points.map((p, i) => <circle key={`m-${i}`} cx={xPos(i)} cy={yPos(p.inManutenzione)} r={2.2} fill="#3FA8E0" opacity={0.7} />)}

      {/* Forecast dots (orange) */}
      {points.map((p, i) =>
        p.occupateForecast !== null
          ? <circle key={`f-${i}`} cx={xPos(i)} cy={yPos(p.occupateForecast!)} r={2.5} fill="#F59E0B" />
          : null,
      )}

      {/* X labels */}
      {points.map((p, i) => {
        if (i % xLabelStep !== 0) return null
        return (
          <text key={i} x={xPos(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#888">{p.date.slice(0, 5)}</text>
        )
      })}
    </svg>
  )
}
