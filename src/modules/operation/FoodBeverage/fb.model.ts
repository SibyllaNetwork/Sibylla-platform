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
/** Lingue in cui il catalogo viene pubblicato (carta, web menu, QR). */
export const LINGUE = ['it', 'en', 'de', 'fr'] as const
export type Lingua = typeof LINGUE[number]

export const LINGUA_META: Record<Lingua, { label: string; bandiera: string }> = {
  it: { label: 'Italiano', bandiera: 'it' },
  en: { label: 'English',  bandiera: 'gb' },
  de: { label: 'Deutsch',  bandiera: 'de' },
  fr: { label: 'Français', bandiera: 'fr' },
}

/** Prezzo diverso dal base per un outlet e/o una categoria cliente. */
export interface PrezzoSpeciale {
  id: string
  outletId: number | null
  categoriaClienteId: number | null
  prezzo: number
}

export interface VoceMenu {
  id: number
  categoriaId: number
  nome: string
  /** Traduzioni del nome: quello che legge l'ospite straniero in carta. */
  traduzioni: Partial<Record<Exclude<Lingua, 'it'>, string>>
  descrizione: string
  /** Prezzo base: i prezzi speciali lo scavalcano dove previsto. */
  prezzo: number
  /** Codici allergene UE (A…N). */
  allergeni: string[]
  attiva: boolean
  /** Reparto che la prepara: guida la stampa e il service monitor. */
  reparto: 'cucina' | 'bar' | 'cantina' | 'pasticceria'
  /** Outlet in cui la voce è ordinabile. Vuoto = tutti. */
  outletIds: number[]
  /** Pubblicata sul menu online consultabile dall'ospite. */
  nelWebMenu: boolean
  prezziSpeciali: PrezzoSpeciale[]
}

/** Prezzo applicato a una voce in un certo outlet per una certa categoria cliente. */
export const prezzoDi = (
  v: VoceMenu, outletId?: number, categoriaClienteId?: number,
): number => {
  const match = v.prezziSpeciali.find(p =>
    (p.outletId == null || p.outletId === outletId)
    && (p.categoriaClienteId == null || p.categoriaClienteId === categoriaClienteId))
  return match ? match.prezzo : v.prezzo
}

export interface Allergene {
  codice: string
  nome: string
  descrizione: string
  attivo: boolean
}
export interface CategoriaCliente {
  id: number
  nome: string
  scontoPerc: number
  descrizione: string
}

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

/** Aggiunta richiesta dall'ospite su una riga: va in cucina e sul conto. */
export interface ExtraRiga {
  ingredienteId: number
  nome: string
  prezzo: number
  qta: number
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
  /** Ora in cui la riga è partita per la cucina: è da lì che si conta l'attesa. */
  inviataAlle: string | null
  /** Ingredienti della ricetta tolti su richiesta: vanno in cucina come "senza". */
  senza: number[]
  /** Aggiunte con supplemento, moltiplicate per la quantità della riga. */
  extra: ExtraRiga[]
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
  /** Nota di servizio valida per tutta la comanda. */
  nota: string
  /** Addebito su camera, se il conto non è stato incassato in cassa. */
  addebitoCamera: string
  pagamento: 'contanti' | 'carta' | 'camera' | 'wallet' | null
}

// ─── Cassa: turno di cassa, storni e chiusura ────────────────────────────────
//  Ogni servizio incassato apre e chiude un turno di cassa. La chiusura è il
//  momento in cui si risponde a due domande: quanto è entrato, e per quali vie.
//  Gli storni stanno qui e non fra le comande perché è lì che li si cerca —
//  quando un totale non torna.

export type MetodoPagamento = NonNullable<Comanda['pagamento']>

export const METODI_PAGAMENTO: Array<{ id: MetodoPagamento; label: string; ico: string }> = [
  { id: 'contanti', label: 'Contanti',        ico: 'fa-money-bill-wave' },
  { id: 'carta',    label: 'Carta',           ico: 'fa-credit-card' },
  { id: 'camera',   label: 'Addebito camera', ico: 'fa-bed' },
  { id: 'wallet',   label: 'Wallet Sibylla',  ico: 'fa-wallet' },
]

/** Perché una riga già inviata è stata tolta dal conto. */
export const MOTIVI_STORNO = [
  'Errore di battitura',
  'Cambio idea dell’ospite',
  'Piatto non gradito',
  'Ritardo in cucina',
  'Omaggio della direzione',
  'Prodotto terminato',
] as const

export type MotivoStorno = typeof MOTIVI_STORNO[number]

export interface Storno {
  id: string
  comandaId: number
  numero: string
  tavolo: string
  voce: string
  qta: number
  valore: number
  motivo: MotivoStorno
  operatore: string
  ora: string
  /** La riga era già partita per la cucina: è lo storno che conta davvero. */
  giaInviata: boolean
}

export interface TurnoCassa {
  id: number
  /** yyyy-MM-dd */
  data: string
  apertaAlle: string
  chiusaAlle: string | null
  operatore: string
  fondo: number
  /** Conteggio del cassetto a fine turno: la differenza col teorico è lo scostamento. */
  contato: number | null
  incassi: Record<MetodoPagamento, number>
  coperti: number
  conti: number
  storni: number
}

/** Aliquote IVA della ristorazione: servono al riepilogo di chiusura. */
export const ALIQUOTE_IVA: Array<{ aliquota: number; label: string; reparti: string[] }> = [
  { aliquota: 10, label: 'Somministrazione', reparti: ['cucina', 'pasticceria'] },
  { aliquota: 22, label: 'Bevande alcoliche', reparti: ['bar', 'cantina'] },
]

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
  { codice: 'A', nome: 'Glutine',            descrizione: 'Cereali contenenti glutine: grano, segale, orzo, avena…', attivo: true },
  { codice: 'B', nome: 'Crostacei',          descrizione: 'Granchio, gambero, aragosta, scampi…',                    attivo: true },
  { codice: 'C', nome: 'Uova',               descrizione: 'Uova e prodotti a base di uova',                          attivo: true },
  { codice: 'D', nome: 'Pesce',              descrizione: 'Pesce e prodotti a base di pesce',                        attivo: true },
  { codice: 'E', nome: 'Arachidi',           descrizione: 'Arachidi e prodotti a base di arachidi',                  attivo: true },
  { codice: 'F', nome: 'Soia',               descrizione: 'Soia e prodotti a base di soia',                          attivo: true },
  { codice: 'G', nome: 'Latte',              descrizione: 'Latte e prodotti a base di latte (lattosio)',             attivo: true },
  { codice: 'H', nome: 'Frutta a guscio',    descrizione: 'Mandorle, nocciole, noci, anacardi, pistacchi…',          attivo: true },
  { codice: 'I', nome: 'Sedano',             descrizione: 'Sedano e prodotti a base di sedano',                      attivo: true },
  { codice: 'J', nome: 'Senape',             descrizione: 'Senape e prodotti a base di senape',                      attivo: true },
  { codice: 'K', nome: 'Semi di sesamo',     descrizione: 'Semi di sesamo e prodotti a base di sesamo',              attivo: true },
  { codice: 'L', nome: 'Anidride solforosa', descrizione: 'Solfiti a concentrazioni superiori a 10 mg/kg o 10 mg/l', attivo: true },
  { codice: 'M', nome: 'Lupini',             descrizione: 'Lupini e prodotti a base di lupini',                      attivo: true },
  { codice: 'N', nome: 'Molluschi',          descrizione: 'Molluschi e prodotti a base di molluschi',                attivo: true },
]

export const STAMPANTI: Stampante[] = [
  { id: 1, nome: 'Stampa reparto cucina', tipo: 'reparto',  protocollo: 'epson', ip: '192.168.1.70', outletId: null, attiva: true },
  { id: 2, nome: 'Stampa pre-conto',      tipo: 'preconto', protocollo: 'epson', ip: '192.168.1.71', outletId: 1,    attiva: true },
  { id: 3, nome: 'Registratore di cassa', tipo: 'fiscale',  protocollo: 'custom', ip: '192.168.1.72', outletId: 1,   attiva: true },
]

export const MONITOR_KDS: MonitorKds[] = [
  { id: 1, nome: 'Monitor cucina SR', reparto: 'cucina', outletId: 1, slug: 'monitor-cucina-sr-f3287f',
    sfondo: '#1a1a2e', testo: '#ffffff', griglia: '#2a2a3e', topbar: '#12121f', attivo: true },
  { id: 2, nome: 'Monitor dispensa SR', reparto: 'bar', outletId: 1, slug: 'monitor-dispensa-sr-3d7ec9',
    sfondo: '#1b4332', testo: '#f5f9f8', griglia: '#255c45', topbar: '#123527', attivo: true },
]

export const CONFIG_EMAIL: ConfigEmail = {
  attivo: false, provider: 'custom', host: 'smtp.sibyllanetwork.com', porta: 25,
  starttls: false, ssl: false, username: 'admin', password: '',
  mittente: '', nomeMittente: 'Outlet Manager',
}

// ─── Amministrazione: utenti, ruoli, wallet dei clienti ──────────────────────

export type LivelloPermesso = 'nascosta' | 'lettura' | 'completa'

export const LIVELLO_PERMESSO: Record<LivelloPermesso, { label: string; ico: string }> = {
  nascosta: { label: 'Nascosta',    ico: 'fa-eye-slash' },
  lettura:  { label: 'Solo lettura', ico: 'fa-eye' },
  completa: { label: 'Completa',    ico: 'fa-pen' },
}

/** Pagine della sezione su cui si concedono i permessi, nei loro gruppi. */
export const PAGINE_PERMESSI: Array<{ gruppo: string; pagine: Array<{ id: string; label: string }> }> = [
  { gruppo: 'Operativo', pagine: [
    { id: 'sala-ristorante', label: 'Sala ristorante' },
    { id: 'libro-prenotazioni', label: 'Libro prenotazioni' },
    { id: 'ospiti-giorno', label: 'Ospiti del giorno' },
    { id: 'gest-comanda', label: 'Gestione comanda' },
    { id: 'fb-kds', label: 'Monitor di cucina' },
    { id: 'fb-cassa', label: 'Cassa e chiusure' },
    { id: 'fb-dashboard', label: 'Dashboard F&B' },
  ]},
  { gruppo: 'Economato', pagine: [
    { id: 'fb-ingredienti', label: 'Ingredienti e listino' },
    { id: 'fb-food-cost', label: 'Food cost e margini' },
  ]},
  { gruppo: 'Struttura', pagine: [
    { id: 'fb-outlet', label: 'Outlet' },
    { id: 'fb-sale-tavoli', label: 'Sale e tavoli' },
    { id: 'fb-turni', label: 'Turni' },
  ]},
  { gruppo: 'Menu', pagine: [
    { id: 'fb-tipi-menu', label: 'Tipi menu' },
    { id: 'fb-categorie', label: 'Categorie' },
    { id: 'fb-voci-menu', label: 'Voci menu' },
    { id: 'fb-menu-giorno', label: 'Menu del giorno' },
    { id: 'fb-web-menu', label: 'Web menu' },
  ]},
  { gruppo: 'Generali', pagine: [
    { id: 'fb-allergeni', label: 'Allergeni' },
    { id: 'fb-categoria-ospite', label: 'Categorie cliente' },
    { id: 'fb-stampanti', label: 'Stampanti' },
    { id: 'fb-service-monitor', label: 'Service monitor' },
    { id: 'fb-config-email', label: 'Configurazione e-mail' },
    { id: 'fb-mobile-wallet', label: 'Mobile wallet' },
  ]},
  { gruppo: 'Amministrazione', pagine: [
    { id: 'fb-utenti', label: 'Utenti' },
    { id: 'fb-wallet-clienti', label: 'Wallet clienti' },
    { id: 'fb-ruoli', label: 'Ruoli e permessi' },
  ]},
]

export interface RuoloFb {
  id: number
  nome: string
  descrizione: string
  /** Il ruolo amministratore vede tutto: i permessi sotto non si applicano. */
  admin: boolean
  permessi: Record<string, LivelloPermesso>
}

export interface UtenteFb {
  id: number
  nome: string
  username: string
  email: string
  ruoloId: number | null
  attivo: boolean
  /** Ultimo accesso, in ISO; vuoto se non ha mai fatto login. */
  ultimoAccesso: string
}

export type TipoMovimentoWallet = 'ricarica' | 'consumo' | 'rimborso' | 'omaggio'

export interface MovimentoWallet {
  id: string
  data: string
  tipo: TipoMovimentoWallet
  importo: number
  causale: string
}

/** Carta monetica nominativa del cliente: si ricarica e si scala al tavolo. */
export interface WalletCliente {
  id: number
  nome: string
  email: string
  telefono: string
  categoriaClienteId: number | null
  /** Scadenza del credito residuo, vuota se non scade. */
  scadenza: string
  attivo: boolean
  movimenti: MovimentoWallet[]
}

export const saldoWallet = (w: WalletCliente) =>
  w.movimenti.reduce((a, m) => a + (m.tipo === 'consumo' ? -m.importo : m.importo), 0)

export const RUOLI_FB: RuoloFb[] = [
  { id: 1, nome: 'Admin', descrizione: 'Accesso completo a tutta la sezione', admin: true, permessi: {} },
  {
    id: 2, nome: 'F&B Manager',
    descrizione: 'Gestisce servizio, menu e configurazione, non l’amministrazione',
    admin: false,
    permessi: Object.fromEntries(
      PAGINE_PERMESSI.flatMap(g => g.pagine.map(p => [
        p.id,
        g.gruppo === 'Amministrazione' ? 'nascosta' : 'completa',
      ])),
    ) as Record<string, LivelloPermesso>,
  },
  {
    id: 3, nome: 'Cameriere',
    descrizione: 'Solo il servizio in sala e la comanda',
    admin: false,
    permessi: Object.fromEntries(
      PAGINE_PERMESSI.flatMap(g => g.pagine.map(p => [
        p.id,
        g.gruppo === 'Operativo'
          ? (p.id === 'fb-dashboard' ? 'lettura' : 'completa')
          : g.gruppo === 'Menu' ? 'lettura' : 'nascosta',
      ])),
    ) as Record<string, LivelloPermesso>,
  },
]

/** Data di N giorni fa in ISO: tiene gli accessi coerenti con l'orologio. */
const giorniFa = (n: number) => {
  const d = new Date(Date.now() - n * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const UTENTI_FB: UtenteFb[] = [
  { id: 1, nome: 'Amministratore', username: 'admin',   email: 'admin@outlet.local',          ruoloId: 1, attivo: true, ultimoAccesso: `${giorniFa(0)}T08:07` },
  { id: 2, nome: 'Andrea Guizzi',  username: 'andrea',  email: '',                            ruoloId: 2, attivo: true, ultimoAccesso: `${giorniFa(12)}T09:35` },
  { id: 3, nome: 'Marco Rossi',    username: 'marco.r', email: 'm.rossi@sibyllanetwork.com',  ruoloId: 3, attivo: true, ultimoAccesso: `${giorniFa(0)}T12:02` },
]

const mov = (id: string, quantiGiorniFa: number, tipo: TipoMovimentoWallet, importo: number, causale: string): MovimentoWallet =>
  ({ id, tipo, importo, causale, data: giorniFa(quantiGiorniFa) })

export const WALLET_CLIENTI: WalletCliente[] = [
  {
    id: 1, nome: 'Rossi Ruggero', email: 'r.rossi@mail.it', telefono: '+39 335 1122334',
    categoriaClienteId: 3, scadenza: '', attivo: true,
    movimenti: [
      mov('w1-1', 20, 'ricarica', 200, 'Ricarica alla reception'),
      mov('w1-2', 12, 'consumo', 46.5, 'Cena — tavolo 004'),
      mov('w1-3', 5,  'consumo', 22,   'Pranzo — tavolo 011'),
      mov('w1-4', 2,  'omaggio', 15,   'Omaggio direzione'),
    ],
  },
  {
    id: 2, nome: 'Verdi Giuseppe', email: 'g.verdi@mail.it', telefono: '+39 340 9988776',
    categoriaClienteId: 4, scadenza: '', attivo: true,
    movimenti: [
      mov('w2-1', 30, 'ricarica', 120, 'Ricarica mensile personale'),
      mov('w2-2', 8,  'consumo', 12.5, 'Pranzo personale'),
      mov('w2-3', 1,  'consumo', 9,    'Pranzo personale'),
    ],
  },
]

export const CONFIG_WALLET: ConfigWallet = {
  apple: {
    attivo: false, teamId: '', passTypeId: '', organizzazione: '',
    certificato: '', chiave: '', wwdr: '', password: '',
  },
  google: { attivo: false, issuerId: '', classeId: '', serviceAccount: '' },
}

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
  { id: 1,   categoriaId: 1,  nome: 'Bruschetta al pomodoro',      traduzioni: { en: 'Tomato bruschetta', de: 'Tomaten-Bruschetta', fr: 'Bruschetta à la tomate' }, descrizione: 'Pane tostato, pomodoro, basilico',        prezzo: 6.5,  allergeni: ['A'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cucina' },
  { id: 2,   categoriaId: 1,  nome: 'Carpaccio di manzo',          traduzioni: { en: 'Beef carpaccio', de: 'Rindercarpaccio', fr: 'Carpaccio de bœuf' }, descrizione: 'Carne cruda, parmigiano, rucola',         prezzo: 12,   allergeni: ['G'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cucina' },
  { id: 16,  categoriaId: 1,  nome: 'Burrata e alici',             traduzioni: { en: 'Burrata and anchovies', de: 'Burrata mit Sardellen', fr: 'Burrata et anchois' }, descrizione: 'Burrata pugliese, alici del Cantabrico',  prezzo: 11,   allergeni: ['D', 'G'],      attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cucina' },
  { id: 3,   categoriaId: 2,  nome: 'Carbonara',                   traduzioni: { en: 'Carbonara', de: 'Carbonara', fr: 'Carbonara' }, descrizione: 'Uova, guanciale, pecorino',               prezzo: 13,   allergeni: ['A', 'C', 'G'], attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cucina' },
  { id: 4,   categoriaId: 2,  nome: 'Risotto ai funghi',           traduzioni: { en: 'Mushroom risotto', de: 'Pilzrisotto', fr: 'Risotto aux champignons' }, descrizione: 'Carnaroli, porcini, mantecato',           prezzo: 14,   allergeni: ['G'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cucina' },
  { id: 17,  categoriaId: 2,  nome: 'Cacio e pepe',                traduzioni: { en: 'Cacio e pepe', de: 'Cacio e pepe', fr: 'Cacio e pepe' }, descrizione: 'Tonnarelli, pecorino romano',             prezzo: 12.5, allergeni: ['A', 'G'],      attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cucina' },
  { id: 5,   categoriaId: 3,  nome: 'Bistecca alla griglia',       traduzioni: { en: 'Grilled steak', de: 'Gegrilltes Steak', fr: 'Steak grillé' }, descrizione: 'Controfiletto 300g, rosmarino',           prezzo: 22,   allergeni: [],              attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cucina' },
  { id: 6,   categoriaId: 3,  nome: 'Salmone alla piastra',        traduzioni: { en: 'Grilled salmon', de: 'Gegrillter Lachs', fr: 'Saumon grillé' }, descrizione: 'Filetto, lime, finocchietto',             prezzo: 18.5, allergeni: ['D'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cucina' },
  { id: 114, categoriaId: 14, nome: 'Broccoletti ripassati',       traduzioni: { en: 'Sautéed broccoli', de: 'Gebratener Brokkoli', fr: 'Brocolis sautés' }, descrizione: 'Aglio, olio, peperoncino',                prezzo: 5,    allergeni: [],              attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cucina' },
  { id: 115, categoriaId: 14, nome: 'Patate al forno',             traduzioni: { en: 'Roast potatoes', de: 'Ofenkartoffeln', fr: 'Pommes de terre au four' }, descrizione: 'Rosmarino e sale grosso',                 prezzo: 5,    allergeni: [],              attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cucina' },
  { id: 7,   categoriaId: 4,  nome: 'Tiramisù',                    traduzioni: { en: 'Tiramisu', de: 'Tiramisu', fr: 'Tiramisu' }, descrizione: 'Mascarpone, savoiardi, caffè',            prezzo: 6.5,  allergeni: ['A', 'C', 'G'], attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'pasticceria' },
  { id: 8,   categoriaId: 4,  nome: 'Cheesecake ai frutti rossi',  traduzioni: { en: 'Red berry cheesecake', de: 'Beeren-Cheesecake', fr: 'Cheesecake aux fruits rouges' }, descrizione: 'Base biscotto, coulis',               prezzo: 6.8,  allergeni: ['A', 'G'],      attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'pasticceria' },
  // Bar
  { id: 9,   categoriaId: 5,  nome: 'Coca Cola',                   traduzioni: { en: 'Coca Cola', de: 'Coca Cola', fr: 'Coca Cola' }, descrizione: 'Lattina 33 cl',                           prezzo: 3,    allergeni: [],              attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'bar' },
  { id: 10,  categoriaId: 5,  nome: 'Acqua minerale',              traduzioni: { en: 'Mineral water', de: 'Mineralwasser', fr: 'Eau minérale' }, descrizione: 'Naturale o frizzante 0,75 l',             prezzo: 2.5,  allergeni: [],              attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'bar' },
  { id: 11,  categoriaId: 6,  nome: 'Birra media',                 traduzioni: { en: 'Draught beer', de: 'Bier vom Fass', fr: 'Bière pression' }, descrizione: 'Alla spina 0,4 l',                        prezzo: 5,    allergeni: ['A'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'bar' },
  { id: 12,  categoriaId: 7,  nome: 'Vino rosso al calice',        traduzioni: { en: 'Red wine by the glass', de: 'Rotwein im Glas', fr: 'Vin rouge au verre' }, descrizione: 'Calice 150 ml',                           prezzo: 6,    allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'bar' },
  { id: 18,  categoriaId: 7,  nome: 'Vino bianco al calice',       traduzioni: { en: 'White wine by the glass', de: 'Weißwein im Glas', fr: 'Vin blanc au verre' }, descrizione: 'Calice 150 ml',                           prezzo: 6,    allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'bar' },
  // Lounge
  { id: 13,  categoriaId: 8,  nome: 'Mojito',                      traduzioni: { en: 'Mojito', de: 'Mojito', fr: 'Mojito' }, descrizione: 'Rum, lime, menta, soda',                  prezzo: 10,   allergeni: [],              attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'bar' },
  { id: 14,  categoriaId: 8,  nome: 'Negroni',                     traduzioni: { en: 'Negroni', de: 'Negroni', fr: 'Negroni' }, descrizione: 'Gin, Campari, vermouth',                  prezzo: 11,   allergeni: [],              attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'bar' },
  { id: 19,  categoriaId: 8,  nome: 'Spritz Sibylla',              traduzioni: { en: 'Sibylla Spritz', de: 'Sibylla Spritz', fr: 'Spritz Sibylla' }, descrizione: 'Prosecco, bitter, soda, arancia',         prezzo: 9,    allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'bar' },
  { id: 15,  categoriaId: 9,  nome: 'Whisky 12 y.o.',              traduzioni: { en: '12 y.o. whisky', de: 'Whisky 12 Jahre', fr: 'Whisky 12 ans' }, descrizione: 'Single malt, 4 cl',                       prezzo: 14,   allergeni: ['A'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'bar' },
  // Cantina
  { id: 100, categoriaId: 10, nome: 'Chianti Classico DOCG',   traduzioni: {}, descrizione: 'Toscana, corpo medio, ciliegia',          prezzo: 22,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 101, categoriaId: 10, nome: 'Barolo DOCG',             traduzioni: {}, descrizione: 'Piemonte, strutturato e complesso',       prezzo: 45,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 102, categoriaId: 10, nome: 'Amarone della Valpolicella', traduzioni: {}, descrizione: 'Veneto, intenso e corposo',            prezzo: 55,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 103, categoriaId: 10, nome: 'Montepulciano d’Abruzzo', traduzioni: {}, descrizione: 'Abruzzo, morbido e fruttato',             prezzo: 20,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 104, categoriaId: 11, nome: 'Pinot Grigio DOC',        traduzioni: {}, descrizione: 'Fresco e leggero',                        prezzo: 18,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 105, categoriaId: 11, nome: 'Vermentino di Sardegna',  traduzioni: {}, descrizione: 'Aromatico e minerale',                    prezzo: 21,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 106, categoriaId: 11, nome: 'Chardonnay',              traduzioni: {}, descrizione: 'Strutturato, note di vaniglia',           prezzo: 24,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 107, categoriaId: 11, nome: 'Sauvignon Blanc',         traduzioni: {}, descrizione: 'Fresco, note erbacee',                    prezzo: 23,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 108, categoriaId: 12, nome: 'Chiaretto del Garda',     traduzioni: {}, descrizione: 'Delicato e fruttato',                     prezzo: 19,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 109, categoriaId: 12, nome: 'Cerasuolo d’Abruzzo',     traduzioni: {}, descrizione: 'Rosato intenso',                          prezzo: 20,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 110, categoriaId: 13, nome: 'Prosecco DOC',            traduzioni: {}, descrizione: 'Fresco e vivace',                         prezzo: 18,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 111, categoriaId: 13, nome: 'Franciacorta Brut',       traduzioni: {}, descrizione: 'Metodo classico',                         prezzo: 35,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 112, categoriaId: 13, nome: 'Champagne Brut',          traduzioni: {}, descrizione: 'Elegante e complesso',                    prezzo: 60,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
  { id: 113, categoriaId: 13, nome: 'Trento DOC',              traduzioni: {}, descrizione: 'Metodo classico italiano',                prezzo: 30,   allergeni: ['L'],           attiva: true, outletIds: [], nelWebMenu: true, prezziSpeciali: [], reparto: 'cantina' },
]

// ─── Ingredienti, ricette ed extra ───────────────────────────────────────────
//  Due usi dello stesso catalogo: gli ingredienti che compongono un piatto
//  (togliibili quando l'ospite non li gradisce) e quelli aggiungibili come
//  extra a pagamento. È una lista lunga per mestiere: in comanda si raggiunge
//  con la ricerca e con le famiglie, mai scorrendola tutta.

export type GruppoIngrediente =
  | 'Verdure' | 'Formaggi' | 'Salumi' | 'Carne e pesce' | 'Salse e condimenti'
  | 'Pane e basi' | 'Frutta e frutta secca' | 'Erbe e spezie' | 'Uova e latticini'
  | 'Dolce' | 'Bar'

/** `breve` è l'etichetta del filtro in comanda: la fila dei tasti deve stare
 *  tutta a schermo, senza scorrimento laterale. */
export const GRUPPI_INGREDIENTE: Array<{ id: GruppoIngrediente; breve: string; ico: string }> = [
  { id: 'Verdure',               breve: 'Verdure',      ico: 'fa-carrot' },
  { id: 'Formaggi',              breve: 'Formaggi',     ico: 'fa-cheese' },
  { id: 'Salumi',                breve: 'Salumi',       ico: 'fa-bacon' },
  { id: 'Carne e pesce',         breve: 'Carne pesce',  ico: 'fa-drumstick-bite' },
  { id: 'Salse e condimenti',    breve: 'Salse',        ico: 'fa-bottle-droplet' },
  { id: 'Pane e basi',           breve: 'Pane e basi',  ico: 'fa-bread-slice' },
  { id: 'Frutta e frutta secca', breve: 'Frutta',       ico: 'fa-apple-whole' },
  { id: 'Erbe e spezie',         breve: 'Erbe spezie',  ico: 'fa-seedling' },
  { id: 'Uova e latticini',      breve: 'Latticini',    ico: 'fa-egg' },
  { id: 'Dolce',                 breve: 'Dolce',        ico: 'fa-ice-cream' },
  { id: 'Bar',                   breve: 'Bar',          ico: 'fa-martini-glass' },
]

export type UnitaIngrediente = 'kg' | 'l' | 'pz'

export interface Fornitore {
  id: number
  nome: string
  categoria: string
}

export const FORNITORI: Fornitore[] = [
  { id: 1, nome: 'Ortofrutta Val di Noto',   categoria: 'Ortofrutta' },
  { id: 2, nome: 'Caseificio Iblei',         categoria: 'Latticini' },
  { id: 3, nome: 'Carni & Mare Srl',         categoria: 'Carni e pesce' },
  { id: 4, nome: 'Gastronomia Sud Distrib.', categoria: 'Secco e gastronomia' },
  { id: 5, nome: 'Beverage Partner',         categoria: 'Bevande' },
]

export interface Ingrediente {
  id: number
  nome: string
  gruppo: GruppoIngrediente
  /** Supplemento se aggiunto come extra. 0 = aggiunta senza addebito. */
  prezzoExtra: number
  /** Codici allergene UE (A…N). */
  allergeni: string[]
  /** Unità in cui si compra e si consuma. */
  unita: UnitaIngrediente
  /** Ultimo prezzo d'acquisto per unità: è la base di ogni food cost. */
  costo: number
  /** Quantità di una singola aggiunta, nell'unità dell'ingrediente. */
  porzione: number
  /** Quanto ce n'è in magazzino e sotto quale soglia si riordina. */
  giacenza: number
  scorta: number
  fornitoreId: number
  /** Prezzo spuntato dal gruppo d'acquisto Agorà, quando ce n'è uno aperto. */
  agora?: number
  /** Fra i più richiesti: compare subito, senza digitare nulla. */
  frequente?: boolean
  /** Non proponibile come aggiunta (compone solo le ricette). */
  soloRicetta?: boolean
}

/** Listino d'acquisto: costo per unità, porzione di un'aggiunta e magazzino.
 *  Sta in un posto solo perché è la presa a cui, domani, si attacca il prezzo
 *  reale — quello dei gruppi d'acquisto dell'Agorà o del gestionale fornitori. */
const LISTINO: Record<string, {
  costo: number; unita: UnitaIngrediente; porzione: number
  giacenza: number; scorta: number; fornitoreId: number; agora?: number
}> = {
  'Pomodoro':              { costo: 2.40, unita: 'kg', porzione: 0.06, giacenza: 18, scorta: 8, fornitoreId: 1, agora: 1.95 },
  'Pomodorini confit':     { costo: 8.50, unita: 'kg', porzione: 0.04, giacenza: 6, scorta: 3, fornitoreId: 1 },
  'Rucola':                { costo: 6.80, unita: 'kg', porzione: 0.03, giacenza: 1.5, scorta: 2, fornitoreId: 1, agora: 5.60 },
  'Insalata mista':        { costo: 4.20, unita: 'kg', porzione: 0.06, giacenza: 9, scorta: 4, fornitoreId: 1 },
  'Cipolla rossa':         { costo: 1.60, unita: 'kg', porzione: 0.04, giacenza: 14, scorta: 6, fornitoreId: 1 },
  'Cipollotto':            { costo: 2.80, unita: 'kg', porzione: 0.03, giacenza: 5, scorta: 2, fornitoreId: 1 },
  'Aglio':                 { costo: 5.50, unita: 'kg', porzione: 0.005, giacenza: 3, scorta: 1, fornitoreId: 1 },
  'Funghi porcini':        { costo: 28.00, unita: 'kg', porzione: 0.05, giacenza: 4, scorta: 2, fornitoreId: 1, agora: 23.40 },
  'Funghi champignon':     { costo: 4.60, unita: 'kg', porzione: 0.06, giacenza: 7, scorta: 3, fornitoreId: 1 },
  'Zucchine grigliate':    { costo: 3.40, unita: 'kg', porzione: 0.08, giacenza: 10, scorta: 4, fornitoreId: 1 },
  'Melanzane grigliate':   { costo: 3.20, unita: 'kg', porzione: 0.08, giacenza: 9, scorta: 4, fornitoreId: 1 },
  'Peperoni':              { costo: 2.90, unita: 'kg', porzione: 0.07, giacenza: 8, scorta: 3, fornitoreId: 1 },
  'Olive taggiasche':      { costo: 14.50, unita: 'kg', porzione: 0.02, giacenza: 3, scorta: 1, fornitoreId: 4, agora: 12.20 },
  'Capperi':               { costo: 11.00, unita: 'kg', porzione: 0.01, giacenza: 2, scorta: 1, fornitoreId: 4 },
  'Carciofi':              { costo: 6.50, unita: 'kg', porzione: 0.08, giacenza: 5, scorta: 2, fornitoreId: 1 },
  'Radicchio':             { costo: 3.80, unita: 'kg', porzione: 0.06, giacenza: 6, scorta: 2, fornitoreId: 1 },
  'Spinaci saltati':       { costo: 4.40, unita: 'kg', porzione: 0.09, giacenza: 7, scorta: 3, fornitoreId: 1 },
  'Broccoletti':           { costo: 3.60, unita: 'kg', porzione: 0.12, giacenza: 8, scorta: 3, fornitoreId: 1 },
  'Patate al forno':       { costo: 1.20, unita: 'kg', porzione: 0.18, giacenza: 40, scorta: 15, fornitoreId: 1, agora: 0.98 },
  'Finocchietto':          { costo: 6.00, unita: 'kg', porzione: 0.01, giacenza: 2, scorta: 1, fornitoreId: 1 },
  'Sedano':                { costo: 1.80, unita: 'kg', porzione: 0.04, giacenza: 6, scorta: 2, fornitoreId: 1 },
  'Avocado':               { costo: 6.90, unita: 'kg', porzione: 0.08, giacenza: 5, scorta: 2, fornitoreId: 1 },
  'Parmigiano':            { costo: 16.50, unita: 'kg', porzione: 0.02, giacenza: 12, scorta: 5, fornitoreId: 2, agora: 14.10 },
  'Pecorino romano':       { costo: 13.80, unita: 'kg', porzione: 0.025, giacenza: 9, scorta: 4, fornitoreId: 2, agora: 11.90 },
  'Mozzarella':            { costo: 7.20, unita: 'kg', porzione: 0.08, giacenza: 11, scorta: 5, fornitoreId: 2 },
  'Burrata':               { costo: 12.40, unita: 'kg', porzione: 0.1, giacenza: 2, scorta: 3, fornitoreId: 2, agora: 10.50 },
  'Stracciatella':         { costo: 13.50, unita: 'kg', porzione: 0.06, giacenza: 4, scorta: 2, fornitoreId: 2 },
  'Gorgonzola':            { costo: 9.60, unita: 'kg', porzione: 0.05, giacenza: 5, scorta: 2, fornitoreId: 2 },
  'Scamorza affumicata':   { costo: 8.40, unita: 'kg', porzione: 0.06, giacenza: 5, scorta: 2, fornitoreId: 2 },
  'Ricotta':               { costo: 5.60, unita: 'kg', porzione: 0.09, giacenza: 7, scorta: 3, fornitoreId: 2 },
  'Feta':                  { costo: 8.20, unita: 'kg', porzione: 0.06, giacenza: 4, scorta: 2, fornitoreId: 2 },
  'Mascarpone':            { costo: 6.40, unita: 'kg', porzione: 0.08, giacenza: 8, scorta: 3, fornitoreId: 2 },
  'Guanciale':             { costo: 15.50, unita: 'kg', porzione: 0.05, giacenza: 3, scorta: 4, fornitoreId: 3, agora: 12.90 },
  'Pancetta':              { costo: 11.20, unita: 'kg', porzione: 0.05, giacenza: 7, scorta: 3, fornitoreId: 3 },
  'Prosciutto crudo':      { costo: 26.00, unita: 'kg', porzione: 0.05, giacenza: 6, scorta: 3, fornitoreId: 3, agora: 22.50 },
  'Prosciutto cotto':      { costo: 12.50, unita: 'kg', porzione: 0.06, giacenza: 7, scorta: 3, fornitoreId: 3 },
  'Speck':                 { costo: 18.00, unita: 'kg', porzione: 0.05, giacenza: 4, scorta: 2, fornitoreId: 3 },
  'Bresaola':              { costo: 32.00, unita: 'kg', porzione: 0.05, giacenza: 3, scorta: 1, fornitoreId: 3, agora: 27.80 },
  'Salame piccante':       { costo: 12.80, unita: 'kg', porzione: 0.05, giacenza: 5, scorta: 2, fornitoreId: 3 },
  'Mortadella':            { costo: 9.40, unita: 'kg', porzione: 0.06, giacenza: 5, scorta: 2, fornitoreId: 3 },
  'Pollo grigliato':       { costo: 7.80, unita: 'kg', porzione: 0.14, giacenza: 12, scorta: 5, fornitoreId: 3 },
  'Manzo crudo':           { costo: 24.00, unita: 'kg', porzione: 0.12, giacenza: 9, scorta: 4, fornitoreId: 3, agora: 20.90 },
  'Gamberi':               { costo: 22.50, unita: 'kg', porzione: 0.1, giacenza: 6, scorta: 3, fornitoreId: 3, agora: 19.40 },
  'Salmone affumicato':    { costo: 28.00, unita: 'kg', porzione: 0.08, giacenza: 5, scorta: 2, fornitoreId: 3 },
  'Tonno':                 { costo: 19.00, unita: 'kg', porzione: 0.09, giacenza: 4, scorta: 2, fornitoreId: 3 },
  'Alici del Cantabrico':  { costo: 42.00, unita: 'kg', porzione: 0.03, giacenza: 0.8, scorta: 1, fornitoreId: 3, agora: 36.00 },
  'Bottarga':              { costo: 95.00, unita: 'kg', porzione: 0.01, giacenza: 1, scorta: 0.5, fornitoreId: 3 },
  'Olio EVO':              { costo: 9.20, unita: 'l', porzione: 0.012, giacenza: 25, scorta: 10, fornitoreId: 4, agora: 7.80 },
  'Aceto balsamico':       { costo: 6.50, unita: 'l', porzione: 0.008, giacenza: 8, scorta: 3, fornitoreId: 4 },
  'Maionese':              { costo: 4.20, unita: 'kg', porzione: 0.02, giacenza: 6, scorta: 2, fornitoreId: 4 },
  'Senape':                { costo: 5.10, unita: 'kg', porzione: 0.015, giacenza: 3, scorta: 1, fornitoreId: 4 },
  'Salsa BBQ':             { costo: 4.80, unita: 'kg', porzione: 0.025, giacenza: 4, scorta: 2, fornitoreId: 4 },
  'Salsa allo yogurt':     { costo: 5.40, unita: 'kg', porzione: 0.025, giacenza: 3, scorta: 1, fornitoreId: 4 },
  'Pesto genovese':        { costo: 12.00, unita: 'kg', porzione: 0.03, giacenza: 4, scorta: 2, fornitoreId: 4 },
  'Salsa di pomodoro':     { costo: 2.10, unita: 'kg', porzione: 0.1, giacenza: 20, scorta: 8, fornitoreId: 4, agora: 1.70 },
  'Crema di tartufo':      { costo: 68.00, unita: 'kg', porzione: 0.012, giacenza: 0.8, scorta: 1, fornitoreId: 4, agora: 57.00 },
  'Burro':                 { costo: 8.60, unita: 'kg', porzione: 0.015, giacenza: 9, scorta: 4, fornitoreId: 2, agora: 7.30 },
  'Panna':                 { costo: 3.80, unita: 'l', porzione: 0.04, giacenza: 10, scorta: 4, fornitoreId: 2 },
  'Coulis ai frutti rossi':{ costo: 9.50, unita: 'kg', porzione: 0.03, giacenza: 3, scorta: 1, fornitoreId: 4 },
  'Sale grosso':           { costo: 0.60, unita: 'kg', porzione: 0.004, giacenza: 15, scorta: 5, fornitoreId: 4 },
  'Pane casereccio':       { costo: 3.20, unita: 'kg', porzione: 0.09, giacenza: 14, scorta: 6, fornitoreId: 4 },
  'Pane tostato':          { costo: 3.40, unita: 'kg', porzione: 0.07, giacenza: 12, scorta: 5, fornitoreId: 4 },
  'Crostini':              { costo: 4.60, unita: 'kg', porzione: 0.05, giacenza: 6, scorta: 2, fornitoreId: 4 },
  'Focaccia':              { costo: 5.20, unita: 'kg', porzione: 0.1, giacenza: 8, scorta: 3, fornitoreId: 4 },
  'Pane senza glutine':    { costo: 9.80, unita: 'kg', porzione: 0.08, giacenza: 4, scorta: 2, fornitoreId: 4, agora: 8.20 },
  'Tonnarelli':            { costo: 3.60, unita: 'kg', porzione: 0.12, giacenza: 18, scorta: 8, fornitoreId: 4 },
  'Spaghetti':             { costo: 1.90, unita: 'kg', porzione: 0.11, giacenza: 30, scorta: 12, fornitoreId: 4, agora: 1.45 },
  'Riso Carnaroli':        { costo: 3.10, unita: 'kg', porzione: 0.09, giacenza: 22, scorta: 9, fornitoreId: 4, agora: 2.60 },
  'Savoiardi':             { costo: 6.20, unita: 'kg', porzione: 0.05, giacenza: 5, scorta: 2, fornitoreId: 4 },
  'Base biscotto':         { costo: 5.40, unita: 'kg', porzione: 0.06, giacenza: 4, scorta: 2, fornitoreId: 4 },
  'Limone':                { costo: 2.20, unita: 'kg', porzione: 0.02, giacenza: 9, scorta: 4, fornitoreId: 1 },
  'Lime':                  { costo: 4.50, unita: 'kg', porzione: 0.02, giacenza: 5, scorta: 2, fornitoreId: 1 },
  'Arancia':               { costo: 1.60, unita: 'kg', porzione: 0.03, giacenza: 12, scorta: 5, fornitoreId: 1 },
  'Frutti rossi':          { costo: 12.00, unita: 'kg', porzione: 0.04, giacenza: 4, scorta: 2, fornitoreId: 1, agora: 9.90 },
  'Pinoli':                { costo: 38.00, unita: 'kg', porzione: 0.008, giacenza: 0.6, scorta: 1, fornitoreId: 4, agora: 31.50 },
  'Noci':                  { costo: 12.50, unita: 'kg', porzione: 0.015, giacenza: 3, scorta: 1, fornitoreId: 4 },
  'Mandorle a lamelle':    { costo: 14.00, unita: 'kg', porzione: 0.012, giacenza: 2, scorta: 1, fornitoreId: 4 },
  'Pistacchi':             { costo: 26.00, unita: 'kg', porzione: 0.012, giacenza: 2, scorta: 1, fornitoreId: 4, agora: 21.80 },
  'Basilico':              { costo: 12.00, unita: 'kg', porzione: 0.004, giacenza: 1.5, scorta: 0.6, fornitoreId: 1 },
  'Prezzemolo':            { costo: 8.00, unita: 'kg', porzione: 0.004, giacenza: 1.5, scorta: 0.6, fornitoreId: 1 },
  'Rosmarino':             { costo: 7.50, unita: 'kg', porzione: 0.003, giacenza: 1, scorta: 0.4, fornitoreId: 1 },
  'Menta':                 { costo: 14.00, unita: 'kg', porzione: 0.004, giacenza: 1, scorta: 0.4, fornitoreId: 1 },
  'Peperoncino':           { costo: 9.00, unita: 'kg', porzione: 0.002, giacenza: 1, scorta: 0.4, fornitoreId: 4 },
  'Pepe nero':             { costo: 18.00, unita: 'kg', porzione: 0.002, giacenza: 2, scorta: 0.8, fornitoreId: 4 },
  'Origano':               { costo: 12.50, unita: 'kg', porzione: 0.002, giacenza: 1, scorta: 0.4, fornitoreId: 4 },
  'Zenzero':               { costo: 6.50, unita: 'kg', porzione: 0.006, giacenza: 2, scorta: 0.8, fornitoreId: 1 },
  'Timo':                  { costo: 16.00, unita: 'kg', porzione: 0.002, giacenza: 1, scorta: 0.4, fornitoreId: 1 },
  'Uovo fritto':           { costo: 0.32, unita: 'pz', porzione: 1, giacenza: 120, scorta: 48, fornitoreId: 2, agora: 0.26 },
  'Uovo in camicia':       { costo: 0.32, unita: 'pz', porzione: 1, giacenza: 120, scorta: 48, fornitoreId: 2 },
  'Tuorlo':                { costo: 0.34, unita: 'pz', porzione: 1, giacenza: 90, scorta: 36, fornitoreId: 2 },
  'Latte':                 { costo: 1.10, unita: 'l', porzione: 0.05, giacenza: 30, scorta: 12, fornitoreId: 2 },
  'Yogurt greco':          { costo: 4.40, unita: 'kg', porzione: 0.1, giacenza: 6, scorta: 2, fornitoreId: 2 },
  'Gelato alla vaniglia':  { costo: 6.80, unita: 'l', porzione: 0.08, giacenza: 10, scorta: 4, fornitoreId: 4, agora: 5.70 },
  'Panna montata':         { costo: 4.60, unita: 'l', porzione: 0.04, giacenza: 6, scorta: 2, fornitoreId: 2 },
  'Cioccolato fondente':   { costo: 11.50, unita: 'kg', porzione: 0.03, giacenza: 4, scorta: 2, fornitoreId: 4 },
  'Caffè':                 { costo: 18.00, unita: 'kg', porzione: 0.008, giacenza: 6, scorta: 2, fornitoreId: 5, agora: 15.20 },
  'Cacao amaro':           { costo: 9.40, unita: 'kg', porzione: 0.004, giacenza: 2, scorta: 1, fornitoreId: 4 },
  'Miele':                 { costo: 8.90, unita: 'kg', porzione: 0.02, giacenza: 3, scorta: 1, fornitoreId: 4 },
  'Ghiaccio':              { costo: 0.45, unita: 'kg', porzione: 0.15, giacenza: 40, scorta: 15, fornitoreId: 5 },
  'Soda':                  { costo: 0.90, unita: 'l', porzione: 0.06, giacenza: 25, scorta: 10, fornitoreId: 5 },
  'Acqua tonica':          { costo: 1.80, unita: 'l', porzione: 0.15, giacenza: 20, scorta: 8, fornitoreId: 5, agora: 1.45 },
  'Scorza d’arancia':      { costo: 1.60, unita: 'kg', porzione: 0.005, giacenza: 3, scorta: 1, fornitoreId: 1 },
  'Oliva':                 { costo: 7.20, unita: 'kg', porzione: 0.008, giacenza: 2, scorta: 1, fornitoreId: 4 },
  'Zucchero di canna':     { costo: 1.40, unita: 'kg', porzione: 0.01, giacenza: 12, scorta: 5, fornitoreId: 4 },
  'Rum bianco':            { costo: 14.00, unita: 'l', porzione: 0.05, giacenza: 9, scorta: 4, fornitoreId: 5, agora: 11.60 },
  'Gin':                   { costo: 18.00, unita: 'l', porzione: 0.05, giacenza: 8, scorta: 3, fornitoreId: 5, agora: 15.10 },
  'Campari':               { costo: 15.50, unita: 'l', porzione: 0.03, giacenza: 6, scorta: 2, fornitoreId: 5 },
  'Vermouth rosso':        { costo: 9.80, unita: 'l', porzione: 0.03, giacenza: 7, scorta: 3, fornitoreId: 5 },
  'Prosecco':              { costo: 5.60, unita: 'l', porzione: 0.1, giacenza: 14, scorta: 6, fornitoreId: 5, agora: 4.60 },
  'Bitter':                { costo: 12.00, unita: 'l', porzione: 0.04, giacenza: 5, scorta: 2, fornitoreId: 5 },
}

const ing = (
  id: number, nome: string, gruppo: GruppoIngrediente, prezzoExtra: number,
  allergeni: string[] = [], extra: Partial<Ingrediente> = {},
): Ingrediente => ({
  id, nome, gruppo, prezzoExtra, allergeni,
  // Se manca dal listino resta a costo zero: si vede subito in Food cost.
  ...{ unita: 'kg' as UnitaIngrediente, costo: 0, porzione: 0.03, giacenza: 0, scorta: 0, fornitoreId: 4 },
  ...LISTINO[nome],
  ...extra,
})

export const INGREDIENTI: Ingrediente[] = [
  // Verdure
  ing(1,  'Pomodoro',            'Verdure', 1),
  ing(2,  'Pomodorini confit',   'Verdure', 1.5),
  ing(3,  'Rucola',              'Verdure', 1, [], { frequente: true }),
  ing(4,  'Insalata mista',      'Verdure', 1.5),
  ing(5,  'Cipolla rossa',       'Verdure', 0.5),
  ing(6,  'Cipollotto',          'Verdure', 0.5),
  ing(7,  'Aglio',               'Verdure', 0),
  ing(8,  'Funghi porcini',      'Verdure', 3),
  ing(9,  'Funghi champignon',   'Verdure', 1.5),
  ing(10, 'Zucchine grigliate',  'Verdure', 2),
  ing(11, 'Melanzane grigliate', 'Verdure', 2),
  ing(12, 'Peperoni',            'Verdure', 1.5),
  ing(13, 'Olive taggiasche',    'Verdure', 1.5),
  ing(14, 'Capperi',             'Verdure', 1),
  ing(15, 'Carciofi',            'Verdure', 2.5),
  ing(16, 'Radicchio',           'Verdure', 1.5),
  ing(17, 'Spinaci saltati',     'Verdure', 2),
  ing(18, 'Broccoletti',         'Verdure', 2),
  ing(19, 'Patate al forno',     'Verdure', 3, [], { frequente: true }),
  ing(20, 'Finocchietto',        'Verdure', 0.5),
  ing(21, 'Sedano',              'Verdure', 0.5, ['I']),
  ing(22, 'Avocado',             'Verdure', 3),
  // Formaggi
  ing(30, 'Parmigiano',          'Formaggi', 1.5, ['G'], { frequente: true }),
  ing(31, 'Pecorino romano',     'Formaggi', 1.5, ['G']),
  ing(32, 'Mozzarella',          'Formaggi', 2,   ['G']),
  ing(33, 'Burrata',             'Formaggi', 4,   ['G']),
  ing(34, 'Stracciatella',       'Formaggi', 3.5, ['G']),
  ing(35, 'Gorgonzola',          'Formaggi', 2.5, ['G']),
  ing(36, 'Scamorza affumicata', 'Formaggi', 2.5, ['G']),
  ing(37, 'Ricotta',             'Formaggi', 2,   ['G']),
  ing(38, 'Feta',                'Formaggi', 2.5, ['G']),
  ing(39, 'Mascarpone',          'Formaggi', 2,   ['G']),
  // Salumi
  ing(50, 'Guanciale',           'Salumi', 3, [], { frequente: true }),
  ing(51, 'Pancetta',            'Salumi', 2.5),
  ing(52, 'Prosciutto crudo',    'Salumi', 4),
  ing(53, 'Prosciutto cotto',    'Salumi', 3),
  ing(54, 'Speck',               'Salumi', 3.5),
  ing(55, 'Bresaola',            'Salumi', 4),
  ing(56, 'Salame piccante',     'Salumi', 3),
  ing(57, 'Mortadella',          'Salumi', 3),
  // Carne e pesce
  ing(70, 'Pollo grigliato',     'Carne e pesce', 5),
  ing(71, 'Manzo crudo',         'Carne e pesce', 6),
  ing(72, 'Gamberi',             'Carne e pesce', 6, ['B']),
  ing(73, 'Salmone affumicato',  'Carne e pesce', 5, ['D']),
  ing(74, 'Tonno',               'Carne e pesce', 4, ['D']),
  ing(75, 'Alici del Cantabrico','Carne e pesce', 3, ['D']),
  ing(76, 'Bottarga',            'Carne e pesce', 5, ['D']),
  // Salse e condimenti
  ing(90, 'Olio EVO',            'Salse e condimenti', 0, [], { frequente: true }),
  ing(91, 'Aceto balsamico',     'Salse e condimenti', 0.5),
  ing(92, 'Maionese',            'Salse e condimenti', 1, ['C']),
  ing(93, 'Senape',              'Salse e condimenti', 1, ['J']),
  ing(94, 'Salsa BBQ',           'Salse e condimenti', 1),
  ing(95, 'Salsa allo yogurt',   'Salse e condimenti', 1.5, ['G']),
  ing(96, 'Pesto genovese',      'Salse e condimenti', 2, ['G', 'H']),
  ing(97, 'Salsa di pomodoro',   'Salse e condimenti', 1),
  ing(98, 'Crema di tartufo',    'Salse e condimenti', 5, [], { frequente: true }),
  ing(99, 'Burro',               'Salse e condimenti', 1, ['G']),
  ing(100,'Panna',               'Salse e condimenti', 1.5, ['G']),
  ing(101,'Coulis ai frutti rossi','Salse e condimenti', 1.5),
  ing(102,'Sale grosso',         'Salse e condimenti', 0, [], { soloRicetta: true }),
  // Pane e basi
  ing(110,'Pane casereccio',     'Pane e basi', 1.5, ['A']),
  ing(111,'Pane tostato',        'Pane e basi', 1.5, ['A']),
  ing(112,'Crostini',            'Pane e basi', 1.5, ['A']),
  ing(113,'Focaccia',            'Pane e basi', 2.5, ['A']),
  ing(114,'Pane senza glutine',  'Pane e basi', 2.5, [], { frequente: true }),
  ing(115,'Tonnarelli',          'Pane e basi', 0, ['A', 'C'], { soloRicetta: true }),
  ing(116,'Spaghetti',           'Pane e basi', 0, ['A'], { soloRicetta: true }),
  ing(117,'Riso Carnaroli',      'Pane e basi', 0, [], { soloRicetta: true }),
  ing(118,'Savoiardi',           'Pane e basi', 0, ['A', 'C'], { soloRicetta: true }),
  ing(119,'Base biscotto',       'Pane e basi', 0, ['A', 'G'], { soloRicetta: true }),
  // Frutta e frutta secca
  ing(130,'Limone',              'Frutta e frutta secca', 0.5),
  ing(131,'Lime',                'Frutta e frutta secca', 0.5),
  ing(132,'Arancia',             'Frutta e frutta secca', 1),
  ing(133,'Frutti rossi',        'Frutta e frutta secca', 2.5),
  ing(134,'Pinoli',              'Frutta e frutta secca', 2, ['H']),
  ing(135,'Noci',                'Frutta e frutta secca', 2, ['H']),
  ing(136,'Mandorle a lamelle',  'Frutta e frutta secca', 2, ['H']),
  ing(137,'Pistacchi',           'Frutta e frutta secca', 3, ['H']),
  // Erbe e spezie
  ing(150,'Basilico',            'Erbe e spezie', 0),
  ing(151,'Prezzemolo',          'Erbe e spezie', 0),
  ing(152,'Rosmarino',           'Erbe e spezie', 0),
  ing(153,'Menta',               'Erbe e spezie', 0),
  ing(154,'Peperoncino',         'Erbe e spezie', 0),
  ing(155,'Pepe nero',           'Erbe e spezie', 0),
  ing(156,'Origano',             'Erbe e spezie', 0),
  ing(157,'Zenzero',             'Erbe e spezie', 0.5),
  ing(158,'Timo',                'Erbe e spezie', 0),
  // Uova e latticini
  ing(170,'Uovo fritto',         'Uova e latticini', 2, ['C'], { frequente: true }),
  ing(171,'Uovo in camicia',     'Uova e latticini', 2, ['C']),
  ing(172,'Tuorlo',              'Uova e latticini', 0, ['C'], { soloRicetta: true }),
  ing(173,'Latte',               'Uova e latticini', 0.5, ['G']),
  ing(174,'Yogurt greco',        'Uova e latticini', 2, ['G']),
  // Dolce
  ing(190,'Gelato alla vaniglia','Dolce', 3, ['G'], { frequente: true }),
  ing(191,'Panna montata',       'Dolce', 1.5, ['G']),
  ing(192,'Cioccolato fondente', 'Dolce', 2),
  ing(193,'Caffè',               'Dolce', 1),
  ing(194,'Cacao amaro',         'Dolce', 0.5),
  ing(195,'Miele',               'Dolce', 1),
  // Bar
  ing(210,'Ghiaccio',            'Bar', 0, [], { frequente: true }),
  ing(211,'Soda',                'Bar', 0.5),
  ing(212,'Acqua tonica',        'Bar', 1.5),
  ing(213,'Scorza d’arancia',    'Bar', 0.5),
  ing(214,'Oliva',               'Bar', 0.5),
  ing(215,'Zucchero di canna',   'Bar', 0),
  ing(216,'Rum bianco',          'Bar', 0, [], { soloRicetta: true }),
  ing(217,'Gin',                 'Bar', 0, [], { soloRicetta: true }),
  ing(218,'Campari',             'Bar', 0, [], { soloRicetta: true }),
  ing(219,'Vermouth rosso',      'Bar', 0, ['L'], { soloRicetta: true }),
  ing(220,'Prosecco',            'Bar', 0, ['L'], { soloRicetta: true }),
  ing(221,'Bitter',              'Bar', 0, [], { soloRicetta: true }),
]

const idIngrediente = (nome: string) => INGREDIENTI.find(i => i.nome === nome)?.id

/** Una riga di ricetta: quanto di quell'ingrediente entra in una porzione. */
export interface RigaRicetta {
  ingredienteId: number
  /** Quantità per porzione, nell'unità dell'ingrediente. */
  qta: number
}

/** Composizione dei piatti: nome e quantità per porzione, risolti in id all'avvio.
 *  Le quantità sono quelle della scheda tecnica: da lì escono food cost e scarico. */
const RICETTE_NOMI: Record<number, Array<[string, number]>> = {
  1:   [['Pane tostato', .08], ['Pomodoro', .12], ['Basilico', .004], ['Aglio', .004], ['Olio EVO', .012]],
  2:   [['Manzo crudo', .12], ['Parmigiano', .02], ['Rucola', .02], ['Olio EVO', .012], ['Limone', .02]],
  16:  [['Burrata', .12], ['Alici del Cantabrico', .03], ['Olio EVO', .01], ['Pepe nero', .002]],
  3:   [['Spaghetti', .11], ['Tuorlo', 2], ['Guanciale', .06], ['Pecorino romano', .03], ['Pepe nero', .002]],
  4:   [['Riso Carnaroli', .09], ['Funghi porcini', .07], ['Burro', .02], ['Parmigiano', .025], ['Prezzemolo', .004]],
  17:  [['Tonnarelli', .12], ['Pecorino romano', .045], ['Pepe nero', .003]],
  5:   [['Rosmarino', .003], ['Sale grosso', .005], ['Olio EVO', .01]],
  6:   [['Lime', .02], ['Finocchietto', .008], ['Olio EVO', .012]],
  114: [['Broccoletti', .18], ['Aglio', .004], ['Olio EVO', .015], ['Peperoncino', .002]],
  115: [['Patate al forno', .22], ['Rosmarino', .003], ['Sale grosso', .004]],
  7:   [['Mascarpone', .09], ['Savoiardi', .05], ['Caffè', .008], ['Cacao amaro', .004], ['Tuorlo', 1]],
  8:   [['Base biscotto', .06], ['Ricotta', .10], ['Coulis ai frutti rossi', .03], ['Frutti rossi', .03]],
  13:  [['Rum bianco', .05], ['Lime', .03], ['Menta', .006], ['Soda', .06], ['Zucchero di canna', .012], ['Ghiaccio', .15]],
  14:  [['Gin', .03], ['Campari', .03], ['Vermouth rosso', .03], ['Scorza d’arancia', .005], ['Ghiaccio', .15]],
  19:  [['Prosecco', .09], ['Bitter', .04], ['Soda', .03], ['Arancia', .02], ['Ghiaccio', .12]],
}

export const RICETTE: Record<number, RigaRicetta[]> = Object.fromEntries(
  Object.entries(RICETTE_NOMI).map(([voceId, righe]) => [
    Number(voceId),
    righe
      .map(([nome, qta]) => ({ ingredienteId: idIngrediente(nome), qta }))
      .filter((r): r is RigaRicetta => r.ingredienteId != null),
  ]),
)

/** Scheda tecnica di una voce: ingrediente, quantità e costo della riga. */
export const ricettaDi = (voceId: number): Array<{ ing: Ingrediente; qta: number; costo: number }> =>
  (RICETTE[voceId] ?? []).flatMap(r => {
    const ing = INGREDIENTI.find(i => i.id === r.ingredienteId)
    return ing ? [{ ing, qta: r.qta, costo: ing.costo * r.qta }] : []
  })

/** Costo materia prima di una porzione. 0 = scheda tecnica ancora da scrivere. */
export const foodCostDi = (voceId: number): number =>
  ricettaDi(voceId).reduce((a, r) => a + r.costo, 0)

/** Costo della materia prima di una singola aggiunta. */
export const costoExtra = (i: Ingrediente) => i.costo * i.porzione

/** Food cost, margine e incidenza di una voce di carta. */
export const margineDi = (v: VoceMenu) => {
  const costo = foodCostDi(v.id)
  const margine = v.prezzo - costo
  return {
    costo,
    margine,
    /** Quanto resta in percentuale sul prezzo di vendita. */
    marginePerc: v.prezzo ? (margine / v.prezzo) * 100 : 0,
    /** Incidenza della materia prima: il numero che si controlla in cucina. */
    foodCostPerc: v.prezzo ? (costo / v.prezzo) * 100 : 0,
    /** Senza scheda tecnica non si dice nulla: meglio il trattino di un numero falso. */
    noScheda: costo === 0,
  }
}

/** Soglia oltre la quale l'incidenza della materia prima va guardata. */
export const SOGLIA_FOOD_COST = 35

/** Catalogo delle aggiunte proponibili in comanda. */
export const INGREDIENTI_EXTRA = INGREDIENTI.filter(i => !i.soloRicetta)

/** Confronto senza accenti né maiuscole: la ricerca deve perdonare la fretta. */
export const normalizzaRicerca = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// ─── Menu del giorno e web menu ──────────────────────────────────────────────

/** Il menu proposto in una data giornata: una selezione di voci, con o senza
 *  prezzo fisso (se manca, il conto è la somma delle voci). */
export interface MenuGiorno {
  id: number
  outletId: number
  /** yyyy-MM-dd */
  data: string
  nome: string
  prezzoFisso: number | null
  note: string
  vociIds: number[]
  attivo: boolean
}

/** Menu digitale pubblicato: si raggiunge da URL o QR, vale per un periodo. */
export interface WebMenu {
  id: number
  /** Vuoto = vale per tutti gli outlet. */
  outletId: number | null
  /** Nome interno, quello con cui lo si cerca qui. */
  nome: string
  /** Titolo che legge l'ospite in testa al menu. */
  titolo: string
  sottotitolo: string
  /** Parte finale dell'indirizzo pubblico. */
  slug: string
  logo: string
  /** Note a piè di pagina: allergeni, IVA, informazioni legali. */
  notePiede: string
  vociIds: number[]
  dal: string
  al: string
  /** Servizio a cui si riferisce, o tutti. */
  servizio: Servizio | 'Tutti'
  mostraPrezzi: boolean
  mostraAllergeni: boolean
  attivo: boolean
  /** Tinta dell'intestazione del menu pubblicato. */
  colore: string
}

export const URL_WEB_MENU = 'https://outlet.sibyllanetwork.it/menu/'
export const URL_MONITOR  = 'https://outlet.sibyllanetwork.it/monitor/'

// ─── Periferiche e servizi (gruppo Generali) ─────────────────────────────────

export type TipoStampante = 'reparto' | 'preconto' | 'fiscale'

export const TIPO_STAMPANTE: Record<TipoStampante, { label: string; ico: string }> = {
  reparto:  { label: 'Reparto di produzione (cucina/bar)', ico: 'fa-kitchen-set' },
  preconto: { label: 'Preconto', ico: 'fa-receipt' },
  fiscale:  { label: 'Fiscale (scontrino/fattura)', ico: 'fa-file-invoice' },
}

export interface Stampante {
  id: number
  nome: string
  tipo: TipoStampante
  /** Linguaggio della stampante: guida la formattazione della comanda. */
  protocollo: 'epson' | 'star' | 'custom'
  ip: string
  /** Outlet servito; null = tutti. */
  outletId: number | null
  attiva: boolean
}

export type RepartoKds = 'cucina' | 'bar' | 'pasticceria' | 'cantina'

export const REPARTO_KDS: Record<RepartoKds, { label: string; ico: string }> = {
  cucina:      { label: 'Cucina',      ico: 'fa-kitchen-set' },
  bar:         { label: 'Bar',         ico: 'fa-martini-glass' },
  pasticceria: { label: 'Pasticceria', ico: 'fa-cake-candles' },
  cantina:     { label: 'Cantina',     ico: 'fa-wine-bottle' },
}

/** Monitor di reparto (KDS): una pagina a sé che gira su un display in cucina. */
export interface MonitorKds {
  id: number
  nome: string
  reparto: RepartoKds
  outletId: number | null
  slug: string
  /** Tema del display: si legge da lontano, in ambienti molto illuminati. */
  sfondo: string
  testo: string
  griglia: string
  topbar: string
  attivo: boolean
}

/** Temi pronti del monitor, come nell'Outlet Manager. */
export const TEMI_KDS: Array<{ id: string; nome: string; sfondo: string; testo: string; griglia: string; topbar: string }> = [
  { id: 'notte',   nome: 'Notte',   sfondo: '#1a1a2e', testo: '#ffffff', griglia: '#2a2a3e', topbar: '#12121f' },
  { id: 'sibylla', nome: 'Sibylla', sfondo: '#204769', testo: '#ffffff', griglia: '#2b5a83', topbar: '#183751' },
  { id: 'carbone', nome: 'Carbone', sfondo: '#1B1D23', testo: '#ffffff', griglia: '#2A2E3A', topbar: '#121419' },
  { id: 'bosco',   nome: 'Bosco',   sfondo: '#1b4332', testo: '#f5f9f8', griglia: '#255c45', topbar: '#123527' },
  { id: 'rubino',  nome: 'Rubino',  sfondo: '#4a1420', testo: '#fff5f6', griglia: '#5f1c2b', topbar: '#360e17' },
]

/** Server di posta usato per mandare QR del wallet e comunicazioni all'ospite. */
export interface ConfigEmail {
  attivo: boolean
  provider: string
  host: string
  porta: number
  starttls: boolean
  ssl: boolean
  username: string
  password: string
  mittente: string
  nomeMittente: string
}

export const PROVIDER_EMAIL: Array<{ id: string; label: string; host: string; porta: number; starttls: boolean; ssl: boolean }> = [
  { id: 'gmail',   label: 'Gmail',          host: 'smtp.gmail.com',      porta: 587, starttls: true,  ssl: false },
  { id: 'outlook', label: 'Outlook/Office', host: 'smtp.office365.com',  porta: 587, starttls: true,  ssl: false },
  { id: 'yahoo',   label: 'Yahoo',          host: 'smtp.mail.yahoo.com', porta: 465, starttls: false, ssl: true },
  { id: 'aruba',   label: 'Aruba',          host: 'smtps.aruba.it',      porta: 465, starttls: false, ssl: true },
  { id: 'libero',  label: 'Libero',         host: 'smtp.libero.it',      porta: 465, starttls: false, ssl: true },
  { id: 'custom',  label: 'Personalizzato', host: '',                    porta: 25,  starttls: false, ssl: false },
]

/** Tessere digitali del wallet cliente su Apple e Google. */
export interface ConfigWallet {
  apple: {
    attivo: boolean
    teamId: string
    passTypeId: string
    organizzazione: string
    certificato: string
    chiave: string
    wwdr: string
    password: string
  }
  google: {
    attivo: boolean
    issuerId: string
    classeId: string
    serviceAccount: string
  }
}

export const CATEGORIE_CLIENTE: CategoriaCliente[] = [
  { id: 0, nome: 'Standard',      scontoPerc: 0, descrizione: '' },
  { id: 3, nome: 'Cliente hotel', scontoPerc: 10, descrizione: '' },
  { id: 2, nome: 'All inclusive', scontoPerc: 100, descrizione: '' },
  { id: 4, nome: 'Personale',     scontoPerc: 50, descrizione: '' },
  { id: 1, nome: 'Direzione',     scontoPerc: 100, descrizione: '' },
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

export const menuGiornoIniziali = (): MenuGiorno[] => [
  {
    id: 1, outletId: 1, data: oggiISO(), nome: 'Menu del giorno',
    prezzoFisso: 28, note: 'Acqua e caffè inclusi',
    vociIds: [1, 3, 5, 114, 7], attivo: true,
  },
]

export const webMenuIniziali = (): WebMenu[] => [
  {
    id: 1, outletId: 1,
    nome: 'Menu pranzo estate',
    titolo: 'Il nostro menu di pranzo',
    sottotitolo: 'Cucina di stagione, ogni giorno',
    slug: 'menu-pranzo-25f343',
    logo: '',
    notePiede: 'Allergeni disponibili su richiesta. Prezzi IVA inclusa.',
    vociIds: [1, 2, 16, 3, 4, 17, 5, 6, 114, 115, 7, 8, 9, 10, 11, 12],
    dal: oggiISO(), al: oggiISO(),
    servizio: 'Pranzo', mostraPrezzi: true, mostraAllergeni: true,
    attivo: true, colore: '#B08A4A',
  },
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

const riga = (
  v: VoceMenu, qta: number, portata: number, stato: StatoRiga, note = '',
  senza: number[] = [], extra: ExtraRiga[] = [], daMinuti = 0,
): RigaComanda => ({
  id: `r${v.id}-${Math.random().toString(36).slice(2, 7)}`,
  voceId: v.id, nome: v.nome, prezzo: v.prezzo, qta, portata, note, stato, sconto: 0,
  // Una riga in lavorazione aspetta da qualche minuto, non da quando si è aperto
  // il tavolo: è la differenza fra un monitor credibile e uno tutto rosso.
  inviataAlle: stato === 'in-comanda' ? null : oraMenoMinuti(daMinuti || 4),
  senza, extra,
})

const voce = (id: number) => VOCI_MENU.find(v => v.id === id)!

export const comandeIniziali = (): Comanda[] => [
  {
    id: 1, numero: '001', outletId: 1, salaId: 1, tavoloId: 1001, turnoId: 4,
    coperti: 4, cameriere: 'Marco R.', categoriaClienteId: 0,
    nota: '', apertaAlle: oraMenoMinuti(35), chiusaAlle: null, stato: 'aperta', addebitoCamera: '', pagamento: null,
    righe: [
      riga(voce(1), 2, 1, 'servita'),
      // Carbonara senza guanciale, con l'aggiunta del tartufo: la personalizzazione
      // dell'ospite viaggia con la riga, in cucina e sul conto.
      riga(voce(3), 2, 2, 'in-preparazione', '', [idIngrediente('Guanciale')!], [
        { ingredienteId: idIngrediente('Crema di tartufo')!, nome: 'Crema di tartufo', prezzo: 5, qta: 1 },
      ], 9),
      riga(voce(100), 1, 0, 'servita'),
      riga(voce(10), 2, 0, 'servita'),
    ],
  },
  {
    id: 2, numero: '002', outletId: 1, salaId: 1, tavoloId: 1002, turnoId: 4,
    coperti: 2, cameriere: 'Giulia P.', categoriaClienteId: 3,
    nota: '', apertaAlle: oraMenoMinuti(20), chiusaAlle: null, stato: 'aperta', addebitoCamera: '204', pagamento: null,
    righe: [
      riga(voce(16), 1, 1, 'inviata', '', [], [], 3),
      riga(voce(17), 2, 2, 'inviata', 'Uno senza pepe', [], [], 8),
      riga(voce(110), 1, 0, 'servita'),
    ],
  },
  {
    id: 3, numero: '003', outletId: 1, salaId: 1, tavoloId: 1004, turnoId: 4,
    coperti: 6, cameriere: 'Marco R.', categoriaClienteId: 0,
    nota: '', apertaAlle: oraMenoMinuti(55), chiusaAlle: null, stato: 'aperta', addebitoCamera: '', pagamento: null,
    righe: [
      riga(voce(2), 3, 1, 'servita'),
      riga(voce(5), 4, 3, 'pronta', '', [], [], 2),
      riga(voce(114), 2, 3, 'in-preparazione', '', [], [], 16),
      riga(voce(101), 2, 0, 'servita'),
    ],
  },
  {
    id: 4, numero: '004', outletId: 1, salaId: 1, tavoloId: 1007, turnoId: 4,
    coperti: 4, cameriere: 'Luca V.', categoriaClienteId: 0,
    nota: '', apertaAlle: oraMenoMinuti(85), chiusaAlle: null, stato: 'aperta', addebitoCamera: '', pagamento: null,
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
    nota: '', apertaAlle: oraMenoMinuti(10), chiusaAlle: null, stato: 'aperta', addebitoCamera: '', pagamento: null,
    righe: [riga(voce(19), 2, 0, 'servita')],
  },
  {
    id: 6, numero: '006', outletId: 1, salaId: 1, tavoloId: 1016, turnoId: 4,
    coperti: 4, cameriere: 'Giulia P.', categoriaClienteId: 0,
    nota: '', apertaAlle: oraMenoMinuti(40), chiusaAlle: null, stato: 'aperta', addebitoCamera: '', pagamento: null,
    righe: [
      riga(voce(1), 2, 1, 'servita'),
      riga(voce(3), 1, 2, 'inviata', '', [], [], 2),
      riga(voce(17), 1, 2, 'inviata', '', [], [], 5),
      riga(voce(11), 4, 0, 'servita'),
    ],
  },
  // ── Conti già incassati: sono quelli che formano la cassa del turno ──
  {
    id: 7, numero: '007', outletId: 1, salaId: 1, tavoloId: 1003, turnoId: 4,
    coperti: 2, cameriere: 'Luca V.', categoriaClienteId: 0,
    nota: '', apertaAlle: oraMenoMinuti(150), chiusaAlle: oraMenoMinuti(95),
    stato: 'chiusa', addebitoCamera: '', pagamento: 'carta',
    righe: [
      riga(voce(2), 2, 1, 'servita', '', [], [], 95),
      riga(voce(5), 2, 3, 'servita', '', [], [], 95),
      riga(voce(100), 1, 0, 'servita', '', [], [], 95),
    ],
  },
  {
    id: 8, numero: '008', outletId: 1, salaId: 1, tavoloId: 1005, turnoId: 4,
    coperti: 4, cameriere: 'Marco R.', categoriaClienteId: 3,
    nota: '', apertaAlle: oraMenoMinuti(170), chiusaAlle: oraMenoMinuti(110),
    stato: 'chiusa', addebitoCamera: '204', pagamento: 'camera',
    righe: [
      riga(voce(16), 2, 1, 'servita', '', [], [], 110),
      riga(voce(4), 2, 2, 'servita', '', [], [], 110),
      riga(voce(7), 4, 4, 'servita', '', [], [], 110),
      riga(voce(110), 2, 0, 'servita', '', [], [], 110),
    ],
  },
  {
    id: 9, numero: '009', outletId: 1, salaId: 2, tavoloId: 2002, turnoId: 4,
    coperti: 2, cameriere: 'Elena F.', categoriaClienteId: 0,
    nota: '', apertaAlle: oraMenoMinuti(80), chiusaAlle: oraMenoMinuti(40),
    stato: 'chiusa', addebitoCamera: '', pagamento: 'contanti',
    righe: [
      riga(voce(13), 2, 0, 'servita', '', [], [], 40),
      riga(voce(19), 2, 0, 'servita', '', [], [], 40),
      riga(voce(1), 1, 1, 'servita', '', [], [], 40),
    ],
  },
  {
    id: 10, numero: '010', outletId: 1, salaId: 1, tavoloId: 1012, turnoId: 4,
    coperti: 3, cameriere: 'Sara T.', categoriaClienteId: 0,
    nota: '', apertaAlle: oraMenoMinuti(120), chiusaAlle: oraMenoMinuti(60),
    stato: 'chiusa', addebitoCamera: '', pagamento: 'wallet',
    righe: [
      riga(voce(17), 3, 2, 'servita', '', [], [], 60),
      riga(voce(8), 3, 4, 'servita', '', [], [], 60),
      riga(voce(12), 3, 0, 'servita', '', [], [], 60),
    ],
  },
]

/** Turno di cassa già aperto: il servizio in corso è cominciato prima di noi. */
export const cassaIniziale = (): TurnoCassa => ({
  id: 1,
  data: oggiISO(),
  apertaAlle: oraMenoMinuti(210),
  chiusaAlle: null,
  operatore: 'Luca V.',
  fondo: 150,
  contato: null,
  incassi: { contanti: 0, carta: 0, camera: 0, wallet: 0 },
  coperti: 0,
  conti: 0,
  storni: 0,
})

export const storniIniziali = (): Storno[] => [
  {
    id: 'st-seed-1', comandaId: 8, numero: '008', tavolo: '005',
    voce: 'Risotto ai funghi', qta: 1, valore: 14,
    motivo: 'Ritardo in cucina', operatore: 'Marco R.', ora: oraMenoMinuti(118), giaInviata: true,
  },
  {
    id: 'st-seed-2', comandaId: 7, numero: '007', tavolo: '003',
    voce: 'Vino rosso al calice', qta: 2, valore: 12,
    motivo: 'Errore di battitura', operatore: 'Luca V.', ora: oraMenoMinuti(140), giaInviata: false,
  },
]
