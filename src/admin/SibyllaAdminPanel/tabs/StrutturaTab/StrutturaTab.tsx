import React from 'react'
import Ico from '../../../../core/icons/Ico'
import StructFields from '../../modals/NewClientModal/StructFields'
import type { NewClientForm } from '../../types'
import './StrutturaTab.sass'

interface Props {
  /** Dati completi della struttura selezionata (stessi campi della modale). */
  data: NewClientForm
  /** true = modifica inline attiva (campi editabili). */
  editing: boolean
  /** Bozza editabile usata mentre `editing` è attivo. */
  draft: NewClientForm
  setDraft: (f: NewClientForm) => void
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}

export default function StrutturaTab({ data, editing, draft, setDraft, onEdit, onSave, onCancel }: Props) {
  return (
    <div className="strutt-tab">
      <StructFields form={editing ? draft : data} setForm={setDraft} readOnly={!editing} />
      <div className="strutt-tab__foot">
        {editing ? (
          <>
            <button type="button" className="sib-btn sib-btn--toolbar" onClick={onCancel}>Annulla</button>
            <button type="button" className="sib-btn sib-btn--primary strutt-tab__edit" disabled={!draft.nome.trim()} onClick={onSave}>
              <Ico n="check" s={14} c="#fff" /> Salva modifica
            </button>
          </>
        ) : (
          <button type="button" className="sib-btn sib-btn--primary strutt-tab__edit" onClick={onEdit}>
            <Ico n="edit" s={14} c="#fff" /> Modifica struttura
          </button>
        )}
      </div>
    </div>
  )
}
