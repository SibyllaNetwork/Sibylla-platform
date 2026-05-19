import React, { useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import AlertBanner from '../../../../core/components/AlertBanner'
import FormGrid from '../../../../core/components/FormGrid'
import FormActions from '../../../../core/components/FormActions'
import { InputField, SelectField, DatePickerField, TextareaField } from '../../../../core/components/form'
import { apiFetchSibylla } from '../../../../services/api'

/**
 * Crea preventivo — replica `Views/Preventivi/GestioneDeiPreventivi.cshtml`
 * (form di creazione). BE: `/Sibylla/preventivi/InsertPreventivo`.
 */

export default function CreaPreventivo({ navigate }: { navigate: (p: string) => void }) {
  const [form, setForm] = useState({
    cliente: '', email: '', telefono: '', agenzia: '',
    data_arrivo: '', data_partenza: '', adulti: '2', bambini: '0',
    pacchetto: '', importo: '', note: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.cliente || !form.data_arrivo || !form.data_partenza) {
      setError('Cliente e date di soggiorno sono obbligatori'); return
    }
    setError(null); setPending(true)
    try {
      await apiFetchSibylla('preventivi/InsertPreventivo', {
        method: 'POST',
        body: {
          ...form,
          adulti: Number(form.adulti),
          bambini: Number(form.bambini),
          importo: Number(form.importo) || 0,
        },
      })
      navigate('i-miei-preventivi')
    } catch (err: any) {
      setError(err?.message ?? 'Salvataggio fallito')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <BtnBack onClick={() => navigate('i-miei-preventivi')} />
      <PageHeader title="Crea preventivo" subtitle="Nuovo preventivo cliente o agenzia" />

      {error && <AlertBanner type="error">{error}</AlertBanner>}

      <FormGrid>
        <InputField  name="cliente"  label="Cliente / Ragione sociale *" value={form.cliente}  onChange={(e) => set('cliente', e.target.value)} />
        <InputField  name="agenzia"  label="Agenzia"                     value={form.agenzia}  onChange={(e) => set('agenzia', e.target.value)} />
      </FormGrid>

      <FormGrid>
        <InputField name="email"    label="Email"    type="email" value={form.email}    onChange={(e) => set('email', e.target.value)} />
        <InputField name="telefono" label="Telefono" type="tel"   value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
      </FormGrid>

      <FormGrid cols={4}>
        <DatePickerField name="data_arrivo"   label="Arrivo *"   value={form.data_arrivo}   onChange={(e) => set('data_arrivo', e.target.value)} />
        <DatePickerField name="data_partenza" label="Partenza *" value={form.data_partenza} onChange={(e) => set('data_partenza', e.target.value)} />
        <InputField      name="adulti"        label="Adulti"     type="number" value={form.adulti}    onChange={(e) => set('adulti', e.target.value)} />
        <InputField      name="bambini"       label="Bambini"    type="number" value={form.bambini}   onChange={(e) => set('bambini', e.target.value)} />
      </FormGrid>

      <FormGrid>
        <SelectField
          name="pacchetto" label="Pacchetto" value={form.pacchetto} onChange={(e) => set('pacchetto', e.target.value)}
          options={[
            { value: '', label: 'Seleziona...' },
            { value: 'BB', label: 'Bed & breakfast' },
            { value: 'HB', label: 'Mezza pensione' },
            { value: 'FB', label: 'Pensione completa' },
            { value: 'AI', label: 'All inclusive' },
          ]}
        />
        <InputField name="importo" label="Importo totale (€)" type="number" value={form.importo} onChange={(e) => set('importo', e.target.value)} />
      </FormGrid>

      <FormGrid>
        <TextareaField name="note" label="Note interne" value={form.note} onChange={(e) => set('note', e.target.value)} />
      </FormGrid>

      <FormActions
        onCancel={() => navigate('i-miei-preventivi')}
        onConfirm={handleSave}
        confirmLabel={pending ? 'Salvataggio…' : 'Salva preventivo'}
        confirmDisabled={pending}
      />
    </div>
  )
}
