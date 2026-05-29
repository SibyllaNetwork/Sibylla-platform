// ─── FloorDetail ──────────────────────────────────────────────────────────────
// Dettaglio frontale di un piano: si apre con animazione (flip da assonometrico
// a frontale) al click sul piano nello spaccato. Mostra tutte le camere con
// numero, tipologia e stato. Stili in planner.sass (.floor-detail*).
import React from 'react';
import { Piano, StatoCam } from '../planner.types';
import { CAM_CLR } from '../planner.styles';

interface Props {
  piano: Piano;
  onClose: () => void;
}

const STATO_LABEL: Record<StatoCam, string> = {
  libera: 'Libera',
  occupata: 'Occupata',
  prenotata: 'Prenotata',
  manutenzione: 'Manutenzione',
  pulizia: 'Pulizia',
  checkout: 'Check-out',
};

const FloorDetail: React.FC<Props> = ({ piano, onClose }) => {
  const occ = piano.camere.filter(c => c.stato === 'occupata').length;
  const lib = piano.camere.filter(c => c.stato === 'libera').length;

  return (
    <div className="floor-detail" role="dialog" aria-label={`Dettaglio ${piano.nome}`}>
      <button type="button" className="floor-detail__back" onClick={onClose}>
        <i className="fa-light fa-chevron-left" aria-hidden="true" /> Tutti i piani
      </button>

      <div className="floor-detail__title">{piano.nome}</div>
      <div className="floor-detail__sub">{piano.camere.length} camere · {occ} occ · {lib} lib</div>

      <div className="floor-detail__grid">
        {piano.camere.map(cam => (
          <div key={cam.numero} className="floor-detail__room">
            <span className="floor-detail__room-bar" style={{ background: CAM_CLR[cam.stato] }} />
            <div className="floor-detail__room-body">
              <span className="floor-detail__room-num">Cam. {cam.numero}</span>
              <span className="floor-detail__room-type">{cam.tipo}</span>
              <span className="floor-detail__room-state" style={{ color: CAM_CLR[cam.stato] }}>
                {STATO_LABEL[cam.stato]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FloorDetail;
