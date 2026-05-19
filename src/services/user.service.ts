/**
 * Endpoint utente — proxy `/User/*`.
 * DTO: vedi `Portal/Models/Operation/UserInfo.cs`, `UserQuickInfo.cs`,
 *      `Portal/Models/DTO/Op/Modifica*Dto.cs`.
 */

import { apiFetch } from './api';

export interface Reparto {
  id: number;
  nome: string;
  colore?: string;
}

export interface Housekeeping {
  /** Campi specifici housekeeping; per il FE platform basta tenerlo opaco. */
  [key: string]: unknown;
}

export type StatoTimbratura = 0 | 1 | 2 | -1;

export interface UserQuickInfo {
  id: number;
  nome: string;
  cognome: string;
  id_reparto: number;
  reparto: string;
  id_opzione_accesso: number | null;
  opzione_accesso: string;
  data_ingresso: string | null;
  data_uscita: string | null;
  stato_timbratura: StatoTimbratura;
  id_struttura: number | null;
  struttura: string;
  id_camera: string;
  stato_camera: string;
  multi: boolean;
  housekeeping: Housekeeping | null;
  reparti: Reparto[];
}

export interface UserInfo extends UserQuickInfo {
  email: string;
  img: string;
}

export interface GenericResponse {
  success?: boolean;
  error?: string;
  error_message?: string;
  message?: string;
  /** allargabile per cambiamenti retro-compatibili */
  [key: string]: unknown;
}

export function getInfo(): Promise<UserInfo> {
  return apiFetch<UserInfo>('/User/GetInfo', { method: 'POST' });
}

export function getQuickInfo(): Promise<UserQuickInfo> {
  return apiFetch<UserQuickInfo>('/User/GetQuickInfo', { method: 'POST' });
}

export function modificaPassword(
  VecchiaPassword: string,
  NuovaPassword: string
): Promise<GenericResponse> {
  return apiFetch<GenericResponse>('/User/ModificaPassword', {
    method: 'POST',
    body: { VecchiaPassword, NuovaPassword },
  });
}

export function modificaEmail(NuovaEmail: string): Promise<GenericResponse> {
  return apiFetch<GenericResponse>('/User/ModificaEmail', {
    method: 'POST',
    body: { NuovaEmail },
  });
}

export function modificaNomeUtente(payload: {
  nome: string;
  cognome: string;
}): Promise<GenericResponse> {
  return apiFetch<GenericResponse>('/User/ModificaNomeUtente', {
    method: 'POST',
    body: payload,
  });
}

export function uploadImg(payload: {
  base64: string;
  user_id: number;
}): Promise<boolean> {
  return apiFetch<boolean>('/User/UploadImg', {
    method: 'POST',
    body: payload,
  });
}
