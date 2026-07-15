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
  /** Se presente, mostra il pulsante per creare la planimetria del piano nell'editor. */
  onCreatePlan?: () => void;
}

const STATO_LABEL: Record<StatoCam, string> = {
  libera: 'Libera',
  occupata: 'Occupata',
  prenotata: 'Prenotata',
  manutenzione: 'Manutenzione',
  pulizia: 'Pulizia',
  checkout: 'Check-out',
};

const FloorDetail: React.FC<Props> = ({ piano, onClose, onCreatePlan }) => {
  const occ = piano.camere.filter(c => c.stato === 'occupata').length;
  const lib = piano.camere.filter(c => c.stato === 'libera').length;

  return (
    <div className="floor-detail" role="dialog" aria-label={`Dettaglio ${piano.nome}`}>
      <button type="button" className="floor-detail__back" onClick={onClose}>
        <i className="fa-light fa-chevron-left" aria-hidden="true" /> Tutti i piani
      </button>

      <div className="floor-detail__title">{piano.nome}</div>
      <div className="floor-detail__sub">{piano.camere.length} camere · {occ} occ · {lib} lib</div>

      {onCreatePlan && (
        <button type="button" className="floor-detail__create-plan" onClick={onCreatePlan}>
          <i className="fa-solid fa-pen-ruler" aria-hidden="true" /> Crea planimetria del piano
        </button>
      )}

      <div className="floor-detail__grid">
        {piano.camere.map(cam => (
          <div key={cam.numero} className="floor-detail__room">
            <span className="floor-detail__room-bar" style={{ '--room-clr': CAM_CLR[cam.stato] } as React.CSSProperties} />
            <div className="floor-detail__room-body">
              <span className="floor-detail__room-num">Cam. {cam.numero}</span>
              <span className="floor-detail__room-type">{cam.tipo}</span>
              <span className="floor-detail__room-state" style={{ '--room-clr': CAM_CLR[cam.stato] } as React.CSSProperties}>
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
