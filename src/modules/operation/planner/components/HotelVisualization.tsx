// ─── HotelVisualization ───────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Piano } from '../planner.types';
import { usePlanimetrieStore, planimetriaEditorPage } from '../../../../store/usePlanimetrieStore';
import HotelWireframe from './HotelWireframe';
import PlanimetriaModal from './PlanimetriaModal';

interface Props {
  piani: Piano[];
  activePiani: number[];
  struttura: string;
  navigate?: (page: string) => void;
  onRoomClick?: (numero: string) => void;
}

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

  // Click su un piano: se ha una planimetria → viewer; altrimenti → editor (crea)
  const handleFloorClick = (p: Piano) => {
    if (getPlan(struttura, p.id)) setSelId(p.id);
    else openEditor(p.id);
  };

  return (
    <div className="hotel-viz">
      <div className="hotel-viz__scroll">

      <div className="hotel-viz__header">
        <div className="hotel-viz__title">Mappa struttura</div>
        <div className="hotel-viz__subtitle">Clicca un piano per la planimetria</div>
      </div>

      <HotelWireframe
        piani={visible}
        selectedId={selId}
        onFloorClick={handleFloorClick}
      />

      <div className="hotel-viz__hint">Clicca un piano per aprire o modificare la planimetria</div>

      </div>

      {selPiano && selPlan && (
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
    </div>
  );
};

export default HotelVisualization;
