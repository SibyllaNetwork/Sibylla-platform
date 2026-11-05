// ─── CONNETTORE PAGHE ─────────────────────────────────────────────────────────
//  Invio del consuntivo mensile al software paghe in uso (Configurazione HR ›
//  Integrazione paghe). Il frontend prepara il contenuto (per TeamSystem il
//  file RILPRE) e lo passa al backend, che conosce le credenziali e fa la
//  consegna vera sul canale scelto: API del software, deposito su SFTP o email
//  al consulente con il file allegato.
//
//  Contratto BE: POST /Sibylla/hr/paghe/trasmetti → { esito: 'inviato', protocollo?, messaggio? }
//  Finché il connettore non è attivo (endpoint assente o backend non raggiungibile,
//  come nella demo online) l'invio risulta «simulato»: il file resta scaricabile.

import { ApiError, apiFetchSibylla } from './api'
import type { CanalePaghe, SoftwarePagheId } from '../store/pagheCatalogo'

export interface RichiestaInvioPaghe {
  software: SoftwarePagheId
  canale: CanalePaghe
  /** Mese di competenza (aaaa-mm). */
  mese: string
  formato: string
  /** Campi del collegamento non segreti (codici azienda, host, email…): i segreti li tiene il backend. */
  parametri: Record<string, string>
  file?: { nome: string; base64: string; record: number; lunghezzaRecord: number }
  riepilogo: Record<string, number>
  note?: string
}

export interface EsitoInvioPaghe {
  esito: 'inviato' | 'simulato'
  messaggio: string
  protocollo?: string
}

/** Chiavi dei campi segreti, mai inviate dal browser. */
const SEGRETI = /password|secret|token|apikey|chiave/i

export const parametriPubblici = (valori: Record<string, string>) =>
  Object.fromEntries(Object.entries(valori).filter(([k, v]) => !SEGRETI.test(k) && v?.trim()))

export async function inviaConsuntivoPaghe(req: RichiestaInvioPaghe): Promise<EsitoInvioPaghe> {
  try {
    const r = await apiFetchSibylla<{ esito?: string; messaggio?: string; protocollo?: string }>('hr/paghe/trasmetti', { method: 'POST', body: req })
    return { esito: 'inviato', messaggio: r?.messaggio ?? 'Consuntivo consegnato al software paghe.', protocollo: r?.protocollo }
  } catch (e) {
    // Connettore non ancora attivo: backend assente, rotta inesistente o servizio non configurato.
    const nonAttivo = !(e instanceof ApiError) || e.status === 404 || e.status === 503 || e.status === 501
    if (nonAttivo) {
      return { esito: 'simulato', messaggio: 'Connettore paghe non attivo su questo ambiente: invio simulato, il file è pronto da scaricare.' }
    }
    throw e
  }
}
