// ─── SpostaPrenModal ──────────────────────────────────────────────────────────
import React, { useState } from 'react';
import Modal from '../../../../core/components/Modal';
import { Pren } from '../planner.types';

interface Props {
  open    : boolean;
  pren    : Pren | null;
  onClose : () => void;
  onConfirm: (newCheckIn: string) => void;
}

const SpostaPrenModal: React.FC<Props> = ({ open, pren, onClose, onConfirm }) => {
  const [ci, setCi] = useState(pren?.checkIn ?? '');
  React.useEffect(() => { if (pren) setCi(pren.checkIn); }, [pren]);
  if (!pren) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Sposta prenotazione N.${pren.booking}`} size="sm">
      <div className="sposta-pren">
        <label className="sposta-pren__label">Seleziona la data di check-in:</label>
        <input className="sib-input" type="date" value={ci} onChange={e => setCi(e.target.value)} />
        <div className="sposta-pren__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Annulla</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={() => { onConfirm(ci); onClose(); }}>Procedi</button>
        </div>
      </div>
    </Modal>
  );
};

export default SpostaPrenModal;
