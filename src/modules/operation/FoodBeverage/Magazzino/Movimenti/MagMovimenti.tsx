// ─── Magazzino ristorazione › Movimenti ─────────────────────────────────────
//  § B3 della scheda 17. Registro dei movimenti filtrabile per data, tipo,
//  articolo, punto e origine, con "Mostra scarichi delle comande" (sono
//  tanti: spento → `automatici: false`). Dettaglio del movimento con le
//  righe; gli scarichi automatici portano tavolo, piatto e porzioni della
//  comanda e rimandano alla ricetta. Annulla (gestore) = storno con motivo:
//  il registro non si cancella mai. Esporta in Excel la pagina filtrata.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import FilterToolbar from '../../../../../core/components/FilterToolbar'
import Modal from '../../../../../core/components/Modal'
import Pagination from '../../../../../core/components/Pagination'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { CheckboxField, DateRangeField, SelectField, TextareaField } from '../../../../../core/components/form'
import { exportXls } from '../../../../hr/hrExport'
import { useColFilters } from '../../../../../core/components/ColFilters'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { MovimentoDettaglio, RigaRegistro } from '../api/tipi'
import { euro, euroU, fmtData, fmtDataOra, fmtQ, fmtQs, iconaTipo, isoGiorno, nomeOrigine, nomeTipo } from '../comune/formato'
import { MagCorpo, MagErrore, MagPiede } from '../comune/MagModale'
import MagShell, { type MagCtx } from '../comune/MagShell'
import { useArticoliTutti } from '../comune/useArticoliTutti'
import { useInvio } from '../comune/useInvio'
import { useMagazzinoFb } from '../comune/useMagazzinoFb'
import NuovoMovimento from './NuovoMovimento'
import './MagMovimenti.sass'

const PER_PAGINA = 50

export default function MagMovimenti({ navigate }: { navigate: (p: string) => void }) {
  const [nuovo, setNuovo] = useState(false)
  const apri = useMagazzinoFb(s => s.apriNuovoMovimento)
  const setApri = useMagazzinoFb(s => s.setApriNuovoMovimento)
  useEffect(() => { if (apri) { setNuovo(true); setApri(false) } }, [apri, setApri])

  return (
    <MagShell
      page="fb-mag-movimenti" title="Movimenti" className="magmov"
      actions={() => (
        <>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('fb-mag-ricevi')}>
            <i className="fa-solid fa-truck-ramp-box" aria-hidden="true" /> Ricevi merce
          </button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => setNuovo(true)}>
            <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo movimento
          </button>
        </>
      )}
    >
      {ctx => <Registro ctx={ctx} navigate={navigate} nuovo={nuovo} chiudiNuovo={() => setNuovo(false)} />}
    </MagShell>
  )
}

const giorniFa = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return isoGiorno(d) }

/** Massimo di movimenti letti per periodo: oltre, si chiede di restringere il periodo. */
const MASSIMO = 5000
const STATI_MOV = ['Valido', 'Annullato', 'Storno']

function Registro({ ctx, navigate, nuovo, chiudiNuovo }: { ctx: MagCtx; navigate: (p: string) => void; nuovo: boolean; chiudiNuovo: () => void }) {
  const setRicetta = useMagazzinoFb(s => s.setRicettaDaAprire)
  const { articoli } = useArticoliTutti()
  const cf = useColFilters()
  const [dal, setDal] = useState(giorniFa(6))
  const [al, setAl] = useState(isoGiorno(new Date()))
  const [idArticolo, setIdArticolo] = useState('')
  const [automatici, setAutomatici] = useState(true)
  const [pagina, setPagina] = useState(1)
  const [dati, setDati] = useState<{ righe: RigaRegistro[]; totale: number } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [caricamento, setCaricamento] = useState(false)
  const [giro, setGiro] = useState(0)
  const [dettaglio, setDettaglio] = useState<number | null>(null)
  const [annulla, setAnnulla] = useState<RigaRegistro | null>(null)

  // Al server vanno solo periodo, articolo e scarichi delle comande; il resto lo filtrano le colonne su tutto il periodo.
  useEffect(() => {
    if (!dal || !al) return
    let annullato = false
    setCaricamento(true)
    ;(async () => {
      const righe: RigaRegistro[] = []
      let totale = 0
      for (let p = 1; ; p++) {
        const r = await eseguiMag('movimenti', { id_struttura: ctx.idStruttura, dal, al, id_articolo: idArticolo ? Number(idArticolo) : null, automatici, pagina: p, per_pagina: 200 })
        totale = r.totale
        righe.push(...r.righe)
        if (righe.length >= r.totale || r.righe.length === 0 || righe.length >= MASSIMO) break
      }
      return { righe, totale }
    })()
      .then(r => { if (!annullato) { setDati(r); setErrore(null) } })
      .catch(e => { if (!annullato) setErrore(messaggioErrore(e)) })
      .finally(() => { if (!annullato) setCaricamento(false) })
    return () => { annullato = true }
  }, [ctx.idStruttura, dal, al, idArticolo, automatici, giro])

  const ricarica = useCallback(() => setGiro(g => g + 1), [])

  const dove = (m: RigaRegistro) => (m.punto_destinazione ? `${m.punto?.nome ?? ''} → ${m.punto_destinazione.nome}` : m.punto?.nome ?? '—')
  const chi = (m: RigaRegistro) => m.fornitore?.nome ?? (m.tipo === 'scarto' ? ctx.contesto.motivi_scarto.find(x => x.key === m.motivo)?.nome ?? m.motivo : m.motivo) ?? '—'
  const annullabile = (m: RigaRegistro) => ctx.gestore && !m.annullato_da && !m.annulla && m.origine !== 'comanda'

  const tutte = useMemo(() => (dati?.righe ?? []).map(m => ({
    ...m,
    tipoNome: m.annulla ? 'Storno' : m.origine === 'comanda' ? 'Comanda' : nomeTipo(m.tipo),
    origineNome: nomeOrigine(m.origine),
    statoNome: m.annulla ? STATI_MOV[2] : m.annullato_da ? STATI_MOV[1] : STATI_MOV[0],
    dettaglioTesto: m.comanda ? `Tavolo ${m.comanda.tavolo} · ${m.comanda.voce} ×${m.comanda.porzioni}` : `${m.anteprima}${m.documento ? ` · ${m.documento}` : ''}`,
    doveNome: dove(m),
    chiNome: chi(m),
  })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [dati, ctx.contesto.motivi_scarto])
  const scelte = (k: 'tipoNome' | 'origineNome' | 'doveNome' | 'chiNome') => Array.from(new Set(tutte.map(r => r[k]))).sort()
  const filtrate = useMemo(() => cf.sortRows(tutte.filter(m =>
    cf.matchMulti(m.tipoNome, 'tipoNome') && cf.matchMulti(m.origineNome, 'origineNome') && cf.matchMulti(m.statoNome, 'statoNome') &&
    cf.matchText(m.dettaglioTesto, 'dettaglioTesto') && cf.matchMulti(m.doveNome, 'doveNome') && cf.matchMulti(m.chiNome, 'chiNome') &&
    cf.matchText(m.autore, 'autore'),
  )),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tutte, cf.text, cf.multi, cf.sort])
  useEffect(() => { setPagina(1) }, [cf.text, cf.multi, cf.sort, dal, al, idArticolo, automatici])

  const pagine = Math.max(1, Math.ceil(filtrate.length / PER_PAGINA))
  const righe = filtrate.slice((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA)

  const esporta = () => exportXls(
    `movimenti-magazzino-${dal}-${al}`,
    ['Data', 'Tipo', 'Origine', 'Punto', 'Destinazione', 'Fornitore', 'Documento', 'Motivo', 'Comanda', 'Dettaglio', 'Righe', 'Valore €', 'Autore'],
    filtrate.map(m => [
      fmtDataOra(m.data), m.tipoNome, m.origineNome, m.punto?.nome ?? '', m.punto_destinazione?.nome ?? '',
      m.fornitore?.nome ?? '', m.documento ?? '', m.motivo ?? '',
      m.comanda ? `Tavolo ${m.comanda.tavolo} · ${m.comanda.voce} ×${m.comanda.porzioni}` : '',
      m.anteprima, m.righe_count, m.valore.toFixed(2).replace('.', ','), m.autore,
    ]),
  )

  return (
    <>
      <FilterToolbar
        className="magpag__bar"
        actions={(
          <Tooltip text="Esporta in Excel i movimenti filtrati">
            <button type="button" className="sib-btn sib-btn--icon magmov__xls" aria-label="Esporta in Excel" disabled={filtrate.length === 0} onClick={esporta}>
              <i className="fa-regular fa-file-xls" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      >
        <DateRangeField
          label="Periodo" nameFrom="mov-dal" nameTo="mov-al" valueFrom={dal} valueTo={al} max={isoGiorno(new Date())} className="magmov__periodo"
          onChangeFrom={e => setDal(e.target.value)} onChangeTo={e => setAl(e.target.value)}
        />
        <SelectField
          name="mov-fart" label="Articolo" className="magmov__f-art" value={idArticolo}
          options={[{ value: '', label: 'Tutti gli articoli' }, ...articoli.map(a => ({ value: a.id, label: a.nome }))]}
          onChange={e => setIdArticolo(e.target.value)}
        />
        <div className="magpag__check">
          <CheckboxField name="mov-auto" label="Mostra scarichi delle comande" checked={automatici} onChange={e => setAutomatici(e.target.checked)} />
        </div>
      </FilterToolbar>

      {errore && <p className="magpag__errore"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {errore}</p>}

      <div className="magpag__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table magmov__table">
            <colgroup>
              <col className="magmov__c-data" /><col className="magmov__c-tipo" /><col className="magmov__c-det" /><col className="magmov__c-punto" />
              <col className="magmov__c-chi" /><col className="magmov__c-aut" /><col className="magmov__c-val" /><col className="magmov__c-act" />
            </colgroup>
            <thead>
              <tr>
                <th><span className="sib-colf-head">Data{cf.th('data', 'data', { sort: true })}{cf.th('statoNome', 'stato', { options: STATI_MOV })}</span></th>
                <th><span className="sib-colf-head">Tipo{cf.th('tipoNome', 'tipo', { options: scelte('tipoNome') })}{cf.th('origineNome', 'origine', { options: scelte('origineNome') })}</span></th>
                <th><span className="sib-colf-head">Dettaglio{cf.th('dettaglioTesto', 'dettaglio o documento', { search: true })}</span></th>
                <th><span className="sib-colf-head">Punto{cf.th('doveNome', 'punto', { options: scelte('doveNome') })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Fornitore o motivo" />{cf.th('chiNome', 'fornitore o motivo', { options: scelte('chiNome') })}</span></th>
                <th><span className="sib-colf-head">Autore{cf.th('autore', 'autore', { search: true, sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head">Valore{cf.th('valore', 'valore', { sort: true })}</span></th>
                <th aria-label="Azioni" />
              </tr>
            </thead>
            <tbody>
              {righe.map(m => (
                <tr key={m.id} className={m.annullato_da ? 'magmov__annullato' : ''}>
                  <td>{fmtDataOra(m.data)}</td>
                  <td>
                    <span className="magmov__tipo">
                      <i className={`fa-solid ${m.origine === 'comanda' ? 'fa-utensils' : iconaTipo(m.tipo)}`} aria-hidden="true" />
                      <TruncatedText text={m.tipoNome} full={`${m.annulla ? `Storno del movimento ${m.annulla}` : nomeTipo(m.tipo)} · ${m.origineNome}`} />
                    </span>
                  </td>
                  <td>
                    <TruncatedText
                      text={m.comanda ? `Tavolo ${m.comanda.tavolo} · ${m.comanda.voce} ×${m.comanda.porzioni}` : m.anteprima}
                      full={m.comanda ? `Comanda ${m.comanda.id}, tavolo ${m.comanda.tavolo}: ${m.comanda.voce} ×${m.comanda.porzioni} — ${m.anteprima}` : m.dettaglioTesto}
                    />
                  </td>
                  <td><TruncatedText text={m.doveNome} /></td>
                  <td><TruncatedText text={m.chiNome} /></td>
                  <td><TruncatedText text={m.autore} /></td>
                  <td className="magpag__num">{euro(m.valore)}</td>
                  <td className="magmov__acts">
                    <Tooltip text="Dettaglio">
                      <button type="button" className="magpag__act" aria-label="Dettaglio" onClick={() => setDettaglio(m.id)}><i className="fa-solid fa-eye" aria-hidden="true" /></button>
                    </Tooltip>
                    {annullabile(m) && (
                      <Tooltip text="Annulla con uno storno">
                        <button type="button" className="magpag__act" aria-label="Annulla con uno storno" onClick={() => setAnnulla(m)}><i className="fa-solid fa-rotate-left" aria-hidden="true" /></button>
                      </Tooltip>
                    )}
                  </td>
                </tr>
              ))}
              {!caricamento && righe.length === 0 && <tr><td colSpan={8} className="magpag__vuoto">Nessun movimento nel periodo con questi filtri.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {dati && (
        <p className="magpag__somma">
          {filtrate.length === 1 ? '1 movimento' : `${filtrate.length} movimenti`}{filtrate.length !== tutte.length && ` su ${tutte.length}`} dal {fmtData(dal)} al {fmtData(al)}
          {!automatici && <span className="magpag__nota">· senza gli scarichi delle comande</span>}
          {dati.totale > dati.righe.length && <span className="magpag__nota">· mostrati i primi {dati.righe.length} di {dati.totale}: restringi il periodo</span>}
          {cf.hasActive && <button type="button" className="magpag__azzera" onClick={cf.reset}>Azzera i filtri di colonna</button>}
        </p>
      )}
      {pagine > 1 && <div className="magpag__pag"><Pagination page={pagina} totalPages={pagine} onPageChange={setPagina} /></div>}

      <Dettaglio
        id={dettaglio} ctx={ctx} onClose={() => setDettaglio(null)}
        onApri={id => setDettaglio(id)}
        onRicetta={voce => { setRicetta(voce); navigate('fb-mag-ricette') }}
      />
      <Annulla movimento={annulla} onClose={() => setAnnulla(null)} onFatto={() => { setAnnulla(null); ricarica() }} />
      <NuovoMovimento
        open={nuovo} ctx={ctx} articoli={articoli} onClose={chiudiNuovo}
        onRegistrato={e => {
          chiudiNuovo()
          toast.success(e.duplicato ? 'Il movimento era già stato registrato.' : 'Movimento registrato.')
          e.avvisi.forEach(a => toast.warning(a))
          ricarica()
        }}
      />
    </>
  )
}

function Dettaglio({ id, ctx, onClose, onApri, onRicetta }: { id: number | null; ctx: MagCtx; onClose: () => void; onApri: (id: number) => void; onRicetta: (voce: string) => void }) {
  const [m, setM] = useState<MovimentoDettaglio | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  useEffect(() => {
    setM(null); setErrore(null)
    if (id != null) eseguiMag('movimento', { id }).then(setM).catch(e => setErrore(messaggioErrore(e)))
  }, [id])
  const nomePunto = (p: number) => ctx.punti.find(x => x.id === p)?.nome ?? `Punto ${p}`

  return (
    <Modal open={id != null} onClose={onClose} size="xl" title={m ? `${m.annulla ? 'Storno' : nomeTipo(m.tipo)} del ${fmtDataOra(m.data)}` : 'Movimento'}>
      <MagCorpo className="magmov-det">
        <MagErrore testo={errore} />
        {m && (
          <>
            <dl className="magmov-det__dati">
              <div><dt>Origine</dt><dd>{nomeOrigine(m.origine)}</dd></div>
              <div><dt>Autore</dt><dd>{m.autore}</dd></div>
              <div><dt>Registrato il</dt><dd>{fmtDataOra(m.registrato_il)}</dd></div>
              {m.fornitore && <div><dt>Fornitore</dt><dd>{m.fornitore.nome}</dd></div>}
              {m.documento && <div><dt>Documento</dt><dd>{m.documento}</dd></div>}
              {m.motivo && <div><dt>Motivo</dt><dd>{ctx.contesto.motivi_scarto.find(x => x.key === m.motivo)?.nome ?? m.motivo}</dd></div>}
              <div><dt>Valore</dt><dd>{euro(m.valore)}</dd></div>
            </dl>

            {m.comanda && (
              <p className="magmov-det__comanda">
                <i className="fa-solid fa-utensils" aria-hidden="true" />
                Scarico automatico della comanda {m.comanda.id}, tavolo {m.comanda.tavolo}: <strong>{m.comanda.voce} ×{m.comanda.porzioni}</strong>, secondo la ricetta.
                <button type="button" className="magmov-det__link" onClick={() => onRicetta(m.comanda!.voce)}>Apri la ricetta</button>
              </p>
            )}
            {m.annulla && (
              <p className="magmov-det__comanda">
                <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Storno del movimento {m.annulla}.
                <button type="button" className="magmov-det__link" onClick={() => onApri(m.annulla!)}>Apri il movimento annullato</button>
              </p>
            )}
            {m.annullato_da && (
              <p className="magmov-det__comanda magmov-det__comanda--off">
                <i className="fa-solid fa-ban" aria-hidden="true" /> Annullato dallo storno {m.annullato_da}.
                <button type="button" className="magmov-det__link" onClick={() => onApri(m.annullato_da!)}>Apri lo storno</button>
              </p>
            )}

            <div className="sib-table-wrap">
              <table className="sib-table magpag__table">
                <colgroup>
                  <col className="magmov-det__c-art" /><col className="magmov-det__c-punto" /><col className="magmov-det__c-q" />
                  <col className="magmov-det__c-pr" /><col className="magmov-det__c-lot" /><col className="magmov-det__c-q" />
                </colgroup>
                <thead>
                  <tr><th>Articolo</th><th>Punto</th><th className="magpag__num">Quantità</th><th className="magpag__num">Prezzo</th><th>Lotto e scadenza</th><th className="magpag__num"><TruncatedText text="Giacenza dopo" /></th></tr>
                </thead>
                <tbody>
                  {m.righe.map((r, i) => (
                    <tr key={i}>
                      <td><TruncatedText text={r.nome} /></td>
                      <td><TruncatedText text={nomePunto(r.id_punto)} /></td>
                      <td className={`magpag__num ${r.quantita < 0 ? 'magmov-det__out' : 'magmov-det__in'}`}>{fmtQs(r.quantita, r.unita)}</td>
                      <td className="magpag__num">{r.prezzo_unitario == null ? '—' : `${euroU(r.prezzo_unitario)}/${r.unita}`}</td>
                      <td><TruncatedText text={[r.lotto, r.scadenza && `scad. ${fmtData(r.scadenza)}`].filter(Boolean).join(' · ') || '—'} /></td>
                      <td className="magpag__num">{fmtQ(r.giacenza_dopo, r.unita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <footer className="magmov-det__piede">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
        </footer>
      </MagCorpo>
    </Modal>
  )
}

function Annulla({ movimento, onClose, onFatto }: { movimento: RigaRegistro | null; onClose: () => void; onFatto: () => void }) {
  const [motivo, setMotivo] = useState('')
  const invio = useInvio()
  const { azzera } = invio
  useEffect(() => { if (movimento) { setMotivo(''); azzera() } }, [movimento, azzera])

  const conferma = async () => {
    if (!movimento) return
    const e = await invio.esegui(id => eseguiMag('annulla_movimento', { id: movimento.id, id_operazione: id, motivo: motivo.trim() }))
    if (e) { toast.success('Movimento annullato con uno storno.'); e.avvisi.forEach(a => toast.warning(a)); onFatto() }
  }

  return (
    <Modal open={!!movimento} onClose={onClose} title="Annulla il movimento" size="md">
      {movimento && (
        <MagCorpo>
          <p className="magpag__nota">
            {nomeTipo(movimento.tipo)} del {fmtDataOra(movimento.data)}: {movimento.anteprima}. Op registra un movimento opposto collegato a questo:
            il registro resta com'è e le giacenze tornano indietro.
          </p>
          <TextareaField name="ann-motivo" label="Motivo dell'annullamento" rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} />
          <MagErrore testo={invio.errore} />
          <MagPiede onAnnulla={onClose} onConferma={conferma} etichetta="Annulla il movimento" icona="fa-rotate-left" pericolo inCorso={invio.inCorso} daRiprovare={invio.daRiprovare} disabilitato={!motivo.trim()} />
        </MagCorpo>
      )}
    </Modal>
  )
}
