/**
 * Strategie revenue — `Portal/SibyllaApi/Controllers/StrategieController.cs`.
 */

import { apiFetchSibylla } from './api';

export interface StrategiaPricing {
  id?: number;
  nome?: string;
  data_inizio?: string;
  data_fine?: string;
  bar_increment?: number;
  occupancy_thresholds?: number[];
  id_struttura?: number;
  attiva?: boolean;
  [key: string]: unknown;
}

export interface StrategiaDispo {
  id?: number;
  nome?: string;
  data_inizio?: string;
  data_fine?: string;
  id_struttura?: number;
  [key: string]: unknown;
}

export interface StrategiaExt {
  id?: number;
  nome?: string;
  payload?: unknown;
  [key: string]: unknown;
}

export interface StrategieFilter {
  id_struttura?: number;
  data_da?: string;
  data_a?: string;
  [key: string]: unknown;
}

export function getStrategiaPricing(
  filter: StrategieFilter = {}
): Promise<StrategiaPricing[]> {
  return apiFetchSibylla<StrategiaPricing[]>('strategie/GetStrategiaPricing', {
    method: 'POST',
    body: filter,
  });
}

export function setStrategiaPricing(
  payload: Partial<StrategiaPricing>
): Promise<StrategiaPricing> {
  return apiFetchSibylla<StrategiaPricing>('strategie/SetStrategiaPricing', {
    method: 'POST',
    body: payload,
  });
}

export function editStrategiaPricing(
  payload: Partial<StrategiaPricing>
): Promise<StrategiaPricing> {
  return apiFetchSibylla<StrategiaPricing>(
    'strategie/editStrategiaPricing',
    { method: 'POST', body: payload }
  );
}

export function deleteStrategia(id: number): Promise<{ success: boolean }> {
  return apiFetchSibylla('strategie/DeleteStrategia', {
    method: 'POST',
    body: { id },
  });
}

export function getStrategiaDispo(
  filter: StrategieFilter = {}
): Promise<StrategiaDispo[]> {
  return apiFetchSibylla<StrategiaDispo[]>('strategie/GetStrategiaDispo', {
    method: 'POST',
    body: filter,
  });
}

export function setStrategiaDispo(
  payload: Partial<StrategiaDispo>
): Promise<StrategiaDispo> {
  return apiFetchSibylla<StrategiaDispo>('strategie/SetStrategiaDispo', {
    method: 'POST',
    body: payload,
  });
}

export function getStrategieByStruttura(
  id_struttura: number
): Promise<Array<StrategiaPricing | StrategiaDispo>> {
  return apiFetchSibylla('strategie/GetStrategieByStruttura', {
    method: 'POST',
    body: { id_struttura },
  });
}

export function getBarInfoSuggerimenti(
  filter: StrategieFilter = {}
): Promise<unknown[]> {
  return apiFetchSibylla<unknown[]>('strategie/GetBarInfoSuggerimenti', {
    method: 'POST',
    body: filter,
  });
}

export function duplicaStrategie(payload: {
  id_strategia: number;
  destinazione: unknown;
}): Promise<{ success: boolean }> {
  return apiFetchSibylla('strategie/DuplicaStrategie', {
    method: 'POST',
    body: payload,
  });
}
