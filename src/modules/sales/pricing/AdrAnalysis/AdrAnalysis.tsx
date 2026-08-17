import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip as RTooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import { SelectField } from '../../../../core/components/form'
import Pagination from '../../../../core/components/Pagination'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtDelta, fmtEur, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../../core/bi'
import { apiFetchSibylla } from '../../../../services/api'
import { MESI } from '../../_data/revenueMock'
import { buildAdr, computeAdrKpi, type AdrData } from './adrAnalysis.data'
import './AdrAnalysis.sass'

// ─── ADR ANALYSIS ───────────────────────────────────────────────────────────────
//  Il prezzo medio di vendita letto dove si decide:
//    • nel tempo, contro anno precedente e budget
//    • per canale, distinguendo ADR lordo e ADR NETTO (quello che entra in cassa
//      dopo la commissione): è il confronto che dice quanto costa vendere tramite
//      intermediari
//    • per tipologia di camera (dove sta il valore dell'inventario)
//    • in relazione con l'occupazione: quanto prezzo regge la domanda
//  Impianto e regole grafiche dal kit `core/bi`.

export default function AdrAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [mese, setMese] = useState(8)
  const [vista, setVista] = useState<'trend' | 'dettaglio'>('trend')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<AdrData> | null>(null)

  const mock = useMemo(() => buildAdr(anno, mese, strutturaId), [anno, mese, strutturaId])
  const data: AdrData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeAdrKpi(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<AdrData>>('revenue/GetAdr', {
      method: 'POST',
      body: { strutturaId, anno, mese },
    })
      .then((d) => { if (!annullato && d) setRemoto(d) })
      .catch(() => { if (!annullato) setRemoto(null) })
      .finally(() => { if (!annullato) setLoading(false) })
    return () => { annullato = true }
  }, [strutturaId, anno, mese])

  useEffect(() => { setPagina(1) }, [strutturaId, anno, mese])

  const still = reducedMotion()
  const periodo = `${MESI[data.mese - 1]} ${data.anno}`

  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 30, headerHeight: 32, min: 4, max: 20,
  })
  const totPagine = Math.max(1, Math.ceil(data.giorni.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = data.giorni.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  return (
    <BiPage
      title="ADR analysis"
      subtitle={`Prezzo medio di vendita di ${periodo}: andamento, canali, tipologie ed elasticità`}
      glossary={['ADR', 'RevPAR', 'occupazione', 'TY', 'LY', 'delta', 'dirette', 'B2B', 'corporate', 'gruppi', 'ranking']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="ad__grid"
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
            className="ad__filter ad__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="ad__filter"
          />
          <SelectField
            name="mese" label="Mese" value={mese}
            onChange={(e) => setMese(Number(e.target.value))}
            options={MESI.map((m, i) => ({ value: i + 1, label: m }))}
            className="ad__filter"
          />
          <span className="ad__note">
            <i className="fa-solid fa-percent" aria-hidden="true" />
            Commissioni riconosciute: {fmtEur(kpi.adr - kpi.adrNetto, 0)} per camera venduta
          </span>
        </>
      )}
    >
      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="ad__kpis">
        <KpiTile
          label="ADR" icon="fa-tag" slot={0} index={0}
          value={kpi.adr} format={(n) => fmtEur(n, 0)}
          delta={kpi.deltaLy} spark={kpi.sparkAdr}
          info="Ricavi camere diviso camere vendute, confrontato con lo stesso periodo dell'anno precedente."
        />
        <KpiTile
          label="ADR netto" icon="fa-hand-holding-dollar" slot={1} index={1}
          value={kpi.adrNetto} format={(n) => fmtEur(n, 0)}
          info="ADR al netto delle commissioni riconosciute agli intermediari: è il prezzo che entra davvero in cassa."
        />
        <KpiTile
          label="Scostamento budget" icon="fa-bullseye" slot={3} index={2}
          value={kpi.deltaBudget} format={(n) => fmtDelta(n)}
          delta={kpi.deltaBudget} deltaLabel={`budget ${fmtEur(kpi.adrBudget, 0)}`}
          info="Differenza fra l'ADR realizzato e quello di budget del periodo."
        />
        <KpiTile
          label="Sconto medio" icon="fa-scissors" slot={5} index={3}
          value={kpi.sconto} format={(n) => fmtPct(n)}
          delta={-0.8} deltaLabel="−0,8 pt vs LY" invertDelta
          spark={kpi.sparkSconto}
          info="Scostamento medio dal prezzo di listino: sale quando la domanda è debole."
        />
        <KpiTile
          label="RevPAR" icon="fa-chart-simple" slot={6} index={4}
          value={kpi.revpar} format={(n) => fmtEur(n, 0)}
          spark={kpi.sparkRevpar}
          info="Ricavi camere diviso camere disponibili: tiene insieme prezzo e occupazione."
        />
      </div>

      {/* ── ADR giornaliero ──────────────────────────────────────────────── */}
      <ChartCard
        className="ad__main"
        index={0}
        title={`ADR giornaliero · ${periodo}`}
        subtitle="Realizzato, budget e anno precedente"
        badge={fmtEur(kpi.adr, 0)}
        legend={[
          { key: 'adr', name: 'ADR', color: series(0) },
          { key: 'bud', name: 'Budget', color: CHART.forecast, dashed: true },
          { key: 'ly', name: 'Anno precedente', color: CHART.ly },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'trend', label: 'Andamento', icon: 'fa-chart-area' },
              { id: 'dettaglio', label: 'Dettaglio', icon: 'fa-table-list' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as 'trend' | 'dettaglio')}
          />
        )}
      >
        {vista === 'trend' ? (
          <div className="ad__chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.giorni} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="ad-adr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series(0)} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval="preserveStartEnd" />
                {/* Un solo asse: tutte le serie sono in € per camera venduta */}
                <YAxis {...yAxisProps} tickFormatter={(v) => `${v} €`} width={52} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ adr: 'ADR', adrBudget: 'Budget', adrLY: 'Anno precedente' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                <Area
                  type="monotone" dataKey="adrLY" stroke={CHART.ly} strokeWidth={1.5}
                  fill={CHART.ly} fillOpacity={0.1} dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Area
                  type="monotone" dataKey="adr" stroke={series(0)} strokeWidth={2.4}
                  fill="url(#ad-adr)" dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="adrBudget" stroke={CHART.forecast} strokeWidth={2}
                  strokeDasharray="5 3" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="ad__detail">
            <div className="sib-table-wrap ad__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <thead>
                  <tr>
                    <th>Giorno</th>
                    <th className="ad__num">Camere</th>
                    <th className="ad__num">Occupazione</th>
                    <th className="ad__num">ADR</th>
                    <th className="ad__num">Budget</th>
                    <th className="ad__num">ADR LY</th>
                    <th className="ad__num">Sconto</th>
                    <th className="ad__num">vs LY</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((d) => (
                    <tr key={d.label}>
                      <td>{d.label}{d.weekend && <span className="ad__tag">weekend</span>}</td>
                      <td className="ad__num">{fmtInt(d.camere)}</td>
                      <td className="ad__num">{fmtPct(d.occ)}</td>
                      <td className="ad__num">{fmtEur(d.adr, 0)}</td>
                      <td className="ad__num">{fmtEur(d.adrBudget, 0)}</td>
                      <td className="ad__num">{fmtEur(d.adrLY, 0)}</td>
                      <td className="ad__num">{fmtPct(d.sconto)}</td>
                      <td className="ad__num">
                        <DeltaBadge value={d.adrLY ? ((d.adr - d.adrLY) / d.adrLY) * 100 : 0} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ad__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Tipologie di camera ──────────────────────────────────────────── */}
      <ChartCard
        className="ad__tip"
        index={1}
        title="ADR per tipologia"
        subtitle="Dove sta il valore dell'inventario"
      >
        <div className="ad__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.tipologie} layout="vertical" margin={{ top: 2, right: 62, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={120} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ adr: 'ADR' }} format={(v) => fmtEur(v, 0)} />}
              />
              <Bar
                dataKey="adr" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={16}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                <LabelList dataKey="adr" position="right" formatter={(v: any) => fmtEur(Number(v), 0)} className="ad__bar-label" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Canali: lordo vs netto ───────────────────────────────────────── */}
      <ChartCard
        className="ad__ch"
        index={2}
        title="ADR per canale: lordo e netto"
        subtitle="Quanto resta dopo la commissione riconosciuta"
        legend={[
          { key: 'lordo', name: 'ADR lordo', color: series(0) },
          { key: 'netto', name: 'ADR netto', color: series(4) },
        ]}
        footer="La vendita diretta non paga commissione: a pari prezzo esposto rende più di ogni intermediario."
      >
        <div className="ad__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.canali} margin={{ top: 14, right: 8, left: -14, bottom: 0 }} barCategoryGap="26%" barGap={2}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              <YAxis {...yAxisProps} tickFormatter={(v) => `${v} €`} width={50} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={(
                  <ChartTooltip
                    names={{ adrLordo: 'ADR lordo', adrNetto: 'ADR netto' }}
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
              <Bar
                dataKey="adrLordo" fill={series(0)} radius={[4, 4, 0, 0]} maxBarSize={26}
                isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Bar
                dataKey="adrNetto" fill={series(4)} radius={[4, 4, 0, 0]} maxBarSize={26}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Elasticità prezzo / occupazione ──────────────────────────────── */}
      <ChartCard
        className="ad__nuv"
        index={3}
        title="Prezzo e occupazione"
        subtitle="Ogni punto è un giorno del mese"
        footer="In alto a destra i giorni che hanno tenuto prezzo E occupazione: sono il riferimento per la tariffa."
      >
        <div className="ad__bars">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 12, left: -10, bottom: 2 }}>
              <CartesianGrid {...gridProps} vertical />
              <XAxis
                type="number" dataKey="occ" {...xAxisProps}
                domain={[(min: number) => Math.max(0, Math.floor((min - 4) / 5) * 5), 100]}
                tickFormatter={(v) => `${v}%`} name="Occupazione"
              />
              <YAxis
                type="number" dataKey="adr" {...yAxisProps}
                domain={[(min: number) => Math.floor((min * 0.94) / 10) * 10, (max: number) => Math.ceil((max * 1.04) / 10) * 10]}
                tickFormatter={(v) => `${v} €`} width={50} name="ADR"
              />
              <ZAxis range={[46, 46]} />
              <RTooltip
                cursor={{ strokeDasharray: '3 3', stroke: CHART.axis }}
                content={(
                  <ChartTooltip
                    names={{ occ: 'Occupazione', adr: 'ADR' }}
                    format={(v, key) => (key === 'occ' ? fmtPct(v) : fmtEur(v, 0))}
                  />
                )}
              />
              {/* Una sola serie: nessuna legenda, il titolo la nomina */}
              <Scatter
                data={kpi.nuvola} fill={series(0)} fillOpacity={0.72}
                stroke={CHART.surface} strokeWidth={1}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </BiPage>
  )
}
