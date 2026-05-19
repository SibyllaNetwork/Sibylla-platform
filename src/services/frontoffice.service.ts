/**
 * Front Office — proxy `/FrontOffice/*`.
 *
 * I DTO completi vivono in `Portal/Models/Operation/*.cs` e
 * `Portal/Models/Filters/*.cs`. Per il FE platform tipiamo solo i campi
 * effettivamente usati e teniamo gli altri come `unknown` per non blindare
 * l'integrazione su evoluzioni del modello server.
 */

import { apiFetch } from './api';

export interface CheckInFilter {
  id_struttura?: number | null;
  data_da?: string | null;
  data_a?: string | null;
  /** Campi extra accettati dal backend senza modifiche frontend. */
  [key: string]: unknown;
}

export interface InCasaFilter extends CheckInFilter {}

export interface ArriviDto {
  id_prenotazione: number;
  id_dettaglio_prenotazione?: number;
  cliente?: string;
  arrivo?: string;
  partenza?: string;
  camera?: string;
  tipo_camera?: string;
  numero_persone?: number;
  /** Lasciamo aperto: il DTO server è ricco, evolve indipendentemente. */
  [key: string]: unknown;
}

export interface InCasaDto extends ArriviDto {}

export interface Nazionalita {
  id: number;
  nome: string;
  codice?: string;
}

export interface LookUpBase {
  id: number;
  nome: string;
}

export interface CheckInDto {
  id?: number;
  id_dettaglio_prenotazione?: number;
  nome?: string;
  cognome?: string;
  data_nascita?: string;
  documento?: string;
  numero_documento?: string;
  [key: string]: unknown;
}

export interface CheckOutDto {
  id_dettaglio_prenotazione: number;
  [key: string]: unknown;
}

export interface ServizioDto {
  id_servizio: number;
  id_dettaglio_prenotazione?: number;
  quantita?: number;
  note?: string;
  [key: string]: unknown;
}

export interface ServiziFilter {
  id_servizio: number;
  [key: string]: unknown;
}

export interface TurniFilter {
  id_struttura?: number;
  mese?: number;
  anno?: number;
  [key: string]: unknown;
}

export interface TurniPersonaleDto {
  id?: number;
  id_utente?: number;
  utente?: string;
  data?: string;
  [key: string]: unknown;
}

export interface GenericServiceResponseOp {
  Success: boolean;
  ErrorMessage?: string;
  Data?: unknown;
  [key: string]: unknown;
}

export function getArrivi(filter: CheckInFilter = {}): Promise<ArriviDto[]> {
  return apiFetch<ArriviDto[]>('/FrontOffice/GetArrivi', {
    method: 'POST',
    body: filter,
  });
}

export function getInCasa(filter: InCasaFilter = {}): Promise<InCasaDto[]> {
  return apiFetch<InCasaDto[]>('/FrontOffice/GetInCasa', {
    method: 'POST',
    body: filter,
  });
}

export function getNazionalita(): Promise<Nazionalita[]> {
  return apiFetch<Nazionalita[]>('/FrontOffice/GetNazionalita');
}

export function getTipiDocumento(): Promise<LookUpBase[]> {
  return apiFetch<LookUpBase[]>('/FrontOffice/GetTipiDocumento');
}

export function checkInOspite(
  dto: CheckInDto
): Promise<GenericServiceResponseOp> {
  return apiFetch<GenericServiceResponseOp>('/FrontOffice/CheckInOspite', {
    method: 'POST',
    body: dto,
  });
}

export function checkOut(dto: CheckOutDto): Promise<GenericServiceResponseOp> {
  return apiFetch<GenericServiceResponseOp>('/FrontOffice/CheckOut', {
    method: 'POST',
    body: dto,
  });
}

export function getCheckInList(
  id_dettaglio_prenotazione: number
): Promise<CheckInDto[]> {
  return apiFetch<CheckInDto[]>('/FrontOffice/GetCheckInList', {
    method: 'POST',
    body: { id: id_dettaglio_prenotazione },
  });
}

export function getServizi(id_struttura: number): Promise<LookUpBase[]> {
  return apiFetch<LookUpBase[]>('/FrontOffice/GetServizi', {
    method: 'POST',
    body: { id_struttura },
  });
}

export function getDettaglioServizio(
  filter: ServiziFilter
): Promise<LookUpBase[]> {
  return apiFetch<LookUpBase[]>('/FrontOffice/GetDettaglioServizio', {
    method: 'POST',
    body: filter,
  });
}

export function insertServizioCamera(
  dto: ServizioDto
): Promise<GenericServiceResponseOp> {
  return apiFetch<GenericServiceResponseOp>(
    '/FrontOffice/InsertServizioCamera',
    { method: 'POST', body: dto }
  );
}

export function getTurni(
  filter: TurniFilter = {}
): Promise<TurniPersonaleDto[]> {
  return apiFetch<TurniPersonaleDto[]>('/FrontOffice/GetTurni', {
    method: 'POST',
    body: filter,
  });
}
