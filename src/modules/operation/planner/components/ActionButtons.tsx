// ─── ActionButtons ────────────────────────────────────────────────────────────
// Hover e tooltip gestiti interamente via CSS (nessuno useState)

import React from 'react';

interface Props {
  onLegenda : () => void;
  onNuova   : () => void;
  onIDS     : () => void;
}

const ACTIONS = [
  { key:'nuova',       label:'Nuova prenotazione',   d:'M8 2a1 1 0 011 1v4h4a1 1 0 010 2H9v4a1 1 0 01-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z' },
  { key:'analisi',     label:'Analisi booking',       d:'M1 12l3-4 3 2.5 3-5 4 6.5H1zm0 2h14v1H1z' },
  { key:'ospiti',      label:'Ospiti in casa',        d:'M7 8A3.5 3.5 0 107 1a3.5 3.5 0 000 7zm-5.5 6a5.5 5.5 0 0111 0H1.5zm10-7.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm3 7.5a4.5 4.5 0 00-4.3-4.5A4 4 0 0115.5 14H13z' },
  { key:'acquisto',    label:'Acquisto servizi',      d:'M5 4a3 3 0 016 0h2l1 10H2L3 4h2zm3-1.5A1.5 1.5 0 006.5 4h3A1.5 1.5 0 008 2.5z' },
  { key:'schedine',    label:'Schedine alloggiati',   d:'M6 0a2 2 0 00-2 2H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V3a1 1 0 00-1-1h-2a2 2 0 00-2-2H6zm0 2h4v1H6V2zM4 6h8v1H4V6zm0 3h8v1H4V9zm0 3h5v1H4v-1z' },
  { key:'rilevamento', label:'Rilevamento presenze',  d:'M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zm0 2a3 3 0 100 6 3 3 0 000-6zm0 2a1 1 0 110 2 1 1 0 010-2z' },
  { key:'ids',         label:'Prenotazioni IDS',      d:'M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5c.6 0 1.4.8 2 2.2.2.4.4.9.5 1.3H5.5c.2-.4.4-.9.5-1.3.6-1.4 1.4-2.2 2-2.2zm-2.2 3.5h4.4c.1.5.1 1 .1 1.5H5.7c0-.5.1-1 .1-1.5zM2.5 7.5h2.7c0 .5 0 1-.1 1.5H2.8a5.5 5.5 0 01-.3-1.5zm2.8 3H2.5a5.5 5.5 0 002 2.9c-.4-.9-.6-1.8-.7-2.9zm5.4 0h-2.7c-.1 1.1-.3 2-.7 2.9a5.5 5.5 0 002-2.9h1.4zM5.5 10.5h5c-.1.9-.3 1.7-.7 2.4-.5 1-1.2 1.6-1.8 1.6s-1.3-.6-1.8-1.6c-.4-.7-.6-1.5-.7-2.4z' },
  { key:'legenda',     label:'Legenda',               d:'M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM7 7h2v5H7V7z' },
];

const ActionButtons: React.FC<Props> = ({ onLegenda, onNuova, onIDS }) => {
  const handle = (key: string) => {
    if (key === 'legenda') onLegenda();
    else if (key === 'nuova') onNuova();
    else if (key === 'ids')   onIDS();
  };

  return (
    <div className="action-buttons">
      {ACTIONS.map(a => (
        <div key={a.key} className="action-buttons__item">
          <button className="sib-btn sib-btn--icon" onClick={() => handle(a.key)}>
            <svg viewBox="0 0 16 16" width={15} height={15} fill="currentColor">
              <path d={a.d} />
            </svg>
          </button>
          <div className="action-buttons__tooltip">{a.label}</div>
        </div>
      ))}
    </div>
  );
};

export default ActionButtons;
