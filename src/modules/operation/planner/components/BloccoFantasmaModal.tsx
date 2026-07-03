// ─── BloccoFantasmaModal ──────────────────────────────────────────────────────
// Modale di creazione/modifica di un blocco fantasma (prelazione morbida).
// Campi: periodo, camera, motivazione (obbligatoria). Avvisa che il blocco NON
// intacca la disponibilità residua in vendita.

import React, { useEffect, useState } from 'react'
import Modal from '../../../../core/components/Modal'
import { SelectField, DateRangeField, TextareaField } from '../../../../core/components/form'
import { useConfirmStore } from '../../../../store/useConfirmStore'
import { PIANI_DATA } from '../planner.data'
import type { BloccoFantasma, NuovoBloccoInput } from '../../../../store/useBlocchiFantasmaStore'

const cleanTipo = (t: string) => t.replace(/\s*\(.*\)\s*$/, '')
const ROOMS = PIANI_DATA.flatMap((p) => p.camere.map((c) => ({ numero: c.numero, tipo: c.tipo })))
const ROOM_OPTS = ROOMS.map((r) => ({ value: r.numero, label: `${r.numero} - ${cleanTipo(r.tipo)}` }))

interface Props {
  open: boolean
  onClose: () => void
  /** Valori iniziali (da strisciata sulla timeline o da blocco esistente). */
  initial: { dalISO: string; alISO: string; numeroCamera: string }
  /** Se presente, la modale è in modifica di un blocco esistente. */
  editing?: BloccoFantasma | null
  onSave: (input: NuovoBloccoInput) => void
  onDelete?: (id: string) => void
}

const BloccoFantasmaModal: React.FC<Props> = ({ open, onClose, initial, editing, onSave, onDelete }) => {
  const confirm = useConfirmStore((s) => s.confirm)
  const [dal, setDal] = useState(initial.dalISO)
  const [al, setAl] = useState(initial.alISO)
  const [camera, setCamera] = useState(initial.numeroCamera)
  const [motivazione, setMotivazione] = useState(editing?.motivazione ?? '')

  // Reset dei campi ogni volta che la modale si (ri)apre con nuovi valori iniziali
  useEffect(() => {
    if (!open) return
    setDal(initial.dalISO)
    setAl(initial.alISO)
    setCamera(initial.numeroCamera)
    setMotivazione(editing?.motivazione ?? '')
  }, [open, initial.dalISO, initial.alISO, initial.numeroCamera, editing])

  const canSave = !!camera && !!dal && !!al && motivazione.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    const tipo = ROOMS.find((r) => r.numero === camera)?.tipo
    onSave({ numeroCamera: camera, camTipo: tipo, dalISO: dal, alISO: al, motivazione: motivazione.trim() })
    onClose()
  }

  const handleDelete = async () => {
    if (!editing || !onDelete) return
    const ok = await confirm({
      title: 'Elimina blocco fantasma',
      message: (
        <>Vuoi eliminare il blocco fantasma sulla camera <strong>{editing.numeroCamera}</strong>? L’operazione non è reversibile.</>
      ),
    })
    if (!ok) return
    onDelete(editing.id)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Blocco fantasma" size="sm" className="bfm">
      <div className="bfm__body">
        <DateRangeField
          nameFrom="bfm-dal" nameTo="bfm-al" label="Date"
          valueFrom={dal} valueTo={al}
          onChangeFrom={(e) => setDal(e.target.value)}
          onChangeTo={(e) => setAl(e.target.value)}
        />
        <SelectField
          name="bfm-camera" label="Camera"
          value={camera}
          onChange={(e) => setCamera(e.target.value)}
          options={ROOM_OPTS}
        />
        <TextareaField
          name="bfm-motivazione" label="Motivazione" required rows={2}
          value={motivazione}
          onChange={(e) => setMotivazione(e.target.value)}
        />
        <p className="bfm__warn">
          Attenzione, il blocco non costituisce impegno pertanto non verrà modificata la
          disponibilità residua delle camere in vendita.
        </p>
      </div>

      <div className="bfm__actions">
        {editing && onDelete && (
          <button type="button" className="sib-btn sib-btn--danger bfm__delete" onClick={handleDelete}>
            <i className="fa-light fa-trash-can" aria-hidden="true" /> Elimina
          </button>
        )}
        <div className="bfm__actions-right">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>
            Annulla
          </button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={handleSave} disabled={!canSave}>
            Salva
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default BloccoFantasmaModal
