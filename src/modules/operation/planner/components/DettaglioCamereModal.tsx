// ─── DettaglioCamereModal ─────────────────────────────────────────────────────
import React from 'react';
import Modal from '../../../../core/components/Modal';
import { Pren, RoomDetail } from '../planner.types';

interface Props {
  open    : boolean;
  pren    : Pren | null;
  struttura: string;
  onClose : () => void;
}

const DettaglioCamereModal: React.FC<Props> = ({ open, pren, struttura, onClose }) => {
  if (!pren) return null;
  const rooms: RoomDetail[] = pren.dettaglioCamere ?? [
    { numero: pren.numeroCamera, piano: '—', nome: '—', tipoAssegnato: '—', tipoRichiesto: '—', statoCheckIn: pren.statoCheckIn ?? 'In attesa' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Dettaglio camere" size="xl">
      <div className="dett-camere">
        <div className="dett-camere__intro">Sibylla ha assegnato questa prenotazione su:</div>
        <div className="dett-camere__topbar">
          <div className="dett-camere__hotel">
            <i className="fa-light fa-hotel" aria-hidden="true" /> {struttura}
          </div>
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm">
            <i className="fa-light fa-print" aria-hidden="true" /> Stampa
          </button>
        </div>

        <div className="sib-table-wrap">
          <table className="sib-table dett-camere__table">
            <thead>
              <tr>
                <th>N. Camera</th>
                <th>Piano</th>
                <th>Nome</th>
                <th>Tipo assegnato</th>
                <th>Tipo richiesto</th>
                <th>Stato Check in</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r, i) => (
                <tr key={i}>
                  <td>{r.numero}</td>
                  <td>{r.piano}</td>
                  <td>{r.nome}</td>
                  <td>{r.tipoAssegnato}</td>
                  <td>{r.tipoRichiesto}</td>
                  <td>{r.statoCheckIn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dett-camere__actions">
          <button type="button" className="sib-btn sib-btn--secondary" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </Modal>
  );
};

export default DettaglioCamereModal;
