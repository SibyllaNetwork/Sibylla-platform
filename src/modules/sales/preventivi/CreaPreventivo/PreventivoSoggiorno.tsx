import React, { useEffect, useMemo, useRef, useState } from 'react'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import RoomIllustration from '../../../impostazioni/InventarioCamere/RoomIllustration'
import AlertBanner from '../../../../core/components/AlertBanner'
import { CheckboxField, DateRangeField, InputField, RadioGroup, SelectField, TextareaField } from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { useServiziStore } from '../../../../store/useServiziStore'
import { useStrutturaCorrente } from '../../../../hooks/useStrutturaCorrente'
import { useTemplate, useTemplatePreventivoStore, templateDi } from '../../../../store/useTemplatePreventivoStore'
import { TEMPLATE_PRONTI, testoIn, type TemplateSoggiorno } from './templateSoggiorno'
import { ELENCO_LINGUE, LINGUE, MESSAGGI, tr, type Lingua } from './lingue'
import FlagCircle from '../../../../core/components/FlagCircle'
import PagamentoNexi, { motivoIn } from './PagamentoNexi'
import { terminiDi, terminiIn, useTerminiStore, type Termini } from '../../../../store/useTerminiStore'
import {
  assegnaAutomatico, bastano, camereDaNumeri, camereLibere, camereStruttura, primaDataUtile, numeriScelti, perTipologia, serviziProponibili, totaleCamere,
} from './disponibilita'
import {
  pagamentoOk, usePreventiviSoggiornoStore, type Assegnazione, type TentativoPagamento, type CameraProposta, type PreventivoSoggiorno, type PropostaSoggiorno, type ServizioExtra, type UnitaExtra,
} from '../../../../store/usePreventiviSoggiornoStore'
import {
  LETTERE, SERVIZI, STRUTTURE, TIPOLOGIE, TRATTAMENTI, UNITA, VALIDITA, comprimiFoto, conto, costoCamera, costoExtra,
  eur, giornoBreve, mailHtml, notti, scaricaEml, nottiDate, ospitiLabel, periodo, tariffa, tipologia,
} from './soggiorno'
import './PreventivoSoggiorno.sass'

/**
 * Preventivo di soggiorno: una o più soluzioni (date, camere, trattamento,
 * servizi inclusi, tassa di soggiorno), ognuna col suo prezzo e con servizi
 * aggiuntivi a pagamento facoltativi. Ogni camera ha foto, descrizione e
 * tariffe giorno per giorno. Le camere vengono dal gestionale: libere nel
 * periodo, assegnate in automatico o scelte a mano per numero. La mail segue
 * il template scelto (pronto o personale). Si stampa o si invia via mail; il
 * cliente accetta una proposta dai pulsanti nella mail e aggiunge gli extra.
 */

const uid = () => Math.random().toString(36).slice(2, 10)
const isoTra = (giorni: number) => {
  const d = new Date(); d.setDate(d.getDate() + giorni)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const oggi = () => new Date().toLocaleDateString('it-IT')
const ora = () => new Date().toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Le camere arrivano dall'assegnazione (automatica appena si apre la proposta).
export const nuovaProposta = (): PropostaSoggiorno => ({
  id: uid(), titolo: '', assegnazione: 'automatica', checkin: isoTra(30), checkout: isoTra(33), adulti: 2, bambini: 0,
  camere: [], trattamento: 'Pernottamento e colazione', servizi: ['Wi-Fi'], extra: [],
  scontoPct: 0, tassaImporto: 3.5, tassaMaxNotti: 7, tassaEsentiMinori: true,
})

export const nuovoPreventivo = (codice: string, struttura: string, templateId?: string): PreventivoSoggiorno => ({
  id: uid(), codice, struttura, cliente: '', email: '', telefono: '', templateId,
  messaggio: templateDi(templateId).testi.lettera, validita: '7', creato: oggi(), stato: 'Bozza', proposte: [nuovaProposta()],
})

/** Strutture del cliente fra cui scegliere (le demo se l'organizzazione non ne ha). */
export function useStruttureSoggiorno() {
  const { struttura, elenco } = useStrutturaCorrente()
  return useMemo(() => {
    const lista = elenco.length ? elenco : STRUTTURE
    return { iniziale: lista.includes(struttura) ? struttura : lista[0], opzioni: lista.map((x) => ({ value: x, label: x })) }
  }, [struttura, elenco])
}

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export default function PreventivoSoggiorno({ navigate, preventivoId, templateId, onCambiaTemplate }: {
  navigate: (p: string) => void; preventivoId?: string; templateId?: string
  /** Torna alla galleria dei template (solo per un preventivo nuovo). */
  onCambiaTemplate?: () => void
}) {
  const salvato = usePreventiviSoggiornoStore((s) => s.preventivi.find((p) => p.id === preventivoId))
  const salva = usePreventiviSoggiornoStore((s) => s.salva)
  const confirm = useConfirmStore((s) => s.confirm)
  const strutture = useStruttureSoggiorno()
  const personali = useTemplatePreventivoStore((s) => s.personali)

  const [pr, setPr] = useState<PreventivoSoggiorno>(() => salvato ?? nuovoPreventivo(usePreventiviSoggiornoStore.getState().prossimoCodice(), strutture.iniziale, templateId))
  const template = useTemplate(pr.templateId)
  const opzioniTemplate = [...TEMPLATE_PRONTI, ...personali].map((t) => ({ value: t.id, label: t.pronto ? `${t.nome} (pronto)` : t.nome }))
  const [errori, setErrori] = useState<string[]>([])
  const [mail, setMail] = useState<null | 'anteprima' | 'invia' | 'conferma' | 'rifiuto'>(null)

  const set = <K extends keyof PreventivoSoggiorno>(k: K, v: PreventivoSoggiorno[K]) => setPr((p) => ({ ...p, [k]: v }))
  const setProp = (id: string, patch: Partial<PropostaSoggiorno>) =>
    setPr((p) => ({ ...p, proposte: p.proposte.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))

  const aggiungi = () => setPr((p) => ({ ...p, proposte: [...p.proposte, nuovaProposta()] }))
  const duplica = (q: PropostaSoggiorno) => setPr((p) => {
    const i = p.proposte.findIndex((x) => x.id === q.id)
    const copia = { ...q, id: uid(), titolo: q.titolo ? `${q.titolo} (copia)` : '', camere: q.camere.map((c) => ({ ...c, id: uid(), tariffe: { ...c.tariffe } })), servizi: [...q.servizi], extra: q.extra.map((e) => ({ ...e })) }
    return { ...p, proposte: [...p.proposte.slice(0, i + 1), copia, ...p.proposte.slice(i + 1)] }
  })
  const elimina = async (q: PropostaSoggiorno, i: number) => {
    const ok = await confirm({
      title: 'Elimina soluzione',
      message: `Eliminare la proposta ${LETTERE[i]}${q.titolo ? ` "${q.titolo}"` : ''} dal preventivo?`,
      confirmLabel: 'Elimina', danger: true,
    })
    if (ok) setPr((p) => ({ ...p, proposte: p.proposte.filter((x) => x.id !== q.id) }))
  }

  const valida = () => {
    const e: string[] = []
    if (!pr.cliente.trim()) e.push('Indica il nome del cliente')
    if (!emailOk(pr.email)) e.push("Indica un'email valida del cliente")
    pr.proposte.forEach((q, i) => {
      if (notti(q) < 1) e.push(`Proposta ${LETTERE[i]}: scegli le date del soggiorno`)
      if (!q.camere.some((c) => c.quantita > 0)) e.push(`Proposta ${LETTERE[i]}: aggiungi almeno una camera`)
    })
    setErrori(e)
    return e.length === 0
  }

  const salvaBozza = () => {
    salva(pr)
    toast.success(`Preventivo ${pr.codice} salvato`)
  }

  // Invio: la piattaforma non ha ancora un servizio di posta, quindi la mail si
  // scarica come .eml (bozza pronta nel programma di posta) e il preventivo passa in Inviato.
  const invia = (oggetto: string) => {
    scaricaEml(mailHtml(pr, { template }), pr.email, oggetto, `Preventivo ${pr.codice}`)
    const inviato: PreventivoSoggiorno = { ...pr, stato: pr.stato === 'Accettato' ? pr.stato : 'Inviato', inviatoIl: ora() }
    setPr(inviato); salva(inviato); setMail(null)
    toast.info('Mail scaricata: aprila nel programma di posta e premi Invia. Il preventivo è segnato come inviato.', `Preventivo ${pr.codice}`)
  }

  // Il cliente accetta una proposta (dall'anteprima della mail) con gli extra scelti;
  // col pagamento attivo l'accettazione arriva solo a pagamento autorizzato.
  const accetta = (propostaId: string, extraScelti: string[], terminiAccettati?: string, pagamento?: TentativoPagamento) => {
    const i = pr.proposte.findIndex((q) => q.id === propostaId)
    const accettato: PreventivoSoggiorno = {
      ...pr, stato: 'Accettato', accettata: propostaId, extraScelti, terminiAccettati, rispostaIl: ora(),
      pagamenti: pagamento ? [...(pr.pagamenti ?? []), pagamento] : pr.pagamenti,
    }
    setPr(accettato); salva(accettato)
    const extra = extraScelti.length ? ` con ${extraScelti.length} ${extraScelti.length === 1 ? 'servizio aggiuntivo' : 'servizi aggiuntivi'}` : ''
    toast.success(pagamento
      ? `${pr.cliente} ha pagato ${eur(pagamento.importo)} e confermato la proposta ${LETTERE[i]}${extra}: mail di conferma pronta`
      : `${pr.cliente} ha accettato la proposta ${LETTERE[i]}${extra}`, pagamento ? 'Pagamento autorizzato' : 'Preventivo accettato')
  }
  const pagamentoRifiutato = (t: TentativoPagamento) => {
    const x: PreventivoSoggiorno = { ...pr, pagamenti: [...(pr.pagamenti ?? []), t] }
    setPr(x); salva(x)
    toast.error(`${eur(t.importo)} con ${t.circuito} •••• ${t.ultime4}: ${t.motivo}`, 'Pagamento rifiutato')
  }
  const okPagamento = pagamentoOk(pr)
  const ultimoKo = !okPagamento ? [...(pr.pagamenti ?? [])].reverse().find((t) => t.esito === 'rifiutato') : undefined

  // Cambiando template il messaggio segue la lettera del nuovo, se non era stato riscritto.
  const lingua: Lingua = pr.lingua ?? 'it'
  const cambiaTemplate = (id: string) => setPr((p) => ({
    ...p, templateId: id,
    messaggio: p.messaggio === testoIn(template, lingua, 'lettera') ? testoIn(templateDi(id), lingua, 'lettera') : p.messaggio,
  }))
  // Cambiando lingua il messaggio passa alla lettera del template in quella lingua, se non era stato riscritto.
  const cambiaLingua = (l: Lingua) => setPr((p) => ({
    ...p, lingua: l,
    messaggio: [testoIn(template, lingua, 'lettera'), template.testi.lettera].includes(p.messaggio) ? testoIn(template, l, 'lettera') : p.messaggio,
  }))

  // L'editor riceve il preventivo (salvato in bozza) e lo riapre col template personalizzato.
  const personalizza = () => {
    salva(pr)
    navigate(`editor-template-soggiorno:${template.id}:${pr.id}`)
  }

  const stampa = () => {
    if (!valida()) return
    const f = document.createElement('iframe')
    f.className = 'psog__print-frame'
    document.body.appendChild(f)
    const doc = f.contentDocument!
    doc.open(); doc.write(mailHtml(pr, { stampa: true, template })); doc.close()
    setTimeout(() => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 1000) }, 300)
  }

  const scelta = pr.proposte.findIndex((q) => q.id === pr.accettata)
  const extraPresi = pr.proposte[scelta]?.extra.filter((e) => pr.extraScelti?.includes(e.id)) ?? []

  return (
    <div className="psog">
      {errori.length > 0 && (
        <AlertBanner type="error">
          <ul className="psog__errori">{errori.map((e) => <li key={e}>{e}</li>)}</ul>
        </AlertBanner>
      )}

      {pr.stato === 'Inviato' && (
        <div className="psog__stato psog__stato--inviato">
          <i className="fa-solid fa-paper-plane" aria-hidden="true" />
          <span>Inviato a <strong>{pr.email}</strong> il {pr.inviatoIl}: in attesa della scelta del cliente.</span>
          <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setMail('anteprima')}>
            <i className="fa-regular fa-envelope-open" aria-hidden="true" /> Apri la mail del cliente
          </button>
        </div>
      )}
      {pr.stato === 'Accettato' && (
        <div className="psog__stato psog__stato--ok">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
          <span><strong>{pr.cliente}</strong> ha accettato la proposta {LETTERE[scelta]}{pr.proposte[scelta]?.titolo ? ` "${pr.proposte[scelta].titolo}"` : ''} il {pr.rispostaIl}
            {extraPresi.length > 0 && <>, aggiungendo {extraPresi.map((e) => e.nome).join(', ')}</>}.
            {' '}Totale <strong>{eur(conto(pr.proposte[scelta], pr.extraScelti).totaleConExtra)}</strong>.
            {pr.terminiAccettati && <> Ha accettato i {pr.terminiAccettati}.</>}
          </span>
        </div>
      )}
      {okPagamento && (
        <div className="psog__stato psog__stato--ok">
          <i className="fa-solid fa-credit-card" aria-hidden="true" />
          <span>Pagamento autorizzato: <strong>{eur(okPagamento.importo)}</strong> ({okPagamento.tipo === 'caparra' ? 'caparra' : 'intero importo'}) con {okPagamento.circuito} •••• {okPagamento.ultime4},
            codice {okPagamento.codiceAut}, il {new Date(okPagamento.il).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}.</span>
          <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setMail('conferma')}>
            <i className="fa-regular fa-envelope-circle-check" aria-hidden="true" /> Mail di conferma
          </button>
        </div>
      )}
      {ultimoKo && (
        <div className="psog__stato psog__stato--ko">
          <i className="fa-solid fa-circle-xmark" aria-hidden="true" />
          <span>Pagamento rifiutato: <strong>{eur(ultimoKo.importo)}</strong> con {ultimoKo.circuito} •••• {ultimoKo.ultime4} · {ultimoKo.motivo}
            {(pr.pagamenti ?? []).filter((t) => t.esito === 'rifiutato').length > 1 && <> ({(pr.pagamenti ?? []).filter((t) => t.esito === 'rifiutato').length} tentativi)</>}. La proposta resta in attesa di pagamento.</span>
          <button type="button" className="sib-btn sib-btn--ghost" onClick={() => setMail('rifiuto')}>
            <i className="fa-regular fa-envelope" aria-hidden="true" /> Mail di pagamento non riuscito
          </button>
        </div>
      )}

      <div className="psog__layout">
        <div className="psog__main">
          {/* ── Cliente ─────────────────────────────────────────────── */}
          <section className="psog__card">
            <header className="psog__card-head">
              <span className="psog__num">1</span>
              <div className="psog__card-titles"><h3>Cliente e messaggio</h3><span>A chi è rivolto il preventivo e il testo che apre la mail</span></div>
            </header>
            <div className="psog__card-body">
              <div className="psog__grid">
                <SelectField name="struttura" label="Struttura" value={pr.struttura} onChange={(e) => set('struttura', e.target.value)}
                  options={strutture.opzioni.some((o) => o.value === pr.struttura) ? strutture.opzioni : [{ value: pr.struttura, label: pr.struttura }, ...strutture.opzioni]} />
                <InputField name="cliente" label="Cliente" required value={pr.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder="Nome e cognome o azienda" />
                <InputField name="email" label="Email" type="email" required value={pr.email} onChange={(e) => set('email', e.target.value)} placeholder="nome@dominio.it" />
                <InputField name="telefono" label="Telefono" type="tel" value={pr.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+39 ..." />
                <SelectField name="validita" label="Validità offerta" value={pr.validita} onChange={(e) => set('validita', e.target.value)}
                  options={VALIDITA.map((v) => ({ value: v, label: `${v} giorni` }))} />
              </div>
              <TextareaField name="messaggio" label="Messaggio al cliente" rows={3} value={pr.messaggio} onChange={(e) => set('messaggio', e.target.value)} />
              <div className="psog__lingue">
                <span className="psog__lingue-lbl">Lingua della mail</span>
                <div className="psog__lingue-opts" role="radiogroup" aria-label="Lingua della mail">
                  {ELENCO_LINGUE.map((l) => (
                    <button key={l} type="button" role="radio" aria-checked={lingua === l}
                      className={'psog__lingua' + (lingua === l ? ' is-on' : '')} onClick={() => cambiaLingua(l)}>
                      <FlagCircle code={LINGUE[l].bandiera} size={18} /> {LINGUE[l].nativo}
                    </button>
                  ))}
                </div>
                {lingua !== 'it' && (
                  <span className="psog__lingue-hint">
                    Testi standard, tipologie, trattamenti e servizi sono tradotti in automatico; i testi scritti a mano restano come li scrivi.
                  </span>
                )}
              </div>
              <div className="psog__tpl">
                <SelectField name="template" label="Template della mail" value={template.id} onChange={(e) => cambiaTemplate(e.target.value)}
                  options={opzioniTemplate} />
                <span className="psog__tpl-desc">{template.descrizione}</span>
                <div className="psog__tpl-acts">
                  {onCambiaTemplate && (
                    <button type="button" className="sib-btn sib-btn--ghost" onClick={onCambiaTemplate}>
                      <i className="fa-regular fa-grid-2" aria-hidden="true" /> Galleria template
                    </button>
                  )}
                  <button type="button" className="sib-btn sib-btn--secondary" onClick={personalizza}>
                    <i className="fa-regular fa-pen-ruler" aria-hidden="true" /> Personalizza il design
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── Soluzioni ───────────────────────────────────────────── */}
          <section className="psog__card">
            <header className="psog__card-head">
              <span className="psog__num">2</span>
              <div className="psog__card-titles">
                <h3>Soluzioni di soggiorno</h3>
                <span>Una o più ipotesi, ognuna con il suo prezzo: il cliente sceglie quella che preferisce</span>
              </div>
              <button type="button" className="sib-btn sib-btn--secondary" onClick={aggiungi}>
                <i className="fa-regular fa-plus" aria-hidden="true" /> Aggiungi soluzione
              </button>
            </header>
            <div className="psog__card-body">
              {pr.proposte.map((q, i) => (
                <Proposta key={q.id} q={q} i={i} struttura={pr.struttura} sola={pr.proposte.length === 1} scelta={pr.accettata === q.id}
                  onChange={(patch) => setProp(q.id, patch)} onDuplica={() => duplica(q)} onElimina={() => elimina(q, i)} />
              ))}
              <button type="button" className="psog__add" onClick={aggiungi}>
                <i className="fa-regular fa-plus" aria-hidden="true" /> Aggiungi un'altra soluzione
              </button>
            </div>
          </section>
        </div>

        {/* ── Riepilogo e azioni ─────────────────────────────────────── */}
        <aside className="psog__aside">
          <div className="psog__sum">
            <div className="psog__sum-head">
              <span className="psog__sum-code">{pr.codice}</span>
              <span className={`psog__badge psog__badge--${pr.stato.toLowerCase()}`}>{pr.stato}</span>
            </div>
            <h4 className="psog__sum-title">{pr.proposte.length === 1 ? '1 soluzione' : `${pr.proposte.length} soluzioni`}</h4>
            <ul className="psog__sum-list">
              {pr.proposte.map((q, i) => {
                const k = conto(q, pr.accettata === q.id ? pr.extraScelti : [])
                return (
                  <li key={q.id} className={pr.accettata === q.id ? 'is-scelta' : ''}>
                    <span className="psog__letter">{LETTERE[i]}</span>
                    <span className="psog__sum-txt">
                      <strong>{q.titolo || q.camere.map((c) => `${c.quantita}× ${c.tipologia}`).join(', ')}</strong>
                      <small>{k.notti} {k.notti === 1 ? 'notte' : 'notti'} · {ospitiLabel(q)}</small>
                    </span>
                    <span className="psog__sum-tot">{eur(k.totaleConExtra)}</span>
                  </li>
                )
              })}
            </ul>
            <div className="psog__sum-acts">
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => valida() && setMail('invia')}>
                <i className="fa-solid fa-paper-plane" aria-hidden="true" /> {pr.stato === 'Bozza' ? 'Invia via mail' : 'Invia di nuovo'}
              </button>
              <div className="psog__sum-row">
                <button type="button" className="sib-btn sib-btn--secondary" onClick={() => valida() && setMail('anteprima')}>
                  <i className="fa-regular fa-eye" aria-hidden="true" /> Anteprima
                </button>
                <button type="button" className="sib-btn sib-btn--secondary" onClick={stampa}>
                  <i className="fa-regular fa-print" aria-hidden="true" /> Stampa
                </button>
              </div>
              <button type="button" className="sib-btn sib-btn--ghost" onClick={salvaBozza}>
                <i className="fa-regular fa-floppy-disk" aria-hidden="true" /> {pr.stato === 'Bozza' ? 'Salva bozza' : 'Salva modifiche'}
              </button>
              <button type="button" className="sib-btn sib-btn--ghost" onClick={() => navigate('i-miei-preventivi')}>
                <i className="fa-regular fa-list" aria-hidden="true" /> I miei preventivi
              </button>
            </div>
          </div>
        </aside>
      </div>

      {mail && (
        <MailModal pr={pr} template={template} modo={mail} onClose={() => setMail(null)} onInvia={invia} onAccetta={accetta} onRifiuto={pagamentoRifiutato} />
      )}
    </div>
  )
}

// ─── Singola soluzione ────────────────────────────────────────────────────────
export function Proposta({ q, i, struttura, sola, scelta, onChange, onDuplica, onElimina }: {
  q: PropostaSoggiorno; i: number; struttura: string; sola: boolean; scelta: boolean
  onChange: (patch: Partial<PropostaSoggiorno>) => void; onDuplica: () => void; onElimina: () => void
}) {
  const k = conto(q)
  const ospiti = q.adulti + q.bambini
  const date = nottiDate(q)
  const setCamera = (id: string, patch: Partial<CameraProposta>) => onChange({ camere: q.camere.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  const num = (v: string, min = 0) => Math.max(min, Number(v) || 0)
  const toggleServizio = (s: string) => onChange({ servizi: q.servizi.includes(s) ? q.servizi.filter((x) => x !== s) : [...q.servizi, s] })

  return (
    <article className={'psog__prop' + (scelta ? ' is-scelta' : '')}>
      <header className="psog__prop-head">
        <span className="psog__letter psog__letter--lg">{LETTERE[i]}</span>
        <InputField name={`titolo-${q.id}`} ariaLabel={`Titolo proposta ${LETTERE[i]}`} className="psog__prop-title"
          value={q.titolo} onChange={(e) => onChange({ titolo: e.target.value })} placeholder={`Proposta ${LETTERE[i]} (es. Weekend romantico)`} />
        {scelta && <span className="psog__badge psog__badge--accettato">Scelta dal cliente</span>}
        <Tooltip text="Duplica soluzione">
          <button type="button" className="sib-btn sib-btn--icon psog__ico" aria-label="Duplica soluzione" onClick={onDuplica}>
            <i className="fa-solid fa-clone" aria-hidden="true" />
          </button>
        </Tooltip>
        {!sola && (
          <Tooltip text="Elimina soluzione">
            <button type="button" className="sib-btn sib-btn--icon psog__ico" aria-label="Elimina soluzione" onClick={onElimina}>
              <i className="fa-solid fa-trash-can" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </header>

      <div className="psog__prop-body">
        <div className="psog__grid psog__grid--soggiorno">
          <DateRangeField label="Giorni richiesti" nameFrom={`in-${q.id}`} nameTo={`out-${q.id}`} className="psog__f-date"
            valueFrom={q.checkin} valueTo={q.checkout}
            onChangeFrom={(e) => onChange({ checkin: e.target.value })} onChangeTo={(e) => onChange({ checkout: e.target.value })} />
          <InputField name={`adulti-${q.id}`} label="Adulti" type="number" min={1} value={q.adulti} onChange={(e) => onChange({ adulti: num(e.target.value, 1) })} />
          <InputField name={`bambini-${q.id}`} label="Bambini" type="number" min={0} value={q.bambini} onChange={(e) => onChange({ bambini: num(e.target.value) })} />
          <SelectField name={`tratt-${q.id}`} label="Trattamento" value={q.trattamento} onChange={(e) => onChange({ trattamento: e.target.value })}
            options={TRATTAMENTI.map((t) => ({ value: t.nome, label: t.supplemento ? `${t.nome} (+${eur(t.supplemento)} a persona/notte)` : t.nome }))} />
        </div>
        <p className="psog__periodo"><i className="fa-regular fa-calendar" aria-hidden="true" /> {periodo(q)} · <strong>{k.notti} {k.notti === 1 ? 'notte' : 'notti'}</strong></p>

        {/* Camere: foto, descrizione, tariffe giorno per giorno */}
        <div className="psog__block">
          <div className="psog__block-title">Camere</div>
          <Disponibilita q={q} struttura={struttura} onChange={onChange} />
          {q.camere.map((c) => (
            <Camera key={c.id} c={c} date={date} rimovibile={q.assegnazione === 'manuale'}
              onChange={(patch) => setCamera(c.id, patch)}
              onRimuovi={() => onChange({ camere: q.camere.filter((x) => x.id !== c.id) })} />
          ))}
          <div className="psog__camere-foot">
            <span className={'psog__posti' + (k.postiLetto < ospiti ? ' is-warn' : '')}>
              <i className={'fa-solid ' + (k.postiLetto < ospiti ? 'fa-triangle-exclamation' : 'fa-bed')} aria-hidden="true" />
              {k.postiLetto} posti letto per {ospiti} {ospiti === 1 ? 'ospite' : 'ospiti'}
            </span>
          </div>
        </div>

        {/* Servizi inclusi */}
        <div className="psog__block">
          <div className="psog__block-title">Servizi inclusi</div>
          <div className="psog__chips">
            {SERVIZI.map(([s, ico]) => (
              <button key={s} type="button" aria-pressed={q.servizi.includes(s)}
                className={'psog__chip' + (q.servizi.includes(s) ? ' is-on' : '')} onClick={() => toggleServizio(s)}>
                <i className={`fa-regular ${ico}`} aria-hidden="true" /> {s}
              </button>
            ))}
          </div>
        </div>

        <Extra q={q} onChange={(extra) => onChange({ extra })} />

        {/* Tassa di soggiorno + prezzo */}
        <div className="psog__bottom">
          <div className="psog__block psog__tassa">
            <div className="psog__block-title">Tassa di soggiorno e sconto</div>
            <div className="psog__grid psog__grid--tassa">
              <InputField name={`tassa-${q.id}`} label="A persona per notte" type="number" min={0} step={0.5} iconRight="fa-regular fa-euro-sign"
                value={q.tassaImporto} onChange={(e) => onChange({ tassaImporto: num(e.target.value) })} />
              <InputField name={`tmax-${q.id}`} label="Notti max tassate" type="number" min={1} value={q.tassaMaxNotti} onChange={(e) => onChange({ tassaMaxNotti: num(e.target.value, 1) })} />
              <InputField name={`sconto-${q.id}`} label="Sconto" type="number" min={0} max={100} iconRight="fa-regular fa-percent"
                value={q.scontoPct} onChange={(e) => onChange({ scontoPct: Math.min(100, num(e.target.value)) })} />
            </div>
            <CheckboxField name={`esenti-${q.id}`} label="Minori esenti dalla tassa" checked={q.tassaEsentiMinori} onChange={(e) => onChange({ tassaEsentiMinori: e.target.checked })} />
          </div>

          <dl className="psog__conto">
            <div><dt>Camere</dt><dd>{eur(k.camere)}</dd></div>
            {k.trattamento > 0 && <div><dt>Supplemento trattamento</dt><dd>{eur(k.trattamento)}</dd></div>}
            {k.sconto > 0 && <div className="is-sconto"><dt>Sconto {q.scontoPct}%</dt><dd>− {eur(k.sconto)}</dd></div>}
            <div><dt>Tassa di soggiorno</dt><dd>{eur(k.tassa)}</dd></div>
            <div className="is-tot"><dt>Prezzo proposta {LETTERE[i]}</dt><dd>{eur(k.totale)}</dd></div>
            {q.extra.length > 0 && <div className="is-nota"><dt>Servizi aggiuntivi facoltativi, a scelta del cliente</dt></div>}
          </dl>
        </div>
      </div>
    </article>
  )
}

// ─── Disponibilità dal gestionale: assegnazione automatica o manuale ─────────
const MODI: { value: Assegnazione; label: string }[] = [
  { value: 'automatica', label: 'Automatica' },
  { value: 'manuale', label: 'Manuale' },
]

function Disponibilita({ q, struttura, onChange }: {
  q: PropostaSoggiorno; struttura: string; onChange: (patch: Partial<PropostaSoggiorno>) => void
}) {
  const libere = useMemo(() => camereLibere(struttura, q.checkin, q.checkout), [struttura, q.checkin, q.checkout])
  const gruppi = useMemo(() => perTipologia(libere), [libere])
  const totale = useMemo(() => totaleCamere(struttura), [struttura])
  const scelti = numeriScelti(q)
  const ospiti = q.adulti + q.bambini
  const occupate = scelti.filter((n) => !libere.some((c) => c.numero === n))

  const assegna = () => onChange({ camere: camereDaNumeri(assegnaAutomatico(libere, ospiti), q.camere) })

  // In automatico le camere seguono struttura, date e ospiti; all'apertura si
  // assegna solo se la proposta non ha ancora camere del gestionale.
  const chiave = `${struttura}|${q.checkin}|${q.checkout}|${ospiti}`
  const ultima = useRef<string | null>(null)
  useEffect(() => {
    const prima = ultima.current === null
    ultima.current = chiave
    if (q.assegnazione !== 'automatica') return
    if (prima && scelti.length && !occupate.length) return
    assegna()
  }, [chiave, q.assegnazione]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiaModo = (m: Assegnazione) => onChange(m === 'automatica'
    ? { assegnazione: m, camere: camereDaNumeri(assegnaAutomatico(libere, ospiti), q.camere) }
    : { assegnazione: m })

  // Le camere scelte a mano, per numero (anche quelle non più libere, finché non si tolgono).
  const conNumeri = (nuovi: string[]) => onChange({
    camere: [
      ...camereDaNumeri(camereStruttura(struttura).filter((c) => nuovi.includes(c.numero)), q.camere),
      // le righe senza numeri (preventivi di prima) restano finché non si tolgono
      ...q.camere.filter((c) => !c.numeri.length),
    ],
  })
  const toggle = (numero: string) => conNumeri(scelti.includes(numero) ? scelti.filter((n) => n !== numero) : [...scelti, numero])

  const posti = q.camere.reduce((s, c) => s + c.quantita * tipologia(c.tipologia).capacita, 0)
  const periodoOk = notti(q) > 0
  const insufficienti = periodoOk && !bastano(libere, ospiti)
  const alternativa = useMemo(
    () => (insufficienti ? primaDataUtile(struttura, q.checkin, q.checkout, ospiti) : null),
    [insufficienti, struttura, q.checkin, q.checkout, ospiti],
  )

  return (
    <div className="psog__disp">
      <div className="psog__disp-head">
        <span className="psog__disp-info">
          <i className="fa-solid fa-door-open" aria-hidden="true" />
          {periodoOk
            ? <span><strong>{libere.length}</strong> camere libere su {totale} in {struttura} per le date scelte</span>
            : <span>Scegli le date per vedere le camere libere</span>}
        </span>
        <RadioGroup name={`assegna-${q.id}`} label="Assegnazione camere" value={q.assegnazione} options={MODI}
          onChange={(v) => cambiaModo(v as Assegnazione)} className="psog__disp-modo" />
      </div>

      {occupate.length > 0 && (
        <AlertBanner type="warning">
          {occupate.length === 1 ? 'La camera' : 'Le camere'} {occupate.join(', ')} non {occupate.length === 1 ? 'è più libera' : 'sono più libere'} nelle date scelte.{' '}
          <button type="button" className="psog__link" onClick={() => conNumeri(scelti.filter((n) => !occupate.includes(n)))}>Togli dalla proposta</button>
        </AlertBanner>
      )}

      {insufficienti && (
        <p className="psog__disp-alt">
          <i className="fa-regular fa-calendar-circle-exclamation" aria-hidden="true" />
          {alternativa
            ? <span>Le camere libere non bastano per {ospiti} {ospiti === 1 ? 'ospite' : 'ospiti'}. Prima data utile con le stesse notti: <strong>{giornoBreve(alternativa.checkin)} → {giornoBreve(alternativa.checkout)}</strong> ({alternativa.libere} camere libere).</span>
            : <span>Le camere libere non bastano per {ospiti} {ospiti === 1 ? 'ospite' : 'ospiti'}, né nei prossimi 90 giorni con le stesse notti.</span>}
          {alternativa && (
            <button type="button" className="sib-btn sib-btn--secondary" onClick={() => onChange({ checkin: alternativa.checkin, checkout: alternativa.checkout })}>
              <i className="fa-regular fa-calendar-arrow-up" aria-hidden="true" /> Sposta le date
            </button>
          )}
        </p>
      )}

      {q.assegnazione === 'automatica' && periodoOk && (
        <p className="psog__disp-note">
          <i className="fa-regular fa-wand-magic-sparkles" aria-hidden="true" />
          {scelti.length
            ? <span>Il sistema ha scelto {scelti.length === 1 ? 'la camera' : 'le camere'} <strong>{scelti.join(', ')}</strong> per {ospiti} {ospiti === 1 ? 'ospite' : 'ospiti'}: la combinazione con meno letti vuoti e il prezzo più basso.</span>
            : <span>Nessuna combinazione di camere libere ospita {ospiti} {ospiti === 1 ? 'ospite' : 'ospiti'} in queste date.</span>}
          <button type="button" className="sib-btn sib-btn--ghost" onClick={assegna}>
            <i className="fa-regular fa-arrows-rotate" aria-hidden="true" /> Ricalcola
          </button>
        </p>
      )}

      {q.assegnazione === 'manuale' && periodoOk && (
        <div className="psog__disp-groups">
          {gruppi.length === 0 && <p className="psog__disp-none">Nessuna camera libera in queste date.</p>}
          {gruppi.map((g) => (
            <div key={g.tipologia} className="psog__disp-group">
              <div className="psog__disp-gname">
                <strong>{g.tipologia}</strong>
                <small>max {g.capacita} · da {eur(g.tariffa)} a notte · {g.camere.length} {g.camere.length === 1 ? 'libera' : 'libere'}</small>
              </div>
              <div className="psog__disp-rooms">
                {g.camere.map((c) => {
                  const on = scelti.includes(c.numero)
                  return (
                    <Tooltip key={c.numero} text={`Camera ${c.numero} · piano ${c.piano} · ${eur(c.tariffa)} a notte`}>
                      <button type="button" aria-pressed={on} className={'psog__disp-room' + (on ? ' is-on' : '')} onClick={() => toggle(c.numero)}>
                        {on && <i className="fa-solid fa-check" aria-hidden="true" />} {c.numero}
                      </button>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          ))}
          {scelti.length > 0 && (
            <p className={'psog__disp-sum' + (posti < ospiti ? ' is-warn' : '')}>
              {scelti.length} {scelti.length === 1 ? 'camera scelta' : 'camere scelte'} · {posti} posti letto per {ospiti} {ospiti === 1 ? 'ospite' : 'ospiti'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Camera: foto + descrizione accanto, tariffe giorno per giorno ───────────
function Camera({ c, date, rimovibile, onChange, onRimuovi }: {
  c: CameraProposta; date: string[]; rimovibile: boolean
  onChange: (patch: Partial<CameraProposta>) => void; onRimuovi: () => void
}) {
  const file = useRef<HTMLInputElement>(null)
  const num = (v: string, min = 0) => Math.max(min, Number(v) || 0)
  const t = tipologia(c.tipologia)
  const assegnata = c.numeri.length > 0
  const personalizzate = date.some((d) => c.tariffe[d] != null && c.tariffe[d] !== c.prezzoNotte)

  const cambiaTipologia = (nome: string) => onChange({
    tipologia: nome, prezzoNotte: tipologia(nome).prezzo, tariffe: {},
    // la descrizione segue la tipologia, a meno che non sia stata scritta a mano
    descrizione: !c.descrizione || c.descrizione === t.descrizione ? tipologia(nome).descrizione : c.descrizione,
  })

  const carica = async (f?: File) => {
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.warning('Scegli un file immagine (JPG, PNG, WebP)'); return }
    try { onChange({ immagine: await comprimiFoto(f) }) } catch { toast.error('Impossibile leggere la foto') }
  }

  return (
    <div className="psog__room">
      <div className="psog__room-media">
        {c.immagine ? <img src={c.immagine} alt={c.tipologia} /> : <RoomIllustration tipo={t.tipo} fill />}
        <div className="psog__room-media-acts">
          <button type="button" className="psog__room-media-btn" onClick={() => file.current?.click()}>
            <i className="fa-solid fa-camera" aria-hidden="true" /> {c.immagine ? 'Cambia foto' : 'Carica foto'}
          </button>
          {c.immagine && (
            <Tooltip text="Rimuovi foto">
              <button type="button" className="psog__room-media-btn psog__room-media-btn--ico" aria-label="Rimuovi foto" onClick={() => onChange({ immagine: null })}>
                <i className="fa-solid fa-trash-can" aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </div>
        <input ref={file} type="file" accept="image/*" className="psog__file" onChange={(e) => { carica(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      <div className="psog__room-info">
        <div className="psog__room-fields">
          <SelectField name={`tipo-${c.id}`} label="Tipologia di camera" value={c.tipologia} onChange={(e) => cambiaTipologia(e.target.value)}
            disabled={assegnata} options={TIPOLOGIE.map((x) => ({ value: x.nome, label: `${x.nome} · max ${x.capacita}` }))} />
          <InputField name={`qta-${c.id}`} label="Camere" type="number" min={1} value={c.quantita} readOnly={assegnata}
            onChange={(e) => onChange({ quantita: num(e.target.value, 1) })} />
          <InputField name={`prz-${c.id}`} label="Tariffa a notte" type="number" min={0} step={1} iconRight="fa-regular fa-euro-sign"
            value={c.prezzoNotte} onChange={(e) => onChange({ prezzoNotte: num(e.target.value) })} />
          <div className="psog__room-sub">
            <span>Subtotale</span>
            <strong>{eur(costoCamera(c, date) * c.quantita)}</strong>
          </div>
          {rimovibile && (
            <Tooltip text="Rimuovi camera">
              <button type="button" className="sib-btn sib-btn--icon psog__ico psog__room-del" aria-label="Rimuovi camera" onClick={onRimuovi}>
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </div>
        <div className={'psog__room-num' + (assegnata ? '' : ' is-warn')}>
          <i className={'fa-solid ' + (assegnata ? 'fa-door-closed' : 'fa-triangle-exclamation')} aria-hidden="true" />
          {assegnata
            ? <span>{c.numeri.length === 1 ? 'Camera' : 'Camere'} <strong>{c.numeri.join(', ')}</strong> riservate nel gestionale per il periodo</span>
            : <span>Nessuna camera assegnata: sceglila tra le libere qui sopra</span>}
        </div>
        <TextareaField name={`desc-${c.id}`} label="Descrizione della camera" rows={2} value={c.descrizione}
          onChange={(e) => onChange({ descrizione: e.target.value })} placeholder="Cosa rende speciale questa camera" />

        {date.length > 1 && (
          <div className="psog__days">
            <div className="psog__days-head">
              <span>Tariffe giorno per giorno <small>{c.quantita > 1 ? `per camera, × ${c.quantita}` : 'per camera'}</small></span>
              {personalizzate && (
                <button type="button" className="sib-btn sib-btn--ghost psog__days-reset" onClick={() => onChange({ tariffe: {} })}>
                  <i className="fa-regular fa-rotate-left" aria-hidden="true" /> Riporta tutte a {eur(c.prezzoNotte)}
                </button>
              )}
            </div>
            <div className="psog__days-grid">
              {date.map((d) => {
                const v = tariffa(c, d)
                const dow = new Date(d + 'T00:00:00').getDay()
                return (
                  <div key={d} className={'psog__day' + (v !== c.prezzoNotte ? ' is-custom' : '') + (dow === 5 || dow === 6 ? ' is-we' : '')}>
                    <span className="psog__day-label">{giornoBreve(d)}</span>
                    <InputField name={`t-${c.id}-${d}`} ariaLabel={`Tariffa ${giornoBreve(d)}`} dense type="number" min={0} step={1}
                      iconRight="fa-regular fa-euro-sign" value={v}
                      onChange={(e) => onChange({ tariffe: { ...c.tariffe, [d]: num(e.target.value) } })} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Servizi aggiuntivi a pagamento ───────────────────────────────────────────
function Extra({ q, onChange }: { q: PropostaSoggiorno; onChange: (extra: ServizioExtra[]) => void }) {
  const set = (id: string, patch: Partial<ServizioExtra>) => onChange(q.extra.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const rete = useServiziStore((s) => s.servizi)
  const catalogo = useMemo(() => serviziProponibili(q, rete), [q.checkin, q.checkout, rete]) // eslint-disable-line react-hooks/exhaustive-deps
  const disponibili = catalogo.filter((x) => !q.extra.some((e) => e.nome === x.nome))
  const fuori = disponibili.filter((x) => !x.disponibile).length

  return (
    <div className="psog__block psog__extra">
      <div className="psog__block-title">
        Servizi aggiuntivi a pagamento
        <span className="psog__block-hint">facoltativi: il cliente li aggiunge uno per uno quando accetta</span>
      </div>
      {q.extra.length > 0 && (
        <ul className="psog__extra-list">
          {q.extra.map((e) => (
            <li key={e.id} className="psog__extra-row">
              <InputField name={`xn-${e.id}`} ariaLabel="Servizio" dense value={e.nome} onChange={(ev) => set(e.id, { nome: ev.target.value })} placeholder="Nome del servizio" />
              <InputField name={`xp-${e.id}`} ariaLabel="Prezzo" dense type="number" min={0} iconRight="fa-regular fa-euro-sign"
                value={e.prezzo} onChange={(ev) => set(e.id, { prezzo: Math.max(0, Number(ev.target.value) || 0) })} />
              <SelectField name={`xu-${e.id}`} ariaLabel="Unità" value={e.unita} onChange={(ev) => set(e.id, { unita: ev.target.value as UnitaExtra })}
                options={(Object.keys(UNITA) as UnitaExtra[]).map((u) => ({ value: u, label: UNITA[u] }))} />
              <span className="psog__extra-tot">{eur(costoExtra(e, q))}</span>
              <Tooltip text="Rimuovi servizio">
                <button type="button" className="sib-btn sib-btn--icon psog__ico" aria-label="Rimuovi servizio" onClick={() => onChange(q.extra.filter((x) => x.id !== e.id))}>
                  <i className="fa-solid fa-xmark" aria-hidden="true" />
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
      <div className="psog__extra-add">
        <SelectField name={`xcat-${q.id}`} ariaLabel="Aggiungi un servizio disponibile nel periodo" value="" placeholder="Aggiungi un servizio disponibile nel periodo…"
          onChange={(ev) => {
            const x = disponibili.find((d) => d.nome === ev.target.value && d.disponibile)
            if (x) onChange([...q.extra, { id: uid(), nome: x.nome, prezzo: x.prezzo, unita: x.unita }])
          }}
          options={[...disponibili].sort((a, b) => Number(b.disponibile) - Number(a.disponibile)).map((x) => ({
            value: x.nome, disabled: !x.disponibile,
            label: `${x.fonte === 'rete' ? 'Rete · ' : ''}${x.nome} · ${eur(x.prezzo)} ${UNITA[x.unita]}${x.nota ? ` (${x.nota.toLowerCase()})` : ''}`,
          }))} />
        <button type="button" className="sib-btn sib-btn--ghost" onClick={() => onChange([...q.extra, { id: uid(), nome: '', prezzo: 0, unita: 'soggiorno' }])}>
          <i className="fa-regular fa-plus" aria-hidden="true" /> Servizio personalizzato
        </button>
        {fuori > 0 && <span className="psog__block-hint">{fuori} {fuori === 1 ? 'servizio non disponibile' : 'servizi non disponibili'} nelle date scelte</span>}
      </div>
    </div>
  )
}

// ─── Mail: anteprima e invio; pagina di conferma del cliente ─────────────────
type VistaMail =
  | { k: 'mail' }
  | { k: 'proposta'; id: string }
  | { k: 'pagamento'; id: string; extra: string[]; termini?: string }
  | { k: 'conferma' }
  | { k: 'rifiuto'; t: TentativoPagamento }

function MailModal({ pr, template, modo, onClose, onInvia, onAccetta, onRifiuto }: {
  pr: PreventivoSoggiorno; template: TemplateSoggiorno; modo: 'anteprima' | 'invia' | 'conferma' | 'rifiuto'
  onClose: () => void; onInvia: (oggetto: string) => void
  onAccetta: (propostaId: string, extraScelti: string[], terminiAccettati?: string, pagamento?: TentativoPagamento) => void
  onRifiuto: (t: TentativoPagamento) => void
}) {
  const lingua: Lingua = pr.lingua ?? 'it'
  const invio = modo === 'invia'
  const ultimoKo = [...(pr.pagamenti ?? [])].reverse().find((t) => t.esito === 'rifiutato')
  const [vista, setVista] = useState<VistaMail>(() => (modo === 'conferma' ? { k: 'conferma' } : modo === 'rifiuto' && ultimoKo ? { k: 'rifiuto', t: ultimoKo } : { k: 'mail' }))
  const [oggetto, setOggetto] = useState(`${tr(lingua, 'Preventivo di soggiorno')} · ${pr.struttura}`)
  const documenti = useTerminiStore((s) => s.documenti)
  const termini = terminiDi(template.termini.id, documenti)
  const html = useMemo(() => {
    if (vista.k === 'conferma') return mailHtml(pr, { template, termini, tipo: 'conferma' })
    if (vista.k === 'rifiuto') return mailHtml(pr, { template, termini, tipo: 'rifiuto', rifiuto: { importo: vista.t.importo, motivo: motivoIn(vista.t.motivo ?? '', lingua) } })
    return mailHtml(pr, { template, termini })
  }, [pr, template, termini, vista, lingua])
  // Termini da accettare nella pagina di conferma (se il blocco è nella mail).
  const daAccettare = termini && template.termini.obbligatorio && template.blocchi.some((b) => b.id === 'termini' && b.visibile) ? terminiIn(termini, lingua) : null
  const frame = useRef<HTMLIFrameElement>(null)
  const clickRef = useRef<(a: HTMLAnchorElement) => void>(() => undefined)
  clickRef.current = (a) => {
    if (pr.stato === 'Bozza') { toast.info('I pulsanti si attivano quando il preventivo è inviato al cliente'); return }
    const id = a.getAttribute('data-accetta')
    if (id) setVista({ k: 'proposta', id })
    // "Riprova il pagamento" dalla mail di pagamento non riuscito.
    if (a.getAttribute('data-paga') && vista.k === 'rifiuto' && vista.t.propostaId) {
      setVista({ k: 'pagamento', id: vista.t.propostaId, extra: vista.t.extraScelti ?? [] })
    }
  }

  // I pulsanti della mail: nell'anteprima simulano il click del cliente.
  const aggancia = () => {
    frame.current?.contentDocument?.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a')
      if (!a) return
      e.preventDefault()
      clickRef.current(a)
    })
  }

  const titoli: Record<VistaMail['k'], string> = {
    mail: invio ? 'Invia preventivo via mail' : 'Anteprima della mail',
    proposta: 'Conferma della proposta (pagina del cliente)',
    pagamento: 'Pagamento con carta (pagina del cliente)',
    conferma: 'Mail di conferma della prenotazione',
    rifiuto: 'Mail di pagamento non riuscito',
  }
  const oggettoMail = vista.k === 'conferma' ? `${tr(lingua, 'Conferma prenotazione')} · ${pr.struttura}`
    : vista.k === 'rifiuto' ? `${MESSAGGI[lingua].rifiutoTitolo} · ${pr.struttura}` : oggetto
  const proposta = vista.k === 'proposta' || vista.k === 'pagamento' ? pr.proposte.find((q) => q.id === vista.id) : undefined

  return (
    <Modal open onClose={onClose} size="xl" title={titoli[vista.k]} className="psog-mail">
      {vista.k === 'proposta' && proposta ? (
        <ConfermaCliente pr={pr} q={proposta} termini={daAccettare} pagamento={template.pagamento.attivo} onIndietro={() => setVista({ k: 'mail' })}
          onConferma={(extra) => {
            const tc = daAccettare ? `${daAccettare.titolo} (agg. ${daAccettare.aggiornato})` : undefined
            if (template.pagamento.attivo) { setVista({ k: 'pagamento', id: proposta.id, extra, termini: tc }); return }
            onAccetta(proposta.id, extra, tc)
            setVista({ k: 'mail' })
          }} />
      ) : vista.k === 'pagamento' && proposta ? (
        <div className="psog-mail__body">
          <PagamentoNexi pr={pr} q={proposta} extraScelti={vista.extra} template={template}
            onIndietro={() => setVista({ k: 'proposta', id: proposta.id })}
            onVediConferma={() => setVista({ k: 'conferma' })}
            onEsito={(t) => {
              const tent = { ...t, propostaId: proposta.id, extraScelti: vista.extra }
              if (t.esito === 'autorizzato') onAccetta(proposta.id, vista.extra, vista.termini, tent)
              else onRifiuto(tent)
            }} />
        </div>
      ) : (
        <>
          <div className="psog-mail__body">
            {invio && vista.k === 'mail' && (
              <div className="psog-mail__fields">
                <InputField name="mail-a" label="A" value={pr.email} readOnly iconLeft="fa-regular fa-envelope" />
                <InputField name="mail-oggetto" label="Oggetto" value={oggetto} onChange={(e) => setOggetto(e.target.value)} />
              </div>
            )}
            {(invio || vista.k !== 'mail') && (
              <p className="psog-mail__hint"><i className="fa-regular fa-circle-info" aria-hidden="true" /> La piattaforma non è ancora collegata a un servizio di invio: la mail si scarica (.eml) e si apre come bozza nel programma di posta, già impaginata e con destinatario e oggetto, pronta da spedire.</p>
            )}
            {!invio && vista.k === 'mail' && pr.stato === 'Inviato' && (
              <p className="psog-mail__hint"><i className="fa-regular fa-hand-pointer" aria-hidden="true" /> Così la vede il cliente: con "Accetta" sceglie la proposta, aggiunge i servizi extra{template.pagamento.attivo ? ' e paga con carta' : ''}.</p>
            )}
            {vista.k === 'rifiuto' && (
              <p className="psog-mail__hint"><i className="fa-regular fa-hand-pointer" aria-hidden="true" /> Con "Riprova il pagamento" il cliente torna alla pagina di pagamento.</p>
            )}
            <iframe ref={frame} className="psog-mail__frame" title="Anteprima mail" srcDoc={html} onLoad={aggancia} />
          </div>
          <div className="psog-mail__foot">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>{invio ? 'Annulla' : 'Chiudi'}</button>
            {invio && vista.k === 'mail' ? (
              <button type="button" className="sib-btn sib-btn--primary" onClick={() => onInvia(oggetto)}>
                <i className="fa-regular fa-download" aria-hidden="true" /> Scarica la mail per {pr.email}
              </button>
            ) : vista.k !== 'mail' && (
              <button type="button" className="sib-btn sib-btn--primary"
                onClick={() => { scaricaEml(html, pr.email, oggettoMail, `${titoli[vista.k]} ${pr.codice}`); toast.info('Mail scaricata: aprila nel programma di posta e premi Invia') }}>
                <i className="fa-regular fa-download" aria-hidden="true" /> Scarica la mail per {pr.email || 'il cliente'}
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

function ConfermaCliente({ pr, q, termini, pagamento, onIndietro, onConferma }: {
  pr: PreventivoSoggiorno; q: PropostaSoggiorno; termini: Termini | null; pagamento: boolean
  onIndietro: () => void; onConferma: (extra: string[]) => void
}) {
  const [presi, setPresi] = useState<string[]>([])
  const [letti, setLetti] = useState(false)
  const k = conto(q, presi)
  const i = pr.proposte.findIndex((x) => x.id === q.id)
  const toggle = (id: string) => setPresi((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  // La pagina del cliente parla la lingua del preventivo.
  const lingua: Lingua = pr.lingua ?? 'it'
  const M = MESSAGGI[lingua]
  const loc = LINGUE[lingua].locale
  const L_ = (x: string) => tr(lingua, x)
  const eur = (n: number) => n.toLocaleString(loc, { style: 'currency', currency: 'EUR' })
  const giorno = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <>
      <div className="psog-conf">
        <div className="psog-conf__hero">
          <span className="psog-conf__brand">{pr.struttura}</span>
          <h3>{M.confTitolo(pr.cliente)}</h3>
          <p>{M.confSottotitolo(LETTERE[i], L_(q.titolo))}</p>
        </div>

        <div className="psog-conf__grid">
          <div className="psog-conf__recap">
            <div className="psog-conf__rooms">
              {q.camere.map((c) => (
                <div key={c.id} className="psog-conf__room">
                  {c.immagine ? <img src={c.immagine} alt={c.tipologia} /> : <RoomIllustration tipo={tipologia(c.tipologia).tipo} fill />}
                  <span>{c.quantita} × {L_(c.tipologia)}</span>
                </div>
              ))}
            </div>
            <p className="psog-conf__meta"><i className="fa-regular fa-calendar" aria-hidden="true" /> {giorno(q.checkin)} → {giorno(q.checkout)} · {M.notti(k.notti)} · {[M.adulti(q.adulti), q.bambini ? M.bambini(q.bambini) : ''].filter(Boolean).join(' · ')}</p>
            <p className="psog-conf__meta"><i className="fa-regular fa-utensils" aria-hidden="true" /> {L_(q.trattamento)}</p>
          </div>

          <div className="psog-conf__extra">
            <h4>{M.extraTitolo}</h4>
            {q.extra.length === 0 && <p className="psog-conf__none">{M.confNessunExtra}</p>}
            <ul>
              {q.extra.map((e) => {
                const on = presi.includes(e.id)
                return (
                  <li key={e.id}>
                    <button type="button" aria-pressed={on} className={'psog-conf__opt' + (on ? ' is-on' : '')} onClick={() => toggle(e.id)}>
                      <i className={on ? 'fa-solid fa-square-check' : 'fa-regular fa-square'} aria-hidden="true" />
                      <span className="psog-conf__opt-txt">
                        <strong>{L_(e.nome)}</strong>
                        <small>{eur(e.prezzo)} {M.unita[e.unita]}</small>
                      </span>
                      <span className="psog-conf__opt-tot">{on ? '+ ' : ''}{eur(costoExtra(e, q))}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {termini && (
              <div className="psog-conf__tc">
                <details>
                  <summary>{M.confLeggi(termini.titolo)}</summary>
                  <ol>{termini.sezioni.map((x) => <li key={x.id}><strong>{x.titolo}</strong> {x.testo}</li>)}</ol>
                </details>
                <CheckboxField name="tc-accetto" label={M.confAccetto(termini.titolo)} checked={letti}
                  onChange={(e) => setLetti(e.target.checked)} />
              </div>
            )}

            <dl className="psog-conf__tot">
              <div><dt>{M.confSoggiorno}</dt><dd>{eur(k.totale)}</dd></div>
              {k.extra > 0 && <div><dt>{M.extraTitolo}</dt><dd>{eur(k.extra)}</dd></div>}
              <div className="is-tot"><dt>{M.totale}</dt><dd>{eur(k.totaleConExtra)}</dd></div>
            </dl>
          </div>
        </div>
      </div>
      <div className="psog-mail__foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onIndietro}>
          <i className="fa-regular fa-arrow-left" aria-hidden="true" /> {M.confIndietro}
        </button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!!termini && !letti} onClick={() => onConferma(presi)}>
          <i className={'fa-solid ' + (pagamento ? 'fa-credit-card' : 'fa-circle-check')} aria-hidden="true" /> {M.confPulsante(LETTERE[i])}
        </button>
      </div>
    </>
  )
}
