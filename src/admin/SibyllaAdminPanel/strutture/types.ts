// Modello "Struttura" a livello di piattaforma Sibylla — distinto dal Cliente
// (Cliente è il tenant, una Struttura è un singolo immobile/proprietà che
// il cliente gestisce: hotel, resort, agriturismo, ecc.).
// Più strutture possono appartenere allo stesso cliente (multi-property).

export type TipoStruttura =
  | 'hotel'
  | 'resort'
  | 'agriturismo'
  | 'b&b'
  | 'villa'
  | 'apartment'
  | 'ostello'
  | 'rifugio'
  | 'outlet'

export type Classificazione = '1★' | '2★' | '3★' | '4★' | '5★' | '5★L'

export type AmbitoStruttura = 'urbano' | 'mare' | 'montagna' | 'lago' | 'campagna' | 'terme'

// ─── Canali di vendita Sibylla Network ─────────────────────────────────────
// Ogni struttura può essere pubblicata indipendentemente su uno o più canali.
// Per ogni canale si configurano: stato (pubblicata o no), tagline marketing,
// e — più importante — il prezzo per tipologia di camera.
export type CanaleVendita = 'agora' | 'b2b' | 'b2c'

export interface CanaleConfig {
  pubblicata: boolean
  tagline: string           // breve titolo marketing specifico per il canale
  notePubblicazione: string // condizioni di vendita / cancellation policy del canale
}

export interface TipologiaCamera {
  id: string
  nome: string             // es. "Suite vista mare", "Doppia Classic"
  descrizione: string
  capacita: number         // pax massimi
  letti: string            // es. "1 matrimoniale + 1 divano letto"
  metratura: number        // m²
  immagineUrl: string
  // Prezzo a notte per canale (un valore = 0 significa "non in vendita su quel canale")
  prezzoAgora: number
  prezzoB2B:   number
  prezzoB2C:   number
}

export interface Struttura {
  id: string
  nome: string
  ragioneSociale?: string   // denominazione legale dell'intestatario della struttura
  tipo: TipoStruttura
  classificazione: Classificazione
  ambito: AmbitoStruttura

  // Posizione
  indirizzo: string
  citta: string
  provincia: string
  regione: string
  cap: string
  paese: string
  lat?: number
  lon?: number

  // Contatti
  email: string
  telefono: string
  sito: string
  logoUrl: string
  descrizione: string

  // Configurazione operativa
  camere: number
  valuta: string                // ISO 4217: EUR, USD…
  lingua: string                // ISO 639-1: it, en…
  timezone: string              // es. Europe/Rome
  arrangiamenti: string[]       // RO, BB, HB, FB, AI…
  tassaSoggiorno: number        // €/notte
  checkInOra: string            // HH:MM
  checkOutOra: string           // HH:MM

  // Tenant
  clienteId?: number            // id cliente proprietario (opzionale)
  clienteNome?: string          // denormalizzato per visualizzazione

  // Marketing / vetrina pubblicazione
  descrizioneLocalita: string   // testo descrittivo della località (separato dalla struttura)
  fotoPrincipale: string        // hero image della scheda pubblica
  galleria: string[]            // altre foto scorrevoli/cliccabili
  tipologieCamere: TipologiaCamera[]
  // Configurazione per ciascun canale di vendita
  canali: Record<CanaleVendita, CanaleConfig>

  // Stato operativo (PMS / planner / cassa)
  attiva: boolean
}

export interface StrutturaForm {
  nome: string
  ragioneSociale: string
  tipo: TipoStruttura
  classificazione: Classificazione
  ambito: AmbitoStruttura
  indirizzo: string
  citta: string
  provincia: string
  regione: string
  cap: string
  paese: string
  lat: string
  lon: string
  email: string
  telefono: string
  sito: string
  logoUrl: string
  descrizione: string
  camere: string
  valuta: string
  lingua: string
  timezone: string
  arrangiamenti: string     // CSV in form, array nel modello
  tassaSoggiorno: string
  checkInOra: string
  checkOutOra: string
  clienteId: string
  clienteNome: string
  descrizioneLocalita: string
  fotoPrincipale: string
  galleria: string                // testarea: una URL per riga
  // canali (configurazione marketing/condizioni — i prezzi vivono in tipologieCamere)
  canaleAgoraPubblicata: boolean
  canaleAgoraTagline:    string
  canaleAgoraNote:       string
  canaleB2BPubblicata:   boolean
  canaleB2BTagline:      string
  canaleB2BNote:         string
  canaleB2CPubblicata:   boolean
  canaleB2CTagline:      string
  canaleB2CNote:         string
  // tipologie camere
  tipologieCamere: TipologiaCamera[]
  attiva: boolean
}

export const TIPI_STRUTTURA: Array<{ value: TipoStruttura; label: string; icon: string }> = [
  { value: 'hotel',        label: 'Hotel',         icon: 'hotel' },
  { value: 'resort',       label: 'Resort',        icon: 'star' },
  { value: 'agriturismo',  label: 'Agriturismo',   icon: 'tag' },
  { value: 'b&b',          label: 'B&B',           icon: 'bed' },
  { value: 'villa',        label: 'Villa',         icon: 'building' },
  { value: 'apartment',    label: 'Appartamento',  icon: 'apartment' },
  { value: 'ostello',      label: 'Ostello',       icon: 'bed' },
  { value: 'rifugio',      label: 'Rifugio',       icon: 'tag' },
  { value: 'outlet',       label: 'Outlet F&B',    icon: 'utensils' },
]

export const CLASSIFICAZIONI: Classificazione[] = ['1★', '2★', '3★', '4★', '5★', '5★L']

export const AMBITI: Array<{ value: AmbitoStruttura; label: string }> = [
  { value: 'urbano',    label: 'Urbano' },
  { value: 'mare',      label: 'Mare' },
  { value: 'montagna',  label: 'Montagna' },
  { value: 'lago',      label: 'Lago' },
  { value: 'campagna',  label: 'Campagna' },
  { value: 'terme',     label: 'Terme' },
]

export const ARRANGIAMENTI_OPTIONS = ['RO', 'BB', 'HB', 'FB', 'AI'] as const

// Canali Sibylla Network
// Agorà e B2B condividono la stessa UI/UX (stile sibylla-platform) — l'unica
// differenza è la destinazione di pubblicazione del contenuto:
//   - Agorà → pagina "Strutture Ricettive" interna alla piattaforma
//   - B2B   → marketplace operatori (sibylla-platform)
// B2C invece pubblica fuori piattaforma, su sibyllanetwork.com (UI consumer).
export const CANALI_VENDITA: Array<{
  id: CanaleVendita
  label: string
  color: string
  description: string
  uiFlavor: 'platform' | 'consumer'
  destinazione: string         // dove finisce il contenuto pubblicato (etichetta UI)
  destinazioneUrl?: string     // URL/path indicativo della destinazione
}> = [
  {
    id: 'agora', label: 'Agorà', color: '#204769',
    description: 'Pubblicazione interna alla piattaforma Sibylla — pagina dedicata alle strutture ricettive',
    uiFlavor: 'platform',
    destinazione: 'Strutture Ricettive (sibylla-platform)',
    destinazioneUrl: '/strutture-ricettive',
  },
  {
    id: 'b2b', label: 'B2B', color: '#5C9CD4',
    description: 'Vendita a operatori e travel agency convenzionate sul marketplace B2B',
    uiFlavor: 'platform',
    destinazione: 'Marketplace operatori B2B (sibylla-platform)',
    destinazioneUrl: '/b2b/strutture',
  },
  {
    id: 'b2c', label: 'B2C', color: '#F08526',
    description: 'Vetrina pubblica consumer su sibyllanetwork.com',
    uiFlavor: 'consumer',
    destinazione: 'sibyllanetwork.com',
    destinazioneUrl: 'https://sibyllanetwork.com',
  },
]

export const DEFAULT_CANALI: Record<CanaleVendita, CanaleConfig> = {
  agora: { pubblicata: false, tagline: '', notePubblicazione: '' },
  b2b:   { pubblicata: false, tagline: '', notePubblicazione: '' },
  b2c:   { pubblicata: false, tagline: '', notePubblicazione: '' },
}
