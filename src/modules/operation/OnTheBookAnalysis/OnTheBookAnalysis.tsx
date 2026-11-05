import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, ComposedChart, LabelList, Line, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Pagination from '../../../core/components/Pagination'
import {
  ANIM, barEndLabel, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtDelta, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import { useStrutturaIdRevenue } from '../../../hooks/useStrutturaCorrente'
import { buildOnTheBook, computeOtbKpi, FINESTRA_PICKUP, ORIZZONTI, type OtbData } from './onTheBook.data'
import './OnTheBookAnalysis.sass'

// ─── ON THE BOOK ANALYSIS ───────────────────────────────────────────────────────
//  Quanto è GIÀ a libro per le date di soggiorno future e quanto è solido:
//    • fascia indicatori: ricavo a libro con il pace sull'anno precedente, camere,
//      ADR, occupazione a libro, quota garantita
//    • on the book per data (o per mese) diviso in garantito e opzionato, con
//      l'anno precedente alla stessa distanza e il previsto a consuntivo + Dettaglio
//    • da quali segmenti e canali arriva il libro
//    • quanto ne è entrato nell'ultima settimana, per settimana di soggiorno

type Vista = 'giorni' | 'mesi' | 'dettaglio'

/** Etichetta a fine barra su una riga sola (kit), con il testo della riga. */
const etichetta = (testo: (i: number) => string) => (p: any) => barEndLabel(() => testo(p.index))(p)

export default function OnTheBookAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  // Parte dalla struttura selezionata in alto e la segue.
  const [strutturaId, setStrutturaId] = useStrutturaIdRevenue()
  const [orizzonte, setOrizzonte] = useState(90)
  const [vista, setVista] = useState<Vista>('giorni')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<OtbData> | null>(null)

  const mock = useMemo(() => buildOnTheBook(strutturaId, orizzonte), [strutturaId, orizzonte])
  const data: OtbData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeOtbKpi(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<OtbData>>('forecast/GetOnTheBookAnalysis', {
      method: 'POST',
      body: { strutturaId, orizzonte },
    })
      .then((d) => { if (!annullato && d) setRemoto(d) })
      .catch(() => { if (!annullato) setRemoto(null) })
      .finally(() => { if (!annullato) setLoading(false) })
    return () => { annullato = true }
  }, [strutturaId, orizzonte])

  useEffect(() => { setPagina(1) }, [strutturaId, orizzonte])

  const still = reducedMotion()
  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({ rowHeight: 30, headerHeight: 32, min: 4, max: 20 })
  const totPagine = Math.max(1, Math.ceil(data.giorni.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = data.giorni.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  // Vista per giorno o per mese: stesse serie, diversa grana.
  const serie: { label: string }[] = vista === 'mesi' ? data.mesi : data.giorni
  const legendaLibro = [
    { key: 'garantito', name: 'Garantito', color: series(0) },
    { key: 'opzionato', name: 'Opzionato', color: `color-mix(in srgb, ${series(0)} 40%, transparent)` },
    { key: 'ly', name: 'LY', color: CHART.ly },
    { key: 'previsto', name: 'Previsto', color: CHART.forecast },
  ]

  return (
    <BiPage
      title="On the book analysis"
      subtitle={`Cosa è già a libro per i prossimi ${orizzonte} giorni di soggiorno e quanto è solido`}
      glossary={['OTB', 'pace', 'TY', 'LY', 'forecastGarantito', 'forecastOpzionato', 'ADR', 'occupazione', 'pickup', 'gruppi', 'corporate']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="otb__grid"
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
            className="otb__filter otb__filter--wide"
          />
          <SelectField
            name="orizzonte" label="Orizzonte di soggiorno"
            value={orizzonte}
            onChange={(e) => setOrizzonte(Number(e.target.value))}
            options={ORIZZONTI.map((o) => ({ value: o, label: `Prossimi ${o} gg` }))}
            className="otb__filter"
          />
          <span className="otb__note">
            <i className="fa-solid fa-bed" aria-hidden="true" />
            {fmtInt(data.camereDisponibili)} camere disponibili · a libro il {fmtPct(kpi.copertura, 0)} del previsto
          </span>
        </>
      )}
    >
      {/* ── Indicatori del libro ──────────────────────────────────────────── */}
      <div className="otb__kpis">
        <KpiTile
          label="Ricavo a libro" icon="fa-book-bookmark" slot={0} index={0}
          value={kpi.otbRicavo} format={(n) => fmtEurK(n)}
          delta={kpi.pace} deltaLabel={`${fmtDelta(kpi.pace)} pace vs LY`}
          spark={kpi.sparkOtb}
          info="Ricavo camere già confermato per l'orizzonte, confrontato con quanto c'era a libro l'anno scorso alla stessa distanza dall'arrivo."
        />
        <KpiTile
          label="Camere a libro" icon="fa-door-closed" slot={1} index={1}
          value={kpi.otbCamere} format={(n) => fmtInt(Math.round(n))}
          delta={kpi.deltaCamere} deltaLabel={`${fmtDelta(kpi.deltaCamere)} vs LY`}
          spark={kpi.sparkCamere}
          info="Notti camera già vendute sull'orizzonte."
        />
        <KpiTile
          label="ADR a libro" icon="fa-tag" slot={3} index={2}
          value={kpi.adr} format={(n) => fmtEur(n, 0)}
          delta={kpi.deltaAdr} deltaLabel={`${fmtDelta(kpi.deltaAdr)} vs LY`}
          spark={kpi.sparkAdr}
          info="Prezzo medio delle camere a libro: se il pace cresce ma l'ADR scende, si sta riempiendo a sconto."
        />
        <KpiTile
          label="Occupazione a libro" icon="fa-door-open" slot={4} index={3}
          value={kpi.occ} format={(n) => fmtPct(n)}
          spark={kpi.sparkOcc}
          info="Camere già vendute sul totale delle camere disponibili nell'orizzonte."
        />
        <KpiTile
          label="Quota garantita" icon="fa-shield-halved" slot={6} index={4}
          value={kpi.quotaGarantita} format={(n) => fmtPct(n, 0)}
          deltaLabel={`${fmtEurK(kpi.opzionato)} ancora in opzione`}
          spark={kpi.sparkGarantito}
          info="Parte del libro con prenotazione garantita (carta o caparra). Il resto sono opzioni di gruppi e tour operator che possono cadere."
        />
      </div>

      {/* ── On the book per data di soggiorno ─────────────────────────────── */}
      <ChartCard
        className="otb__main"
        index={0}
        title="A libro per data di soggiorno"
        subtitle={vista === 'mesi' ? 'Ricavo a libro per mese, garantito e opzionato' : 'Ricavo a libro giorno per giorno, garantito e opzionato'}
        badge={fmtEurK(kpi.otbRicavo)}
        legend={vista === 'dettaglio' ? undefined : legendaLibro}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'giorni', label: 'Per giorno' },
              { id: 'mesi', label: 'Per mese' },
              { id: 'dettaglio', label: 'Dettaglio' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as Vista)}
          />
        )}
      >
        {vista !== 'dettaglio' ? (
          <div className="otb__chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serie} margin={{ top: 6, right: 8, left: -6, bottom: 0 }} barCategoryGap={vista === 'mesi' ? '28%' : '12%'}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval="preserveStartEnd" />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ garantito: 'Garantito', opzionato: 'Opzionato', otbRicavoLY: 'A libro LY', previsto: 'Previsto a consuntivo' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                <Bar
                  dataKey="garantito" stackId="otb" fill={series(0)} maxBarSize={vista === 'mesi' ? 56 : 18}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Bar
                  dataKey="opzionato" stackId="otb" fill={series(0)} fillOpacity={0.4} radius={[4, 4, 0, 0]} maxBarSize={vista === 'mesi' ? 56 : 18}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="otbRicavoLY" stroke={CHART.ly} strokeWidth={1.6} dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="previsto" stroke={CHART.forecast} strokeWidth={1.8} strokeDasharray="5 4" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(3)} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="otb__detail">
            <div className="sib-table-wrap otb__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <thead>
                  <tr>
                    <th>Soggiorno</th>
                    <th className="otb__num">Camere</th>
                    <th className="otb__num">Occupazione</th>
                    <th className="otb__num">Ricavo a libro</th>
                    <th className="otb__num">Opzionato</th>
                    <th className="otb__num">Da vendere</th>
                    <th className="otb__num">Pace vs LY</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((d) => {
                    const pace = d.otbRicavoLY ? ((d.otbRicavo - d.otbRicavoLY) / d.otbRicavoLY) * 100 : 0
                    return (
                      <tr key={d.label}>
                        <td>{d.label}{d.weekend && <span className="otb__tag">weekend</span>}</td>
                        <td className="otb__num">{fmtInt(d.otbCamere)}</td>
                        <td className="otb__num">{fmtPct(d.otbOcc)}</td>
                        <td className="otb__num">{fmtEur(d.otbRicavo, 0)}</td>
                        <td className="otb__num">{fmtEur(d.opzionato, 0)}</td>
                        <td className="otb__num">{fmtEur(Math.max(0, d.previsto - d.otbRicavo), 0)}</td>
                        <td className="otb__num"><DeltaBadge value={pace} size="sm" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="otb__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Per segmento di mercato ───────────────────────────────────────── */}
      <ChartCard
        className="otb__seg"
        index={1}
        title="A libro per segmento"
        subtitle="Ricavo a libro e prezzo medio per segmento"
      >
        <div className="otb__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.segmenti} layout="vertical" margin={{ top: 2, right: 124, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={84} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip names={{ valore: 'A libro' }} format={(v) => fmtEur(v, 0)} />} />
              <Bar dataKey="valore" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={18}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}>
                <LabelList dataKey="valore" content={etichetta((i) => `${fmtEurK(data.segmenti[i].valore)} · ADR ${fmtEur(data.segmenti[i].adr ?? 0, 0)}`)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Pickup dell'ultima settimana ──────────────────────────────────── */}
      <ChartCard
        className="otb__pk"
        index={2}
        title={`Entrato negli ultimi ${FINESTRA_PICKUP} giorni`}
        subtitle="Camere acquisite per settimana di soggiorno"
        badge={`+${fmtInt(kpi.pickupCamere)} camere · ${fmtEurK(kpi.pickupRicavo)}`}
      >
        <div className="otb__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.settimane} margin={{ top: 16, right: 8, left: -6, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval="preserveStartEnd" />
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ pickupCamere: 'Camere acquisite' }} format={(v) => `${fmtInt(v)} camere`} />}
              />
              <Bar dataKey="pickupCamere" fill={series(1)} radius={[4, 4, 0, 0]} maxBarSize={34}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Per canale di vendita ─────────────────────────────────────────── */}
      <ChartCard
        className="otb__ch"
        index={3}
        title="A libro per canale"
        subtitle="Ricavo a libro e commissione media riconosciuta"
      >
        <div className="otb__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.canali} layout="vertical" margin={{ top: 2, right: 124, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={112} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip names={{ valore: 'A libro' }} format={(v) => fmtEur(v, 0)} />} />
              <Bar dataKey="valore" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={18}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}>
                <LabelList dataKey="valore" content={etichetta((i) => `${fmtEurK(data.canali[i].valore)}${data.canali[i].commissione ? ` · comm. ${fmtPct(data.canali[i].commissione!, 0)}` : ''}`)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </BiPage>
  )
}
