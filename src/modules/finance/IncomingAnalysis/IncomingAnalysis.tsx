import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Pagination from '../../../core/components/Pagination'
import TruncatedText from '../../../core/components/TruncatedText'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtDate, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import { buildFinance, computeIncassi, type FinanceData } from '../_data/financeMock'
import './IncomingAnalysis.sass'

// ─── INCOMING ANALYSIS ──────────────────────────────────────────────────────────
//  Il ricavo letto dal lato dell'incasso: quanto è rientrato, quanto è ancora fuori
//  e da chi.
//    • fascia indicatori: incassi, incassato sul fatturato, credito aperto, tempo
//      medio d'incasso, insoluti
//    • fatturato e incassato mese per mese (+ viste Metodi di pagamento e Dettaglio
//      delle partite aperte)
//    • incassi per canale con il rispettivo tempo medio: il comportamento di
//      pagamento è una proprietà del canale, non del singolo cliente
//    • anzianità del credito: la parte vecchia è quella che rischia di non rientrare
//    • rischio del credito in numeri
//  Modello condiviso in `finance/_data/financeMock` (i giorni medi dei canali sono
//  normalizzati sul DSO usato da Cash flow: le due pagine non si contraddicono).

type Vista = 'andamento' | 'metodi' | 'dettaglio'

export default function IncomingAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [vista, setVista] = useState<Vista>('andamento')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeIncassi(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<FinanceData>>('finance/GetIncassi', {
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
    rowHeight: 28, headerHeight: 30, min: 3, max: 16,
  })
  const totPagine = Math.max(1, Math.ceil(kpi.partite.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = kpi.partite.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  // Anzianità del credito: scala sequenziale a UNA tinta fra i due estremi del tema
  // (`--chart-seq-from` → `--chart-seq-to`), dal credito giovane a quello vecchio.
  // Non sono categorie ma fasce ordinate, quindi non prendono slot categoriali.
  const tintaFascia = (i: number, tot: number) =>
    `color-mix(in srgb, ${CHART.seqTo} ${Math.round(((i + 1) / tot) * 100)}%, ${CHART.seqFrom})`

  return (
    <BiPage
      title="Incoming analysis"
      subtitle={`Incassi ${data.anno}: quanto è rientrato, da quale canale e quanto resta a credito`}
      glossary={['DSO', 'insoluti', 'scostamento', 'TY', 'LY', 'delta']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="ia__grid"
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
            className="ia__filter ia__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="ia__filter"
          />
          <span className="ia__note">
            <i className="fa-solid fa-hourglass-half" aria-hidden="true" />
            Canale più lento: {kpi.canalePeggiore?.canale ?? '—'}
            {kpi.canalePeggiore && ` (${fmtInt(Math.round(kpi.canalePeggiore.giorni))} gg)`}
          </span>
        </>
      )}
    >
      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="ia__kpis">
        <KpiTile
          label="Incassi" icon="fa-hand-holding-dollar" slot={0} index={0}
          value={kpi.incassi} format={(n) => fmtEurK(n)}
          spark={kpi.sparkIncassi}
          info="Quanto del fatturato dell'anno è già rientrato in cassa."
        />
        <KpiTile
          label="Quota incassata" icon="fa-percent" slot={1} index={1}
          value={kpi.incassatoPct} format={(n) => fmtPct(n)}
          spark={kpi.sparkIncassatoPct}
          info="Incassi diviso fatturato: la parte che resta è credito ancora aperto."
        />
        <KpiTile
          label="Credito aperto" icon="fa-file-invoice-dollar" slot={2} index={2}
          value={kpi.credito} format={(n) => fmtEurK(n)}
          spark={kpi.sparkCredito} invertDelta
          info="Fatturato emesso e non ancora incassato alla data di analisi."
        />
        <KpiTile
          label="Tempo d'incasso" icon="fa-hourglass-half" slot={3} index={3}
          value={kpi.tempoMedio} format={(n) => `${fmtInt(Math.round(n))} gg`}
          info="Giorni medi fra emissione del documento e incasso, media dei canali pesata sul fatturato (DSO)."
        />
        <KpiTile
          label="Insoluti" icon="fa-triangle-exclamation" slot={5} index={4}
          value={kpi.insoluti} format={(n) => fmtEurK(n)}
          info={`Credito non rientrato nei termini, da mettere a rischio: ${fmtPct(kpi.insolutiPct, 2)} del fatturato. Niente variazione: è un livello, non un andamento.`}
        />
      </div>

      {/* ── Fatturato e incassato ────────────────────────────────────────── */}
      <ChartCard
        className="ia__main"
        index={0}
        title={vista === 'metodi' ? 'Incassi per metodo di pagamento' : `Fatturato e incassato · ${data.anno}`}
        subtitle={vista === 'metodi'
          ? 'Come entra il denaro'
          : vista === 'dettaglio'
            ? 'Partite aperte, dalla più in ritardo'
            : 'Mese per mese, con la quota già rientrata'}
        badge={vista === 'metodi' ? fmtEurK(kpi.incassi) : fmtEurK(kpi.fatturato)}
        legend={vista === 'andamento' ? [
          { key: 'incassato', name: 'Incassato', color: series(0) },
          { key: 'fatturato', name: 'Fatturato', color: CHART.ly },
        ] : undefined}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'andamento', label: 'Andamento' },
              { id: 'metodi', label: 'Metodi' },
              { id: 'dettaglio', label: 'Dettaglio' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as Vista)}
          />
        )}
        footer={vista === 'andamento'
          ? `Sull'anno rientra il ${fmtPct(kpi.incassatoPct, 1)} del fatturato: ${fmtEurK(kpi.credito)} restano a credito.`
          : vista === 'metodi'
            ? `${kpi.metodi[0]?.metodo ?? '—'} è il primo metodo d'incasso (${fmtPct(kpi.metodi[0]?.quota ?? 0, 0)}).`
            : undefined}
      >
        {vista === 'andamento' && (
          <div className="ia__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Un solo asse: fatturato e incassato sono entrambi importi in € */}
              <ComposedChart data={kpi.perMese} margin={{ top: 6, right: 8, left: -4, bottom: 0 }} barCategoryGap="24%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={(
                    <ChartTooltip
                      names={{ incassato: 'Incassato', fatturato: 'Fatturato' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                <Bar
                  dataKey="incassato" fill={series(0)} radius={[3, 3, 0, 0]} maxBarSize={30}
                  isAnimationActive={!still}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                {/* Il fatturato è il riferimento: la distanza dalla barra è il credito */}
                <Line
                  type="monotone" dataKey="fatturato" stroke={CHART.ly} strokeWidth={2}
                  dot={{ r: 2, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {vista === 'metodi' && (
          <div className="ia__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Barre nominali: tutte della stessa tinta, la lunghezza porta il valore */}
              <BarChart
                data={kpi.metodi} layout="vertical"
                margin={{ top: 2, right: 84, left: 0, bottom: 0 }} barCategoryGap="20%"
              >
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="metodo" {...yAxisProps} width={132} interval={0}
                  tick={{ fontSize: 11, fill: CHART.ink }}
                />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={<ChartTooltip names={{ incassato: 'Incassato' }} format={(v) => fmtEur(v, 0)} />}
                />
                <Bar
                  dataKey="incassato" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={16}
                  isAnimationActive={!still}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                >
                  <LabelList
                    dataKey="incassato" position="right"
                    formatter={(v: any) => fmtEurK(Number(v))} className="ia__bar-label"
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {vista === 'dettaglio' && (
          <div className="ia__detail">
            {/* Larghezze in percentuale e celle su una riga: nessuno scroll */}
            <div className="sib-table-wrap ia__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <colgroup>
                  <col className="ia__col-cliente" />
                  <col className="ia__col-canale" />
                  <col className="ia__col-num" />
                  <col className="ia__col-data" />
                  <col className="ia__col-rit" />
                  <col className="ia__col-stato" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Canale</th>
                    <th className="ia__num">Importo</th>
                    <th className="ia__num">Scadenza</th>
                    <th className="ia__num">Ritardo</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((p) => (
                    <tr key={p.id}>
                      <td><TruncatedText text={p.cliente} /></td>
                      <td><TruncatedText text={p.canale} /></td>
                      <td className="ia__num">{fmtEur(p.importo, 0)}</td>
                      <td className="ia__num">{fmtDate(p.scadenza)}</td>
                      <td className="ia__num">
                        {p.ritardo > 0 ? `${fmtInt(p.ritardo)} gg` : '—'}
                      </td>
                      <td>
                        <span className={`ia__stato ia__stato--${p.stato === 'in scadenza' ? 'attesa' : p.stato === 'scaduta' ? 'scaduta' : 'insoluta'}`}>
                          {p.stato}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ia__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Incassi per canale ───────────────────────────────────────────── */}
      <ChartCard
        className="ia__can"
        index={1}
        title="Incassi per canale"
        // Niente piede: le cinque voci hanno bisogno di tutta l'altezza della card,
        // e la spiegazione sta già nel sottotitolo (su una riga, con tooltip).
        subtitle={`Il diretto incassa alla partenza, l'intermediato a fattura: è il mix a fare i ${fmtInt(Math.round(kpi.tempoMedio))} gg medi`}
      >
        <ul className="ia__canali">
          {kpi.canali.map((c) => (
            <li className="ia__canale" key={c.canale}>
              <span className="ia__canale-top">
                <TruncatedText text={c.canale} className="ia__canale-lbl" />
                <span className="ia__canale-val">{fmtEurK(c.incassato)}</span>
                <span className="ia__canale-gg">{fmtInt(Math.round(c.giorni))} gg</span>
              </span>
              {/* Barra = quota del canale sul fatturato totale */}
              <span className="ia__canale-bar">
                <span
                  className="ia__canale-fill"
                  /* --w = quota del canale sul fatturato (valore runtime) */
                  style={{ ['--w' as any]: `${Math.max(0, Math.min(100, c.quota))}%` }}
                />
              </span>
              <span className="ia__canale-meta">
                credito {fmtEurK(c.credito)} · insoluti {fmtEurK(c.insoluti)}
              </span>
            </li>
          ))}
        </ul>
      </ChartCard>

      {/* ── Anzianità del credito ────────────────────────────────────────── */}
      <ChartCard
        className="ia__fasce"
        index={2}
        title="Anzianità del credito"
        subtitle="Da quanto tempo il denaro è fuori"
        badge={fmtEurK(kpi.credito)}
        footer={`Oltre i 60 giorni ci sono ${fmtEurK(kpi.creditoVecchio)} (${fmtPct((kpi.creditoVecchio / (kpi.credito || 1)) * 100, 0)} del credito): è la parte da sollecitare per prima.`}
      >
        <div className="ia__chart">
          <ResponsiveContainer width="100%" height="100%">
            {/* Fasce ordinate nel tempo: una sola tinta, dal chiaro (credito giovane)
                al pieno (credito vecchio). Non sono categorie, è una magnitudine. */}
            <BarChart
              data={kpi.fasce} layout="vertical"
              margin={{ top: 2, right: 78, left: 0, bottom: 0 }} barCategoryGap="22%"
            >
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis
                type="category" dataKey="label" {...yAxisProps} width={92} interval={0}
                tick={{ fontSize: 11, fill: CHART.ink }}
              />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ valore: 'Credito' }} format={(v) => fmtEur(v, 0)} />}
              />
              <Bar
                dataKey="valore" radius={[0, 4, 4, 0]} maxBarSize={18}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {kpi.fasce.map((f, i) => (
                  <Cell key={f.label} fill={tintaFascia(i, kpi.fasce.length)} />
                ))}
                <LabelList
                  dataKey="valore" position="right"
                  formatter={(v: any) => fmtEurK(Number(v))} className="ia__bar-label"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Rischio del credito ──────────────────────────────────────────── */}
      <ChartCard
        className="ia__rischio"
        index={3}
        title="Rischio del credito"
        subtitle="I numeri da presidiare"
      >
        <ul className="ia__figures">
          <li className="ia__figure">
            <span className="ia__figure-lbl">Credito aperto</span>
            <span className="ia__figure-val">{fmtEurK(kpi.credito)}</span>
          </li>
          <li className="ia__figure">
            <span className="ia__figure-lbl">di cui oltre 60 giorni</span>
            <span className="ia__figure-val">{fmtEurK(kpi.creditoVecchio)}</span>
          </li>
          <li className="ia__figure">
            <span className="ia__figure-lbl">Insoluti</span>
            <span className="ia__figure-val">{fmtEurK(kpi.insoluti)}</span>
          </li>
          <li className="ia__figure">
            <span className="ia__figure-lbl">Insoluti sul fatturato</span>
            <span className="ia__figure-val">{fmtPct(kpi.insolutiPct, 2)}</span>
          </li>
          <li className="ia__figure">
            <span className="ia__figure-lbl">Partite scadute</span>
            <span className="ia__figure-val">
              {fmtInt(kpi.partite.filter((p) => p.stato !== 'in scadenza').length)} su {fmtInt(kpi.partite.length)}
            </span>
          </li>
        </ul>
      </ChartCard>
    </BiPage>
  )
}
