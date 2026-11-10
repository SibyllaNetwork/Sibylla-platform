// ─── Magazzino ristorazione › Giacenze (pagina d'ingresso) ───────────────────
//  § B3 della scheda 17: quantità per articolo e punto di stoccaggio ("Tutti i
//  punti" = una colonna per punto), ricerca anche col lettore di codici a
//  barre, filtri categoria e "Solo sotto scorta", righe sotto scorta e
//  negative evidenziate, valore totale. Clic sulla riga → scheda articolo.
//  Giacenze e valori arrivano da Op: qui non si ricalcola nulla.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import FilterToolbar from '../../../../../core/components/FilterToolbar'
import Pagination from '../../../../../core/components/Pagination'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { SearchField, SelectField } from '../../../../../core/components/form'
import { useColFilters } from '../../../../../core/components/ColFilters'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { Giacenze, RigaGiacenza } from '../api/tipi'
import ArticoloScheda from '../comune/ArticoloScheda'
import { ScannerFotocamera } from '../comune/CampoCodice'
import { euro, fmtDataOra, fmtQ } from '../comune/formato'
import MagShell, { type MagCtx } from '../comune/MagShell'
import { useMagazzinoFb } from '../comune/useMagazzinoFb'
import './MagGiacenze.sass'

const PER_PAGINA = 50

/** Stato della scorta, filtrabile dalla colonna "Scorta min." (dai flag di Op). */
const STATI_SCORTA = ['Giacenza negativa', 'Sotto scorta', 'Regolare']
const statoDi = (r: RigaGiacenza) => (r.negativa ? STATI_SCORTA[0] : r.sotto_scorta ? STATI_SCORTA[1] : STATI_SCORTA[2])

export default function MagGiacenze({ navigate }: { navigate: (p: string) => void }) {
  const setApriNuovo = useMagazzinoFb(s => s.setApriNuovoMovimento)
  return (
    <MagShell
      page="fb-mag-giacenze" title="Giacenze" className="maggia"
      actions={() => (
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => navigate('fb-mag-ricevi')}>
          <i className="fa-solid fa-truck-ramp-box" aria-hidden="true" /> Ricevi merce
        </button>
      )}
    >
      {ctx => (
        <Contenuto
          ctx={ctx}
          azioni={(
            <>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => { setApriNuovo(true); navigate('fb-mag-movimenti') }}>
                <i className="fa-solid fa-right-left" aria-hidden="true" /> Nuovo movimento
              </button>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('fb-mag-inventario')}>
                <i className="fa-solid fa-clipboard-check" aria-hidden="true" /> Inventario
              </button>
            </>
          )}
        />
      )}
    </MagShell>
  )
}

function Contenuto({ ctx, azioni }: { ctx: MagCtx; azioni: React.ReactNode }) {
  const [idPunto, setIdPunto] = useState('')
  const cf = useColFilters()
  const [cerca, setCerca] = useState('')
  const [cercaAttiva, setCercaAttiva] = useState('')
  const [dati, setDati] = useState<Giacenze | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [caricamento, setCaricamento] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [scheda, setScheda] = useState<number | null>(null)
  const [fotocamera, setFotocamera] = useState(false)
  const [giro, setGiro] = useState(0)

  // La ricerca parte dopo una breve pausa nella digitazione; il lettore USB preme Invio e parte subito.
  useEffect(() => {
    const t = setTimeout(() => setCercaAttiva(cerca.trim()), 300)
    return () => clearTimeout(t)
  }, [cerca])

  useEffect(() => {
    let annullato = false
    setCaricamento(true)
    eseguiMag('giacenze', {
      id_struttura: ctx.idStruttura,
      id_punto: idPunto ? Number(idPunto) : null,
      cerca: cercaAttiva || null,
    })
      .then(r => { if (!annullato) { setDati(r); setErrore(null); setPagina(1) } })
      .catch(e => { if (!annullato) setErrore(messaggioErrore(e)) })
      .finally(() => { if (!annullato) setCaricamento(false) })
    return () => { annullato = true }
  }, [ctx.idStruttura, idPunto, cercaAttiva, giro])

  const ricarica = useCallback(() => setGiro(g => g + 1), [])

  // Colonne: un punto solo, oppure una colonna per ogni punto della struttura.
  const colonnePunti = useMemo(() => (idPunto ? ctx.punti.filter(p => p.id === Number(idPunto)) : ctx.punti.filter(p => p.attivo)), [ctx.punti, idPunto])
  // Righe piatte per i filtri e l'ordinamento di colonna (valori da Op, nessun ricalcolo).
  const tutte = useMemo(() => (dati?.righe ?? []).map(r => ({
    ...r,
    categoriaNome: r.categoria ?? 'Senza categoria',
    statoNome: statoDi(r),
    ultimo: r.ultimo_movimento ?? '',
    ...Object.fromEntries(colonnePunti.map(p => [`p_${p.id}`, r.per_punto.find(x => x.id_punto === p.id)?.quantita ?? 0])),
  })), [dati, colonnePunti])
  const categorie = useMemo(() => Array.from(new Set(tutte.map(r => r.categoriaNome))).sort(), [tutte])
  const righe = useMemo(() => cf.sortRows(tutte.filter(r =>
    cf.matchText(r.nome, 'nome') &&
    cf.matchMulti(r.categoriaNome, 'categoriaNome') &&
    cf.matchMulti(r.statoNome, 'statoNome'),
  )),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tutte, cf.text, cf.multi, cf.sort])
  useEffect(() => { setPagina(1) }, [cf.text, cf.multi, cf.sort])
  const pagine = Math.max(1, Math.ceil(righe.length / PER_PAGINA))
  const visibili = righe.slice((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA)
  const negative = tutte.filter(r => r.negativa).length

  return (
    <>
      <FilterToolbar className="magpag__bar" actions={azioni}>
        <SelectField
          name="gia-punto" label="Punto di stoccaggio" className="magpag__f" value={idPunto}
          options={[{ value: '', label: 'Tutti i punti' }, ...ctx.punti.map(p => ({ value: p.id, label: p.attivo ? p.nome : `${p.nome} (disattivato)` }))]}
          onChange={e => setIdPunto(e.target.value)}
        />
        <div className="maggia__cerca">
          <span className="magpag__lab">Cerca</span>
          <div className="maggia__cerca-riga">
            <SearchField
              name="gia-cerca" placeholder="Nome, codice o codice a barre" value={cerca} loading={caricamento}
              onChange={e => setCerca(e.target.value)} onSearch={v => { setCerca(v); setCercaAttiva(v.trim()) }}
              onClear={() => { setCerca(''); setCercaAttiva('') }}
            />
            <Tooltip text="Leggi il codice con la fotocamera">
              <button type="button" className="sib-btn sib-btn--icon maggia__cam" aria-label="Leggi il codice con la fotocamera" onClick={() => setFotocamera(true)}>
                <i className="fa-regular fa-camera" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>
      </FilterToolbar>

      {negative > 0 && (
        <p className="maggia__avviso">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          {negative === 1 ? '1 articolo ha' : `${negative} articoli hanno`} una giacenza sotto zero: gli scarichi delle comande non si bloccano mai.
          Registra il carico mancante o una rettifica.
        </p>
      )}

      {errore && <p className="magpag__errore"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {errore}</p>}

      <div className="magpag__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table maggia__table">
            <colgroup>
              <col className="maggia__c-nome" /><col className="maggia__c-cat" />
              {colonnePunti.map(p => <col key={p.id} />)}
              {colonnePunti.length > 1 && <col />}
              <col /><col /><col className="maggia__c-ult" />
            </colgroup>
            <thead>
              <tr>
                <th><span className="sib-colf-head">Articolo{cf.th('nome', 'articolo', { search: true, sort: true })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Categoria" />{cf.th('categoriaNome', 'categoria', { options: categorie, sort: true })}</span></th>
                {colonnePunti.map(p => (
                  <th key={p.id} className="magpag__num"><span className="sib-colf-head"><TruncatedText text={p.nome} />{cf.th(`p_${p.id}`, p.nome, { sort: true })}</span></th>
                ))}
                {colonnePunti.length > 1 && <th className="magpag__num"><span className="sib-colf-head">Totale{cf.th('totale', 'totale', { sort: true })}</span></th>}
                <th className="magpag__num"><span className="sib-colf-head"><TruncatedText text="Scorta min." full="Scorta minima" />{cf.th('statoNome', 'stato della scorta', { options: STATI_SCORTA })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head">Valore{cf.th('valore', 'valore', { sort: true })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Ultimo mov." full="Ultimo movimento" />{cf.th('ultimo', 'ultimo movimento', { sort: true })}</span></th>
              </tr>
            </thead>
            <tbody>
              {visibili.map(r => {
                const q = (id: number) => r.per_punto.find(x => x.id_punto === id)?.quantita ?? 0
                return (
                  <tr
                    key={r.id_articolo} className={`maggia__riga ${r.negativa ? 'is-neg' : r.sotto_scorta ? 'is-sotto' : ''}`}
                    onClick={() => setScheda(r.id_articolo)}
                  >
                    <td>
                      <span className="maggia__nome">
                        {r.negativa && (
                          <Tooltip text="Giacenza sotto zero: registra il carico mancante o una rettifica">
                            <i className="fa-solid fa-circle-exclamation maggia__ico maggia__ico--neg" aria-label="Giacenza negativa" />
                          </Tooltip>
                        )}
                        {!r.negativa && r.sotto_scorta && (
                          <Tooltip text="Sotto la scorta minima">
                            <i className="fa-solid fa-triangle-exclamation maggia__ico maggia__ico--sotto" aria-label="Sotto scorta" />
                          </Tooltip>
                        )}
                        <TruncatedText text={r.nome} />
                      </span>
                    </td>
                    <td><TruncatedText text={r.categoria ?? '—'} /></td>
                    {colonnePunti.map(p => (
                      <td key={p.id} className={`magpag__num ${q(p.id) < 0 ? 'maggia__neg' : ''}`}>{q(p.id) === 0 ? <span className="maggia__zero">—</span> : fmtQ(q(p.id), r.unita)}</td>
                    ))}
                    {colonnePunti.length > 1 && <td className="magpag__num maggia__tot">{fmtQ(r.totale, r.unita)}</td>}
                    <td className="magpag__num">{fmtQ(r.scorta_minima, r.unita)}</td>
                    <td className="magpag__num">{euro(r.valore)}</td>
                    <td>{fmtDataOra(r.ultimo_movimento)}</td>
                  </tr>
                )
              })}
              {!caricamento && righe.length === 0 && (
                <tr><td colSpan={5 + colonnePunti.length + (colonnePunti.length > 1 ? 1 : 0)} className="magpag__vuoto">Nessun articolo con questi filtri.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dati && (
        <p className="magpag__somma">
          {righe.length === 1 ? '1 articolo' : `${righe.length} articoli`}{righe.length !== tutte.length && ` su ${tutte.length}`} · valore totale della merce <strong>{euro(dati.valore_totale)}</strong>
          {cf.hasActive && <button type="button" className="magpag__azzera" onClick={cf.reset}>Azzera i filtri di colonna</button>}
          <span className="magpag__nota">aggiornato alle {fmtDataOra(dati.aggiornato_il)}</span>
        </p>
      )}

      {pagine > 1 && (
        <div className="magpag__pag">
          <Pagination page={pagina} totalPages={pagine} onPageChange={setPagina} />
        </div>
      )}

      <ScannerFotocamera open={fotocamera} onClose={() => setFotocamera(false)} onCodice={c => { setFotocamera(false); setCerca(c); setCercaAttiva(c) }} />
      <ArticoloScheda idArticolo={scheda} ctx={ctx} onClose={() => setScheda(null)} onCambiato={ricarica} />
    </>
  )
}
