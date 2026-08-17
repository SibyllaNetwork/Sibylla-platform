import React, { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Pagination from '../../../core/components/Pagination'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile,
  CHART, cursorProps, fmtAxisNum, fmtEur, fmtEurK, fmtInt, gridProps,
  reducedMotion, series, useFitRows, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { apiFetchSibylla } from '../../../services/api'
import { buildFinance, computeCassa, type FinanceData } from '../_data/financeMock'
import './Cashflow.sass'

// ─── CASH FLOW ──────────────────────────────────────────────────────────────────
//  Entrate e uscite di cassa, che non coincidono con ricavi e costi: il denaro
//  entra dopo (giorni medi di incasso) ed esce dopo (giorni medi di pagamento).
//  In pagina:
//    • fascia indicatori: saldo a fine periodo, incassi, pagamenti, flusso netto,
//      giorni medi di incasso
//    • flussi mensili con il saldo cumulato (+ vista Dettaglio)
//    • ponte da ricavi a cassa: perché il saldo non coincide con il margine
//    • attese nelle prossime fasce di 30 giorni e capitale circolante
//  Modello condiviso in `finance/_data/financeMock`.

export default function Cashflow({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [strutturaId, setStrutturaId] = useState<number | null>(null)
  const [anno, setAnno] = useState(2026)
  const [vista, setVista] = useState<'flussi' | 'dettaglio'>('flussi')
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(false)
  const [remoto, setRemoto] = useState<Partial<FinanceData> | null>(null)

  const mock = useMemo(() => buildFinance(anno, strutturaId), [anno, strutturaId])
  const data: FinanceData = useMemo(() => ({ ...mock, ...(remoto ?? {}) }), [mock, remoto])
  const cassa = useMemo(() => computeCassa(data), [data])

  useEffect(() => {
    let annullato = false
    setLoading(true)
    apiFetchSibylla<Partial<FinanceData>>('finance/GetFlussiCassa', {
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
    rowHeight: 30, headerHeight: 32, min: 4, max: 14,
  })
  const totPagine = Math.max(1, Math.ceil(data.mesi.length / righePerPagina))
  const paginaCorrente = Math.min(pagina, totPagine)
  const righe = data.mesi.slice((paginaCorrente - 1) * righePerPagina, paginaCorrente * righePerPagina)

  return (
    <BiPage
      title="Cash flow"
      subtitle={`Entrate e uscite di cassa ${data.anno}: saldo, da ricavi a cassa e attese a breve`}
      glossary={['GOP', 'TY', 'LY', 'delta']}
      dataAt={data.aggiornatoAl}
      loading={loading}
      onRefresh={() => setRemoto(null)}
      gridClassName="cf__grid"
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
            className="cf__filter cf__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={[2024, 2025, 2026].map((a) => ({ value: a, label: String(a) }))}
            className="cf__filter"
          />
          <span className="cf__note">
            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
            Incasso medio {fmtInt(cassa.dso)} gg · pagamento medio {fmtInt(cassa.dpo)} gg ·
            ciclo di cassa {fmtInt(cassa.cicloCassa)} gg
          </span>
        </>
      )}
    >
      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="cf__kpis">
        <KpiTile
          label="Saldo a fine anno" icon="fa-wallet" slot={0} index={0}
          value={cassa.saldoFinale} format={(n) => fmtEurK(n)}
          spark={cassa.sparkSaldo}
          info="Somma dei flussi di cassa dei dodici mesi: quanto denaro resta a fine periodo."
        />
        <KpiTile
          label="Incassi" icon="fa-arrow-down-to-arc" slot={4} index={1}
          value={cassa.incassi} format={(n) => fmtEurK(n)}
          spark={cassa.sparkIncassi}
          info="Denaro effettivamente entrato: i ricavi si incassano dopo i giorni medi di incasso."
        />
        <KpiTile
          label="Pagamenti" icon="fa-arrow-up-from-arc" slot={5} index={2}
          value={cassa.pagamenti} format={(n) => fmtEurK(n)}
          spark={cassa.sparkPagamenti}
          info="Denaro effettivamente uscito: i costi si pagano dopo i giorni medi di pagamento."
        />
        <KpiTile
          label="Flusso netto" icon="fa-money-bill-transfer" slot={1} index={3}
          value={cassa.flusso} format={(n) => fmtEurK(n)}
          info={`Incassi meno pagamenti nel periodo. Mesi con flusso negativo, da coprire: ${fmtInt(cassa.mesiNegativi)}.`}
        />
        <KpiTile
          label="Capitale circolante" icon="fa-scale-unbalanced" slot={3} index={4}
          value={cassa.crediti - cassa.debiti} format={(n) => fmtEurK(n)}
          info="Crediti verso clienti meno debiti verso fornitori: quanto denaro è immobilizzato nel ciclo."
        />
      </div>

      {/* ── Flussi mensili ───────────────────────────────────────────────── */}
      <ChartCard
        className="cf__main"
        index={0}
        title={`Incassi, pagamenti e saldo · ${data.anno}`}
        subtitle="Mese per mese, con il saldo cumulato"
        badge={fmtEurK(cassa.saldoFinale)}
        legend={[
          { key: 'in', name: 'Incassi', color: series(4) },
          { key: 'out', name: 'Pagamenti', color: series(5) },
          { key: 'saldo', name: 'Saldo cumulato', color: series(0) },
        ]}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'flussi', label: 'Flussi', icon: 'fa-chart-column' },
              { id: 'dettaglio', label: 'Dettaglio', icon: 'fa-table-list' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as 'flussi' | 'dettaglio')}
          />
        )}
      >
        {vista === 'flussi' ? (
          <div className="cf__chart">
            <ResponsiveContainer width="100%" height="100%">
              {/* Un solo asse dei valori: incassi, pagamenti e saldo sono in € */}
              <ComposedChart data={data.mesi} margin={{ top: 6, right: 8, left: -4, bottom: 0 }} barGap={2}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
                <RTooltip
                  cursor={cursorProps}
                  content={(
                    <ChartTooltip
                      names={{ incassi: 'Incassi', pagamenti: 'Pagamenti', saldoCumulato: 'Saldo cumulato' }}
                      format={(v) => fmtEur(v, 0)}
                    />
                  )}
                />
                <Bar
                  dataKey="incassi" fill={series(4)} radius={[4, 4, 0, 0]} maxBarSize={18}
                  isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Bar
                  dataKey="pagamenti" fill={series(5)} radius={[4, 4, 0, 0]} maxBarSize={18}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Line
                  type="monotone" dataKey="saldoCumulato" stroke={series(0)} strokeWidth={2.4}
                  dot={{ r: 2.5, strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="cf__detail">
            <div className="sib-table-wrap cf__detail-table" ref={tabellaRef}>
              <table className="sib-table">
                <thead>
                  <tr>
                    <th>Mese</th>
                    <th className="cf__num">Ricavi</th>
                    <th className="cf__num">Incassi</th>
                    <th className="cf__num">Costi</th>
                    <th className="cf__num">Pagamenti</th>
                    <th className="cf__num">Flusso</th>
                    <th className="cf__num">Saldo cumulato</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map((m) => (
                    <tr key={m.mese}>
                      <td>
                        {m.label}
                        {!m.consuntivo && <span className="cf__tag">previsione</span>}
                      </td>
                      <td className="cf__num">{fmtEur(m.ricaviTotali, 0)}</td>
                      <td className="cf__num">{fmtEur(m.incassi, 0)}</td>
                      <td className="cf__num">{fmtEur(m.costiTotali, 0)}</td>
                      <td className="cf__num">{fmtEur(m.pagamenti, 0)}</td>
                      <td className="cf__num">
                        <DeltaBadge value={m.cassa} label={fmtEur(m.cassa, 0)} size="sm" />
                      </td>
                      <td className="cf__num">{fmtEur(m.saldoCumulato, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cf__pager">
              <Pagination page={paginaCorrente} totalPages={totPagine} onPageChange={setPagina} />
            </div>
          </div>
        )}
      </ChartCard>

      {/* ── Attese a breve ───────────────────────────────────────────────── */}
      <ChartCard
        className="cf__att"
        index={1}
        title="Attese a 90 giorni"
        subtitle="Incassi e pagamenti previsti"
        legend={[
          { key: 'in', name: 'Incassi', color: series(4) },
          { key: 'out', name: 'Pagamenti', color: series(5) },
        ]}
        footer={(
          <span>
            Saldo atteso sul trimestre:{' '}
            <strong>{fmtEurK(cassa.attese.reduce((s, a) => s + a.incassi - a.pagamenti, 0))}</strong>
          </span>
        )}
      >
        <div className="cf__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cassa.attese} margin={{ top: 10, right: 8, left: -8, bottom: 0 }} barCategoryGap="26%" barGap={2}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={(
                  <ChartTooltip
                    names={{ incassi: 'Incassi', pagamenti: 'Pagamenti' }}
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
              <Bar
                dataKey="incassi" fill={series(4)} radius={[4, 4, 0, 0]} maxBarSize={30}
                isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Bar
                dataKey="pagamenti" fill={series(5)} radius={[4, 4, 0, 0]} maxBarSize={30}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Ponte di cassa ───────────────────────────────────────────────── */}
      <ChartCard
        className="cf__bridge"
        index={2}
        title="Da ricavi a cassa"
        subtitle="Perché il saldo non coincide con il margine"
        footer="I ricavi diventano cassa solo quando vengono incassati: il ponte toglie i crediti ancora aperti e i costi, e riaggiunge i debiti non ancora pagati."
      >
        <div className="cf__chart">
          <ResponsiveContainer width="100%" height="100%">
            {/* Ponte: una barra invisibile porta all'altezza di partenza, la barra
                visibile mostra la variazione del mese. */}
            <BarChart data={cassa.ponte} margin={{ top: 8, right: 8, left: -4, bottom: 0 }} barCategoryGap="18%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={0} />
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={(
                  <ChartTooltip
                    names={{ delta: 'Variazione di cassa' }}
                    format={(v) => fmtEur(v, 0)}
                  />
                )}
              />
              <Bar dataKey="base" stackId="ponte" fill="transparent" isAnimationActive={false} />
              <Bar
                dataKey="delta" stackId="ponte" radius={[3, 3, 0, 0]} maxBarSize={26}
                isAnimationActive={!still}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {cassa.ponte.map((p) => {
                  // In sottrazione (crediti da incassare, costi) la barra è di stato
                  // negativo; in aggiunta positivo; il saldo finale è la serie 1.
                  const sottrae = p.label === 'Crediti non incassati' || p.label === 'Costi'
                  return (
                    <Cell key={p.label} fill={p.totale ? series(0) : sottrae ? CHART.bad : CHART.good} />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Capitale circolante (numeri) ─────────────────────────────────── */}
      <ChartCard
        className="cf__wc"
        index={3}
        title="Capitale circolante"
        subtitle="Denaro immobilizzato nel ciclo"
      >
        <ul className="cf__figures">
          <li className="cf__figure">
            <span className="cf__figure-lbl">Crediti verso clienti</span>
            <span className="cf__figure-val">{fmtEurK(cassa.crediti)}</span>
          </li>
          <li className="cf__figure">
            <span className="cf__figure-lbl">Debiti verso fornitori</span>
            <span className="cf__figure-val">{fmtEurK(cassa.debiti)}</span>
          </li>
          <li className="cf__figure">
            <span className="cf__figure-lbl">Giorni medi di incasso</span>
            <span className="cf__figure-val">{fmtInt(cassa.dso)} gg</span>
          </li>
          <li className="cf__figure">
            <span className="cf__figure-lbl">Giorni medi di pagamento</span>
            <span className="cf__figure-val">{fmtInt(cassa.dpo)} gg</span>
          </li>
          <li className="cf__figure">
            <span className="cf__figure-lbl">Ciclo di cassa</span>
            <span className="cf__figure-val">{fmtInt(cassa.cicloCassa)} gg</span>
          </li>
        </ul>
      </ChartCard>
    </BiPage>
  )
}
