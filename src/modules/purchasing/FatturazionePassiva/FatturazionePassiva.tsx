import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Tooltip from '../../../core/components/Tooltip'
import Pagination from '../../../core/components/Pagination'
import TruncatedText from '../../../core/components/TruncatedText'
import {
  ANIM, BiPage, ChartCard, ChartTooltip, KpiTile, barEndLabel,
  CHART, fmtDate, fmtDelta, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import {
  buildPurchasing, computeFatturePassiveKpi, type FatturaPassiva, type PurchasingData,
  type StatoFattura,
} from '../_data/purchasingMock'
import './FatturazionePassiva.sass'

// ─── FATTURAZIONE PASSIVA ───────────────────────────────────────────────────────
//  Il ciclo passivo alla data di analisi, in una schermata:
//    • fascia indicatori: fatturato passivo, pagato, aperto, scaduto e giorni medi
//      di pagamento confrontati con i termini concordati
//    • il registro dei documenti, ordinato per scadenza: prima quello che scade
//      (o è già scaduto), impaginato su quante righe stanno nello spazio
//    • pagate contro totale, con la quota al centro dell'anello
//    • scadenzario dell'aperto per fascia, con l'esposizione per fornitore nel piede
//  Il registro è la pagina: le altre card servono a decidere da dove partire.

const STATI: { key: StatoFattura | 'tutti'; label: string }[] = [
  { key: 'tutti', label: 'Tutti gli stati' },
  { key: 'scaduta', label: 'Scadute' },
  { key: 'da pagare', label: 'Da pagare' },
  { key: 'pagata', label: 'Pagate' },
]

/** Classe di stato del documento: pagata, in attesa, scaduta. */
function classeStato(stato: StatoFattura): string {
  return stato === 'pagata' ? 'pagata' : stato === 'scaduta' ? 'scaduta' : 'attesa'
}

export default function FatturazionePassiva({ navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [stato, setStato] = useState<StatoFattura | 'tutti'>('tutti')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<PurchasingData> | null>(null)

  const mock = useMemo(() => buildPurchasing(anno, strutturaId), [anno, strutturaId])
  const data: PurchasingData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeFatturePassiveKpi(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<PurchasingData>>('report/GetFatturazionePassiva', {
      method: 'POST',
      body: { strutturaId, anno },
    })
      .then((d) => { if (!annullato && d) setRemoto(d) })
      .catch(() => { if (!annullato) setRemoto(null) })
      .finally(() => { if (!annullato) setLoading(false) })
    return () => { annullato = true }
  }, [strutturaId, anno])

  useEffect(() => { setPagina(1) }, [strutturaId, anno, stato])

  const still = reducedMotion()

  // Il registro si legge dalla scadenza più vicina: le scadute vengono prima di
  // tutto, poi ciò che sta per scadere.
  const documenti = useMemo(() => {
    const filtrate = stato === 'tutti' ? data.fatture : data.fatture.filter((f) => f.stato === stato)
    return [...filtrate].sort((a, b) => {
      const peso = (f: FatturaPassiva) => (f.stato === 'scaduta' ? 0 : f.stato === 'da pagare' ? 1 : 2)
      return peso(a) - peso(b) || a.scadenza.getTime() - b.scadenza.getTime()
    })
  }, [data.fatture, stato])

  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 28, headerHeight: 30, min: 4, max: 24,
  })
  const totPagine = Math.max(1, Math.ceil(documenti.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = documenti.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  const anello = useMemo(() => [
    { label: 'Pagate', valore: kpi.pagato, colore: series(0) },
    { label: 'Da pagare', valore: kpi.aperto - kpi.scaduto, colore: CHART.ly },
    { label: 'Scadute', valore: kpi.scaduto, colore: CHART.bad },
  ].filter((v) => v.valore > 0), [kpi])

  const primoEsposto = kpi.esposizione[0]
  const ritardo = kpi.giorniMediPagamento - kpi.terminiMedi

  return (
    <BiPage
      title="Fatturazione passiva"
      subtitle={`Ciclo passivo ${data.anno}: registro dei documenti, pagato, aperto e scadenzario`}
      glossary={['DPO', 'scostamento', 'TY', 'LY', 'delta']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="fp__grid"
      actions={(
        <Tooltip text="Purchasing overview">
          <button
            type="button"
            className="sib-btn sib-btn--icon fp__link"
            onClick={() => navigate('panoramica-acquisti')}
            aria-label="Purchasing overview"
          >
            <i className="fa-regular fa-chart-pie" aria-hidden="true" />
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
            className="fp__filter fp__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="fp__filter fp__filter--narrow"
          />
          <SelectField
            name="stato" label="Stato" value={stato}
            onChange={(e) => setStato(e.target.value as StatoFattura | 'tutti')}
            options={STATI.map((s) => ({ value: s.key, label: s.label }))}
            className="fp__filter"
          />
          <span className="fp__note">
            <i className="fa-solid fa-clock" aria-hidden="true" />
            {fmtInt(documenti.length)} documenti in elenco · {fmtInt(kpi.documentiAperti)} ancora aperti
          </span>
        </>
      )}
    >
      {/* ── Indicatori del ciclo passivo ──────────────────────────────────── */}
      <div className="fp__kpis">
        <KpiTile
          label="Fatturazione passiva" icon="fa-file-invoice-dollar" slot={5} index={0}
          value={kpi.totale} format={(n) => fmtEurK(n)}
          info={`Imponibile dei ${fmtInt(kpi.documenti)} documenti registrati nell'anno, note di credito sottratte.`}
        />
        <KpiTile
          label="Pagate" icon="fa-circle-check" slot={0} index={1}
          value={kpi.pagato} format={(n) => fmtEurK(n)}
          delta={kpi.pagatoPct} deltaLabel={`${fmtPct(kpi.pagatoPct, 0)} del totale`}
          info="Imponibile dei documenti già pagati, e quanto pesa sul fatturato passivo dell'anno."
        />
        <KpiTile
          label="Da pagare" icon="fa-hourglass-half" slot={3} index={2}
          value={kpi.aperto - kpi.scaduto} format={(n) => fmtEurK(n)}
          info="Documenti ancora aperti con la scadenza non passata: è l'impegno di cassa dei prossimi giorni."
        />
        <KpiTile
          label="Scadute" icon="fa-triangle-exclamation" slot={4} index={3}
          value={kpi.scaduto} format={(n) => fmtEurK(n)}
          info="Documenti con la scadenza già passata e non pagati: da sistemare prima che diventino un problema di rapporto col fornitore."
        />
        <KpiTile
          label="Giorni di pagamento" icon="fa-calendar-check" slot={1} index={4}
          value={kpi.giorniMediPagamento} format={(n) => `${fmtInt(n)} gg`}
          delta={ritardo} invertDelta
          deltaLabel={`${fmtDelta(ritardo, ' gg')} sui termini`}
          info={`Giorni medi effettivi fra emissione e pagamento, pesati sull'importo, contro i ${fmtInt(kpi.terminiMedi)} giorni concordati con i fornitori.`}
        />
      </div>

      {/* ── Registro dei documenti ────────────────────────────────────────── */}
      <ChartCard
        className="fp__doc"
        index={0}
        title="Registro dei documenti passivi"
        subtitle="Ordinati per urgenza: prima le scadute, poi le scadenze più vicine"
        badge={fmtInt(documenti.length)}
      >
        <div className="fp__detail">
          <div className="sib-table-wrap fp__doc-table" ref={tabellaRef}>
            <table className="sib-table">
              <colgroup>
                <col className="fp__col-num-reg" />
                <col className="fp__col-str" />
                <col className="fp__col-forn" />
                <col className="fp__col-imp" />
                <col className="fp__col-data" />
                <col className="fp__col-gg" />
                <col className="fp__col-stato" />
              </colgroup>
              <thead>
                <tr>
                  <th>N. registrazione</th>
                  <th>Struttura</th>
                  <th>Fornitore</th>
                  <th className="fp__num">Imponibile</th>
                  <th className="fp__num">Scadenza</th>
                  <th className="fp__num">Giorni</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {righe.map((f) => (
                  <tr key={f.id} className={f.notaCredito ? 'fp__row--nc' : undefined}>
                    <td>{f.numero}</td>
                    <td><TruncatedText text={f.struttura} /></td>
                    <td><TruncatedText text={f.fornitore} /></td>
                    <td className="fp__num">{fmtEur(f.imponibile, 0)}</td>
                    <td className="fp__num">{fmtDate(f.scadenza)}</td>
                    <td className="fp__num">
                      {f.stato === 'pagata' ? '—' : fmtInt(f.giorniAllaScadenza)}
                    </td>
                    <td>
                      <span className={`fp__stato fp__stato--${classeStato(f.stato)}`}>
                        {f.notaCredito ? 'nota credito' : f.stato}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="fp__pager">
            <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
          </div>
        </div>
      </ChartCard>

      {/* ── Pagate contro totale ──────────────────────────────────────────── */}
      <ChartCard
        className="fp__pag"
        index={1}
        title="Pagate contro totale"
        subtitle="Quote per stato"
        legend={anello.map((v) => ({
          key: v.label, name: v.label, color: v.colore,
          value: fmtPct(kpi.totale ? (v.valore / kpi.totale) * 100 : 0, 0),
        }))}
      >
        <div className="fp__donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={anello} dataKey="valore" nameKey="label"
                innerRadius="60%" outerRadius="86%" paddingAngle={2}
                stroke={CHART.surface} strokeWidth={2}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {anello.map((v) => <Cell key={v.label} fill={v.colore} />)}
              </Pie>
              <RTooltip content={<ChartTooltip format={(v) => fmtEur(v, 0)} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="fp__donut-center">
            <span className="fp__donut-val">{fmtPct(kpi.pagatoPct, 0)}</span>
            <span className="fp__donut-lbl">già pagato</span>
          </div>
        </div>
      </ChartCard>

      {/* ── Scadenzario dell'aperto ───────────────────────────────────────── */}
      <ChartCard
        className="fp__sca"
        index={2}
        title="Scadenzario dell'aperto"
        subtitle="Quando esce la cassa, per fascia di scadenza"
        footer={primoEsposto
          ? `Esposizione più alta verso ${primoEsposto.label}: ${fmtEurK(primoEsposto.aperto)} su ${fmtInt(primoEsposto.documenti)} documenti aperti (${fmtPct(primoEsposto.quota, 0)} del totale aperto).`
          : 'Nessun documento aperto: il ciclo passivo è allineato.'}
      >
        <div className="fp__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kpi.fasce} layout="vertical" margin={{ top: 2, right: 56, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis
                type="category" dataKey="label" {...yAxisProps} width={86} interval={0}
                tick={{ fontSize: 11, fill: CHART.ink }}
              />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ valore: 'Importo aperto' }} format={(v) => fmtEur(v, 0)} />}
              />
              <Bar
                dataKey="valore" radius={[0, 4, 4, 0]} maxBarSize={16}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {kpi.fasce.map((f) => (
                  // Lo scaduto è uno stato, non una fascia come le altre: si vede
                  <Cell key={f.label} fill={f.label === 'Scadute' ? CHART.bad : series(0)} />
                ))}
                <LabelList dataKey="valore" content={barEndLabel()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </BiPage>
  )
}
