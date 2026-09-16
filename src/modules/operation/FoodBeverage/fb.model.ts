// ─── Food & Beverage — modello di dominio ────────────────────────────────────
//  Ricalca il modello dell'Outlet Manager (outlets → sale → tavoli, turni, menu,
//  prenotazioni, comande) con nomi e tipi TypeScript. I dati di seed sono quelli
//  reali dell'installazione Sibylla (outlet, sale, turni, categorie e voci di
//  menu, allergeni UE, categorie cliente), così le pagine mostrano da subito
//  numeri e nomi credibili senza dipendere dal backend.

export type TipoOutlet = 'ristorante' | 'bar' | 'lounge' | 'roof'
export type Servizio   = 'Colazione' | 'Pranzo' | 'Cena'

/** Stato operativo di un tavolo durante il servizio. */
export type StatoTavolo =
  | 'libero'      // apparecchiato e disponibile
  | 'riservato'   // prenotato per il turno in corso
  | 'occupato'    // ospiti seduti, comanda aperta
  | 'ordinato'    // comanda inviata in cucina
  | 'conto'       // conto richiesto
  | 'pulizia'     // da riassettare
  | 'bloccato'    // fuori servizio

export const STATO_TAVOLO: Record<StatoTavolo, { label: string; color: string; ico: string }> = {
  libero:    { label: 'Libero',      color: '#00A870', ico: 'fa-check' },
  riservato: { label: 'Riservato',   color: '#C69520', ico: 'fa-bookmark' },
  occupato:  { label: 'Occupato',    color: '#D64550', ico: 'fa-users' },
  ordinato:  { label: 'Ordinato',    color: '#B06A1F', ico: 'fa-fire-burner' },
  conto:     { label: 'Conto',       color: '#3E7FC1', ico: 'fa-receipt' },
  pulizia:   { label: 'Da pulire',   color: '#7A8DA0', ico: 'fa-broom' },
  bloccato:  { label: 'Fuori servizio', color: '#5A6B7A', ico: 'fa-ban' },
}

/** Ordine di lettura degli stati nella legenda e nei contatori. */
export const STATI_TAVOLO: StatoTavolo[] = ['libero', 'riservato', 'occupato', 'ordinato', 'conto', 'pulizia', 'bloccato']

export type FormaTavolo = 'rotondo' | 'quadrato' | 'rettangolare'

export interface Outlet {
  id: number
  nome: string
  tipo: TipoOutlet
  indirizzo: string
  email: string
  telefono: string
  attivo: boolean
}

export interface Sala {
  id: number
  outletId: number
  nome: string
  capienzaMax: number
  attiva: boolean
}

export interface Tavolo {
  id: number
  salaId: number
  numero: string
  capienza: number
  forma: FormaTavolo
  /** Colore identitario del tavolo: tinge la toque nella griglia di sala. */
  colore: string
  stato: StatoTavolo
  /** Posizione e ingombro sulla planimetria, in celle della griglia di sala.
   *  È la stessa geometria che si modifica dalla pagina "Sale e tavoli". */
  gx: number
  gy: number
  w: number
  h: number
  coperti: number
  cameriere: string | null
  /** Ora di apertura del tavolo, HH:mm. */
  apertoAlle: string | null
  /** Tavolo a cui è unito (servizio di gruppo). */
  unitoA: number | null
}

export interface Turno {
  id: number
  outletId: number
  salaId: number | null
  nome: string
  servizio: Servizio
  oraInizio: string
  oraFine: string
  coperturaMax: number
  attivo: boolean
}

export interface TipoMenu  { id: number; nome: string; colore: string; ordine: number }
export interface CategoriaMenu {
  id: number; tipoId: number; nome: string; emoji: string; colore: string; ordine: number
}
export interface VoceMenu {
  id: number
  categoriaId: number
  nome: string
  descrizione: string
  prezzo: number
  /** Codici allergene UE (A…N). */
  allergeni: string[]
  attiva: boolean
  /** Reparto che la prepara: guida la stampa e il service monitor. */
  reparto: 'cucina' | 'bar' | 'cantina' | 'pasticceria'
}

export interface Allergene { codice: string; nome: string }
export interface CategoriaCliente { id: number; nome: string; scontoPerc: number }

export type StatoPrenotazione = 'in-attesa' | 'confermata' | 'arrivata' | 'no-show' | 'annullata'

export const STATO_PRENOTAZIONE: Record<StatoPrenotazione, { label: string; color: string }> = {
  'in-attesa':  { label: 'In attesa',  color: '#C69520' },
  confermata:   { label: 'Confermata', color: '#00A870' },
  arrivata:     { label: 'Arrivata',   color: '#3E7FC1' },
  'no-show':    { label: 'No show',    color: '#D64550' },
  annullata:    { label: 'Annullata',  color: '#7A8DA0' },
}

export type OriginePrenotazione = 'telefono' | 'web' | 'reception' | 'walk-in' | 'tour-operator'

export interface Prenotazione {
  id: number
  outletId: number
  salaId: number | null
  turnoId: number | null
  /** yyyy-MM-dd */
  data: string
  /** HH:mm */
  ora: string
  ospite: string
  pax: number
  telefono: string
  email: string
  note: string
  stato: StatoPrenotazione
  origine: OriginePrenotazione
  tavoloId: number | null
  categoriaClienteId: number | null
  /** Camera dell'ospite, se alloggia in struttura. */
  camera: string
}

export type StatoRiga = 'in-comanda' | 'inviata' | 'in-preparazione' | 'pronta' | 'servita'

export const STATO_RIGA: Record<StatoRiga, { label: string; color: string }> = {
  'in-comanda':     { label: 'Da inviare',      color: '#7A8DA0' },
  inviata:          { label: 'Inviata',         color: '#3E7FC1' },
  'in-preparazione':{ label: 'In preparazione', color: '#B06A1F' },
  pronta:           { label: 'Pronta',          color: '#00A870' },
  servita:          { label: 'Servita',         color: '#5A6B7A' },
}

export interface RigaComanda {
  id: string
  voceId: number
  nome: string
  prezzo: number
  qta: number
  /** Portata: 1 antipasti, 2 primi, 3 secondi, 4 dessert, 0 subito (bevande). */
  portata: number
  note: string
  stato: StatoRiga
  /** Variazione di prezzo applicata a mano (sconto o supplemento). */
  sconto: number
}

export interface Comanda {
  id: number
  numero: string
  outletId: number
  salaId: number
  tavoloId: number
  turnoId: number | null
  coperti: number
  cameriere: string
  categoriaClienteId: number | null
  apertaAlle: string
  chiusaAlle: string | null
  stato: 'aperta' | 'chiusa'
  righe: RigaComanda[]
  /** Addebito su camera, se il conto non è stato incassato in cassa. */
  addebitoCamera: string
  pagamento: 'contanti' | 'carta' | 'camera' | 'wallet' | null
}

// ─── Costanti operative ──────────────────────────────────────────────────────

export const CAMERIERI = ['Marco R.', 'Giulia P.', 'Luca V.', 'Sara T.', 'Paolo N.', 'Elena F.']

export const PORTATE: Array<{ id: number; label: string; ico: string }> = [
  { id: 0, label: 'Subito',    ico: 'fa-bolt' },
  { id: 1, label: 'Antipasti', ico: 'fa-leaf' },
  { id: 2, label: 'Primi',     ico: 'fa-wheat-awn' },
  { id: 3, label: 'Secondi',   ico: 'fa-drumstick-bite' },
  { id: 4, label: 'Dessert',   ico: 'fa-ice-cream' },
]

export const ALLERGENI_UE: Allergene[] = [
  { codice: 'A', nome: 'Glutine' },        { codice: 'B', nome: 'Crostacei' },
  { codice: 'C', nome: 'Uova' },           { codice: 'D', nome: 'Pesce' },
  { codice: 'E', nome: 'Arachidi' },       { codice: 'F', nome: 'Soia' },
  { codice: 'G', nome: 'Latte' },          { codice: 'H', nome: 'Frutta a guscio' },
  { codice: 'I', nome: 'Sedano' },         { codice: 'J', nome: 'Senape' },
  { codice: 'K', nome: 'Semi di sesamo' }, { codice: 'L', nome: 'Anidride solforosa' },
  { codice: 'M', nome: 'Lupini' },         { codice: 'N', nome: 'Molluschi' },
]

// ─── Seed ────────────────────────────────────────────────────────────────────

export const OUTLETS: Outlet[] = [
  { id: 1, nome: 'Sibylla Restaurant', tipo: 'ristorante', indirizzo: 'Via Roma, 13 — Roma (RM)', email: 'restaurant@sibyllanetwork.com', telefono: '+39 06 121948', attivo: true },
  { id: 3, nome: 'Roof Top Garden',    tipo: 'roof',       indirizzo: 'Via Roma, 13 — Roma (RM)', email: 'roof@sibyllanetwork.com',       telefono: '+39 06 121949', attivo: true },
  { id: 2, nome: 'Lounge Bar Sibylla', tipo: 'lounge',     indirizzo: 'Via Roma, 13 — Roma (RM)', email: 'lounge@sibyllanetwork.com',     telefono: '+39 06 121950', attivo: true },
]

export const SALE: Sala[] = [
  { id: 1, outletId: 1, nome: 'Sala Positano', capienzaMax: 96, attiva: true },
  { id: 2, outletId: 1, nome: 'Sala Vietri',   capienzaMax: 48, attiva: true },
  { id: 3, outletId: 3, nome: 'Roof Top',      capienzaMax: 60, attiva: true },
  { id: 4, outletId: 2, nome: 'Lounge',        capienzaMax: 40, attiva: true },
]

export const TURNI: Turno[] = [
  { id: 1, outletId: 1, salaId: null, nome: 'Turno unico', servizio: 'Colazione', oraInizio: '07:00', oraFine: '10:30', coperturaMax: 120, attivo: true },
  { id: 2, outletId: 1, salaId: null, nome: 'Turno 1',     servizio: 'Pranzo',    oraInizio: '12:00', oraFine: '14:00', coperturaMax: 96,  attivo: true },
  { id: 3, outletId: 1, salaId: null, nome: 'Turno 2',     servizio: 'Pranzo',    oraInizio: '14:00', oraFine: '15:30', coperturaMax: 96,  attivo: true },
  { id: 4, outletId: 1, salaId: null, nome: 'Turno 1',     servizio: 'Cena',      oraInizio: '19:00', oraFine: '21:00', coperturaMax: 96,  attivo: true },
  { id: 5, outletId: 1, salaId: null, nome: 'Turno 2',     servizio: 'Cena',      oraInizio: '21:00', oraFine: '23:00', coperturaMax: 96,  attivo: true },
  { id: 6, outletId: 3, salaId: 3,    nome: 'Aperitivo',   servizio: 'Cena',      oraInizio: '18:30', oraFine: '20:30', coperturaMax: 60,  attivo: true },
  { id: 7, outletId: 3, salaId: 3,    nome: 'Cena',        servizio: 'Cena',      oraInizio: '20:30', oraFine: '23:30', coperturaMax: 60,  attivo: true },
  { id: 8, outletId: 2, salaId: 4,    nome: 'Serale',      servizio: 'Cena',      oraInizio: '18:00', oraFine: '01:00', coperturaMax: 40,  attivo: true },
]

export const TIPI_MENU: TipoMenu[] = [
  { id: 1, nome: 'Ristorante', colore: '#B5522F', ordine: 1 },
  { id: 2, nome: 'Bar',        colore: '#3E7FC1', ordine: 2 },
  { id: 3, nome: 'Lounge',     colore: '#7C4D9E', ordine: 3 },
  { id: 4, nome: 'Cantina',    colore: '#8E44AD', ordine: 4 },
]

export const CATEGORIE_MENU: CategoriaMenu[] = [
  { id: 1,  tipoId: 1, nome: 'Antipasti',        emoji: '🥗', colore: '#D9822B', ordine: 1 },
  { id: 2,  tipoId: 1, nome: 'Primi',            emoji: '🍝', colore: '#C4722A', ordine: 2 },
  { id: 3,  tipoId: 1, nome: 'Secondi',          emoji: '🥩', colore: '#B5522F', ordine: 3 },
  { id: 14, tipoId: 1, nome: 'Contorni',         emoji: '🥦', colore: '#2E9E5B', ordine: 4 },
  { id: 4,  tipoId: 1, nome: 'Dessert',          emoji: '🍰', colore: '#B03A48', ordine: 5 },
  { id: 5,  tipoId: 2, nome: 'Soft drink',       emoji: '🥤', colore: '#4E9BD1', ordine: 6 },
  { id: 6,  tipoId: 2, nome: 'Birre',            emoji: '🍺', colore: '#2E86C1', ordine: 7 },
  { id: 7,  tipoId: 2, nome: 'Vini al calice',   emoji: '🍷', colore: '#1B4F72', ordine: 8 },
  { id: 8,  tipoId: 3, nome: 'Cocktail',         emoji: '🍸', colore: '#7C4D9E', ordine: 9 },
  { id: 9,  tipoId: 3, nome: 'Premium spirits',  emoji: '🥃', colore: '#6C3483', ordine: 10 },
  { id: 10, tipoId: 4, nome: 'Vini rossi',       emoji: '🍷', colore: '#922B21', ordine: 11 },
  { id: 11, tipoId: 4, nome: 'Vini bianchi',     emoji: '🥂', colore: '#B7950B', ordine: 12 },
  { id: 12, tipoId: 4, nome: 'Vini rosé',        emoji: '🌸', colore: '#CD6155', ordine: 13 },
  { id: 13, tipoId: 4, nome: 'Bollicine',        emoji: '🍾', colore: '#D4AC0D', ordine: 14 },
]

export const VOCI_MENU: VoceMenu[] = [
  // Ristorante
  { id: 1,   categoriaId: 1,  nome: 'Bruschetta al pomodoro',  descrizione: 'Pane tostato, pomodoro, basilico',        prezzo: 6.5,  allergeni: ['A'],           attiva: true, reparto: 'cucina' },
  { id: 2,   categoriaId: 1,  nome: 'Carpaccio di manzo',      descrizione: 'Carne cruda, parmigiano, rucola',         prezzo: 12,   allergeni: ['G'],           attiva: true, reparto: 'cucina' },
  { id: 16,  categoriaId: 1,  nome: 'Burrata e alici',         descrizione: 'Burrata pugliese, alici del Cantabrico',  prezzo: 11,   allergeni: ['D', 'G'],      attiva: true, reparto: 'cucina' },
  { id: 3,   categoriaId: 2,  nome: 'Carbonara',               descrizione: 'Uova, guanciale, pecorino',               prezzo: 13,   allergeni: ['A', 'C', 'G'], attiva: true, reparto: 'cucina' },
  { id: 4,   categoriaId: 2,  nome: 'Risotto ai funghi',       descrizione: 'Carnaroli, porcini, mantecato',           prezzo: 14,   allergeni: ['G'],           attiva: true, reparto: 'cucina' },
  { id: 17,  categoriaId: 2,  nome: 'Cacio e pepe',            descrizione: 'Tonnarelli, pecorino romano',             prezzo: 12.5, allergeni: ['A', 'G'],      attiva: true, reparto: 'cucina' },
  { id: 5,   categoriaId: 3,  nome: 'Bistecca alla griglia',   descrizione: 'Controfiletto 300g, rosmarino',           prezzo: 22,   allergeni: [],              attiva: true, reparto: 'cucina' },
  { id: 6,   categoriaId: 3,  nome: 'Salmone alla piastra',    descrizione: 'Filetto, lime, finocchietto',             prezzo: 18.5, allergeni: ['D'],           attiva: true, reparto: 'cucina' },
  { id: 114, categoriaId: 14, nome: 'Broccoletti ripassati',   descrizione: 'Aglio, olio, peperoncino',                prezzo: 5,    allergeni: [],              attiva: true, reparto: 'cucina' },
  { id: 115, categoriaId: 14, nome: 'Patate al forno',         descrizione: 'Rosmarino e sale grosso',                 prezzo: 5,    allergeni: [],              attiva: true, reparto: 'cucina' },
  { id: 7,   categoriaId: 4,  nome: 'Tiramisù',                descrizione: 'Mascarpone, savoiardi, caffè',            prezzo: 6.5,  allergeni: ['A', 'C', 'G'], attiva: true, reparto: 'pasticceria' },
  { id: 8,   categoriaId: 4,  nome: 'Cheesecake ai frutti rossi', descrizione: 'Base biscotto, coulis',               prezzo: 6.8,  allergeni: ['A', 'G'],      attiva: true, reparto: 'pasticceria' },
  // Bar
  { id: 9,   categoriaId: 5,  nome: 'Coca Cola',               descrizione: 'Lattina 33 cl',                           prezzo: 3,    allergeni: [],              attiva: true, reparto: 'bar' },
  { id: 10,  categoriaId: 5,  nome: 'Acqua minerale',          descrizione: 'Naturale o frizzante 0,75 l',             prezzo: 2.5,  allergeni: [],              attiva: true, reparto: 'bar' },
  { id: 11,  categoriaId: 6,  nome: 'Birra media',             descrizione: 'Alla spina 0,4 l',                        prezzo: 5,    allergeni: ['A'],           attiva: true, reparto: 'bar' },
  { id: 12,  categoriaId: 7,  nome: 'Vino rosso al calice',    descrizione: 'Calice 150 ml',                           prezzo: 6,    allergeni: ['L'],           attiva: true, reparto: 'bar' },
  { id: 18,  categoriaId: 7,  nome: 'Vino bianco al calice',   descrizione: 'Calice 150 ml',                           prezzo: 6,    allergeni: ['L'],           attiva: true, reparto: 'bar' },
  // Lounge
  { id: 13,  categoriaId: 8,  nome: 'Mojito',                  descrizione: 'Rum, lime, menta, soda',                  prezzo: 10,   allergeni: [],              attiva: true, reparto: 'bar' },
  { id: 14,  categoriaId: 8,  nome: 'Negroni',                 descrizione: 'Gin, Campari, vermouth',                  prezzo: 11,   allergeni: [],              attiva: true, reparto: 'bar' },
  { id: 19,  categoriaId: 8,  nome: 'Spritz Sibylla',          descrizione: 'Prosecco, bitter, soda, arancia',         prezzo: 9,    allergeni: ['L'],           attiva: true, reparto: 'bar' },
  { id: 15,  categoriaId: 9,  nome: 'Whisky 12 y.o.',          descrizione: 'Single malt, 4 cl',                       prezzo: 14,   allergeni: ['A'],           attiva: true, reparto: 'bar' },
  // Cantina
  { id: 100, categoriaId: 10, nome: 'Chianti Classico DOCG',   descrizione: 'Toscana, corpo medio, ciliegia',          prezzo: 22,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 101, categoriaId: 10, nome: 'Barolo DOCG',             descrizione: 'Piemonte, strutturato e complesso',       prezzo: 45,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 102, categoriaId: 10, nome: 'Amarone della Valpolicella', descrizione: 'Veneto, intenso e corposo',            prezzo: 55,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 103, categoriaId: 10, nome: 'Montepulciano d’Abruzzo', descrizione: 'Abruzzo, morbido e fruttato',             prezzo: 20,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 104, categoriaId: 11, nome: 'Pinot Grigio DOC',        descrizione: 'Fresco e leggero',                        prezzo: 18,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 105, categoriaId: 11, nome: 'Vermentino di Sardegna',  descrizione: 'Aromatico e minerale',                    prezzo: 21,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 106, categoriaId: 11, nome: 'Chardonnay',              descrizione: 'Strutturato, note di vaniglia',           prezzo: 24,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 107, categoriaId: 11, nome: 'Sauvignon Blanc',         descrizione: 'Fresco, note erbacee',                    prezzo: 23,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 108, categoriaId: 12, nome: 'Chiaretto del Garda',     descrizione: 'Delicato e fruttato',                     prezzo: 19,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 109, categoriaId: 12, nome: 'Cerasuolo d’Abruzzo',     descrizione: 'Rosato intenso',                          prezzo: 20,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 110, categoriaId: 13, nome: 'Prosecco DOC',            descrizione: 'Fresco e vivace',                         prezzo: 18,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 111, categoriaId: 13, nome: 'Franciacorta Brut',       descrizione: 'Metodo classico',                         prezzo: 35,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 112, categoriaId: 13, nome: 'Champagne Brut',          descrizione: 'Elegante e complesso',                    prezzo: 60,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
  { id: 113, categoriaId: 13, nome: 'Trento DOC',              descrizione: 'Metodo classico italiano',                prezzo: 30,   allergeni: ['L'],           attiva: true, reparto: 'cantina' },
]

export const CATEGORIE_CLIENTE: CategoriaCliente[] = [
  { id: 0, nome: 'Standard',      scontoPerc: 0 },
  { id: 3, nome: 'Cliente hotel', scontoPerc: 10 },
  { id: 2, nome: 'All inclusive', scontoPerc: 100 },
  { id: 4, nome: 'Personale',     scontoPerc: 50 },
  { id: 1, nome: 'Direzione',     scontoPerc: 100 },
]

// ─── Planimetrie ─────────────────────────────────────────────────────────────
//  I tavoli vivono su una griglia a celle, la stessa che si disegna nella pagina
//  "Sale e tavoli": lì si spostano e si ridimensionano, qui si servono. Le righe
//  sono impacchettate lasciando respiro fra un tavolo e l'altro, perché le sedie
//  vengono disegnate appena fuori dall'ingombro del tavolo.

/** Colori delle toque: una tavolozza viva ma coerente, ruotata sui tavoli. */
export const COLORI_TAVOLO = [
  '#E0457B', '#2E9E5B', '#E07B39', '#3E7FC1', '#D9A520',
  '#8E5BC6', '#17A2B8', '#C0392B', '#5BA829', '#6C7BD1',
]

/** Ingombro in celle secondo capienza e forma (stesso criterio di Sale e tavoli). */
export const ingombro = (capienza: number, forma: FormaTavolo): [number, number] => {
  if (forma === 'rettangolare') return capienza <= 4 ? [3, 2] : capienza <= 6 ? [4, 2] : [5, 2]
  return capienza <= 4 ? [2, 2] : [3, 3]
}

const formaDi = (cap: number): FormaTavolo =>
  cap <= 2 ? 'rotondo' : cap >= 6 ? 'rettangolare' : 'quadrato'

/** Dispone le capienze riga per riga e restituisce i tavoli con la geometria. */
const disponi = (salaId: number, prefisso: string, righe: number[][], start = 1): Tavolo[] => {
  const out: Tavolo[] = []
  let n = start
  let gy = 1
  righe.forEach(riga => {
    let gx = 1
    let maxH = 2
    riga.forEach(cap => {
      const forma = formaDi(cap)
      const [w, h] = ingombro(cap, forma)
      out.push({
        id: salaId * 1000 + n,
        salaId,
        numero: `${prefisso}${String(n).padStart(prefisso ? 2 : 3, '0')}`,
        capienza: cap,
        colore: COLORI_TAVOLO[(n - 1) % COLORI_TAVOLO.length],
        forma,
        stato: 'libero',
        gx, gy, w, h,
        coperti: 0,
        cameriere: null,
        apertoAlle: null,
        unitoA: null,
      })
      gx += w + 1
      maxH = Math.max(maxH, h)
      n++
    })
    gy += maxH + 2
  })
  return out
}

export const TAVOLI: Tavolo[] = [
  ...disponi(1, '', [
    [4, 2, 4, 2, 4],
    [6, 4, 6, 4],
    [2, 4, 2, 4, 2],
    [4, 6, 4, 6],
  ]),
  ...disponi(2, 'SV', [
    [2, 4, 2, 4],
    [6, 4, 6],
    [2, 4, 2, 4],
  ]),
  ...disponi(3, 'RT', [
    [2, 2, 4, 2, 2],
    [4, 6, 4],
    [2, 4, 2, 4],
    [6, 4, 6],
  ]),
  ...disponi(4, 'LB', [
    [2, 2, 4, 2],
    [4, 2, 4],
    [2, 2, 2, 2],
  ]),
]

/** Dimensioni della griglia di una sala, dedotte dai tavoli disposti. */
export const grigliaSala = (salaId: number) => {
  const dentro = TAVOLI.filter(t => t.salaId === salaId)
  return {
    cols: Math.max(12, ...dentro.map(t => t.gx + t.w)) + 1,
    rows: Math.max(8, ...dentro.map(t => t.gy + t.h)) + 1,
  }
}


// ─── Stato iniziale del servizio ─────────────────────────────────────────────
// Una fotografia plausibile a metà servizio: qualche tavolo occupato, due conti
// richiesti, alcuni riservati dalle prenotazioni.

// [id tavolo, stato, coperti, cameriere, minuti da cui è aperto]
const SERVIZIO_INIZIALE: Array<[number, StatoTavolo, number, string, number]> = [
  [1001, 'occupato',  4, 'Marco R.',  35],
  [1002, 'ordinato',  2, 'Giulia P.', 20],
  [1004, 'occupato',  6, 'Marco R.',  55],
  [1007, 'conto',     4, 'Luca V.',   85],
  [1008, 'riservato', 0, '',          0],
  [1010, 'occupato',  2, 'Sara T.',   10],
  [1013, 'pulizia',   0, '',          0],
  [1014, 'riservato', 0, '',          0],
  [1016, 'ordinato',  4, 'Giulia P.', 40],
  [1015, 'occupato',  2, 'Paolo N.',  15],
  [1017, 'conto',     6, 'Luca V.',   100],
  [1018, 'bloccato',  0, '',          0],
  [2002, 'occupato',  4, 'Elena F.',  30],
  [2005, 'riservato', 0, '',          0],
  [2008, 'ordinato',  2, 'Elena F.',  18],
  [3002, 'occupato',  4, 'Paolo N.',  65],
  [3005, 'riservato', 0, '',          0],
  [3009, 'conto',     2, 'Sara T.',   95],
  [3012, 'occupato',  6, 'Paolo N.',  25],
]

/** Ora di N minuti fa, in HH:mm: tiene la demo allineata all'orologio. */
export const oraMenoMinuti = (min: number) => {
  const d = new Date(Date.now() - min * 60000)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const tavoliIniziali = (): Tavolo[] =>
  TAVOLI.map(t => {
    const s = SERVIZIO_INIZIALE.find(([id]) => id === t.id)
    if (!s) return { ...t }
    const [, stato, coperti, cameriere, min] = s
    return {
      ...t, stato, coperti,
      cameriere: cameriere || null,
      apertoAlle: min ? oraMenoMinuti(min) : null,
    }
  })

/** Turno in corso per l'outlet, altrimenti il primo della giornata. */
export const turnoCorrente = (outletId: number): Turno | undefined => {
  const d = new Date()
  const ora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const dellOutlet = TURNI.filter(t => t.outletId === outletId)
  return dellOutlet.find(t => t.oraInizio <= ora && ora <= t.oraFine)
    ?? dellOutlet.find(t => ora < t.oraInizio)
    ?? dellOutlet[0]
}

// ─── Prenotazioni ────────────────────────────────────────────────────────────

const OSPITI = [
  ['Famiglia Ricci', '+39 335 1122334', 'ricci@mail.it', '204'],
  ['Sig. Bianchi', '+39 340 9988776', 'bianchi@mail.it', ''],
  ['Dott.ssa Moretti', '+39 333 4455667', 'moretti@mail.it', '118'],
  ['Mr. Turner', '+44 7700 900123', 'turner@mail.uk', '301'],
  ['Famiglia Esposito', '+39 328 7766554', 'esposito@mail.it', ''],
  ['Sig.ra De Luca', '+39 347 2233445', 'deluca@mail.it', '212'],
  ['Herr Schneider', '+49 151 23456789', 'schneider@mail.de', '105'],
  ['Gruppo Rotary', '+39 06 4455667', 'rotary@mail.it', ''],
  ['Sig. Conti', '+39 339 5566778', 'conti@mail.it', ''],
  ['Mme Laurent', '+33 6 12345678', 'laurent@mail.fr', '220'],
  ['Sig. Greco', '+39 320 1122334', 'greco@mail.it', ''],
  ['Famiglia Barbieri', '+39 331 9988771', 'barbieri@mail.it', '117'],
]

const NOTE = [
  'Tavolo vicino alla finestra', 'Un ospite celiaco', 'Seggiolone per bambino',
  'Anniversario: dolce con candelina', '', '', 'Allergia ai crostacei', '',
  'Arrivo in ritardo previsto', '', 'Menu vegetariano', '',
]

export const oggiISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const addGiorni = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const prenotazioniIniziali = (): Prenotazione[] => {
  const oggi = oggiISO()
  const stati: StatoPrenotazione[] = ['confermata', 'arrivata', 'confermata', 'in-attesa', 'confermata', 'arrivata']
  const origini: OriginePrenotazione[] = ['telefono', 'web', 'reception', 'walk-in', 'telefono', 'tour-operator']
  const ore = ['12:15', '12:30', '13:00', '13:30', '19:15', '19:30', '20:00', '20:30', '21:00', '21:15']
  const out: Prenotazione[] = []
  let id = 1
  // Oggi: servizio pieno, con qualche tavolo già assegnato
  const assegnati = [1008, 1014, 2005, 3005, null, null, null, null, null, null]
  for (let i = 0; i < 10; i++) {
    const [ospite, tel, mail, camera] = OSPITI[i % OSPITI.length]
    const sera = i >= 4
    out.push({
      id: id++,
      outletId: i >= 8 ? 3 : 1,
      salaId: i >= 8 ? 3 : i % 3 === 2 ? 2 : 1,
      turnoId: i >= 8 ? 7 : sera ? 4 : 2,
      data: oggi,
      ora: ore[i],
      ospite, pax: [2, 4, 2, 6, 3, 2, 4, 2, 5, 2][i],
      telefono: tel, email: mail, note: NOTE[i], camera,
      stato: stati[i % stati.length],
      origine: origini[i % origini.length],
      tavoloId: assegnati[i],
      categoriaClienteId: camera ? 3 : 0,
    })
  }
  // Prossimi giorni: il libro prenotazioni deve avere profondità
  for (let g = 1; g <= 6; g++) {
    for (let i = 0; i < 2 + (g % 3); i++) {
      const k = (g * 3 + i) % OSPITI.length
      const [ospite, tel, mail, camera] = OSPITI[k]
      out.push({
        id: id++,
        outletId: 1, salaId: i % 2 === 0 ? 1 : 2,
        turnoId: i % 2 === 0 ? 4 : 2,
        data: addGiorni(oggi, g),
        ora: ore[(g + i) % ore.length],
        ospite, pax: [2, 4, 6, 2, 3][(g + i) % 5],
        telefono: tel, email: mail, note: NOTE[(g + i) % NOTE.length], camera,
        stato: g % 4 === 0 ? 'in-attesa' : 'confermata',
        origine: origini[(g + i) % origini.length],
        tavoloId: null,
        categoriaClienteId: camera ? 3 : 0,
      })
    }
  }
  return out
}

// ─── Comande aperte ──────────────────────────────────────────────────────────

const riga = (v: VoceMenu, qta: number, portata: number, stato: StatoRiga, note = ''): RigaComanda => ({
  id: `r${v.id}-${Math.random().toString(36).slice(2, 7)}`,
  voceId: v.id, nome: v.nome, prezzo: v.prezzo, qta, portata, note, stato, sconto: 0,
})

const voce = (id: number) => VOCI_MENU.find(v => v.id === id)!

export const comandeIniziali = (): Comanda[] => [
  {
    id: 1, numero: '001', outletId: 1, salaId: 1, tavoloId: 1001, turnoId: 4,
    coperti: 4, cameriere: 'Marco R.', categoriaClienteId: 0,
    apertaAlle: oraMenoMinuti(35), chiusaAlle: null, stato: 'aperta', addebitoCamera: '', pagamento: null,
    righe: [
      riga(voce(1), 2, 1, 'servita'),
      riga(voce(3), 2, 2, 'in-preparazione'),
      riga(voce(100), 1, 0, 'servita'),
      riga(voce(10), 2, 0, 'servita'),
    ],
  },
  {
    id: 2, numero: '002', outletId: 1, salaId: 1, tavoloId: 1002, turnoId: 4,
    coperti: 2, cameriere: 'Giulia P.', categoriaClienteId: 3,
    apertaAlle: oraMenoMinuti(20), chiusaAlle: null, stato: 'aperta', addebitoCamera: '204', pagamento: null,
    righe: [
      riga(voce(16), 1, 1, 'inviata'),
      riga(voce(17), 2, 2, 'inviata', 'Uno senza pepe'),
      riga(voce(110), 1, 0, 'servita'),
    ],
  },
  {
    id: 3, numero: '003', outletId: 1, salaId: 1, tavoloId: 1004, turnoId: 4,
    coperti: 6, cameriere: 'Marco R.', categoriaClienteId: 0,
    apertaAlle: oraMenoMinuti(55), chiusaAlle: null, stato: 'aperta', addebitoCamera: '', pagamento: null,
    righe: [
      riga(voce(2), 3, 1, 'servita'),
      riga(voce(5), 4, 3, 'pronta'),
      riga(voce(114), 2, 3, 'in-preparazione'),
      riga(voce(101), 2, 0, 'servita'),
    ],
  },
  {
    id: 4, numero: '004', outletId: 1, salaId: 1, tavoloId: 1007, turnoId: 4,
    coperti: 4, cameriere: 'Luca V.', categoriaClienteId: 0,
    apertaAlle: oraMenoMinuti(85), chiusaAlle: null, stato: 'aperta', addebitoCamera: '', pagamento: null,
    righe: [
      riga(voce(4), 2, 2, 'servita'),
      riga(voce(6), 2, 3, 'servita'),
      riga(voce(7), 4, 4, 'servita'),
      riga(voce(104), 1, 0, 'servita'),
    ],
  },
  {
    id: 5, numero: '005', outletId: 1, salaId: 1, tavoloId: 1010, turnoId: 4,
    coperti: 2, cameriere: 'Sara T.', categoriaClienteId: 0,
    apertaAlle: oraMenoMinuti(10), chiusaAlle: null, stato: 'aperta', addebitoCamera: '', pagamento: null,
    righe: [riga(voce(19), 2, 0, 'servita')],
  },
  {
    id: 6, numero: '006', outletId: 1, salaId: 1, tavoloId: 1016, turnoId: 4,
    coperti: 4, cameriere: 'Giulia P.', categoriaClienteId: 0,
    apertaAlle: oraMenoMinuti(40), chiusaAlle: null, stato: 'aperta', addebitoCamera: '', pagamento: null,
    righe: [
      riga(voce(1), 2, 1, 'servita'),
      riga(voce(3), 1, 2, 'inviata'),
      riga(voce(17), 1, 2, 'inviata'),
      riga(voce(11), 4, 0, 'servita'),
    ],
  },
]
