import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import { SelectField, DateRangeField } from '../../../core/components/form'
import { useAccessStore } from '../../../store/useAccessStore'
import './ExecutiveOverview.sass'
import { useStrutturaCorrente, useStruttureCliente } from '../../../hooks/useStrutturaCorrente'
import type { SchedaDemo } from '../../../core/demo/struttureDemo'

// ─── EXECUTIVE OVERVIEW ─────────────────────────────────────────────────────────
//  Dashboard integrata di sintesi delle performance d'impresa. Pagina CONDIVISA:
//  variante Tour Operator (analisi per destinazione, mercati, KPI di marginalità
//  e conversione preventivi) e variante hotel/altri moduli. Dati mock deterministici
//  lato client, in attesa del cablaggio con i dati reali di vendita/booking/finance.

// ── Variante per modulo ───────────────────────────────────────────────────────────
type Variant = 'to' | 'hotel'

interface KpiDef {
  key: string
  label: string
  icon: string
  color: string
  value: string
  deltaLabel: string
  deltaUp: boolean
  spark: number[]
}

interface PieSlice { name: string; val: number; color: string }

interface VariantCfg {
  selLabel: string
  selAll: string
  sel: string[]
  pieTitle: string
  pieSub: string
  pie: PieSlice[]
  trend1: string
  trend2: string
  kpis: KpiDef[]
}

const CHART_C = {
  ty: '#204769',
  fc: '#E0A83B',
  ly: '#C3C9D0',
  margin: '#5A8A3C',
}

const NAV: { label: string; page: string; icon: string }[] = [
  { label: 'Sales overview',    page: 'sales-overview',      icon: 'fa-chart-column' },
  { label: 'Value analysis',    page: 'value-analysis',      icon: 'fa-gem' },
  { label: 'Market lens',       page: 'market-lens',         icon: 'fa-magnifying-glass-chart' },
  { label: 'Distribuzione',     page: 'analisi-dist-sales',  icon: 'fa-diagram-project' },
  { label: 'Finance overview',  page: 'finance-overview',    icon: 'fa-coins' },
  { label: 'Monitoraggio',      page: 'monitoraggio-pratiche', icon: 'fa-list-check' },
]

const VARIANTS: Record<Variant, VariantCfg> = {
  to: {
    selLabel: 'Destinazione',
    selAll: 'Tutte le destinazioni',
    sel: ['Mar Rosso', 'Maldive', 'Andalusia', 'Grecia & Isole', 'Tour Capitali'],
    pieTitle: 'Mercati a maggior profitto',
    pieSub: 'Quota di margine generata per destinazione',
    pie: [
      { name: 'Mar Rosso',      val: 32, color: '#204769' },
      { name: 'Maldive',        val: 24, color: '#E07B39' },
      { name: 'Grecia & Isole', val: 18, color: '#5A8A3C' },
      { name: 'Andalusia',      val: 15, color: '#9B59B6' },
      { name: 'Tour Capitali',  val: 11, color: '#5C9CD4' },
    ],
    trend1: 'Ricavi + previsione',
    trend2: 'Margine + previsione',
    kpis: [
      { key: 'margine', label: 'Margine lordo medio', icon: 'fa-percent', color: '#5A8A3C',
        value: '24,8%', deltaLabel: '+3,1 pt YoY', deltaUp: true, spark: [19, 20, 21, 20, 22, 23, 24, 24, 25, 24, 25, 25] },
      { key: 'conv', label: 'Conversione preventivi', icon: 'fa-bullseye', color: '#204769',
        value: '38%', deltaLabel: '+5 pt YoY', deltaUp: true, spark: [28, 30, 29, 32, 33, 34, 33, 35, 36, 37, 38, 38] },
      { key: 'ticket', label: 'Ricavo medio per pratica', icon: 'fa-receipt', color: '#E07B39',
        value: '€ 4.250', deltaLabel: '+8% YoY', deltaUp: true, spark: [3600, 3700, 3850, 3800, 3950, 4050, 4100, 4180, 4200, 4230, 4250, 4250] },
    ],
  },
  hotel: {
    selLabel: 'Struttura',
    selAll: 'Tutte le strutture',
    sel: ['Hotel Archimede', 'Hotel Noto', 'Grand Hotel Roma'],
    pieTitle: 'Segmenti a maggior profitto',
    pieSub: 'Quota di margine generata per segmento',
    pie: [
      { name: 'Diretto',       val: 34, color: '#204769' },
      { name: 'OTA',           val: 28, color: '#E07B39' },
      { name: 'Tour Operator', val: 20, color: '#9B59B6' },
      { name: 'Corporate',     val: 18, color: '#5C9CD4' },
    ],
    trend1: 'Ricavi + previsione',
    trend2: 'Margine + previsione',
    kpis: [
      { key: 'revpar', label: 'RevPAR', icon: 'fa-bed', color: '#204769',
        value: '€ 112', deltaLabel: '+6% YoY', deltaUp: true, spark: [88, 92, 95, 98, 104, 110, 118, 120, 116, 108, 100, 112] },
      { key: 'adr', label: 'ADR', icon: 'fa-euro-sign', color: '#5A8A3C',
        value: '€ 168', deltaLabel: '+4% YoY', deltaUp: true, spark: [150, 152, 158, 160, 165, 170, 175, 176, 172, 166, 160, 168] },
      { key: 'gop', label: 'GOP', icon: 'fa-sack-dollar', color: '#E07B39',
        value: '€ 1,2M', deltaLabel: '+9% YoY', deltaUp: true, spark: [80, 85, 92, 98, 110, 125, 140, 138, 120, 100, 88, 96] },
    ],
  },
}

// ── Serie temporale (mock deterministico) ─────────────────────────────────────────
const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
// Ultimo mese consuntivato = il mese in corso: forecast da qui in avanti.
const CUT = new Date().getMonth()
// Curva stagionale TO (picco estivo), valori in € (base migliaia)
const REV_K = [120, 108, 176, 232, 340, 520, 610, 585, 430, 268, 176, 214]
const MARG_PCT = 0.235

interface Point {
  mese: string
  revTY: number | null
  revFc: number | null
  revLY: number
  margTY: number | null
  margFc: number | null
  margLY: number
}

function buildSerie(scale: number): Point[] {
  return MESI.map((mese, i) => {
    const rev = Math.round(REV_K[i] * 1000 * scale)
    const revLY = Math.round(rev * (0.82 + ((i * 7) % 11) / 100))
    const marg = Math.round(rev * MARG_PCT)
    const margLY = Math.round(revLY * (MARG_PCT - 0.02))
    return {
      mese,
      revTY: i <= CUT ? rev : null,
      revFc: i >= CUT ? rev : null,
      revLY,
      margTY: i <= CUT ? marg : null,
      margFc: i >= CUT ? marg : null,
      margLY,
    }
  })
}

// ── Performance per struttura (variante hotel) ─────────────────────────────────
//  Dalle schede demo delle strutture del cliente: ADR per categoria, occupazione,
//  ricavo annuo e GOP sempre uguali per la stessa struttura. Ristoranti e bar
//  (senza camere) parlano di coperti e scontrino medio.
const SUM_REV = REV_K.reduce((a, b) => a + b, 0) * 1000
const SPARK = [0.79, 0.82, 0.85, 0.88, 0.93, 0.98, 1.05, 1.07, 1.04, 0.96, 0.89, 1]
const fmtMln = (n: number) => (n >= 1e6
  ? `€ ${(n / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 1 })}M`
  : `€ ${Math.round(n / 1000).toLocaleString('it-IT')}k`)

function performanceDi(schede: SchedaDemo[]): { scale: number; kpis: KpiDef[]; pie: PieSlice[] } {
  const righe = schede.map(s => {
    const k = (s.seme % 20) / 100
    const ristorazione = s.camere === 0
    const adr = ristorazione ? 32 + (s.seme % 25)
      : (s.stelle >= 5 ? 230 : s.stelle === 4 ? 150 : s.stelle === 3 ? 105 : 85) * (0.9 + k)
    const occ = 0.62 + (s.seme % 21) / 100
    const coperti = Math.round(120 * (0.7 + k))
    const annuo = ristorazione ? coperti * adr * 330 : s.camere * adr * occ * 365
    return { s, adr, occ, coperti, annuo, ristorazione, gop: 0.3 + (s.seme % 13) / 100, yoy: 2 + (s.seme % 10) }
  })
  if (!righe.length) return { scale: 0, kpis: [], pie: [] }
  const hotel = righe.filter(r => !r.ristorazione)
  const base = hotel.length ? hotel : righe
  const camere = hotel.reduce((a, r) => a + r.s.camere, 0)
  const annuo = righe.reduce((a, r) => a + r.annuo, 0)
  const gop = righe.reduce((a, r) => a + r.annuo * r.gop, 0)
  const yoy = Math.round(righe.reduce((a, r) => a + r.yoy, 0) / righe.length)
  const seme = righe.reduce((a, r) => a + r.s.seme, 0)
  const spark = (v: number) => SPARK.map(x => Math.round(v * x))
  let kpis: KpiDef[]
  if (hotel.length) {
    const adr = Math.round(hotel.reduce((a, r) => a + r.adr * r.s.camere, 0) / camere)
    const occ = hotel.reduce((a, r) => a + r.occ * r.s.camere, 0) / camere
    const revpar = Math.round(adr * occ)
    kpis = [
      { key: 'revpar', label: 'RevPAR', icon: 'fa-bed', color: '#204769', value: `€ ${revpar}`, deltaLabel: `+${yoy}% YoY`, deltaUp: true, spark: spark(revpar) },
      { key: 'adr', label: 'ADR', icon: 'fa-euro-sign', color: '#5A8A3C', value: `€ ${adr}`, deltaLabel: `+${Math.max(1, yoy - 2)}% YoY`, deltaUp: true, spark: spark(adr) },
      { key: 'gop', label: 'GOP', icon: 'fa-sack-dollar', color: '#E07B39', value: fmtMln(gop), deltaLabel: `+${yoy + 3}% YoY`, deltaUp: true, spark: spark(gop / 1000) },
    ]
  } else {
    const coperti = base.reduce((a, r) => a + r.coperti, 0)
    const scontrino = Math.round(base.reduce((a, r) => a + r.adr, 0) / base.length)
    kpis = [
      { key: 'coperti', label: 'Coperti al giorno', icon: 'fa-utensils', color: '#204769', value: String(coperti), deltaLabel: `+${yoy}% YoY`, deltaUp: true, spark: spark(coperti) },
      { key: 'scontrino', label: 'Scontrino medio', icon: 'fa-receipt', color: '#5A8A3C', value: `€ ${scontrino}`, deltaLabel: `+${Math.max(1, yoy - 2)}% YoY`, deltaUp: true, spark: spark(scontrino) },
      { key: 'gop', label: 'GOP', icon: 'fa-sack-dollar', color: '#E07B39', value: fmtMln(gop), deltaLabel: `+${yoy + 3}% YoY`, deltaUp: true, spark: spark(gop / 1000) },
    ]
  }
  const pie: PieSlice[] = hotel.length ? [
    { name: 'Diretto',       val: 30 + (seme % 10),        color: '#204769' },
    { name: 'OTA',           val: 24 + ((seme >> 3) % 10), color: '#E07B39' },
    { name: 'Tour Operator', val: 15 + ((seme >> 5) % 10), color: '#9B59B6' },
    { name: 'Corporate',     val: 12 + ((seme >> 7) % 8),  color: '#5C9CD4' },
  ] : [
    { name: 'Sala',          val: 48 + (seme % 10),        color: '#204769' },
    { name: 'Prenotazioni online', val: 22 + ((seme >> 3) % 8), color: '#E07B39' },
    { name: 'Eventi',        val: 14 + ((seme >> 5) % 8),  color: '#9B59B6' },
    { name: 'Asporto',       val: 8 + ((seme >> 7) % 6),   color: '#5C9CD4' },
  ]
  // Quote in percentuale (somma 100): centro della ciambella e legenda coincidono.
  const tot = pie.reduce((a, x) => a + x.val, 0)
  const quote = [...pie].sort((a, b) => b.val - a.val).map(x => ({ ...x, val: Math.round((x.val / tot) * 100) }))
  quote[0].val += 100 - quote.reduce((a, x) => a + x.val, 0)
  return { scale: annuo / SUM_REV, kpis, pie: quote }
}

const fmtEurK = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })}k €` : `${n} €`)
const fmtAxis = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

// ── Tooltip trend ──────────────────────────────────────────────────────────────
function TrendTip({ active, payload, label, names }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="exo-tip">
      <span className="exo-tip__label">{label} 2026</span>
      {payload.filter((p: any) => p.value != null).map((p: any) => (
        <span key={p.dataKey} className="exo-tip__row">
          <span className="exo-tip__dot" style={{ background: p.stroke || p.color }} />
          <span className="exo-tip__name">{names[p.dataKey] ?? p.dataKey}</span>
          <span className="exo-tip__val">{fmtEurK(p.value)}</span>
        </span>
      ))}
    </div>
  )
}

// ── Grafico trend riusabile (attuale + forecast + anno scorso) ──────────────────
function TrendChart({ data, tyKey, fcKey, lyKey, tyColor, title, subtitle, badge, names }: {
  data: Point[]
  tyKey: string; fcKey: string; lyKey: string
  tyColor: string
  title: string; subtitle: string; badge: string
  names: Record<string, string>
}) {
  const gid = `exo-grad-${tyKey}`
  return (
    <div className="exo-trend">
      <div className="exo-trend__head">
        <div className="exo-trend__badge">{badge}</div>
        <div className="exo-trend__titles">
          <span className="exo-trend__title">{title}</span>
          <span className="exo-trend__sub">{subtitle}</span>
        </div>
        <div className="exo-trend__legend">
          <span className="exo-trend__leg"><span className="exo-trend__leg-dot" style={{ background: tyColor }} /> {names[tyKey]}</span>
          <span className="exo-trend__leg"><span className="exo-trend__leg-dot" style={{ background: CHART_C.fc }} /> {names[fcKey]}</span>
          <span className="exo-trend__leg"><span className="exo-trend__leg-dot" style={{ background: CHART_C.ly }} /> {names[lyKey]}</span>
        </div>
      </div>
      <div className="exo-trend__chart">
        <ResponsiveContainer width="100%" height={210}>
          <ComposedChart data={data} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tyColor} stopOpacity={0.26} />
                <stop offset="100%" stopColor={tyColor} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`${gid}-fc`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_C.fc} stopOpacity={0.24} />
                <stop offset="100%" stopColor={CHART_C.fc} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E0E7EE" vertical={false} />
            <XAxis dataKey="mese" tick={{ fontSize: 11, fill: '#6E7175' }} tickLine={false} axisLine={{ stroke: '#C3C9D0' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6E7175' }} tickLine={false} axisLine={false} width={42} tickFormatter={fmtAxis} />
            <RTooltip content={<TrendTip names={names} />} cursor={{ stroke: '#C3C9D0', strokeDasharray: '3 3' }} />
            <Area type="monotone" dataKey={lyKey} stroke={CHART_C.ly} strokeWidth={1.5} fill={CHART_C.ly} fillOpacity={0.12} dot={false} connectNulls />
            <Area type="monotone" dataKey={fcKey} stroke={CHART_C.fc} strokeWidth={2} strokeDasharray="5 3" fill={`url(#${gid}-fc)`} dot={false} connectNulls />
            <Area type="monotone" dataKey={tyKey} stroke={tyColor} strokeWidth={2.4} fill={`url(#${gid})`} dot={false} activeDot={{ r: 4 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Pagina ────────────────────────────────────────────────────────────────────────
export default function ExecutiveOverview({ navigate }: { navigate: (p: string) => void }) {
  // Variante per modulo (Tour Operator vs hotel/altri) — come Analisi distribuzione.
  const currentProfileId = useAccessStore((s) => s.currentProfileId)
  const assist = useAccessStore((s) => s.assist)
  const profiles = useAccessStore((s) => s.profiles)
  const moduli = assist ? assist.moduli : currentProfileId ? profiles.find((p) => p.id === currentProfileId)?.moduli : undefined
  const variant: Variant = moduli?.includes('tour-operator') ? 'to' : 'hotel'
  // Le strutture del confronto sono quelle del cliente corrente.
  const { elenco: struttureCliente } = useStrutturaCorrente()
  const V0 = VARIANTS[variant]
  const V = useMemo(() => (V0.selLabel === 'Struttura' ? { ...V0, sel: struttureCliente } : V0), [V0, struttureCliente])

  // Variante hotel: si parte dalla struttura selezionata in alto (e la si segue).
  const schede = useStruttureCliente()
  const { struttura: strutturaCorrente } = useStrutturaCorrente()
  const [sel, setSel] = useState(variant === 'hotel' ? strutturaCorrente : V.selAll)
  useEffect(() => { if (variant === 'hotel') setSel(strutturaCorrente) }, [variant, strutturaCorrente])
  const perf = useMemo(
    () => performanceDi(sel === V.selAll ? schede : schede.filter(s => s.nome === sel)),
    [sel, schede, V.selAll],
  )
  const kpis = variant === 'hotel' ? perf.kpis : V.kpis
  const pie = variant === 'hotel' ? perf.pie : V.pie
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo, setDateTo] = useState('2026-12-31')

  // Scala i dati in base alla selezione (tutte vs singola destinazione/struttura).
  const scale = variant === 'hotel' ? perf.scale : sel === V.selAll ? 1 : 0.32 + (V.sel.indexOf(sel) % 3) * 0.12
  const serie = useMemo(() => buildSerie(scale), [scale])

  const forecastProfit = useMemo(
    () => serie.reduce((s, p) => s + (p.margFc ?? 0), 0) - (serie[CUT].margFc ?? 0),
    [serie],
  )
  const pieTotal = pie.reduce((s, p) => s + p.val, 0)

  const names1 = { revTY: 'Ricavi', revFc: 'Previsione', revLY: 'Anno scorso' }
  const names2 = { margTY: 'Margine', margFc: 'Previsione', margLY: 'Anno scorso' }

  return (
    <div className="exo">
      <PageHead
        title="Executive overview"
        subtitle="Dashboard integrata di sintesi per le performance d'impresa"
      />

      {/* ── Navigazione BI ──────────────────────────────────────────────────── */}
      <nav className="exo__nav" aria-label="Pagine BI">
        <div className="exo__nav-btns">
          {NAV.map((n) => (
            <button key={n.page} type="button" className="exo__navbtn" onClick={() => navigate(n.page)} title={`Vai a ${n.label}`}>
              <span className="exo__navbtn-ico"><i className={`fa-solid ${n.icon}`} aria-hidden="true" /></span>
              <span className="exo__navbtn-lbl">{n.label}</span>
            </button>
          ))}
        </div>
        <div className="exo__forecast">
          <span className="exo__forecast-lbl">Forecast profit</span>
          <span className="exo__forecast-val">{fmtEurK(forecastProfit)}</span>
        </div>
      </nav>

      {/* ── Filtri ──────────────────────────────────────────────────────────── */}
      <div className="exo__filters">
        <SelectField
          label={V.selLabel}
          name="selezione"
          className="exo__sel"
          value={sel}
          options={[{ value: V.selAll, label: V.selAll }, ...V.sel.map((s) => ({ value: s, label: s }))]}
          onChange={(e) => setSel(e.target.value)}
        />
        <DateRangeField
          label="Periodo"
          nameFrom="dateFrom"
          nameTo="dateTo"
          valueFrom={dateFrom}
          valueTo={dateTo}
          onChangeFrom={(e) => setDateFrom(e.target.value)}
          onChangeTo={(e) => setDateTo(e.target.value)}
        />
      </div>

      {/* ── Trend (sx) + Mercati (dx) ───────────────────────────────────────── */}
      <div className="exo__main">
        <div className="exo__trends">
          <TrendChart
            data={serie}
            tyKey="revTY" fcKey="revFc" lyKey="revLY" tyColor={CHART_C.ty}
            title={V.trend1} subtitle="Consuntivo, previsione e confronto anno precedente"
            badge={fmtEurK(serie.filter((p) => p.revTY != null).reduce((s, p) => s + (p.revTY ?? 0), 0))}
            names={names1}
          />
          <TrendChart
            data={serie}
            tyKey="margTY" fcKey="margFc" lyKey="margLY" tyColor={CHART_C.margin}
            title={V.trend2} subtitle="Marginalità consuntivata e prevista"
            badge={fmtEurK(serie.filter((p) => p.margTY != null).reduce((s, p) => s + (p.margTY ?? 0), 0))}
            names={names2}
          />
        </div>

        {/* Donut mercati a maggior profitto */}
        <div className="exo__pie">
          <div className="exo__pie-head">
            <span className="exo__pie-title">{V.pieTitle}</span>
            <span className="exo__pie-sub">{V.pieSub}</span>
          </div>
          <div className="exo__pie-chart">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pie} dataKey="val" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={3} stroke="none">
                  {pie.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <RTooltip formatter={(v: any, n: any) => [`${v}%`, n]} contentStyle={{ borderRadius: 8, border: '1px solid #E0E7EE', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="exo__pie-center">
              <span className="exo__pie-center-val">{pie[0]?.val}%</span>
              <span className="exo__pie-center-lbl">{pie[0]?.name}</span>
            </div>
          </div>
          <ul className="exo__pie-legend">
            {pie.map((s) => (
              <li key={s.name}>
                <span className="exo__pie-dot" style={{ background: s.color }} />
                <span className="exo__pie-name">{s.name}</span>
                <span className="exo__pie-val">{Math.round((s.val / pieTotal) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── KPI riepilogativi (3 card specifiche) ───────────────────────────── */}
      <div className="exo__kpis">
        {kpis.map((k) => (
          <div key={k.key} className="exo__kpi">
            <div className="exo__kpi-top">
              <span className="exo__kpi-ico" style={{ ['--kc' as any]: k.color }}><i className={`fa-solid ${k.icon}`} aria-hidden="true" /></span>
              <span className="exo__kpi-label">{k.label}</span>
              <Tooltip text={`${k.label}: variazione rispetto all'anno precedente`}>
                <i className="fa-solid fa-circle-info exo__kpi-info" aria-hidden="true" />
              </Tooltip>
            </div>
            <div className="exo__kpi-body">
              <div className="exo__kpi-figures">
                <span className="exo__kpi-val">{k.value}</span>
                <span className={`exo__kpi-delta ${k.deltaUp ? 'is-up' : 'is-down'}`}>
                  <i className={`fa-solid fa-arrow-${k.deltaUp ? 'up' : 'down'}`} aria-hidden="true" /> {k.deltaLabel}
                </span>
              </div>
              <div className="exo__kpi-spark">
                <ResponsiveContainer width="100%" height={48}>
                  <LineChart data={k.spark.map((v, i) => ({ i, v }))} margin={{ top: 6, right: 2, left: 2, bottom: 2 }}>
                    <Line type="monotone" dataKey="v" stroke={k.color} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
