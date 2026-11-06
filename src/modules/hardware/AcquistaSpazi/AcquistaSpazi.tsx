import React, { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { create } from 'zustand'
import PageHead from '../../../core/components/PageHead'
import Tabs from '../../../core/components/Tabs'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import Pagination from '../../../core/components/Pagination'
import { useColFilters } from '../../../core/components/ColFilters'
import { DateRangeField, RangeField, SearchField, SelectField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import ItaliaTotem from '../_shared/ItaliaTotem'
import SpotPlayer, { SlideView, TotemFrame } from '../_shared/SpotPlayer'
import FattoriPrezzo from '../_shared/FattoriPrezzo'
import {
  useTotemStore, FASCE, DESTINAZIONI, CITTA_RETE, DURATA_SPAZIO, PASSAGGI_BASE,
  prezzoSibylla, moltiplicatoreSpot, distanzaKm, destinazioneLbl, durataProgetto,
  oggiT, giornoT, isoT, fmtT, giorniTra, eurT,
  type Acquisto, type Destinazione, type Fascia, type TotemRete,
} from '../../../store/useTotemStore'
import './AcquistaSpazi.sass'

/**
 * Acquista spazi — Dispositivi › Totem.
 * Per chi non ha totem propri: sceglie sulla mappa (regione, città, raggio) i totem
 * degli altri membri della rete Sibylla che mettono in vendita i loro spazi, compone
 * la campagna (periodo, fasce, frequenza) e la manda in onda con uno spot creato
 * nell'Editor palinsesti. Il prezzo di ogni spazio lo calcola l'algoritmo di Sibylla
 * (posizione, orario, destinazione, traffico, stagione); il proprietario approva.
 */

type Vista = 'trova' | 'campagna' | 'acquisti'
const PER_PAGINA = 10
const RAGGI = [10, 25, 50, 100, 200]
const ICO_FASCIA: Record<Fascia, string> = { mattina: 'fa-sun', pomeriggio: 'fa-cloud-sun', sera: 'fa-moon', notte: 'fa-star' }
const fmtN = (n: number) => n.toLocaleString('it-IT')

// La campagna in composizione sopravvive al passaggio nell'Editor palinsesti e ritorno.
interface Carrello {
  totemIds: string[]
  dal: string
  al: string
  fasce: Fascia[]
  passaggi: number
  spotId: string
  set: (p: Partial<Omit<Carrello, 'set'>>) => void
}
const useCarrello = create<Carrello>(set => ({
  totemIds: [], dal: giornoT(3), al: giornoT(16), fasce: ['pomeriggio', 'sera'], passaggi: PASSAGGI_BASE, spotId: '',
  set: p => set(p),
}))

function pagina<T>(rows: T[], p: number) {
  const totali = Math.max(1, Math.ceil(rows.length / PER_PAGINA))
  const corrente = Math.min(p, totali)
  return { righe: rows.slice((corrente - 1) * PER_PAGINA, corrente * PER_PAGINA), corrente, totali }
}

/** Costo di un totem nella campagna: giorno per giorno, solo fasce in vendita e giorni liberi. */
function costoTotem(t: TotemRete, fasce: Fascia[], dal: string, al: string, passaggi: number, durataSpot: number) {
  const valide = fasce.filter(f => t.fasce.includes(f))
  let base = 0, slot = 0, occupati = 0
  const gg = dal && al && dal <= al ? giorniTra(dal, al) : 0
  for (let d = new Date(`${dal}T12:00:00`), i = 0; i < gg; i++, d.setDate(d.getDate() + 1)) {
    const iso = isoT(d)
    valide.forEach(f => {
      if (t.occupati[f].includes(iso)) { occupati++; return }
      base += prezzoSibylla(t, f, iso).prezzo; slot++
    })
  }
  return {
    importo: Math.round(base * moltiplicatoreSpot(passaggi, durataSpot)),
    slot, occupati, escluse: fasce.filter(f => !t.fasce.includes(f)),
  }
}

type StatoVis = 'In revisione' | 'In arrivo' | 'In onda' | 'Concluso' | 'Rifiutato'
const statoVis = (a: Acquisto, oggi: string): StatoVis =>
  a.stato === 'Rifiutato' ? 'Rifiutato' : a.stato === 'In revisione' ? 'In revisione' : a.al < oggi ? 'Concluso' : a.dal > oggi ? 'In arrivo' : 'In onda'
const STATO_CLS: Record<StatoVis, string> = { 'In revisione': 'wait', 'In arrivo': 'plan', 'In onda': 'live', Concluso: 'done', Rifiutato: 'ko' }

export default function AcquistaSpazi({ navigate, vistaIniziale, spotIniziale }: { navigate: (p: string) => void; vistaIniziale?: string; spotIniziale?: string }) {
  const { rete, progetti, acquisti, acquistaSpazi, aggiornaAcquisto, annullaAcquisto } = useTotemStore()
  const carrello = useCarrello()
  const confirm = useConfirmStore(s => s.confirm)
  const oggi = oggiT()

  const [vista, setVista] = useState<Vista>(() => (['trova', 'campagna', 'acquisti'].includes(vistaIniziale ?? '') ? vistaIniziale as Vista : 'trova'))
  useEffect(() => {
    if (spotIniziale && progetti.some(p => p.id === spotIniziale)) carrello.set({ spotId: spotIniziale })
  }, [spotIniziale]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trova spazi: filtri geografici e di destinazione ──
  const [cerca, setCerca] = useState('')
  const [regione, setRegione] = useState('')
  const [vicino, setVicino] = useState('')
  const [raggio, setRaggio] = useState(50)
  const [dest, setDest] = useState<Destinazione[]>([])
  const [fasciaPrezzo, setFasciaPrezzo] = useState<Fascia>('sera')
  const [pagTrova, setPagTrova] = useState(1)
  const cf = useColFilters()

  const centro = CITTA_RETE.find(c => c.nome === vicino)
  const righeTrova = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    const base = rete
      .map(t => ({
        ...t,
        km: centro ? distanzaKm(centro, t) : 0,
        prezzo: t.fasce.includes(fasciaPrezzo) ? prezzoSibylla(t, fasciaPrezzo, oggi).prezzo : 0,
        destLbl: destinazioneLbl(t.destinazione),
      }))
      .filter(t =>
        (!q || `${t.luogo} ${t.nome} ${t.citta} ${t.regione} ${t.proprietario}`.toLowerCase().includes(q)) &&
        (!regione || t.regione === regione) &&
        (!centro || t.km <= raggio) &&
        (!dest.length || dest.includes(t.destinazione)) &&
        cf.matchMulti(t.citta, 'citta') && cf.matchMulti(t.destLbl, 'destLbl'))
    const ordinate = cf.sort ? cf.sortRows(base) : centro ? [...base].sort((a, b) => a.km - b.km) : base
    return ordinate
  }, [rete, cerca, regione, centro, raggio, dest, fasciaPrezzo, oggi, cf.multi, cf.sort]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPagTrova(1) }, [cerca, regione, vicino, raggio, dest, cf.multi, cf.sort])
  const pTrova = pagina(righeTrova, pagTrova)
  const filtriAttivi = !!(cerca || regione || vicino || dest.length || cf.hasActive)
  const azzera = () => { setCerca(''); setRegione(''); setVicino(''); setDest([]); cf.reset() }

  // Segnaposto raggruppati per città (con il numero di totem trovati).
  const punti = useMemo(() => {
    const m = new Map<string, TotemRete[]>()
    righeTrova.forEach(t => m.set(t.citta, [...(m.get(t.citta) ?? []), t]))
    return Array.from(m.entries()).map(([citta, ts]) => ({
      id: citta, lat: ts[0].lat, lng: ts[0].lng, stato: 'online' as const, n: ts.length,
      label: `${citta} · ${ts.length === 1 ? '1 totem' : `${ts.length} totem`}`,
    }))
  }, [righeTrova])
  const cittaNelCarrello = Array.from(new Set(rete.filter(t => carrello.totemIds.includes(t.id)).map(t => t.citta)))

  const nelCarrello = (id: string) => carrello.totemIds.includes(id)
  const toggleCarrello = (id: string) => carrello.set({ totemIds: nelCarrello(id) ? carrello.totemIds.filter(x => x !== id) : [...carrello.totemIds, id] })
  const opz = (vals: string[]) => Array.from(new Set(vals)).sort((a, b) => a.localeCompare(b))

  // ── Campagna ──
  const scelti = rete.filter(t => carrello.totemIds.includes(t.id))
  const spot = progetti.find(p => p.id === carrello.spotId)
  const durataSpot = spot ? durataProgetto(spot) : DURATA_SPAZIO
  const giorni = carrello.dal && carrello.al && carrello.dal <= carrello.al ? giorniTra(carrello.dal, carrello.al) : 0
  const costi = useMemo(() => Object.fromEntries(scelti.map(t => [t.id, costoTotem(t, carrello.fasce, carrello.dal, carrello.al, carrello.passaggi, durataSpot)])),
    [scelti, carrello.fasce, carrello.dal, carrello.al, carrello.passaggi, durataSpot]) // eslint-disable-line react-hooks/exhaustive-deps
  const totale = scelti.reduce((s, t) => s + costi[t.id].importo, 0)
  const contatti = scelti.reduce((s, t) => s + Math.round(t.passaggiGiorno * carrello.fasce.filter(f => t.fasce.includes(f)).reduce((o, f) => o + FASCE.find(x => x.id === f)!.ore, 0) / 24 * giorni), 0)
  const formatoErrato = spot ? scelti.filter(t => t.formato !== (spot.formato ?? 'verticale')) : []
  const conEscluse = scelti.filter(t => costi[t.id].escluse.length > 0)
  const conOccupati = scelti.filter(t => costi[t.id].occupati > 0)
  const vuoti = scelti.filter(t => costi[t.id].slot === 0)
  const valido = scelti.length > 0 && giorni > 0 && carrello.fasce.length > 0 && !!spot && carrello.dal >= oggi && vuoti.length < scelti.length
  const motivoNonValido = !scelti.length ? 'Scegli almeno un totem' : !carrello.fasce.length ? 'Scegli almeno una fascia oraria' : !giorni ? 'Indica il periodo' : carrello.dal < oggi ? 'Il periodo non può iniziare nel passato' : !spot ? 'Scegli lo spot da mandare in onda' : ''
  const toggleFascia = (f: Fascia) => carrello.set({ fasce: carrello.fasce.includes(f) ? carrello.fasce.filter(x => x !== f) : [...carrello.fasce, f] })

  const invia = () => {
    if (!valido || !spot) return
    const righe = scelti.filter(t => costi[t.id].slot > 0).map(t => ({
      totemId: t.id, progettoId: spot.id, dal: carrello.dal, al: carrello.al,
      fasce: carrello.fasce.filter(f => t.fasce.includes(f)), passaggiOra: carrello.passaggi, importo: costi[t.id].importo,
    }))
    const ids = acquistaSpazi(righe)
    toast.success(`Richiesta inviata a ${righe.length === 1 ? '1 proprietario' : `${righe.length} proprietari`} per ${eurT(righe.reduce((s, r) => s + r.importo, 0))}. Paghi solo gli spazi approvati.`, 'Acquista spazi')
    carrello.set({ totemIds: [] })
    setVista('acquisti')
    // Demo: i proprietari rispondono dopo qualche secondo.
    ids.forEach((id, i) => window.setTimeout(() => {
      const a = useTotemStore.getState().acquisti.find(x => x.id === id)
      if (!a || a.stato !== 'In revisione') return
      aggiornaAcquisto(id, { stato: 'Approvato' })
      const t = rete.find(x => x.id === a.totemId)
      toast.success(`${t?.proprietario ?? 'Il proprietario'} ha approvato lo spazio su ${t?.luogo ?? 'il totem'}: lo spot andrà in onda dal ${fmtT(a.dal)}.`, 'Spazio approvato')
    }, 5000 + i * 2500))
  }

  // ── I miei acquisti ──
  const [pagAcq, setPagAcq] = useState(1)
  const righeAcq = useMemo(() => acquisti
    .map(a => ({ ...a, t: rete.find(x => x.id === a.totemId), prog: progetti.find(p => p.id === a.progettoId), vis: statoVis(a, oggi) }))
    .sort((a, b) => b.dal.localeCompare(a.dal)), [acquisti, rete, progetti, oggi])
  const pAcq = pagina(righeAcq, pagAcq)
  const inOnda = righeAcq.filter(a => a.vis === 'In onda').length
  const spesa = righeAcq.filter(a => a.stato === 'Approvato').reduce((s, a) => s + a.importo, 0)
  const annulla = async (a: Acquisto) => {
    const t = rete.find(x => x.id === a.totemId)
    if (!(await confirm({ title: 'Annulla richiesta', message: <>Vuoi ritirare la richiesta per lo spazio su <strong>{t?.luogo}</strong> dal {fmtT(a.dal)} al {fmtT(a.al)}? Non ti verrà addebitato nulla.</>, confirmLabel: 'Annulla richiesta', danger: true }))) return
    annullaAcquisto(a.id)
    toast.info('Richiesta ritirata.', 'Acquista spazi')
  }

  const prezzoTip = (t: TotemRete, f: Fascia, iso: string) => {
    const p = prezzoSibylla(t, f, iso)
    return <FattoriPrezzo fattori={p.fattori} prezzo={p.prezzo} titolo={`${t.luogo} · ${FASCE.find(x => x.id === f)!.label.toLowerCase()} del ${fmtT(iso)}`} />
  }

  return (
    <div className="acs">
      <PageHead
        title="Acquista spazi"
        subtitle="Non hai totem? Manda in onda i tuoi spot sugli schermi della rete Sibylla, scegliendo dove, quando e a chi parlare"
        actions={<button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('totem-editor')}><i className="fa-solid fa-pen-ruler" aria-hidden="true" /> Editor palinsesti</button>}
      />

      <Tabs
        className="acs__tabs"
        active={vista}
        onChange={id => setVista(id as Vista)}
        tabs={[
          { id: 'trova', label: `Trova spazi · ${rete.length}` },
          { id: 'campagna', label: `La tua campagna · ${scelti.length}` },
          { id: 'acquisti', label: `I miei acquisti · ${acquisti.length}` },
        ]}
      />

      {/* ── Trova spazi ── */}
      {vista === 'trova' && (
        <>
          <div className="acs__filters">
            <SearchField name="acs-cerca" placeholder="Cerca luogo, città o proprietario…" value={cerca} onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} />
            <SelectField name="acs-regione" label="Regione" value={regione} onChange={e => setRegione(e.target.value)}
              options={[{ value: '', label: 'Tutta Italia' }, ...opz(rete.map(t => t.regione)).map(r => ({ value: r, label: r }))]} />
            <SelectField name="acs-vicino" label="Vicino a" value={vicino} onChange={e => setVicino(e.target.value)}
              options={[{ value: '', label: 'Qualsiasi posizione' }, ...CITTA_RETE.map(c => ({ value: c.nome, label: c.nome }))]} />
            <SelectField name="acs-raggio" label="Raggio" value={raggio} disabled={!vicino} onChange={e => setRaggio(Number(e.target.value))}
              options={RAGGI.map(r => ({ value: r, label: `entro ${r} km` }))} />
            <SelectField name="acs-fascia" label="Prezzo per la fascia" value={fasciaPrezzo} onChange={e => setFasciaPrezzo(e.target.value as Fascia)}
              options={FASCE.map(f => ({ value: f.id, label: `${f.label} (${f.orario})` }))} />
          </div>
          <div className="acs__dest" role="group" aria-label="Destinazione">
            <span className="acs__lbl">Destinazione</span>
            {DESTINAZIONI.map(d => (
              <button key={d.id} type="button" aria-pressed={dest.includes(d.id)} className={clsx('acs__dest-btn', dest.includes(d.id) && 'acs__dest-btn--on')}
                onClick={() => setDest(dest.includes(d.id) ? dest.filter(x => x !== d.id) : [...dest, d.id])}>
                <i className={`fa-solid ${d.icona}`} aria-hidden="true" />{d.label}
              </button>
            ))}
            {filtriAttivi && <button type="button" className="acs__link" onClick={azzera}><i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" /> Azzera filtri</button>}
          </div>

          <div className="acs__find">
            <div className="acs__map">
              <ItaliaTotem punti={punti} selezionato={cittaNelCarrello} regione={regione}
                onRegione={r => setRegione(regione === r ? '' : r)}
                onPick={c => { setVicino(c); setRaggio(r => Math.min(r, 25)) }} />
              <span className="acs__map-hint">Clicca una regione per filtrarla o una città per vedere i totem nei dintorni. In oro le città già nella tua campagna.</span>
            </div>

            <div className="acs__results">
              <div className="sib-table-wrap acs__wrap">
                <table className="sib-table acs__table acs__table--trova">
                  <colgroup>
                    <col className="acs__c-totem" /><col className="acs__c-citta" /><col className="acs__c-dest" /><col className="acs__c-pass" />
                    <col className="acs__c-prezzo" /><col className="acs__c-act" />
                  </colgroup>
                  <thead><tr>
                    <th><ThLabel full="Totem" /></th>
                    <th><span className="sib-colf-head"><ThLabel full="Città" />{cf.th('citta', 'Città', { options: opz(rete.map(t => t.citta)) })}</span></th>
                    <th><span className="sib-colf-head"><ThLabel full="Destinazione" short="Dest." />{cf.th('destLbl', 'Destinazione', { options: DESTINAZIONI.map(d => d.label) })}</span></th>
                    <th className="acs__th-num"><span className="sib-colf-head"><ThLabel full="Passaggi/giorno" short="Pass./g" />{cf.th('passaggiGiorno', 'Passaggi/giorno', { sort: true })}</span></th>
                    <th className="acs__th-num"><span className="sib-colf-head"><ThLabel full="Prezzo oggi" short="Prezzo" />{cf.th('prezzo', 'Prezzo oggi', { sort: true })}</span></th>
                    <th className="acs__c"><ThLabel full="Campagna" short="Camp." /></th>
                  </tr></thead>
                  <tbody>
                    {pTrova.righe.map(t => {
                      const on = nelCarrello(t.id)
                      const d = DESTINAZIONI.find(x => x.id === t.destinazione)!
                      return (
                        <tr key={t.id} className={clsx(on && 'acs__row--on')}>
                          <td>
                            <TruncatedText text={`${t.luogo} · ${t.nome}`} className="acs__strong" />
                            <span className="acs__totem-sub">
                              <Tooltip text={`Schermo ${t.formato}${t.touch ? ', touch' : ''} · ${t.modello}`}>
                                <span className="acs__form"><i className={`fa-solid ${t.formato === 'verticale' ? 'fa-mobile-screen' : 'fa-tv'}`} aria-label={t.formato} />{t.touch && <i className="fa-solid fa-hand-pointer" aria-label="touch" />}</span>
                              </Tooltip>
                              <TruncatedText text={t.proprietario} className="acs__sub" />
                            </span>
                          </td>
                          <td><TruncatedText text={t.citta} /><span className="acs__sub">{centro ? `${fmtN(t.km)} km da ${centro.nome}` : t.regione}</span></td>
                          <td><span className="acs__dest-cell"><Tooltip text={d.label}><i className={`fa-solid ${d.icona}`} aria-label={d.label} /></Tooltip><TruncatedText text={d.label} /></span></td>
                          <td className="acs__r">{fmtN(t.passaggiGiorno)}</td>
                          <td className="acs__r">
                            {t.prezzo
                              ? <Tooltip content={prezzoTip(t, fasciaPrezzo, oggi)}><span className="acs__price" tabIndex={0}>{eurT(t.prezzo)}<i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /></span></Tooltip>
                              : <Tooltip text={`Fascia ${fasciaPrezzo} non in vendita su questo totem`}><span className="acs__sub">non in vendita</span></Tooltip>}
                          </td>
                          <td className="acs__c">
                            <Tooltip text={on ? 'Togli dalla campagna' : 'Aggiungi alla campagna'}>
                              <button type="button" className={clsx('acs__act', on && 'acs__act--on')} aria-label={on ? 'Togli dalla campagna' : 'Aggiungi alla campagna'} aria-pressed={on} onClick={() => toggleCarrello(t.id)}>
                                <i className={`fa-solid ${on ? 'fa-circle-check' : 'fa-cart-plus'}`} aria-hidden="true" />
                              </button>
                            </Tooltip>
                          </td>
                        </tr>
                      )
                    })}
                    {!pTrova.righe.length && <tr><td colSpan={6} className="acs__empty">Nessun totem con questi filtri. Prova ad allargare il raggio o a togliere qualche destinazione.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="acs__pagination"><Pagination page={pTrova.corrente} totalPages={pTrova.totali} onPageChange={setPagTrova} /></div>
              <p className="acs__note">
                <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />
                {righeTrova.length === 1 ? '1 totem trovato' : `${righeTrova.length} totem trovati`}. Il prezzo è quello di oggi per uno spot di {DURATA_SPAZIO} s fino a {PASSAGGI_BASE} passaggi l'ora:
                lo calcola Sibylla in base a posizione, orario e destinazione. Passa sul prezzo per vedere come è composto.
              </p>
            </div>
          </div>

          {scelti.length > 0 && (
            <div className="acs__bar">
              <span><strong>{scelti.length === 1 ? '1 totem' : `${scelti.length} totem`}</strong> nella campagna · {Array.from(new Set(scelti.map(t => t.citta))).join(', ')}</span>
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => setVista('campagna')}>Componi la campagna <i className="fa-solid fa-arrow-right" aria-hidden="true" /></button>
            </div>
          )}
        </>
      )}

      {/* ── La tua campagna ── */}
      {vista === 'campagna' && (
        <div className="acs__layout">
          <div className="acs__steps">
            <section className="acs__card">
              <div className="acs__step-row">
                <h2 className="acs__step"><span>1</span>Dove</h2>
                <button type="button" className="acs__link" onClick={() => setVista('trova')}><i className="fa-solid fa-plus" aria-hidden="true" /> Aggiungi altri totem</button>
              </div>
              {scelti.length === 0 ? (
                <div className="acs__empty-box">
                  <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
                  <span>Nessun totem scelto. Cercali sulla mappa per posizione e destinazione.</span>
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setVista('trova')}>Trova spazi</button>
                </div>
              ) : (
                <div className="sib-table-wrap acs__wrap">
                  <table className="sib-table acs__table acs__table--camp">
                    <colgroup><col className="acs__c-totem" /><col className="acs__c-dest" /><col className="acs__c-fasce" /><col className="acs__c-prezzo" /><col className="acs__c-act" /></colgroup>
                    <thead><tr>
                      <th><ThLabel full="Totem" /></th>
                      <th><ThLabel full="Destinazione" short="Dest." /></th>
                      <th><ThLabel full="Fasce acquistate" short="Fasce" /></th>
                      <th className="acs__r"><ThLabel full="Costo nel periodo" short="Costo" /></th>
                      <th className="acs__c"><ThLabel full="Togli" /></th>
                    </tr></thead>
                    <tbody>
                      {scelti.map(t => {
                        const c = costi[t.id]
                        const d = DESTINAZIONI.find(x => x.id === t.destinazione)!
                        const fascePrese = carrello.fasce.filter(f => t.fasce.includes(f))
                        return (
                          <tr key={t.id}>
                            <td><TruncatedText text={`${t.luogo} · ${t.nome}`} className="acs__strong" /><span className="acs__sub">{t.citta} · {fmtN(t.passaggiGiorno)} passaggi/giorno</span></td>
                            <td><span className="acs__dest-cell"><i className={`fa-solid ${d.icona}`} aria-hidden="true" /><TruncatedText text={d.label} /></span></td>
                            <td>
                              <span className="acs__fasce-cell">
                                {fascePrese.length ? fascePrese.map(f => <Tooltip key={f} text={FASCE.find(x => x.id === f)!.label}><i className={`fa-solid ${ICO_FASCIA[f]}`} aria-label={f} /></Tooltip>) : <span className="acs__sub">nessuna</span>}
                                {c.escluse.length > 0 && <Tooltip text={`Non in vendita: ${c.escluse.join(', ')}`}><i className="fa-solid fa-circle-minus acs__warn" aria-label="Fasce non in vendita" /></Tooltip>}
                                {c.occupati > 0 && <Tooltip text={`${c.occupati} ${c.occupati === 1 ? 'spazio già venduto' : 'spazi già venduti'} nel periodo: non li paghi`}><i className="fa-solid fa-calendar-xmark acs__warn" aria-label="Spazi già venduti" /></Tooltip>}
                              </span>
                            </td>
                            <td className="acs__r">
                              {fascePrese[0] && giorni > 0
                                ? <Tooltip content={prezzoTip(t, fascePrese[0], carrello.dal)}><span className="acs__price acs__strong" tabIndex={0}>{eurT(c.importo)}<i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /></span></Tooltip>
                                : <span className="acs__sub">-</span>}
                            </td>
                            <td className="acs__c">
                              <Tooltip text="Togli dalla campagna">
                                <button type="button" className="acs__act" aria-label="Togli dalla campagna" onClick={() => toggleCarrello(t.id)}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
                              </Tooltip>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="acs__card">
              <h2 className="acs__step"><span>2</span>Quando e quanto spesso</h2>
              <div className="acs__when">
                <DateRangeField label="Periodo" nameFrom="acs-dal" nameTo="acs-al" valueFrom={carrello.dal} valueTo={carrello.al}
                  onChangeFrom={e => carrello.set({ dal: e.target.value })} onChangeTo={e => carrello.set({ al: e.target.value })} />
                <RangeField name="acs-passaggi" label="Passaggi all'ora" value={carrello.passaggi} min={2} max={12} step={1} hideReset
                  valueLabel={`${carrello.passaggi} volte l'ora${carrello.passaggi > PASSAGGI_BASE ? ` · prezzo ×${(carrello.passaggi / PASSAGGI_BASE).toLocaleString('it-IT', { maximumFractionDigits: 2 })}` : ' · compresi nel prezzo'}`}
                  onChange={v => carrello.set({ passaggi: v })} />
                <div className="acs__field acs__field--wide">
                  <span className="acs__lbl">Fasce orarie</span>
                  <div className="acs__fasce">
                    {FASCE.map(f => (
                      <button key={f.id} type="button" aria-pressed={carrello.fasce.includes(f.id)} className={clsx('acs__fascia', carrello.fasce.includes(f.id) && 'acs__fascia--on')} onClick={() => toggleFascia(f.id)}>
                        <i className={`fa-solid ${ICO_FASCIA[f.id]}`} aria-hidden="true" />
                        <strong>{f.label}</strong><span>{f.orario}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="acs__card">
              <h2 className="acs__step"><span>3</span>Cosa trasmetti</h2>
              <div className="acs__spots">
                {progetti.map(p => (
                  <span key={p.id} className={clsx('acs__spot', p.id === carrello.spotId && 'acs__spot--on')}>
                    <button type="button" className="acs__spot-pick" onClick={() => carrello.set({ spotId: p.id })} aria-pressed={p.id === carrello.spotId}>
                      <span className="acs__spot-thumb">{p.slides[0] && <SlideView slide={p.slides[0]} formato={p.formato} />}</span>
                      <span className="acs__spot-txt">
                        <TruncatedText text={p.nome} className="acs__strong" />
                        <span className="acs__sub">{p.formato === 'orizzontale' ? 'Orizzontale' : 'Verticale'} · {durataProgetto(p)} s</span>
                      </span>
                    </button>
                    <Tooltip text="Modifica nell'Editor palinsesti">
                      <button type="button" className="acs__act acs__spot-edit" aria-label={`Modifica ${p.nome}`} onClick={() => { carrello.set({ spotId: p.id }); navigate(`totem-editor:${p.id}:acquista`) }}>
                        <i className="fa-solid fa-pen" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </span>
                ))}
                <button type="button" className="acs__spot acs__spot--new" onClick={() => navigate('totem-editor:nuovo:acquista')}>
                  <i className="fa-solid fa-plus" aria-hidden="true" /><span>Crea un nuovo spot</span>
                </button>
              </div>
            </section>
          </div>

          <aside className="acs__summary">
            <TotemFrame orizzontale={spot?.formato === 'orizzontale'} caption={spot ? `${spot.nome} · ${durataSpot} s` : 'Scegli uno spot'}><SpotPlayer progetto={spot} /></TotemFrame>
            <dl className="acs__kpi">
              <div><dt>Totem</dt><dd>{scelti.length}</dd></div>
              <div><dt>Giorni</dt><dd>{giorni}</dd></div>
              <div><dt>Contatti stimati</dt><dd>{fmtN(contatti)}</dd></div>
              <div><dt>Costo per contatto</dt><dd>{contatti ? eurT(Math.round((totale / contatti) * 1000) / 1000) : '-'}</dd></div>
            </dl>
            <div className="acs__total">
              <span>Totale campagna</span>
              <strong>{eurT(totale)}</strong>
            </div>
            <ul className="acs__checks">
              <li className="acs__check--ok"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" />Prezzi Sibylla giorno per giorno: posizione, orario, destinazione, traffico e stagione</li>
              {durataSpot > DURATA_SPAZIO && <li className="acs__check--ko"><i className="fa-solid fa-stopwatch" aria-hidden="true" />Lo spot dura {durataSpot} s: occupa {Math.ceil(durataSpot / DURATA_SPAZIO)} spazi da {DURATA_SPAZIO} s</li>}
              {formatoErrato.length > 0 && <li className="acs__check--ko"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />{formatoErrato.length === 1 ? '1 totem ha' : `${formatoErrato.length} totem hanno`} lo schermo {spot?.formato === 'orizzontale' ? 'verticale' : 'orizzontale'}: lo spot verrà adattato con le bande</li>}
              {conEscluse.length > 0 && <li className="acs__check--info"><i className="fa-solid fa-circle-minus" aria-hidden="true" />Su {conEscluse.length === 1 ? '1 totem' : `${conEscluse.length} totem`} alcune fasce non sono in vendita: non le paghi</li>}
              {conOccupati.length > 0 && <li className="acs__check--info"><i className="fa-solid fa-calendar-xmark" aria-hidden="true" />Su {conOccupati.length === 1 ? '1 totem' : `${conOccupati.length} totem`} qualche giorno è già venduto: è escluso dal prezzo</li>}
              <li className="acs__check--ok"><i className="fa-solid fa-shield-halved" aria-hidden="true" />Ogni proprietario approva lo spazio entro 48 ore: paghi solo quelli approvati</li>
            </ul>
            <button type="button" className="sib-btn sib-btn--primary acs__go" disabled={!valido} onClick={invia}>
              <i className="fa-solid fa-paper-plane" aria-hidden="true" /> Invia la richiesta d'acquisto
            </button>
            {!valido && motivoNonValido && <span className="acs__sub acs__go-hint">{motivoNonValido}</span>}
          </aside>
        </div>
      )}

      {/* ── I miei acquisti ── */}
      {vista === 'acquisti' && (
        <section className="acs__list">
          <div className="sib-table-wrap acs__wrap">
            <table className="sib-table acs__table acs__table--acq">
              <colgroup><col className="acs__c-spot" /><col className="acs__c-totem" /><col className="acs__c-per" /><col className="acs__c-fasce" /><col className="acs__c-prezzo" /><col className="acs__c-stato" /><col className="acs__c-azioni" /></colgroup>
              <thead><tr>
                <th><ThLabel full="Spot" /></th>
                <th><ThLabel full="Totem" /></th>
                <th><ThLabel full="Periodo" /></th>
                <th><ThLabel full="Fasce orarie" short="Fasce" /></th>
                <th className="acs__r"><ThLabel full="Importo" /></th>
                <th><ThLabel full="Stato" /></th>
                <th className="acs__c"><ThLabel full="Azioni" /></th>
              </tr></thead>
              <tbody>
                {pAcq.righe.map(a => (
                  <tr key={a.id}>
                    <td>
                      <span className="acs__cell-spot">
                        <span className="acs__mini">{a.prog?.slides[0] && <SlideView slide={a.prog.slides[0]} formato={a.prog.formato} />}</span>
                        <TruncatedText text={a.prog?.nome ?? 'Spot eliminato'} className="acs__strong" />
                      </span>
                    </td>
                    <td><TruncatedText text={a.t ? `${a.t.luogo} · ${a.t.citta}` : '-'} className="acs__strong" /><TruncatedText text={a.t?.proprietario ?? ''} className="acs__sub" /></td>
                    <td><TruncatedText text={`${fmtT(a.dal).slice(0, 5)} → ${fmtT(a.al)}`} /><span className="acs__sub">{giorniTra(a.dal, a.al)} giorni</span></td>
                    <td>
                      <span className="acs__fasce-cell">
                        {a.fasce.map(f => <Tooltip key={f} text={FASCE.find(x => x.id === f)!.label}><i className={`fa-solid ${ICO_FASCIA[f]}`} aria-label={f} /></Tooltip>)}
                        <span className="acs__sub">{a.passaggiOra}/h</span>
                      </span>
                    </td>
                    <td className="acs__r"><span className="acs__amount">{eurT(a.importo)}</span></td>
                    <td>
                      {a.vis === 'Rifiutato' && a.motivo
                        ? <Tooltip text={a.motivo}><span className={`acs__st acs__st--${STATO_CLS[a.vis]}`}>{a.vis} <i className="fa-solid fa-circle-info" aria-hidden="true" /></span></Tooltip>
                        : <span className={`acs__st acs__st--${STATO_CLS[a.vis]}`}>{a.vis}</span>}
                    </td>
                    <td className="acs__c">
                      <span className="acs__acts">
                        {a.prog && a.vis !== 'Concluso' && a.vis !== 'Rifiutato' && (
                          <Tooltip text="Modifica lo spot">
                            <button type="button" className="acs__act" aria-label="Modifica lo spot" onClick={() => navigate(`totem-editor:${a.progettoId}:acquista`)}><i className="fa-solid fa-pen-ruler" aria-hidden="true" /></button>
                          </Tooltip>
                        )}
                        {a.vis === 'Rifiutato' && a.t && (
                          <Tooltip text="Cerca spazi simili">
                            <button type="button" className="acs__act" aria-label="Cerca spazi simili" onClick={() => { setVicino(a.t!.citta); setRaggio(50); setDest([a.t!.destinazione]); setVista('trova') }}><i className="fa-solid fa-magnifying-glass-location" aria-hidden="true" /></button>
                          </Tooltip>
                        )}
                        {a.stato === 'In revisione' && (
                          <Tooltip text="Annulla la richiesta">
                            <button type="button" className="acs__act" aria-label="Annulla la richiesta" onClick={() => annulla(a)}><i className="fa-solid fa-trash" aria-hidden="true" /></button>
                          </Tooltip>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
                {!pAcq.righe.length && <tr><td colSpan={7} className="acs__empty">Non hai ancora acquistato spazi.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="acs__pagination"><Pagination page={pAcq.corrente} totalPages={pAcq.totali} onPageChange={setPagAcq} /></div>
          <p className="acs__note">
            <i className="fa-solid fa-tower-broadcast" aria-hidden="true" />
            {inOnda === 1 ? '1 spot in onda' : `${inOnda} spot in onda`} · {eurT(spesa)} di spazi approvati. L'addebito avviene all'approvazione del proprietario; le richieste in revisione si possono ritirare.
          </p>
        </section>
      )}
    </div>
  )
}
