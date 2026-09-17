// ─── Food cost e margini (Food & Beverage) ────────────────────────────────────
//  Quanto costa davvero un piatto e quanto lascia. Il numero esce dalla scheda
//  tecnica — ingrediente per ingrediente, alla quantità della porzione — e si
//  rilegge in due modi:
//    • la tabella, per lavorare voce per voce e correggere prezzo o ricetta
//    • il menu engineering, che incrocia quanto vende un piatto con quanto
//      rende: stelle, cavalli, rompicapi e pesi morti, i quattro casi su cui si
//      decide se tenere, ripensare o spingere una voce
//
//  In fondo c'è l'anello che un registratore di cassa non può chiudere: se un
//  ingrediente ha un gruppo d'acquisto aperto in Agorà, qui si vede quanto
//  margine torna indietro aderendo, piatto per piatto.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../../core/components/PageHead'
import FilterToolbar from '../../../../core/components/FilterToolbar'
import Tooltip from '../../../../core/components/Tooltip'
import TruncatedText from '../../../../core/components/TruncatedText'
import Modal from '../../../../core/components/Modal'
import { SelectField, SearchField, NumCell } from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import { useFbStore, SALE } from '../../../../store/useFbStore'
import {
  SOGLIA_FOOD_COST, type Ingrediente, type RigaRicetta, type VoceMenu,
} from '../fb.model'
import './FbFoodCost.sass'

const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
const pct  = (n: number) => `${n.toFixed(0)}%`
const num  = (n: number) => n.toLocaleString('it-IT', { maximumFractionDigits: 3 })

/** I quattro casi del menu engineering, nell'ordine in cui si guardano. */
const QUADRANTI = [
  { id: 'stella',    label: 'Stelle',      desc: 'Vendono e rendono: proteggile, non toccarle', ico: 'fa-star' },
  { id: 'cavallo',   label: 'Cavalli',     desc: 'Vendono ma rendono poco: rivedi ricetta o prezzo', ico: 'fa-horse' },
  { id: 'rompicapo', label: 'Rompicapi',   desc: 'Rendono ma non vendono: spingile in sala', ico: 'fa-puzzle-piece' },
  { id: 'peso',      label: 'Pesi morti',  desc: 'Non vendono e non rendono: candidate all’uscita', ico: 'fa-anchor' },
] as const

type Quadrante = typeof QUADRANTI[number]['id']

export default function FbFoodCost({ navigate }: { navigate?: (p: string) => void }) {
  const voci        = useFbStore(s => s.voci)
  const categorie   = useFbStore(s => s.categorie)
  const tipi        = useFbStore(s => s.tipiMenu)
  const ingredienti = useFbStore(s => s.ingredienti)
  const ricette     = useFbStore(s => s.ricette)
  const comande     = useFbStore(s => s.comande)
  const contesto    = useFbStore(s => s.contesto)
  const salvaVoce   = useFbStore(s => s.salvaVoce)
  const salvaRicetta = useFbStore(s => s.salvaRicetta)

  const [tipoId, setTipoId] = useState<number | 'tutti'>('tutti')
  const [cerca, setCerca]   = useState('')
  const [ordine, setOrdine] = useState<'incidenza' | 'margine' | 'venduto'>('incidenza')
  const [scheda, setScheda] = useState<VoceMenu | null>(null)
  const [aggiungi, setAggiungi] = useState('')

  const ingDi = useMemo(
    () => new Map(ingredienti.map(i => [i.id, i])),
    [ingredienti],
  )

  /** Food cost di una voce con il listino corrente, e col prezzo dei gruppi d'acquisto. */
  const costoDi = useMemo(() => (voceId: number) => {
    const righe = ricette[voceId] ?? []
    let costo = 0
    let costoAgora = 0
    righe.forEach(r => {
      const i = ingDi.get(r.ingredienteId)
      if (!i) return
      costo += i.costo * r.qta
      costoAgora += (i.agora && i.agora < i.costo ? i.agora : i.costo) * r.qta
    })
    return { costo, costoAgora, righe }
  }, [ricette, ingDi])

  /** Venduto della giornata per voce: la popolarità del menu engineering. */
  const vendutoDi = useMemo(() => {
    const idSale = SALE.filter(s => s.outletId === contesto.outletId).map(s => s.id)
    const m = new Map<number, number>()
    comande.filter(c => idSale.includes(c.salaId)).forEach(c =>
      c.righe.forEach(r => m.set(r.voceId, (m.get(r.voceId) ?? 0) + r.qta)))
    return m
  }, [comande, contesto.outletId])

  const righe = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    const catDelTipo = tipoId === 'tutti' ? null : categorie.filter(c => c.tipoId === tipoId).map(c => c.id)
    return voci
      .filter(v => (!catDelTipo || catDelTipo.includes(v.categoriaId)) && (!q || v.nome.toLowerCase().includes(q)))
      .map(v => {
        const { costo, costoAgora } = costoDi(v.id)
        const venduti = vendutoDi.get(v.id) ?? 0
        return {
          v,
          costo,
          /** Quanto si recupera sul piatto aderendo ai gruppi d'acquisto aperti. */
          recupero: costo - costoAgora,
          margine: v.prezzo - costo,
          incidenza: v.prezzo ? (costo / v.prezzo) * 100 : 0,
          venduti,
          generato: (v.prezzo - costo) * venduti,
          noScheda: !(ricette[v.id] ?? []).length,
        }
      })
  }, [voci, categorie, tipoId, cerca, costoDi, vendutoDi, ricette])

  const ordinate = useMemo(() => {
    const r = [...righe]
    if (ordine === 'incidenza') r.sort((a, b) => (b.noScheda ? -1 : 0) - (a.noScheda ? -1 : 0) || b.incidenza - a.incidenza)
    if (ordine === 'margine')   r.sort((a, b) => b.margine - a.margine)
    if (ordine === 'venduto')   r.sort((a, b) => b.generato - a.generato)
    return r
  }, [righe, ordine])

  // ── Menu engineering ───────────────────────────────────────────────────────
  //  Popolarità e margine si confrontano con la media del periodo: è la regola
  //  classica di Kasavana-Smith, e resta leggibile anche con pochi coperti.
  const conScheda = righe.filter(r => !r.noScheda)
  const margineMedio = conScheda.length
    ? conScheda.reduce((a, r) => a + r.margine, 0) / conScheda.length : 0
  const vendutoMedio = conScheda.length
    ? conScheda.reduce((a, r) => a + r.venduti, 0) / conScheda.length : 0

  const quadranteDi = (r: typeof righe[number]): Quadrante => {
    const vende = r.venduti >= vendutoMedio
    const rende = r.margine >= margineMedio
    if (vende && rende) return 'stella'
    if (vende) return 'cavallo'
    if (rende) return 'rompicapo'
    return 'peso'
  }

  const perQuadrante = useMemo(() => {
    const m: Record<Quadrante, typeof righe> = { stella: [], cavallo: [], rompicapo: [], peso: [] }
    conScheda.forEach(r => m[quadranteDi(r)].push(r))
    Object.values(m).forEach(l => l.sort((a, b) => b.generato - a.generato))
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conScheda, margineMedio, vendutoMedio])

  // ── Occasioni d'acquisto ───────────────────────────────────────────────────
  const occasioni = useMemo(() => ingredienti
    .filter(i => i.agora && i.agora < i.costo)
    .map(i => {
      const piatti = Object.entries(ricette).filter(([, righe]) => righe.some(r => r.ingredienteId === i.id))
      return { ing: i, piatti: piatti.length, sconto: Math.round((1 - i.agora! / i.costo) * 100) }
    })
    .filter(o => o.piatti > 0)
    .sort((a, b) => b.sconto - a.sconto)
    .slice(0, 6), [ingredienti, ricette])

  const recuperoTotale = righe.reduce((a, r) => a + r.recupero * r.venduti, 0)

  // ── Scheda tecnica ─────────────────────────────────────────────────────────
  const righeScheda: RigaRicetta[] = useMemo(
    () => (scheda ? (ricette[scheda.id] ?? []) : []),
    [scheda, ricette],
  )

  const cambiaQta = (ingredienteId: number, qta: number) => {
    if (!scheda) return
    salvaRicetta(scheda.id, righeScheda.map(r => r.ingredienteId === ingredienteId ? { ...r, qta } : r))
  }

  const togliRiga = (ingredienteId: number) => {
    if (!scheda) return
    salvaRicetta(scheda.id, righeScheda.filter(r => r.ingredienteId !== ingredienteId))
  }

  const aggiungiRiga = (i: Ingrediente) => {
    if (!scheda || righeScheda.some(r => r.ingredienteId === i.id)) return
    salvaRicetta(scheda.id, [...righeScheda, { ingredienteId: i.id, qta: i.porzione }])
    setAggiungi('')
    toast.success(`${i.nome} aggiunto alla scheda`)
  }

  const candidati = useMemo(() => {
    const q = aggiungi.trim().toLowerCase()
    if (!q) return []
    return ingredienti
      .filter(i => i.nome.toLowerCase().includes(q) && !righeScheda.some(r => r.ingredienteId === i.id))
      .slice(0, 8)
  }, [aggiungi, ingredienti, righeScheda])

  const costoScheda = scheda ? costoDi(scheda.id).costo : 0

  return (
    <div className="fbfc">
      <PageHead
        title="Food cost e margini"
        subtitle="Quanto costa un piatto, quanto lascia e quali voci reggono la carta"
        actions={
          <button type="button" className="fbfc__head-btn" onClick={() => navigate?.('fb-ingredienti')}>
            <i className="fa-solid fa-carrot" aria-hidden="true" /> Listino ingredienti
          </button>
        }
      />

      <FilterToolbar className="fbfc__bar">
        <SelectField
          name="tipo" label="Tipo menu" className="fbfc__f"
          value={tipoId}
          options={[{ value: 'tutti', label: 'Tutti' }, ...tipi.map(t => ({ value: t.id, label: t.nome }))]}
          onChange={e => setTipoId(e.target.value === 'tutti' ? 'tutti' : +e.target.value)}
        />
        <SelectField
          name="ordine" label="Ordina per" className="fbfc__f fbfc__f--lg"
          value={ordine}
          options={[
            { value: 'incidenza', label: 'Incidenza materia prima' },
            { value: 'margine',   label: 'Margine per porzione' },
            { value: 'venduto',   label: 'Margine generato oggi' },
          ]}
          onChange={e => setOrdine(e.target.value as typeof ordine)}
        />
        <div className="fbfc__f fbfc__f--lg fbfc__cerca">
          <span className="fbfc__cerca-lab">Cerca</span>
          <SearchField
            name="cerca" value={cerca} placeholder="Nome della voce…"
            onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')}
          />
        </div>
      </FilterToolbar>

      <div className="fbfc__corpo">
        {/* ── Voce per voce ───────────────────────────────────────────────── */}
        <section className="fbfc__col">
          <div className="sib-table-wrap">
            <table className="sib-table fbfc__table">
              <colgroup>
                <col className="fbfc__c-nome" /><col className="fbfc__c-prezzo" />
                <col className="fbfc__c-costo" /><col className="fbfc__c-inc" />
                <col className="fbfc__c-marg" /><col className="fbfc__c-vend" />
                <col className="fbfc__c-gen" /><col className="fbfc__c-act" />
              </colgroup>
              <thead>
                <tr>
                  <th>Voce</th>
                  <th className="fbfc__amt">Prezzo</th>
                  <th className="fbfc__amt">Food cost</th>
                  <th className="fbfc__amt">Incidenza</th>
                  <th className="fbfc__amt">Margine</th>
                  <th className="fbfc__amt">Venduti</th>
                  <th className="fbfc__amt">Generato</th>
                  <th className="fbfc__c-act" aria-label="Azioni" />
                </tr>
              </thead>
              <tbody>
                {ordinate.map(r => (
                  <tr key={r.v.id} className={r.noScheda ? 'is-vuota' : ''}>
                    <td><TruncatedText text={r.v.nome} /></td>
                    <td className="fbfc__amt">
                      <NumCell
                        className="sib-input fbfc__num"
                        min={0} decimals={2} value={r.v.prezzo}
                        aria-label={`Prezzo di ${r.v.nome}`}
                        onChange={n => salvaVoce({ ...r.v, prezzo: n })}
                      />
                    </td>
                    <td className="fbfc__amt">
                      {r.noScheda ? <span className="fbfc__nessuno">—</span> : euro(r.costo)}
                    </td>
                    <td className="fbfc__amt">
                      {r.noScheda ? (
                        <Tooltip text="Manca la scheda tecnica: senza ingredienti il food cost non si calcola">
                          <span className="fbfc__manca"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> da fare</span>
                        </Tooltip>
                      ) : (
                        <span className={`fbfc__inc ${r.incidenza > SOGLIA_FOOD_COST ? 'is-alta' : ''}`}>
                          {pct(r.incidenza)}
                        </span>
                      )}
                    </td>
                    <td className="fbfc__amt">{r.noScheda ? '—' : euro(r.margine)}</td>
                    <td className="fbfc__amt">{r.venduti || '—'}</td>
                    <td className="fbfc__amt">{r.venduti && !r.noScheda ? euro(r.generato) : '—'}</td>
                    <td className="fbfc__c-act">
                      <button
                        type="button" className="fbfc__act"
                        onClick={() => { setScheda(r.v); setAggiungi('') }}
                        aria-label={`Scheda tecnica di ${r.v.nome}`}
                      >
                        <i className="fa-solid fa-list-check" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!ordinate.length && (
                  <tr><td colSpan={8} className="fbfc__vuoto">Nessuna voce con questi filtri.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="fbfc__somma">
            {ordinate.length} voci · incidenza media{' '}
            <strong>{pct(conScheda.length ? conScheda.reduce((a, r) => a + r.incidenza, 0) / conScheda.length : 0)}</strong>
            {' · '}margine generato oggi <strong>{euro(righe.reduce((a, r) => a + (r.noScheda ? 0 : r.generato), 0))}</strong>
          </p>
        </section>

        {/* ── Menu engineering e occasioni d'acquisto ─────────────────────── */}
        <aside className="fbfc__lato">
          <h3 className="fbfc__tit">
            <i className="fa-solid fa-chess-board" aria-hidden="true" /> Menu engineering
          </h3>
          <p className="fbfc__nota">
            Confronto con la media della carta: {vendutoMedio.toFixed(1)} porzioni e {euro(margineMedio)} di margine.
          </p>

          <div className="fbfc__quadri">
            {QUADRANTI.map(q => (
              <div key={q.id} className={`fbfc__quadro fbfc__quadro--${q.id}`}>
                <header>
                  <i className={`fa-solid ${q.ico}`} aria-hidden="true" />
                  <span className="fbfc__quadro-lab">{q.label}</span>
                  <span className="fbfc__quadro-n">{perQuadrante[q.id].length}</span>
                </header>
                <p className="fbfc__quadro-desc">{q.desc}</p>
                <ul>
                  {perQuadrante[q.id].slice(0, 4).map(r => (
                    <li key={r.v.id}>
                      <TruncatedText text={r.v.nome} />
                      <span>{euro(r.margine)}</span>
                    </li>
                  ))}
                  {!perQuadrante[q.id].length && <li className="fbfc__quadro-vuoto">nessuna voce</li>}
                </ul>
              </div>
            ))}
          </div>

          <h3 className="fbfc__tit">
            <i className="fa-solid fa-people-group" aria-hidden="true" /> Occasioni d’acquisto
          </h3>
          <p className="fbfc__nota">
            Gruppi d’acquisto aperti in Agorà sugli ingredienti che stai già usando.
          </p>
          <ul className="fbfc__occ">
            {occasioni.map(o => (
              <li key={o.ing.id}>
                <span className="fbfc__occ-nome"><TruncatedText text={o.ing.nome} /></span>
                <span className="fbfc__occ-dett">
                  {euro(o.ing.costo)} → <strong>{euro(o.ing.agora!)}</strong> /{o.ing.unita}
                  {' · '}{o.piatti} {o.piatti === 1 ? 'piatto' : 'piatti'}
                </span>
                <span className="fbfc__occ-sconto">−{o.sconto}%</span>
              </li>
            ))}
            {!occasioni.length && <li className="fbfc__quadro-vuoto">nessun gruppo aperto sui tuoi ingredienti</li>}
          </ul>
          {!!recuperoTotale && (
            <button type="button" className="fbfc__cta" onClick={() => navigate?.('group-purchases')}>
              <i className="fa-solid fa-arrow-right" aria-hidden="true" />
              {euro(recuperoTotale)} di margine in più sul venduto di oggi — vai ai gruppi d’acquisto
            </button>
          )}
        </aside>
      </div>

      {/* ── Scheda tecnica della voce ────────────────────────────────────── */}
      <Modal
        open={!!scheda} onClose={() => setScheda(null)} size="lg"
        title={scheda ? `Scheda tecnica — ${scheda.nome}` : ''}
      >
        {scheda && (
          <div className="fbfc-sch">
            <div className="sib-table-wrap">
              <table className="sib-table fbfc-sch__table">
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th className="fbfc__amt">Quantità</th>
                    <th className="fbfc__amt">Costo unitario</th>
                    <th className="fbfc__amt">Costo riga</th>
                    <th aria-label="Azioni" />
                  </tr>
                </thead>
                <tbody>
                  {righeScheda.map(r => {
                    const i = ingDi.get(r.ingredienteId)
                    if (!i) return null
                    return (
                      <tr key={r.ingredienteId}>
                        <td><TruncatedText text={i.nome} /></td>
                        <td className="fbfc__amt">
                          <span className="fbfc-sch__qta">
                            <NumCell
                              className="sib-input fbfc__num"
                              min={0} decimals={3} step={0.005} value={r.qta}
                              aria-label={`Quantità di ${i.nome}`}
                              onChange={n => cambiaQta(i.id, n)}
                            />
                            <span className="fbfc__unita">{i.unita}</span>
                          </span>
                        </td>
                        <td className="fbfc__amt">{euro(i.costo)}/{i.unita}</td>
                        <td className="fbfc__amt">{euro(i.costo * r.qta)}</td>
                        <td>
                          <button
                            type="button" className="fbfc__act fbfc__act--danger"
                            onClick={() => togliRiga(i.id)} aria-label={`Togli ${i.nome}`}
                          >
                            <i className="fa-solid fa-xmark" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {!righeScheda.length && (
                    <tr><td colSpan={5} className="fbfc__vuoto">Scheda ancora vuota: aggiungi il primo ingrediente.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="fbfc-sch__aggiungi">
              <SearchField
                name="aggiungi" value={aggiungi} placeholder="Aggiungi un ingrediente…"
                onChange={e => setAggiungi(e.target.value)} onClear={() => setAggiungi('')}
              />
              {!!candidati.length && (
                <ul className="fbfc-sch__cand">
                  {candidati.map(i => (
                    <li key={i.id}>
                      <button type="button" onClick={() => aggiungiRiga(i)}>
                        <span><TruncatedText text={i.nome} /></span>
                        <span className="fbfc__unita">{euro(i.costo)}/{i.unita} · porzione {num(i.porzione)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="fbfc-sch__foot">
              <span className="fbfc-sch__tot">
                Food cost <strong>{euro(costoScheda)}</strong>
                {' · '}prezzo {euro(scheda.prezzo)}
                {' · '}margine <strong>{euro(scheda.prezzo - costoScheda)}</strong>
                {' ('}{pct(scheda.prezzo ? ((scheda.prezzo - costoScheda) / scheda.prezzo) * 100 : 0)}{')'}
              </span>
              <button type="button" className="fbfc-sch__ok" onClick={() => setScheda(null)}>Fatto</button>
            </footer>
          </div>
        )}
      </Modal>
    </div>
  )
}
