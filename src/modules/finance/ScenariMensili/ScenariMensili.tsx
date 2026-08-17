import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Pagination from '../../../core/components/Pagination'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtDelta, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import {
  applyScenario, buildFinance, computeBep, SCENARI, type FinanceData,
} from '../_data/financeMock'
import './ScenariMensili.sass'

// ─── ANALISI SCENARI MENSILI ────────────────────────────────────────────────────
//  Tre scenari a confronto mese per mese: pessimistico, base, ottimistico.
//  Le ipotesi non sono nascoste in una formula: sono le stesse quattro leve del
//  simulatore (prezzo, camere occupate, costi fissi, costi variabili) e la pagina
//  le mostra, così si discute sulle assunzioni e non sui numeri finali.
//  In pagina:
//    • fascia indicatori: margine nei tre scenari, ampiezza fra estremi, mesi in
//      perdita nello scenario peggiore
//    • margine per mese nei tre scenari (+ vista Dettaglio)
//    • banda di oscillazione dei ricavi fra scenario peggiore e migliore
//    • le ipotesi di ciascuno scenario, in chiaro

export default function ScenariMensili({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [vista, setVista] = useState<'margine' | 'dettaglio'>('margine')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const bep = useMemo(() => computeBep(data.mesi), [data])

  const esiti = useMemo(
    () => SCENARI.map((s) => ({ ...s, esito: applyScenario(data, s.leve) })),
    [data],
  )
  const [pess, base, ott] = esiti

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

  // Serie mensile dei tre scenari. `ampiezza` è la distanza fra ricavi peggiori e
  // migliori: sommata sopra la base disegna la banda di oscillazione.
  const serie = useMemo(
    () => base.esito.perMese.map((m, i) => {
      const p = pess.esito.perMese[i]
      const o = ott.esito.perMese[i]
      return {
        label: m.label,
        gopPess: p?.gop ?? 0,
        gopBase: m.gop,
        gopOtt: o?.gop ?? 0,
        ricaviPess: p?.ricavi ?? 0,
        ricaviBase: m.ricavi,
        ricaviOtt: o?.ricavi ?? 0,
        ampiezza: (o?.ricavi ?? 0) - (p?.ricavi ?? 0),
      }
    }),
    [base, pess, ott],
  )

  const ampiezzaAnno = ott.esito.gop - pess.esito.gop
  const mesiInPerditaPess = pess.esito.perMese.filter((m) => m.gop < 0).length

  const { rows: righePerPagina, ref: tabellaRef } = useFitRows({
    rowHeight: 30, headerHeight: 32, min: 4, max: 14,
  })
  const totPagine = Math.max(1, Math.ceil(serie.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = serie.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  return (
    <BiPage
      title="Analisi scenari mensili"
      subtitle={`Pessimistico, base e ottimistico a confronto mese per mese · ${data.anno}`}
      glossary={['GOP', 'GOPPAR', 'ADR', 'occupazione', 'TY', 'LY', 'delta']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="sc__grid"
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
            className="sc__filter sc__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="sc__filter"
          />
          <span className="sc__note">
            <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
            Pareggio a {fmtPct(bep.occBep, 0)} di occupazione · nello scenario peggiore
            l'occupazione scende a {fmtPct(pess.esito.occ, 0)}
          </span>
        </>
      )}
    >
      {/* ── Indicatori dei tre scenari ────────────────────────────────────── */}
      <div className="sc__kpis">
        <KpiTile
          label="Margine pessimistico" icon="fa-cloud-rain" slot={5} index={0}
          value={pess.esito.gop} format={(n) => fmtEurK(n)}
          delta={base.esito.gop ? ((pess.esito.gop - base.esito.gop) / base.esito.gop) * 100 : 0}
          spark={pess.esito.perMese.map((m) => m.gop)}
          info="Margine operativo dell'anno se la domanda cala: meno occupazione e prezzo più debole."
        />
        <KpiTile
          label="Margine base" icon="fa-chart-pie" slot={0} index={1}
          value={base.esito.gop} format={(n) => fmtEurK(n)}
          spark={base.esito.perMese.map((m) => m.gop)}
          info="Margine operativo dello scenario di budget corrente, senza variazioni."
        />
        <KpiTile
          label="Margine ottimistico" icon="fa-sun" slot={4} index={2}
          value={ott.esito.gop} format={(n) => fmtEurK(n)}
          delta={base.esito.gop ? ((ott.esito.gop - base.esito.gop) / base.esito.gop) * 100 : 0}
          spark={ott.esito.perMese.map((m) => m.gop)}
          info="Margine operativo se la domanda tiene: più occupazione e prezzo in crescita."
        />
        <KpiTile
          label="Ampiezza fra estremi" icon="fa-arrows-left-right" slot={3} index={3}
          value={ampiezzaAnno} format={(n) => fmtEurK(n)}
          info="Distanza fra scenario migliore e peggiore: è la misura dell'incertezza sull'anno."
        />
        <KpiTile
          label="Mesi in perdita" icon="fa-triangle-exclamation" slot={6} index={4}
          value={mesiInPerditaPess} format={(n) => fmtInt(Math.round(n))}
          info="Mesi con margine negativo nello scenario pessimistico: sono quelli da coprire per primi."
        />
      </div>

      {/* ── Margine nei tre scenari ───────────────────────────────────────── */}
      <ChartCard
        className="sc__main"
        index={0}
        title={`Margine per mese nei tre scenari · ${data.anno}`}
        subtitle="Sotto la linea dello zero il mese è in perdita"
        badge={fmtEurK(base.esito.gop)}
        legend={[
          { key: 'p', name: 'Pessimistico', color: series(5) },
          { key: 'b', name: 'Base', color: series(0) },
          { key: 'o', name: 'Ottimistico', color: series(4) },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'margine', label: 'Margine' },
              { id: 'dettaglio', label: 'Dettaglio' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as 'margine' | 'dettaglio')}
          />
        )}
        footer={(
          <span className="sc__foot">
            Nell'anno il margine oscilla fra <strong>{fmtEurK(pess.esito.gop)}</strong> e{' '}
            <strong>{fmtEurK(ott.esito.gop)}</strong>: un'ampiezza di{' '}
            <strong>{fmtEurK(ampiezzaAnno)}</strong> sul risultato.
          </span>
        )}
      >
        {vista === 'margine' ? (
          <div className="sc__chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serie} margin={{ top: 6, right: 8, left: -4, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                {/* Un solo asse: i tre scenari sono la stessa misura in € */}
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ gopPess: 'Pessimistico', gopBase: 'Base', gopOtt: 'Ottimistico' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                {/* Lo zero è la soglia che conta: sopra si guadagna, sotto si perde */}
                <ReferenceLine y={0} stroke={CHART.axis} />
                <Line
                  type="monotone" dataKey="gopOtt" stroke={series(4)} strokeWidth={2} dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="gopPess" stroke={series(5)} strokeWidth={2} dot={false}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="gopBase" stroke={series(0)} strokeWidth={2.6}
                  dot={{ r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="sc__detail">
            <div className="sib-table-wrap sc__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <thead>
                  <tr>
                    <th>Mese</th>
                    <th className="sc__num">Ricavi base</th>
                    <th className="sc__num">Margine pess.</th>
                    <th className="sc__num">Margine base</th>
                    <th className="sc__num">Margine ott.</th>
                    <th className="sc__num">Ampiezza</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((m) => (
                    <tr key={m.label}>
                      <td>{m.label}</td>
                      <td className="sc__num">{fmtEur(m.ricaviBase, 0)}</td>
                      <td className="sc__num">{fmtEur(m.gopPess, 0)}</td>
                      <td className="sc__num">{fmtEur(m.gopBase, 0)}</td>
                      <td className="sc__num">{fmtEur(m.gopOtt, 0)}</td>
                      <td className="sc__num">
                        <DeltaBadge
                          value={m.gopBase ? ((m.gopOtt - m.gopPess) / Math.abs(m.gopBase)) * 100 : 0}
                          label={fmtEur(m.gopOtt - m.gopPess, 0)}
                          size="sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sc__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Ipotesi degli scenari ─────────────────────────────────────────── */}
      <ChartCard
        className="sc__ip"
        index={1}
        title="Ipotesi degli scenari"
        subtitle="Le leve che distinguono i tre casi"
      >
        <div className="sib-table-wrap sc__ip-table">
          <table className="sib-table">
            <colgroup>
              <col className="sc__col-voce" />
              <col className="sc__col-num" />
              <col className="sc__col-num" />
              <col className="sc__col-num" />
            </colgroup>
            <thead>
              <tr>
                <th>Leva</th>
                <th className="sc__num">Pess.</th>
                <th className="sc__num">Base</th>
                <th className="sc__num">Ott.</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Prezzo (ADR)', 'adr'],
                ['Camere occupate', 'camere'],
                ['Costi fissi', 'costiFissi'],
                ['Costi variabili', 'costiVariabili'],
              ] as const).map(([label, key]) => (
                <tr key={key}>
                  <td>{label}</td>
                  {esiti.map((s) => (
                    <td className="sc__num" key={s.key}>{fmtDelta(s.leve[key])}</td>
                  ))}
                </tr>
              ))}
              <tr className="sc__row--esito">
                <td>Occupazione media</td>
                {esiti.map((s) => (
                  <td className="sc__num" key={s.key}>{fmtPct(s.esito.occ, 0)}</td>
                ))}
              </tr>
              <tr className="sc__row--esito">
                <td>Marginalità</td>
                {esiti.map((s) => (
                  <td className="sc__num" key={s.key}>{fmtPct(s.esito.gopPct, 0)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* ── Banda di oscillazione dei ricavi ──────────────────────────────── */}
      <ChartCard
        className="sc__banda"
        index={2}
        title="Banda di oscillazione dei ricavi"
        subtitle="Fra scenario peggiore e migliore, mese per mese"
        legend={[
          { key: 'banda', name: 'Fra pessimistico e ottimistico', color: series(0) },
          { key: 'base', name: 'Base', color: CHART.ink },
        ]}
        footer="Più la banda è larga, più il mese è esposto: sono i mesi in cui vale la pena avere un piano di riserva."
      >
        <div className="sc__chart">
          <ResponsiveContainer width="100%" height="100%">
            {/* La banda si ottiene impilando l'ampiezza sopra il minimo: la prima
                area è invisibile, la seconda è la fascia fra i due scenari. */}
            <ComposedChart data={serie} margin={{ top: 6, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              {/* Asse tarato sui dati: partendo da zero la fascia si schiaccerebbe */}
              <YAxis
                {...yAxisProps}
                domain={[(min: number) => Math.max(0, Math.floor((min * 0.88) / 50_000) * 50_000), 'auto']}
                tickFormatter={fmtAxisNum}
              />
              <RTooltip
                cursor={cursorProps}
                content={(
                  <ChartTooltip
                    names={{ ricaviPess: 'Pessimistico', ampiezza: 'Ampiezza', ricaviBase: 'Base' }}
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
              <Area
                type="monotone" dataKey="ricaviPess" stackId="banda"
                stroke="none" fill="transparent" isAnimationActive={false}
              />
              <Area
                type="monotone" dataKey="ampiezza" stackId="banda"
                stroke="none" fill={series(0)} fillOpacity={0.22}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Line
                type="monotone" dataKey="ricaviBase" stroke={CHART.ink} strokeWidth={2.2} dot={false}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Sintesi d'anno per scenario ───────────────────────────────────── */}
      <ChartCard
        className="sc__sint"
        index={3}
        title="Sintesi d'anno"
        subtitle="Ricavi, costi e margine per scenario"
      >
        <ul className="sc__figures">
          {esiti.map((s) => (
            <li className="sc__figure" key={s.key}>
              <span className="sc__figure-lbl">{s.label}</span>
              <span className="sc__figure-val">{fmtEurK(s.esito.gop)}</span>
              <span className="sc__figure-meta">
                ricavi {fmtEurK(s.esito.ricavi)} · marginalità {fmtPct(s.esito.gopPct, 0)}
              </span>
            </li>
          ))}
          <li className="sc__figure sc__figure--nota">
            <span className="sc__figure-lbl">Mesi in perdita (pess.)</span>
            <span className="sc__figure-val">{fmtInt(mesiInPerditaPess)}</span>
          </li>
        </ul>
      </ChartCard>
    </BiPage>
  )
}
