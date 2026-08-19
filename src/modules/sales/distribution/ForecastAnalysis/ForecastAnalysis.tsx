import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../../core/components/form'
import Pagination from '../../../../core/components/Pagination'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile, barEndLabel, barTopLabel,
  CHART, cursorProps, fmtAxisNum, fmtDelta, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../../core/bi'
import { apiFetchSibylla } from '../../../../services/api'
import {
  DIMENSIONI, ORIZZONTI, buildForecast, computeForecastKpi,
  type Dimensione, type ForecastData,
} from './forecastAnalysis.data'
import './ForecastAnalysis.sass'

// ─── FORECAST ANALYSIS ──────────────────────────────────────────────────────────
//  Che cosa si chiuderà sull'orizzonte scelto, e con quanta certezza:
//    • fascia indicatori: garantito, opzionato, chiusura attesa contro budget,
//      occupazione attesa, ADR atteso
//    • forecast per data di soggiorno: il confermato come area, la chiusura attesa e
//      l'anno precedente come linee, il budget come riferimento tratteggiato
//      (+ vista Dettaglio tabellare)
//    • composizione del forecast: garantito, opzionato e ancora da acquisire — tre
//      parti con certezze diverse, che non si sommano in un unico numero rassicurante
//    • settimane da presidiare: scostamento della chiusura attesa sul budget
//    • ranking del portafoglio futuro per segmento, canale o agenzia
//  Il periodo è futuro: qui non c'è consuntivo, e la pagina lo dice sempre.

export default function ForecastAnalysis({ navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [orizzonte, setOrizzonte] = useState(60)
  const [dimensione, setDimensione] = useState<Dimensione>('segmenti')
  const [vista, setVista] = useState<'trend' | 'dettaglio'>('trend')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<ForecastData> | null>(null)

  const mock = useMemo(() => buildForecast(strutturaId, orizzonte), [strutturaId, orizzonte])
  const data: ForecastData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeForecastKpi(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<ForecastData>>('forecast/GetForecastAnalysis', {
      method: 'POST',
      body: { strutturaId, orizzonte },
    })
      .then((d) => { if (!annullato && d) setRemoto(d) })
      .catch(() => { if (!annullato) setRemoto(null) })
      .finally(() => { if (!annullato) setLoading(false) })
    return () => { annullato = true }
  }, [strutturaId, orizzonte])

  useEffect(() => { setPagina(1) }, [strutturaId, orizzonte])

  const still = reducedMotion()

  const voci = dimensione === 'segmenti' ? data.segmenti
    : dimensione === 'canali' ? data.canali
      : data.agenzie
  const dimCorrente = DIMENSIONI.find((d) => d.key === dimensione) ?? DIMENSIONI[0]

  // Le tre parti del forecast hanno certezze diverse: restano separate anche
  // nell'anello, con il budget come riferimento nel piede.
  const composizione = useMemo(() => [
    { label: 'Garantito', valore: kpi.garantito, colore: series(0) },
    { label: 'Opzionato', valore: kpi.opzionato, colore: series(3) },
    { label: 'Da acquisire', valore: kpi.daAcquisire, colore: CHART.ly },
  ].filter((v) => v.valore > 0), [kpi])

  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 28, headerHeight: 30, min: 3, max: 20,
  })
  const totPagine = Math.max(1, Math.ceil(data.giorni.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = data.giorni.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  return (
    <BiPage
      title="Forecast analysis"
      subtitle={`Previsione dei prossimi ${data.orizzonte} giorni di soggiorno: garantito, opzionato e ancora da acquisire`}
      glossary={['forecastGarantito', 'forecastOpzionato', 'OTB', 'pickup', 'budget', 'ADR', 'occupazione', 'TY', 'LY', 'delta', 'ranking']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="fa__grid"
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
            className="fa__filter fa__filter--wide"
          />
          <SelectField
            name="orizzonte" label="Orizzonte di soggiorno" value={orizzonte}
            onChange={(e) => setOrizzonte(Number(e.target.value))}
            options={ORIZZONTI.map((o) => ({ value: o, label: `Prossimi ${o} gg` }))}
            className="fa__filter"
          />
          <span className="fa__note">
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            Budget del periodo coperto al {fmtPct(kpi.coperturaGarantito, 0)} dalle prenotazioni confermate
          </span>
        </>
      )}
    >
      {/* ── Indicatori della previsione ───────────────────────────────────── */}
      <div className="fa__kpis">
        <KpiTile
          label="Forecast garantito" icon="fa-shield-halved" slot={0} index={0}
          value={kpi.garantito} format={(n) => fmtEurK(n)}
          spark={kpi.sparkGarantito}
          info={`Prenotazioni confermate a libro per le date dell'orizzonte: è la parte del forecast che non dipende da domanda ancora da acquisire. Copre il ${fmtPct(kpi.coperturaGarantito, 0)} del budget del periodo — a questa distanza dall'arrivo è fisiologico che non sia ancora tutto a libro.`}
        />
        <KpiTile
          label="Forecast opzionato" icon="fa-hourglass-half" slot={3} index={1}
          value={kpi.opzionato} format={(n) => fmtEurK(n)}
          info="Quote e opzioni a libro non ancora confermate: valore da lavorare prima della scadenza dell'opzione."
        />
        <KpiTile
          label="Chiusura attesa" icon="fa-flag-checkered" slot={4} index={2}
          value={kpi.atteso} format={(n) => fmtEurK(n)}
          delta={kpi.deltaBudget}
          deltaLabel={`${fmtDelta(kpi.deltaBudget)} sul budget`}
          spark={kpi.sparkAtteso}
          info={`Garantito, opzionato e domanda ancora attesa dalla curva di prenotazione, contro il budget del periodo (${fmtEurK(kpi.budget)}).`}
        />
        <KpiTile
          label="Occupazione attesa" icon="fa-door-open" slot={6} index={3}
          value={kpi.occAttesa} format={(n) => fmtPct(n)}
          spark={kpi.sparkOcc}
          info="Occupazione media dell'orizzonte a fine corsa, camere attese sulle camere disponibili."
        />
        <KpiTile
          label="ADR atteso" icon="fa-tag" slot={1} index={4}
          value={kpi.adrAtteso} format={(n) => fmtEur(n, 0)}
          info={`Ricavo medio per camera attesa sull'orizzonte: ${fmtInt(kpi.camereAttese)} camere previste.`}
        />
      </div>

      {/* ── Forecast per data di soggiorno ────────────────────────────────── */}
      <ChartCard
        className="fa__main"
        index={0}
        title="Forecast per data di soggiorno"
        subtitle="Confermato, atteso, budget e anno precedente"
        badge={fmtEurK(kpi.atteso)}
        legend={[
          { key: 'gar', name: 'Garantito a libro', color: series(0) },
          { key: 'att', name: 'Chiusura attesa', color: series(4) },
          { key: 'bud', name: 'Budget', color: CHART.forecast },
          { key: 'ly', name: 'Anno precedente', color: CHART.ly },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'trend', label: 'Andamento' },
              { id: 'dettaglio', label: 'Dettaglio' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as 'trend' | 'dettaglio')}
          />
        )}
        footer={vista === 'trend' ? (
          <span className="fa__foot">
            Sull'orizzonte manca ancora da acquisire <strong>{fmtEurK(kpi.daAcquisire)}</strong>
            {kpi.peggiore
              ? <> · settimana più critica {kpi.peggiore.label} ({fmtEurK(kpi.peggiore.gap)} sul budget)</>
              : ' · tutte le settimane sono sopra budget'}
          </span>
        ) : undefined}
      >
        {vista === 'trend' ? (
          <div className="fa__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Un solo asse dei valori: sono tutti ricavi in € */}
              <ComposedChart data={data.giorni} margin={{ top: 6, right: 8, left: -4, bottom: 0 }}>
                <defs>
                  <linearGradient id="fa-gar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series(0)} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval="preserveStartEnd" />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{
                        garantito: 'Garantito a libro', atteso: 'Chiusura attesa',
                        budget: 'Budget', ly: 'Anno precedente',
                      }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                <Area
                  type="monotone" dataKey="garantito" stroke={series(0)} strokeWidth={2}
                  fill="url(#fa-gar)" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="atteso" stroke={series(4)} strokeWidth={2.4} dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                {/* Budget: un riferimento, quindi tratteggiato e mai riempito */}
                <Line
                  type="monotone" dataKey="budget" stroke={CHART.forecast} strokeWidth={2}
                  strokeDasharray="5 3" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="ly" stroke={CHART.ly} strokeWidth={1.6} dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(3)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="fa__detail">
            <div className="sib-table-wrap fa__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <colgroup>
                  <col className="fa__col-data" />
                  <col className="fa__col-num" />
                  <col className="fa__col-num" />
                  <col className="fa__col-num" />
                  <col className="fa__col-num" />
                  <col className="fa__col-num" />
                  <col className="fa__col-num" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th className="fa__num">Garantito</th>
                    <th className="fa__num">Opzionato</th>
                    <th className="fa__num">Da acquisire</th>
                    <th className="fa__num">Attesa</th>
                    <th className="fa__num">Occupazione</th>
                    <th className="fa__num">vs budget</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((g) => (
                    <tr key={g.label} className={g.weekend ? 'fa__row--we' : undefined}>
                      <td>{g.label}</td>
                      <td className="fa__num">{fmtEurK(g.garantito)}</td>
                      <td className="fa__num">{fmtEurK(g.opzionato)}</td>
                      <td className="fa__num">{fmtEurK(g.daAcquisire)}</td>
                      <td className="fa__num">{fmtEurK(g.atteso)}</td>
                      <td className="fa__num">{fmtPct(g.occAttesa, 0)}</td>
                      <td className="fa__num">
                        <DeltaBadge
                          value={g.budget ? ((g.atteso - g.budget) / g.budget) * 100 : 0}
                          size="sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="fa__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Composizione del forecast ─────────────────────────────────────── */}
      <ChartCard
        className="fa__comp"
        index={1}
        title="Composizione"
        subtitle="Tre livelli di certezza"
        legend={composizione.map((v) => ({
          key: v.label, name: v.label, color: v.colore,
          value: fmtPct(kpi.atteso ? (v.valore / kpi.atteso) * 100 : 0, 0),
        }))}
        footer={`Budget del periodo ${fmtEurK(kpi.budget)}: il confermato ne copre il ${fmtPct(kpi.coperturaGarantito, 0)}.`}
      >
        <div className="fa__donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={composizione} dataKey="valore" nameKey="label"
                innerRadius="68%" outerRadius="88%" paddingAngle={2}
                stroke={CHART.surface} strokeWidth={2}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {composizione.map((v) => <Cell key={v.label} fill={v.colore} />)}
              </Pie>
              <RTooltip content={<ChartTooltip format={(v) => fmtEur(v, 0)} />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Al centro la copertura del budget: è il numero che manca alla legenda
              (le tre quote) e al KPI (il valore atteso), e sta nel foro dell'anello
              anche quando la card è bassa. */}
          <div className="fa__donut-center">
            <span className="fa__donut-val">{fmtPct(kpi.coperturaGarantito, 0)}</span>
            <span className="fa__donut-lbl">del budget</span>
          </div>
        </div>
      </ChartCard>

      {/* ── Settimane da presidiare ───────────────────────────────────────── */}
      <ChartCard
        className="fa__sett"
        index={2}
        title="Settimane contro budget"
        subtitle="Scostamento della chiusura attesa, settimana per settimana"
        footer={kpi.settimaneSotto > 0
          ? `${kpi.settimaneSotto} settimane su ${data.settimane.length} chiudono sotto budget: lì servono prezzo o distribuzione, non attesa.`
          : 'Tutte le settimane dell\'orizzonte chiudono sopra budget.'}
      >
        <div className="fa__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.settimane} margin={{ top: 18, right: 8, left: -4, bottom: 0 }} barCategoryGap="24%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={(
                  <ChartTooltip
                    names={{ gap: 'Scostamento sul budget' }}
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
              <ReferenceLine y={0} stroke={CHART.axis} />
              <Bar
                dataKey="gap" radius={[3, 3, 3, 3]} maxBarSize={26}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {data.settimane.map((s) => (
                  // Colore di stato: la settimana chiude sopra o sotto il budget
                  <Cell key={s.label} fill={s.gap >= 0 ? CHART.good : CHART.bad} />
                ))}
                {/* Etichetta sopra la barra senza andare a capo: su barre sottili
                    `position="top"` spezzerebbe "12,1k €" su due righe. */}
                <LabelList dataKey="gap" content={barTopLabel()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Ranking del portafoglio futuro ────────────────────────────────── */}
      <ChartCard
        className="fa__rank"
        index={3}
        title={dimCorrente.titolo}
        subtitle="Chiusura attesa per voce"
        rail={(
          <BiVerticalTabs
            tabs={DIMENSIONI.map((d) => ({ id: d.key, label: d.label }))}
            active={dimensione}
            onChange={(id) => setDimensione(id as Dimensione)}
          />
        )}
      >
        <div className="fa__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={voci} layout="vertical" margin={{ top: 2, right: 54, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis
                type="category" dataKey="label" {...yAxisProps} width={116} interval={0}
                tick={{ fontSize: 11, fill: CHART.ink }}
              />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ valore: 'Chiusura attesa' }} format={(v) => fmtEur(v, 0)} />}
              />
              <Bar
                dataKey="valore" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={14}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                <LabelList dataKey="valore" content={barEndLabel()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </BiPage>
  )
}
