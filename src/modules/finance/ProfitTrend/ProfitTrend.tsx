import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Pagination from '../../../core/components/Pagination'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtEur, fmtEurK, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import {
  buildFinance, computeProfit, pontePeL, type FinanceData,
} from '../_data/financeMock'
import './ProfitTrend.sass'

// ─── PROFIT TREND ───────────────────────────────────────────────────────────────
//  Come si muove il margine nel tempo e da dove nasce.
//    • fascia indicatori: GOP, marginalità, GOPPAR, TRevPAR, margine per camera
//    • margine per mese contro l'anno precedente (+ vista Dettaglio)
//    • dal ricavo al margine: quanto lasciano per strada costi diretti e
//      indistribuiti (ponte)
//    • marginalità mese per mese: dove il margine si assottiglia anche a ricavi alti
//    • rendimento per camera: gli indicatori che rendono confrontabili strutture di
//      dimensioni diverse
//  Modello condiviso in `finance/_data/financeMock`.

export default function ProfitTrend({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [vista, setVista] = useState<'margine' | 'dettaglio'>('margine')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeProfit(data), [data])
  const ponte = useMemo(() => pontePeL(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<FinanceData>>('finance/GetContoEconomico', {
      method: 'POST',
      body: { strutturaId, anno },
    })
      .then((d) => { if (!annullato && d) setRemoto(d) })
      .catch(() => { if (!annullato) setRemoto(null) })
      .finally(() => { if (!annullato) setLoading(false) })
    return () => { annullato = true }
  }, [strutturaId, anno])

  useEffect(() => { setPagina(1) }, [strutturaId, anno])

  const still = reducedMotion()

  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 30, headerHeight: 32, min: 4, max: 14,
  })
  const totPagine = Math.max(1, Math.ceil(data.mesi.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = data.mesi.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  return (
    <BiPage
      title="Profit trend"
      subtitle={`Andamento del margine ${data.anno}: nel tempo, per composizione e per camera`}
      glossary={['GOP', 'GOPPAR', 'TRevPAR', 'RevPAR', 'ADR', 'occupazione', 'TY', 'LY', 'delta']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="pt__grid"
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
            className="pt__filter pt__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="pt__filter"
          />
          <span className="pt__note">
            <i className="fa-solid fa-arrow-trend-up" aria-hidden="true" />
            Mese migliore {kpi.migliore?.label ?? '—'} · mese peggiore {kpi.peggiore?.label ?? '—'} ·
            mesi in perdita {kpi.mesiInPerdita}
          </span>
        </>
      )}
    >
      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="pt__kpis">
        <KpiTile
          label="GOP" icon="fa-chart-pie" slot={0} index={0}
          value={kpi.gop} format={(n) => fmtEurK(n)}
          delta={kpi.deltaGop} spark={kpi.sparkGop}
          info="Margine operativo lordo dell'anno, confrontato con l'anno precedente."
        />
        <KpiTile
          label="Marginalità" icon="fa-percent" slot={4} index={1}
          value={kpi.gopPct} format={(n) => fmtPct(n)}
          spark={kpi.sparkMargine}
          info="GOP diviso ricavi: quanta parte del ricavo resta dopo i costi operativi."
        />
        <KpiTile
          label="GOPPAR" icon="fa-bed" slot={6} index={2}
          value={kpi.goppar} format={(n) => fmtEur(n, 0)}
          spark={kpi.sparkGoppar}
          info="GOP per camera disponibile: rende confrontabili strutture di dimensioni diverse."
        />
        <KpiTile
          label="TRevPAR" icon="fa-sack-dollar" slot={1} index={3}
          value={kpi.trevpar} format={(n) => fmtEur(n, 0)}
          info="Ricavo totale (camere, F&B, altri servizi) per camera disponibile."
        />
        <KpiTile
          label="Margine per camera" icon="fa-tag" slot={3} index={4}
          value={kpi.marginePerCamera} format={(n) => fmtEur(n, 0)}
          info="Margine che resta su ogni camera venduta: ricavo per camera meno costo per camera."
        />
      </div>

      {/* ── Margine per mese ─────────────────────────────────────────────── */}
      <ChartCard
        className="pt__main"
        index={0}
        title={`Margine per mese · ${data.anno}`}
        subtitle="Confronto con lo stesso mese dell'anno precedente"
        badge={fmtEurK(kpi.gop)}
        legend={[
          { key: 'ty', name: 'Margine TY', color: series(0) },
          { key: 'ly', name: 'Margine LY', color: CHART.ly },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'margine', label: 'Margine' },
              { id: 'dettaglio', label: 'Dettaglio' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as 'margine' | 'dettaglio')}
          />
        )}
      >
        {vista === 'margine' ? (
          <div className="pt__chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.mesi} margin={{ top: 6, right: 8, left: -4, bottom: 0 }}>
                <defs>
                  <linearGradient id="pt-gop" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series(0)} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                {/* Un solo asse: entrambe le serie sono margini in € */}
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ gop: 'Margine TY', gopLY: 'Margine LY' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                {/* Lo zero è la soglia: sotto, il mese è in perdita */}
                <ReferenceLine y={0} stroke={CHART.axis} />
                <Area
                  type="monotone" dataKey="gopLY" stroke={CHART.ly} strokeWidth={1.5}
                  fill={CHART.ly} fillOpacity={0.1} dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Area
                  type="monotone" dataKey="gop" stroke={series(0)} strokeWidth={2.4}
                  fill="url(#pt-gop)" dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="pt__detail">
            <div className="sib-table-wrap pt__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <thead>
                  <tr>
                    <th>Mese</th>
                    <th className="pt__num">Ricavi</th>
                    <th className="pt__num">Costi</th>
                    <th className="pt__num">Margine</th>
                    <th className="pt__num">Marginalità</th>
                    <th className="pt__num">GOPPAR</th>
                    <th className="pt__num">vs LY</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((m) => (
                    <tr key={m.mese}>
                      <td>
                        {m.label}
                        {!m.consuntivo && <span className="pt__tag">previsione</span>}
                      </td>
                      <td className="pt__num">{fmtEur(m.ricaviTotali, 0)}</td>
                      <td className="pt__num">{fmtEur(m.costiTotali, 0)}</td>
                      <td className="pt__num">{fmtEur(m.gop, 0)}</td>
                      <td className="pt__num">{fmtPct(m.gopPct)}</td>
                      <td className="pt__num">{fmtEur(m.goppar, 0)}</td>
                      <td className="pt__num">
                        <DeltaBadge value={m.gopLY ? ((m.gop - m.gopLY) / Math.abs(m.gopLY)) * 100 : 0} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pt__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Dal ricavo al margine ────────────────────────────────────────── */}
      <ChartCard
        className="pt__ponte"
        index={1}
        title="Dal ricavo al margine"
        subtitle="Cosa resta dopo costi diretti e indistribuiti"
        footer={`Su ${fmtEurK(data.mesi.reduce((s, m) => s + m.ricaviTotali, 0))} di ricavo restano ${fmtEurK(kpi.gop)}: ${fmtPct(kpi.gopPct, 0)}.`}
      >
        <div className="pt__chart">
          <ResponsiveContainer width="100%" height="100%">
            {/* La barra invisibile porta all'altezza di partenza, quella visibile
                mostra il contributo (in aggiunta) o l'erosione (in sottrazione). */}
            <BarChart data={ponte} margin={{ top: 8, right: 8, left: -4, bottom: 0 }} barCategoryGap="18%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ delta: 'Contributo' }} format={(v) => fmtEur(v, 0)} />}
              />
              <Bar dataKey="base" stackId="ponte" fill="transparent" isAnimationActive={false} />
              <Bar
                dataKey="delta" stackId="ponte" radius={[3, 3, 0, 0]} maxBarSize={30}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {ponte.map((p) => {
                  const erode = p.label.startsWith('Costi') || p.label === 'Indistribuiti'
                  return (
                    <Cell key={p.label} fill={p.totale ? series(0) : erode ? CHART.bad : CHART.good} />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Marginalità per mese ─────────────────────────────────────────── */}
      <ChartCard
        className="pt__marg"
        index={2}
        title="Marginalità per mese"
        subtitle="Quanta parte del ricavo resta, mese per mese"
        footer="Nei mesi di bassa stagione i costi fissi pesano sullo stesso ricavo: la marginalità scende anche senza errori di gestione."
      >
        <div className="pt__chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.mesi} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              {/* Asse in punti percentuali: nessuna seconda scala */}
              <YAxis {...yAxisProps} tickFormatter={(v) => `${v}%`} width={44} />
              <RTooltip
                cursor={cursorProps}
                content={<ChartTooltip names={{ gopPct: 'Marginalità' }} format={(v) => fmtPct(v)} />}
              />
              <ReferenceLine y={0} stroke={CHART.axis} />
              {/* Riferimento: la marginalità media dell'anno */}
              <ReferenceLine
                y={+kpi.gopPct.toFixed(1)}
                stroke={CHART.forecast}
                strokeDasharray="4 3"
                label={{ value: `media ${fmtPct(kpi.gopPct, 0)}`, position: 'insideTopLeft', fill: CHART.inkMuted, fontSize: 11 }}
              />
              <Line
                type="monotone" dataKey="gopPct" stroke={series(4)} strokeWidth={2.4}
                dot={{ r: 2.5, strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Rendimento per camera ────────────────────────────────────────── */}
      <ChartCard
        className="pt__cam"
        index={3}
        title="Rendimento per camera"
        subtitle="Indicatori confrontabili fra strutture"
      >
        <ul className="pt__figures">
          <li className="pt__figure">
            <span className="pt__figure-lbl">Ricavo per camera venduta</span>
            <span className="pt__figure-val">{fmtEur(kpi.ricavoPerCamera, 0)}</span>
          </li>
          <li className="pt__figure">
            <span className="pt__figure-lbl">Costo per camera venduta</span>
            <span className="pt__figure-val">{fmtEur(kpi.costoPerCamera, 0)}</span>
          </li>
          <li className="pt__figure">
            <span className="pt__figure-lbl">Margine per camera venduta</span>
            <span className="pt__figure-val">{fmtEur(kpi.marginePerCamera, 0)}</span>
          </li>
          <li className="pt__figure">
            <span className="pt__figure-lbl">TRevPAR</span>
            <span className="pt__figure-val">{fmtEur(kpi.trevpar, 0)}</span>
          </li>
          <li className="pt__figure">
            <span className="pt__figure-lbl">GOPPAR</span>
            <span className="pt__figure-val">{fmtEur(kpi.goppar, 0)}</span>
          </li>
        </ul>
      </ChartCard>
    </BiPage>
  )
}
