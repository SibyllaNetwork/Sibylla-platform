import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Pagination from '../../../core/components/Pagination'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import { buildFinance, computeBep, type FinanceData } from '../_data/financeMock'
import './BreakEvenPoint.sass'

// ─── BREAK EVEN POINT ANALYSIS ──────────────────────────────────────────────────
//  Da quante camere vendute la gestione smette di perdere.
//    camere di pareggio = costi fissi / (ricavo per camera − costo variabile per camera)
//  In pagina:
//    • fascia indicatori: camere e ricavi di pareggio, occupazione di pareggio,
//      margine di sicurezza, leva operativa
//    • curva ricavi/costi con il punto di pareggio (e vista Dettaglio per mese)
//    • cammino verso il pareggio: camere vendute cumulate contro la soglia
//    • sensibilità: come si sposta il pareggio al variare di prezzo e costi fissi
//  Il modello (costi fissi, variabili, ricavo per camera) è quello condiviso di
//  `finance/_data/financeMock`, lo stesso di Finance overview e delle simulazioni.

export default function BreakEvenPoint({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [vista, setVista] = useState<'curva' | 'dettaglio'>('curva')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const bep = useMemo(() => computeBep(data.mesi), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<FinanceData>>('finance/GetContoEconomico', {
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

  // ── Curva ricavi/costi al variare delle camere vendute ──────────────────────
  //  Asse x = camere vendute nell'anno; le due rette si incontrano nel pareggio.
  const curva = useMemo(() => {
    const max = Math.max(bep.camereVendute, bep.camereBep) * 1.15
    const passi = 24
    return Array.from({ length: passi + 1 }, (_, i) => {
      const camere = (max / passi) * i
      return {
        camere: Math.round(camere),
        ricavi: camere * bep.ricavoPerCamera,
        costi: bep.costiFissi + camere * bep.cvu,
        fissi: bep.costiFissi,
      }
    })
  }, [bep])

  // ── Cammino verso il pareggio: camere cumulate mese per mese ────────────────
  const cammino = useMemo(() => {
    let cum = 0
    return data.mesi.map((m) => {
      cum += m.camereVendute
      return { label: m.label, cumulate: cum, soglia: bep.camereBep, consuntivo: m.consuntivo }
    })
  }, [data, bep])

  // ── Sensibilità: pareggio al variare del prezzo e dei costi fissi ───────────
  const sensibilita = useMemo(() => {
    const variazioni = [-10, -5, 0, 5, 10]
    return variazioni.map((v) => {
      const ricavoPerCamera = bep.ricavoPerCamera * (1 + v / 100)
      const mcuPrezzo = ricavoPerCamera - bep.cvu
      const cfVariati = bep.costiFissi * (1 + v / 100)
      return {
        label: `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`,
        perPrezzo: mcuPrezzo > 0 ? bep.costiFissi / mcuPrezzo : 0,
        perCostiFissi: bep.mcu > 0 ? cfVariati / bep.mcu : 0,
      }
    })
  }, [bep])

  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 30, headerHeight: 32, min: 4, max: 14,
  })
  const totPagine = Math.max(1, Math.ceil(data.mesi.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = data.mesi.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  return (
    <BiPage
      title="Break even point analysis"
      subtitle={`Soglia di pareggio ${data.anno}: quante camere servono per coprire i costi`}
      glossary={['occupazione', 'ADR', 'RevPAR', 'GOP', 'TY', 'LY', 'delta']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="be__grid"
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
            className="be__filter be__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="be__filter"
          />
          <span className="be__note">
            <i className="fa-solid fa-calculator" aria-hidden="true" />
            Ricavo per camera {fmtEur(bep.ricavoPerCamera, 0)} − costo variabile {fmtEur(bep.cvu, 0)} ={' '}
            margine di contribuzione {fmtEur(bep.mcu, 0)}
          </span>
        </>
      )}
    >
      {/* ── Indicatori del pareggio ───────────────────────────────────────── */}
      <div className="be__kpis">
        <KpiTile
          label="Camere di pareggio" icon="fa-scale-balanced" slot={0} index={0}
          value={bep.camereBep} format={(n) => fmtInt(Math.round(n))}
          info="Camere da vendere nell'anno perché il margine di contribuzione copra i costi fissi."
        />
        <KpiTile
          label="Ricavi di pareggio" icon="fa-euro-sign" slot={1} index={1}
          value={bep.ricaviBep} format={(n) => fmtEurK(n)}
          info="Ricavo totale corrispondente alle camere di pareggio."
        />
        <KpiTile
          label="Occupazione minima" icon="fa-door-open" slot={4} index={2}
          value={bep.occBep} format={(n) => fmtPct(n)}
          info="Occupazione media annua necessaria per non perdere: sotto questa soglia la gestione è in perdita."
        />
        <KpiTile
          label="Margine di sicurezza" icon="fa-shield-halved" slot={3} index={3}
          value={bep.margineSicurezza} format={(n) => fmtPct(n)}
          info="Di quanto possono scendere le vendite prima di tornare in perdita."
        />
        <KpiTile
          label="Leva operativa" icon="fa-arrow-trend-up" slot={6} index={4}
          value={bep.levaOperativa} format={(n) => `${n.toFixed(1)}×`}
          info="Di quanto varia il margine operativo per ogni punto di ricavo in più: più è alta, più la gestione è rigida."
        />
      </div>

      {/* ── Curva ricavi / costi ──────────────────────────────────────────── */}
      <ChartCard
        className="be__main"
        index={0}
        title="Curva di pareggio"
        subtitle="Ricavi e costi al variare delle camere vendute nell'anno"
        badge={`${fmtInt(Math.round(bep.camereBep))} camere`}
        legend={[
          { key: 'ric', name: 'Ricavi', color: series(0) },
          { key: 'cos', name: 'Costi totali', color: series(5) },
          { key: 'cf', name: 'Costi fissi', color: CHART.ly, dashed: true },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'curva', label: 'Curva', icon: 'fa-chart-line' },
              { id: 'dettaglio', label: 'Dettaglio', icon: 'fa-table-list' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as 'curva' | 'dettaglio')}
          />
        )}
        footer={(
          <span className="be__foot">
            Sopra il pareggio la gestione produce margine: alla fine dell'anno le camere
            vendute sono <strong>{fmtInt(bep.camereVendute)}</strong>, cioè{' '}
            <strong>{fmtInt(Math.max(0, Math.round(bep.camereVendute - bep.camereBep)))}</strong> oltre la soglia.
          </span>
        )}
      >
        {vista === 'curva' ? (
          <div className="be__chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={curva} margin={{ top: 8, right: 10, left: -4, bottom: 0 }}>
                <defs>
                  <linearGradient id="be-ric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series(0)} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="camere" {...xAxisProps} type="number"
                  domain={['dataMin', 'dataMax']} tickFormatter={fmtAxisNum}
                />
                {/* Un solo asse dei valori: ricavi e costi sono entrambi in € */}
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ ricavi: 'Ricavi', costi: 'Costi totali', fissi: 'Costi fissi' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                {/* Soglia di pareggio: dove le due rette si incontrano */}
                <ReferenceLine
                  x={Math.round(bep.camereBep)}
                  stroke={CHART.forecast}
                  strokeDasharray="4 3"
                  label={{
                    value: `pareggio ${fmtInt(Math.round(bep.camereBep))} camere`,
                    position: 'insideTopRight',
                    fill: CHART.inkMuted,
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone" dataKey="ricavi" stroke={series(0)} strokeWidth={2.4}
                  fill="url(#be-ric)" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="costi" stroke={series(5)} strokeWidth={2.4} dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="fissi" stroke={CHART.ly} strokeWidth={1.5}
                  strokeDasharray="5 3" dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="be__detail">
            <div className="sib-table-wrap be__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <thead>
                  <tr>
                    <th>Mese</th>
                    <th className="be__num">Camere vendute</th>
                    <th className="be__num">Costi fissi</th>
                    <th className="be__num">Costo var. unitario</th>
                    <th className="be__num">Ricavo per camera</th>
                    <th className="be__num">Contribuzione</th>
                    <th className="be__num">GOP</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((m) => (
                    <tr key={m.mese}>
                      <td>
                        {m.label}
                        {!m.consuntivo && <span className="be__tag">previsione</span>}
                      </td>
                      <td className="be__num">{fmtInt(m.camereVendute)}</td>
                      <td className="be__num">{fmtEur(m.costiFissi, 0)}</td>
                      <td className="be__num">{fmtEur(m.cvu, 0)}</td>
                      <td className="be__num">{fmtEur(m.camereVendute ? m.ricaviTotali / m.camereVendute : 0, 0)}</td>
                      <td className="be__num">{fmtEur(m.contribuzione, 0)}</td>
                      <td className="be__num">
                        <DeltaBadge value={m.gopPct} label={fmtEur(m.gop, 0)} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="be__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Cammino verso il pareggio ─────────────────────────────────────── */}
      <ChartCard
        className="be__path"
        index={1}
        title="Cammino verso il pareggio"
        subtitle="Camere vendute cumulate contro la soglia"
        legend={[
          { key: 'cum', name: 'Camere cumulate', color: series(0) },
          { key: 'sog', name: 'Soglia di pareggio', color: CHART.forecast, dashed: true },
        ]}
        footer={
          bep.meseRaggiungimento
            ? `Pareggio raggiunto a ${data.mesi[bep.meseRaggiungimento - 1]?.label}.`
            : 'Con questi volumi il pareggio non viene raggiunto nell\'anno.'
        }
      >
        <div className="be__chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={cammino} margin={{ top: 8, right: 10, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="be-cum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series(0)} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
              <RTooltip
                cursor={cursorProps}
                content={(
                  <ChartTooltip
                    names={{ cumulate: 'Camere cumulate', soglia: 'Soglia di pareggio' }}
                    format={(v) => `${fmtInt(Math.round(v))} camere`}
                  />
                )}
              />
              <Area
                type="monotone" dataKey="cumulate" stroke={series(0)} strokeWidth={2.4}
                fill="url(#be-cum)" dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Line
                type="monotone" dataKey="soglia" stroke={CHART.forecast} strokeWidth={2}
                strokeDasharray="5 3" dot={false}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Sensibilità del pareggio ──────────────────────────────────────── */}
      <ChartCard
        className="be__sens"
        index={2}
        title="Sensibilità del pareggio"
        subtitle="Camere di pareggio se cambiano prezzo o costi fissi"
      >
        <div className="sib-table-wrap be__sens-table">
          <table className="sib-table">
            {/* Larghezze in percentuale: la tabella non può spingere la card */}
            <colgroup>
              <col className="be__col-var" />
              <col className="be__col-num" />
              <col className="be__col-num" />
            </colgroup>
            <thead>
              <tr>
                <th>Variazione</th>
                <th className="be__num">Prezzo</th>
                <th className="be__num">Costi fissi</th>
              </tr>
            </thead>
            <tbody>
              {sensibilita.map((s) => (
                <tr key={s.label} className={s.label === '0%' ? 'be__row--base' : undefined}>
                  <td>{s.label === '0%' ? 'Oggi' : s.label}</td>
                  <td className="be__num">{fmtInt(Math.round(s.perPrezzo))}</td>
                  <td className="be__num">{fmtInt(Math.round(s.perCostiFissi))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* ── Composizione del pareggio (numeri) ────────────────────────────── */}
      <ChartCard
        className="be__comp"
        index={3}
        title="Composizione del pareggio"
        subtitle="I numeri da cui nasce la soglia"
      >
        <ul className="be__figures">
          <li className="be__figure">
            <span className="be__figure-lbl">Costi fissi dell'anno</span>
            <span className="be__figure-val">{fmtEurK(bep.costiFissi)}</span>
          </li>
          <li className="be__figure">
            <span className="be__figure-lbl">Ricavo per camera venduta</span>
            <span className="be__figure-val">{fmtEur(bep.ricavoPerCamera, 0)}</span>
          </li>
          <li className="be__figure">
            <span className="be__figure-lbl">Costo variabile per camera</span>
            <span className="be__figure-val">{fmtEur(bep.cvu, 0)}</span>
          </li>
          <li className="be__figure">
            <span className="be__figure-lbl">Margine di contribuzione</span>
            <span className="be__figure-val">{fmtEur(bep.mcu, 0)}</span>
          </li>
          <li className="be__figure">
            <span className="be__figure-lbl">Camere vendute nell'anno</span>
            <span className="be__figure-val">{fmtInt(bep.camereVendute)}</span>
          </li>
        </ul>
      </ChartCard>
    </BiPage>
  )
}
