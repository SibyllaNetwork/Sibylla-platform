import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import FormGrid from '../../../core/components/FormGrid'
import FormActions from '../../../core/components/FormActions'
import { InputField, SelectField, CheckboxField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'

/**
 * Scheda Questura — replica `Views/Impostazioni/SchedaQuestura.cshtml`.
 * BE Razor: `BackOfficeController.GetConfigSchedaQuestura` / `SetConfigSchedaQuestura`.
 * Catch-all: `/Sibylla/backoffice/GetConfigSchedaQuestura`.
 */

interface SchedaQuesturaConfig {
  codice_struttura?: string
  user_alloggiati?: string
  password_alloggiati?: string
  invio_automatico?: boolean
  ora_invio?: string
  email_notifica?: string
  ente_questura?: string
  metodo_invio?: 'webservice' | 'manuale' | 'email'
  [key: string]: unknown
}

const FALLBACK: SchedaQuesturaConfig = {
  codice_struttura: '',
  user_alloggiati: '',
  password_alloggiati: '',
  invio_automatico: true,
  ora_invio: '23:00',
  email_notifica: '',
  ente_questura: 'Roma',
  metodo_invio: 'webservice',
}

export default function SchedaQuestura({ navigate }: { navigate: (p: string) => void }) {
  const [config, setConfig] = useState<SchedaQuesturaConfig>(FALLBACK)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<SchedaQuesturaConfig>('backoffice/GetConfigSchedaQuestura', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setConfig({ ...FALLBACK, ...d }) })
      .catch((err) => { if (!cancelled) setError(err?.message ?? 'Errore caricamento') })
    return () => { cancelled = true }
  }, [])

  const set = (k: keyof SchedaQuesturaConfig, v: any) => setConfig((c) => ({ ...c, [k]: v }))

  async function handleSave() {
    setError(null); setPending(true)
    try {
      await apiFetchSibylla('backoffice/SetConfigSchedaQuestura', { method: 'POST', body: config })
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err?.message ?? 'Salvataggio fallito')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('home')} />
      <PageHeader title="Scheda Questura" subtitle="Configurazione invio schedine alloggiati al servizio Alloggiati Web" />

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {saved && <AlertBanner type="success">Configurazione salvata</AlertBanner>}

      <h3 className="sib-section-title">Credenziali Alloggiati Web</h3>
      <FormGrid>
        <InputField name="codice_struttura"     label="Codice struttura"     value={config.codice_struttura ?? ''}     onChange={(e) => set('codice_struttura', e.target.value)} />
        <InputField name="ente_questura"        label="Ente / Provincia"     value={config.ente_questura ?? ''}        onChange={(e) => set('ente_questura', e.target.value)} />
      </FormGrid>
      <FormGrid>
        <InputField name="user_alloggiati"      label="Username Alloggiati"  value={config.user_alloggiati ?? ''}      onChange={(e) => set('user_alloggiati', e.target.value)} />
        <InputField name="password_alloggiati"  label="Password Alloggiati"  type="password" value={config.password_alloggiati ?? ''} onChange={(e) => set('password_alloggiati', e.target.value)} />
      </FormGrid>

      <h3 className="sib-section-title">Invio</h3>
      <FormGrid cols={3}>
        <SelectField
          name="metodo_invio" label="Metodo invio" value={config.metodo_invio ?? 'webservice'}
          onChange={(e) => set('metodo_invio', e.target.value as SchedaQuesturaConfig['metodo_invio'])}
          options={[
            { value: 'webservice', label: 'Webservice' },
            { value: 'manuale',    label: 'Manuale (file)' },
            { value: 'email',      label: 'Email' },
          ]}
        />
        <InputField name="ora_invio"        label="Ora invio automatico" type="text" value={config.ora_invio ?? ''}        onChange={(e) => set('ora_invio', e.target.value)} placeholder="HH:MM" />
        <InputField name="email_notifica"   label="Email per esiti"      type="email" value={config.email_notifica ?? ''}  onChange={(e) => set('email_notifica', e.target.value)} />
      </FormGrid>
      <FormGrid>
        <CheckboxField
          name="invio_automatico" label="Abilita invio automatico giornaliero"
          checked={config.invio_automatico ?? false}
          onChange={(e) => set('invio_automatico', e.target.checked)}
        />
      </FormGrid>

      <FormActions
        onCancel={() => navigate('home')}
        onConfirm={handleSave}
        confirmLabel={pending ? 'Salvataggio…' : 'Salva configurazione'}
        confirmDisabled={pending}
      />
    </div>
  )
}
