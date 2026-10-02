import React, { useMemo, useState } from 'react'
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, LabelList, ReferenceLine,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import TruncatedText from '../../../core/components/TruncatedText'
import {
  ANIM, BiPage, CHART, ChartCard, ChartTooltip, KpiTile, barEndLabel,
  cursorProps, fmtAxisNum, fmtDec, fmtInt, fmtPct, gridProps, reducedMotion, series,
  xAxisProps, yAxisProps,
} from '../../../core/bi'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import { pmsDi } from '../_data/pmsDi'
import { usePmsStore, type PmsDemo, type PrenDemo } from '../_data/pmsDemo'
import './AnalisiOccupazione.sass'

// ─── ANALISI DELL'OCCUPAZIONE ───────────────────────────────────────────────────
//  Il riempimento della struttura letto in un'unica schermata:
//    • fascia indicatori: occupazione di oggi, media delle ultime tre settimane,
//      on the book dei prossimi 30 giorni, permanenza media, pickup della settimana
//    • occupazione giorno per giorno: consuntivo fino a oggi, poi a libro
//      (confermate + opzioni) sulla capienza della struttura
//    • per tipologia di camera, per canale, pickup dei prossimi 14 giorni,
//      segmenti e soggiorno con l'indicazione operativa
//  Dati dal gestionale demo della struttura scelta (_data/pmsDemo): le stesse
//  prenotazioni di Planner, Arrivi e partenze e Ospiti in casa.

const PASSATO = 21
const FUTURO = 30
const PICKUP_GIORNI = 14

const isoDi = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addGiorni = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return isoDi(d)
}
const ggMm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const notti = (p: PrenDemo) => Math.max(1, Math.round((new Date(p.checkOut).getTime() - new Date(p.checkIn).getTime()) / 86400000))

// Data di prenotazione: il gestionale demo non la registra, la si deduce dalla
// prenotazione stessa (sempre uguale) con un anticipo realistico — i gruppi
// prenotano con largo anticipo, gli individuali spesso sotto data.
const hash = (t: string) => {
  let h = 2166136261
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0
  return h
}
const anticipo = (p: PrenDemo) => {
  const r = (hash(p.id) % 1000) / 1000
  return p.tipo === 'Gruppo' ? 30 + Math.round(r * 60) : Math.round(-Math.log(1 - r * 0.98) * 24)
}
const prenotataIl = (p: PrenDemo) => addGiorni(p.checkIn, -anticipo(p))

const TIPOLOGIE: Record<string, string> = {
  SGL: 'Singola', DBL: 'Doppia', MAT: 'Matrimoniale', TRP: 'Tripla', SUITE: 'Suite',
}

interface Giorno { iso: string; label: string; cons: number | null; otb: number | null; opz: number | null; camere: number }

function calcola(pms: PmsDemo) {
  const oggi = isoDi(new Date())
  const cap = pms.camere.length
  const valide = pms.prenotazioni.filter((p) => p.stato !== 'noshow')
  const occupa = (p: PrenDemo, g: string) => p.checkIn <= g && g < p.checkOut
  const pct = (n: number, t = cap) => (t ? (n / t) * 100 : 0)

  // ── Serie giornaliera ─────────────────────────────────────────────────────
  const giorni: Giorno[] = []
  for (let i = -PASSATO; i < FUTURO; i++) {
    const g = addGiorni(oggi, i)
    const qui = valide.filter((p) => occupa(p, g))
    const conf = qui.filter((p) => p.stato === 'confermata').length
    const opz = qui.length - conf
    const passato = g < oggi
    giorni.push({
      iso: g, label: ggMm(g), camere: qui.length,
      // Oggi chiude il consuntivo e apre l'on the book: il punto appartiene a entrambi.
      cons: g <= oggi ? +pct(qui.length).toFixed(1) : null,
      otb: passato ? null : +pct(conf).toFixed(1),
      opz: passato ? null : +pct(opz).toFixed(1),
    })
  }
  const passati = giorni.filter((g) => g.iso < oggi)
  const futuri = giorni.filter((g) => g.iso > oggi)
  const giornoOggi = giorni.find((g) => g.iso === oggi)!
  const settimanaScorsa = giorni.find((g) => g.iso === addGiorni(oggi, -7))
  const media = (xs: Giorno[], k: 'camere') => (xs.length ? xs.reduce((t, x) => t + x[k], 0) / xs.length : 0)
  const occOggi = pct(giornoOggi.camere)
  const occMedia = pct(media(passati, 'camere'))
  const occOtb = pct(media(futuri, 'camere'))

  // ── Per tipologia di camera ───────────────────────────────────────────────
  const tipologie = Object.keys(TIPOLOGIE)
    .map((k) => {
      const cam = pms.camere.filter((c) => c.categoria === k).map((c) => c.numero)
      if (!cam.length) return null
      const nottiIn = (gg: Giorno[]) => gg.reduce((t, g) => t + valide.filter((p) => cam.includes(p.camera) && occupa(p, g.iso)).length, 0)
      return {
        key: k, label: `${TIPOLOGIE[k]} (${cam.length})`,
        passato: +pct(nottiIn(passati), cam.length * passati.length).toFixed(1),
        futuro: +pct(nottiIn(futuri), cam.length * futuri.length).toFixed(1),
      }
    })
    .filter(Boolean) as { key: string; label: string; passato: number; futuro: number }[]

  // ── Per canale (notti di camera nella finestra) ───────────────────────────
  const perCanale = new Map<string, number>()
  let nottiFinestra = 0
  giorni.forEach((g) => valide.forEach((p) => {
    if (!occupa(p, g.iso)) return
    const c = p.tipo === 'Gruppo' ? 'Gruppi e tour operator' : p.canale
    perCanale.set(c, (perCanale.get(c) ?? 0) + 1)
    nottiFinestra += 1
  }))
  const ordinati = Array.from(perCanale.entries()).sort((a, b) => b[1] - a[1])
  const canali = [
    ...ordinati.slice(0, 6),
    ...(ordinati.length > 6 ? [['Altri', ordinati.slice(6).reduce((t, x) => t + x[1], 0)] as [string, number]] : []),
  ].map(([nome, n]) => ({ nome, quota: +pct(n, nottiFinestra).toFixed(1) }))

  // ── Pickup dei prossimi giorni ────────────────────────────────────────────
  const setteGiorniFa = addGiorni(oggi, -7)
  const pickup = Array.from({ length: PICKUP_GIORNI }, (_, i) => {
    const g = addGiorni(oggi, i + 1)
    const qui = valide.filter((p) => occupa(p, g))
    const recenti = qui.filter((p) => prenotataIl(p) > setteGiorniFa).length
    return { label: ggMm(g), prima: qui.length - recenti, recenti, libere: Math.max(0, cap - qui.length) }
  })
  const pickupSettimana = valide
    .filter((p) => p.checkOut > oggi && prenotataIl(p) > setteGiorniFa)
    .reduce((t, p) => t + notti(p), 0)

  // ── Segmenti e soggiorno (prenotazioni arrivate nella finestra) ───────────
  const finestra = pms.prenotazioni.filter((p) => p.checkIn >= addGiorni(oggi, -PASSATO) && p.checkIn < addGiorni(oggi, FUTURO))
  const finestraValide = finestra.filter((p) => p.stato !== 'noshow')
  const gruppi = finestraValide.filter((p) => p.tipo === 'Gruppo').length
  const alos = finestraValide.length ? finestraValide.reduce((t, p) => t + notti(p), 0) / finestraValide.length : 0
  const lead = finestraValide.length ? finestraValide.reduce((t, p) => t + anticipo(p), 0) / finestraValide.length : 0
  const arrivatePassate = finestra.filter((p) => p.checkIn <= oggi)
  const noShow = pct(arrivatePassate.filter((p) => p.stato === 'noshow').length, arrivatePassate.length)
  const opzioniAperte = valide.filter((p) => p.stato === 'opzione' && p.checkIn > oggi).length

  // ── Indicazione operativa ─────────────────────────────────────────────────
  const piena = futuri.reduce((m, g) => (g.camere > m.camere ? g : m), futuri[0] ?? giornoOggi)
  const vuota = futuri.slice(0, 14).reduce((m, g) => (g.camere < m.camere ? g : m), futuri[0] ?? giornoOggi)
  const insight = !cap
    ? 'La struttura non ha camere configurate.'
    : occOtb < occMedia - 5
      ? `A libro i prossimi 30 giorni sono ${fmtDec(occMedia - occOtb)} punti sotto le ultime tre settimane: il ${ggMm(vuota.iso)} (${fmtPct(pct(vuota.camere), 0)}) è la data da spingere con tariffe o pacchetti.`
      : `Picco il ${ggMm(piena.iso)} al ${fmtPct(pct(piena.camere), 0)}: valuta restrizioni di soggiorno minimo e controlla l'overbooking; la data più scarica è il ${ggMm(vuota.iso)}.`

  return {
    oggi, cap, giorni, oggiLabel: giornoOggi.label,
    occOggi, occMedia, occOtb,
    deltaOggi: settimanaScorsa ? occOggi - pct(settimanaScorsa.camere) : undefined,
    sparkPassato: passati.slice(-14).map((g) => pct(g.camere)),
    sparkFuturo: futuri.map((g) => pct(g.camere)),
    tipologie, canali, pickup, pickupSettimana,
    sparkPickup: pickup.map((p) => p.recenti),
    gruppiPct: pct(gruppi, finestraValide.length),
    alos, lead, noShow, opzioniAperte,
    prenotazioni: finestraValide.length,
    insight,
  }
}

export default function AnalisiOccupazione({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura, opzioni] = useStrutturaPagina()
  const versionePms = usePmsStore((s) => s.versione)
  const [aggiornatoAl, setAggiornatoAl] = useState(() => new Date())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const d = useMemo(() => calcola(pmsDi(struttura)), [struttura, versionePms, aggiornatoAl])
  const still = reducedMotion()

  return (
    <BiPage
      title="Analisi dell'occupazione"
      subtitle="Monitoraggio dei livelli di occupazione e dei trend di prenotazione"
      glossary={['occupazione', 'OTB', 'pickup', 'ALOS', 'leadTime', 'noShow']}
      dataAt={aggiornatoAl}
      onRefresh={() => setAggiornatoAl(new Date())}
      gridClassName="aocc__grid"
      toolbar={(
        <>
          <SelectField
            name="struttura" label="Struttura" value={struttura}
            onChange={(e) => setStruttura(e.target.value)}
            options={opzioni}
            className="aocc__filter"
          />
          <span className="aocc__note">
            <i className="fa-solid fa-bed" aria-hidden="true" />
            {fmtInt(d.cap)} camere vendibili · ultime {PASSATO} notti e prossime {FUTURO}
          </span>
        </>
      )}
    >
      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="aocc__kpis">
        <KpiTile
          label="Occupazione oggi" icon="fa-bed" slot={0} index={0}
          value={d.occOggi} format={(n) => fmtPct(n, 1)}
          delta={d.deltaOggi} deltaLabel={d.deltaOggi !== undefined ? `${d.deltaOggi >= 0 ? '+' : ''}${fmtDec(d.deltaOggi)} pt vs 7 gg fa` : undefined}
          spark={d.sparkPassato}
          info="Camere occupate stanotte diviso camere vendibili; confronto con lo stesso giorno della settimana scorsa."
        />
        <KpiTile
          label={`Media ultime ${PASSATO} notti`} icon="fa-chart-line" slot={1} index={1}
          value={d.occMedia} format={(n) => fmtPct(n, 1)}
          spark={d.sparkPassato}
          info="Occupazione media consuntiva delle ultime tre settimane."
        />
        <KpiTile
          label={`On the book ${FUTURO} gg`} icon="fa-calendar-check" slot={2} index={2}
          value={d.occOtb} format={(n) => fmtPct(n, 1)}
          delta={d.occOtb - d.occMedia} deltaLabel={`${d.occOtb - d.occMedia >= 0 ? '+' : ''}${fmtDec(d.occOtb - d.occMedia)} pt vs consuntivo`}
          spark={d.sparkFuturo}
          info="Occupazione già a libro (confermate e opzioni) per i prossimi 30 giorni, confrontata con la media consuntiva."
        />
        <KpiTile
          label="Permanenza media" icon="fa-moon" slot={3} index={3}
          value={d.alos} format={(n) => `${fmtDec(n)} notti`}
          info="ALOS: notti vendute diviso numero di prenotazioni arrivate nella finestra di analisi."
        />
        <KpiTile
          label="Pickup 7 giorni" icon="fa-arrow-trend-up" slot={4} index={4}
          value={d.pickupSettimana} format={(n) => `${fmtInt(Math.round(n))} notti`}
          spark={d.sparkPickup}
          info="Notti di camera future acquisite negli ultimi 7 giorni."
        />
      </div>

      {/* ── Occupazione giorno per giorno ─────────────────────────────────── */}
      <ChartCard
        className="aocc__main"
        index={0}
        title="Occupazione giorno per giorno"
        subtitle="Consuntivo fino a oggi, poi on the book sulla capienza"
        badge={`${fmtInt(d.cap)} camere`}
        legend={[
          { key: 'cons', name: 'Consuntivo', color: series(0) },
          { key: 'otb', name: 'Confermate', color: series(1) },
          { key: 'opz', name: 'Opzioni', color: CHART.forecast, dashed: true },
        ]}
        footer={d.insight}
      >
        <div className="aocc__chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={d.giorni} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="aocc-cons" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series(0)} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={series(0)} stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="aocc-otb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series(1)} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={series(1)} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={6} />
              <YAxis {...yAxisProps} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={44} />
              <RTooltip
                cursor={cursorProps}
                content={(
                  <ChartTooltip
                    names={{ cons: 'Occupazione', otb: 'Confermate', opz: 'Opzioni' }}
                    format={(v) => fmtPct(v, 1)}
                  />
                )}
              />
              <ReferenceLine x={d.oggiLabel} stroke={CHART.axis} strokeDasharray="3 3" label={{ value: 'Oggi', position: 'insideTopRight', fontSize: 10, fill: CHART.inkMuted }} />
              <Area
                type="monotone" dataKey="cons" stroke={series(0)} strokeWidth={2.2} fill="url(#aocc-cons)"
                dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }} connectNulls={false}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              <Area
                type="monotone" dataKey="otb" stackId="futuro" stroke={series(1)} strokeWidth={2.2} fill="url(#aocc-otb)"
                dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }} connectNulls={false}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
              {/* Le opzioni si sommano alle confermate: il bordo superiore è il massimo raggiungibile */}
              <Area
                type="monotone" dataKey="opz" stackId="futuro" stroke={CHART.forecast} strokeWidth={1.6} strokeDasharray="4 3"
                fill="transparent" dot={false} connectNulls={false}
                isAnimationActive={!still} animationBegin={ANIM.begin(2)} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Per tipologia di camera ───────────────────────────────────────── */}
      <ChartCard
        className="aocc__tipo"
        index={1}
        title="Per tipologia di camera"
        subtitle="Occupazione media: ultime 3 settimane e prossimi 30 giorni"
        legend={[
          { key: 'passato', name: 'Consuntivo', color: series(0) },
          { key: 'futuro', name: 'On the book', color: series(1) },
        ]}
      >
        <div className="aocc__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.tipologie} layout="vertical" margin={{ top: 2, right: 48, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} horizontal={false} vertical />
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis type="category" dataKey="label" {...yAxisProps} width={112} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ passato: 'Consuntivo', futuro: 'On the book' }} format={(v) => fmtPct(v, 1)} />}
              />
              <Bar dataKey="passato" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={10}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}>
                <LabelList dataKey="passato" content={barEndLabel((n) => fmtPct(n, 0))} />
              </Bar>
              <Bar dataKey="futuro" fill={series(1)} radius={[0, 4, 4, 0]} maxBarSize={10}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)} animationDuration={ANIM.duration} animationEasing={ANIM.easing}>
                <LabelList dataKey="futuro" content={barEndLabel((n) => fmtPct(n, 0))} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Per canale ────────────────────────────────────────────────────── */}
      <ChartCard
        className="aocc__canali"
        index={2}
        title="Per canale"
        subtitle="Quota delle notti di camera nella finestra"
      >
        <div className="aocc__chart">
          <ResponsiveContainer width="100%" height="100%">
            {/* Barre nominali: stessa tinta, la lunghezza porta il valore */}
            <BarChart data={d.canali} layout="vertical" margin={{ top: 2, right: 48, left: 0, bottom: 0 }} barCategoryGap="18%">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="nome" {...yAxisProps} width={118} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ quota: 'Quota notti' }} format={(v) => fmtPct(v, 1)} />}
              />
              <Bar dataKey="quota" fill={series(0)} radius={[0, 4, 4, 0]} maxBarSize={12}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}>
                <LabelList dataKey="quota" content={barEndLabel((n) => fmtPct(n, 1))} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Pickup dei prossimi giorni ────────────────────────────────────── */}
      <ChartCard
        className="aocc__pickup"
        index={3}
        title={`Pickup prossimi ${PICKUP_GIORNI} giorni`}
        subtitle="Camere a libro e quelle acquisite negli ultimi 7 giorni"
        legend={[
          { key: 'prima', name: 'A libro', color: series(1) },
          { key: 'recenti', name: 'Pickup 7 gg', color: series(4) },
        ]}
      >
        <div className="aocc__chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.pickup} margin={{ top: 6, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...xAxisProps} interval={1} />
              <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} width={30} domain={[0, Math.max(1, d.cap)]} allowDecimals={false} />
              <RTooltip
                cursor={{ fill: 'transparent' }}
                content={<ChartTooltip names={{ prima: 'A libro', recenti: 'Pickup 7 gg' }} format={(v) => `${fmtInt(v)} camere`} />}
              />
              <Bar dataKey="prima" stackId="p" fill={series(1)} maxBarSize={16}
                isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
              <Bar dataKey="recenti" stackId="p" fill={series(4)} radius={[3, 3, 0, 0]} maxBarSize={16}
                isAnimationActive={!still} animationBegin={ANIM.begin(1)} animationDuration={ANIM.duration} animationEasing={ANIM.easing} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* ── Segmenti e soggiorno ──────────────────────────────────────────── */}
      <ChartCard
        className="aocc__seg"
        index={4}
        title="Segmenti e soggiorno"
        subtitle={`${fmtInt(d.prenotazioni)} prenotazioni nella finestra`}
      >
        <ul className="aocc__figures">
          <li className="aocc__figure">
            <TruncatedText text="Individuali" className="aocc__figure-lbl" />
            <span className="aocc__figure-val">{fmtPct(100 - d.gruppiPct, 0)}</span>
          </li>
          <li className="aocc__figure">
            <TruncatedText text="Gruppi e tour operator" className="aocc__figure-lbl" />
            <span className="aocc__figure-val">{fmtPct(d.gruppiPct, 0)}</span>
          </li>
          <li className="aocc__figure">
            <TruncatedText text="Permanenza media (ALOS)" className="aocc__figure-lbl" />
            <span className="aocc__figure-val">{fmtDec(d.alos)} notti</span>
          </li>
          <li className="aocc__figure">
            <TruncatedText text="Anticipo medio di prenotazione" className="aocc__figure-lbl" />
            <span className="aocc__figure-val">{fmtInt(Math.round(d.lead))} giorni</span>
          </li>
          <li className="aocc__figure">
            <TruncatedText text="No show (arrivi fino a oggi)" className="aocc__figure-lbl" />
            <span className="aocc__figure-val">{fmtPct(d.noShow, 1)}</span>
          </li>
          <li className="aocc__figure aocc__figure--tot">
            <TruncatedText text="Opzioni da confermare" className="aocc__figure-lbl" />
            <span className="aocc__figure-val">{fmtInt(d.opzioniAperte)}</span>
          </li>
        </ul>
      </ChartCard>
    </BiPage>
  )
}
