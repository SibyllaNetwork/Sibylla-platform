import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import TruncatedText from '../../../core/components/TruncatedText'
import {
  ANIM, BiPage, ChartCard, ChartTooltip, DeltaBadge, barEndLabel,
  CHART, fmtEur, fmtEurK, fmtPct, gridProps, reducedMotion, series, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import { buildFinance, computeDecisioni, type FinanceData } from '../_data/financeMock'
import './DecisionTree.sass'

// ─── DECISION TREE ──────────────────────────────────────────────────────────────
//  Le leve di gestione messe a confronto per VALORE ATTESO, non per caso migliore.
//    • albero a tre livelli: la domanda, le quattro decisioni possibili, gli esiti di
//      quella selezionata con la rispettiva probabilità
//    • valore atteso per decisione: la somma degli esiti pesati sulle probabilità
//    • esposizione della decisione scelta: caso migliore, caso peggiore, probabilità
//      di migliorare il margine
//  Gli esiti escono dallo STESSO motore di simulazione di WIF analysis
//  (`applyScenario` in `finance/_data/financeMock`): niente numeri paralleli.
//  Deroga consapevole: qui non c'è la fascia KPI, perché la pagina è una sola
//  domanda con le sue risposte e l'albero ha bisogno di tutta l'altezza.

export default function DecisionTree({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [scelta, setScelta] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeDecisioni(data), [data])

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

  const still = reducedMotion()

  // Senza scelta esplicita si mostra la decisione col valore atteso più alto: la
  // pagina apre già su una risposta, non su un elenco da interpretare.
  const attiva = useMemo(
    () => kpi.decisioni.find((d) => d.key === scelta) ?? kpi.decisioni[0] ?? null,
    [kpi, scelta],
  )

  // Scala simmetrica: guadagno e perdita di margine pesano visivamente uguale
  const scalaValori = useMemo(() => {
    const estremo = Math.max(...kpi.decisioni.map((d) => Math.abs(d.valoreAtteso)), 1) * 1.9
    return [-estremo, estremo] as [number, number]
  }, [kpi])

  return (
    <BiPage
      title="Decision tree"
      subtitle={`Quale leva conviene muovere nel ${data.anno}: esiti, probabilità e valore atteso`}
      glossary={['GOP', 'ADR', 'occupazione', 'costiFissi', 'costiVariabili', 'delta']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="dt__grid"
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
            className="dt__filter dt__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="dt__filter"
          />
          <span className="dt__note">
            <i className="fa-solid fa-diagram-project" aria-hidden="true" />
            Valore atteso più alto: {kpi.migliore?.label ?? '—'}
            {kpi.migliore && ` (${fmtEurK(kpi.migliore.valoreAtteso)} di margine)`}
          </span>
        </>
      )}
    >
      {/* ── Albero delle decisioni ───────────────────────────────────────── */}
      <ChartCard
        className="dt__albero"
        index={0}
        title="Albero delle decisioni"
        subtitle="Scegli una leva a sinistra: a destra compaiono gli esiti possibili con la loro probabilità"
        badge={`base ${fmtEurK(kpi.gopBase)}`}
        footer={attiva
          ? `${attiva.label}: ${attiva.ipotesi}. Valore atteso ${fmtEurK(attiva.valoreAtteso)} di margine, con ${fmtPct(attiva.probMiglioramento, 0)} di probabilità di migliorare.`
          : undefined}
      >
        <div className="dt__tree">
          {/* Livello 1: la domanda e il punto di partenza */}
          <div className="dt__root">
            <span className="dt__root-lbl">Come recuperare margine?</span>
            <span className="dt__root-val">{fmtEurK(kpi.gopBase)}</span>
            <span className="dt__root-meta">margine attuale</span>
          </div>

          {/* Livello 2: le decisioni. La riga di collegamento è verticale fra il
              centro della prima e dell'ultima voce: --spine è quella distanza. */}
          <ul
            className="dt__branches"
            style={{ ['--spine' as any]: `${100 / (kpi.decisioni.length * 2)}%` }}
          >
            {kpi.decisioni.map((d) => (
              <li className="dt__branch" key={d.key}>
                <button
                  type="button"
                  className={`dt__node ${d.key === attiva?.key ? 'dt__node--on' : ''}`}
                  onClick={() => setScelta(d.key)}
                  aria-pressed={d.key === attiva?.key}
                >
                  {/* Etichetta su una riga intera: il valore atteso va sotto, così il
                      nome della leva non viene troncato dal badge. */}
                  <TruncatedText text={d.label} className="dt__node-lbl" />
                  <span className="dt__node-bottom">
                    <DeltaBadge value={d.valoreAtteso} label={fmtEurK(d.valoreAtteso)} size="sm" />
                    <TruncatedText text={d.descrizione} className="dt__node-meta" />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Livello 3: gli esiti della decisione attiva */}
          <ul
            className="dt__leaves"
            style={{ ['--spine' as any]: `${100 / ((attiva?.esiti.length ?? 1) * 2)}%` }}
          >
            {(attiva?.esiti ?? []).map((e) => (
              <li className="dt__leaf" key={e.key}>
                <span className="dt__leaf-prob">{fmtPct(e.probabilita, 0)}</span>
                <span className="dt__leaf-testi">
                  <TruncatedText text={e.label} className="dt__leaf-lbl" />
                  <span className="dt__leaf-bottom">
                    <DeltaBadge value={e.delta} label={fmtEurK(e.delta)} size="sm" />
                    <span className="dt__leaf-meta">margine {fmtEurK(e.gop)}</span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>

      {/* ── Valore atteso ────────────────────────────────────────────────── */}
      <ChartCard
        className="dt__valori"
        index={1}
        title="Valore atteso per decisione"
        subtitle="Esiti pesati sulle probabilità, non il caso migliore"
        footer="Il caso migliore di una leva può essere alto e il suo valore atteso basso: conta la probabilità con cui si verifica."
      >
        <div className="dt__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={kpi.decisioni} layout="vertical"
              margin={{ top: 2, right: 6, left: 6, bottom: 0 }} barCategoryGap="24%"
            >
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide domain={scalaValori} />
              <YAxis
                type="category" dataKey="breve" {...yAxisProps} width={78} interval={0}
                tick={{ fontSize: 11, fill: CHART.ink }}
              />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ valoreAtteso: 'Valore atteso' }} format={(v) => fmtEur(v, 0)} />}
              />
              {/* Lo zero è "non muovere nulla": sotto, la leva distrugge margine */}
              <ReferenceLine x={0} stroke={CHART.axis} />
              <Bar
                dataKey="valoreAtteso" radius={[0, 3, 3, 0]} maxBarSize={16}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {kpi.decisioni.map((d) => (
                  <Cell key={d.key} fill={d.valoreAtteso >= 0 ? series(0) : CHART.bad} />
                ))}
                <LabelList dataKey="valoreAtteso" content={barEndLabel()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Esposizione della decisione scelta ───────────────────────────── */}
      <ChartCard
        className="dt__esp"
        index={2}
        title="Esposizione della leva scelta"
        subtitle={attiva?.label ?? '—'}
      >
        <ul className="dt__figures">
          <li className="dt__figure">
            <span className="dt__figure-lbl">Valore atteso</span>
            <span className="dt__figure-val">{fmtEurK(attiva?.valoreAtteso ?? 0)}</span>
          </li>
          <li className="dt__figure">
            <span className="dt__figure-lbl">Caso migliore</span>
            <span className="dt__figure-val">{fmtEurK(attiva?.migliore ?? 0)}</span>
          </li>
          <li className="dt__figure">
            <span className="dt__figure-lbl">Caso peggiore</span>
            <span className="dt__figure-val">{fmtEurK(attiva?.peggiore ?? 0)}</span>
          </li>
          <li className="dt__figure">
            <span className="dt__figure-lbl">Probabilità di migliorare</span>
            <span className="dt__figure-val">{fmtPct(attiva?.probMiglioramento ?? 0, 0)}</span>
          </li>
          <li className="dt__figure">
            <span className="dt__figure-lbl">Margine di partenza</span>
            <span className="dt__figure-val">{fmtEurK(kpi.gopBase)}</span>
          </li>
        </ul>
      </ChartCard>
    </BiPage>
  )
}
