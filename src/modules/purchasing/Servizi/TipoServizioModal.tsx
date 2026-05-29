import React from 'react'
import Modal from '../../../core/components/Modal'
import Ico from '../../../core/icons/Ico'
import { Icon } from '../_shared/Icon'
import type { TipoServizioMeta, FormFieldSpec, FormFieldKind } from './servizi-types'
import './TipoServizioModal.sass'

interface Props {
  open: boolean
  editing: TipoServizioMeta | null
  form: TipoServizioMeta
  setForm: (t: TipoServizioMeta) => void
  onClose: () => void
  onConfirm: () => void
}

const PALETTE = [
  '#1E8A6E', '#D26A0A', '#6E5BAE', '#E54A8C', '#7A6230',
  '#0F8FB3', '#A23B8A', '#3447B5', '#B23A1D', '#5C9CD4',
  '#2E8D59', '#E07B39', '#666666', '#204769',
]

// Icone consigliate per i tipi di servizio (rese tramite FA passthrough).
const ICON_SUGGESTIONS = [
  'map-location-dot', 'car', 'suitcase-rolling', 'ferris-wheel', 'landmark',
  'star', 'calendar-star', 'music', 'futbol', 'ticket', 'plane', 'ship',
  'utensils', 'spa', 'mountain', 'paw', 'bicycle', 'bus', 'train',
]

const KIND_LABELS: Record<FormFieldKind, string> = {
  'date':   'Data',
  'time':   'Ora',
  'number': 'Numero',
  'text':   'Testo',
  'select': 'Scelta',
}

const slugify = (s: string): string =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export default function TipoServizioModal({ open, editing, form, setForm, onClose, onConfirm }: Props) {
  const isCreating = !editing
  const title = isCreating ? 'Nuovo tipo di servizio' : 'Modifica tipo di servizio'

  const upd = <K extends keyof TipoServizioMeta>(key: K, value: TipoServizioMeta[K]) =>
    setForm({ ...form, [key]: value })

  // ─── Campi del form di prenotazione ──────────────────────────────────────
  const updField = (idx: number, patch: Partial<FormFieldSpec>) => {
    const next = form.formFields.map((f, i) => i === idx ? { ...f, ...patch } : f)
    setForm({ ...form, formFields: next })
  }
  const addField = () => {
    setForm({
      ...form,
      formFields: [
        ...form.formFields,
        { kind: 'text', name: `campo${form.formFields.length + 1}`, label: 'Nuovo campo' },
      ],
    })
  }
  const removeField = (idx: number) => {
    setForm({ ...form, formFields: form.formFields.filter((_, i) => i !== idx) })
  }
  const moveField = (idx: number, dir: -1 | 1) => {
    const next = [...form.formFields]
    const j = idx + dir
    if (j < 0 || j >= next.length) return
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setForm({ ...form, formFields: next })
  }

  // Quando l'utente digita il label e l'id è vuoto (solo in creazione), genera lo slug.
  const onLabelChange = (v: string) => {
    if (isCreating && (!form.id.trim() || form.id === slugify(form.label))) {
      setForm({ ...form, label: v, id: slugify(v) })
    } else {
      upd('label', v)
    }
  }

  const canSave = form.id.trim() && form.label.trim() && form.formFields.length > 0

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="tipo-modal">
        {/* ─── Identità ─────────────────────────────────────────────────── */}
        <section className="tipo-modal__section">
          <h3 className="tipo-modal__section-title">Identità</h3>
          <div className="tipo-modal__grid">
            <div className="tipo-modal__field tipo-modal__field--full">
              <label className="tipo-modal__label">Nome visualizzato</label>
              <input
                type="text"
                className="sib-input"
                value={form.label}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder="es. Escursione turistica"
              />
            </div>
            <div className="tipo-modal__field tipo-modal__field--full">
              <label className="tipo-modal__label">
                ID identificativo
                {!isCreating && <span className="tipo-modal__hint"> (non modificabile per non spezzare servizi esistenti)</span>}
              </label>
              <input
                type="text"
                className="sib-input"
                value={form.id}
                onChange={(e) => isCreating && upd('id', slugify(e.target.value))}
                placeholder="es. escursione"
                readOnly={!isCreating}
              />
            </div>
          </div>
        </section>

        {/* ─── Aspetto ──────────────────────────────────────────────────── */}
        <section className="tipo-modal__section">
          <h3 className="tipo-modal__section-title">Aspetto</h3>

          <div className="tipo-modal__field tipo-modal__field--full">
            <label className="tipo-modal__label">Icona</label>
            <div className="tipo-modal__icon-row">
              <input
                type="text"
                className="sib-input tipo-modal__icon-input"
                value={form.icon}
                onChange={(e) => upd('icon', e.target.value)}
                placeholder="nome icona FA (es. car)"
              />
              <span
                className="tipo-modal__icon-preview"
                style={{ '--type-color': form.color } as React.CSSProperties}
              >
                <Icon family="light" name={form.icon || 'tag'} />
              </span>
            </div>
            <div className="tipo-modal__icon-suggest">
              {ICON_SUGGESTIONS.map(name => {
                const active = form.icon === name
                return (
                  <button
                    key={name}
                    type="button"
                    className={`tipo-modal__icon-chip${active ? ' tipo-modal__icon-chip--active' : ''}`}
                    onClick={() => upd('icon', name)}
                    title={name}
                  >
                    <Icon family="light" name={name} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="tipo-modal__field tipo-modal__field--full">
            <label className="tipo-modal__label">Colore</label>
            <div className="tipo-modal__palette">
              {PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`tipo-modal__swatch${form.color === c ? ' tipo-modal__swatch--active' : ''}`}
                  style={{ '--type-color': c } as React.CSSProperties}
                  onClick={() => upd('color', c)}
                  aria-label={`Colore ${c}`}
                />
              ))}
              <input
                type="color"
                className="tipo-modal__color-input"
                value={form.color}
                onChange={(e) => upd('color', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ─── Campi del form di prenotazione ───────────────────────────── */}
        <section className="tipo-modal__section">
          <h3 className="tipo-modal__section-title">
            Form di prenotazione
            <span className="tipo-modal__hint"> — i campi compilati dall'utente in fase di acquisto</span>
          </h3>

          <div className="tipo-modal__fields-list">
            {form.formFields.map((f, idx) => (
              <div key={idx} className="tipo-modal__field-row">
                <div className="tipo-modal__field-row-head">
                  <div className="tipo-modal__field-row-idx">#{idx + 1}</div>
                  <div className="tipo-modal__field-row-controls">
                    <button
                      type="button"
                      className="tipo-modal__row-btn"
                      onClick={() => moveField(idx, -1)}
                      disabled={idx === 0}
                      title="Sposta su"
                    >
                      <Icon family="regular" name="chevron-up" />
                    </button>
                    <button
                      type="button"
                      className="tipo-modal__row-btn"
                      onClick={() => moveField(idx, 1)}
                      disabled={idx === form.formFields.length - 1}
                      title="Sposta giù"
                    >
                      <Icon family="regular" name="chevron-down" />
                    </button>
                    <button
                      type="button"
                      className="tipo-modal__row-btn tipo-modal__row-btn--danger"
                      onClick={() => removeField(idx)}
                      title="Elimina campo"
                    >
                      <Ico n="trash" s={11} c="var(--color-error, #c0392b)" />
                    </button>
                  </div>
                </div>

                <div className="tipo-modal__field-row-grid">
                  <div className="tipo-modal__field">
                    <label className="tipo-modal__label">Tipo campo</label>
                    <select
                      className="sib-select"
                      value={f.kind}
                      onChange={(e) => updField(idx, { kind: e.target.value as FormFieldKind })}
                    >
                      {(Object.keys(KIND_LABELS) as FormFieldKind[]).map(k => (
                        <option key={k} value={k}>{KIND_LABELS[k]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="tipo-modal__field">
                    <label className="tipo-modal__label">Nome interno</label>
                    <input
                      type="text"
                      className="sib-input"
                      value={f.name}
                      onChange={(e) => updField(idx, { name: e.target.value })}
                      placeholder="es. dataServizio"
                    />
                  </div>
                  <div className="tipo-modal__field">
                    <label className="tipo-modal__label">Etichetta</label>
                    <input
                      type="text"
                      className="sib-input"
                      value={f.label}
                      onChange={(e) => updField(idx, { label: e.target.value })}
                      placeholder="es. Data escursione"
                    />
                  </div>
                  <div className="tipo-modal__field tipo-modal__field--check">
                    <label className="tipo-modal__check">
                      <input
                        type="checkbox"
                        checked={!!f.required}
                        onChange={(e) => updField(idx, { required: e.target.checked })}
                      />
                      Obbligatorio
                    </label>
                  </div>

                  {f.kind === 'number' && (
                    <>
                      <div className="tipo-modal__field">
                        <label className="tipo-modal__label">Minimo</label>
                        <input
                          type="number"
                          className="sib-input"
                          value={f.min ?? ''}
                          onChange={(e) => updField(idx, { min: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })}
                        />
                      </div>
                      <div className="tipo-modal__field">
                        <label className="tipo-modal__label">Massimo</label>
                        <input
                          type="number"
                          className="sib-input"
                          value={f.max ?? ''}
                          onChange={(e) => updField(idx, { max: e.target.value === '' ? undefined : parseInt(e.target.value, 10) })}
                        />
                      </div>
                    </>
                  )}

                  {f.kind === 'text' && (
                    <div className="tipo-modal__field tipo-modal__field--full">
                      <label className="tipo-modal__label">Placeholder</label>
                      <input
                        type="text"
                        className="sib-input"
                        value={f.placeholder ?? ''}
                        onChange={(e) => updField(idx, { placeholder: e.target.value })}
                      />
                    </div>
                  )}

                  {f.kind === 'select' && (
                    <div className="tipo-modal__field tipo-modal__field--full">
                      <label className="tipo-modal__label">
                        Opzioni <span className="tipo-modal__hint">(separate da virgola)</span>
                      </label>
                      <input
                        type="text"
                        className="sib-input"
                        value={(f.options ?? []).join(', ')}
                        onChange={(e) => updField(idx, {
                          options: e.target.value.split(',').map(o => o.trim()).filter(Boolean),
                        })}
                        placeholder="es. Standard, Salta-fila, VIP"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="sib-btn sib-btn--ghost tipo-modal__add-field" onClick={addField}>
            <Ico n="plus" s={11} c="var(--color-primary)" />
            Aggiungi campo
          </button>
        </section>

        {/* ─── Footer ───────────────────────────────────────────────────── */}
        <div className="tipo-modal__footer">
          <button type="button" className="sib-btn sib-btn--ghost" onClick={onClose}>
            Annulla
          </button>
          <button
            type="button"
            className="sib-btn sib-btn--primary"
            onClick={onConfirm}
            disabled={!canSave}
          >
            {isCreating ? 'Crea tipo' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
