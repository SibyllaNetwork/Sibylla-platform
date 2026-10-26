import React, { useMemo, useRef, useState } from 'react'
import Modal from '../../../../core/components/Modal'
import Tooltip from '../../../../core/components/Tooltip'
import RoomIllustration from '../../../impostazioni/InventarioCamere/RoomIllustration'
import AlertBanner from '../../../../core/components/AlertBanner'
import { CheckboxField, DateRangeField, InputField, SelectField, TextareaField } from '../../../../core/components/form'
import { toast } from '../../../../core/components/Toast/useToast'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import {
  usePreventiviSoggiornoStore, type CameraProposta, type PreventivoSoggiorno, type PropostaSoggiorno, type ServizioExtra, type UnitaExtra,
} from '../../../../store/usePreventiviSoggiornoStore'
import {
  EXTRA_CATALOGO, LETTERE, SERVIZI, STRUTTURE, TIPOLOGIE, TRATTAMENTI, UNITA, VALIDITA, comprimiFoto, conto, costoCamera, costoExtra,
  eur, giornoBreve, mailHtml, notti, nottiDate, ospitiLabel, periodo, tariffa, tipologia,
} from './soggiorno'
import './PreventivoSoggiorno.sass'

/**
 * Preventivo di soggiorno: una o più soluzioni (date, camere, trattamento,
 * servizi inclusi, tassa di soggiorno), ognuna col suo prezzo e con servizi
 * aggiuntivi a pagamento facoltativi. Ogni camera ha foto, descrizione e
 * tariffe giorno per giorno. Si stampa o si invia via mail; il cliente accetta
 * una proposta dai pulsanti nella mail e aggiunge gli extra che vuole.
 */

const uid = () => Math.random().toString(36).slice(2, 10)
const isoTra = (giorni: number) => {
  const d = new Date(); d.setDate(d.getDate() + giorni)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const oggi = () => new Date().toLocaleDateString('it-IT')
const ora = () => new Date().toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const nuovaCamera = (nome = 'Doppia Classic'): CameraProposta => ({
  id: uid(), tipologia: nome, quantita: 1, prezzoNotte: tipologia(nome).prezzo, tariffe: {},
  descrizione: tipologia(nome).descrizione, immagine: null,
})

const nuovaProposta = (): PropostaSoggiorno => ({
  id: uid(), titolo: '', checkin: isoTra(14), checkout: isoTra(17), adulti: 2, bambini: 0,
  camere: [nuovaCamera()], trattamento: 'Pernottamento e colazione', servizi: ['Wi-Fi'], extra: [],
  scontoPct: 0, tassaImporto: 3.5, tassaMaxNotti: 7, tassaEsentiMinori: true,
})

const MESSAGGIO = 'grazie per averci contattato. Abbiamo preparato per te le soluzioni qui sotto: scegli quella che preferisci con il pulsante "Accetta" e ti confermeremo la prenotazione.'

const nuovoPreventivo = (codice: string): PreventivoSoggiorno => ({
  id: uid(), codice, struttura: STRUTTURE[0], cliente: '', email: '', telefono: '',
  messaggio: MESSAGGIO, validita: '7', creato: oggi(), stato: 'Bozza', proposte: [nuovaProposta()],
})

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

export default function PreventivoSoggiorno({ navigate, preventivoId }: { navigate: (p: string) => void; preventivoId?: string }) {
  const salvato = usePreventiviSoggiornoStore((s) => s.preventivi.find((p) => p.id === preventivoId))
  const salva = usePreventiviSoggiornoStore((s) => s.salva)
  const confirm = useConfirmStore((s) => s.confirm)

  const [pr, setPr] = useState<PreventivoSoggiorno>(() => salvato ?? nuovoPreventivo(usePreventiviSoggiornoStore.getState().prossimoCodice()))
  const [errori, setErrori] = useState<string[]>([])
  const [mail, setMail] = useState<null | 'anteprima' | 'invia'>(null)

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

  const invia = () => {
    const inviato: PreventivoSoggiorno = { ...pr, stato: pr.stato === 'Accettato' ? pr.stato : 'Inviato', inviatoIl: ora() }
    setPr(inviato); salva(inviato); setMail(null)
    toast.success(`Preventivo ${pr.codice} inviato a ${pr.email}`)
  }

  // Il cliente accetta una proposta (dall'anteprima della mail) con gli extra scelti.
  const accetta = (propostaId: string, extraScelti: string[]) => {
    const i = pr.proposte.findIndex((q) => q.id === propostaId)
    const accettato: PreventivoSoggiorno = { ...pr, stato: 'Accettato', accettata: propostaId, extraScelti, rispostaIl: ora() }
    setPr(accettato); salva(accettato)
    const extra = extraScelti.length ? ` con ${extraScelti.length} ${extraScelti.length === 1 ? 'servizio aggiuntivo' : 'servizi aggiuntivi'}` : ''
    toast.success(`${pr.cliente} ha accettato la proposta ${LETTERE[i]}${extra}`, 'Preventivo accettato')
  }

  const stampa = () => {
    if (!valida()) return
    const f = document.createElement('iframe')
    f.className = 'psog__print-frame'
    document.body.appendChild(f)
    const doc = f.contentDocument!
    doc.open(); doc.write(mailHtml(pr, { stampa: true })); doc.close()
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
          </span>
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
                  options={STRUTTURE.map((s) => ({ value: s, label: s }))} />
                <InputField name="cliente" label="Cliente" required value={pr.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder="Nome e cognome o azienda" />
                <InputField name="email" label="Email" type="email" required value={pr.email} onChange={(e) => set('email', e.target.value)} placeholder="nome@dominio.it" />
                <InputField name="telefono" label="Telefono" type="tel" value={pr.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+39 ..." />
                <SelectField name="validita" label="Validità offerta" value={pr.validita} onChange={(e) => set('validita', e.target.value)}
                  options={VALIDITA.map((v) => ({ value: v, label: `${v} giorni` }))} />
              </div>
              <TextareaField name="messaggio" label="Messaggio al cliente" rows={3} value={pr.messaggio} onChange={(e) => set('messaggio', e.target.value)} />
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
                <Proposta key={q.id} q={q} i={i} sola={pr.proposte.length === 1} scelta={pr.accettata === q.id}
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
        <MailModal pr={pr} invio={mail === 'invia'} onClose={() => setMail(null)} onInvia={invia} onAccetta={accetta} />
      )}
    </div>
  )
}

// ─── Singola soluzione ────────────────────────────────────────────────────────
function Proposta({ q, i, sola, scelta, onChange, onDuplica, onElimina }: {
  q: PropostaSoggiorno; i: number; sola: boolean; scelta: boolean
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
          {q.camere.map((c) => (
            <Camera key={c.id} c={c} date={date} rimovibile={q.camere.length > 1}
              onChange={(patch) => setCamera(c.id, patch)}
              onRimuovi={() => onChange({ camere: q.camere.filter((x) => x.id !== c.id) })} />
          ))}
          <div className="psog__camere-foot">
            <button type="button" className="sib-btn sib-btn--ghost" onClick={() => onChange({ camere: [...q.camere, nuovaCamera()] })}>
              <i className="fa-regular fa-plus" aria-hidden="true" /> Aggiungi camera
            </button>
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

// ─── Camera: foto + descrizione accanto, tariffe giorno per giorno ───────────
function Camera({ c, date, rimovibile, onChange, onRimuovi }: {
  c: CameraProposta; date: string[]; rimovibile: boolean
  onChange: (patch: Partial<CameraProposta>) => void; onRimuovi: () => void
}) {
  const file = useRef<HTMLInputElement>(null)
  const num = (v: string, min = 0) => Math.max(min, Number(v) || 0)
  const t = tipologia(c.tipologia)
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
            options={TIPOLOGIE.map((x) => ({ value: x.nome, label: `${x.nome} · max ${x.capacita}` }))} />
          <InputField name={`qta-${c.id}`} label="Camere" type="number" min={1} value={c.quantita} onChange={(e) => onChange({ quantita: num(e.target.value, 1) })} />
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
  const disponibili = EXTRA_CATALOGO.filter((x) => !q.extra.some((e) => e.nome === x.nome))

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
        <SelectField name={`xcat-${q.id}`} ariaLabel="Aggiungi dal catalogo" value="" placeholder="Aggiungi dal catalogo…"
          onChange={(ev) => {
            const x = disponibili.find((d) => d.nome === ev.target.value)
            if (x) onChange([...q.extra, { ...x, id: uid() }])
          }}
          options={disponibili.map((x) => ({ value: x.nome, label: `${x.nome} · ${eur(x.prezzo)} ${UNITA[x.unita]}` }))} />
        <button type="button" className="sib-btn sib-btn--ghost" onClick={() => onChange([...q.extra, { id: uid(), nome: '', prezzo: 0, unita: 'soggiorno' }])}>
          <i className="fa-regular fa-plus" aria-hidden="true" /> Servizio personalizzato
        </button>
      </div>
    </div>
  )
}

// ─── Mail: anteprima e invio; pagina di conferma del cliente ─────────────────
function MailModal({ pr, invio, onClose, onInvia, onAccetta }: {
  pr: PreventivoSoggiorno; invio: boolean; onClose: () => void; onInvia: () => void
  onAccetta: (propostaId: string, extraScelti: string[]) => void
}) {
  const [oggetto, setOggetto] = useState(`Il tuo preventivo di soggiorno · ${pr.struttura}`)
  // Proposta su cui il cliente ha cliccato "Accetta": apre la pagina di conferma.
  const [conferma, setConferma] = useState<string | null>(null)
  const html = useMemo(() => mailHtml(pr), [pr])
  const frame = useRef<HTMLIFrameElement>(null)
  const clickRef = useRef<(id: string) => void>(() => undefined)
  clickRef.current = (id) => {
    if (pr.stato === 'Bozza') { toast.info('I pulsanti si attivano quando il preventivo è inviato al cliente'); return }
    setConferma(id)
  }

  // I pulsanti "Accetta" della mail: nell'anteprima simulano il click del cliente.
  const aggancia = () => {
    frame.current?.contentDocument?.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('a')
      if (!a) return
      e.preventDefault()
      const id = a.getAttribute('data-accetta')
      if (id) clickRef.current(id)
    })
  }

  const proposta = pr.proposte.find((q) => q.id === conferma)
  const titolo = proposta ? 'Conferma della proposta (pagina del cliente)' : invio ? 'Invia preventivo via mail' : 'Anteprima della mail'

  return (
    <Modal open onClose={onClose} size="xl" title={titolo} className="psog-mail">
      {proposta ? (
        <ConfermaCliente pr={pr} q={proposta} onIndietro={() => setConferma(null)}
          onConferma={(extra) => { onAccetta(proposta.id, extra); setConferma(null) }} />
      ) : (
        <>
          <div className="psog-mail__body">
            {invio && (
              <div className="psog-mail__fields">
                <InputField name="mail-a" label="A" value={pr.email} readOnly iconLeft="fa-regular fa-envelope" />
                <InputField name="mail-oggetto" label="Oggetto" value={oggetto} onChange={(e) => setOggetto(e.target.value)} />
              </div>
            )}
            {!invio && pr.stato === 'Inviato' && (
              <p className="psog-mail__hint"><i className="fa-regular fa-hand-pointer" aria-hidden="true" /> Così la vede il cliente: con "Accetta" sceglie la proposta e aggiunge i servizi extra che desidera.</p>
            )}
            <iframe ref={frame} className="psog-mail__frame" title="Anteprima mail" srcDoc={html} onLoad={aggancia} />
          </div>
          <div className="psog-mail__foot">
            <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>{invio ? 'Annulla' : 'Chiudi'}</button>
            {invio && (
              <button type="button" className="sib-btn sib-btn--primary" onClick={onInvia}>
                <i className="fa-solid fa-paper-plane" aria-hidden="true" /> Invia a {pr.email}
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

function ConfermaCliente({ pr, q, onIndietro, onConferma }: {
  pr: PreventivoSoggiorno; q: PropostaSoggiorno; onIndietro: () => void; onConferma: (extra: string[]) => void
}) {
  const [presi, setPresi] = useState<string[]>([])
  const k = conto(q, presi)
  const i = pr.proposte.findIndex((x) => x.id === q.id)
  const toggle = (id: string) => setPresi((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <>
      <div className="psog-conf">
        <div className="psog-conf__hero">
          <span className="psog-conf__brand">{pr.struttura}</span>
          <h3>Ottima scelta, {pr.cliente}!</h3>
          <p>Stai accettando la proposta {LETTERE[i]}{q.titolo ? ` · ${q.titolo}` : ''}. Vuoi aggiungere qualcosa al tuo soggiorno?</p>
        </div>

        <div className="psog-conf__grid">
          <div className="psog-conf__recap">
            <div className="psog-conf__rooms">
              {q.camere.map((c) => (
                <div key={c.id} className="psog-conf__room">
                  {c.immagine ? <img src={c.immagine} alt={c.tipologia} /> : <RoomIllustration tipo={tipologia(c.tipologia).tipo} fill />}
                  <span>{c.quantita} × {c.tipologia}</span>
                </div>
              ))}
            </div>
            <p className="psog-conf__meta"><i className="fa-regular fa-calendar" aria-hidden="true" /> {periodo(q)} · {k.notti} {k.notti === 1 ? 'notte' : 'notti'} · {ospitiLabel(q)}</p>
            <p className="psog-conf__meta"><i className="fa-regular fa-utensils" aria-hidden="true" /> {q.trattamento}</p>
          </div>

          <div className="psog-conf__extra">
            <h4>Servizi aggiuntivi</h4>
            {q.extra.length === 0 && <p className="psog-conf__none">Questa proposta non prevede servizi aggiuntivi.</p>}
            <ul>
              {q.extra.map((e) => {
                const on = presi.includes(e.id)
                return (
                  <li key={e.id}>
                    <button type="button" aria-pressed={on} className={'psog-conf__opt' + (on ? ' is-on' : '')} onClick={() => toggle(e.id)}>
                      <i className={on ? 'fa-solid fa-square-check' : 'fa-regular fa-square'} aria-hidden="true" />
                      <span className="psog-conf__opt-txt">
                        <strong>{e.nome}</strong>
                        <small>{eur(e.prezzo)} {UNITA[e.unita]}</small>
                      </span>
                      <span className="psog-conf__opt-tot">{on ? '+ ' : ''}{eur(costoExtra(e, q))}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <dl className="psog-conf__tot">
              <div><dt>Soggiorno (tassa inclusa)</dt><dd>{eur(k.totale)}</dd></div>
              {k.extra > 0 && <div><dt>Servizi aggiuntivi</dt><dd>{eur(k.extra)}</dd></div>}
              <div className="is-tot"><dt>Totale</dt><dd>{eur(k.totaleConExtra)}</dd></div>
            </dl>
          </div>
        </div>
      </div>
      <div className="psog-mail__foot">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onIndietro}>
          <i className="fa-regular fa-arrow-left" aria-hidden="true" /> Torna alla mail
        </button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={() => onConferma(presi)}>
          <i className="fa-solid fa-circle-check" aria-hidden="true" /> Conferma la proposta {LETTERE[i]}
        </button>
      </div>
    </>
  )
}
