// ─── Timeline ─────────────────────────────────────────────────────────────────
// Struttura e layout via className SCSS.
// Solo left/width/color delle barre e posizioni calcolate restano inline.

import React, { useMemo, useCallback } from 'react';
import { Piano, Pren, Camera } from '../planner.types';
import { STATO_CLR, CAM_CLR, DAY_W, ROOM_W } from '../planner.styles';
import { parseDt, addDays, diffDays, MO } from '../planner.data';

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
  showRiepilogo?    : boolean;
  onToggleRiepilogo?: () => void;
  onBarHover?  : (pren: Pren | null, clientX: number, clientY: number) => void;
}

const Timeline: React.FC<Props> = ({
  piani, prenotazioni, startDate, numDays,
  filtroConf, filtroOpz, activePiani,
  onSelect, selectedId, onEmpty, onAssign,
  showRiepilogo, onToggleRiepilogo, onBarHover,
}) => {
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

  // Solo left/width/background/color/clipPath restano inline — tutto il resto è SCSS
  const getBarProps = useCallback((pren: Pren) => {
    const ci   = parseDt(pren.checkIn);
    const co   = parseDt(pren.checkOut);
    const endV = addDays(startDate, numDays);
    if (co <= startDate || ci >= endV) return null;

    const ld   = Math.max(0, diffDays(startDate, ci));
    const rd   = Math.min(numDays, diffDays(startDate, co));
    const sL   = ci >= startDate;
    const sR   = co <= endV;
    const clr  = STATO_CLR[pren.stato];

    const clip = sL && sR
      ? 'polygon(10px 0%,calc(100% - 12px) 0%,100% 50%,calc(100% - 12px) 100%,10px 100%,0% 50%)'
      : sL
        ? 'polygon(10px 0%,100% 0%,100% 100%,10px 100%,0% 50%)'
        : sR
          ? 'polygon(0% 0%,calc(100% - 12px) 0%,100% 50%,calc(100% - 12px) 100%,0% 100%)'
          : 'none';

    const shapeClass = sL && sR ? 'start-visible'
      : sL ? 'start-visible end-hidden'
      : 'start-hidden';

    return {
      style: {
        left:       ld * DAY_W,
        width:      Math.max(20, (rd - ld) * DAY_W - 2),
        background: clr.bg,
        color:      clr.text,
        clipPath:   clip,
        paddingLeft: sL ? 16 : 10,
      } as React.CSSProperties,
      shapeClass,
      selected: selectedId === pren.id,
    };
  }, [startDate, numDays, selectedId]);

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
    <div className="timeline">

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
          style={{ left: ROOM_W + todayOff * DAY_W + DAY_W / 2 }}
        />
      )}

      {/* ── Piani ───────────────────────────────────────────────────────────── */}
      {visible.map(piano => (
        <div key={piano.id}>
          <div className="timeline__floor-header">{piano.nome}</div>

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
                      style={{ background: CAM_CLR[cam.stato] }}
                    />
                    <span className="timeline__room-number">{cam.numero}</span>
                  </div>
                  <div className="timeline__room-type">{cam.tipo}</div>
                </div>

                {/* Griglia giorni */}
                <div
                  className="timeline__day-grid"
                  style={{ minWidth: DAY_W * numDays }}
                  onDragOver={onAssign ? (e) => e.preventDefault() : undefined}
                  onDrop={onAssign ? (e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    if (id) onAssign(id, cam.numero);
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
                        style={{ left: di * DAY_W }}
                        onClick={() => { if (!occupied) onEmpty(cam, d); }}
                      />
                    );
                  })}

                  {/* Icone stato camera */}
                  {cam.stato === 'manutenzione' && days.map((_, di) => (
                    <div key={`mx${di}`} className="timeline__status-icon" style={{ left: di * DAY_W }}>
                      🔧
                    </div>
                  ))}
                  {cam.stato === 'pulizia' && days.map((_, di) => (
                    <div key={`px${di}`} className="timeline__status-icon" style={{ left: di * DAY_W }}>
                      ✦
                    </div>
                  ))}

                  {/* Barre prenotazione */}
                  {camPrens.map(pren => {
                    const bp = getBarProps(pren);
                    if (!bp) return null;
                    return (
                      <div
                        key={pren.id}
                        className={`timeline__bar${bp.selected ? ' timeline__bar--selected' : ''}`}
                        style={bp.style}
                        draggable={!!onAssign}
                        onDragStart={onAssign ? (e) => { e.dataTransfer.setData('text/plain', pren.id); e.dataTransfer.effectAllowed = 'move'; onBarHover?.(null, 0, 0); } : undefined}
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
                <div className="timeline__summary-cells" style={{ minWidth: DAY_W * numDays }}>
                  {summary.map((sg, di) => (
                    <div key={di} className="timeline__summary-cell" style={{ left: di * DAY_W }}>
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
  );
};

export default Timeline;
