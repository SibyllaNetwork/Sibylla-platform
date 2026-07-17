import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts'
import PageHead from '../../../../core/components/PageHead'
import { SelectField, DateRangeField } from '../../../../core/components/form'
import './ValueAnalysis.sass'

// ─── VALUE ANALYSIS ─────────────────────────────────────────────────────────────
//  Pagina BI (Sales & Marketing › Pricing Intelligence) dedicata all'analisi delle
//  performance commerciali del Tour Operator. Consente di monitorare e confrontare
//  i principali indicatori (occupazione, markup, ADR, ricavi) e di visualizzarne
//  l'andamento nel tempo e il confronto per destinazione. Dati mock deterministici
//  lato client (in attesa del cablaggio con i dati reali di vendita/booking).

// ── Indicatori ──────────────────────────────────────────────────────────────────
type MetricKey = 'occ' | 'markup' | 'adr' | 'revenue'

interface MetricMeta {
  label: string
  unit: '%' | '€'
  axis: 'left' | 'right'
  color: string
  icon: string
  fmt: (n: number) => string
}

const METRICS: Record<MetricKey, MetricMeta> = {
  occ:     { label: 'Occupazione', unit: '%', axis: 'left',  color: '#204769', icon: 'fa-bed',         fmt: (n) => `${n}%` },
  markup:  { label: 'Markup',      unit: '%', axis: 'left',  color: '#E07B39', icon: 'fa-percent',     fmt: (n) => `${n}%` },
  adr:     { label: 'ADR',         unit: '€', axis: 'right', color: '#5A8A3C', icon: 'fa-euro-sign',   fmt: (n) => `€ ${n.toLocaleString('it-IT')}` },
  revenue: { label: 'Ricavi',      unit: '€', axis: 'right', color: '#9B59B6', icon: 'fa-sack-dollar', fmt: (n) => `€ ${Math.round(n).toLocaleString('it-IT')}` },
}
const METRIC_KEYS: MetricKey[] = ['occ', 'markup', 'adr', 'revenue']

// ── Destinazioni (allineate all'Analisi della distribuzione TO) ──────────────────
const DESTINAZIONI = ['Mar Rosso', 'Maldive', 'Andalusia', 'Grecia & Isole', 'Tour Capitali']

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
// Andamento stagionale (TO a forte componente balneare): picco estivo + bump festività.
const STAGIONALITA = [0.62, 0.60, 0.68, 0.78, 0.86, 0.95, 1.0, 0.98, 0.88, 0.75, 0.63, 0.72]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

interface MonthPoint {
  mese: string
  occ: number
  markup: number
  adr: number
  revenue: number
  // valori dello stesso mese dell'anno precedente (per il Δ YoY)
  occLY: number
  markupLY: number
  adrLY: number
  revenueLY: number
}

// Serie deterministica per destinazione: 12 mesi con valori correnti e anno precedente.
function serieDestinazione(dest: string): MonthPoint[] {
  const h = hashStr(dest)
  const biasOcc = (h % 14) - 6          // -6 … +7
  const biasMk = ((h >> 3) % 9) - 3     // -3 … +5
  const biasAdr = ((h >> 5) % 60) - 20  // -20 … +39
  return MESI.map((mese, i) => {
    const s = STAGIONALITA[i]
    const occ = clamp(Math.round(58 * s + biasOcc + (i % 2 === 0 ? 2 : 0)), 28, 97)
    const markup = clamp(Math.round(16 + (occ - 58) * 0.28 + biasMk), 8, 42)
    const adr = Math.round(92 + occ * 1.05 + biasAdr)
    // ricavi ≈ ADR × room-night proporzionali all'occupazione
    const revenue = Math.round(adr * occ * 42)
    const yoy = 0.86 + ((h >> (i % 5)) % 12) / 100 // 0.86 … 0.97
    return {
      mese,
      occ, markup, adr, revenue,
      occLY: clamp(Math.round(occ * yoy), 20, 99),
      markupLY: Math.round(markup * (yoy + 0.02)),
      adrLY: Math.round(adr * (yoy + 0.03)),
      revenueLY: Math.round(revenue * (yoy - 0.02)),
    }
  })
}

const eur = (n: number) => `€ ${Math.round(n).toLocaleString('it-IT')}`
const eurK = (n: number) => `€ ${Math.round(n / 1000).toLocaleString('it-IT')}k`
const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1)

// Δ percentuale tra due valori
function deltaPct(cur: number, prev: number): number {
  if (!prev) return 0
  return Math.round(((cur - prev) / prev) * 1000) / 10
}

// Badge Δ inline (verde se in crescita, rosso se in calo)
function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="va-delta va-delta--flat">±0%</span>
  const up = value > 0
  return (
    <span className={`va-delta ${up ? 'va-delta--up' : 'va-delta--down'}`}>
      <i className={`fa-solid fa-arrow-${up ? 'up' : 'down'}`} aria-hidden="true" />
      {up ? '+' : ''}{value}%
    </span>
  )
}

// ── Tooltip grafico ──────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="va-charttip">
      <span className="va-charttip__label">{label} 2026</span>
      {payload.map((p: any) => {
        const meta = METRICS[p.dataKey as MetricKey]
        if (!meta) return null
        return (
          <span key={p.dataKey} className="va-charttip__row">
            <span className="va-charttip__dot" style={{ background: meta.color }} />
            <span className="va-charttip__name">{meta.label}</span>
            <span className="va-charttip__val">{meta.fmt(p.value)}</span>
          </span>
        )
      })}
    </div>
  )
}

// ── Pagina ───────────────────────────────────────────────────────────────────────
export default function ValueAnalysis({ navigate }: { navigate: (p: string) => void }) {
  const [dest, setDest] = useState(DESTINAZIONI[0])
  const [dateFrom, setDateFrom] = useState('2026-01-01')
  const [dateTo, setDateTo] = useState('2026-12-31')
  const [active, setActive] = useState<Record<MetricKey, boolean>>({ occ: true, markup: true, adr: false, revenue: false })

  const toggle = (k: MetricKey) =>
    setActive((a) => {
      const next = { ...a, [k]: !a[k] }
      // almeno un indicatore sempre attivo
      if (!Object.values(next).some(Boolean)) return a
      return next
    })

  const serie = useMemo(() => serieDestinazione(dest), [dest])

  // Sintesi anno (media occ/markup/adr, somma ricavi) + Δ vs anno precedente.
  const sintesi = useMemo(() => {
    const occM = Math.round(avg(serie.map((p) => p.occ)))
    const occLY = Math.round(avg(serie.map((p) => p.occLY)))
    const mkM = Math.round(avg(serie.map((p) => p.markup)))
    const mkLY = Math.round(avg(serie.map((p) => p.markupLY)))
    const adrM = Math.round(avg(serie.map((p) => p.adr)))
    const adrLY = Math.round(avg(serie.map((p) => p.adrLY)))
    const revT = serie.reduce((s, p) => s + p.revenue, 0)
    const revLY = serie.reduce((s, p) => s + p.revenueLY, 0)
    return {
      occ: occM, occD: deltaPct(occM, occLY),
      markup: mkM, markupD: deltaPct(mkM, mkLY),
      adr: adrM, adrD: deltaPct(adrM, adrLY),
      revenue: revT, revenueD: deltaPct(revT, revLY),
    }
  }, [serie])

  // Confronto tra destinazioni: media occ/markup/adr e ricavi totali per ciascuna.
  const confronto = useMemo(() => {
    const rows = DESTINAZIONI.map((d) => {
      const s = serieDestinazione(d)
      return {
        dest: d,
        occ: Math.round(avg(s.map((p) => p.occ))),
        markup: Math.round(avg(s.map((p) => p.markup))),
        adr: Math.round(avg(s.map((p) => p.adr))),
        revenue: s.reduce((a, p) => a + p.revenue, 0),
      }
    })
    return {
      rows,
      maxOcc: Math.max(...rows.map((r) => r.occ)),
      maxMk: Math.max(...rows.map((r) => r.markup)),
    }
  }, [])

  const SINTESI: { key: MetricKey; val: number; d: number }[] = [
    { key: 'occ', val: sintesi.occ, d: sintesi.occD },
    { key: 'markup', val: sintesi.markup, d: sintesi.markupD },
    { key: 'adr', val: sintesi.adr, d: sintesi.adrD },
    { key: 'revenue', val: sintesi.revenue, d: sintesi.revenueD },
  ]

  const usaAsseSx = METRIC_KEYS.some((k) => active[k] && METRICS[k].axis === 'left')
  const usaAsseDx = METRIC_KEYS.some((k) => active[k] && METRICS[k].axis === 'right')

  return (
    <div className="va">
      <PageHead
        title="Value analysis"
        subtitle="Monitora e confronta le performance commerciali — occupazione, markup e ricavi — e osservane l'andamento nel tempo"
      />

      {/* ── Filtri ──────────────────────────────────────────────────────────── */}
      <div className="va__filters">
        <SelectField
          label="Destinazione"
          name="destinazione"
          className="va__dest"
          value={dest}
          options={DESTINAZIONI.map((d) => ({ value: d, label: d }))}
          onChange={(e) => setDest(e.target.value)}
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

      {/* ── Andamento nel tempo ─────────────────────────────────────────────── */}
      <section className="va__panel">
        <div className="va__panel-head">
          <div className="va__panel-title">
            <h2>Andamento nel tempo</h2>
            <p>Evoluzione mensile degli indicatori per <strong>{dest}</strong> · 2026</p>
          </div>
          <div className="va__metric-toggle" role="group" aria-label="Indicatori da visualizzare">
            {METRIC_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={`va__chip ${active[k] ? 'is-on' : ''}`}
                style={active[k] ? { ['--chip' as any]: METRICS[k].color } : undefined}
                onClick={() => toggle(k)}
                aria-pressed={active[k]}
              >
                <i className={`fa-solid ${METRICS[k].icon}`} aria-hidden="true" />
                {METRICS[k].label}
              </button>
            ))}
          </div>
        </div>

        {/* Sintesi indicatori (integrata nel pannello, non come header di pagina) */}
        <div className="va__summary">
          {SINTESI.map((s) => {
            const m = METRICS[s.key]
            return (
              <div key={s.key} className={`va__summary-item ${active[s.key] ? 'is-active' : ''}`}>
                <span className="va__summary-label" style={{ ['--dot' as any]: m.color }}>{m.label}</span>
                <span className="va__summary-val">{m.fmt(s.val)}</span>
                <Delta value={s.d} />
              </div>
            )
          })}
        </div>

        <div className="va__chart">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={serie} margin={{ top: 12, right: 8, left: -6, bottom: 4 }}>
              <defs>
                <linearGradient id="va-occ" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={METRICS.occ.color} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={METRICS.occ.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E0E7EE" vertical={false} />
              <XAxis dataKey="mese" tick={{ fontSize: 11, fill: '#6E7175' }} tickLine={false} axisLine={{ stroke: '#C3C9D0' }} />
              {usaAsseSx && (
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6E7175' }} tickLine={false} axisLine={false} width={38} unit="%" />
              )}
              {usaAsseDx && (
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#6E7175' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
              )}
              <RTooltip content={<ChartTip />} cursor={{ stroke: '#C3C9D0', strokeDasharray: '3 3' }} />

              {active.occ && (
                <Area yAxisId="left" type="monotone" dataKey="occ" stroke={METRICS.occ.color} strokeWidth={2} fill="url(#va-occ)" dot={false} activeDot={{ r: 4 }} />
              )}
              {active.markup && (
                <Line yAxisId="left" type="monotone" dataKey="markup" stroke={METRICS.markup.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              )}
              {active.adr && (
                <Line yAxisId="right" type="monotone" dataKey="adr" stroke={METRICS.adr.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              )}
              {active.revenue && (
                <Bar yAxisId="right" dataKey="revenue" fill={METRICS.revenue.color} fillOpacity={0.28} radius={[3, 3, 0, 0]} maxBarSize={22} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ── Confronto per destinazione ──────────────────────────────────────── */}
      <section className="va__panel">
        <div className="va__panel-head">
          <div className="va__panel-title">
            <h2>Confronto per destinazione</h2>
            <p>Media annua di occupazione e markup, ADR e ricavi totali per destinazione</p>
          </div>
        </div>
        <div className="va__cmp">
          {confronto.rows.map((r) => (
            <button
              key={r.dest}
              type="button"
              className={`va__cmp-row ${r.dest === dest ? 'is-selected' : ''}`}
              onClick={() => setDest(r.dest)}
              title={`Analizza ${r.dest}`}
            >
              <span className="va__cmp-name">
                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                {r.dest}
              </span>
              <span className="va__cmp-bars">
                <span className="va__cmp-bar">
                  <span className="va__cmp-bar-lbl">Occupazione</span>
                  <span className="va__cmp-track">
                    <span className="va__cmp-fill" style={{ width: `${(r.occ / confronto.maxOcc) * 100}%`, background: METRICS.occ.color }} />
                  </span>
                  <span className="va__cmp-val">{r.occ}%</span>
                </span>
                <span className="va__cmp-bar">
                  <span className="va__cmp-bar-lbl">Markup</span>
                  <span className="va__cmp-track">
                    <span className="va__cmp-fill" style={{ width: `${(r.markup / confronto.maxMk) * 100}%`, background: METRICS.markup.color }} />
                  </span>
                  <span className="va__cmp-val">{r.markup}%</span>
                </span>
              </span>
              <span className="va__cmp-metrics">
                <span className="va__cmp-metric"><span className="va__cmp-metric-lbl">ADR</span>{eur(r.adr)}</span>
                <span className="va__cmp-metric"><span className="va__cmp-metric-lbl">Ricavi</span>{eurK(r.revenue)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Dettaglio mensile ───────────────────────────────────────────────── */}
      <section className="va__panel">
        <div className="va__panel-head">
          <div className="va__panel-title">
            <h2>Dettaglio mensile · {dest}</h2>
            <p>Valori mese per mese con variazione rispetto al mese precedente</p>
          </div>
        </div>
        <div className="sib-table-wrap">
          <table className="sib-table va__table">
            <thead>
              <tr>
                <th>Mese</th>
                <th className="va__num">Occupazione</th>
                <th className="va__num">Markup</th>
                <th className="va__num">ADR</th>
                <th className="va__num">Ricavi</th>
              </tr>
            </thead>
            <tbody>
              {serie.map((p, i) => {
                const prev = serie[i - 1]
                return (
                  <tr key={p.mese}>
                    <td>{p.mese} 2026</td>
                    <td className="va__num"><span className="va__cell">{p.occ}%{prev && <Delta value={deltaPct(p.occ, prev.occ)} />}</span></td>
                    <td className="va__num"><span className="va__cell">{p.markup}%{prev && <Delta value={deltaPct(p.markup, prev.markup)} />}</span></td>
                    <td className="va__num"><span className="va__cell">{eur(p.adr)}{prev && <Delta value={deltaPct(p.adr, prev.adr)} />}</span></td>
                    <td className="va__num"><span className="va__cell">{eur(p.revenue)}{prev && <Delta value={deltaPct(p.revenue, prev.revenue)} />}</span></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="va__foot">
                <td>Media / Totale 2026</td>
                <td className="va__num">{sintesi.occ}%</td>
                <td className="va__num">{sintesi.markup}%</td>
                <td className="va__num">{eur(sintesi.adr)}</td>
                <td className="va__num">{eur(sintesi.revenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── Insight + CTA ───────────────────────────────────────────────────── */}
      <div className={`va__insight va__insight--${sintesi.markupD >= 0 ? 'ok' : 'warn'}`}>
        <div className="va__insight-icon">
          <i className={`fa-solid fa-${sintesi.markupD >= 0 ? 'arrow-trend-up' : 'triangle-exclamation'}`} aria-hidden="true" />
        </div>
        <div className="va__insight-body">
          <p className="va__insight-title">
            {sintesi.markupD >= 0 ? `Marginalità in crescita su ${dest}` : `Marginalità in calo su ${dest}`}
          </p>
          <p className="va__insight-text">
            Occupazione media <strong>{sintesi.occ}%</strong> ({sintesi.occD > 0 ? '+' : ''}{sintesi.occD}% YoY) e markup medio <strong>{sintesi.markup}%</strong> ({sintesi.markupD > 0 ? '+' : ''}{sintesi.markupD}% YoY).
            {sintesi.markupD >= 0
              ? ' Il posizionamento regge la marginalità: valuta un test tariffario nei mesi di picco per estrarre più valore.'
              : ' Verifica il posizionamento competitivo e riformula il markup nei mesi a bassa occupazione.'}
          </p>
        </div>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('market-lens')}>
          <i className="fa-light fa-magnifying-glass-chart" aria-hidden="true" /> Apri Market lens
        </button>
      </div>
    </div>
  )
}
