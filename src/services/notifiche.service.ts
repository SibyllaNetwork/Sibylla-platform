/**
 * Notifiche utente — proxy `/User/GetNotifiche`.
 *
 * NotificaDto: vedi `Portal/Models/Operation/DTO/NotificaDto.cs`.
 */

import { apiFetch } from './api';

export interface NotificaDto {
  id_notifica: number;
  id_tipo_notifica: number;
  tipo_notifica: string;
  id_media_type: number;
  media_type: string;
  nome: string;
  descrizione: string;
  data_notifica: string;
  id_utente: number;
  utente: string;
  notifica_completa: string;
  letta: boolean;
  id_tipo_entita: number | null;
  tipo_entita: string;
  id_entita: number | null;
  colore_notifica: string;
  id_reparto: number | null;
  reparto_segnalazione: string;
  id_segnalazione: number | null;
  id_genere_intervento: number | null;
  genere_intervento: string;
  id_struttura: number | null;
  struttura: string;
  urgente: boolean;
  segnalazione: string;
  camera: string;
  created_by_id: number | null;
  created_by: string;
  foto_base64: string;
}

export type TipoNotificaFilter = number | null;

export interface GetNotificheFilter {
  tipo_notifica?: TipoNotificaFilter;
  letta?: boolean | null;
}

export interface CheckNotificheNonLetteResponse {
  count: number;
  /** Eventuali altri campi tornati dal backend; allargabili senza rompere il client. */
  [extra: string]: unknown;
}

export async function getNotifiche(
  filters: GetNotificheFilter = {}
): Promise<NotificaDto[]> {
  return apiFetch<NotificaDto[]>('/User/GetNotifiche', {
    method: 'POST',
    body: filters,
  });
}

export async function getNotificaById(id_notifica: number): Promise<NotificaDto> {
  return apiFetch<NotificaDto>('/User/GetNotificaById', {
    method: 'POST',
    body: id_notifica,
  });
}

export async function checkNotificheNonLette(): Promise<CheckNotificheNonLetteResponse> {
  return apiFetch<CheckNotificheNonLetteResponse>('/User/CheckNotificheNonLette', {
    method: 'POST',
  });
}
