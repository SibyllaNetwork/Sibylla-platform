// ─── PlanimetriaModal ─────────────────────────────────────────────────────────
// Viewer a schermo grande della planimetria di un piano: rende la mappa disegnata
// nell'editor con le camere colorate per stato di occupazione LIVE. Hover camera →
// tooltip; click camera → seleziona la prenotazione. Bottone "Modifica planimetria"
// → apre l'editor. Aperto dalla Mappa struttura (HotelVisualization).
import React, { useState } from 'react';
import Modal from '../../../../core/components/Modal';
import { Piano, StatoCam, Camera } from '../planner.types';
import { CAM_CLR } from '../planner.styles';
import { ELEMENTO_META, ElementoKind, Planimetria } from '../../../../store/usePlanimetrieStore';
import { useCameraStatiStore } from '../../../../store/useCameraStatiStore';
import RoomContextMenu, { RoomAction } from './RoomContextMenu';

interface Props {
  open: boolean;
  onClose: () => void;
  struttura: string;
  piano: Piano;
  plan: Planimetria;
  onEdit: () => void;
  onRoomClick?: (numero: string) => void;
  /** Azioni che richiedono un flusso del Planner (Assegna / Richiesta operativa). */
  onRoomAction?: (action: RoomAction, numero: string) => void;
}

const STATO_LABEL: Record<StatoCam, string> = {
  libera: 'Libera', occupata: 'Occupata', prenotata: 'Prenotata',
  manutenzione: 'Manutenzione', pulizia: 'Pulizia', checkout: 'Check-out',
};

const CELL = 46;

const PlanimetriaModal: React.FC<Props> = ({ open, onClose, struttura, piano, plan, onEdit, onRoomClick, onRoomAction }) => {
  const [tip, setTip] = useState<{ cam: Camera; x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<{ numero: string; x: number; y: number } | null>(null);

  const overrides = useCameraStatiStore(s => s.overrides);
  const setStato = useCameraStatiStore(s => s.setStato);
  const clearStato = useCameraStatiStore(s => s.clearStato);

  const camOf = (numero?: string) => piano.camere.find(c => c.numero === numero) ?? null;
  // stato effettivo = override (da menu contestuale) sopra lo stato base del piano
  const statoOf = (numero?: string): StatoCam =>
    (numero ? overrides[`${struttura}::${piano.id}::${numero}`] : undefined)
      ?? camOf(numero)?.stato ?? 'libera';

  const runAction = (action: RoomAction, numero: string) => {
    setMenu(null);
    if (action === 'manutenzione') { setStato(struttura, piano.id, numero, 'manutenzione'); return; }
    if (action === 'opziona')      { setStato(struttura, piano.id, numero, 'prenotata'); return; }
    if (action === 'ripristina')   { clearStato(struttura, piano.id, numero); return; }
    // Assegna / Richiesta operativa: gestiti dal Planner → chiudo il viewer e delego
    onClose();
    onRoomAction?.(action, numero);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Planimetria · ${piano.nome}`} size="xl" className="plan-viewer">
      <div className="plan-viewer__body">
        <div className="plan-viewer__topbar">
          <div className="plan-viewer__hotel">
            <i className="fa-light fa-hotel" aria-hidden="true" /> {struttura}
            <span className="plan-viewer__count">· {piano.camere.length} camere</span>
          </div>
          <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={onEdit}>
            <i className="fa-solid fa-pen-ruler" aria-hidden="true" /> Modifica planimetria
          </button>
        </div>

        <div className="plan-viewer__stage">
          <div
            className="plan-viewer__canvas"
            style={{ '--cols': plan.cols, '--rows': plan.rows, '--cell': `${CELL}px` } as React.CSSProperties}
          >
            {plan.items.map(it => {
              if (it.kind === 'camera') {
                const cam = camOf(it.numero);
                const stato = statoOf(it.numero);
                const style = {
                  '--x': it.x, '--y': it.y, '--w': it.w, '--h': it.h, '--room-clr': CAM_CLR[stato],
                } as React.CSSProperties;
                return (
                  <button
                    key={it.id}
                    type="button"
                    className="plan-viewer__room"
                    style={style}
                    onMouseEnter={e => cam && setTip({ cam, x: e.clientX, y: e.clientY })}
                    onMouseMove={e => cam && setTip({ cam, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTip(null)}
                    onClick={() => it.numero && onRoomClick?.(it.numero)}
                    onContextMenu={e => { if (it.numero) { e.preventDefault(); e.stopPropagation(); setTip(null); setMenu({ numero: it.numero, x: e.clientX, y: e.clientY }); } }}
                  >
                    <span className="plan-viewer__room-num">{it.numero}</span>
                    <span className="plan-viewer__room-type">{it.tipologia ?? cam?.tipo}</span>
                  </button>
                );
              }
              const style = { '--x': it.x, '--y': it.y, '--w': it.w, '--h': it.h } as React.CSSProperties;
              return (
                <div key={it.id} className={`plan-viewer__el plan-viewer__el--${it.kind}`} style={style}>
                  <i className={`fa-solid ${ELEMENTO_META[it.kind as Exclude<ElementoKind,'camera'>].icon}`} />
                  <span>{it.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="plan-viewer__legend">
          {(['libera','occupata','prenotata','manutenzione','pulizia','checkout'] as StatoCam[]).map(st => (
            <div key={st} className="plan-viewer__legend-item">
              <span className="plan-viewer__legend-dot" style={{ '--dot': CAM_CLR[st] } as React.CSSProperties} />
              {STATO_LABEL[st]}
            </div>
          ))}
        </div>
      </div>

      {tip && (
        <div className="plan-viewer__tip" style={{ '--tip-left': `${tip.x + 14}px`, '--tip-top': `${tip.y + 14}px` } as React.CSSProperties}>
          <span className="plan-viewer__tip-num">Cam. {tip.cam.numero}</span>
          <span className="plan-viewer__tip-type">{tip.cam.tipo}</span>
          <span className="plan-viewer__tip-state">
            <span className="plan-viewer__legend-dot" style={{ '--dot': CAM_CLR[statoOf(tip.cam.numero)] } as React.CSSProperties} />
            {STATO_LABEL[statoOf(tip.cam.numero)]}
          </span>
        </div>
      )}

      {menu && (
        <RoomContextMenu
          numero={menu.numero}
          x={menu.x}
          y={menu.y}
          hasOverride={!!overrides[`${struttura}::${piano.id}::${menu.numero}`]}
          onAction={a => runAction(a, menu.numero)}
          onClose={() => setMenu(null)}
        />
      )}
    </Modal>
  );
};

export default PlanimetriaModal;
