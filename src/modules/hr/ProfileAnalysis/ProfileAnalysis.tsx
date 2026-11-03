import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart,
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import {
  ANIM, BiPage, BiVerticalTabs, ChartCard, ChartTooltip, DeltaBadge, KpiTile, barTopLabel,
  CHART, fmtAxisNum, fmtDelta, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { DIPENDENTI_HR, useHrGestioneStore } from '../../../store/useHrGestioneStore'
import { useObiettiviStore } from '../../../store/useObiettiviStore'
import {
  LIVELLI, buildProfilo, computeProfilo, fmtAnzianita, fmtDataIt, livelloBreve,
} from './profileMock'
import './ProfileAnalysis.sass'

// I tipi di recharts 3 dichiarano PolarAngleAxis come ReactNode: lo si usa tipizzato a mano
const AngleAxis = PolarAngleAxis as unknown as React.FC<Record<string, unknown>>

// ─── PROFILE ANALYSIS ───────────────────────────────────────────────────────────
//  La scheda analitica del singolo dipendente, col kit BI:
//    • colonna profilo: chi è, contratto, anzianità, costo e la lettura di Sibylla
//    • fascia indicatori: RAL, ore lavorate, assenteismo, straordinari
//    • carriera e retribuzione: RAL per anno contro la media del reparto con il
//      livello contrattuale (+ viste Presenze mese per mese e Cedolini)
//    • premio di risultato a tachimetro, con i driver che lo compongono
//    • dove va il tempo dell'anno, competenze contro il reparto, formazione
//      obbligatoria con le scadenze
//  Modello in `./profileMock`: assenze e premio leggono gli store HR condivisi.

type Vista = 'carriera' | 'presenze' | 'cedolini'

const ANNO_CORRENTE = new Date().getFullYear()
const ANNI = [ANNO_CORRENTE, ANNO_CORRENTE - 1, ANNO_CORRENTE - 2]
const ORDINE = DIPENDENTI_HR.map(d => d.id)

const NOMI_ORE: Record<string, string> = {
  ordinarie: 'Ore ordinarie', straordinari: 'Straordinari', ferie: 'Ferie',
  rol: 'ROL e permessi', malattia: 'Malattia', formazione: 'Formazione', contratto: 'Ore da contratto',
}
// Migliaia sempre raggruppate: it-IT non separa i numeri di quattro cifre (1.890, non 1890)
const migliaia = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
const eur = (n: number) => `${migliaia(n)} €`
const fmtOre = (v: number) => `${migliaia(v)} h`

export default function ProfileAnalysis({ navigate, dipendenteId: iniziale }: { navigate: (p: string) => void; dipendenteId?: number }) {
  const [dipId, setDipId] = useState<number>(iniziale && ORDINE.includes(iniziale) ? iniziale : 1)
  const [anno, setAnno] = useState(ANNO_CORRENTE)
  const [vista, setVista] = useState<Vista>('carriera')
  const [fetta, setFetta] = useState<number | null>(null)
  const [aggiornato, setAggiornato] = useState(0)

  const richieste = useHrGestioneStore(s => s.richieste)
  const obiettivi = useObiettiviStore(s => s.obiettivi)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => buildProfilo(dipId, anno, richieste, obiettivi), [dipId, anno, richieste, obiettivi, aggiornato])
  const kpi = useMemo(() => computeProfilo(data), [data])
  const a = data.anagrafica
  const still = reducedMotion()

  useEffect(() => { setFetta(null) }, [dipId, anno])

  const sposta = (dir: 1 | -1) => {
    const i = ORDINE.indexOf(dipId)
    setDipId(ORDINE[(i + dir + ORDINE.length) % ORDINE.length])
  }


  const ultimo = data.carriera[data.carriera.length - 1]
  const passaggi = data.carriera.filter(c => c.evento?.startsWith('Passaggio')).length
  const lordoTot = data.mesi.reduce((s, m) => s + m.lordo, 0)
  const nettoTot = data.mesi.reduce((s, m) => s + m.netto, 0)
  const mesiLabel = data.mesi.length === 12 ? `${data.anno}` : `gen-${data.mesi[data.mesi.length - 1]?.label.toLowerCase() ?? ''} ${data.anno}`

  return (
    <BiPage
      title="Profile analysis"
      subtitle="La scheda analitica del dipendente: carriera, retribuzione, presenze, competenze e premio"
      glossary={['RAL', 'CCNL', 'assenteismo', 'straordinari', 'premioRisultato', 'compliance']}
      dataAt={data.aggiornatoAl}
      onRefresh={() => setAggiornato(n => n + 1)}
      className="pa"
      gridClassName="pa__grid"
      toolbar={(
        <>
          <SelectField
            name="dipendente" label="Dipendente" value={dipId}
            onChange={(e) => setDipId(Number(e.target.value))}
            options={DIPENDENTI_HR.map(d => ({ value: d.id, label: `${d.nome} ${d.cognome} · ${d.reparto}` }))}
            className="pa__filter pa__filter--wide"
          />
          <SelectField
            name="anno" label="Anno" value={anno}
            onChange={(e) => setAnno(Number(e.target.value))}
            options={ANNI.map(x => ({ value: x, label: String(x) }))}
            className="pa__filter"
          />
          <span className="pa__note">
            <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
            Confronto con i {DIPENDENTI_HR.filter(d => d.reparto === a.dip.reparto).length} colleghi di {a.dip.reparto}
          </span>
        </>
      )}
    >
      {/* ── Profilo ──────────────────────────────────────────────────────── */}
      <section className="pa__prof" key={`prof-${dipId}`}>
        <div className="pa__hero" data-rep={a.dip.reparto}>
          <div className="pa__nav">
            <Tooltip text="Dipendente precedente">
              <button type="button" className="pa__nav-btn" aria-label="Dipendente precedente" onClick={() => sposta(-1)}>
                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
              </button>
            </Tooltip>
            <span className="pa__nav-pos">{ORDINE.indexOf(dipId) + 1} di {ORDINE.length}</span>
            <Tooltip text="Dipendente successivo">
              <button type="button" className="pa__nav-btn" aria-label="Dipendente successivo" onClick={() => sposta(1)}>
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
          {/* L'anello attorno all'avatar è l'anzianità: un giro = 10 anni */}
          <div
            className="pa__avatar"
            style={{ ['--anz' as any]: `${Math.min(100, (a.anzianitaMesi / 120) * 100)}%` }}
          >
            <span className="pa__avatar-in">{a.iniziali}</span>
          </div>
          <h2 className="pa__name"><TruncatedText text={a.nomeCompleto} /></h2>
          <p className="pa__role"><TruncatedText text={a.ruolo} /></p>
          <div className="pa__chips">
            <span className="pa__chip">{a.dip.reparto}</span>
            <span className="pa__chip pa__chip--lv">{LIVELLI[a.livello - 1]}</span>
          </div>
        </div>

        <dl className="pa__facts">
          <div className="pa__fact">
            <dt><i className="fa-solid fa-file-signature" aria-hidden="true" />Contratto</dt>
            <dd><TruncatedText text={a.tipologia} /></dd>
          </div>
          <div className="pa__fact">
            <dt><i className="fa-solid fa-clock" aria-hidden="true" />Orario</dt>
            <dd>{a.orarioPct >= 1 ? 'Tempo pieno · 40 h' : `Part-time ${fmtPct(a.orarioPct * 100, 0)} · ${fmtInt(Math.round(40 * a.orarioPct))} h`}</dd>
          </div>
          <div className="pa__fact">
            <dt><i className="fa-solid fa-calendar-check" aria-hidden="true" />In azienda</dt>
            <dd><Tooltip text={`Assunzione del ${fmtDataIt(a.assunzione)}`}><span>{fmtAnzianita(a.anzianitaMesi)}</span></Tooltip></dd>
          </div>
          <div className="pa__fact">
            <dt><i className="fa-solid fa-cake-candles" aria-hidden="true" />Età</dt>
            <dd>{a.eta} anni</dd>
          </div>
          <div className="pa__fact">
            <dt><i className="fa-solid fa-building-columns" aria-hidden="true" />Costo azienda</dt>
            <dd><Tooltip text="RAL più contributi, TFR e oneri a carico dell'azienda (circa +36%)"><span>{fmtEurK(kpi.costoAzienda)}</span></Tooltip></dd>
          </div>
          <div className="pa__fact">
            <dt><i className="fa-solid fa-users" aria-hidden="true" />Vs reparto</dt>
            <dd><DeltaBadge value={kpi.vsReparto} label={`${fmtDelta(kpi.vsReparto)} RAL`} size="sm" /></dd>
          </div>
        </dl>

        <div className="pa__insight">
          <span className="pa__insight-tit"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />La lettura di Sibylla</span>
          <ul className="pa__insight-list">
            {kpi.insight.map((x, i) => (
              <li key={i} className={`pa__ins pa__ins--${x.tono}`} style={{ ['--i' as any]: i }}>
                <i className={`fa-solid ${x.icona}`} aria-hidden="true" />
                <span>{x.testo}</span>
              </li>
            ))}
            {!kpi.insight.length && <li className="pa__ins pa__ins--good"><i className="fa-solid fa-circle-check" aria-hidden="true" /><span>Nessun punto di attenzione</span></li>}
          </ul>
        </div>

        <div className="pa__links">
          <button type="button" className="sib-btn sib-btn--secondary pa__link" onClick={() => navigate('turni-personale')}>
            <i className="fa-solid fa-calendar-week" aria-hidden="true" /> Turni
          </button>
          <button type="button" className="sib-btn sib-btn--secondary pa__link" onClick={() => navigate('hr-richieste-ferie')}>
            <i className="fa-solid fa-umbrella-beach" aria-hidden="true" /> Ferie
          </button>
        </div>
      </section>

      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="pa__kpis" key={`kpi-${dipId}-${anno}`}>
        <KpiTile
          label="RAL" icon="fa-sack-dollar" slot={0} index={0}
          value={ultimo?.ral ?? 0} format={(n) => eur(Math.round(n / 10) * 10)}
          delta={kpi.ralDelta} deltaLabel={kpi.ralDelta !== undefined ? `${fmtDelta(kpi.ralDelta)} vs ${data.anno - 1}` : undefined}
          spark={kpi.sparkRal}
          info="Retribuzione annua lorda dell'anno selezionato, confrontata con quella dell'anno prima. La linea è l'andamento della RAL negli anni."
        />
        <KpiTile
          label="Ore lavorate" icon="fa-briefcase" slot={4} index={1}
          value={kpi.lavorate} format={fmtOre}
          delta={kpi.lavorateLy ? ((kpi.lavorate - kpi.lavorateLy) / kpi.lavorateLy) * 100 : undefined}
          deltaLabel={kpi.lavorateLy ? `${fmtDelta(((kpi.lavorate - kpi.lavorateLy) / kpi.lavorateLy) * 100)} LY` : undefined}
          spark={kpi.sparkOre}
          info={`Ore ordinarie più straordinari, ${mesiLabel}, confrontate con lo stesso periodo dell'anno prima.`}
        />
        <KpiTile
          label="Assenteismo" icon="fa-heart-pulse" slot={5} index={2}
          value={kpi.assenteismo} format={(n) => fmtPct(n)}
          delta={kpi.assenteismo - kpi.assenteismoLy} deltaLabel={`${fmtDelta(kpi.assenteismo - kpi.assenteismoLy, ' pt')} LY`} invertDelta
          spark={kpi.sparkAss}
          info="Ore di malattia diviso le ore da contratto. Ferie e ROL non contano: sono assenze programmate."
        />
        <KpiTile
          label="Straordinari" icon="fa-business-time" slot={1} index={3}
          value={kpi.straordinari} format={fmtOre}
          delta={kpi.straordinariLy ? ((kpi.straordinari - kpi.straordinariLy) / kpi.straordinariLy) * 100 : undefined}
          deltaLabel={kpi.straordinariLy ? `${fmtDelta(((kpi.straordinari - kpi.straordinariLy) / kpi.straordinariLy) * 100)} LY` : undefined}
          invertDelta spark={kpi.sparkStrao}
          info={`Ore oltre l'orario del contratto: ${fmtPct(kpi.quotaStrao)} delle ore contrattuali. In hotel si concentrano in alta stagione.`}
        />
      </div>

      {/* ── Carriera e retribuzione ──────────────────────────────────────── */}
      <ChartCard
        className="pa__main"
        index={0}
        title={vista === 'carriera' ? 'Carriera e retribuzione'
          : vista === 'presenze' ? `Presenze mese per mese · ${data.anno}`
          : `Cedolini · ${data.anno}`}
        subtitle={vista === 'carriera' ? 'RAL per anno contro la media del reparto, con il livello del CCNL'
          : vista === 'presenze' ? 'Come si compongono le ore di ogni mese rispetto al contratto'
          : 'Lordo e netto in busta: a giugno la quattordicesima, a dicembre la tredicesima'}
        badge={vista === 'carriera' ? `${fmtDelta(kpi.crescitaCarriera, '%', 0)} dall'ingresso`
          : vista === 'cedolini' ? `${fmtEurK(lordoTot)} lordi` : fmtOre(kpi.lavorate)}
        legend={vista === 'carriera' ? [
          { key: 'ral', name: 'RAL', color: series(0) },
          { key: 'media', name: 'Media reparto', color: CHART.ly },
          { key: 'livello', name: 'Livello', color: series(1) },
        ] : vista === 'presenze' ? [
          { key: 'ordinarie', name: 'Ordinarie', color: series(0) },
          { key: 'straordinari', name: 'Straordinari', color: series(1) },
          { key: 'ferie', name: 'Ferie', color: series(4) },
          { key: 'rol', name: 'ROL', color: series(3) },
          { key: 'malattia', name: 'Malattia', color: series(5) },
        ] : vista === 'cedolini' ? [
          { key: 'lordo', name: 'Lordo', color: series(0) },
          { key: 'netto', name: 'Netto', color: series(4) },
        ] : undefined}
        rail={(
          <BiVerticalTabs
            tabs={[
              { id: 'carriera', label: 'Carriera' },
              { id: 'presenze', label: 'Presenze' },
              { id: 'cedolini', label: 'Cedolini' },
            ]}
            active={vista}
            onChange={(id) => setVista(id as Vista)}
          />
        )}
        footer={vista === 'carriera'
          ? `${passaggi ? `${passaggi} ${passaggi === 1 ? 'passaggio' : 'passaggi'} di livello` : 'Nessun passaggio di livello'} negli anni mostrati · oggi ${LIVELLI[(ultimo?.livello ?? 1) - 1]} come ${ultimo?.ruolo.toLowerCase()}.`
          : vista === 'presenze'
            ? `Ore da contratto ${fmtOre(data.mesi.reduce((s, m) => s + m.contratto, 0))} · ferie godute ${fmtInt(Math.round(kpi.ferieGiorni))} giorni su ${fmtInt(Math.round(kpi.ferieMaturate))} maturati.`
            : vista === 'cedolini'
              ? `Netto in busta ${eur(nettoTot)} su ${eur(lordoTot)} lordi (${mesiLabel}): il ${fmtPct(lordoTot ? (nettoTot / lordoTot) * 100 : 0, 0)} arriva al dipendente.`
              : undefined}
      >
        {vista === 'carriera' && (
          <div className="pa__chart" key={`car-${dipId}-${anno}`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.carriera} margin={{ top: 18, right: 4, left: -4, bottom: 0 }} barCategoryGap="24%">
                <defs>
                  <linearGradient id="pa-ral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series(0)} stopOpacity={1} />
                    <stop offset="100%" stopColor={series(0)} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis yAxisId="ral" {...yAxisProps} tickFormatter={fmtAxisNum} width={44} />
                {/* Il livello ha la sua scala: 7° in basso, Quadro in alto */}
                <YAxis
                  yAxisId="liv" orientation="right" {...yAxisProps} width={28}
                  domain={[0, 8]} ticks={[2, 4, 6, 8]} tickFormatter={(v: number) => livelloBreve(v)}
                />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={(
                    <ChartTooltip
                      names={{ ral: 'RAL', mediaReparto: 'Media reparto', livello: 'Livello' }}
                      format={(v, k) => (k === 'livello' ? LIVELLI[v - 1] : eur(v))}
                    />
                  )}
                />
                <Bar
                  yAxisId="ral" dataKey="ral" fill="url(#pa-ral)" radius={[5, 5, 0, 0]} maxBarSize={46}
                  isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                >
                  <LabelList dataKey="ral" content={barTopLabel(fmtEurK)} />
                </Bar>
                <Line
                  yAxisId="ral" type="monotone" dataKey="mediaReparto" stroke={CHART.ly} strokeWidth={2}
                  strokeDasharray="5 4" dot={false} connectNulls
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)} animationDuration={ANIM.duration}
                />
                <Line
                  yAxisId="liv" type="stepAfter" dataKey="livello" stroke={series(1)} strokeWidth={2.4}
                  dot={{ r: 3, strokeWidth: 0, fill: series(1) }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationBegin={ANIM.begin(2)} animationDuration={ANIM.duration}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {vista === 'presenze' && (
          <div className="pa__chart" key={`pres-${dipId}-${anno}`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.mesi} margin={{ top: 6, right: 6, left: -10, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} width={40} />
                <RTooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip names={NOMI_ORE} format={(v) => fmtOre(v)} />} />
                {(['ordinarie', 'straordinari', 'ferie', 'rol', 'malattia'] as const).map((k, i) => (
                  <Bar
                    key={k} dataKey={k} stackId="ore" maxBarSize={30}
                    fill={series([0, 1, 4, 3, 5][i])}
                    radius={k === 'malattia' ? [4, 4, 0, 0] : undefined}
                    isAnimationActive={!still} animationBegin={ANIM.begin(i)}
                    animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                  />
                ))}
                {/* L'orario del contratto: dove le barre lo superano, sono straordinari */}
                <Line
                  type="stepAfter" dataKey="contratto" stroke={CHART.ink} strokeWidth={1.4}
                  strokeDasharray="4 4" dot={false} isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {vista === 'cedolini' && (
          <div className="pa__chart" key={`ced-${dipId}-${anno}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.mesi} margin={{ top: 6, right: 6, left: -6, bottom: 0 }} barCategoryGap="20%" barGap={2}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...xAxisProps} interval={0} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} width={44} />
                <RTooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip names={{ lordo: 'Lordo', netto: 'Netto' }} format={(v) => eur(v)} />} />
                <Bar
                  dataKey="lordo" fill={series(0)} radius={[3, 3, 0, 0]} maxBarSize={18}
                  isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
                <Bar
                  dataKey="netto" fill={series(4)} radius={[3, 3, 0, 0]} maxBarSize={18}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      {/* ── Premio di risultato ──────────────────────────────────────────── */}
      <ChartCard
        className="pa__bonus"
        index={1}
        title="Premio di risultato"
        subtitle={data.premio.fonte === 'obiettivo' ? `Obiettivo "${data.premio.nome}"` : `Stima sugli obiettivi di reparto ${data.anno}`}
        badge={fmtPct(data.premio.pct, 0)}
        actions={data.premio.fonte === 'obiettivo' ? (
          <Tooltip text="Apri il monitoraggio degli obiettivi">
            <button type="button" className="pa__icobtn" aria-label="Apri il monitoraggio degli obiettivi" onClick={() => navigate('monitoraggio-perf')}>
              <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
            </button>
          </Tooltip>
        ) : undefined}
      >
        <Tachimetro key={`tach-${dipId}-${anno}`} pct={data.premio.pct} maturato={data.premio.maturato} massimo={data.premio.massimo} />
        <ul className="pa__drivers">
          {data.premio.driver.map((d, i) => (
            <li key={d.nome} className="pa__driver">
              <TruncatedText text={`${d.nome} · ${d.peso}%`} className="pa__driver-lbl" />
              <span className="pa__bar">
                <span
                  className={clsx('pa__bar-fill', d.pct < 50 && 'pa__bar-fill--low')}
                  style={{ ['--w' as any]: `${Math.min(100, d.pct)}%`, ['--i' as any]: i }}
                />
              </span>
              <span className="pa__driver-pct">{fmtPct(d.pct, 0)}</span>
            </li>
          ))}
        </ul>
      </ChartCard>

      {/* ── Dove va il tempo ─────────────────────────────────────────────── */}
      <ChartCard
        className="pa__tempo"
        index={2}
        title="Dove va il tempo"
        subtitle={`Ore dell'anno per voce · ${mesiLabel}`}
      >
        <div className="pa__tempo-body">
          <div className="pa__donut" key={`don-${dipId}-${anno}`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={kpi.tempo} dataKey="ore" nameKey="label"
                  innerRadius="62%" outerRadius="92%" paddingAngle={2} cornerRadius={3}
                  stroke={CHART.surface} strokeWidth={2}
                  startAngle={90} endAngle={-270}
                  onMouseEnter={(_, i) => setFetta(i)} onMouseLeave={() => setFetta(null)}
                  isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                >
                  {kpi.tempo.map((t, i) => (
                    <Cell key={t.key} fill={series(i)} fillOpacity={fetta === null || fetta === i ? 1 : 0.25} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pa__donut-center" aria-live="polite">
              {fetta === null ? (
                <>
                  <span className="pa__donut-val">{fmtPct((kpi.lavorate / kpi.totTempo) * 100, 0)}</span>
                  <span className="pa__donut-lbl">al lavoro</span>
                </>
              ) : (
                <>
                  <span className="pa__donut-val">{fmtPct((kpi.tempo[fetta].ore / kpi.totTempo) * 100, 1)}</span>
                  <span className="pa__donut-lbl">{kpi.tempo[fetta].label}</span>
                </>
              )}
            </div>
          </div>
          <ul className="pa__tempo-list">
            {kpi.tempo.map((t, i) => (
              <li
                key={t.key}
                className={clsx('pa__tempo-row', fetta !== null && fetta !== i && 'pa__tempo-row--off')}
                style={{ ['--c' as any]: series(i) }}
                onMouseEnter={() => setFetta(i)} onMouseLeave={() => setFetta(null)}
              >
                <span className="pa__tempo-dot" />
                <TruncatedText text={t.label} className="pa__tempo-lbl" />
                <span className="pa__tempo-ore">{fmtOre(t.ore)}</span>
              </li>
            ))}
          </ul>
        </div>
      </ChartCard>

      {/* ── Competenze ───────────────────────────────────────────────────── */}
      <ChartCard
        className="pa__comp"
        index={3}
        title="Competenze"
        subtitle="Valutazione del responsabile contro la media del reparto"
        badge={`${fmtInt(Math.round(kpi.mediaCompetenze))}/100`}
        footer={kpi.debole && kpi.debole.dip < kpi.debole.reparto
          ? `Da sviluppare: ${kpi.debole.nome.toLowerCase()} (${kpi.debole.dip} contro ${kpi.debole.reparto} del reparto).`
          : `Sopra la media del reparto in tutte le competenze.`}
      >
        <div className="pa__radar-leg" aria-hidden="true">
          <span className="pa__radar-key pa__radar-key--dip">{a.dip.nome}</span>
          <span className="pa__radar-key pa__radar-key--rep">Media reparto</span>
        </div>
        <div className="pa__chart" key={`rad-${dipId}-${anno}`}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data.competenze} outerRadius="74%" margin={{ top: 10, right: 26, bottom: 10, left: 26 }}>
              <PolarGrid stroke={CHART.grid} />
              <AngleAxis dataKey="nome" tick={EtichettaRadar} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <RTooltip content={<ChartTooltip names={{ dip: a.dip.nome, reparto: 'Media reparto' }} format={(v) => `${fmtInt(v)}/100`} />} />
              <Radar
                dataKey="reparto" stroke={CHART.ly} strokeWidth={1.6} strokeDasharray="4 3" fill="transparent"
                isAnimationActive={!still} animationDuration={ANIM.duration}
              />
              <Radar
                dataKey="dip" stroke={series(0)} strokeWidth={2.2} fill={series(0)} fillOpacity={0.22}
                dot={{ r: 2.5, fill: series(0), strokeWidth: 0 }}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)} animationDuration={ANIM.duration}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Formazione obbligatoria ──────────────────────────────────────── */}
      <ChartCard
        className="pa__form"
        index={4}
        title="Formazione obbligatoria"
        subtitle="Corsi richiesti dal ruolo, dalla scadenza più vicina"
        badge={`${kpi.inRegola}/${data.corsi.length} in regola`}
      >
        <div className="pa__comp-ring" style={{ ['--pct' as any]: `${kpi.compliance}%` }}>
          <span className="pa__comp-ring-val">{fmtPct(kpi.compliance, 0)}</span>
          <span className="pa__comp-ring-lbl">compliance</span>
        </div>
        <ul className="pa__corsi">
          {data.corsi.map((c) => (
            <li key={c.nome} className={`pa__corso pa__corso--${c.stato}`}>
              <i className={`fa-solid ${c.stato === 'valido' ? 'fa-circle-check' : c.stato === 'scadenza' ? 'fa-hourglass-half' : 'fa-circle-exclamation'}`} aria-hidden="true" />
              <TruncatedText text={c.nome} className="pa__corso-nome" />
              <Tooltip text={`Fatto il ${fmtDataIt(c.fatto)} · scade il ${fmtDataIt(c.scade)}`}>
                <span className="pa__corso-scad">
                  {c.stato === 'scaduto' ? `scaduto da ${fmtInt(-c.giorni)} gg` : c.stato === 'scadenza' ? `fra ${fmtInt(c.giorni)} gg` : fmtDataIt(c.scade)}
                </span>
              </Tooltip>
            </li>
          ))}
        </ul>
      </ChartCard>
    </BiPage>
  )
}

// ─── Etichetta del radar: va a capo sulle parole, così non esce dalla card ──────
function EtichettaRadar(p: any) {
  const { x = 0, y = 0, cx = 0, payload } = p
  const parole = String(payload?.value ?? '').split(' ')
  const righe: string[] = []
  for (const w of parole) {
    const ult = righe[righe.length - 1]
    if (ult && (ult + ' ' + w).length <= 11) righe[righe.length - 1] = `${ult} ${w}`
    else righe.push(w)
  }
  const anchor = Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end'
  const dy = y < (p.cy ?? 0) ? -(righe.length - 1) * 11 : 0
  return (
    <text x={x} y={y + dy} textAnchor={anchor} fontSize={10} fill={CHART.inkMuted}>
      {righe.map((r, i) => <tspan key={i} x={x} dy={i ? 11 : 3}>{r}</tspan>)}
    </text>
  )
}

// ─── Tachimetro del premio ─────────────────────────────────────────────────────
//  Semicerchio a tre fasce (sotto soglia · in maturazione · pieno) con lancetta e
//  arco di avanzamento: il valore entra animato dalla posizione zero.
function Tachimetro({ pct, maturato, massimo }: { pct: number; maturato: number; massimo: number }) {
  const [val, setVal] = useState(reducedMotion() ? pct : 0)
  useEffect(() => {
    const t = window.setTimeout(() => setVal(pct), 120)
    return () => window.clearTimeout(t)
  }, [pct])
  const shown = Math.max(0, Math.min(100, val))
  const arco = 'M 20 100 A 80 80 0 0 1 180 100'
  return (
    <div className="pa__tach" style={{ ['--g' as any]: shown, ['--ang' as any]: `${shown * 1.8 - 90}deg` }}>
      <svg viewBox="0 0 200 112" className="pa__tach-svg" role="img" aria-label={`Obiettivi raggiunti al ${Math.round(pct)}%`}>
        <defs>
          <linearGradient id="pa-tach" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={series(5)} />
            <stop offset="50%" stopColor={series(3)} />
            <stop offset="100%" stopColor={CHART.good} />
          </linearGradient>
        </defs>
        <path d={arco} className="pa__tach-track" pathLength={100} />
        {/* Soglia del 50%: sotto, il premio non matura */}
        <path d={arco} className="pa__tach-val" pathLength={100} stroke="url(#pa-tach)" />
        <line x1="100" y1="20" x2="100" y2="30" className="pa__tach-soglia" />
        <g className="pa__tach-needle">
          <line x1="100" y1="100" x2="100" y2="34" />
          <circle cx="100" cy="100" r="6" />
        </g>
        <text x="18" y="111" className="pa__tach-tick">0</text>
        <text x="100" y="15" className="pa__tach-tick pa__tach-tick--mid">50</text>
        <text x="182" y="111" className="pa__tach-tick pa__tach-tick--end">100</text>
      </svg>
      <div className="pa__tach-fig">
        <Tooltip text={`Premio maturato su un massimo di ${eur(massimo)}`}>
          <span className="pa__tach-val-txt">{eur(maturato)}</span>
        </Tooltip>
        <span className="pa__tach-sub">maturati su {eur(massimo)}</span>
      </div>
    </div>
  )
}
