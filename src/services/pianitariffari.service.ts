/**
 * Piani tariffari + tariffe / disponibilità —
 * `Portal/SibyllaApi/Controllers/PianiTariffariController .cs`.
 */

import { apiFetchSibylla } from './api';

export interface PianoTariffario {
  id?: number;
  nome?: string;
  tipologia?: string;
  data_inizio?: string;
  data_fine?: string;
  id_struttura?: number;
  attivo?: boolean;
  partner?: string[];
  [key: string]: unknown;
}

export interface PianiTariffariFilter {
  id_struttura?: number;
  attivo?: boolean | null;
  [key: string]: unknown;
}

export interface TipologiaPianoTariffario {
  id: number;
  nome: string;
}

export function getPianiTariffari(
  filter: PianiTariffariFilter = {}
): Promise<PianoTariffario[]> {
  return apiFetchSibylla<PianoTariffario[]>(
    'PianiTariffari/GetPianiTariffari',
    { method: 'POST', body: filter }
  );
}

export function getPianiTariffariWithPartners(
  filter: PianiTariffariFilter = {}
): Promise<PianoTariffario[]> {
  return apiFetchSibylla<PianoTariffario[]>(
    'PianiTariffari/GetPianiTariffariWithPartners',
    { method: 'POST', body: filter }
  );
}

export function getTipologiePianiTariffari(): Promise<
  TipologiaPianoTariffario[]
> {
  return apiFetchSibylla<TipologiaPianoTariffario[]>(
    'PianiTariffari/GetTipologiePianiTariffari',
    { method: 'POST' }
  );
}

export function insertPianoTariffario(
  payload: Partial<PianoTariffario>
): Promise<PianoTariffario> {
  return apiFetchSibylla<PianoTariffario>(
    'PianiTariffari/InsertPianoTariffario',
    { method: 'POST', body: payload }
  );
}

export function updatePianoTariffario(
  payload: Partial<PianoTariffario>
): Promise<PianoTariffario> {
  return apiFetchSibylla<PianoTariffario>(
    'PianiTariffari/UpdatePianoTariffario',
    { method: 'POST', body: payload }
  );
}

export function deletePianoTariffario(
  id: number
): Promise<{ success: boolean }> {
  return apiFetchSibylla('PianiTariffari/DeletePianoTariffaro', {
    method: 'POST',
    body: { id },
  });
}

export function getTipiCameraDto(
  id_struttura: number
): Promise<Array<{ id: number; nome: string }>> {
  return apiFetchSibylla('PianiTariffari/GetTipiCameraDto', {
    method: 'POST',
    body: { id_struttura },
  });
}

export function updateArrangiamentoPiano(payload: {
  id_piano: number;
  id_arrangiamento: number;
}): Promise<{ success: boolean }> {
  return apiFetchSibylla('PianiTariffari/UpdateArrangiamentoPiano', {
    method: 'POST',
    body: payload,
  });
}
