import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { apiFetchSibylla } from '../../../../services/api'
import { Donut, DonutLegend } from '../_charts/Donut'
import { HBars } from '../_charts/HBars'
import { AreaTrend, type SeriesPoint } from '../_charts/AreaTrend'
import './ForecastAnalysis.sass'

interface RankItem { label: string; value: number; color: string }

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  dataDa: string
  dataA: string
  forecastGarantito: number
  forecastOpzionato: number
  rankSegmenti: RankItem[]
  rankAgenzie: RankItem[]
  trendForecast: SeriesPoint[]
  trendLY: SeriesPoint[]
}

const FALLBACK: Data = {
  Strutture: [], StrutturaId: null,
  dataDa: '2026-04-30', dataA: '2026-05-31',
  forecastGarantito: 6814.57,
  forecastOpzionato: 13200.00,
  rankSegmenti: [
    { label: 'Gruppi',  value: 13000, color: '#E8C547' },
    { label: 'Dirette', value: 6000,  color: '#3FA34D' },
    { label: 'B2B',     value: 622,   color: '#1F4E5F' },
  ],
  rankAgenzie: [
    { label: 'Nessuna', value: 20014.57, color: '#7A6FE0' },
  ],
  trendForecast: [
    { x: '30.04', y: 5200 }, { x: '01.05', y: 800 },  { x: '02.05', y: 500 },  { x: '03.05', y: 500 },
    { x: '04.05', y: 0 },    { x: '05.05', y: 0 },    { x: '06.05', y: 0 },    { x: '07.05', y: 0 },
    { x: '08.05', y: 200 },  { x: '09.05', y: 250 },  { x: '10.05', y: 0 },    { x: '11.05', y: 0 },
    { x: '12.05', y: 0 },    { x: '13.05', y: 0 },    { x: '14.05', y: 0 },    { x: '15.05', y: 0 },
    { x: '16.05', y: 0 },    { x: '17.05', y: 0 },    { x: '18.05', y: 0 },    { x: '19.05', y: 1500 },
    { x: '20.05', y: 2200 }, { x: '21.05', y: 2700 }, { x: '22.05', y: 3200 }, { x: '23.05', y: 3200 },
    { x: '24.05', y: 3200 }, { x: '25.05', y: 3200 }, { x: '26.05', y: 3200 },
  ],
  trendLY: [],
}

function formatEuro(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(2).replace('.', ',')}K €`
  return `${v.toFixed(2).replace('.', ',')} €`
}

function formatFull(v: number): string {
  return `${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')} €`
    // safety: Italian thousand separator post-decimal split
    .replace(/(\d+)\.(\d{3})/, '$1.$2')
}

export default function ForecastAnalysis({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('forecast/GetForecastAnalysis', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: data.dataDa, a: data.dataA },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const slices = useMemo(() => [
    { label: 'Forecast garantito', value: data.forecastGarantito, color: '#5DC3E0' },
    { label: 'Forecast opzionato', value: data.forecastOpzionato, color: '#3F62A8' },
  ], [data])

  const total = data.forecastGarantito + data.forecastOpzionato

  const ty = data.trendForecast.reduce((s, p) => s + p.y, 0)
  const ly = data.trendLY.reduce((s, p) => s + p.y, 0)
  const delta = ty - ly

  return (
    <div className="forecast-analysis">
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Forecast analysis" subtitle="Analisi comparativa con una visione d'insieme" />

      <div className="forecast-analysis__filters">
        <div className="forecast-analysis__field">
          <label>Struttura</label>
          <select
            className="sib-select forecast-analysis__select"
            value={data.StrutturaId ?? ''}
            onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Tutte le strutture</option>
            {data.Strutture.map((s) => <option key={s.Id} value={s.Id}>{s.nome}</option>)}
          </select>
        </div>
        <div className="forecast-analysis__field">
          <label>Date</label>
          <div className="forecast-analysis__date-range">
            <input type="date" className="sib-input" aria-label="Data da" value={data.dataDa} onChange={(e) => setData({ ...data, dataDa: e.target.value })} />
            <span>-</span>
            <input type="date" className="sib-input" aria-label="Data a" value={data.dataA} onChange={(e) => setData({ ...data, dataA: e.target.value })} />
          </div>
        </div>
        <button type="button" className="sib-btn sib-btn--primary forecast-analysis__visualizza">
          <i className="fa-light fa-chart-line" /> Visualizza
        </button>
      </div>

      <div className="forecast-analysis__cards">
        <div className="forecast-analysis__card forecast-analysis__card--donut">
          <Donut
            slices={slices}
            centerLabel="Forecast totale"
            centerValue={formatFull(total)}
          />
          <DonutLegend slices={slices} total={total} />
          <div className="forecast-analysis__donut-totals">
            <div>
              <div className="forecast-analysis__small-label">Forecast garantito</div>
              <div className="forecast-analysis__small-value">{formatFull(data.forecastGarantito)}</div>
            </div>
            <div>
              <div className="forecast-analysis__small-label">Forecast opzionato</div>
              <div className="forecast-analysis__small-value">{formatFull(data.forecastOpzionato)}</div>
            </div>
          </div>
        </div>

        <div className="forecast-analysis__card">
          <h3 className="forecast-analysis__card-title">Ranking per segmento</h3>
          <HBars bars={data.rankSegmenti} labelWidth={70} />
          <div className="forecast-analysis__card-foot">
            <span className="forecast-analysis__legend-dot" style={{ background: '#5DC3E0' }} /> Vendite totali
          </div>
        </div>

        <div className="forecast-analysis__card">
          <h3 className="forecast-analysis__card-title">Ranking per agenzia</h3>
          <HBars bars={data.rankAgenzie} labelWidth={100} showAxis ticks={5} />
        </div>
      </div>

      <div className="forecast-analysis__trend-section">
        <div className="forecast-analysis__side-tags">
          <div className="forecast-analysis__side-tag">DETTAGLIO</div>
          <div className="forecast-analysis__side-tag">TREND</div>
        </div>
        <div className="forecast-analysis__trend-body">
          <div className="forecast-analysis__trend-header">
            <strong>Trend Forecast</strong>
            <span>TY: <strong>{formatEuro(ty)}</strong></span>
            <span>LY: <strong>{formatEuro(ly)}</strong></span>
            <span className={delta >= 0 ? 'forecast-analysis__delta--pos' : 'forecast-analysis__delta--neg'}>
              Δ su forecast garantito: <strong>{formatEuro(delta)}</strong>
            </span>
          </div>
          <AreaTrend
            primary={data.trendForecast}
            secondary={data.trendLY}
            primaryLabel="Forecast garantito"
            secondaryLabel="Revenue LY"
            primaryColor="#5C9CD4"
            secondaryColor="#204769"
            height={300}
          />
        </div>
      </div>
    </div>
  )
}
