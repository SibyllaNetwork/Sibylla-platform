// Modello dati Servizi — entità acquistabile in carrello con form di prenotazione
// che varia a seconda del TipoServizio.
//
// TipoServizio è un `string` libero per permettere all'admin di crearne di
// nuovi dal pannello (oltre ai 9 seed iniziali).

export type TipoServizio = string

export interface TipoServizioMeta {
  id: TipoServizio
  label: string
  icon: string                  // FA name (senza prefisso fa-)
  color: string
  // Campi mostrati nel form di prenotazione: il rendering è gestito in modo
  // dichiarativo dalla pagina di acquisto in base a questo array.
  formFields: FormFieldSpec[]
}

// Kind ammessi per i campi del form di prenotazione.
export type FormFieldKind = 'date' | 'time' | 'number' | 'text' | 'select'

export interface FormFieldSpec {
  kind: FormFieldKind
  // Identificativo univoco del campo dentro il form del tipo.
  // I nomi "convenzionali" (adulti, bambini, dataServizio, ecc.) attivano
  // comportamenti automatici nel modal di prenotazione (es. moltiplicatore
  // per-persona). Tipi custom possono usare nomi liberi.
  name: string
  label: string
  required?: boolean
  // Solo per number
  min?: number
  max?: number
  // Solo per text
  placeholder?: string
  // Solo per select (lista di opzioni)
  options?: string[]
}

export interface Servizio {
  id: string
  tipo: TipoServizio
  nome: string
  descrizione: string
  citta: string
  paese: string
  immagineUrl: string

  // Disponibilità (periodo in cui il servizio è prenotabile)
  disponibileDal: string        // ISO yyyy-mm-dd
  disponibileAl:  string        // ISO yyyy-mm-dd

  // Capacità target
  adultiMax:  number            // capienza massima adulti per slot
  bambiniMax: number            // capienza massima bambini per slot

  // Caratteristica del prezzo: per persona, per gruppo, per giorno, per ora.
  // Il moltiplicatore mostrato in carrello si basa su questa modalità.
  pricingMode: 'per-persona' | 'per-gruppo' | 'per-giorno' | 'per-ora'

  // I tre listini richiesti
  prezzoAgora: number
  prezzoB2B:   number
  prezzoB2C:   number

  // Durata stimata (es. "2h", "1 giorno", "weekend")
  durata: string

  // Caratteristiche tecniche/marketing del servizio (free text tagging)
  caratteristiche: string[]

  // Opzionali estesi
  fornitoreNome?: string
  sitoFornitore?: string

  attivo:     boolean
  pubblicato: boolean
}

export interface ServizioForm {
  tipo: TipoServizio
  nome: string
  descrizione: string
  citta: string
  paese: string
  immagineUrl: string
  disponibileDal: string
  disponibileAl: string
  adultiMax: string
  bambiniMax: string
  pricingMode: Servizio['pricingMode']
  prezzoAgora: string
  prezzoB2B:   string
  prezzoB2C:   string
  durata: string
  caratteristiche: string
  fornitoreNome: string
  sitoFornitore: string
  attivo: boolean
  pubblicato: boolean
}

// Listino richiesto in fase di acquisto
export type MercatoServizio = 'agora' | 'b2b' | 'b2c'

export const MERCATI_SERVIZI: Array<{ id: MercatoServizio; label: string; color: string }> = [
  { id: 'agora', label: 'Agorà', color: '#E07B39' },
  { id: 'b2b',   label: 'B2B',   color: '#5C9CD4' },
  { id: 'b2c',   label: 'B2C',   color: '#2E8D59' },
]

// ─── Seed iniziale dei tipi di servizio (icone, colore, form dinamico) ──────
// Lo store useTipiServizioStore si inizializza da qui; l'admin può poi
// modificare/aggiungere/eliminare tipi a runtime.
export const TIPI_SERVIZIO_INIT: TipoServizioMeta[] = [
  {
    id: 'escursione',
    label: 'Escursione turistica',
    icon: 'map-location-dot',
    color: '#1E8A6E',
    formFields: [
      { kind: 'date',   name: 'dataServizio', label: 'Data escursione', required: true },
      { kind: 'number', name: 'adulti',  label: 'Adulti',  min: 1, required: true },
      { kind: 'number', name: 'bambini', label: 'Bambini', min: 0 },
      { kind: 'select', name: 'lingua',  label: 'Lingua guida', options: ['Italiano', 'Inglese', 'Tedesco', 'Francese', 'Spagnolo'] },
      { kind: 'text',   name: 'note',    label: 'Note (allergie, ritrovo speciale)', placeholder: 'Opzionale' },
    ],
  },
  {
    id: 'noleggio-veicolo',
    label: 'Noleggio veicoli',
    icon: 'car',
    color: '#D26A0A',
    formFields: [
      { kind: 'date',   name: 'dataInizio', label: 'Inizio noleggio', required: true },
      { kind: 'date',   name: 'dataFine',   label: 'Fine noleggio',   required: true },
      { kind: 'text',   name: 'pickup',     label: 'Luogo di ritiro', required: true, placeholder: 'es. Aeroporto FCO' },
      { kind: 'text',   name: 'dropoff',    label: 'Luogo di consegna' },
      { kind: 'select', name: 'patente',    label: 'Patente conducente', options: ['B', 'B1', 'C', 'D'], required: true },
      { kind: 'number', name: 'eta',        label: 'Età conducente', min: 18, max: 99, required: true },
    ],
  },
  {
    id: 'deposito-bagagli',
    label: 'Deposito bagagli',
    icon: 'suitcase-rolling',
    color: '#6E5BAE',
    formFields: [
      { kind: 'date',   name: 'dataServizio', label: 'Data',  required: true },
      { kind: 'time',   name: 'oraInizio',    label: 'Dalle ora', required: true },
      { kind: 'time',   name: 'oraFine',      label: 'Alle ora',  required: true },
      { kind: 'number', name: 'pezzi',        label: 'N° pezzi',  min: 1, max: 20, required: true },
    ],
  },
  {
    id: 'parco-divertimenti',
    label: 'Parco divertimenti',
    icon: 'ferris-wheel',
    color: '#E54A8C',
    formFields: [
      { kind: 'date',   name: 'dataServizio', label: 'Data visita', required: true },
      { kind: 'number', name: 'adulti',  label: 'Adulti',  min: 1, required: true },
      { kind: 'number', name: 'bambini', label: 'Bambini', min: 0 },
      { kind: 'select', name: 'opzione', label: 'Pacchetto', options: ['Standard', 'Salta-fila', 'VIP'] },
    ],
  },
  {
    id: 'museo',
    label: 'Museo',
    icon: 'landmark',
    color: '#7A6230',
    formFields: [
      { kind: 'date',   name: 'dataServizio', label: 'Data visita', required: true },
      { kind: 'time',   name: 'oraServizio',  label: 'Slot orario', required: true },
      { kind: 'number', name: 'adulti',  label: 'Adulti',  min: 1, required: true },
      { kind: 'number', name: 'bambini', label: 'Bambini', min: 0 },
      { kind: 'select', name: 'lingua',  label: 'Audioguida', options: ['Nessuna', 'Italiano', 'Inglese', 'Tedesco', 'Francese'] },
    ],
  },
  {
    id: 'attrazione',
    label: 'Attrazione / Tour',
    icon: 'star',
    color: '#0F8FB3',
    formFields: [
      { kind: 'date',   name: 'dataServizio', label: 'Data', required: true },
      { kind: 'time',   name: 'oraServizio',  label: 'Orario' },
      { kind: 'number', name: 'adulti',  label: 'Adulti',  min: 1, required: true },
      { kind: 'number', name: 'bambini', label: 'Bambini', min: 0 },
    ],
  },
  {
    id: 'evento',
    label: 'Evento',
    icon: 'calendar-star',
    color: '#A23B8A',
    formFields: [
      { kind: 'date',   name: 'dataServizio', label: 'Data evento', required: true },
      { kind: 'number', name: 'adulti',  label: 'Adulti',  min: 1, required: true },
      { kind: 'number', name: 'bambini', label: 'Bambini', min: 0 },
      { kind: 'text',   name: 'settore', label: 'Settore / Posto', placeholder: 'Opzionale' },
    ],
  },
  {
    id: 'concerto',
    label: 'Concerto',
    icon: 'music',
    color: '#3447B5',
    formFields: [
      { kind: 'date',   name: 'dataServizio', label: 'Data concerto', required: true },
      { kind: 'select', name: 'settore', label: 'Settore', options: ['Prato', 'Tribuna A', 'Tribuna B', 'Pit', 'VIP'], required: true },
      { kind: 'number', name: 'adulti',  label: 'Posti adulti',  min: 1, required: true },
      { kind: 'number', name: 'bambini', label: 'Posti bambini', min: 0 },
    ],
  },
  {
    id: 'evento-sportivo',
    label: 'Evento sportivo',
    icon: 'futbol',
    color: '#B23A1D',
    formFields: [
      { kind: 'date',   name: 'dataServizio', label: 'Data partita', required: true },
      { kind: 'select', name: 'settore', label: 'Settore stadio', options: ['Curva', 'Distinti', 'Tribuna', 'Tribuna VIP'], required: true },
      { kind: 'number', name: 'adulti',  label: 'Biglietti adulti',  min: 1, required: true },
      { kind: 'number', name: 'bambini', label: 'Biglietti bambini', min: 0 },
    ],
  },
]

// Fallback usato quando un servizio referenzia un tipo che è stato eliminato
// dall'admin: i campi del modal di prenotazione mostrano almeno una data.
export const TIPO_SERVIZIO_FALLBACK: TipoServizioMeta = {
  id: '__fallback',
  label: 'Servizio',
  icon: 'tag',
  color: '#666',
  formFields: [
    { kind: 'date', name: 'dataServizio', label: 'Data', required: true },
  ],
}
