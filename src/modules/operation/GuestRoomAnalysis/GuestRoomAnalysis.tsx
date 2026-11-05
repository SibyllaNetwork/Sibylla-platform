import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Pagination from '../../../core/components/Pagination'
import {
  ANIM, barEndLabel, BiLegend, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtDec, fmtDelta, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import { useStrutturaIdRevenue } from '../../../hooks/useStrutturaCorrente'
import { buildGuestRoom, computeGuestRoomKpi, PERIODI, type GuestRoomData, type PeriodoId } from './guestRoom.data'
import './GuestRoomAnalysis.sass'

// ─── GUEST & ROOM ANALYSIS ──────────────────────────────────────────────────────
//  Chi sono gli ospiti e come usano le camere nel periodo trascorso:
//    • fascia indicatori: ospiti arrivati, presenze, permanenza media, ospiti
//      ripetenti, ricavo per ospite (tutti contro l'anno precedente)
//    • camere occupate e ospiti in casa giorno per giorno (+ Dettaglio)
//    • da dove arrivano (bandiere tonde, quota e scostamento sull'LY)
//    • tipologie di camera più vendute, composizione dei soggiorni,
//      upgrade e servizi extra

type Vista = 'andamento' | 'dettaglio'

/** Etichetta a fine barra su una riga sola (kit), con il testo della riga. */
const etichetta = (testo: (i: number) => string) => (p: any) => barEndLabel(() => testo(p.index))(p)
/**
 * Tick dell'asse delle provenienze: bandiera tonda (SVG di public/flags, già
 * disegnati tondi) e nome del paese; "Altri paesi" con il globo.
 */
function TickPaese({ x = 0, y = 0, payload, voci }: any) {
  const v = voci.find((p: { label: string }) => p.label === payload?.value)
  return (
    <g transform={`translate(${x},${y})`}>
      {v?.iso
        ? <image href={`/flags/${v.iso}.svg`} x={-104} y={-7} width={14} height={14} />
        : <circle cx={-97} cy={0} r={7} className="gra__tick-altri" />}
      <text x={-86} y={0} dy={4} textAnchor="start" className="gra__tick">{payload?.value}</text>
    </g>
  )
}

/** Tick di categoria su una riga sola (quello di recharts manda a capo le etichette lunghe). */
function TickTesto({ x = 0, y = 0, payload }: any) {
  return <text x={x} y={y} dy={4} textAnchor="end" className="gra__tick">{payload?.value}</text>
}

const fmtPunti = (n: number) => `${n >= 0 ? '+' : '−'}${fmtDec(Math.abs(n), 1)} pt`

export default function GuestRoomAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useStrutturaIdRevenue()
  const [periodo, setPeriodo] = useState<PeriodoId>('30')
  const [vista, setVista] = useState<Vista>('andamento')
  const [pagina, setPagina] = useState(1)
  const [segmentoAttivo, setSegmentoAttivo] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<GuestRoomData> | null>(null)

  const mock = useMemo(() => buildGuestRoom(strutturaId, periodo), [strutturaId, periodo])
  const data: GuestRoomData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computeGuestRoomKpi(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<GuestRoomData>>('operation/GetGuestRoomAnalysis', {
      method: 'POST',
      body: { strutturaId, periodo },
    })
      .then((d) => { if (!annullato && d) setRemoto(d) })
      .catch(() => { if (!annullato) setRemoto(null) })
      .finally(() => { if (!annullato) setLoading(false) })
    return () => { annullato = true }
  }, [strutturaId, periodo])

  useEffect(() => { setPagina(1) }, [strutturaId, periodo])

  const still = reducedMotion()
  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({ rowHeight: 30, headerHeight: 32, min: 4, max: 20 })
  const giorniDesc = useMemo(() => [...data.giorni].reverse(), [data.giorni])
  const totPagine = Math.max(1, Math.ceil(giorniDesc.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = giorniDesc.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  // Oltre i tre mesi le barre giornaliere diventano fili: il grafico passa alle settimane.
  const serie = useMemo(() => {
    if (data.giorni.length <= 92) return data.giorni.map((d) => ({ label: d.label, camere: d.camere, ospiti: d.ospiti, ospitiLY: d.ospitiLY }))
    const out: { label: string; camere: number; ospiti: number; ospitiLY: number; n: number }[] = []
    data.giorni.forEach((d, i) => {
      const k = Math.floor(i / 7)
      if (!out[k]) out[k] = { label: d.label, camere: 0, ospiti: 0, ospitiLY: 0, n: 0 }
      out[k].camere += d.camere; out[k].ospiti += d.ospiti; out[k].ospitiLY += d.ospitiLY; out[k].n++
    })
    // Medie per notte, così l'asse resta leggibile come quello giornaliero.
    return out.map((x) => ({ label: x.label, camere: Math.round(x.camere / x.n), ospiti: Math.round(x.ospiti / x.n), ospitiLY: Math.round(x.ospitiLY / x.n) }))
  }, [data.giorni])
  const settimanale = data.giorni.length > 92

  const totSoggiorni = data.composizione.reduce((s, x) => s + x.valore, 0)
  const periodoLbl = PERIODI.find((p) => p.id === periodo)?.label.toLowerCase() ?? ''

  return (
    <BiPage
      title="Guest & room analysis"
      subtitle={`Chi sono gli ospiti e come usano le camere · ${periodoLbl}`}
      glossary={['TY', 'LY', 'presenze', 'ALOS', 'ripetenti', 'revGuest', 'occupazione', 'ADR', 'upgrade', 'upsell']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="gra__grid"
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
            className="gra__filter gra__filter--wide"
          />
          <SelectField
            name="periodo" label="Periodo"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoId)}
            options={PERIODI.map((p) => ({ value: p.id, label: p.label }))}
            className="gra__filter"
          />
          <span className="gra__note">
            <i className="fa-solid fa-bed" aria-hidden="true" />
            {fmtInt(kpi.camereOccupate)} notti camera · {fmtDec(kpi.ospitiPerCamera, 2)} ospiti per camera · bambini {fmtPct(data.bambini, 0)}
          </span>
        </>
      )}
    >
      {/* ── Indicatori dell'ospite ────────────────────────────────────────── */}
      <div className="gra__kpis">
        <KpiTile
          label="Ospiti arrivati" icon="fa-person-walking-luggage" slot={0} index={0}
          value={kpi.arrivi} format={(n) => fmtInt(Math.round(n))}
          delta={kpi.deltaArrivi} deltaLabel={`${fmtDelta(kpi.deltaArrivi)} vs LY`}
          spark={kpi.sparkArrivi}
          info="Ospiti che hanno fatto check-in nel periodo."
        />
        <KpiTile
          label="Presenze" icon="fa-moon" slot={1} index={1}
          value={kpi.presenze} format={(n) => fmtInt(Math.round(n))}
          delta={kpi.deltaPresenze} deltaLabel={`${fmtDelta(kpi.deltaPresenze)} vs LY`}
          spark={kpi.sparkPresenze}
          info="Notti trascorse dagli ospiti in struttura: è la base della tassa di soggiorno e dei consumi."
        />
        <KpiTile
          label="Permanenza media" icon="fa-calendar-days" slot={3} index={2}
          value={kpi.alos} format={(n) => `${fmtDec(n, 2)} notti`}
          delta={kpi.deltaAlos} deltaLabel={`${fmtDelta(kpi.deltaAlos)} vs LY`}
          spark={kpi.sparkAlos}
          info="Notti medie per ospite (ALOS). Soggiorni più lunghi abbassano i costi di rotazione delle camere."
        />
        <KpiTile
          label="Ospiti ripetenti" icon="fa-rotate" slot={4} index={3}
          value={data.ripetenti} format={(n) => fmtPct(n)}
          delta={data.ripetenti - data.ripetentiLY} deltaLabel={`${fmtPunti(data.ripetenti - data.ripetentiLY)} vs LY`}
          info="Ospiti che erano già stati in struttura: misura la fidelizzazione."
        />
        <KpiTile
          label="Ricavo per ospite" icon="fa-euro-sign" slot={6} index={4}
          value={kpi.revGuest} format={(n) => fmtEur(n, 0)}
          delta={kpi.deltaRevGuest} deltaLabel={`${fmtDelta(kpi.deltaRevGuest)} vs LY`}
          spark={kpi.sparkRevGuest}
          info="Ricavi camere più servizi extra, diviso gli ospiti arrivati."
        />
      </div>

      {/* ── Camere occupate e ospiti in casa ──────────────────────────────── */}
      <ChartCard
        className="gra__main"
        index={0}
        title="Camere occupate e ospiti in casa"
        subtitle={settimanale ? 'Media per notte, settimana per settimana' : 'Notte per notte nel periodo'}
        badge={`${fmtInt(kpi.presenze)} presenze`}
        legend={vista === 'dettaglio' ? undefined : [
          { key: 'camere', name: 'Camere occupate', color: series(0) },
          { key: 'ospiti', name: 'Ospiti TY', color: series(1) },
          { key: 'ospitiLY', name: 'Ospiti LY', color: CHART.ly },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={[{ id: 'andamento', label: 'Andamento' }, { id: 'dettaglio', label: 'Dettaglio' }]}
            active={vista}
            onChange={(id) => setVista(id as Vista)}
          />
        )}
      >
        {vista === 'andamento' ? (
          <div className="gra__chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serie} margin={{ top: 6, right: 4, left: -6, bottom: 0 }} barCategoryGap="14%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval="preserveStartEnd" />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ camere: 'Camere occupate', ospiti: 'Ospiti TY', ospitiLY: 'Ospiti LY' }}
                      format={(v) => fmtInt(v)}
                    />
                  )}
                />
                <Bar dataKey="camere" fill={series(0)} radius={[4, 4, 0, 0]} maxBarSize={20}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
                <Line type="monotone" dataKey="ospitiLY" stroke={CHART.ly} strokeWidth={1.6} strokeDasharray="4 4" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
                <Line type="monotone" dataKey="ospiti" stroke={series(1)} strokeWidth={2.4} dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="gra__detail">
            <div className="sib-table-wrap gra__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <thead>
                  <tr>
                    <th>Notte</th>
                    <th className="gra__num">Camere</th>
                    <th className="gra__num">Occupazione</th>
                    <th className="gra__num">Ospiti</th>
                    <th className="gra__num">Arrivi</th>
                    <th className="gra__num">Ospiti per camera</th>
                    <th className="gra__num">Ospiti vs LY</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((d) => (
                    <tr key={d.label}>
                      <td>{d.label}{d.weekend && <span className="gra__tag">weekend</span>}</td>
                      <td className="gra__num">{fmtInt(d.camere)}</td>
                      <td className="gra__num">{fmtPct(d.occ)}</td>
                      <td className="gra__num">{fmtInt(d.ospiti)}</td>
                      <td className="gra__num">{fmtInt(d.arrivi)}</td>
                      <td className="gra__num">{d.camere ? fmtDec(d.ospiti / d.camere, 2) : '-'}</td>
                      <td className="gra__num"><DeltaBadge value={d.ospitiLY ? ((d.ospiti - d.ospitiLY) / d.ospitiLY) * 100 : 0} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="gra__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Provenienze ───────────────────────────────────────────────────── */}
      <ChartCard
        className="gra__prov"
        index={1}
        title="Provenienze"
        subtitle="Quota degli ospiti arrivati per paese"
      >
        <div className="gra__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.provenienze} layout="vertical" margin={{ top: 2, right: 118, left: 0, bottom: 0 }} barCategoryGap="18%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={110} interval={0} tick={<TickPaese voci={data.provenienze} />} />
              <RTooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip names={{ quota: 'Quota TY' }} format={(v) => fmtPct(v, 1)} />} />
              <Bar dataKey="quota" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={14}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}>
                <LabelList dataKey="quota" content={etichetta((i) => `${fmtPct(data.provenienze[i].quota, 1)} · ${fmtPunti(data.provenienze[i].quota - data.provenienze[i].quotaLY)} vs LY`)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Tipologie di camera ───────────────────────────────────────────── */}
      <ChartCard
        className="gra__tip"
        index={2}
        title="Tipologie di camera"
        subtitle="Occupazione e prezzo medio per tipologia"
      >
        <div className="gra__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.tipologie} layout="vertical" margin={{ top: 2, right: 104, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={110} interval={0} tick={<TickTesto />} />
              <RTooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip names={{ occ: 'Occupazione' }} format={(v) => fmtPct(v)} />} />
              <Bar dataKey="occ" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={16}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}>
                <LabelList dataKey="occ" content={etichetta((i) => `${fmtPct(data.tipologie[i].occ, 0)} · ADR ${fmtEur(data.tipologie[i].adr ?? 0, 0)}`)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Composizione dei soggiorni ────────────────────────────────────── */}
      <ChartCard
        className="gra__comp"
        index={3}
        title="Composizione dei soggiorni"
        subtitle="Con chi viaggiano gli ospiti"
      >
        <div className="gra__comp-body">
          <BiLegend
            layout="column"
            className="gra__comp-legend"
            items={data.composizione.map((c, i) => ({
              key: c.label,
              name: c.label,
              color: series(i),
              value: fmtPct(c.quota, 0),
              off: segmentoAttivo !== null && segmentoAttivo !== i,
            }))}
            onToggle={(k) => {
              const i = data.composizione.findIndex((c) => c.label === k)
              setSegmentoAttivo((cur) => (cur === i ? null : i))
            }}
          />
          <div className="gra__donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.composizione} dataKey="valore" nameKey="label"
                  innerRadius="58%" outerRadius="86%" paddingAngle={2}
                  stroke={CHART.surface} strokeWidth={2}
                  onMouseEnter={(_, i) => setSegmentoAttivo(i)}
                  onMouseLeave={() => setSegmentoAttivo(null)}
                  isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                >
                  {data.composizione.map((c, i) => (
                    <Cell key={c.label} fill={series(i)} fillOpacity={segmentoAttivo === null || segmentoAttivo === i ? 1 : 0.28} />
                  ))}
                </Pie>
                <RTooltip content={<ChartTooltip format={(v) => `${fmtInt(v)} soggiorni`} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="gra__donut-center" aria-live="polite">
              {segmentoAttivo === null ? (
                <>
                  <span className="gra__donut-val">{fmtInt(totSoggiorni)}</span>
                  <span className="gra__donut-lbl">Soggiorni</span>
                </>
              ) : (
                <>
                  <span className="gra__donut-val">{fmtPct(data.composizione[segmentoAttivo].quota, 0)}</span>
                  <span className="gra__donut-lbl">{data.composizione[segmentoAttivo].label}</span>
                  <span className="gra__donut-note">LY {fmtPct(data.composizione[segmentoAttivo].quotaLY, 0)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </ChartCard>

      {/* ── Upgrade e servizi extra ───────────────────────────────────────── */}
      <ChartCard
        className="gra__ups"
        index={4}
        title="Upgrade e servizi extra"
        subtitle="Ricavo e adesione dei soggiorni"
        badge={fmtEurK(kpi.ricavoExtra)}
        footer={`Upgrade: ${fmtInt(data.upgrade.venduti)} venduti (${fmtEurK(data.upgrade.ricavo)}) e ${fmtInt(data.upgrade.concessi)} concessi gratis.`}
      >
        <div className="gra__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.extra} layout="vertical" margin={{ top: 2, right: 112, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={110} interval={0} tick={<TickTesto />} />
              <RTooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip names={{ ricavo: 'Ricavo' }} format={(v) => fmtEur(v, 0)} />} />
              <Bar dataKey="ricavo" fill={series(2)} radius={[0, 4, 4, 0]} maxBarSize={16}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}>
                <LabelList dataKey="ricavo" content={etichetta((i) => `${fmtEurK(data.extra[i].ricavo)} · ${fmtPct(data.extra[i].adesione, 0)}`)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </BiPage>
  )
}
