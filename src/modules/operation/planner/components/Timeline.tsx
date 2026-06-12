// ─── Timeline ─────────────────────────────────────────────────────────────────
// Struttura e layout via className SCSS.
// Solo left/width/color delle barre e posizioni calcolate restano inline.

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { Piano, Pren, Camera } from '../planner.types';
import { CAM_CLR, DAY_W, ROOM_W } from '../planner.styles';
import { parseDt, addDays, diffDays, MO } from '../planner.data';
import { barLayout, demoColorFor } from '../planner.layout';

interface Props {
  piani        : Piano[];
  prenotazioni : Pren[];
  startDate    : Date;
  numDays      : number;
  filtroConf   : boolean;
  filtroOpz    : boolean;
  activePiani  : number[];
  onSelect     : (p: Pren | null) => void;
  selectedId   : string | null;
  onEmpty      : (cam: Camera, date: Date) => void;
  onAssign?    : (id: string, numeroCamera: string) => void;
  onMove?      : (id: string, numeroCamera: string, deltaDays: number) => void;
  showRiepilogo?    : boolean;
  onToggleRiepilogo?: () => void;
  onBarHover?  : (pren: Pren | null, clientX: number, clientY: number) => void;
}

const Timeline: React.FC<Props> = ({
  piani, prenotazioni, startDate, numDays,
  filtroConf, filtroOpz, activePiani,
  onSelect, selectedId, onEmpty, onAssign, onMove,
  showRiepilogo, onToggleRiepilogo, onBarHover,
}) => {
  const dragEnabled = !!(onMove || onAssign);

  // Scroll orizzontale della fascia giorni con pulsanti laterali
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nav, setNav] = useState({ prev: false, next: false });
  const updateNav = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setNav({
      prev: el.scrollLeft > 4,
      next: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    });
  }, []);
  useEffect(() => { updateNav(); }, [numDays, updateNav]);
  const scrollDays = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(DAY_W * 5, el.clientWidth - ROOM_W - 60), behavior: 'smooth' });
  };

  const days = useMemo(
    () => Array.from({ length: numDays }, (_, i) => addDays(startDate, i)),
    [startDate, numDays]
  );
  const today = useMemo(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0); return t;
  }, []);
  const visible = activePiani.length > 0
    ? piani.filter(p => activePiani.includes(p.id))
    : piani;

  const filtered = useMemo(() => prenotazioni.filter(p => {
    if (p.stato === 'confermata' && !filtroConf) return false;
    if (p.stato === 'opzione'    && !filtroOpz)  return false;
    return true;
  }), [prenotazioni, filtroConf, filtroOpz]);

  // Layout barra condiviso col Parcheggio (forma/posizione/colore identici)
  const getBarProps = useCallback(
    (pren: Pren) => barLayout(pren, prenotazioni, startDate, numDays, demoColorFor(pren.id)),
    [startDate, numDays, prenotazioni]
  );

  const isToday  = (d: Date) => d.getTime() === today.getTime();
  const isWE     = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
  const todayOff = diffDays(startDate, today);

  // ── Riepilogo per giorno (footer collassabile) ───────────────────────────────
  const allCamere = useMemo(() => visible.flatMap(p => p.camere), [visible]);
  const totalCamere = allCamere.length;
  const manutCount = useMemo(() => allCamere.filter(c => c.stato === 'manutenzione').length, [allCamere]);
  const summary = useMemo(() => days.map(d => {
    const occ = prenotazioni.filter(p => {
      const ci = parseDt(p.checkIn); const co = parseDt(p.checkOut);
      return d >= ci && d < co;
    });
    const opz = occ.filter(p => p.stato === 'opzione').length;
    const impegni = occ.length + manutCount;
    return { residua: totalCamere - impegni, impegni, opz };
  }), [days, prenotazioni, manutCount, totalCamere]);

  const summaryRows = [
    { key: 'residua' as const, label: `Disponibilità Residua (${totalCamere} Camere)` },
    { key: 'impegni' as const, label: 'Totale Impegni (Conf.+Opz.+Manutenzione)' },
    { key: 'opz' as const,     label: 'Opzionale' },
  ];

  return (
    <div className="timeline-wrap">
      {nav.prev && (
        <button type="button" className="timeline-wrap__nav timeline-wrap__nav--prev" onClick={() => scrollDays(-1)} aria-label="Giorni precedenti">
          <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {nav.next && (
        <button type="button" className="timeline-wrap__nav timeline-wrap__nav--next" onClick={() => scrollDays(1)} aria-label="Giorni successivi">
          <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    <div className="timeline" ref={scrollRef} onScroll={updateNav} style={{ '--tl-content-w': `${ROOM_W + numDays * DAY_W}px` } as React.CSSProperties}>

      {/* ── Header date ─────────────────────────────────────────────────────── */}
      <div className="timeline__header">
        <div className="timeline__room-col-header">Room n°</div>
        {days.map((d, i) => (
          <div
            key={i}
            className={[
              'timeline__day-header',
              isToday(d) ? 'timeline__day-header--today'   : '',
              isWE(d)    ? 'timeline__day-header--weekend' : '',
            ].join(' ')}
          >
            <div className={`timeline__day-num${isToday(d) ? ' timeline__day-num--today' : ''}`}>
              {d.getDate()}
            </div>
            <div className={`timeline__day-month${isToday(d) ? ' timeline__day-month--today' : ''}`}>
              {MO[d.getMonth()]}
            </div>
          </div>
        ))}
      </div>

      {/* Linea oggi */}
      {todayOff >= 0 && todayOff < numDays && (
        <div
          className="timeline__today-line"
          style={{ '--today-left': `${ROOM_W + todayOff * DAY_W + DAY_W / 2}px` } as React.CSSProperties}
        />
      )}

      {/* ── Piani ───────────────────────────────────────────────────────────── */}
      {visible.map(piano => (
        <div key={piano.id}>
          <div className="timeline__floor-header"><span className="timeline__floor-name">{piano.nome}</span></div>

          {piano.camere.map((cam, ri) => {
            const camPrens = filtered.filter(p => p.numeroCamera === cam.numero);
            return (
              <div
                key={cam.numero}
                className={`timeline__row${ri % 2 !== 0 ? ' timeline__row--odd' : ''}`}
              >
                {/* Label camera */}
                <div className="timeline__room-label">
                  <div className="timeline__room-num-wrap">
                    <div
                      className="timeline__room-dot"
                      style={{ '--dot-bg': CAM_CLR[cam.stato] } as React.CSSProperties}
                    />
                    <span className="timeline__room-number">{cam.numero}</span>
                  </div>
                  <div className="timeline__room-type">{cam.tipo}</div>
                </div>

                {/* Griglia giorni */}
                <div
                  className="timeline__day-grid"
                  style={{ '--grid-min-w': `${DAY_W * numDays}px` } as React.CSSProperties}
                  onDragOver={dragEnabled ? (e) => e.preventDefault() : undefined}
                  onDrop={dragEnabled ? (e) => {
                    e.preventDefault();
                    const data = e.dataTransfer.getData('text/plain');
                    if (!data) return;
                    const [id, sx] = data.split('|');
                    const deltaDays = sx ? Math.round((e.clientX - Number(sx)) / DAY_W) : 0;
                    if (onMove) onMove(id, cam.numero, deltaDays);
                    else onAssign?.(id, cam.numero);
                  } : undefined}
                >
                  {/* Celle di sfondo */}
                  {days.map((d, di) => {
                    const occupied = camPrens.some(p => {
                      const ci = parseDt(p.checkIn);
                      const co = parseDt(p.checkOut);
                      return d >= ci && d < co;
                    });
                    return (
                      <div
                        key={di}
                        className={[
                          'timeline__cell',
                          isToday(d) ? 'timeline__cell--today'    : '',
                          isWE(d)    ? 'timeline__cell--weekend'  : '',
                          occupied   ? 'timeline__cell--occupied' : 'timeline__cell--free',
                        ].join(' ')}
                        style={{ '--cell-left': `${di * DAY_W}px` } as React.CSSProperties}
                        onClick={() => { if (!occupied) onEmpty(cam, d); }}
                      />
                    );
                  })}

                  {/* Icone stato camera */}
                  {cam.stato === 'manutenzione' && days.map((_, di) => (
                    <div key={`mx${di}`} className="timeline__status-icon" style={{ '--icon-left': `${di * DAY_W}px` } as React.CSSProperties}>
                      🔧
                    </div>
                  ))}
                  {cam.stato === 'pulizia' && days.map((_, di) => (
                    <div key={`px${di}`} className="timeline__status-icon" style={{ '--icon-left': `${di * DAY_W}px` } as React.CSSProperties}>
                      ✦
                    </div>
                  ))}

                  {/* Barre prenotazione */}
                  {camPrens.map(pren => {
                    const bp = getBarProps(pren);
                    if (!bp) return null;
                    const selected = selectedId === pren.id;
                    return (
                      <React.Fragment key={pren.id}>
                        <div
                          className={`timeline__bar ${bp.shapeClass}${selected ? ' timeline__bar--selected' : ''}`}
                          style={bp.style}
                          draggable={dragEnabled}
                          onDragStart={dragEnabled ? (e) => { e.dataTransfer.setData('text/plain', `${pren.id}|${e.clientX}`); e.dataTransfer.effectAllowed = 'move'; onBarHover?.(null, 0, 0); } : undefined}
                          onMouseEnter={onBarHover ? (e) => onBarHover(pren, e.clientX, e.clientY) : undefined}
                          onMouseMove={onBarHover ? (e) => onBarHover(pren, e.clientX, e.clientY) : undefined}
                          onMouseLeave={onBarHover ? () => onBarHover(null, 0, 0) : undefined}
                          onClick={e => { e.stopPropagation(); onSelect(pren.id === selectedId ? null : pren); }}
                        >
                          {pren.stato === 'opzione' && (
                            <span className="timeline__bar__question">?</span>
                          )}
                          <span className="timeline__bar__name">{pren.nominativo}</span>
                        </div>
                        {bp.showChevrons && (
                          <div
                            className="timeline__bar-chevrons"
                            style={{ '--chev-left': `${bp.chevronLeft}px`, '--bar-bg': demoColorFor(pren.id) } as React.CSSProperties}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* ── Riepilogo (footer sticky collassabile) ──────────────────────────── */}
      {onToggleRiepilogo && (
        <div className="timeline__summary">
          <div className={`timeline__summary-panel${showRiepilogo ? ' is-open' : ''}`}>
            {summaryRows.map(row => (
              <div key={row.key} className="timeline__summary-row">
                <div className="timeline__summary-label">{row.label}</div>
                <div className="timeline__summary-cells" style={{ '--grid-min-w': `${DAY_W * numDays}px` } as React.CSSProperties}>
                  {summary.map((sg, di) => (
                    <div key={di} className="timeline__summary-cell" style={{ '--cell-left': `${di * DAY_W}px` } as React.CSSProperties}>
                      {sg[row.key]}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="timeline__summary-toggle" onClick={onToggleRiepilogo} aria-expanded={showRiepilogo}>
            <span className="timeline__summary-toggle-label">
              <svg
                className={`timeline__summary-chevron${showRiepilogo ? ' is-open' : ''}`}
                viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}
              >
                <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Riepilogo disponibilità
            </span>
          </button>
        </div>
      )}
    </div>
    </div>
  );
};

export default Timeline;
