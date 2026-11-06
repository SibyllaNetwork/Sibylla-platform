import React, { useMemo, useState } from 'react'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { useColFilters } from '../../../core/components/ColFilters'
import { SearchField } from '../../../core/components/form'
import { type Azione, type Dettaglio, type TipoAzione, ICONA_AZIONE, TIPI_AZIONE, tsIt } from './contiCamera.data'
import './StoricoConto.sass'

// Storico del conto camera: ogni azione registrata su quella camera per quel
// soggiorno, dalla prenotazione al check-out. Filtri per colonna (imbuto,
// lente, ordinamento) + ricerca libera e scorciatoie per tipo di azione.

const fmtImporto = (v: number) => (v < 0 ? '− ' : '') + Math.abs(v).toFixed(2).replace('.', ',') + ' €'

export default function StoricoConto({ dettaglio, storico, onClose }: { dettaglio: Dettaglio; storico: Azione[]; onClose: () => void }) {
  const cf = useColFilters()
  const [q, setQ] = useState('')

  // Righe con chiavi piatte per l'ordinamento di useColFilters (ts ordina già
  // in modo cronologico; di default la più recente in alto).
  const righe = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const filtrate = storico.filter((a) =>
      cf.matchMulti(a.tipo, 'tipo') &&
      cf.matchMulti(a.camera, 'camera') &&
      cf.matchMulti(a.operatore, 'operatore') &&
      cf.matchText(`${a.descrizione} ${a.dettaglio ?? ''}`, 'descrizione') &&
      cf.matchText(tsIt(a.ts), 'ts') &&
      (!ql || [tsIt(a.ts), a.tipo, a.camera, a.descrizione, a.dettaglio ?? '', a.operatore].join(' ').toLowerCase().includes(ql)),
    )
    return cf.sort ? cf.sortRows(filtrate.map((a) => ({ ...a, importoN: a.importo ?? 0 }))) : [...filtrate].sort((a, b) => b.ts.localeCompare(a.ts))
  }, [storico, q, cf])

  const tipiPresenti = TIPI_AZIONE.filter((t) => storico.some((a) => a.tipo === t))
  const camere = Array.from(new Set(storico.map((a) => a.camera))).sort()
  const operatori = Array.from(new Set(storico.map((a) => a.operatore))).sort()
  const conteggio = (t: TipoAzione) => storico.filter((a) => a.tipo === t).length
  const tipiAttivi = cf.multi.tipo ?? []
  const filtriAttivi = cf.hasActive || !!q

  return (
    <div className="ccst__overlay" onClick={onClose}>
      <div className="ccst" role="dialog" aria-modal="true" aria-labelledby="ccst-title" onClick={(e) => e.stopPropagation()}>
        <div className="ccst__head">
          <div>
            <h3 id="ccst-title">Storico conto camera {dettaglio.camera}</h3>
            <p className="ccst__sub">
              {dettaglio.nominativo} · Prenotazione n. {dettaglio.prenotazioneNum} · dal {dettaglio.dataArrivo} al {dettaglio.dataPartenza}
            </p>
          </div>
          <button type="button" className="ccst__close" aria-label="Chiudi" onClick={onClose}>
            <i className="fa-light fa-xmark" />
          </button>
        </div>

        <div className="ccst__body">
          <div className="ccst__toolbar">
            <SearchField
              className="ccst__search"
              value={q}
              placeholder="Cerca in tutto lo storico…"
              onChange={(e) => setQ(e.target.value)}
              onClear={() => setQ('')}
            />
            <div className="ccst__tipi" role="group" aria-label="Filtra per tipo di azione">
              {tipiPresenti.map((t) => {
                const on = tipiAttivi.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    className={'ccst__tipo' + (on ? ' ccst__tipo--on' : '')}
                    aria-pressed={on}
                    onClick={() => cf.toggleMulti('tipo', t)}
                  >
                    <i className={`fa-solid ${ICONA_AZIONE[t]}`} aria-hidden="true" />
                    {t} <span className="ccst__tipo-n">{conteggio(t)}</span>
                  </button>
                )
              })}
            </div>
            {filtriAttivi && (
              <button type="button" className="sib-btn sib-btn--secondary ccst__reset" onClick={() => { cf.reset(); setQ('') }}>
                <i className="fa-solid fa-filter-circle-xmark" /> Azzera filtri
              </button>
            )}
          </div>

          <div className="sib-table-wrap ccst__table-wrap">
            <table className="sib-table ccst__table">
              <colgroup>
                <col className="ccst__c-ts" />
                <col className="ccst__c-tipo" />
                <col className="ccst__c-cam" />
                <col />
                <col className="ccst__c-imp" />
                <col className="ccst__c-op" />
              </colgroup>
              <thead>
                <tr>
                  <th><span className="sib-colf-head">Data e ora{cf.th('ts', 'Data e ora', { search: true, sort: true })}</span></th>
                  <th><span className="sib-colf-head">Azione{cf.th('tipo', 'Azione', { options: tipiPresenti })}</span></th>
                  <th><span className="sib-colf-head">Camera{cf.th('camera', 'Camera', { options: camere })}</span></th>
                  <th><span className="sib-colf-head">Descrizione{cf.th('descrizione', 'Descrizione', { search: true })}</span></th>
                  <th className="ccst__th-num"><span className="sib-colf-head">Importo{cf.th('importoN', 'Importo', { sort: true })}</span></th>
                  <th><span className="sib-colf-head">Operatore{cf.th('operatore', 'Operatore', { options: operatori })}</span></th>
                </tr>
              </thead>
              <tbody>
                {righe.map((a) => (
                  <tr key={a.id}>
                    <td className="ccst__ts">{tsIt(a.ts)}</td>
                    <td>
                      <span className={`ccst__azione ccst__azione--${a.tipo.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                        <i className={`fa-solid ${ICONA_AZIONE[a.tipo]}`} aria-hidden="true" />
                        <TruncatedText text={a.tipo} className="ccst__azione-txt" />
                      </span>
                    </td>
                    <td>{a.camera}</td>
                    <td>
                      <div className="ccst__descr">
                        <TruncatedText text={a.descrizione} className="ccst__descr-main" />
                        {a.dettaglio && <TruncatedText text={a.dettaglio} className="ccst__descr-det" />}
                      </div>
                    </td>
                    <td className={'ccst__td-num' + (a.importo != null && a.importo < 0 ? ' ccst__td-num--incasso' : '')}>
                      {a.importo != null ? fmtImporto(a.importo) : <span className="sib-cell--muted">—</span>}
                    </td>
                    <td><TruncatedText text={a.operatore} className="ccst__op" /></td>
                  </tr>
                ))}
                {righe.length === 0 && (
                  <tr>
                    <td colSpan={6} className="ccst__empty">Nessuna azione corrisponde ai filtri.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="ccst__foot">
            <span>
              {filtriAttivi ? <><strong>{righe.length}</strong> di {storico.length} azioni</> : <><strong>{storico.length}</strong> azioni registrate</>}
            </span>
            <Tooltip text="Gli importi negativi sono incassi o storni">
              <span className="ccst__legenda"><i className="fa-solid fa-circle-info" aria-hidden="true" /> Importi</span>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}
