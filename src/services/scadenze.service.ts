/**
 * Scadenze e calendario — `Portal/SibyllaApi/Controllers/ScadenzeController.cs`
 * via catch-all proxy.
 */

import { apiFetchSibylla } from './api';

export interface TipoScadenza {
  id: number;
  nome: string;
  colore?: string;
}

export interface CategoriaScadenza {
  id: number;
  nome: string;
}

export interface ScadenzaDto {
  id?: number;
  id_tipo_scadenza?: number;
  tipo?: string;
  id_categoria?: number;
  categoria?: string;
  titolo?: string;
  descrizione?: string;
  data_scadenza?: string;
  data_inizio?: string;
  data_fine?: string;
  importo?: number;
  pagata?: boolean;
  id_struttura?: number;
  struttura?: string;
  /** Estendibile in base ai campi che il BE ritorna realmente */
  [key: string]: unknown;
}

export interface ScadenzeFilter {
  data_da?: string;
  data_a?: string;
  id_struttura?: number;
  id_tipo_scadenza?: number;
  pagata?: boolean | null;
  [key: string]: unknown;
}

export function getTipiScadenze(): Promise<TipoScadenza[]> {
  return apiFetchSibylla<TipoScadenza[]>('scadenze/GetTipiScadenze', {
    method: 'POST',
  });
}

export function getCategorieScadenze(): Promise<CategoriaScadenza[]> {
  return apiFetchSibylla<CategoriaScadenza[]>('scadenze/GetCategorieScadenze', {
    method: 'POST',
  });
}

export function getScadenze(filter: ScadenzeFilter = {}): Promise<ScadenzaDto[]> {
  return apiFetchSibylla<ScadenzaDto[]>('scadenze/GetScadenze', {
    method: 'POST',
    body: filter,
  });
}

export function getSintesiScadenze(
  filter: ScadenzeFilter = {}
): Promise<ScadenzaDto[]> {
  return apiFetchSibylla<ScadenzaDto[]>('scadenze/GetSintesiScadenze', {
    method: 'POST',
    body: filter,
  });
}

export function saveEvento(
  evento: Partial<ScadenzaDto>
): Promise<ScadenzaDto> {
  return apiFetchSibylla<ScadenzaDto>('scadenze/SaveEvento', {
    method: 'POST',
    body: evento,
  });
}

export function shareEvento(payload: {
  id_evento: number;
  utenti: number[];
}): Promise<{ success: boolean }> {
  return apiFetchSibylla('scadenze/ShareEvento', {
    method: 'POST',
    body: payload,
  });
}
