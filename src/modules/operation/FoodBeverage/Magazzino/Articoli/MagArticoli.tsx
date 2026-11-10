// ─── Magazzino ristorazione › Articoli ──────────────────────────────────────
//  § B3 della scheda 17: anagrafica con ricerca, categoria e attivi /
//  disattivati; clic sulla riga → scheda articolo (modifica, disattiva,
//  elimina per il gestore). Nuovo articolo: chiunque. Categorie in una modale
//  (gestore).

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import FilterToolbar from '../../../../../core/components/FilterToolbar'
import Modal from '../../../../../core/components/Modal'
import Pagination from '../../../../../core/components/Pagination'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { InputField, SearchField, SelectField } from '../../../../../core/components/form'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useColFilters } from '../../../../../core/components/ColFilters'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { Articolo, Rif } from '../api/tipi'
import ArticoloForm from '../comune/ArticoloForm'
import ArticoloScheda from '../comune/ArticoloScheda'
import { euroU, fmtQ } from '../comune/formato'
import MagShell, { type MagCtx } from '../comune/MagShell'
import { MagCorpo, MagErrore } from '../comune/MagModale'
import { useInvio } from '../comune/useInvio'
import { useMagazzinoFb } from '../comune/useMagazzinoFb'
import './MagArticoli.sass'

const PER_PAGINA = 50

export default function MagArticoli({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [nuovo, setNuovo] = useState(false)
  const [categorie, setCategorie] = useState(false)
  const [giro, setGiro] = useState(0)
  return (
    <MagShell
      page="fb-mag-articoli" title="Articoli" className="magart-pag"
      actions={ctx => (
        <>
          {ctx.gestore && (
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setCategorie(true)}>
              <i className="fa-solid fa-tags" aria-hidden="true" /> Categorie
            </button>
          )}
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setNuovo(true)}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo articolo
          </button>
        </>
      )}
    >
      {ctx => (
        <>
          <Elenco ctx={ctx} giro={giro} onCambiato={() => setGiro(g => g + 1)} />
          <ArticoloForm
            open={nuovo} ctx={ctx} onClose={() => setNuovo(false)}
            onSalvato={(_id, nome) => { setNuovo(false); toast.success(`«${nome}» aggiunto agli articoli.`); setGiro(g => g + 1) }}
          />
          <Categorie open={categorie} ctx={ctx} onClose={() => setCategorie(false)} />
        </>
      )}
    </MagShell>
  )
}

/** Tutti gli articoli di una ricerca (pagine da 200, il massimo del § 8.0): i filtri di colonna lavorano su tutto. */
async function tuttiGliArticoli(cerca: string | null, inattivi: boolean): Promise<Articolo[]> {
  const out: Articolo[] = []
  for (let pagina = 1; ; pagina++) {
    const r = await eseguiMag('articoli', { cerca, inattivi, pagina, per_pagina: 200 })
    out.push(...r.righe)
    if (out.length >= r.totale || r.righe.length === 0) return out
  }
}

const SCORTA = ['Sotto scorta', 'Regolare']

function Elenco({ ctx, giro, onCambiato }: { ctx: MagCtx; giro: number; onCambiato: () => void }) {
  const cf = useColFilters()
  const [cerca, setCerca] = useState('')
  const [cercaAttiva, setCercaAttiva] = useState('')
  const [stato, setStato] = useState<'attivi' | 'disattivati'>('attivi')
  const [pagina, setPagina] = useState(1)
  const [dati, setDati] = useState<Articolo[] | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [caricamento, setCaricamento] = useState(false)
  const [scheda, setScheda] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setCercaAttiva(cerca.trim()), 300)
    return () => clearTimeout(t)
  }, [cerca])

  useEffect(() => {
    let annullato = false
    setCaricamento(true)
    tuttiGliArticoli(cercaAttiva || null, stato === 'disattivati')
      .then(r => { if (!annullato) { setDati(r); setErrore(null) } })
      .catch(e => { if (!annullato) setErrore(messaggioErrore(e)) })
      .finally(() => { if (!annullato) setCaricamento(false) })
    return () => { annullato = true }
  }, [cercaAttiva, stato, giro])

  // Righe piatte per filtri e ordinamento di colonna (valori di Op, nessun ricalcolo).
  const tutte = useMemo(() => (dati ?? []).map(a => ({
    ...a,
    categoriaNome: a.categoria ?? 'Senza categoria',
    fornitoriNomi: a.fornitori.map(f => f.nome).join(', '),
    ean: a.codici_a_barre.map(c => c.ean).join(' '),
    scortaNome: a.sotto_scorta ? SCORTA[0] : SCORTA[1],
    costo: a.costo_medio ?? -1,
  })), [dati])
  const scelte = (k: 'categoriaNome' | 'unita') => Array.from(new Set(tutte.map(r => r[k]))).sort()
  const fornitori = useMemo(() => Array.from(new Set((dati ?? []).flatMap(a => a.fornitori.map(f => f.nome)))).sort(), [dati])
  const righeFiltrate = useMemo(() => cf.sortRows(tutte.filter(r =>
    cf.matchText(r.codice, 'codice') && cf.matchText(r.nome, 'nome') && cf.matchText(r.ean, 'ean') &&
    cf.matchMulti(r.categoriaNome, 'categoriaNome') && cf.matchMulti(r.unita, 'unita') && cf.matchMulti(r.scortaNome, 'scortaNome') &&
    (!(cf.multi.fornitoriNomi?.length) || r.fornitori.some(f => cf.multi.fornitoriNomi.includes(f.nome))),
  )),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tutte, cf.text, cf.multi, cf.sort])
  useEffect(() => { setPagina(1) }, [cf.text, cf.multi, cf.sort, cercaAttiva, stato])

  const pagine = Math.max(1, Math.ceil(righeFiltrate.length / PER_PAGINA))
  const righe = righeFiltrate.slice((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA)

  return (
    <>
      <FilterToolbar className="magpag__bar">
        <div className="magart-pag__cerca">
          <span className="magpag__lab">Cerca</span>
          <SearchField
            name="art-cerca" placeholder="Nome, codice o codice a barre" value={cerca} loading={caricamento}
            onChange={e => setCerca(e.target.value)} onSearch={v => { setCerca(v); setCercaAttiva(v.trim()) }}
            onClear={() => { setCerca(''); setCercaAttiva('') }}
          />
        </div>
        <SelectField
          name="art-stato" label="Stato" className="magpag__f" value={stato}
          options={[{ value: 'attivi', label: 'Attivi' }, { value: 'disattivati', label: 'Disattivati' }]}
          onChange={e => setStato(e.target.value as 'attivi' | 'disattivati')}
        />
      </FilterToolbar>

      {errore && <p className="magpag__errore"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {errore}</p>}

      <div className="magpag__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table magart-pag__table">
            <colgroup>
              <col className="magart-pag__c-cod" /><col className="magart-pag__c-nome" /><col className="magart-pag__c-cat" /><col className="magart-pag__c-u" />
              <col className="magart-pag__c-ean" /><col className="magart-pag__c-forn" /><col className="magart-pag__c-q" />
              <col className="magart-pag__c-giac" /><col className="magart-pag__c-costo" />
            </colgroup>
            <thead>
              <tr>
                <th><span className="sib-colf-head">Codice{cf.th('codice', 'codice', { search: true, sort: true })}</span></th>
                <th><span className="sib-colf-head">Nome{cf.th('nome', 'nome', { search: true, sort: true })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Categoria" />{cf.th('categoriaNome', 'categoria', { options: scelte('categoriaNome'), sort: true })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Unità" />{cf.th('unita', 'unità', { options: scelte('unita') })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Codici a barre" />{cf.th('ean', 'codice a barre', { search: true })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Fornitori" />{cf.th('fornitoriNomi', 'fornitore', { options: fornitori, sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head"><TruncatedText text="Scorta min." full="Scorta minima" />{cf.th('scorta_minima', 'scorta minima', { sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head">Giacenza{cf.th('scortaNome', 'scorta', { options: SCORTA })}{cf.th('giacenza_totale', 'giacenza', { sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head"><TruncatedText text="Costo medio" />{cf.th('costo', 'costo medio', { sort: true })}</span></th>
              </tr>
            </thead>
            <tbody>
              {righe.map(a => (
                <tr key={a.id} className="magart-pag__riga" onClick={() => setScheda(a.id)}>
                  <td className="magart-pag__cod">{a.codice}</td>
                  <td>
                    <span className="magart-pag__nome">
                      {a.sotto_scorta && (
                        <Tooltip text="Sotto la scorta minima">
                          <i className="fa-solid fa-triangle-exclamation magart-pag__sotto" aria-label="Sotto scorta" />
                        </Tooltip>
                      )}
                      <TruncatedText text={a.nome} />
                    </span>
                  </td>
                  <td><TruncatedText text={a.categoria ?? '—'} /></td>
                  <td>{a.unita}</td>
                  <td>
                    <TruncatedText
                      text={a.codici_a_barre.length === 0 ? '—' : a.codici_a_barre.length === 1 ? a.codici_a_barre[0].ean : `${a.codici_a_barre[0].ean} +${a.codici_a_barre.length - 1}`}
                      full={a.codici_a_barre.map(c => `${c.ean} (${fmtQ(c.quantita, a.unita)})`).join(' · ')}
                    />
                  </td>
                  <td><TruncatedText text={a.fornitoriNomi || '—'} /></td>
                  <td className="magpag__num">{fmtQ(a.scorta_minima, a.unita)}</td>
                  <td className={`magpag__num ${a.sotto_scorta ? 'magart-pag__q-sotto' : ''}`}>{fmtQ(a.giacenza_totale, a.unita)}</td>
                  <td className="magpag__num">{a.costo_medio == null ? '—' : `${euroU(a.costo_medio)}/${a.unita}`}</td>
                </tr>
              ))}
              {!caricamento && righe.length === 0 && (
                <tr><td colSpan={9} className="magpag__vuoto">{stato === 'disattivati' && tutte.length === 0 ? 'Nessun articolo disattivato.' : 'Nessun articolo con questi filtri.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dati && (
        <p className="magpag__somma">
          {righeFiltrate.length === 1 ? '1 articolo' : `${righeFiltrate.length} articoli`}{righeFiltrate.length !== tutte.length && ` su ${tutte.length}`}
          <span className="magpag__nota">· giacenza totale di tutte le strutture</span>
          {cf.hasActive && <button type="button" className="magpag__azzera" onClick={cf.reset}>Azzera i filtri di colonna</button>}
        </p>
      )}
      {pagine > 1 && <div className="magpag__pag"><Pagination page={pagina} totalPages={pagine} onPageChange={setPagina} /></div>}

      <ArticoloScheda idArticolo={scheda} ctx={ctx} onClose={() => setScheda(null)} onCambiato={onCambiato} />
    </>
  )
}

/** Categorie degli articoli (gestore): aggiungi, rinomina, elimina (§ 8.9). */
function Categorie({ open, ctx, onClose }: { open: boolean; ctx: MagCtx; onClose: () => void }) {
  const aggiorna = useMagazzinoFb(s => s.aggiorna)
  const confirm = useConfirmStore(s => s.confirm)
  const [nuova, setNuova] = useState('')
  const [modifica, setModifica] = useState<{ id: number; nome: string } | null>(null)
  const invio = useInvio()
  const { azzera } = invio

  useEffect(() => { if (open) { setNuova(''); setModifica(null); azzera() } }, [open, azzera])

  const aggiungi = async () => {
    const e = await invio.esegui(id => eseguiMag('salva_categoria', { id: null, id_operazione: id, nome: nuova.trim() }))
    if (e) { toast.success(`Categoria «${nuova.trim()}» aggiunta.`); setNuova(''); aggiorna() }
  }

  const rinomina = async () => {
    if (!modifica) return
    const e = await invio.esegui(() => eseguiMag('salva_categoria', { id: modifica.id, nome: modifica.nome.trim() }))
    if (e) { setModifica(null); aggiorna() }
  }

  const elimina = useCallback(async (c: Rif) => {
    if (!(await confirm({ title: 'Eliminare la categoria?', message: `La categoria «${c.nome}» sarà eliminata. Si può solo se non ha articoli.`, confirmLabel: 'Elimina', danger: true }))) return
    try {
      const e = await eseguiMag('elimina_categoria', { id: c.id })
      if (!e.success) { toast.error(e.error_message || 'Operazione non riuscita.'); return }
      toast.success(`Categoria «${c.nome}» eliminata.`)
      aggiorna()
    } catch (err) { toast.error(messaggioErrore(err)) }
  }, [confirm, aggiorna])

  return (
    <Modal open={open} onClose={onClose} title="Categorie degli articoli" size="md">
      <MagCorpo>
        <div className="magart-cat__nuova">
          <InputField name="cat-nuova" label="Nuova categoria" placeholder="Es. Oli e condimenti" value={nuova} onChange={e => setNuova(e.target.value)} />
          <button type="button" className={`sib-btn sib-btn--primary ${invio.inCorso ? 'sib-btn--loading' : ''}`} disabled={!nuova.trim() || invio.inCorso} onClick={aggiungi}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi
          </button>
        </div>
        <MagErrore testo={invio.errore} />
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table">
            <colgroup><col className="magart-cat__c-nome" /><col className="magart-cat__c-act" /></colgroup>
            <thead><tr><th>Categoria</th><th aria-label="Azioni" /></tr></thead>
            <tbody>
              {ctx.contesto.categorie.map(c => (
                <tr key={c.id}>
                  <td>
                    {modifica?.id === c.id
                      ? <InputField name={`cat-${c.id}`} ariaLabel="Nome della categoria" dense value={modifica.nome} onChange={e => setModifica({ id: c.id, nome: e.target.value })} />
                      : <TruncatedText text={c.nome} />}
                  </td>
                  <td className="magart-cat__acts">
                    {modifica?.id === c.id ? (
                      <>
                        <Tooltip text="Salva"><button type="button" className="magpag__act" aria-label="Salva" disabled={!modifica.nome.trim()} onClick={rinomina}><i className="fa-solid fa-check" aria-hidden="true" /></button></Tooltip>
                        <Tooltip text="Annulla"><button type="button" className="magpag__act" aria-label="Annulla" onClick={() => setModifica(null)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button></Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip text="Rinomina"><button type="button" className="magpag__act" aria-label="Rinomina" onClick={() => setModifica({ id: c.id, nome: c.nome })}><i className="fa-solid fa-pen" aria-hidden="true" /></button></Tooltip>
                        <Tooltip text="Elimina"><button type="button" className="magpag__act" aria-label="Elimina" onClick={() => elimina(c)}><i className="fa-solid fa-trash" aria-hidden="true" /></button></Tooltip>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {ctx.contesto.categorie.length === 0 && <tr><td colSpan={2} className="magpag__vuoto">Nessuna categoria.</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="magart-cat__piede">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
        </footer>
      </MagCorpo>
    </Modal>
  )
}
