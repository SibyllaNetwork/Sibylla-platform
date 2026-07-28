import React, { useEffect, useState } from 'react'
import Modal from './Modal'
import { InputField, SelectField, DatePickerField } from './form'
import './CreaAnagraficaClienteModal.sass'

export interface AnagraficaCliente {
  nome:           string
  cognome:        string
  sesso:          string
  dataNascita:    string
  email:          string
  telefono:       string
  paeseNascita:   string
  paeseResidenza: string
  tipoDocumento:  string
  nDocumento:     string
  scadeIl:        string
  emessoDa:       string
  note:           string
}

const EMPTY: AnagraficaCliente = {
  nome: '', cognome: '', sesso: '', dataNascita: '', email: '', telefono: '',
  paeseNascita: '', paeseResidenza: '', tipoDocumento: '', nDocumento: '',
  scadeIl: '', emessoDa: '', note: '',
}

// Liste allineate alle altre schede anagrafica (Anagrafiche, Arrivi/Partenze).
const SESSI = ['Maschio', 'Femmina']
const PAESI = ['Italia', 'Germania', 'Francia', 'Spagna', 'Regno Unito', 'Stati Uniti', 'Svizzera', 'Austria', 'Paesi Bassi', 'Giappone']
const TIPI_DOCUMENTO = ['Carta Identità', 'Passaporto', 'Patente di guida', 'Permesso di soggiorno', 'Libretto di pensione']

export interface CreaAnagraficaClienteModalProps {
  open:     boolean
  onClose:  () => void
  onSave:   (a: AnagraficaCliente) => void
  /** Testo già digitato nella ricerca ("Cognome Nome"): precompila Cognome e Nome */
  initialNominativo?: string
  title?:   string
}

// Modale di creazione rapida dell'anagrafica cliente (persona fisica): stessi
// campi della scheda anagrafica ospite, richiamabile dalle ricerche (voce
// "+ Crea anagrafica cliente") senza uscire dal flusso in corso.
export default function CreaAnagraficaClienteModal({
  open, onClose, onSave, initialNominativo = '', title = 'Creazione anagrafica cliente',
}: CreaAnagraficaClienteModalProps) {
  const [form, setForm] = useState<AnagraficaCliente>(EMPTY)

  // A ogni apertura riparte pulita, con il nominativo già digitato in ricerca:
  // la lista è in formato "Cognome Nome", quindi la prima parola è il cognome.
  useEffect(() => {
    if (!open) return
    const [primo, ...resto] = initialNominativo.trim().split(/\s+/).filter(Boolean)
    setForm({ ...EMPTY, cognome: primo ?? '', nome: resto.join(' ') })
  }, [open, initialNominativo])

  const set = (k: keyof AnagraficaCliente, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const salvabile = !!form.nome.trim() && !!form.cognome.trim()

  const salva = () => {
    if (!salvabile) return
    onSave({ ...form, nome: form.nome.trim(), cognome: form.cognome.trim() })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl" className="crea-anag-cli">
      <div className="crea-anag-cli__body">
        <div className="crea-anag-cli__grid crea-anag-cli__grid--4">
          <InputField name="cliente-nome" label="Nome" required placeholder="Inserire nome"
            value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          <InputField name="cliente-cognome" label="Cognome" required placeholder="Inserire cognome"
            value={form.cognome} onChange={(e) => set('cognome', e.target.value)} />
          <SelectField name="cliente-sesso" label="Sesso" placeholder="Seleziona"
            value={form.sesso} onChange={(e) => set('sesso', e.target.value)}
            options={SESSI.map((s) => ({ value: s, label: s }))} />
          <DatePickerField name="cliente-nascita" label="Data di Nascita"
            value={form.dataNascita} onChange={(e) => set('dataNascita', e.target.value)} />
        </div>

        <div className="crea-anag-cli__grid crea-anag-cli__grid--4">
          <InputField name="cliente-email" label="Email" type="email" placeholder="Inserire email"
            value={form.email} onChange={(e) => set('email', e.target.value)} />
          <InputField name="cliente-telefono" label="Telefono" placeholder="Inserire telefono"
            value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
        </div>

        <div className="crea-anag-cli__grid crea-anag-cli__grid--2">
          <SelectField name="cliente-paese-nascita" label="Paese di nascita" placeholder="Seleziona…"
            value={form.paeseNascita} onChange={(e) => set('paeseNascita', e.target.value)}
            options={PAESI.map((p) => ({ value: p, label: p }))} />
          <SelectField name="cliente-paese-residenza" label="Paese di residenza" placeholder="Seleziona…"
            value={form.paeseResidenza} onChange={(e) => set('paeseResidenza', e.target.value)}
            options={PAESI.map((p) => ({ value: p, label: p }))} />
        </div>

        <div className="crea-anag-cli__grid crea-anag-cli__grid--4">
          <SelectField name="cliente-tipo-doc" label="Documento identità" placeholder="Seleziona…"
            value={form.tipoDocumento} onChange={(e) => set('tipoDocumento', e.target.value)}
            options={TIPI_DOCUMENTO.map((t) => ({ value: t, label: t }))} />
          <InputField name="cliente-n-doc" label="Numero documento" placeholder="Inserire numero documento"
            value={form.nDocumento} onChange={(e) => set('nDocumento', e.target.value)} />
          <DatePickerField name="cliente-scade" label="Scade il"
            value={form.scadeIl} onChange={(e) => set('scadeIl', e.target.value)} />
          <InputField name="cliente-emesso-da" label="Emesso da" placeholder="Inserire ente"
            value={form.emessoDa} onChange={(e) => set('emessoDa', e.target.value)} />
        </div>

        <div className="crea-anag-cli__grid crea-anag-cli__grid--4">
          <div className="crea-anag-cli__field">
            <span className="crea-anag-cli__label">Carica documento</span>
            <label className="sib-input crea-anag-cli__file">
              <input type="file" hidden />
              <span className="crea-anag-cli__file-txt">Scegli il file</span>
            </label>
          </div>
          <div className="crea-anag-cli__field">
            <span className="crea-anag-cli__label">Acquisisci documento</span>
            <button type="button" className="sib-btn sib-btn--secondary crea-anag-cli__scan">
              <i className="fa-light fa-camera" aria-hidden="true" /> Acquisisci
            </button>
          </div>
        </div>

        <InputField name="cliente-note" label="Note" placeholder="Inserire note aggiuntive"
          value={form.note} onChange={(e) => set('note', e.target.value)} />
      </div>

      <div className="crea-anag-cli__actions">
        <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
        <button type="button" className="sib-btn sib-btn--primary" disabled={!salvabile} onClick={salva}>
          Salva
        </button>
      </div>
    </Modal>
  )
}
