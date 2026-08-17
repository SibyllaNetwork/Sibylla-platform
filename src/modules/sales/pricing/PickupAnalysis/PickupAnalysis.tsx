import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../../core/components/form'
import Pagination from '../../../../core/components/Pagination'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtDelta, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../../core/bi'
import { apiFetchSibylla } from '../../../../services/api'
import {
  buildPickup, computePickupKpi, FINESTRE, ORIZZONTI, type PickupData,
} from './pickupAnalysis.data'
import './PickupAnalysis.sass'

// ─── PICKUP ANALYSIS ────────────────────────────────────────────────────────────
//  Quanta domanda è ENTRATA nell'ultimo intervallo di osservazione, per data di
//  soggiorno: è la lettura con cui si decide dove alzare il prezzo (date che
//  corrono) e dove intervenire con offerte o distribuzione (date ferme).
//    • fascia indicatori: camere e ricavo acquisiti, ADR del pickup, on the book,
//      ritmo di riempimento rispetto all'anno precedente (pace)
//    • pickup per data di soggiorno + vista Dettaglio tabellare
//    • on the book a confronto con l'anno precedente
//    • da dove è arrivato il pickup (canali) e dove guardare (date critiche)

export default function PickupAnalysis({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [finestra, setFinestra] = useState(7)
  const [orizzonte, setOrizzonte] = useState(60)
  const [vista, setVista] = useState<'trend' | 'dettaglio'>('trend')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<PickupData> | null>(null)

  const mock = useMemo(
    () => buildPickup(strutturaId, finestra, orizzonte),
    [strutturaId, finestra, orizzonte],
  )
  const data: PickupData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const kpi = useMemo(() => computePickupKpi(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<PickupData>>('booking/GetPickup', {
      method: 'POST',
      body: { strutturaId, finestra, orizzonte },
    })
      .then((d) => { if (!annullato && d) setRemoto(d) })
      .catch(() => { if (!annullato) setRemoto(null) })
      .finally(() => { if (!annullato) setLoading(false) })
    return () => { annullato = true }
  }, [strutturaId, finestra, orizzonte])

  useEffect(() => { setPagina(1) }, [strutturaId, finestra, orizzonte])

  const still = reducedMotion()

  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 30, headerHeight: 32, min: 4, max: 20,
  })
  const totPagine = Math.max(1, Math.ceil(data.giorni.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = data.giorni.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  return (
    <BiPage
      title="Pickup analysis"
      subtitle={`Domanda entrata negli ultimi ${finestra} giorni sui prossimi ${orizzonte} giorni di soggiorno`}
      glossary={['pickup', 'OTB', 'TY', 'LY', 'delta', 'ADR', 'occupazione', 'dirette', 'B2B', 'gruppi', 'corporate', 'ranking']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="pk__grid"
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
            className="pk__filter pk__filter--wide"
          />
          <SelectField
            name="finestra" label="Finestra di pickup"
            value={finestra}
            onChange={(e) => setFinestra(Number(e.target.value))}
            options={FINESTRE.map((f) => ({ value: f, label: f === 1 ? 'Ultimo giorno' : `Ultimi ${f} gg` }))}
            className="pk__filter"
          />
          <SelectField
            name="orizzonte" label="Orizzonte di soggiorno"
            value={orizzonte}
            onChange={(e) => setOrizzonte(Number(e.target.value))}
            options={ORIZZONTI.map((o) => ({ value: o, label: `Prossimi ${o} gg` }))}
            className="pk__filter"
          />
          <span className="pk__note">
            <i className="fa-solid fa-bed" aria-hidden="true" />
            {fmtInt(data.camereDisponibili)} camere disponibili · ADR del pickup {fmtEur(kpi.adrPickup, 0)}
          </span>
        </>
      )}
    >
      {/* ── Indicatori del ritmo di riempimento ───────────────────────────── */}
      <div className="pk__kpis">
        <KpiTile
          label="Camere acquisite" icon="fa-cart-plus" slot={0} index={0}
          value={kpi.pickupCamere} format={(n) => fmtInt(Math.round(n))}
          spark={data.giorni.map((d) => d.pickupCamere)}
          info={`Camere entrate negli ultimi ${finestra} giorni per soggiorni nell'orizzonte selezionato.`}
        />
        <KpiTile
          label="Ricavo acquisito" icon="fa-euro-sign" slot={1} index={1}
          value={kpi.pickupRicavo} format={(n) => fmtEurK(n)}
          spark={kpi.sparkPickup}
          info="Valore delle prenotazioni entrate nella finestra di osservazione."
        />
        <KpiTile
          label="ADR del pickup" icon="fa-tag" slot={3} index={2}
          value={kpi.adrPickup} format={(n) => fmtEur(n, 0)}
          spark={kpi.sparkAdr}
          info="Prezzo medio a cui sta entrando la domanda: se scende, si sta vendendo più a sconto."
        />
        <KpiTile
          label="On the book" icon="fa-book-bookmark" slot={4} index={3}
          value={kpi.otbRicavo} format={(n) => fmtEurK(n)}
          delta={kpi.paceVsLy} deltaLabel={`${fmtDelta(kpi.paceVsLy)} vs LY`}
          spark={kpi.sparkOtb}
          info="Ricavo già confermato per l'orizzonte selezionato, confrontato con lo stesso momento dell'anno precedente."
        />
        <KpiTile
          label="Occupazione a libro" icon="fa-door-open" slot={6} index={4}
          value={kpi.otbOcc} format={(n) => fmtPct(n)}
          spark={kpi.sparkOcc}
          info="Camere già vendute sull'orizzonte, sul totale delle camere disponibili nello stesso periodo."
        />
      </div>

      {/* ── Pickup per data di soggiorno ──────────────────────────────────── */}
      <ChartCard
        className="pk__main"
        index={0}
        title="Pickup per data di soggiorno"
        subtitle={`Camere entrate negli ultimi ${finestra} giorni, giorno per giorno`}
        badge={`${fmtInt(kpi.pickupCamere)} camere`}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'trend', label: 'Pickup', icon: 'fa-chart-column' },
              { id: 'dettaglio', label: 'Dettaglio', icon: 'fa-table-list' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as 'trend' | 'dettaglio')}
          />
        )}
      >
        {vista === 'trend' ? (
          <div className="pk__chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.giorni} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval="preserveStartEnd" />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={(
                    <ChartTooltip
                      names={{ pickupCamere: 'Camere acquisite' }}
                      format={(v) => `${fmtInt(v)} camere`}
                    />
                  )}
                />
                <Bar
                  dataKey="pickupCamere"
                  fill={series(0)}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                  isAnimationActive={!still}
                  animationDuration={ANIM.duration}
                  animationEasing={ANIM.easing}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="pk__detail">
            <div className="sib-table-wrap pk__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <thead>
                  <tr>
                    <th>Soggiorno</th>
                    <th className="pk__num">Camere a libro</th>
                    <th className="pk__num">Occupazione</th>
                    <th className="pk__num">Pickup camere</th>
                    <th className="pk__num">Pickup ricavo</th>
                    <th className="pk__num">Ricavo a libro</th>
                    <th className="pk__num">vs LY</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((d) => {
                    const delta = d.otbRicavoLY ? ((d.otbRicavo - d.otbRicavoLY) / d.otbRicavoLY) * 100 : 0
                    return (
                      <tr key={d.label}>
                        <td>{d.label}{d.weekend && <span className="pk__tag">weekend</span>}</td>
                        <td className="pk__num">{fmtInt(d.otbCamere)}</td>
                        <td className="pk__num">{fmtPct(d.otbOcc)}</td>
                        <td className="pk__num">{fmtInt(d.pickupCamere)}</td>
                        <td className="pk__num">{fmtEur(d.pickupRicavo, 0)}</td>
                        <td className="pk__num">{fmtEur(d.otbRicavo, 0)}</td>
                        <td className="pk__num"><DeltaBadge value={delta} size="sm" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="pk__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── On the book vs anno precedente ────────────────────────────────── */}
      <ChartCard
        className="pk__otb"
        index={1}
        title="On the book vs anno precedente"
        subtitle="Ricavo a libro per data di soggiorno"
        legend={[
          { key: 'ty', name: 'A libro TY', color: series(0) },
          { key: 'ly', name: 'A libro LY', color: CHART.ly },
        ]}
      >
        <div className="pk__chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.giorni} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
              <defs>
                <linearGradient id="pk-otb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series(0)} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval="preserveStartEnd" />
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
              <RTooltip
                cursor={cursorProps}
                content={(
                  <ChartTooltip
                    names={{ otbRicavo: 'A libro TY', otbRicavoLY: 'A libro LY' }}
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
              <Area
                type="monotone" dataKey="otbRicavoLY" stroke={CHART.ly} strokeWidth={1.5}
                fill={CHART.ly} fillOpacity={0.1} dot={false}
                isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Area
                type="monotone" dataKey="otbRicavo" stroke={series(0)} strokeWidth={2.4}
                fill="url(#pk-otb)" dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Provenienza del pickup ────────────────────────────────────────── */}
      <ChartCard
        className="pk__ch"
        index={2}
        title="Pickup per canale"
        subtitle="Da dove è arrivata la domanda nella finestra"
      >
        <div className="pk__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.canali} layout="vertical" margin={{ top: 2, right: 78, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={114} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ valore: 'Pickup' }} format={(v) => fmtEur(v, 0)} />}
              />
              <Bar
                dataKey="valore" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={18}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                <LabelList dataKey="valore" position="right" formatter={(v: any) => fmtEurK(Number(v))} className="pk__bar-label" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Date su cui intervenire (numeri, non grafico) ─────────────────── */}
      <ChartCard
        className="pk__focus"
        index={3}
        title="Date da presidiare"
        subtitle="Domanda ferma e occupazione ancora bassa"
        footer="Le date che corrono sopportano un aumento di prezzo; quelle ferme chiedono offerte o più distribuzione."
      >
        <ul className="pk__focus-list">
          {kpi.critici.map((d) => (
            <li className="pk__focus-row" key={`c-${d.label}`}>
              <span className="pk__focus-day">
                {d.label}
                {d.weekend && <span className="pk__tag">weekend</span>}
              </span>
              <span className="pk__focus-occ">{fmtPct(d.otbOcc, 0)} a libro</span>
              <span className="pk__focus-pk">+{fmtInt(d.pickupCamere)} camere</span>
            </li>
          ))}
        </ul>
      </ChartCard>
    </BiPage>
  )
}
