import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import FlagCircle from '../../../core/components/FlagCircle'
import {
  ChartTooltip, DeltaBadge, Sparkline, CHART, ANIM, series,
  gridProps, xAxisProps, yAxisProps, fmtEur, fmtEurK, fmtInt, fmtDec,
} from '../../../core/bi'
import {
  usePraticheStore, STATO_PRATICA_META, STATO_PRATICA_FLOW, TIPOLOGIA_META,
  oreInGestione, praticheInRitardo, type StatoPratica,
} from '../../../store/usePraticheStore'
import { HomeToQuickLinks } from '../HomeToLinks/HomeToLinks'
import { useNomeProfilo } from '../HomeToLinks/useProfiloTO'
import {
  DESTINAZIONI, meteoDa, meteoFallback, PRENOTAZIONI, MERCATO, CAMBI_FALLBACK,
  CONTRATTI, NOTIZIE, EVENTI, type Meteo, type Cambio,
} from './homeTO.data'
import './HomeDashboardTO.sass'

// ─── HOME TOUR OPERATOR · versione dashboard ─────────────────────────────────
//  Home dei Tour Operator: riepilogo dell'attività
//  (pratiche, prenotazioni, contratti) e utility (meteo nelle destinazioni,
//  mercato e cambi, notizie, eventi). Niente riga di KPI in testa: i numeri
//  vivono dentro i rispettivi riquadri.

interface Props {
  navigate: (p: string) => void
}

const fmtData = (d: Date) =>
  d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

function saluto(h: number) {
  if (h < 13) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

// Colori: quelli di Platform (anche le pagine Tableau ora usano il blu Platform).
export default function HomeDashboardTO({ navigate }: Props) {
  const nome = useNomeProfilo()
  const oggi = new Date()

  return (
    <div className="htd">
      <PageHead
        back={false}
        title={nome ? `${saluto(oggi.getHours())}, ${nome}` : saluto(oggi.getHours())}
        subtitle={fmtData(oggi)}
      />
      <HomeToQuickLinks navigate={navigate} />

      <div className="htd__grid">
        <PraticheCard navigate={navigate} />
        <MeteoCard />
        <EventiCard />
        <PrenotazioniCard />
        <MercatoCard navigate={navigate} />
        <ContrattiCard navigate={navigate} />
        <NotizieCard />
      </div>
    </div>
  )
}

// ── Card base ─────────────────────────────────────────────────────────────────
function Card({ title, icon, actions, className, footer, children }: {
  title: string
  icon: string
  actions?: React.ReactNode
  className?: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className={clsx('htd-card', className)}>
      <header className="htd-card__head">
        <h2 className="htd-card__title">
          <i className={`fa-solid ${icon}`} aria-hidden="true" />
          {title}
        </h2>
        {actions && <div className="htd-card__actions">{actions}</div>}
      </header>
      <div className="htd-card__body">{children}</div>
      {footer && <footer className="htd-card__foot">{footer}</footer>}
    </section>
  )
}

function IconAction({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <Tooltip text={label}>
      <button type="button" className="htd-card__icon-btn" aria-label={label} onClick={onClick}>
        <i className={`fa-solid ${icon}`} />
      </button>
    </Tooltip>
  )
}

function LinkAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="htd-card__link" onClick={onClick}>
      {label} <i className="fa-solid fa-arrow-right" aria-hidden="true" />
    </button>
  )
}

// ── Pratiche ──────────────────────────────────────────────────────────────────
function PraticheCard({ navigate }: { navigate: (p: string) => void }) {
  const pratiche = usePraticheStore(s => s.pratiche)
  const slaHours = usePraticheStore(s => s.slaHours)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  const perStato = useMemo(() => {
    const acc = Object.fromEntries(STATO_PRATICA_FLOW.map(s => [s, 0])) as Record<StatoPratica, number>
    pratiche.forEach(p => { acc[p.stato] += 1 })
    return acc
  }, [pratiche])
  const totale = pratiche.length
  const ritardo = praticheInRitardo(pratiche, slaHours, now)
  const recenti = [...pratiche].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

  return (
    <Card
      title="Le tue pratiche"
      icon="fa-folder-open"
      className="htd__pratiche"
      actions={<>
        <IconAction label="Crea pratica" icon="fa-circle-plus" onClick={() => navigate('crea-pratica')} />
        <LinkAction label="Monitoraggio" onClick={() => navigate('monitoraggio-pratiche')} />
      </>}
    >
      {/* Distribuzione per stato: barra segmentata + legenda coi conteggi */}
      <div className="htd-stati">
        <div className="htd-stati__bar" role="img" aria-label="Pratiche per stato">
          {STATO_PRATICA_FLOW.map(s => perStato[s] > 0 && (
            <span
              key={s}
              className={`htd-stati__seg htd-tone--${STATO_PRATICA_META[s].tone}`}
              style={{ ['--grow' as any]: perStato[s] }}
            />
          ))}
        </div>
        <ul className="htd-stati__legend">
          {STATO_PRATICA_FLOW.map(s => (
            <li key={s}>
              <span className={`htd-stati__dot htd-tone--${STATO_PRATICA_META[s].tone}`} />
              {STATO_PRATICA_META[s].label} <strong>{perStato[s]}</strong>
            </li>
          ))}
          <li className="htd-stati__tot">Totale <strong>{totale}</strong></li>
        </ul>
      </div>

      {ritardo.length > 0 && (
        <button type="button" className="htd-alert" onClick={() => navigate('monitoraggio-pratiche')}>
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <span>
            {ritardo.length === 1 ? '1 pratica in attesa' : `${ritardo.length} pratiche in attesa`} da oltre {slaHours} h
          </span>
          <span className="htd-alert__cta">Accelera</span>
        </button>
      )}

      <div className="sib-table-wrap htd-table-wrap">
        <table className="sib-table htd-table">
          <colgroup>
            <col className="htd-col-34" /><col className="htd-col-18" /><col className="htd-col-18" />
            <col className="htd-col-14" /><col className="htd-col-16" />
          </colgroup>
          <thead>
            <tr><th>Destinazione</th><th>Cliente</th><th>Budget</th><th>Gestione</th><th>Stato</th></tr>
          </thead>
          <tbody>
            {recenti.map(p => {
              const ore = oreInGestione(p, now)
              return (
                <tr key={p.id}>
                  <td><TruncatedText text={p.destinazione} /></td>
                  <td>
                    <span className="htd-inline">
                      <i className={`fa-solid fa-${p.tipologia === 'gruppi' ? 'users' : 'user'} htd-ico`} aria-hidden="true" />
                      {TIPOLOGIA_META[p.tipologia].label}
                    </span>
                  </td>
                  <td className="htd-num">{fmtEur(p.budget, 0)}</td>
                  <td className="htd-num">{ore < 1 ? '< 1 h' : `${fmtInt(ore)} h`}</td>
                  <td>
                    <span className={`htd-badge htd-tone--${STATO_PRATICA_META[p.stato].tone}`}>
                      {STATO_PRATICA_META[p.stato].label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Meteo (Open-Meteo, senza chiave; ripiego locale se offline) ──────────────
function MeteoCard() {
  const [destId, setDestId] = useState(DESTINAZIONI[0].id)
  const dest = DESTINAZIONI.find(d => d.id === destId) ?? DESTINAZIONI[0]
  const [meteo, setMeteo] = useState<Meteo | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    let annullato = false
    const timer = setTimeout(() => ctrl.abort(), 5000)
    setMeteo(null)
    const url = 'https://api.open-meteo.com/v1/forecast'
      + `?latitude=${dest.lat}&longitude=${dest.lon}`
      + '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m'
      + '&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FRome&forecast_days=4'
    fetch(url, { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(j => setMeteo({
        temp: Math.round(j.current.temperature_2m),
        code: j.current.weather_code,
        vento: Math.round(j.current.wind_speed_10m),
        umidita: Math.round(j.current.relative_humidity_2m),
        live: true,
        giorni: (j.daily.time as string[]).slice(1, 4).map((t, i) => ({
          data: t,
          code: j.daily.weather_code[i + 1],
          max: Math.round(j.daily.temperature_2m_max[i + 1]),
          min: Math.round(j.daily.temperature_2m_min[i + 1]),
        })),
      }))
      .catch(() => { if (!annullato) setMeteo(meteoFallback(dest)) })
      .finally(() => clearTimeout(timer))
    return () => { annullato = true; clearTimeout(timer); ctrl.abort() }
  }, [dest])

  const now = meteo ? meteoDa(meteo.code) : null

  return (
    <Card title="Meteo" icon="fa-cloud-sun" className="htd__meteo">
      <div className="htd-seg" role="tablist" aria-label="Destinazione">
        {DESTINAZIONI.map(d => (
          <button
            key={d.id}
            type="button"
            role="tab"
            aria-selected={d.id === destId}
            className={clsx('htd-seg__btn', d.id === destId && 'is-active')}
            onClick={() => setDestId(d.id)}
          >
            {d.nome}
          </button>
        ))}
      </div>

      {!meteo || !now ? (
        <div className="htd-meteo__loading"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Caricamento…</div>
      ) : (
        <>
          <div className="htd-meteo__now">
            <i className={clsx('fa-duotone', now.ico, 'htd-meteo__ico', now.sole && 'is-sole')} aria-hidden="true" />
            <div>
              <div className="htd-meteo__temp">{meteo.temp}°</div>
              <div className="htd-meteo__desc">{now.desc}</div>
            </div>
          </div>
          <div className="htd-meteo__meta">
            <span><i className="fa-solid fa-wind" aria-hidden="true" /> {meteo.vento} km/h</span>
            <span><i className="fa-solid fa-droplet" aria-hidden="true" /> {meteo.umidita}%</span>
          </div>
          <ul className="htd-meteo__days">
            {meteo.giorni.map(g => {
              const m = meteoDa(g.code)
              const giorno = new Date(g.data + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short' })
              return (
                <li key={g.data}>
                  <span className="htd-meteo__day">{giorno}</span>
                  <Tooltip text={m.desc}><i className={clsx('fa-duotone', m.ico, m.sole && 'is-sole')} aria-hidden="true" /></Tooltip>
                  <span className="htd-meteo__range"><strong>{g.max}°</strong> {g.min}°</span>
                </li>
              )
            })}
          </ul>
          {!meteo.live && <p className="htd-note">Dati indicativi: servizio meteo non raggiungibile.</p>}
        </>
      )}
    </Card>
  )
}

// ── Eventi nelle destinazioni ─────────────────────────────────────────────────
function EventiCard() {
  return (
    <Card title="Eventi in arrivo" icon="fa-calendar-star" className="htd__eventi">
      <ul className="htd-eventi">
        {EVENTI.map(e => (
          <li key={e.id} className="htd-eventi__item">
            <span className="htd-eventi__date">
              <strong>{e.giorno}</strong>
              <span>{e.mese}</span>
            </span>
            <span className="htd-eventi__txt">
              <TruncatedText text={e.titolo} className="htd-eventi__title" />
              <span className="htd-eventi__dest"><i className="fa-solid fa-location-dot" aria-hidden="true" /> {e.dest}</span>
            </span>
            <Tooltip text={e.impatto === 'alto' ? 'Impatto alto su domanda e tariffe' : 'Impatto medio su domanda e tariffe'}>
              <span className={`htd-badge htd-tone--${e.impatto === 'alto' ? 'wait' : 'info'}`}>
                {e.impatto === 'alto' ? 'Alto' : 'Medio'}
              </span>
            </Tooltip>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ── Prenotazioni: ultimi 6 mesi vs anno precedente (un solo asse) ─────────────
function PrenotazioniCard() {
  const [metrica, setMetrica] = useState<'pratiche' | 'fatturato'>('fatturato')
  const ly = metrica === 'pratiche' ? 'praticheLy' : 'fatturatoLy'
  const fmt = metrica === 'pratiche' ? fmtInt : (v: number) => fmtEur(v, 0)
  const tot = PRENOTAZIONI.reduce((s, m) => s + m[metrica], 0)
  const totLy = PRENOTAZIONI.reduce((s, m) => s + m[ly], 0)
  const delta = ((tot - totLy) / totLy) * 100

  return (
    <Card
      title="Le tue prenotazioni"
      icon="fa-chart-column"
      className="htd__pren"
      actions={
        <div className="htd-seg htd-seg--sm" role="tablist" aria-label="Metrica">
          {(['fatturato', 'pratiche'] as const).map(m => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={metrica === m}
              className={clsx('htd-seg__btn', metrica === m && 'is-active')}
              onClick={() => setMetrica(m)}
            >
              {m === 'fatturato' ? 'Fatturato' : 'Pratiche'}
            </button>
          ))}
        </div>
      }
    >
      <div className="htd-pren__sum">
        <span className="htd-pren__tot">{metrica === 'pratiche' ? fmtInt(tot) : fmtEurK(tot)}</span>
        <span className="htd-pren__lbl">ultimi 6 mesi</span>
        <DeltaBadge value={Number(delta.toFixed(1))} label={`${delta >= 0 ? '+' : '−'}${fmtDec(Math.abs(delta))}% vs anno prec.`} size="sm" />
        <ul className="htd-legend">
          <li><span className="htd-legend__sw htd-legend__sw--cur" />2026</li>
          <li><span className="htd-legend__sw htd-legend__sw--ly" />2025</li>
        </ul>
      </div>
      <div className="htd-pren__chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={PRENOTAZIONI} barGap={3} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="mese" {...xAxisProps} />
            <YAxis {...yAxisProps} width={60} tickFormatter={metrica === 'pratiche' ? fmtInt : fmtEurK} />
            <RTooltip
              cursor={{ fill: CHART.grid }}
              content={<ChartTooltip names={{ [metrica]: '2026', [ly]: '2025' }} format={fmt} />}
            />
            <Bar dataKey={ly} fill={CHART.ly} radius={[3, 3, 0, 0]} animationDuration={ANIM.duration} />
            <Bar dataKey={metrica} fill={series(0)} radius={[3, 3, 0, 0]} animationDuration={ANIM.duration} animationBegin={ANIM.begin(1)} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ── Mercato: tariffe medie per destinazione + cambi (Frankfurter, senza chiave) ─
function MercatoCard({ navigate }: { navigate: (p: string) => void }) {
  const [cambi, setCambi] = useState<Cambio[]>(CAMBI_FALLBACK)
  const [live, setLive] = useState(false)
  useEffect(() => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    fetch('https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,GBP,CHF,JPY', { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(j => {
        setCambi(CAMBI_FALLBACK.map(c => ({ ...c, valore: j.rates?.[c.valuta] ?? c.valore })))
        setLive(true)
      })
      .catch(() => { /* restano i valori di ripiego */ })
      .finally(() => clearTimeout(timer))
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [])

  return (
    <Card
      title="Dati di mercato"
      icon="fa-magnifying-glass-chart"
      className="htd__mercato"
      actions={<LinkAction label="Market lens" onClick={() => navigate('market-lens')} />}
      footer={
        <div className="htd-cambi">
          <Tooltip text={live ? 'Cambi BCE aggiornati' : 'Cambi indicativi'}>
            <span className="htd-cambi__lbl"><i className="fa-solid fa-euro-sign" aria-hidden="true" /> 1 € =</span>
          </Tooltip>
          {cambi.map(c => (
            <Tooltip key={c.valuta} text={c.label}>
              <span className="htd-cambi__item">
                <strong>{c.valore.toLocaleString('it-IT', { maximumFractionDigits: c.valore > 10 ? 1 : 3 })}</strong> {c.valuta}
              </span>
            </Tooltip>
          ))}
        </div>
      }
    >
      <div className="sib-table-wrap htd-table-wrap">
        <table className="sib-table htd-table">
          <colgroup>
            <col className="htd-col-24" /><col className="htd-col-20" /><col className="htd-col-18" />
            <col className="htd-col-18" /><col className="htd-col-20" />
          </colgroup>
          <thead>
            <tr>
              <th>Destinazione</th>
              <th><TruncatedText text="Tariffa media" full="Tariffa media camera doppia BB, prossimi 30 giorni" /></th>
              <th><TruncatedText text="Var. 7 gg" full="Variazione della tariffa media negli ultimi 7 giorni" /></th>
              <th><TruncatedText text="Occupazione" full="Occupazione media prevista della destinazione" /></th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {MERCATO.map(m => (
              <tr key={m.dest}>
                <td><TruncatedText text={m.dest} /></td>
                <td className="htd-num">{fmtEur(m.adr, 0)}</td>
                <td><DeltaBadge value={m.deltaAdr} size="sm" /></td>
                <td>
                  <span className="htd-occ">
                    <span className="htd-occ__bar"><span className="htd-occ__fill" style={{ ['--occ' as any]: `${m.occ}%` }} /></span>
                    <span className="htd-num">{m.occ}%</span>
                  </span>
                </td>
                <td className="htd-spark">
                  <Sparkline values={m.trend} height={24} color={m.deltaAdr >= 0 ? CHART.good : CHART.bad} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Contratti gestiti con le strutture ────────────────────────────────────────
function ContrattiCard({ navigate }: { navigate: (p: string) => void }) {
  return (
    <Card
      title="Contratti gestiti"
      icon="fa-handshake"
      className="htd__contratti"
      actions={<>
        <IconAction label="Inserisci contratto" icon="fa-circle-plus" onClick={() => navigate('inserisci-contratto-a')} />
        <LinkAction label="Tutti i contratti" onClick={() => navigate('miei-contratti-a')} />
      </>}
    >
      <div className="sib-table-wrap htd-table-wrap">
        <table className="sib-table htd-table">
          <colgroup>
            <col className="htd-col-30" /><col className="htd-col-14" /><col className="htd-col-24" />
            <col className="htd-col-16" /><col className="htd-col-8" /><col className="htd-col-8" />
          </colgroup>
          <thead>
            <tr>
              <th>Struttura</th>
              <th>Città</th>
              <th>Periodo</th>
              <th>Tariffe</th>
              <th><TruncatedText text="Allot." full="Allotment (camere)" /></th>
              <th><TruncatedText text="Naz." full="Nazione" /></th>
            </tr>
          </thead>
          <tbody>
            {CONTRATTI.map(c => (
              <tr key={c.id}>
                <td><TruncatedText text={c.struttura} /></td>
                <td><TruncatedText text={c.citta} /></td>
                <td><TruncatedText text={`${c.dal} – ${c.al}`} /></td>
                <td><TruncatedText text={c.tariffa} /></td>
                <td className="htd-num">{c.allotment}</td>
                <td><FlagCircle code={c.paese} size={18} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Notizie dal mondo del turismo ─────────────────────────────────────────────
function NotizieCard() {
  return (
    <Card title="Notizie dal turismo" icon="fa-newspaper" className="htd__notizie">
      <ul className="htd-news">
        {NOTIZIE.map(n => (
          <li key={n.id} className="htd-news__item">
            <div className="htd-news__meta">
              <span className="htd-news__tag">{n.tag}</span>
              <span className="htd-news__time">{n.ore === 1 ? '1 ora fa' : `${n.ore} ore fa`}</span>
            </div>
            <h3 className="htd-news__title">{n.titolo}</h3>
            <p className="htd-news__txt">{n.testo}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
