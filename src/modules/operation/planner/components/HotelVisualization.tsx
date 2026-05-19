// ─── HotelVisualization ───────────────────────────────────────────────────────
import React from 'react';
import { Piano, StatoCam } from '../planner.types';
import { CAM_CLR } from '../planner.styles';

interface Props {
  piani: Piano[];
  activePiani: number[];
}

const HotelVisualization: React.FC<Props> = ({ piani, activePiani }) => {
  const visible = activePiani.length > 0
    ? piani.filter(p => activePiani.includes(p.id))
    : piani;

  return (
    <div className="hotel-viz">

      <div className="hotel-viz__header">
        <div className="hotel-viz__title">Mappa struttura</div>
        <div className="hotel-viz__subtitle">Stato occupazione live</div>
      </div>

      {[...visible].reverse().map(piano => {
        const occ = piano.camere.filter(c => c.stato === 'occupata').length;
        const lib = piano.camere.filter(c => c.stato === 'libera').length;
        return (
          <div key={piano.id} className="hotel-viz__floor">
            <div className="hotel-viz__floor-header">
              <span className="hotel-viz__floor-name">
                {piano.nome.replace('Piano ', 'P.')}
              </span>
              <span className="hotel-viz__floor-count">
                {occ}/{piano.camere.length}
              </span>
            </div>

            <div className="hotel-viz__rooms">
              {piano.camere.map(cam => (
                <div
                  key={cam.numero}
                  className={`hotel-viz__room${cam.stato === 'occupata' ? ' hotel-viz__room--occupata' : ''}`}
                  title={`Cam. ${cam.numero} — ${cam.tipo}\nStato: ${cam.stato}`}
                  style={{ background: CAM_CLR[cam.stato] }}
                />
              ))}
            </div>

            <div className="hotel-viz__floor-stats">
              {occ} occ · {lib} lib · {piano.camere.length - occ - lib} altri
            </div>
          </div>
        );
      })}

      <div className="hotel-viz__legend">
        {(['libera','occupata','prenotata','manutenzione','pulizia','checkout'] as StatoCam[]).map(st => (
          <div key={st} className="hotel-viz__legend-item">
            <div
              className="hotel-viz__legend-dot"
              style={{ background: CAM_CLR[st] }}
            />
            <span className="hotel-viz__legend-label">{st}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HotelVisualization;
