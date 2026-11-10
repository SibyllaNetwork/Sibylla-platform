// ─── Magazzino ristorazione › Riordino ──────────────────────────────────────
//  Gli articoli con giacenza + merce in arrivo al punto di riordino o sotto.
//  Il backend propone fornitore e quantità (fino alla scorta obiettivo,
//  arrotondata alla confezione del fornitore); qui si correggono e diventano
//  bozze d'ordine, una per fornitore.
//
//  Impianto: schede per categoria merceologica, tabella compatta paginata con
//  un indicatore di livello per riga, e a lato il riepilogo "Ordini in
//  preparazione" per fornitore con la creazione delle bozze. Gli articoli già in
//  una bozza sono segnalati e non selezionati, per non ordinarli due volte.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Pagination from '../../../../../core/components/Pagination'
import Tabs from '../../../../../core/components/Tabs'
import Tooltip from '../../../../../core/components/Tooltip'
import TruncatedText from '../../../../../core/components/TruncatedText'
import { toast } from '../../../../../core/components/Toast/useToast'
import { CheckboxField, InputField, SearchField, SelectField } from '../../../../../core/components/form'
import { eseguiMag, messaggioErrore, nuovaIdOperazione, riuscito } from '../api/magazzinoFbOp'
import type { Riordino, RigaRiordino } from '../api/tipi'
import { euro, euroU, fmtDataOra, fmtQ, numero } from '../comune/formato'
import MagShell, { type MagCtx } from '../comune/MagShell'
import { useMagazzinoFb } from '../comune/useMagazzinoFb'
import './MagRiordino.sass'

const PER_PAGINA = 10
const TUTTE = '*'

export default function MagRiordino({ navigate }: { navigate: (p: string) => void }) {
  return (
    <MagShell
      page="fb-mag-riordino" title="Riordino" className="magrio"
      actions={() => (
        <button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('fb-mag-ordini')}>
          <i className="fa-solid fa-file-invoice" aria-hidden="true" /> Ordini ai fornitori
        </button>
      )}
    >
      {ctx => <Contenuto ctx={ctx} navigate={navigate} />}
    </MagShell>
  )
}

interface Scelta { sel: boolean; id_fornitore: string; quantita: string }

function Contenuto({ ctx, navigate }: { ctx: MagCtx; navigate: (p: string) => void }) {
  const setOrdineDaAprire = useMagazzinoFb(s => s.setOrdineDaAprire)
  const [dati, setDati] = useState<Riordino | null>(null)
  const [inBozza, setInBozza] = useState<Map<number, string>>(new Map())
  const [scelte, setScelte] = useState<Record<number, Scelta>>({})
  const [errore, setErrore] = useState<string | null>(null)
  const [giro, setGiro] = useState(0)
  const [creando, setCreando] = useState<string | null>(null)
  const [categoria, setCategoria] = useState(TUTTE)
  const [cerca, setCerca] = useState('')
  const [pagina, setPagina] = useState(1)
  // Chiavi anti-doppioni per fornitore: riusate se si riprova dopo un errore.
  const [chiavi] = useState(() => new Map<string, string>())

  useEffect(() => {
    let annullato = false
    ;(async () => {
      try {
        const r = await eseguiMag('riordino', { id_struttura: ctx.idStruttura })
        // Articoli già presenti in una bozza: si segnalano per non ordinarli due volte.
        const bozze = await eseguiMag('ordini', { id_struttura: ctx.idStruttura, stato: 'bozza' })
        const mappa = new Map<number, string>()
        for (const b of bozze) {
          const o = await eseguiMag('ordine', { id: b.id })
          o.righe.forEach(x => mappa.set(x.id_articolo, o.numero))
        }
        if (annullato) return
        setDati(r); setInBozza(mappa); setErrore(null)
        setScelte(Object.fromEntries(r.righe.map(x => [x.id_articolo, {
          sel: !mappa.has(x.id_articolo) && x.id_fornitore_proposto != null,
          id_fornitore: x.id_fornitore_proposto != null ? String(x.id_fornitore_proposto) : '',
          quantita: String(x.quantita_proposta).replace('.', ','),
        }])))
      } catch (e) { if (!annullato) setErrore(messaggioErrore(e)) }
    })()
    return () => { annullato = true }
  }, [ctx.idStruttura, giro])

  const ricarica = useCallback(() => setGiro(g => g + 1), [])
  const set = (id: number, p: Partial<Scelta>) => setScelte(s => ({ ...s, [id]: { ...s[id], ...p } }))
  const nomeForn = (id: string) => ctx.contesto.fornitori.find(f => String(f.id) === id)?.nome ?? 'Senza fornitore'
  const prezzoDi = (r: RigaRiordino, idForn: string) => r.fornitori.find(f => String(f.id_fornitore) === idForn)?.prezzo ?? null
  const confDi = (r: RigaRiordino, idForn: string) => r.fornitori.find(f => String(f.id_fornitore) === idForn)?.confezione ?? null
  const valida = (r: RigaRiordino) => !!scelte[r.id_articolo]?.sel && (numero(scelte[r.id_articolo].quantita) ?? 0) > 0

  const righe = useMemo(() => dati?.righe ?? [], [dati])
  const cat = (r: RigaRiordino) => r.categoria ?? 'Senza categoria'

  // Schede: una per categoria merceologica, con quanti articoli ci sono da riordinare.
  const tabs = useMemo(() => {
    const conta = new Map<string, number>()
    righe.forEach(r => conta.set(cat(r), (conta.get(cat(r)) ?? 0) + 1))
    return [
      { id: TUTTE, label: `Tutte · ${righe.length}` },
      ...Array.from(conta.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([c, n]) => ({ id: c, label: `${c} · ${n}` })),
    ]
  }, [righe])

  const filtrate = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    return righe.filter(r => (categoria === TUTTE || cat(r) === categoria) && (!q || r.nome.toLowerCase().includes(q)))
  }, [righe, categoria, cerca])
  useEffect(() => { setPagina(1) }, [categoria, cerca])
  const pagine = Math.max(1, Math.ceil(filtrate.length / PER_PAGINA))
  const visibili = filtrate.slice((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA)

  // Ordini in preparazione: le righe selezionate di tutte le categorie, per fornitore (riepilogo locale).
  const perFornitore = useMemo(() => {
    const m = new Map<string, RigaRiordino[]>()
    righe.filter(valida).forEach(r => { const f = scelte[r.id_articolo].id_fornitore; m.set(f, [...(m.get(f) ?? []), r]) })
    return Array.from(m.entries())
      .map(([f, rs]) => ({ f, rs, tot: rs.reduce((t, r) => t + (numero(scelte[r.id_articolo].quantita) ?? 0) * (prezzoDi(r, f) ?? 0), 0) }))
      .sort((a, b) => (a.f === '' ? 1 : b.f === '' ? -1 : nomeForn(a.f).localeCompare(nomeForn(b.f))))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [righe, scelte])
  const pronti = perFornitore.filter(g => g.f)
  const senzaFornitore = perFornitore.find(g => g.f === '')

  const tuttiSelezionati = filtrate.length > 0 && filtrate.every(r => scelte[r.id_articolo]?.sel)
  const selezionaVisibili = (sel: boolean) => setScelte(s => {
    const n = { ...s }
    filtrate.forEach(r => { n[r.id_articolo] = { ...n[r.id_articolo], sel } })
    return n
  })

  /** Crea la bozza per un fornitore; restituisce l'id dell'ordine o null. */
  const creaBozza = async (idForn: string, rs: RigaRiordino[]): Promise<number | null> => {
    if (!idForn || rs.length === 0) return null
    if (!chiavi.has(idForn)) chiavi.set(idForn, nuovaIdOperazione())
    const e = await eseguiMag('salva_ordine', {
      id: null, id_operazione: chiavi.get(idForn)!, id_struttura: ctx.idStruttura, id_fornitore: Number(idForn),
      consegna_richiesta: null, note: null,
      righe: rs.map(r => ({ id_articolo: r.id_articolo, quantita: numero(scelte[r.id_articolo].quantita)!, prezzo_atteso: prezzoDi(r, idForn) })),
    })
    if (!riuscito(e) || e.id == null) throw new Error(`${nomeForn(idForn)}: ${e.error_message || 'bozza non creata.'}`)
    chiavi.delete(idForn)
    return e.id
  }

  const creaUna = async (idForn: string, rs: RigaRiordino[]) => {
    setCreando(idForn)
    try {
      const id = await creaBozza(idForn, rs)
      if (id != null) {
        toast.success(`Bozza d'ordine per ${nomeForn(idForn)} creata: completala e inviala.`)
        setOrdineDaAprire(id)
        navigate('fb-mag-ordini')
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : messaggioErrore(err)) } finally { setCreando(null) }
  }

  const creaTutte = async () => {
    setCreando(TUTTE)
    let n = 0
    try {
      for (const g of pronti) if ((await creaBozza(g.f, g.rs)) != null) n++
      toast.success(n === 1 ? '1 bozza d’ordine creata.' : `${n} bozze d’ordine create.`)
      if (n) navigate('fb-mag-ordini')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : messaggioErrore(err))
      if (n) ricarica()
    } finally { setCreando(null) }
  }

  if (errore) return <p className="magpag__errore"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {errore}</p>
  if (!dati) return null
  if (righe.length === 0) {
    return (
      <div className="magrio__tutto-ok">
        <i className="fa-solid fa-circle-check" aria-hidden="true" />
        <strong>Niente da riordinare</strong>
        <span className="magpag__nota">Tutti gli articoli sono sopra il punto di riordino, contando la merce già ordinata.</span>
      </div>
    )
  }

  return (
    <div className="magrio__layout">
      <div className="magrio__principale">
        <Tabs tabs={tabs} active={categoria} onChange={setCategoria} className="magrio__tabs" />

        <div className="magrio__barra">
          <SearchField name="rio-cerca" placeholder="Cerca un articolo" value={cerca} onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} className="magrio__cerca" />
          {ctx.gestore && (
            <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={() => selezionaVisibili(!tuttiSelezionati)}>
              <i className={`fa-solid ${tuttiSelezionati ? 'fa-square-minus' : 'fa-square-check'}`} aria-hidden="true" /> {tuttiSelezionati ? 'Deseleziona tutti' : 'Seleziona tutti'}
            </button>
          )}
          <span className="magpag__nota magrio__agg">Aggiornato alle {fmtDataOra(dati.aggiornato_il)}</span>
        </div>

        <div className="sib-table-wrap">
          <table className="sib-table magpag__table magrio__table">
            <colgroup>
              <col className="magrio__c-sel" /><col className="magrio__c-art" /><col className="magrio__c-liv" />
              <col className="magrio__c-forn" /><col className="magrio__c-q" /><col className="magrio__c-pr" />
            </colgroup>
            <thead>
              <tr>
                <th aria-label="Seleziona" />
                <th>Articolo</th>
                <th>Livello</th>
                <th>Fornitore</th>
                <th>Da ordinare</th>
                <th className="magpag__num"><TruncatedText text="Ultimo prezzo" /></th>
              </tr>
            </thead>
            <tbody>
              {visibili.map(r => {
                const s = scelte[r.id_articolo]
                if (!s) return null
                const bozza = inBozza.get(r.id_articolo)
                const conf = confDi(r, s.id_fornitore)
                const prezzo = prezzoDi(r, s.id_fornitore)
                const esaurito = r.giacenza <= 0
                const disponibile = r.giacenza + r.in_arrivo
                return (
                  <tr key={r.id_articolo} className={!s.sel ? 'magrio__escl' : ''}>
                    <td>
                      <CheckboxField name={`rio-s-${r.id_articolo}`} ariaLabel={`Ordina ${r.nome}`} checked={s.sel} disabled={!ctx.gestore} onChange={e => set(r.id_articolo, { sel: e.target.checked })} />
                    </td>
                    <td>
                      <span className="magrio__art">
                        <span className="magrio__nome"><TruncatedText text={r.nome} /></span>
                        <span className={`magrio__stato ${esaurito ? 'magrio__stato--esaurito' : ''}`}>
                          <i className={`fa-solid ${esaurito ? 'fa-circle-exclamation' : 'fa-arrow-trend-down'}`} aria-hidden="true" />
                          {esaurito ? 'Esaurito' : 'Da riordinare'}
                          {bozza && (
                            <Tooltip text={`Già nella bozza ${bozza}: selezionalo solo se vuoi ordinarne ancora`}>
                              <span className="magrio__bozza"><i className="fa-solid fa-file-pen" aria-hidden="true" /> {bozza}</span>
                            </Tooltip>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="magrio__td-liv">
                      <Tooltip
                        text={`Giacenza ${fmtQ(r.giacenza, r.unita)}${r.in_arrivo ? ` + in arrivo ${fmtQ(r.in_arrivo, r.unita)}` : ''} · riordino a ${fmtQ(r.punto_riordino, r.unita)} · obiettivo ${fmtQ(r.scorta_obiettivo, r.unita)}`}
                      >
                        <span className="magrio__livello">
                          <meter
                            className="magrio__meter" min={0} max={r.scorta_obiettivo} low={r.punto_riordino + 0.001} high={r.scorta_obiettivo}
                            optimum={r.scorta_obiettivo} value={Math.max(0, disponibile)} aria-label={`Livello di ${r.nome}`}
                          />
                          <span className="magrio__liv-testo">
                            <strong>{fmtQ(r.giacenza, r.unita)}</strong>
                            <span className="magpag__nota"> / {fmtQ(r.scorta_obiettivo, r.unita)}{r.in_arrivo ? ` · +${fmtQ(r.in_arrivo, r.unita)} in arrivo` : ''}</span>
                          </span>
                        </span>
                      </Tooltip>
                    </td>
                    <td>
                      <SelectField
                        name={`rio-f-${r.id_articolo}`} ariaLabel="Fornitore" value={s.id_fornitore} disabled={!ctx.gestore}
                        options={[{ value: '', label: 'Scegli' }, ...(r.fornitori.length ? r.fornitori.map(f => ({ value: f.id_fornitore, label: f.nome })) : ctx.contesto.fornitori.map(f => ({ value: f.id, label: f.nome })))]}
                        onChange={e => set(r.id_articolo, { id_fornitore: e.target.value })}
                      />
                    </td>
                    <td>
                      <span className="magrio__q">
                        <InputField name={`rio-q-${r.id_articolo}`} ariaLabel="Quantità da ordinare" dense readOnly={!ctx.gestore} value={s.quantita} onChange={e => set(r.id_articolo, { quantita: e.target.value })} />
                        {conf
                          ? <Tooltip text={`Si ordina a confezioni da ${fmtQ(conf, r.unita)}`}><span className="magrio__u magrio__u--conf">{r.unita} ×{conf.toLocaleString('it-IT', { maximumFractionDigits: 3 })}</span></Tooltip>
                          : <span className="magrio__u">{r.unita}</span>}
                      </span>
                    </td>
                    <td className="magpag__num">{prezzo == null ? '—' : `${euroU(prezzo)}/${r.unita}`}</td>
                  </tr>
                )
              })}
              {visibili.length === 0 && <tr><td colSpan={6} className="magpag__vuoto">Nessun articolo in questa scheda.</td></tr>}
            </tbody>
          </table>
        </div>
        {pagine > 1 && <div className="magpag__pag"><Pagination page={pagina} totalPages={pagine} onPageChange={setPagina} /></div>}
      </div>

      <aside className="magrio__carrello" aria-label="Ordini in preparazione">
        <h3 className="magrio__car-tit"><i className="fa-solid fa-cart-shopping" aria-hidden="true" /> Ordini in preparazione</h3>
        {pronti.length === 0 && !senzaFornitore && <p className="magpag__nota">Seleziona gli articoli da ordinare.</p>}
        <ul className="magrio__car-lista">
          {pronti.map(g => (
            <li key={g.f} className="magrio__car-voce">
              <span className="magrio__car-forn"><TruncatedText text={nomeForn(g.f)} /></span>
              <span className="magrio__car-det">{g.rs.length === 1 ? '1 articolo' : `${g.rs.length} articoli`} · <strong>{euro(g.tot)}</strong></span>
              {ctx.gestore && (
                <button type="button" className={`magrio__car-btn ${creando === g.f ? 'is-in-corso' : ''}`} disabled={!!creando} onClick={() => creaUna(g.f, g.rs)}>
                  <i className={`fa-solid ${creando === g.f ? 'fa-circle-notch fa-spin' : 'fa-file-circle-plus'}`} aria-hidden="true" /> Crea la bozza
                </button>
              )}
            </li>
          ))}
        </ul>
        {senzaFornitore && (
          <p className="magrio__car-avviso">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {senzaFornitore.rs.length === 1 ? '1 articolo' : `${senzaFornitore.rs.length} articoli`} senza fornitore: sceglilo per ordinarlo.
          </p>
        )}
        {pronti.length > 0 && (
          <div className="magrio__car-tot">
            <span>Totale indicativo</span>
            <strong>{euro(pronti.reduce((t, g) => t + g.tot, 0))}</strong>
          </div>
        )}
        {ctx.gestore ? (
          <button type="button" className={`sib-btn sib-btn--primary magrio__car-tutte ${creando === TUTTE ? 'sib-btn--loading' : ''}`} disabled={!!creando || pronti.length === 0} onClick={creaTutte}>
            <i className="fa-solid fa-file-circle-plus" aria-hidden="true" /> {pronti.length > 1 ? `Crea ${pronti.length} bozze` : 'Crea la bozza'}
          </button>
        ) : <p className="magpag__nota">Gli ordini li crea il responsabile F&amp;B.</p>}
        <p className="magpag__nota">Quantità fino alla scorta obiettivo, arrotondate alla confezione del fornitore. Prezzi dell’ultimo acquisto.</p>
      </aside>
    </div>
  )
}
