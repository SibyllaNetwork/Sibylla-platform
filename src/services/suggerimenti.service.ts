/**
 * Suggerimenti pricing — `Portal/SibyllaApi/Controllers/SuggerimentiController.cs`.
 */

import { apiFetchSibylla } from './api';

export interface ScreeningOpenPriceFilter {
  id_struttura?: number;
  data_da?: string;
  data_a?: string;
  [key: string]: unknown;
}

export interface SuggerimentoDto {
  id?: number;
  data?: string;
  prezzo_attuale?: number;
  prezzo_suggerito?: number;
  occupancy?: number;
  id_tipo_camera?: number;
  tipo_camera?: string;
  motivazione?: string;
  [key: string]: unknown;
}

export function screeningOpenPrice(
  filter: ScreeningOpenPriceFilter = {}
): Promise<SuggerimentoDto[]> {
  return apiFetchSibylla<SuggerimentoDto[]>(
    'suggerimenti/ScreeningOpenPrice',
    { method: 'POST', body: filter }
  );
}

export function aggiornaPrezzi(payload: {
  modifiche: Array<{ id_tipo_camera: number; data: string; prezzo: number }>;
  id_struttura: number;
}): Promise<{ success: boolean; aggiornati?: number }> {
  return apiFetchSibylla('suggerimenti/AggiornaPrezzi', {
    method: 'POST',
    body: payload,
  });
}
