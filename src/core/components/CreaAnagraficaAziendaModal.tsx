import React, { useEffect, useState } from 'react'
import Modal from './Modal'
import { InputField } from './form'
import './CreaAnagraficaAziendaModal.sass'

export interface AnagraficaAzienda {
  ragioneSociale:     string
  indirizzo:          string
  email:              string
  telefono:           string
  pIva:               string
  codFiscale:         string
  codiceDestinatario: string
  pec:                string
  nomeDitta:          string
}

const EMPTY: AnagraficaAzienda = {
  ragioneSociale: '', indirizzo: '', email: '', telefono: '', pIva: '',
  codFiscale: '', codiceDestinatario: '', pec: '', nomeDitta: '',
}

export interface CreaAnagraficaAziendaModalProps {
  open:      boolean
  onClose:   () => void
  onSave:    (a: AnagraficaAzienda) => void
  /** Testo già digitato nella ricerca: precompila la ragione sociale */
  initialRagioneSociale?: string
  title?:    string
}

// Modale di creazione rapida dell'anagrafica Ditta/Agenzia: stessi campi della
// pagina "Crea nuova azienda", richiamabile dalle ricerche (voce "+ Crea
// anagrafica agenzia") senza uscire dal flusso in corso.
export default function CreaAnagraficaAziendaModal({
  open, onClose, onSave, initialRagioneSociale = '', title = 'Creazione anagrafica Ditta/Agenzia',
}: CreaAnagraficaAziendaModalProps) {
  const [form, setForm] = useState<AnagraficaAzienda>(EMPTY)

  // A ogni apertura riparte pulita, con la ragione sociale già digitata in ricerca
  useEffect(() => {
    if (open) setForm({ ...EMPTY, ragioneSociale: initialRagioneSociale })
  }, [open, initialRagioneSociale])

  const set = (k: keyof AnagraficaAzienda, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const salva = () => {
    if (!form.ragioneSociale.trim()) return
    onSave({ ...form, ragioneSociale: form.ragioneSociale.trim() })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl" className="crea-anag">
      <div className="crea-anag__body">
        <div className="crea-anag__grid crea-anag__grid--1-2">
          <InputField name="ragioneSociale" label="Ragione sociale" required placeholder="Inserisci nome azienda"
            value={form.ragioneSociale} onChange={(e) => set('ragioneSociale', e.target.value)} />
          <InputField name="indirizzo" label="Indirizzo" placeholder="Clicca per cercare indirizzo"
            value={form.indirizzo} onChange={(e) => set('indirizzo', e.target.value)} />
        </div>
        <div className="crea-anag__grid crea-anag__grid--3">
          <InputField name="email" label="E-mail" type="email" placeholder="Inserisci email"
            value={form.email} onChange={(e) => set('email', e.target.value)} />
          <InputField name="telefono" label="Telefono" placeholder="Inserisci telefono"
            value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
          <InputField name="pIva" label="P. Iva" placeholder="Inserisci Partita iva"
            value={form.pIva} onChange={(e) => set('pIva', e.target.value)} />
        </div>
        <div className="crea-anag__grid crea-anag__grid--3">
          <InputField name="codFiscale" label="Cod. Fiscale" placeholder="Inserisci codice fiscale"
            value={form.codFiscale} onChange={(e) => set('codFiscale', e.target.value)} />
          <InputField name="codiceDestinatario" label="Codice Destinatario (ISD)" placeholder="Inserisci il codice destinatario"
            value={form.codiceDestinatario} onChange={(e) => set('codiceDestinatario', e.target.value)} />
          <InputField name="pec" label="PEC" placeholder="Inserisci Pec"
            value={form.pec} onChange={(e) => set('pec', e.target.value)} />
        </div>
        <div className="crea-anag__grid crea-anag__grid--3">
          <InputField name="nomeDitta" label="Nome ditta" placeholder="Inserisci nome ditta"
            value={form.nomeDitta} onChange={(e) => set('nomeDitta', e.target.value)} />
        </div>
      </div>

      <div className="crea-anag__actions">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!form.ragioneSociale.trim()} onClick={salva}>
          Salva
        </button>
      </div>
    </Modal>
  )
}
