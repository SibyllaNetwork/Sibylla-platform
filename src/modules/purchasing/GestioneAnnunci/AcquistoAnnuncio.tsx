import React, { useMemo, useState } from 'react'
import Modal from '../../../core/components/Modal'
import { InputField, SelectField } from '../../../core/components/form'
import type { AnnuncioPubblicato } from '../../../store/useAnnunciStore'
import './AcquistoAnnuncio.sass'

const BASE_MESE = 450 // valore abbonamento mensile per lotto
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
  const dimLotto = Math.round(a.camere / Math.max(1, a.lotti))
  const maxLotti = a.quantitaMax ?? a.lotti

  const [numLotti, setNumLotti] = useState(1)
  const [mercato, setMercato] = useState('Nessuna')
  const [startIdx, setStartIdx] = useState<number | null>(null)
  const [endIdx, setEndIdx] = useState<number | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [inviata, setInviata] = useState(false)

  const listino = useMemo(() => mesi.map(({ y, m }) => {
    const last = new Date(y, m, 0).getDate()
    return { dal: `01/${p2(m)}/${y}`, al: `${p2(last)}/${p2(m)}/${y}`, adulti: '10,00 €', ragazzi: '10,00 €', supp: '10,00 €' }
  }), [mesi])

  const range = startIdx !== null && endIdx !== null ? { a: startIdx, b: endIdx } : null
  const preview = startIdx !== null && endIdx === null && hoverIdx !== null
    ? { a: Math.min(startIdx, hoverIdx), b: Math.max(startIdx, hoverIdx) } : null

  const onPill = (i: number) => {
    if (startIdx === null || endIdx !== null) { setStartIdx(i); setEndIdx(null) }
    else { setStartIdx(Math.min(startIdx, i)); setEndIdx(Math.max(startIdx, i)) }
  }
  const reset = () => { setStartIdx(null); setEndIdx(null) }

  const count = range ? range.b - range.a + 1 : 0
  const mese = numLotti * BASE_MESE
  const totale = count * mese
  const valido = count >= 4

  const inRange = (i: number, r: { a: number; b: number } | null) => r != null && i >= r.a && i <= r.b

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
        <div className="acq2">
          <div className="acq2__cols">
            {/* Dettaglio contratti */}
            <section>
              <h3 className="acq2__h3">Dettaglio Contratti</h3>
              <dl className="acq2__dl">
                {([
                  ['Quantità lotti', String(a.lotti)],
                  ['Tipologia', a.ospiti || 'Gruppi'],
                  ['Genere', a.tipologia],
                  ['Dimensione Lotto', `${dimLotto} Camere`],
                  ['Struttura', a.struttura],
                  ['Quantità massima acquistabile', String(maxLotti)],
                  ['Garanzie richieste', a.garanzie || 'Nessuna'],
                  ['Tipologia pagamento', a.pagamento || 'VCC'],
                  ['Tour Operator', a.destinatario && a.destinatario !== 'Tutti' ? a.destinatario : 'Tour Operator Test'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="acq2__dl-row"><dt>{k}:</dt><dd>{v}</dd></div>
                ))}
              </dl>
            </section>

            {/* Listino tariffario */}
            <section>
              <h3 className="acq2__h3">Listino Tariffario</h3>
              <div className="sib-table-wrap">
                <table className="sib-table acq2__table">
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
          <h3 className="acq2__h2">Condizioni Generali</h3>
          <div className="acq2__cond">
            <InputField label="Num. Lotti" name="numLotti" type="number" className="acq2__num"
              min={1} max={maxLotti} value={numLotti}
              onChange={(e) => setNumLotti(Math.min(maxLotti, Math.max(1, Number(e.target.value) || 1)))} />
            <SelectField label="Mercato di riferimento" name="mercato" className="acq2__mercato"
              value={mercato} onChange={(e) => setMercato(e.target.value)}
              options={MERCATI.map((o) => ({ value: o, label: o }))} />
          </div>

          {/* Selezione periodo a pill con anteprima */}
          <div className="acq2__period">
            <div className="acq2__period-head">
              <span className="acq2__period-title">Seleziona il periodo</span>
              <span className={`acq2__period-hint${!valido && count > 0 ? ' is-warn' : ''}`}>almeno 4 mesi continuativi</span>
            </div>
            <div className="acq2__months" onMouseLeave={() => setHoverIdx(null)}>
              {mesi.map((mm, i) => {
                const sel = inRange(i, range)
                const prev = !sel && inRange(i, preview)
                const endpoint = range != null && (i === range.a || i === range.b)
                return (
                  <button
                    key={`${mm.y}-${mm.m}`}
                    type="button"
                    className={`acq2__month${sel ? ' is-sel' : ''}${prev ? ' is-preview' : ''}${endpoint ? ' is-end' : ''}`}
                    onMouseEnter={() => setHoverIdx(i)}
                    onClick={() => onPill(i)}
                  >
                    <span className="acq2__month-m">{MESI_ABBR[mm.m - 1]}</span>
                    <span className="acq2__month-y">{mm.y}</span>
                  </button>
                )
              })}
            </div>
            <div className="acq2__period-foot">
              {range
                ? <span className="acq2__period-sel"><i className="fa-light fa-calendar-check" /> {meseLabel(mesi[range.a])} – {meseLabel(mesi[range.b])} · <strong>{count} mesi</strong></span>
                : <span className="acq2__period-sel acq2__period-sel--empty">Clicca il primo e l'ultimo mese del periodo.</span>}
              {range && <button type="button" className="acq2__period-reset" onClick={reset}><i className="fa-light fa-xmark" /> Azzera</button>}
            </div>
          </div>

          {/* Riepilogo + invio */}
          <div className="acq2__foot">
            <div className="acq2__totals">
              <div className="acq2__total-row"><span>Valore abbonamento mese</span><strong>{fmtEur(mese)}</strong></div>
              <div className="acq2__total-row acq2__total-row--big"><span>Totale</span><strong>{fmtEur(totale)}</strong></div>
            </div>
            <button type="button" className="sib-btn sib-btn--primary acq2__send" disabled={!valido} onClick={() => setInviata(true)}>
              <i className="fa-light fa-paper-plane" aria-hidden="true" /> Invia richiesta
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
