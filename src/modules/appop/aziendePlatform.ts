// ─── AZIENDE DI SIBYLLA PLATFORM ──────────────────────────────────────────────
//  Elenco delle aziende di Platform per il selettore "Collegamento a Sibylla
//  Platform" della nuova azienda Op (Sibylla Admin → Piattaforma → Sibylla Op!).
//  Fonte: Portal `POST /Sibylla/aziende/GetAziende` (come Gestione aziende del
//  sysadmin). L'id è l'id_azienda del token di Platform: è quello che Op.Api usa
//  per la BI di AppOp! (sibylla-op, schede 09 e 15). Senza Portal non si
//  inventano id: la pagina chiede l'id a mano.

import { apiFetchSibylla } from '../../services/api'

export interface AziendaPlatform {
  id: number
  nome: string
  partitaIva: string | null
}

interface AziendaPortal {
  id?: number
  id_azienda?: number
  nome?: string
  ragione_sociale?: string
  partita_iva?: string | null
  [key: string]: unknown
}

const daPortal = (a: AziendaPortal): AziendaPlatform | null => {
  const id = Number(a.id_azienda ?? a.id)
  const nome = (a.nome ?? a.ragione_sociale ?? '').toString().trim()
  return Number.isInteger(id) && id > 0 && nome ? { id, nome, partitaIva: a.partita_iva || null } : null
}

/** Aziende di Platform per nome; errore se il Portal non risponde (la pagina passa all'id inserito a mano). */
export async function elencoAziendePlatform(): Promise<AziendaPlatform[]> {
  const righe = await apiFetchSibylla<AziendaPortal[]>('aziende/GetAziende', { method: 'POST', body: {}, redirectOn401: false })
  if (!Array.isArray(righe)) throw new Error('Risposta del Portal non valida.')
  return righe
    .map(daPortal)
    .filter((a): a is AziendaPlatform => !!a)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
}
