import React, { useEffect, useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import AlertBanner from '../../../core/components/AlertBanner'
import FormGrid from '../../../core/components/FormGrid'
import FormActions from '../../../core/components/FormActions'
import { InputField, SelectField, TextareaField } from '../../../core/components/form'
import { apiFetchSibylla } from '../../../services/api'
import type { Struttura } from '../../../services/common.service'

/**
 * Informazioni struttura — replica `Views/Impostazioni/InformazioniStruttura.cshtml`.
 * BE Razor: `AziendaController.GetInfoStruttura` / `SetInfoStruttura`.
 * Catch-all proxy: `/Sibylla/azienda/GetInfoStruttura`.
 */

const TIPI_STRUTTURA = [
  { value: 'Hotel',         label: 'Hotel' },
  { value: 'BedBreakfast',  label: 'Bed & Breakfast' },
  { value: 'Resort',        label: 'Resort' },
  { value: 'Agriturismo',   label: 'Agriturismo' },
  { value: 'CasaVacanze',   label: 'Casa vacanze' },
]

export default function InformazioniStruttura({ navigate }: { navigate: (p: string) => void }) {
  const [data, setData] = useState<Partial<Struttura>>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetchSibylla<Struttura>('azienda/GetInfoStruttura', { method: 'POST', body: {} })
      .then((d) => { if (!cancelled) setData(d) })
      .catch((err) => { if (!cancelled) setError(err?.message ?? 'Errore caricamento') })
    return () => { cancelled = true }
  }, [])

  const set = (k: keyof Struttura, v: any) => setData((d) => ({ ...d, [k]: v }))

  async function handleSave() {
    setError(null); setPending(true)
    try {
      await apiFetchSibylla('azienda/SetInfoStruttura', { method: 'POST', body: data })
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err?.message ?? 'Salvataggio fallito')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <BtnBack />
      <PageHeader title="Informazioni struttura" subtitle="Anagrafica, contatti e geolocalizzazione" />

      {error && <AlertBanner type="error">{error}</AlertBanner>}
      {saved && <AlertBanner type="success">Informazioni salvate</AlertBanner>}

      <h3 className="sib-section-title">Anagrafica</h3>
      <FormGrid>
        <InputField  name="nome"     label="Nome struttura" value={data.nome ?? ''} onChange={(e) => set('nome', e.target.value)} />
        <SelectField
          name="id_tipo_struttura" label="Tipologia" value={String(data.id_tipo_struttura ?? '')}
          onChange={(e) => set('id_tipo_struttura', Number(e.target.value))}
          options={[{ value: '', label: 'Seleziona...' }, ...TIPI_STRUTTURA.map((t, i) => ({ value: String(i + 1), label: t.label }))]}
        />
      </FormGrid>
      <FormGrid>
        <TextareaField name="Descrizione" label="Descrizione" value={data.Descrizione ?? ''} onChange={(e) => set('Descrizione', e.target.value)} />
      </FormGrid>

      <h3 className="sib-section-title">Indirizzo</h3>
      <FormGrid cols={4}>
        <InputField name="Indirizzo" label="Via / Piazza" value={data.Indirizzo ?? ''} onChange={(e) => set('Indirizzo', e.target.value)} />
        <InputField name="Zip_Code"  label="CAP"          value={data.Zip_Code ?? ''}  onChange={(e) => set('Zip_Code', e.target.value)} />
        <InputField name="City"      label="Città"        value={data.City ?? ''}      onChange={(e) => set('City', e.target.value)} />
        <InputField name="Country"   label="Paese"        value={data.Country ?? ''}   onChange={(e) => set('Country', e.target.value)} />
      </FormGrid>
      <FormGrid cols={3}>
        <InputField name="Regione" label="Regione"   value={data.Regione ?? ''} onChange={(e) => set('Regione', e.target.value)} />
        <InputField name="lat"     label="Latitudine"  type="number" value={String(data.lat ?? '')} onChange={(e) => set('lat', Number(e.target.value))} />
        <InputField name="lon"     label="Longitudine" type="number" value={String(data.lon ?? '')} onChange={(e) => set('lon', Number(e.target.value))} />
      </FormGrid>

      <h3 className="sib-section-title">Contatti</h3>
      <FormGrid cols={3}>
        <InputField name="telefono"  label="Telefono"  type="tel"   value={data.telefono ?? ''}  onChange={(e) => set('telefono', e.target.value)} />
        <InputField name="Email"     label="Email"     type="email" value={data.Email ?? ''}     onChange={(e) => set('Email', e.target.value)} />
        <InputField name="Sito_web"  label="Sito web"  type="url"   value={data.Sito_web ?? ''}  onChange={(e) => set('Sito_web', e.target.value)} />
      </FormGrid>

      <h3 className="sib-section-title">Tassa di soggiorno</h3>
      <FormGrid>
        <InputField name="Tassa_soggiorno" label="Importo (€/notte/persona)" type="number" value={String(data.Tassa_soggiorno ?? 0)} onChange={(e) => set('Tassa_soggiorno', Number(e.target.value))} />
      </FormGrid>

      <FormActions
        onCancel={() => navigate('home')}
        onConfirm={handleSave}
        confirmLabel={pending ? 'Salvataggio…' : 'Salva'}
        confirmDisabled={pending}
      />
    </div>
  )
}
