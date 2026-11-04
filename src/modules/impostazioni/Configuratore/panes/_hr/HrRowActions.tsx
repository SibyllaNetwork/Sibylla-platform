import React from 'react'
import Tooltip from '../../../../../core/components/Tooltip'
import './HrRowActions.sass'

// ─── Azioni di riga (Modifica / Duplica / Elimina) dei pane «Risorse umane» ──

export default function HrRowActions({ nome, onEdit, onDuplicate, onDelete }: {
  nome: string
  onEdit: () => void
  onDuplicate?: () => void
  onDelete: () => void
}) {
  return (
    <span className="cfg-hr-actions">
      <Tooltip text="Modifica">
        <button type="button" className="sib-btn sib-btn--icon" aria-label={`Modifica ${nome}`} onClick={onEdit}>
          <i className="fa-solid fa-pen" aria-hidden="true" />
        </button>
      </Tooltip>
      {onDuplicate && (
        <Tooltip text="Duplica">
          <button type="button" className="sib-btn sib-btn--icon" aria-label={`Duplica ${nome}`} onClick={onDuplicate}>
            <i className="fa-solid fa-copy" aria-hidden="true" />
          </button>
        </Tooltip>
      )}
      <Tooltip text="Elimina">
        <button type="button" className="sib-btn sib-btn--icon" aria-label={`Elimina ${nome}`} onClick={onDelete}>
          <i className="fa-solid fa-trash-can" aria-hidden="true" />
        </button>
      </Tooltip>
    </span>
  )
}
