import React from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
import { InputField, SelectField, TextareaField } from '../../../../core/components/form'
import { MACRO_AREE } from '../../catalogo/mockData'
import type { Categoria, Fornitore, FornitoreForm } from '../../catalogo/types'
import './FornitoreModal.sass'

interface Props {
  open: boolean
  editing: Fornitore | null
  form: FornitoreForm
  setForm: (f: FornitoreForm) => void
  categorie: Categoria[]
  onClose: () => void
  onConfirm: () => void
}

export default function FornitoreModal({ open, editing, form, setForm, categorie, onClose, onConfirm }: Props) {
  const disabled = !form.nome.trim() || !form.categoriaId || !form.macroArea
  const set = <K extends keyof FornitoreForm>(k: K, v: FornitoreForm[K]) => setForm({ ...form, [k]: v })

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="forn-modal">
        <div className="forn-modal__head">
          <div>
            <h2 className="forn-modal__title">{editing ? 'Modifica fornitore' : 'Nuovo fornitore'}</h2>
            <p className="forn-modal__sub">Anagrafica completa — alimenta le pagine Forniture e Acquisti di rete</p>
          </div>
          <button className="forn-modal__close" onClick={onClose} aria-label="Chiudi">
            <Ico n="x" s={18} c="var(--color-text-disabled)" />
          </button>
        </div>

        <div className="forn-modal__section">
          <div className="forn-modal__section-title">Anagrafica</div>
          <div className="forn-modal__grid forn-modal__grid--2">
            <InputField className="forn-modal__field" name="nome" label="Nome fornitore *" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Es. Caseificio Alpino" />
            <InputField className="forn-modal__field" name="anno-fondazione" label="Anno di fondazione" type="number" value={form.annoFondazione} onChange={e => set('annoFondazione', e.target.value)} placeholder="Es. 1965" />
            <InputField className="forn-modal__field" name="descrizione" label="Descrizione breve" value={form.descrizione} onChange={e => set('descrizione', e.target.value)} placeholder="Sintesi del fornitore" />
            <InputField className="forn-modal__field" name="immagine-url" label="URL immagine" value={form.immagineUrl} onChange={e => set('immagineUrl', e.target.value)} placeholder="https://..." />
          </div>
          <TextareaField
            className="forn-modal__field"
            name="storia"
            label="Storia / racconto"
            value={form.storia}
            onChange={e => set('storia', e.target.value)}
            rows={3}
            placeholder="Storia, tradizione, valori..."
          />
        </div>

        <div className="forn-modal__section">
          <div className="forn-modal__section-title">Sede</div>
          <div className="forn-modal__grid forn-modal__grid--3">
            <InputField className="forn-modal__field" name="indirizzo" label="Indirizzo" value={form.indirizzo} onChange={e => set('indirizzo', e.target.value)} placeholder="Via..." />
            <InputField className="forn-modal__field" name="citta" label="Città" value={form.citta} onChange={e => set('citta', e.target.value)} placeholder="Città" />
            <InputField className="forn-modal__field" name="cap" label="CAP" value={form.cap} onChange={e => set('cap', e.target.value)} placeholder="00100" />
            <InputField className="forn-modal__field" name="regione" label="Regione" value={form.regione} onChange={e => set('regione', e.target.value)} placeholder="Es. Toscana" />
            <InputField className="forn-modal__field" name="telefono" label="Telefono" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+39 ..." />
            <InputField className="forn-modal__field" name="email" label="Email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@..." />
          </div>
          <InputField className="forn-modal__field" name="sito" label="Sito web" value={form.sito} onChange={e => set('sito', e.target.value)} placeholder="www.fornitore.it" />
        </div>

        <div className="forn-modal__section">
          <div className="forn-modal__section-title">Classificazione</div>
          <div className="forn-modal__grid forn-modal__grid--2">
            <SelectField
              className="forn-modal__field"
              name="categoria"
              label="Categoria merceologica *"
              value={form.categoriaId}
              onChange={e => set('categoriaId', e.target.value)}
              placeholder="Seleziona categoria..."
              options={categorie.map(c => ({ value: c.id, label: c.nome }))}
            />
            <SelectField
              className="forn-modal__field"
              name="macro-area"
              label="Macro-area *"
              value={form.macroArea}
              onChange={e => set('macroArea', e.target.value)}
              placeholder="Seleziona macro-area..."
              options={MACRO_AREE.map(m => ({ value: m.id, label: m.label }))}
            />
          </div>
          <InputField
            className="forn-modal__field"
            name="certificazioni"
            label="Certificazioni (separate da virgola)"
            value={form.certificazioni}
            onChange={e => set('certificazioni', e.target.value)}
            placeholder="DOP Raschera, Biologico, Vegan OK"
          />
          <InputField
            className="forn-modal__field"
            name="caratteristiche"
            label="Caratteristiche distintive (separate da virgola)"
            value={form.caratteristiche}
            onChange={e => set('caratteristiche', e.target.value)}
            placeholder="80 ettari di vigneti, 400.000 bottiglie/anno"
          />
        </div>

        <div className="forn-modal__actions">
          <button className="sib-btn sib-btn--toolbar" onClick={onClose}>Annulla</button>
          <button className="sib-btn sib-btn--primary" disabled={disabled} onClick={onConfirm}>
            {editing ? 'Aggiorna fornitore' : 'Crea fornitore'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
