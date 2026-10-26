import React, { useEffect, useMemo, useRef, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import { SearchField, ToggleSwitch } from '../../../core/components/form'
import { useColFilters } from '../../../core/components/ColFilters'
import { toast } from '../../../core/components/Toast/useToast'
import { dataOra, ora, relativo } from '../LogDiSistema/logData'
import {
  SISTEMI_INIZIALI, STATI, TIPOLOGIE, ultimoDi,
  type Direzione, type Flusso, type Sistema, type Stato,
} from './interfacceData'
// Base visiva del Registro di sistema (diretta, chip, tabella, pannello)
import '../LogDiSistema/LogDiSistema.sass'
import './Interfacce.sass'

const STATO_ICO: Record<Stato, string> = {
  Operativo: 'fa-circle-check', Avviso: 'fa-triangle-exclamation', Errore: 'fa-circle-xmark', Sospeso: 'fa-circle-pause',
}
const DIR_ICO: Record<Direzione, string> = { in: 'fa-arrow-down-left', out: 'fa-arrow-up-right', both: 'fa-arrows-left-right' }
const DIR_TXT: Record<Direzione, string> = { in: 'verso Sibylla', out: 'da Sibylla', both: 'nei due sensi' }
const SYNC_MS = 2600

interface Trasferimento { id: number; ts: Date; sistemaId: string; flusso: string; direzione: Direzione; record: number; ok: boolean; nota?: string }

let progressivo = 0
const trasferimento = (s: Sistema, f: Flusso, ok = true, nota?: string): Trasferimento => ({
  id: ++progressivo, ts: new Date(), sistemaId: s.id, flusso: f.nome, direzione: f.direzione,
  record: ok ? Math.max(1, Math.round(Math.random() * 40)) : 0, ok, nota,
})

/** Direzione complessiva del collegamento (per il verso dei flussi sulla mappa). */
const direzioneDi = (s: Sistema): Direzione => {
  const d = new Set(s.flussi.map(f => f.direzione))
  return d.has('both') || (d.has('in') && d.has('out')) ? 'both' : d.has('in') ? 'in' : 'out'
}

export default function Interfacce(_: { navigate: (p: string) => void }) {
  const [sistemi, setSistemi] = useState<Sistema[]>(SISTEMI_INIZIALI)
  const [feed, setFeed] = useState<Trasferimento[]>(() => SISTEMI_INIZIALI
    .flatMap(s => s.flussi.filter(f => f.ultimo && s.stato !== 'Sospeso').map(f => ({
      id: ++progressivo, ts: f.ultimo!, sistemaId: s.id, flusso: f.nome, direzione: f.direzione,
      record: f.record, ok: f.stato !== 'Errore', nota: f.nota,
    })))
    .sort((a, b) => +b.ts - +a.ts).slice(0, 8))
  const [live, setLive] = useState(true)
  const [adesso, setAdesso] = useState(Date.now())
  const [sync, setSync] = useState<Set<string>>(new Set())
  const [ping, setPing] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [apertoId, setApertoId] = useState<string | null>(null)
  const [cerca, setCerca] = useState('')
  const cf = useColFilters()

  useEffect(() => {
    const t = window.setInterval(() => setAdesso(Date.now()), 15_000)
    return () => window.clearInterval(t)
  }, [])

  // ── Diretta: i sistemi attivi trasferiscono dati ogni pochi secondi ────────
  const sistemiRef = useRef(sistemi)
  sistemiRef.current = sistemi
  useEffect(() => {
    if (!live) return
    const t = window.setInterval(() => {
      const attivi = sistemiRef.current.filter(s => s.stato === 'Operativo' || s.stato === 'Avviso')
      if (!attivi.length) return
      const s = attivi[Math.floor(Math.random() * attivi.length)]
      const f = s.flussi[Math.floor(Math.random() * s.flussi.length)]
      const tr = trasferimento(s, f, true, f.nota)
      setFeed(p => [tr, ...p].slice(0, 30))
      setSistemi(p => p.map(x => (x.id !== s.id ? x : {
        ...x, flussi: x.flussi.map(y => (y.nome === f.nome ? { ...y, ultimo: tr.ts, record: tr.record } : y)),
      })))
      setPing(s.id)
      setAdesso(Date.now())
      window.setTimeout(() => setPing(cur => (cur === s.id ? null : cur)), 1200)
    }, 3500)
    return () => window.clearInterval(t)
  }, [live])

  // ── Azioni ─────────────────────────────────────────────────────────────────
  const sincronizza = (ids: string[]) => {
    const da = ids.filter(id => !sync.has(id) && sistemi.find(s => s.id === id)?.stato !== 'Sospeso')
    if (!da.length) return
    setSync(p => { const n = new Set(p); da.forEach(id => n.add(id)); return n })
    da.forEach((id, k) => window.setTimeout(() => {
      const s = sistemiRef.current.find(x => x.id === id)!
      const fallisce = !!s.errore && !s.errore.transitorio
      const ts = new Date()
      setSistemi(p => p.map(x => {
        if (x.id !== id) return x
        const storico = [...x.storico.slice(1), !fallisce]
        if (fallisce) return { ...x, storico }
        return {
          ...x, errore: undefined, storico,
          stato: x.flussi.some(f => f.nota) ? 'Avviso' : 'Operativo',
          flussi: x.flussi.map(f => ({ ...f, ultimo: ts, record: Math.max(1, Math.round(Math.random() * 40)), stato: f.nota ? 'Avviso' : 'Operativo' })),
        }
      }))
      setFeed(p => [...s.flussi.map(f => trasferimento(s, f, !fallisce, fallisce ? s.errore!.codice : f.nota)), ...p].slice(0, 30))
      setSync(p => { const n = new Set(p); n.delete(id); return n })
      setAdesso(Date.now())
      if (ids.length === 1) {
        if (fallisce) toast.error(`${s.nome}: ${s.errore!.codice}. ${s.errore!.rimedio}`)
        else toast.success(`${s.nome} sincronizzato`)
      }
    }, SYNC_MS + k * 350))
    if (ids.length > 1) {
      window.setTimeout(() => toast.success(`Sincronizzazione completata su ${da.length} sistemi`), SYNC_MS + da.length * 350 + 100)
    }
  }

  const sospendi = (id: string, attivo: boolean) => {
    setSistemi(p => p.map(x => (x.id !== id ? x : {
      ...x,
      stato: !attivo ? 'Sospeso' : x.errore ? 'Errore' : x.flussi.some(f => f.nota) ? 'Avviso' : 'Operativo',
      flussi: x.flussi.map(f => ({ ...f, stato: !attivo ? 'Sospeso' : x.errore ? 'Errore' : f.nota ? 'Avviso' : 'Operativo' })),
    })))
    const s = sistemi.find(x => x.id === id)!
    toast.success(attivo ? `${s.nome} riattivato` : `${s.nome} sospeso: nessun dato verrà scambiato`)
  }

  // ── Filtri ─────────────────────────────────────────────────────────────────
  const righe = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    const r = sistemi
      .map(s => ({ ...s, ultimo: ultimoDi(s)?.getTime() ?? 0 }))
      .filter(s =>
        (!q || [s.nome, s.tipologia, s.protocollo, s.descrizione, ...s.flussi.map(f => f.nome)].some(x => x.toLowerCase().includes(q))) &&
        cf.matchText(s.nome, 'nome') && cf.matchMulti(s.tipologia, 'tipologia') &&
        cf.matchMulti(s.stato, 'stato') && cf.matchMulti(s.protocollo, 'protocollo'))
    return cf.sortRows(r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sistemi, cerca, cf.text, cf.multi, cf.sort])
  const visibili = new Set(righe.map(r => r.id))

  const conteggi = STATI.map(st => ({ st, n: sistemi.filter(s => s.stato === st).length }))
  const daSistemare = sistemi.filter(s => s.stato === 'Errore' || s.stato === 'Avviso')

  const chip: { key: string; label: string; via: () => void }[] = []
  if (cerca.trim()) chip.push({ key: 'cerca', label: `Cerca: “${cerca.trim()}”`, via: () => setCerca('') })
  const LBL: Record<string, string> = { tipologia: 'Tipologia', stato: 'Stato', protocollo: 'Protocollo', nome: 'Sistema' }
  Object.entries(cf.multi).forEach(([k, vs]) => vs.forEach(v =>
    chip.push({ key: `${k}:${v}`, label: `${LBL[k] ?? k}: ${v}`, via: () => cf.toggleMulti(k, v) })))
  Object.entries(cf.text).forEach(([k, v]) => v && chip.push({ key: `${k}:t`, label: `${LBL[k] ?? k} contiene “${v}”`, via: () => cf.setText(k, '') }))
  const azzera = () => { cf.reset(); setCerca('') }

  const aperto = apertoId ? sistemi.find(s => s.id === apertoId) ?? null : null
  useEffect(() => {
    if (!aperto) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setApertoId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aperto])

  const attivabili = sistemi.filter(s => s.stato !== 'Sospeso').map(s => s.id)

  return (
    <div className="logs ifc">
      <PageHead
        title="Interfacce"
        subtitle="I sistemi esterni collegati a Sibylla: quali dati si scambiano, quando, e cosa non sta funzionando"
        actions={
          <>
            <Tooltip text={live ? 'Metti in pausa la diretta' : 'Riprendi la diretta dei trasferimenti'}>
              <button type="button" className={'logs__live' + (live ? ' is-on' : '')} aria-pressed={live} onClick={() => setLive(v => !v)}>
                <span className="logs__live-dot" aria-hidden="true" />
                {live ? 'In diretta' : 'In pausa'}
                <i className={`fa-solid ${live ? 'fa-pause' : 'fa-play'}`} aria-hidden="true" />
              </button>
            </Tooltip>
            <button type="button" className="sib-btn sib-btn--primary ifc__sync-all" disabled={sync.size > 0} onClick={() => sincronizza(attivabili)}>
              <i className={'fa-solid fa-arrows-rotate' + (sync.size ? ' fa-spin' : '')} aria-hidden="true" />
              Sincronizza tutto
            </button>
          </>
        }
      />

      <div className="ifc__top">
        {/* ── Mappa delle integrazioni ─────────────────────────────────────── */}
        <section className="logs__chart ifc__map-card" aria-label="Mappa delle integrazioni">
          <header className="logs__chart-head">
            <div>
              <h2>Mappa delle integrazioni</h2>
              <p>{sistemi.length} sistemi collegati · clicca un sistema per i dettagli</p>
            </div>
            <div className="logs__legend" role="group" aria-label="Filtra per stato">
              {conteggi.map(({ st, n }) => {
                const on = (cf.multi.stato ?? []).includes(st)
                return (
                  <Tooltip key={st} text={on ? `Togli il filtro ${st}` : `Mostra solo ${st.toLowerCase()}`}>
                    <button type="button" aria-pressed={on} disabled={n === 0}
                      className={`logs__leg ifc__leg--${st.toLowerCase()}` + (on ? ' is-on' : '')}
                      onClick={() => cf.toggleMulti('stato', st)}>
                      <i className={`fa-solid ${STATO_ICO[st]}`} aria-hidden="true" />{st}<strong>{n}</strong>
                    </button>
                  </Tooltip>
                )
              })}
            </div>
          </header>
          <Mappa
            sistemi={sistemi}
            visibili={visibili}
            sync={sync}
            ping={ping}
            hover={hover}
            onHover={setHover}
            onApri={setApertoId}
          />
        </section>

        {/* ── Da sistemare + trasferimenti in tempo reale ──────────────────── */}
        <section className="logs__chart ifc__side" aria-label="Attività">
          <div className="ifc__side-in">
          {daSistemare.length > 0 && (
            <div className="ifc__todo">
              <h2>Da sistemare <small>{daSistemare.length}</small></h2>
              <ul>
                {daSistemare.map(s => (
                  <li key={s.id} className={`ifc__todo-item ifc__todo-item--${s.stato.toLowerCase()}`}>
                    <button type="button" onClick={() => setApertoId(s.id)} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
                      <i className={`fa-solid ${STATO_ICO[s.stato]}`} aria-hidden="true" />
                      <span>
                        <strong>{s.nome}</strong>
                        <TruncatedText text={s.errore?.messaggio ?? s.flussi.find(f => f.nota)?.nota ?? ''} />
                      </span>
                      <i className="fa-solid fa-chevron-right ifc__todo-go" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="ifc__feed">
            <h2>Trasferimenti {live && <span className="ifc__feed-live">in tempo reale</span>}</h2>
            <ol>
              {feed.slice(0, 12).map(t => {
                const s = sistemi.find(x => x.id === t.sistemaId)!
                return (
                  <li key={t.id} className={'ifc__feed-item' + (t.ok ? '' : ' is-ko')}>
                    <span className="ifc__sigla ifc__sigla--sm">{s.sigla}</span>
                    <span className="ifc__feed-txt">
                      <strong>{s.nome} · {t.flusso}</strong>
                      <small>
                        <i className={`fa-solid ${DIR_ICO[t.direzione]}`} aria-hidden="true" />
                        {!t.ok ? `Non riuscito: ${t.nota}` : t.record ? `${t.record} record ${DIR_TXT[t.direzione]}` : "nessun dato da trasferire"}
                      </small>
                    </span>
                    <Tooltip text={dataOra(t.ts)}><span className="ifc__feed-ts">{relativo(t.ts, adesso)}</span></Tooltip>
                  </li>
                )
              })}
            </ol>
          </div>
          </div>
        </section>
      </div>

      <div className="logs__bar">
        <h2 className="ifc__h2">Sistemi collegati</h2>
        <div className="logs__search">
          <SearchField placeholder="Cerca sistema, flusso, protocollo…" value={cerca} onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} />
        </div>
      </div>

      {chip.length > 0 && (
        <div className="logs__chips">
          <span className="logs__chips-lbl">Filtri attivi</span>
          {chip.map(c => (
            <button key={c.key} type="button" className="logs__chip" onClick={c.via} aria-label={`Rimuovi filtro ${c.label}`}>
              <TruncatedText text={c.label} /><i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          ))}
          <button type="button" className="logs__reset" onClick={azzera}>Azzera filtri</button>
        </div>
      )}

      <div className="logs__wrap">
        <table className="sib-table logs__table">
          <colgroup>
            <col className="ifc__w-nome" /><col className="ifc__w-tipo" /><col className="ifc__w-flussi" />
            <col className="ifc__w-ultimo" /><col className="ifc__w-storico" /><col className="ifc__w-stato" /><col className="ifc__w-az" />
          </colgroup>
          <thead>
            <tr>
              <th><span className="sib-colf-head"><ThLabel full="Sistema" />{cf.th('nome', 'Sistema', { search: true, sort: true })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Tipologia" short="Tipo" />{cf.th('tipologia', 'Tipologia', { options: TIPOLOGIE })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Flussi di dati" short="Flussi" />{cf.th('protocollo', 'Protocollo', { options: Array.from(new Set(sistemi.map(s => s.protocollo))) })}</span></th>
              <th><span className="sib-colf-head"><ThLabel full="Ultimo trasferimento" short="Ult. trasf." />{cf.th('ultimo', 'Ultimo trasferimento', { sort: true })}</span></th>
              <th><ThLabel full="Ultime 24 ore" short="24 ore" /></th>
              <th><span className="sib-colf-head"><ThLabel full="Stato" />{cf.th('stato', 'Stato', { options: STATI })}</span></th>
              <th aria-label="Azioni" />
            </tr>
          </thead>
          <tbody>
            {righe.length === 0 && (
              <tr><td colSpan={7} className="logs__vuoto">
                <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                <strong>Nessun sistema con questi filtri</strong>
                <button type="button" className="logs__reset" onClick={azzera}>Azzera filtri</button>
              </td></tr>
            )}
            {righe.map(s => {
              const inSync = sync.has(s.id)
              const ult = ultimoDi(s)
              const cls = ['logs__row', `ifc__row--${s.stato.toLowerCase()}`, hover === s.id && 'is-hover', apertoId === s.id && 'is-open', ping === s.id && 'is-ping'].filter(Boolean).join(' ')
              return (
                <tr key={s.id} className={cls} tabIndex={0}
                  onClick={() => setApertoId(apertoId === s.id ? null : s.id)}
                  onKeyDown={e => { if (e.key === 'Enter') setApertoId(s.id) }}
                  onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
                  <td>
                    <span className="ifc__nome">
                      <span className="ifc__sigla ifc__sigla--sm">{s.sigla}</span>
                      <TruncatedText text={s.nome} full={`${s.nome} · ${s.descrizione}`} />
                    </span>
                  </td>
                  <td className="logs__muted"><TruncatedText text={s.tipologia} /></td>
                  <td>
                    <span className="ifc__flussi">
                      {s.flussi.map(f => (
                        <Tooltip key={f.nome} text={`${f.nome} · ${DIR_TXT[f.direzione]} · ${f.frequenza}${f.nota ? ` — ${f.nota}` : ''}`}>
                          <span className={`ifc__flusso ifc__flusso--${f.stato.toLowerCase()}`}>
                            <i className={`fa-solid ${DIR_ICO[f.direzione]}`} aria-hidden="true" />
                          </span>
                        </Tooltip>
                      ))}
                      <small>{s.protocollo}</small>
                    </span>
                  </td>
                  <td>
                    {inSync ? (
                      <span className="ifc__progress" role="progressbar" aria-label="Sincronizzazione in corso"><span /></span>
                    ) : ult ? (
                      <Tooltip text={dataOra(ult)}><span>{relativo(ult, adesso)}</span></Tooltip>
                    ) : <span className="logs__muted">mai</span>}
                  </td>
                  <td>
                    <span className="ifc__storico" aria-label={`Ultime 24 ore: ${s.storico.filter(x => x === false).length} ore in errore`}>
                      {s.storico.map((x, i) => (
                        <span key={i} className={x === null ? 'is-null' : x ? 'is-ok' : 'is-ko'} />
                      ))}
                    </span>
                  </td>
                  <td><StatoTag st={inSync ? null : s.stato} /></td>
                  <td className="logs__az">
                    <Tooltip text={s.stato === 'Sospeso' ? 'Sistema sospeso' : s.stato === 'Errore' ? 'Riprova adesso' : 'Sincronizza adesso'}>
                      <button type="button" className="sib-btn sib-btn--icon" aria-label={`Sincronizza ${s.nome}`}
                        disabled={inSync || s.stato === 'Sospeso'}
                        onClick={e => { e.stopPropagation(); sincronizza([s.id]) }}>
                        <i className={'fa-solid fa-arrows-rotate' + (inSync ? ' fa-spin' : '')} aria-hidden="true" />
                      </button>
                    </Tooltip>
                    <i className="fa-solid fa-chevron-right logs__exp" aria-hidden="true" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {aperto && (
        <Dettaglio
          s={aperto}
          adesso={adesso}
          inSync={sync.has(aperto.id)}
          feed={feed.filter(t => t.sistemaId === aperto.id)}
          onClose={() => setApertoId(null)}
          onSync={() => sincronizza([aperto.id])}
          onAttivo={v => sospendi(aperto.id, v)}
        />
      )}
    </div>
  )
}

function StatoTag({ st }: { st: Stato | null }) {
  if (!st) return <span className="ifc__stato ifc__stato--sync"><i className="fa-solid fa-arrows-rotate fa-spin" aria-hidden="true" /><span>In corso</span></span>
  return (
    <span className={`ifc__stato ifc__stato--${st.toLowerCase()}`}>
      <i className={`fa-solid ${STATO_ICO[st]}`} aria-hidden="true" /><span>{st}</span>
    </span>
  )
}

// ─── Mappa: Sibylla al centro, un raggio per sistema ─────────────────────────
const W = 640, H = 340, CX = W / 2, CY = H / 2, RX = 255, RY = 128

function Mappa({ sistemi, visibili, sync, ping, hover, onHover, onApri }: {
  sistemi: Sistema[]; visibili: Set<string>; sync: Set<string>; ping: string | null; hover: string | null
  onHover: (id: string | null) => void; onApri: (id: string) => void
}) {
  const nodi = sistemi.map((s, i) => {
    const ang = -Math.PI / 2 + (i / sistemi.length) * Math.PI * 2
    return { s, x: CX + RX * Math.cos(ang), y: CY + RY * Math.sin(ang) }
  })

  return (
    <svg className="ifc__map" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Sibylla e i sistemi collegati">
      {nodi.map(({ s, x, y }) => {
        const dir = direzioneDi(s)
        const attivo = s.stato === 'Operativo' || s.stato === 'Avviso' || sync.has(s.id)
        const verso = `M${CX},${CY} L${x},${y}`
        const dur = sync.has(s.id) ? '0.7s' : s.stato === 'Avviso' ? '3.2s' : '2.2s'
        const cls = ['ifc__link', `ifc__link--${sync.has(s.id) ? 'sync' : s.stato.toLowerCase()}`,
          hover === s.id && 'is-hover', !visibili.has(s.id) && 'is-dim'].filter(Boolean).join(' ')
        return (
          <g key={`l-${s.id}`} className={cls}>
            <path d={verso} />
            {attivo && (dir === 'out' || dir === 'both') && (
              <circle r="3.2" className="ifc__dot">
                <animateMotion dur={dur} repeatCount="indefinite" path={verso} />
              </circle>
            )}
            {attivo && (dir === 'in' || dir === 'both') && (
              <circle r="3.2" className="ifc__dot">
                <animateMotion dur={dur} repeatCount="indefinite" path={verso} keyPoints="1;0" keyTimes="0;1" calcMode="linear" begin="0.6s" />
              </circle>
            )}
            {s.stato === 'Errore' && !sync.has(s.id) && (
              <g className="ifc__break" transform={`translate(${(CX + x) / 2},${(CY + y) / 2})`}>
                <circle r="7" />
                <path d="M-2.6,-2.6 L2.6,2.6 M2.6,-2.6 L-2.6,2.6" />
              </g>
            )}
          </g>
        )
      })}

      <g className="ifc__hub">
        <circle cx={CX} cy={CY} r="44" className="ifc__hub-ring" />
        <circle cx={CX} cy={CY} r="34" />
        <text x={CX} y={CY + 4} textAnchor="middle">Sibylla</text>
      </g>

      {nodi.map(({ s, x, y }) => {
        const cls = ['ifc__node', `ifc__node--${sync.has(s.id) ? 'sync' : s.stato.toLowerCase()}`,
          hover === s.id && 'is-hover', ping === s.id && 'is-ping', !visibili.has(s.id) && 'is-dim'].filter(Boolean).join(' ')
        const sotto = y >= CY
        return (
          <g key={`n-${s.id}`} className={cls} role="button" tabIndex={0} aria-label={`${s.nome}: ${s.stato}`}
            onClick={() => onApri(s.id)}
            onKeyDown={e => { if (e.key === 'Enter') onApri(s.id) }}
            onMouseEnter={() => onHover(s.id)} onMouseLeave={() => onHover(null)}>
            <circle cx={x} cy={y} r="27" className="ifc__node-halo" />
            <circle cx={x} cy={y} r="20" className="ifc__node-c" />
            <text x={x} y={y + 4} textAnchor="middle" className="ifc__node-sigla">{s.sigla}</text>
            <text x={x} y={sotto ? y + 36 : y - 28} textAnchor="middle" className="ifc__node-nome">{s.nome}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Dettaglio sistema ───────────────────────────────────────────────────────
const PASSI = ['Risoluzione del nome', 'Connessione sicura (TLS)', 'Autenticazione', 'Risposta del servizio']

function Dettaglio({ s, adesso, inSync, feed, onClose, onSync, onAttivo }: {
  s: Sistema; adesso: number; inSync: boolean; feed: Trasferimento[]
  onClose: () => void; onSync: () => void; onAttivo: (v: boolean) => void
}) {
  const [test, setTest] = useState<{ passo: number; esito: boolean[] } | null>(null)
  useEffect(() => { setTest(null) }, [s.id])

  // Dove si ferma il test: autenticazione per 401/403, connessione per i timeout
  const fallisceA = !s.errore ? -1 : s.errore.transitorio ? 1 : 2
  const avviaTest = () => {
    setTest({ passo: 0, esito: [] })
    PASSI.forEach((_, i) => window.setTimeout(() => {
      setTest(t => {
        if (!t || t.esito.includes(false)) return t
        return { passo: i + 1, esito: [...t.esito, i !== fallisceA] }
      })
    }, 550 * (i + 1)))
  }
  const testFinito = test && (test.esito.includes(false) || test.esito.length === PASSI.length)
  const tono = s.stato === 'Operativo' ? 'ok' : s.stato === 'Avviso' ? 'avviso' : s.stato === 'Errore' ? 'errore' : 'info'

  return (
    <>
      <div className="logs__scrim" onClick={onClose} />
      <aside className={`logs__drawer logs__drawer--${tono}`} role="dialog" aria-label={`Dettaglio ${s.nome}`}>
        <header className="logs__dr-head">
          <div className="logs__dr-nav">
            <span className="logs__dr-pos">{s.tipologia}</span>
            <Tooltip text="Chiudi (Esc)">
              <button type="button" aria-label="Chiudi" onClick={onClose}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </Tooltip>
          </div>
          <div className="logs__dr-title">
            <span className="ifc__sigla ifc__sigla--lg">{s.sigla}</span>
            <div>
              <StatoTag st={inSync ? null : s.stato} />
              <h3>{s.nome}</h3>
              <p>{s.descrizione}</p>
            </div>
          </div>
        </header>

        <div className="logs__dr-body">
          {s.errore && (
            <div className="ifc__err">
              <strong><i className="fa-solid fa-circle-xmark" aria-hidden="true" /> {s.errore.codice} · da {relativo(s.errore.dal, adesso).replace(' fa', '')}</strong>
              <p>{s.errore.messaggio}</p>
              <p className="ifc__err-fix"><i className="fa-solid fa-lightbulb" aria-hidden="true" /> {s.errore.rimedio}</p>
            </div>
          )}

          <div className="ifc__actions">
            <button type="button" className="sib-btn sib-btn--primary" disabled={inSync || s.stato === 'Sospeso'} onClick={onSync}>
              <i className={'fa-solid fa-arrows-rotate' + (inSync ? ' fa-spin' : '')} aria-hidden="true" />
              {inSync ? 'Sincronizzazione…' : s.stato === 'Errore' ? 'Riprova adesso' : 'Sincronizza adesso'}
            </button>
            <button type="button" className="sib-btn sib-btn--secondary" disabled={s.stato === 'Sospeso' || (!!test && !testFinito)} onClick={avviaTest}>
              <i className="fa-solid fa-stethoscope" aria-hidden="true" /> Test connessione
            </button>
            <ToggleSwitch label="Attivo" checked={s.stato !== 'Sospeso'} onChange={onAttivo} className="ifc__toggle" />
          </div>

          {test && (
            <ol className="ifc__test" aria-live="polite">
              {PASSI.map((p, i) => {
                const e = test.esito[i]
                const stato = e === true ? 'ok' : e === false ? 'ko' : i === test.passo && !testFinito ? 'run' : 'wait'
                return (
                  <li key={p} className={`is-${stato}`}>
                    <i className={`fa-solid ${stato === 'ok' ? 'fa-circle-check' : stato === 'ko' ? 'fa-circle-xmark' : stato === 'run' ? 'fa-spinner fa-spin' : 'fa-circle'}`} aria-hidden="true" />
                    {p}
                  </li>
                )
              })}
              {testFinito && (
                <li className={'ifc__test-res' + (test.esito.includes(false) ? ' is-ko' : '')}>
                  {test.esito.includes(false) ? 'Connessione non riuscita: vedi il rimedio sopra.' : 'Connessione riuscita: il sistema risponde correttamente.'}
                </li>
              )}
            </ol>
          )}

          <section className="logs__dr-sec">
            <h4>Flussi di dati <small>{s.flussi.length}</small></h4>
            <ul className="ifc__dr-flussi">
              {s.flussi.map(f => (
                <li key={f.nome} className={`ifc__dr-flusso--${f.stato.toLowerCase()}`}>
                  <span className={`ifc__flusso ifc__flusso--${f.stato.toLowerCase()}`}><i className={`fa-solid ${DIR_ICO[f.direzione]}`} aria-hidden="true" /></span>
                  <span className="ifc__dr-flusso-txt">
                    <strong>{f.nome}</strong>
                    <small>{DIR_TXT[f.direzione]} · {f.frequenza}</small>
                    {f.nota && <small className="ifc__nota">{f.nota}</small>}
                  </span>
                  <span className="ifc__dr-flusso-ult">
                    {f.ultimo ? relativo(f.ultimo, adesso) : 'mai'}
                    {f.ultimo && f.record > 0 && <small>{f.record} record</small>}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <dl className="logs__dr-meta">
            <div><dt>Protocollo</dt><dd>{s.protocollo}</dd></div>
            <div><dt>Ambiente</dt><dd>Produzione</dd></div>
            <div className="ifc__span2"><dt>Indirizzo</dt><dd className="logs__mono">{s.endpoint}</dd></div>
          </dl>

          <section className="logs__dr-sec">
            <h4>Ultime 24 ore</h4>
            <span className="ifc__storico ifc__storico--lg">
              {s.storico.map((x, i) => <span key={i} className={x === null ? 'is-null' : x ? 'is-ok' : 'is-ko'} />)}
            </span>
            <span className="ifc__storico-asse"><span>24 ore fa</span><span>adesso</span></span>
          </section>

          {feed.length > 0 && (
            <section className="logs__dr-sec">
              <h4>Ultimi trasferimenti</h4>
              <ol className="logs__tl">
                {feed.slice(0, 6).map(t => (
                  <li key={t.id} className={`logs__tl-item logs__tl-item--${t.ok ? 'info' : 'errore'}`}>
                    <button type="button" disabled>
                      <span className="logs__tl-ora">{ora(t.ts).slice(0, 5)}</span>
                      <span className="logs__tl-txt">
                        <strong>{t.flusso}</strong>
                        <small>{!t.ok ? `Non riuscito: ${t.nota}` : t.record ? `${t.record} record ${DIR_TXT[t.direzione]}` : "nessun dato da trasferire"}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </aside>
    </>
  )
}
