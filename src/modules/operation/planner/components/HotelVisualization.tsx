// ─── HotelVisualization ───────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Piano, StatoCam, Camera } from '../planner.types';
import { CAM_CLR } from '../planner.styles';
import { usePlanimetrieStore, planimetriaEditorPage } from '../../../../store/usePlanimetrieStore';
import HotelWireframe from './HotelWireframe';
import FloorDetail from './FloorDetail';
import PlanimetriaModal from './PlanimetriaModal';

interface Props {
  piani: Piano[];
  activePiani: number[];
  struttura: string;
  navigate?: (page: string) => void;
  onRoomClick?: (numero: string) => void;
}

const STATO_LABEL: Record<StatoCam, string> = {
  libera: 'Libera',
  occupata: 'Occupata',
  prenotata: 'Prenotata',
  manutenzione: 'Manutenzione',
  pulizia: 'Pulizia',
  checkout: 'Check-out',
};

const HotelVisualization: React.FC<Props> = ({ piani, activePiani, struttura, navigate = () => {}, onRoomClick }) => {
  // Il piano terra (id 0) è la lobby ornamentale: sempre visibile, non filtrabile
  const visible = activePiani.length > 0
    ? piani.filter(p => p.id === 0 || activePiani.includes(p.id))
    : piani;

  const [selId, setSelId] = useState<number | null>(null);
  const selPiano = visible.find(p => p.id === selId) ?? null;

  const getPlan = usePlanimetrieStore(s => s.getPlan);
  const selPlan = selPiano ? getPlan(struttura, selPiano.id) : undefined;
  const openEditor = (pianoId: number) => navigate(planimetriaEditorPage(struttura, pianoId));

  const [tip, setTip] = useState<{ cam: Camera; x: number; y: number } | null>(null);

  return (
    <div className="hotel-viz">
      <div className="hotel-viz__scroll">

      <div className="hotel-viz__header">
        <div className="hotel-viz__title">Mappa struttura</div>
        <div className="hotel-viz__subtitle">Stato occupazione live</div>
      </div>

      <HotelWireframe
        piani={visible}
        selectedId={selId}
        onFloorClick={(p) => setSelId(p.id)}
        onRoomHover={(cam, x, y) => setTip(cam ? { cam, x, y } : null)}
      />

      <div className="hotel-viz__hint">Tocca un piano per i dettagli</div>

      <div className="hotel-viz__legend">
        {(['libera','occupata','prenotata','manutenzione','pulizia','checkout'] as StatoCam[]).map(st => (
          <div key={st} className="hotel-viz__legend-item">
            <div
              className="hotel-viz__legend-dot"
              style={{ '--dot-bg': CAM_CLR[st] } as React.CSSProperties}
            />
            <span className="hotel-viz__legend-label">{st}</span>
          </div>
        ))}
      </div>

      </div>

      {selPiano && selPiano.id !== 0 && selPlan && (
        <PlanimetriaModal
          open
          onClose={() => setSelId(null)}
          struttura={struttura}
          piano={selPiano}
          plan={selPlan}
          onEdit={() => { const id = selPiano.id; setSelId(null); openEditor(id); }}
          onRoomClick={(numero) => { setSelId(null); onRoomClick?.(numero); }}
        />
      )}

      {selPiano && !(selPiano.id !== 0 && selPlan) && (
        <FloorDetail
          piano={selPiano}
          onClose={() => setSelId(null)}
          onCreatePlan={selPiano.id !== 0 ? () => { const id = selPiano.id; setSelId(null); openEditor(id); } : undefined}
        />
      )}

      {tip && (
        <div className="hotel-viz__tip" style={{ '--tip-left': `${tip.x + 14}px`, '--tip-top': `${tip.y + 14}px` } as React.CSSProperties}>
          <span className="hotel-viz__tip-num">Cam. {tip.cam.numero}</span>
          <span className="hotel-viz__tip-dot" style={{ '--dot-bg': CAM_CLR[tip.cam.stato] } as React.CSSProperties} />
          <span className="hotel-viz__tip-state">{STATO_LABEL[tip.cam.stato]}</span>
        </div>
      )}
    </div>
  );
};

export default HotelVisualization;
