import React, { useMemo, useState } from 'react'
import PageHead from '../../../core/components/PageHead'
import { InputField, SelectField } from '../../../core/components/form'
import {
  useObiettiviStore, type Obiettivo, type Periodo, type SottoPeriodo, type Segmento, type TipologiaObiettivo,
  premioTotale, targetTotale, margineAtteso, tuttiSotto,
} from '../../../store/useObiettiviStore'
import './AssegnaObiettivo.sass'

/**
 * Premio performance · Assegna obiettivo.
 * Wizard a fasi animate → crea l'obiettivo (reparto/individuale, vendita
 * prodotti/servizi/esperienze, budget+margine, frammentazione in periodi e
 * sottoperiodi con premio a valore assoluto in €).
 *
 * La vista real-time degli obiettivi attivi NON vive qui: duplicava la pagina
 * "Monitoraggio performance", che legge lo stesso `useObiettiviStore` ed è più
 * completa (filtri, pista dei traguardi, dettaglio). "In corso" e l'avvio di un
 * obiettivo portano lì.
 */

const uid = (p = 'w') => `${p}-${Math.round(performance.now())}-${Math.floor(Math.random() * 1e4)}`
const eur = (n: number) => '€ ' + Math.round(n || 0).toLocaleString('it-IT')

const REPARTI = ['Commerciale', 'Front office', 'F&B', 'Housekeeping', 'Manutenzione', 'Amministrazione', 'Marketing', 'Direzione']
const DIPENDENTI = ['Andrea Grimaudo', 'Piero Aragona', 'Marco Campo', 'Giulia Neri', 'Ali Aslan']
const REPORT_OPTS = ['Report vendite reparto', 'Report upselling', 'Report esperienze / attività', 'Report F&B', 'Report camere / RevPAR', 'CRM · conversioni']
const SEGMENTI: { key: Segmento; label: string; icon: string }[] = [
  { key: 'prodotti',   label: 'Prodotti',   icon: 'fa-bag-shopping' },
  { key: 'servizi',    label: 'Servizi',    icon: 'fa-concierge-bell' },
  { key: 'esperienze', label: 'Esperienze', icon: 'fa-mountain-sun' },
]

const STEPS = [
  { icon: 'fa-flag', title: 'Dati obiettivo' },
  { icon: 'fa-coins', title: 'Vendita & budget' },
  { icon: 'fa-layer-group', title: 'Periodi & premi' },
  { icon: 'fa-rocket-launch', title: 'Riepilogo & avvio' },
]

// ─── Pagina ───────────────────────────────────────────────────────────────────
export default function AssegnaObiettivo({ navigate }: { navigate: (p: string) => void }) {
  const obiettivi = useObiettiviStore((s) => s.obiettivi)
  const inCorso = obiettivi.filter((o) => o.stato === 'in-corso').length

  return (
    <div className="ao2">
      <PageHead
        title="Premio performance"
        subtitle="Assegna obiettivi di vendita a reparti o singole persone, frammentali in periodi e premia il raggiungimento con un valore in €"
        actions={
          <button type="button" className="ao2__golive" onClick={() => navigate('monitoraggio-perf')}>
            <i className="fa-solid fa-chart-line" /> In corso
            {inCorso > 0 && <span className="ao2__golive-badge">{inCorso}</span>}
            <i className="fa-solid fa-arrow-right ao2__golive-go" />
          </button>
        }
      />

      <Wizard onAvviato={() => navigate('monitoraggio-perf')} />
    </div>
  )
}

// ─── Wizard di assegnazione ─────────────────────────────────────────────────
function newSotto(n: number): SottoPeriodo {
  return { id: uid('s'), nome: `Sottoperiodo ${n}`, dal: '', al: '', target: 0, premio: 0, venduto: 0 }
}
function newPeriodo(n: number): Periodo {
  return { id: uid('p'), nome: `Periodo ${n}`, sottoperiodi: [newSotto(1)] }
}

function Wizard({ onAvviato }: { onAvviato: () => void }) {
  const addObiettivo = useObiettiviStore((s) => s.addObiettivo)

  const [step, setStep] = useState(0)
  const [nome, setNome] = useState('')
  const [tipologia, setTipologia] = useState<TipologiaObiettivo>('reparto')
  const [reparto, setReparto] = useState('Commerciale')
  const [assegnatario, setAssegnatario] = useState(DIPENDENTI[0])
  const [report, setReport] = useState(REPORT_OPTS[0])
  const [segmenti, setSegmenti] = useState<Segmento[]>(['servizi'])
  const [budgetLordo, setBudgetLordo] = useState(120000)
  const [marginePct, setMarginePct] = useState(35)
  const [dataAvvio, setDataAvvio] = useState('2026-05-01T09:00')
  const [periodi, setPeriodi] = useState<Periodo[]>([newPeriodo(1)])
  const [errore, setErrore] = useState<string | null>(null)

  const toggleSegmento = (k: Segmento) =>
    setSegmenti((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))

  // editing periodi/sottoperiodi
  const addP = () => setPeriodi((ps) => [...ps, newPeriodo(ps.length + 1)])
  const removeP = (pid: string) => setPeriodi((ps) => ps.filter((p) => p.id !== pid))
  const setPNome = (pid: string, v: string) => setPeriodi((ps) => ps.map((p) => (p.id === pid ? { ...p, nome: v } : p)))
  const addS = (pid: string) => setPeriodi((ps) => ps.map((p) => (p.id === pid ? { ...p, sottoperiodi: [...p.sottoperiodi, newSotto(p.sottoperiodi.length + 1)] } : p)))
  const removeS = (pid: string, sid: string) => setPeriodi((ps) => ps.map((p) => (p.id === pid ? { ...p, sottoperiodi: p.sottoperiodi.filter((s) => s.id !== sid) } : p)))
  const setS = (pid: string, sid: string, patch: Partial<SottoPeriodo>) =>
    setPeriodi((ps) => ps.map((p) => (p.id === pid ? { ...p, sottoperiodi: p.sottoperiodi.map((s) => (s.id === sid ? { ...s, ...patch } : s)) } : p)))

  const draft: Obiettivo = useMemo(() => ({
    id: 'draft', createdAt: '', nome, tipologia, reparto, assegnatario: tipologia === 'individuale' ? assegnatario : undefined,
    report, segmenti, budgetLordo, marginePct, dataAvvio, stato: 'in-corso', periodi,
  }), [nome, tipologia, reparto, assegnatario, report, segmenti, budgetLordo, marginePct, dataAvvio, periodi])

  const totTarget = targetTotale(draft)
  const totPremio = premioTotale(draft)
  const nSotto = tuttiSotto(draft).length
  const copertura = budgetLordo > 0 ? Math.min(100, Math.round((totTarget / budgetLordo) * 100)) : 0

  const canNext = () => {
    if (step === 0) return nome.trim().length > 0
    if (step === 1) return segmenti.length > 0 && budgetLordo > 0
    if (step === 2) return nSotto > 0 && totTarget > 0
    return true
  }
  const next = () => {
    if (!canNext()) {
      setErrore(step === 0 ? 'Inserisci il nome dell’obiettivo.' : step === 1 ? 'Seleziona almeno un tipo di vendita e un budget.' : 'Aggiungi almeno un sottoperiodo con un target.')
      return
    }
    setErrore(null)
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }
  const back = () => { setErrore(null); setStep((s) => Math.max(0, s - 1)) }

  const avvia = () => {
    addObiettivo({
      nome, tipologia, reparto,
      assegnatario: tipologia === 'individuale' ? assegnatario : undefined,
      report, segmenti, budgetLordo, marginePct, dataAvvio, stato: 'in-corso', periodi,
    })
    onAvviato()
  }

  return (
    <div className="ao2-wiz">
      {/* Stepper */}
      <ol className="ao2-steps">
        {STEPS.map((s, i) => (
          <li key={s.title} className={'ao2-steps__item' + (i === step ? ' is-active' : i < step ? ' is-done' : '')}>
            <button type="button" className="ao2-steps__dot" onClick={() => i < step && setStep(i)} aria-label={s.title}>
              {i < step ? <i className="fa-solid fa-check" /> : <i className={`fa-solid ${s.icon}`} />}
            </button>
            <span className="ao2-steps__label">{s.title}</span>
            {i < STEPS.length - 1 && <span className="ao2-steps__bar" />}
          </li>
        ))}
      </ol>

      {errore && <p className="ao2-wiz__err"><i className="fa-solid fa-circle-exclamation" /> {errore}</p>}

      {/* Contenuto fase (rimonta ad ogni step → animazione) */}
      <div key={step} className="ao2-wiz__panel ao2-anim">
        {step === 0 && (
          <div className="ao2-grid ao2-grid--2">
            <InputField name="nome" label="Nome obiettivo" value={nome} placeholder="es. Spinta commerciale primavera" onChange={(e) => setNome(e.target.value)} />
            <div className="ao2-field">
              <label className="ao2-lbl">Tipologia</label>
              <div className="ao2-seg">
                <button type="button" className={'ao2-seg__opt' + (tipologia === 'reparto' ? ' is-active' : '')} onClick={() => setTipologia('reparto')}>
                  <i className="fa-solid fa-users" /> Di reparto
                </button>
                <button type="button" className={'ao2-seg__opt' + (tipologia === 'individuale' ? ' is-active' : '')} onClick={() => setTipologia('individuale')}>
                  <i className="fa-solid fa-user" /> Individuale
                </button>
              </div>
            </div>
            <SelectField name="reparto" label="Reparto" value={reparto} onChange={(e) => setReparto(e.target.value)}
              options={REPARTI.map((r) => ({ value: r, label: r }))} />
            {tipologia === 'individuale' ? (
              <SelectField name="assegnatario" label="Assegnatario" value={assegnatario} onChange={(e) => setAssegnatario(e.target.value)}
                options={DIPENDENTI.map((d) => ({ value: d, label: d }))} />
            ) : (
              <SelectField name="report" label="Fonte dati / KPI (report)" value={report} onChange={(e) => setReport(e.target.value)}
                options={REPORT_OPTS.map((r) => ({ value: r, label: r }))} />
            )}
            {tipologia === 'individuale' && (
              <SelectField name="report" label="Fonte dati / KPI (report)" value={report} onChange={(e) => setReport(e.target.value)}
                options={REPORT_OPTS.map((r) => ({ value: r, label: r }))} />
            )}
          </div>
        )}

        {step === 1 && (
          <div className="ao2-grid ao2-grid--2">
            <div className="ao2-field ao2-span-2">
              <label className="ao2-lbl">Tipologia di vendita <span className="ao2-lbl__hint">(focus commerciale)</span></label>
              <div className="ao2-chips">
                {SEGMENTI.map((s) => (
                  <button type="button" key={s.key} className={'ao2-chip' + (segmenti.includes(s.key) ? ' is-active' : '')} onClick={() => toggleSegmento(s.key)}>
                    <i className={`fa-solid ${s.icon}`} /> {s.label}
                    {segmenti.includes(s.key) && <i className="fa-solid fa-check ao2-chip__check" />}
                  </button>
                ))}
              </div>
            </div>
            <InputField name="budget" label="Budget lordo obiettivo (€)" type="number" value={String(budgetLordo)} onChange={(e) => setBudgetLordo(Number(e.target.value || 0))} iconLeft="fa-solid fa-euro-sign" />
            <InputField name="margine" label="Margine % sul budget (M.U.)" type="number" value={String(marginePct)} onChange={(e) => setMarginePct(Number(e.target.value || 0))} iconLeft="fa-solid fa-percent" />
            <div className="ao2-calc ao2-span-2">
              <div className="ao2-calc__item">
                <span className="ao2-calc__k">Budget lordo</span>
                <strong className="ao2-calc__v">{eur(budgetLordo)}</strong>
              </div>
              <i className="fa-solid fa-arrow-right ao2-calc__arrow" />
              <div className="ao2-calc__item">
                <span className="ao2-calc__k">Margine atteso ({marginePct}%)</span>
                <strong className="ao2-calc__v ao2-calc__v--accent">{eur(margineAtteso(draft))}</strong>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="ao2-frag">
            <div className="ao2-frag__intro">
              <p>Frammenta il budget in <strong>periodi</strong> e <strong>sottoperiodi</strong>. Ogni sottoperiodo ha un <strong>target di vendita</strong> e un <strong>premio a valore assoluto (€)</strong> che si sblocca al raggiungimento.</p>
            </div>

            {periodi.map((p, pi) => {
              const pTarget = p.sottoperiodi.reduce((s, x) => s + (x.target || 0), 0)
              const pPremio = p.sottoperiodi.reduce((s, x) => s + (x.premio || 0), 0)
              return (
                <div key={p.id} className="ao2-per ao2-anim">
                  <div className="ao2-per__head">
                    <span className="ao2-per__idx">{pi + 1}</span>
                    <input className="ao2-per__name" value={p.nome} onChange={(e) => setPNome(p.id, e.target.value)} aria-label="Nome periodo" />
                    <span className="ao2-per__tot">Target {eur(pTarget)} · Premio {eur(pPremio)}</span>
                    <button type="button" className="ao2-icon-btn" title="Aggiungi sottoperiodo" onClick={() => addS(p.id)}><i className="fa-solid fa-plus" /></button>
                    {periodi.length > 1 && (
                      <button type="button" className="ao2-icon-btn ao2-icon-btn--danger" title="Rimuovi periodo" onClick={() => removeP(p.id)}><i className="fa-solid fa-trash" /></button>
                    )}
                  </div>
                  <div className="ao2-sub">
                    <div className="ao2-sub__row ao2-sub__row--head">
                      <span>Sottoperiodo</span><span>Dal</span><span>Al</span><span>Target €</span><span>Premio €</span><span />
                    </div>
                    {p.sottoperiodi.map((s) => (
                      <div key={s.id} className="ao2-sub__row">
                        <input className="ao2-in" value={s.nome} onChange={(e) => setS(p.id, s.id, { nome: e.target.value })} aria-label="Nome sottoperiodo" />
                        <input className="ao2-in" type="date" value={s.dal || ''} onChange={(e) => setS(p.id, s.id, { dal: e.target.value })} aria-label="Dal" />
                        <input className="ao2-in" type="date" value={s.al || ''} onChange={(e) => setS(p.id, s.id, { al: e.target.value })} aria-label="Al" />
                        <input className="ao2-in ao2-in--num" type="number" value={String(s.target)} onChange={(e) => setS(p.id, s.id, { target: Number(e.target.value || 0) })} aria-label="Target" />
                        <input className="ao2-in ao2-in--num" type="number" value={String(s.premio)} onChange={(e) => setS(p.id, s.id, { premio: Number(e.target.value || 0) })} aria-label="Premio" />
                        <button type="button" className="ao2-icon-btn ao2-icon-btn--danger" title="Rimuovi sottoperiodo" onClick={() => removeS(p.id, s.id)} disabled={p.sottoperiodi.length === 1}><i className="fa-solid fa-xmark" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            <button type="button" className="ao2-add-per" onClick={addP}><i className="fa-solid fa-circle-plus" /> Aggiungi periodo</button>

            <div className="ao2-frag__summary">
              <div className="ao2-frag__sum-item"><span>Sottoperiodi</span><strong>{nSotto}</strong></div>
              <div className="ao2-frag__sum-item"><span>Target totale</span><strong>{eur(totTarget)}</strong></div>
              <div className="ao2-frag__sum-item ao2-frag__sum-item--accent"><span>Premio totale (v.a.)</span><strong>{eur(totPremio)}</strong></div>
              <div className="ao2-frag__cover">
                <div className="ao2-frag__cover-head"><span>Copertura del budget</span><strong>{copertura}%</strong></div>
                <div className="ao2-track"><span className="ao2-track__fill" style={{ '--pct': copertura } as React.CSSProperties} /></div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <Riepilogo draft={draft} totTarget={totTarget} totPremio={totPremio} nSotto={nSotto} />
        )}
      </div>

      {/* Navigazione */}
      <div className="ao2-wiz__nav">
        <button type="button" className="sib-btn sib-btn--ghost" onClick={back} disabled={step === 0}>
          <i className="fa-solid fa-arrow-left" /> Indietro
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="sib-btn sib-btn--primary" onClick={next}>
            Avanti <i className="fa-solid fa-arrow-right" />
          </button>
        ) : (
          <button type="button" className="sib-btn sib-btn--primary ao2-btn-avvia" onClick={avvia}>
            <i className="fa-solid fa-rocket-launch" /> Avvia obiettivo
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Riepilogo (fase 4) ───────────────────────────────────────────────────────
function Riepilogo({ draft, totTarget, totPremio, nSotto }: { draft: Obiettivo; totTarget: number; totPremio: number; nSotto: number }) {
  const destinatario = draft.tipologia === 'reparto' ? `Reparto ${draft.reparto}` : draft.assegnatario
  return (
    <div className="ao2-riep">
      <div className="ao2-riep__hero">
        <div className="ao2-riep__hero-l">
          <div className="ao2-riep__eyebrow"><i className="fa-solid fa-bullseye" /> {draft.nome || 'Nuovo obiettivo'}</div>
          <div className="ao2-riep__dest">{destinatario}</div>
          <div className="ao2-riep__segs">
            {draft.segmenti.map((s) => <span key={s} className="ao2-tag">{SEGMENTI.find((x) => x.key === s)?.label}</span>)}
          </div>
        </div>
        <div className="ao2-riep__prize">
          <span className="ao2-riep__prize-k">Premio in palio</span>
          <span className="ao2-riep__prize-v">{eur(totPremio)}</span>
        </div>
      </div>

      <div className="ao2-riep__stats">
        <div><span>Budget lordo</span><strong>{eur(draft.budgetLordo)}</strong></div>
        <div><span>Margine ({draft.marginePct}%)</span><strong>{eur(margineAtteso(draft))}</strong></div>
        <div><span>Target totale</span><strong>{eur(totTarget)}</strong></div>
        <div><span>Sottoperiodi</span><strong>{nSotto}</strong></div>
      </div>

      <div className="ao2-riep__timeline-head"><i className="fa-solid fa-timeline" /> Sequenza premi</div>
      <ol className="ao2-riep__timeline">
        {draft.periodi.map((p) => (
          <li key={p.id} className="ao2-riep__tl-per">
            <span className="ao2-riep__tl-pname">{p.nome}</span>
            <div className="ao2-riep__tl-subs">
              {p.sottoperiodi.map((s) => (
                <div key={s.id} className="ao2-riep__tl-sub">
                  <i className="fa-solid fa-trophy" />
                  <span className="ao2-riep__tl-sname">{s.nome}</span>
                  <span className="ao2-riep__tl-target">target {eur(s.target)}</span>
                  <span className="ao2-riep__tl-prize">{eur(s.premio)}</span>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="ao2-riep__notif">
        <div className="ao2-riep__notif-head"><i className="fa-solid fa-bell" /> <strong>Anteprima notifica</strong></div>
        <div className="ao2-riep__notif-body">
          🎯 Nuovo obiettivo «{draft.nome || '—'}» per {destinatario}. In palio <strong>{eur(totPremio)}</strong> su {nSotto} traguardi. La notifica verrà inviata all'avvio del <strong>{fmtDT(draft.dataAvvio)}</strong>. In bocca al lupo!
        </div>
      </div>
    </div>
  )
}

const fmtDT = (v: string) => {
  if (!v) return '—'
  const [d, t] = v.split('T')
  const [y, mo, da] = (d || '').split('-')
  return da ? `${da}/${mo}/${y}${t ? ' ' + t : ''}` : v
}
