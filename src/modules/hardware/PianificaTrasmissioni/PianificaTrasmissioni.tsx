import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import PageHead from '../../../core/components/PageHead'
import Tooltip from '../../../core/components/Tooltip'
import TruncatedText from '../../../core/components/TruncatedText'
import ThLabel from '../../../core/components/ThLabel'
import { DateRangeField, RangeField, RadioGroup, SearchField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../store/useConfirmStore'
import ItaliaTotem from '../_shared/ItaliaTotem'
import SpotPlayer, { SlideView, TotemFrame } from '../_shared/SpotPlayer'
import {
  useTotemStore, FASCE, oggiT, giornoT, fmtT, giorniTra, durataProgetto, contattiStimati, saturazione, etichettaTotem,
  type Fascia, type Trasmissione,
} from '../../../store/useTotemStore'
import './PianificaTrasmissioni.sass'

/**
 * Pianifica trasmissioni — Dispositivi › Totem.
 * Sceglie uno spot dell'Editor palinsesti, i totem della rete (per regione o
 * uno per uno), il periodo, le fasce orarie e quante volte all'ora trasmetterlo.
 * A destra l'anteprima e l'impatto stimato (passaggi, contatti, slot saturi);
 * sotto, le trasmissioni già programmate.
 */

type StatoTr = 'In onda' | 'Programmata' | 'Conclusa' | 'Sospesa'
const statoDi = (t: Trasmissione, oggi: string): StatoTr => t.sospesa ? 'Sospesa' : t.al < oggi ? 'Conclusa' : t.dal > oggi ? 'Programmata' : 'In onda'
const STATO_CLS: Record<StatoTr, string> = { 'In onda': 'live', Programmata: 'plan', Conclusa: 'done', Sospesa: 'pause' }
const fmtN = (n: number) => n.toLocaleString('it-IT')

export default function PianificaTrasmissioni({ navigate, totemId }: { navigate: (p: string) => void; totemId?: string }) {
  const { totem, progetti, trasmissioni, inserzioni, aggiungiTrasmissione, aggiornaTrasmissione, eliminaTrasmissione } = useTotemStore()
  const confirm = useConfirmStore(s => s.confirm)
  const oggi = oggiT()

  const [progId, setProgId] = useState(progetti[0]?.id ?? '')
  const [sel, setSel] = useState<string[]>(() => totemId ? [totemId] : [])
  const [cerca, setCerca] = useState('')
  const [dal, setDal] = useState(giornoT(1))
  const [al, setAl] = useState(giornoT(14))
  const [fasce, setFasce] = useState<Fascia[]>(['pomeriggio', 'sera'])
  const [passaggi, setPassaggi] = useState(6)
  const [priorita, setPriorita] = useState<Trasmissione['priorita']>('normale')
  const [filtro, setFiltro] = useState<StatoTr | 'Tutte'>('Tutte')

  const prog = progetti.find(p => p.id === progId)
  const durata = prog ? durataProgetto(prog) : 0
  const giorni = dal && al && dal <= al ? giorniTra(dal, al) : 0

  const perRegione = useMemo(() => {
    const q = cerca.trim().toLowerCase()
    const m = new Map<string, typeof totem>()
    totem.filter(t => !q || `${t.luogo} ${t.nome} ${t.citta} ${t.regione}`.toLowerCase().includes(q))
      .forEach(t => m.set(t.regione, [...(m.get(t.regione) ?? []), t]))
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [totem, cerca])

  const toggle = (id: string) => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const toggleRegione = (ids: string[]) => setSel(s => ids.every(id => s.includes(id)) ? s.filter(x => !ids.includes(x)) : Array.from(new Set([...s, ...ids])))
  const toggleFascia = (f: Fascia) => setFasce(fs => fs.includes(f) ? fs.filter(x => x !== f) : [...fs, f])

  // ── Impatto stimato ──
  const oreFasce = fasce.reduce((s, f) => s + FASCE.find(x => x.id === f)!.ore, 0)
  const passaggiTot = sel.length * giorni * oreFasce * passaggi
  const contatti = contattiStimati(totem, sel, fasce, giorni)
  const carico = Math.round((passaggi * durata / 3600) * 100)
  const saturi = sel.filter(id => fasce.some(f => saturazione(trasmissioni, inserzioni, progetti, id, dal, f) + carico > 100))
  const venduti = sel.filter(id => inserzioni.some(x => x.stato === 'Approvata' && x.totemId === id && fasce.includes(x.fascia) && x.dal <= al && x.al >= dal))
  const offline = sel.filter(id => totem.find(t => t.id === id)?.stato !== 'online')
  const valido = !!prog && sel.length > 0 && giorni > 0 && fasce.length > 0

  const programma = () => {
    if (!valido || !prog) return
    aggiungiTrasmissione({ progettoId: prog.id, totemIds: sel, dal, al, fasce, passaggiOra: passaggi, priorita })
    toast.success(`«${prog.nome}» programmato su ${sel.length === 1 ? '1 totem' : `${sel.length} totem`} dal ${fmtT(dal)} al ${fmtT(al)}.`, 'Trasmissione programmata')
    setSel(totemId ? [totemId] : [])
  }

  const righe = trasmissioni
    .map(t => ({ ...t, stato: statoDi(t, oggi), prog: progetti.find(p => p.id === t.progettoId) }))
    .filter(t => filtro === 'Tutte' || t.stato === filtro)
    .sort((a, b) => a.dal.localeCompare(b.dal))
  const conta = (s: StatoTr | 'Tutte') => s === 'Tutte' ? trasmissioni.length : trasmissioni.filter(t => statoDi(t, oggi) === s).length

  const elimina = async (t: Trasmissione) => {
    const nome = progetti.find(p => p.id === t.progettoId)?.nome
    if (!(await confirm({ title: 'Elimina trasmissione', message: <>Vuoi togliere <strong>{nome}</strong> dal palinsesto di {t.totemIds.length === 1 ? '1 totem' : `${t.totemIds.length} totem`}?</>, confirmLabel: 'Elimina', danger: true }))) return
    eliminaTrasmissione(t.id)
  }

  return (
    <div className="ptr">
      <PageHead
        title="Pianifica trasmissioni"
        subtitle="Scegli lo spot, i totem e gli orari: Sibylla calcola passaggi, pubblico raggiunto e spazi liberi"
        actions={<button type="button" className="sib-btn sib-btn--secondary" onClick={() => navigate('totem-editor')}><i className="fa-solid fa-pen-ruler" aria-hidden="true" /> Editor palinsesti</button>}
      />

      <div className="ptr__layout">
        <div className="ptr__steps">
          {/* 1 · Spot */}
          <section className="ptr__card">
            <h2 className="ptr__step"><span>1</span>Cosa trasmetti</h2>
            <div className="ptr__spots">
              {progetti.map(p => (
                <button key={p.id} type="button" className={clsx('ptr__spot', p.id === progId && 'ptr__spot--on')} onClick={() => setProgId(p.id)}>
                  <span className="ptr__spot-thumb">{p.slides[0] && <SlideView slide={p.slides[0]} />}</span>
                  <span className="ptr__spot-txt">
                    <TruncatedText text={p.nome} className="ptr__strong" />
                    <span className="ptr__sub">{p.slides.length} slide · {durataProgetto(p)} s</span>
                  </span>
                  {p.id === progId && <i className="fa-solid fa-circle-check ptr__spot-ok" aria-hidden="true" />}
                </button>
              ))}
              <button type="button" className="ptr__spot ptr__spot--new" onClick={() => navigate('totem-editor')}>
                <i className="fa-solid fa-plus" aria-hidden="true" /><span>Crea un nuovo spot</span>
              </button>
            </div>
          </section>

          {/* 2 · Totem */}
          <section className="ptr__card">
            <div className="ptr__step-row">
              <h2 className="ptr__step"><span>2</span>Su quali totem</h2>
              <span className="ptr__sub">{sel.length} selezionati di {totem.length}</span>
              <button type="button" className="ptr__link" onClick={() => setSel(sel.length === totem.length ? [] : totem.map(t => t.id))}>{sel.length === totem.length ? 'Deseleziona tutti' : 'Tutta la rete'}</button>
            </div>
            <div className="ptr__where">
              <div className="ptr__map">
                <ItaliaTotem punti={totem.filter(t => sel.includes(t.id)).map(t => ({ id: t.id, lat: t.lat, lng: t.lng, stato: t.stato, label: etichettaTotem(t) }))} />
              </div>
              <div className="ptr__totem-list">
                <SearchField name="cerca-totem" placeholder="Cerca città, luogo o regione…" value={cerca} onChange={e => setCerca(e.target.value)} onClear={() => setCerca('')} />
                <div className="ptr__regioni">
                  {perRegione.map(([reg, ts]) => {
                    const ids = ts.map(t => t.id)
                    const tutti = ids.every(id => sel.includes(id))
                    return (
                      <div key={reg} className="ptr__reg">
                        <button type="button" className={clsx('ptr__reg-head', tutti && 'ptr__reg-head--on')} onClick={() => toggleRegione(ids)}>
                          <i className={`fa-solid ${tutti ? 'fa-square-check' : 'fa-square'}`} aria-hidden="true" />{reg}<span>{ts.length}</span>
                        </button>
                        <div className="ptr__chips">
                          {ts.map(t => (
                            <Tooltip key={t.id} text={`${t.indirizzo}, ${t.citta} · ${t.passaggiGiorno.toLocaleString('it-IT')} passaggi/giorno${t.stato !== 'online' ? ` · ${t.stato}` : ''}`}>
                              <button type="button" className={clsx('ptr__chip', sel.includes(t.id) && 'ptr__chip--on', t.stato !== 'online' && 'ptr__chip--warn')} onClick={() => toggle(t.id)}>
                                {t.stato !== 'online' && <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}{t.citta} · {t.luogo}
                              </button>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 3 · Quando */}
          <section className="ptr__card">
            <h2 className="ptr__step"><span>3</span>Quando e quanto spesso</h2>
            <div className="ptr__when">
              <DateRangeField label="Periodo" nameFrom="tr-dal" nameTo="tr-al" valueFrom={dal} valueTo={al}
                onChangeFrom={e => setDal(e.target.value)} onChangeTo={e => setAl(e.target.value)} />
              <div className="ptr__field">
                <span className="ptr__lbl">Fasce orarie</span>
                <div className="ptr__fasce">
                  {FASCE.map(f => (
                    <button key={f.id} type="button" className={clsx('ptr__fascia', fasce.includes(f.id) && 'ptr__fascia--on')} onClick={() => toggleFascia(f.id)}>
                      <i className={`fa-solid ${f.id === 'mattina' ? 'fa-sun' : f.id === 'pomeriggio' ? 'fa-cloud-sun' : f.id === 'sera' ? 'fa-moon' : 'fa-star'}`} aria-hidden="true" />
                      <strong>{f.label}</strong><span>{f.orario}</span>
                    </button>
                  ))}
                </div>
              </div>
              <RangeField name="passaggi" label="Passaggi all'ora" value={passaggi} min={1} max={20} step={1} hideReset valueLabel={`${passaggi} volte l'ora · ogni ${Math.round(60 / passaggi)} min`} onChange={setPassaggi} />
              <RadioGroup name="priorita" label="Priorità" value={priorita} onChange={v => setPriorita(v as Trasmissione['priorita'])}
                options={[{ value: 'normale', label: 'Normale (in rotazione)' }, { value: 'alta', label: 'Alta (prima delle altre)' }]} />
            </div>
          </section>
        </div>

        {/* ── Riepilogo ── */}
        <aside className="ptr__summary">
          <TotemFrame caption={prog ? `${prog.nome} · ${durata} s` : 'Scegli uno spot'}><SpotPlayer progetto={prog} /></TotemFrame>
          <dl className="ptr__kpi">
            <div><dt>Totem</dt><dd>{sel.length}</dd></div>
            <div><dt>Giorni</dt><dd>{giorni}</dd></div>
            <div><dt>Passaggi dello spot</dt><dd>{fmtN(passaggiTot)}</dd></div>
            <div><dt>Contatti stimati</dt><dd>{fmtN(contatti)}</dd></div>
          </dl>
          <ul className="ptr__checks">
            <li className="ptr__check--ok"><i className="fa-solid fa-circle-check" aria-hidden="true" />Totem di tua proprietà: nessun costo di trasmissione</li>
            <li className={carico > 30 ? 'ptr__check--ko' : 'ptr__check--ok'}><i className={`fa-solid ${carico > 30 ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} aria-hidden="true" />Lo spot occupa il {carico}% di ogni ora{carico > 30 ? ': rischia di stancare chi passa spesso' : ''}</li>
            {saturi.length > 0 && <li className="ptr__check--ko"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />{saturi.length} totem con fasce già piene: lo spot andrà in rotazione con meno passaggi</li>}
            {venduti.length > 0 && <li className="ptr__check--info"><i className="fa-solid fa-handshake" aria-hidden="true" />Su {venduti.length} totem queste fasce sono vendute a terzi: le inserzioni hanno la precedenza</li>}
            {offline.length > 0 && <li className="ptr__check--ko"><i className="fa-solid fa-plug-circle-xmark" aria-hidden="true" />{offline.length} totem ora non raggiungibili: riceveranno lo spot alla riconnessione</li>}
          </ul>
          <button type="button" className="sib-btn sib-btn--primary ptr__go" disabled={!valido} onClick={programma}>
            <i className="fa-solid fa-tower-broadcast" aria-hidden="true" /> Programma trasmissione
          </button>
          {!valido && <span className="ptr__sub ptr__go-hint">{!sel.length ? 'Scegli almeno un totem' : !fasce.length ? 'Scegli almeno una fascia oraria' : !giorni ? 'Indica il periodo' : ''}</span>}
        </aside>
      </div>

      {/* ── Trasmissioni programmate ── */}
      <section className="ptr__list">
        <div className="ptr__list-head">
          <h2 className="ptr__title">Trasmissioni programmate</h2>
          <div className="ptr__tabs" role="tablist">
            {(['Tutte', 'In onda', 'Programmata', 'Sospesa', 'Conclusa'] as const).map(s => (
              <button key={s} type="button" role="tab" aria-selected={filtro === s} className={clsx('ptr__tab', filtro === s && 'ptr__tab--on')} onClick={() => setFiltro(s)}>
                {s === 'Programmata' ? 'Programmate' : s === 'Conclusa' ? 'Concluse' : s === 'Sospesa' ? 'Sospese' : s}<span>{conta(s)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="sib-table-wrap ptr__wrap">
          <table className="sib-table ptr__table">
            <colgroup><col className="ptr__col-spot" /><col className="ptr__col-totem" /><col className="ptr__col-per" /><col className="ptr__col-fasce" /><col className="ptr__col-pass" /><col className="ptr__col-stato" /><col className="ptr__col-act" /></colgroup>
            <thead>
              <tr>
                <th><ThLabel full="Spot" /></th>
                <th><ThLabel full="Totem" /></th>
                <th><ThLabel full="Periodo" /></th>
                <th><ThLabel full="Fasce orarie" short="Fasce" /></th>
                <th className="ptr__r"><ThLabel full="Passaggi/ora" short="Pass./h" /></th>
                <th><ThLabel full="Stato" /></th>
                <th className="ptr__c"><ThLabel full="Azioni" /></th>
              </tr>
            </thead>
            <tbody>
              {righe.map(t => (
                <tr key={t.id}>
                  <td>
                    <span className="ptr__cell-spot">
                      <span className="ptr__mini">{t.prog?.slides[0] && <SlideView slide={t.prog.slides[0]} />}</span>
                      <TruncatedText text={t.prog?.nome ?? 'Spot eliminato'} className="ptr__strong" />
                      {t.priorita === 'alta' && <Tooltip text="Priorità alta"><i className="fa-solid fa-bolt ptr__alta" aria-label="Priorità alta" /></Tooltip>}
                    </span>
                  </td>
                  <td><TruncatedText text={t.totemIds.length === 1 ? etichettaTotem(totem.find(x => x.id === t.totemIds[0]) ?? { luogo: '—', nome: '' }) : `${t.totemIds.length} totem`}
                    full={t.totemIds.map(id => { const x = totem.find(y => y.id === id); return x ? `${x.citta}: ${etichettaTotem(x)}` : '' }).join(' · ')} /></td>
                  <td><TruncatedText text={`${fmtT(t.dal).slice(0, 5)} → ${fmtT(t.al)}`} /></td>
                  <td><TruncatedText text={t.fasce.map(f => FASCE.find(x => x.id === f)!.label).join(', ')} /></td>
                  <td className="ptr__r">{t.passaggiOra}</td>
                  <td><span className={`ptr__stato ptr__stato--${STATO_CLS[t.stato]}`}>{t.stato === 'In onda' && <span className="ptr__pulse" />}{t.stato}</span></td>
                  <td className="ptr__c">
                    <span className="ptr__acts">
                      {t.stato !== 'Conclusa' && (
                        <Tooltip text={t.sospesa ? 'Riprendi' : 'Sospendi'}>
                          <button type="button" className="ptr__act" aria-label={t.sospesa ? 'Riprendi' : 'Sospendi'} onClick={() => aggiornaTrasmissione(t.id, { sospesa: !t.sospesa })}>
                            <i className={`fa-solid ${t.sospesa ? 'fa-play' : 'fa-pause'}`} aria-hidden="true" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip text="Elimina"><button type="button" className="ptr__act" aria-label="Elimina" onClick={() => elimina(t)}><i className="fa-solid fa-trash-can" aria-hidden="true" /></button></Tooltip>
                    </span>
                  </td>
                </tr>
              ))}
              {righe.length === 0 && <tr><td colSpan={7} className="ptr__empty">Nessuna trasmissione in questo stato.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
