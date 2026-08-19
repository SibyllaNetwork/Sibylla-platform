import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line,
  ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Tooltip from '../../../core/components/Tooltip'
import Pagination from '../../../core/components/Pagination'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile, barEndLabel, barRightLabel,
  CHART, cursorProps, fmtAxisNum, fmtDec, fmtDelta, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import {
  DIMENSIONI, buildSales, computeSalesKpi, mixControLy,
  type Dimensione, type IndicatoreDomanda, type SalesData,
} from './salesOverview.data'
import './SalesOverview.sass'

// ─── SALES OVERVIEW ─────────────────────────────────────────────────────────────
//  La fotografia commerciale dell'anno, in una schermata:
//    • fascia indicatori: ricavi, occupazione, ADR, RevPAR, atterraggio d'anno
//    • ricavi mese per mese contro anno precedente e budget, con la previsione dei
//      mesi non ancora chiusi distinta dal consuntivo (+ vista Dettaglio tabellare)
//    • mix di vendita: canali, segmenti o agenzie, dal rail della card
//    • come cambia il mix: la quota di ogni voce contro l'anno precedente, dove il
//      segno dice se la struttura di vendita si sta spostando
//    • qualità della domanda: permanenza, anticipo di prenotazione, dispersione
//  Le pagine di dettaglio (mese, prezzo, occupazione, pickup, segmenti) sono
//  raggiungibili dai pulsanti in testata.

const COLLEGAMENTI: { page: string; label: string; icon: string }[] = [
  { page: 'monthly-trend', label: 'Andamento del mese', icon: 'fa-calendar-days' },
  { page: 'adr-analysis', label: 'Analisi del prezzo', icon: 'fa-tag' },
  { page: 'occ-analysis', label: 'Analisi dell’occupazione', icon: 'fa-door-open' },
  { page: 'pick-up', label: 'Pickup analysis', icon: 'fa-arrow-trend-up' },
  { page: 'segment-analysis', label: 'Analisi per segmento', icon: 'fa-people-group' },
]

export default function SalesOverview({ navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [vista, setVista] = useState<'trend' | 'dettaglio'>('trend')
  const [dimensione, setDimensione] = useState<Dimensione>('canali')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<SalesData> | null>(null)

  const mock = useMemo(() => buildSales(anno, strutturaId), [anno, strutturaId])
  const data: SalesData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeSalesKpi(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<SalesData>>('sales/GetOverview', {
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

  const voci = dimensione === 'canali' ? data.canali
    : dimensione === 'segmenti' ? data.segmenti
      : data.agenzie
  const dimCorrente = DIMENSIONI.find((d) => d.key === dimensione) ?? DIMENSIONI[0]

  // Il mix contro l'anno precedente: sull'anno intero, perché il mix è una struttura
  // di vendita e si legge sul ciclo completo.
  const confronto = useMemo(() => mixControLy(voci, kpi.atterraggioLY), [voci, kpi.atterraggioLY])
  const cresce = useMemo(() => [...confronto].sort((a, b) => b.deltaQuota - a.deltaQuota)[0], [confronto])
  const arretra = useMemo(() => [...confronto].sort((a, b) => a.deltaQuota - b.deltaQuota)[0], [confronto])

  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 28, headerHeight: 30, min: 4, max: 12,
  })
  const totPagine = Math.max(1, Math.ceil(data.mesi.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = data.mesi.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  return (
    <BiPage
      title="Sales overview"
      subtitle={`Andamento commerciale ${data.anno}: ricavi, prezzo, occupazione e mix di vendita`}
      glossary={['ADR', 'RevPAR', 'occupazione', 'budget', 'atterraggio', 'TY', 'LY', 'delta', 'ALOS', 'leadTime', 'cancellazioni', 'noShow', 'complimentary', 'dirette', 'B2B', 'gruppi', 'corporate', 'ranking']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="so__grid"
      actions={(
        <span className="so__links">
          {COLLEGAMENTI.map((c) => (
            <Tooltip key={c.page} text={c.label}>
              <button
                type="button"
                className="sib-btn sib-btn--icon so__link"
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
            className="so__filter so__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="so__filter"
          />
          <span className="so__note">
            <i className="fa-solid fa-bed" aria-hidden="true" />
            {fmtInt(data.camereDisponibili)} camere disponibili · {fmtInt(kpi.camere)} camere vendute nel periodo
          </span>
        </>
      )}
    >
      {/* ── Indicatori del periodo consuntivato ───────────────────────────── */}
      <div className="so__kpis">
        <KpiTile
          label="Ricavi camere" icon="fa-sack-dollar" slot={0} index={0}
          value={kpi.ricavi} format={(n) => fmtEurK(n)}
          delta={kpi.deltaRicavi} spark={kpi.sparkRicavi}
          info="Ricavi camere dei mesi già chiusi, confrontati con lo stesso periodo dell'anno precedente."
        />
        <KpiTile
          label="Occupazione" icon="fa-door-open" slot={6} index={1}
          value={kpi.occ} format={(n) => fmtPct(n)}
          delta={kpi.deltaOcc} deltaLabel={fmtDelta(kpi.deltaOcc, ' pt')}
          spark={kpi.sparkOcc}
          info="Camere vendute sulle camere disponibili nel periodo. Si confronta in punti percentuali."
        />
        <KpiTile
          label="ADR" icon="fa-tag" slot={1} index={2}
          value={kpi.adr} format={(n) => fmtEur(n, 0)}
          delta={kpi.deltaAdr} spark={kpi.sparkAdr}
          info="Ricavo medio per camera venduta nel periodo."
        />
        <KpiTile
          label="RevPAR" icon="fa-chart-simple" slot={2} index={3}
          value={kpi.revpar} format={(n) => fmtEur(n, 0)}
          delta={kpi.deltaRevpar} spark={kpi.sparkRevpar}
          info="Ricavo per camera disponibile: tiene insieme prezzo e occupazione."
        />
        <KpiTile
          label="Atterraggio d'anno" icon="fa-plane-arrival" slot={4} index={4}
          value={kpi.atterraggio} format={(n) => fmtEurK(n)}
          delta={kpi.deltaBudget}
          deltaLabel={`${fmtDelta(kpi.deltaBudget)} sul budget`}
          info={`Chiusura attesa dei dodici mesi (mesi chiusi più previsione) contro il budget d'anno (${fmtEurK(kpi.budgetAnno)}).`}
        />
      </div>

      {/* ── Ricavi per mese: consuntivo, previsione, LY e budget ──────────── */}
      <ChartCard
        className="so__main"
        index={0}
        title={`Ricavi camere · ${data.anno}`}
        subtitle="Mese per mese, contro anno precedente e budget"
        badge={fmtEurK(kpi.atterraggio)}
        legend={[
          { key: 'ty', name: 'Consuntivo', color: series(0) },
          { key: 'fc', name: 'Previsione', color: CHART.forecast },
          { key: 'ly', name: 'Anno precedente', color: CHART.ly },
          { key: 'bud', name: 'Budget', color: series(4) },
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
          <span className="so__foot">
            {data.ultimoMeseConsuntivo > 0
              ? <>Consuntivo dei primi {data.ultimoMeseConsuntivo} mesi <strong>{fmtEurK(kpi.ricavi)}</strong> <DeltaBadge value={kpi.deltaRicavi} size="sm" /> sull'anno precedente</>
              : 'Anno ancora tutto da consuntivare: le colonne sono previsione.'}
          </span>
        ) : undefined}
      >
        {vista === 'trend' ? (
          <div className="so__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Un solo asse dei valori: ricavi, LY e budget sono tutti in € */}
              <ComposedChart data={data.mesi} margin={{ top: 6, right: 8, left: -4, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ ricavi: 'Ricavi camere', ricaviLY: 'Anno precedente', budget: 'Budget' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                <Bar
                  dataKey="ricavi" radius={[3, 3, 0, 0]} maxBarSize={22}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                >
                  {/* I mesi non ancora chiusi sono previsione: colore dedicato */}
                  {data.mesi.map((m) => (
                    <Cell key={m.mese} fill={m.consuntivo ? series(0) : CHART.forecast} />
                  ))}
                </Bar>
                <Line
                  type="monotone" dataKey="ricaviLY" stroke={CHART.ly} strokeWidth={1.8} dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="budget" stroke={series(4)} strokeWidth={2}
                  strokeDasharray="5 4" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="so__detail">
            <div className="sib-table-wrap so__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <thead>
                  <tr>
                    <th>Mese</th>
                    <th className="so__num">Camere</th>
                    <th className="so__num">Occupazione</th>
                    <th className="so__num">ADR</th>
                    <th className="so__num">RevPAR</th>
                    <th className="so__num">Ricavi</th>
                    <th className="so__num">vs LY</th>
                    <th className="so__num">vs budget</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((m) => (
                    <tr key={m.mese} className={m.consuntivo ? undefined : 'so__row--prev'}>
                      <td>{m.label}</td>
                      <td className="so__num">{fmtInt(m.camere)}</td>
                      <td className="so__num">{fmtPct(m.occ, 0)}</td>
                      <td className="so__num">{fmtEur(m.adr, 0)}</td>
                      <td className="so__num">{fmtEur(m.revpar, 0)}</td>
                      <td className="so__num">{fmtEurK(m.ricavi)}</td>
                      <td className="so__num">
                        <DeltaBadge value={m.ricaviLY ? ((m.ricavi - m.ricaviLY) / m.ricaviLY) * 100 : 0} size="sm" />
                      </td>
                      <td className="so__num">
                        <DeltaBadge value={m.budget ? ((m.ricavi - m.budget) / m.budget) * 100 : 0} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="so__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Mix di vendita ────────────────────────────────────────────────── */}
      <ChartCard
        className="so__mix"
        index={1}
        title={dimCorrente.titolo}
        subtitle="Ricavi dell'anno per voce"
        rail={(
          <BiVerticalTabs
            tabs={DIMENSIONI.map((d) => ({ id: d.key, label: d.label }))}
            active={dimensione}
            onChange={(id) => setDimensione(id as Dimensione)}
          />
        )}
      >
        <div className="so__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={voci} layout="vertical" margin={{ top: 2, right: 62, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis
                type="category" dataKey="label" {...yAxisProps} width={106} interval={0}
                tick={{ fontSize: 11, fill: CHART.ink }}
              />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ valore: 'Ricavi' }} format={(v) => fmtEur(v, 0)} />}
              />
              <Bar
                dataKey="valore" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={16}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                <LabelList dataKey="valore" content={barEndLabel()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Il mix contro l'anno precedente ───────────────────────────────── */}
      <ChartCard
        className="so__vs"
        index={2}
        title={`Come cambia il mix · ${dimCorrente.label.toLowerCase()}`}
        subtitle="Quota di ricavo guadagnata o persa rispetto all'anno precedente"
        footer={(
          <span className="so__foot">
            {cresce && arretra && cresce.label !== arretra.label ? (
              <>
                Guadagna quota <strong>{cresce.label}</strong> ({fmtDelta(cresce.deltaQuota, ' pt')},{' '}
                {fmtEurK(cresce.delta)} sul valore); ne perde <strong>{arretra.label}</strong>{' '}
                ({fmtDelta(arretra.deltaQuota, ' pt')}, {fmtEurK(arretra.delta)}).
              </>
            ) : (
              'Variazione della quota di ricavo di ogni voce rispetto allo stesso periodo dell\'anno precedente.'
            )}
          </span>
        )}
      >
        <div className="so__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confronto} layout="vertical" margin={{ top: 2, right: 54, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis
                type="category" dataKey="label" {...yAxisProps} width={106} interval={0}
                tick={{ fontSize: 11, fill: CHART.ink }}
              />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={(
                  <ChartTooltip
                    names={{ deltaQuota: 'Variazione di quota' }}
                    format={(v) => fmtDelta(Number(v), ' pt')}
                  />
                )}
              />
              <ReferenceLine x={0} stroke={CHART.axis} />
              {/* Spostamento di quota: una variazione neutra, non uno stato — colore
                  di serie unico, il segno lo porta il lato della barra. */}
              <Bar
                dataKey="deltaQuota" fill={series(0)} radius={[3, 3, 3, 3]} maxBarSize={14}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {/* Etichetta oltre lo zero anche per i negativi: a sinistra finirebbe
                    sopra le etichette di categoria. */}
                <LabelList dataKey="deltaQuota" content={barRightLabel((n) => fmtDelta(n, ' pt'))} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Qualità della domanda ─────────────────────────────────────────── */}
      <ChartCard
        className="so__dom"
        index={3}
        title="Qualità della domanda"
        subtitle="Come è fatta la prenotazione, non solo quanto vale"
      >
        <ul className="so__dom-list">
          {data.domanda.map((d) => (
            <li className="so__dom-row" key={d.key}>
              <span className="so__dom-lbl">{d.label}</span>
              <span className="so__dom-val">{valoreDomanda(d)}</span>
              <DeltaBadge value={d.delta} invert={d.invert} size="sm" />
            </li>
          ))}
        </ul>
      </ChartCard>
    </BiPage>
  )
}

/** Numeri della domanda con la formattazione italiana del kit. */
function valoreDomanda(d: IndicatoreDomanda): string {
  return d.unita === 'pct' ? fmtPct(d.valore)
    : d.unita === 'gg' ? `${fmtInt(d.valore)} gg`
      : `${fmtDec(d.valore, 1)} notti`
}
