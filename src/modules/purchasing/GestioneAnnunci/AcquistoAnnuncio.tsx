import React, { useMemo, useState } from 'react'
import type { AnnuncioPubblicato } from '../../../store/useAnnunciStore'
import './AcquistoAnnuncio.sass'

const BASE_MESE = 450 // valore abbonamento mensile per lotto
const MERCATI = ['Nessuna', 'Italia', 'Germania', 'Francia', 'Regno Unito', 'Spagna', 'Extra Europa']

const p2 = (n: number) => String(n).padStart(2, '0')
const fmtEur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`

interface Mese { y: number; m: number; label: string }

// Elenco dei mesi coperti dal periodo dell'annuncio ("gg/mm/aaaa - gg/mm/aaaa"
// oppure "m/aaaa - m/aaaa").
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
    out.push({ y, m, label: `${p2(m)}/${y}` })
    m += 1; if (m > 12) { m = 1; y += 1 }
    guard += 1
  }
  return out
}

// Pagina interlocutoria di acquisto dei contratti di vendita di un annuncio.
export function AcquistoAnnuncio({ a, onClose }: { a: AnnuncioPubblicato; onClose: () => void }) {
  const mesi = useMemo(() => mesiPeriodo(a.periodo), [a.periodo])
  const dimLotto = Math.round(a.camere / Math.max(1, a.lotti))
  const maxLotti = a.quantitaMax ?? a.lotti

  const [numLotti, setNumLotti] = useState(1)
  const [mercato, setMercato] = useState('Nessuna')
  const [firstClick, setFirstClick] = useState<number | null>(null)
  const [range, setRange] = useState<{ a: number; b: number } | null>(null)
  const [inviata, setInviata] = useState(false)

  const listino = useMemo(() => mesi.map(({ y, m }) => {
    const last = new Date(y, m, 0).getDate()
    return { dal: `01/${p2(m)}/${y}`, al: `${p2(last)}/${p2(m)}/${y}`, adulti: '10,00 €', ragazzi: '10,00 €', supp: '10,00 €' }
  }), [mesi])

  const onMarker = (i: number) => {
    if (firstClick === null) { setFirstClick(i); setRange({ a: i, b: i }) }
    else { setRange({ a: Math.min(firstClick, i), b: Math.max(firstClick, i) }); setFirstClick(null) }
  }

  const count = range ? range.b - range.a + 1 : 0
  const mese = numLotti * BASE_MESE
  const totale = count * mese
  const valido = count >= 4

  if (inviata) {
    return (
      <div className="acq" role="dialog" aria-modal="true" aria-label="Richiesta inviata">
        <div className="acq__sheet acq__sheet--ok">
          <div className="acq__ok-icon"><i className="fa-solid fa-circle-check" aria-hidden="true" /></div>
          <h2 className="acq__ok-title">Richiesta di acquisto inviata</h2>
          <p className="acq__ok-text">
            La tua richiesta per <strong>{numLotti}</strong> {numLotti === 1 ? 'lotto' : 'lotti'} su
            {' '}«{a.struttura}» è stata inviata correttamente. Riceverai un riscontro dall'operatore.
          </p>
          <button type="button" className="sib-btn sib-btn--primary" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    )
  }

  return (
    <div className="acq" role="dialog" aria-modal="true" aria-label="Acquisto annuncio" onClick={onClose}>
      <div className="acq__sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="acq__close" aria-label="Chiudi" onClick={onClose}>
          <i className="fa-light fa-xmark" aria-hidden="true" />
        </button>
        <h2 className="acq__title">Annuncio Sibylla</h2>

        <div className="acq__cols">
          {/* Dettaglio contratti */}
          <section className="acq__detail">
            <h3 className="acq__h3">Dettaglio Contratti</h3>
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
                ['Tour Operator', a.destinatario && a.destinatario !== 'Tutti' ? a.destinatario : 'Tour Operator Test'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="acq__dl-row"><dt>{k}:</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </section>

          {/* Listino tariffario */}
          <section className="acq__listino">
            <h3 className="acq__h3">Listino Tariffario</h3>
            <div className="sib-table-wrap">
              <table className="sib-table acq__table">
                <thead>
                  <tr><th>Dal:</th><th>Al:</th><th>Tariffa adulti:</th><th>Tariffa ragazzi:</th><th>Supp. singola:</th></tr>
                </thead>
                <tbody>
                  {listino.map((r, i) => (
                    <tr key={i}>
                      <td>{r.dal}</td><td>{r.al}</td><td>{r.adulti}</td><td>{r.ragazzi}</td><td>{r.supp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Condizioni generali */}
        <h2 className="acq__title2">Condizioni Generali</h2>
        <div className="acq__cond">
          <label className="acq__field">
            <span>Num. Lotti</span>
            <input type="number" className="sib-input sib-input--dense acq__num" min={1} max={maxLotti}
              value={numLotti}
              onChange={(e) => setNumLotti(Math.min(maxLotti, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
          <label className="acq__field">
            <span>Mercato di riferimento</span>
            <select className="sib-select sib-select--dense acq__mercato" value={mercato} onChange={(e) => setMercato(e.target.value)}>
              {MERCATI.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        </div>

        {/* Slider periodo */}
        <div className="acq__slider-head">
          <span className="acq__slider-title">Seleziona un periodo</span>
          <span className="acq__slider-hint">(inserisci almeno 4 mesi continuativi)</span>
        </div>
        <p className="acq__slider-sub">Per effettuare la selezione cliccare sul primo e l'ultimo del periodo desiderato.</p>

        <div className="acq__timeline">
          {mesi.map((mm, i) => {
            const active = range != null && i >= range.a && i <= range.b
            const connActive = range != null && i >= range.a && i < range.b
            return (
              <React.Fragment key={mm.label}>
                <button type="button" className={`acq__marker${active ? ' is-active' : ''}`} onClick={() => onMarker(i)}>
                  <i className="fa-light fa-box-archive" aria-hidden="true" />
                  <span>{mm.label}</span>
                </button>
                {i < mesi.length - 1 && <span className={`acq__conn${connActive ? ' is-active' : ''}`} />}
              </React.Fragment>
            )
          })}
        </div>

        <div className="acq__foot">
          <div className="acq__totals">
            <div><span>Valore abbonamento mese:</span> <strong>{fmtEur(mese)}</strong></div>
            <div><span>Totale:</span> <strong>{fmtEur(totale)}</strong></div>
          </div>
          <button type="button" className="sib-btn sib-btn--primary acq__send" disabled={!valido} onClick={() => setInviata(true)}>
            Invia richiesta
          </button>
        </div>
      </div>
    </div>
  )
}
