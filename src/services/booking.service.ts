/**
 * Booking / Tableau — `Portal/SibyllaApi/Controllers/BookingController.cs`.
 */

import { apiFetchSibylla } from './api';

export interface PrenotazioneDto {
  id?: number;
  id_prenotazione?: number;
  cliente?: string;
  arrivo?: string;
  partenza?: string;
  camera?: string;
  tipo_camera?: string;
  importo?: number;
  stato?: string;
  segmento?: string;
  agenzia?: string;
  numero_persone?: number;
  note?: string;
  [key: string]: unknown;
}

export interface PrenotazioniFilter {
  id_struttura?: number;
  data_da?: string;
  data_a?: string;
  segmento?: string;
  stato?: string;
  search?: string;
  [key: string]: unknown;
}

export interface TableauFilter extends PrenotazioniFilter {
  mese?: number;
  anno?: number;
}

export function getPrenotazioni(
  filter: PrenotazioniFilter = {}
): Promise<PrenotazioneDto[]> {
  return apiFetchSibylla<PrenotazioneDto[]>('booking/GetPrenotazioni', {
    method: 'POST',
    body: filter,
  });
}

export function getPrenotazione(id: number): Promise<PrenotazioneDto> {
  return apiFetchSibylla<PrenotazioneDto>('booking/GetPrenotazione', {
    method: 'POST',
    body: { id_prenotazione: id },
  });
}

export function getPrenotazioniTableau(
  filter: TableauFilter = {}
): Promise<PrenotazioneDto[]> {
  return apiFetchSibylla<PrenotazioneDto[]>('booking/GetPrenotazioniTableau', {
    method: 'POST',
    body: filter,
  });
}

export function getTipiCameraSibylla(
  id_struttura: number
): Promise<Array<{ id: number; nome: string }>> {
  return apiFetchSibylla('booking/GetTipiCameraSibylla', {
    method: 'POST',
    body: { id_struttura },
  });
}

export function setPrenotazioneNota(payload: {
  id_prenotazione: number;
  nota: string;
}): Promise<{ success: boolean }> {
  return apiFetchSibylla('booking/SetPrenotazioneNota', {
    method: 'POST',
    body: payload,
  });
}

export function addPrenotazioneSibylla(
  payload: Partial<PrenotazioneDto>
): Promise<PrenotazioneDto> {
  return apiFetchSibylla<PrenotazioneDto>('booking/AddPrenotazioneSibylla', {
    method: 'POST',
    body: payload,
  });
}

export function eliminaPrenotazioneSibylla(
  id_prenotazione: number
): Promise<{ success: boolean }> {
  return apiFetchSibylla('booking/EliminaPrenotazioneSibylla', {
    method: 'POST',
    body: { id_prenotazione },
  });
}

export function stopSales(payload: {
  id_struttura: number;
  data_da: string;
  data_a: string;
  id_tipo_camera?: number;
}): Promise<{ success: boolean }> {
  return apiFetchSibylla('booking/StopSales', {
    method: 'POST',
    body: payload,
  });
}
