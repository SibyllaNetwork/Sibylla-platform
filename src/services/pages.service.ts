/**
 * Lista pagine consentite per l'azienda corrente.
 *
 * Lo SPI lato proxy non è ancora esposto: in attesa che venga creato
 * `/Admin/GetPageList`, la chiamata fallisce silenziosamente e restituisce
 * una lista vuota → la sidebar mostra il menu completo (filtrato lato UI).
 */

import { apiFetch, ApiError } from './api';
import { PageItem } from '../types';

export async function getPageList(id_azienda: number): Promise<PageItem[]> {
  try {
    return await apiFetch<PageItem[]>('/Admin/GetPageList', {
      method: 'POST',
      body: { id_azienda },
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      return [];
    }
    throw err;
  }
}
