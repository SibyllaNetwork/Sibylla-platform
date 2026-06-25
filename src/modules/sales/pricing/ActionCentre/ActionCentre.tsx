import React, { useEffect, useMemo, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { SelectField } from '../../../../core/components/form'
import {
  usePraticheStore,
  STATO_PRATICA_META,
  TIPOLOGIA_META,
  type Pratica,
} from '../../../../store/usePraticheStore'
import './ActionCentre.sass'

// ─── Modello (mock, coerente con Market lens) ─────────────────────────────────
const eur = (n: number) => `€ ${Math.round(n).toLocaleString('it-IT')}`
const COMPETITORS = ['Welcome Travel', 'Alpitour', 'Eden Viaggi', 'Going', 'Bluvacanze', 'TUI Italia']

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
function listinoDaContratto(p: Pratica): number { return 40 + p.categoria * 20 }
function mediaMercato(destinazione: string, listino: number): number {
  const prezzi = COMPETITORS.map((nome) => Math.round(listino * (1 + (hashStr(destinazione + nome) % 36) / 100)))
  return Math.round(prezzi.reduce((a, b) => a + b, 0) / prezzi.length)
}
function getCalc(p: Pratica, markup: number) {
  const listino = listinoDaContratto(p)
  const media = mediaMercato(p.destinazione, listino)
  const tariffa = Math.round(listino * (1 + markup / 100))
  const suggerito = Math.max(0, Math.round((media / listino - 1) * 100))
  const deltaPct = Math.round(((tariffa - media) / media) * 1000) / 10
  return { listino, media, tariffa, suggerito, deltaPct }
}

function Stars({ n }: { n: number }) {
  return (
    <span className="actc__stars" aria-label={`${n} stelle`}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={`fa-${i <= n ? 'solid' : 'light'} fa-star`} aria-hidden="true" />)}
    </span>
  )
}

type Fase = 'idle' | 'analyzing' | 'done'

// ─── Pagina ───────────────────────────────────────────────────────────────────
export default function ActionCentre({ navigate, praticaId }: { navigate: (p: string) => void; praticaId?: string }) {
  const pratiche = usePraticheStore((s) => s.pratiche)
  const setMarkup = usePraticheStore((s) => s.setMarkup)

  const fromMarketLens = !!praticaId
  const [selId, setSelId] = useState(praticaId ?? pratiche[0]?.id ?? '')
  const pratica = pratiche.find((p) => p.id === selId) ?? pratiche[0]

  const [fase, setFase] = useState<Fase>('idle')
  const [progress, setProgress] = useState(0)
  const [counters, setCounters] = useState({ prezzi: 0, listini: 0, preventivi: 0 })
  const [markup, setMarkupLocal] = useState(pratica?.markup ?? 10)
  const [applicato, setApplicato] = useState(false)
  const [inviato, setInviato] = useState(false)

  // Dettaglio del preventivo corrente (markup persistito) e proposta (markup locale).
  const detail = useMemo(() => (pratica ? getCalc(pratica, pratica.markup) : null), [pratica])
  const calc = useMemo(() => (pratica ? getCalc(pratica, markup) : null), [pratica, markup])

  // Animazione "analisi del mercato".
  useEffect(() => {
    if (fase !== 'analyzing' || !pratica) return
    let p = 0
    const sugg = getCalc(pratica, pratica.markup).suggerito
    const t = window.setInterval(() => {
      p += 1.2 + Math.random() * 2.2
      setProgress(Math.min(100, p))
      setCounters((c) => ({
        prezzi: c.prezzi + Math.round(4000 + Math.random() * 11000),
        listini: c.listini + Math.round(80 + Math.random() * 220),
        preventivi: c.preventivi + Math.round(30 + Math.random() * 90),
      }))
      if (p >= 100) {
        window.clearInterval(t)
        setMarkupLocal(sugg)
        setFase('done')
      }
    }, 170)
    return () => window.clearInterval(t)
  }, [fase, pratica])

  const cambiaPreventivo = (id: string) => {
    setSelId(id)
    setFase('idle')
    setApplicato(false)
    setInviato(false)
  }
  const avviaAnalisi = () => {
    setCounters({ prezzi: 0, listini: 0, preventivi: 0 })
    setProgress(0)
    setApplicato(false)
    setFase('analyzing')
  }

  if (!pratica || !detail || !calc) {
    return (
      <div className="actc">
        <BtnBack />
        <PageHeader title="Action centre" subtitle="Suggerimenti data-driven a supporto delle decisioni operative" />
        <p className="actc__empty">Nessun preventivo da ottimizzare. Creane uno da “Crea pratica”.</p>
      </div>
    )
  }

  // Dati della proposta (solo a analisi conclusa).
  const servizi = [
    { nome: 'Soggiorno (a notte)', attuale: calc.listino, suggerita: Math.round(calc.listino * (1 + calc.suggerito / 100)) },
    { nome: 'Transfer aeroporto', attuale: 45, suggerita: 40 },
    { nome: 'Mezza pensione', attuale: 35, suggerita: 32 },
    { nome: 'Escursione guidata', attuale: 60, suggerita: 58 },
  ]
  const pacchetti = [
    { nome: 'Pacchetto Smart', prezzo: Math.round(calc.listino * (1 + calc.suggerito / 100)), nota: 'Tariffa allineata al mercato, alta probabilità di conversione', servizi: ['Soggiorno', 'Transfer'] },
    { nome: 'Pacchetto Comfort', prezzo: Math.round(calc.listino * (1 + markup / 100)) + 35, nota: 'Soggiorno + mezza pensione, equilibrio prezzo/valore', servizi: ['Soggiorno', 'Mezza pensione', 'Transfer'] },
    { nome: 'Pacchetto Premium', prezzo: Math.round(calc.listino * (1 + (markup + 8) / 100)) + 90, nota: 'Esperienza completa con escursione e servizi extra', servizi: ['Soggiorno', 'Mezza pensione', 'Escursione', 'Transfer'] },
  ]
  const canali = [
    { nome: 'Agorà', visibilita: 'Alta', commissione: 8, prezzo: Math.round(calc.tariffa * 0.99) },
    { nome: 'Tableau', visibilita: 'Media', commissione: 5, prezzo: calc.tariffa },
    { nome: 'Platform', visibilita: 'Alta', commissione: 12, prezzo: Math.round(calc.tariffa * 1.03) },
  ].map((c) => ({ ...c, margine: Math.round(c.prezzo * (1 - c.commissione / 100) - calc.listino) }))
  const miglioreMargine = Math.max(...canali.map((c) => c.margine))
  const dir = (a: number, b: number) => (b < a ? 'down' : b > a ? 'up' : 'eq')
  const applicaMarkup = () => { setMarkup(pratica.id, markup); setApplicato(true) }
  const applicaConsigliato = () => { setMarkupLocal(calc.suggerito); setMarkup(pratica.id, calc.suggerito); setApplicato(true) }

  return (
    <div className="actc">
      <BtnBack onClick={() => navigate(fromMarketLens ? `market-lens:${pratica.id}` : 'home')} />
      <PageHeader
        title="Action centre"
        subtitle="Suggerimenti data-driven a supporto delle decisioni operative del Tour Operator"
      />

      {fromMarketLens && (
        <div className="actc__banner">
          <i className="fa-solid fa-bullseye" aria-hidden="true" />
          <span>Riformulazione del preventivo aperto da Market lens — scegli il preventivo e avvia l'analisi di ottimizzazione.</span>
        </div>
      )}

      {/* ── Dettaglio del preventivo + scelta ─────────────────────────────────── */}
      <section className="actc__detail">
        <div className="actc__detail-top">
          <SelectField
            label="Preventivo da ottimizzare"
            name="preventivo"
            className="actc__select"
            value={pratica.id}
            options={pratiche.map((p) => ({ value: p.id, label: `${p.destinazione} · ${p.categoria}★ · ${TIPOLOGIA_META[p.tipologia].label} · markup ${p.markup}%` }))}
            onChange={(e) => cambiaPreventivo(e.target.value)}
          />
        </div>

        <div className="actc__offer-head">
          <span className="actc__offer-dest"><i className="fa-light fa-location-dot" aria-hidden="true" /> {pratica.destinazione}</span>
          <Stars n={pratica.categoria} />
          <span className="actc__offer-tipo"><i className={`fa-light fa-${TIPOLOGIA_META[pratica.tipologia].icon}`} aria-hidden="true" /> {TIPOLOGIA_META[pratica.tipologia].label}</span>
          <span className="actc__offer-assignee"><i className="fa-light fa-user-group" aria-hidden="true" /> {pratica.assegnazione.tipo === 'team' ? 'Tutto il team' : pratica.assegnazione.nome}</span>
          <span className={`actc__offer-stato actc__offer-stato--${STATO_PRATICA_META[pratica.stato].tone}`}>{STATO_PRATICA_META[pratica.stato].label}</span>
        </div>

        <dl className="actc__detail-grid">
          <div className="actc__detail-item"><dt>Listino da contratto</dt><dd>{eur(detail.listino)}</dd></div>
          <div className="actc__detail-item"><dt>Markup attuale</dt><dd>{pratica.markup}%</dd></div>
          <div className="actc__detail-item"><dt>Tariffa preventivo</dt><dd className="actc__detail-strong">{eur(detail.tariffa)}</dd></div>
          <div className="actc__detail-item"><dt>Budget di riferimento</dt><dd>{eur(pratica.budget)}</dd></div>
        </dl>
      </section>

      {/* ── Avvio analisi / animazione ────────────────────────────────────────── */}
      {fase === 'idle' && (
        <section className="actc__start">
          <div className="actc__start-text">
            <h2 className="actc__start-title">Ottimizzazione del preventivo</h2>
            <p>Sibylla confronta listini, tariffe pubblicate e preventivi sul mercato per proporti il markup più efficace.</p>
          </div>
          <button type="button" className="sib-btn sib-btn--primary sib-btn--lg actc__start-btn" onClick={avviaAnalisi}>
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Avvia analisi
          </button>
        </section>
      )}

      {fase === 'analyzing' && (
        <div className="actc__overlay" role="status" aria-live="polite">
          <section className="actc__analyzing">
            <div className="actc__radar"><i className="fa-solid fa-magnifying-glass-chart" aria-hidden="true" /></div>
            <h2 className="actc__analyzing-title">Sibylla sta analizzando il mercato…</h2>
            <p className="actc__analyzing-sub">Confronto di prezzi, percentuali, listini e preventivi in corso</p>
            <div className="actc__counters">
              <div className="actc__counter"><span className="actc__counter-num">{counters.prezzi.toLocaleString('it-IT')}</span><span className="actc__counter-lbl">prezzi</span></div>
              <div className="actc__counter"><span className="actc__counter-num">{counters.listini.toLocaleString('it-IT')}</span><span className="actc__counter-lbl">listini</span></div>
              <div className="actc__counter"><span className="actc__counter-num">{counters.preventivi.toLocaleString('it-IT')}</span><span className="actc__counter-lbl">preventivi</span></div>
            </div>
            <div className="actc__progress"><span className="actc__progress-bar" style={{ width: `${progress}%` }} /></div>
          </section>
        </div>
      )}

      {fase === 'done' && (
        <>
          {/* Risultato analisi — evidenziato */}
          <section className="actc__result">
            <span className="actc__result-badge"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Analisi Sibylla completata</span>
            <div className="actc__result-main">
              <div className="actc__result-text">
                <p className="actc__result-kicker">Ecco il risultato dell'analisi di Sibylla</p>
                <p className="actc__result-desc">Il markup più efficace per <strong>{pratica.destinazione}</strong> ({pratica.categoria}★), allineato al mercato.</p>
              </div>
              <div className="actc__result-value">
                <span className="actc__result-label">Markup consigliato</span>
                <span className="actc__result-num">{calc.suggerito}%</span>
                <span className="actc__result-sub">tariffa {eur(Math.round(calc.listino * (1 + calc.suggerito / 100)))}</span>
              </div>
            </div>
            <div className="actc__result-actions">
              {applicato
                ? <span className="actc__result-applied"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Markup consigliato applicato al preventivo</span>
                : <button type="button" className="actc__result-btn" onClick={applicaConsigliato}>
                    <i className="fa-solid fa-check" aria-hidden="true" /> Applica markup consigliato
                  </button>}
            </div>
          </section>

          {/* BOX 1 — Markup suggerito */}
          <section className="actc__box">
            <header className="actc__box-head">
              <span className="actc__box-icon actc__box-icon--primary"><i className="fa-light fa-percent" aria-hidden="true" /></span>
              <div>
                <h2 className="actc__box-title">Markup suggerito</h2>
                <p className="actc__box-hint">In base all'analisi, il markup più efficace per questo preventivo.</p>
              </div>
              <span className="actc__suggested">
                <span className="actc__suggested-num">{calc.suggerito}%</span>
                <span className="actc__suggested-lbl">consigliato</span>
              </span>
            </header>

            <div className="actc__markup">
              <div className="actc__markup-slider">
                <div className="actc__markup-row">
                  <label htmlFor="actc-markup">Markup</label>
                  <span className="actc__markup-val">{markup}%</span>
                </div>
                <input id="actc-markup" type="range" min={0} max={50} value={markup} onChange={(e) => { setMarkupLocal(Number(e.target.value)); setApplicato(false) }} />
                <div className="actc__markup-hint">
                  Suggerito dall'analisi: <button type="button" className="actc__chip" onClick={() => { setMarkupLocal(calc.suggerito); setApplicato(false) }}>{calc.suggerito}%</button>
                </div>
              </div>
              <div className="actc__markup-figs">
                <div className="actc__fig"><span>Listino</span><strong>{eur(calc.listino)}</strong></div>
                <div className="actc__fig"><span>Tua tariffa</span><strong className="actc__fig--accent">{eur(calc.tariffa)}</strong></div>
                <div className="actc__fig"><span>Media mercato</span><strong>{eur(calc.media)}</strong></div>
                <div className="actc__fig"><span>Δ vs media</span><strong className={calc.deltaPct > 0 ? 'actc__fig--neg' : 'actc__fig--pos'}>{calc.deltaPct > 0 ? '+' : ''}{calc.deltaPct}%</strong></div>
              </div>
            </div>
            <div className="actc__box-actions">
              {applicato && <span className="actc__ok"><i className="fa-light fa-circle-check" aria-hidden="true" /> Markup applicato al preventivo</span>}
              <button type="button" className="sib-btn sib-btn--primary" onClick={applicaMarkup}><i className="fa-light fa-check" aria-hidden="true" /> Applica al preventivo</button>
            </div>
          </section>

          {/* BOX 2 — Servizi & tariffe + soluzioni PDF */}
          <section className="actc__box">
            <header className="actc__box-head">
              <span className="actc__box-icon actc__box-icon--primary"><i className="fa-light fa-wand-magic-sparkles" aria-hidden="true" /></span>
              <div>
                <h2 className="actc__box-title">Servizi e tariffe</h2>
                <p className="actc__box-hint">Aggiustamenti suggeriti e soluzioni di pacchetto da proporre al cliente.</p>
              </div>
            </header>

            <div className="sib-table-wrap">
              <table className="sib-table">
                <thead><tr><th>Servizio</th><th>Tariffa attuale</th><th>Tariffa suggerita</th><th>Variazione</th></tr></thead>
                <tbody>
                  {servizi.map((s) => {
                    const d = dir(s.attuale, s.suggerita)
                    return (
                      <tr key={s.nome}>
                        <td>{s.nome}</td>
                        <td>{eur(s.attuale)}</td>
                        <td className="actc__svc-sugg">{eur(s.suggerita)}</td>
                        <td><span className={`actc__trend actc__trend--${d}`}><i className={`fa-solid fa-${d === 'down' ? 'arrow-down' : d === 'up' ? 'arrow-up' : 'equals'}`} aria-hidden="true" />{d === 'eq' ? 'Invariata' : `${Math.abs(s.suggerita - s.attuale)} €`}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <h3 className="actc__sub">Soluzioni di pacchetto</h3>
            <div className="actc__pkgs">
              {pacchetti.map((pk) => (
                <article key={pk.nome} className="actc__pkg">
                  <div className="actc__pkg-head"><span className="actc__pkg-name">{pk.nome}</span><span className="actc__pkg-price">{eur(pk.prezzo)}</span></div>
                  <p className="actc__pkg-note">{pk.nota}</p>
                  <div className="actc__pkg-tags">{pk.servizi.map((sv) => <span key={sv} className="actc__pkg-tag">{sv}</span>)}</div>
                </article>
              ))}
            </div>

            <div className="actc__box-actions">
              {inviato && <span className="actc__ok"><i className="fa-light fa-circle-check" aria-hidden="true" /> PDF con le soluzioni inviato via email al cliente</span>}
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('crea-preventivo')}><i className="fa-light fa-file-lines" aria-hidden="true" /> Crea preventivo</button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => setInviato(true)}><i className="fa-light fa-paper-plane" aria-hidden="true" /> Invia PDF al cliente</button>
            </div>
          </section>

          {/* BOX 3 — Distribuzione */}
          <section className="actc__box">
            <header className="actc__box-head">
              <span className="actc__box-icon actc__box-icon--ok"><i className="fa-light fa-share-nodes" aria-hidden="true" /></span>
              <div>
                <h2 className="actc__box-title">Strategie di distribuzione</h2>
                <p className="actc__box-hint">Dove vendere le camere: confronto tra i canali disponibili.</p>
              </div>
            </header>
            <div className="sib-table-wrap">
              <table className="sib-table">
                <thead><tr><th>Canale</th><th>Visibilità</th><th>Commissione</th><th>Prezzo consigliato</th><th>Margine netto</th><th /></tr></thead>
                <tbody>
                  {canali.map((c) => (
                    <tr key={c.nome} className={c.margine === miglioreMargine ? 'actc__chan--best' : ''}>
                      <td className="actc__chan-name">{c.nome}</td>
                      <td>{c.visibilita}</td>
                      <td>{c.commissione}%</td>
                      <td>{eur(c.prezzo)}</td>
                      <td className="actc__chan-margin">{eur(c.margine)}</td>
                      <td>{c.margine === miglioreMargine && <span className="actc__best-badge"><i className="fa-solid fa-star" aria-hidden="true" /> Consigliato</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
