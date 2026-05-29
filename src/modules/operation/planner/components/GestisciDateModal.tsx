// ─── GestisciDateModal ────────────────────────────────────────────────────────
import React, { useState } from 'react';
import Modal from '../../../../core/components/Modal';
import { Pren } from '../planner.types';

interface Props {
  open    : boolean;
  pren    : Pren | null;
  onClose : () => void;
  onConfirm: (checkIn: string, checkOut: string) => void;
}

const GestisciDateModal: React.FC<Props> = ({ open, pren, onClose, onConfirm }) => {
  const [ci, setCi] = useState(pren?.checkIn ?? '');
  const [co, setCo] = useState(pren?.checkOut ?? '');

  React.useEffect(() => {
    if (pren) { setCi(pren.checkIn); setCo(pren.checkOut); }
  }, [pren]);

  if (!pren) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Gestisci date prenotazione N.${pren.booking}`} size="md">
      <div className="gestisci-date">
        <p className="gestisci-date__hint">
          Selezionando una data differente da quella corrente potresti visualizzare variazioni di prezzo
        </p>
        <div className="gestisci-date__range">
          <input className="sib-input" type="date" value={ci} onChange={e => setCi(e.target.value)} />
          <span className="gestisci-date__sep">→</span>
          <input className="sib-input" type="date" value={co} onChange={e => setCo(e.target.value)} />
        </div>
        <button type="button" className="sib-btn sib-btn--primary gestisci-date__confirm" onClick={() => { onConfirm(ci, co); onClose(); }}>
          Conferma
        </button>
      </div>
    </Modal>
  );
};

export default GestisciDateModal;
