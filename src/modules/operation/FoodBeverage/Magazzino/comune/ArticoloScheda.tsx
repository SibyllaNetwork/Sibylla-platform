// ─── Magazzino ristorazione: scheda articolo ─────────────────────────────────
//  `articolo` (§ 8.5): dati, codici a barre, fornitori con l'ultimo prezzo,
//  giacenze per punto, ultimi movimenti e ricette che lo usano. Il gestore
//  modifica, disattiva o elimina (con conferma).

import React, { useCallback, useEffect, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { ArticoloDettaglio } from '../api/tipi'
import ArticoloForm from './ArticoloForm'
import { euroU, fmtDataOra, fmtQ, nomeTipo } from './formato'
import type { MagCtx } from './MagShell'
import { MagCorpo, MagErrore, MagSezione } from './MagModale'
import './ArticoloScheda.sass'

interface Props {
  idArticolo: number | null
  ctx: MagCtx
  onClose: () => void
  /** Dopo una modifica, disattivazione o eliminazione: la pagina rilegge l'elenco. */
  onCambiato: () => void
}

export default function ArticoloScheda({ idArticolo, ctx, onClose, onCambiato }: Props) {
  const [a, setA] = useState<ArticoloDettaglio | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [modifica, setModifica] = useState(false)
  const [lavoro, setLavoro] = useState(false)
  const confirm = useConfirmStore(s => s.confirm)

  const leggi = useCallback(async (id: number) => {
    setErrore(null)
    try { setA(await eseguiMag('articolo', { id, id_struttura: ctx.idStruttura })) } catch (e) { setErrore(messaggioErrore(e)) }
  }, [ctx.idStruttura])

  useEffect(() => {
    setA(null)
    if (idArticolo != null) leggi(idArticolo)
  }, [idArticolo, leggi])

  const nomePunto = (id: number) => ctx.punti.find(p => p.id === id)?.nome ?? `Punto ${id}`

  const cambiaAttivo = async () => {
    if (!a) return
    setLavoro(true)
    try {
      const e = await eseguiMag('salva_articolo', {
        id: a.id, nome: a.nome, id_categoria: a.id_categoria, unita: a.unita, codici_a_barre: a.codici_a_barre,
        fornitori: a.fornitori.map(f => ({ id_fornitore: f.id_fornitore, codice_fornitore: f.codice_fornitore })),
        scorta_minima: a.scorta_minima, id_punto_predefinito: a.id_punto_predefinito, attivo: !a.attivo, note: a.note,
      })
      if (!e.success) { toast.error(e.error_message || 'Operazione non riuscita.'); return }
      toast.success(a.attivo ? `«${a.nome}» disattivato.` : `«${a.nome}» di nuovo attivo.`)
      onCambiato()
      await leggi(a.id)
    } catch (err) { toast.error(messaggioErrore(err)) } finally { setLavoro(false) }
  }

  const elimina = async () => {
    if (!a) return
    const ok = await confirm({ title: 'Eliminare l’articolo?', message: `«${a.nome}» sarà eliminato. Si può solo se non ha movimenti e non è in nessuna ricetta.`, confirmLabel: 'Elimina', danger: true })
    if (!ok) return
    setLavoro(true)
    try {
      const e = await eseguiMag('elimina_articolo', { id: a.id })
      if (!e.success) { toast.error(e.error_message || 'Operazione non riuscita.'); return }
      toast.success(`«${a.nome}» eliminato.`)
      onCambiato()
      onClose()
    } catch (err) { toast.error(messaggioErrore(err)) } finally { setLavoro(false) }
  }

  return (
    <>
      <Modal open={idArticolo != null && !modifica} onClose={onClose} size="xl" title={a ? `${a.nome} · ${a.codice}` : 'Articolo'}>
        <MagCorpo className="magscheda">
          <MagErrore testo={errore} />
          {!a && !errore && <p className="magscheda__attesa">Caricamento…</p>}
          {a && (
            <>
              <dl className="magscheda__dati">
                <div><dt>Categoria</dt><dd>{a.categoria ?? '—'}</dd></div>
                <div><dt>Unità</dt><dd>{a.unita}</dd></div>
                <div><dt>Scorta minima</dt><dd>{fmtQ(a.scorta_minima, a.unita)}</dd></div>
                <div><dt>Costo medio</dt><dd>{a.costo_medio == null ? '—' : `${euroU(a.costo_medio)} / ${a.unita}`}</dd></div>
                <div><dt>Punto dei carichi</dt><dd>{a.id_punto_predefinito ? nomePunto(a.id_punto_predefinito) : 'Primo magazzino'}</dd></div>
                <div>
                  <dt>Stato</dt>
                  <dd className={a.attivo ? 'magscheda__stato' : 'magscheda__stato magscheda__stato--off'}>
                    <span className="magscheda__dot" aria-hidden="true" />{a.attivo ? 'Attivo' : 'Disattivato'}
                  </dd>
                </div>
              </dl>

              <div className="magscheda__colonne">
                <MagSezione titolo="Giacenze in questa struttura">
                  <ul className="magscheda__elenco">
                    {a.giacenze.map(g => (
                      <li key={g.id_punto} className={g.quantita < 0 ? 'is-neg' : ''}>
                        <span>{nomePunto(g.id_punto)}</span><strong>{fmtQ(g.quantita, a.unita)}</strong>
                      </li>
                    ))}
                    <li className={a.sotto_scorta ? 'magscheda__tot is-sotto' : 'magscheda__tot'}>
                      <span>Totale (tutte le strutture)</span><strong>{fmtQ(a.giacenza_totale, a.unita)}</strong>
                    </li>
                  </ul>
                </MagSezione>

                <MagSezione titolo="Codici a barre">
                  {a.codici_a_barre.length === 0 ? <p className="magscheda__vuoto">Nessuno</p> : (
                    <ul className="magscheda__elenco">
                      {a.codici_a_barre.map(c => (
                        <li key={c.ean}><span>{c.ean}{c.descrizione ? ` · ${c.descrizione}` : ''}</span><strong>{fmtQ(c.quantita, a.unita)}</strong></li>
                      ))}
                    </ul>
                  )}
                </MagSezione>

                <MagSezione titolo="Fornitori">
                  {a.fornitori.length === 0 ? <p className="magscheda__vuoto">Nessuno</p> : (
                    <ul className="magscheda__elenco">
                      {a.fornitori.map(f => (
                        <li key={f.id_fornitore}>
                          <span>{f.nome}{f.codice_fornitore ? ` · ${f.codice_fornitore}` : ''}</span>
                          <strong>{f.prezzo == null ? '—' : `${euroU(f.prezzo)} / ${a.unita}`}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </MagSezione>

                <MagSezione titolo="Nelle ricette">
                  {a.usato_in_ricette.length === 0 ? <p className="magscheda__vuoto">In nessuna ricetta</p> : (
                    <ul className="magscheda__elenco">
                      {a.usato_in_ricette.map(r => <li key={r.id}><span>{r.nome}</span></li>)}
                    </ul>
                  )}
                </MagSezione>
              </div>

              <MagSezione titolo="Ultimi movimenti">
                {a.ultimi_movimenti.length === 0 ? <p className="magscheda__vuoto">Nessun movimento in questa struttura.</p> : (
                  <div className="sib-table-wrap">
                    <table className="sib-table magscheda__tab">
                      <colgroup>
                        <col className="magscheda__c-data" /><col className="magscheda__c-tipo" />
                        <col className="magscheda__c-desc" /><col className="magscheda__c-aut" />
                      </colgroup>
                      <thead><tr><th>Data</th><th>Tipo</th><th>Dettaglio</th><th>Autore</th></tr></thead>
                      <tbody>
                        {a.ultimi_movimenti.map(m => (
                          <tr key={m.id}>
                            <td>{fmtDataOra(m.data)}</td>
                            <td>{nomeTipo(m.tipo)}</td>
                            <td><TruncatedText text={m.comanda ? `Tavolo ${m.comanda.tavolo} · ${m.comanda.voce} ×${m.comanda.porzioni}` : m.anteprima} /></td>
                            <td><TruncatedText text={m.autore} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </MagSezione>

              {a.note && <p className="magscheda__note">{a.note}</p>}

              <footer className="magscheda__piede">
                {ctx.gestore && (
                  <>
                    <button type="button" className="sib-btn sib-btn--danger-outline" disabled={lavoro} onClick={elimina}>
                      <i className="fa-solid fa-trash" aria-hidden="true" /> Elimina
                    </button>
                    <button type="button" className="sib-btn sib-btn--secondary" disabled={lavoro} onClick={cambiaAttivo}>
                      <i className={`fa-solid ${a.attivo ? 'fa-eye-slash' : 'fa-eye'}`} aria-hidden="true" /> {a.attivo ? 'Disattiva' : 'Riattiva'}
                    </button>
                  </>
                )}
                <span className="magscheda__spazio" />
                <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
                {ctx.gestore && (
                  <button type="button" className="sib-btn sib-btn--primary" onClick={() => setModifica(true)}>
                    <i className="fa-solid fa-pen" aria-hidden="true" /> Modifica
                  </button>
                )}
              </footer>
            </>
          )}
        </MagCorpo>
      </Modal>

      {a && (
        <ArticoloForm
          open={modifica} ctx={ctx} articolo={a}
          onClose={() => setModifica(false)}
          onSalvato={() => { setModifica(false); toast.success('Articolo salvato.'); onCambiato(); leggi(a.id) }}
        />
      )}
    </>
  )
}
