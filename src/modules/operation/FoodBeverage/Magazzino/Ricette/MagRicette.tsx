// ─── Magazzino ristorazione › Ricette ───────────────────────────────────────
//  § B3 e § 8.10 della scheda 17. Le voci del menu F&B di Op, per categoria,
//  con ricetta sì/no, costo per porzione, food cost (in evidenza oltre la
//  soglia) e ingredienti mancanti nel punto di scarico. L'editor (gestore)
//  sceglie il reparto (cucina o bar: da dove si scarica) e gli ingredienti
//  con la quantità per una porzione. Costi e food cost li calcola Op: dopo il
//  salvataggio si rilegge la ricetta.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { InputField, RadioGroup, SelectField } from '../../../../../core/components/form'
import { useColFilters } from '../../../../../core/components/ColFilters'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { Articolo, CategoriaRicette, RepartoRicetta, Ricetta, VoceRicetta } from '../api/tipi'
import { euro, fmtDataOra, numero } from '../comune/formato'
import { MagCorpo, MagErrore, MagGriglia, MagSezione } from '../comune/MagModale'
import MagShell, { type MagCtx } from '../comune/MagShell'
import { useArticoliTutti } from '../comune/useArticoliTutti'
import { useMagazzinoFb } from '../comune/useMagazzinoFb'
import './MagRicette.sass'

/** Food cost oltre questa percentuale: in evidenza. */
const SOGLIA_FOOD_COST = 35

const fmtPct = (n: number | null) => (n == null ? '—' : `${n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`)

export default function MagRicette({ navigate: _navigate }: { navigate: (p: string) => void }) {
  return (
    <MagShell page="fb-mag-ricette" title="Ricette" className="magrice">
      {ctx => <Elenco ctx={ctx} />}
    </MagShell>
  )
}

const STATO_RICETTA = ['Con ricetta', 'Senza ricetta']
const REPARTI = ['Cucina', 'Bar', '—']

function Elenco({ ctx }: { ctx: MagCtx }) {
  const ricettaDaAprire = useMagazzinoFb(s => s.ricettaDaAprire)
  const setRicettaDaAprire = useMagazzinoFb(s => s.setRicettaDaAprire)
  const { articoli } = useArticoliTutti()
  const cf = useColFilters()
  const [dati, setDati] = useState<CategoriaRicette[] | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [caricamento, setCaricamento] = useState(false)
  const [giro, setGiro] = useState(0)
  const [aperta, setAperta] = useState<VoceRicetta | null>(null)

  useEffect(() => {
    let annullato = false
    setCaricamento(true)
    eseguiMag('ricette', { id_struttura: ctx.idStruttura })
      .then(r => { if (!annullato) { setDati(r); setErrore(null) } })
      .catch(e => { if (!annullato) setErrore(messaggioErrore(e)) })
      .finally(() => { if (!annullato) setCaricamento(false) })
    return () => { annullato = true }
  }, [giro, ctx.idStruttura])

  // Arrivando da uno scarico di comanda: si apre la ricetta di quel piatto.
  useEffect(() => {
    if (!ricettaDaAprire || !dati) return
    const v = dati.flatMap(c => c.voci).find(x => x.nome === ricettaDaAprire)
    if (v) setAperta(v)
    setRicettaDaAprire(null)
  }, [ricettaDaAprire, dati, setRicettaDaAprire])

  const ricarica = useCallback(() => setGiro(g => g + 1), [])

  // Righe piatte (categoria del menu come colonna) per filtri e ordinamento; i valori sono quelli di Op.
  const tutte = useMemo(() => (dati ?? []).flatMap(c => c.voci.map(v => ({
    ...v,
    categoria: c.categoria_menu,
    statoNome: v.ricetta ? STATO_RICETTA[0] : STATO_RICETTA[1],
    repartoNome: v.reparto === 'cucina' ? 'Cucina' : v.reparto === 'bar' ? 'Bar' : '—',
    costo: v.costo_porzione ?? -1,
    fc: v.food_cost ?? -1,
  }))), [dati])
  const categorie = useMemo(() => Array.from(new Set(tutte.map(v => v.categoria))), [tutte])
  const voci = useMemo(() => cf.sortRows(tutte.filter(v =>
    cf.matchText(v.nome, 'nome') && cf.matchMulti(v.categoria, 'categoria') &&
    cf.matchMulti(v.statoNome, 'statoNome') && cf.matchMulti(v.repartoNome, 'repartoNome'),
  )),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tutte, cf.text, cf.multi, cf.sort])
  const senzaRicetta = tutte.filter(v => !v.ricetta).length

  return (
    <>
      {errore && <p className="magpag__errore"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {errore}</p>}

      <div className="magpag__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table magrice__table">
            <colgroup>
              <col className="magrice__c-voce" /><col className="magrice__c-cat" /><col className="magrice__c-stato" /><col className="magrice__c-rep" /><col className="magrice__c-n" />
              <col className="magrice__c-eur" /><col className="magrice__c-eur" /><col className="magrice__c-fc" /><col className="magrice__c-manc" />
            </colgroup>
            <thead>
              <tr>
                <th><span className="sib-colf-head"><TruncatedText text="Voce del menu" />{cf.th('nome', 'voce del menu', { search: true })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Categoria" />{cf.th('categoria', 'categoria del menu', { options: categorie })}</span></th>
                <th><span className="sib-colf-head">Ricetta{cf.th('statoNome', 'ricetta', { options: STATO_RICETTA })}</span></th>
                <th><span className="sib-colf-head">Reparto{cf.th('repartoNome', 'reparto', { options: REPARTI })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head"><TruncatedText text="Ingr." full="Ingredienti" />{cf.th('ingredienti', 'ingredienti', { sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head">Prezzo{cf.th('prezzo', 'prezzo', { sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head"><TruncatedText text="Costo porz." full="Costo per porzione" />{cf.th('costo', 'costo per porzione', { sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head"><TruncatedText text="Food cost" />{cf.th('fc', 'food cost', { sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head"><TruncatedText text="Mancanti" />{cf.th('articoli_mancanti', 'articoli mancanti', { sort: true })}</span></th>
              </tr>
            </thead>
            <tbody>
              {voci.map(v => (
                <tr key={v.id_voce} className="magrice__riga" onClick={() => setAperta(v)}>
                  <td><TruncatedText text={v.nome} /></td>
                  <td><TruncatedText text={v.categoria} /></td>
                  <td>
                    <span className={`magrice__stato ${v.ricetta ? 'magrice__stato--si' : 'magrice__stato--no'}`}>
                      <span className="magrice__dot" aria-hidden="true" /><TruncatedText text={v.ricetta ? 'Con ricetta' : 'Senza ricetta'} />
                    </span>
                  </td>
                  <td>{v.repartoNome}</td>
                  <td className="magpag__num">{v.ricetta ? v.ingredienti : '—'}</td>
                  <td className="magpag__num">{euro(v.prezzo)}</td>
                  <td className="magpag__num">{v.ricetta ? euro(v.costo_porzione) : '—'}</td>
                  <td className={`magpag__num ${v.food_cost != null && v.food_cost > SOGLIA_FOOD_COST ? 'magrice__alto' : ''}`}>
                    {v.ricetta ? (
                      v.food_cost != null && v.food_cost > SOGLIA_FOOD_COST
                        ? <Tooltip text={`Oltre il ${SOGLIA_FOOD_COST}%: rivedi la ricetta o il prezzo`}><span>{fmtPct(v.food_cost)}</span></Tooltip>
                        : fmtPct(v.food_cost)
                    ) : '—'}
                  </td>
                  <td className="magpag__num">
                    {v.articoli_mancanti > 0
                      ? <Tooltip text="Ingredienti finiti nel punto di scarico: il piatto rischia di non essere disponibile"><span className="magrice__manca"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {v.articoli_mancanti}</span></Tooltip>
                      : '—'}
                  </td>
                </tr>
              ))}
              {!caricamento && voci.length === 0 && <tr><td colSpan={9} className="magpag__vuoto">Nessuna voce del menu con questi filtri.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {dati && (
        <p className="magpag__somma">
          {voci.length === 1 ? '1 voce' : `${voci.length} voci`}{voci.length !== tutte.length && ` su ${tutte.length}`} del menu
          {senzaRicetta > 0 && <span className="magpag__nota">· {senzaRicetta} senza ricetta: le loro vendite non scaricano il magazzino</span>}
          {cf.hasActive && <button type="button" className="magpag__azzera" onClick={cf.reset}>Azzera i filtri di colonna</button>}
        </p>
      )}

      <EditorRicetta voce={aperta} ctx={ctx} articoli={articoli} onClose={() => setAperta(null)} onCambiata={ricarica} />
    </>
  )
}

// ─── Editor della ricetta ─────────────────────────────────────────────────────

interface Ing { k: number; id_articolo: number | null; quantita: string }
let prossimo = 1

function EditorRicetta({ voce, ctx, articoli, onClose, onCambiata }: { voce: VoceRicetta | null; ctx: MagCtx; articoli: Articolo[]; onClose: () => void; onCambiata: () => void }) {
  const confirm = useConfirmStore(s => s.confirm)
  const [r, setR] = useState<Ricetta | null>(null)
  const [reparto, setReparto] = useState<RepartoRicetta>('cucina')
  const [ing, setIng] = useState<Ing[]>([])
  const [errore, setErrore] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const carica = useCallback(async (idVoce: number) => {
    try {
      const x = await eseguiMag('ricetta', { id_voce: idVoce })
      setR(x)
      setReparto(x.reparto ?? 'cucina')
      setIng(x.ingredienti.length ? x.ingredienti.map(i => ({ k: prossimo++, id_articolo: i.id_articolo, quantita: String(i.quantita).replace('.', ',') })) : [{ k: prossimo++, id_articolo: null, quantita: '' }])
    } catch (e) { setErrore(messaggioErrore(e)) }
  }, [])

  useEffect(() => { setR(null); setErrore(null); if (voce) carica(voce.id_voce) }, [voce, carica])

  const perId = useMemo(() => new Map(articoli.map(a => [a.id, a])), [articoli])
  const costoDi = (idArt: number | null) => r?.ingredienti.find(i => i.id_articolo === idArt)?.costo ?? null
  const set = (k: number, p: Partial<Ing>) => setIng(xs => xs.map(x => (x.k === k ? { ...x, ...p } : x)))
  const sola = !ctx.gestore

  const salva = async () => {
    if (!voce) return
    setSalvando(true); setErrore(null)
    try {
      const e = await eseguiMag('salva_ricetta', {
        id_voce: voce.id_voce, reparto,
        ingredienti: ing.filter(x => x.id_articolo != null).map(x => ({ id_articolo: x.id_articolo!, quantita: numero(x.quantita) ?? 0 })),
      })
      if (!e.success) { setErrore(e.error_message || 'Ricetta non salvata.'); return }
      toast.success(`Ricetta di «${voce.nome}» salvata: vale dalle prossime porzioni servite.`)
      await carica(voce.id_voce)
      onCambiata()
    } catch (err) { setErrore(messaggioErrore(err)) } finally { setSalvando(false) }
  }

  const elimina = async () => {
    if (!voce) return
    if (!(await confirm({ title: 'Eliminare la ricetta?', message: `«${voce.nome}» non scaricherà più il magazzino quando viene servito.`, confirmLabel: 'Elimina', danger: true }))) return
    try {
      const e = await eseguiMag('elimina_ricetta', { id_voce: voce.id_voce })
      if (!e.success) { setErrore(e.error_message || 'Ricetta non eliminata.'); return }
      toast.success(`Ricetta di «${voce.nome}» eliminata.`)
      onCambiata()
      onClose()
    } catch (err) { setErrore(messaggioErrore(err)) }
  }

  return (
    <Modal open={!!voce} onClose={onClose} size="lg" title={voce ? `Ricetta — ${voce.nome}` : 'Ricetta'}>
      <MagCorpo className="magrice-ed">
        <MagErrore testo={errore} />
        {r && (
          <>
            <MagGriglia colonne={4}>
              <div className="magrice-ed__kpi"><span>Prezzo in carta</span><strong>{euro(r.prezzo)}</strong></div>
              <div className="magrice-ed__kpi"><span>Costo per porzione</span><strong>{r.ingredienti.length ? euro(r.costo_porzione) : '—'}</strong></div>
              <div className={`magrice-ed__kpi ${r.food_cost != null && r.food_cost > SOGLIA_FOOD_COST ? 'magrice-ed__kpi--alto' : ''}`}><span>Food cost</span><strong>{r.ingredienti.length ? fmtPct(r.food_cost) : '—'}</strong></div>
              <div className="magrice-ed__kpi"><span>Aggiornata</span><strong className="magrice-ed__agg">{r.aggiornata_il ? `${fmtDataOra(r.aggiornata_il)}${r.aggiornata_da ? ` · ${r.aggiornata_da}` : ''}` : 'Mai'}</strong></div>
            </MagGriglia>

            <RadioGroup
              name="ric-rep" label="Si scarica da" value={reparto} disabled={sola}
              options={[{ value: 'cucina', label: 'Cucina' }, { value: 'bar', label: 'Bar' }]}
              onChange={v => setReparto(v as RepartoRicetta)}
            />

            <MagSezione titolo="Ingredienti per una porzione">
              <div className="sib-table-wrap">
                <table className="sib-table magpag__table magrice-ed__table">
                  <colgroup><col className="magrice-ed__c-art" /><col className="magrice-ed__c-q" /><col className="magrice-ed__c-costo" /><col className="magrice-ed__c-act" /></colgroup>
                  <thead><tr><th>Articolo</th><th>Quantità</th><th className="magpag__num">Costo</th><th aria-label="Azioni" /></tr></thead>
                  <tbody>
                    {ing.map(x => {
                      const a = x.id_articolo != null ? perId.get(x.id_articolo) : undefined
                      return (
                        <tr key={x.k}>
                          <td>
                            {sola
                              ? <TruncatedText text={a?.nome ?? r.ingredienti.find(i => i.id_articolo === x.id_articolo)?.nome ?? '—'} />
                              : <SelectField name={`ing-a-${x.k}`} ariaLabel="Articolo" value={x.id_articolo ?? ''} options={[{ value: '', label: 'Scegli l’articolo' }, ...articoli.map(o => ({ value: o.id, label: `${o.nome} (${o.unita})` }))]} onChange={e => set(x.k, { id_articolo: e.target.value ? Number(e.target.value) : null })} />}
                          </td>
                          <td>
                            <span className="magrice-ed__q">
                              <InputField name={`ing-q-${x.k}`} ariaLabel="Quantità per porzione" dense readOnly={sola} value={x.quantita} placeholder="0" onChange={e => set(x.k, { quantita: e.target.value })} />
                              <span className="magrice-ed__u">{a?.unita ?? r.ingredienti.find(i => i.id_articolo === x.id_articolo)?.unita ?? ''}</span>
                            </span>
                          </td>
                          <td className="magpag__num">{euro(costoDi(x.id_articolo))}</td>
                          <td className="magrice-ed__acts">
                            {!sola && (
                              <Tooltip text="Togli l’ingrediente">
                                <button type="button" className="magpag__act" aria-label="Togli l’ingrediente" onClick={() => setIng(xs => (xs.length > 1 ? xs.filter(y => y.k !== x.k) : [{ k: prossimo++, id_articolo: null, quantita: '' }]))}>
                                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                                </button>
                              </Tooltip>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {!sola && (
                  <button type="button" className="magrice-ed__aggiungi" onClick={() => setIng(xs => [...xs, { k: prossimo++, id_articolo: null, quantita: '' }])}>
                    <i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi ingrediente
                  </button>
                )}
              </div>
              <p className="magpag__nota">
                Quantità per una porzione, nell’unità dell’articolo (0,120 kg = 120 g). Una bevanda venduta così com’è è un solo ingrediente: 1 pz.
                Il costo lo calcola Op con il costo medio di ogni articolo, dopo il salvataggio.
              </p>
            </MagSezione>

            <footer className="magrice-ed__piede">
              {!sola && r.ingredienti.length > 0 && (
                <button type="button" className="sib-btn sib-btn--danger-outline" onClick={elimina}>
                  <i className="fa-solid fa-trash" aria-hidden="true" /> Elimina ricetta
                </button>
              )}
              <span className="magrice-ed__spazio" />
              <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
              {!sola && (
                <button type="button" className={`sib-btn sib-btn--primary ${salvando ? 'sib-btn--loading' : ''}`} disabled={salvando} onClick={salva}>
                  <i className="fa-solid fa-check" aria-hidden="true" /> Salva ricetta
                </button>
              )}
            </footer>
          </>
        )}
      </MagCorpo>
    </Modal>
  )
}
