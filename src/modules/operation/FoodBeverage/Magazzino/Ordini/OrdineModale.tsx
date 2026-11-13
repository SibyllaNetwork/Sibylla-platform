// ─── Ordini ai fornitori: modale dell'ordine ─────────────────────────────────
//  Bozza (gestore): fornitore, consegna richiesta, note e righe modificabili;
//  "Salva bozza", "Scarica PDF", "Invia per email…", "Annulla ordine".
//  Dopo l'invio: righe in sola lettura con ricevuto / ordinato, "Registra
//  l'arrivo" (apre Ricevi merce collegata all'ordine), "Chiudi" se la merce
//  mancante non arriverà più, "Reinvia" se serve. Totali e stato arrivano dal
//  backend (docs/portal-magazzino-riordino.md).

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { DatePickerField, InputField, SelectField, TextareaField } from '../../../../../core/components/form'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { Articolo, Ordine } from '../api/tipi'
import { euro, euroU, fmtData, fmtDataOra, fmtQ, isoGiorno, numero } from '../comune/formato'
import { MagCorpo, MagErrore, MagGriglia, MagSezione } from '../comune/MagModale'
import type { MagCtx } from '../comune/MagShell'
import { creaPdfOrdine } from '../comune/ordinePdf'
import { useInvio } from '../comune/useInvio'
import { useMagazzinoFb } from '../comune/useMagazzinoFb'
import InvioOrdine from './InvioOrdine'
import { STATI_ORDINE } from './statiOrdine'
import './OrdineModale.sass'

interface Riga { k: number; id_articolo: number | null; quantita: string; prezzo: string }
let prossima = 1
const testo = (n: number | null) => (n == null ? '' : String(n).replace('.', ','))

interface Props {
  /** id dell'ordine da aprire, 'nuovo' per una bozza vuota, null = chiusa. */
  valore: number | 'nuovo' | null
  ctx: MagCtx
  articoli: Articolo[]
  struttura: string
  navigate: (p: string) => void
  onClose: () => void
  onCambiato: () => void
}

export default function OrdineModale({ valore, ctx, articoli, struttura, navigate, onClose, onCambiato }: Props) {
  const setOrdineDaRicevere = useMagazzinoFb(s => s.setOrdineDaRicevere)
  const [o, setO] = useState<Ordine | null>(null)
  const [idFornitore, setIdFornitore] = useState('')
  const [consegna, setConsegna] = useState('')
  const [note, setNote] = useState('')
  const [righe, setRighe] = useState<Riga[]>([])
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  const [chiusura, setChiusura] = useState<'chiudi' | 'annulla' | null>(null)
  const salva = useInvio()
  const { azzera } = salva

  const carica = useCallback(async (id: number) => {
    try {
      const x = await eseguiMag('ordine', { id })
      setO(x)
      setIdFornitore(String(x.fornitore.id)); setConsegna(x.consegna_richiesta ?? ''); setNote(x.note ?? '')
      setRighe(x.righe.map(r => ({ k: prossima++, id_articolo: r.id_articolo, quantita: testo(r.quantita), prezzo: testo(r.prezzo_atteso) })))
    } catch (e) { setErrore(messaggioErrore(e)) }
  }, [])

  useEffect(() => {
    setO(null); setErrore(null); azzera()
    if (valore === 'nuovo') {
      const d = new Date(); d.setDate(d.getDate() + 2)
      setIdFornitore(''); setConsegna(isoGiorno(d)); setNote(''); setRighe([{ k: prossima++, id_articolo: null, quantita: '', prezzo: '' }])
    } else if (valore != null) carica(valore)
  }, [valore, carica, azzera])

  // Dopo il primo salvataggio di un ordine nuovo si lavora sull'ordine creato: un secondo "Salva" non ne crea un altro.
  const idOrdine = o?.id ?? (typeof valore === 'number' ? valore : null)
  const bozza = o ? o.stato === 'bozza' : valore === 'nuovo'
  const modificabile = bozza && ctx.gestore
  const perId = useMemo(() => new Map(articoli.map(a => [a.id, a])), [articoli])
  // Prima gli articoli che il fornitore scelto vende, poi gli altri.
  const opzioniArt = useMemo(() => {
    const f = Number(idFornitore)
    const suoi = articoli.filter(a => a.fornitori.some(x => x.id_fornitore === f))
    const altri = articoli.filter(a => !a.fornitori.some(x => x.id_fornitore === f))
    return [{ value: '', label: 'Scegli l’articolo' }, ...[...suoi, ...altri].map(a => ({ value: a.id, label: `${a.nome} (${a.unita})` }))]
  }, [articoli, idFornitore])
  const set = (k: number, p: Partial<Riga>) => setRighe(rs => rs.map(r => (r.k === k ? { ...r, ...p } : r)))

  const scegliArticolo = (k: number, id: number | null) => {
    // Prezzo atteso proposto = ultimo prezzo pagato a quel fornitore (dato del backend).
    const prezzo = id != null ? perId.get(id)?.fornitori.find(f => f.id_fornitore === Number(idFornitore))?.prezzo ?? null : null
    set(k, { id_articolo: id, prezzo: testo(prezzo) })
  }

  const salvaBozza = async () => {
    const e = await salva.esegui(id => eseguiMag('salva_ordine', {
      id: idOrdine,
      ...(idOrdine == null ? { id_operazione: id } : {}),
      id_struttura: ctx.idStruttura,
      id_fornitore: Number(idFornitore),
      consegna_richiesta: consegna || null,
      note: note.trim() || null,
      righe: righe.filter(r => r.id_articolo != null).map(r => ({ id_articolo: r.id_articolo!, quantita: numero(r.quantita) ?? 0, prezzo_atteso: numero(r.prezzo) })),
    }))
    if (e?.id != null) {
      toast.success('Bozza dell’ordine salvata.')
      onCambiato()
      await carica(e.id)
      return e.id
    }
    return null
  }

  const scaricaPdf = () => {
    if (!o) return
    const pdf = creaPdfOrdine(o, struttura)
    const url = URL.createObjectURL(pdf.blob)
    const a = document.createElement('a')
    a.href = url; a.download = pdf.nomeFile; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const registraArrivo = () => {
    if (!o) return
    setOrdineDaRicevere({ id: o.id, id_fornitore: o.fornitore.id })
    onClose()
    navigate('fb-mag-ricevi')
  }

  const fornitoreScelto = ctx.contesto.fornitori.find(f => f.id === Number(idFornitore))
  const titolo = o ? `Ordine ${o.numero} — ${o.fornitore.nome}` : valore === 'nuovo' ? 'Nuovo ordine' : 'Ordine'

  return (
    <>
      <Modal open={valore != null && !invio && !chiusura} onClose={onClose} size="xl" title={titolo}>
        <MagCorpo className="magord">
          <MagErrore testo={errore} />
          {(valore === 'nuovo' || o) && (
            <>
              {o && (
                <p className="magord__stato">
                  <span className={`magord__dot magord__dot--${o.stato}`} aria-hidden="true" />
                  <strong>{STATI_ORDINE[o.stato]}</strong>
                  <span className="magpag__nota">
                    creato il {fmtDataOra(o.creato_il)} da {o.creato_da}
                    {o.inviato_il && ` · inviato il ${fmtDataOra(o.inviato_il)} a ${o.inviato_a.join(', ')}`}
                    {o.motivo_chiusura && ` · ${o.motivo_chiusura}`}
                  </span>
                </p>
              )}
              <MagGriglia colonne={3}>
                <SelectField
                  name="ord-forn" label="Fornitore" value={idFornitore} disabled={!modificabile}
                  options={[{ value: '', label: 'Scegli il fornitore' }, ...ctx.contesto.fornitori.map(f => ({ value: f.id, label: f.nome }))]}
                  onChange={e => setIdFornitore(e.target.value)}
                />
                <DatePickerField name="ord-cons" label="Consegna richiesta" type="date" value={consegna} disabled={!modificabile} onChange={e => setConsegna(e.target.value)} />
                <InputField name="ord-email" label="Email del fornitore" value={o?.fornitore.email ?? ''} readOnly placeholder={fornitoreScelto ? 'Si legge dall’anagrafica' : '—'} />
              </MagGriglia>

              <MagSezione titolo="Articoli">
                <div className="sib-table-wrap">
                  <table className="sib-table magpag__table magord__table">
                    <colgroup>
                      <col className={bozza ? 'magord__c-art' : 'magord__c-art2'} /><col className="magord__c-q" /><col className="magord__c-pr" />
                      <col className="magord__c-imp" />{!bozza && <col className="magord__c-ric" />}{modificabile && <col className="magord__c-act" />}
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Articolo</th><th>Quantità</th><th><TruncatedText text="Prezzo atteso" /></th><th className="magpag__num">Importo</th>
                        {!bozza && <th className="magpag__num">Arrivato</th>}
                        {modificabile && <th aria-label="Azioni" />}
                      </tr>
                    </thead>
                    <tbody>
                      {(bozza ? righe : []).map(r => {
                        const a = r.id_articolo != null ? perId.get(r.id_articolo) : undefined
                        const conf = a?.fornitori.find(f => f.id_fornitore === Number(idFornitore))?.confezione
                        const q = numero(r.quantita), p = numero(r.prezzo)
                        return (
                          <tr key={r.k}>
                            <td>
                              {modificabile
                                ? <SelectField name={`ord-a-${r.k}`} ariaLabel="Articolo" value={r.id_articolo ?? ''} options={opzioniArt} onChange={e => scegliArticolo(r.k, e.target.value ? Number(e.target.value) : null)} />
                                : <TruncatedText text={a?.nome ?? '—'} />}
                            </td>
                            <td>
                              <span className="magord__q">
                                <InputField name={`ord-q-${r.k}`} ariaLabel="Quantità" dense readOnly={!modificabile} value={r.quantita} onChange={e => set(r.k, { quantita: e.target.value })} />
                                <span className="magord__u">{a?.unita ?? ''}</span>
                              </span>
                              {conf ? <span className="magord__conf">conf. {fmtQ(conf, a!.unita)}</span> : null}
                            </td>
                            <td>
                              <span className="magord__q">
                                <InputField name={`ord-p-${r.k}`} ariaLabel="Prezzo atteso" dense readOnly={!modificabile} value={r.prezzo} placeholder="€" onChange={e => set(r.k, { prezzo: e.target.value })} />
                                <span className="magord__u">{a ? `€/${a.unita}` : ''}</span>
                              </span>
                            </td>
                            <td className="magpag__num">{q != null && p != null ? euro(q * p) : '—'}</td>
                            {modificabile && (
                              <td className="magord__acts">
                                <Tooltip text="Togli la riga">
                                  <button type="button" className="magpag__act" aria-label="Togli la riga" onClick={() => setRighe(rs => (rs.length > 1 ? rs.filter(x => x.k !== r.k) : [{ k: prossima++, id_articolo: null, quantita: '', prezzo: '' }]))}>
                                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                                  </button>
                                </Tooltip>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                      {!bozza && o?.righe.map(r => (
                        <tr key={r.id_articolo}>
                          <td><TruncatedText text={r.nome} full={r.codice_fornitore ? `${r.nome} · cod. ${r.codice_fornitore}` : r.nome} /></td>
                          <td>{fmtQ(r.quantita, r.unita)}</td>
                          <td>{r.prezzo_atteso == null ? '—' : `${euroU(r.prezzo_atteso)}/${r.unita}`}</td>
                          <td className="magpag__num">{r.prezzo_atteso == null ? '—' : euro(r.quantita * r.prezzo_atteso)}</td>
                          <td className={`magpag__num ${r.ricevuta >= r.quantita ? 'magord__ok' : r.ricevuta > 0 ? 'magord__parz' : ''}`}>
                            {fmtQ(r.ricevuta, r.unita)} / {fmtQ(r.quantita, r.unita)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {modificabile && (
                    <button type="button" className="magord__aggiungi" onClick={() => setRighe(rs => [...rs, { k: prossima++, id_articolo: null, quantita: '', prezzo: '' }])}>
                      <i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi articolo
                    </button>
                  )}
                </div>
                {o && <p className="magpag__somma">Totale indicativo <strong>{euro(o.totale_atteso)}</strong> <span className="magpag__nota">· prezzi dell’ultimo acquisto: fanno fede quelli della bolla</span></p>}
              </MagSezione>

              <TextareaField name="ord-note" label="Note per il fornitore" rows={2} value={note} disabled={!modificabile} onChange={e => setNote(e.target.value)} />

              <MagErrore testo={salva.errore} />
              <footer className="magord__piede">
                {o && ctx.gestore && (o.stato === 'bozza' || (o.stato === 'inviato' && o.righe.every(r => r.ricevuta === 0))) && (
                  <button type="button" className="sib-btn sib-btn--danger-outline" onClick={() => setChiusura('annulla')}>
                    <i className="fa-solid fa-ban" aria-hidden="true" /> Annulla ordine
                  </button>
                )}
                {o && ctx.gestore && (o.stato === 'inviato' || o.stato === 'parziale') && (
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setChiusura('chiudi')}>
                    <i className="fa-solid fa-flag-checkered" aria-hidden="true" /> Chiudi
                  </button>
                )}
                <span className="magord__spazio" />
                {o && (
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={scaricaPdf}>
                    <i className="fa-regular fa-file-pdf" aria-hidden="true" /> Scarica PDF
                  </button>
                )}
                {modificabile && (
                  <button type="button" className={`sib-btn sib-btn--secondary ${salva.inCorso ? 'sib-btn--loading' : ''}`} disabled={!idFornitore || salva.inCorso} onClick={salvaBozza}>
                    <i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {salva.daRiprovare ? 'Riprova' : 'Salva bozza'}
                  </button>
                )}
                {o && ctx.gestore && (o.stato === 'bozza' || o.stato === 'inviato') && (
                  <button
                    type="button" className="sib-btn sib-btn--primary"
                    onClick={async () => { if (o.stato === 'bozza' && (await salvaBozza()) == null) return; setInvio(true) }}
                  >
                    <i className="fa-solid fa-paper-plane" aria-hidden="true" /> {o.stato === 'inviato' ? 'Reinvia per email' : 'Invia per email…'}
                  </button>
                )}
                {o && (o.stato === 'inviato' || o.stato === 'parziale') && (
                  <button type="button" className="sib-btn sib-btn--primary" onClick={registraArrivo}>
                    <i className="fa-solid fa-truck-ramp-box" aria-hidden="true" /> Registra l’arrivo
                  </button>
                )}
              </footer>
              {o?.consegna_richiesta && !bozza && <p className="magpag__nota">Consegna richiesta per il {fmtData(o.consegna_richiesta)}.</p>}
            </>
          )}
        </MagCorpo>
      </Modal>

      {o && (
        <InvioOrdine
          open={invio} ordine={o} struttura={struttura}
          onClose={() => setInvio(false)}
          onInviato={() => { setInvio(false); onCambiato(); carica(o.id) }}
        />
      )}
      {o && (
        <ChiusuraOrdine
          tipo={chiusura} ordine={o}
          onClose={() => setChiusura(null)}
          onFatto={() => { setChiusura(null); onCambiato(); carica(o.id) }}
        />
      )}
    </>
  )
}

/** Annulla (non partito o non ancora arrivato nulla) o chiudi (la merce mancante non arriverà): serve il motivo. */
function ChiusuraOrdine({ tipo, ordine, onClose, onFatto }: { tipo: 'chiudi' | 'annulla' | null; ordine: Ordine; onClose: () => void; onFatto: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  useEffect(() => { if (tipo) { setMotivo(''); setErrore(null) } }, [tipo])

  const conferma = async () => {
    if (!tipo) return
    setInCorso(true); setErrore(null)
    try {
      const e = await eseguiMag(tipo === 'chiudi' ? 'chiudi_ordine' : 'annulla_ordine', { id: ordine.id, motivo: motivo.trim() })
      if (!e.success) { setErrore(e.error_message || 'Operazione non riuscita.'); return }
      toast.success(tipo === 'chiudi' ? `Ordine ${ordine.numero} chiuso.` : `Ordine ${ordine.numero} annullato.`)
      onFatto()
    } catch (err) { setErrore(messaggioErrore(err)) } finally { setInCorso(false) }
  }

  return (
    <Modal open={!!tipo} onClose={onClose} size="sm" title={tipo === 'chiudi' ? `Chiudi l’ordine ${ordine.numero}` : `Annulla l’ordine ${ordine.numero}`}>
      <MagCorpo>
        <p className="magpag__nota">
          {tipo === 'chiudi'
            ? 'La merce non ancora arrivata non si aspetta più: smette di contare come "in arrivo" e il Riordino potrà riproporla.'
            : 'L’ordine non vale più. Se era già stato inviato, avvisa il fornitore.'}
        </p>
        <TextareaField name="ord-motivo" label="Motivo" rows={2} value={motivo} onChange={e => setMotivo(e.target.value)} />
        <MagErrore testo={errore} />
        <footer className="magord__piede">
          <span className="magord__spazio" />
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose} disabled={inCorso}>Indietro</button>
          <button type="button" className={`sib-btn ${tipo === 'annulla' ? 'sib-btn--danger' : 'sib-btn--primary'} ${inCorso ? 'sib-btn--loading' : ''}`} disabled={!motivo.trim() || inCorso} onClick={conferma}>
            {tipo === 'chiudi' ? 'Chiudi l’ordine' : 'Annulla l’ordine'}
          </button>
        </footer>
      </MagCorpo>
    </Modal>
  )
}
