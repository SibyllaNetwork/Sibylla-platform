import React, { useMemo, useRef, useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, Legend,
} from 'recharts'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { DateRangeField } from '../../../../core/components/form'
import './ReportPickup.sass'

// ─── DATI MOCK ────────────────────────────────────────────────────────────────

interface Hotel { id: string; nome: string; peso: number }
const HOTELS: Hotel[] = [
  { id: 'resort',   nome: 'Sibylla Resort',   peso: 0.40 },
  { id: 'city',     nome: 'Sibylla City',     peso: 0.28 },
  { id: 'bay',      nome: 'Sibylla Bay',      peso: 0.20 },
  { id: 'mountain', nome: 'Sibylla Mountain', peso: 0.12 },
]

interface MeseAgg { mese: string; anno: number; rn: number; imp: number }
// Andamento aggregato "anno corrente" (Tutti gli hotel). I dati per singolo hotel
// sono derivati dai pesi; l'aggregato di una selezione è la somma dei selezionati.
const AGG_TY: MeseAgg[] = [
  { mese: 'Gen', anno: 2026, rn: 33,  imp: 8105.40 },
  { mese: 'Feb', anno: 2026, rn: 18,  imp: 4657.86 },
  { mese: 'Mar', anno: 2026, rn: 79,  imp: 15679.84 },
  { mese: 'Apr', anno: 2026, rn: 83,  imp: 20492.93 },
  { mese: 'Mag', anno: 2026, rn: 106, imp: 23497.99 },
  { mese: 'Giu', anno: 2026, rn: 52,  imp: 10129.05 },
  { mese: 'Lug', anno: 2026, rn: 49,  imp: 4772.04 },
  { mese: 'Ago', anno: 2026, rn: 61,  imp: 14841.62 },
  { mese: 'Set', anno: 2026, rn: 44,  imp: 9414.43 },
  { mese: 'Ott', anno: 2026, rn: 38,  imp: 7820.00 },
  { mese: 'Nov', anno: 2026, rn: 21,  imp: 3960.00 },
  { mese: 'Dic', anno: 2026, rn: 40,  imp: 9669.64 },
  { mese: 'Gen', anno: 2027, rn: 27,  imp: 6740.00 },
  { mese: 'Feb', anno: 2027, rn: 15,  imp: 3980.00 },
  { mese: 'Mar', anno: 2027, rn: 31,  imp: 7120.00 },
  { mese: 'Apr', anno: 2027, rn: 12,  imp: 2980.00 },
]
// Fattore SDLY (stesso periodo anno precedente) per mese: <1 = quest'anno meglio.
const LY_FACTOR = [0.88, 1.12, 0.82, 0.95, 0.90, 1.05, 1.20, 0.86, 0.98, 1.02, 1.10, 0.92, 0.94, 1.08, 0.89, 1.15]

const fmtEur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
const fmtEur2 = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
const fmtNum = (n: number) => new Intl.NumberFormat('it-IT').format(Math.round(n))
const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')}%`

// ─── COMPONENTE ─────────────────────────────────────────────────────────────────

export default function ReportPickup({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [selHotels, setSelHotels] = useState<string[]>([]) // [] = Tutti gli hotel (aggregata)
  const [hotelOpen, setHotelOpen] = useState(false)
  const [da, setDa] = useState('2026-01-01')
  const [a, setA] = useState('2026-12-31')
  const hotelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (hotelRef.current && !hotelRef.current.contains(e.target as Node)) setHotelOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Peso complessivo della selezione (Tutti = 1).
  const peso = selHotels.length === 0 ? 1 : HOTELS.filter((h) => selHotels.includes(h.id)).reduce((s, h) => s + h.peso, 0)
  const aggregata = selHotels.length === 0

  // Serie mensile in base alla selezione hotel.
  const serie = useMemo(() => AGG_TY.map((m, i) => {
    const rn = Math.round(m.rn * peso)
    const imp = m.imp * peso
    const rnLy = Math.round(rn * LY_FACTOR[i])
    const impLy = imp * LY_FACTOR[i]
    return {
      label: `${m.mese} ${String(m.anno).slice(2)}`,
      mese: m.mese, anno: m.anno,
      rn, imp, rnLy, impLy,
      pickup: rn - rnLy,
    }
  }), [peso])

  // Totali anno corrente vs SDLY (stesso periodo anno precedente).
  const tot = useMemo(() => {
    const rn = serie.reduce((s, m) => s + m.rn, 0)
    const imp = serie.reduce((s, m) => s + m.imp, 0)
    const rnLy = serie.reduce((s, m) => s + m.rnLy, 0)
    const impLy = serie.reduce((s, m) => s + m.impLy, 0)
    const adr = rn ? imp / rn : 0
    const adrLy = rnLy ? impLy / rnLy : 0
    return { rn, imp, adr, rnLy, impLy, adrLy }
  }, [serie])

  const delta = (ty: number, ly: number) => (ly ? ((ty - ly) / ly) * 100 : 0)

  const hotelLabel = aggregata
    ? 'Tutti gli hotel'
    : selHotels.length === 1 ? HOTELS.find((h) => h.id === selHotels[0])!.nome : `${selHotels.length} hotel selezionati`

  const toggleHotel = (id: string) =>
    setSelHotels((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  // Righe della tabella di confronto SDLY.
  const CONFRONTO: { label: string; ty: number; ly: number; fmt: (n: number) => string }[] = [
    { label: 'Camere vendute', ty: tot.rn,  ly: tot.rnLy,  fmt: fmtNum },
    { label: 'Importo',        ty: tot.imp, ly: tot.impLy, fmt: fmtEur },
    { label: 'ADR',            ty: tot.adr, ly: tot.adrLy, fmt: fmtEur2 },
  ]

  const KPI = [
    { label: 'Camere vendute', icon: 'bed-front', value: fmtNum(tot.rn), delta: delta(tot.rn, tot.rnLy) },
    { label: 'Importo',        icon: 'euro-sign', value: fmtEur(tot.imp), delta: delta(tot.imp, tot.impLy) },
    { label: 'ADR',            icon: 'chart-line', value: fmtEur2(tot.adr), delta: delta(tot.adr, tot.adrLy) },
  ]

  const chartMinWidth = Math.max(680, serie.length * 78)

  return (
    <div className="report-pickup">
      <BtnBack />
      <PageHeader
        title="Report Pickup"
        subtitle="Andamento delle vendite nel tempo e confronto con lo stesso periodo dell'anno precedente (SDLY)"
      />

      {/* ── Filtri ─────────────────────────────────────────────────────────── */}
      <div className="report-pickup__bar">
        <div className="report-pickup__field" ref={hotelRef}>
          <label>Hotel</label>
          <button type="button" className={`report-pickup__hotel-btn${hotelOpen ? ' is-open' : ''}`} onClick={() => setHotelOpen((v) => !v)}>
            <i className="fa-light fa-hotel" />
            <span>{hotelLabel}</span>
            <i className={`fa-solid fa-chevron-${hotelOpen ? 'up' : 'down'} report-pickup__hotel-chev`} />
          </button>
          {hotelOpen && (
            <div className="report-pickup__hotel-pop">
              <label className="report-pickup__hotel-opt">
                <input type="checkbox" className="sib-checkbox" checked={aggregata} onChange={() => setSelHotels([])} />
                <span>Tutti gli hotel <em>(vista aggregata)</em></span>
              </label>
              <div className="report-pickup__hotel-sep" />
              {HOTELS.map((h) => (
                <label key={h.id} className="report-pickup__hotel-opt">
                  <input type="checkbox" className="sib-checkbox" checked={selHotels.includes(h.id)} onChange={() => toggleHotel(h.id)} />
                  <span>{h.nome}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <DateRangeField
          label="Periodo"
          nameFrom="da" nameTo="a"
          valueFrom={da} valueTo={a}
          onChangeFrom={(e) => setDa(e.target.value)}
          onChangeTo={(e) => setA(e.target.value)}
        />
        <span className={`report-pickup__view-tag report-pickup__view-tag--${aggregata ? 'agg' : 'det'}`}>
          <i className={`fa-solid fa-${aggregata ? 'layer-group' : 'magnifying-glass-chart'}`} />
          {aggregata ? 'Vista aggregata' : 'Vista di dettaglio'}
        </span>
      </div>

      {/* ── Confronto SDLY ─────────────────────────────────────────────────── */}
      <section className="report-pickup__card">
        <h2 className="report-pickup__card-title">Confronto Same Date Last Year (SDLY)</h2>
        <div className="sib-table-wrap">
          <table className="sib-table report-pickup__cmp-table">
            <thead>
              <tr>
                <th>Indicatore</th>
                <th className="report-pickup__num">Anno corrente</th>
                <th className="report-pickup__num">Stesso periodo A-1</th>
                <th className="report-pickup__num">Δ</th>
                <th className="report-pickup__num">Δ %</th>
              </tr>
            </thead>
            <tbody>
              {CONFRONTO.map((r) => {
                const d = delta(r.ty, r.ly)
                return (
                  <tr key={r.label}>
                    <td className="report-pickup__strong">{r.label}</td>
                    <td className="report-pickup__num">{r.fmt(r.ty)}</td>
                    <td className="report-pickup__num report-pickup__muted">{r.fmt(r.ly)}</td>
                    <td className="report-pickup__num">{r.fmt(r.ty - r.ly)}</td>
                    <td className={`report-pickup__num report-pickup__delta report-pickup__delta--${d >= 0 ? 'up' : 'down'}`}>
                      <i className={`fa-solid fa-arrow-${d >= 0 ? 'up' : 'down'}`} /> {fmtPct(d)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Andamento Room nights nel tempo ────────────────────────────────── */}
      <section className="report-pickup__card">
        <h2 className="report-pickup__card-title">Andamento Room nights vendute</h2>
        <p className="report-pickup__hint"><i className="fa-light fa-arrows-left-right" /> Scorri orizzontalmente per consultare i mesi successivi</p>

        <div className="report-pickup__scroll">
          <div style={{ minWidth: chartMinWidth }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={serie} margin={{ top: 12, right: 12, left: 0, bottom: 4 }} barGap={2}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tick={{ fontSize: 11, fill: 'var(--color-text-inactive)' }} interval={0} />
                <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: 'var(--color-text-inactive)' }} />
                <RTooltip
                  cursor={{ fill: 'var(--color-primary-50)' }}
                  formatter={(v: any, n: any) => [fmtNum(v as number), n === 'rn' ? 'Anno corrente' : 'SDLY']}
                  labelStyle={{ color: 'var(--color-text-active)', fontWeight: 600 }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === 'rn' ? 'Anno corrente' : 'SDLY')} />
                <Bar dataKey="rnLy" name="rnLy" fill="var(--color-text-disabled)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                <Bar dataKey="rn" name="rn" fill="var(--color-primary)" radius={[3, 3, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="report-pickup__scroll report-pickup__scroll--table">
          <table className="report-pickup__time-table">
            <thead>
              <tr>
                <th className="report-pickup__time-head">Periodo</th>
                {serie.map((m) => <th key={m.label} className="report-pickup__num">{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="report-pickup__time-head report-pickup__strong">Camere vendute</td>
                {serie.map((m) => <td key={m.label} className="report-pickup__num report-pickup__strong">{fmtNum(m.rn)}</td>)}
              </tr>
              <tr>
                <td className="report-pickup__time-head report-pickup__muted">SDLY</td>
                {serie.map((m) => <td key={m.label} className="report-pickup__num report-pickup__muted">{fmtNum(m.rnLy)}</td>)}
              </tr>
              <tr>
                <td className="report-pickup__time-head">Pickup Δ</td>
                {serie.map((m) => (
                  <td key={m.label} className={`report-pickup__num report-pickup__delta report-pickup__delta--${m.pickup >= 0 ? 'up' : 'down'}`}>
                    {m.pickup > 0 ? '+' : ''}{fmtNum(m.pickup)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="report-pickup__time-head">Importo</td>
                {serie.map((m) => <td key={m.label} className="report-pickup__num">{fmtEur(m.imp)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── KPI ────────────────────────────────────────────────────────────── */}
      <div className="report-pickup__kpis">
        {KPI.map((k) => (
          <div key={k.label} className="sib-stat-card report-pickup__kpi">
            <div className="report-pickup__kpi-top">
              <span className="report-pickup__kpi-ico"><i className={`fa-light fa-${k.icon}`} /></span>
              <span className="sib-stat-card__label">{k.label}</span>
            </div>
            <span className="sib-stat-card__value">{k.value}</span>
            <span className={`report-pickup__kpi-delta report-pickup__delta--${k.delta >= 0 ? 'up' : 'down'}`}>
              <i className={`fa-solid fa-arrow-${k.delta >= 0 ? 'up' : 'down'}`} /> {fmtPct(k.delta)} <em>vs SDLY</em>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
