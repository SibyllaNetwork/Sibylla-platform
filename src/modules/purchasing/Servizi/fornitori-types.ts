// Modello "Connettore fornitore servizi" — integrazione API con fornitori terzi
// (marketplace di esperienze, biglietterie, broker di noleggio) che mettono a
// disposizione il loro catalogo di servizi perché venga **rivenduto** sui canali
// Sibylla Network (Agorà / B2B / B2C).
//
// È il gemello di `admin/SibyllaAdminPanel/strutture/partner-types.ts`: quello
// importa inventario di STRUTTURE, questo importa inventario di SERVIZI. Le
// primitive comuni (auth, frequenze di sync, stato sync, regole di mapping)
// vengono riusate da lì, così etichette e semantica restano allineate.
//
// Differenza di dominio importante: un servizio Sibylla è prenotabile solo se
// appartiene a un TipoServizio, che ne definisce i campi del form di
// prenotazione. Per questo il connettore porta una **mappatura categorie**:
// categoria del fornitore → TipoServizio Sibylla. Senza mappatura il servizio
// viene importato ma resta non pubblicabile.

import type {
  AuthMode,
  FieldMappingRule,
  PartnerCredentials,
  SyncFrequency,
  SyncStatus,
} from '../../../admin/SibyllaAdminPanel/strutture/partner-types'
import type { MercatoServizio, TipoServizio } from './servizi-types'

// Primitive comuni ai due tipi di connettore: ri-esportate da qui perché i
// componenti dei Servizi non debbano importare dal dominio Strutture.
export type {
  AuthMode,
  FieldMappingRule,
  PartnerCredentials,
  SyncFrequency,
  SyncStatus,
}
export {
  AUTH_MODE_LABELS,
  SYNC_FREQUENCY_LABELS,
} from '../../../admin/SibyllaAdminPanel/strutture/partner-types'

export type FornitoreProvider =
  | 'getyourguide'   // marketplace esperienze e tour
  | 'viator'         // marketplace esperienze (TripAdvisor)
  | 'musement'       // esperienze e musei (TUI)
  | 'tiqets'         // biglietteria musei e attrazioni
  | 'civitatis'      // tour e visite guidate in lingua
  | 'klook'          // esperienze e trasporti, focus Asia
  | 'discovercars'   // broker noleggio veicoli
  | 'radical'        // deposito bagagli e servizi urbani
  | 'custom'         // endpoint REST/XML proprietario del fornitore

/**
 * Come il connettore tratta i servizi che importa:
 *  - `auto`        → pubblicati subito sui canali abilitati
 *  - `moderazione` → entrano come 'in-attesa' e passano dal flusso di
 *                    approvazione dei Servizi (StatoServizio)
 */
export type PubblicazioneImport = 'auto' | 'moderazione'

/** Cosa fare quando il fornitore rimuove un servizio dal proprio catalogo. */
export type PoliticaRimozione = 'disattiva' | 'elimina' | 'mantieni'

// ─── Mappatura categorie → TipoServizio ──────────────────────────────────────
// `categoriaFornitore` è la stringa così come arriva dal partner (es. "Skip the
// line", "Guided tours"); `tipoServizio` è l'id del TipoServizio Sibylla su cui
// atterrano i servizi di quella categoria.
export interface CategoryMappingRule {
  categoriaFornitore: string
  tipoServizio: TipoServizio | ''
}

// Configurazione per canale di vendita: markup applicato al prezzo netto del
// fornitore prima di pubblicare sul listino corrispondente.
export interface CanaleServizioConfig {
  abilitato: boolean
  markup: number
  taglineOverride: string
}

// Filtri sull'inventario importato: servono a limitare il catalogo ai servizi
// rilevanti per la rete, evitando di importare decine di migliaia di righe.
export interface FiltriImportServizi {
  paesi: string[]           // codici ISO ("IT", "ES", "FR")
  citta: string[]           // nomi città
  categorie: string[]       // categorie del fornitore da includere
  prezzoMax: number         // 0 = nessun tetto
  soloConDisponibilita: boolean
}

// Override visivo del fornitore sulle schede pubbliche del servizio.
export interface UiOverrideServizi {
  logoUrl: string
  paletteAccent: string
  mostraBadgeFornitore: boolean   // mostra "via GetYourGuide" nella card
}

export interface FornitoreServiziConnector {
  id: string
  nome: string
  provider: FornitoreProvider
  descrizione: string

  // Endpoint + auth
  baseUrl: string
  authMode: AuthMode
  credentials: PartnerCredentials

  // Sincronizzazione
  syncFrequency: SyncFrequency
  ultimoSync?: string             // ISO datetime
  statoSync: SyncStatus
  messaggioSync: string
  serviziImportati: number

  // Import
  filtri: FiltriImportServizi
  pubblicazione: PubblicazioneImport
  politicaRimozione: PoliticaRimozione

  // Mappature
  categoryMapping: CategoryMappingRule[]
  fieldMapping: FieldMappingRule[]

  // Pubblicazione sui canali Sibylla Network
  canali: Record<MercatoServizio, CanaleServizioConfig>

  uiOverride: UiOverrideServizi

  attivo: boolean
}

export interface FornitoreServiziForm {
  nome: string
  provider: FornitoreProvider
  descrizione: string

  baseUrl: string
  authMode: AuthMode
  credApiKey: string
  credClientId: string
  credClientSecret: string
  credUsername: string
  credPassword: string
  credBearerToken: string
  credTenantId: string

  syncFrequency: SyncFrequency
  pubblicazione: PubblicazioneImport
  politicaRimozione: PoliticaRimozione

  // filtri come CSV
  filtriPaesi: string
  filtriCitta: string
  filtriCategorie: string
  filtriPrezzoMax: string
  filtriSoloDisponibili: boolean

  categoryMapping: CategoryMappingRule[]
  fieldMapping: FieldMappingRule[]

  canaleAgoraAbilitato: boolean
  canaleAgoraMarkup: string
  canaleAgoraTagline: string
  canaleB2BAbilitato: boolean
  canaleB2BMarkup: string
  canaleB2BTagline: string
  canaleB2CAbilitato: boolean
  canaleB2CMarkup: string
  canaleB2CTagline: string

  overrideLogoUrl: string
  overridePaletteAccent: string
  overrideMostraBadgeFornitore: boolean

  attivo: boolean
}

// ─── Metadati provider ───────────────────────────────────────────────────────
// `color` è il colore di brand del fornitore: è un dato dell'anagrafica, non un
// colore di tema (come in PROVIDERS_META delle strutture).
// `categorieTipiche` alimenta la mappatura categorie quando non c'è ancora una
// risposta reale dell'endpoint.
export const FORNITORI_META: Array<{
  id: FornitoreProvider
  label: string
  icon: string                    // FA name (senza prefisso)
  color: string
  defaultBaseUrl: string
  defaultAuth: AuthMode
  description: string
  categorieTipiche: string[]
}> = [
  {
    id: 'getyourguide', label: 'GetYourGuide', icon: 'ticket', color: '#FF5533',
    defaultBaseUrl: 'https://api.getyourguide.com/1', defaultAuth: 'api-key',
    description: 'Marketplace di esperienze, tour e attività',
    categorieTipiche: ['Guided tours', 'Skip the line', 'Day trips', 'Water activities', 'Food & wine'],
  },
  {
    id: 'viator', label: 'Viator', icon: 'compass', color: '#00A680',
    defaultBaseUrl: 'https://api.viator.com/partner', defaultAuth: 'api-key',
    description: 'Esperienze e tour del gruppo TripAdvisor',
    categorieTipiche: ['Tours & Sightseeing', 'Attractions & Tickets', 'Outdoor Activities', 'Transfers'],
  },
  {
    id: 'musement', label: 'Musement', icon: 'landmark', color: '#1A1A1A',
    defaultBaseUrl: 'https://sandbox.musement.com/api/v3', defaultAuth: 'oauth2',
    description: 'Musei, monumenti ed esperienze culturali',
    categorieTipiche: ['Museums', 'Monuments', 'Guided visits', 'Shows & concerts'],
  },
  {
    id: 'tiqets', label: 'Tiqets', icon: 'ticket-simple', color: '#F45B69',
    defaultBaseUrl: 'https://api.tiqets.com/v2', defaultAuth: 'bearer',
    description: 'Biglietteria per musei e attrazioni, ingresso immediato',
    categorieTipiche: ['Museums', 'Landmarks', 'Zoos & aquariums', 'Theme parks'],
  },
  {
    id: 'civitatis', label: 'Civitatis', icon: 'person-hiking', color: '#E8552D',
    defaultBaseUrl: 'https://api.civitatis.com/v1', defaultAuth: 'api-key',
    description: 'Visite guidate ed escursioni in lingua',
    categorieTipiche: ['Free tours', 'Excursions', 'Guided visits', 'Transfers'],
  },
  {
    id: 'klook', label: 'Klook', icon: 'globe', color: '#FF5722',
    defaultBaseUrl: 'https://open.klook.com/v3', defaultAuth: 'api-key',
    description: 'Esperienze, attrazioni e trasporti',
    categorieTipiche: ['Attractions', 'Tours', 'Transport', 'Wellness'],
  },
  {
    id: 'discovercars', label: 'Discover Cars', icon: 'car', color: '#0F6FC5',
    defaultBaseUrl: 'https://api.discovercars.com/v2', defaultAuth: 'basic',
    description: 'Broker di noleggio veicoli con copertura globale',
    categorieTipiche: ['Car rental', 'Van rental', 'Airport pickup'],
  },
  {
    id: 'radical', label: 'Radical Storage', icon: 'suitcase-rolling', color: '#00B2A9',
    defaultBaseUrl: 'https://api.radicalstorage.com/v1', defaultAuth: 'bearer',
    description: 'Deposito bagagli e servizi urbani',
    categorieTipiche: ['Luggage storage', 'City services'],
  },
  {
    id: 'custom', label: 'Custom REST', icon: 'gear', color: '#5C5C5C',
    defaultBaseUrl: '', defaultAuth: 'api-key',
    description: 'Endpoint REST/XML proprietario del fornitore',
    categorieTipiche: [],
  },
]

export const fornitoreMeta = (p: FornitoreProvider) =>
  FORNITORI_META.find(x => x.id === p) || FORNITORI_META[FORNITORI_META.length - 1]

export const PUBBLICAZIONE_LABELS: Record<PubblicazioneImport, string> = {
  'auto':        'Pubblica automaticamente',
  'moderazione': 'Passa dalla moderazione',
}

export const POLITICA_RIMOZIONE_LABELS: Record<PoliticaRimozione, string> = {
  'disattiva': 'Disattiva il servizio',
  'elimina':   'Elimina il servizio',
  'mantieni':  'Mantieni con ultimo prezzo noto',
}

/** Quante categorie del fornitore hanno un TipoServizio di destinazione. */
export const categorieMappate = (c: FornitoreServiziConnector): number =>
  c.categoryMapping.filter(r => r.tipoServizio !== '').length

/**
 * Un connettore è pubblicabile solo se ha un canale abilitato e almeno una
 * categoria mappata: senza mappatura i servizi importati non avrebbero i campi
 * di prenotazione del TipoServizio e resterebbero invendibili.
 */
export const connettorePubblicabile = (c: FornitoreServiziConnector): boolean =>
  categorieMappate(c) > 0 && (c.canali.agora.abilitato || c.canali.b2b.abilitato || c.canali.b2c.abilitato)
