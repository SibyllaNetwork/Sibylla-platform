import React, { useEffect, useMemo, useState } from 'react'
import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHead from '../../../../core/components/PageHead'
import Card from '../../../../core/components/Card'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import { InputField, SelectField } from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import {
  ANIM, CHART, ChartTooltip, Sparkline, cursorProps, gridProps, reducedMotion, series, useCountUp,
  xAxisProps, yAxisProps,
} from '../../../../core/bi'
import { hashNome } from '../../../../core/demo/struttureDemo'
import { useStrutturaPagina } from '../../../../hooks/useStrutturaCorrente'
import './PricingBenchmark.sass'

// ─── PRICING BENCHMARK ────────────────────────────────────────────────────────
//  Raffronto con i competitor su prezzo (tariffe pubblicate per data di
//  soggiorno, prossimi 30/60/90 giorni) e brand reputation (voto Booking,
//  ultimi 30/60/90 giorni). Il tuo hotel è la linea piena con l'area sfumata;
//  la lista di monitoraggio fa da legenda (passandoci sopra si evidenzia la
//  serie, il pallino la nasconde). Sotto: classifica del periodo e competitor
//  in zona su Google Maps (embed senza chiave: un hotel cliccato centra la
//  mappa su di lui). Dati demo deterministici, in attesa del rate shopper.

type Lente = 'pricing' | 'brand'
type Periodo = 30 | 60 | 90

interface Hotel { id: string; nome: string; addr: string; stelle: number; voto: number; km: number; base: number }

const VICINI: Hotel[] = [
  { id: 'villa-grazioli', nome: 'Villa Grazioli Boutique Hotel', addr: 'Via Salaria 241, Roma',              stelle: 4, voto: 8.9, km: 0.4, base: 168 },
  { id: 'panama-garden',  nome: 'Hotel Panama Garden',           addr: 'Via Salaria 336, Roma',              stelle: 4, voto: 8.6, km: 0.7, base: 142 },
  { id: 'buenos-aires',   nome: 'Buenos Aires Hotel',            addr: 'Via Clitunno 9, Roma',               stelle: 4, voto: 8.4, km: 0.9, base: 128 },
  { id: 'parco-principi', nome: 'Grand Hotel Parco dei Principi', addr: 'Via Gerolamo Frescobaldi 5, Roma',  stelle: 5, voto: 8.8, km: 1.2, base: 238 },
  { id: 'villa-glori',    nome: 'Hotel Villa Glori',             addr: 'Viale del Vignola 25, Roma',         stelle: 4, voto: 8.7, km: 1.6, base: 152 },
  { id: 'degli-aranci',   nome: 'Hotel degli Aranci',            addr: 'Via Barnaba Oriani 11, Roma',        stelle: 4, voto: 8.5, km: 1.8, base: 139 },
  { id: 'ambasciatori',   nome: 'Hotel Ambasciatori Palace',     addr: 'Via Vittorio Veneto 62, Roma',       stelle: 5, voto: 8.3, km: 1.9, base: 214 },
  { id: 'lord-byron',     nome: 'Hotel Lord Byron',              addr: 'Via Giuseppe De Notaris 5, Roma',    stelle: 5, voto: 9.1, km: 2.0, base: 265 },
  { id: 'albani',         nome: 'Hotel Albani Roma',             addr: 'Via Adda 45, Roma',                  stelle: 4, voto: 8.2, km: 0.6, base: 134 },
]
const PER_ID = Object.fromEntries(VICINI.map(h => [h.id, h]))

// Massimo 7 competitor: uno slot di palette ciascuno (lo slot 0 resta libero,
// il tuo hotel è sempre nel colore primario)
const MAX_MONITOR = 7
const INIZIALI = ['villa-grazioli', 'panama-garden', 'buenos-aires', 'villa-glori', 'degli-aranci']

const PERIODI: Periodo[] = [30, 60, 90]
const LENTI: { value: Lente; label: string; icon: string }[] = [
  { value: 'pricing', label: 'Pricing',          icon: 'fa-chart-line' },
  { value: 'brand',   label: 'Brand reputation', icon: 'fa-star' },
]

const eur = (n: number) => `${Math.round(n).toLocaleString('it-IT')} €`
const voto = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt = (l: Lente, n: number) => (l === 'pricing' ? eur(n) : voto(n))

/** Valore giornaliero (deterministico) di un hotel: d = giorni da oggi. */
function valore(l: Lente, id: string, base: number, rating: number, d: number): number {
  const seme = hashNome(id)
  const rumore = (hashNome(`${id}:${d}`) % 11) - 5
  if (l === 'brand') {
    const v = rating + 0.12 * Math.sin((d + seme) / 11) + rumore / 120
    return Math.min(10, Math.round(v * 100) / 100)
  }
  const giorno = new Date(Date.now() + d * 864e5).getDay()
  const weekend = giorno === 5 || giorno === 6 ? 0.15 : 0
  return Math.round(base * (1 + weekend + 0.08 * Math.sin((d + seme) / 9) + rumore / 100))
}

const mapsEmbed = (q: string, z: number) => `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${z}&hl=it&output=embed`
const mapsLink = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`

const Stelle = ({ n }: { n: number }) => (
  <span className="pbm__stars" aria-label={`${n} stelle`}>
    {Array.from({ length: n }, (_, i) => <i key={i} className="fa-solid fa-star" aria-hidden="true" />)}
  </span>
)

/** Numero che conta fino al valore (effetto d'ingresso e al cambio filtri). */
function Conta({ v, lente, className }: { v: number; lente: Lente; className?: string }) {
  const n = useCountUp(v)
  return <span className={className}>{fmt(lente, n)}</span>
}

export default function PricingBenchmark({ navigate }: { navigate: (p: string) => void }) {
  const confirm = useConfirmStore(s => s.confirm)
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()

  const [zona, setZona] = useState('00198 Roma')
  const [zonaMappa, setZonaMappa] = useState(zona)
  const [paese, setPaese] = useState('Italia')
  const [lente, setLente] = useState<Lente>('pricing')
  const [periodo, setPeriodo] = useState<Periodo>(30)
  const [monitor, setMonitor] = useState(() => INIZIALI.map((id, i) => ({ id, slot: i + 1 })))
  const [nascosti, setNascosti] = useState<string[]>([])
  const [focus, setFocus] = useState<string | null>(null)
  const [selMappa, setSelMappa] = useState<string | null>(null)
  const [mappaPronta, setMappaPronta] = useState(false)
  const [nuovo, setNuovo] = useState<string | null>(null)

  // La mappa segue il campo «Trova hotel» con un piccolo ritardo (niente
  // ricarica dell'iframe a ogni tasto)
  useEffect(() => {
    const t = setTimeout(() => { setZonaMappa(zona); setSelMappa(null) }, 700)
    return () => clearTimeout(t)
  }, [zona])

  const sel = selMappa ? PER_ID[selMappa] : null
  const queryMappa = sel ? `${sel.nome}, ${sel.addr}` : `hotel ${zonaMappa}, ${paese}`
  const srcMappa = mapsEmbed(queryMappa, sel ? 16 : 14)
  useEffect(() => { setMappaPronta(false) }, [srcMappa])

  // Il tuo hotel: valori demo derivati dal nome
  const hMe = hashNome(struttura || 'struttura')
  const me = { id: 'me', nome: struttura, base: 125 + (hMe % 55), voto: 8.3 + (hMe % 7) / 10 }

  const competitor = monitor.map(m => ({ ...PER_ID[m.id], slot: m.slot }))
  const visibili = competitor.filter(c => !nascosti.includes(c.id))

  // Serie per il grafico: pricing in avanti (date di soggiorno), reputazione
  // all'indietro (voti ricevuti)
  const dati = useMemo(() => Array.from({ length: periodo }, (_, i) => {
    const d = lente === 'pricing' ? i : i - periodo + 1
    const dt = new Date(Date.now() + d * 864e5)
    const riga: Record<string, number | string> = {
      lbl: `${dt.getDate()}/${dt.getMonth() + 1}`,
      me: valore(lente, 'me' + struttura, me.base, me.voto, d),
    }
    let somma = 0
    competitor.forEach(c => {
      const v = valore(lente, c.id, c.base, c.voto, d)
      riga[c.id] = v
      if (!nascosti.includes(c.id)) somma += v
    })
    if (visibili.length) riga.media = Math.round((somma / visibili.length) * 100) / 100
    return riga
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [lente, periodo, struttura, monitor, nascosti])

  const media = (key: string) => dati.reduce((s, r) => s + (r[key] as number), 0) / (dati.length || 1)
  const spark = (key: string) => dati.map(r => r[key] as number)

  const mediaMe = media('me')
  const classifica = [
    { id: 'me', nome: struttura, v: mediaMe, colore: 'var(--color-primary)' },
    ...competitor.map(c => ({ id: c.id, nome: c.nome, v: media(c.id), colore: series(c.slot) })),
  ].sort((a, b) => b.v - a.v)
  const posizione = classifica.findIndex(r => r.id === 'me') + 1
  const mediaMercato = visibili.length ? visibili.reduce((s, c) => s + media(c.id), 0) / visibili.length : mediaMe
  const scarto = lente === 'pricing' ? ((mediaMe - mediaMercato) / mediaMercato) * 100 : mediaMe - mediaMercato
  const maxV = Math.max(...classifica.map(r => r.v))
  const minV = Math.min(...classifica.map(r => r.v))
  const larghezza = (v: number) => (lente === 'pricing' ? v / maxV : (v - (minV - 0.4)) / (maxV - (minV - 0.4)))

  const pos = useCountUp(posizione, 700)
  const deltaTesto = (v: number) => (lente === 'pricing'
    ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`
    : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pt`)
  const versoMe = (v: number) => (lente === 'pricing' ? ((v - mediaMe) / mediaMe) * 100 : v - mediaMe)

  const aggiungi = (h: Hotel) => {
    if (monitor.some(m => m.id === h.id) || monitor.length >= MAX_MONITOR) return
    const usati = monitor.map(m => m.slot)
    const slot = [1, 2, 3, 4, 5, 6, 7].find(s => !usati.includes(s)) ?? 7
    setMonitor(m => [...m, { id: h.id, slot }])
    setNuovo(h.id)
    setTimeout(() => setNuovo(n => (n === h.id ? null : n)), 1400)
    toast.success(`${h.nome} aggiunto alla lista di monitoraggio`)
  }

  const rimuovi = async (h: Hotel) => {
    const ok = await confirm({
      title: 'Rimuovi dal monitoraggio',
      message: `Rimuovere «${h.nome}» dalla lista di monitoraggio?`,
      confirmLabel: 'Rimuovi',
      cancelLabel: 'Annulla',
      danger: true,
    })
    if (!ok) return
    setMonitor(m => m.filter(x => x.id !== h.id))
    setNascosti(n => n.filter(x => x !== h.id))
    if (focus === h.id) setFocus(null)
  }

  const toggleVisibile = (id: string) =>
    setNascosti(n => (n.includes(id) ? n.filter(x => x !== id) : [...n, id]))

  // Opacità della serie: chi è in focus resta piena, le altre si spengono
  const op = (id: string) => (focus && focus !== id ? 0.12 : 1)
  const animato = !reducedMotion()
  const nomi: Record<string, string> = { me: struttura, media: 'Media competitor', ...Object.fromEntries(competitor.map(c => [c.id, c.nome])) }

  return (
    <div className="pbm">
      <PageHead title="Pricing Benchmark" subtitle="Raffronto con i competitor su pricing e brand reputation" />

      {/* ── Filtri ─────────────────────────────────────────────────────── */}
      <div className="pbm__toolbar">
        <div className="pbm__filters">
          <InputField name="zona" label="Trova hotel" value={zona} onChange={e => setZona(e.target.value)}
            placeholder="CAP o indirizzo" iconLeft="fa-solid fa-location-dot" className="pbm__zona" />
          <SelectField name="paese" label="Paese" value={paese} onChange={e => setPaese(e.target.value)}
            options={['Italia', 'Francia', 'Spagna', 'Germania'].map(p => ({ value: p, label: p }))} className="pbm__paese" />
          <SelectField name="struttura" label="Struttura" value={struttura} onChange={e => setStruttura(e.target.value)}
            options={opzioniStrutture} className="pbm__struttura" />
        </div>
        <div className="pbm__switches">
          <div className="pbm__seg" role="tablist" aria-label="Vista">
            {LENTI.map(l => (
              <button key={l.value} type="button" role="tab" aria-selected={lente === l.value}
                className={lente === l.value ? 'is-on' : ''} onClick={() => setLente(l.value)}>
                <i className={`fa-solid ${l.icon}`} aria-hidden="true" /> {l.label}
              </button>
            ))}
          </div>
          <div className="pbm__seg" role="tablist" aria-label="Periodo">
            {PERIODI.map(p => (
              <button key={p} type="button" role="tab" aria-selected={periodo === p}
                className={periodo === p ? 'is-on' : ''} onClick={() => setPeriodo(p)}>
                {p} giorni
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pbm__grid">
        {/* ── Andamento ──────────────────────────────────────────────────── */}
        <section className="pbm__card pbm__card--chart pbm__rise">
          <header className="pbm__chart-head">
            <div className="pbm__hero">
              <span className="pbm__rank" aria-label={`Posizione ${posizione}`}>
                {Math.max(1, Math.round(pos))}<sup>°</sup>
              </span>
              <div className="pbm__hero-txt">
                <span className="pbm__hero-title">
                  {lente === 'pricing' ? 'per prezzo medio' : 'per reputazione'} su {classifica.length} hotel
                </span>
                <span className="pbm__hero-sub">
                  <Conta key={lente} v={mediaMe} lente={lente} className="pbm__hero-val" />
                  <span className={`pbm__delta ${scarto >= 0 ? 'is-up' : 'is-down'}`}>
                    <i className={`fa-solid ${scarto >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} aria-hidden="true" />
                    {deltaTesto(scarto)} vs media competitor
                  </span>
                </span>
              </div>
            </div>
            <div className="pbm__chart-meta">
              <span className="pbm__chip">
                <i className="fa-solid fa-calendar-days" aria-hidden="true" />
                {lente === 'pricing' ? `Prossimi ${periodo} giorni` : `Ultimi ${periodo} giorni`}
              </span>
              <span className="pbm__chip">
                <i className="fa-solid fa-signal-stream" aria-hidden="true" />
                {lente === 'pricing' ? 'Tariffa BAR, camera doppia' : 'Voto Booking.com'}
              </span>
            </div>
          </header>

          <div className="pbm__chart" key={`${lente}-${periodo}`}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dati} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pbm-me-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="lbl" {...xAxisProps} interval="preserveStartEnd" />
                <YAxis {...yAxisProps} domain={['auto', 'auto']}
                  tickFormatter={(v: number) => (lente === 'pricing' ? `${v} €` : v.toLocaleString('it-IT', { minimumFractionDigits: 1 }))} />
                <RTooltip cursor={cursorProps}
                  content={(p: any) => <ChartTooltip {...p} names={nomi} format={(v: number) => fmt(lente, v)} />} />
                {visibili.map((c, i) => (
                  <Line key={c.id} dataKey={c.id} type="monotone" stroke={series(c.slot)} strokeWidth={focus === c.id ? 2.6 : 1.5}
                    strokeOpacity={op(c.id)} dot={false} activeDot={{ r: 4 }}
                    isAnimationActive={animato} animationBegin={ANIM.begin(i + 1)} animationDuration={ANIM.duration} />
                ))}
                {visibili.length > 0 && (
                  <Line dataKey="media" type="monotone" stroke={CHART.ly} strokeDasharray="5 4" strokeWidth={1.5}
                    strokeOpacity={focus ? 0.12 : 1} dot={false} activeDot={false}
                    isAnimationActive={animato} animationDuration={ANIM.duration} />
                )}
                <Area dataKey="me" type="monotone" stroke="var(--color-primary)" strokeWidth={3} fill="url(#pbm-me-grad)"
                  fillOpacity={focus && focus !== 'me' ? 0.25 : 1} strokeOpacity={op('me')} className="pbm__me-line"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive={animato} animationDuration={ANIM.duration + 300} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Lista di monitoraggio (fa da legenda del grafico) ──────────── */}
        <section className="pbm__card pbm__card--list pbm__rise">
          <header className="pbm__card-head">
            <h3 className="pbm__card-title">Lista di monitoraggio</h3>
            <span className="pbm__count">{monitor.length}/{MAX_MONITOR}</span>
          </header>
          <ul className="pbm__mon" onMouseLeave={() => setFocus(null)}>
            <li className="pbm__mon-row pbm__mon-row--me" onMouseEnter={() => setFocus('me')}>
              <span className="pbm__swatch pbm__swatch--me" aria-hidden="true" />
              <div className="pbm__mon-main">
                <TruncatedText text={struttura} className="pbm__mon-name" />
                <span className="pbm__mon-sub"><i className="fa-solid fa-house-flag" aria-hidden="true" /> Il tuo hotel</span>
              </div>
              <Sparkline values={spark('me')} color="var(--color-primary)" height={30} className="pbm__mon-spark" />
              <div className="pbm__mon-val">
                <Conta key={lente} v={mediaMe} lente={lente} />
              </div>
            </li>
            {competitor.map((c, i) => {
              const nascosto = nascosti.includes(c.id)
              const dv = versoMe(media(c.id))
              return (
                <li key={c.id}
                  className={`pbm__mon-row ${nascosto ? 'is-off' : ''} ${nuovo === c.id ? 'is-new' : ''} ${focus === c.id ? 'is-focus' : ''}`}
                  style={{ ['--serie' as any]: series(c.slot), ['--i' as any]: i } as React.CSSProperties}
                  onMouseEnter={() => !nascosto && setFocus(c.id)}>
                  <Tooltip text={nascosto ? 'Mostra nel grafico' : 'Nascondi dal grafico'}>
                    <button type="button" className="pbm__swatch" onClick={() => toggleVisibile(c.id)}
                      aria-pressed={!nascosto} aria-label={`${nascosto ? 'Mostra' : 'Nascondi'} ${c.nome}`} />
                  </Tooltip>
                  <div className="pbm__mon-main">
                    <TruncatedText text={c.nome} className="pbm__mon-name" />
                    <span className="pbm__mon-sub">{c.stelle}<i className="fa-solid fa-star pbm__mon-star" aria-label="stelle" /> · {c.km.toLocaleString('it-IT')} km</span>
                  </div>
                  <Sparkline values={spark(c.id)} color={series(c.slot)} height={30} delay={i * 80} className="pbm__mon-spark" />
                  <div className="pbm__mon-val">
                    <Conta key={lente} v={media(c.id)} lente={lente} />
                    <span className={`pbm__mon-delta ${dv >= 0 ? 'is-up' : 'is-down'}`}>{deltaTesto(dv)}</span>
                  </div>
                  <Tooltip text="Rimuovi">
                    <button type="button" className="pbm__icon-btn" onClick={() => rimuovi(c)} aria-label={`Rimuovi ${c.nome}`}>
                      <i className="fa-solid fa-trash" aria-hidden="true" />
                    </button>
                  </Tooltip>
                </li>
              )
            })}
            {competitor.length === 0 && (
              <li className="pbm__empty">Aggiungi i competitor dalla mappa qui sotto.</li>
            )}
          </ul>
          <div className="pbm__legend-avg">
            <span className="pbm__avg-line" aria-hidden="true" /> Media competitor visibili
            <strong><Conta key={lente} v={mediaMercato} lente={lente} /></strong>
          </div>
        </section>

        {/* ── Competitor in zona: Google Maps + elenco ───────────────────── */}
        <section className="pbm__card pbm__card--map pbm__rise">
          <header className="pbm__card-head">
            <h3 className="pbm__card-title">Competitor in zona</h3>
            <a className="pbm__ext" href={mapsLink(queryMappa)} target="_blank" rel="noreferrer">
              Apri in Google Maps <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
            </a>
          </header>
          <div className="pbm__zone">
            <ul className="pbm__near">
              {VICINI.map(h => {
                const presente = monitor.some(m => m.id === h.id)
                const pieno = !presente && monitor.length >= MAX_MONITOR
                return (
                  <li key={h.id} className={`pbm__near-row ${selMappa === h.id ? 'is-sel' : ''}`}>
                    <button type="button" className="pbm__near-main" onClick={() => setSelMappa(s => (s === h.id ? null : h.id))}
                      aria-pressed={selMappa === h.id}>
                      <span className="pbm__pin" aria-hidden="true"><i className="fa-solid fa-location-dot" /></span>
                      <span className="pbm__near-txt">
                        <TruncatedText text={h.nome} className="pbm__near-name" />
                        <TruncatedText text={h.addr} className="pbm__near-addr" />
                      </span>
                      <span className="pbm__near-meta">
                        <span className="pbm__score">{h.voto.toLocaleString('it-IT', { minimumFractionDigits: 1 })}</span>
                        <span className="pbm__near-km">{h.km.toLocaleString('it-IT')} km</span>
                      </span>
                    </button>
                    {presente ? (
                      <Tooltip text="Già in monitoraggio">
                        <span className="pbm__added" aria-label="Già in monitoraggio"><i className="fa-solid fa-circle-check" aria-hidden="true" /></span>
                      </Tooltip>
                    ) : (
                      <Tooltip text={pieno ? `Massimo ${MAX_MONITOR} hotel` : 'Aggiungi al monitoraggio'}>
                        <button type="button" className="pbm__icon-btn pbm__add" disabled={pieno} onClick={() => aggiungi(h)}
                          aria-label={`Aggiungi ${h.nome}`}>
                          <i className="fa-solid fa-circle-plus" aria-hidden="true" />
                        </button>
                      </Tooltip>
                    )}
                  </li>
                )
              })}
            </ul>
            <div className={`pbm__map ${mappaPronta ? 'is-ready' : ''}`}>
              <iframe key={srcMappa} title="Mappa competitor" src={srcMappa} loading="lazy"
                referrerPolicy="no-referrer-when-downgrade" onLoad={() => setMappaPronta(true)} />
              {sel && (
                <div className="pbm__map-card">
                  <Stelle n={sel.stelle} />
                  <strong>{sel.nome}</strong>
                  <span>{sel.addr}</span>
                  <button type="button" className="pbm__map-reset" onClick={() => setSelMappa(null)}>
                    <i className="fa-solid fa-expand" aria-hidden="true" /> Tutta la zona
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Classifica del periodo ─────────────────────────────────────── */}
        <section className="pbm__card pbm__card--rank pbm__rise">
          <header className="pbm__card-head">
            <h3 className="pbm__card-title">Classifica</h3>
            <span className="pbm__card-note">{lente === 'pricing' ? 'Prezzo medio del periodo' : 'Voto medio del periodo'}</span>
          </header>
          <ol className="pbm__ladder" key={`${lente}-${periodo}`}>
            {classifica.map((r, i) => (
              <li key={r.id} className={`pbm__step ${r.id === 'me' ? 'is-me' : ''} ${focus === r.id ? 'is-focus' : ''}`}
                style={{ ['--w' as any]: larghezza(r.v), ['--serie' as any]: r.colore, ['--i' as any]: i } as React.CSSProperties}
                onMouseEnter={() => setFocus(r.id)} onMouseLeave={() => setFocus(null)}>
                <span className="pbm__step-n">{i + 1}</span>
                <div className="pbm__step-body">
                  <div className="pbm__step-top">
                    <TruncatedText text={r.nome} className="pbm__step-name" />
                    {r.id === 'me' && <span className="pbm__you">Tu</span>}
                    <span className="pbm__step-val">{fmt(lente, r.v)}</span>
                  </div>
                  <span className="pbm__bar"><span className="pbm__bar-fill" /></span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
