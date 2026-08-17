import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Pagination from '../../../core/components/Pagination'
import TruncatedText from '../../../core/components/TruncatedText'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, KpiTile, barEndLabel,
  CHART, cursorProps, fmtAxisNum, fmtDate, fmtDec, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import {
  buildManutenzione, computeManutenzione, type ManutenzioneData,
} from '../_data/maintenanceMock'
import './MaintenanceAnalysis.sass'

// ─── MAINTENANCE ANALYSIS ───────────────────────────────────────────────────────
//  La manutenzione letta come costo e come ricavo mancato, non come elenco di
//  segnalazioni.
//    • fascia indicatori: interventi aperti, tempo medio di chiusura, camere fuori
//      servizio, costo degli interventi, ricavo perso
//    • segnalati e chiusi mese per mese con l'arretrato che ne resta (+ viste
//      Tipologie e Dettaglio degli interventi)
//    • rispetto degli SLA per priorità: l'urgenza si presidia, la programmata slitta
//    • camere fuori servizio nel tempo: dove la manutenzione toglie camere vendibili
//    • impatto sul business: costo degli interventi più ricavo perso
//  Modello in `operation/_data/maintenanceMock`, costruito sui volumi del ciclo
//  revenue: gli interventi seguono le camere occupate e il ricavo perso è valorizzato
//  all'ADR del mese.

type Vista = 'andamento' | 'tipologie' | 'dettaglio'

export default function MaintenanceAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [vista, setVista] = useState<Vista>('andamento')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<ManutenzioneData> | null>(null)

  const mock = useMemo(() => buildManutenzione(anno, strutturaId), [anno, strutturaId])
  const data: ManutenzioneData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeManutenzione(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<ManutenzioneData>>('operation/GetMaintenanceAnalysis', {
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
    rowHeight: 28, headerHeight: 30, min: 3, max: 18,
  })
  const totPagine = Math.max(1, Math.ceil(data.righe.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = data.righe.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  return (
    <BiPage
      title="Maintenance analysis"
      subtitle={`Interventi tecnici ${data.anno}: carico, tempi di chiusura, camere fuori servizio e costo`}
      glossary={['OOO', 'SLA', 'MTTR', 'ADR', 'occupazione']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="ma__grid"
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
            className="ma__filter ma__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="ma__filter"
          />
          <span className="ma__note">
            <i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" />
            Voce più costosa: {kpi.tipologiaPesante?.label ?? '—'}
            {kpi.tipologiaPesante && ` (${fmtEurK(kpi.tipologiaPesante.costo)})`}
          </span>
        </>
      )}
    >
      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="ma__kpis">
        <KpiTile
          label="Interventi aperti" icon="fa-screwdriver-wrench" slot={0} index={0}
          value={kpi.aperti} format={(n) => fmtInt(Math.round(n))}
          spark={kpi.sparkAperti} invertDelta
          info="Segnalazioni ancora da chiudere alla fine del periodo (arretrato): cresce quando entrano più interventi di quanti se ne chiudono."
        />
        <KpiTile
          label="Tempo di chiusura" icon="fa-stopwatch" slot={1} index={1}
          value={kpi.tempoMedio} format={(n) => `${fmtInt(Math.round(n))} h`}
          spark={kpi.sparkTempo} invertDelta
          info="Ore medie fra segnalazione e chiusura dell'intervento (MTTR). Si allunga quando l'arretrato è alto."
        />
        <KpiTile
          label="Camere fuori servizio" icon="fa-bed" slot={2} index={2}
          value={kpi.ooo} format={(n) => fmtDec(n)}
          spark={kpi.sparkOoo} invertDelta
          info="Camere non vendibili per guasto o lavori, in media giornaliera sull'anno."
        />
        <KpiTile
          label="Costo interventi" icon="fa-coins" slot={3} index={3}
          value={kpi.costo} format={(n) => fmtEurK(n)}
          spark={kpi.sparkCosto} invertDelta
          info="Materiali e manodopera degli interventi chiusi nel periodo."
        />
        <KpiTile
          label="Ricavo perso" icon="fa-ban" slot={5} index={4}
          value={kpi.ricavoPerso} format={(n) => fmtEurK(n)}
          spark={kpi.sparkRicavoPerso} invertDelta
          info="Notti di camera perse per fuori servizio, valorizzate all'ADR del mese: è il costo nascosto della manutenzione."
        />
      </div>

      {/* ── Carico di lavoro ─────────────────────────────────────────────── */}
      <ChartCard
        className="ma__main"
        index={0}
        title={vista === 'tipologie'
          ? 'Costo per tipologia di intervento'
          : vista === 'dettaglio' ? 'Interventi recenti' : `Segnalati e chiusi · ${data.anno}`}
        subtitle={vista === 'tipologie'
          ? 'Dove si concentra la spesa tecnica'
          : vista === 'dettaglio'
            ? 'Dai più vecchi ancora aperti'
            : "Il carico del mese e l'arretrato che ne resta"}
        badge={`${fmtInt(kpi.interventi)} interventi`}
        legend={vista === 'andamento' ? [
          { key: 'aperti', name: 'Segnalati', color: series(0) },
          { key: 'chiusi', name: 'Chiusi', color: series(1) },
          { key: 'arretrato', name: 'Arretrato', color: series(2) },
        ] : undefined}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'andamento', label: 'Andamento' },
              { id: 'tipologie', label: 'Tipologie' },
              { id: 'dettaglio', label: 'Dettaglio' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as Vista)}
          />
        )}
        footer={vista === 'andamento'
          ? `Tempo medio di chiusura ${fmtInt(Math.round(kpi.tempoMedio))} ore · arretrato a fine periodo ${fmtInt(kpi.aperti)} interventi.`
          : vista === 'tipologie'
            ? `${fmtEurK(kpi.costo)} di interventi nell'anno: la prima tipologia ne assorbe ${fmtPct(kpi.tipologiaPesante?.quotaCosto ?? 0, 0)}.`
            : undefined}
      >
        {vista === 'andamento' && (
          <div className="ma__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Un solo asse: le tre serie sono tutte conteggi di interventi */}
              <ComposedChart data={data.perMese} margin={{ top: 6, right: 8, left: -12, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} width={40} />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={(
                    <ChartTooltip
                      names={{ aperti: 'Segnalati', chiusi: 'Chiusi', arretrato: 'Arretrato' }}
                      format={(v) => fmtInt(Math.round(v))}
                    />
                  )}
                />
                <Bar
                  dataKey="aperti" fill={series(0)} radius={[3, 3, 0, 0]} maxBarSize={18}
                  isAnimationActive={!still}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Bar
                  dataKey="chiusi" fill={series(1)} radius={[3, 3, 0, 0]} maxBarSize={18}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                {/* L'arretrato è la conseguenza dei due: linea, non barra */}
                <Line
                  type="monotone" dataKey="arretrato" stroke={series(2)} strokeWidth={2.4}
                  dot={{ r: 2, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {vista === 'tipologie' && (
          <div className="ma__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Barre nominali: stessa tinta, la lunghezza porta il valore */}
              <BarChart
                data={data.tipologie} layout="vertical"
                margin={{ top: 2, right: 84, left: 0, bottom: 0 }} barCategoryGap="16%"
              >
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="sigla" {...yAxisProps} width={92} interval={0}
                  tick={{ fontSize: 11, fill: CHART.ink }}
                />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={(
                    <ChartTooltip
                      names={{ costo: 'Costo', interventi: 'Interventi', ore: 'Ore' }}
                      format={(v) => (v > 1000 ? fmtEur(v, 0) : fmtInt(Math.round(v)))}
                    />
                  )}
                />
                <Bar
                  dataKey="costo" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={14}
                  isAnimationActive={!still}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                >
                  <LabelList dataKey="costo" content={barEndLabel()} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {vista === 'dettaglio' && (
          <div className="ma__detail">
            {/* Larghezze in percentuale e celle su una riga: nessuno scroll */}
            <div className="sib-table-wrap ma__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <colgroup>
                  <col className="ma__col-data" />
                  <col className="ma__col-area" />
                  <col className="ma__col-tipo" />
                  <col className="ma__col-prio" />
                  <col className="ma__col-tecnico" />
                  <col className="ma__col-ore" />
                  <col className="ma__col-stato" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Area</th>
                    <th>Tipologia</th>
                    <th>Priorità</th>
                    <th>Tecnico</th>
                    <th className="ma__num">Ore</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.data)}</td>
                      <td><TruncatedText text={r.area} /></td>
                      <td><TruncatedText text={r.tipologia} /></td>
                      <td><TruncatedText text={r.priorita} /></td>
                      <td><TruncatedText text={r.tecnico} /></td>
                      <td className="ma__num">{fmtDec(r.ore)}</td>
                      <td>
                        <span className={`ma__stato ma__stato--${r.stato === 'chiuso' ? 'ok' : r.stato === 'in corso' ? 'corso' : 'aperto'}`}>
                          {r.stato}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ma__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Rispetto degli SLA ───────────────────────────────────────────── */}
      <ChartCard
        className="ma__sla"
        index={1}
        title="Rispetto degli SLA"
        subtitle={`Interventi chiusi nei tempi previsti · media ${fmtPct(kpi.slaPct, 0)}`}
        footer={kpi.slaPeggiore
          ? `La priorità più scoperta è "${kpi.slaPeggiore.label}" (${fmtPct(kpi.slaPeggiore.pct, 0)} entro ${fmtInt(kpi.slaPeggiore.slaOre)} ore).`
          : undefined}
      >
        <ul className="ma__sla-list">
          {data.sla.map((p) => (
            <li className="ma__sla-row" key={p.key}>
              <span className="ma__sla-top">
                <TruncatedText text={p.label} className="ma__sla-lbl" />
                <span className="ma__sla-pct">{fmtPct(p.pct, 0)}</span>
                <span className="ma__sla-ore">entro {fmtInt(p.slaOre)} h</span>
              </span>
              {/* Barra = quota rispettata; la parte vuota è ciò che è andato fuori tempo */}
              <span className="ma__sla-bar">
                <span
                  className="ma__sla-fill"
                  /* --w = rispetto dello SLA (valore runtime) */
                  style={{ ['--w' as any]: `${Math.max(0, Math.min(100, p.pct))}%` }}
                />
              </span>
              <span className="ma__sla-meta">
                {fmtInt(p.entroSla)} su {fmtInt(p.interventi)} interventi
              </span>
            </li>
          ))}
        </ul>
      </ChartCard>

      {/* ── Camere fuori servizio ────────────────────────────────────────── */}
      <ChartCard
        className="ma__ooo"
        index={2}
        title="Camere fuori servizio nel tempo"
        subtitle="Media giornaliera di camere non vendibili"
        badge={`${fmtInt(kpi.nottiPerse)} notti perse`}
        footer={`I lavori si concentrano in bassa stagione, quando le camere ferme costano meno: ${fmtEurK(kpi.ricavoPerso)} di ricavo perso sull'anno.`}
      >
        <div className="ma__chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.perMese} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="ma-ooo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series(2)} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={series(2)} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              {/* L'area parte sempre da zero: è una magnitudine, non uno scostamento */}
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} width={36} domain={[0, 'dataMax']} />
              <RTooltip
                cursor={cursorProps}
                content={(
                  <ChartTooltip
                    names={{ ooo: 'Camere fuori servizio', nottiPerse: 'Notti perse' }}
                    format={(v) => (v >= 100 ? fmtInt(Math.round(v)) : fmtDec(v))}
                  />
                )}
              />
              <Area
                type="monotone" dataKey="ooo" stroke={series(2)} strokeWidth={2.2}
                fill="url(#ma-ooo)" dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Impatto sul business ─────────────────────────────────────────── */}
      <ChartCard
        className="ma__imp"
        index={3}
        title="Impatto sul business"
        subtitle="Quanto costa davvero la manutenzione"
      >
        <ul className="ma__figures">
          <li className="ma__figure">
            <span className="ma__figure-lbl">Interventi dell'anno</span>
            <span className="ma__figure-val">{fmtInt(kpi.interventi)}</span>
          </li>
          <li className="ma__figure">
            <span className="ma__figure-lbl">Costo degli interventi</span>
            <span className="ma__figure-val">{fmtEurK(kpi.costo)}</span>
          </li>
          <li className="ma__figure">
            <span className="ma__figure-lbl">Notti di camera perse</span>
            <span className="ma__figure-val">{fmtInt(kpi.nottiPerse)}</span>
          </li>
          <li className="ma__figure">
            <span className="ma__figure-lbl">Ricavo perso</span>
            <span className="ma__figure-val">{fmtEurK(kpi.ricavoPerso)}</span>
          </li>
          {/* La somma dei due è il numero che conta in sede di budget */}
          <li className="ma__figure ma__figure--tot">
            <span className="ma__figure-lbl">Costo complessivo</span>
            <span className="ma__figure-val">{fmtEurK(kpi.costo + kpi.ricavoPerso)}</span>
          </li>
        </ul>
      </ChartCard>
    </BiPage>
  )
}
