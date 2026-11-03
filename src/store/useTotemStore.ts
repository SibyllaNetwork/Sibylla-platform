import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── DISPOSITIVI › TOTEM ─────────────────────────────────────────────────────
// Il cliente possiede una rete di totem distribuiti sul territorio nazionale:
//  · crea i propri spot nell'Editor palinsesti (progetti con slide a tempo);
//  · li pianifica sui suoi totem per periodo e fascia oraria;
//  · amministra e configura ogni totem (diagnostica, orari, luminosità…);
//  · può mettere in vendita spazi sui suoi totem a inserzionisti terzi e
//    riceverne un compenso.
// Mock persistito (demo): il back end sostituirà seed e azioni.

// ─── Fasce orarie ─────────────────────────────────────────────────────────────
export type Fascia = 'mattina' | 'pomeriggio' | 'sera' | 'notte'
export const FASCE: { id: Fascia; label: string; orario: string; ore: number }[] = [
  { id: 'mattina',    label: 'Mattina',    orario: '07–12', ore: 5 },
  { id: 'pomeriggio', label: 'Pomeriggio', orario: '12–18', ore: 6 },
  { id: 'sera',       label: 'Sera',       orario: '18–24', ore: 6 },
  { id: 'notte',      label: 'Notte',      orario: '00–07', ore: 7 },
]
export const fasciaLbl = (f: Fascia) => FASCE.find(x => x.id === f)!.label

// ─── Totem ────────────────────────────────────────────────────────────────────
export type StatoTotem = 'online' | 'offline' | 'manutenzione'

export interface ConfigTotem {
  accensione: string
  spegnimento: string
  luminosita: number
  /** Luminosità automatica in base alla luce ambiente. */
  autoLuminosita: boolean
  volume: number
  orientamento: 'verticale' | 'orizzontale'
  /** Interazione touch abilitata (info, mappa, prenotazioni). */
  touch: boolean
  /** Spot di riempimento quando non c'è nulla in programma. */
  progettoRiempimento?: string
}

export interface Totem {
  id: string
  nome: string
  luogo: string
  indirizzo: string
  citta: string
  regione: string
  lat: number
  lng: number
  modello: string
  seriale: string
  stato: StatoTotem
  /** ISO datetime dell'ultimo contatto. */
  ultimoPing: string
  /** Passaggi davanti allo schermo stimati al giorno (sensore). */
  passaggiGiorno: number
  temperatura: number
  spazioDisco: number
  connessione: 'Fibra' | 'Wi-Fi' | '4G'
  config: ConfigTotem
  /** Spazi messi a disposizione di inserzionisti terzi. */
  inVendita: boolean
  /** Prezzo al giorno per fascia (€) per uno spot di terzi. */
  prezzi: Record<Fascia, number>
  /** Giorni in vendita per fascia (aaaa-mm-gg). */
  calendario: Record<Fascia, string[]>
}

export const MODELLI_TOTEM = ['Sibylla Vertical 55" 4K', 'Sibylla Vertical 43" FHD', 'Sibylla Kiosk 32" touch']

// Coordinate delle città della rete (proiezione sulla mappa in `proietta`).
const CITTA: Record<string, { lat: number; lng: number; regione: string }> = {
  Roma:     { lat: 41.90, lng: 12.50, regione: 'Lazio' },
  Milano:   { lat: 45.46, lng: 9.19,  regione: 'Lombardia' },
  Torino:   { lat: 45.07, lng: 7.69,  regione: 'Piemonte' },
  Venezia:  { lat: 45.44, lng: 12.33, regione: 'Veneto' },
  Bologna:  { lat: 44.49, lng: 11.34, regione: 'Emilia-Romagna' },
  Firenze:  { lat: 43.77, lng: 11.25, regione: 'Toscana' },
  Napoli:   { lat: 40.85, lng: 14.27, regione: 'Campania' },
  Bari:     { lat: 41.12, lng: 16.87, regione: 'Puglia' },
  Palermo:  { lat: 38.12, lng: 13.36, regione: 'Sicilia' },
  Catania:  { lat: 37.50, lng: 15.09, regione: 'Sicilia' },
  Noto:     { lat: 36.89, lng: 15.07, regione: 'Sicilia' },
  Taormina: { lat: 37.85, lng: 15.29, regione: 'Sicilia' },
  Siracusa: { lat: 37.08, lng: 15.29, regione: 'Sicilia' },
  Cagliari: { lat: 39.22, lng: 9.12,  regione: 'Sardegna' },
}

/** Lat/lng → coordinate del viewBox 1000×1304 della mappa d'Italia (Agorà). */
export const proietta = (lat: number, lng: number) => ({
  x: ((lng - 6.63) / (18.52 - 6.63)) * 1000,
  y: ((47.09 - lat) / (47.09 - 36.64)) * 1304,
})

// ─── Spot (Editor palinsesti) ────────────────────────────────────────────────
export type TipoElemento = 'testo' | 'prezzo' | 'immagine' | 'icona' | 'forma' | 'qr' | 'widget'
export type FontSpot = 'Poppins' | 'Bebas Neue' | 'Playfair Display' | 'Montserrat'
export const FONT_SPOT: FontSpot[] = ['Poppins', 'Bebas Neue', 'Playfair Display', 'Montserrat']

/** Animazioni d'ingresso/uscita (la stessa animazione, al contrario, per l'uscita). */
export type AnimFx = 'nessuna' | 'dissolvenza' | 'sali' | 'scendi' | 'da-sinistra' | 'da-destra' | 'zoom' | 'rimbalzo' | 'scrivi'
export const ANIM_FX: { id: AnimFx; label: string; soloTesto?: boolean }[] = [
  { id: 'nessuna', label: 'Nessuna' }, { id: 'dissolvenza', label: 'Dissolvenza' },
  { id: 'sali', label: 'Sale dal basso' }, { id: 'scendi', label: "Scende dall'alto" },
  { id: 'da-sinistra', label: 'Entra da sinistra' }, { id: 'da-destra', label: 'Entra da destra' },
  { id: 'zoom', label: 'Zoom' }, { id: 'rimbalzo', label: 'Rimbalzo' },
  { id: 'scrivi', label: 'Macchina da scrivere', soloTesto: true },
]
/** Animazioni continue mentre l'elemento è in scena. */
export type AnimLoop = 'nessuna' | 'pulsa' | 'fluttua' | 'lampeggia' | 'oscilla' | 'ruota'
export const ANIM_LOOP: { id: AnimLoop; label: string }[] = [
  { id: 'nessuna', label: 'Nessuna' }, { id: 'pulsa', label: 'Pulsa' }, { id: 'fluttua', label: 'Fluttua' },
  { id: 'lampeggia', label: 'Lampeggia' }, { id: 'oscilla', label: 'Oscilla' }, { id: 'ruota', label: 'Ruota' },
]
export type Ombra = 'nessuna' | 'morbida' | 'forte' | 'bagliore'
export type FormaTipo = 'rettangolo' | 'pillola' | 'cerchio' | 'linea' | 'triangolo'
export type FiltroImg = 'nessuno' | 'bn' | 'seppia' | 'caldo' | 'freddo' | 'vivido'
export type WidgetTipo = 'ora' | 'data' | 'meteo' | 'countdown'
/** Cosa succede quando un ospite tocca l'elemento (solo totem con touch abilitato). */
export type AzioneTouch = 'nessuna' | 'link' | 'prenota' | 'mappa' | 'chiama'
export const AZIONI_TOUCH: { id: AzioneTouch; label: string; campo?: string }[] = [
  { id: 'nessuna', label: 'Nessuna' }, { id: 'link', label: 'Apre una pagina web', campo: 'Indirizzo web' },
  { id: 'prenota', label: 'Apre la prenotazione', campo: 'Servizio da prenotare' },
  { id: 'mappa', label: 'Mostra il percorso', campo: 'Destinazione' }, { id: 'chiama', label: 'Chiama la reception', campo: 'Interno' },
]

/** Listini da cui il prezzo dinamico prende la tariffa del giorno (Gestione del pricing). */
export const LISTINI_PREZZO = [
  { id: 'camera', label: 'Camera doppia · BAR', base: 129 },
  { id: 'spa', label: 'Percorso spa', base: 59 },
  { id: 'menu', label: 'Menu degustazione', base: 65 },
  { id: 'escursione', label: 'Escursione in barca', base: 49 },
  { id: 'aperitivo', label: 'Aperitivo in terrazza', base: 18 },
]
/** Tariffa del giorno (mock): weekend +15%, piccola variazione per giorno. */
export function prezzoDelGiorno(fonte: string | undefined, fallback: number, iso = isoT(new Date())) {
  const base = LISTINI_PREZZO.find(l => l.id === fonte)?.base ?? fallback
  const d = new Date(`${iso}T12:00:00`)
  const we = d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6 ? 0.15 : 0
  const v = ((d.getDate() * 7) % 9 - 4) / 100
  return Math.round(base * (1 + we + v))
}

export interface Elemento {
  id: string
  tipo: TipoElemento
  /** Nome nel pannello Livelli. */
  nome?: string
  /** Posizione e dimensioni in % della slide. */
  x: number
  y: number
  w: number
  h: number
  /** Rotazione in gradi. */
  rot?: number
  /** Opacità 0–100. */
  opacita?: number
  ombra?: Ombra
  /** Bordo (px) e colore del bordo. */
  bordo?: number
  bordoColore?: string
  bloccato?: boolean
  nascosto?: boolean

  testo?: string
  font?: FontSpot
  size?: number
  peso?: 400 | 600 | 800
  colore?: string
  /** Riempimento (forma) o evidenziatore dietro al testo. */
  sfondo?: string
  /** Secondo colore: riempimento sfumato. */
  sfondo2?: string
  allinea?: 'left' | 'center' | 'right'
  corsivo?: boolean
  maiuscolo?: boolean
  /** Spaziatura tra le lettere (centesimi di em) e interlinea (×100). */
  spaziatura?: number
  interlinea?: number
  raggio?: number
  forma?: FormaTipo

  /** Prezzo dinamico: lo aggiorna il listino (Pricing) con la tariffa del giorno. */
  prezzoModo?: 'dinamico' | 'manuale'
  prezzo?: number
  fonte?: string
  prefisso?: string
  suffisso?: string
  /** Prezzo di listino barrato accanto (promo). */
  prezzoPrima?: number
  /** Mostra il bollino "prezzo del giorno". */
  bollino?: boolean

  /** Icona Font Awesome (senza prefisso "fa-"). */
  icona?: string
  /** Immagine caricata (data URL). */
  src?: string
  adatta?: 'cover' | 'contain'
  filtro?: FiltroImg

  /** QR code: indirizzo codificato. */
  link?: string
  widget?: WidgetTipo
  /** Countdown: data e ora di arrivo (aaaa-mm-ggThh:mm). */
  countdownA?: string

  /** Tempi nella slide (s): entra a `inizio`, esce a `fine` (default: fine slide). */
  inizio?: number
  fine?: number
  ingresso?: AnimFx
  uscita?: AnimFx
  /** Durata dell'animazione d'ingresso (s). */
  durIngresso?: number
  loop?: AnimLoop

  azione?: AzioneTouch
  azioneVal?: string
}

export type SfondoSlide = 'oceano' | 'tramonto' | 'notte' | 'oro' | 'smeraldo' | 'bianco' | 'ardesia' | 'corallo' | 'lavanda' | 'sabbia'
export const SFONDI: { id: SfondoSlide; label: string; medio: string }[] = [
  { id: 'oceano', label: 'Oceano', medio: '#1477A8' }, { id: 'tramonto', label: 'Tramonto', medio: '#B8475A' },
  { id: 'notte', label: 'Notte', medio: '#142A44' }, { id: 'oro', label: 'Oro Sibylla', medio: '#C7A764' },
  { id: 'smeraldo', label: 'Smeraldo', medio: '#13866A' }, { id: 'bianco', label: 'Bianco', medio: '#FFFFFF' },
  { id: 'ardesia', label: 'Ardesia', medio: '#2E3440' }, { id: 'corallo', label: 'Corallo', medio: '#F07A63' },
  { id: 'lavanda', label: 'Lavanda', medio: '#8E7CC3' }, { id: 'sabbia', label: 'Sabbia', medio: '#EADBC4' },
]
/** Sfondo personalizzato della slide (sostituisce il preset). */
export interface SfondoCustom {
  modo: 'colore' | 'gradiente' | 'immagine'
  c1: string
  c2: string
  angolo: number
  radiale?: boolean
  src?: string
  /** Velatura scura sopra l'immagine (0–80). */
  velatura?: number
  /** Effetto Ken Burns: lento zoom sull'immagine. */
  kenBurns?: boolean
  sfocatura?: number
}

export type Transizione = 'nessuna' | 'dissolvenza' | 'scorrimento' | 'zoom' | 'spinta' | 'tendina' | 'sfocatura'
export const TRANSIZIONI: { id: Transizione; label: string }[] = [
  { id: 'dissolvenza', label: 'Dissolvenza' }, { id: 'scorrimento', label: 'Scorrimento' }, { id: 'zoom', label: 'Zoom' },
  { id: 'spinta', label: 'Spinta laterale' }, { id: 'tendina', label: 'Tendina' }, { id: 'sfocatura', label: 'Sfocatura' },
  { id: 'nessuna', label: 'Taglio netto' },
]

export interface Slide {
  id: string
  nome?: string
  /** Durata in secondi. */
  durata: number
  sfondo: SfondoSlide
  bg?: SfondoCustom
  transizione: Transizione
  elementi: Elemento[]
  /** Note per chi produce lo spot (non vanno in onda). */
  note?: string
}

export type FormatoSpot = 'verticale' | 'orizzontale'
export const TRACCE_AUDIO = [
  { id: '', label: 'Nessuna musica' }, { id: 'lounge', label: 'Lounge morbida' }, { id: 'acustica', label: 'Chitarra acustica' },
  { id: 'jazz', label: 'Jazz da hotel bar' }, { id: 'estate', label: 'Estate in levare' }, { id: 'classica', label: 'Archi classici' },
]
export interface VersioneSpot { at: string; slides: Slide[]; nota: string }

export interface Progetto {
  id: string
  nome: string
  cartella: string
  slides: Slide[]
  updatedAt: string
  formato?: FormatoSpot
  /** Colori del marchio proposti in ogni selettore colore. */
  palette?: string[]
  audio?: { traccia: string; volume: number }
  /** Versioni salvate in precedenza (più recente prima, massimo 10). */
  versioni?: VersioneSpot[]
}

export const durataProgetto = (p: Pick<Progetto, 'slides'>) => p.slides.reduce((s, x) => s + x.durata, 0)

// ─── Trasmissioni (pianificazione sui propri totem) ──────────────────────────
export interface Trasmissione {
  id: string
  progettoId: string
  totemIds: string[]
  dal: string
  al: string
  fasce: Fascia[]
  /** Passaggi all'ora dello spot nelle fasce scelte. */
  passaggiOra: number
  /** Priorità sulle altre trasmissioni nello stesso slot. */
  priorita: 'normale' | 'alta'
  createdAt: string
  sospesa?: boolean
}

// ─── Inserzioni di terzi sugli spazi in vendita ──────────────────────────────
export type StatoInserzione = 'Da approvare' | 'Approvata' | 'Rifiutata'
export interface Inserzione {
  id: string
  inserzionista: string
  settore: string
  totemId: string
  dal: string
  al: string
  fascia: Fascia
  passaggiOra: number
  /** Importo totale pagato dall'inserzionista (€). */
  importo: number
  stato: StatoInserzione
  /** Creatività dello spot proposto (titolo + colore) per l'anteprima. */
  creativita: { titolo: string; sottotitolo: string; sfondo: SfondoSlide; icona: string }
  createdAt: string
  motivo?: string
}
/** Quota del ricavo che resta al proprietario del totem (il resto è la commissione Sibylla). */
export const QUOTA_PROPRIETARIO = 0.8

// ─── Date ─────────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
export const isoT = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const oggiT = () => isoT(new Date())
export const giornoT = (off: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + off); return isoT(d) }
export const fmtT = (iso: string) => iso.split('-').reverse().join('/')
export const giorniTra = (dal: string, al: string) => {
  const a = new Date(`${dal}T12:00:00`).getTime(), b = new Date(`${al}T12:00:00`).getTime()
  return Math.max(0, Math.round((b - a) / 86400000) + 1)
}
export const eurT = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 })

/** Trasmissione attiva oggi su un totem nella fascia corrente. */
export const fasciaOra = (h = new Date().getHours()): Fascia => h < 7 ? 'notte' : h < 12 ? 'mattina' : h < 18 ? 'pomeriggio' : 'sera'

// ─── Seed ─────────────────────────────────────────────────────────────────────
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

const el = (e: Partial<Elemento> & Pick<Elemento, 'tipo' | 'x' | 'y' | 'w' | 'h'>): Elemento => ({ id: uid('el'), ...e })

function seedProgetti(): Progetto[] {
  const now = new Date().toISOString()
  const PAL = ['#204769', '#A2864C', '#E9D7A8', '#FFFFFF', '#1E293B']
  return [
    {
      id: 'pr-spa', nome: 'Spa & wellness autunno', cartella: 'Palinsesti autunno', updatedAt: now, formato: 'verticale', palette: PAL,
      audio: { traccia: 'lounge', volume: 40 },
      slides: [
        { id: 's-spa-1', nome: 'Apertura', durata: 7, sfondo: 'notte', transizione: 'dissolvenza', elementi: [
          el({ tipo: 'icona', nome: 'Icona spa', icona: 'spa', x: 38, y: 12, w: 24, h: 13, colore: '#E9D7A8', ingresso: 'zoom', loop: 'fluttua' }),
          el({ tipo: 'testo', nome: 'Titolo', testo: 'Rituale d\'autunno', x: 8, y: 30, w: 84, h: 10, font: 'Playfair Display', size: 30, peso: 600, colore: '#FFFFFF', allinea: 'center', ingresso: 'sali', inizio: 0.4, ombra: 'morbida' }),
          el({ tipo: 'testo', nome: 'Sottotitolo', testo: 'Massaggio + percorso benessere per due', x: 10, y: 42, w: 80, h: 10, font: 'Poppins', size: 14, peso: 400, colore: '#D6DEE8', allinea: 'center', ingresso: 'dissolvenza', inizio: 1 }),
          el({ tipo: 'prezzo', nome: 'Prezzo', x: 20, y: 57, w: 60, h: 16, prezzoModo: 'manuale', prezzo: 129, prezzoPrima: 159, prefisso: 'per due', font: 'Bebas Neue', size: 56, colore: '#E9D7A8', allinea: 'center', ingresso: 'rimbalzo', inizio: 1.6 }),
          el({ tipo: 'forma', nome: 'Pulsante', forma: 'pillola', x: 22, y: 80, w: 56, h: 8, sfondo: '#A2864C', sfondo2: '#C7A764', raggio: 40, ingresso: 'sali', inizio: 2.4, loop: 'pulsa', azione: 'prenota', azioneVal: 'Rituale d\'autunno' }),
          el({ tipo: 'testo', nome: 'Invito', testo: 'Prenota alla reception', x: 22, y: 81.5, w: 56, h: 6, font: 'Poppins', size: 13, peso: 600, colore: '#FFFFFF', allinea: 'center', ingresso: 'sali', inizio: 2.4, maiuscolo: true, spaziatura: 6 }),
        ] },
        { id: 's-spa-2', nome: 'Promo viso', durata: 5, sfondo: 'oro', transizione: 'zoom', elementi: [
          el({ tipo: 'testo', nome: 'Sconto', testo: '-20%', x: 10, y: 22, w: 80, h: 20, font: 'Bebas Neue', size: 96, peso: 400, colore: '#2B2417', allinea: 'center', ingresso: 'zoom', ombra: 'morbida' }),
          el({ tipo: 'testo', nome: 'Dettaglio', testo: 'sui trattamenti viso dal lunedì al giovedì', x: 12, y: 48, w: 76, h: 12, font: 'Poppins', size: 15, peso: 600, colore: '#2B2417', allinea: 'center', ingresso: 'scrivi', inizio: 0.6, durIngresso: 1.6 }),
          el({ tipo: 'icona', nome: 'Foglia', icona: 'leaf', x: 42, y: 68, w: 16, h: 9, colore: '#FFFFFF', ingresso: 'dissolvenza', inizio: 2, loop: 'oscilla' }),
        ] },
      ],
    },
    {
      id: 'pr-cena', nome: 'Cena gourmet in terrazza', cartella: 'Palinsesti autunno', updatedAt: now, formato: 'verticale', palette: PAL,
      audio: { traccia: 'jazz', volume: 35 },
      slides: [
        { id: 's-cena-1', nome: 'Menu', durata: 7, sfondo: 'tramonto', transizione: 'scorrimento', elementi: [
          el({ tipo: 'widget', nome: 'Ora', widget: 'ora', x: 30, y: 5, w: 40, h: 6, font: 'Montserrat', size: 14, peso: 600, colore: '#FFE9D6', allinea: 'center' }),
          el({ tipo: 'testo', nome: 'Occhiello', testo: 'Stasera in terrazza', x: 8, y: 14, w: 84, h: 8, font: 'Montserrat', size: 16, peso: 600, colore: '#FFE9D6', allinea: 'center', ingresso: 'scendi', maiuscolo: true, spaziatura: 12 }),
          el({ tipo: 'testo', nome: 'Titolo', testo: 'Menu degustazione', x: 6, y: 26, w: 88, h: 14, font: 'Playfair Display', size: 38, peso: 800, colore: '#FFFFFF', allinea: 'center', ingresso: 'sali', inizio: 0.4, ombra: 'morbida' }),
          el({ tipo: 'icona', nome: 'Posate', icona: 'utensils', x: 40, y: 44, w: 20, h: 11, colore: '#FFFFFF', ingresso: 'zoom', inizio: 1 }),
          el({ tipo: 'prezzo', nome: 'Prezzo', x: 18, y: 60, w: 64, h: 16, prezzoModo: 'dinamico', fonte: 'menu', prezzo: 65, bollino: true, font: 'Bebas Neue', size: 58, colore: '#FFFFFF', allinea: 'center', ingresso: 'rimbalzo', inizio: 1.6 }),
          el({ tipo: 'testo', nome: 'Nota', testo: 'a persona, vini in abbinamento', x: 14, y: 78, w: 72, h: 6, font: 'Poppins', size: 13, peso: 400, colore: '#FFE9D6', allinea: 'center', ingresso: 'dissolvenza', inizio: 2.2, corsivo: true }),
        ] },
      ],
    },
    {
      id: 'pr-tour', nome: 'Escursioni in barca', cartella: 'Palinsesti estate', updatedAt: now, formato: 'verticale', palette: ['#0B4F7C', '#57B6D9', '#FFD166', '#FFFFFF', '#13866A'],
      audio: { traccia: 'estate', volume: 50 },
      slides: [
        { id: 's-tour-1', nome: 'Il giro', durata: 6, sfondo: 'oceano', transizione: 'scorrimento', elementi: [
          el({ tipo: 'icona', nome: 'Barca', icona: 'sailboat', x: 36, y: 10, w: 28, h: 15, colore: '#FFFFFF', ingresso: 'da-sinistra', loop: 'fluttua' }),
          el({ tipo: 'testo', nome: 'Titolo', testo: 'Giro della costa', x: 6, y: 30, w: 88, h: 12, font: 'Bebas Neue', size: 52, peso: 400, colore: '#FFFFFF', allinea: 'center', ingresso: 'sali', inizio: 0.4, ombra: 'morbida' }),
          el({ tipo: 'testo', nome: 'Descrizione', testo: 'Grotte, snorkeling e aperitivo al tramonto', x: 10, y: 44, w: 80, h: 10, font: 'Poppins', size: 14, peso: 400, colore: '#D8ECF8', allinea: 'center', ingresso: 'dissolvenza', inizio: 1 }),
          el({ tipo: 'prezzo', nome: 'Prezzo', x: 20, y: 58, w: 60, h: 16, prezzoModo: 'dinamico', fonte: 'escursione', prezzo: 49, prefisso: 'da', bollino: true, font: 'Bebas Neue', size: 56, colore: '#FFD166', allinea: 'center', ingresso: 'rimbalzo', inizio: 1.6 }),
          el({ tipo: 'widget', nome: 'Meteo', widget: 'meteo', x: 25, y: 80, w: 50, h: 8, font: 'Poppins', size: 15, peso: 600, colore: '#FFFFFF', allinea: 'center', sfondo: 'rgba(0,0,0,.25)', raggio: 30, ingresso: 'sali', inizio: 2.2 }),
        ] },
        { id: 's-tour-2', nome: 'Prenota', durata: 5, sfondo: 'smeraldo', bg: { modo: 'gradiente', c1: '#0D5C4A', c2: '#48C49A', angolo: 200, radiale: true }, transizione: 'spinta', elementi: [
          el({ tipo: 'testo', nome: 'Orari', testo: 'Partenze ogni giorno alle 10:00 e alle 15:00', x: 8, y: 22, w: 84, h: 16, font: 'Montserrat', size: 20, peso: 800, colore: '#FFFFFF', allinea: 'center', ingresso: 'sali' }),
          el({ tipo: 'qr', nome: 'QR prenotazione', link: 'https://sibylla.it/prenota/escursioni', x: 30, y: 44, w: 40, h: 22.5, colore: '#0D5C4A', sfondo: '#FFFFFF', raggio: 12, ingresso: 'zoom', inizio: 0.6, azione: 'link', azioneVal: 'https://sibylla.it/prenota/escursioni' }),
          el({ tipo: 'testo', nome: 'Invito', testo: 'Inquadra e prenota', x: 20, y: 72, w: 60, h: 6, font: 'Poppins', size: 13, peso: 600, colore: '#E6FFF4', allinea: 'center', ingresso: 'dissolvenza', inizio: 1.2, loop: 'lampeggia' }),
        ] },
      ],
    },
  ]
}

function seedTotem(): Totem[] {
  const base = (i: number, nome: string, luogo: string, citta: string, indirizzo: string, extra: Partial<Totem> = {}): Totem => {
    const c = CITTA[citta]
    const vendita = i % 4 !== 3
    const calendario = Object.fromEntries(FASCE.map(f => [f.id,
      vendita && f.id !== 'notte' ? Array.from({ length: 60 }, (_, k) => giornoT(k)).filter((_, k) => (k + i + f.ore) % 4 !== 0) : []])) as Record<Fascia, string[]>
    return {
      id: `tm-${i}`, nome, luogo, indirizzo, citta, regione: c.regione,
      lat: c.lat + ((i * 37) % 7 - 3) * 0.01, lng: c.lng + ((i * 53) % 7 - 3) * 0.01,
      modello: MODELLI_TOTEM[i % 3], seriale: `SBY-${(24071 + i * 131).toString(36).toUpperCase()}`,
      stato: 'online', ultimoPing: new Date(Date.now() - (i % 4) * 45000).toISOString(),
      passaggiGiorno: 600 + ((i * 397) % 2400), temperatura: 38 + (i * 7) % 12, spazioDisco: 22 + (i * 13) % 60,
      connessione: (['Fibra', 'Wi-Fi', '4G'] as const)[i % 3],
      config: { accensione: '07:00', spegnimento: '24:00', luminosita: 80, autoLuminosita: true, volume: 30, orientamento: 'verticale', touch: i % 2 === 0, progettoRiempimento: 'pr-spa' },
      inVendita: vendita,
      prezzi: { mattina: 35 + (i % 4) * 5, pomeriggio: 45 + (i % 4) * 5, sera: 55 + (i % 4) * 5, notte: 15 },
      calendario,
      ...extra,
    }
  }
  return [
    base(1,  'Reception',          'Hotel Archimede',            'Roma',     'Via dei Mille 19'),
    base(2,  'Ristorante',         'Hotel Archimede',            'Roma',     'Via dei Mille 19'),
    base(3,  'Lounge arrivi',      'Stazione Termini',           'Roma',     'Piazza dei Cinquecento'),
    base(4,  'Hall',               'Grand Hotel Duomo',          'Milano',   'Corso Vittorio Emanuele 8'),
    base(5,  'Ingresso',           'Galleria commerciale Porta', 'Torino',   'Via Nizza 230', { stato: 'offline', ultimoPing: new Date(Date.now() - 5 * 3600000).toISOString() }),
    base(6,  'Molo imbarchi',      'Terminal Marittima',         'Venezia',  'Fondamenta Santa Marta'),
    base(7,  'Reception',          'Hotel Centrale',             'Bologna',  'Via Indipendenza 45'),
    base(8,  'Bar della piscina',  'Resort Le Colline',          'Firenze',  'Viale Michelangelo 2'),
    base(9,  'Hall',               'Hotel Partenope',            'Napoli',   'Via Partenope 12', { stato: 'manutenzione' }),
    base(10, 'Area check-in',      'Aeroporto',                  'Bari',     'Viale Enzo Ferrari'),
    base(11, 'Reception',          'Palazzo Normanno',           'Palermo',  'Corso Vittorio Emanuele 210'),
    base(12, 'Lido',               'Baia Resort',                'Taormina', 'Via Nazionale 147'),
    base(13, 'Hall',               'Hotel Barocco',              'Noto',     'Corso Vittorio Emanuele 52'),
    base(14, 'Porto turistico',    'Marina di Ortigia',          'Siracusa', 'Molo Sant\'Antonio'),
    base(15, 'Ingresso',           'Centro commerciale Etna',    'Catania',  'Via Etnea 600'),
    base(16, 'Terminal',           'Porto di Cagliari',          'Cagliari', 'Via Roma 1'),
  ]
}

function seedTrasmissioni(): Trasmissione[] {
  const now = new Date().toISOString()
  return [
    { id: 'tr-1', progettoId: 'pr-spa',  totemIds: ['tm-1', 'tm-2', 'tm-4', 'tm-7'], dal: giornoT(-6), al: giornoT(20), fasce: ['mattina', 'pomeriggio'], passaggiOra: 6, priorita: 'normale', createdAt: now },
    { id: 'tr-2', progettoId: 'pr-cena', totemIds: ['tm-1', 'tm-2', 'tm-8', 'tm-11', 'tm-13'], dal: giornoT(-2), al: giornoT(12), fasce: ['pomeriggio', 'sera'], passaggiOra: 8, priorita: 'alta', createdAt: now },
    { id: 'tr-3', progettoId: 'pr-tour', totemIds: ['tm-6', 'tm-12', 'tm-14', 'tm-16'], dal: giornoT(3), al: giornoT(40), fasce: ['mattina'], passaggiOra: 10, priorita: 'normale', createdAt: now },
  ]
}

function seedInserzioni(): Inserzione[] {
  const c = (titolo: string, sottotitolo: string, sfondo: SfondoSlide, icona: string) => ({ titolo, sottotitolo, sfondo, icona })
  const r = (i: number, inserzionista: string, settore: string, totemId: string, dal: number, al: number, fascia: Fascia, passaggiOra: number, importo: number, stato: StatoInserzione, cr: Inserzione['creativita'], motivo?: string): Inserzione =>
    ({ id: `in-${i}`, inserzionista, settore, totemId, dal: giornoT(dal), al: giornoT(al), fascia, passaggiOra, importo, stato, creativita: cr, createdAt: new Date(Date.now() - (i + 1) * 86400000 * 1.5).toISOString(), motivo })
  return [
    r(1, 'Gelateria Dolce Vita',     'Ristorazione',  'tm-3',  2, 15,  'pomeriggio', 6, 630,  'Da approvare', c('Gelato artigianale', 'a 50 metri dall\'uscita', 'tramonto', 'ice-cream')),
    r(2, 'Noleggio Scooter Roma',    'Mobilità',      'tm-1',  4, 18,  'mattina',    4, 525,  'Da approvare', c('Scooter da 25 €/giorno', 'consegna in hotel', 'oceano', 'motorcycle')),
    r(3, 'Museo del Novecento',      'Cultura',       'tm-4',  1, 30,  'mattina',    3, 1050, 'Da approvare', c('Mostra Futurismo', 'biglietto ridotto per gli ospiti', 'notte', 'landmark')),
    r(4, 'Enoteca Il Calice',        'Ristorazione',  'tm-8',  -10, 10, 'sera',      5, 1155, 'Approvata',    c('Degustazione vini toscani', 'ogni sera dalle 18', 'tramonto', 'wine-glass')),
    r(5, 'Taxi Venezia Lagoon',      'Mobilità',      'tm-6',  -20, 25, 'mattina',   6, 1840, 'Approvata',    c('Water taxi per l\'aeroporto', 'prenota in 1 minuto', 'oceano', 'ship')),
    r(6, 'Palestra FitCity',         'Benessere',     'tm-7',  -30, -2, 'pomeriggio', 4, 1450, 'Approvata',   c('Ingresso giornaliero', 'per chi viaggia', 'smeraldo', 'dumbbell')),
    r(7, 'Escursioni Etna Trekking', 'Turismo',       'tm-15', -45, -16, 'mattina',  5, 990,  'Approvata',    c('Sali sull\'Etna', 'partenze ogni mattina', 'oro', 'mountain-sun')),
    r(8, 'Casinò Online Bet',        'Gioco',         'tm-11', 5, 20,  'sera',       8, 900,  'Rifiutata',    c('Bonus di benvenuto', '', 'notte', 'dice'), 'Categoria non ammessa sui totem della struttura.'),
    r(9, 'Profumeria Essenze',       'Retail',        'tm-13', -60, -31, 'pomeriggio', 3, 720, 'Approvata',   c('Fragranze siciliane', 'sconto ospiti 15%', 'oro', 'spray-can-sparkles')),
  ]
}

// ─── Store ────────────────────────────────────────────────────────────────────
interface TotemState {
  totem: Totem[]
  progetti: Progetto[]
  trasmissioni: Trasmissione[]
  inserzioni: Inserzione[]

  aggiornaTotem: (id: string, patch: Partial<Totem>) => void
  aggiornaConfig: (id: string, patch: Partial<ConfigTotem>) => void
  setCalendario: (id: string, fascia: Fascia, giorni: string[]) => void
  riavvia: (id: string) => void

  salvaProgetto: (p: Progetto) => void
  nuovoProgetto: (nome: string, cartella: string, base?: Pick<Progetto, 'slides'> & Partial<Pick<Progetto, 'formato' | 'palette' | 'audio'>>) => Progetto
  ripristinaVersione: (id: string, at: string) => void
  duplicaProgetto: (id: string) => void
  eliminaProgetto: (id: string) => void

  aggiungiTrasmissione: (t: Omit<Trasmissione, 'id' | 'createdAt'>) => void
  aggiornaTrasmissione: (id: string, patch: Partial<Trasmissione>) => void
  eliminaTrasmissione: (id: string) => void

  decidiInserzione: (id: string, stato: StatoInserzione, motivo?: string) => void
}

const seed = () => ({ totem: seedTotem(), progetti: seedProgetti(), trasmissioni: seedTrasmissioni(), inserzioni: seedInserzioni() })

export const useTotemStore = create<TotemState>()(persist((set, get) => ({
  ...seed(),

  aggiornaTotem: (id, patch) => set(st => ({ totem: st.totem.map(t => t.id === id ? { ...t, ...patch } : t) })),
  aggiornaConfig: (id, patch) => set(st => ({ totem: st.totem.map(t => t.id === id ? { ...t, config: { ...t.config, ...patch } } : t) })),
  setCalendario: (id, fascia, giorni) => set(st => ({ totem: st.totem.map(t => t.id === id ? { ...t, calendario: { ...t.calendario, [fascia]: giorni } } : t) })),
  riavvia: (id) => set(st => ({ totem: st.totem.map(t => t.id === id ? { ...t, stato: 'online', ultimoPing: new Date().toISOString() } : t) })),

  salvaProgetto: (p) => set(st => {
    const prima = st.progetti.find(x => x.id === p.id)
    const at = new Date().toISOString()
    if (!prima) return { progetti: [...st.progetti, { ...p, updatedAt: at }] }
    const versioni = [{ at: prima.updatedAt, slides: prima.slides, nota: `${prima.slides.length} slide · ${durataProgetto(prima)} s` }, ...(prima.versioni ?? [])].slice(0, 10)
    return { progetti: st.progetti.map(x => x.id === p.id ? { ...p, versioni, updatedAt: at } : x) }
  }),
  nuovoProgetto: (nome, cartella, base) => {
    const p: Progetto = { id: uid('pr'), nome, cartella, updatedAt: new Date().toISOString(), formato: 'verticale',
      palette: ['#204769', '#A2864C', '#E9D7A8', '#FFFFFF', '#1E293B'], audio: { traccia: '', volume: 40 },
      slides: [{ id: uid('s'), durata: 6, sfondo: 'oceano', transizione: 'dissolvenza', elementi: [
        el({ tipo: 'testo', nome: 'Titolo', testo: 'Il tuo titolo', x: 8, y: 36, w: 84, h: 12, font: 'Bebas Neue', size: 52, peso: 400, colore: '#FFFFFF', allinea: 'center', ingresso: 'sali' }),
      ] }],
      ...(base ? JSON.parse(JSON.stringify(base)) : {}) }
    p.slides = p.slides.map(s => ({ ...s, id: uid('s'), elementi: s.elementi.map(e => ({ ...e, id: uid('el') })) }))
    set(st => ({ progetti: [...st.progetti, p] }))
    return p
  },
  ripristinaVersione: (id, at) => set(st => ({ progetti: st.progetti.map(p => {
    if (p.id !== id) return p
    const v = p.versioni?.find(x => x.at === at)
    if (!v) return p
    const corrente: VersioneSpot = { at: p.updatedAt, slides: p.slides, nota: 'Prima del ripristino' }
    return { ...p, slides: JSON.parse(JSON.stringify(v.slides)), updatedAt: new Date().toISOString(), versioni: [corrente, ...(p.versioni ?? []).filter(x => x.at !== at)].slice(0, 10) }
  }) })),
  duplicaProgetto: (id) => {
    const p = get().progetti.find(x => x.id === id)
    if (!p) return
    set(st => ({ progetti: [...st.progetti, { ...JSON.parse(JSON.stringify(p)), id: uid('pr'), nome: `${p.nome} (copia)`, versioni: [], updatedAt: new Date().toISOString() }] }))
  },
  eliminaProgetto: (id) => set(st => ({ progetti: st.progetti.filter(p => p.id !== id), trasmissioni: st.trasmissioni.filter(t => t.progettoId !== id) })),

  aggiungiTrasmissione: (t) => set(st => ({ trasmissioni: [{ ...t, id: uid('tr'), createdAt: new Date().toISOString() }, ...st.trasmissioni] })),
  aggiornaTrasmissione: (id, patch) => set(st => ({ trasmissioni: st.trasmissioni.map(t => t.id === id ? { ...t, ...patch } : t) })),
  eliminaTrasmissione: (id) => set(st => ({ trasmissioni: st.trasmissioni.filter(t => t.id !== id) })),

  decidiInserzione: (id, stato, motivo) => set(st => ({ inserzioni: st.inserzioni.map(x => x.id === id ? { ...x, stato, motivo: stato === 'Rifiutata' ? motivo : undefined } : x) })),
}), { name: 'sibylla.totem', version: 2, migrate: () => seed() as unknown as TotemState }))

// ─── Helper ──────────────────────────────────────────────────────────────────
/** Trasmissioni attive su un totem in un giorno (e fascia, se indicata). */
export function trasmissioniDi(trasmissioni: Trasmissione[], totemId: string, iso: string, fascia?: Fascia) {
  return trasmissioni.filter(t => !t.sospesa && t.totemIds.includes(totemId) && t.dal <= iso && t.al >= iso && (!fascia || t.fasce.includes(fascia)))
}

/** Inserzioni di terzi approvate attive su un totem in un giorno/fascia. */
export function inserzioniDi(inserzioni: Inserzione[], totemId: string, iso: string, fascia?: Fascia) {
  return inserzioni.filter(x => x.stato === 'Approvata' && x.totemId === totemId && x.dal <= iso && x.al >= iso && (!fascia || x.fascia === fascia))
}

/** Saturazione di uno slot: secondi di spot all'ora sui 3600 disponibili. */
export function saturazione(trasmissioni: Trasmissione[], inserzioni: Inserzione[], progetti: Progetto[], totemId: string, iso: string, fascia: Fascia) {
  const proprie = trasmissioniDi(trasmissioni, totemId, iso, fascia)
    .reduce((s, t) => s + t.passaggiOra * durataProgetto(progetti.find(p => p.id === t.progettoId) ?? { slides: [] } as unknown as Progetto), 0)
  const terzi = inserzioniDi(inserzioni, totemId, iso, fascia).reduce((s, x) => s + x.passaggiOra * 15, 0)
  return Math.min(100, Math.round(((proprie + terzi) / 3600) * 100))
}

/** Contatti stimati di una trasmissione: passaggi davanti allo schermo nelle ore coperte. */
export function contattiStimati(totem: Totem[], totemIds: string[], fasce: Fascia[], giorni: number) {
  const quotaOre = fasce.reduce((s, f) => s + FASCE.find(x => x.id === f)!.ore, 0) / 24
  return Math.round(totem.filter(t => totemIds.includes(t.id)).reduce((s, t) => s + t.passaggiGiorno, 0) * quotaOre * giorni)
}

export const etichettaTotem = (t: Pick<Totem, 'luogo' | 'nome'>) => `${t.luogo} · ${t.nome}`

/** Meteo del giorno (mock) per il widget: temperatura e condizioni nella città del totem. */
export function meteoMock(citta = 'Roma', iso = isoT(new Date())) {
  const h = Array.from(citta + iso).reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 997, 7)
  const sud = ['Palermo', 'Catania', 'Noto', 'Taormina', 'Siracusa', 'Cagliari', 'Bari', 'Napoli'].includes(citta) ? 5 : 0
  const cond = [{ icona: 'sun', label: 'Sereno' }, { icona: 'cloud-sun', label: 'Poco nuvoloso' }, { icona: 'cloud', label: 'Nuvoloso' }, { icona: 'cloud-rain', label: 'Pioggia' }][h % 4]
  return { gradi: 12 + sud + (h % 9), ...cond, citta }
}
