export type ClientStato = 'attivo' | 'sospeso'

export type TipologiaCategoria =
  | 'hotel'
  | 'bnb'
  | 'appartamenti'
  | 'case-vacanze'
  | 'ostello'
  | 'studentato'
  | 'ristorante'
  | 'bar'
  | 'centro-sportivo'

export interface Cliente {
  id: number
  nome: string
  categoria: TipologiaCategoria
  classificazione: string  // es. "3★" / "Resort" / "Boutique" / "Luxury" / "Agriturismo" — vuota se non applicabile
  citta: string
  camere: number
  valuta: string
  lingua: string
  stato: ClientStato
  email: string
  tel: string
}

export interface Modulo {
  id: string
  label: string
  desc: string
  pages: string[]
  /**
   * Voci del menu del Configuratore (Impostazioni) visibili per questo modulo.
   * Undefined = tutte visibili (retrocompatibilità con i moduli esistenti).
   */
  configuratoreItems?: string[]
}

export interface Ruolo {
  id: string
  nome: string
  desc: string
  colore: string
}

export type FnType = 'completo' | 'lettura' | 'nascosta'

export interface UserRow {
  id: number
  nome: string
  email: string
  ruolo: string
  attivo: boolean
}

/** Riga della matrice camere per piano (chiave = sigla tipologia camera). */
export interface PianoRow {
  nome: string
  camere: Record<string, number>
}

export interface NewClientForm {
  nome: string
  categoria: TipologiaCategoria
  classificazione: string
  citta: string
  camere: string
  email: string
  /** Moduli assegnati al cliente alla creazione (id da PACCHETTI_INIT). */
  moduli: string[]
  // ─── Dati aggiuntivi struttura ───────────────────────────────
  pms: 'Sibylla' | 'Esterno'
  tipologiaGruppo: string
  numeroPiani: number
  piani: PianoRow[]
  // Numerazione automatica camere (schema "per piano": piano×10^cifre + progressivo).
  numStart: number
  numDigits: number
  /** Override manuali dei numeri camera, chiave `${pianoIdx}|${slot}`. */
  roomOverrides: Record<string, string>
  /** Tipologia assegnata a ciascun numero camera, chiave `${pianoIdx}|${slot}`. */
  roomTypes: Record<string, string>
  /** Posti base + aggiunti per tipologia camera (chiave = sigla tipologia). */
  postiConfig: Record<string, { base: number; extra: number }>
  /** Nome personalizzato della tipologia (es. "Michelangelo"), chiave = sigla. */
  tipologieNomi: Record<string, string>
  /** Posti aggiunti della singola camera fisica, chiave `${pianoIdx}|${slot}`. */
  roomExtra: Record<string, number>
  indirizzo: string
  localita: string
  provincia: string
  cap: string
  nazione: string
  telefono: string
  piva: string
  codiceSdi: string
  pec: string
  tassaGiornaliera: string
  immaginePrincipale: string
  logoStruttura: string
  gallery: string[]
  breveDescrizione: string
  caratteristiche: string[]
}

export interface MasterForm {
  nome: string
  cognome: string
  email: string
  telefono: string
  ruolo: string
}

export interface ModuloForm {
  nome: string
  desc: string
  pagesSet: Set<string>
  /** Voci del Configuratore visibili (id da configuratoriList). */
  configItemsSet: Set<string>
}

export interface RuoloForm {
  nome: string
  desc: string
  colore: string
}

export type AdminTab =
  | 'struttura'
  | 'moduli'
  | 'pacchetti'
  | 'ruoli'
  | 'funzioni'
  | 'utenti'
  | 'associazioni'

/**
 * Associazione di un utente: per ciascuna struttura collegata, l'insieme dei ruoli
 * specifici di quella struttura (un utente può avere ruoli diversi per struttura).
 */
export interface UserAssoc {
  /** strutturaId → id dei ruoli per quella struttura. */
  strutture: Record<string, string[]>
}

/** Sezione di "Configurazione piattaforma" (modalità separata dalla gestione clienti). */
export type PlatformSection = 'catalogo' | 'servizi' | 'banner' | 'agora-console'

/** Due modalità top-level del pannello admin: gestione clienti vs configurazione piattaforma. */
export type AdminMode = 'clients' | 'platform'

/**
 * Intestatario del contratto (cliente): l'entità che sottoscrive il contratto e
 * possiede una o più strutture (Cliente). I `moduli` sottoscritti definiscono il
 * menu che il cliente vede da loggato; `struttureIds` referenzia CLIENTS_INIT.
 */
export interface Intestatario {
  id: string
  nome: string
  email?: string
  moduli: string[]
  struttureIds: number[]
}
