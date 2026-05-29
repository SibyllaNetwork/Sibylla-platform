// Modello "Connettore partner" — integrazione con OTA, channel manager,
// PMS e wholesaler esterni che mettono a disposizione il loro inventario di
// strutture ricettive per i canali di vendita Sibylla Network (Agorà / B2B / B2C).
//
// La pubblicazione del contenuto partner mantiene la stessa UI/UX dei canali
// (definita in Struttura): cambia solo la fonte dei dati.

import type { CanaleVendita } from './types'

export type PartnerProvider =
  | 'booking'      // Booking.com (OTA)
  | 'expedia'      // Expedia (OTA)
  | 'airbnb'       // Airbnb
  | 'hotelbeds'    // Hotelbeds (wholesaler B2B)
  | 'ratehawk'     // RateHawk (wholesaler B2B)
  | 'siteminder'   // SiteMinder (channel manager)
  | 'cloudbeds'    // Cloudbeds (PMS / channel)
  | 'amadeus'      // Amadeus / TravelClick
  | 'custom'       // Endpoint REST/XML proprietario

export type AuthMode = 'api-key' | 'oauth2' | 'basic' | 'bearer'

export type SyncFrequency = 'manual' | '15min' | 'hourly' | 'every-4h' | 'daily' | 'weekly'

export type SyncStatus = 'ok' | 'errore' | 'in-corso' | 'mai-eseguito'

export interface PartnerCredentials {
  apiKey?: string
  clientId?: string
  clientSecret?: string
  username?: string
  password?: string
  bearerToken?: string
  tenantId?: string
}

// Configurazione per canale di vendita di un singolo connettore.
// markup: percentuale aggiunta al prezzo del partner prima di pubblicare.
// taglineOverride: opzionale, override del messaggio marketing per il canale.
export interface CanaleConnectorConfig {
  abilitato: boolean
  markup: number
  taglineOverride: string
}

// Mappatura campi: a quale campo Sibylla mappa un campo del partner.
export interface FieldMappingRule {
  partnerField: string
  sibyllaField: string
  trasformazione: string   // es. 'lowercase', 'trim', 'star→★'
}

// Filtri sugli elementi importati: utili per limitare l'inventario alle
// strutture rilevanti per la nostra rete.
export interface FiltriImport {
  paesi: string[]                // codici ISO ("IT", "ES", "FR")
  regioni: string[]              // nomi regione
  tipi: string[]                 // hotel, b&b, apartment…
  classificazioneMin: string     // es. '3★'
}

// Override visivo del partner sui canali (opzionale).
// uiOverride.paletteAccent → CSS color usato come accento per le card del
// partner; uiOverride.logoUrl → logo mostrato nelle schede pubbliche.
// Le UI dei canali (Agorà/B2B = piattaforma, B2C = sibyllanetwork.com)
// restano invariate: il branding viene applicato solo come variante visiva.
export interface UiOverride {
  logoUrl: string
  paletteAccent: string
  mostraBadgePartner: boolean    // mostra "via Booking" nella card pubblica
}

export interface PartnerConnector {
  id: string
  nome: string
  provider: PartnerProvider
  descrizione: string

  // Endpoint + auth
  baseUrl: string
  authMode: AuthMode
  credentials: PartnerCredentials

  // Sincronizzazione
  syncFrequency: SyncFrequency
  ultimoSync?: string            // ISO datetime
  statoSync: SyncStatus
  messaggioSync: string
  struttureImportate: number

  // Filtri import
  filtri: FiltriImport

  // Pubblicazione sui canali Sibylla Network
  canali: Record<CanaleVendita, CanaleConnectorConfig>

  // Mappatura campi
  fieldMapping: FieldMappingRule[]

  // Override UI (opzionale)
  uiOverride: UiOverride

  // Stato
  attivo: boolean
}

export interface PartnerConnectorForm {
  nome: string
  provider: PartnerProvider
  descrizione: string

  baseUrl: string
  authMode: AuthMode
  // credenziali come stringhe singole nel form
  credApiKey: string
  credClientId: string
  credClientSecret: string
  credUsername: string
  credPassword: string
  credBearerToken: string
  credTenantId: string

  syncFrequency: SyncFrequency

  // filtri come CSV
  filtriPaesi: string
  filtriRegioni: string
  filtriTipi: string
  filtriClassMin: string

  // canali
  canaleAgoraAbilitato: boolean
  canaleAgoraMarkup: string
  canaleAgoraTagline: string
  canaleB2BAbilitato:   boolean
  canaleB2BMarkup:      string
  canaleB2BTagline:     string
  canaleB2CAbilitato:   boolean
  canaleB2CMarkup:      string
  canaleB2CTagline:     string

  // mapping rules
  fieldMapping: FieldMappingRule[]

  // override UI
  overrideLogoUrl: string
  overridePaletteAccent: string
  overrideMostraBadgePartner: boolean

  attivo: boolean
}

// ─── Metadati provider ──────────────────────────────────────────────────────
export const PROVIDERS_META: Array<{
  id: PartnerProvider
  label: string
  icon: string                 // FA name (passthrough)
  color: string
  defaultBaseUrl: string
  defaultAuth: AuthMode
  description: string
}> = [
  { id: 'booking',    label: 'Booking.com',  icon: 'building',  color: '#003580', defaultBaseUrl: 'https://distribution-xml.booking.com/2.x', defaultAuth: 'basic',     description: 'OTA — feed XML/JSON di disponibilità e prezzi' },
  { id: 'expedia',    label: 'Expedia',      icon: 'plane',     color: '#FCBC00', defaultBaseUrl: 'https://services.expediapartnercentral.com/eqc',           defaultAuth: 'oauth2',    description: 'OTA Expedia Group' },
  { id: 'airbnb',     label: 'Airbnb',       icon: 'house',     color: '#FF5A5F', defaultBaseUrl: 'https://api.airbnb.com/v2',                                defaultAuth: 'oauth2',    description: 'Short stays e listings privati' },
  { id: 'hotelbeds',  label: 'Hotelbeds',    icon: 'briefcase', color: '#00B5AD', defaultBaseUrl: 'https://api.test.hotelbeds.com/hotel-api/1.0',             defaultAuth: 'api-key',   description: 'Wholesaler B2B — net rates' },
  { id: 'ratehawk',   label: 'RateHawk',     icon: 'globe',     color: '#FF8C00', defaultBaseUrl: 'https://api.ratehawk.com/v3',                              defaultAuth: 'bearer',    description: 'Wholesaler B2B — bedbank' },
  { id: 'siteminder', label: 'SiteMinder',   icon: 'tower-broadcast', color: '#27408B', defaultBaseUrl: 'https://api.siteminder.com',                        defaultAuth: 'oauth2',    description: 'Channel manager' },
  { id: 'cloudbeds',  label: 'Cloudbeds',    icon: 'cloud',     color: '#3B82F6', defaultBaseUrl: 'https://hotels.cloudbeds.com/api/v1.1',                    defaultAuth: 'api-key',   description: 'PMS + channel manager cloud' },
  { id: 'amadeus',    label: 'Amadeus',      icon: 'server',    color: '#003BB7', defaultBaseUrl: 'https://api.amadeus.com/v3',                               defaultAuth: 'oauth2',    description: 'GDS + TravelClick' },
  { id: 'custom',     label: 'Custom REST',  icon: 'gear',      color: '#5C5C5C', defaultBaseUrl: '',                                                          defaultAuth: 'api-key',   description: 'Endpoint REST/XML proprietario' },
]

export const providerMeta = (p: PartnerProvider) =>
  PROVIDERS_META.find(x => x.id === p) || PROVIDERS_META[PROVIDERS_META.length - 1]

export const SYNC_FREQUENCY_LABELS: Record<SyncFrequency, string> = {
  'manual':    'Solo manuale',
  '15min':     'Ogni 15 minuti',
  'hourly':    'Ogni ora',
  'every-4h':  'Ogni 4 ore',
  'daily':     'Giornaliero',
  'weekly':    'Settimanale',
}

export const AUTH_MODE_LABELS: Record<AuthMode, string> = {
  'api-key': 'API key',
  'oauth2':  'OAuth 2.0',
  'basic':   'Basic auth (user/pass)',
  'bearer':  'Bearer token',
}
