import React, { useRef, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import { InputField, SelectField, DatePickerField } from '../../../core/components/form'
import { withFlag } from '../../../core/utils/countryFlags'
import { apiFetchSibylla } from '../../../services/api'

/**
 * Crea anagrafica personale — replica `Views/HumanResource/CreateAnagraficaPersonale.cshtml`.
 * BE: `AnagraficaPersonaleController.Insert` → catch-all
 * `/Sibylla/anagrafica-personale/Insert`.
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

export default function CreaAnagrafica({ navigate }: { navigate: (p: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [contrattoName, setContrattoName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const [form, setForm] = useState({
    nome: '', cognome: '', data_nascita: '', sesso: '',
    codice_fiscale: '', email: '', telefono: '', contatto_emergenza: '',
    indirizzo: '', indirizzo2: '', cap: '', provincia: '', nazionalita: 'ITALIA',
    strutture: '', credenziali: '', numero_turni: 1, fasce_turni: '', reparti: '',
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
      await apiFetchSibylla('anagrafica-personale/Insert', { method: 'POST', body: form })
      navigate('archivio-personale')
    } catch (err: any) {
      setError(err?.message ?? 'Salvataggio fallito')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('archivio-personale')} />
      <PageHeader title="Creazione anagrafica personale" />

      {error && <AlertBanner type="error">{error}</AlertBanner>}

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 mt-2">
        {/* Photo column */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="sib-btn sib-btn--icon"
              title="Scatta foto"
              onClick={() => photoInputRef.current?.click()}
            >
              <i className="fa-duotone fa-camera" />
            </button>
            <button
              type="button"
              className="sib-btn sib-btn--icon"
              title="Carica immagine"
              onClick={() => photoInputRef.current?.click()}
            >
              <i className="fa-duotone fa-image" />
            </button>
          </div>
          <div
            className="w-44 h-44 rounded-full border border-line bg-canvas flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => photoInputRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="anteprima" className="w-full h-full object-cover" />
            ) : (
              <i className="fa-duotone fa-user text-6xl text-ink-muted" />
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPhotoChange}
          />
        </div>

        {/* Form column */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <InputField      name="nome"         label="Nome"            value={form.nome}         onChange={(e) => set('nome', e.target.value)} />
            <InputField      name="cognome"      label="Cognome"         value={form.cognome}      onChange={(e) => set('cognome', e.target.value)} />
            <DatePickerField name="data_nascita" label="Data di nascita" value={form.data_nascita} onChange={(e) => set('data_nascita', e.target.value)} />
            <SelectField     name="sesso"        label="Sesso"           value={form.sesso}        onChange={(e) => set('sesso', e.target.value)} options={SESSI} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <InputField name="codice_fiscale"     label="Codice fiscale"        value={form.codice_fiscale}     onChange={(e) => set('codice_fiscale', e.target.value)} />
            <InputField name="email"              label="E-mail"        type="email" value={form.email}        onChange={(e) => set('email', e.target.value)} />
            <InputField name="telefono"           label="Telefono"      type="tel"   value={form.telefono}     onChange={(e) => set('telefono', e.target.value)} />
            <InputField name="contatto_emergenza" label="Contatto di emergenza" value={form.contatto_emergenza} onChange={(e) => set('contatto_emergenza', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_1.5fr] gap-4">
            <InputField  name="indirizzo"   label="Indirizzo"               value={form.indirizzo}   onChange={(e) => set('indirizzo', e.target.value)} />
            <InputField  name="indirizzo2"  label="Indirizzo 2 (facoltativo)" value={form.indirizzo2} onChange={(e) => set('indirizzo2', e.target.value)} />
            <InputField  name="cap"         label="CAP"                     value={form.cap}         onChange={(e) => set('cap', e.target.value)} />
            <InputField  name="provincia"   label="Provincia"               value={form.provincia}   onChange={(e) => set('provincia', e.target.value)} />
            <SelectField name="nazionalita" label="Nazionalità"             value={form.nazionalita} onChange={(e) => set('nazionalita', e.target.value)}
              options={NAZIONALITA.map((n) => ({ value: n, label: withFlag(n) }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold font-opensans text-ink">Contratto</label>
              <button
                type="button"
                className="sib-input text-left text-ink-muted truncate"
                onClick={() => fileInputRef.current?.click()}
              >
                {contrattoName || 'Scegli file'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={onContrattoChange}
              />
            </div>
            <SelectField name="strutture"   label="Strutture abilitate"     value={form.strutture}   onChange={(e) => set('strutture', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...STRUTTURE.map((s) => ({ value: s, label: s }))]}
            />
            <SelectField name="credenziali" label="Credenziali da generare" value={form.credenziali} onChange={(e) => set('credenziali', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...CREDENZIALI.map((c) => ({ value: c, label: c }))]}
            />
            <InputField  name="numero_turni" label="Numero turni" type="number" value={String(form.numero_turni)} onChange={(e) => set('numero_turni', Number(e.target.value || 1))} />
            <SelectField name="fasce_turni" label="Fasce turni"             value={form.fasce_turni} onChange={(e) => set('fasce_turni', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...FASCE_TURNI.map((f) => ({ value: f, label: f }))]}
            />
            <SelectField name="reparti"     label="Reparti"                 value={form.reparti}     onChange={(e) => set('reparti', e.target.value)}
              options={[{ value: '', label: 'Seleziona' }, ...REPARTI.map((r) => ({ value: r, label: r }))]}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="sib-btn sib-btn--ghost" onClick={() => navigate('archivio-personale')}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--primary" onClick={handleSave} disabled={pending}>
              {pending ? 'Salvataggio…' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
