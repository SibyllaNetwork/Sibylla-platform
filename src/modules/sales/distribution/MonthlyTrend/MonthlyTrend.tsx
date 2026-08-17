import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList,
  Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../../core/components/form'
import Pagination from '../../../../core/components/Pagination'
import {
  ANIM, BiLegend, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../../core/bi'
import { apiFetchSibylla } from '../../../../services/api'
import {
  buildMonthlyTrend, computeKpi, MESI, type MonthlyTrendData,
} from './monthlyTrend.data'
import './MonthlyTrend.sass'

// ─── MONTHLY TREND ──────────────────────────────────────────────────────────────
//  Andamento del mese a confronto con l'anno precedente e con la previsione a
//  fine mese. Lettura in tre livelli, tutti nella stessa schermata:
//    1. fascia indicatori — ricavi, ADR, occupazione, RevPAR, previsione vs budget
//    2. andamento giornaliero (consuntivo + previsione + anno precedente), con
//       vista DETTAGLIO tabellare sotto lo stesso tetto (tab verticali)
//    3. da dove arriva il valore — mix canali, segmenti, intermediari — e la
//       qualità del business (permanenza, anticipo, cancellazioni)
//
//  Impianto e regole grafiche nel kit condiviso `core/bi`: nessun colore, asse o
//  tooltip scritto qui. Pagina "fallback-first": mock deterministici finché il
//  backend non risponde.

export default function MonthlyTrend({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [mese, setMese] = useState(8)
  const [vista, setVista] = useState<'trend' | 'dettaglio'>('trend')
  const [pagina, setPagina] = useState(1)
  const [canaleAttivo, setCanaleAttivo] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // Base mock deterministica per i filtri correnti.
  const mock = useMemo(() => buildMonthlyTrend(anno, mese, strutturaId), [anno, mese, strutturaId])
  const [remoto, setRemoto] = useState<Partial<MonthlyTrendData> | null>(null)

  // Il backend può rispondere con una parte dei campi: si sovrappone al mock,
  // così la pagina resta completa anche con un DTO parziale.
  const data: MonthlyTrendData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeKpi(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<MonthlyTrendData>>('forecast/GetMonthlyTrend', {
      method: 'POST',
      body: { strutturaId, anno, mese },
    })
      .then((d) => { if (!annullato && d) setRemoto(d) })
      .catch(() => { if (!annullato) setRemoto(null) })
      .finally(() => { if (!annullato) setLoading(false) })
    return () => { annullato = true }
  }, [strutturaId, anno, mese])

  useEffect(() => { setPagina(1) }, [anno, mese, strutturaId])

  const still = reducedMotion()
  const totaleMese = data.forecastOpzionato
  const mesePrecedenteLabel = `${MESI[data.mese - 1]} ${data.anno}`

  // ── Dettaglio giornaliero paginato ──────────────────────────────────────────
  //  Le righe per pagina non sono un numero fisso: si misura lo spazio della card
  //  e si mostrano quelle che ci entrano. Così la tabella non viene mai tagliata e
  //  non serve scroll, a qualunque risoluzione e con la sidenav aperta o chiusa.
  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 30, headerHeight: 32, min: 4, max: 20,
  })
  const totPagine = Math.max(1, Math.ceil(data.giorni.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = data.giorni.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  return (
    <BiPage
      title="Monthly trend"
      subtitle={`Andamento di ${mesePrecedenteLabel} a confronto con l'anno precedente e con la previsione a fine mese`}
      glossary={[
        'TY', 'LY', 'delta', 'ADR', 'RevPAR', 'occupazione',
        'forecastGarantito', 'forecastOpzionato', 'OTB',
        'dirette', 'B2B', 'corporate', 'gruppi',
        'ALOS', 'leadTime', 'cancellazioni', 'noShow', 'complimentary', 'ranking',
      ]}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="mt__grid"
      toolbar={(
        <>
          <SelectField
            name="struttura"
            label="Struttura"
            value={strutturaId ?? ''}
            onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
            options={[
              { value: '', label: 'Tutte le strutture' },
              ...data.strutture.map((s) => ({ value: s.id, label: s.nome })),
            ]}
            className="mt__filter mt__filter--wide"
          />
          <SelectField
            name="anno"
            label="Anno"
            value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="mt__filter"
          />
          <SelectField
            name="mese"
            label="Mese"
            value={mese}
            onChange={(e) => setMese(Number(e.target.value))}
            options={MESI.map((m, i) => ({ value: i + 1, label: m }))}
            className="mt__filter"
          />
          <span className="mt__inventory">
            <i className="fa-solid fa-bed" aria-hidden="true" />
            {fmtInt(data.camereDisponibili)} camere disponibili · consuntivo al giorno {data.ultimoGiornoConsuntivo || '—'}
          </span>
        </>
      )}
    >
      {/* ── 1. Fascia indicatori del mese ─────────────────────────────────── */}
      <div className="mt__kpis">
        <KpiTile
          label="Ricavi camere" icon="fa-euro-sign" slot={0} index={0}
          value={kpi.ricaviTY} format={(n) => fmtEurK(n)}
          delta={kpi.deltaRicavi} spark={kpi.sparkRicavi}
          info="Ricavi camere dei giorni consuntivati, confrontati con lo stesso periodo dell'anno precedente (LY)."
        />
        <KpiTile
          label="ADR" icon="fa-tag" slot={1} index={1}
          value={kpi.adr} format={(n) => fmtEur(n, 0)}
          delta={kpi.deltaAdr} spark={kpi.sparkAdr}
          info="Average Daily Rate: ricavi camere diviso le camere vendute."
        />
        <KpiTile
          label="Occupazione" icon="fa-door-open" slot={4} index={2}
          value={kpi.occ} format={(n) => fmtPct(n)}
          delta={kpi.deltaOcc} deltaLabel={`${kpi.deltaOcc >= 0 ? '+' : '−'}${Math.abs(kpi.deltaOcc).toFixed(1)} pt`}
          spark={kpi.sparkOcc}
          info="Camere vendute diviso camere disponibili. Il confronto con l'anno precedente è in punti percentuali."
        />
        <KpiTile
          label="RevPAR" icon="fa-chart-simple" slot={6} index={3}
          value={kpi.revpar} format={(n) => fmtEur(n, 0)}
          delta={kpi.deltaRevpar} spark={kpi.sparkRevpar}
          info="Revenue Per Available Room: ricavi camere diviso le camere disponibili (ADR × occupazione)."
        />
        <KpiTile
          label="Forecast garantito" icon="fa-bullseye" slot={3} index={4}
          value={kpi.forecastGarantito} format={(n) => fmtEurK(n)}
          delta={kpi.deltaBudget}
          deltaLabel={`${kpi.deltaBudget >= 0 ? '+' : '−'}${Math.abs(kpi.deltaBudget).toFixed(1)}% vs budget`}
          info="Previsione a fine mese sulle sole prenotazioni confermate, confrontata con il budget del mese."
        />
      </div>

      {/* ── 2. Andamento giornaliero · vista TREND / DETTAGLIO ─────────────── */}
      <ChartCard
        className="mt__trend"
        index={0}
        title={`Andamento giornaliero · ${mesePrecedenteLabel}`}
        subtitle="Consuntivo, previsione dei giorni residui e anno precedente"
        badge={fmtEurK(kpi.ricaviTY)}
        legend={[
          { key: 'ty', name: 'Ricavi TY', color: series(0) },
          { key: 'fc', name: 'Previsione', color: CHART.forecast, dashed: true },
          { key: 'ly', name: 'Ricavi LY', color: CHART.ly },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'trend', label: 'Trend', icon: 'fa-chart-area' },
              { id: 'dettaglio', label: 'Dettaglio', icon: 'fa-table-list' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as 'trend' | 'dettaglio')}
          />
        )}
        /* Il piede riepilogativo serve alla vista grafico: in DETTAGLIO gli stessi
           numeri sono già in tabella, e lo spazio va alle righe. */
        footer={vista === 'dettaglio' ? undefined : (
          <span className="mt__trend-foot">
            <span><strong>TY</strong> {fmtEur(kpi.ricaviTY, 0)}</span>
            <span><strong>LY</strong> {fmtEur(kpi.ricaviLY, 0)}</span>
            <span className="mt__trend-foot-delta">
              <strong>Δ</strong> {fmtEur(kpi.ricaviTY - kpi.ricaviLY, 0)}
              <DeltaBadge value={kpi.deltaRicavi} size="sm" />
            </span>
            <span className="mt__trend-foot-sep">·</span>
            <span>A fine mese: garantito <strong>{fmtEurK(data.forecastGarantito)}</strong>, opzionato <strong>{fmtEurK(data.forecastOpzionato)}</strong></span>
          </span>
        )}
      >
        {vista === 'trend' ? (
          <div className="mt__chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.giorni} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
                <defs>
                  <linearGradient id="mt-ty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series(0)} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="mt-fc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.forecast} stopOpacity={0.26} />
                    <stop offset="100%" stopColor={CHART.forecast} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval="preserveStartEnd" />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ ricaviTY: 'Ricavi TY', ricaviFc: 'Previsione', ricaviLY: 'Ricavi LY' }}
                      format={(v) => fmtEur(v)}
                    />
                  )}
                />
                {/* Anno precedente: riferimento neutro, sempre sotto */}
                <Area
                  type="monotone" dataKey="ricaviLY" stroke={CHART.ly} strokeWidth={1.5}
                  fill={CHART.ly} fillOpacity={0.1} dot={false} connectNulls
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                {/* Previsione: tratteggiata, così non si confonde col consuntivo */}
                <Area
                  type="monotone" dataKey="ricaviFc" stroke={CHART.forecast} strokeWidth={2}
                  strokeDasharray="5 3" fill="url(#mt-fc)" dot={false} connectNulls
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                {/* Consuntivo dell'anno corrente: la serie protagonista */}
                <Area
                  type="monotone" dataKey="ricaviTY" stroke={series(0)} strokeWidth={2.4}
                  fill="url(#mt-ty)" dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }} connectNulls
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt__detail">
            <div className="sib-table-wrap mt__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <thead>
                  <tr>
                    <th>Giorno</th>
                    <th className="mt__num">Camere</th>
                    <th className="mt__num">Occupazione</th>
                    <th className="mt__num">ADR</th>
                    <th className="mt__num">RevPAR</th>
                    <th className="mt__num">Ricavi TY</th>
                    <th className="mt__num">Ricavi LY</th>
                    <th className="mt__num">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((g) => {
                    const ricavi = g.ricaviTY ?? g.ricaviFc ?? 0
                    const delta = g.ricaviLY ? ((ricavi - g.ricaviLY) / g.ricaviLY) * 100 : 0
                    return (
                      <tr key={g.g}>
                        <td>
                          {g.label}
                          {g.futuro && <span className="mt__tag">previsione</span>}
                        </td>
                        <td className="mt__num">{fmtInt(g.camere)}</td>
                        <td className="mt__num">{fmtPct(g.occ)}</td>
                        <td className="mt__num">{fmtEur(g.adr, 0)}</td>
                        <td className="mt__num">{fmtEur(data.camereDisponibili ? ricavi / data.camereDisponibili : 0, 0)}</td>
                        <td className="mt__num">{fmtEur(ricavi, 0)}</td>
                        <td className="mt__num">{fmtEur(g.ricaviLY, 0)}</td>
                        <td className="mt__num"><DeltaBadge value={delta} size="sm" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── 3a. Mix dei canali di vendita ──────────────────────────────────── */}
      <ChartCard
        className="mt__mix"
        index={1}
        title="Mix dei canali"
        subtitle="Quota di ricavo per canale di vendita"
      >
        {/* Legenda accanto al donut (non nell'intestazione): all'anello resta
            tutta l'altezza della card e le voci fanno da tabella delle quote. */}
        <div className="mt__mix-body">
          <BiLegend
            layout="column"
            className="mt__mix-legend"
            items={data.canali.map((c, i) => ({
              key: c.label,
              name: c.label,
              color: series(i),
              value: fmtPct(c.quota, 0),
              off: canaleAttivo !== null && canaleAttivo !== i,
            }))}
            onToggle={(k) => {
              const i = data.canali.findIndex((c) => c.label === k)
              setCanaleAttivo((cur) => (cur === i ? null : i))
            }}
          />
          <div className="mt__donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.canali}
                dataKey="valore"
                nameKey="label"
                innerRadius="58%"
                outerRadius="86%"
                paddingAngle={2}
                stroke={CHART.surface}
                strokeWidth={2}
                onMouseEnter={(_, i) => setCanaleAttivo(i)}
                onMouseLeave={() => setCanaleAttivo(null)}
                isAnimationActive={!still}
                animationDuration={ANIM.duration}
                animationEasing={ANIM.easing}
              >
                {data.canali.map((c, i) => (
                  <Cell
                    key={c.label}
                    fill={series(i)}
                    // Fetta puntata in evidenza: le altre si attenuano
                    fillOpacity={canaleAttivo === null || canaleAttivo === i ? 1 : 0.28}
                  />
                ))}
              </Pie>
              <RTooltip
                content={(
                  <ChartTooltip
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
            </PieChart>
          </ResponsiveContainer>

            {/* Centro del donut: totale a fine mese, o il canale puntato */}
            <div className="mt__donut-center" aria-live="polite">
              {canaleAttivo === null ? (
                <>
                  <span className="mt__donut-val">{fmtEurK(totaleMese)}</span>
                  <span className="mt__donut-lbl">A fine mese</span>
                </>
              ) : (
                <>
                  <span className="mt__donut-val">{fmtPct(data.canali[canaleAttivo].quota, 0)}</span>
                  <span className="mt__donut-lbl">{data.canali[canaleAttivo].label}</span>
                  {data.canali[canaleAttivo].commissione !== undefined && (
                    <span className="mt__donut-note">
                      commissione {fmtPct(data.canali[canaleAttivo].commissione!, 0)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </ChartCard>

      {/* ── 3b. Segmenti di mercato ────────────────────────────────────────── */}
      <ChartCard
        className="mt__seg"
        index={2}
        title="Ranking segmenti"
        subtitle="Ricavo per segmento di mercato nel mese"
      >
        <RankingBars items={data.segmenti} still={still} />
      </ChartCard>

      {/* ── 3c. Intermediari ───────────────────────────────────────────────── */}
      <ChartCard
        className="mt__age"
        index={3}
        title="Top intermediari"
        subtitle="Agenzie e OTA per ricavo intermediato"
        footer={(
          <span>
            Commissioni riconosciute nel mese:{' '}
            <strong>
              {fmtEurK(data.agenzie.reduce((s, a) => s + a.valore * ((a.commissione ?? 0) / 100), 0))}
            </strong>
          </span>
        )}
      >
        <RankingBars items={data.agenzie} still={still} withCommission />
      </ChartCard>

      {/* ── 3d. Qualità del business (numeri, non un grafico) ──────────────── */}
      <ChartCard
        className="mt__qual"
        index={4}
        title="Qualità del business"
        subtitle="Comportamento della domanda, confronto con LY"
      >
        <ul className="mt__figures">
          {data.qualita.map((q) => (
            <li className="mt__figure" key={q.key}>
              <span className="mt__figure-lbl">{q.label}</span>
              <span className="mt__figure-val">{q.valore}</span>
              <DeltaBadge value={q.delta} invert={q.invert} size="sm" />
            </li>
          ))}
        </ul>
      </ChartCard>
    </BiPage>
  )
}

// ─── Barre di classifica ────────────────────────────────────────────────────────
//  Voci nominali (segmenti, intermediari): stessa tinta per tutte le barre — la
//  lunghezza porta già il valore, il colore non deve ri-codificarlo. Etichette di
//  valore direttamente in testa alla barra, così non serve leggere l'asse.
//  Memoizzato: cambiare vista o pagina del dettaglio non deve far ripartire
//  l'animazione delle barre (il movimento va giustificato da un dato nuovo).
const RankingBars = React.memo(function RankingBars({
  items, still, withCommission = false,
}: {
  items: { label: string; valore: number; quota: number; commissione?: number }[]
  still: boolean
  withCommission?: boolean
}) {
  return (
    <div className="mt__bars">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ top: 2, right: 78, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid {...gridProps} horizontal={false} vertical />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            {...yAxisProps}
            width={96}
            // interval 0 = nessuna etichetta di categoria saltata quando lo
            // spazio si stringe (di default recharts ne nasconde una su due)
            interval={0}
            tick={{ fontSize: 11, fill: CHART.ink }}
          />
          <RTooltip
            cursor={{ fill: 'transparent' }}
            content={(
              <ChartTooltip
                names={{ valore: 'Ricavo' }}
                format={(v) => fmtEur(v, 0)}
                footer={withCommission ? 'Commissione media indicata in etichetta' : undefined}
              />
            )}
          />
          <Bar
            dataKey="valore"
            fill={series(0)}
            radius={[0, 4, 4, 0]}
            maxBarSize={18}
            isAnimationActive={!still}
            animationDuration={ANIM.duration}
            animationEasing={ANIM.easing}
          >
            <LabelList
              dataKey="valore"
              position="right"
              formatter={(v: any) => fmtEurK(Number(v))}
              className="mt__bar-label"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})
