import React, { useRef, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { InputField, SelectField, DatePickerField } from '../../../core/components/form'
import { withFlag } from '../../../core/utils/countryFlags'
import { apiFetchSibylla } from '../../../services/api'
import { getEditingAnagrafica, clearEditingAnagrafica } from './_state'
import './CreaAnagrafica.sass'

/**
 * Crea anagrafica personale — scheda del dipendente (stile "scheda personale",
 * sezioni raggruppate) anziché il vecchio layout "profilo" con avatar dominante.
 * BE: `anagrafica-personale/Insert`.
 */

const SESSI = [
  { value: '', label: 'Seleziona sesso' },
  { value: 'M', label: 'Maschio' },
  { value: 'F', label: 'Femmina' },
  { value: 'A', label: 'Altro' },
]

const NAZIONALITA = ['ITALIA', 'FRANCIA', 'GERMANIA', 'SPAGNA', 'REGNO UNITO', 'STATI UNITI', 'ALBANIA', 'ROMANIA', 'MAROCCO', 'CINA']
const STRUTTURE = ['Hotel Tutorial', 'Grim’s Hotel', 'Hotel Azzurro Mare', 'Hotel Archimede', 'Hotel LUX', 'Hotel Lazio']
const FASCE_TURNI = ['Mattina', 'Pomeriggio', 'Notte', 'Spezzato']
const REPARTI = ['Front office', 'F&B', 'Housekeeping', 'Manutenzione', 'Amministrazione', 'Marketing', 'Direzione', 'Cucina']
const CREDENZIALI = ['Nessuna', 'Operatore base', 'Operatore avanzato', 'Manager']

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="crea-anag__section">
      <header className="crea-anag__section-head">
        <i className={`fa-duotone ${icon}`} aria-hidden="true" />
        <h3>{title}</h3>
      </header>
      <div className="crea-anag__section-body">{children}</div>
    </section>
  )
}

interface AcqFile { name: string; dataUrl?: string }

// Acquisizione documento: scanner / file / fotocamera del terminale
function AcquisisciDoc({ label, value, onAcquire, onRemove }: {
  label: string; value: AcqFile | null; onAcquire: (f: AcqFile) => void; onRemove: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.type.startsWith('image/')) {
      const r = new FileReader()
      r.onload = () => onAcquire({ name: f.name, dataUrl: r.result as string })
      r.readAsDataURL(f)
    } else onAcquire({ name: f.name })
  }
  return (
    <div className="crea-anag__field">
      <label className="crea-anag__label">{label}</label>
      <div className="crea-anag__acq">
        {value ? (
          <div className="crea-anag__acq-preview">
            {value.dataUrl
              ? <img src={value.dataUrl} alt={value.name} />
              : <span className="crea-anag__acq-file"><i className="fa-light fa-file-lines" /> {value.name}</span>}
            <button type="button" className="crea-anag__acq-del" aria-label="Rimuovi" onClick={onRemove}><i className="fa-light fa-xmark" /></button>
          </div>
        ) : (
          <div className="crea-anag__acq-btns">
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => fileRef.current?.click()}><i className="fa-light fa-scanner-image" /> Scanner</button>
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => fileRef.current?.click()}><i className="fa-light fa-folder-open" /> File</button>
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={() => camRef.current?.click()}><i className="fa-light fa-camera" /> Foto</button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handle} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      </div>
    </div>
  )
}

export default function CreaAnagrafica({ navigate, editing = false }: { navigate: (p: string) => void; editing?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [contrattoName, setContrattoName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [docIdentita, setDocIdentita] = useState<AcqFile | null>(null)
  const [docCF, setDocCF] = useState<AcqFile | null>(null)
  const [docContrattuale, setDocContrattuale] = useState<string[]>([])
  const docContrRef = useRef<HTMLInputElement>(null)
  const onDocContrattuale = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = e.target.files
    if (fs) setDocContrattuale((prev) => [...prev, ...Array.from(fs).map((f) => f.name)])
    e.target.value = ''
  }

  const initial = editing ? getEditingAnagrafica() : null
  const [form, setForm] = useState({
    nome: '', cognome: '', data_nascita: '', sesso: '',
    codice_fiscale: '', email: '', telefono: '', contatto_emergenza: '',
    indirizzo: '', indirizzo2: '', cap: '', provincia: '', nazionalita: 'ITALIA',
    strutture: '', credenziali: '', numero_turni: 1, fasce_turni: '', reparti: '',
    ...(initial ? {
      nome: initial.nome ?? '', cognome: initial.cognome ?? '', data_nascita: initial.data_nascita ?? '',
      codice_fiscale: initial.codice_fiscale ?? '', indirizzo: initial.indirizzo ?? '',
      cap: initial.cap ?? '', provincia: initial.provincia ?? '', nazionalita: initial.nazionalita ?? 'ITALIA',
    } : {}),
  })

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }))

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  function onContrattoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setContrattoName(f?.name ?? '')
  }

  async function handleSave() {
    if (!form.nome || !form.cognome) {
      setError('Nome e cognome sono obbligatori'); return
    }
    setError(null); setPending(true)
    try {
      await apiFetchSibylla(editing ? 'anagrafica-personale/Update' : 'anagrafica-personale/Insert', { method: 'POST', body: form })
    } catch { /* mock: salva comunque */ }
    setPending(false)
    clearEditingAnagrafica()
    navigate('archivio-personale')
  }

  return (
    <div className="crea-anag">
      <BtnBack onClick={() => { clearEditingAnagrafica(); navigate('archivio-personale') }} />
      <PageHeader
        title={editing ? 'Modifica anagrafica personale' : 'Creazione anagrafica personale'}
        subtitle="Scheda del dipendente: dati anagrafici, contatti, residenza e inquadramento"
      />

      {error && <p className="crea-anag__error"><i className="fa-light fa-circle-exclamation" /> {error}</p>}

      <div className="crea-anag__sheet">
        <Section icon="fa-id-card" title="Dati anagrafici">
          <div className="crea-anag__identity">
            {/* Foto compatta */}
            <div className="crea-anag__photo">
              <div className="crea-anag__photo-thumb" onClick={() => photoInputRef.current?.click()}>
                {photoPreview
                  ? <img src={photoPreview} alt="anteprima" />
                  : <i className="fa-duotone fa-user" />}
              </div>
              <div className="crea-anag__photo-btns">
                <button type="button" className="sib-btn sib-btn--icon" title="Scatta foto" onClick={() => photoInputRef.current?.click()}>
                  <i className="fa-duotone fa-camera" />
                </button>
                <button type="button" className="sib-btn sib-btn--icon" title="Carica immagine" onClick={() => photoInputRef.current?.click()}>
                  <i className="fa-duotone fa-image" />
                </button>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
            </div>

            {/* Campi anagrafici */}
            <div className="crea-anag__grid crea-anag__grid--3 crea-anag__identity-fields">
              <InputField      name="nome"           label="Nome"            value={form.nome}           onChange={(e) => set('nome', e.target.value)} />
              <InputField      name="cognome"        label="Cognome"         value={form.cognome}        onChange={(e) => set('cognome', e.target.value)} />
              <DatePickerField name="data_nascita"   label="Data di nascita" value={form.data_nascita}   onChange={(e) => set('data_nascita', e.target.value)} />
              <SelectField     name="sesso"          label="Sesso"           value={form.sesso}          onChange={(e) => set('sesso', e.target.value)} options={SESSI} />
              <InputField      name="codice_fiscale" label="Codice fiscale"  value={form.codice_fiscale} onChange={(e) => set('codice_fiscale', e.target.value)} />
              <SelectField     name="nazionalita"    label="Nazionalità"     value={form.nazionalita}    onChange={(e) => set('nazionalita', e.target.value)}
                options={NAZIONALITA.map((n) => ({ value: n, label: withFlag(n) }))} />
            </div>
          </div>
        </Section>

        <Section icon="fa-address-book" title="Contatti">
          <div className="crea-anag__grid crea-anag__grid--3">
            <InputField name="email"              label="E-mail"   type="email" value={form.email}              onChange={(e) => set('email', e.target.value)} />
            <InputField name="telefono"           label="Telefono" type="tel"   value={form.telefono}           onChange={(e) => set('telefono', e.target.value)} />
            <InputField name="contatto_emergenza" label="Contatto di emergenza" value={form.contatto_emergenza} onChange={(e) => set('contatto_emergenza', e.target.value)} />
          </div>
        </Section>

        <Section icon="fa-location-dot" title="Residenza">
          <div className="crea-anag__grid crea-anag__grid--res">
            <InputField name="indirizzo"  label="Indirizzo"                 value={form.indirizzo}  onChange={(e) => set('indirizzo', e.target.value)} />
            <InputField name="indirizzo2" label="Indirizzo 2 (facoltativo)" value={form.indirizzo2} onChange={(e) => set('indirizzo2', e.target.value)} />
            <InputField name="cap"        label="CAP"                       value={form.cap}        onChange={(e) => set('cap', e.target.value)} />
            <InputField name="provincia"  label="Provincia"                 value={form.provincia}  onChange={(e) => set('provincia', e.target.value)} />
          </div>
        </Section>

        <Section icon="fa-briefcase" title="Inquadramento e turni">
          <div className="crea-anag__grid crea-anag__grid--3">
            <SelectField name="strutture"   label="Strutture abilitate"     value={form.strutture}   onChange={(e) => set('strutture', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...STRUTTURE.map((s) => ({ value: s, label: s }))]} />
            <SelectField name="credenziali" label="Credenziali da generare" value={form.credenziali} onChange={(e) => set('credenziali', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...CREDENZIALI.map((c) => ({ value: c, label: c }))]} />
            <InputField  name="numero_turni" label="Numero turni" type="number" value={String(form.numero_turni)} onChange={(e) => set('numero_turni', Number(e.target.value || 1))} />
            <SelectField name="fasce_turni" label="Fasce turni"             value={form.fasce_turni} onChange={(e) => set('fasce_turni', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...FASCE_TURNI.map((f) => ({ value: f, label: f }))]} />
            <SelectField name="reparti"     label="Reparti"                 value={form.reparti}     onChange={(e) => set('reparti', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...REPARTI.map((r) => ({ value: r, label: r }))]} />
          </div>
        </Section>

        <Section icon="fa-folder-open" title="Documenti e allegati">
          <div className="crea-anag__grid crea-anag__grid--3">
            <AcquisisciDoc label="Documento d'identità" value={docIdentita} onAcquire={setDocIdentita} onRemove={() => setDocIdentita(null)} />
            <AcquisisciDoc label="Codice fiscale / Tessera sanitaria" value={docCF} onAcquire={setDocCF} onRemove={() => setDocCF(null)} />
            <div className="crea-anag__field">
              <label className="crea-anag__label">Contratto di lavoro</label>
              <button type="button" className="sib-input crea-anag__file" onClick={() => fileInputRef.current?.click()}>
                <i className="fa-light fa-paperclip" />
                <span className={contrattoName ? '' : 'crea-anag__file-empty'}>{contrattoName || 'Scegli file'}</span>
              </button>
              <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={onContrattoChange} />
            </div>
          </div>

          <div className="crea-anag__field">
            <label className="crea-anag__label">Documentazione contrattuale</label>
            <div className="crea-anag__docs">
              <button type="button" className="sib-btn sib-btn--secondary" onClick={() => docContrRef.current?.click()}>
                <i className="fa-light fa-circle-plus" /> Aggiungi documenti
              </button>
              <input ref={docContrRef} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={onDocContrattuale} />
              {docContrattuale.length > 0 && (
                <ul className="crea-anag__doc-list">
                  {docContrattuale.map((n, i) => (
                    <li key={i} className="crea-anag__doc-item">
                      <span><i className="fa-light fa-file-lines" /> {n}</span>
                      <button type="button" aria-label="Rimuovi" onClick={() => setDocContrattuale((prev) => prev.filter((_, idx) => idx !== i))}><i className="fa-light fa-xmark" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Section>
      </div>

      <div className="crea-anag__actions">
        <button type="button" className="sib-btn sib-btn--ghost" onClick={() => { clearEditingAnagrafica(); navigate('archivio-personale') }}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" onClick={handleSave} disabled={pending}>
          {pending ? 'Salvataggio…' : 'Salva'}
        </button>
      </div>
    </div>
  )
}
