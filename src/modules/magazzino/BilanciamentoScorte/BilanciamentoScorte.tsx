// ─── Bilanciamento scorte (Magazzino) ─────────────────────────────────────────
//  In un albergo la merce sta nel magazzino centrale e i reparti (bar, cucina,
//  cantina, office piani) ne tengono solo la dotazione di servizio: il livello
//  par, la quantità che il reparto deve avere a inizio turno.
//
//  La pagina confronta la giacenza di ogni reparto con il suo par e propone:
//   • rifornimento — il reparto è sotto par: si preleva dal centrale, fino a
//     dove il centrale lo permette senza scendere sotto la sua scorta di
//     sicurezza; quel che manca diventa una proposta di riordino al fornitore;
//   • rientro — il reparto tiene molto più del par (merce non deperibile): la
//     si riporta al centrale, dove torna disponibile per tutti.
//
//  Confermando si generano i buoni di trasferimento, uno per coppia
//  mittente→destinatario. Lo scarico è immediato; il carico arriva con la
//  conferma di ricevimento, e finché la merce è in viaggio il preliminare di
//  chiusura del destinatario resta bloccato.
import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import FilterToolbar from '../../../core/components/FilterToolbar'
import Tabs from '../../../core/components/Tabs'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import { SelectField, CheckboxField, NumCell } from '../../../core/components/form'
import { useConfirmStore } from '../../../store/useConfirmStore'
import { toast } from '../../../core/components/Toast/useToast'
import { exportTableToXls } from '../../sales/booking/GrigliaDisponibilita/exportGriglia'
import {
  useChiusureMagazzinoStore, giacenzeAttuali, magazziniDi,
} from '../../../store/useChiusureMagazzinoStore'
import {
  CATEGORIE_ARTICOLO, STRUTTURE_MAG,
  articoliDi, articoloById, centraleDi, dataOra, decimaliDi, euro, livelloPar, magazzinoById, qta,
  type CategoriaArticolo, type Trasferimento,
} from '../_data/chiusure.model'
import './BilanciamentoScorte.sass'

type Tipo = 'rifornimento' | 'rientro' | 'equilibrio'

interface Proposta {
  key: string
  articoloId: string
  repartoId: string
  tipo: Tipo
  giacenza: number
  inArrivo: number
  par: number
  /** Quanto servirebbe (rifornimento) o quanto avanza (rientro) */
  bisogno: number
  proposta: number
  dispCentrale: number
}

/** Il centrale non scende sotto questa quota della sua scorta minima. */
const SICUREZZA_CENTRALE = 0.5
/** Oltre par × questo fattore il reparto ha merce ferma da riportare al centrale. */
const SOGLIA_ECCEDENZA = 1.6
/** Sotto par × questo fattore il reparto va rifornito (evita i micro-prelievi). */
const SOGLIA_RIFORNIMENTO = 0.9
/** I freschi non tornano indietro: si consumano dove sono. */
const NON_RIENTRANO: CategoriaArticolo[] = ['Food']

const tondo = (n: number, dec: number) => Math.round(n * 10 ** dec) / 10 ** dec

export default function BilanciamentoScorte({ navigate }: { navigate?: (p: string) => void }) {
  const chiusure = useChiusureMagazzinoStore(s => s.chiusure)
  const bozze = useChiusureMagazzinoStore(s => s.bozze)
  const movExtra = useChiusureMagazzinoStore(s => s.movExtra)
  const trasferimenti = useChiusureMagazzinoStore(s => s.trasferimenti)
  const genera = useChiusureMagazzinoStore(s => s.generaTrasferimenti)
  const ricevi = useChiusureMagazzinoStore(s => s.riceviTrasferimento)
  const confirm = useConfirmStore(s => s.confirm)

  const [tab, setTab] = useState<'proposta' | 'trasferimenti'>('proposta')
  const [strutturaId, setStrutturaId] = useState(STRUTTURE_MAG[0].id)
  const [repartoId, setRepartoId] = useState<string>('tutti')
  const [categoria, setCategoria] = useState<CategoriaArticolo | 'tutte'>('tutte')
  const [soloDaBilanciare, setSoloDaBilanciare] = useState(true)
  const [modifiche, setModifiche] = useState<Record<string, number>>({})
  const [esclusi, setEsclusi] = useState<Record<string, boolean>>({})

  const centrale = centraleDi(strutturaId)!
  const reparti = magazziniDi(strutturaId).filter(m => m.tipo !== 'centrale')

  // ── Proposta ─────────────────────────────────────────────────────────────
  const { proposte, riordino } = useMemo(() => {
    const stato = { chiusure, bozze, movExtra }
    const giacC = giacenzeAttuali(stato, centrale.id)
    const inViaggio = (aId: string, articoloId: string) =>
      trasferimenti
        .filter(t => t.aId === aId && t.stato === 'in-transito')
        .reduce((s, t) => s + t.righe.filter(r => r.articoloId === articoloId).reduce((a, r) => a + r.qta, 0), 0)

    // Disponibile al centrale per articolo, consumato man mano che si assegna
    const disp: Record<string, number> = {}
    Object.entries(giacC).forEach(([a, g]) => {
      disp[a] = Math.max(0, g - livelloPar(centrale.id, a) * SICUREZZA_CENTRALE)
    })

    const tutte: Proposta[] = []
    reparti.forEach(rep => {
      const giac = giacenzeAttuali(stato, rep.id)
      articoliDi(rep.id).forEach(a => {
        const dec = decimaliDi(a.um)
        const par = livelloPar(rep.id, a.id)
        const inArrivo = inViaggio(rep.id, a.id)
        const g = tondo(giac[a.id] ?? 0, dec)
        const eff = g + inArrivo
        let tipo: Tipo = 'equilibrio'
        let bisogno = 0
        if (eff < par * SOGLIA_RIFORNIMENTO) { tipo = 'rifornimento'; bisogno = tondo(par - eff, dec) }
        else if (eff > par * SOGLIA_ECCEDENZA && !NON_RIENTRANO.includes(a.categoria)) {
          tipo = 'rientro'; bisogno = tondo(eff - par, dec)
        }
        tutte.push({
          key: `${rep.id}|${a.id}`, articoloId: a.id, repartoId: rep.id, tipo,
          giacenza: g, inArrivo, par, bisogno, proposta: 0, dispCentrale: 0,
        })
      })
    })

    // Prima i reparti più scoperti: a parità di merce vince chi è più lontano dal par
    tutte
      .filter(p => p.tipo === 'rifornimento')
      .sort((x, y) => (x.giacenza + x.inArrivo) / x.par - (y.giacenza + y.inArrivo) / y.par)
      .forEach(p => {
        const a = articoloById(p.articoloId)!
        p.dispCentrale = tondo(disp[p.articoloId] ?? 0, decimaliDi(a.um))
        p.proposta = tondo(Math.min(p.bisogno, disp[p.articoloId] ?? 0), decimaliDi(a.um))
        disp[p.articoloId] = (disp[p.articoloId] ?? 0) - p.proposta
      })
    tutte.filter(p => p.tipo === 'rientro').forEach(p => {
      p.proposta = p.bisogno
      p.dispCentrale = tondo(disp[p.articoloId] ?? 0, decimaliDi(articoloById(p.articoloId)!.um))
    })

    // Riordino al fornitore: il fabbisogno dei reparti non coperto, più quanto
    // serve a riportare il centrale alla sua scorta minima
    const rio: Record<string, number> = {}
    tutte.filter(p => p.tipo === 'rifornimento' && p.proposta < p.bisogno).forEach(p => {
      rio[p.articoloId] = (rio[p.articoloId] ?? 0) + p.bisogno - p.proposta
    })
    Object.entries(giacC).forEach(([a, g]) => {
      const assegnato = tutte.filter(p => p.articoloId === a && p.tipo === 'rifornimento').reduce((s, p) => s + p.proposta, 0)
      const resto = g - assegnato
      const min = livelloPar(centrale.id, a)
      if (resto < min) rio[a] = (rio[a] ?? 0) + (min - resto)
    })
    const riordino = Object.entries(rio)
      .map(([articoloId, q]) => {
        const a = articoloById(articoloId)!
        return { articoloId, qta: Math.ceil(q * 10 ** decimaliDi(a.um)) / 10 ** decimaliDi(a.um) }
      })
      .filter(r => r.qta > 0)

    return { proposte: tutte, riordino }
  }, [chiusure, bozze, movExtra, trasferimenti, strutturaId])

  const quantitaDi = (p: Proposta) => modifiche[p.key] ?? p.proposta
  const selezionata = (p: Proposta) => p.tipo !== 'equilibrio' && !esclusi[p.key] && quantitaDi(p) > 0

  const visibili = proposte.filter(p =>
    (repartoId === 'tutti' || p.repartoId === repartoId)
    && (categoria === 'tutte' || articoloById(p.articoloId)!.categoria === categoria)
    && (!soloDaBilanciare || p.tipo !== 'equilibrio'))

  const scelte = visibili.filter(selezionata)
  const valoreScelto = scelte.reduce((s, p) => s + quantitaDi(p) * articoloById(p.articoloId)!.costo, 0)
  const tutteScelte = visibili.filter(p => p.tipo !== 'equilibrio').every(p => !esclusi[p.key])

  const toggleTutte = (on: boolean) =>
    setEsclusi(prev => ({ ...prev, ...Object.fromEntries(visibili.filter(p => p.tipo !== 'equilibrio').map(p => [p.key, !on])) }))

  const cambiaStruttura = (id: string) => {
    setStrutturaId(id)
    setRepartoId('tutti')
    setModifiche({})
    setEsclusi({})
  }

  const generaBuoni = async () => {
    const docs = new Map<string, { daId: string; aId: string; righe: Array<{ articoloId: string; qta: number }> }>()
    scelte.forEach(p => {
      const daId = p.tipo === 'rifornimento' ? centrale.id : p.repartoId
      const aId = p.tipo === 'rifornimento' ? p.repartoId : centrale.id
      const k = `${daId}>${aId}`
      if (!docs.has(k)) docs.set(k, { daId, aId, righe: [] })
      docs.get(k)!.righe.push({ articoloId: p.articoloId, qta: quantitaDi(p) })
    })
    const elenco = Array.from(docs.values())
    const ok = await confirm({
      title: 'Genera trasferimenti',
      message: (
        <>
          Verranno generati <b>{elenco.length}</b> {elenco.length === 1 ? 'buono' : 'buoni'} di trasferimento
          per <b>{scelte.length}</b> righe ({euro(valoreScelto)} a costo medio):{' '}
          {elenco.map(d => `${magazzinoById(d.daId)?.nome} → ${magazzinoById(d.aId)?.nome}`).join(', ')}.
          La merce esce subito dal magazzino che la cede e si carica alla conferma di ricevimento.
        </>
      ),
      confirmLabel: 'Genera', danger: false,
    })
    if (!ok) return
    const creati = genera(elenco)
    setModifiche({})
    setEsclusi({})
    toast.success(`${creati.map(t => t.numero).join(', ')} in transito`, 'Trasferimenti generati')
    setTab('trasferimenti')
  }

  const esportaRiordino = () => {
    exportTableToXls(
      `riordino-${strutturaId}.xlsx`,
      ['Codice', 'Articolo', 'Categoria', 'Fornitore', 'U.M.', 'Quantità da ordinare', 'Costo medio', 'Valore'],
      riordino.map(r => {
        const a = articoloById(r.articoloId)!
        return [a.codice, a.nome, a.categoria, a.fornitore, a.um, r.qta, a.costo, +(r.qta * a.costo).toFixed(2)]
      }),
      'Riordino',
    )
    toast.success('Lista di riordino scaricata')
  }

  // ── Trasferimenti ────────────────────────────────────────────────────────
  const idStruttura = new Set(magazziniDi(strutturaId).map(m => m.id))
  const docsStruttura = trasferimenti
    .filter(t => idStruttura.has(t.daId))
    .sort((a, b) => (a.stato === b.stato ? b.creatoIl - a.creatoIl : a.stato === 'in-transito' ? -1 : 1))
  const inTransito = docsStruttura.filter(t => t.stato === 'in-transito').length
  const valoreDoc = (t: Trasferimento) => t.righe.reduce((s, r) => s + r.qta * (articoloById(r.articoloId)?.costo ?? 0), 0)

  return (
    <div className="bil">
      <PageHead
        title="Bilanciamento scorte"
        subtitle="Riequilibrio delle giacenze fra magazzino centrale e reparti sui livelli par, con trasferimenti e riordino"
      />

      <FilterToolbar className="bil__bar">
        <SelectField
          name="struttura" label="Struttura" className="bil__f"
          value={strutturaId}
          options={STRUTTURE_MAG.map(s => ({ value: s.id, label: s.nome }))}
          onChange={e => cambiaStruttura(e.target.value)}
        />
        {tab === 'proposta' && (
          <>
            <SelectField
              name="reparto" label="Reparto" className="bil__f"
              value={repartoId}
              options={[{ value: 'tutti', label: 'Tutti' }, ...reparti.map(r => ({ value: r.id, label: r.nome }))]}
              onChange={e => setRepartoId(e.target.value)}
            />
            <SelectField
              name="categoria" label="Categoria" className="bil__f"
              value={categoria}
              options={[{ value: 'tutte', label: 'Tutte' }, ...CATEGORIE_ARTICOLO.map(c => ({ value: c, label: c }))]}
              onChange={e => setCategoria(e.target.value as CategoriaArticolo | 'tutte')}
            />
            <CheckboxField
              name="dabil" label="Solo da bilanciare"
              checked={soloDaBilanciare} onChange={e => setSoloDaBilanciare(e.target.checked)}
            />
          </>
        )}
        <p className="bil__meta">
          Prelievi da <b>{centrale.nome}</b>, che tiene per sé il {SICUREZZA_CENTRALE * 100}% della scorta minima
        </p>
      </FilterToolbar>

      <Tabs
        className="bil__tabs"
        active={tab}
        onChange={id => setTab(id as 'proposta' | 'trasferimenti')}
        tabs={[
          { id: 'proposta', label: 'Proposta di bilanciamento' },
          { id: 'trasferimenti', label: `Trasferimenti${inTransito ? ` (${inTransito} in transito)` : ''}` },
        ]}
      />

      {tab === 'proposta' ? (
        <>
          <div className="bil__wrap">
            <div className="sib-table-wrap">
              <table className="sib-table bil__table">
                <colgroup>
                  <col className="bil__c-chk" /><col className="bil__c-art" /><col className="bil__c-rep" />
                  <col className="bil__c-n" /><col className="bil__c-n" /><col className="bil__c-cop" />
                  <col className="bil__c-disp" /><col className="bil__c-qta" /><col className="bil__c-esito" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="bil__chk">
                      <CheckboxField
                        name="tutte" className="bil__chk-in"
                        checked={tutteScelte} onChange={e => toggleTutte(e.target.checked)}
                      />
                    </th>
                    <th>Articolo</th>
                    <th>Reparto</th>
                    <th className="bil__num">Giacenza</th>
                    <th className="bil__num"><TruncatedText text="Par" full="Livello par: la dotazione che il reparto deve avere a inizio servizio" /></th>
                    <th><TruncatedText text="Copertura" full="Giacenza (più la merce in arrivo) rispetto al livello par" /></th>
                    <th className="bil__num"><TruncatedText text="Centrale" full="Disponibile al magazzino centrale oltre la sua scorta di sicurezza" /></th>
                    <th className="bil__num"><TruncatedText text="Da trasferire" full="Quantità del trasferimento, modificabile" /></th>
                    <th>Esito</th>
                  </tr>
                </thead>
                <tbody>
                  {visibili.map(p => {
                    const a = articoloById(p.articoloId)!
                    const dec = decimaliDi(a.um)
                    const cop = p.par ? (p.giacenza + p.inArrivo) / p.par : 1
                    const q = quantitaDi(p)
                    const manca = p.tipo === 'rifornimento' ? tondo(p.bisogno - q, dec) : 0
                    return (
                      <tr key={p.key} className={p.tipo !== 'equilibrio' && !selezionata(p) ? 'is-escluso' : ''}>
                        <td className="bil__chk">
                          {p.tipo !== 'equilibrio' && (
                            <CheckboxField
                              name={`sel-${p.key}`} className="bil__chk-in"
                              checked={!esclusi[p.key]}
                              onChange={e => setEsclusi(prev => ({ ...prev, [p.key]: !e.target.checked }))}
                            />
                          )}
                        </td>
                        <td>
                          <span className="bil__art">
                            <TruncatedText text={a.nome} />
                            <span className="bil__cod">{a.codice}</span>
                          </span>
                        </td>
                        <td><TruncatedText text={magazzinoById(p.repartoId)?.nome ?? ''} /></td>
                        <td className="bil__num">
                          {!!p.inArrivo && (
                            <Tooltip text={`Più ${qta(p.inArrivo, a.um)} ${a.um} in arrivo con trasferimenti non ancora ricevuti`}>
                              <i className="fa-solid fa-truck-fast bil__arrivo" aria-hidden="true" />
                            </Tooltip>
                          )}
                          {qta(p.giacenza, a.um)} {a.um}
                        </td>
                        <td className="bil__num">{qta(p.par, a.um)}</td>
                        <td>
                          <span className="bil__cop">
                            <span className="bil__cop-bar">
                              <span
                                className={`bil__cop-fill is-${cop < 0.5 ? 'ko' : cop < 1 ? 'warn' : cop > SOGLIA_ECCEDENZA ? 'over' : 'ok'} bil__cop-fill--w${Math.round(Math.min(100, cop * 100 / SOGLIA_ECCEDENZA) / 5) * 5}`}
                              />
                              <span className="bil__cop-par" />
                            </span>
                            <span className="bil__cop-pct">{Math.round(cop * 100)}%</span>
                          </span>
                        </td>
                        <td className="bil__num">
                          {p.tipo === 'rifornimento' ? qta(p.dispCentrale, a.um) : <span className="bil__nd">—</span>}
                        </td>
                        <td className="bil__num">
                          {p.tipo === 'equilibrio' ? <span className="bil__nd">—</span> : (
                            <span className="bil__qta">
                              <i
                                className={`fa-solid ${p.tipo === 'rifornimento' ? 'fa-arrow-right-to-bracket' : 'fa-arrow-right-from-bracket'} bil__dir`}
                                aria-hidden="true"
                              />
                              <NumCell
                                className="sib-input bil__in"
                                min={0} decimals={dec} step={dec ? 0.1 : 1}
                                max={p.tipo === 'rifornimento' ? p.dispCentrale : p.giacenza}
                                value={q}
                                aria-label={`Quantità da trasferire di ${a.nome}`}
                                onChange={n => setModifiche(prev => ({ ...prev, [p.key]: n }))}
                              />
                            </span>
                          )}
                        </td>
                        <td>
                          {p.tipo === 'equilibrio' && <span className="bil__esito is-ok"><i className="fa-solid fa-circle-check" aria-hidden="true" /> In equilibrio</span>}
                          {p.tipo === 'rientro' && (
                            <Tooltip text={`Il reparto tiene ${qta(p.bisogno, a.um)} ${a.um} oltre il par: tornano al centrale`}>
                              <span className="bil__esito is-over"><i className="fa-solid fa-rotate-left" aria-hidden="true" /> Rientro al centrale</span>
                            </Tooltip>
                          )}
                          {p.tipo === 'rifornimento' && (manca <= 0
                            ? <span className="bil__esito is-ok"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Coperto</span>
                            : (
                              <Tooltip text={`Mancano ${qta(manca, a.um)} ${a.um} per arrivare al par: il centrale non ne ha abbastanza`}>
                                <span className={`bil__esito ${q > 0 ? 'is-warn' : 'is-ko'}`}>
                                  <i className="fa-solid fa-cart-shopping" aria-hidden="true" />
                                  <TruncatedText text={`${q > 0 ? 'Parziale' : 'Centrale scoperto'} · riordina ${qta(manca, a.um)}`} />
                                </span>
                              </Tooltip>
                            ))}
                        </td>
                      </tr>
                    )
                  })}
                  {!visibili.length && (
                    <tr>
                      <td colSpan={9} className="bil__vuoto">
                        {soloDaBilanciare ? 'Tutti i reparti sono in equilibrio: nessun trasferimento da proporre.' : 'Nessun articolo con questi filtri.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="bil__somma">
              {scelte.length} {scelte.length === 1 ? 'riga selezionata' : 'righe selezionate'} · <b>{euro(valoreScelto)}</b> a costo medio
              {!!riordino.length && (
                <>
                  {' · '}
                  <Tooltip text={riordino.map(r => `${articoloById(r.articoloId)?.nome}: ${qta(r.qta, articoloById(r.articoloId)?.um)}`).join(' · ')}>
                    <span className="bil__rio">
                      <i className="fa-solid fa-cart-shopping" aria-hidden="true" />
                      {riordino.length} {riordino.length === 1 ? 'articolo' : 'articoli'} da riordinare al fornitore
                    </span>
                  </Tooltip>
                  <button type="button" className="bil__somma-link" onClick={esportaRiordino}>
                    <i className="fa-regular fa-file-xls" aria-hidden="true" /> Lista di riordino
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="bil__avanti">
            <button type="button" className="sib-btn sib-btn--primary" onClick={generaBuoni} disabled={!scelte.length}>
              <i className="fa-solid fa-right-left" aria-hidden="true" /> Genera trasferimenti
            </button>
          </div>
        </>
      ) : (
        <div className="bil__wrap">
          <div className="sib-table-wrap">
            <table className="sib-table bil__table bil__table--doc">
              <colgroup>
                <col className="bil__d-num" /><col className="bil__d-mag" /><col className="bil__d-mag" />
                <col className="bil__d-righe" /><col className="bil__d-val" /><col className="bil__d-data" />
                <col className="bil__d-stato" /><col className="bil__d-act" />
              </colgroup>
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Da</th>
                  <th>A</th>
                  <th>Articoli</th>
                  <th className="bil__num">Valore</th>
                  <th>Creato il</th>
                  <th>Stato</th>
                  <th aria-label="Azioni" />
                </tr>
              </thead>
              <tbody>
                {docsStruttura.map(t => {
                  const elenco = t.righe.map(r => {
                    const a = articoloById(r.articoloId)
                    return `${qta(r.qta, a?.um)} ${a?.um ?? ''} ${a?.nome ?? ''}`
                  }).join(', ')
                  return (
                    <tr key={t.id}>
                      <td className="bil__docnum">{t.numero}</td>
                      <td><TruncatedText text={magazzinoById(t.daId)?.nome ?? ''} /></td>
                      <td><TruncatedText text={magazzinoById(t.aId)?.nome ?? ''} /></td>
                      <td><TruncatedText text={elenco} /></td>
                      <td className="bil__num">{euro(valoreDoc(t))}</td>
                      <td>
                        <Tooltip text={`Creato da ${t.operatore}`}>
                          <span>{dataOra(t.creatoIl)}</span>
                        </Tooltip>
                      </td>
                      <td>
                        {t.stato === 'in-transito'
                          ? <span className="bil__esito is-warn"><i className="fa-solid fa-truck-fast" aria-hidden="true" /> In transito</span>
                          : (
                            <Tooltip text={t.ricevutoIl ? `Ricevuto il ${dataOra(t.ricevutoIl)}` : 'Ricevuto'}>
                              <span className="bil__esito is-ok"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Ricevuto</span>
                            </Tooltip>
                          )}
                      </td>
                      <td>
                        {t.stato === 'in-transito' && (
                          <Tooltip text="Conferma il ricevimento: la merce si carica nel magazzino di arrivo">
                            <button
                              type="button" className="bil__act"
                              onClick={() => { ricevi(t.id); toast.success(`${t.numero} ricevuto`, magazzinoById(t.aId)?.nome) }}
                              aria-label={`Conferma ricevimento ${t.numero}`}
                            >
                              <i className="fa-solid fa-box-open" aria-hidden="true" />
                            </button>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {!docsStruttura.length && (
                  <tr><td colSpan={8} className="bil__vuoto">Nessun trasferimento per questa struttura.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="bil__somma">
            {docsStruttura.length} {docsStruttura.length === 1 ? 'trasferimento' : 'trasferimenti'}
            {!!inTransito && <> · <b>{inTransito}</b> in transito, bloccano il preliminare di chiusura del reparto che li riceve</>}
            <button type="button" className="bil__somma-link" onClick={() => navigate?.('preliminare')}>
              <i className="fa-solid fa-clipboard-check" aria-hidden="true" /> Preliminare di chiusura
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
