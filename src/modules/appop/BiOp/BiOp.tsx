import React, { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import { SelectField } from '../../../core/components/form'
import EmptyState from '../../../core/components/EmptyState'
import TruncatedText from '../../../core/components/TruncatedText'
import {
  ANIM, BiPage, ChartCard, ChartTooltip, DeltaBadge, KpiTile, barEndLabel,
  CHART, cursorProps, fmtAxisNum, fmtDec, fmtEur, fmtEurK, fmtInt, fmtPct, gridProps,
  reducedMotion, series, xAxisProps, yAxisProps,
} from '../../../core/bi'
import { CLIENTS_INIT } from '../../../admin/SibyllaAdminPanel/constants'
import { useStrutturaPagina } from '../../../hooks/useStrutturaCorrente'
import {
  OpApiError, type BiAzienda, type KpiBi, type PuntoBi, type RepartoBi, type StrutturaOp, type UnitaBi,
} from '../opApi'
import { leggiBiOp } from '../appOpSibylla'
import './BiOp.sass'

// ─── BUSINESS INTELLIGENCE OP! ──────────────────────────────────────────────────
//  L'attività dei reparti nell'app Op! per l'azienda della struttura selezionata:
//  la stessa azienda in Platform e in Op (Op.Api la ricava dalla struttura). Un tab
//  per ogni reparto attivo in Op; per il reparto scelto:
//    • indicatori con il confronto sul periodo precedente di pari durata
//    • andamento giornaliero della serie principale
//    • ripartizione (anello) e seconda serie o confronto indicatore per indicatore
//    • "lettura del reparto": le frasi che spiegano i grafici, ricavate dai dati
//  I numeri li calcola Op.Api (GET /admin/collegata/bi) sugli stessi dati dell'app, o
//  il Portal (OpApp/bi/Get) quando Op.Api è collegato a Sibylla vera:
//  qui non si inventa nulla, un reparto senza attività mostra zeri.

const ICONE: Record<string, string> = {
  pulizie: 'fa-broom',
  manutenzione: 'fa-screwdriver-wrench',
  magazzino: 'fa-boxes-stacked',
  frontOffice: 'fa-bell-concierge',
  foodBeverage: 'fa-utensils',
  risorseUmane: 'fa-users',
  purchasing: 'fa-cart-shopping',
}

const PERIODI = [
  { value: 7, label: 'Ultimi 7 giorni' },
  { value: 30, label: 'Ultimi 30 giorni' },
  { value: 90, label: 'Ultimi 90 giorni' },
]

/** Indicatori dove crescere è un peggioramento (arretrati, attese, tempi, assenze). */
const PEGGIORA_SE_CRESCE = /apert|ritard|assenz|attes|tempo|urgent|smarrit|scart|annull|reclam/i

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function intervallo(giorni: number) {
  const al = new Date()
  const dal = new Date(al)
  dal.setDate(al.getDate() - (giorni - 1))
  return { dal: iso(dal), al: iso(al) }
}

/** "2026-10-12" → "12/10". */
const giorno = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`

function formato(unita: UnitaBi): (n: number) => string {
  switch (unita) {
    case 'pct': return (n) => fmtPct(n, 1)
    case 'eur': return (n) => (Math.abs(n) >= 10000 ? fmtEurK(n) : fmtEur(n, 0))
    case 'ore': return (n) => `${fmtDec(n, 1)} h`
    case 'min': return (n) => `${fmtInt(Math.round(n))} min`
    default: return (n) => fmtInt(Math.round(n))
  }
}

/** Variazione % sul periodo precedente (assente se il precedente è zero o mancante). */
const variazione = (k: KpiBi) =>
  k.precedente != null && k.precedente !== 0 ? ((k.valore - k.precedente) / Math.abs(k.precedente)) * 100 : undefined

const totale = (p: PuntoBi[]) => p.reduce((t, x) => t + x.valore, 0)

/** Frasi che spiegano i numeri del reparto, solo da ciò che i dati dicono davvero. */
function lettura(r: RepartoBi, giorni: number): string[] {
  const frasi: string[] = []
  const s = r.serie[0]
  if (s && s.punti.length) {
    const tot = totale(s.punti)
    if (tot > 0) {
      const fmt = formato(s.unita)
      const picco = s.punti.reduce((a, b) => (b.valore > a.valore ? b : a))
      const attivi = s.punti.filter(p => p.valore > 0).length
      frasi.push(`${s.titolo}: in media ${fmt(tot / s.punti.length)} al giorno, con il picco il ${giorno(picco.etichetta)} (${fmt(picco.valore)}).`)
      if (attivi < s.punti.length) frasi.push(`Attività registrata in ${fmtInt(attivi)} giorni su ${fmtInt(s.punti.length)}.`)
    }
  }
  const variazioni = r.kpi
    .map(k => ({ k, v: variazione(k) }))
    .filter((x): x is { k: KpiBi; v: number } => x.v !== undefined && Math.abs(x.v) >= 1)
  if (variazioni.length) {
    // "Meglio" tiene conto del verso: un arretrato che cala è un miglioramento.
    const punteggio = (x: { k: KpiBi; v: number }) => (PEGGIORA_SE_CRESCE.test(`${x.k.chiave} ${x.k.etichetta}`) ? -x.v : x.v)
    const ordinate = [...variazioni].sort((a, b) => punteggio(b) - punteggio(a))
    const meglio = ordinate[0]
    const peggio = ordinate[ordinate.length - 1]
    if (punteggio(meglio) > 0) {
      frasi.push(`Il segnale migliore: ${meglio.k.etichetta.toLowerCase()} ${meglio.v > 0 ? 'sale' : 'scende'} del ${fmtPct(Math.abs(meglio.v), 0)} rispetto ai ${giorni} giorni precedenti.`)
    }
    if (peggio !== meglio && punteggio(peggio) < 0) {
      frasi.push(`Da tenere d'occhio: ${peggio.k.etichetta.toLowerCase()} ${peggio.v > 0 ? 'sale' : 'scende'} del ${fmtPct(Math.abs(peggio.v), 0)}.`)
    }
  }
  const rip = r.ripartizioni.find(x => totale(x.voci) > 0)
  if (rip) {
    const tot = totale(rip.voci)
    const prima = rip.voci[0]
    frasi.push(`${rip.titolo}: «${prima.etichetta}» pesa il ${fmtPct((prima.valore / tot) * 100, 0)} del totale.`)
  }
  if (!frasi.length) {
    frasi.push(`Nessuna attività registrata nel periodo. I dati arrivano dall'uso dell'app Op! da parte del reparto ${r.nome}: compaiono qui appena il personale inizia a lavorarci.`)
  }
  return frasi
}

export default function BiOp({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [nomeStruttura, setNomeStruttura, opzioniStrutture] = useStrutturaPagina()
  const struttura = useMemo<StrutturaOp | null>(() => {
    const c = CLIENTS_INIT.find(x => x.nome === nomeStruttura)
    return c ? { id: c.id, nome: c.nome } : null
  }, [nomeStruttura])
  const [giorni, setGiorni] = useState(30)
  const [dati, setDati] = useState<BiAzienda | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [repartoAttivo, setRepartoAttivo] = useState<string | null>(null)
  const [giro, setGiro] = useState(0)

  useEffect(() => {
    let annullato = false
    const { dal, al } = intervallo(giorni)
    setLoading(true)
    setErrore(null)
    leggiBiOp(struttura, dal, al)
      .then((d) => { if (!annullato) setDati(d) })
      .catch((e) => {
        if (annullato) return
        setDati(null)
        setErrore(e instanceof OpApiError || e instanceof Error ? e.message : 'Dati di Op! non disponibili.')
      })
      .finally(() => { if (!annullato) setLoading(false) })
    return () => { annullato = true }
  }, [struttura, giorni, giro])

  // Il tab scelto resta se il reparto c'è ancora (cambio periodo); altrimenti il primo.
  const reparto = useMemo(
    () => dati?.reparti.find(r => r.key === repartoAttivo) ?? dati?.reparti[0] ?? null,
    [dati, repartoAttivo],
  )

  const aggiorna = useCallback(() => setGiro(g => g + 1), [])
  const still = reducedMotion()

  const sottotitolo = dati
    ? `${dati.azienda}: l'attività dei reparti nell'app Op! dal ${giorno(dati.dal)} al ${giorno(dati.al)}`
    : "L'attività dei reparti nell'app Op!, per l'azienda della struttura selezionata"

  return (
    <BiPage
      title="Business Intelligence Op!"
      subtitle={sottotitolo}
      glossary={[]}
      dataAt={dati ? new Date(dati.aggiornatoIl) : new Date()}
      loading={loading}
      onRefresh={aggiorna}
      gridClassName={clsx('biop__grid', !reparto && 'biop__grid--vuota')}
      toolbar={(
        <>
          <SelectField
            name="struttura" label="Struttura"
            value={nomeStruttura}
            onChange={(e) => setNomeStruttura(e.target.value)}
            options={opzioniStrutture}
            className="biop__filter biop__filter--wide"
          />
          <SelectField
            name="periodo" label="Periodo"
            value={giorni}
            onChange={(e) => setGiorni(Number(e.target.value))}
            options={PERIODI}
            className="biop__filter"
          />
          {dati && (
            <span className="biop__note">
              <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />
              {fmtInt(dati.reparti.length)} {dati.reparti.length === 1 ? 'reparto attivo' : 'reparti attivi'} in Op!
            </span>
          )}
        </>
      )}
    >
      {!reparto ? (
        <div className="biop__vuoto">
          {errore ? (
            <EmptyState icon="plug-circle-xmark" title="Op! non risponde" subtitle={errore} />
          ) : loading ? (
            <EmptyState icon="hourglass-half" title="Caricamento…" subtitle="Leggo l'attività dei reparti da Op!" />
          ) : (
            <EmptyState
              icon="layer-group"
              title="Nessun reparto attivo in Op!"
              subtitle="Attiva i reparti dell'azienda in Configuratore › App Op!: ognuno avrà qui il suo tab."
            />
          )}
        </div>
      ) : (
        <>
          {/* ── Tab dei reparti dell'azienda ──────────────────────────────────── */}
          <nav className="biop__tabs" aria-label="Reparti">
            {dati!.reparti.map((r) => {
              const attivo = r.key === reparto.key
              const primo = r.kpi[0]
              return (
                <button
                  key={r.key} type="button"
                  className={clsx('biop__tab', attivo && 'biop__tab--on')}
                  aria-pressed={attivo}
                  onClick={() => setRepartoAttivo(r.key)}
                >
                  <span className="biop__tab-ico">
                    <i className={`fa-solid ${ICONE[r.key] ?? 'fa-layer-group'}`} aria-hidden="true" />
                  </span>
                  <span className="biop__tab-txt">
                    <TruncatedText text={r.nome} className="biop__tab-nome" />
                    {primo && (
                      <TruncatedText
                        text={`${formato(primo.unita)(primo.valore)} ${primo.etichetta.toLowerCase()}`}
                        className="biop__tab-meta"
                      />
                    )}
                  </span>
                </button>
              )
            })}
          </nav>

          <Reparto key={`${reparto.key}-${dati!.dal}`} reparto={reparto} giorni={giorni} still={still} />
        </>
      )}
    </BiPage>
  )
}

function Reparto({ reparto: r, giorni, still }: { reparto: RepartoBi; giorni: number; still: boolean }) {
  const principale = r.serie[0]
  const seconda = r.serie[1]
  const anello = r.ripartizioni[0]
  const barre = seconda ? null : r.ripartizioni[1]
  const frasi = useMemo(() => lettura(r, giorni), [r, giorni])
  const gradiente = `biop-area-${r.key}`

  const serieDati = (punti: PuntoBi[]) => punti.map(p => ({ giorno: giorno(p.etichetta), valore: p.valore }))

  return (
    <>
      {/* ── Indicatori ────────────────────────────────────────────────────── */}
      <div className="biop__kpis">
        {r.kpi.slice(0, 6).map((k, i) => {
          const spark = r.serie.find(s => s.chiave === k.chiave)?.punti.map(p => p.valore)
          return (
            <KpiTile
              key={k.chiave}
              label={k.etichetta}
              value={k.valore}
              format={formato(k.unita)}
              delta={variazione(k)}
              deltaLabel={`vs ${giorni} gg prima`}
              invertDelta={PEGGIORA_SE_CRESCE.test(`${k.chiave} ${k.etichetta}`)}
              spark={spark}
              slot={i}
              index={i}
              info={k.precedente != null
                ? `${k.etichetta}: ${formato(k.unita)(k.valore)} negli ultimi ${giorni} giorni, contro ${formato(k.unita)(k.precedente)} nei ${giorni} giorni precedenti.`
                : `${k.etichetta} negli ultimi ${giorni} giorni.`}
            />
          )
        })}
      </div>

      {/* ── Andamento principale ──────────────────────────────────────────── */}
      <ChartCard
        className="biop__main"
        index={0}
        title={principale ? `${principale.titolo} giorno per giorno` : 'Andamento'}
        subtitle={principale ? `Ultimi ${giorni} giorni · ${r.nome}` : undefined}
        badge={principale ? `${formato(principale.unita)(totale(principale.punti))} nel periodo` : undefined}
        footer={frasi[0]}
      >
        {principale ? (
          <div className="biop__chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serieDati(principale.punti)} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={series(0)} stopOpacity={0.34} />
                    <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="giorno" {...xAxisProps} />
                {/* Magnitudine: l'asse parte sempre da zero */}
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} width={40} domain={[0, 'auto']} allowDecimals={principale.unita !== 'n'} />
                <RTooltip
                  cursor={cursorProps}
                  content={<ChartTooltip names={{ valore: principale.titolo }} format={formato(principale.unita)} />}
                />
                <Area
                  type="monotone" dataKey="valore" stroke={series(0)} strokeWidth={2.4}
                  fill={`url(#${gradiente})`} dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <Confronto kpi={r.kpi} giorni={giorni} />}
      </ChartCard>

      {/* ── Ripartizione (anello) ─────────────────────────────────────────── */}
      <ChartCard
        className="biop__rip"
        index={1}
        title={anello?.titolo ?? 'Confronto col periodo precedente'}
        subtitle={anello ? 'Come si distribuisce il lavoro del reparto' : `Ogni indicatore contro i ${giorni} giorni prima`}
      >
        {anello ? <Anello voci={anello.voci} unita={anello.unita} still={still} /> : <Confronto kpi={r.kpi} giorni={giorni} />}
      </ChartCard>

      {/* ── Seconda serie, seconda ripartizione o confronto ───────────────── */}
      <ChartCard
        className="biop__sec"
        index={2}
        title={seconda ? `${seconda.titolo} giorno per giorno` : barre?.titolo ?? 'Confronto col periodo precedente'}
        subtitle={seconda
          ? `Ultimi ${giorni} giorni`
          : barre ? 'Le voci in ordine di peso' : `Ogni indicatore contro i ${giorni} giorni prima`}
        badge={seconda ? `${formato(seconda.unita)(totale(seconda.punti))} nel periodo` : undefined}
      >
        {seconda ? (
          <div className="biop__chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serieDati(seconda.punti)} margin={{ top: 8, right: 10, left: -10, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="giorno" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={fmtAxisNum} width={40} allowDecimals={seconda.unita !== 'n'} />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={<ChartTooltip names={{ valore: seconda.titolo }} format={formato(seconda.unita)} />}
                />
                <Bar
                  dataKey="valore" fill={series(1)} radius={[3, 3, 0, 0]} maxBarSize={16}
                  isAnimationActive={!still} animationBegin={ANIM.begin(1)}
                  animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : barre ? (
          <div className="biop__chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barre.voci} layout="vertical" margin={{ top: 2, right: 72, left: 0, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid {...gridProps} horizontal={false} vertical />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="etichetta" {...yAxisProps} width={120} interval={0} tick={{ fontSize: 11, fill: CHART.ink }} />
                <RTooltip
                  cursor={{ fill: 'transparent' }}
                  content={<ChartTooltip names={{ valore: barre.titolo }} format={formato(barre.unita)} />}
                />
                <Bar
                  dataKey="valore" fill={series(1)} radius={[0, 4, 4, 0]} maxBarSize={14}
                  isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
                >
                  <LabelList dataKey="valore" content={barEndLabel(formato(barre.unita))} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <Confronto kpi={r.kpi} giorni={giorni} />}
      </ChartCard>

      {/* ── Lettura del reparto ───────────────────────────────────────────── */}
      <ChartCard
        className="biop__read"
        index={3}
        title="Lettura del reparto"
        subtitle="Cosa dicono i grafici, in breve"
      >
        <ul className="biop__frasi">
          {frasi.map((f, i) => (
            <li key={i} className="biop__frase">
              <i className={`fa-solid ${i === 0 ? 'fa-chart-line' : 'fa-lightbulb'}`} aria-hidden="true" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </ChartCard>
    </>
  )
}

function Anello({ voci, unita, still }: { voci: PuntoBi[]; unita: UnitaBi; still: boolean }) {
  const tot = totale(voci)
  const fmt = formato(unita)
  if (tot <= 0) return <p className="biop__nessuno">Nessun dato nel periodo.</p>
  return (
    <div className="biop__donut">
      <div className="biop__donut-chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={voci} dataKey="valore" nameKey="etichetta"
              innerRadius="62%" outerRadius="88%" paddingAngle={2}
              stroke={CHART.surface} strokeWidth={2}
              isAnimationActive={!still} animationDuration={ANIM.duration} animationEasing={ANIM.easing}
            >
              {voci.map((v, i) => <Cell key={v.etichetta} fill={series(i)} />)}
            </Pie>
            <RTooltip content={<ChartTooltip format={fmt} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="biop__donut-center">
          <span className="biop__donut-val">{fmt(tot)}</span>
          <span className="biop__donut-lbl">in totale</span>
        </div>
      </div>
      <ul className="biop__legenda">
        {voci.map((v, i) => (
          <li key={v.etichetta} className="biop__legenda-voce">
            <span
              className="biop__legenda-dot"
              /* --c = colore della fetta (serie del grafico) */
              style={{ ['--c' as any]: series(i) }}
            />
            <TruncatedText text={v.etichetta} className="biop__legenda-nome" />
            <span className="biop__legenda-pct">{fmtPct((v.valore / tot) * 100, 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Confronto({ kpi, giorni }: { kpi: KpiBi[]; giorni: number }) {
  return (
    <ul className="biop__confronto">
      {kpi.map((k) => {
        const v = variazione(k)
        const fmt = formato(k.unita)
        return (
          <li key={k.chiave} className="biop__confronto-riga">
            <TruncatedText text={k.etichetta} className="biop__confronto-nome" />
            <span className="biop__confronto-val">{fmt(k.valore)}</span>
            <span className="biop__confronto-prec">
              {k.precedente != null ? `${fmt(k.precedente)} ${giorni} gg prima` : '—'}
            </span>
            {v !== undefined
              ? <DeltaBadge value={v} invert={PEGGIORA_SE_CRESCE.test(`${k.chiave} ${k.etichetta}`)} />
              : <span className="biop__confronto-prec">n.d.</span>}
          </li>
        )
      })}
    </ul>
  )
}
