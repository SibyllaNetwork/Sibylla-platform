import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { apiFetchSibylla } from '../../../services/api'
import { DateRangeField, SelectField } from '../../../core/components/form'
import Tooltip from '../../../core/components/Tooltip'
import {
  ANIM, BiPage, ChartCard, ChartTooltip, KpiTile, barEndLabel,
  CHART, cursorProps, fmtInt, fmtPct, gridProps, reducedMotion, series, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { useStrutturaIdRevenue, useStruttureCliente } from '../../../hooks/useStrutturaCorrente'
import { idStruttura, type SchedaDemo } from '../../../core/demo/struttureDemo'
import './OperationOverview.sass'

// ─── OPERATION OVERVIEW ─────────────────────────────────────────────────────────
//  Lo stato delle camere e della manutenzione in una schermata, col kit BI:
//    • fascia indicatori: camere in manutenzione, indisponibilità, camere fuori
//      servizio oggi, segnalazioni aperte e risolte
//    • camere indisponibili e in manutenzione giorno per giorno, con la previsione
//    • quota indisponibile sul totale delle camere
//    • segnalazioni per struttura (aperte / risolte), col rimando alla gestione

interface ChartPoint {
  date: string
  capienza: number
  occupate: number
  occupateForecast: number | null
  inManutenzione: number
}

interface SegnalazioneHotel {
  id: number
  nome: string
  open: number
  total: number
}

interface Data {
  Strutture: { Id: number; nome: string }[]
  StrutturaId: number | null
  dataDa: string
  dataA: string
  pctManutenzione: number
  pctManutenzioneLY: number
  tassoIndisponibilita: number
  trend: ChartPoint[]
  indisponibili: number
  totale: number
  rooms: { id: number; nome: string }[]
  roomsSelected: string
  segnalazioniHotel: SegnalazioneHotel[]
}

// ── Dati demo (senza backend) ──────────────────────────────────────────────────
//  Strutture del cliente corrente; 90 giorni fino a oggi più 30 di previsione.
//  Valori deterministici: stessa struttura, stessi numeri.
const isoDi = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
/** "dd.mm.yyyy" (formato del servizio) → "yyyy-mm-dd" */
const isoDaPunti = (s: string) => { const [d, m, y] = s.split('.'); return `${y}-${m}-${d}` }

function genFallback(schede: SchedaDemo[], strutturaId: number | null): Data {
  const hotel = schede.filter((x) => x.camere > 0)
  const sel = strutturaId === null ? hotel : hotel.filter((x) => idStruttura(x.nome) === strutturaId)
  const camere = Math.max(1, sel.reduce((a, x) => a + x.camere, 0))
  const seme = sel.reduce((a, x) => a + x.seme, 0)
  const oggi = new Date()
  const start = new Date(oggi); start.setDate(start.getDate() - 89)
  const trend: ChartPoint[] = []
  for (let i = 0; i < 120; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i)
    const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
    const r = ((seme + i * 2654435761) >>> 0) % 1000 / 1000
    const fuori = Math.max(1, Math.round(camere * (0.05 + 0.04 * Math.sin(i / 9) + (r - 0.5) * 0.03)))
    trend.push({
      date,
      capienza: camere,
      occupate: fuori,
      occupateForecast: i >= 89 ? Math.max(1, Math.round(camere * (0.045 + r * 0.02))) : null,
      inManutenzione: Math.max(0, Math.round(fuori * (0.35 + r * 0.2))),
    })
  }
  const pct = +(trend.slice(0, 90).reduce((a, t) => a + t.inManutenzione, 0) / (90 * camere) * 100).toFixed(2)
  const indisp = +(trend.slice(0, 90).reduce((a, t) => a + t.occupate, 0) / (90 * camere) * 100).toFixed(2)
  return {
    Strutture: hotel.map((x) => ({ Id: idStruttura(x.nome), nome: x.nome })),
    StrutturaId: strutturaId,
    dataDa: isoDi(start),
    dataA: isoDi(oggi),
    pctManutenzione: pct,
    pctManutenzioneLY: +(pct * 1.18).toFixed(2),
    tassoIndisponibilita: indisp,
    trend,
    indisponibili: indisp,
    totale: 100,
    rooms: sel.map((x) => ({ id: idStruttura(x.nome), nome: x.nome })),
    roomsSelected: sel[0]?.nome ?? '',
    segnalazioniHotel: hotel.map((x) => ({
      id: idStruttura(x.nome), nome: x.nome,
      total: Math.round(x.camere * 0.35) + 4,
      open: Math.round((Math.round(x.camere * 0.35) + 4) * (0.15 + (x.seme % 20) / 100)),
    })),
  }
}

export default function OperationOverview({ navigate }: { navigate: (p: string) => void }) {
  // Struttura selezionata in alto; senza backend i dati sono quelli demo.
  const schede = useStruttureCliente()
  const [strutturaId, setStrutturaId] = useStrutturaIdRevenue()
  const [data, setData] = useState<Data>(() => genFallback(schede, strutturaId))
  const [loading, setLoading] = useState(false)
  const [dataAt, setDataAt] = useState(() => new Date())
  useEffect(() => { setData(genFallback(schede, strutturaId)) }, [schede, strutturaId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetchSibylla<Data>('operation/GetOverview', {
      method: 'POST',
      body: { strutturaId: data.StrutturaId, da: data.dataDa, a: data.dataA },
    })
      .then((d) => { if (!cancelled && d) { setData(d); setDataAt(new Date()) } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const still = reducedMotion()

  // Giorni dell'intervallo scelto; la previsione resta visibile dopo la data finale
  const giorni = useMemo(() => data.trend
    .map((t) => ({ ...t, iso: isoDaPunti(t.date), label: t.date.slice(0, 5) }))
    .filter((t) => t.iso >= data.dataDa && (t.iso <= data.dataA || t.occupateForecast !== null)),
  [data.trend, data.dataDa, data.dataA])
  const consuntivo = giorni.filter((t) => t.iso <= data.dataA)
  const capienza = data.trend[0]?.capienza ?? 0
  const oggi = consuntivo[consuntivo.length - 1]
  const quotaGiorno = (t: ChartPoint, k: 'occupate' | 'inManutenzione') => (t.capienza ? (t[k] / t.capienza) * 100 : 0)

  const apertTot = data.segnalazioniHotel.reduce((s, h) => s + h.open, 0)
  const totaleSeg = data.segnalazioniHotel.reduce((s, h) => s + h.total, 0)
  const segnalazioni = data.segnalazioniHotel.map((h) => ({ nome: h.nome, aperte: h.open, risolte: Math.max(0, h.total - h.open), totale: h.total }))
  const quota = [
    { label: 'Indisponibili', value: data.indisponibili },
    { label: 'Disponibili', value: Math.max(0, data.totale - data.indisponibili) },
  ]

  return (
    <BiPage
      title="Operation overview"
      subtitle="Monitoraggio e confronto delle performance operative"
      glossary={['OOO', 'LY', 'delta', 'manutenzione', 'indisponibilita']}
      dataAt={dataAt}
      loading={loading}
      onRefresh={() => setDataAt(new Date())}
      gridClassName="op-ov__grid"
      actions={(
        <Tooltip text="Segnalazioni">
          <button
            type="button"
            className="sib-btn sib-btn--icon op-ov__link"
            onClick={() => navigate('segnalazioni')}
            aria-label="Segnalazioni"
          >
            <i className="fa-regular fa-screwdriver-wrench" aria-hidden="true" />
          </button>
        </Tooltip>
      )}
      toolbar={(
        <>
          <SelectField
            className="op-ov__filter"
            label="Struttura"
            name="struttura"
            value={data.StrutturaId ?? ''}
            options={[
              { value: '', label: 'Tutte le strutture' },
              ...data.Strutture.map((s) => ({ value: s.Id, label: s.nome })),
            ]}
            onChange={(e) => setStrutturaId(e.target.value ? Number(e.target.value) : null)}
          />
          <DateRangeField
            className="op-ov__range"
            label="Intervallo"
            nameFrom="da" nameTo="a"
            valueFrom={data.dataDa} valueTo={data.dataA}
            onChange={(from, to) => setData((d) => ({
              ...d,
              dataDa: from ? isoDi(from) : d.dataDa,
              dataA: to ? isoDi(to) : d.dataA,
            }))}
          />
        </>
      )}
    >
      {/* ── Indicatori del periodo ────────────────────────────────────────── */}
      <div className="op-ov__kpis">
        <KpiTile
          label="In manutenzione" icon="fa-screwdriver-wrench" slot={1} index={0}
          value={data.pctManutenzione} format={(n) => fmtPct(n, 2)}
          delta={data.pctManutenzioneLY ? ((data.pctManutenzione - data.pctManutenzioneLY) / data.pctManutenzioneLY) * 100 : 0}
          invertDelta spark={consuntivo.map((t) => quotaGiorno(t, 'inManutenzione'))}
          info={`Camere in manutenzione sul totale, in media giornaliera nel periodo. Anno precedente: ${fmtPct(data.pctManutenzioneLY, 2)}.`}
        />
        <KpiTile
          label="Tasso di indisponibilità" icon="fa-door-closed" slot={0} index={1}
          value={data.tassoIndisponibilita} format={(n) => fmtPct(n, 2)}
          spark={consuntivo.map((t) => quotaGiorno(t, 'occupate'))}
          info="Camere non vendibili (fuori servizio o in manutenzione) sul totale, in media giornaliera nel periodo."
        />
        <KpiTile
          label="Camere fuori servizio oggi" icon="fa-bed" slot={2} index={2}
          value={oggi?.occupate ?? 0} format={fmtInt}
          info={`Camere non vendibili nell'ultimo giorno dell'intervallo, su ${fmtInt(capienza)} camere.`}
        />
        <KpiTile
          label="Segnalazioni aperte" icon="fa-triangle-exclamation" slot={4} index={3}
          value={apertTot} format={fmtInt}
          info="Segnalazioni ancora da chiudere, su tutte le strutture selezionate."
        />
        <KpiTile
          label="Segnalazioni risolte" icon="fa-circle-check" slot={3} index={4}
          value={totaleSeg ? ((totaleSeg - apertTot) / totaleSeg) * 100 : 0} format={(n) => fmtPct(n, 0)}
          info={`Segnalazioni chiuse sul totale ricevuto (${fmtInt(totaleSeg)}).`}
        />
      </div>

      {/* ── Camere indisponibili giorno per giorno ────────────────────────── */}
      <ChartCard
        className="op-ov__main"
        index={0}
        title="Camere indisponibili e in manutenzione"
        subtitle={`Giorno per giorno su ${fmtInt(capienza)} camere, con la previsione dei prossimi giorni`}
        legend={[
          { key: 'ind', name: 'Indisponibili', color: series(0) },
          { key: 'man', name: 'In manutenzione', color: series(1) },
          { key: 'fc', name: 'Previsione', color: CHART.forecast, dashed: true },
        ]}
      >
        <div className="op-ov__chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={giorni} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="op-ov-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series(0)} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={series(0)} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} minTickGap={24} />
              <YAxis {...yAxisProps} tickFormatter={fmtInt} allowDecimals={false} />
              <RTooltip
                cursor={cursorProps}
                content={(
                  <ChartTooltip
                    names={{ occupate: 'Indisponibili', inManutenzione: 'In manutenzione', occupateForecast: 'Previsione' }}
                    format={(v) => `${fmtInt(v)} camere`}
                  />
                )}
              />
              <Area
                type="linear" dataKey="occupate" stroke={series(0)} strokeWidth={2.2} fill="url(#op-ov-area)" dot={false}
                isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Line
                type="linear" dataKey="inManutenzione" stroke={series(1)} strokeWidth={1.8} dot={false}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Line
                type="linear" dataKey="occupateForecast" stroke={CHART.forecast} strokeWidth={1.8}
                strokeDasharray="5 3" dot={false} connectNulls
                isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Quota indisponibile sul totale ──────────────────────────────────────── */}
      <ChartCard
        className="op-ov__quota"
        index={1}
        title="Indisponibili"
        subtitle="Media giornaliera del periodo"
        legend={quota.map((q, i) => ({ key: q.label, name: q.label, color: i === 0 ? series(0) : CHART.ly }))}
      >
        <div className="op-ov__donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={quota} dataKey="value" nameKey="label"
                innerRadius="62%" outerRadius="86%" paddingAngle={2}
                stroke={CHART.surface} strokeWidth={2}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {quota.map((q, i) => <Cell key={q.label} fill={i === 0 ? series(0) : CHART.ly} />)}
              </Pie>
              <RTooltip content={<ChartTooltip format={(v) => fmtPct(v, 1)} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="op-ov__donut-center">
            <span className="op-ov__donut-val">{fmtPct(data.indisponibili, 1)}</span>
            <span className="op-ov__donut-lbl">indisponibili</span>
          </div>
        </div>
      </ChartCard>

      {/* ── Segnalazioni per struttura ────────────────────────────────────── */}
      <ChartCard
        className="op-ov__seg"
        index={2}
        title="Segnalazioni"
        subtitle="Aperte e risolte per struttura"
        badge={`${fmtInt(apertTot)} aperte`}
        legend={[
          { key: 'aperte', name: 'Aperte', color: series(4) },
          { key: 'risolte', name: 'Risolte', color: CHART.ly },
        ]}
      >
        <div className="op-ov__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={segnalazioni} layout="vertical" margin={{ top: 2, right: 36, left: 0, bottom: 0 }} barCategoryGap="26%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="nome" {...yAxisProps} width={120} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ aperte: 'Aperte', risolte: 'Risolte' }} format={(v) => fmtInt(v)} />}
              />
              <Bar
                dataKey="aperte" stackId="s" fill={series(4)} maxBarSize={14}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Bar
                dataKey="risolte" stackId="s" fill={CHART.ly} radius={[0, 4, 4, 0]} maxBarSize={14}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {/* In testa alla barra il totale ricevuto */}
                <LabelList dataKey="totale" content={barEndLabel(fmtInt)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </BiPage>
  )
}
