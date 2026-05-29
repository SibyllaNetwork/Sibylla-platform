import React, { useEffect, useState } from 'react'
import Ico from '../../../core/icons/Ico'
import BtnBack from '../../../core/components/BtnBack'
import AlertBanner from '../../../core/components/AlertBanner'
import PageHeader from '../../../core/components/PageHeader'
import './ModificaProfilo.sass'
import FormActions from '../../../core/components/FormActions'
import FormGrid from '../../../core/components/FormGrid'
import { InputField, SelectField, DatePickerField } from '../../../core/components/form'
import {
  getInfo,
  modificaEmail,
  modificaNomeUtente,
  modificaPassword,
  type UserInfo,
} from '../../../services/user.service'
import { useThemeStore } from '../../../store/useThemeStore'
import { useViewModeStore } from '../../../store/useViewModeStore'

export default function ModificaProfilo({ navigate }: { navigate: (p: string) => void }) {
  const [form, setForm] = useState({
    nome: 'Luca', cognome: 'H.', email: 'luca.h@sibyllanetwork.com',
    telefono: '+39 06 123 456 789', dataNascita: '1985-06-15',
    sesso: 'Maschio', indirizzo: 'Via Roma 12, 00100 Roma RM',
    nazionalita: 'Italia',
  })
  const [emailValid,  setEmailValid]  = useState(true)
  const [saved,       setSaved]       = useState(false)
  const [activeTab,   setActiveTab]   = useState('profilo')

  // Tema (Standard ↔ Dark) e modalità di visualizzazione (classica ↔ tab)
  const theme     = useThemeStore(s => s.theme)
  const setTheme  = useThemeStore(s => s.setTheme)
  const isDark    = theme === 'dark'
  const viewMode  = useViewModeStore(s => s.mode)
  const setMode   = useViewModeStore(s => s.setMode)
  const clearTabs = useViewModeStore(s => s.clearTabs)
  const selectViewMode = (m: 'classic' | 'tabs') => {
    if (m === viewMode) return
    setMode(m)
    if (m === 'classic') clearTabs()
  }
  const [pwForm,      setPwForm]      = useState({ current: '', next: '', confirm: '' })
  const [pwError,     setPwError]     = useState('')
  const [pwSaved,     setPwSaved]     = useState(false)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [originalEmail, setOriginalEmail] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Carica i dati profilo dal backend (`/User/GetInfo`).
  useEffect(() => {
    let cancelled = false
    getInfo()
      .then((info: UserInfo) => {
        if (cancelled) return
        setForm((prev) => ({
          ...prev,
          nome: info.nome ?? prev.nome,
          cognome: info.cognome ?? prev.cognome,
          email: info.email ?? prev.email,
        }))
        setOriginalEmail(info.email ?? null)
        setLoaded(true)
      })
      .catch((err) => {
        if (cancelled) return
        setErrorBanner(`Backend non raggiungibile (${err?.message ?? 'errore'}). Mostro dati di esempio.`)
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const validateEmail = (v: string) => {
    setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    set('email', v)
  }
  const handleSave = async () => {
    if (!emailValid) return
    try {
      await modificaNomeUtente({ nome: form.nome, cognome: form.cognome })
      if (originalEmail !== null && form.email !== originalEmail) {
        await modificaEmail(form.email)
        setOriginalEmail(form.email)
      }
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setErrorBanner(err?.message ?? 'Errore durante il salvataggio')
    }
  }
  const handlePwSave = async () => {
    if (!pwForm.current)            { setPwError('Inserisci la password attuale'); return }
    if (pwForm.next.length < 8)     { setPwError('Minimo 8 caratteri');            return }
    if (pwForm.next !== pwForm.confirm) { setPwError('Le password non coincidono'); return }
    try {
      await modificaPassword(pwForm.current, pwForm.next)
      setPwError(''); setPwSaved(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err: any) {
      setPwError(err?.message ?? 'Errore durante il cambio password')
    }
  }

  const countries = ['Italia','Francia','Germania','Spagna','Regno Unito','Stati Uniti','Svizzera','Belgio','Paesi Bassi','Austria']
  const genders   = ['Maschio','Femmina','Altro','Preferisco non specificare']


  return (
    
    <div>
      <BtnBack onClick={() => navigate('home')} />

      <PageHeader title="Modifica profilo" subtitle="Gestisci i tuoi dati personali, la sicurezza e le preferenze"/>
      

      {errorBanner && <AlertBanner type="warning">{errorBanner}</AlertBanner>}
      {saved   && <AlertBanner type="success">Profilo aggiornato</AlertBanner>}
      {pwSaved && <AlertBanner type="success">Password aggiornata</AlertBanner>}

      {/* Tabs */}
      <div className="tabs">
        {[{id:'profilo',label:'Dati personali'},{id:'sicurezza',label:'Sicurezza'},{id:'preferenze',label:'Preferenze'}].map(t => (
          <button key={t.id} className={`tabs__btn ${activeTab === t.id ? 'tabs__btn--active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profilo ──────────────────────────────────────────────────────────── */}
      {activeTab === 'profilo' && (
        <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-8 items-start">
          <div className="avatar-upload">
            <div className="avatar-upload__circle">
              <div className="w-full h-full flex items-center justify-center">
                <div className="avatar-upload__initials">LH</div>
              </div>
              <div className="avatar-upload__overlay">
                <Ico n="camera" s={20} c="#fff" />
                <span>Cambia foto</span>
              </div>
            </div>
            <p className="avatar-upload__hint">JPG, PNG o GIF<br />Max 2MB</p>
          </div>

          <div className="space-y-4">
          <FormGrid>
              <InputField name="nome" label="Nome" value={form.nome} onChange={e => set('nome', e.target.value)} />
              <InputField name="cognome" label="Cognome" value={form.cognome} onChange={e => set('cognome', e.target.value)} />
            </FormGrid>
          <FormGrid>
              <InputField
                name="email"
                label="E-mail"
                type="email"
                value={form.email}
                onChange={e => validateEmail(e.target.value)}
                error={!emailValid ? 'Email non valida' : undefined}
                iconRight={emailValid ? 'fa-light fa-circle-check' : undefined}
              />
              <InputField
                name="telefono"
                label="Telefono"
                type="tel"
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
              />
           </FormGrid>
           <FormGrid cols={3}>
             <DatePickerField name="dataNascita" label="Data di nascita" defaultValue={form.dataNascita} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('dataNascita', e.target.value)} />
              <SelectField name="sesso" label="Sesso" value={form.sesso} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('sesso', e.target.value)} options={genders.map(g => ({ value: g, label: g }))} />
              <SelectField name="nazionalita" label="Nazionalità" value={form.nazionalita} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('nazionalita', e.target.value)} options={countries.map(c => ({ value: c, label: c }))} />
            </FormGrid>
            <div>
              <InputField name="indirizzo" label="Indirizzo" value={form.indirizzo} onChange={e => set('indirizzo', e.target.value)} />
            </div>
            <FormActions onCancel={() => navigate('home')} onConfirm={handleSave} confirmLabel="Salva modifiche"/>
          </div>
        </div>
      )}

      {/* ── Sicurezza ────────────────────────────────────────────────────────── */}
      {activeTab === 'sicurezza' && (
        <div className="max-w-[520px]">
          <div className="form-card">
            <h3 className="form-card__title">Cambia password</h3>
            {pwError && <AlertBanner type="error">{pwError}</AlertBanner>}
{(['current','next','confirm'] as const).map((k, i) => (
              <div key={k} className="form-group">
                <InputField
                  name={k}
                  type="password"
                  label={['Password attuale','Nuova password','Conferma nuova password'][i]}
                  placeholder={['Inserisci la password attuale','Minimo 8 caratteri','Ripeti la nuova password'][i]}
                  value={pwForm[k]}
                  onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex justify-end">
              <button className="sib-btn sib-btn--primary" onClick={handlePwSave}>Aggiorna password</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preferenze ───────────────────────────────────────────────────────── */}
      {activeTab === 'preferenze' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start max-w-[920px]">
          {/* Aspetto — tema Standard / Dark */}
          <div className="form-card">
            <h3 className="form-card__title">Aspetto</h3>
            <p className="prefs-pane__hint">Scegli il tema dell'interfaccia.</p>
            <div className="prefs-pane__options">
              {([
                { id: 'classic', active: !isDark, label: 'Standard', desc: 'Tema chiaro Sibylla', icon: 'sun' },
                { id: 'dark',    active: isDark,  label: 'Dark',     desc: 'Tema scuro professionale', icon: 'moon' },
              ] as const).map(o => (
                <button
                  key={o.id}
                  type="button"
                  className={`prefs-pane__option${o.active ? ' prefs-pane__option--active' : ''}`}
                  onClick={() => setTheme(o.id === 'dark' ? 'dark' : 'classic')}
                >
                  <i className={`fa-light fa-${o.icon} prefs-pane__option-ico`} aria-hidden="true" />
                  <span className="prefs-pane__option-text">
                    <span className="prefs-pane__option-label">{o.label}</span>
                    <span className="prefs-pane__option-desc">{o.desc}</span>
                  </span>
                  {o.active && <i className="fa-solid fa-check prefs-pane__option-check" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>

          {/* Visualizzazione — pagina singola / a tab */}
          <div className="form-card">
            <h3 className="form-card__title">Visualizzazione</h3>
            <p className="prefs-pane__hint">Scegli come mostrare le pagine dell'applicazione.</p>
            <div className="prefs-pane__options">
              {([
                { id: 'classic', label: 'Classica', desc: 'Una pagina alla volta, navigazione standard.', icon: 'window-maximize' },
                { id: 'tabs',    label: 'A tab',    desc: 'Tab in cima per passare velocemente tra le sezioni.', icon: 'table-columns' },
              ] as const).map(o => (
                <button
                  key={o.id}
                  type="button"
                  className={`prefs-pane__option${viewMode === o.id ? ' prefs-pane__option--active' : ''}`}
                  onClick={() => selectViewMode(o.id)}
                >
                  <i className={`fa-light fa-${o.icon} prefs-pane__option-ico`} aria-hidden="true" />
                  <span className="prefs-pane__option-text">
                    <span className="prefs-pane__option-label">{o.label}</span>
                    <span className="prefs-pane__option-desc">{o.desc}</span>
                  </span>
                  {viewMode === o.id && <i className="fa-solid fa-check prefs-pane__option-check" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>

          <div className="form-card">
            <h3 className="form-card__title">Lingua e formato</h3>
{[
              ['Lingua interfaccia',  ['Italiano','English','Français'],               'Italiano'],
              ['Fuso orario',         ['Europe/Rome (GMT+1)','Europe/London (GMT+0)'], 'Europe/Rome (GMT+1)'],
              ['Formato data',        ['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'],        'DD/MM/YYYY'],
              ['Valuta',              ['EUR (€)','USD ($)','GBP (£)'],                 'EUR (€)'],
            ].map(([lbl, opts, val], i) => (
              <div key={i} className="form-group">
                <SelectField
                  name={`pref-${i}`}
                  label={lbl as string}
                  defaultValue={val as string}
                  options={(opts as string[]).map(o => ({ value: o, label: o }))}
                />
              </div>
            ))}
            <div className="flex justify-end">
              <button className="sib-btn sib-btn--primary" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000) }}>
                Salva preferenze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
