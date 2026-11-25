import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts'
import PageHead from '../../../core/components/PageHead'
import { SearchField } from '../../../core/components/form'
import TruncatedText from '../../../core/components/TruncatedText'
import {
  ANIM, CHART, ChartCard, ChartTooltip, DeltaBadge, KpiTile, fmtAxisNum, gridProps, reducedMotion, series,
} from '../../../core/bi'
import { useStrutturaCorrente } from '../../../hooks/useStrutturaCorrente'
import {
  DIMENSIONI, METRICHE, calcola, delta, formatta, interpreta,
  type Fonte, type Nodo, type Risposta,
} from './dtMotore'
import './DecisionTree.sass'

// ─── DECISION TREE ──────────────────────────────────────────────────────────────
//  Pagina bianca con una search bar al centro: l'utente scrive una domanda sui
//  dati ("qual è la camera che fa più margine?") e Sibylla costruisce una BI
//  dedicata: risposta, KPI, albero (domanda → primo livello → secondo livello,
//  col percorso migliore evidenziato) e grafico con il confronto sull'anno prima.
//  L'interprete è Claude Haiku 5.5 via /api/decision-tree (chiave solo sul
//  server); senza chiave, o in sviluppo, l'interprete locale. I numeri li
//  calcola sempre `dtMotore` dai dati di Sibylla.

type Stato =
  | { tipo: 'vuota' }
  | { tipo: 'pensa'; domanda: string }
  | { tipo: 'risposta'; domanda: string; risposta: Risposta; fonte: Fonte }
  | { tipo: 'noncapita'; domanda: string; nota: string; fonte: Fonte }

const PASSI_ATTESA = ['Leggo la domanda…', 'Interrogo Sales & Marketing e Finance…', 'Costruisco la risposta…']
const ATTESA_MIN_MS = 1200

export default function DecisionTree({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const { elenco: elencoOrg, struttura } = useStrutturaCorrente()
  const elenco = useMemo(() => (elencoOrg.length ? elencoOrg : [struttura]), [elencoOrg, struttura])
  const [testo, setTesto] = useState('')
  const [stato, setStato] = useState<Stato>({ tipo: 'vuota' })
  const [passo, setPasso] = useState(0)
  const corrente = useRef(0)

  const suggerimenti = useMemo(() => {
    const altra = elenco[1] ?? elenco[0]
    return [
      'Qual è la camera che sta generando più margine?',
      `Come stanno andando le vendite corporate di ${altra}?`,
      elenco.length > 1 ? "Quale struttura fa più utile rispetto all'anno scorso?" : "Quale segmento fa più utile rispetto all'anno scorso?",
      'Dove perdo margine con i tour operator?',
      'Quale segmento ha il prezzo medio più alto?',
      'Quante notti vendiamo per tipologia di camera?',
    ]
  }, [elenco])

  const chiedi = useCallback(async (domanda: string) => {
    const q = domanda.trim()
    if (!q) return
    setTesto(q)
    const id = ++corrente.current
    setStato({ tipo: 'pensa', domanda: q })
    setPasso(0)
    const [esito] = await Promise.all([
      interpreta(q, elenco),
      new Promise(r => window.setTimeout(r, reducedMotion() ? 0 : ATTESA_MIN_MS)),
    ])
    if (id !== corrente.current) return
    const { piano, fonte } = esito
    if (!piano.comprensibile) setStato({ tipo: 'noncapita', domanda: q, nota: piano.nota, fonte })
    else setStato({ tipo: 'risposta', domanda: q, risposta: calcola(piano, elenco), fonte })
  }, [elenco])

  // Passi dell'attesa ("spinnerino di Sibilla")
  useEffect(() => {
    if (stato.tipo !== 'pensa') return
    const t = window.setInterval(() => setPasso(p => Math.min(p + 1, PASSI_ATTESA.length - 1)), 450)
    return () => window.clearInterval(t)
  }, [stato.tipo])

  // Cambia la struttura in alto: la risposta si ricalcola sullo stesso piano
  useEffect(() => {
    setStato(s => (s.tipo === 'risposta' ? { ...s, risposta: calcola(s.risposta.piano, elenco) } : s))
  }, [elenco])

  const vuota = stato.tipo === 'vuota'
  const ricomincia = () => { corrente.current++; setTesto(''); setStato({ tipo: 'vuota' }) }

  const barra = (
    <form className={`dtq__barra ${vuota ? 'dtq__barra--grande' : ''}`} role="search"
      onSubmit={e => { e.preventDefault(); chiedi(testo) }}>
      <SearchField
        name="dtq-domanda"
        value={testo}
        placeholder="Fai una domanda sui tuoi dati, ad esempio: qual è la camera che fa più margine?"
        loading={stato.tipo === 'pensa'}
        onChange={e => setTesto(e.target.value)}
        onSearch={v => chiedi(v)}
        onClear={() => setTesto('')}
        className="dtq__search"
      />
      <button type="submit" className="sib-btn sib-btn--primary dtq__chiedi" disabled={!testo.trim() || stato.tipo === 'pensa'}>
        <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Chiedi a Sibylla
      </button>
    </form>
  )

  return (
    <div className={`dtq ${vuota ? 'dtq--vuota' : ''}`}>
      <PageHead
        title="Decision tree"
        subtitle="Fai una domanda sui tuoi dati: Sibylla costruisce la risposta"
        actions={!vuota ? (
          <button type="button" className="sib-btn sib-btn--ghost" onClick={ricomincia}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuova domanda
          </button>
        ) : undefined}
      />

      {vuota ? (
        <section className="dtq__hero">
          <AlberoDecorativo />
          <h2 className="dtq__hero-tit">Cosa vuoi sapere?</h2>
          <p className="dtq__hero-sub">
            Chiedi come vanno vendite, margini, utile, notti o prezzo medio per struttura, tipologia di camera o segmento:
            Sibylla interroga i dati e ti risponde con l'albero e i grafici.
          </p>
          {barra}
          <Suggerimenti voci={suggerimenti} onScegli={chiedi} />
        </section>
      ) : (
        <>
          {barra}
          {stato.tipo === 'pensa' && <Attesa passo={passo} />}
          {stato.tipo === 'noncapita' && (
            <section className="dtq__noncapita">
              <i className="fa-solid fa-circle-question dtq__noncapita-ico" aria-hidden="true" />
              <p className="dtq__noncapita-txt">{stato.nota}</p>
              <Suggerimenti voci={suggerimenti} onScegli={chiedi} />
            </section>
          )}
          {stato.tipo === 'risposta' && <Bi risposta={stato.risposta} fonte={stato.fonte} />}
        </>
      )}
    </div>
  )
}

// ── Componenti della pagina ──────────────────────────────────────────────────

function Suggerimenti({ voci, onScegli }: { voci: string[]; onScegli: (q: string) => void }) {
  return (
    <div className="dtq__sugg">
      <span className="dtq__sugg-lbl">Prova a chiedere</span>
      <ul className="dtq__sugg-lista">
        {voci.map(v => (
          <li key={v}>
            <button type="button" className="dtq__sugg-btn" onClick={() => onScegli(v)}>
              <i className="fa-solid fa-arrow-turn-down-right" aria-hidden="true" />
              <TruncatedText text={v} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Attesa({ passo }: { passo: number }) {
  return (
    <div className="dtq__attesa" role="status" aria-live="polite">
      <span className="dtq__spinner" aria-hidden="true">
        <i className="fa-solid fa-diagram-project" />
      </span>
      <span className="dtq__attesa-txt" key={passo}>{PASSI_ATTESA[passo]}</span>
    </div>
  )
}

/** Albero stilizzato della pagina vuota: dice "qui nascono gli alberi". */
function AlberoDecorativo() {
  const foglie = [[150, 22], [150, 62], [150, 102], [150, 142]]
  return (
    <svg className="dtq__deco" viewBox="0 0 200 164" aria-hidden="true">
      {[52, 112].map((y, i) => (
        <path key={y} d={`M38,82 C70,82 66,${y} 96,${y}`} className={`dtq__deco-ramo dtq__deco-ramo--${i}`} />
      ))}
      {foglie.map(([x, y], i) => (
        <path key={y} d={`M104,${i < 2 ? 52 : 112} C128,${i < 2 ? 52 : 112} 124,${y} ${x - 8},${y}`} className={`dtq__deco-ramo dtq__deco-ramo--${2 + i}`} />
      ))}
      <circle cx={30} cy={82} r={9} className="dtq__deco-radice" />
      {[52, 112].map(y => <rect key={y} x={96} y={y - 7} width={16} height={14} rx={3} className="dtq__deco-nodo" />)}
      {foglie.map(([x, y], i) => <rect key={y} x={x - 8} y={y - 6} width={44} height={12} rx={3} className={`dtq__deco-foglia ${i === 1 ? 'dtq__deco-foglia--top' : ''}`} />)}
    </svg>
  )
}

function Bi({ risposta: r, fonte }: { risposta: Risposta; fonte: Fonte }) {
  const p = r.piano
  const met = METRICHE[p.metrica]
  const fmt = formatta(p.metrica)
  const foglia = p.dimensioni[p.dimensioni.length - 1]
  const quota = r.migliore && met.additiva && r.totale ? (r.migliore.valore / r.totale) * 100 : null
  const scarto = r.migliore && !met.additiva && r.totale ? delta(r.migliore.valore, r.totale) : null

  return (
    <div className="dtq__bi">
      <header className="dtq__risposta">
        <h2 className="dtq__risposta-tit">{r.titolo}</h2>
        <p className="dtq__risposta-sub">{r.sintesi}</p>
        <p className="dtq__capita">
          <i className={`fa-solid ${fonte === 'ai' ? 'fa-wand-magic-sparkles' : 'fa-gears'}`} aria-hidden="true" />
          {fonte === 'ai' ? 'Interpretata dall’AI di Sibylla' : 'Interpretata da Sibylla'}
          <span className="dtq__capita-sep">·</span>{met.nome}
          <span className="dtq__capita-sep">·</span>{p.dimensioni.map(d => DIMENSIONI[d].nome).join(' › ')}
          <span className="dtq__capita-sep">·</span><TruncatedText text={r.ambito} className="dtq__capita-ambito" />
        </p>
      </header>

      <div className="dtq__kpi">
        <KpiTile index={0} label={`${met.nome} ${p.anno}`} value={r.totale} format={fmt}
          delta={delta(r.totale, r.totalePrec)} invertDelta={met.inversa} icon="fa-chart-column" info={`Variazione sul ${p.anno - 1}`} />
        <KpiTile index={1} label={`${met.nome} ${p.anno - 1}`} value={r.totalePrec} format={fmt} icon="fa-clock-rotate-left" />
        <KpiTile index={2} label={foglia ? `${p.ordine === 'asc' ? 'In coda' : 'In testa'}: ${r.migliore?.nome ?? '—'}` : 'Migliore'}
          value={r.migliore?.valore ?? 0} format={fmt}
          delta={r.migliore ? delta(r.migliore.valore, r.migliore.prec) : undefined}
          invertDelta={met.inversa} icon="fa-trophy" info={`Su tutto l'ambito della domanda; variazione sul ${p.anno - 1}`} />
        {quota !== null
          ? <KpiTile index={3} label={`Quota di ${r.migliore?.nome ?? ''} sul totale`} value={quota} format={n => `${n.toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`} icon="fa-chart-pie" />
          : <KpiTile index={3} label="Scarto dalla media" value={scarto ?? 0} format={n => `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`} icon="fa-scale-balanced" />}
      </div>

      <div className="dtq__griglia">
        <ChartCard index={0} className="dtq__card" bodyClassName="dtq__card-body"
          title="Albero della risposta"
          subtitle={`${p.dimensioni.map(d => DIMENSIONI[d].nome).join(' › ')}: clicca un ramo per vederne il dettaglio`}
          badge={p.ordine === 'asc' ? 'dal più basso' : 'dal più alto'}>
          <Albero risposta={r} />
        </ChartCard>
        <ChartCard index={1} className="dtq__card" bodyClassName="dtq__card-body"
          title={foglia ? `${met.nome} per ${DIMENSIONI[foglia].nome.toLowerCase()}` : met.nome}
          subtitle={`${p.anno} a confronto con il ${p.anno - 1}`}
          legend={[{ key: 'valore', name: String(p.anno), color: series(0) }, { key: 'prec', name: String(p.anno - 1), color: CHART.ly }]}>
          <Grafico risposta={r} />
        </ChartCard>
      </div>
    </div>
  )
}

function Grafico({ risposta: r }: { risposta: Risposta }) {
  const fmt = formatta(r.piano.metrica)
  const anim = !reducedMotion()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={r.voci} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barGap={2} barCategoryGap="22%">
        <CartesianGrid {...gridProps} horizontal={false} vertical />
        <XAxis type="number" tick={{ fontSize: 11, fill: CHART.inkMuted }} tickLine={false} axisLine={{ stroke: CHART.axis }} tickFormatter={fmtAxisNum} />
        <YAxis type="category" dataKey="nome" width={118} tick={{ fontSize: 11, fill: CHART.ink }} tickLine={false} axisLine={false} interval={0} />
        <RTooltip cursor={{ fill: CHART.grid }}
          content={<ChartTooltip names={{ valore: String(r.piano.anno), prec: String(r.piano.anno - 1) }} format={v => fmt(v)} />} />
        <Bar dataKey="valore" fill={series(0)} radius={[0, 3, 3, 0]} isAnimationActive={anim} animationDuration={ANIM.duration} animationBegin={ANIM.begin(0)} />
        <Bar dataKey="prec" fill={CHART.ly} radius={[0, 3, 3, 0]} isAnimationActive={anim} animationDuration={ANIM.duration} animationBegin={ANIM.begin(1)} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** "Hotel Siracusa" → "Siracusa": nei nodi dell'albero conta il nome proprio (il completo è nel tooltip). */
const nomeBreve = (s: string) => s.replace(/^(hotel|resort|albergo|relais|villa)\s+/i, '')

// ── Albero con i collegamenti disegnati in SVG fra le card ───────────────────
function Albero({ risposta: r }: { risposta: Risposta }) {
  const radice = r.radice
  const [scelto, setScelto] = useState<string | null>(null)
  const attivo = radice.figli.find(n => n.id === scelto) ?? radice.figli.find(n => n.migliore) ?? radice.figli[0]
  useEffect(() => { setScelto(null) }, [r])

  const box = useRef<HTMLDivElement>(null)
  const nodi = useRef(new Map<string, HTMLElement>())
  const [linee, setLinee] = useState<{ d: string; on: boolean }[]>([])
  const [dim, setDim] = useState({ w: 0, h: 0 })

  const misura = useCallback(() => {
    const b = box.current
    if (!b) return
    const bb = b.getBoundingClientRect()
    const pos = (id: string, lato: 'dx' | 'sx') => {
      const el = nodi.current.get(id)
      if (!el) return null
      const q = el.getBoundingClientRect()
      return { x: (lato === 'dx' ? q.right : q.left) - bb.left, y: q.top + q.height / 2 - bb.top }
    }
    const curva = (a: { x: number; y: number }, z: { x: number; y: number }) => {
      const m = (a.x + z.x) / 2
      return `M${a.x},${a.y} C${m},${a.y} ${m},${z.y} ${z.x},${z.y}`
    }
    const out: { d: string; on: boolean }[] = []
    const a = pos('radice', 'dx')
    radice.figli.forEach(n => {
      const z = pos(n.id, 'sx')
      if (a && z) out.push({ d: curva(a, z), on: n.id === attivo?.id })
    })
    const a2 = attivo && pos(attivo.id, 'dx')
    attivo?.figli.forEach(n => {
      const z = pos(n.id, 'sx')
      if (a2 && z) out.push({ d: curva(a2, z), on: n.migliore })
    })
    setLinee(out)
    setDim({ w: bb.width, h: bb.height })
  }, [radice, attivo])

  useLayoutEffect(() => { misura() }, [misura])
  useEffect(() => {
    const b = box.current
    if (!b || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => misura())
    ro.observe(b)
    return () => ro.disconnect()
  }, [misura])

  const reg = (id: string) => (el: HTMLElement | null) => { if (el) nodi.current.set(id, el); else nodi.current.delete(id) }
  const met = METRICHE[r.piano.metrica]
  const fmt = formatta(r.piano.metrica)

  const card = (n: Nodo, livello: 1 | 2, onClick?: () => void) => {
    const d = delta(n.valore, n.prec)
    const contenuto = (
      <>
        <span className="dtq__nodo-top">
          {n.migliore && <i className="fa-solid fa-star dtq__nodo-stella" aria-label="Percorso migliore" />}
          <TruncatedText text={n.dim === 'struttura' ? nomeBreve(n.nome) : n.nome} full={n.nome} className="dtq__nodo-nome" />
          {n.quota !== null && <span className="dtq__nodo-quota">{Math.round(n.quota * 100)}%</span>}
        </span>
        <span className="dtq__nodo-bot">
          <span className="dtq__nodo-val">{fmt(n.valore)}</span>
          <DeltaBadge value={Math.round(d * 10) / 10} size="sm" invert={met.inversa} />
        </span>
        {n.quota !== null && (
          <svg className="dtq__nodo-barra" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true">
            <rect x={0} y={0} width={100} height={4} className="dtq__nodo-barra-fondo" />
            <rect x={0} y={0} width={Math.max(1, Math.min(100, n.quota * 100))} height={4} className="dtq__nodo-barra-val" />
          </svg>
        )}
      </>
    )
    const cls = `dtq__nodo dtq__nodo--l${livello} ${n.migliore ? 'dtq__nodo--migliore' : ''} ${onClick && n.id === attivo?.id ? 'dtq__nodo--attivo' : ''}`
    return onClick
      ? <button key={n.id} type="button" ref={reg(n.id)} className={cls} onClick={onClick} aria-pressed={n.id === attivo?.id}>{contenuto}</button>
      : <div key={n.id} ref={reg(n.id)} className={cls}>{contenuto}</div>
  }

  return (
    <div className="dtq__albero" ref={box}>
      <svg className="dtq__linee" width={dim.w} height={dim.h} aria-hidden="true">
        {linee.map((l, i) => <path key={i} d={l.d} className={`dtq__linea ${l.on ? 'dtq__linea--on' : ''}`} />)}
      </svg>
      <div className="dtq__col dtq__col--radice">
        <div ref={reg('radice')} className="dtq__radice">
          <span className="dtq__radice-lbl">{met.nome} {r.piano.anno}</span>
          <span className="dtq__radice-val">{fmt(radice.valore)}</span>
          <DeltaBadge value={Math.round(delta(radice.valore, radice.prec) * 10) / 10} size="sm" invert={met.inversa} />
          <TruncatedText text={r.ambito} className="dtq__radice-ambito" />
        </div>
      </div>
      <div className="dtq__col">
        {radice.figli.map(n => card(n, 1, n.figli.length ? () => setScelto(n.id) : undefined))}
      </div>
      {attivo && attivo.figli.length > 0 && (
        <div className="dtq__col">
          {attivo.figli.map(n => card(n, 2))}
        </div>
      )}
    </div>
  )
}
