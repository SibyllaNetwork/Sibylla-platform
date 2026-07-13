// ─── PrenContextMenu ───────────────────────────────────────────────────────────
// Menu contestuale (tasto destro) su una prenotazione della timeline.
// Riusa i modali già esistenti del planner per le azioni Sposta / Date / Visualizza
// / Annulla; le altre azioni sono dirette.

import React, { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Pren } from '../planner.types';
import { bookingStore } from '../../../../core/bookingStore';
import DettaglioCamereModal from './DettaglioCamereModal';
import GestisciDateModal from './GestisciDateModal';
import SpostaPrenModal from './SpostaPrenModal';
import Modal from '../../../../core/components/Modal';
import './PrenContextMenu.sass';

interface Props {
  pren       : Pren;
  x          : number;
  y          : number;
  struttura  : string;
  navigate?  : (page: string) => void;
  onParcheggio: (id: string) => void;
  onClona    : (id: string) => void;
  onCheckIn  : (id: string) => void;
  onClose    : () => void;
}

type View = 'menu' | 'sposta' | 'date' | 'dettaglio' | 'annulla';

const PrenContextMenu: React.FC<Props> = ({
  pren, x, y, struttura, navigate, onParcheggio, onClona, onCheckIn, onClose,
}) => {
  const [view, setView] = useState<View>('menu');
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Riposiziona il popup per non uscire dal viewport.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - width - 8);
    const top = Math.min(y, window.innerHeight - height - 8);
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [x, y]);

  // Chiusura su click esterno / Escape (solo quando è visibile il menu).
  useEffect(() => {
    if (view !== 'menu') return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('contextmenu', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('contextmenu', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [view, onClose]);

  const items = [
    { key: 'parcheggio', icon: 'fa-circle-parking',    label: 'Sposta in Parcheggio', run: () => { onParcheggio(pren.id); onClose(); } },
    { key: 'sposta',     icon: 'fa-up-down-left-right', label: 'Sposta',              run: () => setView('sposta') },
    { key: 'date',       icon: 'fa-calendar',           label: 'Date',                run: () => setView('date') },
    { key: 'clona',      icon: 'fa-clone',              label: 'Clona',               run: () => { onClona(pren.id); onClose(); } },
    { key: 'modifica',   icon: 'fa-pen',                label: 'Modifica',            run: () => { if (navigate) { bookingStore.editing = pren; navigate('nuova-prenotazione'); } onClose(); } },
    { key: 'visualizza', icon: 'fa-eye',                label: 'Visualizza',          run: () => setView('dettaglio') },
    { key: 'checkin',    icon: 'fa-right-to-bracket',   label: 'Check-in',            run: () => { onCheckIn(pren.id); onClose(); } },
  ];

  return (
    <>
      {view === 'menu' && (
        <div
          ref={ref}
          className="pren-ctx"
          style={{ '--ctx-left': `${pos.left}px`, '--ctx-top': `${pos.top}px` } as React.CSSProperties}
        >
          {items.map(it => (
            <button key={it.key} type="button" className="pren-ctx__item" onClick={it.run}>
              <i className={`fa-light ${it.icon}`} aria-hidden="true" />
              <span>{it.label}</span>
            </button>
          ))}
          <div className="pren-ctx__divider" />
          <button type="button" className="pren-ctx__item pren-ctx__item--danger" onClick={() => setView('annulla')}>
            <i className="fa-light fa-trash" aria-hidden="true" />
            <span>Annulla prenotazione</span>
          </button>
        </div>
      )}

      {/* ── Modali collegati alle azioni ── */}
      <SpostaPrenModal    open={view === 'sposta'} pren={pren} onClose={onClose} onConfirm={() => {}} />
      <GestisciDateModal  open={view === 'date'}   pren={pren} onClose={onClose} onConfirm={() => {}} />
      <DettaglioCamereModal open={view === 'dettaglio'} pren={pren} struttura={struttura} onClose={onClose} />
      {view === 'annulla' && (
        <Modal open onClose={onClose} title={`Annulla prenotazione N.${pren.booking}`} size="sm">
          <div className="annulla-pren">
            <p>Vuoi davvero annullare questa prenotazione? L'operazione non è reversibile.</p>
            <div className="annulla-pren__actions">
              <button className="sib-btn sib-btn--secondary" onClick={onClose}>Indietro</button>
              <button className="sib-btn sib-btn--danger" onClick={onClose}>Annulla prenotazione</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default PrenContextMenu;
