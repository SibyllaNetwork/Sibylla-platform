import React, { useEffect, useMemo, useRef, useState } from 'react'
import Modal from '../../../core/components/Modal'
import { InputField, SelectField } from '../../../core/components/form'
import { withFlag } from '../../../core/utils/countryFlags'
import type { AnnuncioPubblicato } from '../../../store/useAnnunciStore'
import './AcquistoAnnuncio.sass'

const BASE_MESE = 450 // valore abbonamento mensile per lotto
const MIN_MESI = 4
const MERCATI = ['Nessuna', 'Italia', 'Germania', 'Francia', 'Regno Unito', 'Spagna', 'Extra Europa']
const MESI_ABBR = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

const p2 = (n: number) => String(n).padStart(2, '0')
const fmtEur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

interface Mese { y: number; m: number }

// Mesi coperti dal periodo ("gg/mm/aaaa - gg/mm/aaaa" oppure "m/aaaa - m/aaaa").
function mesiPeriodo(periodo: string): Mese[] {
  const parts = periodo.split(' - ')
  if (parts.length < 2) return []
  const parse = (p: string) => {
    const seg = p.trim().split('/').map(Number)
    return seg.length === 3 ? { m: seg[1], y: seg[2] } : { m: seg[0], y: seg[1] }
  }
  const s = parse(parts[0]), e = parse(parts[1])
  const out: Mese[] = []
  let y = s.y, m = s.m, guard = 0
  while ((y < e.y || (y === e.y && m <= e.m)) && guard < 60) {
    out.push({ y, m }); m += 1; if (m > 12) { m = 1; y += 1 }; guard += 1
  }
  return out
}

const meseLabel = (mm: Mese) => `${MESI_ABBR[mm.m - 1]} ${mm.y}`

// Pagina interlocutoria di acquisto dei contratti di vendita di un annuncio.
export function AcquistoAnnuncio({ a, onClose }: { a: AnnuncioPubblicato; onClose: () => void }) {
  const mesi = useMemo(() => mesiPeriodo(a.periodo), [a.periodo])
  const n = mesi.length
  const dimLotto = Math.round(a.camere / Math.max(1, a.lotti))
  const maxLotti = a.quantitaMax ?? a.lotti
  const tourOp = a.destinatario && a.destinatario !== 'Tutti' ? a.destinatario : 'Tour Operator Test'

  const [numLotti, setNumLotti] = useState(1)
  const [mercato, setMercato] = useState('Nessuna')
  // Maniglie del range: aIdx = inizio, bIdx = fine (default = finestra minima valida).
  const [aIdx, setAIdx] = useState(0)
  const [bIdx, setBIdx] = useState(() => Math.min(MIN_MESI, Math.max(1, mesi.length)) - 1)
  const [drag, setDrag] = useState<null | 'a' | 'b'>(null)
  const [inviata, setInviata] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const listino = useMemo(() => mesi.map(({ y, m }) => {
    const last = new Date(y, m, 0).getDate()
    return { dal: `01/${p2(m)}/${y}`, al: `${p2(last)}/${p2(m)}/${y}`, adulti: '10,00 €', ragazzi: '10,00 €', supp: '10,00 €' }
  }), [mesi])

  const lo = Math.min(aIdx, bIdx)
  const hi = Math.max(aIdx, bIdx)
  const count = n > 0 ? hi - lo + 1 : 0
  const mese = numLotti * BASE_MESE
  const totale = count * mese
  const valido = count >= MIN_MESI

  const pct = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50)
  const clamp = (v: number) => Math.min(n - 1, Math.max(0, v))

  const idxFromClientX = (clientX: number) => {
    const el = trackRef.current
    if (!el || n <= 1) return 0
    const r = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    return Math.round(ratio * (n - 1))
  }

  const moveNearest = (i: number) => {
    if (Math.abs(i - aIdx) <= Math.abs(i - bIdx)) setAIdx(i)
    else setBIdx(i)
  }

  const startDrag = (which: 'a' | 'b') => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDrag(which)
  }

  const onTrackDown = (e: React.PointerEvent) => {
    const i = idxFromClientX(e.clientX)
    const which = Math.abs(i - aIdx) <= Math.abs(i - bIdx) ? 'a' : 'b'
    if (which === 'a') setAIdx(i); else setBIdx(i)
    setDrag(which)
  }

  const onKey = (which: 'a' | 'b') => (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1
      : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0
    if (!d) return
    e.preventDefault()
    if (which === 'a') setAIdx((v) => clamp(v + d)); else setBIdx((v) => clamp(v + d))
  }

  // Drag globale finché il puntatore è premuto.
  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) => {
      const i = idxFromClientX(e.clientX)
      if (drag === 'a') setAIdx(i); else setBIdx(i)
    }
    const up = () => setDrag(null)
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
    return () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up) }
  }, [drag, n])

  // Scorciatoie di durata (dal primo mese).
  const chipDurs = Array.from(new Set([MIN_MESI, 6, n].filter((d) => d >= 1 && d <= n)))
  const applyChip = (d: number) => { setAIdx(0); setBIdx(d - 1) }

  return (
    <Modal open onClose={onClose} title={inviata ? 'Richiesta inviata' : 'Annuncio Sibylla'} size="xl" className="acq-box">
      {inviata ? (
        <div className="acq-ok">
          <div className="acq-ok__icon"><i className="fa-solid fa-circle-check" aria-hidden="true" /></div>
          <h3 className="acq-ok__title">Richiesta di acquisto inviata</h3>
          <p className="acq-ok__text">
            La tua richiesta per <strong>{numLotti}</strong> {numLotti === 1 ? 'lotto' : 'lotti'} ({count} mesi) su
            {' '}«{a.struttura}» è stata inviata. Riceverai un riscontro dall'operatore.
          </p>
          <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Chiudi</button>
        </div>
      ) : (
        <div className="acq">
          {/* Hero */}
          <div className="acq__hero">
            <div className="acq__hero-main">
              <span className="acq__hero-eyebrow">Contratto di vendita · {a.ospiti || 'Gruppi'}</span>
              <h3 className="acq__hero-name">{a.struttura}</h3>
              <div className="acq__hero-tags">
                <span className="acq__tag"><i className="fa-light fa-bed" /> {a.tipologia}</span>
                <span className="acq__tag"><i className="fa-light fa-layer-group" /> {dimLotto} camere/lotto</span>
                <span className="acq__tag"><i className="fa-light fa-user-tie" /> {tourOp}</span>
              </div>
            </div>
            <div className="acq__hero-price">
              <span className="acq__hero-price-label">da</span>
              <span className="acq__hero-price-val">{fmtEur(BASE_MESE)}</span>
              <span className="acq__hero-price-unit">/ mese · lotto</span>
            </div>
          </div>

          <div className="acq__cols">
            {/* Dettaglio contratti */}
            <section className="acq__card">
              <h4 className="acq__sec-h"><i className="fa-light fa-file-contract" /> Dettaglio Contratti</h4>
              <dl className="acq__dl">
                {([
                  ['Quantità lotti', String(a.lotti)],
                  ['Tipologia', a.ospiti || 'Gruppi'],
                  ['Genere', a.tipologia],
                  ['Dimensione Lotto', `${dimLotto} Camere`],
                  ['Struttura', a.struttura],
                  ['Quantità massima acquistabile', String(maxLotti)],
                  ['Garanzie richieste', a.garanzie || 'Nessuna'],
                  ['Tipologia pagamento', a.pagamento || 'VCC'],
                  ['Tour Operator', tourOp],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="acq__dl-row"><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
            </section>

            {/* Listino tariffario */}
            <section className="acq__card">
              <h4 className="acq__sec-h"><i className="fa-light fa-tags" /> Listino Tariffario</h4>
              <div className="sib-table-wrap">
                <table className="sib-table acq__table">
                  <thead>
                    <tr><th>Dal</th><th>Al</th><th>Tariffa adulti</th><th>Tariffa ragazzi</th><th>Supp. singola</th></tr>
                  </thead>
                  <tbody>
                    {listino.map((r, i) => (
                      <tr key={i}><td>{r.dal}</td><td>{r.al}</td><td>{r.adulti}</td><td>{r.ragazzi}</td><td>{r.supp}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Condizioni generali */}
          <section className="acq__card acq__cond-card">
            <h4 className="acq__sec-h"><i className="fa-light fa-sliders" /> Condizioni Generali</h4>
            <div className="acq__cond">
              <InputField label="Num. Lotti" name="numLotti" type="number" className="acq__num"
                min={1} max={maxLotti} value={numLotti}
                onChange={(e) => setNumLotti(Math.min(maxLotti, Math.max(1, Number(e.target.value) || 1)))} />
              <SelectField label="Mercato di riferimento" name="mercato" className="acq__mercato"
                value={mercato} onChange={(e) => setMercato(e.target.value)}
                options={MERCATI.map((o) => ({ value: o, label: withFlag(o) }))} />
            </div>
          </section>

          {/* Selezione periodo — timeline con maniglie trascinabili */}
          <section className="acq__periodo">
            <div className="acq__periodo-top">
              <div className="acq__periodo-lead">
                <span className="acq__periodo-ico"><i className="fa-light fa-calendar-range" /></span>
                <div>
                  <span className="acq__periodo-title">Seleziona il periodo</span>
                  <span className="acq__periodo-sub">Trascina le maniglie sulla linea · minimo {MIN_MESI} mesi continuativi</span>
                </div>
              </div>
              {n > 0 && (
                <div className="acq__chips">
                  {chipDurs.map((d) => (
                    <button key={d} type="button"
                      className={`acq__chip${lo === 0 && count === d ? ' is-active' : ''}`}
                      onClick={() => applyChip(d)}>
                      {d === n ? `Tutti (${d})` : `${d} mesi`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {n > 0 ? (
              <>
                <div
                  ref={trackRef}
                  className={`acq__track${drag ? ' is-dragging' : ''}`}
                  onPointerDown={onTrackDown}
                >
                  <div className="acq__rail" />
                  <div className="acq__fill" style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} />
                  {mesi.map((_, i) => (
                    <span key={i} className={`acq__node${i >= lo && i <= hi ? ' is-on' : ''}`} style={{ left: `${pct(i)}%` }} />
                  ))}
                  <div className="acq__bubble" style={{ left: `${(pct(lo) + pct(hi)) / 2}%` }}>
                    <strong>{count}</strong> {count === 1 ? 'mese' : 'mesi'}
                  </div>
                  <button type="button" className="acq__thumb" role="slider" aria-label="Mese iniziale"
                    aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={aIdx} tabIndex={0}
                    style={{ left: `${pct(aIdx)}%` }}
                    onPointerDown={startDrag('a')} onKeyDown={onKey('a')}>
                    <i className="fa-solid fa-grip-lines-vertical" aria-hidden="true" />
                  </button>
                  <button type="button" className="acq__thumb" role="slider" aria-label="Mese finale"
                    aria-valuemin={0} aria-valuemax={n - 1} aria-valuenow={bIdx} tabIndex={0}
                    style={{ left: `${pct(bIdx)}%` }}
                    onPointerDown={startDrag('b')} onKeyDown={onKey('b')}>
                    <i className="fa-solid fa-grip-lines-vertical" aria-hidden="true" />
                  </button>
                </div>

                <div className="acq__labels">
                  {mesi.map((mm, i) => (
                    <button key={i} type="button"
                      className={`acq__label${i >= lo && i <= hi ? ' is-on' : ''}`}
                      style={{ left: `${pct(i)}%` }}
                      onClick={() => moveNearest(i)}>
                      <span className="acq__label-m">{MESI_ABBR[mm.m - 1]}</span>
                      <span className="acq__label-y">{mm.y}</span>
                    </button>
                  ))}
                </div>

                <div className="acq__periodo-foot">
                  <span className="acq__periodo-range">
                    <i className="fa-light fa-calendar-check" /> {meseLabel(mesi[lo])} <i className="fa-solid fa-arrow-right-long acq__periodo-arr" /> {meseLabel(mesi[hi])}
                  </span>
                  {!valido && (
                    <span className="acq__periodo-warn">
                      <i className="fa-solid fa-triangle-exclamation" /> Seleziona almeno {MIN_MESI} mesi
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="acq__periodo-empty">Nessun periodo disponibile per questo annuncio.</p>
            )}
          </section>

          {/* Riepilogo + invio */}
          <div className="acq__foot">
            <div className="acq__totals">
              <div className="acq__total-row">
                <span>Valore abbonamento mese</span><strong>{fmtEur(mese)}</strong>
              </div>
              <div className="acq__total-row acq__total-row--big">
                <span>Totale</span>
                <strong key={totale} className="acq__total-val">{fmtEur(totale)}</strong>
              </div>
            </div>
            <button type="button" className="sib-btn sib-btn--primary acq__send" disabled={!valido} onClick={() => setInviata(true)}>
              <i className="fa-light fa-paper-plane" aria-hidden="true" /> Invia richiesta
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
