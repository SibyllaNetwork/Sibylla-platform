/**
 * Operation — proxy `/Operation/*`.
 *
 * Copertura mirata: solo gli endpoint che il FE sibylla-platform può
 * realisticamente consumare (Scadenzario, segnalazioni, incarichi, turni).
 * Per i casi housekeeping/timbra resta lo stub typed.
 */

import { apiFetch } from './api';

// ── Scadenzario ─────────────────────────────────────────────────────────────

export interface ScadenzaDto {
  id?: number;
  titolo?: string;
  scadenza?: string;
  tipo?: string;
  importo?: number;
  pagata?: boolean;
  [key: string]: unknown;
}

export interface ScadenzeFilter {
  data_da?: string;
  data_a?: string;
  id_struttura?: number;
  [key: string]: unknown;
}

export function getScadenze(filter: ScadenzeFilter = {}): Promise<ScadenzaDto[]> {
  return apiFetch<ScadenzaDto[]>('/Operation/calendario/GetScadenze', {
    method: 'POST',
    body: filter,
  });
}

// ── Segnalazioni ────────────────────────────────────────────────────────────

export interface SegnalazioneDto {
  id_segnalazione: number;
  titolo: string;
  descrizione: string;
  stato?: string;
  id_reparto?: number;
  reparto?: string;
  id_genere_intervento?: number;
  genere_intervento?: string;
  urgente?: boolean;
  [key: string]: unknown;
}

export interface SegnalazioniFilter {
  id_struttura?: number;
  stato?: string;
  data_da?: string;
  data_a?: string;
  [key: string]: unknown;
}

export function getSegnalazioni(
  filter: SegnalazioniFilter = {}
): Promise<SegnalazioneDto[]> {
  return apiFetch<SegnalazioneDto[]>('/Operation/segnalazioni/Get', {
    method: 'POST',
    body: filter,
  });
}

export function insertSegnalazione(
  dto: Partial<SegnalazioneDto>
): Promise<SegnalazioneDto> {
  return apiFetch<SegnalazioneDto>('/Operation/segnalazioni/Insert', {
    method: 'POST',
    body: dto,
  });
}

export function updateStatoSegnalazione(
  id_segnalazione: number,
  stato: string
): Promise<{ success: boolean }> {
  return apiFetch('/Operation/segnalazioni/UpdateStato', {
    method: 'POST',
    body: { id_segnalazione, stato },
  });
}

export function presaInCaricoSegnalazione(
  id_segnalazione: number
): Promise<{ success: boolean }> {
  return apiFetch('/Operation/segnalazioni/PresaInCarico', {
    method: 'POST',
    body: { id_segnalazione },
  });
}

// ── Incarichi ───────────────────────────────────────────────────────────────

export interface IncaricoDto {
  id?: number;
  titolo?: string;
  descrizione?: string;
  stato?: string;
  id_utente?: number;
  utente?: string;
  data?: string;
  [key: string]: unknown;
}

export function getMieiIncarichi(): Promise<IncaricoDto[]> {
  return apiFetch<IncaricoDto[]>('/Operation/MieiIncarichi', {
    method: 'POST',
  });
}

export function chiudiIncarico(
  id_incarico: number
): Promise<{ success: boolean }> {
  return apiFetch('/Operation/ChiudiIncarico', {
    method: 'POST',
    body: { id_incarico },
  });
}

// ── Turni ──────────────────────────────────────────────────────────────────

export interface TurnoDto {
  id?: number;
  data?: string;
  fascia?: string;
  giustificativo?: string;
  [key: string]: unknown;
}

export interface MieiTurniFilter {
  mese?: number;
  anno?: number;
  id_utente?: number;
  [key: string]: unknown;
}

export function getMieiTurni(
  filter: MieiTurniFilter = {}
): Promise<TurnoDto[]> {
  return apiFetch<TurnoDto[]>('/Operation/turni/MieiTurni', {
    method: 'POST',
    body: filter,
  });
}

// ── Teams ──────────────────────────────────────────────────────────────────

export interface TeamDto {
  id?: number;
  nome?: string;
  membri?: Array<{ id: number; nome: string; cognome?: string }>;
  [key: string]: unknown;
}

export function getTeams(): Promise<TeamDto[]> {
  return apiFetch<TeamDto[]>('/Operation/GetTeams');
}
