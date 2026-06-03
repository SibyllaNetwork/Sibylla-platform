import React from 'react'
import Modal from './Modal'
import { PROFILE_ICONS } from '../../store/useRuoliStore'
import './IconaPicker.sass'

interface Props {
  open: boolean
  onClose: () => void
  value?: string                       // icona FA attualmente selezionata
  onSelect: (fa: string | null) => void // null = nessuna (torna alle iniziali)
}

const GRUPPI: Array<'Maschile' | 'Femminile'> = ['Maschile', 'Femminile']

export default function IconaPicker({ open, onClose, value, onSelect }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Scegli icona profilo" size="md">
      <div className="icona-picker">
        {GRUPPI.map(g => (
          <div key={g} className="icona-picker__group">
            <div className="icona-picker__group-title">{g}</div>
            <div className="icona-picker__grid">
              {PROFILE_ICONS.filter(i => i.gruppo === g).map((ic, idx) => (
                <button
                  key={`${g}-${idx}`}
                  type="button"
                  className={`icona-picker__item ${value === ic.fa ? 'icona-picker__item--on' : ''}`}
                  title={ic.label}
                  onClick={() => { onSelect(ic.fa); onClose() }}>
                  <i className={`fa-light ${ic.fa}`} aria-hidden="true" />
                  <span>{ic.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="icona-picker__footer">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => { onSelect(null); onClose() }}>
            Nessuna icona (iniziali)
          </button>
        </div>
      </div>
    </Modal>
  )
}
