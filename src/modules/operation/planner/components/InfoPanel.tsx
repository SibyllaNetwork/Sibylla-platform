// ─── InfoPanel ────────────────────────────────────────────────────────────────
import React from 'react';
import { Pren, PrenPendente } from '../planner.types';
import { STATO_CLR } from '../planner.styles';
import { fmtDate, parseDt } from '../planner.data';

interface Props {
  selected        : Pren | null;
  pendingDa       : PrenPendente[];
  pendingAl       : PrenPendente[];
  onOpenAssegnare : () => void;
  onOpenAllocare  : () => void;
}

const PendCard: React.FC<{
  title  : string;
  count  : number;
  items  : PrenPendente[];
  onOpen : () => void;
}> = ({ title, count, items, onOpen }) => (
  <div className="info-panel__card">
    <button className="info-panel__pend-header" onClick={onOpen}>
      <span>{title}</span>
      <svg viewBox="0 0 16 16" width={10} height={10} fill="currentColor">
        <path d="M8 5l5 5H3z" />
      </svg>
    </button>
    <div className="info-panel__pend-body">
      <div className="info-panel__pend-count">
        {title.includes('assegna') ? 'Da assegnare' : 'Da allocare'}:{' '}
        <b>{count}</b>
      </div>
      {items.map((p, i) => (
        <div key={i} className="info-panel__pend-row">
          <span className="info-panel__pend-num">{p.booking}</span>
          <div className="info-panel__pend-meta">
            <svg viewBox="0 0 16 16" width={12} height={12} fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.5 4h1v1h-1V5zm0 2h1v5h-1V7z" />
            </svg>
            {p.segmento}
            <svg viewBox="0 0 16 16" width={12} height={12} fill="currentColor">
              <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm1 2v8h8V4H4z" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const InfoPanel: React.FC<Props> = ({ selected, pendingDa, pendingAl, onOpenAssegnare, onOpenAllocare }) => {
  const clr  = selected ? STATO_CLR[selected.stato] : null;
  const rows = selected ? [
    ['Booking',   selected.booking],
    ['Camera',    selected.numeroCamera],
    ['Ospite',    selected.nominativo],
    ['Check-in',  fmtDate(parseDt(selected.checkIn))],
    ['Check-out', fmtDate(parseDt(selected.checkOut))],
    ...(selected.agenzia  ? [['Agenzia',  selected.agenzia]]  : []),
    ...(selected.segmento ? [['Segmento', selected.segmento]] : []),
  ] : [];

  return (
    <div className="info-panel">

      {/* Info prenotazione */}
      <div className="info-panel__card">
        <div className="info-panel__card-header">Info</div>
        <div className="info-panel__card-body">
          {!selected ? (
            <p className="info-panel__empty">
              Seleziona una prenotazione dal planner per ottenere le informazioni.
            </p>
          ) : (
            <>
              <div className="info-panel__status-badge">
                <div
                  className="info-panel__status-dot"
                  style={{ background: clr!.bg }}
                />
                <span className="info-panel__status-label">
                  {selected.stato.replace('_p', ' parziale')}
                </span>
              </div>
              <div className="info-panel__rows">
                {rows.map(([k, v]) => (
                  <div key={k} className="info-panel__row">
                    <span className="info-panel__row-key">{k}</span>
                    <span className="info-panel__row-val">{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <PendCard title="Prenotazioni da assegnare" count={pendingDa.length} items={pendingDa} onOpen={onOpenAssegnare} />
      <PendCard title="Prenotazioni da allocare"  count={pendingAl.length} items={pendingAl} onOpen={onOpenAllocare} />
    </div>
  );
};

export default InfoPanel;
