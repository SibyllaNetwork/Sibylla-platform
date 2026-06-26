import React, { useState } from 'react'
import BtnBack from '../../../../core/components/BtnBack'
import PageHeader from '../../../../core/components/PageHeader'
import { InputField } from '../../../../core/components/form'

// Crea nuova azienda (Ditta/Agenzia) — versione a pagina della modale
// "Creazione anagrafica Ditta/Agenzia". Collegata al sottomenu Contratti di
// vendita → "Crea nuova azienda" (page `crea-azienda-v`).

const EMPTY = {
  ragioneSociale: '', indirizzo: '', email: '', telefono: '', pIva: '',
  codFiscale: '', codiceDestinatario: '', pec: '', nomeDitta: '',
}

export default function CreaAziendaVendita({ navigate }: { navigate: (p: string) => void }) {
  const [form, setForm] = useState(EMPTY)
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const chiudi = () => navigate('miei-contratti-v')
  const salva = () => {
    // TODO: persistenza BE — per ora torna all'elenco contratti
    navigate('miei-contratti-v')
  }

  return (
    <div>
      <BtnBack onClick={chiudi} />
      <PageHeader title="Crea nuova azienda" subtitle="Crea anagrafica azienda" />

      <div className="bg-white border border-line rounded-xl p-6 max-w-4xl">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4">
            <InputField name="ragioneSociale" label="Ragione sociale" required placeholder="Inserisci nome azienda"
              value={form.ragioneSociale} onChange={(e) => set('ragioneSociale', e.target.value)} />
            <InputField name="indirizzo" label="Indirizzo" placeholder="Clicca per cercare indirizzo"
              value={form.indirizzo} onChange={(e) => set('indirizzo', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField name="email" label="E-mail" type="email" placeholder="Inserisci email"
              value={form.email} onChange={(e) => set('email', e.target.value)} />
            <InputField name="telefono" label="Telefono" placeholder="Inserisci telefono"
              value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
            <InputField name="pIva" label="P. Iva" placeholder="Inserisci Partita iva"
              value={form.pIva} onChange={(e) => set('pIva', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField name="codFiscale" label="Cod. Fiscale" placeholder="Inserisci codice fiscale"
              value={form.codFiscale} onChange={(e) => set('codFiscale', e.target.value)} />
            <InputField name="codiceDestinatario" label="Codice Destinatario (ISD)" placeholder="Inserisci il codice destinatario"
              value={form.codiceDestinatario} onChange={(e) => set('codiceDestinatario', e.target.value)} />
            <InputField name="pec" label="PEC" placeholder="Inserisci Pec"
              value={form.pec} onChange={(e) => set('pec', e.target.value)} />
          </div>
          <div className="md:w-1/3">
            <InputField name="nomeDitta" label="Nome ditta" placeholder="Inserisci nome ditta"
              value={form.nomeDitta} onChange={(e) => set('nomeDitta', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-line">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={chiudi}>Chiudi</button>
          <button type="button" className="sib-btn sib-btn--primary" disabled={!form.ragioneSociale.trim()} onClick={salva}>Salva</button>
        </div>
      </div>
    </div>
  )
}
