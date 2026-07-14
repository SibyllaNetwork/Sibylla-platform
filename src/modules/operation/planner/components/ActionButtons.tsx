// ─── ActionButtons ────────────────────────────────────────────────────────────
// Toolbar definitiva del planner. Hover/tooltip via CSS (tooltip nera, testo bianco).

import React from 'react';

interface Props {
  onGhost        : () => void;
  ghostActive?   : boolean;
  onParcheggio   : () => void;
  parcheggioActive: boolean;
  parkedCount    : number;
  onNuova        : () => void;
  onArrivi       : () => void;
  onOspiti       : () => void;
  onSchedine     : () => void;
  onRilevamento  : () => void;
  onRichieste    : () => void;
  richiesteCount : number;
  onLegenda      : () => void;
}

const ActionButtons: React.FC<Props> = (p) => {
  const items = [
    { key: 'ghost',       label: 'Blocco fantasma',      icon: 'fa-ghost',             onClick: p.onGhost, active: p.ghostActive },
    { key: 'parcheggio',  label: 'Parcheggio',           icon: 'fa-square-parking',    onClick: p.onParcheggio, active: p.parcheggioActive, badge: p.parkedCount },
    { key: 'nuova',       label: 'Nuova prenotazione',   icon: 'fa-plus',              onClick: p.onNuova },
    { key: 'arrivi',      label: 'Arrivi & partenze',    icon: 'fa-suitcase-rolling',  onClick: p.onArrivi },
    { key: 'ospiti',      label: 'Ospiti in casa',       icon: 'fa-house-user',        onClick: p.onOspiti },
    { key: 'schedine',    label: 'Schedine alloggiati',  icon: 'fa-id-card',           onClick: p.onSchedine },
    { key: 'rilevamento', label: 'Rilevamento presenze', icon: 'fa-bullseye',          onClick: p.onRilevamento },
    { key: 'richieste',   label: 'Richieste operative',  icon: 'fa-bell-concierge',    onClick: p.onRichieste, badge: p.richiesteCount },
    { key: 'legenda',     label: 'Legenda',              icon: 'fa-circle-info',       onClick: p.onLegenda },
  ];

  return (
    <div className="action-buttons">
      {items.map(a => (
        <div key={a.key} className="action-buttons__item">
          <button
            type="button"
            className={`sib-btn sib-btn--icon${a.key === 'parcheggio' ? ` planner__park-btn${a.active ? ' planner__park-btn--active' : ''}` : ''}${a.key === 'ghost' && a.active ? ' action-buttons__btn--ghost-active' : ''}`}
            onClick={a.onClick}
            aria-pressed={a.key === 'ghost' ? !!a.active : undefined}
            aria-label={a.label}
          >
            <i className={`fa-regular ${a.icon}`} aria-hidden="true" />
            {(a.key === 'parcheggio' || a.key === 'richieste') && !!a.badge && (
              <span className="planner__park-badge">{a.badge}</span>
            )}
          </button>
          <div className="action-buttons__tooltip">{a.label}</div>
        </div>
      ))}
    </div>
  );
};

export default ActionButtons;
