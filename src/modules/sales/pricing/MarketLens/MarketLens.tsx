import React, { useMemo, useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { SelectField } from '../../../../core/components/form'
import {
  usePraticheStore,
  STATO_PRATICA_META,
  TIPOLOGIA_META,
  type Pratica,
} from '../../../../store/usePraticheStore'
import './MarketLens.sass'

// ─── Modello di mercato (mock) ────────────────────────────────────────────────
//  Market lens confronta il prezzo di vendita del TO con quello dei competitor
//  sul mercato, sulle tariffe pubblicate in Agorà e Tableau. Tutto mock lato
//  client (in attesa del cablaggio con Agorà/Tableau/Action centre).

type Fonte = 'Agorà' | 'Network'
const FONTI: Fonte[] = ['Agorà', 'Network']

const COMPETITORS = ['Welcome Travel', 'Alpitour', 'Eden Viaggi', 'Going', 'Bluvacanze', 'TUI Italia']

const eur = (n: number) => `€ ${Math.round(n).toLocaleString('it-IT')}`

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// Listino "da contratto" derivato dalla categoria (3★≈100, 4★≈120, 5★≈140).
function listinoDaContratto(p: Pratica): number {
  return 40 + p.categoria * 20
}

// Prezzi dei competitor per destinazione (deterministici), attorno al listino.
function prezziCompetitor(destinazione: string, listino: number, fonte: Fonte): { nome: string; prezzo: number }[] {
  const bias = fonte === 'Network' ? 0.98 : 1.0
  return COMPETITORS.map((nome) => {
    const h = hashStr(destinazione + nome + fonte)
    const factor = 1.0 + (h % 36) / 100 // 1.00 … 1.35
    return { nome, prezzo: Math.round(listino * factor * bias) }
  })
}

interface Stars { n: number }
function Stars({ n }: Stars) {
  return (
    <span className="mklens__stars" aria-label={`${n} stelle`}>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} className={`fa-${i <= n ? 'solid' : 'light'} fa-star`} aria-hidden="true" />)}
    </span>
  )
}

// ─── Pagina ───────────────────────────────────────────────────────────────────
export default function MarketLens({ navigate, praticaId }: { navigate: (p: string) => void; praticaId?: string }) {
  const pratiche = usePraticheStore((s) => s.pratiche)

  const [selId, setSelId] = useState(praticaId ?? pratiche[0]?.id ?? '')
  const [fonte, setFonte] = useState<Fonte>('Agorà')

  const pratica = pratiche.find((p) => p.id === selId) ?? pratiche.find((p) => p.id === praticaId) ?? pratiche[0]
  const fromButton = !!praticaId

  const analisi = useMemo(() => {
    if (!pratica) return null
    const listino = listinoDaContratto(pratica)
    const tariffaPubblicata = Math.round(listino * (1 + pratica.markup / 100) * (fonte === 'Network' ? 0.98 : 1))
    const competitors = prezziCompetitor(pratica.destinazione, listino, fonte)
    const prezzi = competitors.map((c) => c.prezzo)
    const media = Math.round(prezzi.reduce((a, b) => a + b, 0) / prezzi.length)
    const min = Math.min(...prezzi)
    const max = Math.max(...prezzi)
    const deltaPct = Math.round(((tariffaPubblicata - media) / media) * 1000) / 10
    const piuEconomici = competitors.filter((c) => c.prezzo < tariffaPubblicata).length
    // Markup che allineerebbe la tariffa alla media di mercato.
    const markupTarget = Math.max(0, Math.round((media / listino - 1) * 100))
    // Righe ordinate per prezzo (competitor + "io").
    const righe = [
      ...competitors.map((c) => ({ ...c, io: false })),
      { nome: 'La tua offerta', prezzo: tariffaPubblicata, io: true },
    ].sort((a, b) => a.prezzo - b.prezzo)
    const scaleMax = Math.max(max, tariffaPubblicata) * 1.06
    return { listino, tariffaPubblicata, competitors, media, min, max, deltaPct, piuEconomici, markupTarget, righe, scaleMax }
  }, [pratica, fonte])

  if (!pratica || !analisi) {
    return (
      <div className="mklens">
        <BtnBack />
        <PageHeader title="Market lens" subtitle="Monitoraggio del posizionamento competitivo delle offerte" />
        <p className="mklens__empty">Nessuna pratica disponibile da analizzare. Creane una da “Crea pratica”.</p>
      </div>
    )
  }

  const sopraMedia = analisi.deltaPct > 0

  return (
    <div className="mklens">
      <BtnBack onClick={() => navigate(fromButton ? 'monitoraggio-pratiche' : 'home')} />
      <PageHeader
        title="Market lens"
        subtitle="Confronta i tuoi prezzi pubblicati in Agorà e Tableau con quelli dei competitor sul mercato"
      />

      {/* Banner dettaglio pratica (quando si arriva dal pulsante "Accelera") */}
      {fromButton && (
        <div className="mklens__banner">
          <i className="fa-solid fa-gauge-high" aria-hidden="true" />
          <span>Analisi del preventivo della pratica <strong>{pratica.destinazione}</strong> ({pratica.categoria}★) — verifica il posizionamento e riformula in Action centre.</span>
        </div>
      )}

      {/* ── Controlli: pratica + fonte ────────────────────────────────────────── */}
      <div className="mklens__controls">
        <SelectField
          label="Preventivo / pratica"
          name="pratica"
          className="mklens__select"
          value={pratica.id}
          options={pratiche.map((p) => ({ value: p.id, label: `${p.destinazione} · ${p.categoria}★ · ${TIPOLOGIA_META[p.tipologia].label}` }))}
          onChange={(e) => setSelId(e.target.value)}
        />
        <div className="mklens__fonte">
          <label className="mklens__fonte-label">Tariffe pubblicate su</label>
          <div className="mklens__seg" role="group" aria-label="Fonte tariffe">
            {FONTI.map((f) => (
              <button
                key={f}
                type="button"
                className={`mklens__seg-btn ${fonte === f ? 'is-active' : ''}`}
                onClick={() => setFonte(f)}
                aria-pressed={fonte === f}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dettaglio offerta ─────────────────────────────────────────────────── */}
      <div className="mklens__offer">
        <div className="mklens__offer-head">
          <span className="mklens__offer-dest"><i className="fa-light fa-location-dot" aria-hidden="true" /> {pratica.destinazione}</span>
          <Stars n={pratica.categoria} />
          <span className="mklens__offer-tipo"><i className={`fa-light fa-${TIPOLOGIA_META[pratica.tipologia].icon}`} aria-hidden="true" /> {TIPOLOGIA_META[pratica.tipologia].label}</span>
          <span className="mklens__offer-assignee">
            <i className="fa-light fa-user-group" aria-hidden="true" /> {pratica.assegnazione.tipo === 'team' ? 'Tutto il team' : pratica.assegnazione.nome}
          </span>
          <span className={`mklens__offer-stato mklens__offer-stato--${STATO_PRATICA_META[pratica.stato].tone}`}>{STATO_PRATICA_META[pratica.stato].label}</span>
        </div>

        <dl className="mklens__detail">
          <div className="mklens__detail-item">
            <dt>Listino da contratto</dt>
            <dd>{eur(analisi.listino)}</dd>
          </div>
          <div className="mklens__detail-item">
            <dt>Markup</dt>
            <dd>{pratica.markup}%</dd>
          </div>
          <div className="mklens__detail-item">
            <dt>Tua tariffa ({fonte})</dt>
            <dd className="mklens__detail-strong">{eur(analisi.tariffaPubblicata)}</dd>
          </div>
          <div className="mklens__detail-item">
            <dt>Media mercato</dt>
            <dd>{eur(analisi.media)}</dd>
          </div>
          <div className="mklens__detail-item">
            <dt>Forbice mercato</dt>
            <dd>{eur(analisi.min)} – {eur(analisi.max)}</dd>
          </div>
          <div className="mklens__detail-item">
            <dt>Δ vs media</dt>
            <dd className={sopraMedia ? 'mklens__delta--up' : 'mklens__delta--down'}>
              {sopraMedia ? '+' : ''}{analisi.deltaPct}%
            </dd>
          </div>
        </dl>
      </div>

      {/* ── Benchmark competitor ──────────────────────────────────────────────── */}
      <div className="mklens__bench">
        <div className="mklens__bench-head">
          <h2 className="mklens__bench-title">Posizionamento sul mercato</h2>
          <span className="mklens__bench-legend">
            <span className="mklens__dot mklens__dot--me" /> La tua offerta
            <span className="mklens__dot mklens__dot--avg" /> Media mercato {eur(analisi.media)}
          </span>
        </div>
        <div className="mklens__bars">
          {analisi.righe.map((r) => (
            <div key={r.nome} className={`mklens__bar-row${r.io ? ' mklens__bar-row--me' : ''}`}>
              <span className="mklens__bar-name">{r.nome}</span>
              <span className="mklens__bar-track">
                <span className="mklens__bar-fill" style={{ width: `${(r.prezzo / analisi.scaleMax) * 100}%` }} />
                <span className="mklens__bar-avg" style={{ left: `${(analisi.media / analisi.scaleMax) * 100}%` }} aria-hidden="true" />
              </span>
              <span className="mklens__bar-val">{eur(r.prezzo)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Insight + Action centre ───────────────────────────────────────────── */}
      <div className={`mklens__insight mklens__insight--${sopraMedia ? 'warn' : 'ok'}`}>
        <div className="mklens__insight-icon"><i className={`fa-solid fa-${sopraMedia ? 'triangle-exclamation' : 'circle-check'}`} aria-hidden="true" /></div>
        <div className="mklens__insight-body">
          {sopraMedia ? (
            <>
              <p className="mklens__insight-title">Sei sopra la media di mercato del {analisi.deltaPct}%</p>
              <p className="mklens__insight-text">
                La tua tariffa ({eur(analisi.tariffaPubblicata)}) è più alta di {analisi.piuEconomici} competitor su {analisi.competitors.length}: probabile causa del rifiuto del preventivo.
                Per allinearti alla media ({eur(analisi.media)}) porta il markup a circa <strong>{analisi.markupTarget}%</strong>.
              </p>
            </>
          ) : (
            <>
              <p className="mklens__insight-title">Sei competitivo</p>
              <p className="mklens__insight-text">
                La tua tariffa ({eur(analisi.tariffaPubblicata)}) è in linea o sotto la media di mercato ({eur(analisi.media)}). C'è margine per ottimizzare il markup mantenendo la competitività.
              </p>
            </>
          )}
        </div>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate(`action-centre:${pratica.id}`)}>
          <i className="fa-light fa-bullseye" aria-hidden="true" /> Riformula in Action centre
        </button>
      </div>
    </div>
  )
}
