import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../../core/components/form'
import Tooltip from '../../../../core/components/Tooltip'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, KpiTile,
  CHART, cursorProps, fmtDelta, fmtEur, fmtInt, fmtPct, gridProps,
  reducedMotion, series, xAxisProps, yAxisProps,
} from '../../../../core/bi'
import { apiFetchSibylla } from '../../../../services/api'
import { MESI, GIORNI_SETTIMANA } from '../../_data/revenueMock'
import {
  buildCalendario, buildOccupancy, computeOccupancyKpi, type OccupancyData,
} from './occupancyAnalysis.data'
import './OccupancyAnalysis.sass'

// ─── OCCUPANCY ANALYSIS ─────────────────────────────────────────────────────────
//  L'occupazione del mese su quattro tagli, tutti nella stessa schermata:
//    • nel tempo, contro il budget e contro l'anno precedente
//    • nel calendario del mese (scala a una tinta: più scuro = più pieno)
//    • per tipologia di camera (dove restano le camere invendute)
//    • per giorno della settimana (dove si sfalda la settimana)
//  Impianto e regole grafiche dal kit `core/bi`.

export default function OccupancyAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [mese, setMese] = useState(8)
  const [vista, setVista] = useState<'trend' | 'calendario'>('trend')
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<OccupancyData> | null>(null)

  const mock = useMemo(() => buildOccupancy(anno, mese, strutturaId), [anno, mese, strutturaId])
  const data: OccupancyData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeOccupancyKpi(data), [data])
  const calendario = useMemo(() => buildCalendario(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<OccupancyData>>('operation/GetOccupazione', {
      method: 'POST',
      body: { strutturaId, anno, mese },
    })
      .then((d) => { if (!annullato && d) setRemoto(d) })
      .catch(() => { if (!annullato) setRemoto(null) })
      .finally(() => { if (!annullato) setLoading(false) })
    return () => { annullato = true }
  }, [strutturaId, anno, mese])

  const still = reducedMotion()
  const periodo = `${MESI[data.mese - 1]} ${data.anno}`

  return (
    <BiPage
      title="Occupancy analysis"
      subtitle={`Occupazione di ${periodo}: andamento, calendario, tipologie e giorni della settimana`}
      glossary={['occupazione', 'ADR', 'RevPAR', 'TY', 'LY', 'delta', 'complimentary', 'ALOS', 'ranking']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="oc__grid"
      toolbar={(
        <>
          <SelectField
            name="struttura" label="Struttura"
            value={strutturaId ?? ''}
            onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
            options={[
              { value: '', label: 'Tutte le strutture' },
              ...data.strutture.map((s) => ({ value: s.id, label: s.nome })),
            ]}
            className="oc__filter oc__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="oc__filter"
          />
          <SelectField
            name="mese" label="Mese" value={mese}
            onChange={(e) => setMese(Number(e.target.value))}
            options={MESI.map((m, i) => ({ value: i + 1, label: m }))}
            className="oc__filter"
          />
          <span className="oc__note">
            <i className="fa-solid fa-bed" aria-hidden="true" />
            {fmtInt(data.camereDisponibili)} camere × {data.giorni.length} notti ={' '}
            {fmtInt(kpi.notti)} camere disponibili
          </span>
        </>
      )}
    >
      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="oc__kpis">
        <KpiTile
          label="Occupazione" icon="fa-door-open" slot={0} index={0}
          value={kpi.occ} format={(n) => fmtPct(n)}
          delta={kpi.deltaOccLy}
          deltaLabel={`${fmtDelta(kpi.deltaOccLy, ' pt')} vs LY`}
          spark={kpi.sparkOcc}
          info="Camere vendute diviso camere disponibili nel mese. Il confronto è in punti percentuali."
        />
        <KpiTile
          label="Camere vendute" icon="fa-bed" slot={4} index={1}
          value={kpi.camereVendute} format={(n) => fmtInt(Math.round(n))}
          spark={kpi.sparkVendute}
          info="Notti camera vendute nel mese, sul totale delle camere disponibili."
        />
        <KpiTile
          label="Scostamento budget" icon="fa-bullseye" slot={3} index={2}
          value={kpi.deltaOccBudget} format={(n) => fmtDelta(n, ' pt')}
          delta={kpi.deltaOccBudget}
          deltaLabel={`${kpi.deltaOccBudget >= 0 ? 'sopra' : 'sotto'} obiettivo`}
          info="Differenza fra l'occupazione realizzata e quella di budget, in punti percentuali."
        />
        <KpiTile
          label="RevPAR" icon="fa-chart-simple" slot={6} index={3}
          value={kpi.revpar} format={(n) => fmtEur(n, 0)}
          spark={kpi.sparkRevpar}
          info="Ricavi camere diviso camere disponibili: tiene insieme prezzo e occupazione."
        />
        <KpiTile
          label="Fuori servizio" icon="fa-screwdriver-wrench" slot={5} index={4}
          value={kpi.fuoriServizio} format={(n) => fmtInt(Math.round(n))}
          delta={-2.4} deltaLabel="−2,4% vs LY" invertDelta
          info="Notti camera non vendibili per manutenzione, più le camere omaggio (complimentary)."
        />
      </div>

      {/* ── Andamento / calendario ────────────────────────────────────────── */}
      <ChartCard
        className="oc__main"
        index={0}
        title={`Occupazione giornaliera · ${periodo}`}
        subtitle="Realizzato, obiettivo di budget e anno precedente"
        badge={fmtPct(kpi.occ, 0)}
        legend={[
          { key: 'occ', name: 'Occupazione', color: series(0) },
          { key: 'bud', name: 'Budget', color: CHART.forecast, dashed: true },
          { key: 'ly', name: 'Anno precedente', color: CHART.ly },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'trend', label: 'Andamento' },
              { id: 'calendario', label: 'Calendario' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as 'trend' | 'calendario')}
          />
        )}
      >
        {vista === 'trend' ? (
          <div className="oc__chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.giorni} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="oc-occ" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series(0)} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval="preserveStartEnd" />
                {/* Un solo asse dei valori: tutte le serie sono percentuali */}
                <YAxis {...yAxisProps} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ occ: 'Occupazione', occBudget: 'Budget', occLY: 'Anno precedente' }}
                      format={(v) => fmtPct(v)}
                    />
                  )}
                />
                <Area
                  type="monotone" dataKey="occLY" stroke={CHART.ly} strokeWidth={1.5}
                  fill={CHART.ly} fillOpacity={0.1} dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Area
                  type="monotone" dataKey="occ" stroke={series(0)} strokeWidth={2.4}
                  fill="url(#oc-occ)" dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                {/* Obiettivo: linea tratteggiata, non un'area (è un riferimento) */}
                <Line
                  type="monotone" dataKey="occBudget" stroke={CHART.forecast} strokeWidth={2}
                  strokeDasharray="5 3" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="oc__cal">
            <div className="oc__cal-head">
              {GIORNI_SETTIMANA.map((g) => <span key={g}>{g}</span>)}
            </div>
            <div className="oc__cal-grid">
              {calendario.map((d, i) => d === null ? (
                <span className="oc__cal-cell oc__cal-cell--void" key={`v${i}`} />
              ) : (
                <Tooltip
                  key={d.g}
                  text={`${d.label} · ${fmtPct(d.occ)} · ${fmtInt(d.camere)} camere · ADR ${fmtEur(d.adr, 0)}`}
                >
                  <span
                    className="oc__cal-cell"
                    /* --occ = quota di riempimento del giorno (valore runtime):
                       la scala è a UNA tinta, dal chiaro al blu Platform */
                    style={{ ['--occ' as any]: `${d.occ}%` }}
                    /* Oltre il 62% il fondo è scuro: il testo passa al negativo
                       per restare leggibile */
                    data-fill={d.occ > 62 ? 'dark' : 'light'}
                  >
                    <span className="oc__cal-day">{d.g}</span>
                    <span className="oc__cal-val">{Math.round(d.occ)}%</span>
                  </span>
                </Tooltip>
              ))}
            </div>
            <div className="oc__cal-scale">
              <span>meno pieno</span>
              <span className="oc__cal-ramp" aria-hidden="true" />
              <span>più pieno</span>
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Tipologie di camera ───────────────────────────────────────────── */}
      <ChartCard
        className="oc__tip"
        index={1}
        title="Occupazione per tipologia"
        subtitle="Dove restano le camere invendute"
        footer={`Inventario: ${data.tipologie.map((t) => `${t.label} ${t.inventario}`).join(' · ')}`}
      >
        <div className="oc__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.tipologie} layout="vertical" margin={{ top: 2, right: 58, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={120} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ occ: 'Occupazione' }} format={(v) => fmtPct(v)} />}
              />
              <Bar
                dataKey="occ" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={16}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                <LabelList dataKey="occ" position="right" formatter={(v: any) => fmtPct(Number(v), 0)} className="oc__bar-label" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Giorni della settimana ────────────────────────────────────────── */}
      <ChartCard
        className="oc__dow"
        index={2}
        title="Occupazione per giorno della settimana"
        subtitle="Media del mese, giorno per giorno"
      >
        <div className="oc__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.perGiornoSettimana} margin={{ top: 14, right: 8, left: -6, bottom: 0 }} barCategoryGap="24%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} />
              <YAxis {...yAxisProps} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={42} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ occ: 'Occupazione' }} format={(v) => fmtPct(v)} />}
              />
              <Bar
                dataKey="occ" fill={series(0)} radius={[4, 4, 0, 0]} maxBarSize={34}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                <LabelList dataKey="occ" position="top" formatter={(v: any) => fmtPct(Number(v), 0)} className="oc__bar-label" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Estremi del mese (numeri) ─────────────────────────────────────── */}
      <ChartCard
        className="oc__edge"
        index={3}
        title="Estremi del mese"
        subtitle="Giorno più pieno e più vuoto, e camere non vendibili"
      >
        <ul className="oc__figures">
          <li className="oc__figure">
            <span className="oc__figure-lbl">Giorno più pieno</span>
            <span className="oc__figure-val">
              {kpi.piuPieno ? `${kpi.piuPieno.label} · ${fmtPct(kpi.piuPieno.occ, 0)}` : '—'}
            </span>
          </li>
          <li className="oc__figure">
            <span className="oc__figure-lbl">Giorno più vuoto</span>
            <span className="oc__figure-val">
              {kpi.piuVuoto ? `${kpi.piuVuoto.label} · ${fmtPct(kpi.piuVuoto.occ, 0)}` : '—'}
            </span>
          </li>
          <li className="oc__figure">
            <span className="oc__figure-lbl">ADR medio del mese</span>
            <span className="oc__figure-val">{fmtEur(kpi.adr, 0)}</span>
          </li>
          <li className="oc__figure">
            <span className="oc__figure-lbl">Notti fuori servizio</span>
            <span className="oc__figure-val">{fmtInt(kpi.fuoriServizio)}</span>
          </li>
          <li className="oc__figure">
            <span className="oc__figure-lbl">Notti complimentary</span>
            <span className="oc__figure-val">{fmtInt(kpi.complimentary)}</span>
          </li>
        </ul>
      </ChartCard>
    </BiPage>
  )
}
