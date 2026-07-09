import React, { useEffect, useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import { apiFetchSibylla } from '../../../../services/api'
import { Donut, DonutLegend } from '../_charts/Donut'
import { HBars } from '../_charts/HBars'
import { AreaTrend, type SeriesPoint } from '../_charts/AreaTrend'
import { SelectField } from '../../../../core/components/form'
import './MonthlyTrend.sass'

interface RankItem { label: string; value: number; color: string }

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  anno: number
  mese: number  // 1-12
  forecastGarantito: number
  forecastOpzionato: number
  revenue: number
  rankSegmenti: RankItem[]
  rankAgenzie: RankItem[]
  trendTY: SeriesPoint[]
  trendLY: SeriesPoint[]
}

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

const FALLBACK: Data = {
  Strutture: [], StrutturaId: null,
  anno: 2026, mese: 4,
  forecastGarantito: 5250,
  forecastOpzionato: 0,
  revenue: 18143.04,
  rankSegmenti: [
    { label: 'Dirette', value: 22000, color: '#3FA34D' },
    { label: 'Gruppi',  value: 100,   color: '#E8C547' },
    { label: 'B2B',     value: 932,   color: '#1F4E5F' },
  ],
  rankAgenzie: [
    { label: 'Nessuna',             value: 1009.96, color: '#7A6FE0' },
    { label: 'Tour Del Mondo',      value: 932.28,  color: '#7A6FE0' },
    { label: 'Ovest Destination It…', value: 313.84,  color: '#5DC3E0' },
    { label: 'Tour Operator Test',  value: 100.00,  color: '#5DC3E0' },
  ],
  trendTY: [
    { x: '01.04', y: 600 },  { x: '02.04', y: 500 },  { x: '03.04', y: 1100 }, { x: '04.04', y: 400 },
    { x: '05.04', y: 250 },  { x: '06.04', y: 350 },  { x: '07.04', y: 1700 }, { x: '08.04', y: 350 },
    { x: '09.04', y: 250 },  { x: '10.04', y: 250 },  { x: '11.04', y: 250 },  { x: '12.04', y: 250 },
    { x: '13.04', y: 250 },  { x: '14.04', y: 600 },  { x: '15.04', y: 250 },  { x: '16.04', y: 250 },
    { x: '17.04', y: 350 },  { x: '18.04', y: 250 },  { x: '19.04', y: 250 },  { x: '20.04', y: 1100 },
    { x: '21.04', y: 3100 }, { x: '22.04', y: 3300 }, { x: '23.04', y: 2000 }, { x: '24.04', y: 350 },
    { x: '25.04', y: 350 },  { x: '26.04', y: 350 },  { x: '27.04', y: 350 },  { x: '28.04', y: 350 },
    { x: '29.04', y: 350 },  { x: '30.04', y: 5200 }, { x: '01.05', y: 5300 },
  ],
  trendLY: [],
}

function formatEuro(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(2).replace('.', ',')}K €`
  return `${v.toFixed(2).replace('.', ',')} €`
}

function formatFull(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} €`
}

export default function MonthlyTrend({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Data>(FALLBACK)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Data>('forecast/GetMonthlyTrend', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, anno: data.anno, mese: data.mese },
    })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const slices = useMemo(() => [
    { label: 'Forecast garantito', value: data.forecastGarantito, color: '#5DC3E0' },
    { label: 'Forecast opzionato', value: data.forecastOpzionato, color: '#3F62A8' },
    { label: 'Revenue',            value: data.revenue,           color: '#1F2E55' },
  ], [data])

  const total = slices.reduce((s, x) => s + x.value, 0)
  const forecastTotale = data.forecastGarantito + data.forecastOpzionato

  const ty = data.trendTY.reduce((s, p) => s + p.y, 0)
  const ly = data.trendLY.reduce((s, p) => s + p.y, 0)
  const delta = ty - ly

  const annoOptions = Array.from({ length: 7 }, (_, i) => 2024 + i)

  return (
    <div className="monthly-trend">
      <PageHead title="Monthly analysis" subtitle="Analisi comparativa su base mensile" />

      <div className="monthly-trend__filters">
        <SelectField
          name="struttura"
          label="Struttura"
          value={data.StrutturaId ?? ''}
          onChange={(e) => setData({ ...data, StrutturaId: e.target.value ? Number(e.target.value) : null })}
          options={[
            { value: '', label: 'Tutte le strutture' },
            ...data.Strutture.map((s) => ({ value: s.Id, label: s.nome })),
          ]}
          className="monthly-trend__select"
        />
        <SelectField
          name="anno"
          label="Anno"
          value={data.anno}
          onChange={(e) => setData({ ...data, anno: Number(e.target.value) })}
          options={annoOptions.map((a) => ({ value: a, label: String(a) }))}
          className="monthly-trend__select monthly-trend__select--sm"
        />
        <SelectField
          name="mese"
          label="Mese"
          value={data.mese}
          onChange={(e) => setData({ ...data, mese: Number(e.target.value) })}
          options={MESI.map((m, i) => ({ value: i + 1, label: m }))}
          className="monthly-trend__select monthly-trend__select--sm"
        />
        <button type="button" className="sib-btn sib-btn--primary monthly-trend__visualizza">
          <i className="fa-light fa-chart-line" /> Visualizza
        </button>
      </div>

      <div className="monthly-trend__cards">
        <div className="monthly-trend__card monthly-trend__card--donut">
          <Donut
            slices={slices}
            centerLabel="Revenue"
            centerValue={formatEuro(data.revenue)}
            centerSubLabel="Forecast totale"
            centerSubValue={formatEuro(forecastTotale)}
          />
          <DonutLegend slices={slices} total={total} />
          <div className="monthly-trend__donut-totals">
            <div>
              <div className="monthly-trend__small-label">Forecast garantito</div>
              <div className="monthly-trend__small-value">{formatEuro(data.forecastGarantito)}</div>
            </div>
            <div>
              <div className="monthly-trend__small-label">Forecast opzionato</div>
              <div className="monthly-trend__small-value">{formatFull(data.forecastOpzionato)}</div>
            </div>
          </div>
        </div>

        <div className="monthly-trend__card">
          <h3 className="monthly-trend__card-title">Ranking segmento</h3>
          <HBars bars={data.rankSegmenti} labelWidth={70} />
          <div className="monthly-trend__card-foot">
            <span className="monthly-trend__legend-dot monthly-trend__legend-dot--sales" /> Vendite totali
          </div>
        </div>

        <div className="monthly-trend__card">
          <h3 className="monthly-trend__card-title">Ranking agenzie</h3>
          <HBars bars={data.rankAgenzie} labelWidth={130} showAxis ticks={5} />
        </div>
      </div>

      <div className="monthly-trend__trend-section">
        <div className="monthly-trend__side-tag">TREND</div>
        <div className="monthly-trend__trend-body">
          <div className="monthly-trend__trend-header">
            <strong>Trend monthly</strong>
            <span>TY: <strong>{formatFull(ty)}</strong></span>
            <span>LY: <strong>{formatFull(ly)}</strong></span>
            <span className={delta >= 0 ? 'monthly-trend__delta--pos' : 'monthly-trend__delta--neg'}>
              Δ: <strong>{formatFull(delta)}</strong>
            </span>
          </div>
          <AreaTrend
            primary={data.trendTY}
            secondary={data.trendLY}
            primaryLabel="Sales TY"
            secondaryLabel="Sales LY"
            primaryColor="#5C9CD4"
            secondaryColor="#204769"
            height={280}
          />
        </div>
      </div>
    </div>
  )
}
