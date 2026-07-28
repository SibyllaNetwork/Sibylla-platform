import React, { useState } from 'react'
import Modal from '../../../core/components/Modal'
import { InputField, SelectField, DatePickerField, TextareaField } from '../../../core/components/form'
import NazionalitaSelect from '../../../core/components/form/NazionalitaSelect'
import type { Anagrafica } from './AnagraficaCombobox'
import './CreaAnagraficaModal.sass'

interface Props {
  open: boolean
  tipo: 'cliente' | 'agenzia'
  onClose: () => void
  onSave: (a: Anagrafica) => void
}

const SESSO_OPTS = [
  { value: 'M', label: 'Uomo' },
  { value: 'F', label: 'Donna' },
  { value: 'X', label: 'Altro' },
]

const DOC_OPTS = [
  { value: 'ci', label: "Carta d'identità" },
  { value: 'passaporto', label: 'Passaporto' },
  { value: 'patente', label: 'Patente' },
]

interface FormState {
  // cliente
  nome: string
  cognome: string
  sesso: string
  dataNascita: string
  paeseNascita: string
  documento: string
  numeroDoc: string
  scadenza: string
  emessoDa: string
  fileName: string
  // agenzia
  ragioneSociale: string
  piva: string
  sdi: string
  indirizzo: string
  citta: string
  // condivisi
  email: string
  telefono: string
  paeseResidenza: string
  note: string
}

const EMPTY: FormState = {
  nome: '', cognome: '', sesso: '', dataNascita: '', paeseNascita: '',
  documento: '', numeroDoc: '', scadenza: '', emessoDa: '', fileName: '',
  ragioneSociale: '', piva: '', sdi: '', indirizzo: '', citta: '',
  email: '', telefono: '', paeseResidenza: '', note: '',
}

// Modale "Creazione anagrafica" apribile dal combobox quando la ricerca non
// trova risultati. Stesso flusso per cliente e agenzia, con i campi propri di
// ciascun tipo. Riusa i componenti form condivisi della piattaforma.
export default function CreaAnagraficaModal({ open, tipo, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  const isAgenzia = tipo === 'agenzia'
  const tipoLabel = isAgenzia ? 'agenzia' : 'cliente'
  const valid = isAgenzia
    ? form.ragioneSociale.trim() !== '' && form.piva.trim() !== ''
    : form.nome.trim() !== '' && form.cognome.trim() !== ''

  const handleClose = () => { setForm(EMPTY); onClose() }

  const handleSave = () => {
    if (!valid) return
    if (isAgenzia) {
      const nome = form.ragioneSociale.trim()
      const sub = form.piva.trim() ? `P.IVA ${form.piva.trim()}` : (form.citta || undefined)
      onSave({ id: `new-ag-${nome}`, nome, sub })
    } else {
      const nome = `${form.nome.trim()} ${form.cognome.trim()}`.trim()
      const sub = form.paeseResidenza || form.email || undefined
      onSave({ id: `new-cli-${nome}-${form.email}`, nome, sub })
    }
    setForm(EMPTY)
  }

  return (
    <Modal open={open} onClose={handleClose} size="xl" title={`Creazione anagrafica ${tipoLabel}`}>
      <div className="cam">
        <div className="cam__grid">
          {isAgenzia ? (
            <>
              <InputField
                name="ragione-sociale" label="Ragione sociale" required
                className="cam__col--2"
                placeholder="Inserire ragione sociale"
                value={form.ragioneSociale}
                onChange={(e) => set('ragioneSociale', e.target.value)}
              />
              <InputField
                name="piva" label="Partita IVA" required
                className="cam__col"
                placeholder="Inserire P.IVA"
                value={form.piva}
                onChange={(e) => set('piva', e.target.value)}
              />
              <InputField
                name="sdi" label="Codice SDI / PEC"
                className="cam__col"
                placeholder="Inserire SDI o PEC"
                value={form.sdi}
                onChange={(e) => set('sdi', e.target.value)}
              />

              <InputField
                name="email" label="Email" type="email"
                className="cam__col--2"
                placeholder="Inserire email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
              <InputField
                name="telefono" label="Telefono" type="tel"
                className="cam__col--2"
                placeholder="Inserire telefono"
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
              />

              <InputField
                name="indirizzo" label="Indirizzo"
                className="cam__col--2"
                placeholder="Via, civico"
                value={form.indirizzo}
                onChange={(e) => set('indirizzo', e.target.value)}
              />
              <InputField
                name="citta" label="Città"
                className="cam__col"
                placeholder="Inserire città"
                value={form.citta}
                onChange={(e) => set('citta', e.target.value)}
              />
              <div className="cam__field cam__col">
                <label className="cam__label">Paese</label>
                <NazionalitaSelect
                  placeholder="Seleziona…"
                  value={form.paeseResidenza}
                  onChange={(v) => set('paeseResidenza', v)}
                />
              </div>
            </>
          ) : (
            <>
              <InputField
                name="nome" label="Nome" required
                className="cam__col"
                placeholder="Inserire nome"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
              />
              <InputField
                name="cognome" label="Cognome" required
                className="cam__col"
                placeholder="Inserire cognome"
                value={form.cognome}
                onChange={(e) => set('cognome', e.target.value)}
              />
              <SelectField
                name="sesso" label="Sesso"
                className="cam__col"
                placeholder="Seleziona"
                options={SESSO_OPTS}
                value={form.sesso}
                onChange={(e) => set('sesso', e.target.value)}
              />
              <DatePickerField
                name="data-nascita" label="Data di Nascita"
                className="cam__col"
                value={form.dataNascita}
                onChange={(e) => set('dataNascita', e.target.value)}
              />

              <InputField
                name="email" label="Email" type="email"
                className="cam__col"
                placeholder="Inserire email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
              <InputField
                name="telefono" label="Telefono" type="tel"
                className="cam__col"
                placeholder="Inserire telefono"
                value={form.telefono}
                onChange={(e) => set('telefono', e.target.value)}
              />

              <div className="cam__field cam__col--2">
                <label className="cam__label">Paese di nascita</label>
                <NazionalitaSelect
                  placeholder="Seleziona…"
                  value={form.paeseNascita}
                  onChange={(v) => set('paeseNascita', v)}
                />
              </div>
              <div className="cam__field cam__col--2">
                <label className="cam__label">Paese di residenza</label>
                <NazionalitaSelect
                  placeholder="Seleziona…"
                  value={form.paeseResidenza}
                  onChange={(v) => set('paeseResidenza', v)}
                />
              </div>

              <SelectField
                name="documento" label="Documento identità"
                className="cam__col"
                placeholder="Seleziona…"
                options={DOC_OPTS}
                value={form.documento}
                onChange={(e) => set('documento', e.target.value)}
              />
              <InputField
                name="numero-doc" label="Numero documento"
                className="cam__col"
                placeholder="Inserire numero documento"
                value={form.numeroDoc}
                onChange={(e) => set('numeroDoc', e.target.value)}
              />
              <DatePickerField
                name="scadenza" label="Scade il"
                className="cam__col"
                value={form.scadenza}
                onChange={(e) => set('scadenza', e.target.value)}
              />
              <InputField
                name="emesso-da" label="Emesso da"
                className="cam__col"
                placeholder="Inserire ente"
                value={form.emessoDa}
                onChange={(e) => set('emessoDa', e.target.value)}
              />

              <div className="cam__field cam__col">
                <label className="cam__label">Carica documento</label>
                <label className="cam__file">
                  <i className="fa-light fa-paperclip" aria-hidden="true" />
                  <span className="cam__file-name">{form.fileName || 'Scegli il file'}</span>
                  <input
                    type="file"
                    className="cam__file-input"
                    onChange={(e) => set('fileName', e.target.files?.[0]?.name ?? '')}
                  />
                </label>
              </div>
              <div className="cam__field cam__col">
                <label className="cam__label">Acquisisci documento</label>
                <button type="button" className="cam__scan">
                  <i className="fa-light fa-camera" aria-hidden="true" /> Acquisisci
                </button>
              </div>
            </>
          )}

          <TextareaField
            name="note" label="Note" rows={2}
            className="cam__col--full"
            placeholder="Inserire note aggiuntive"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
          />
        </div>

        <div className="cam__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={handleClose}>Chiudi</button>
          <button type="button" className="sib-btn sib-btn--primary" disabled={!valid} onClick={handleSave}>Salva</button>
        </div>
      </div>
    </Modal>
  )
}
