import React, { useMemo, useRef, useState, useEffect } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, Legend,
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

// Il report è organizzato GIORNO PER GIORNO: ogni colonna è una data di soggiorno.
// L'andamento aggregato "anno corrente" (Tutti gli hotel) è generato in modo
// deterministico; i dati per singolo hotel derivano dai pesi.
const WD = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const N_GIORNI = 92 // ~3 mesi, con scroll orizzontale sui successivi

interface Giorno {
  label: string      // gg/mm
  wd: string         // giorno settimana abbreviato
  meseLabel: string  // "Giugno 2026"
  rnBase: number     // room nights aggregate (Tutti gli hotel)
  adr: number
  lyF: number        // fattore SDLY (<1 = quest'anno meglio)
}
const GIORNI: Giorno[] = Array.from({ length: N_GIORNI }, (_, i) => {
  const date = new Date(2026, 5, 1 + i) // dal 1° giugno 2026
  const dow = date.getDay()
  const weekend = dow === 0 || dow === 5 || dow === 6
  const wave = 12 + Math.round(7 * Math.sin(i / 3.2) + 4 * Math.cos(i / 7))
  const rnBase = Math.max(0, wave + (weekend ? 8 : 0))
  const adr = 240 + (i % 11) * 6 + (weekend ? 30 : 0)
  const lyF = 0.82 + ((i * 7) % 40) / 100 // 0.82 → 1.21 deterministico
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return { label: `${dd}/${mm}`, wd: WD[dow], meseLabel: `${MESI[date.getMonth()]} ${date.getFullYear()}`, rnBase, adr, lyF }
})

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

  // ── Slider di scorrimento giorni (overlay), sincronizzato grafico ⇄ tabella ──
  const chartScrollRef = useRef<HTMLDivElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const syncing = useRef(false)
  const [scrollPct, setScrollPct] = useState(0)

  const applyScroll = (pct: number, source?: 'chart' | 'table' | 'slider') => {
    const p = Math.min(1, Math.max(0, pct))
    const set = (el: HTMLDivElement | null) => {
      if (!el) return
      const max = el.scrollWidth - el.clientWidth
      if (max > 0) el.scrollLeft = max * p
    }
    if (source !== 'chart') set(chartScrollRef.current)
    if (source !== 'table') set(tableScrollRef.current)
    setScrollPct(p)
  }

  const onContainerScroll = (which: 'chart' | 'table') => (e: React.UIEvent<HTMLDivElement>) => {
    if (syncing.current) return
    syncing.current = true
    const el = e.currentTarget
    const max = el.scrollWidth - el.clientWidth
    applyScroll(max > 0 ? el.scrollLeft / max : 0, which)
    requestAnimationFrame(() => { syncing.current = false })
  }

  useEffect(() => {
    const h = (e: MouseEvent) => { if (hotelRef.current && !hotelRef.current.contains(e.target as Node)) setHotelOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Peso complessivo della selezione (Tutti = 1).
  const peso = selHotels.length === 0 ? 1 : HOTELS.filter((h) => selHotels.includes(h.id)).reduce((s, h) => s + h.peso, 0)
  const aggregata = selHotels.length === 0

  // Serie giornaliera in base alla selezione hotel.
  const serie = useMemo(() => GIORNI.map((g) => {
    const rn = Math.round(g.rnBase * peso)
    const imp = rn * g.adr
    const rnLy = Math.round(rn * g.lyF)
    const impLy = rnLy * g.adr * 0.97
    return { label: g.label, wd: g.wd, meseLabel: g.meseLabel, rn, imp, rnLy, impLy, pickup: rn - rnLy }
  }), [peso])

  // Raggruppamento per mese (intestazione superiore della tabella giornaliera).
  const meseGroups = useMemo(() => {
    const groups: { label: string; count: number }[] = []
    serie.forEach((g) => {
      const last = groups[groups.length - 1]
      if (last && last.label === g.meseLabel) last.count++
      else groups.push({ label: g.meseLabel, count: 1 })
    })
    return groups
  }, [serie])

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

  const chartMinWidth = Math.max(680, serie.length * 30)
  const tableMinWidth = 150 + serie.length * 58

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

      {/* ── Andamento Room nights nel tempo (giorno per giorno) ────────────── */}
      <section className="report-pickup__card report-pickup__card--scroll">
        <h2 className="report-pickup__card-title">Andamento Room nights vendute — giorno per giorno</h2>
        <p className="report-pickup__hint"><i className="fa-light fa-arrows-left-right" /> Scorri orizzontalmente per consultare i giorni e i mesi successivi</p>

        <div className="report-pickup__scroll" ref={chartScrollRef} onScroll={onContainerScroll('chart')}>
          <div style={{ minWidth: chartMinWidth }}>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={serie} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--color-border)' }} tick={{ fontSize: 10, fill: 'var(--color-text-inactive)' }} interval={2} />
                <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: 'var(--color-text-inactive)' }} />
                <RTooltip
                  cursor={{ fill: 'var(--color-primary-50)' }}
                  formatter={(v: any, n: any) => [fmtNum(v as number), n === 'rn' ? 'Anno corrente' : 'SDLY']}
                  labelStyle={{ color: 'var(--color-text-active)', fontWeight: 600 }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)' }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === 'rn' ? 'Anno corrente' : 'SDLY')} />
                <Bar dataKey="rn" name="rn" fill="var(--color-primary)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Line dataKey="rnLy" name="rnLy" stroke="var(--color-text-disabled)" strokeWidth={2} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="report-pickup__scroll report-pickup__scroll--table" ref={tableScrollRef} onScroll={onContainerScroll('table')}>
          <table className="report-pickup__time-table" style={{ minWidth: tableMinWidth }}>
            <thead>
              <tr>
                <th className="report-pickup__time-head" rowSpan={2}>Periodo</th>
                {meseGroups.map((mg, gi) => <th key={`${mg.label}-${gi}`} colSpan={mg.count} className="report-pickup__mese-th">{mg.label}</th>)}
              </tr>
              <tr>
                {serie.map((m, i) => (
                  <th key={i} className="report-pickup__num report-pickup__day-th">
                    <span className="report-pickup__day-wd">{m.wd}</span>{m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="report-pickup__time-head report-pickup__strong">Camere vendute</td>
                {serie.map((m, i) => <td key={i} className="report-pickup__num report-pickup__strong">{fmtNum(m.rn)}</td>)}
              </tr>
              <tr>
                <td className="report-pickup__time-head report-pickup__muted">SDLY</td>
                {serie.map((m, i) => <td key={i} className="report-pickup__num report-pickup__muted">{fmtNum(m.rnLy)}</td>)}
              </tr>
              <tr>
                <td className="report-pickup__time-head">Pickup Δ</td>
                {serie.map((m, i) => (
                  <td key={i} className={`report-pickup__num report-pickup__delta report-pickup__delta--${m.pickup >= 0 ? 'up' : 'down'}`}>
                    {m.pickup > 0 ? '+' : ''}{fmtNum(m.pickup)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="report-pickup__time-head">Importo</td>
                {serie.map((m, i) => <td key={i} className="report-pickup__num">{fmtEur(m.imp)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Slider di scorrimento giorni in overlay: muove grafico e tabella insieme */}
        <div className="report-pickup__slider">
          <i className="fa-light fa-calendar-days report-pickup__slider-ico" />
          <input
            type="range"
            min={0} max={1000} step={1}
            value={Math.round(scrollPct * 1000)}
            onChange={(e) => applyScroll(Number(e.target.value) / 1000, 'slider')}
            aria-label="Scorri i giorni"
          />
          <span className="report-pickup__slider-hint">Scorri i giorni</span>
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
