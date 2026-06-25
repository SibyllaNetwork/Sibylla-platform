import React, { useState } from 'react'
import Ico from '../../../core/icons/Ico'
import Tooltip from '../../../core/components/Tooltip'
import Modal from '../../../core/components/Modal'
import { SelectField, InputField } from '../../../core/components/form'
import { toast } from '../../../core/components/Toast/useToast'
import './GestioneCommissioni.sass'

interface Props { navigate: (p: string) => void }

interface Comm { id: number; azienda: string; segmento: string; commissione: string; cashback: string }

const SEED: Comm[] = [
  { id: 1, azienda: 'Reservation Hotel Italy', segmento: 'Gruppi', commissione: '5,00', cashback: '5,00' },
]
const AZIENDE = ['Reservation Hotel Italy', 'Sibylla', 'GAR S.R.L.']

export default function GestioneCommissioni({ navigate }: Props) {
  const [rows, setRows] = useState<Comm[]>(SEED)
  const [azienda, setAzienda] = useState('')
  const [editRow, setEditRow] = useState<Comm | null>(null)
  const [editComm, setEditComm] = useState('')
  const [editCash, setEditCash] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [cName, setCName] = useState('')
  const [cSeg, setCSeg] = useState('')
  const [cComm, setCComm] = useState('0')
  const [cCash, setCCash] = useState('0')

  const filtered = azienda ? rows.filter(r => r.azienda === azienda) : rows

  const remove = (c: Comm) => {
    setRows(prev => prev.filter(r => r.id !== c.id))
    toast.success(`Commissione di «${c.azienda}» eliminata.`, 'Commissione rimossa')
  }

  const openEdit = (c: Comm) => {
    setEditRow(c)
    setEditComm(String(parseFloat(c.commissione.replace(',', '.')) || ''))
    setEditCash(String(parseFloat(c.cashback.replace(',', '.')) || ''))
  }
  const fmt = (s: string) => {
    const n = parseFloat(String(s).replace(',', '.'))
    return isNaN(n) ? s : n.toFixed(2).replace('.', ',')
  }
  const saveEdit = () => {
    if (!editRow) return
    setRows(prev => prev.map(r => r.id === editRow.id ? { ...r, commissione: fmt(editComm), cashback: fmt(editCash) } : r))
    toast.success(`Commissione di «${editRow.azienda}» aggiornata.`, 'Commissione modificata')
    setEditRow(null)
  }

  const openCreate = () => { setCName(''); setCSeg(''); setCComm('0'); setCCash('0'); setCreateOpen(true) }
  const createComm = () => {
    if (!cName.trim() || !cSeg.trim()) return
    const id = Math.max(0, ...rows.map(r => r.id)) + 1
    setRows(prev => [...prev, { id, azienda: cName.trim(), segmento: cSeg.trim(), commissione: fmt(cComm), cashback: fmt(cCash) }])
    toast.success(`Commissione per «${cName.trim()}» creata.`, 'Commissione creata')
    setCreateOpen(false)
  }

  return (
    <div className="gcm">
      <button type="button" className="gcm__back" onClick={() => navigate('sibylla-admin')}>
        <Ico n="back" s={13} c="var(--color-primary)" /> Indietro
      </button>
      <div className="gcm__head">
        <h1 className="gcm__title">Gestione delle comissioni</h1>
        <p className="gcm__sub">Imposta percentuali di commissione e cashback per azienda e segmento.</p>
      </div>

      <div className="gcm__toolbar">
        <SelectField
          name="azienda"
          label="Azienda"
          className="gcm__field"
          value={azienda}
          onChange={e => setAzienda(e.target.value)}
          options={[{ value: '', label: 'Tutti' }, ...AZIENDE.map(a => ({ value: a, label: a }))]}
        />
        <button type="button" className="gcm__btn" onClick={openCreate}>Crea commissione</button>
      </div>

      <div className="sib-table-wrap gcm__wrap">
        <table className="sib-table gcm__table">
          <thead>
            <tr>
              <th>Azienda</th><th>Segmento</th><th>Percentuale comissione</th>
              <th>Percentuale cashback</th><th className="gcm__th-actions">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="gcm__empty">Nessuna commissione configurata.</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id}>
                <td className="gcm__strong">{c.azienda}</td>
                <td>{c.segmento}</td>
                <td>{c.commissione}</td>
                <td>{c.cashback}</td>
                <td className="gcm__actions">
                  <Tooltip text="Modifica">
                    <button type="button" className="gcm__icon" onClick={() => openEdit(c)}><Ico n="edit" s={13} c="var(--color-text-inactive)" /></button>
                  </Tooltip>
                  <Tooltip text="Elimina">
                    <button type="button" className="gcm__icon" onClick={() => remove(c)}><Ico n="trash" s={13} c="var(--color-text-inactive)" /></button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={editRow !== null} onClose={() => setEditRow(null)} title="Modifica Comissioni" size="md">
        <div className="gcm-modal">
          <h3 className="gcm-modal__section">Informazioni Generali</h3>
          <div className="gcm-modal__grid">
            <InputField
              name="editAzienda"
              label="Nome azienda"
              className="gcm-modal__f gcm-modal__f-ro"
              value={editRow?.azienda || ''}
              readOnly
            />
            <InputField
              name="editSegmento"
              label="Segmento"
              className="gcm-modal__f gcm-modal__f-ro"
              value={editRow?.segmento || ''}
              readOnly
            />
            <InputField
              name="editComm"
              label="Percentuale comissione"
              className="gcm-modal__f"
              type="number"
              min={0}
              max={100}
              step={0.5}
              iconRight="fa-light fa-percent"
              value={editComm}
              onChange={e => setEditComm(e.target.value)}
            />
            <InputField
              name="editCash"
              label="Percentuale cashback"
              className="gcm-modal__f"
              type="number"
              min={0}
              max={100}
              step={0.5}
              iconRight="fa-light fa-percent"
              value={editCash}
              onChange={e => setEditCash(e.target.value)}
            />
          </div>
          <button type="button" className="gcm-modal__btn" onClick={saveEdit}>Modifica Comissione</button>
        </div>
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Crea Comissioni" size="md">
        <div className="gcm-modal">
          <h3 className="gcm-modal__section">Informazioni Generali</h3>
          <div className="gcm-modal__grid">
            <InputField
              name="cName"
              label="Nome azienda"
              className="gcm-modal__f"
              value={cName}
              onChange={e => setCName(e.target.value)}
              placeholder="Nome azienda"
            />
            <InputField
              name="cSeg"
              label="Segmento"
              className="gcm-modal__f"
              value={cSeg}
              onChange={e => setCSeg(e.target.value)}
              placeholder="Segmento"
            />
            <InputField
              name="cComm"
              label="Percentuale comissione"
              className="gcm-modal__f"
              type="number"
              min={0}
              max={100}
              step={0.5}
              iconRight="fa-light fa-percent"
              value={cComm}
              onChange={e => setCComm(e.target.value)}
            />
            <InputField
              name="cCash"
              label="Percentuale cashback"
              className="gcm-modal__f"
              type="number"
              min={0}
              max={100}
              step={0.5}
              iconRight="fa-light fa-percent"
              value={cCash}
              onChange={e => setCCash(e.target.value)}
            />
          </div>
          <button type="button" className="gcm-modal__btn" disabled={!cName.trim() || !cSeg.trim()} onClick={createComm}>Crea Comissione</button>
        </div>
      </Modal>
    </div>
  )
}
