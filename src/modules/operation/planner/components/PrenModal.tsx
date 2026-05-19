// ─── PrenModal ────────────────────────────────────────────────────────────────
import React from 'react';
import Modal from '../../../../core/components/Modal';
import { PrenPendente } from '../planner.types';
import { C } from '../planner.styles';
import { fmtDate, parseDt } from '../planner.data';

interface Props {
  title       : string;
  subtitle    : string;
  items       : PrenPendente[];
  onClose     : () => void;
  actionLabel : string;
}

const PrenModal: React.FC<Props> = ({ title, subtitle, items, onClose, actionLabel }) => (
  <Modal open={true} onClose={onClose} title={title}>
    <div className="pren-modal">
      <p className="pren-modal__subtitle">{subtitle}</p>
      <div className="pren-modal__scroll">
        <table className="pren-modal__table">
          <thead>
            <tr>
              {['#','Nominativo','Date','Agenzia','Tipologia','Segmento','Camera'].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((p, i) => (
              <tr key={i}>
                <td className="pren-modal__td-booking">{p.booking}</td>
                <td className="pren-modal__td-guest">{p.nominativo}</td>
                <td className="pren-modal__td-dates">
                  {fmtDate(parseDt(p.checkIn))} – {fmtDate(parseDt(p.checkOut))}
                </td>
                <td className="pren-modal__td-agency">{p.agenzia}</td>
                <td>
                  <svg viewBox="0 0 16 16" width={15} height={15} fill={C.primary}>
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.5 4h1v1h-1V5zm0 2h1v5h-1V7z" />
                  </svg>
                </td>
                <td className="pren-modal__td-agency">{p.segmento}</td>
                <td>
                  <button className="pren-modal__action-btn">
                    <svg viewBox="0 0 16 16" width={13} height={13} fill="currentColor">
                      <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm1 2v8h8V4H4z" />
                    </svg>
                    {actionLabel}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </Modal>
);

export default PrenModal;
