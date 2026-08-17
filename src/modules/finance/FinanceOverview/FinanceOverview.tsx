import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Tooltip from '../../../core/components/Tooltip'
import Pagination from '../../../core/components/Pagination'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtDelta, fmtEur, fmtEurK, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import {
  buildFinance, computeBep, computeFinanceKpi, type FinanceData,
} from '../_data/financeMock'
import './FinanceOverview.sass'

// ─── FINANCE OVERVIEW ───────────────────────────────────────────────────────────
//  Il conto economico della gestione, in una schermata:
//    • fascia indicatori: ricavi, costi, GOP, marginalità, GOPPAR
//    • ricavi, costi e margine mese per mese (+ vista Dettaglio tabellare)
//    • margine per reparto in impostazione USALI: dove si guadagna davvero
//    • costi per natura: dove va il denaro
//    • struttura dei costi fissa/variabile: quanto la gestione è rigida
//  Le pagine di approfondimento (pareggio, cassa, simulazioni) sono raggiungibili
//  dai pulsanti in testata.

const COLLEGAMENTI: { page: string; label: string; icon: string }[] = [
  { page: 'break-even', label: 'Punto di pareggio', icon: 'fa-scale-balanced' },
  { page: 'cashflow', label: 'Flussi di cassa', icon: 'fa-money-bill-transfer' },
  { page: 'wif-analysis', label: 'Simulazione scenari', icon: 'fa-sliders' },
  { page: 'cost-analysis', label: 'Analisi dei costi', icon: 'fa-scissors' },
]

export default function FinanceOverview({ navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [vista, setVista] = useState<'trend' | 'dettaglio'>('trend')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeFinanceKpi(data), [data])
  const bep = useMemo(() => computeBep(data.mesi), [data])

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

  // Costi per natura: le prime sette voci. NON si aggrega il resto in un "Altri
  // costi": in una classifica quella barra risulterebbe la più lunga e ingannerebbe
  // la lettura. Quanto resta fuori è dichiarato nel piede della card.
  const costiTop = useMemo(
    () => data.costiPerNatura.slice(0, 7).map((c) => ({ label: c.label, valore: c.valore })),
    [data],
  )
  const costiResto = useMemo(() => {
    const fuori = data.costiPerNatura.slice(7)
    return { voci: fuori.length, valore: fuori.reduce((s, c) => s + c.valore, 0) }
  }, [data])

  const struttura = useMemo(() => [
    { label: 'Costi fissi', valore: kpi.costiFissi },
    { label: 'Costi variabili', valore: kpi.costiVariabili },
  ], [kpi])

  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 30, headerHeight: 32, min: 4, max: 14,
  })
  const totPagine = Math.max(1, Math.ceil(data.mesi.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = data.mesi.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  return (
    <BiPage
      title="Finance overview"
      subtitle={`Conto economico ${data.anno}: ricavi, costi, margine per reparto e struttura dei costi`}
      glossary={['GOP', 'GOPPAR', 'TRevPAR', 'TY', 'LY', 'delta', 'ADR', 'RevPAR', 'occupazione']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="fo__grid"
      actions={(
        <span className="fo__links">
          {COLLEGAMENTI.map((c) => (
            <Tooltip key={c.page} text={c.label}>
              <button
                type="button"
                className="sib-btn sib-btn--icon fo__link"
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
            className="fo__filter fo__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="fo__filter"
          />
          <span className="fo__note">
            <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
            Pareggio a {fmtPct(bep.occBep, 0)} di occupazione · margine di sicurezza {fmtPct(bep.margineSicurezza, 0)}
          </span>
        </>
      )}
    >
      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="fo__kpis">
        <KpiTile
          label="Ricavi totali" icon="fa-sack-dollar" slot={0} index={0}
          value={kpi.ricavi} format={(n) => fmtEurK(n)}
          delta={kpi.deltaRicavi} spark={kpi.sparkRicavi}
          info="Ricavi di tutti i reparti (camere, food & beverage, altri servizi) nell'anno selezionato."
        />
        <KpiTile
          label="Costi totali" icon="fa-scissors" slot={5} index={1}
          value={kpi.costi} format={(n) => fmtEurK(n)}
          spark={kpi.sparkCosti}
          info="Costi diretti di reparto più i costi indistribuiti (amministrazione, marketing, energia, struttura)."
        />
        <KpiTile
          label="GOP" icon="fa-chart-pie" slot={4} index={2}
          value={kpi.gop} format={(n) => fmtEurK(n)}
          delta={kpi.deltaGop} spark={kpi.sparkGop}
          info="Gross Operating Profit: ricavi totali meno tutti i costi operativi."
        />
        <KpiTile
          label="Marginalità" icon="fa-percent" slot={3} index={3}
          value={kpi.gopPct} format={(n) => fmtPct(n)}
          info="GOP diviso ricavi totali: quanta parte del ricavo resta dopo i costi operativi."
        />
        <KpiTile
          label="GOPPAR" icon="fa-bed" slot={6} index={4}
          value={kpi.goppar} format={(n) => fmtEur(n, 0)}
          info="GOP per camera disponibile: il margine misurato sulla capacità della struttura."
        />
      </div>

      {/* ── Ricavi, costi e margine per mese ──────────────────────────────── */}
      <ChartCard
        className="fo__main"
        index={0}
        title={`Ricavi, costi e margine · ${data.anno}`}
        subtitle="Mese per mese, con il margine operativo lordo"
        badge={fmtEurK(kpi.gop)}
        legend={[
          { key: 'ric', name: 'Ricavi', color: series(0) },
          { key: 'cos', name: 'Costi', color: series(5) },
          { key: 'gop', name: 'GOP', color: series(4) },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'trend', label: 'Andamento', icon: 'fa-chart-column' },
              { id: 'dettaglio', label: 'Dettaglio', icon: 'fa-table-list' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as 'trend' | 'dettaglio')}
          />
        )}
      >
        {vista === 'trend' ? (
          <div className="fo__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Un solo asse dei valori: ricavi, costi e GOP sono tutti in € */}
              <ComposedChart data={data.mesi} margin={{ top: 6, right: 8, left: -4, bottom: 0 }} barGap={2}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ ricaviTotali: 'Ricavi', costiTotali: 'Costi', gop: 'GOP' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                <Bar
                  dataKey="ricaviTotali" fill={series(0)} radius={[4, 4, 0, 0]} maxBarSize={18}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Bar
                  dataKey="costiTotali" fill={series(5)} radius={[4, 4, 0, 0]} maxBarSize={18}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="gop" stroke={series(4)} strokeWidth={2.4}
                  dot={{ r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="fo__detail">
            <div className="sib-table-wrap fo__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <thead>
                  <tr>
                    <th>Mese</th>
                    <th className="fo__num">Ricavi</th>
                    <th className="fo__num">Costi</th>
                    <th className="fo__num">GOP</th>
                    <th className="fo__num">Marginalità</th>
                    <th className="fo__num">GOPPAR</th>
                    <th className="fo__num">Cassa</th>
                    <th className="fo__num">vs LY</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((m) => (
                    <tr key={m.mese}>
                      <td>
                        {m.label}
                        {!m.consuntivo && <span className="fo__tag">previsione</span>}
                      </td>
                      <td className="fo__num">{fmtEur(m.ricaviTotali, 0)}</td>
                      <td className="fo__num">{fmtEur(m.costiTotali, 0)}</td>
                      <td className="fo__num">{fmtEur(m.gop, 0)}</td>
                      <td className="fo__num">{fmtPct(m.gopPct)}</td>
                      <td className="fo__num">{fmtEur(m.goppar, 0)}</td>
                      <td className="fo__num">{fmtEur(m.cassa, 0)}</td>
                      <td className="fo__num">
                        <DeltaBadge value={m.ricaviLY ? ((m.ricaviTotali - m.ricaviLY) / m.ricaviLY) * 100 : 0} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="fo__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Margine per reparto ───────────────────────────────────────────── */}
      <ChartCard
        className="fo__rep"
        index={1}
        title="Margine per reparto"
        subtitle="Ricavi meno costi diretti, reparto per reparto"
        footer={`Costi indistribuiti dell'anno: ${fmtEurK(data.mesi.reduce((s, m) => s + m.costiIndistribuiti, 0))}`}
      >
        <ul className="fo__reparti">
          {data.reparti.map((r) => (
            <li className="fo__reparto" key={r.key}>
              <span className="fo__reparto-top">
                <span className="fo__reparto-lbl">{r.label}</span>
                <span className="fo__reparto-val">{fmtEurK(r.margine)}</span>
                <span className="fo__reparto-pct">{fmtPct(r.marginePct, 0)}</span>
              </span>
              {/* Barra di margine: la quota piena è il margine sul ricavo del reparto */}
              <span className="fo__reparto-bar">
                <span
                  className="fo__reparto-fill"
                  /* --w = marginalità del reparto (valore runtime) */
                  style={{ ['--w' as any]: `${Math.max(0, Math.min(100, r.marginePct))}%` }}
                />
              </span>
              <span className="fo__reparto-meta">
                ricavi {fmtEurK(r.ricavi)} · costi diretti {fmtEurK(r.costi)}
              </span>
            </li>
          ))}
        </ul>
      </ChartCard>

      {/* ── Costi per natura ──────────────────────────────────────────────── */}
      <ChartCard
        className="fo__cos"
        index={2}
        title="Costi per natura"
        subtitle="Dove va il denaro nell'anno"
        footer={costiResto.voci > 0
          ? `Prime 7 voci su ${data.costiPerNatura.length}: restano fuori ${fmtEurK(costiResto.valore)} su ${costiResto.voci} voci minori.`
          : undefined}
      >
        <div className="fo__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costiTop} layout="vertical" margin={{ top: 2, right: 74, left: 0, bottom: 0 }} barCategoryGap="18%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={172} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ valore: 'Costo' }} format={(v) => fmtEur(v, 0)} />}
              />
              <Bar
                dataKey="valore" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={14}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                <LabelList dataKey="valore" position="right" formatter={(v: any) => fmtEurK(Number(v))} className="fo__bar-label" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Struttura dei costi ───────────────────────────────────────────── */}
      <ChartCard
        className="fo__str"
        index={3}
        title="Struttura dei costi"
        subtitle="Quanto la gestione è rigida"
        legend={[
          { key: 'f', name: 'Costi fissi', color: series(0), value: fmtPct((kpi.costiFissi / (kpi.costi || 1)) * 100, 0) },
          { key: 'v', name: 'Costi variabili', color: series(4), value: fmtPct((kpi.costiVariabili / (kpi.costi || 1)) * 100, 0) },
        ]}
        footer={`Costo variabile per camera occupata: ${fmtEur(bep.cvu, 0)} · incidenza del personale sui ricavi ${fmtPct(kpi.incidenzaPersonale, 0)}`}
      >
        <div className="fo__donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={struttura} dataKey="valore" nameKey="label"
                innerRadius="62%" outerRadius="86%" paddingAngle={2}
                stroke={CHART.surface} strokeWidth={2}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {struttura.map((s, i) => <Cell key={s.label} fill={series(i === 0 ? 0 : 4)} />)}
              </Pie>
              <RTooltip content={<ChartTooltip format={(v) => fmtEur(v, 0)} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="fo__donut-center">
            <span className="fo__donut-val">{fmtPct((kpi.costiFissi / (kpi.costi || 1)) * 100, 0)}</span>
            <span className="fo__donut-lbl">di costi fissi</span>
          </div>
        </div>
      </ChartCard>
    </BiPage>
  )
}
