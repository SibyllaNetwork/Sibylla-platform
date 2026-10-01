// ─── CLIENT OP.API ────────────────────────────────────────────────────────────
//  Chiamate alle API di amministrazione di Op.Api (backend dell'app Op!), per la
//  pagina "Sibylla Op!" di Amministrazione piattaforma: clienti indipendenti,
//  reparti e moduli, dipendenti e inviti. Contratto:
//  sibylla-op/docs/integrazione-sibylla/09-clienti-indipendenti.md.
//
//  Autenticazione: sibylla-platform non ha un login proprio, quindi per ora
//  Op.Api apre le API di amministrazione a chiunque (Amministrazione:AccessoLibero,
//  solo fuori dalla produzione) e la pagina non manda credenziali. Solo nella build
//  di sviluppo vale anche la chiave REACT_APP_OP_ADMIN_KEY (header
//  X-Chiave-Amministrazione), mai inclusa nelle build di produzione.

import type { LivelloOp, RepartiModuli, RepartoOp } from './opCatalogo'

const OP_API_URL = process.env.REACT_APP_OP_API_URL || 'http://localhost:5235'
const CHIAVE_SVILUPPO = process.env.NODE_ENV === 'development' ? process.env.REACT_APP_OP_ADMIN_KEY : undefined

export class OpApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
  }
}

async function opFetch<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  if (body !== undefined) headers.set('Content-Type', 'application/json')
  if (CHIAVE_SVILUPPO) headers.set('X-Chiave-Amministrazione', CHIAVE_SVILUPPO)

  let res: Response
  try {
    res = await fetch(`${OP_API_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new OpApiError(0, 'Op.Api non raggiungibile. Controlla la connessione o l’indirizzo del server.')
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  const json = text ? JSON.parse(text) : undefined
  if (!res.ok) {
    const detail = json?.detail || json?.title
    const msg = res.status === 401
      ? 'Op.Api non accetta ancora la pagina: va attivato l’accesso alle API di amministrazione sul server.'
      : detail || `Errore ${res.status}`
    throw new OpApiError(res.status, msg)
  }
  return json as T
}

// ─── Tipi (come i DTO di Op.Api) ──────────────────────────────────────────────

export type StatoCliente = 'attivo' | 'sospeso'
export type PianoCliente = 'base' | 'completo' | 'personalizzato'

export interface ClienteOp {
  id: number
  ragioneSociale: string
  partitaIva: string | null
  stato: StatoCliente
  piano: PianoCliente
  attivoDal: string
  scadeIl: string | null
  dipendenti: number
  dipendentiAttivi: number
  reparti: RepartoOp[]
}

export interface DatiCliente {
  ragioneSociale: string
  partitaIva: string | null
  indirizzo: string | null
  referente: string | null
  emailReferente: string | null
  telefono: string | null
  piano: PianoCliente
  attivoDal: string | null
  scadeIl: string | null
  note: string | null
}

export interface DettaglioCliente extends DatiCliente {
  id: number
  stato: StatoCliente
  creatoIl: string
  reparti: RepartiModuli
  strutture: { id: number; nome: string; indirizzo: string | null }[]
}

export type StatoDipendente = 'invitato' | 'attivo' | 'bloccato'

export interface DipendenteOp {
  id: number
  nome: string
  cognome: string
  email: string
  livello: LivelloOp
  reparti: RepartoOp[]
  responsabileReparti: RepartoOp[]
  hr: boolean
  stato: StatoDipendente
  invitoScadeIl: string | null
  ultimoAccesso: string | null
  /** Moduli e pagine spenti per il dipendente, per reparto ("pulizie:camere", "magazzino:magazzino.report"). */
  esclusi: string[]
}

export interface DipendenteRichiesta {
  nome: string
  cognome: string
  email: string
  livello: LivelloOp
  reparti: RepartoOp[]
  responsabileReparti: RepartoOp[]
  hr: boolean
  inviaInvito?: boolean
  /** Moduli e pagine da spegnere, solo tra quelli attivi nei suoi reparti. */
  esclusi?: string[]
}

export interface InvitoOp {
  codice: string
  scadeIl: string
  emailMascherata: string
}

// ─── API /admin/indipendenti ──────────────────────────────────────────────────

const B = '/admin/indipendenti'

export const opAdminApi = {
  clienti: () => opFetch<ClienteOp[]>(B),
  cliente: (id: number) => opFetch<DettaglioCliente>(`${B}/${id}`),
  nuovoCliente: (dati: DatiCliente, reparti: Partial<Record<RepartoOp, string[] | null>>, nomeSede?: string) =>
    opFetch<DettaglioCliente>(B, 'POST', { dati, reparti, nomeSede }),
  aggiornaCliente: (id: number, dati: DatiCliente) => opFetch<DettaglioCliente>(`${B}/${id}`, 'PUT', dati),
  stato: (id: number, stato: StatoCliente) => opFetch<void>(`${B}/${id}/stato`, 'PUT', { stato }),
  reparti: (id: number, reparti: RepartiModuli) => opFetch<DettaglioCliente>(`${B}/${id}/reparti`, 'PUT', { reparti }),
  dipendenti: (id: number) => opFetch<DipendenteOp[]>(`${B}/${id}/dipendenti`),
  /** Dati fittizi in tutte le sezioni (dipendenti ipotetici e dati clonati dall'azienda di prova), una volta sola. */
  esempio: (id: number) => opFetch<{ dipendenti: number; righe: number; utenzeReali: number }>(`${B}/${id}/esempio`, 'POST'),
  nuovoDipendente: (id: number, d: DipendenteRichiesta) =>
    opFetch<{ dipendente: DipendenteOp; invito: InvitoOp | null }>(`${B}/${id}/dipendenti`, 'POST', d),
  aggiornaDipendente: (id: number, idDip: number, d: DipendenteRichiesta) => opFetch<DipendenteOp>(`${B}/${id}/dipendenti/${idDip}`, 'PUT', d),
  invito: (id: number, idDip: number) => opFetch<InvitoOp>(`${B}/${id}/dipendenti/${idDip}/invito`, 'POST'),
  blocco: (id: number, idDip: number, bloccato: boolean) => opFetch<DipendenteOp>(`${B}/${id}/dipendenti/${idDip}/blocco`, 'PUT', { bloccato }),
  elimina: (id: number, idDip: number) => opFetch<void>(`${B}/${id}/dipendenti/${idDip}`, 'DELETE'),
}

// Configuratore → App Op! di un'azienda collegata, finché il Portal non espone le
// azioni OpApp (scheda 13): Op.Api con il simulatore di Sibylla gestisce moduli e
// utenze dell'azienda del simulatore. 404 quando Op.Api usa Sibylla vera.
const C = '/admin/collegata'

export interface ConfigCollegata {
  azienda: string
  reparti: RepartiModuli
  dipendenti: DipendenteOp[]
}

export const opCollegataApi = {
  config: () => opFetch<ConfigCollegata>(C),
  reparti: (reparti: RepartiModuli) => opFetch<void>(`${C}/reparti`, 'PUT', { reparti }),
  nuovoDipendente: (d: DipendenteRichiesta) => opFetch<{ dipendente: DipendenteOp; invito: InvitoOp | null }>(`${C}/dipendenti`, 'POST', d),
  aggiornaDipendente: (idDip: number, d: DipendenteRichiesta) => opFetch<DipendenteOp>(`${C}/dipendenti/${idDip}`, 'PUT', d),
  invito: (idDip: number) => opFetch<InvitoOp>(`${C}/dipendenti/${idDip}/invito`, 'POST'),
}

export const formatoData = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
