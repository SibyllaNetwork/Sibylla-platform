import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Tooltip from '../../../core/components/Tooltip'
import Pagination from '../../../core/components/Pagination'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile, barEndLabel,
  CHART, cursorProps, fmtAxisNum, fmtDelta, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import {
  FAMIGLIE_ESCLUSE, buildPurchasing, computePurchasingKpi, type PurchasingData,
} from '../_data/purchasingMock'
import './PurchasingOverview.sass'

// ─── PURCHASING OVERVIEW ────────────────────────────────────────────────────────
//  Che cosa compra l'impresa, da chi e a che condizioni, in una schermata:
//    • fascia indicatori: fatturazione passiva, incidenza sui ricavi, fornitori
//      attivi, documenti registrati, note di credito
//    • fatturazione passiva mese per mese contro anno precedente, con i mesi non
//      ancora chiusi dichiarati come previsione (+ vista Dettaglio tabellare)
//    • fornitori per spesa: dove è concentrato il portafoglio
//    • ranking delle strutture: chi consuma di più a parità di camere
//    • composizione della spesa per categoria merceologica, contro anno precedente
//  Il perimetro è il ciclo passivo: personale e ammortamenti non passano da una
//  fattura fornitore e restano fuori (lo dice il piede della card principale).

/** Numero di fornitori in classifica: oltre, le etichette non si leggono più. */
const TOP_FORNITORI = 6

export default function PurchasingOverview({ navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [vista, setVista] = useState<'trend' | 'dettaglio'>('trend')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<PurchasingData> | null>(null)

  const mock = useMemo(() => buildPurchasing(anno, strutturaId), [anno, strutturaId])
  const data: PurchasingData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computePurchasingKpi(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<PurchasingData>>('report/GetAnalisiAcquisti', {
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

  // Dodici mesi in una card bassa non entrano: quante righe stanno nello spazio lo
  // decide la misura, il resto si impagina.
  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 26, headerHeight: 28, min: 2, max: 12,
  })
  const totPagine = Math.max(1, Math.ceil(data.mesi.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righeMesi = data.mesi.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  const fornitoriTop = useMemo(() => data.fornitori.slice(0, TOP_FORNITORI), [data.fornitori])
  const fornitoriResto = useMemo(() => {
    const fuori = data.fornitori.slice(TOP_FORNITORI)
    return { quanti: fuori.length, spesa: fuori.reduce((s, f) => s + f.spesa, 0) }
  }, [data.fornitori])

  return (
    <BiPage
      title="Purchasing overview"
      subtitle={`Acquisti ${data.anno}: fatturazione passiva, fornitori e composizione della spesa`}
      glossary={['scostamento', 'TY', 'LY', 'delta', 'DPO', 'ranking']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="po__grid"
      actions={(
        <Tooltip text="Fatturazione passiva">
          <button
            type="button"
            className="sib-btn sib-btn--icon po__link"
            onClick={() => navigate('fatturazione-passiva')}
            aria-label="Fatturazione passiva"
          >
            <i className="fa-regular fa-file-invoice-dollar" aria-hidden="true" />
          </button>
        </Tooltip>
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
            className="po__filter po__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="po__filter"
          />
          <span className="po__note">
            <i className="fa-solid fa-handshake" aria-hidden="true" />
            Termini medi concordati {fmtInt(data.terminiMedi)} giorni · primi tre fornitori {fmtPct(kpi.concentrazione, 0)} della spesa
          </span>
        </>
      )}
    >
      {/* ── Indicatori del periodo ────────────────────────────────────────── */}
      <div className="po__kpis">
        <KpiTile
          label="Fatturazione passiva" icon="fa-file-invoice-dollar" slot={5} index={0}
          value={kpi.spesa} format={(n) => fmtEurK(n)}
          delta={kpi.deltaSpesa} invertDelta spark={kpi.sparkSpesa}
          info="Imponibile dei documenti passivi registrati nel periodo, note di credito sottratte, confrontato con lo stesso periodo dell'anno precedente."
        />
        <KpiTile
          label="Incidenza sui ricavi" icon="fa-percent" slot={3} index={1}
          value={kpi.incidenza} format={(n) => fmtPct(n)}
          info="Acquisti del periodo sui ricavi dello stesso periodo: dice se la spesa sta seguendo il giro d'affari."
        />
        <KpiTile
          label="Fornitori attivi" icon="fa-handshake" slot={0} index={2}
          value={kpi.fornitoriAttivi} format={(n) => fmtInt(n)}
          info="Fornitori con almeno un documento registrato nel periodo."
        />
        <KpiTile
          label="Fatture passive" icon="fa-receipt" slot={1} index={3}
          value={kpi.fatture} format={(n) => fmtInt(n)}
          info="Numero di fatture passive registrate nel periodo (le note di credito sono contate a parte)."
        />
        <KpiTile
          label="Note di credito" icon="fa-rotate-left" slot={4} index={4}
          value={kpi.noteCredito} format={(n) => fmtInt(n)}
          info={`Resi, abbuoni e rettifiche ricevuti dai fornitori nel periodo, per un valore complessivo di ${fmtEurK(Math.abs(kpi.valoreNoteCredito))} recuperati.`}
        />
      </div>

      {/* ── Fatturazione passiva mese per mese ────────────────────────────── */}
      <ChartCard
        className="po__main"
        index={0}
        title={`Fatturazione passiva · ${data.anno}`}
        subtitle="Mesi chiusi e previsione, contro anno precedente"
        badge={fmtEurK(data.mesi.reduce((s, m) => s + m.spesa, 0))}
        legend={[
          { key: 'ty', name: 'Consuntivo', color: series(5) },
          { key: 'fc', name: 'Previsione', color: CHART.forecast },
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
        footer={vista === 'trend'
          ? `Perimetro del ciclo passivo: ${FAMIGLIE_ESCLUSE.join(' e ').toLowerCase()} non passano da una fattura fornitore e restano fuori dal conteggio.`
          : undefined}
      >
        {vista === 'trend' ? (
          <div className="po__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Un solo asse dei valori: spesa e anno precedente sono in € */}
              <ComposedChart data={data.mesi} margin={{ top: 6, right: 8, left: -4, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ spesa: 'Fatturazione passiva', spesaLY: 'Anno precedente' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                <Bar
                  dataKey="spesa" radius={[3, 3, 0, 0]} maxBarSize={22}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                >
                  {righeMesi.map((m) => (
                    <Cell key={m.mese} fill={m.consuntivo ? series(5) : CHART.forecast} />
                  ))}
                </Bar>
                <Line
                  type="monotone" dataKey="spesaLY" stroke={CHART.ly} strokeWidth={1.8} dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="po__detail">
            <div className="sib-table-wrap po__mesi-table" ref={tabellaRef}>
              <table className="sib-table">
                <colgroup>
                  <col className="po__col-mese" />
                  <col className="po__col-mnum" />
                  <col className="po__col-mnum" />
                  <col className="po__col-mnum" />
                  <col className="po__col-mnum" />
                  <col className="po__col-mnum" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Mese</th>
                    <th className="po__num">Imponibile</th>
                    <th className="po__num">Imponibile LY</th>
                    <th className="po__num">vs LY</th>
                    <th className="po__num">Fatture</th>
                    <th className="po__num">Note credito</th>
                  </tr>
                </thead>
                <tbody>
                  {righeMesi.map((m) => (
                    <tr key={m.mese} className={m.consuntivo ? undefined : 'po__row--prev'}>
                      <td>{m.label}</td>
                      <td className="po__num">{fmtEurK(m.spesa)}</td>
                      <td className="po__num">{fmtEurK(m.spesaLY)}</td>
                      <td className="po__num">
                        <DeltaBadge
                          value={m.spesaLY ? ((m.spesa - m.spesaLY) / m.spesaLY) * 100 : 0}
                          invert size="sm"
                        />
                      </td>
                      <td className="po__num">{fmtInt(m.fatture)}</td>
                      <td className="po__num">{fmtInt(m.noteCredito)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="po__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Fornitori per spesa ───────────────────────────────────────────── */}
      <ChartCard
        className="po__forn"
        index={1}
        title="Fornitori per spesa"
        subtitle="Primi sei per imponibile dell'anno"
        footer={fornitoriResto.quanti > 0
          ? `Gli altri ${fornitoriResto.quanti} fornitori valgono ${fmtEurK(fornitoriResto.spesa)}.`
          : undefined}
      >
        <div className="po__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fornitoriTop} layout="vertical" margin={{ top: 2, right: 52, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis
                type="category" dataKey="label" {...yAxisProps} width={134} interval={0}
                tick={{ fontSize: 11, fill: CHART.ink }}
              />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={(
                  <ChartTooltip
                    names={{ spesa: 'Imponibile', spesaLY: 'Anno precedente' }}
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
              <Bar
                dataKey="spesa" fill={series(5)} radius={[0, 4, 4, 0]} maxBarSize={14}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                <LabelList dataKey="spesa" content={barEndLabel()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Ranking delle strutture ───────────────────────────────────────── */}
      <ChartCard
        className="po__str"
        index={2}
        title="Ranking strutture"
        subtitle="Spesa per struttura nell'anno"
      >
        <div className="po__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.perStruttura} layout="vertical" margin={{ top: 2, right: 52, left: 0, bottom: 0 }} barCategoryGap="24%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis
                type="category" dataKey="label" {...yAxisProps} width={134} interval={0}
                tick={{ fontSize: 11, fill: CHART.ink }}
              />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ spesa: 'Imponibile' }} format={(v) => fmtEur(v, 0)} />}
              />
              <Bar
                dataKey="spesa" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={14}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                <LabelList dataKey="spesa" content={barEndLabel()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Composizione della spesa ──────────────────────────────────────── */}
      <ChartCard
        className="po__cat"
        index={3}
        title="Composizione della spesa"
        subtitle="Categorie merceologiche dell'anno, contro anno precedente"
      >
        <div className="sib-table-wrap po__cat-table">
          <table className="sib-table">
            <colgroup>
              <col className="po__col-voce" />
              <col className="po__col-num" />
              <col className="po__col-num" />
              <col className="po__col-num" />
              <col className="po__col-num" />
            </colgroup>
            <thead>
              <tr>
                <th>Categoria</th>
                <th className="po__num">Imponibile</th>
                <th className="po__num">Quota</th>
                <th className="po__num">Documenti</th>
                <th className="po__num">vs LY</th>
              </tr>
            </thead>
            <tbody>
              {data.categorie.map((c) => (
                <tr key={c.key}>
                  <td>{c.label}</td>
                  <td className="po__num">{fmtEurK(c.spesa)}</td>
                  <td className="po__num">{fmtPct(c.quota, 0)}</td>
                  <td className="po__num">{fmtInt(c.documenti)}</td>
                  <td className="po__num">
                    <DeltaBadge
                      value={c.spesaLY ? ((c.spesa - c.spesaLY) / c.spesaLY) * 100 : 0}
                      label={fmtDelta(c.spesaLY ? ((c.spesa - c.spesaLY) / c.spesaLY) * 100 : 0)}
                      invert size="sm"
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
