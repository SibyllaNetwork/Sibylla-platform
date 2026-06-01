// ─── Parcheggio ───────────────────────────────────────────────────────────────
// Area "sospensione" prenotazioni: stesso calendario del planner. Le prenotazioni
// trascinate qui restano in attesa di essere riposizionate in un nuovo spazio.
import React, { useMemo } from 'react';
import { Pren } from '../planner.types';
import { STATO_CLR, DAY_W } from '../planner.styles';
import { parseDt, addDays, diffDays, MO } from '../planner.data';

interface Props {
  parked     : Pren[];
  startDate  : Date;
  numDays    : number;
  onClose    : () => void;
  onParkDrop : (id: string) => void;
  onSelect   : (p: Pren | null) => void;
  selectedId : string | null;
  onBarHover? : (pren: Pren | null, clientX: number, clientY: number) => void;
}

const Parcheggio: React.FC<Props> = ({ parked, startDate, numDays, onClose, onParkDrop, onSelect, selectedId, onBarHover }) => {
  const days = useMemo(
    () => Array.from({ length: numDays }, (_, i) => addDays(startDate, i)),
    [startDate, numDays]
  );
  const isWE = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  const barProps = (pren: Pren) => {
    const ci = parseDt(pren.checkIn);
    const co = parseDt(pren.checkOut);
    const endV = addDays(startDate, numDays);
    if (co <= startDate || ci >= endV) return null;
    const ld = Math.max(0, diffDays(startDate, ci));
    const rd = Math.min(numDays, diffDays(startDate, co));
    const sL = ci >= startDate;
    const sR = co <= endV;
    const clr = STATO_CLR[pren.stato];
    const clip = sL && sR
      ? 'polygon(10px 0%,calc(100% - 12px) 0%,100% 50%,calc(100% - 12px) 100%,10px 100%,0% 50%)'
      : sL
        ? 'polygon(10px 0%,100% 0%,100% 100%,10px 100%,0% 50%)'
        : sR
          ? 'polygon(0% 0%,calc(100% - 12px) 0%,100% 50%,calc(100% - 12px) 100%,0% 100%)'
          : 'none';
    return {
      '--bar-left':     `${ld * DAY_W}px`,
      '--bar-width':    `${Math.max(20, (rd - ld) * DAY_W - 2)}px`,
      '--bar-bg':       clr.bg,
      '--bar-color':    clr.text,
      '--bar-clip':     clip,
      '--bar-pad-left': sL ? '16px' : '10px',
    } as React.CSSProperties;
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) onParkDrop(id);
  };

  return (
    <div className="parcheggio" onDragOver={allowDrop} onDrop={handleDrop}>
      <div className="parcheggio__head">
        <span className="parcheggio__title">
          <span className="parcheggio__title-ico">P</span> Parcheggio
        </span>
        <button type="button" className="parcheggio__close" onClick={onClose} aria-label="Chiudi parcheggio">×</button>
      </div>

      <div className="parcheggio__grid">
        {/* Header date */}
        <div className="timeline__header">
          <div className="timeline__room-col-header" />
          {days.map((d, i) => (
            <div key={i} className={`timeline__day-header${isWE(d) ? ' timeline__day-header--weekend' : ''}`}>
              <div className="timeline__day-num">{d.getDate()}</div>
              <div className="timeline__day-month">{MO[d.getMonth()]}</div>
            </div>
          ))}
        </div>

        {parked.length === 0 ? (
          <div className="parcheggio__empty">Trascina qui una prenotazione per sospenderla</div>
        ) : (
          parked.map((pren, ri) => {
            const bp = barProps(pren);
            return (
              <div key={pren.id} className={`timeline__row${ri % 2 !== 0 ? ' timeline__row--odd' : ''}`}>
                <div className="timeline__room-label">
                  <div className="parcheggio__ref">#{pren.booking}</div>
                </div>
                <div className="timeline__day-grid" style={{ '--grid-min-w': `${DAY_W * numDays}px` } as React.CSSProperties}>
                  {days.map((d, di) => (
                    <div
                      key={di}
                      className={`timeline__cell timeline__cell--free${isWE(d) ? ' timeline__cell--weekend' : ''}`}
                      style={{ '--cell-left': `${di * DAY_W}px` } as React.CSSProperties}
                    />
                  ))}
                  {bp && (
                    <div
                      className={`timeline__bar${selectedId === pren.id ? ' timeline__bar--selected' : ''}`}
                      style={bp}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', pren.id); e.dataTransfer.effectAllowed = 'move'; onBarHover?.(null, 0, 0); }}
                      onMouseEnter={onBarHover ? (e) => onBarHover(pren, e.clientX, e.clientY) : undefined}
                      onMouseMove={onBarHover ? (e) => onBarHover(pren, e.clientX, e.clientY) : undefined}
                      onMouseLeave={onBarHover ? () => onBarHover(null, 0, 0) : undefined}
                      onClick={(e) => { e.stopPropagation(); onSelect(pren.id === selectedId ? null : pren); }}
                    >
                      {pren.stato === 'opzione' && <span className="timeline__bar__question">?</span>}
                      <span className="timeline__bar__name">{pren.nominativo}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Parcheggio;
