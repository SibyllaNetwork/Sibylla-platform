// ─── planner.layout ───────────────────────────────────────────────────────────
// Layout condiviso delle barre prenotazione (timeline + parcheggio), così la
// resa è IDENTICA nei due contesti. Calcola posizione, forma (punta/incavo),
// chevron e colori. Tiene conto delle consecutive solo se `prens` le contiene
// (nel parcheggio si passa una lista vuota → barra "isolata").

import type { CSSProperties } from 'react';
import { Pren } from './planner.types';
import { DAY_W } from './planner.styles';
import { parseDt, addDays, diffDays, PRENS } from './planner.data';

// Colori demo desaturati, ciclati in modo STABILE per id (ordine di PRENS), così
// timeline e parcheggio mostrano lo stesso colore per la stessa prenotazione.
export const DEMO_COLORS = ['#cf6b6b', '#86bd6a', '#6aa3cf', '#cdd285'];
const DEMO_ORDER = PRENS.map(p => p.id);
export function demoColorFor(id: string): string {
  const i = DEMO_ORDER.indexOf(id);
  return DEMO_COLORS[(i >= 0 ? i : 0) % DEMO_COLORS.length];
}

// Colore della barra: l'opzionata assume la sua colorazione tipica (oro),
// le altre il colore demo ciclato.
export function barColor(pren: Pren): string {
  if (pren.stato === 'opzione') return '#C69520';
  return demoColorFor(pren.id);
}

// ── Comunicazioni della prenotazione ──────────────────────────────────────────
// Requisiti/stati già presenti, mostrati come icone sulla barra (+ tooltip nativo).
export interface Comm { key: string; icon: string; label: string; }
export function bookingComms(pren: Pren): Comm[] {
  const out: Comm[] = [];
  if (pren.segmento)              out.push({ key: 'segmento',   icon: 'fa-user-group',        label: `Segmento: ${pren.segmento}` });
  if (pren.stato === 'checkin')   out.push({ key: 'checkin',    icon: 'fa-circle-check',      label: 'Check-in completo' });
  if (pren.stato === 'checkin_p') out.push({ key: 'checkin_p',  icon: 'fa-circle-half-stroke',label: 'Check-in parziale' });
  if (pren.roomingList)           out.push({ key: 'rooming',    icon: 'fa-list-check',        label: 'Rooming list' });
  if (pren.stato === 'noshow')    out.push({ key: 'noshow',     icon: 'fa-user-xmark',        label: 'No show' });
  if (pren.stato === 'manutenzione') out.push({ key: 'manut',   icon: 'fa-wrench',            label: 'Manutenzione' });
  if (pren.stato === 'pulizia')   out.push({ key: 'pulizia',    icon: 'fa-broom',             label: 'Pulizie' });
  return out;
}

export interface BarLayout {
  style: CSSProperties;
  shapeClass: string;
  showChevrons: boolean;
  chevronLeft: number;
}

export function barLayout(
  pren: Pren,
  prens: Pren[],
  startDate: Date,
  numDays: number,
  color: string,
): BarLayout | null {
  const ci   = parseDt(pren.checkIn);
  const co   = parseDt(pren.checkOut);
  const endV = addDays(startDate, numDays);
  if (co <= startDate || ci >= endV) return null;

  const ld = Math.max(0, diffDays(startDate, ci));
  const rd = Math.min(numDays, diffDays(startDate, co));
  const sL = ci >= startDate;
  const sR = co <= endV;

  const hasSuccessor = prens.some(
    o => o.numeroCamera === pren.numeroCamera && o.id !== pren.id && o.checkIn === pren.checkOut
  );
  const hasPredecessor = prens.some(
    o => o.numeroCamera === pren.numeroCamera && o.id !== pren.id && o.checkOut === pren.checkIn
  );

  const ARROW = 14, NOTCH = 14, BORDER = 5, CHEV_LAST_BACK = 10;
  const rightPoint = sR;
  const leftNotch  = hasPredecessor && sL;

  const pts: string[] = ['0 0'];
  pts.push(rightPoint ? `calc(100% - ${ARROW}px) 0` : '100% 0');
  if (rightPoint) pts.push('100% 50%');
  pts.push(rightPoint ? `calc(100% - ${ARROW}px) 100%` : '100% 100%');
  pts.push('0 100%');
  if (leftNotch) pts.push(`${NOTCH}px 50%`);
  const clip = (rightPoint || leftNotch) ? `polygon(${pts.join(', ')})` : 'none';

  const P = 'timeline__bar';
  const shapeClass = [
    (rightPoint && !hasSuccessor) ? `${P}--arrow` : (sR ? '' : `${P}--cont-right`),
    sL ? (leftNotch ? '' : `${P}--edge-in`) : `${P}--cont-left`,
  ].filter(Boolean).join(' ');

  const F = 0.3;
  let leftPx = sL ? (ld + F) * DAY_W : 0;
  if (leftNotch) leftPx += (CHEV_LAST_BACK - ARROW + BORDER);
  const rightPx = sR ? (rd + F) * DAY_W : numDays * DAY_W;
  const W = Math.max(28, rightPx - leftPx);

  return {
    style: {
      '--bar-left':      `${leftPx}px`,
      '--bar-width':     `${W}px`,
      '--bar-bg':        color,
      '--bar-color':     '#fff',
      '--bar-clip':      clip,
      '--bar-pad-left':  leftNotch ? `${NOTCH + 6}px` : (sL ? '13px' : '10px'),
      '--bar-pad-right': rightPoint ? `${ARROW + 6}px` : '10px',
    } as CSSProperties,
    shapeClass,
    showChevrons: rightPoint,
    chevronLeft: leftPx + W - ARROW,
  };
}
