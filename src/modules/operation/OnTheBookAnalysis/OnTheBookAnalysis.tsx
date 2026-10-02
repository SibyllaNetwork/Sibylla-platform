import React, { useEffect, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { apiFetchSibylla } from '../../../services/api'
import { HBars } from '../../sales/distribution/_charts/HBars'
import { SelectField } from '../../../core/components/form'
import { useStrutturaIdRevenue } from '../../../hooks/useStrutturaCorrente'
import { STRUTTURE, buildGiorniMese, otbFrazione } from '../../sales/_data/revenueMock'
import { pmsDi } from '../_data/pmsDi'
import { usePmsStore } from '../_data/pmsDemo'
import './OnTheBookAnalysis.sass'

interface TrendPoint {
  date: string          // 'gen 2026', 'feb 2026', ...
  produzione: number | null
  forecast: number | null
}

interface RankItem { label: string; value: number; color: string }

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  dataDa: string
  dataA: string
  previsioneRevenue: number
  previsioneRevenueLY: number
  forecastTotale: number
  forecastGarantito: number
  forecastOpzionato: number
  trend: TrendPoint[]
  rankAgenzie: RankItem[]
  forecastBySegment: RankItem[]
}

// ── Dati demo (senza backend) ──────────────────────────────────────────────────
//  Produzione mese per mese dell'anno in corso dal ciclo revenue condiviso
//  (stessi numeri di Sales overview); per i mesi a venire l'on-the-book è la
//  quota già a libro (curva di prenotazione). Agenzie e segmenti dalle
//  prenotazioni future del gestionale demo.
const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const COLORI_RANK = ['#3FA8E0', '#5C6FE0', '#7A4FE0', '#9F4FE0', '#A53FCF', '#A53FCF', '#A53FCF']
const r2 = (n: number) => Math.round(n * 100) / 100

function genFallback(strutturaId: number | null): Data {
  const oggi = new Date()
  const anno = oggi.getFullYear()
  const meseCorr = oggi.getMonth() + 1
  const hotel = STRUTTURE.filter((x) => x.camere > 0)
  const sel = strutturaId === null ? hotel : hotel.filter((x) => x.id === strutturaId)
  let prodAnno = 0, prodLY = 0
  const trend: TrendPoint[] = []
  for (let m = 1; m <= Math.min(12, meseCorr + 4); m++) {
    const g = buildGiorniMese(anno, m, strutturaId, oggi)
    const ricavi = g.reduce((t, x) => t + x.ricavi, 0)
    const otb = g.reduce((t, x) => t + x.ricavi * otbFrazione(x.lead), 0)
    if (m <= meseCorr) { prodAnno += ricavi; prodLY += g.reduce((t, x) => t + x.ricaviLY, 0) }
    trend.push({
      date: `${MESI_BREVI[m - 1]} ${anno}`,
      // Il mese in corso è il punto di raccordo: consuntivo + on-the-book.
      produzione: m < meseCorr ? Math.round(ricavi) : m === meseCorr ? Math.round(otb) : null,
      forecast: m >= meseCorr ? Math.round(otb) : null,
    })
  }
  // Prenotazioni future (da domani) del gestionale demo: garantite vs opzionate.
  const domani = new Date(oggi); domani.setDate(domani.getDate() + 1)
  const daIso = `${domani.getFullYear()}-${String(domani.getMonth() + 1).padStart(2, '0')}-${String(domani.getDate()).padStart(2, '0')}`
  const future = sel.flatMap((st) => pmsDi(st.nome).prenotazioni.filter((p) => p.checkIn >= daIso && p.stato !== 'noshow'))
  const garantito = future.filter((p) => p.stato === 'confermata').reduce((t, p) => t + p.importo, 0)
  const opzionato = future.filter((p) => p.stato === 'opzione').reduce((t, p) => t + p.importo, 0)
  const perCanale = new Map<string, number>()
  future.forEach((p) => perCanale.set(p.canale, (perCanale.get(p.canale) ?? 0) + p.importo))
  const rankAgenzie = Array.from(perCanale.entries()).sort((x, y) => y[1] - x[1]).slice(0, 7)
    .map(([label, value], i) => ({ label: label.length > 12 ? `${label.slice(0, 11)}...` : label, value: Math.round(value), color: COLORI_RANK[i] }))
  const seg = (f: (p: typeof future[number]) => boolean) => Math.round(future.filter(f).reduce((t, p) => t + p.importo, 0))
  return {
    Strutture: hotel.map((x) => ({ Id: x.id, nome: x.nome })),
    StrutturaId: strutturaId,
    dataDa: `${anno}-01-01`,
    dataA: `${anno}-12-31`,
    previsioneRevenue: Math.round(prodAnno),
    previsioneRevenueLY: Math.round(prodLY),
    forecastTotale: r2(garantito + opzionato),
    forecastGarantito: r2(garantito),
    forecastOpzionato: r2(opzionato),
    trend,
    rankAgenzie,
    forecastBySegment: [
      { label: 'Gruppi',  value: seg((p) => p.tipo === 'Gruppo'),                                           color: '#FBD737' },
      { label: 'Dirette', value: seg((p) => p.tipo !== 'Gruppo' && ['Diretto', 'Sito web'].includes(p.canale)), color: '#3FA34D' },
      { label: 'B2B',     value: seg((p) => p.tipo !== 'Gruppo' && !['Diretto', 'Sito web'].includes(p.canale)), color: '#1F4E5F' },
    ].sort((x, y) => y.value - x.value),
  }
}

function fmtEuro(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(2).replace('.', ',')}K €`
  return `${v.toFixed(2).replace('.', ',')} €`
}

function fmtFull(v: number): string {
  return `${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`
}

export default function OnTheBookAnalysis({ navigate }: { navigate: (p: string) => void }) {
  // Struttura selezionata in alto; senza backend i dati sono quelli demo.
  const [strutturaId, setStrutturaId] = useStrutturaIdRevenue()
  const versionePms = usePmsStore((st) => st.versione)
  const [data, setData] = useState<Data>(() => genFallback(strutturaId))
  useEffect(() => { setData(genFallback(strutturaId)) }, [strutturaId, versionePms])

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('forecast/GetOnTheBookAnalysis', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: data.dataDa, a: data.dataA },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="otb-analysis">
      <PageHead
        title="On the book analysis"
        subtitle="Analisi dettagliata delle prenotazioni per ottimizzare occupazione e ricavi"
      />

      <div className="otb-analysis__filters">
        <SelectField
          className="otb-analysis__field otb-analysis__select"
          label="Struttura"
          name="struttura"
          value={data.StrutturaId ?? ''}
          options={[
            { value: '', label: 'Tutte le strutture' },
            ...data.Strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
          onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
        />
        <div className="otb-analysis__field-raw">
          <label>Scegli intervallo</label>
          <div className="otb-analysis__date-range">
            <input type="date" className="sib-input" value={data.dataDa} onChange={(e) => setData({ ...data, dataDa: e.target.value })} />
            <span>-</span>
            <input type="date" className="sib-input" value={data.dataA} onChange={(e) => setData({ ...data, dataA: e.target.value })} />
          </div>
        </div>
        <button type="button" className="sib-btn sib-btn--primary otb-analysis__visualizza">
          <i className="fa-light fa-chart-line" /> Visualizza
        </button>
        <button type="button" className="sib-btn sib-btn--icon otb-analysis__info" title="Info" aria-label="Info">
          <i className="fa-regular fa-circle-info" />
        </button>
      </div>

      {/* ─── Stats row ───────────────────────────────────────────────────────── */}
      <div className="otb-analysis__stats">
        <div className="otb-analysis__previsione">
          <div className="otb-analysis__previsione-tile">{fmtEuro(data.previsioneRevenue)}</div>
          <div className="otb-analysis__previsione-text">
            <div className="otb-analysis__stat-label">Previsione revenue</div>
            <div className="otb-analysis__stat-foot">LY: {fmtEuro(data.previsioneRevenueLY)}</div>
          </div>
        </div>

        <div className="otb-analysis__small-stats">
          <div className="otb-analysis__small-stat">
            <div className="otb-analysis__stat-label">Forecast</div>
            <div className="otb-analysis__stat-value">{fmtFull(data.forecastTotale)}</div>
          </div>
          <div className="otb-analysis__small-stat">
            <div className="otb-analysis__stat-label">Forecast garantito</div>
            <div className="otb-analysis__stat-value">{fmtFull(data.forecastGarantito)}</div>
          </div>
          <div className="otb-analysis__small-stat">
            <div className="otb-analysis__stat-label">Forecast opzionato</div>
            <div className="otb-analysis__stat-value">{fmtFull(data.forecastOpzionato)}</div>
          </div>
        </div>
      </div>

      {/* ─── Trend chart ─────────────────────────────────────────────────────── */}
      <div className="otb-analysis__trend">
        <div className="otb-analysis__legend">
          <span><span className="otb-analysis__dot otb-analysis__dot--produzione" /> Produzione</span>
          <span><span className="otb-analysis__dot otb-analysis__dot--forecast-tot" /> Forecast Totale</span>
          <span><span className="otb-analysis__dot otb-analysis__dot--forecast-gar" /> Forecast garantito</span>
          <span><span className="otb-analysis__dot otb-analysis__dot--forecast-opz" /> Forecast opzionato</span>
        </div>
        <TrendChart points={data.trend} />
      </div>

      {/* ─── Bottom row ─────────────────────────────────────────────────────── */}
      <div className="otb-analysis__bottom">
        <div className="otb-analysis__card">
          <h3 className="otb-analysis__card-title">Ranking agenzie - TOP 10</h3>
          <div className="otb-analysis__scroll">
            <HBars
              bars={data.rankAgenzie.map((b) => ({ ...b, format: (v) => `${v.toLocaleString('it-IT')} €` }))}
              labelWidth={120}
            />
          </div>
        </div>

        <div className="otb-analysis__card">
          <h3 className="otb-analysis__card-title">Forecast by segment</h3>
          <HBars
            bars={data.forecastBySegment.map((b) => ({ ...b, format: (v) => `${v.toLocaleString('it-IT')} €` }))}
            labelWidth={70}
          />
        </div>
      </div>
    </div>
  )
}

// ─── TREND CHART ──────────────────────────────────────────────────────────────
function TrendChart({ points }: { points: TrendPoint[] }) {
  const W = 1300
  const H = 360
  const PAD_L = 60
  const PAD_R = 24
  const PAD_T = 16
  const PAD_B = 36
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const allY = points.flatMap((p) => [p.produzione ?? 0, p.forecast ?? 0])
  const maxY = Math.max(...allY, 1) * 1.05
  const ticks = 4
  const yPos = (v: number) => PAD_T + innerH - (v / maxY) * innerH
  const xPos = (i: number) => PAD_L + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)

  // Produzione: Solo i punti dove produzione != null, area gray
  const prodPts = points
    .map((p, i) => ({ idx: i, y: p.produzione }))
    .filter((p): p is { idx: number; y: number } => p.y !== null)

  let prodPath = ''
  if (prodPts.length > 0) {
    const lineParts = prodPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.idx)} ${yPos(p.y)}`).join(' ')
    const lastIdx = prodPts[prodPts.length - 1].idx
    const firstIdx = prodPts[0].idx
    prodPath = `${lineParts} L ${xPos(lastIdx)} ${PAD_T + innerH} L ${xPos(firstIdx)} ${PAD_T + innerH} Z`
  }
  const prodLinePath = prodPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.idx)} ${yPos(p.y)}`).join(' ')

  // Forecast: punti dove forecast != null, linea dashed nera
  const forecastPts = points
    .map((p, i) => ({ idx: i, y: p.forecast }))
    .filter((p): p is { idx: number; y: number } => p.y !== null)
  const forecastPath = forecastPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.idx)} ${yPos(p.y)}`).join(' ')

  // Forecast area (light gray) — same range as forecastPts
  let forecastAreaPath = ''
  if (forecastPts.length > 0) {
    const lineParts = forecastPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(p.idx)} ${yPos(p.y)}`).join(' ')
    const lastIdx = forecastPts[forecastPts.length - 1].idx
    const firstIdx = forecastPts[0].idx
    forecastAreaPath = `${lineParts} L ${xPos(lastIdx)} ${PAD_T + innerH} L ${xPos(firstIdx)} ${PAD_T + innerH} Z`
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="otb-analysis__svg otb-analysis__svg--h360">
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

      {forecastAreaPath && <path d={forecastAreaPath} fill="#E8ECEF" opacity={0.55} />}
      {prodPath && <path d={prodPath} fill="#CFD9E3" opacity={0.55} />}
      {prodLinePath && <path d={prodLinePath} fill="none" stroke="#A0A4AA" strokeWidth={2} />}
      {forecastPath && <path d={forecastPath} fill="none" stroke="#1A1A1A" strokeWidth={2} strokeDasharray="6 4" />}

      {prodPts.map((p, i) => <circle key={`p-${i}`} cx={xPos(p.idx)} cy={yPos(p.y)} r={3.5} fill="#A0A4AA" />)}
      {forecastPts.map((p, i) => <circle key={`f-${i}`} cx={xPos(p.idx)} cy={yPos(p.y)} r={3.5} fill="#1A1A1A" />)}

      {points.map((p, i) => (
        <text key={i} x={xPos(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#888">{p.date}</text>
      ))}
    </svg>
  )
}
