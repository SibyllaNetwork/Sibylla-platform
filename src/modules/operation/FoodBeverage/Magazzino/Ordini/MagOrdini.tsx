// ─── Magazzino ristorazione › Ordini ai fornitori ───────────────────────────
//  Elenco degli ordini della struttura con lo stato (bozza, inviato, arrivato
//  in parte, arrivato, chiuso, annullato). Si crea un ordine a mano o dal
//  Riordino; la modale permette di completare la bozza, inviarla per email con
//  il PDF e, all'arrivo, registrare il carico collegato all'ordine.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { useColFilters } from '../../../../../core/components/ColFilters'
import { useStrutturaCorrente } from '../../../../../hooks/useStrutturaCorrente'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { OrdineSintesi } from '../api/tipi'
import { euro, fmtData, fmtDataOra } from '../comune/formato'
import MagShell, { type MagCtx } from '../comune/MagShell'
import { useArticoliTutti } from '../comune/useArticoliTutti'
import { useMagazzinoFb } from '../comune/useMagazzinoFb'
import OrdineModale from './OrdineModale'
import { STATI_ORDINE } from './statiOrdine'
import './MagOrdini.sass'

export default function MagOrdini({ navigate }: { navigate: (p: string) => void }) {
  const [aperto, setAperto] = useState<number | 'nuovo' | null>(null)
  return (
    <MagShell
      page="fb-mag-ordini" title="Ordini ai fornitori" className="magordp"
      actions={ctx => (
        <>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('fb-mag-riordino')}>
            <i className="fa-solid fa-cart-arrow-down" aria-hidden="true" /> Riordino
          </button>
          {ctx.gestore && (
            <button type="button" className="sib-btn sib-btn--primary" onClick={() => setAperto('nuovo')}>
              <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo ordine
            </button>
          )}
        </>
      )}
    >
      {ctx => <Elenco ctx={ctx} navigate={navigate} aperto={aperto} setAperto={setAperto} />}
    </MagShell>
  )
}

function Elenco({ ctx, navigate, aperto, setAperto }: { ctx: MagCtx; navigate: (p: string) => void; aperto: number | 'nuovo' | null; setAperto: (v: number | 'nuovo' | null) => void }) {
  const { struttura } = useStrutturaCorrente()
  const ordineDaAprire = useMagazzinoFb(s => s.ordineDaAprire)
  const setOrdineDaAprire = useMagazzinoFb(s => s.setOrdineDaAprire)
  const { articoli } = useArticoliTutti()
  const cf = useColFilters()
  const [dati, setDati] = useState<OrdineSintesi[] | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [giro, setGiro] = useState(0)

  useEffect(() => {
    let annullato = false
    eseguiMag('ordini', { id_struttura: ctx.idStruttura })
      .then(r => { if (!annullato) { setDati(r); setErrore(null) } })
      .catch(e => { if (!annullato) setErrore(messaggioErrore(e)) })
    return () => { annullato = true }
  }, [ctx.idStruttura, giro])

  // Arrivando dal Riordino: si apre l'ordine appena creato.
  useEffect(() => {
    if (ordineDaAprire != null) { setAperto(ordineDaAprire); setOrdineDaAprire(null) }
  }, [ordineDaAprire, setOrdineDaAprire, setAperto])

  const ricarica = useCallback(() => setGiro(g => g + 1), [])
  const nomeStruttura = ctx.contesto.strutture.find(s => s.id === ctx.idStruttura)?.nome ?? struttura ?? ''

  const tutte = useMemo(() => (dati ?? []).map(o => ({ ...o, fornitoreNome: o.fornitore.nome, statoNome: STATI_ORDINE[o.stato], consegna: o.consegna_richiesta ?? '' })), [dati])
  const fornitori = useMemo(() => Array.from(new Set(tutte.map(o => o.fornitoreNome))).sort(), [tutte])
  const righe = useMemo(() => cf.sortRows(tutte.filter(o =>
    cf.matchText(o.numero, 'numero') && cf.matchMulti(o.fornitoreNome, 'fornitoreNome') && cf.matchMulti(o.statoNome, 'statoNome'),
  )),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tutte, cf.text, cf.multi, cf.sort])
  const aperti = tutte.filter(o => o.stato === 'inviato' || o.stato === 'parziale').length

  return (
    <>
      {errore && <p className="magpag__errore"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {errore}</p>}
      <div className="magpag__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table">
            <colgroup>
              <col className="magordp__c-num" /><col className="magordp__c-forn" /><col className="magordp__c-stato" /><col className="magordp__c-data" />
              <col className="magordp__c-data" /><col className="magordp__c-cons" /><col className="magordp__c-n" /><col className="magordp__c-tot" />
            </colgroup>
            <thead>
              <tr>
                <th><span className="sib-colf-head">Numero{cf.th('numero', 'numero', { search: true })}</span></th>
                <th><span className="sib-colf-head">Fornitore{cf.th('fornitoreNome', 'fornitore', { options: fornitori })}</span></th>
                <th><span className="sib-colf-head">Stato{cf.th('statoNome', 'stato', { options: Object.values(STATI_ORDINE) })}</span></th>
                <th><span className="sib-colf-head">Creato{cf.th('creato_il', 'creato', { sort: true })}</span></th>
                <th>Inviato</th>
                <th><span className="sib-colf-head"><TruncatedText text="Consegna" full="Consegna richiesta" />{cf.th('consegna', 'consegna richiesta', { sort: true })}</span></th>
                <th className="magpag__num">Righe</th>
                <th className="magpag__num"><span className="sib-colf-head"><TruncatedText text="Totale" full="Totale indicativo" />{cf.th('totale_atteso', 'totale', { sort: true })}</span></th>
              </tr>
            </thead>
            <tbody>
              {righe.map(o => (
                <tr key={o.id} className="magordp__riga" onClick={() => setAperto(o.id)}>
                  <td className="magordp__num">{o.numero}</td>
                  <td><TruncatedText text={o.fornitoreNome} /></td>
                  <td><span className={`magordp__stato magordp__stato--${o.stato}`}><span className="magordp__dot" aria-hidden="true" /><TruncatedText text={o.statoNome} /></span></td>
                  <td><TruncatedText text={`${fmtDataOra(o.creato_il)} · ${o.creato_da}`} /></td>
                  <td>{o.inviato_il ? fmtDataOra(o.inviato_il) : '—'}</td>
                  <td>{o.consegna_richiesta ? fmtData(o.consegna_richiesta) : '—'}</td>
                  <td className="magpag__num">{o.righe_count}</td>
                  <td className="magpag__num">{euro(o.totale_atteso)}</td>
                </tr>
              ))}
              {dati && righe.length === 0 && (
                <tr><td colSpan={8} className="magpag__vuoto">{tutte.length ? 'Nessun ordine con questi filtri.' : 'Nessun ordine: preparali dal Riordino o con “Nuovo ordine”.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {dati && (
        <p className="magpag__somma">
          {righe.length === 1 ? '1 ordine' : `${righe.length} ordini`}{righe.length !== tutte.length && ` su ${tutte.length}`}
          {aperti > 0 && <span className="magpag__nota">· {aperti === 1 ? '1 in attesa di arrivo' : `${aperti} in attesa di arrivo`}</span>}
          {cf.hasActive && <button type="button" className="magpag__azzera" onClick={cf.reset}>Azzera i filtri di colonna</button>}
        </p>
      )}

      <OrdineModale
        valore={aperto} ctx={ctx} articoli={articoli} struttura={nomeStruttura} navigate={navigate}
        onClose={() => setAperto(null)} onCambiato={ricarica}
      />
    </>
  )
}
