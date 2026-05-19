import React from 'react'
import Modal from '../../../../core/components/Modal'
import { CATEGORIE_STRUTTURA } from '../../constants'
import type { NewClientForm, TipologiaCategoria } from '../../types'
import './NewClientModal.sass'

interface Props {
  open: boolean
  form: NewClientForm
  setForm: (f: NewClientForm) => void
  onClose: () => void
  onConfirm: () => void
}

export default function NewClientModal({ open, form, setForm, onClose, onConfirm }: Props) {
  const cat = CATEGORIE_STRUTTURA.find(c => c.id === form.categoria) || CATEGORIE_STRUTTURA[0]
  const showClassificazione = cat.classificazioni.length > 0
  const showCamere = cat.hasCamere
  const disabled = !form.nome.trim()

  const handleCategoria = (v: TipologiaCategoria) => {
    const next = CATEGORIE_STRUTTURA.find(c => c.id === v)
    const nextClass = next && next.classificazioni.length > 0 && next.classificazioni.includes(form.classificazione)
      ? form.classificazione
      : ''
    setForm({ ...form, categoria: v, classificazione: nextClass, camere: next?.hasCamere ? form.camere : '0' })
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuova struttura cliente" size="sm">
      <div className="ncm">
        <div className="ncm__field">
          <label className="ncm__label">Nome struttura *</label>
          <input
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
            className="sib-input"
            placeholder="Es. Hotel Firenze Arte"
          />
        </div>

        <div className="ncm__field">
          <label className="ncm__label">Tipologia *</label>
          <select
            value={form.categoria}
            onChange={e => handleCategoria(e.target.value as TipologiaCategoria)}
            className="sib-select"
          >
            {CATEGORIE_STRUTTURA.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {showClassificazione && (
          <div className="ncm__field">
            <label className="ncm__label">Classificazione</label>
            <select
              value={form.classificazione}
              onChange={e => setForm({ ...form, classificazione: e.target.value })}
              className="sib-select"
            >
              <option value="">Nessuna / non applicabile</option>
              {cat.classificazioni.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <div className="ncm__field">
          <label className="ncm__label">Città</label>
          <input
            value={form.citta}
            onChange={e => setForm({ ...form, citta: e.target.value })}
            className="sib-input"
            placeholder="Es. Firenze (FI)"
          />
        </div>

        {showCamere && (
          <div className="ncm__field">
            <label className="ncm__label">N° camere / unità</label>
            <input
              type="number"
              value={form.camere}
              onChange={e => setForm({ ...form, camere: e.target.value })}
              className="sib-input"
              placeholder="20"
            />
          </div>
        )}

        <div className="ncm__field">
          <label className="ncm__label">Email</label>
          <input
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="sib-input"
            placeholder="info@struttura.it"
          />
        </div>

        <div className="ncm__actions">
          <button className="sib-btn sib-btn--toolbar" onClick={onClose}>Annulla</button>
          <button
            className="sib-btn sib-btn--primary"
            disabled={disabled}
            onClick={onConfirm}
          >
            Crea struttura
          </button>
        </div>
      </div>
    </Modal>
  )
}
