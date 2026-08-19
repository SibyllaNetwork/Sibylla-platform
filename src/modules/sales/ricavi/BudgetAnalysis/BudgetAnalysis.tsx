import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line,
  ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../../core/components/form'
import Tooltip from '../../../../core/components/Tooltip'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile, barRightLabel,
  CHART, cursorProps, fmtAxisNum, fmtDelta, fmtEur, fmtEurK, fmtPct, gridProps,
  reducedMotion, series, xAxisProps, yAxisProps,
} from '../../../../core/bi'
import { apiFetchSibylla } from '../../../../services/api'
import { buildFinance, MESI, type FinanceData } from '../../../finance/_data/financeMock'
import {
  AMBITI, budgetMesi, computeBudgetKpi, perCameraDi, scostamentiBudget, sintesiBudget,
  valoriDi, type Ambito, type Misura, type PerCamera,
} from './budgetAnalysis.data'
import './BudgetAnalysis.sass'

// ─── BUDGET ANALYSIS ────────────────────────────────────────────────────────────
//  Il budget contro il consuntivo, in una schermata:
//    • fascia indicatori: ricavi, scostamento sul margine, costi, margine,
//      atterraggio d'anno — ognuno letto contro il budget dello stesso periodo
//    • budget e consuntivo mese per mese, con lo scostamento progressivo (i mesi
//      non ancora chiusi sono previsione, e si vedono)
//    • indicatori per camera disponibile: RevPAR, CostPAR, GOPPAR contro budget
//    • da dove nasce lo scostamento: ricavi e famiglie di costo, misurate tutte
//      come effetto sul margine, ordinate per peso
//    • il conto del periodo in sei righe
//  Il selettore di periodo separa la lettura PROGRESSIVA (solo mesi chiusi) da
//  quella d'ANNO (con la previsione dentro): confondere le due è l'errore classico
//  della revisione di budget.

const MISURE: { id: Misura; label: string; titolo: string }[] = [
  { id: 'ricavi', label: 'Ricavi', titolo: 'Ricavi' },
  { id: 'costi', label: 'Costi', titolo: 'Costi' },
  { id: 'gop', label: 'Margine', titolo: 'Margine operativo' },
]

const PER_CAMERA: { id: PerCamera; label: string; nome: string; info: string }[] = [
  { id: 'revpar', label: 'RevPAR', nome: 'RevPAR', info: 'Ricavi per camera disponibile' },
  { id: 'costpar', label: 'CostPAR', nome: 'CostPAR', info: 'Costi per camera disponibile' },
  { id: 'goppar', label: 'GOPPAR', nome: 'GOPPAR', info: 'Margine per camera disponibile' },
]

/** Pagine di approfondimento raggiungibili dalla testata. */
const COLLEGAMENTI: { page: string; label: string; icon: string }[] = [
  { page: 'budget-ricavi', label: 'Imposta il budget dei ricavi', icon: 'fa-table-list' },
  { page: 'budget-costi', label: 'Imposta il budget dei costi', icon: 'fa-scissors' },
  { page: 'wif-analysis', label: 'Simulazione scenari', icon: 'fa-sliders' },
]

export default function BudgetAnalysis({ navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [ambito, setAmbito] = useState<Ambito>('ytd')
  const [misura, setMisura] = useState<Misura>('ricavi')
  const [perCamera, setPerCamera] = useState<PerCamera>('revpar')
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])

  const mesi = useMemo(() => budgetMesi(data), [data])
  const kpi = useMemo(() => computeBudgetKpi(data, ambito), [data, ambito])
  const scostamenti = useMemo(() => scostamentiBudget(data, ambito), [data, ambito])
  // Le prime cinque voci per peso: oltre, le etichette dell'asse si toccherebbero
  // nella card. Quello che resta fuori è dichiarato nel piede, non nascosto.
  const voci = useMemo(() => scostamenti.slice(0, 5), [scostamenti])
  const vociFuori = useMemo(() => {
    const resto = scostamenti.slice(5)
    return { quante: resto.length, effetto: resto.reduce((s, v) => s + v.effetto, 0) }
  }, [scostamenti])
  const sintesi = useMemo(() => sintesiBudget(data, ambito), [data, ambito])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<FinanceData>>('budget/GetAnalysis', {
      method: 'POST',
      body: { strutturaId, anno },
    })
      .then((d) => { if (!annullato && d) setRemoto(d) })
      .catch(() => { if (!annullato) setRemoto(null) })
      .finally(() => { if (!annullato) setLoading(false) })
    return () => { annullato = true }
  }, [strutturaId, anno])

  const still = reducedMotion()
  const soloChiusi = ambito === 'ytd'

  // I mesi del grafico: nella lettura progressiva la previsione resta fuori, così il
  // confronto col budget è fra periodi omogenei.
  const serie = useMemo(() => mesi
    .filter((m) => !soloChiusi || m.consuntivo)
    .map((m) => {
      const { valore, budget } = valoriDi(m, misura)
      return { label: m.label, valore, budget, cum: m.scostamentoCum, consuntivo: m.consuntivo }
    }), [mesi, misura, soloChiusi])

  const seriePerCamera = useMemo(() => mesi
    .filter((m) => !soloChiusi || m.consuntivo)
    .map((m) => {
      const { valore, budget } = perCameraDi(m, perCamera)
      return { label: m.label, valore, budget }
    }), [mesi, perCamera, soloChiusi])

  const misuraCorrente = MISURE.find((m) => m.id === misura) ?? MISURE[0]
  const perCameraCorrente = PER_CAMERA.find((p) => p.id === perCamera) ?? PER_CAMERA[0]

  // Totali della misura in vista: il badge della card deve dire quello che si legge.
  const totali = useMemo(() => serie.reduce(
    (a, r) => ({ valore: a.valore + r.valore, budget: a.budget + r.budget }),
    { valore: 0, budget: 0 },
  ), [serie])
  const deltaMisura = totali.budget ? ((totali.valore - totali.budget) / totali.budget) * 100 : 0

  return (
    <BiPage
      title="Budget analysis"
      subtitle={`Budget ${data.anno} contro consuntivo: scostamenti, indicatori per camera e atterraggio d'anno`}
      glossary={['budget', 'scostamento', 'atterraggio', 'RevPAR', 'CostPAR', 'GOPPAR', 'GOP', 'TY', 'LY', 'delta']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="bga__grid"
      actions={(
        <span className="bga__links">
          {COLLEGAMENTI.map((c) => (
            <Tooltip key={c.page} text={c.label}>
              <button
                type="button"
                className="sib-btn sib-btn--icon bga__link"
                onClick={() => navigate(c.page)}
                aria-label={c.label}
              >
                <i className={`fa-regular ${c.icon}`} aria-hidden="true" />
              </button>
            </Tooltip>
          ))}
        </span>
      )}
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
            className="bga__filter bga__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="bga__filter bga__filter--narrow"
          />
          <SelectField
            name="ambito" label="Periodo" value={ambito}
            onChange={(e) => setAmbito(e.target.value as Ambito)}
            options={AMBITI.map((a) => ({ value: a.key, label: a.label }))}
            className="bga__filter bga__filter--wide"
          />
          <span className="bga__note">
            <i className="fa-solid fa-calendar-check" aria-hidden="true" />
            {data.ultimoMeseConsuntivo > 0
              ? `Consuntivato fino a ${MESI[data.ultimoMeseConsuntivo - 1].toLowerCase()} · ${kpi.mesiSotto} mesi su ${kpi.mesiTotali} sotto budget`
              : 'Anno ancora tutto da consuntivare: i valori sono previsione'}
          </span>
        </>
      )}
    >
      {/* ── Indicatori contro il budget del periodo ───────────────────────── */}
      <div className="bga__kpis">
        <KpiTile
          label="Ricavi" icon="fa-sack-dollar" slot={0} index={0}
          value={kpi.ricavi} format={(n) => fmtEurK(n)}
          delta={kpi.deltaRicavi} spark={kpi.sparkRicavi}
          deltaLabel={`${fmtDelta(kpi.deltaRicavi)} sul budget`}
          info={`Ricavi del periodo contro il budget dello stesso periodo (${fmtEurK(kpi.ricaviBudget)}).`}
        />
        <KpiTile
          label="Scostamento sul margine" icon="fa-arrows-left-right-to-line" slot={4} index={1}
          value={kpi.scostamentoGop} format={(n) => fmtEurK(n)}
          delta={kpi.deltaGop} spark={kpi.sparkScostamento}
          deltaLabel={`${fmtDelta(kpi.deltaGop)} sul budget`}
          info="Margine consuntivato meno margine di budget: l'effetto complessivo di ricavi e costi. La serie mostra lo scostamento sommato mese su mese."
        />
        <KpiTile
          label="Costi" icon="fa-scissors" slot={5} index={2}
          value={kpi.costi} format={(n) => fmtEurK(n)}
          delta={kpi.deltaCosti} invertDelta spark={kpi.sparkCosti}
          deltaLabel={`${fmtDelta(kpi.deltaCosti)} sul budget`}
          info={`Costi del periodo contro il budget dello stesso periodo (${fmtEurK(kpi.costiBudget)}). Spendere meno del budget migliora il margine.`}
        />
        <KpiTile
          label="Budget realizzato" icon="fa-bullseye" slot={3} index={3}
          value={kpi.raggiungimento} format={(n) => fmtPct(n, 0)}
          info="Quota del budget di ricavi del periodo effettivamente realizzata: 100% significa esattamente a budget."
        />
        <KpiTile
          label="Atterraggio d'anno" icon="fa-plane-arrival" slot={1} index={4}
          value={kpi.atterraggio} format={(n) => fmtEurK(n)}
          delta={kpi.deltaAtterraggio}
          deltaLabel={`${fmtDelta(kpi.deltaAtterraggio)} sul budget d'anno`}
          info={`Chiusura attesa dei dodici mesi (mesi chiusi più previsione) contro il budget d'anno (${fmtEurK(kpi.budgetAnno)}).`}
        />
      </div>

      {/* ── Budget e consuntivo mese per mese ─────────────────────────────── */}
      <ChartCard
        className="bga__main"
        index={0}
        title={`${misuraCorrente.titolo} · budget contro consuntivo`}
        subtitle={soloChiusi ? 'Solo i mesi già chiusi' : 'Mesi chiusi e previsione dei mesi restanti'}
        badge={fmtEurK(totali.valore)}
        legend={[
          { key: 'bud', name: 'Budget', color: CHART.ly },
          { key: 'cons', name: 'Consuntivo', color: series(0) },
          ...(soloChiusi ? [] : [{ key: 'prev', name: 'Previsione', color: CHART.forecast }]),
          { key: 'cum', name: 'Scostamento progressivo', color: series(4) },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={MISURE.map((m) => ({ id: m.id, label: m.label }))}
            active={misura}
            onChange={(id) => setMisura(id as Misura)}
          />
        )}
        footer={(
          <span className="bga__foot">
            {misuraCorrente.titolo} del periodo <strong>{fmtEurK(totali.valore)}</strong> contro un budget di{' '}
            <strong>{fmtEurK(totali.budget)}</strong> <DeltaBadge value={deltaMisura} size="sm" invert={misura === 'costi'} />
            {kpi.peggiore && ` · mese peggiore ${kpi.peggiore.label} (${fmtEurK(kpi.peggiore.delta)} di margine)`}
          </span>
        )}
      >
        <div className="bga__chart">
          <ResponsiveContainer width="100%" height="100%">
            {/* Un solo asse dei valori: barre e scostamento cumulato sono tutti in € */}
            <ComposedChart data={serie} margin={{ top: 6, right: 8, left: -4, bottom: 0 }} barGap={2}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
              <RTooltip
                cursor={cursorProps}
                content={(
                  <ChartTooltip
                    names={{ budget: 'Budget', valore: misuraCorrente.titolo, cum: 'Scostamento progressivo' }}
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
              <ReferenceLine y={0} stroke={CHART.axis} />
              <Bar
                dataKey="budget" fill={CHART.ly} radius={[3, 3, 0, 0]} maxBarSize={16}
                isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Bar
                dataKey="valore" radius={[3, 3, 0, 0]} maxBarSize={16}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {/* I mesi non ancora chiusi sono previsione: colore dedicato, non
                    una sfumatura del consuntivo. */}
                {serie.map((r) => (
                  <Cell key={r.label} fill={r.consuntivo ? series(0) : CHART.forecast} />
                ))}
              </Bar>
              <Line
                type="monotone" dataKey="cum" stroke={series(4)} strokeWidth={2}
                dot={{ r: 2, strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Indicatori per camera disponibile ─────────────────────────────── */}
      <ChartCard
        className="bga__par"
        index={1}
        title={`${perCameraCorrente.nome} contro budget`}
        subtitle={perCameraCorrente.info}
        legend={[
          { key: 'bud', name: 'Budget', color: CHART.ly },
          { key: 'ty', name: 'Consuntivo', color: series(0) },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={PER_CAMERA.map((p) => ({ id: p.id, label: p.label }))}
            active={perCamera}
            onChange={(id) => setPerCamera(id as PerCamera)}
          />
        )}
      >
        <div className="bga__chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={seriePerCamera} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval="preserveStartEnd" />
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} width={40} />
              <RTooltip
                cursor={cursorProps}
                content={(
                  <ChartTooltip
                    names={{ budget: 'Budget', valore: perCameraCorrente.nome }}
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
              <ReferenceLine y={0} stroke={CHART.axis} />
              <Line
                type="monotone" dataKey="budget" stroke={CHART.ly} strokeWidth={1.8} dot={false}
                isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Line
                type="monotone" dataKey="valore" stroke={series(0)} strokeWidth={2.4}
                dot={{ r: 2, strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Da dove nasce lo scostamento ──────────────────────────────────── */}
      <ChartCard
        className="bga__var"
        index={2}
        title="Da dove nasce lo scostamento"
        subtitle="Effetto sul margine di ricavi e famiglie di costo"
        footer={(
          <>
            Le voci sono ordinate per peso e lette tutte come effetto sul margine: un costo sotto
            budget conta in positivo quanto un ricavo sopra budget.
            {vociFuori.quante > 0 && ` Le altre ${vociFuori.quante} voci pesano ${fmtEurK(vociFuori.effetto)}.`}
          </>
        )}
      >
        <div className="bga__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={voci} layout="vertical" margin={{ top: 2, right: 62, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis
                type="category" dataKey="label" {...yAxisProps} width={104} interval={0}
                tick={{ fontSize: 11, fill: CHART.ink }}
              />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ effetto: 'Effetto sul margine' }} format={(v) => fmtEur(v, 0)} />}
              />
              <ReferenceLine x={0} stroke={CHART.axis} />
              <Bar
                dataKey="effetto" radius={[3, 3, 3, 3]} maxBarSize={14}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {voci.map((v) => (
                  // Colore di stato: la voce ha aiutato o penalizzato il margine
                  <Cell key={v.key} fill={v.effetto >= 0 ? CHART.good : CHART.bad} />
                ))}
                {/* Scostamenti: un positivo grande e negativi piccoli. L'etichetta
                    sta sempre oltre lo zero, mai sopra le etichette di categoria. */}
                <LabelList dataKey="effetto" content={barRightLabel()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Il conto del periodo ──────────────────────────────────────────── */}
      <ChartCard
        className="bga__sint"
        index={3}
        title="Budget, consuntivo e scostamento"
        subtitle={soloChiusi ? 'Voci del periodo consuntivato' : 'Voci dell\'anno, previsione compresa'}
      >
        <div className="sib-table-wrap bga__sint-table">
          <table className="sib-table">
            <colgroup>
              <col className="bga__col-voce" />
              <col className="bga__col-num" />
              <col className="bga__col-num" />
              <col className="bga__col-num" />
            </colgroup>
            <thead>
              <tr>
                <th>Voce</th>
                <th className="bga__num">Budget</th>
                <th className="bga__num">Consuntivo</th>
                <th className="bga__num">Scostamento</th>
              </tr>
            </thead>
            <tbody>
              {sintesi.map((r) => (
                <tr key={r.label} className={r.totale ? 'bga__row--tot' : undefined}>
                  <td>{r.label}</td>
                  <td className="bga__num">{fmtEurK(r.budget)}</td>
                  <td className="bga__num">{fmtEurK(r.consuntivo)}</td>
                  <td className="bga__num">
                    <DeltaBadge
                      value={r.budget ? ((r.consuntivo - r.budget) / r.budget) * 100 : 0}
                      label={fmtEurK(r.consuntivo - r.budget)}
                      invert={r.costo}
                      size="sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </BiPage>
  )
}
