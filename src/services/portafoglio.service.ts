/**
 * Portafoglio — `Portal/SibyllaApi/Controllers/PortafoglioController.cs`.
 *
 * Esposto sotto la rotta /Portafoglio (controller-style), quindi i path sono
 * `Portafoglio/<azione>`.
 */

import { apiFetchSibylla } from './api';

export interface TransazioneDto {
  id?: number;
  data?: string;
  importo?: number;
  causale?: string;
  tipo?: string;
  saldo_progressivo?: number;
  id_struttura?: number;
  utente?: string;
  [key: string]: unknown;
}

export interface DettaglioTransazione {
  id_transazione: number;
  righe: Array<{
    descrizione: string;
    importo: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface SaldoDto {
  saldo: number;
  /** Eventuale split per voce o per struttura */
  [key: string]: unknown;
}

export function getTransazioni(filter: {
  id_struttura?: number;
  data_da?: string;
  data_a?: string;
} = {}): Promise<TransazioneDto[]> {
  return apiFetchSibylla<TransazioneDto[]>('Portafoglio/GetTransazioni', {
    method: 'POST',
    body: filter,
  });
}

export function getTransazioniPersonale(filter: {
  data_da?: string;
  data_a?: string;
} = {}): Promise<TransazioneDto[]> {
  return apiFetchSibylla<TransazioneDto[]>(
    'Portafoglio/GetTransazioniPersonale',
    { method: 'POST', body: filter }
  );
}

export function getDettaglioTransazione(
  id_transazione: number
): Promise<DettaglioTransazione> {
  return apiFetchSibylla<DettaglioTransazione>(
    'Portafoglio/GetDettaglioTransazione',
    { method: 'POST', body: { id_transazione } }
  );
}

export function getSaldo(): Promise<SaldoDto> {
  return apiFetchSibylla<SaldoDto>('Portafoglio/GetSaldo', { method: 'POST' });
}

export function getSaldoAziendale(
  id_struttura?: number
): Promise<SaldoDto> {
  return apiFetchSibylla<SaldoDto>('Portafoglio/GetSaldoAziendale', {
    method: 'POST',
    body: id_struttura ? { id_struttura } : {},
  });
}

export function startRicarica(payload: {
  importo: number;
  metodo?: string;
}): Promise<{ url?: string; success: boolean }> {
  return apiFetchSibylla('Portafoglio/StartRicarica', {
    method: 'POST',
    body: payload,
  });
}

export function startRicaricaPersonale(payload: {
  importo: number;
  metodo?: string;
}): Promise<{ url?: string; success: boolean }> {
  return apiFetchSibylla('Portafoglio/StartRicaricaPersonale', {
    method: 'POST',
    body: payload,
  });
}

export function ricaricaBonifico(payload: {
  importo: number;
  iban?: string;
}): Promise<{ success: boolean; reference?: string }> {
  return apiFetchSibylla('Portafoglio/RicaricaBonifico', {
    method: 'POST',
    body: payload,
  });
}
