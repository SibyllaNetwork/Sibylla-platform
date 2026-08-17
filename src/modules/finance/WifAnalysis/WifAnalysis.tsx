import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line,
  ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { RangeField, SelectField } from '../../../core/components/form'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtDelta, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import {
  applyScenario, buildFinance, computeBep, LEVE_NEUTRE,
  type FinanceData, type Leve,
} from '../_data/financeMock'
import './WifAnalysis.sass'

// ─── WIF ANALYSIS (what if) ─────────────────────────────────────────────────────
//  Simulatore: si muovono quattro leve e si vede l'effetto sul conto economico.
//    prezzo (ADR) · camere occupate · costi fissi · costi variabili unitari
//  Il ricalcolo è quello vero del modello condiviso: i costi variabili seguono le
//  camere occupate, i fissi no, quindi la leva operativa emerge dai numeri.
//  In pagina:
//    • fascia indicatori: ricavi, GOP, marginalità, occupazione e ADR simulati,
//      ognuno confrontato con lo scenario base
//    • GOP mese per mese, base contro simulato (o i ricavi, dal tab)
//    • le quattro leve, con il valore risultante sotto ciascuna
//    • impatto isolato di ogni leva sul GOP: quale muovere per prima
//    • sintesi base / simulato / differenza

/** Scenari pronti: punti di partenza tipici invece della pagina "tutta a zero". */
const PRESET: { key: string; label: string; leve: Leve }[] = [
  { key: 'base', label: 'Scenario base', leve: LEVE_NEUTRE },
  { key: 'prezzo', label: 'Spinta sul prezzo', leve: { adr: 6, camere: -2, costiFissi: 0, costiVariabili: 1 } },
  { key: 'volume', label: 'Spinta sui volumi', leve: { adr: -4, camere: 8, costiFissi: 0, costiVariabili: 3 } },
  { key: 'efficienza', label: 'Efficienza sui costi', leve: { adr: 0, camere: 0, costiFissi: -6, costiVariabili: -5 } },
  { key: 'crisi', label: 'Calo di domanda', leve: { adr: -5, camere: -12, costiFissi: 0, costiVariabili: -4 } },
]

export default function WifAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [leve, setLeve] = useState<Leve>(LEVE_NEUTRE)
  const [vista, setVista] = useState<'gop' | 'ricavi'>('gop')
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])

  const base = useMemo(() => applyScenario(data, LEVE_NEUTRE), [data])
  const wif = useMemo(() => applyScenario(data, leve), [data, leve])
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

  const still = reducedMotion()
  const modificato = JSON.stringify(leve) !== JSON.stringify(LEVE_NEUTRE)

  // Serie mensile base + simulato per il grafico
  const serie = useMemo(
    () => base.perMese.map((m, i) => ({
      label: m.label,
      gopBase: m.gop,
      gopWif: wif.perMese[i]?.gop ?? 0,
      ricaviBase: m.ricavi,
      ricaviWif: wif.perMese[i]?.ricavi ?? 0,
    })),
    [base, wif],
  )

  // Impatto ISOLATO di ogni leva: si muove una sola leva per volta, alla posizione
  // impostata, e si misura la differenza di GOP. Dice quale leva pesa di più.
  const impatti = useMemo(() => {
    const voci: { key: keyof Leve; label: string }[] = [
      { key: 'adr', label: 'Prezzo (ADR)' },
      { key: 'camere', label: 'Camere occupate' },
      { key: 'costiFissi', label: 'Costi fissi' },
      { key: 'costiVariabili', label: 'Costi variabili' },
    ]
    return voci.map(({ key, label }) => {
      const sola: Leve = { ...LEVE_NEUTRE, [key]: leve[key] }
      const esito = applyScenario(data, sola)
      return { label, delta: esito.gop - base.gop, mossa: leve[key] }
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  }, [data, leve, base])

  const deltaGop = wif.gop - base.gop
  const deltaGopPct = base.gop ? (deltaGop / base.gop) * 100 : 0

  const imposta = (key: keyof Leve) => (valore: number) => setLeve((l) => ({ ...l, [key]: valore }))

  return (
    <BiPage
      title="WIF analysis"
      subtitle="Simula prezzo, volumi e costi e leggi l'effetto sul margine operativo"
      glossary={['GOP', 'GOPPAR', 'ADR', 'RevPAR', 'occupazione', 'TY', 'LY', 'delta']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="wf__grid"
      actions={(
        <button
          type="button"
          className="sib-btn sib-btn--secondary wf__reset"
          onClick={() => setLeve(LEVE_NEUTRE)}
          disabled={!modificato}
        >
          <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Azzera le leve
        </button>
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
            className="wf__filter wf__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="wf__filter"
          />
          <SelectField
            name="preset" label="Scenario"
            value={PRESET.find((p) => JSON.stringify(p.leve) === JSON.stringify(leve))?.key ?? 'custom'}
            onChange={(e) => {
              const p = PRESET.find((x) => x.key === e.target.value)
              if (p) setLeve(p.leve)
            }}
            options={[
              ...PRESET.map((p) => ({ value: p.key, label: p.label })),
              ...(PRESET.some((p) => JSON.stringify(p.leve) === JSON.stringify(leve))
                ? []
                : [{ value: 'custom', label: 'Personalizzato' }]),
            ]}
            className="wf__filter wf__filter--wide"
          />
          <span className="wf__note">
            <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
            Pareggio base a {fmtPct(bep.occBep, 0)} · leva operativa {bep.levaOperativa.toFixed(1)}×
          </span>
        </>
      )}
    >
      {/* ── Indicatori dello scenario simulato ────────────────────────────── */}
      <div className="wf__kpis">
        <KpiTile
          label="Ricavi simulati" icon="fa-sack-dollar" slot={0} index={0}
          value={wif.ricavi} format={(n) => fmtEurK(n)}
          delta={base.ricavi ? ((wif.ricavi - base.ricavi) / base.ricavi) * 100 : 0}
          info="Ricavi totali dello scenario simulato, confrontati con lo scenario base."
        />
        <KpiTile
          label="GOP simulato" icon="fa-chart-pie" slot={4} index={1}
          value={wif.gop} format={(n) => fmtEurK(n)}
          delta={deltaGopPct}
          deltaLabel={`${fmtDelta(deltaGopPct)} · ${fmtEurK(deltaGop)}`}
          info="Margine operativo lordo dello scenario simulato: la differenza in euro è l'effetto delle leve."
        />
        <KpiTile
          label="Marginalità" icon="fa-percent" slot={3} index={2}
          value={wif.gopPct} format={(n) => fmtPct(n)}
          delta={+(wif.gopPct - base.gopPct).toFixed(1)}
          deltaLabel={`${fmtDelta(wif.gopPct - base.gopPct, ' pt')}`}
          info="GOP diviso ricavi nello scenario simulato, a confronto con la marginalità base."
        />
        <KpiTile
          label="Occupazione" icon="fa-door-open" slot={6} index={3}
          value={wif.occ} format={(n) => fmtPct(n)}
          delta={+(wif.occ - base.occ).toFixed(1)}
          deltaLabel={`${fmtDelta(wif.occ - base.occ, ' pt')}`}
          info="Occupazione media dell'anno nello scenario simulato."
        />
        <KpiTile
          label="Ricavo per camera" icon="fa-tag" slot={1} index={4}
          value={wif.adr} format={(n) => fmtEur(n, 0)}
          delta={base.adr ? ((wif.adr - base.adr) / base.adr) * 100 : 0}
          info="Ricavo medio per camera venduta (camere, F&B e altri servizi) nello scenario simulato."
        />
      </div>

      {/* ── Base contro simulato ─────────────────────────────────────────── */}
      <ChartCard
        className="wf__main"
        index={0}
        title={vista === 'gop' ? `Margine operativo · ${data.anno}` : `Ricavi · ${data.anno}`}
        subtitle="Scenario base a confronto con lo scenario simulato"
        badge={fmtEurK(vista === 'gop' ? wif.gop : wif.ricavi)}
        legend={[
          { key: 'base', name: 'Base', color: CHART.ly },
          { key: 'wif', name: 'Simulato', color: series(0) },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'gop', label: 'Margine' },
              { id: 'ricavi', label: 'Ricavi' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as 'gop' | 'ricavi')}
          />
        )}
        footer={(
          <span className="wf__foot">
            {modificato ? (
              <>
                Effetto delle leve sul margine dell'anno:{' '}
                <strong>{fmtEurK(deltaGop)}</strong> <DeltaBadge value={deltaGopPct} size="sm" />
              </>
            ) : (
              'Muovi una leva per vedere lo scostamento rispetto allo scenario base.'
            )}
          </span>
        )}
      >
        <div className="wf__chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 6, right: 8, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="wf-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series(0)} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              {/* Un solo asse: base e simulato sono la stessa misura in € */}
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
              <RTooltip
                cursor={cursorProps}
                content={(
                  <ChartTooltip
                    names={{
                      gopBase: 'GOP base', gopWif: 'GOP simulato',
                      ricaviBase: 'Ricavi base', ricaviWif: 'Ricavi simulati',
                    }}
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
              {/* Il pareggio è a zero margine: sopra si guadagna, sotto si perde */}
              {vista === 'gop' && <ReferenceLine y={0} stroke={CHART.axis} />}
              <Line
                type="monotone" dataKey={vista === 'gop' ? 'gopBase' : 'ricaviBase'}
                stroke={CHART.ly} strokeWidth={1.8} dot={false}
                isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Line
                type="monotone" dataKey={vista === 'gop' ? 'gopWif' : 'ricaviWif'}
                stroke={series(0)} strokeWidth={2.6}
                dot={{ r: 2.5, strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Le quattro leve ──────────────────────────────────────────────── */}
      <ChartCard
        className="wf__leve"
        index={1}
        title="Leve della simulazione"
        subtitle="Sposta e leggi subito l'effetto"
      >
        <div className="wf__sliders">
          <RangeField
            label="Prezzo (ADR)" name="adr" value={leve.adr} onChange={imposta('adr')}
            min={-20} max={20}
            hint={`ADR ${fmtEur(base.adr * (1 + leve.adr / 100), 0)} per camera venduta`}
          />
          <RangeField
            label="Camere occupate" name="camere" value={leve.camere} onChange={imposta('camere')}
            min={-25} max={25}
            hint={`${fmtInt(Math.round(wif.camereVendute))} camere · occupazione ${fmtPct(wif.occ, 0)}`}
          />
          <RangeField
            label="Costi fissi" name="costiFissi" value={leve.costiFissi} onChange={imposta('costiFissi')}
            min={-20} max={20}
            hint={`${fmtEurK(bep.costiFissi * (1 + leve.costiFissi / 100))} nell'anno`}
          />
          <RangeField
            label="Costi variabili" name="costiVariabili" value={leve.costiVariabili} onChange={imposta('costiVariabili')}
            min={-20} max={20}
            hint={`${fmtEur(bep.cvu * (1 + leve.costiVariabili / 100), 0)} per camera occupata`}
          />
        </div>
      </ChartCard>

      {/* ── Impatto isolato di ogni leva ─────────────────────────────────── */}
      <ChartCard
        className="wf__imp"
        index={2}
        title="Impatto per leva"
        subtitle="Effetto sul margine muovendo una sola leva per volta"
        footer="Le leve sono ordinate per peso: la prima è quella che sposta di più il margine, a parità di variazione impostata."
      >
        <div className="wf__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={impatti} layout="vertical" margin={{ top: 2, right: 70, left: 0, bottom: 0 }} barCategoryGap="24%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={144} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ delta: 'Effetto sul margine' }} format={(v) => fmtEur(v, 0)} />}
              />
              <ReferenceLine x={0} stroke={CHART.axis} />
              <Bar
                dataKey="delta" radius={[3, 3, 3, 3]} maxBarSize={16}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {impatti.map((i) => (
                  // Colore di stato: la leva migliora o peggiora il margine
                  <Cell key={i.label} fill={i.delta >= 0 ? CHART.good : CHART.bad} />
                ))}
                <LabelList
                  dataKey="delta" position="right"
                  formatter={(v: any) => (Number(v) === 0 ? '—' : fmtEurK(Number(v)))}
                  className="wf__bar-label"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Sintesi base / simulato ──────────────────────────────────────── */}
      <ChartCard
        className="wf__sint"
        index={3}
        title="Sintesi dello scenario"
        subtitle="Base, simulato e differenza"
      >
        <div className="sib-table-wrap wf__sint-table">
          <table className="sib-table">
            <colgroup>
              <col className="wf__col-voce" />
              <col className="wf__col-num" />
              <col className="wf__col-num" />
              <col className="wf__col-num" />
            </colgroup>
            <thead>
              <tr>
                <th>Voce</th>
                <th className="wf__num">Base</th>
                <th className="wf__num">Simulato</th>
                <th className="wf__num">Differenza</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Ricavi', b: base.ricavi, w: wif.ricavi },
                { label: 'Costi', b: base.costi, w: wif.costi },
                { label: 'Margine operativo', b: base.gop, w: wif.gop },
                { label: 'Camere vendute', b: base.camereVendute, w: wif.camereVendute, camere: true },
              ].map((r) => (
                <tr key={r.label} className={r.label === 'Margine operativo' ? 'wf__row--gop' : undefined}>
                  <td>{r.label}</td>
                  <td className="wf__num">{r.camere ? fmtInt(Math.round(r.b)) : fmtEurK(r.b)}</td>
                  <td className="wf__num">{r.camere ? fmtInt(Math.round(r.w)) : fmtEurK(r.w)}</td>
                  <td className="wf__num">
                    <DeltaBadge
                      value={r.b ? ((r.w - r.b) / r.b) * 100 : 0}
                      label={r.camere ? fmtInt(Math.round(r.w - r.b)) : fmtEurK(r.w - r.b)}
                      invert={r.label === 'Costi'}
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
