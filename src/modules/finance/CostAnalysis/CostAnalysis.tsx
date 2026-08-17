import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line,
  ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Pagination from '../../../core/components/Pagination'
import TruncatedText from '../../../core/components/TruncatedText'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, KpiTile, barEndLabel,
  CHART, cursorProps, fmtAxisNum, fmtDelta, fmtEur, fmtEurK, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import {
  FAMIGLIE_COSTO, buildFinance, computeCosti, type FamigliaCosto, type FinanceData,
} from '../_data/financeMock'
import './CostAnalysis.sass'

// ─── COST ANALYSIS ──────────────────────────────────────────────────────────────
//  Dove va il denaro e dove si può intervenire.
//    • fascia indicatori: costi totali, incidenza sui ricavi, costo del personale,
//      food cost, costo per camera occupata
//    • costi per mese per famiglia di spesa, con la vista "vs budget" e il dettaglio
//      voce per voce dietro i tab verticali
//    • costo per camera occupata separato in variabile e fisso: è la lettura che
//      spiega i mesi in perdita (i fissi si spalmano su poche camere)
//    • scostamento dal budget per famiglia: da quale voce nasce lo sforamento
//    • costi per centro di costo: quanto pesano sui ricavi del reparto che li genera
//  Modello condiviso in `finance/_data/financeMock` (le stesse voci del conto
//  economico di Finance overview: le due pagine non possono contraddirsi).

type Vista = 'composizione' | 'budget' | 'dettaglio'

export default function CostAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [vista, setVista] = useState<Vista>('composizione')
  const [spente, setSpente] = useState<string[]>([])
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeCosti(data), [data])

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

  // Le famiglie spente restano nella legenda (in grigio): si tolgono dalle barre per
  // leggere meglio le altre, non si perde l'informazione che esistono.
  const accesa = (k: FamigliaCosto) => !spente.includes(k)
  const toggle = (k: string) => setSpente((v) => (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]))

  const legendaFamiglie = FAMIGLIE_COSTO.map((f, i) => ({
    key: f.key,
    name: f.breve,
    color: series(i),
    off: !accesa(f.key),
  }))

  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 28, headerHeight: 30, min: 3, max: 13,
  })
  const totPagine = Math.max(1, Math.ceil(kpi.voci.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = kpi.voci.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  // Scala simmetrica intorno allo zero: sopra e sotto budget pesano visivamente
  // uguale, e il margine in più lascia spazio alle etichette agli estremi.
  const scalaEfficienza = useMemo(() => {
    const valori = kpi.perFamiglia.map((f) => f.effettoEfficienza)
    const estremo = Math.max(...valori.map((v) => Math.abs(v)), 1) * 1.55
    return [-estremo, estremo] as [number, number]
  }, [kpi])

  const nomiFamiglie = FAMIGLIE_COSTO.reduce<Record<string, string>>((acc, f) => {
    acc[f.key] = f.label
    return acc
  }, {})

  return (
    <BiPage
      title="Cost analysis"
      subtitle={`Costi ${data.anno}: per natura della spesa, per camera occupata e contro il budget`}
      glossary={['costiFissi', 'costiVariabili', 'incidenzaPersonale', 'foodCost', 'costoPerCamera', 'scostamento', 'GOP', 'TY', 'LY', 'delta']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="ca__grid"
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
            className="ca__filter ca__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="ca__filter"
          />
          <span className="ca__note">
            <i className="fa-solid fa-scissors" aria-hidden="true" />
            Voce meno efficiente: {kpi.vocePeggiore?.label ?? '—'}
            {kpi.vocePeggiore && ` (${fmtEurK(kpi.vocePeggiore.effettoEfficienza)} a parità di volumi)`}
          </span>
        </>
      )}
    >
      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="ca__kpis">
        <KpiTile
          label="Costi totali" icon="fa-scissors" slot={0} index={0}
          value={kpi.costi} format={(n) => fmtEurK(n)}
          delta={kpi.deltaCosti} invertDelta spark={kpi.sparkCosti}
          info="Costi operativi dell'anno (diretti di reparto, indistribuiti, affitti e ammortamenti), confrontati con l'anno precedente."
        />
        <KpiTile
          label="Incidenza sui ricavi" icon="fa-percent" slot={1} index={1}
          value={kpi.incidenza} format={(n) => fmtPct(n)}
          delta={kpi.incidenza - kpi.incidenzaLY}
          deltaLabel={fmtDelta(kpi.incidenza - kpi.incidenzaLY, ' pt')}
          invertDelta spark={kpi.sparkIncidenza}
          info="Costi totali diviso ricavi totali: quanta parte del ricavo viene assorbita dalla gestione. Il confronto è in punti percentuali sull'anno precedente."
        />
        <KpiTile
          label="Costo del personale" icon="fa-users" slot={2} index={2}
          value={kpi.incidenzaPersonale} format={(n) => fmtPct(n)}
          spark={kpi.sparkPersonale} invertDelta
          info="Costo del personale di reparto e di amministrazione sui ricavi totali. Nell'hotellerie è la prima voce di costo."
        />
        <KpiTile
          label="Food cost" icon="fa-utensils" slot={3} index={3}
          value={kpi.foodCostPct} format={(n) => fmtPct(n)}
          spark={kpi.sparkFood} invertDelta
          info="Materie prime food & beverage sui ricavi F&B (non sui ricavi totali): è l'indicatore con cui si giudica la marginalità della cucina."
        />
        <KpiTile
          label="Costo per camera" icon="fa-bed" slot={4} index={4}
          value={kpi.costoPerCamera} format={(n) => fmtEur(n, 0)}
          spark={kpi.sparkPerCamera} invertDelta
          info="Costi totali diviso camere occupate: quanto costa servire una camera, comprese le quote fisse."
        />
      </div>

      {/* ── Costi per mese ───────────────────────────────────────────────── */}
      <ChartCard
        className="ca__main"
        index={0}
        title={`Costi per mese · ${data.anno}`}
        subtitle={vista === 'budget'
          ? 'Consuntivo contro budget, mese per mese'
          : 'Composizione per famiglia di spesa'}
        badge={fmtEurK(kpi.costi)}
        legend={vista === 'composizione' ? legendaFamiglie : vista === 'budget' ? [
          { key: 'totale', name: 'Costi TY', color: series(0) },
          { key: 'budget', name: 'Budget', color: CHART.forecast, dashed: true },
        ] : undefined}
        onLegendToggle={vista === 'composizione' ? toggle : undefined}
        // In vista Dettaglio niente piede: lo spazio serve alle righe della tabella
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'composizione', label: 'Famiglie' },
              { id: 'budget', label: 'Budget' },
              { id: 'dettaglio', label: 'Dettaglio' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as Vista)}
          />
        )}
        footer={vista === 'budget'
          ? `Consuntivo ${fmtEurK(kpi.costi)} contro ${fmtEurK(kpi.budget)} di budget: ${fmtEurK(kpi.scostamento)}, in gran parte per volumi venduti sopra il previsto.`
          : undefined}
      >
        {vista === 'composizione' && (
          <div className="ca__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Barre impilate: l'altezza totale è il costo del mese, i segmenti
                  sono le famiglie di spesa nell'ordine fisso degli slot. */}
              <BarChart data={kpi.perMese} margin={{ top: 6, right: 8, left: -4, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={<ChartTooltip names={nomiFamiglie} format={(v) => fmtEur(v, 0)} />}
                />
                {FAMIGLIE_COSTO.map((f, i) => (
                  accesa(f.key) ? (
                    <Bar
                      key={f.key} dataKey={f.key} stackId="costi" fill={series(i)} maxBarSize={34}
                      isAnimationActive={!still} animationBegin={ANIM.begin(i)}
                      animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                    />
                  ) : null
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {vista === 'budget' && (
          <div className="ca__chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={kpi.perMese} margin={{ top: 6, right: 8, left: -4, bottom: 0 }} barCategoryGap="24%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={<ChartTooltip names={{ totale: 'Costi TY', budget: 'Budget' }} format={(v) => fmtEur(v, 0)} />}
                />
                {/* Barre in colore di serie, non di stato: qui stare sopra il budget
                    non è di per sé un errore (si è venduto più del previsto). Il
                    giudizio sta nella card dell'efficienza, dove i volumi sono
                    neutralizzati. */}
                <Bar
                  dataKey="totale" fill={series(0)} radius={[3, 3, 0, 0]} maxBarSize={30}
                  isAnimationActive={!still}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="budget" stroke={CHART.forecast} strokeWidth={2}
                  strokeDasharray="5 3" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {vista === 'dettaglio' && (
          <div className="ca__detail">
            <div className="sib-table-wrap ca__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                {/* Larghezze in percentuale: la tabella non scrolla mai in orizzontale */}
                <colgroup>
                  <col className="ca__col-voce" />
                  <col className="ca__col-fam" />
                  <col className="ca__col-num" />
                  <col className="ca__col-num" />
                  <col className="ca__col-num" />
                  <col className="ca__col-num" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Voce di costo</th>
                    <th>Famiglia</th>
                    <th className="ca__num">Consuntivo</th>
                    <th className="ca__num">Budget</th>
                    <th className="ca__num">Efficienza</th>
                    <th className="ca__num">Su ricavi</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((v) => (
                    <tr key={v.key}>
                      <td><TruncatedText text={v.label} /></td>
                      <td>
                        <TruncatedText text={FAMIGLIE_COSTO.find((f) => f.key === v.famiglia)?.breve ?? '—'} />
                      </td>
                      <td className="ca__num">{fmtEur(v.valore, 0)}</td>
                      <td className="ca__num">{fmtEur(v.budget, 0)}</td>
                      {/* L'efficienza è la parte governabile: qui il colore di stato
                          ha un significato, sullo scostamento lordo no. */}
                      <td className={`ca__num ${v.effettoEfficienza > 0 ? 'ca__over' : 'ca__under'}`}>
                        {fmtEur(v.effettoEfficienza, 0)}
                      </td>
                      <td className="ca__num">{fmtPct(v.incidenza)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ca__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Costo per camera occupata ────────────────────────────────────── */}
      <ChartCard
        className="ca__cam"
        index={1}
        title="Costo per camera occupata"
        subtitle="Quanto pesa la parte fissa nei mesi vuoti"
        legend={[
          { key: 'var', name: 'Variabile', color: series(4) },
          { key: 'fis', name: 'Fisso', color: series(0) },
        ]}
        footer={`Costi fissi ${fmtPct(kpi.fissiPct, 0)} del totale: nei mesi vuoti si spalmano su meno camere. Media dell'anno ${fmtEur(kpi.costoPerCamera, 0)}.`}
      >
        <div className="ca__chart">
          <ResponsiveContainer width="100%" height="100%">
            {/* Aree impilate: la somma è il costo pieno di una camera occupata */}
            <AreaChart data={kpi.perMese} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              <YAxis
                {...yAxisProps} tickFormatter={fmtAxisNum} width={40}
                domain={[0, 'auto']} tickCount={5}
              />
              <RTooltip
                cursor={cursorProps}
                content={(
                  <ChartTooltip
                    names={{ perCameraVariabile: 'Variabile', perCameraFisso: 'Fisso' }}
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
              <Area
                type="monotone" dataKey="perCameraVariabile" stackId="cam"
                stroke={series(4)} strokeWidth={1.8} fill={series(4)} fillOpacity={0.24}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Area
                type="monotone" dataKey="perCameraFisso" stackId="cam"
                stroke={series(0)} strokeWidth={1.8} fill={series(0)} fillOpacity={0.24}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Scostamento dal budget ───────────────────────────────────────── */}
      <ChartCard
        className="ca__scost"
        index={2}
        title="Efficienza rispetto al budget"
        subtitle="Scostamento a parità di volumi venduti, famiglia per famiglia"
        badge={fmtEurK(kpi.effettoEfficienza)}
        footer={`Scostamento totale ${fmtEurK(kpi.scostamento)}: ${fmtEurK(kpi.effettoVolume)} da volumi, ${fmtEurK(kpi.effettoEfficienza)} da efficienza.`}
      >
        <div className="ca__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={kpi.perFamiglia} layout="vertical"
              margin={{ top: 2, right: 4, left: 0, bottom: 0 }} barCategoryGap="26%"
            >
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide domain={scalaEfficienza} />
              <YAxis
                type="category" dataKey="sigla" {...yAxisProps} width={88} interval={0}
                tick={{ fontSize: 10, fill: CHART.ink }}
              />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ effettoEfficienza: 'Efficienza' }} format={(v) => fmtEur(v, 0)} />}
              />
              {/* Lo zero è il budget riparametrato sui volumi effettivi: la barra
                  dice se, a parità di camere vendute, si è speso più o meno. */}
              <ReferenceLine x={0} stroke={CHART.axis} />
              <Bar
                dataKey="effettoEfficienza" radius={[0, 3, 3, 0]} maxBarSize={16}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {kpi.perFamiglia.map((f) => (
                  <Cell key={f.key} fill={f.effettoEfficienza > 0 ? CHART.bad : CHART.good} />
                ))}
                <LabelList dataKey="effettoEfficienza" content={barEndLabel()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Centri di costo ──────────────────────────────────────────────── */}
      <ChartCard
        className="ca__centri"
        index={3}
        title="Per centro di costo"
        subtitle="Quanto pesano sui ricavi che il reparto genera"
      >
        <ul className="ca__reparti">
          {kpi.centri.map((c) => (
            <li className="ca__reparto" key={c.key}>
              <span className="ca__reparto-top">
                <TruncatedText text={c.label} className="ca__reparto-lbl" />
                <span className="ca__reparto-val">{fmtEurK(c.valore)}</span>
                <span className="ca__reparto-pct">{fmtPct(c.incidenza, 0)}</span>
              </span>
              {/* Barra = incidenza del costo sui ricavi del centro: oltre il 100%
                  il reparto costa più di quanto porta. */}
              <span className="ca__reparto-bar">
                <span
                  className="ca__reparto-fill"
                  /* --w = incidenza sui ricavi del centro (valore runtime) */
                  style={{ ['--w' as any]: `${Math.max(0, Math.min(100, c.incidenza))}%` }}
                />
              </span>
              <span className="ca__reparto-meta">
                ricavi {fmtEurK(c.ricavi)} · {fmtPct(c.quota, 0)} dei costi totali
              </span>
            </li>
          ))}
        </ul>
      </ChartCard>
    </BiPage>
  )
}
