import React, { useState, useEffect } from 'react'
import Ico from '../../../core/icons/Ico'
import { toast } from '../../../core/components/Toast/useToast'
import { useAziendaEditStore } from './aziendaEditStore'
import './CreaAzienda.sass'

interface Props {
  navigate: (p: string) => void
}

type StepId = 'anagrafica' | 'fatturazione' | 'amministratore' | 'configurazione'

interface StepDef { id: StepId; label: string; desc: string; icon: string }

const STEPS: StepDef[] = [
  { id: 'anagrafica',     label: 'Anagrafica',     desc: 'Dati e sede dell\'azienda', icon: 'building' },
  { id: 'fatturazione',   label: 'Fatturazione',   desc: 'Dati fiscali',              icon: 'file' },
  { id: 'amministratore', label: 'Amministratore', desc: 'Utente referente',          icon: 'profile' },
  { id: 'configurazione', label: 'Configurazione', desc: 'Preferenze e logo',         icon: 'sliders' },
]

export interface FormState {
  ragioneSociale: string; nomeDitta: string; tipoAzienda: string; descrizione: string
  indirizzo: string; citta: string; nazione: string; cap: string
  partitaIva: string; codiceFiscale: string; codiceSdi: string; pec: string; emailAzienda: string; telefono: string
  uNome: string; uCognome: string; dataNascita: string; sesso: string; uEmail: string
  sitoWeb: string; indiceSostenibilita: string; demo: boolean; attivo: boolean; prerolling: boolean; partner: boolean; logo: string
}

const EMPTY: FormState = {
  ragioneSociale: '', nomeDitta: '', tipoAzienda: 'Struttura ricettiva', descrizione: '',
  indirizzo: '', citta: '', nazione: '', cap: '',
  partitaIva: '', codiceFiscale: '', codiceSdi: '', pec: '', emailAzienda: '', telefono: '',
  uNome: '', uCognome: '', dataNascita: '', sesso: '', uEmail: '',
  sitoWeb: '', indiceSostenibilita: '0', demo: false, attivo: true, prerolling: false, partner: false, logo: '',
}

const TIPI = ['Struttura ricettiva', 'Ristorante', 'Bar', 'Centro sportivo', 'Altro']

export default function CreaAzienda({ navigate }: Props) {
  // Bozza di modifica eventualmente impostata dalla pagina "Gestione aziende".
  const initialDraft = useAziendaEditStore.getState().draft
  const [editMode] = useState(!!initialDraft)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(initialDraft ? { ...EMPTY, ...initialDraft } : EMPTY)

  // La bozza si consuma una sola volta: aperture successive ripartono a vuoto.
  useEffect(() => { useAziendaEditStore.getState().clear() }, [])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }))
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const progress = Math.round(((step + 1) / STEPS.length) * 100)

  const stepValid = (i: number): boolean => {
    switch (STEPS[i].id) {
      case 'anagrafica': return !!form.ragioneSociale.trim() && !!form.nomeDitta.trim() && !!form.indirizzo.trim() && !!form.citta.trim() && !!form.nazione.trim() && !!form.cap.trim()
      case 'fatturazione': return !!form.partitaIva.trim() && !!form.emailAzienda.trim()
      case 'amministratore': return !!form.uNome.trim() && !!form.uCognome.trim() && !!form.dataNascita.trim() && !!form.sesso.trim() && !!form.uEmail.trim()
      case 'configurazione': return !!form.sitoWeb.trim()
      default: return true
    }
  }

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => set('logo', typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(f)
  }

  const goNext = () => {
    if (!stepValid(step)) return
    if (isLast) {
      const nome = form.ragioneSociale || form.nomeDitta
      if (editMode) toast.success(`Azienda «${nome}» aggiornata con successo.`, 'Modifiche salvate')
      else toast.success(`Azienda «${nome}» creata e inviata alla configurazione.`, 'Azienda creata')
      setForm(EMPTY); setStep(0); navigate('pa-gestione-aziende')
      return
    }
    setStep(s => s + 1)
  }

  return (
    <div className="caz">
      <button type="button" className="caz__back" onClick={() => navigate('pa-gestione-aziende')}>
        <Ico n="back" s={13} c="#8a6d1f" /> Indietro
      </button>
      <div className="caz__head">
        <h1 className="caz__title">{editMode ? 'Modifica azienda' : 'Crea Azienda'}</h1>
        <p className="caz__lead">
          {editMode
            ? 'Aggiorna i dati dell’azienda e salva le modifiche.'
            : 'Compila i passaggi per registrare una nuova azienda cliente.'}
        </p>
      </div>

      <div className="caz__body">
        {/* ── Card form ────────────────────────────────────────────────── */}
        <section className="caz__card">
          <header className="caz__card-head">
            <span className="caz__card-ico"><Ico n={current.icon} s={18} c="#fff" /></span>
            <div className="caz__card-titles">
              <span className="caz__eyebrow">Passo {step + 1} di {STEPS.length}</span>
              <h2 className="caz__heading">{current.label}</h2>
              <p className="caz__sub">{current.desc}</p>
            </div>
          </header>
          <div className="caz__progress"><span style={{ width: `${progress}%` }} /></div>

          <div className="caz__fields">
            {current.id === 'anagrafica' && (
              <>
                <Field label="Ragione Sociale" required>
                  <input className="caz-input" maxLength={200} value={form.ragioneSociale} onChange={e => set('ragioneSociale', e.target.value)} />
                  <Counter value={form.ragioneSociale} max={200} />
                </Field>
                <div className="caz-row">
                  <Field label="Nome Ditta" required>
                    <input className="caz-input" maxLength={200} value={form.nomeDitta} onChange={e => set('nomeDitta', e.target.value)} />
                    <Counter value={form.nomeDitta} max={200} />
                  </Field>
                  <Field label="Tipo Azienda">
                    <select className="caz-input" value={form.tipoAzienda} onChange={e => set('tipoAzienda', e.target.value)}>
                      {TIPI.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Descrizione">
                  <textarea className="caz-input caz-textarea" maxLength={255} rows={3} value={form.descrizione} onChange={e => set('descrizione', e.target.value)} />
                  <Counter value={form.descrizione} max={255} />
                </Field>
                <Field label="Indirizzo" required>
                  <input className="caz-input" maxLength={255} value={form.indirizzo} onChange={e => set('indirizzo', e.target.value)} placeholder="Via / Piazza, numero civico" />
                </Field>
                <div className="caz-row">
                  <Field label="Città" required>
                    <input className="caz-input" maxLength={100} value={form.citta} onChange={e => set('citta', e.target.value)} />
                  </Field>
                  <Field label="Nazione" required>
                    <input className="caz-input" maxLength={50} value={form.nazione} onChange={e => set('nazione', e.target.value)} />
                  </Field>
                  <Field label="CAP" required>
                    <input className="caz-input" maxLength={8} value={form.cap} onChange={e => set('cap', e.target.value)} />
                  </Field>
                </div>
              </>
            )}

            {current.id === 'fatturazione' && (
              <>
                <div className="caz-row">
                  <Field label="Partita IVA" required>
                    <input className="caz-input" maxLength={18} value={form.partitaIva} onChange={e => set('partitaIva', e.target.value)} />
                  </Field>
                  <Field label="Codice Fiscale">
                    <input className="caz-input" maxLength={36} value={form.codiceFiscale} onChange={e => set('codiceFiscale', e.target.value)} />
                  </Field>
                </div>
                <div className="caz-row">
                  <Field label="Codice destinatario (SDI)">
                    <input className="caz-input" maxLength={7} value={form.codiceSdi} onChange={e => set('codiceSdi', e.target.value)} placeholder="7 caratteri" />
                  </Field>
                  <Field label="PEC">
                    <input className="caz-input" maxLength={50} type="email" value={form.pec} onChange={e => set('pec', e.target.value)} />
                  </Field>
                </div>
                <div className="caz-row">
                  <Field label="Email Azienda" required>
                    <input className="caz-input" maxLength={255} type="email" value={form.emailAzienda} onChange={e => set('emailAzienda', e.target.value)} />
                  </Field>
                  <Field label="Telefono">
                    <input className="caz-input" maxLength={20} value={form.telefono} onChange={e => set('telefono', e.target.value)} />
                  </Field>
                </div>
              </>
            )}

            {current.id === 'amministratore' && (
              <>
                <div className="caz-row">
                  <Field label="Nome" required>
                    <input className="caz-input" maxLength={100} value={form.uNome} onChange={e => set('uNome', e.target.value)} />
                  </Field>
                  <Field label="Cognome" required>
                    <input className="caz-input" maxLength={100} value={form.uCognome} onChange={e => set('uCognome', e.target.value)} />
                  </Field>
                </div>
                <div className="caz-row">
                  <Field label="Data di Nascita" required>
                    <input className="caz-input" type="date" value={form.dataNascita} onChange={e => set('dataNascita', e.target.value)} />
                  </Field>
                  <Field label="Sesso" required>
                    <select className="caz-input" value={form.sesso} onChange={e => set('sesso', e.target.value)}>
                      <option value="">Seleziona…</option>
                      <option value="M">Maschile</option>
                      <option value="F">Femminile</option>
                      <option value="Altro">Altro</option>
                    </select>
                  </Field>
                </div>
                <Field label="Email Utente" required>
                  <input className="caz-input" maxLength={255} type="email" value={form.uEmail} onChange={e => set('uEmail', e.target.value)} placeholder="admin@azienda.it" />
                </Field>
              </>
            )}

            {current.id === 'configurazione' && (
              <>
                <div className="caz-row">
                  <Field label="Sito Web" required>
                    <input className="caz-input" value={form.sitoWeb} onChange={e => set('sitoWeb', e.target.value)} placeholder="https://…" />
                  </Field>
                  <Field label="Indice di Sostenibilità">
                    <input className="caz-input" type="number" min={0} max={100} value={form.indiceSostenibilita} onChange={e => set('indiceSostenibilita', e.target.value)} />
                  </Field>
                </div>
                <div className="caz-toggles">
                  <Toggle label="Demo" checked={form.demo} onChange={v => set('demo', v)} />
                  <Toggle label="Attivo" checked={form.attivo} onChange={v => set('attivo', v)} />
                  <Toggle label="Disponibilità Prerolling" checked={form.prerolling} onChange={v => set('prerolling', v)} />
                  <Toggle label="Partner" checked={form.partner} onChange={v => set('partner', v)} />
                </div>
                <Field label="Logo Aziendale">
                  <label className="caz-drop">
                    {form.logo
                      ? <img className="caz-drop__img" src={form.logo} alt="Logo" />
                      : <span className="caz-drop__hint"><Ico n="upload" s={16} c="var(--color-text-disabled)" /> Trascina o scegli un'immagine</span>}
                    <input type="file" accept="image/*" hidden onChange={handleLogo} />
                  </label>
                </Field>
              </>
            )}
          </div>

          <footer className="caz__nav">
            {step > 0
              ? <button type="button" className="caz-btn caz-btn--ghost" onClick={() => setStep(s => s - 1)}><Ico n="arrow-left" s={13} c="#2A2208" /> Indietro</button>
              : <span />}
            <button type="button" className="caz-btn caz-btn--primary" disabled={!stepValid(step)} onClick={goNext}>
              {isLast ? (editMode ? 'Salva modifiche' : 'Crea Azienda') : 'Avanti'}
              {!isLast && <Ico n="arrow-right" s={13} c="#fff" />}
            </button>
          </footer>
        </section>

        {/* ── Stepper ──────────────────────────────────────────────────── */}
        <nav className="caz__stepper" aria-label="Avanzamento">
          {STEPS.map((s, i) => {
            const state = i === step ? 'active' : (i < step ? 'done' : 'todo')
            return (
              <button key={s.id} type="button" className={`caz-step caz-step--${state}`} onClick={() => setStep(i)}>
                <span className="caz-step__node">
                  <Ico n={state === 'done' ? 'check' : s.icon} s={17} c={state === 'todo' ? '#a9863a' : '#fff'} />
                </span>
                <span className="caz-step__meta">
                  <span className="caz-step__label">{s.label}</span>
                  <span className="caz-step__desc">{s.desc}</span>
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="caz-field">
      <label className="caz-label">
        {label}{required && <span className="caz-req"> *</span>}
      </label>
      {children}
    </div>
  )
}

function Counter({ value, max }: { value: string; max: number }) {
  return <span className="caz-count"><b>{value.length}</b> / {max}</span>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="caz-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="caz-toggle__track"><span className="caz-toggle__knob" /></span>
      <span className="caz-toggle__label">{label}</span>
    </label>
  )
}
