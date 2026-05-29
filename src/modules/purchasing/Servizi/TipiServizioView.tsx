import React, { useState } from 'react'
import Ico from '../../../core/icons/Ico'
import { Icon } from '../_shared/Icon'
import ConfirmDeleteModal from '../../../admin/SibyllaAdminPanel/modals/ConfirmDeleteModal/ConfirmDeleteModal'
import { useTipiServizioStore } from '../../../store/useTipiServizioStore'
import { useServiziStore } from '../../../store/useServiziStore'
import type { TipoServizioMeta, FormFieldSpec } from './servizi-types'
import TipoServizioModal from './TipoServizioModal'
import './TipiServizioView.sass'

const EMPTY_TIPO: TipoServizioMeta = {
  id: '',
  label: '',
  icon: 'tag',
  color: '#5C9CD4',
  formFields: [
    { kind: 'date', name: 'dataServizio', label: 'Data', required: true },
  ],
}

// Banner che riassume ciò che mostra la view.
const HEADER_HINT = "Configura le tipologie di servizio acquistabili (escursione, noleggio, ecc.). Ogni tipo definisce icona, colore e i campi del form di prenotazione."

export default function TipiServizioView() {
  const tipi       = useTipiServizioStore(s => s.tipi)
  const addTipo    = useTipiServizioStore(s => s.addTipo)
  const updateTipo = useTipiServizioStore(s => s.updateTipo)
  const removeTipo = useTipiServizioStore(s => s.removeTipo)
  const servizi    = useServiziStore(s => s.servizi)

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TipoServizioMeta | null>(null)
  const [form, setForm] = useState<TipoServizioMeta>(EMPTY_TIPO)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const countByTipo = (id: string) => servizi.filter(s => s.tipo === id).length

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_TIPO, formFields: [...EMPTY_TIPO.formFields] })
    setShowModal(true)
  }
  const openEdit = (t: TipoServizioMeta) => {
    setEditing(t)
    setForm({ ...t, formFields: t.formFields.map(f => ({ ...f })) })
    setShowModal(true)
  }
  const confirmEdit = () => {
    if (!form.id.trim() || !form.label.trim()) return
    // Sanifica: rimuovi campi senza name/label
    const cleanFields: FormFieldSpec[] = form.formFields
      .filter(f => f.name.trim() && f.label.trim())
      .map(f => {
        const out: FormFieldSpec = { kind: f.kind, name: f.name.trim(), label: f.label.trim() }
        if (f.required) out.required = true
        if (f.kind === 'number') {
          if (f.min !== undefined) out.min = f.min
          if (f.max !== undefined) out.max = f.max
        }
        if (f.kind === 'text' && f.placeholder) out.placeholder = f.placeholder
        if (f.kind === 'select') out.options = (f.options || []).filter(o => o.trim())
        return out
      })
    const data: TipoServizioMeta = { ...form, formFields: cleanFields }
    if (editing) {
      updateTipo(editing.id, data)
    } else {
      addTipo(data)
    }
    setShowModal(false)
  }
  const confirmDelete = () => {
    if (!deletingId) return
    removeTipo(deletingId)
    setDeletingId(null)
  }

  return (
    <div className="tipi-servizio">
      <div className="tipi-servizio__head">
        <p className="tipi-servizio__hint">{HEADER_HINT}</p>
        <button type="button" className="sib-btn sib-btn--primary" onClick={openCreate}>
          <Ico n="plus" s={12} c="#fff" />
          Nuovo tipo
        </button>
      </div>

      {tipi.length === 0 ? (
        <div className="tipi-servizio__empty">
          Nessun tipo configurato. Crea il primo per abilitare la vetrina servizi.
        </div>
      ) : (
        <div className="sib-table-wrap">
          <table className="sib-table tipi-servizio__table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>Icona</th>
                <th>Tipo</th>
                <th>ID</th>
                <th>Campi form</th>
                <th>Servizi associati</th>
                <th className="tipi-servizio__th-actions">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {tipi.map(t => {
                const count = countByTipo(t.id)
                return (
                  <tr key={t.id}>
                    <td>
                      <span
                        className="tipi-servizio__icon-chip"
                        style={{ '--type-color': t.color } as React.CSSProperties}
                      >
                        <Icon family="light" name={t.icon} />
                      </span>
                    </td>
                    <td>
                      <div className="tipi-servizio__name">{t.label}</div>
                      <div className="tipi-servizio__sub">
                        <span
                          className="tipi-servizio__swatch"
                          style={{ '--type-color': t.color } as React.CSSProperties}
                        />
                        {t.color}
                      </div>
                    </td>
                    <td><code className="tipi-servizio__id">{t.id}</code></td>
                    <td>
                      <div className="tipi-servizio__fields">
                        {t.formFields.map(f => (
                          <span key={f.name} className={`tipi-servizio__field-tag tipi-servizio__field-tag--${f.kind}`}>
                            {f.label}
                            {f.required && <span className="tipi-servizio__field-req">*</span>}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="tipi-servizio__count">{count}</span>
                    </td>
                    <td className="tipi-servizio__cell-actions">
                      <button
                        type="button"
                        className="tipi-servizio__icon-btn"
                        title="Modifica"
                        onClick={() => openEdit(t)}
                      >
                        <Ico n="edit" s={13} c="var(--color-text-inactive)" />
                      </button>
                      <button
                        type="button"
                        className="tipi-servizio__icon-btn tipi-servizio__icon-btn--danger"
                        title={count > 0 ? `Elimina (${count} servizi referenziano questo tipo)` : 'Elimina'}
                        onClick={() => setDeletingId(t.id)}
                      >
                        <Ico n="trash" s={13} c="var(--color-text-inactive)" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <TipoServizioModal
        open={showModal}
        editing={editing}
        form={form}
        setForm={setForm}
        onClose={() => setShowModal(false)}
        onConfirm={confirmEdit}
      />

      <ConfirmDeleteModal
        open={deletingId !== null}
        title="Elimina tipo di servizio"
        itemName={
          deletingId
            ? `${tipi.find(t => t.id === deletingId)?.label || deletingId} — ${countByTipo(deletingId)} servizi associati resteranno orfani`
            : ''
        }
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
