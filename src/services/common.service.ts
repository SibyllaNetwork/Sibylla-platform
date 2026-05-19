/**
 * Endpoint generici — proxy `/Common/*`.
 * DTO: vedi `Portal/Models/DTO/Struttura.cs`, `TipiPagamento.cs`,
 *      `Portal/Models/Operation/Reparto.cs`, `OpzioneDiAccesso.cs`, `GenereIntervento.cs`.
 */

import { apiFetch } from './api';

export interface Struttura {
  id: number;
  id_TeamSystem: number;
  id_ratehawk: number;
  id_Vertical: string;
  nome: string;
  Categoria: string;
  Indirizzo: string;
  Zip_Code: string;
  Regione: string;
  City: string;
  Country: string;
  Descrizione: string;
  Indirizzo_Completo: string;
  Tipologia: number;
  Tipologiaoutlet: number;
  id_tipo_struttura: number;
  Opzione: string;
  identificativo: string;
  logo: string;
  id_azienda: number;
  lon: number;
  lat: number;
  attiva: boolean;
  telefono: string;
  id_pms: number | null;
  IsCustom: boolean;
  Sito_web: string;
  Email: string;
  Tassa_soggiorno: number;
  id_parent: number | null;
  /** Arrangiamenti tipizzati lato BE; per il FE platform è opaco. */
  Arrangiamenti?: unknown[];
}

export interface TipoPagamento {
  id: number;
  tipo: string;
}

export interface Reparto {
  id: number;
  Nome: string;
}

export interface OpzioneDiAccesso {
  id: number;
  nome: string;
  ordine: number;
  attivo: boolean;
}

export interface GenereIntervento {
  id: number;
  nome: string;
  id_reparto: number;
}

export interface NotificationSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: { p256dh: string; auth: string };
}

export interface GenericMessageResponse {
  message?: string;
  success?: boolean;
  [key: string]: unknown;
}

export function getStrutture(): Promise<Struttura[]> {
  return apiFetch<Struttura[]>('/Common/GetStrutture', { method: 'POST' });
}

export function getStruttureForUser(): Promise<Struttura[]> {
  return apiFetch<Struttura[]>('/Common/GetStruttureForUser', { method: 'POST' });
}

export function getReparti(): Promise<Reparto[]> {
  return apiFetch<Reparto[]>('/Common/GetReparti', { method: 'POST' });
}

export function getTipiPagamento(): Promise<TipoPagamento[]> {
  return apiFetch<TipoPagamento[]>('/Common/GetTipiPagamento', { method: 'POST' });
}

export function getOpzioniDiAccesso(): Promise<OpzioneDiAccesso[]> {
  return apiFetch<OpzioneDiAccesso[]>('/Common/GetOpzioniDiAccesso', {
    method: 'POST',
  });
}

export function getGeneriIntervento(): Promise<GenereIntervento[]> {
  return apiFetch<GenereIntervento[]>('/Common/GetGeneriIntervento', {
    method: 'POST',
  });
}

export function subscribeToNotifications(
  data: NotificationSubscription
): Promise<GenericMessageResponse> {
  return apiFetch<GenericMessageResponse>('/Common/SubscribeToNotifications', {
    method: 'POST',
    body: data,
  });
}

export function deleteSubscribeNotifications(
  data: NotificationSubscription
): Promise<GenericMessageResponse> {
  return apiFetch<GenericMessageResponse>('/Common/DeleteSubscribeNotifications', {
    method: 'POST',
    body: data,
  });
}
