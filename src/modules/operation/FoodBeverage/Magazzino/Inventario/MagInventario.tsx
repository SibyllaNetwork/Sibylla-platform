// ─── Magazzino ristorazione › Inventario ────────────────────────────────────
//  § B3 e § 8.11 della scheda 17. Il gestore apre la conta di un punto;
//  chiunque conta (anche in più volte, da qui o dall'app Op) a mano o con il
//  lettore: le quantità si salvano da sole a gruppi e le differenze arrivano
//  da Op dopo ogni salvataggio. Il gestore chiude (le differenze diventano
//  una rettifica) scegliendo cosa fare dei non contati, oppure annulla.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Modal from '../../../../../core/components/Modal'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { InputField, RadioGroup, SelectField } from '../../../../../core/components/form'
import { useConfirmStore } from '../../../../../store/useConfirmStore'
import { useColFilters } from '../../../../../core/components/ColFilters'
import { eseguiMag, messaggioErrore } from '../api/magazzinoFbOp'
import type { InventarioDettaglio, InventarioRiga } from '../api/tipi'
import CampoCodice from '../comune/CampoCodice'
import { euro, fmtDataOra, fmtQ, fmtQs, numero } from '../comune/formato'
import { MagCorpo, MagErrore, MagPiede } from '../comune/MagModale'
import MagShell, { type MagCtx } from '../comune/MagShell'
import { useInvio } from '../comune/useInvio'
import './MagInventario.sass'

export default function MagInventario({ navigate: _navigate }: { navigate: (p: string) => void }) {
  const [nuovo, setNuovo] = useState(false)
  const [aperto, setAperto] = useState<number | null>(null)
  return (
    <MagShell
      page="fb-mag-inventario" title="Inventario" className="maginv"
      actions={ctx => ctx.gestore && aperto == null && (
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => setNuovo(true)}>
          <i className="fa-solid fa-plus" aria-hidden="true" /> Nuovo inventario
        </button>
      )}
    >
      {ctx => (
        <>
          {aperto == null
            ? <Elenco ctx={ctx} onApri={setAperto} />
            : <Conta ctx={ctx} id={aperto} onEsci={() => setAperto(null)} />}
          <NuovoInventario open={nuovo} ctx={ctx} onClose={() => setNuovo(false)} onAperto={id => { setNuovo(false); setAperto(id) }} />
        </>
      )}
    </MagShell>
  )
}

const STATI: Record<InventarioRiga['stato'], string> = { aperto: 'Aperto', chiuso: 'Chiuso', annullato: 'Annullato' }
const STATI_CONTA = ['Contato', 'Non contato', 'Con differenza']

function Elenco({ ctx, onApri }: { ctx: MagCtx; onApri: (id: number) => void }) {
  const cf = useColFilters()
  const [righe, setRighe] = useState<InventarioRiga[] | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    let annullato = false
    eseguiMag('inventari', { id_struttura: ctx.idStruttura })
      .then(r => { if (!annullato) { setRighe(r); setErrore(null) } })
      .catch(e => { if (!annullato) setErrore(messaggioErrore(e)) })
    return () => { annullato = true }
  }, [ctx.idStruttura])

  const tutte = useMemo(() => (righe ?? []).map(i => ({ ...i, puntoNome: i.punto.nome, statoNome: STATI[i.stato], chiuso: i.chiuso_il ?? '' })), [righe])
  const punti = useMemo(() => Array.from(new Set(tutte.map(i => i.puntoNome))).sort(), [tutte])
  const visibili = useMemo(() => cf.sortRows(tutte.filter(i =>
    cf.matchMulti(i.puntoNome, 'puntoNome') && cf.matchMulti(i.statoNome, 'statoNome') && cf.matchText(i.aperto_da, 'aperto_da'),
  )),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tutte, cf.text, cf.multi, cf.sort])

  return (
    <>
      {errore && <p className="magpag__errore"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {errore}</p>}
      <div className="magpag__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table">
            <colgroup>
              <col className="maginv__c-punto" /><col className="maginv__c-stato" /><col className="maginv__c-data" /><col className="maginv__c-chi" />
              <col className="maginv__c-n" /><col className="maginv__c-n" /><col className="maginv__c-val" /><col className="maginv__c-data" />
            </colgroup>
            <thead>
              <tr>
                <th><span className="sib-colf-head">Punto{cf.th('puntoNome', 'punto', { options: punti, sort: true })}</span></th>
                <th><span className="sib-colf-head">Stato{cf.th('statoNome', 'stato', { options: Object.values(STATI) })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Aperto il" />{cf.th('aperto_il', 'aperto il', { sort: true })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Aperto da" />{cf.th('aperto_da', 'aperto da', { search: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head">Contati{cf.th('contati', 'contati', { sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head"><TruncatedText text="Differenze" />{cf.th('differenze', 'differenze', { sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head"><TruncatedText text="Valore diff." full="Valore delle differenze" />{cf.th('valore_differenze', 'valore delle differenze', { sort: true })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Chiuso il" />{cf.th('chiuso', 'chiuso il', { sort: true })}</span></th>
              </tr>
            </thead>
            <tbody>
              {visibili.map(i => (
                <tr key={i.id} className="maginv__riga" onClick={() => onApri(i.id)}>
                  <td><TruncatedText text={i.puntoNome} /></td>
                  <td><span className={`maginv__stato maginv__stato--${i.stato}`}><span className="maginv__dot" aria-hidden="true" />{i.statoNome}</span></td>
                  <td>{fmtDataOra(i.aperto_il)}</td>
                  <td><TruncatedText text={i.aperto_da} /></td>
                  <td className="magpag__num">{i.contati} / {i.articoli}</td>
                  <td className="magpag__num">{i.differenze}</td>
                  <td className={`magpag__num ${i.valore_differenze < 0 ? 'maginv__neg' : ''}`}>{euro(i.valore_differenze)}</td>
                  <td><TruncatedText text={i.chiuso_il ? `${fmtDataOra(i.chiuso_il)}${i.chiuso_da ? ` · ${i.chiuso_da}` : ''}` : '—'} /></td>
                </tr>
              ))}
              {righe && visibili.length === 0 && (
                <tr><td colSpan={8} className="magpag__vuoto">{tutte.length ? 'Nessun inventario con questi filtri.' : ctx.gestore ? 'Nessun inventario: aprine uno con “Nuovo inventario”.' : 'Nessun inventario: lo apre il responsabile F&B.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {cf.hasActive && <p className="magpag__somma"><button type="button" className="magpag__azzera" onClick={cf.reset}>Azzera i filtri di colonna</button></p>}
    </>
  )
}

function NuovoInventario({ open, ctx, onClose, onAperto }: { open: boolean; ctx: MagCtx; onClose: () => void; onAperto: (id: number) => void }) {
  const [idPunto, setIdPunto] = useState('')
  const invio = useInvio()
  const { azzera } = invio
  useEffect(() => { if (open) { setIdPunto(String(ctx.puntiAttivi[0]?.id ?? '')); azzera() } }, [open, ctx.puntiAttivi, azzera])

  const apri = async () => {
    const e = await invio.esegui(id => eseguiMag('inventario_apri', { id_operazione: id, id_struttura: ctx.idStruttura, id_punto: Number(idPunto) }))
    if (e?.id != null) { toast.success('Inventario aperto: si può contare da qui o dall’app Op.'); onAperto(e.id) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuovo inventario" size="sm">
      <MagCorpo>
        <SelectField name="inv-punto" label="Punto da contare" value={idPunto} options={ctx.puntiAttivi.map(p => ({ value: p.id, label: p.nome }))} onChange={e => setIdPunto(e.target.value)} />
        <p className="magpag__nota">Si contano gli articoli con giacenza nel punto; altri si aggiungono leggendone il codice. Durante la conta i movimenti continuano: la teorica si aggiorna.</p>
        <MagErrore testo={invio.errore} />
        <MagPiede onAnnulla={onClose} onConferma={apri} etichetta="Apri la conta" icona="fa-clipboard-check" inCorso={invio.inCorso} daRiprovare={invio.daRiprovare} disabilitato={!idPunto} />
      </MagCorpo>
    </Modal>
  )
}

// ─── Conta ────────────────────────────────────────────────────────────────────

const SALVA_DOPO_MS = 1200
const fmtIn = (n: number | null) => (n == null ? '' : String(n).replace('.', ','))

function Conta({ ctx, id, onEsci }: { ctx: MagCtx; id: number; onEsci: () => void }) {
  const confirm = useConfirmStore(s => s.confirm)
  const [inv, setInv] = useState<InventarioDettaglio | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [bozza, setBozza] = useState<Record<number, string>>({})
  const [salvo, setSalvo] = useState<'fermo' | 'attesa' | 'salvo' | 'errore'>('fermo')
  const [chiudi, setChiudi] = useState(false)
  const cf = useColFilters()
  const sporchi = useRef<Set<number>>(new Set())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bozzaRef = useRef(bozza)
  bozzaRef.current = bozza

  const leggi = useCallback(async () => {
    try {
      const x = await eseguiMag('inventario', { id })
      setInv(x)
      setErrore(null)
      // I campi non toccati seguono Op; quelli in modifica restano come li sta scrivendo l'utente.
      setBozza(b => {
        const n: Record<number, string> = {}
        x.righe.forEach(r => { n[r.id_articolo] = sporchi.current.has(r.id_articolo) ? b[r.id_articolo] ?? '' : fmtIn(r.contata) })
        return n
      })
    } catch (e) { setErrore(messaggioErrore(e)) }
  }, [id])

  useEffect(() => { leggi() }, [leggi])

  const salva = useCallback(async () => {
    const ids = Array.from(sporchi.current)
    if (!ids.length) return
    setSalvo('salvo')
    const righe = ids.map(a => ({ id_articolo: a, contata: bozzaRef.current[a]?.trim() ? numero(bozzaRef.current[a]) : null }))
    if (righe.some(r => bozzaRef.current[r.id_articolo]?.trim() && r.contata == null)) { setSalvo('errore'); setErrore('Quantità non valida: usa solo numeri (es. 3,250).'); return }
    try {
      const e = await eseguiMag('inventario_conta', { id, righe })
      if (!e.success) { setSalvo('errore'); setErrore(e.error_message || 'Conta non salvata.'); return }
      ids.forEach(a => { if (bozzaRef.current[a] === fmtIn(righe.find(r => r.id_articolo === a)!.contata)) sporchi.current.delete(a) })
      setSalvo('fermo')
      await leggi()
    } catch (err) { setSalvo('errore'); setErrore(messaggioErrore(err)) }
  }, [id, leggi])

  const programma = useCallback(() => {
    setSalvo('attesa')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(salva, SALVA_DOPO_MS)
  }, [salva])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const scrivi = (idArt: number, v: string) => {
    setBozza(b => ({ ...b, [idArt]: v }))
    sporchi.current.add(idArt)
    programma()
  }

  // Lettore: ogni lettura aggiunge alla conta quanto vale il codice (anche per articoli non in elenco).
  const leggiCodice = async (codice: string) => {
    try {
      const r = await eseguiMag('cerca_codice', { codice })
      if (!r.trovato || !r.articolo) { toast.warning(`Nessun articolo con il codice ${codice}.`); return }
      const a = r.articolo
      const att = numero(bozzaRef.current[a.id] ?? '') ?? 0
      bozzaRef.current = { ...bozzaRef.current, [a.id]: fmtIn(Math.round((att + r.quantita) * 1000) / 1000) }
      scrivi(a.id, bozzaRef.current[a.id])
      toast.info(`${a.nome}: ${fmtQ(att + r.quantita, a.unita)} contati`)
    } catch (e) { toast.error(messaggioErrore(e)) }
  }

  const annulla = async () => {
    if (!(await confirm({ title: 'Annullare l’inventario?', message: 'La conta si butta e non viene registrata nessuna rettifica.', confirmLabel: 'Annulla l’inventario', danger: true }))) return
    try {
      const e = await eseguiMag('inventario_annulla', { id })
      if (!e.success) { toast.error(e.error_message || 'Operazione non riuscita.'); return }
      toast.success('Inventario annullato.')
      onEsci()
    } catch (err) { toast.error(messaggioErrore(err)) }
  }

  const tutte = useMemo(() => (inv?.righe ?? []).map(r => ({
    ...r,
    categoriaNome: r.categoria ?? 'Senza categoria',
    contaNome: r.contata == null ? STATI_CONTA[1] : r.differenza ? STATI_CONTA[2] : STATI_CONTA[0],
    contataN: r.contata ?? -1,
    diffN: r.differenza ?? 0,
    valN: r.valore_differenza ?? 0,
  })), [inv])
  const categorie = useMemo(() => Array.from(new Set(tutte.map(r => r.categoriaNome))).sort(), [tutte])
  const visibili = useMemo(() => {
    const f = tutte.filter(r => cf.matchText(r.nome, 'nome') && cf.matchMulti(r.categoriaNome, 'categoriaNome') && cf.matchMulti(r.contaNome, 'contaNome'))
    // Senza un ordinamento scelto: per categoria e nome, come si conta sullo scaffale.
    return cf.sort ? cf.sortRows(f) : [...f].sort((x, y) => x.categoriaNome.localeCompare(y.categoriaNome) || x.nome.localeCompare(y.nome))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutte, cf.text, cf.multi, cf.sort])

  const aperto = inv?.stato === 'aperto'

  return (
    <>
      <div className="maginv__testa">
        <button type="button" className="sib-btn sib-btn--ghost" onClick={async () => { await salva(); onEsci() }}>
          <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Tutti gli inventari
        </button>
        {inv && (
          <span className="maginv__titolo">
            {inv.punto.nome} · <span className={`maginv__stato maginv__stato--${inv.stato}`}><span className="maginv__dot" aria-hidden="true" />{STATI[inv.stato]}</span>
            <span className="magpag__nota">aperto il {fmtDataOra(inv.aperto_il)} da {inv.aperto_da}</span>
          </span>
        )}
        <span className="maginv__salvo">
          {salvo === 'attesa' && <><i className="fa-solid fa-pen" aria-hidden="true" /> Modifiche da salvare…</>}
          {salvo === 'salvo' && <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Salvo…</>}
          {salvo === 'fermo' && aperto && sporchi.current.size === 0 && <><i className="fa-solid fa-check" aria-hidden="true" /> Conta salvata</>}
          {salvo === 'errore' && <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={salva}><i className="fa-solid fa-rotate-right" aria-hidden="true" /> Riprova</button>}
        </span>
      </div>

      {aperto && (
        <div className="maginv__barra">
          <CampoCodice onCodice={leggiCodice} placeholder="Leggi un codice: aggiunge alla conta quanto vale" className="maginv__codice" />
        </div>
      )}

      <MagErrore testo={errore} />

      <div className="magpag__wrap">
        <div className="sib-table-wrap">
          <table className="sib-table magpag__table maginv__table">
            <colgroup>
              <col className="maginv__c-art" /><col className="maginv__c-cat" /><col className="maginv__c-q" /><col className="maginv__c-conta" />
              <col className="maginv__c-q" /><col className="maginv__c-val" /><col className="maginv__c-da" />
            </colgroup>
            <thead>
              <tr>
                <th><span className="sib-colf-head">Articolo{cf.th('nome', 'articolo', { search: true, sort: true })}</span></th>
                <th><span className="sib-colf-head"><TruncatedText text="Categoria" />{cf.th('categoriaNome', 'categoria', { options: categorie, sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head">Teorica{cf.th('teorica', 'teorica', { sort: true })}</span></th>
                <th><span className="sib-colf-head">Contata{cf.th('contaNome', 'stato della conta', { options: STATI_CONTA })}{cf.th('contataN', 'contata', { sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head"><TruncatedText text="Differenza" />{cf.th('diffN', 'differenza', { sort: true })}</span></th>
                <th className="magpag__num"><span className="sib-colf-head">Valore{cf.th('valN', 'valore', { sort: true })}</span></th>
                <th><TruncatedText text="Contata da" /></th>
              </tr>
            </thead>
            <tbody>
              {visibili.map(r => (
                <tr key={r.id_articolo}>
                  <td><TruncatedText text={r.nome} /></td>
                  <td><TruncatedText text={r.categoriaNome} /></td>
                  <td className="magpag__num">{fmtQ(r.teorica, r.unita)}</td>
                  <td>
                    {aperto ? (
                      <span className="maginv__q">
                        <InputField name={`inv-${r.id_articolo}`} ariaLabel={`Contata ${r.nome}`} dense placeholder="—" value={bozza[r.id_articolo] ?? ''} onChange={e => scrivi(r.id_articolo, e.target.value)} />
                        <span className="maginv__u">{r.unita}</span>
                      </span>
                    ) : fmtQ(r.contata, r.unita)}
                  </td>
                  <td className={`magpag__num ${r.differenza && r.differenza < 0 ? 'maginv__neg' : r.differenza && r.differenza > 0 ? 'maginv__pos' : ''}`}>{r.differenza == null ? '—' : fmtQs(r.differenza, r.unita)}</td>
                  <td className="magpag__num">{r.valore_differenza == null ? '—' : euro(r.valore_differenza)}</td>
                  <td><TruncatedText text={r.contata_da ? `${r.contata_da} · ${fmtDataOra(r.contata_il)}` : '—'} /></td>
                </tr>
              ))}
              {inv && visibili.length === 0 && <tr><td colSpan={7} className="magpag__vuoto">Nessun articolo da mostrare.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {inv && (
        <footer className="maginv__piede">
          <span className="magpag__somma">
            Contati {inv.contati} su {inv.articoli} · {inv.differenze === 1 ? '1 differenza' : `${inv.differenze} differenze`} per <strong>{euro(inv.valore_differenze)}</strong>
          </span>
          {aperto && ctx.gestore && (
            <>
              <button type="button" className="sib-btn sib-btn--danger-outline" onClick={annulla}>
                <i className="fa-solid fa-ban" aria-hidden="true" /> Annulla inventario
              </button>
              <button type="button" className="sib-btn sib-btn--primary" onClick={async () => { await salva(); setChiudi(true) }}>
                <i className="fa-solid fa-flag-checkered" aria-hidden="true" /> Chiudi e registra le rettifiche
              </button>
            </>
          )}
        </footer>
      )}

      {inv && <Chiusura open={chiudi} inv={inv} onClose={() => setChiudi(false)} onChiuso={() => { setChiudi(false); onEsci() }} />}
    </>
  )
}

function Chiusura({ open, inv, onClose, onChiuso }: { open: boolean; inv: InventarioDettaglio; onClose: () => void; onChiuso: () => void }) {
  const [nonContati, setNonContati] = useState<'ignora' | 'azzera'>('ignora')
  const invio = useInvio()
  const { azzera } = invio
  useEffect(() => { if (open) { setNonContati('ignora'); azzera() } }, [open, azzera])
  const daContare = inv.articoli - inv.contati

  const conferma = async () => {
    const e = await invio.esegui(() => eseguiMag('inventario_chiudi', { id: inv.id, non_contati: nonContati }))
    if (!e) return
    if (e.id == null) toast.success('Inventario chiuso: nessuna differenza da registrare.')
    else {
      // Il valore definitivo è quello calcolato da Op alla chiusura (con i non contati azzerati, se scelto).
      const chiuso = await eseguiMag('inventario', { id: inv.id }).catch(() => null)
      toast.success(`Inventario chiuso: rettifica registrata, differenze per ${euro(chiuso?.valore_differenze ?? inv.valore_differenze)}.`)
    }
    onChiuso()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Chiudi l’inventario di ${inv.punto.nome}`} size="md">
      <MagCorpo>
        <p className="magpag__nota">
          Op registra un solo movimento di rettifica con le differenze tra contata e teorica calcolate al momento della chiusura.
          Ora: {inv.differenze === 1 ? '1 differenza' : `${inv.differenze} differenze`} per {euro(inv.valore_differenze)}.
        </p>
        {daContare > 0 && (
          <RadioGroup
            name="inv-nc" label={`${daContare === 1 ? '1 articolo non contato' : `${daContare} articoli non contati`}`} value={nonContati}
            options={[
              { value: 'ignora', label: 'Lasciali come sono (nessuna rettifica)' },
              { value: 'azzera', label: 'Considerali contati a zero' },
            ]}
            onChange={v => setNonContati(v as 'ignora' | 'azzera')}
          />
        )}
        <MagErrore testo={invio.errore} />
        <MagPiede onAnnulla={onClose} onConferma={conferma} etichetta="Chiudi l’inventario" icona="fa-flag-checkered" inCorso={invio.inCorso} daRiprovare={invio.daRiprovare} />
      </MagCorpo>
    </Modal>
  )
}
