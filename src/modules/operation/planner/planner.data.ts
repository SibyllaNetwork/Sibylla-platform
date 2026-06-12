// ─── PLANNER DATA ─────────────────────────────────────────────────────────────
// Mock data e helper functions della pagina Planner

import { Piano, Pren, PrenPendente } from './planner.types';

// ── Strutture disponibili ──────────────────────────────────────────────────────
export const STRUTTURE = [
  'Hotel Tutorial',
  'Hotel Sibylla Roma',
  'Hotel Sibylla Milano',
];

// ── Mesi abbreviati IT ─────────────────────────────────────────────────────────
export const MO = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

// ── Piani e camere ─────────────────────────────────────────────────────────────
export const PIANI_DATA: Piano[] = [
  { id: 0, nome: 'Piano Terra', camere: [
    { numero: '1', tipo: 'MAT + X (Tripla Classic)', stato: 'occupata' },
  ]},
  { id: 1, nome: 'Primo Piano', camere: [
    { numero: '101', tipo: 'SGL CLASSICA (Singola Classic)', stato: 'occupata' },
    { numero: '102', tipo: 'SGL CLASSICA (Singola Classic)', stato: 'libera' },
    { numero: '103', tipo: 'MAT ECONOMY (Doppia Classic)',   stato: 'occupata' },
    { numero: '104', tipo: 'Doppia Classic',                 stato: 'occupata' },
    { numero: '105', tipo: 'Doppia Classic',                 stato: 'occupata' },
    { numero: '106', tipo: 'DOPPIA CLASSIC (Doppia Classic)',stato: 'prenotata' },
    { numero: '107', tipo: 'MATRIMONIALE CLASSIC',           stato: 'occupata' },
    { numero: '108', tipo: 'DOPPIA CLASSIC (Doppia Classic)',stato: 'occupata' },
    { numero: '109', tipo: 'DOPPIA CLASSIC (Doppia Classic)',stato: 'manutenzione' },
  ]},
  { id: 2, nome: 'Secondo Piano', camere: [
    { numero: '201', tipo: 'SGL CLASSICA',   stato: 'libera' },
    { numero: '202', tipo: 'SGL CLASSICA',   stato: 'libera' },
    { numero: '203', tipo: 'Doppia Classic', stato: 'checkout' },
    { numero: '204', tipo: 'Doppia Classic', stato: 'libera' },
    { numero: '205', tipo: 'MATRIMONIALE',   stato: 'pulizia' },
    { numero: '206', tipo: 'Doppia Classic', stato: 'libera' },
  ]},
  { id: 3, nome: 'Terzo Piano', camere: [
    { numero: '301', tipo: 'Suite',          stato: 'occupata' },
    { numero: '302', tipo: 'Doppia Classic', stato: 'libera' },
    { numero: '303', tipo: 'Doppia Classic', stato: 'prenotata' },
    { numero: '304', tipo: 'MATRIMONIALE',   stato: 'libera' },
  ]},
  { id: 4, nome: 'Quarto Piano', camere: [
    { numero: '401', tipo: 'Suite Deluxe', stato: 'libera' },
    { numero: '402', tipo: 'Suite',        stato: 'libera' },
  ]},
];

// ── Prenotazioni mock ──────────────────────────────────────────────────────────
export const PRENS: Pren[] = [
  { id:'p1',  booking:'15080', nominativo:'Tour Operator Test', checkIn:'2026-04-13', checkOut:'2026-04-14', stato:'opzione',    numeroCamera:'1',   agenzia:'Tui Italia', segmento:'Gruppi',
    cliente:'Mario Giordani', statoCheckIn:'In attesa', persone:112, adulti:0, bambini:0, neonati:0, animali:0, camere:57, arrangiamento:'RO',
    dettaglioCamere:[
      { numero:'102', piano:'Primo Piano', nome:'SGL CLASSICA',         tipoAssegnato:'Singola', tipoRichiesto:'Singola Classic', statoCheckIn:'In attesa' },
      { numero:'304', piano:'Terzo Piano', nome:'MATRIMONIALE ECONOMY', tipoAssegnato:'Doppia',  tipoRichiesto:'Doppia Classic', statoCheckIn:'In attesa' },
      { numero:'305', piano:'Terzo Piano', nome:'MATRIMONIALE ECONOMY', tipoAssegnato:'Doppia',  tipoRichiesto:'Doppia Classic', statoCheckIn:'In attesa' },
      { numero:'307', piano:'Terzo Piano', nome:'MATRIMONIALE CLASSIC', tipoAssegnato:'Doppia',  tipoRichiesto:'Doppia Classic', statoCheckIn:'In attesa' },
      { numero:'308', piano:'Terzo Piano', nome:'DOPPIA CLASSIC',       tipoAssegnato:'Doppia',  tipoRichiesto:'Doppia Classic', statoCheckIn:'In attesa' },
    ] },
  { id:'p2',  booking:'15081', nominativo:'Patrizio',           checkIn:'2026-04-19', checkOut:'2026-04-22', stato:'confermata', numeroCamera:'1' },
  // Prenotazione consecutiva: subentra a Patrizio lo stesso giorno (22/04)
  { id:'p2b', booking:'15081b',nominativo:'Bianchi',            checkIn:'2026-04-22', checkOut:'2026-04-24', stato:'checkin',    numeroCamera:'1' },
  { id:'p3',  booking:'15082', nominativo:'Tour Operator Test', checkIn:'2026-04-13', checkOut:'2026-04-14', stato:'opzione',    numeroCamera:'101', agenzia:'Sibylla', segmento:'Gruppi' },
  { id:'p4',  booking:'15083', nominativo:'Patrizio',           checkIn:'2026-04-19', checkOut:'2026-04-22', stato:'confermata', numeroCamera:'101' },
  // Camera 103: due prenotazioni CONSECUTIVE (handoff il 17/04)
  { id:'p5',  booking:'15084', nominativo:'Rossi',              checkIn:'2026-04-13', checkOut:'2026-04-17', stato:'confermata', numeroCamera:'103' },
  { id:'p6',  booking:'15085', nominativo:'Verdi',              checkIn:'2026-04-17', checkOut:'2026-04-21', stato:'checkin',    numeroCamera:'103' },
  { id:'p7',  booking:'15086', nominativo:'Tour Operator Test', checkIn:'2026-04-13', checkOut:'2026-04-14', stato:'opzione',    numeroCamera:'104' },
  { id:'p8',  booking:'15087', nominativo:'Patrizio',           checkIn:'2026-04-19', checkOut:'2026-04-22', stato:'confermata', numeroCamera:'104' },
  { id:'p9',  booking:'15088', nominativo:'Tour Operator Test', checkIn:'2026-04-13', checkOut:'2026-04-14', stato:'opzione',    numeroCamera:'105' },
  { id:'p10', booking:'15089', nominativo:'Patrizio',           checkIn:'2026-04-19', checkOut:'2026-04-22', stato:'confermata', numeroCamera:'105' },
  { id:'p11', booking:'15090', nominativo:'Tour Operator Test', checkIn:'2026-04-13', checkOut:'2026-04-14', stato:'opzione',    numeroCamera:'106' },
  { id:'p12', booking:'15091', nominativo:'Patrizio',           checkIn:'2026-04-19', checkOut:'2026-04-22', stato:'confermata', numeroCamera:'106' },
  { id:'p13', booking:'15092', nominativo:'Tour Operator Test', checkIn:'2026-04-13', checkOut:'2026-04-14', stato:'opzione',    numeroCamera:'107' },
  { id:'p14', booking:'15093', nominativo:'Patrizio',           checkIn:'2026-04-19', checkOut:'2026-04-22', stato:'confermata', numeroCamera:'107' },
  { id:'p15', booking:'15094', nominativo:'Tour Operator Test', checkIn:'2026-04-13', checkOut:'2026-04-14', stato:'opzione',    numeroCamera:'108' },
  { id:'p16', booking:'15095', nominativo:'Patrizio',           checkIn:'2026-04-19', checkOut:'2026-04-22', stato:'confermata', numeroCamera:'108' },
  { id:'p17', booking:'15096', nominativo:'Patrizio',           checkIn:'2026-04-19', checkOut:'2026-04-22', stato:'confermata', numeroCamera:'109' },
];

// ── Prenotazioni pendenti ──────────────────────────────────────────────────────
export const PENDING_DA: PrenPendente[] = [
  { booking:'15080', nominativo:'supertest', checkIn:'2026-05-22', checkOut:'2026-05-26', agenzia:'Sibylla', segmento:'Gruppi', tipo:'assegnare' },
];

export const PENDING_AL: PrenPendente[] = [
  { booking:'15080', nominativo:'supertest', checkIn:'2026-05-22', checkOut:'2026-05-26', agenzia:'Sibylla', segmento:'Gruppi', tipo:'allocare' },
];

// ── Helper functions ───────────────────────────────────────────────────────────
export const parseDt = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const diffDays = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / 86400000);

export const fmtDate = (d: Date): string =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
