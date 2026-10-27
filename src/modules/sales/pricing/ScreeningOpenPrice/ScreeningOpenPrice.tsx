import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ReferenceLine,
} from 'recharts'
import Modal from '../../../../core/components/Modal'
import PageHead from '../../../../core/components/PageHead'
import Pagination from '../../../../core/components/Pagination'
import Tooltip from '../../../../core/components/Tooltip'
import Card from '../../../../core/components/Card'
import TruncatedText from '../../../../core/components/TruncatedText'
import { toast } from '../../../../core/components/Toast/useToast'
import { SelectField, DateRangeField, CheckboxField } from '../../../../core/components/form'
import {
  ChartTooltip, BiLegend, series, CHART, ANIM, reducedMotion,
  gridProps, xAxisProps, yAxisProps, cursorProps, fmtEur,
} from '../../../../core/bi'
import { useStrutturaPagina } from '../../../../hooks/useStrutturaCorrente'
import './ScreeningOpenPrice.sass'

/**
 * Screening open price — tariffa suggerita dall'AI per ogni tipologia camera e
 * giorno, confrontata con il prezzo aperto attuale. A sinistra la copertura del
 * periodo (calendari a mappa di calore: quante tipologie hanno un prezzo aperto
 * per giorno, cliccabili per filtrare), a destra il dettaglio con lenti
 * Da alzare / Da abbassare / Da aprire, selezione e Applica. Il suggerimento
 * apre l'analisi giorno per giorno (Strategie · AI · LY).
 */

const ROOMS = [
  { label: 'Singola Classic',                  base: 153.68 },
  { label: 'Doppia Classic',                   base: 186.24 },
  { label: 'Doppia Economy',                   base: 140.00 },
  { label: 'Tripla Classic',                   base: 195.00 },
  { label: 'Matrimoniale Classic',             base: 172.00 },
  { label: 'Matrimoniale Deluxe',              base: 233.83 },
  { label: 'Matrimoniale Superior',            base: 220.00 },
  { label: 'Doppia convertibile Standard',     base: 247.98 },
  { label: 'Doppia convertibile Deluxe',       base: 220.30 },
]
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const MESI_BREVI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const GIORNI_BREVI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

// Date demo relative a oggi.
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const isoDa = (base: string, n: number) => { const d = new Date(base + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d) }
const isoFra = (n: number) => isoDa(iso(new Date()), n)
const dataBreve = (s: string) => { const d = new Date(s + 'T12:00:00'); return `${d.getDate()} ${MESI_BREVI[d.getMonth()]}` }
const dataLunga = (s: string) => { const d = new Date(s + 'T12:00:00'); return `${GIORNI_BREVI[d.getDay()]} ${d.getDate()} ${MESI_BREVI[d.getMonth()]}` }

type Esito = 'alza' | 'abbassa' | 'apri'
interface Row { id: number; iso: string; struttura: string; tipologia: string; att: number; ai: number; del: number; pct: number; hasP: boolean; esito: Esito }

const genData = (struttura: string, from: string, to: string): Row[] => {
  const arr: Row[] = []
  let c = new Date(from + 'T12:00:00')
  const e = new Date(to + 'T12:00:00')
  let id = 0
  while (c <= e) {
    const dd = c.getDate(), mm = c.getMonth()
    ROOMS.forEach((rm, ri) => {
      const seed = (dd * 17 + ri * 29 + (mm + 1) * 11) % 100
      const hasP = seed > 30
      const att = hasP ? Math.round((rm.base + (seed % 30) - 15) * 100) / 100 : 0
      const ai = Math.round(rm.base * (0.82 + (seed % 40) / 100) * 100) / 100
      const del = Math.round((ai - att) * 100) / 100
      const esito: Esito = !hasP ? 'apri' : del >= 0 ? 'alza' : 'abbassa'
      arr.push({ id: id++, iso: iso(c), struttura, tipologia: rm.label, att, ai, del, pct: hasP ? (del / att) * 100 : 0, hasP, esito })
    })
    c = new Date(c.getFullYear(), c.getMonth(), c.getDate() + 1, 12)
  }
  return arr
}

const LENTI: { k: 'tutte' | Esito; label: string; icon: string }[] = [
  { k: 'tutte',   label: 'Tutte',        icon: 'fa-layer-group' },
  { k: 'alza',    label: 'Da alzare',    icon: 'fa-arrow-trend-up' },
  { k: 'abbassa', label: 'Da abbassare', icon: 'fa-arrow-trend-down' },
  { k: 'apri',    label: 'Da aprire',    icon: 'fa-lock-open' },
]

// Periodi rapidi, da oggi: il calendario regge fino a un anno
const PERIODI = [
  { label: '30 giorni', n: 30 },
  { label: '3 mesi', n: 91 },
  { label: '6 mesi', n: 182 },
  { label: '12 mesi', n: 364 },
]

const FASI = ['Raccolta tariffe dei competitor', 'Lettura della domanda e del pick-up', 'Calcolo dei suggerimenti per tipologia']

/** Barra di variazione divergente (centro = prezzo attuale), scala ±30%. */
function DeltaBar({ pct }: { pct: number }) {
  const lvl = Math.min(6, Math.max(1, Math.round(Math.abs(pct) / 5)))
  return (
    <span className={`sop__dbar ${pct >= 0 ? 'is-up' : 'is-down'}`} aria-hidden="true">
      <span className={`sop__dbar-fill sop__dbar-fill--${lvl}`} />
    </span>
  )
}

export default function ScreeningOpenPrice({ navigate }: { navigate: (p: string) => void }) {
  const [struttura, setStruttura, opzioniStrutture] = useStrutturaPagina()
  // Prossimo mese a partire da oggi.
  const [inputFrom, setInputFrom] = useState(() => isoFra(0))
  const [inputTo, setInputTo] = useState(() => isoFra(30))
  const [activeFrom, setActiveFrom] = useState(() => isoFra(0))
  const [activeTo, setActiveTo] = useState(() => isoFra(30))
  const [data, setData] = useState<Row[]>(() => genData(struttura, isoFra(0), isoFra(30)))
  const [loading, setLoading] = useState(false)
  const [fase, setFase] = useState(0)
  // Spazio per affiancare copertura e tabella (misurato sul contenitore,
  // sotto soglia le card si impilano e la mappa torna orizzontale)
  const rootRef = useRef<HTMLDivElement>(null)
  const [affianca, setAffianca] = useState(false)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setAffianca(e.contentRect.width >= 1080))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const [pg, setPg] = useState(1)
  const [lente, setLente] = useState<'tutte' | Esito>('tutte')
  const [tipologia, setTipologia] = useState('')
  const [giorno, setGiorno] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [applied, setApplied] = useState<Set<number>>(new Set())
  const [modalRow, setModalRow] = useState<Row | null>(null)
  const [modalOff, setModalOff] = useState(0)

  // Cambiata la struttura selezionata: si riscreena il periodo attivo.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setData(genData(struttura, activeFrom, activeTo)); setApplied(new Set()); setSelected(new Set()) }, [struttura])

  // Avanzamento delle fasi dello screening mentre carica.
  useEffect(() => {
    if (!loading) return
    setFase(0)
    const t1 = window.setTimeout(() => setFase(1), 900)
    const t2 = window.setTimeout(() => setFase(2), 1800)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [loading])

  const triggerLoad = (from: string, to: string) => {
    if (!from || !to || from > to) return
    setLoading(true); setPg(1); setSelected(new Set()); setApplied(new Set()); setGiorno(null)
    window.setTimeout(() => { setData(genData(struttura, from, to)); setActiveFrom(from); setActiveTo(to); setLoading(false) }, 2800)
  }

  // ── Copertura per giorno (quante tipologie hanno un prezzo aperto) ───────────
  const perGiorno = useMemo(() => {
    const m = new Map<string, number>()
    data.forEach((r) => m.set(r.iso, (m.get(r.iso) ?? 0) + (r.hasP ? 1 : 0)))
    return m
  }, [data])
  const aperti = Array.from(perGiorno.values())
  const coperturaMedia = aperti.length ? Math.round((aperti.reduce((a, n) => a + n, 0) / (aperti.length * ROOMS.length)) * 100) : 0
  const giorniConBuchi = aperti.filter((n) => n < ROOMS.length).length

  const mesi = useMemo(() => {
    const out: { year: number; month: number; dim: number }[] = []
    const s = new Date(activeFrom + 'T12:00:00'), e = new Date(activeTo + 'T12:00:00')
    let c = new Date(s.getFullYear(), s.getMonth(), 1, 12)
    while (c <= e && out.length < 13) {
      out.push({ year: c.getFullYear(), month: c.getMonth(), dim: new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate() })
      c = new Date(c.getFullYear(), c.getMonth() + 1, 1, 12)
    }
    return out
  }, [activeFrom, activeTo])

  // ── Filtri ───────────────────────────────────────────────────────────────────
  const base = data.filter((r) => (!giorno || r.iso === giorno) && (!tipologia || r.tipologia === tipologia))
  const conteggi = { tutte: base.length, alza: 0, abbassa: 0, apri: 0 } as Record<'tutte' | Esito, number>
  base.forEach((r) => { conteggi[r.esito]++ })
  const rows = lente === 'tutte' ? base : base.filter((r) => r.esito === lente)

  const PER = 10
  const total = Math.max(1, Math.ceil(rows.length / PER))
  const page = Math.min(pg, total)
  const pageData = rows.slice((page - 1) * PER, page * PER)
  const selezionabili = pageData.filter((r) => !applied.has(r.id))
  const allPage = selezionabili.length > 0 && selezionabili.every((r) => selected.has(r.id))
  const nSel = Array.from(selected).filter((id) => !applied.has(id)).length

  const applica = () => {
    if (!nSel) return
    setApplied((a) => new Set([...Array.from(a), ...Array.from(selected)]))
    setSelected(new Set())
    toast.success(`Tariffe aggiornate su ${nSel} combinazion${nSel === 1 ? 'e' : 'i'} giorno/tipologia`, 'Suggerimenti applicati')
  }

  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  // ── Analisi del suggerimento (modale) ────────────────────────────────────────
  const chart = useMemo(() => {
    if (!modalRow) return []
    return Array.from({ length: 15 }, (_, i) => {
      const s = (modalRow.id * 7 + i * 13) % 100
      const ai = Math.round(modalRow.ai * (0.88 + (s % 25) / 100))
      return {
        iso: isoDa(modalRow.iso, i - 7),
        str: Math.round(modalRow.ai * (0.78 + (s % 45) / 100)),
        ai,
        ly: Math.round(modalRow.ai * (0.7 + ((s * 3) % 20) / 100)),
      }
    })
  }, [modalRow])
  const cur = chart[modalOff]
  const anim = !reducedMotion()

  // Cella della mappa di copertura (comune alle due disposizioni)
  const cella = (year: number, month: number, dim: number, i: number) => {
    const key = `${year}-${month}-${i}`
    if (i >= dim) return <span key={key} className="sop__cell is-none" />
    const d = new Date(year, month, i + 1, 12)
    const k = iso(d)
    const we = d.getDay() === 0 || d.getDay() === 6 ? 'is-we' : ''
    const n = perGiorno.get(k)
    if (n === undefined) return <span key={key} className={`sop__cell is-out ${we}`} />
    const lvl = n === 0 ? 0 : Math.min(4, Math.ceil((n / ROOMS.length) * 4))
    return (
      <Tooltip key={key} text={`${dataLunga(k)} · ${n} di ${ROOMS.length} tipologie con prezzo aperto`}>
        <button type="button" className={`sop__cell sop__day--l${lvl} ${we} ${giorno === k ? 'is-sel' : ''}`}
          onClick={() => { setGiorno((g) => (g === k ? null : k)); setPg(1) }}
          aria-pressed={giorno === k} aria-label={`${dataLunga(k)}, ${n} tipologie aperte`} />
      </Tooltip>
    )
  }

  const periodi = (
    <div className="sop__seg sop__seg--sm" role="radiogroup" aria-label="Periodo rapido">
      {PERIODI.map((pp) => {
        const to = isoFra(pp.n)
        const on = activeFrom === isoFra(0) && activeTo === to
        return (
          <button key={pp.n} type="button" role="radio" aria-checked={on} className={on ? 'is-on' : ''}
            onClick={() => { const f = isoFra(0); setInputFrom(f); setInputTo(to); triggerLoad(f, to) }}>
            {pp.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="sop" ref={rootRef}>
      {loading && (
        <div className="sop__loading" role="status" aria-live="polite">
          <div className="sop__loading-card">
            <span className="sop__radar" aria-hidden="true">
              <span /><span /><span />
              <i className="fa-solid fa-satellite-dish" />
            </span>
            <strong className="sop__loading-title">Screening in corso</strong>
            <span className="sop__loading-sub">Sincronizziamo e analizziamo i dati provenienti da fonti esterne</span>
            <ul className="sop__steps">
              {FASI.map((f, i) => (
                <li key={f} className={i < fase ? 'is-done' : i === fase ? 'is-run' : ''}>
                  <i className={`fa-solid ${i < fase ? 'fa-circle-check' : i === fase ? 'fa-spinner-third' : 'fa-circle'}`} aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <PageHead title="Screening open price" subtitle="Aumenta l'accuratezza dei suggerimenti attraverso uno screening dedicato per ogni tipologia di camera assegnata a ciascun canale di vendita" />

      {/* ── Toolbar ── */}
      <div className="sop__toolbar">
        <div className="sop__filters">
          <SelectField name="struttura" label="Struttura" value={struttura}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStruttura(e.target.value)}
            options={opzioniStrutture} className="sop__struttura" />
          <DateRangeField label="Date" nameFrom="inputFrom" nameTo="inputTo" valueFrom={inputFrom} valueTo={inputTo}
            onChangeFrom={(e: React.ChangeEvent<HTMLInputElement>) => setInputFrom(e.target.value)}
            onChangeTo={(e: React.ChangeEvent<HTMLInputElement>) => { setInputTo(e.target.value); triggerLoad(inputFrom, e.target.value) }} />
          <SelectField name="tipologia" label="Tipologia" value={tipologia} placeholder="Tutte"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setTipologia(e.target.value); setPg(1) }}
            options={[{ value: '', label: 'Tutte' }, ...ROOMS.map((r) => ({ value: r.label, label: r.label }))]} className="sop__tipologia" />
        </div>

        <div className="sop__right">
        <div className="sop__seg" role="radiogroup" aria-label="Suggerimenti da mostrare">
          {LENTI.map((l) => (
            <button key={l.k} type="button" role="radio" aria-checked={lente === l.k}
              className={lente === l.k ? 'is-on' : ''}
              onClick={() => { setLente(l.k); setPg(1) }}>
              <i className={`fa-solid ${l.icon}`} aria-hidden="true" />
              {l.label}
              <span className="sop__seg-n">{conteggi[l.k]}</span>
            </button>
          ))}
        </div>

        <Tooltip text="Suggerimenti data driven">
          <button type="button" className="sib-btn sib-btn--icon sop__link" onClick={() => navigate('sugg-data-driven')} aria-label="Suggerimenti data driven">
            <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
          </button>
        </Tooltip>
        </div>
      </div>

      <div className={`sop__layout ${affianca ? 'sop__layout--side' : ''}`}>

        {/* ── Copertura del periodo ── */}
        <Card title="Copertura del periodo" className="sop__card sop__card--cov" headerRight={periodi}>
          <div className="sop__cov-info">
            <span>Copertura media <strong>{coperturaMedia}%</strong> · {giorniConBuchi} giorn{giorniConBuchi === 1 ? 'o' : 'i'} su {aperti.length} con tipologie chiuse</span>
            <span className="sop__scale">
              Tipologie con prezzo aperto
              <span className="sop__scale-bar" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`sop__day--l${l}`} />)}
              </span>
              0 → {ROOMS.length}
            </span>
          </div>

          {/* Una riga per mese, colonne 1-31: un anno resta compatto */}
          <div className="sop__year" role="grid" aria-label="Copertura per giorno">
            <span className="sop__year-corner" />
            {Array.from({ length: 31 }, (_, i) => <span key={`h${i}`} className="sop__year-h">{i + 1}</span>)}
            {mesi.map(({ year, month, dim }) => (
              <React.Fragment key={`${year}-${month}`}>
                <span className="sop__year-m">{MESI[month].slice(0, 3)} {String(year).slice(2)}</span>
                {Array.from({ length: 31 }, (_, i) => cella(year, month, dim, i))}
              </React.Fragment>
            ))}
          </div>
        </Card>

        {/* ── Suggerimenti ── */}
        <Card title="Tariffe suggerite" noPadding className="sop__card sop__card--tbl" headerRight={
          <div className="sop__tbl-info">
            <span className="sop__tbl-count"><strong>{base.length}</strong> combinazioni · <span className="sib-cell--success">{conteggi.alza} da alzare</span> · <span className="sib-cell--warning">{conteggi.abbassa} da abbassare</span> · {conteggi.apri} da aprire</span>
            {giorno && (
              <button type="button" className="sib-btn sib-btn--toolbar sib-btn--sm sop__day-filter" onClick={() => { setGiorno(null); setPg(1) }}>
                <i className="fa-solid fa-calendar-day" aria-hidden="true" /> {dataLunga(giorno)}
                <i className="fa-solid fa-xmark" aria-label="Rimuovi filtro giorno" />
              </button>
            )}
          </div>
        }>
          <div className="sop__tbl-wrap">
            <table className="sib-table sop__tbl">
              <colgroup>
                <col className="sop__c-chk" /><col className="sop__c-day" /><col /><col className="sop__c-num" />
                <col className="sop__c-ai" /><col className="sop__c-delta" />
              </colgroup>
              <thead>
                <tr>
                  <th><CheckboxField name="all" checked={allPage} disabled={!selezionabili.length}
                    onChange={() => setSelected((s) => { const n = new Set(s); selezionabili.forEach((r) => (allPage ? n.delete(r.id) : n.add(r.id))); return n })} /></th>
                  <th>Giorno</th>
                  <th>Tipologia</th>
                  <th className="sop__r">Attuale</th>
                  <th className="sop__r">Suggerita AI</th>
                  <th>Variazione</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((r) => {
                  const done = applied.has(r.id)
                  return (
                    <tr key={r.id} className={`${selected.has(r.id) && !done ? 'is-sel' : ''} ${done ? 'is-done' : ''}`}>
                      <td>
                        {done
                          ? <Tooltip text="Suggerimento applicato"><i className="fa-solid fa-circle-check sop__ok" aria-hidden="true" /></Tooltip>
                          : <CheckboxField name={`r-${r.id}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />}
                      </td>
                      <td className="sop__nw">{dataLunga(r.iso)}</td>
                      <td><TruncatedText text={r.tipologia} className="sop__tipo" /></td>
                      <td className="sop__r sop__nw">
                        {r.hasP ? fmtEur(done ? r.ai : r.att) : <span className="sib-cell--muted">Non aperto</span>}
                      </td>
                      <td className="sop__r">
                        <Tooltip text="Analisi del suggerimento">
                          <button type="button" className="sop__ai" onClick={() => { setModalRow(r); setModalOff(7) }}>
                            {fmtEur(r.ai)}
                            <i className="fa-solid fa-chart-line" aria-hidden="true" />
                          </button>
                        </Tooltip>
                      </td>
                      <td>
                        {done
                          ? <span className="sib-cell--success">Applicata</span>
                          : r.hasP
                            ? (
                              <span className="sop__delta">
                                <DeltaBar pct={r.pct} />
                                <span className={`sop__delta-v ${r.del >= 0 ? 'sib-cell--success' : 'sib-cell--warning'}`}>
                                  {r.del >= 0 ? '+' : '−'}{fmtEur(Math.abs(r.del))}
                                </span>
                                <span className="sop__delta-p">{r.pct >= 0 ? '+' : '−'}{Math.abs(r.pct).toLocaleString('it-IT', { maximumFractionDigits: 1 })}%</span>
                              </span>
                            )
                            : <span className="sop__state"><i className="fa-solid fa-lock-open" aria-hidden="true" /> Da aprire</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="sop__empty">Nessun suggerimento per i filtri selezionati.</div>
            )}
          </div>

          <footer className="sop__foot">
            <span className="sop__foot-sel">{nSel > 0 ? `${nSel} selezionat${nSel === 1 ? 'a' : 'e'}` : ''}</span>
            <Pagination page={page} totalPages={total} onPageChange={setPg} className="sop__pag" />
            <span className="sop__foot-end">
              <button type="button" className="sib-btn sib-btn--primary sop__apply" disabled={!nSel} onClick={applica}>
                <i className="fa-solid fa-check-double" aria-hidden="true" /> Applica
              </button>
            </span>
          </footer>
        </Card>
      </div>

      {/* ── Analisi del suggerimento ── */}
      <Modal open={!!modalRow} onClose={() => setModalRow(null)} title="Analisi suggerimento AI" size="lg" className="sop-modal">
        {modalRow && cur && (
          <>
            <div className="sop-modal__sub">
              <strong>{modalRow.tipologia}</strong> · {modalRow.struttura} · 7 giorni prima e dopo il {dataBreve(modalRow.iso)}
            </div>

            <div className="sop-modal__bar">
              <button type="button" className="sib-btn sib-btn--icon" onClick={() => setModalOff((o) => Math.max(0, o - 1))} disabled={modalOff === 0} aria-label="Giorno precedente">
                <i className="fa-solid fa-chevron-left" aria-hidden="true" />
              </button>
              <span className="sop-modal__day">{dataLunga(cur.iso)}</span>
              <button type="button" className="sib-btn sib-btn--icon" onClick={() => setModalOff((o) => Math.min(chart.length - 1, o + 1))} disabled={modalOff === chart.length - 1} aria-label="Giorno successivo">
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
              <BiLegend className="sop-modal__legend" items={[
                { key: 'str', name: 'Strategie pricing', color: series(0), value: fmtEur(cur.str, 0) },
                { key: 'ai', name: 'AI', color: series(1), value: fmtEur(cur.ai, 0) },
                { key: 'ly', name: 'Anno precedente', color: CHART.ly, value: fmtEur(cur.ly, 0), dashed: true },
              ]} />
            </div>

            <div className="sop-modal__chart">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
                  onClick={(s: any) => { if (s && typeof s.activeTooltipIndex === 'number') setModalOff(s.activeTooltipIndex) }}>
                  <defs>
                    <linearGradient id="sop-g-str" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={series(0)} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={series(0)} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="sop-g-ai" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={series(1)} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={series(1)} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="iso" {...xAxisProps} tickFormatter={dataBreve} />
                  <YAxis {...yAxisProps} tickFormatter={(v: number) => `${v} €`} />
                  <RTooltip cursor={cursorProps}
                    content={(p: any) => <ChartTooltip {...p} title={p.label ? dataLunga(String(p.label)) : undefined}
                      names={{ str: 'Strategie pricing', ai: 'AI', ly: 'Anno precedente' }} format={(v) => fmtEur(v, 0)} />} />
                  <ReferenceLine x={cur.iso} stroke={CHART.ink} strokeDasharray="4 3" />
                  <Area type="monotone" dataKey="str" stroke={series(0)} strokeWidth={2} fill="url(#sop-g-str)"
                    isAnimationActive={anim} animationDuration={ANIM.duration} animationBegin={ANIM.begin(0)} dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="ai" stroke={series(1)} strokeWidth={2} fill="url(#sop-g-ai)"
                    isAnimationActive={anim} animationDuration={ANIM.duration} animationBegin={ANIM.begin(1)} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="ly" stroke={CHART.ly} strokeWidth={1.5} strokeDasharray="5 4"
                    isAnimationActive={anim} animationDuration={ANIM.duration} animationBegin={ANIM.begin(2)} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="sop-modal__hint"><i className="fa-solid fa-hand-pointer" aria-hidden="true" /> Clicca sul grafico o usa le frecce per cambiare giorno</p>
          </>
        )}
      </Modal>
    </div>
  )
}
