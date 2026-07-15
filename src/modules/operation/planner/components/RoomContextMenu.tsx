// ─── RoomContextMenu ──────────────────────────────────────────────────────────
// Menu contestuale (tasto destro) su una camera nella planimetria. Azioni:
// Assegnare · Sposta in manutenzione · Opziona · Crea richiesta operativa.
// Riusa lo stile del menu contestuale prenotazione (.pren-ctx).
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './PrenContextMenu.sass';

export type RoomAction = 'assegna' | 'manutenzione' | 'opziona' | 'richiesta' | 'ripristina';

interface Props {
  numero: string;
  x: number;
  y: number;
  /** true se la camera ha uno stato "override" attivo (mostra "Ripristina"). */
  hasOverride: boolean;
  onAction: (action: RoomAction) => void;
  onClose: () => void;
}

const ITEMS: { key: RoomAction; icon: string; label: string; danger?: boolean }[] = [
  { key: 'assegna',      icon: 'fa-user-check',       label: 'Assegna' },
  { key: 'opziona',      icon: 'fa-hourglass-half',   label: 'Opziona' },
  { key: 'manutenzione', icon: 'fa-screwdriver-wrench', label: 'Sposta in manutenzione' },
  { key: 'richiesta',    icon: 'fa-bell-concierge',   label: 'Crea richiesta operativa' },
];

const RoomContextMenu: React.FC<Props> = ({ numero, x, y, hasOverride, onAction, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - width - 8);
    const top = Math.min(y, window.innerHeight - height - 8);
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [x, y]);

  useEffect(() => {
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
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="pren-ctx"
      style={{ '--ctx-left': `${pos.left}px`, '--ctx-top': `${pos.top}px` } as React.CSSProperties}
    >
      <div className="pren-ctx__head">Camera {numero}</div>
      {ITEMS.map(it => (
        <button key={it.key} type="button" className="pren-ctx__item" onClick={() => onAction(it.key)}>
          <i className={`fa-light ${it.icon}`} aria-hidden="true" />
          <span>{it.label}</span>
        </button>
      ))}
      {hasOverride && (
        <>
          <div className="pren-ctx__divider" />
          <button type="button" className="pren-ctx__item" onClick={() => onAction('ripristina')}>
            <i className="fa-light fa-rotate-left" aria-hidden="true" />
            <span>Ripristina stato</span>
          </button>
        </>
      )}
    </div>
  );
};

export default RoomContextMenu;
