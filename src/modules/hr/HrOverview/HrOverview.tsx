import React, { useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Tooltip from '../../../core/components/Tooltip'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, KpiTile, barEndLabel,
  CHART, cursorProps, fmtInt, fmtPct, gridProps, reducedMotion, series, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { useStrutturaPagina, useStruttureCliente } from '../../../hooks/useStrutturaCorrente'
import type { SchedaDemo } from '../../../core/demo/struttureDemo'
import './HrOverview.sass'

// ─── HR OVERVIEW ────────────────────────────────────────────────────────────────
//  Il personale dell'impresa in una schermata, col kit BI:
//    • fascia indicatori: organico, assunzioni, cessazioni, turnover, assenteismo,
//      costo del personale
//    • andamento dell'organico mese per mese contro anno precedente
//    • composizione (contratti / genere) dietro i tab verticali
//    • organico per reparto e assenze per tipologia
//    • obiettivi di performance e stato della documentazione, con il rimando alle
//      pagine operative (Monitoraggio performance, Archivio personale)

const TUTTE = 'Tutte le strutture'
/** Organico di riferimento dei dati base qui sotto: si scala sulla selezione. */
const ORGANICO_BASE = 142

// Organico stimato dalla dimensione e dal tipo della struttura (scheda demo).
const organicoDi = (s: SchedaDemo) =>
  s.categoria === 'bnb' ? 3
    : s.categoria === 'studentato' ? Math.round(s.camere * 0.12) + 6
    : s.camere === 0 ? 14 + (s.seme % 10)
    : Math.round(s.camere * (s.stelle >= 5 ? 1.1 : s.stelle === 4 ? 0.7 : 0.45)) + 8
const ANNI = [2026, 2025, 2024]
const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

// ─── DATI BASE (organico di 142) ──────────────────────────────────────────────
const ORGANICO_TY = [120, 122, 125, 128, 130, 133, 136, 138, 139, 140, 141, 142]
const ORGANICO_LY = [112, 113, 116, 118, 119, 121, 124, 126, 127, 128, 129, 130]
const ASSUNZIONI = 18, ASSUNZIONI_LY = 14
const CESSAZIONI = 9, CESSAZIONI_LY = 11
const TURNOVER = 6.3, TURNOVER_LY = 7.1
const ASSENTEISMO = 4.1, ASSENTEISMO_LY = 3.8
const ASSENTEISMO_MESI = [4.6, 4.9, 4.2, 3.8, 3.6, 3.9, 4.4, 4.8, 4.0, 3.7, 3.9, 4.1]
const COSTO_MESI = [92, 93, 96, 99, 103, 108, 112, 114, 108, 102, 98, 101]

interface Parte { label: string; value: number }
const CONTRATTI: Parte[] = [
  { label: 'Indeterminato', value: 96 },
  { label: 'Determinato',   value: 28 },
  { label: 'Stagionale',    value: 18 },
]
const GENERE: Parte[] = [
  { label: 'Donne',  value: 78 },
  { label: 'Uomini', value: 64 },
]
const REPARTI: Parte[] = [
  { label: 'Housekeeping',    value: 34 },
  { label: 'F&B',             value: 30 },
  { label: 'Front office',    value: 28 },
  { label: 'Cucina',          value: 16 },
  { label: 'Manutenzione',    value: 14 },
  { label: 'Amministrazione', value: 10 },
  { label: 'Marketing',       value: 6 },
  { label: 'Direzione',       value: 4 },
]
const ASSENZE: Parte[] = [
  { label: 'Ferie',    value: 52 },
  { label: 'Malattia', value: 31 },
  { label: 'Permessi', value: 24 },
  { label: 'Congedi',  value: 12 },
]
const PERFORMANCE: Parte[] = [
  { label: 'Raggiunti', value: 38 },
  { label: 'In linea',  value: 64 },
  { label: 'A rischio', value: 21 },
]
const DOCUMENTAZIONE: Parte[] = [
  { label: 'Completa',   value: 118 },
  { label: 'Incompleta', value: 24 },
]

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)
const somma = (xs: Parte[]) => xs.reduce((s, x) => s + x.value, 0)

type Composizione = 'contratti' | 'genere'
type Stato = 'obiettivi' | 'documenti'

export default function HrOverview({ navigate }: { navigate?: (p: string) => void } = {}) {
  // Struttura selezionata in alto (o tutte quelle del cliente): i numeri si
  // scalano sull'organico stimato della selezione.
  const [struttura, setStruttura, , elenco] = useStrutturaPagina()
  const schede = useStruttureCliente()
  const [anno, setAnno] = useState(2026)
  const [composizione, setComposizione] = useState<Composizione>('contratti')
  const [stato, setStato] = useState<Stato>('obiettivi')
  const [dataAt, setDataAt] = useState(() => new Date())
  const go = (p: string) => navigate?.(p)
  const still = reducedMotion()

  const d = useMemo(() => {
    const selezione = struttura === TUTTE ? schede : schede.filter((x) => x.nome === struttura)
    const organico = Math.max(1, selezione.reduce((a, x) => a + organicoDi(x), 0))
    const f = organico / ORGANICO_BASE
    const sc = (n: number) => Math.max(0, Math.round(n * f))
    const scParti = (xs: Parte[]) => xs.map((x) => ({ ...x, value: sc(x.value) }))
    // Le parti di un intero tornano sempre all'organico (niente scarti di arrotondamento).
    const chiudi = (xs: Parte[]) => {
      if (xs.length) xs[xs.length - 1].value = Math.max(0, organico - xs.slice(0, -1).reduce((a, x) => a + x.value, 0))
      return xs
    }
    return {
      organico,
      assunzioni: sc(ASSUNZIONI), assunzioniLY: sc(ASSUNZIONI_LY),
      cessazioni: sc(CESSAZIONI), cessazioniLY: sc(CESSAZIONI_LY),
      // Costo annuo in €: la serie mensile è in migliaia
      costoMesi: COSTO_MESI.map((v) => v * 1000 * f),
      trend: MESI.map((m, i) => ({ mese: m, ty: sc(ORGANICO_TY[i]), ly: sc(ORGANICO_LY[i]) })),
      contratti: chiudi(scParti(CONTRATTI)),
      genere: chiudi(scParti(GENERE)),
      reparti: scParti(REPARTI),
      assenze: scParti(ASSENZE),
      performance: scParti(PERFORMANCE),
      documentazione: chiudi(scParti(DOCUMENTAZIONE)),
    }
  }, [struttura, schede])

  const costo = d.costoMesi.reduce((s, v) => s + v, 0)
  const fmtCosto = (n: number) => (n >= 1e6
    ? `${(n / 1e6).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M€`
    : `${fmtInt(n / 1000)} k€`)

  const parti = composizione === 'contratti' ? d.contratti : d.genere
  const partiStato = stato === 'obiettivi' ? d.performance : d.documentazione
  // Lo stato ha un significato: verde = a posto, rosso = da sistemare, il resto neutro
  const coloreStato = (label: string, i: number) =>
    label === 'Raggiunti' || label === 'Completa' ? CHART.good
      : label === 'A rischio' || label === 'Incompleta' ? CHART.bad
      : series(i === 1 ? 0 : i)
  const docIncompleta = d.documentazione[1]?.value ?? 0
  const aRischio = d.performance[2]?.value ?? 0
  const avanzamento = Math.round(((d.performance[0].value + d.performance[1].value * 0.6) / Math.max(1, somma(d.performance))) * 100)

  return (
    <BiPage
      title="HR Overview"
      subtitle="Panoramica completa del personale, delle performance e dei trend HR"
      glossary={['organico', 'turnover', 'assenteismo', 'incidenzaPersonale', 'TY', 'LY', 'delta']}
      dataAt={dataAt}
      onRefresh={() => setDataAt(new Date())}
      gridClassName="hr-ov__grid"
      toolbar={(
        <>
          <SelectField
            name="struttura" label="Struttura" className="hr-ov__filter hr-ov__filter--wide"
            value={struttura} onChange={(e) => setStruttura(e.target.value)}
            options={[TUTTE, ...elenco].map((s) => ({ value: s, label: s }))}
          />
          <SelectField
            name="anno" label="Anno" className="hr-ov__filter"
            value={String(anno)} onChange={(e) => setAnno(Number(e.target.value))}
            options={ANNI.map((a) => ({ value: String(a), label: String(a) }))}
          />
        </>
      )}
    >
      {/* ── Indicatori del periodo ────────────────────────────────────────── */}
      <div className="hr-ov__kpis">
        <KpiTile
          label="Organico totale" icon="fa-users" slot={0} index={0}
          value={d.organico} format={fmtInt}
          delta={pct(d.trend[11].ty, d.trend[11].ly)} spark={d.trend.map((t) => t.ty)}
          info="Dipendenti in forza a fine periodo, confrontati con lo stesso mese dell'anno precedente."
        />
        <KpiTile
          label="Nuove assunzioni" icon="fa-user-plus" slot={1} index={1}
          value={d.assunzioni} format={fmtInt}
          delta={d.assunzioni - d.assunzioniLY} deltaLabel={`${d.assunzioni - d.assunzioniLY >= 0 ? '+' : '−'}${Math.abs(d.assunzioni - d.assunzioniLY)} vs LY`}
          info="Contratti avviati nel periodo, confrontati con lo stesso periodo dell'anno precedente."
        />
        <KpiTile
          label="Cessazioni" icon="fa-user-minus" slot={2} index={2}
          value={d.cessazioni} format={fmtInt}
          delta={d.cessazioni - d.cessazioniLY} invertDelta
          deltaLabel={`${d.cessazioni - d.cessazioniLY >= 0 ? '+' : '−'}${Math.abs(d.cessazioni - d.cessazioniLY)} vs LY`}
          info="Rapporti di lavoro chiusi nel periodo (dimissioni, fine contratto, licenziamenti)."
        />
        <KpiTile
          label="Turnover" icon="fa-arrows-rotate" slot={3} index={3}
          value={TURNOVER} format={(n) => fmtPct(n)}
          delta={TURNOVER - TURNOVER_LY} invertDelta
          deltaLabel={`${TURNOVER - TURNOVER_LY >= 0 ? '+' : '−'}${Math.abs(TURNOVER - TURNOVER_LY).toLocaleString('it-IT', { maximumFractionDigits: 1 })} pt`}
          info="Cessazioni del periodo sull'organico medio."
        />
        <KpiTile
          label="Assenteismo" icon="fa-calendar-xmark" slot={4} index={4}
          value={ASSENTEISMO} format={(n) => fmtPct(n)}
          delta={ASSENTEISMO - ASSENTEISMO_LY} invertDelta spark={ASSENTEISMO_MESI}
          deltaLabel={`${ASSENTEISMO - ASSENTEISMO_LY >= 0 ? '+' : '−'}${Math.abs(ASSENTEISMO - ASSENTEISMO_LY).toLocaleString('it-IT', { maximumFractionDigits: 1 })} pt`}
          info="Ore di assenza non programmata (malattia, permessi non pianificati) sulle ore lavorabili."
        />
        <KpiTile
          label="Costo personale" icon="fa-euro-sign" slot={5} index={5}
          value={costo} format={fmtCosto} spark={d.costoMesi}
          info="Retribuzioni lorde, contributi e accantonamenti del periodo."
        />
      </div>

      {/* ── Andamento dell'organico ───────────────────────────────────────── */}
      <ChartCard
        className="hr-ov__main"
        index={0}
        title={`Andamento organico · ${anno}`}
        subtitle="Dipendenti in forza a fine mese, contro anno precedente"
        badge={fmtInt(d.organico)}
        legend={[
          { key: 'ty', name: String(anno), color: series(0) },
          { key: 'ly', name: String(anno - 1), color: CHART.ly },
        ]}
      >
        <div className="hr-ov__chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={d.trend} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="hr-ov-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series(0)} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={series(0)} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="mese" {...xAxisProps} interval={0} />
              <YAxis {...yAxisProps} tickFormatter={fmtInt} domain={['dataMin - 10', 'dataMax + 5']} allowDecimals={false} />
              <RTooltip
                cursor={cursorProps}
                content={<ChartTooltip names={{ ty: String(anno), ly: String(anno - 1) }} format={(v) => `${fmtInt(v)} dipendenti`} />}
              />
              <Line
                type="monotone" dataKey="ly" stroke={CHART.ly} strokeWidth={1.8} dot={false}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Area
                type="monotone" dataKey="ty" stroke={series(0)} strokeWidth={2.4} fill="url(#hr-ov-area)"
                isAnimationActive={!still} animationBegin={ANIM.begin(0)}
                animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Composizione: contratti / genere ──────────────────────────────── */}
      <ChartCard
        className="hr-ov__comp"
        index={1}
        title={composizione === 'contratti' ? 'Contratti' : 'Genere'}
        subtitle="Dipendenti in forza"
        legend={parti.map((p, i) => ({ key: p.label, name: `${p.label} ${fmtInt(p.value)}`, color: series(i) }))}
        rail={(
          <BiVerticalTabs
            tabs={[{ id: 'contratti', label: 'Contratti' }, { id: 'genere', label: 'Genere' }]}
            active={composizione}
            onChange={(id) => setComposizione(id as Composizione)}
          />
        )}
      >
        <div className="hr-ov__donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={parti} dataKey="value" nameKey="label"
                innerRadius="62%" outerRadius="86%" paddingAngle={2}
                stroke={CHART.surface} strokeWidth={2}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {parti.map((p, i) => <Cell key={p.label} fill={series(i)} />)}
              </Pie>
              <RTooltip content={<ChartTooltip format={(v) => `${fmtInt(v)} dipendenti`} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="hr-ov__donut-center">
            <span className="hr-ov__donut-val">{fmtInt(somma(parti))}</span>
            <span className="hr-ov__donut-lbl">dipendenti</span>
          </div>
        </div>
      </ChartCard>

      {/* ── Organico per reparto ──────────────────────────────────────────── */}
      <ChartCard
        className="hr-ov__rep"
        index={2}
        title="Organico per reparto"
        subtitle="Dipendenti in forza per reparto"
      >
        <div className="hr-ov__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.reparti} layout="vertical" margin={{ top: 2, right: 40, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={116} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip names={{ value: 'Dipendenti' }} format={(v) => fmtInt(v)} />} />
              <Bar
                dataKey="value" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={14}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                <LabelList dataKey="value" content={barEndLabel(fmtInt)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Assenze per tipologia ─────────────────────────────────────────── */}
      <ChartCard
        className="hr-ov__ass"
        index={3}
        title="Assenze per tipologia"
        subtitle="Giorni di assenza dell'anno"
        badge={`${fmtInt(somma(d.assenze))} gg`}
      >
        <div className="hr-ov__bars">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.assenze} layout="vertical" margin={{ top: 2, right: 48, left: 0, bottom: 0 }} barCategoryGap="26%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={70} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip names={{ value: 'Giorni' }} format={(v) => `${fmtInt(v)} gg`} />} />
              <Bar
                dataKey="value" fill={series(1)} radius={[0, 4, 4, 0]} maxBarSize={14}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                <LabelList dataKey="value" content={barEndLabel((v) => `${fmtInt(v)} gg`)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Obiettivi di performance / documentazione ─────────────────────── */}
      <ChartCard
        className="hr-ov__stato"
        index={4}
        title={stato === 'obiettivi' ? 'Obiettivi' : 'Documenti'}
        subtitle={stato === 'obiettivi' ? `${fmtInt(aRischio)} a rischio` : `${fmtInt(docIncompleta)} incompleti`}
        legend={partiStato.map((p, i) => ({ key: p.label, name: `${p.label} ${fmtInt(p.value)}`, color: coloreStato(p.label, i) }))}
        rail={(
          <BiVerticalTabs
            tabs={[{ id: 'obiettivi', label: 'Obiettivi' }, { id: 'documenti', label: 'Documenti' }]}
            active={stato}
            onChange={(id) => setStato(id as Stato)}
          />
        )}
        actions={(
          <Tooltip text={stato === 'obiettivi' ? 'Monitoraggio performance' : 'Archivio personale'}>
            <button
              type="button"
              className="sib-btn sib-btn--icon hr-ov__link"
              onClick={() => go(stato === 'obiettivi' ? 'monitoraggio-perf' : 'archivio-personale')}
              aria-label={stato === 'obiettivi' ? 'Monitoraggio performance' : 'Archivio personale'}
            >
              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      >
        <div className="hr-ov__donut">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={partiStato} dataKey="value" nameKey="label"
                innerRadius="62%" outerRadius="86%" paddingAngle={2}
                stroke={CHART.surface} strokeWidth={2}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              >
                {partiStato.map((p, i) => <Cell key={p.label} fill={coloreStato(p.label, i)} />)}
              </Pie>
              <RTooltip content={<ChartTooltip format={(v) => fmtInt(v)} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="hr-ov__donut-center">
            <span className="hr-ov__donut-val">
              {stato === 'obiettivi'
                ? `${avanzamento}%`
                : fmtPct((d.documentazione[0].value / Math.max(1, d.organico)) * 100, 0)}
            </span>
            <span className="hr-ov__donut-lbl">{stato === 'obiettivi' ? 'avanz. medio' : 'completa'}</span>
          </div>
        </div>
      </ChartCard>
    </BiPage>
  )
}
