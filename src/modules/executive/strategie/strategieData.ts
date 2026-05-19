// Dati seed condivisi tra Calendario Strategie e Calendario Master.
// Mock locale finché non sarà disponibile il service backend.

export type TipoCalendario = 'Tariffe' | 'Disponibilità' | 'Richieste Extra'

export interface Strategia {
  id:           string
  nome:         string
  colore:       string
  descrizione:  string
  tipo:         TipoCalendario
}

export const TIPI_CALENDARIO: TipoCalendario[] = ['Tariffe', 'Disponibilità', 'Richieste Extra']

export const STRUTTURE = ['Hotel Azzurro Mare', 'Hotel Noto', 'Grand Hotel Roma', 'Villa Bellini', 'Terrazza sul Mare']

export const STRATEGIES: Strategia[] = [
  // Tariffe
  { id: 'inverno-25',  nome: 'Inverno 2025',         colore: '#E74C3C', tipo: 'Tariffe',         descrizione: 'Tariffe ridotte stagione fredda, focus business' },
  { id: 'estate-26',   nome: 'Estate 2026',          colore: '#5C9CD4', tipo: 'Tariffe',         descrizione: 'Alta stagione mare, soggiorni minimi 3 notti' },
  { id: 'bassa-tar',   nome: 'Bassa stagione',       colore: '#E07B39', tipo: 'Tariffe',         descrizione: 'Sconto fino al 25%, weekend inclusi' },
  { id: 'alta-tar',    nome: 'Alta stagione',        colore: '#9B59B6', tipo: 'Tariffe',         descrizione: 'Tariffa piena, restrizioni cancellazione' },
  { id: 'peak',        nome: 'Peak Season',          colore: '#C4A820', tipo: 'Tariffe',         descrizione: 'Settimane di punta, prezzi dinamici' },
  { id: 'pasqua',      nome: 'Pasqua 2026',          colore: '#1ABC9C', tipo: 'Tariffe',         descrizione: 'Pacchetto Pasqua, minimo 2 notti' },
  { id: 'ferragosto',  nome: 'Ferragosto',           colore: '#F39C12', tipo: 'Tariffe',         descrizione: 'Settimana di Ferragosto, prezzi premium' },
  { id: 'ponti',       nome: 'Ponti & festivi',      colore: '#E91E63', tipo: 'Tariffe',         descrizione: 'Ponti calendariali, 2 notti minimo' },
  // Disponibilità
  { id: 'dispo-base',  nome: 'Disponibilità base',   colore: '#204769', tipo: 'Disponibilità',   descrizione: 'Allocazione standard, tutte le tipologie aperte' },
  { id: 'dispo-grp',   nome: 'Blocco gruppi',        colore: '#5A8A3C', tipo: 'Disponibilità',   descrizione: 'Camere riservate a contratti di gruppo' },
  { id: 'dispo-vip',   nome: 'Riserva suite',        colore: '#7B5EA7', tipo: 'Disponibilità',   descrizione: 'Suite chiuse alle OTA, vendita diretta' },
  { id: 'dispo-event', nome: 'Eventi fieristici',    colore: '#2E9959', tipo: 'Disponibilità',   descrizione: 'Allotment ridotto, tariffe da gestire manualmente' },
  // Richieste Extra
  { id: 'extra-bus',   nome: 'Pacchetto business',   colore: '#3498DB', tipo: 'Richieste Extra', descrizione: 'Late check-out + colazione veloce + parcheggio' },
  { id: 'extra-fam',   nome: 'Pacchetto famiglie',   colore: '#16A085', tipo: 'Richieste Extra', descrizione: 'Letto aggiunto + culla + menu kids inclusi' },
  { id: 'extra-spa',   nome: 'Pacchetto SPA',        colore: '#D35400', tipo: 'Richieste Extra', descrizione: 'Accesso SPA + un trattamento per camera' },
  { id: 'extra-mat',   nome: 'Matrimoni',            colore: '#C0392B', tipo: 'Richieste Extra', descrizione: 'Soggiorno sposi: late check-out + welcome kit' },
]

export const STRATEGIES_BY_ID: Record<string, Strategia> = Object.fromEntries(
  STRATEGIES.map(s => [s.id, s]),
)

export const STRATEGIES_BY_TIPO: Record<TipoCalendario, Strategia[]> = {
  'Tariffe':         STRATEGIES.filter(s => s.tipo === 'Tariffe'),
  'Disponibilità':   STRATEGIES.filter(s => s.tipo === 'Disponibilità'),
  'Richieste Extra': STRATEGIES.filter(s => s.tipo === 'Richieste Extra'),
}
