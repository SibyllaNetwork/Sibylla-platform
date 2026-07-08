import React, { useMemo, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import Pagination from '../../../core/components/Pagination'
import Tooltip from '../../../core/components/Tooltip'
import { useAnnunciStore, annuncioPerMe, type AnnuncioPubblicato } from '../../../store/useAnnunciStore'
import './AnnunciTable.sass'

const PAGE_SIZE = 10

// Stelle categoria struttura (oro).
function Stelle({ n }: { n: number }) {
  return (
    <span className="ann__stars" aria-label={`${n} stelle`}>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className="fa-solid fa-star" aria-hidden="true" />
      ))}
    </span>
  )
}

// Tabella "Annunci" (destinazione delle pubblicazioni di Componi annunci),
// standard piattaforma. Router-agnostica: la navigazione arriva via callback.
export function AnnunciTable({ onBack, onMatchZone }: {
  onBack?: () => void
  onMatchZone: () => void
}) {
  const annunci = useAnnunciStore((s) => s.annunci)
  const [page, setPage] = useState(1)
  const [dettaglio, setDettaglio] = useState<AnnuncioPubblicato | null>(null)

  type Filtri = {
    ragioneSociale: string; periodo: string; tipologia: string;
    struttura: string; categoria: string; genere: string; destinatario: string
  }
  const [f, setF] = useState<Filtri>({
    ragioneSociale: '', periodo: '', tipologia: '', struttura: '', categoria: '', genere: '', destinatario: '',
  })
  const setFilter = (k: keyof Filtri, v: string) => { setF((p) => ({ ...p, [k]: v })); setPage(1) }

  const uniq = (vals: string[]) => Array.from(new Set(vals.filter(Boolean))).sort()
  const opzTipologia = useMemo(() => uniq(annunci.map((a) => a.tipologia)), [annunci])
  // Solo le strutture visibili al profilo corrente (le riservate restano nascoste).
  const opzStruttura = useMemo(() => uniq(annunci.filter(annuncioPerMe).map((a) => a.struttura)), [annunci])

  const filtered = useMemo(() => annunci.filter((a) => {
    const perMe = annuncioPerMe(a)
    const rs = perMe ? a.ragioneSociale : 'Riservato'
    if (f.ragioneSociale && !rs.toLowerCase().includes(f.ragioneSociale.toLowerCase())) return false
    if (f.periodo && !a.periodo.toLowerCase().includes(f.periodo.toLowerCase())) return false
    if (f.tipologia && a.tipologia !== f.tipologia) return false
    if (f.struttura && !(perMe && a.struttura === f.struttura)) return false
    if (f.categoria && String(a.categoria) !== f.categoria) return false
    if (f.genere && a.genere !== f.genere) return false
    if (f.destinatario === 'me' && !perMe) return false
    if (f.destinatario === 'nonme' && perMe) return false
    return true
  }), [annunci, f])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )

  return (
    <div className="ann">
      <BtnBack onClick={onBack} />

      <div className="ann__top">
        <PageHeader
          title="Annunci"
          subtitle="Il centro di scambio dove le opportunità si incontrano, le relazioni crescono e il valore si moltiplica."
        />
        <button type="button" className="sib-btn sib-btn--secondary ann__matchzone" onClick={onMatchZone}>
          <i className="fa-light fa-arrows-repeat" aria-hidden="true" /> Match zone
        </button>
      </div>

      <div className="sib-table-wrap">
        <table className="sib-table ann__table">
          <thead>
            <tr>
              <th className="ann__c-logo" aria-label="Logo" />
              <th>Ragione sociale</th>
              <th>Periodo</th>
              <th>Tipologia</th>
              <th className="ann__c-num">Lotti</th>
              <th>Struttura</th>
              <th>Categoria</th>
              <th className="ann__c-num">Camere</th>
              <th>Pubblicazione</th>
              <th>Genere</th>
              <th className="ann__c-center">Destinatario</th>
              <th className="ann__c-center">Azioni</th>
            </tr>
            <tr className="ann__filters">
              <th className="ann__c-logo" />
              <th><input className="sib-input sib-input--dense ann__f" placeholder="Cerca…" value={f.ragioneSociale} onChange={(e) => setFilter('ragioneSociale', e.target.value)} /></th>
              <th><input className="sib-input sib-input--dense ann__f" placeholder="Periodo…" value={f.periodo} onChange={(e) => setFilter('periodo', e.target.value)} /></th>
              <th>
                <select className="sib-select sib-select--dense ann__f" value={f.tipologia} onChange={(e) => setFilter('tipologia', e.target.value)}>
                  <option value="">Tutte</option>
                  {opzTipologia.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </th>
              <th className="ann__c-num" />
              <th>
                <select className="sib-select sib-select--dense ann__f" value={f.struttura} onChange={(e) => setFilter('struttura', e.target.value)}>
                  <option value="">Tutte</option>
                  {opzStruttura.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </th>
              <th>
                <select className="sib-select sib-select--dense ann__f" value={f.categoria} onChange={(e) => setFilter('categoria', e.target.value)}>
                  <option value="">Tutte</option>
                  <option value="3">3 stelle</option>
                  <option value="4">4 stelle</option>
                  <option value="5">5 stelle</option>
                </select>
              </th>
              <th className="ann__c-num" />
              <th />
              <th>
                <select className="sib-select sib-select--dense ann__f" value={f.genere} onChange={(e) => setFilter('genere', e.target.value)}>
                  <option value="">Tutti</option>
                  <option value="Vendita">Vendita</option>
                  <option value="Acquisto">Acquisto</option>
                </select>
              </th>
              <th className="ann__c-center">
                <select className="sib-select sib-select--dense ann__f" value={f.destinatario} onChange={(e) => setFilter('destinatario', e.target.value)}>
                  <option value="">Tutti</option>
                  <option value="me">Per me</option>
                  <option value="nonme">Non per me</option>
                </select>
              </th>
              <th className="ann__c-center" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((a: AnnuncioPubblicato) => {
              const perMe = annuncioPerMe(a)
              const g = a.genere.toLowerCase()
              return (
                <tr key={a.id} className={`ann__row ann__row--${g}${perMe ? '' : ' ann__row--reserved'}`}>
                  <td className="ann__c-logo">
                    {perMe && a.logo
                      ? <img src={a.logo} alt="" className="ann__logo" />
                      : <span className="ann__logo ann__logo--ph"><i className="fa-light fa-hotel" aria-hidden="true" /></span>}
                  </td>
                  <td>{perMe ? a.ragioneSociale : <span className="ann__masked">Riservato</span>}</td>
                  <td className="ann__nowrap">{a.periodo}</td>
                  <td>{a.tipologia}</td>
                  <td className="ann__c-num">{a.lotti}</td>
                  <td>{perMe ? a.struttura : <span className="ann__masked">Riservato</span>}</td>
                  <td><Stelle n={a.categoria} /></td>
                  <td className="ann__c-num">{a.camere}</td>
                  <td className="ann__nowrap">{a.pubblicazione}</td>
                  <td>
                    <span className={`ann__genere ann__genere--${g}`}>
                      <i className={`fa-solid ${a.genere === 'Vendita' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} aria-hidden="true" />
                      {a.genere}
                    </span>
                  </td>
                  <td className="ann__c-center">
                    <div className="ann__actions">
                      <Tooltip text={perMe ? 'Destinato a te' : 'Non destinato a te'}>
                        <span className={`ann__dest${perMe ? '' : ' ann__dest--off'}`}>
                          <i className={`fa-light ${perMe ? 'fa-eye' : 'fa-eye-slash'}`} aria-hidden="true" />
                        </span>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="ann__c-center">
                    <div className="ann__actions">
                      <Tooltip text="Dettaglio annuncio">
                        <button type="button" className="sib-btn sib-btn--icon" aria-label="Dettaglio annuncio" onClick={() => setDettaglio(a)}>
                          <i className="fa-light fa-circle-info" aria-hidden="true" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="ann__empty">Nessun annuncio trovato.</div>
      )}

      {totalPages > 1 && (
        <div className="ann__pager">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {dettaglio && <DettaglioModal a={dettaglio} onClose={() => setDettaglio(null)} />}
    </div>
  )
}

// Modale "Dettaglio annuncio": tutti i dettagli del contratto dell'annuncio.
function DettaglioModal({ a, onClose }: { a: AnnuncioPubblicato; onClose: () => void }) {
  const perMe = annuncioPerMe(a)
  const mask = (v: string) => (perMe ? v : 'Riservato')
  const dimLotto = Math.round(a.camere / Math.max(1, a.lotti))
  const righe: [string, string][] = [
    ['Quantità lotti', String(a.lotti)],
    ['Tipologia', a.ospiti || 'Gruppi'],
    ['Genere', a.tipologia],
    ['Dimensione Lotto', `${dimLotto} Camere`],
    ['Struttura', mask(a.struttura)],
    ['Quantità massima acquistabile', String(a.quantitaMax ?? a.lotti)],
    ['Garanzie richieste', a.garanzie || 'Nessuna'],
    ['Tipologia pagamento', a.pagamento || 'VCC'],
    ['Annuncio rilasciato da', mask(a.ragioneSociale)],
  ]
  return (
    <div className="ann-modal" role="dialog" aria-modal="true" aria-label="Dettaglio annuncio" onClick={onClose}>
      <div className="ann-modal__card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ann-modal__close" aria-label="Chiudi" onClick={onClose}>
          <i className="fa-light fa-xmark" aria-hidden="true" />
        </button>
        <h2 className="ann-modal__title">Dettaglio annuncio</h2>
        <div className="ann-modal__body">
          <h3 className="ann-modal__section">Dettaglio Contratti</h3>
          <dl className="ann-modal__grid">
            {righe.map(([k, v]) => (
              <div key={k} className="ann-modal__row">
                <dt>{k}:</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
