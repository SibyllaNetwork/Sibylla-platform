import React from 'react'
import Modal from '../../../../core/components/Modal'
import Ico from '../../../../core/icons/Ico'
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
            <Field label="Nome fornitore *">
              <input value={form.nome} onChange={e => set('nome', e.target.value)} className="sib-input" placeholder="Es. Caseificio Alpino" />
            </Field>
            <Field label="Anno di fondazione">
              <input type="number" value={form.annoFondazione} onChange={e => set('annoFondazione', e.target.value)} className="sib-input" placeholder="Es. 1965" />
            </Field>
            <Field label="Descrizione breve">
              <input value={form.descrizione} onChange={e => set('descrizione', e.target.value)} className="sib-input" placeholder="Sintesi del fornitore" />
            </Field>
            <Field label="URL immagine">
              <input value={form.immagineUrl} onChange={e => set('immagineUrl', e.target.value)} className="sib-input" placeholder="https://..." />
            </Field>
          </div>
          <Field label="Storia / racconto">
            <textarea
              value={form.storia}
              onChange={e => set('storia', e.target.value)}
              className="sib-input forn-modal__textarea"
              rows={3}
              placeholder="Storia, tradizione, valori..."
            />
          </Field>
        </div>

        <div className="forn-modal__section">
          <div className="forn-modal__section-title">Sede</div>
          <div className="forn-modal__grid forn-modal__grid--3">
            <Field label="Indirizzo">
              <input value={form.indirizzo} onChange={e => set('indirizzo', e.target.value)} className="sib-input" placeholder="Via..." />
            </Field>
            <Field label="Città">
              <input value={form.citta} onChange={e => set('citta', e.target.value)} className="sib-input" placeholder="Città" />
            </Field>
            <Field label="CAP">
              <input value={form.cap} onChange={e => set('cap', e.target.value)} className="sib-input" placeholder="00100" />
            </Field>
            <Field label="Regione">
              <input value={form.regione} onChange={e => set('regione', e.target.value)} className="sib-input" placeholder="Es. Toscana" />
            </Field>
            <Field label="Telefono">
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} className="sib-input" placeholder="+39 ..." />
            </Field>
            <Field label="Email">
              <input value={form.email} onChange={e => set('email', e.target.value)} className="sib-input" placeholder="info@..." />
            </Field>
          </div>
          <Field label="Sito web">
            <input value={form.sito} onChange={e => set('sito', e.target.value)} className="sib-input" placeholder="www.fornitore.it" />
          </Field>
        </div>

        <div className="forn-modal__section">
          <div className="forn-modal__section-title">Classificazione</div>
          <div className="forn-modal__grid forn-modal__grid--2">
            <Field label="Categoria merceologica *">
              <select value={form.categoriaId} onChange={e => set('categoriaId', e.target.value)} className="sib-select">
                <option value="">Seleziona categoria...</option>
                {categorie.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </Field>
            <Field label="Macro-area *">
              <select value={form.macroArea} onChange={e => set('macroArea', e.target.value)} className="sib-select">
                <option value="">Seleziona macro-area...</option>
                {MACRO_AREE.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Certificazioni (separate da virgola)">
            <input
              value={form.certificazioni}
              onChange={e => set('certificazioni', e.target.value)}
              className="sib-input"
              placeholder="DOP Raschera, Biologico, Vegan OK"
            />
          </Field>
          <Field label="Caratteristiche distintive (separate da virgola)">
            <input
              value={form.caratteristiche}
              onChange={e => set('caratteristiche', e.target.value)}
              className="sib-input"
              placeholder="80 ettari di vigneti, 400.000 bottiglie/anno"
            />
          </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="forn-modal__field">
      <label className="forn-modal__label">{label}</label>
      {children}
    </div>
  )
}
