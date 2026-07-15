import React from 'react'
import Ico from '../../../../core/icons/Ico'
import StructFields from '../../modals/NewClientModal/StructFields'
import type { NewClientForm } from '../../types'
import { PIANI_DATA } from '../../../../modules/operation/planner/planner.data'
import { usePlanimetrieStore, planimetriaEditorPage } from '../../../../store/usePlanimetrieStore'
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
  /** Naviga a una pagina globale (per aprire l'editor planimetria). */
  navigate?: (page: string) => void
}

export default function StrutturaTab({ data, editing, draft, setDraft, onEdit, onSave, onCancel, navigate }: Props) {
  const byKey = usePlanimetrieStore(s => s.byKey)
  const struttura = data.nome || 'Struttura'
  const piani = PIANI_DATA.filter(p => p.id !== 0)

  return (
    <div className="strutt-tab">
      <StructFields form={editing ? draft : data} setForm={setDraft} readOnly={!editing} />

      {navigate && !editing && (
        <div className="strutt-tab__plans">
          <div className="strutt-tab__plans-head">
            <div>
              <div className="strutt-tab__plans-title">Planimetrie dei piani</div>
              <div className="strutt-tab__plans-sub">Disegna la mappa di ogni piano: le camere generate saranno gestite dal sistema (planner, PMS).</div>
            </div>
          </div>
          <div className="strutt-tab__plans-grid">
            {piani.map(p => {
              const has = !!byKey[`${struttura}::${p.id}`]
              return (
                <button
                  key={p.id}
                  type="button"
                  className="strutt-tab__plan-card"
                  onClick={() => navigate(planimetriaEditorPage(struttura, p.id))}
                >
                  <span className="strutt-tab__plan-floor">{p.id}</span>
                  <span className="strutt-tab__plan-info">
                    <span className="strutt-tab__plan-name">{p.nome}</span>
                    <span className="strutt-tab__plan-meta">{p.camere.length} camere</span>
                  </span>
                  <span className={`strutt-tab__plan-state${has ? ' is-done' : ''}`}>
                    <i className={`fa-solid ${has ? 'fa-circle-check' : 'fa-pen-ruler'}`} />
                    {has ? 'Modifica' : 'Crea'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

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
