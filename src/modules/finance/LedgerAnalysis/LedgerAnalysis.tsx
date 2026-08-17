import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, ReferenceLine,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Pagination from '../../../core/components/Pagination'
import TruncatedText from '../../../core/components/TruncatedText'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, KpiTile, barEndLabel,
  CHART, cursorProps, fmtAxisNum, fmtDate, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import { buildFinance, computeLedger, type FinanceData } from '../_data/financeMock'
import './LedgerAnalysis.sass'

// ─── LEDGER ANALYSIS ────────────────────────────────────────────────────────────
//  La contabilità dal lato del controllo: che cosa è stato registrato, se quadra e
//  che cosa resta da sistemare prima della chiusura.
//    • fascia indicatori: registrazioni, movimentato, partite aperte, sospesi,
//      sbilancio (che a contabilità sana è zero)
//    • movimentazione dei mastri, con le viste per mese e il dettaglio delle
//      registrazioni
//    • quadratura mese per mese: dove dare e avere non coincidono
//    • anomalie da sanare, ordinate per gravità
//    • sospesi e partite aperte in numeri
//  Il partitario nasce dagli stessi fatti del conto economico e della cassa
//  (`finance/_data/financeMock`): i saldi non possono contraddire le altre pagine.

type Vista = 'mastri' | 'mensile' | 'dettaglio'

export default function LedgerAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [vista, setVista] = useState<Vista>('mastri')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeLedger(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<FinanceData>>('finance/GetPartitario', {
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
  const totPagine = Math.max(1, Math.ceil(kpi.righe.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = kpi.righe.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  // Mastri ordinati per movimentazione: la classifica dice dove passa il lavoro
  const mastri = useMemo(
    () => [...kpi.mastri].sort((a, b) => b.movimentazione - a.movimentazione).slice(0, 8),
    [kpi],
  )

  // Scala simmetrica per la quadratura: uno sbilancio in dare e uno in avere della
  // stessa entità devono apparire uguali e opposti.
  const scalaSbilancio = useMemo(() => {
    const massimo = Math.max(...kpi.perMese.map((m) => Math.abs(m.sbilancio)), 1) * 1.2
    // Estremo arrotondato: tre tick tondi (−e, 0, +e) invece dei valori casuali
    // che recharts ricava da un dominio non arrotondato.
    const passo = Math.pow(10, Math.floor(Math.log10(massimo))) / 2
    const estremo = Math.ceil(massimo / passo) * passo
    return { dominio: [-estremo, estremo] as [number, number], ticks: [-estremo, 0, estremo] }
  }, [kpi])

  return (
    <BiPage
      title="Ledger analysis"
      subtitle={`Partitario ${data.anno}: registrazioni, quadratura dei conti e anomalie da sanare`}
      glossary={['creditoAperto', 'insoluti', 'DSO', 'DPO', 'scostamento']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="la__grid"
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
            className="la__filter la__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="la__filter"
          />
          <span className={`la__note ${kpi.quadrato ? '' : 'la__note--allerta'}`}>
            <i className={`fa-solid ${kpi.quadrato ? 'fa-scale-balanced' : 'fa-scale-unbalanced'}`} aria-hidden="true" />
            {kpi.quadrato
              ? 'Dare e avere quadrano su tutti i mesi'
              : `${fmtInt(kpi.mesiNonQuadrati)} mesi non quadrati · sbilancio ${fmtEur(kpi.sbilancio, 0)}`}
          </span>
        </>
      )}
    >
      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="la__kpis">
        <KpiTile
          label="Registrazioni" icon="fa-list-ol" slot={0} index={0}
          value={kpi.registrazioni} format={(n) => fmtInt(Math.round(n))}
          spark={kpi.sparkRegistrazioni}
          info="Numero di registrazioni contabili dell'anno: segue i volumi di gestione."
        />
        <KpiTile
          label="Movimentato" icon="fa-right-left" slot={1} index={1}
          value={kpi.movimentato} format={(n) => fmtEurK(n)}
          spark={kpi.sparkMovimentato}
          info="Totale degli importi registrati in dare (uguale all'avere, se la contabilità quadra). Comprende IVA e movimenti finanziari."
        />
        <KpiTile
          label="Partite aperte" icon="fa-folder-open" slot={2} index={2}
          value={kpi.partiteAperte} format={(n) => fmtEurK(n)}
          info="Saldi ancora aperti sui conti di clienti, fornitori, erario e partite di giro."
        />
        <KpiTile
          label="Sospesi" icon="fa-circle-question" slot={3} index={3}
          value={kpi.sospesi} format={(n) => fmtEurK(n)}
          spark={kpi.sparkSospesi} invertDelta
          info="Denaro incassato e non ancora attribuito a un documento: va allocato prima della chiusura."
        />
        <KpiTile
          label="Sbilancio" icon="fa-scale-unbalanced" slot={5} index={4}
          value={kpi.sbilancio} format={(n) => fmtEur(n, 0)}
          info="Dare meno avere. A contabilità sana è zero: qualsiasi valore diverso indica registrazioni provvisorie da sistemare."
        />
      </div>

      {/* ── Mastri ───────────────────────────────────────────────────────── */}
      <ChartCard
        className="la__main"
        index={0}
        title={vista === 'mensile' ? `Movimentato per mese · ${data.anno}` : vista === 'dettaglio' ? 'Ultime registrazioni' : 'Movimentazione dei mastri'}
        subtitle={vista === 'mensile'
          ? 'Importi registrati e quota rimasta in sospeso'
          : vista === 'dettaglio'
            ? 'Prima nota, dalla più recente'
            : 'Dove passa il lavoro contabile (dare + avere)'}
        badge={fmtEurK(kpi.movimentato)}
        legend={vista === 'mensile' ? [
          { key: 'dare', name: 'Movimentato', color: series(0) },
          { key: 'sospesi', name: 'Sospesi', color: CHART.forecast, dashed: true },
        ] : undefined}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'mastri', label: 'Mastri' },
              { id: 'mensile', label: 'Per mese' },
              { id: 'dettaglio', label: 'Dettaglio' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as Vista)}
          />
        )}
        footer={vista === 'mastri'
          ? `${fmtInt(kpi.registrazioni)} registrazioni sull'anno · primi 8 mastri per movimentazione.`
          : vista === 'mensile'
            ? `I sospesi valgono ${fmtPct((kpi.sospesi / (kpi.movimentato || 1)) * 100, 2)} del movimentato: ${fmtEurK(kpi.sospesi)} da attribuire.`
            : undefined}
      >
        {vista === 'mastri' && (
          <div className="la__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Barre nominali: stessa tinta per tutti i conti, la lunghezza è il valore */}
              <BarChart
                data={mastri} layout="vertical"
                margin={{ top: 2, right: 84, left: 0, bottom: 0 }} barCategoryGap="16%"
              >
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="label" {...yAxisProps} width={148} interval={0}
                  tick={{ fontSize: 11, fill: CHART.ink }}
                />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={(
                    <ChartTooltip
                      names={{ movimentazione: 'Movimentazione', dare: 'Dare', avere: 'Avere' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                <Bar
                  dataKey="movimentazione" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={14}
                  isAnimationActive={!still}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                >
                  <LabelList dataKey="movimentazione" content={barEndLabel()} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {vista === 'mensile' && (
          <div className="la__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Un solo asse: movimentato e sospesi sono entrambi importi in € */}
              <ComposedChart data={kpi.perMese} margin={{ top: 6, right: 8, left: -4, bottom: 0 }} barCategoryGap="24%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={(
                    <ChartTooltip
                      names={{ dare: 'Movimentato', sospesi: 'Sospesi', registrazioni: 'Registrazioni' }}
                      format={(v) => (v > 5000 ? fmtEur(v, 0) : fmtInt(v))}
                    />
                  )}
                />
                <Bar
                  dataKey="dare" fill={series(0)} radius={[3, 3, 0, 0]} maxBarSize={30}
                  isAnimationActive={!still}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="sospesi" stroke={CHART.forecast} strokeWidth={2}
                  strokeDasharray="5 3" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {vista === 'dettaglio' && (
          <div className="la__detail">
            {/* Larghezze in percentuale e celle su una riga: nessuno scroll */}
            <div className="sib-table-wrap la__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <colgroup>
                  <col className="la__col-data" />
                  <col className="la__col-prot" />
                  <col className="la__col-mastro" />
                  <col className="la__col-desc" />
                  <col className="la__col-num" />
                  <col className="la__col-num" />
                  <col className="la__col-stato" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Protocollo</th>
                    <th>Mastro</th>
                    <th>Descrizione</th>
                    <th className="la__num">Dare</th>
                    <th className="la__num">Avere</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.data)}</td>
                      <td><TruncatedText text={r.protocollo} /></td>
                      <td><TruncatedText text={r.mastro} /></td>
                      <td><TruncatedText text={r.descrizione} /></td>
                      <td className="la__num">{r.dare ? fmtEur(r.dare, 0) : '—'}</td>
                      <td className="la__num">{r.avere ? fmtEur(r.avere, 0) : '—'}</td>
                      <td>
                        <span className={`la__stato la__stato--${r.stato === 'validata' ? 'ok' : r.stato === 'da validare' ? 'attesa' : 'sospesa'}`}>
                          {r.stato}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="la__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Quadratura ───────────────────────────────────────────────────── */}
      <ChartCard
        className="la__quad"
        index={1}
        title="Quadratura per mese"
        subtitle="Dare meno avere: la barra esiste solo dove qualcosa non torna"
        badge={kpi.quadrato ? 'quadrato' : fmtEur(kpi.sbilancio, 0)}
        footer={kpi.quadrato
          ? 'Tutti i mesi quadrano: nessuna registrazione provvisoria aperta.'
          : `${fmtInt(kpi.mesiNonQuadrati)} mesi su 12 hanno registrazioni provvisorie da chiudere.`}
      >
        <div className="la__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kpi.perMese} margin={{ top: 6, right: 8, left: -10, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={1} />
              <YAxis
                {...yAxisProps} tickFormatter={fmtAxisNum} width={44}
                domain={scalaSbilancio.dominio} ticks={scalaSbilancio.ticks}
              />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ sbilancio: 'Sbilancio' }} format={(v) => fmtEur(v, 0)} />}
              />
              {/* Lo zero è la quadratura: qualunque scostamento è un errore */}
              <ReferenceLine y={0} stroke={CHART.axis} />
              <Bar
                dataKey="sbilancio" radius={[2, 2, 0, 0]} maxBarSize={20}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {kpi.perMese.map((m) => (
                  <Cell key={m.mese} fill={m.sbilancio === 0 ? CHART.grid : CHART.bad} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Anomalie ─────────────────────────────────────────────────────── */}
      <ChartCard
        className="la__anom"
        index={2}
        title="Anomalie da sanare"
        subtitle={`${fmtInt(kpi.anomalie)} posizioni per ${fmtEurK(kpi.valoreAnomalie)}, dalla più grave`}
      >
        <ul className="la__anomalie">
          {kpi.anomalieDettaglio.map((a) => (
            <li className="la__anomalia" key={a.key}>
              <span className={`la__gravita la__gravita--${a.gravita}`} aria-hidden="true" />
              <span className="la__anomalia-testi">
                <TruncatedText text={a.tipo} className="la__anomalia-lbl" />
                <TruncatedText text={a.descrizione} className="la__anomalia-meta" />
              </span>
              <span className="la__anomalia-n">{fmtInt(a.conteggio)}</span>
              <span className="la__anomalia-val">{fmtEurK(a.valore)}</span>
            </li>
          ))}
        </ul>
      </ChartCard>

      {/* ── Sospesi e partite ────────────────────────────────────────────── */}
      <ChartCard
        className="la__sosp"
        index={3}
        title="Da chiudere"
        subtitle="Le posizioni ancora aperte"
      >
        <ul className="la__figures">
          {kpi.mastri
            .filter((c) => c.partiteAperte > 0)
            .sort((a, b) => b.partiteAperte - a.partiteAperte)
            .map((c) => (
              <li className="la__figure" key={c.codice}>
                <span className="la__figure-lbl">
                  <span className="la__figure-cod">{c.codice}</span>
                  {c.label}
                </span>
                <span className="la__figure-val">{fmtEurK(c.partiteAperte)}</span>
              </li>
            ))}
          <li className="la__figure">
            <span className="la__figure-lbl">Sospesi da attribuire</span>
            <span className="la__figure-val">{fmtEurK(kpi.sospesi)}</span>
          </li>
        </ul>
      </ChartCard>
    </BiPage>
  )
}
