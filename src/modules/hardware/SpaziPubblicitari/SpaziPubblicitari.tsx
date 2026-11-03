import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../core/components/PageHead'
import Modal from '../../../core/components/Modal'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import { TextareaField, ToggleSwitch } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { CreativitaView } from '../_shared/SpotPlayer'
import {
  useTotemStore, FASCE, QUOTA_PROPRIETARIO, oggiT, giornoT, fmtT, giorniTra, eurT, etichettaTotem, fasciaLbl, saturazione,
  type Inserzione,
} from '../../../store/useTotemStore'
import './SpaziPubblicitari.sass'

/**
 * Spazi pubblicitari — Dispositivi › Totem.
 * Il proprietario mette in vendita gli spazi dei suoi totem agli inserzionisti
 * del circuito Sibylla: approva le richieste (con la valutazione di Sibylla su
 * concorrenza, settore e affollamento), segue le inserzioni e i ricavi che gli
 * spettano. Il calendario dei giorni in vendita è nella scheda di ogni totem.
 */

type Vista = 'richieste' | 'inserzioni' | 'ricavi' | 'totem'
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const SETTORI_SENSIBILI = ['Gioco']

interface Valutazione { livello: 'ok' | 'warn' | 'ko'; motivi: { l: 'ok' | 'warn' | 'ko'; t: string }[] }

export default function SpaziPubblicitari({ navigate }: { navigate: (p: string) => void }) {
  const { totem, progetti, trasmissioni, inserzioni, decidiInserzione, aggiornaTotem } = useTotemStore()
  const [vista, setVista] = useState<Vista>('richieste')
  const [rifiuto, setRifiuto] = useState<{ x: Inserzione; motivo: string } | null>(null)
  const oggi = oggiT()

  const daApprovare = inserzioni.filter(x => x.stato === 'Da approvare')
  const quota = (x: Inserzione) => x.importo * QUOTA_PROPRIETARIO

  const valuta = (x: Inserzione): Valutazione => {
    const motivi: Valutazione['motivi'] = []
    if (SETTORI_SENSIBILI.includes(x.settore)) motivi.push({ l: 'ko', t: `Settore «${x.settore}»: non adatto agli ospiti della struttura` })
    const sat = saturazione(trasmissioni, inserzioni, progetti, x.totemId, x.dal, x.fascia)
    if (sat + Math.round((x.passaggiOra * 15 / 3600) * 100) > 100) motivi.push({ l: 'warn', t: `Fascia ${fasciaLbl(x.fascia).toLowerCase()} già piena al ${sat}%: i tuoi spot passerebbero meno spesso` })
    else motivi.push({ l: 'ok', t: `Spazio libero: la fascia è occupata al ${sat}%` })
    const concorre = x.settore === 'Ristorazione' && trasmissioni.some(t => t.totemIds.includes(x.totemId) && t.progettoId === 'pr-cena' && t.al >= x.dal)
    if (concorre) motivi.push({ l: 'warn', t: 'Fa concorrenza al tuo spot «Cena gourmet in terrazza» sullo stesso totem' })
    const t = totem.find(y => y.id === x.totemId)
    if (t) {
      const listino = t.prezzi[x.fascia] * giorniTra(x.dal, x.al)
      motivi.push(x.importo >= listino ? { l: 'ok', t: `Offerta in linea con il tuo listino (${eurT(listino)})` } : { l: 'warn', t: `Offerta sotto listino di ${eurT(listino - x.importo)}` })
    }
    const livello = motivi.some(m => m.l === 'ko') ? 'ko' : motivi.some(m => m.l === 'warn') ? 'warn' : 'ok'
    return { livello, motivi }
  }

  const approva = (x: Inserzione) => {
    decidiInserzione(x.id, 'Approvata')
    toast.success(`Inserzione di ${x.inserzionista} approvata: ti spettano ${eurT(quota(x))}.`, 'Spazi pubblicitari')
  }
  const confermaRifiuto = () => {
    if (!rifiuto?.motivo.trim()) return
    decidiInserzione(rifiuto.x.id, 'Rifiutata', rifiuto.motivo.trim())
    toast.info(`Richiesta di ${rifiuto.x.inserzionista} rifiutata.`, 'Spazi pubblicitari')
    setRifiuto(null)
  }

  // ── Ricavi per mese (quota del proprietario, ripartita sui giorni) ──
  const ricavi = useMemo(() => {
    const mesi = Array.from({ length: 6 }, (_, k) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 4 + k); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
    const per = Object.fromEntries(mesi.map(m => [m, 0])) as Record<string, number>
    inserzioni.filter(x => x.stato === 'Approvata').forEach(x => {
      const gg = giorniTra(x.dal, x.al), alGiorno = quota(x) / gg
      for (let d = new Date(`${x.dal}T12:00:00`), i = 0; i < gg; i++, d.setDate(d.getDate() + 1)) {
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (k in per) per[k] += alGiorno
      }
    })
    return mesi.map(m => ({ mese: m, valore: Math.round(per[m]) }))
  }, [inserzioni]) // eslint-disable-line react-hooks/exhaustive-deps
  const meseCorrente = oggi.slice(0, 7)
  const totAnno = ricavi.reduce((s, r) => s + r.valore, 0)

  const inserzioniRighe = inserzioni.filter(x => x.stato !== 'Da approvare').sort((a, b) => b.dal.localeCompare(a.dal))
  const statoIns = (x: Inserzione) => x.stato === 'Rifiutata' ? 'Rifiutata' : x.al < oggi ? 'Conclusa' : x.dal > oggi ? 'In arrivo' : 'In onda'

  return (
    <div className="spp">
      <PageHead
        title="Spazi pubblicitari"
        subtitle="Metti in vendita gli spazi dei tuoi totem agli inserzionisti e ricevi un compenso per ogni passaggio"
        actions={<button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('i-miei-totem')}><i className="fa-solid fa-display" aria-hidden="true" /> I miei totem</button>}
      />

      <div className="spp__tabs" role="tablist">
        {([
          ['richieste', 'Richieste da approvare', daApprovare.length],
          ['inserzioni', 'Inserzioni', inserzioniRighe.length],
          ['ricavi', 'Ricavi', null],
          ['totem', 'Totem in vendita', totem.filter(t => t.inVendita).length],
        ] as [Vista, string, number | null][]).map(([id, lbl, n]) => (
          <button key={id} type="button" role="tab" aria-selected={vista === id} className={clsx('spp__tab', vista === id && 'spp__tab--on')} onClick={() => setVista(id)}>
            {lbl}{n != null && <span className={clsx(id === 'richieste' && n > 0 && 'spp__tab-hot')}>{n}</span>}
          </button>
        ))}
      </div>

      {/* ── Richieste ── */}
      {vista === 'richieste' && (
        daApprovare.length === 0 ? <div className="spp__empty"><i className="fa-solid fa-inbox" aria-hidden="true" />Nessuna richiesta in attesa.</div> : (
          <div className="spp__reqs">
            {daApprovare.map(x => {
              const t = totem.find(y => y.id === x.totemId)
              const v = valuta(x)
              return (
                <article key={x.id} className="spp__req">
                  <span className="spp__req-prev"><CreativitaView c={x.creativita} /></span>
                  <div className="spp__req-body">
                    <header className="spp__req-head">
                      <span>
                        <strong className="spp__req-name">{x.inserzionista}</strong>
                        <span className="spp__tag">{x.settore}</span>
                      </span>
                      <span className={`spp__val spp__val--${v.livello}`}>
                        <i className={`fa-solid ${v.livello === 'ok' ? 'fa-circle-check' : v.livello === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}`} aria-hidden="true" />
                        {v.livello === 'ok' ? 'Consigliata' : v.livello === 'warn' ? 'Da valutare' : 'Sconsigliata'}
                      </span>
                    </header>
                    <dl className="spp__req-dl">
                      <div><dt>Totem</dt><dd>{t ? `${etichettaTotem(t)} · ${t.citta}` : '—'}</dd></div>
                      <div><dt>Periodo</dt><dd>{fmtT(x.dal)} → {fmtT(x.al)} ({giorniTra(x.dal, x.al)} gg)</dd></div>
                      <div><dt>Fascia</dt><dd>{fasciaLbl(x.fascia)} · {x.passaggiOra} passaggi/ora</dd></div>
                      <div><dt>Ti spettano</dt><dd className="spp__money">{eurT(quota(x))} <small>su {eurT(x.importo)}</small></dd></div>
                    </dl>
                    <ul className="spp__motivi">
                      {v.motivi.map((m, i) => <li key={i} className={`spp__m--${m.l}`}><i className={`fa-solid ${m.l === 'ok' ? 'fa-circle-check' : m.l === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-xmark'}`} aria-hidden="true" />{m.t}</li>)}
                    </ul>
                    <footer className="spp__req-acts">
                      <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setRifiuto({ x, motivo: v.livello === 'ko' ? v.motivi.find(m => m.l === 'ko')!.t : '' })}>Rifiuta</button>
                      <button type="button" className="sib-btn sib-btn--primary" onClick={() => approva(x)}><i className="fa-solid fa-check" aria-hidden="true" /> Approva</button>
                    </footer>
                  </div>
                </article>
              )
            })}
          </div>
        )
      )}

      {/* ── Inserzioni ── */}
      {vista === 'inserzioni' && (
        <div className="sib-table-wrap spp__wrap">
          <table className="sib-table spp__table">
            <colgroup><col className="spp__c-ins" /><col className="spp__c-tot" /><col className="spp__c-per" /><col className="spp__c-fa" /><col className="spp__c-imp" /><col className="spp__c-quota" /><col className="spp__c-st" /></colgroup>
            <thead><tr>
              <th><ThLabel full="Inserzionista" /></th><th><ThLabel full="Totem" /></th><th><ThLabel full="Periodo" /></th><th><ThLabel full="Fascia" /></th>
              <th className="spp__r"><ThLabel full="Importo" /></th><th className="spp__r"><ThLabel full="Tua quota" short="Quota" /></th><th><ThLabel full="Stato" /></th>
            </tr></thead>
            <tbody>
              {inserzioniRighe.map(x => {
                const t = totem.find(y => y.id === x.totemId)
                const st = statoIns(x)
                return (
                  <tr key={x.id}>
                    <td><TruncatedText text={x.inserzionista} className="spp__strong" /><span className="spp__sub">{x.settore}</span></td>
                    <td><TruncatedText text={t ? `${t.citta} · ${t.luogo}` : '—'} /></td>
                    <td><TruncatedText text={`${fmtT(x.dal).slice(0, 5)} → ${fmtT(x.al)}`} /></td>
                    <td>{fasciaLbl(x.fascia)}</td>
                    <td className="spp__r">{eurT(x.importo)}</td>
                    <td className="spp__r spp__strong">{x.stato === 'Approvata' ? eurT(quota(x)) : '-'}</td>
                    <td>
                      {x.stato === 'Rifiutata' && x.motivo
                        ? <Tooltip text={x.motivo}><span className="spp__st spp__st--ko">Rifiutata <i className="fa-solid fa-circle-info" aria-hidden="true" /></span></Tooltip>
                        : <span className={`spp__st spp__st--${st === 'In onda' ? 'live' : st === 'In arrivo' ? 'plan' : 'done'}`}>{st}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Ricavi ── */}
      {vista === 'ricavi' && (
        <div className="spp__ricavi">
          <div className="sib-table-wrap spp__wrap">
            <table className="sib-table spp__table">
              <colgroup><col className="spp__c-mese" /><col className="spp__c-val" /></colgroup>
              <thead><tr><th><ThLabel full="Mese" /></th><th className="spp__r"><ThLabel full="Ricavo che ti spetta" short="Ricavo" /></th></tr></thead>
              <tbody>
                {ricavi.map(r => {
                  const [y, m] = r.mese.split('-').map(Number)
                  return (
                    <tr key={r.mese} className={clsx(r.mese === meseCorrente && 'spp__row--cur')}>
                      <td>{MESI[m - 1]} {y}{r.mese === meseCorrente && <span className="spp__tag spp__tag--gold">mese in corso</span>}{r.mese > meseCorrente && <span className="spp__tag">già venduto</span>}</td>
                      <td className="spp__r spp__strong">{eurT(r.valore)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="spp__payout">
            <i className="fa-solid fa-building-columns" aria-hidden="true" />
            <span>
              <strong>{eurT(totAnno)}</strong> nei 6 mesi mostrati, al netto della commissione Sibylla del {Math.round((1 - QUOTA_PROPRIETARIO) * 100)}%.
              Il bonifico arriva il 5 di ogni mese per gli incassi del mese precedente.
            </span>
          </div>
        </div>
      )}

      {/* ── Totem in vendita ── */}
      {vista === 'totem' && (
        <div className="sib-table-wrap spp__wrap">
          <table className="sib-table spp__table">
            <colgroup><col className="spp__c-tt" /><col className="spp__c-on" />{FASCE.map(f => <col key={f.id} className="spp__c-pr" />)}<col className="spp__c-gg" /><col className="spp__c-cal" /></colgroup>
            <thead><tr>
              <th><ThLabel full="Totem" /></th><th className="spp__c"><ThLabel full="In vendita" /></th>
              {FASCE.map(f => <th key={f.id} className="spp__r"><ThLabel full={f.label} short={f.label.slice(0, 4) + '.'} /></th>)}
              <th className="spp__r"><ThLabel full="Giorni liberi (30 gg)" short="Liberi 30 gg" /></th><th className="spp__c"><ThLabel full="Calendario" short="Cal." /></th>
            </tr></thead>
            <tbody>
              {totem.map(t => {
                const fine = giornoT(30)
                const liberi = FASCE.reduce((s, f) => s + t.calendario[f.id].filter(g => g >= oggi && g <= fine).length, 0)
                return (
                  <tr key={t.id}>
                    <td><TruncatedText text={etichettaTotem(t)} className="spp__strong" /><span className="spp__sub">{t.citta}</span></td>
                    <td className="spp__c"><span className="spp__toggle"><ToggleSwitch checked={t.inVendita} onChange={v => aggiornaTotem(t.id, { inVendita: v })} /></span></td>
                    {FASCE.map(f => <td key={f.id} className={clsx('spp__r', !t.inVendita && 'spp__dim')}>{eurT(t.prezzi[f.id])}</td>)}
                    <td className={clsx('spp__r', !t.inVendita && 'spp__dim')}>{t.inVendita ? liberi : '-'}</td>
                    <td className="spp__c">
                      <Tooltip text="Giorni e prezzi in vendita">
                        <button type="button" className="spp__act" aria-label="Apri il calendario degli spazi" onClick={() => navigate(`totem-scheda:${t.id}:spazi`)}><i className="fa-solid fa-calendar-days" aria-hidden="true" /></button>
                      </Tooltip>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!rifiuto} onClose={() => setRifiuto(null)} title="Rifiuta richiesta" size="sm">
        {rifiuto && (
          <div className="spp__modal">
            <p className="spp__sub">{rifiuto.x.inserzionista} · {fmtT(rifiuto.x.dal)} → {fmtT(rifiuto.x.al)}</p>
            <TextareaField name="rif-motivo" label="Motivo" required rows={3} value={rifiuto.motivo} hint="Lo riceve l'inserzionista" onChange={e => setRifiuto({ ...rifiuto, motivo: e.target.value })} />
            <div className="spp__modal-acts">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => setRifiuto(null)}>Annulla</button>
              <button type="button" className="sib-btn sib-btn--danger" disabled={!rifiuto.motivo.trim()} onClick={confermaRifiuto}>Rifiuta</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
