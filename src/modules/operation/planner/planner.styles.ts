// ─── PLANNER STYLES ───────────────────────────────────────────────────────────
// Tutti i token colore e oggetti stile condivisi della pagina Planner

import { StatoCam, StatoPren } from './planner.types';

// Token colori (allineati al Design System Sibylla)
export const C = {
  primary : '#204769',
  p800    : '#43617c',
  p600    : '#58738b',
  p500    : '#8399ab',
  p300    : '#b3c1cc',
  p200    : '#ccd5dd',
  p100    : '#e6eaee',
  p50     : '#f2f5f6',
  text1   : '#4A4D53',
  text2   : '#6E7175',
  text3   : '#A9AAAD',
  link    : '#5C9CD4',
  white   : '#FFFFFF',
  bg      : '#F8FCFF',
  ok      : '#00CF86',
  error   : '#FF616E',
  alert   : '#F57D03',
};

// Colori barra prenotazione per stato
export const STATO_CLR: Record<StatoPren, { bg: string; text: string }> = {
  confermata:   { bg: '#7A1515', text: '#fff' },
  opzione:      { bg: '#C69520', text: '#fff' },
  noshow:       { bg: '#7B5EA7', text: '#fff' },
  checkin:      { bg: '#1A6B3C', text: '#fff' },
  checkin_p:    { bg: '#2E9959', text: '#fff' },
  checkout:     { bg: '#CFCFCF', text: '#4A4D53' },
  manutenzione: { bg: '#B8B8B8', text: '#4A4D53' },
  pulizia:      { bg: '#9DD7E8', text: '#204769' },
};

// Colori quadratino camera per stato
export const CAM_CLR: Record<StatoCam, string> = {
  libera       : '#00CF86',
  occupata     : '#7A1515',
  checkout     : '#CFCFCF',
  manutenzione : '#F57D03',
  pulizia      : '#9DD7E8',
  prenotata    : '#C69520',
};

// Costanti layout timeline
export const DAY_W  = 88;  // larghezza colonna giorno (px)
export const ROOM_W = 186; // larghezza colonna camera (px)

// Stile select riutilizzabile
export const selectStyle: React.CSSProperties = {
  height      : 36,
  padding     : '0 28px 0 10px',
  borderRadius: 6,
  border      : `1.5px solid ${C.p200}`,
  fontFamily  : 'Poppins, sans-serif',
  fontSize    : 13,
  color       : C.text1,
  background  : C.white,
  cursor      : 'pointer',
  outline     : 'none',
  backgroundImage   : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236E7175' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat  : 'no-repeat',
  backgroundPosition: 'right 8px center',
  appearance        : 'none',
};
