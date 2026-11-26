/**
 * Sito Sibylla Network — catalogo dimostrativo (mock).
 * Quattro categorie come il sito attuale (Soggiorni, Esperienze, Prodotti,
 * Servizi). Le foto sono di Unsplash (licenza libera), servite dal loro CDN.
 */
import { loc, t } from './i18n'

export type Categoria = 'soggiorni' | 'esperienze' | 'prodotti' | 'servizi'

export interface Offerta {
  id: string
  cat: Categoria
  titolo: string
  /** Variante o formula (es. "Privato · 3 ore · diurno"). */
  formula: string
  citta: string
  regione: string
  foto: string[]
  prezzo: number
  /** Prezzo pieno se in offerta. */
  prezzoPieno?: number
  unita: string
  daPrezzo?: boolean
  voto: number
  recensioni: number
  durata?: string
  etichetta?: 'Più scelto' | 'Novità' | 'Offerta' | 'Solo su Network'
  partner: string
  cancellazione: boolean
  descrizione: string
  include: string[]
  /** Orari prenotabili (esperienze, servizi). */
  orari?: string[]
  lingue?: string[]
  incontro?: string
  /** Dati della struttura (solo soggiorni): alimentano i filtri di ricerca. */
  alloggio?: Alloggio
}

export type TipoAlloggio = 'Hotel' | 'B&B' | 'Dimora storica' | 'Resort' | 'Appartamento' | 'Villa' | 'Agriturismo'
export type Trattamento = 'Solo pernottamento' | 'Colazione inclusa' | 'Mezza pensione'
export type ServizioAlloggio = 'wifi' | 'parcheggio' | 'piscina' | 'spa' | 'aria' | 'ristorante' | 'animali' | 'navetta' | 'palestra' | 'accessibile' | 'vista'

export interface Alloggio {
  tipo: TipoAlloggio
  stelle?: number
  /** Quartiere o zona della località. */
  zona: string
  /** Distanza dal centro, in km. */
  km: number
  trattamento: Trattamento
  servizi: ServizioAlloggio[]
  /** Ospiti massimi per camera o unità. */
  ospiti: number
  pagaInStruttura: boolean
}

export const SERVIZI_ALLOGGIO: Record<ServizioAlloggio, { nome: string; icona: string }> = {
  wifi: { nome: 'Wi-Fi gratuito', icona: 'fa-wifi' },
  parcheggio: { nome: 'Parcheggio', icona: 'fa-square-parking' },
  piscina: { nome: 'Piscina', icona: 'fa-person-swimming' },
  spa: { nome: 'Spa e benessere', icona: 'fa-spa' },
  aria: { nome: 'Aria condizionata', icona: 'fa-snowflake' },
  ristorante: { nome: 'Ristorante', icona: 'fa-utensils' },
  animali: { nome: 'Animali ammessi', icona: 'fa-paw' },
  navetta: { nome: 'Navetta', icona: 'fa-van-shuttle' },
  palestra: { nome: 'Palestra', icona: 'fa-dumbbell' },
  accessibile: { nome: 'Accessibile in sedia a rotelle', icona: 'fa-wheelchair' },
  vista: { nome: 'Vista panoramica', icona: 'fa-binoculars' },
}
export const TIPI_ALLOGGIO: TipoAlloggio[] = ['Hotel', 'B&B', 'Dimora storica', 'Resort', 'Appartamento', 'Villa', 'Agriturismo']
export const TRATTAMENTI: Trattamento[] = ['Solo pernottamento', 'Colazione inclusa', 'Mezza pensione']

export const CATEGORIE: { id: Categoria; nome: string; icona: string; claim: string }[] = [
  { id: 'soggiorni', nome: 'Soggiorni', icona: 'fa-bed-front', claim: 'Hotel e dimore selezionate dalla rete' },
  { id: 'esperienze', nome: 'Esperienze', icona: 'fa-ferris-wheel', claim: 'Tour, sapori ed emozioni sul territorio' },
  { id: 'prodotti', nome: 'Prodotti', icona: 'fa-box-heart', claim: 'Il Made in Italy direttamente a casa' },
  { id: 'servizi', nome: 'Servizi', icona: 'fa-suitcase-rolling', claim: 'Un viaggio senza pensieri' },
]

export const foto = (id: string, w = 900, h?: number) =>
  `https://images.unsplash.com/photo-${id}?w=${w}${h ? `&h=${h}` : ''}&q=70&auto=format&fit=crop`

const F = {
  colosseo: '1552832230-c0197dd311b5',
  trevi: '1525874684015-58379d421a52',
  tevere: '1529260830199-42c24126f198',
  resort: '1566073771259-6a8506099945',
  camera: '1582719478250-c89cae4dc85b',
  cameraClassica: '1590490360182-c33d57733427',
  vino: '1510812431401-41d2bd2722f3',
  olio: '1474979266404-7eaacbcd87c5',
  ristorante: '1555396273-367ea4eb4db5',
  pasta: '1498579150354-977475b7ea0b',
  manarola: '1516483638261-f4dbaf036963',
  rialto: '1523906834658-6e24ef2386f9',
  sanPietro: '1531572753322-ad063cecc140',
  colosseoArchi: '1515542622106-78bda8ba0e5b',
  piscinaNotte: '1542314831-068cd1dbfeeb',
  piscina: '1551882547-ff40c63fe5fa',
  vernazza: '1499678329028-101435549a4e',
  pizza: '1565299624946-b28f40a0ae38',
  valigia: '1473625247510-8ceb1760943f',
  cena: '1414235077428-338989a2e8c0',
  sapori: '1504674900247-0877df9cc836',
  assistenza: '1556761175-5973dc0f32e7',
  mappa: '1488646953014-85cb44e25828',
  mare: '1506929562872-bb421503ef21',
}
export const FOTO = F

export const OFFERTE: Offerta[] = [
  // ── Esperienze ───────────────────────────────────────────────────────
  {
    id: 'dolce-vita', cat: 'esperienze', titolo: 'Dolce Vita Tour', formula: 'Privato · 3 ore · diurno',
    citta: 'Roma', regione: 'Lazio', foto: [F.colosseo, F.trevi, F.sanPietro], prezzo: 590, unita: 'a gruppo', daPrezzo: true,
    voto: 4.9, recensioni: 312, durata: '3 ore', etichetta: 'Più scelto', partner: 'Leaving Room Italia', cancellazione: true,
    descrizione: "Roma come nei film: a bordo di una Fiat 500 d'epoca con autista e guida, dal Colosseo a Fontana di Trevi fino al Gianicolo. Soste fotografiche dove volete voi e un caffè in una torrefazione storica.",
    include: ["Fiat 500 d'epoca con autista", 'Guida in italiano o inglese', 'Soste fotografiche', 'Caffè in torrefazione storica'],
    orari: ['09:00', '11:00', '14:00', '16:30'], lingue: ['Italiano', 'Inglese', 'Spagnolo'], incontro: 'Piazza del Colosseo, lato metro',
  },
  {
    id: 'dolce-vita-notte', cat: 'esperienze', titolo: 'Dolce Vita Tour by night', formula: 'Privato · 2 ore · serale',
    citta: 'Roma', regione: 'Lazio', foto: [F.trevi, F.colosseoArchi, F.tevere], prezzo: 690, unita: 'a gruppo', daPrezzo: true,
    voto: 4.8, recensioni: 148, durata: '2 ore', partner: 'Leaving Room Italia', cancellazione: true,
    descrizione: 'La città illuminata, le piazze silenziose e un brindisi finale con vista sui Fori. Il tour più romantico della rete.',
    include: ["Fiat 500 d'epoca con autista", 'Brindisi con vista sui Fori', 'Coperta e kit fotografico'],
    orari: ['20:00', '21:00', '22:00', '23:00'], lingue: ['Italiano', 'Inglese'], incontro: 'Hotel di partenza a Roma centro',
  },
  {
    id: 'golf-cart', cat: 'esperienze', titolo: 'Golf Cart Tour', formula: 'Condiviso · 3 ore',
    citta: 'Roma', regione: 'Lazio', foto: [F.sanPietro, F.tevere, F.trevi], prezzo: 100, unita: 'a persona', daPrezzo: true,
    voto: 4.7, recensioni: 421, durata: '3 ore', partner: 'Gar Ghost srl', cancellazione: true,
    descrizione: 'In golf cart elettrico fra le sette meraviglie del centro storico: silenzioso, sostenibile e senza fatica, anche nei vicoli dove le auto non arrivano.',
    include: ['Golf cart elettrico', 'Guida certificata', 'Auricolari', 'Acqua Egeria'],
    orari: ['10:00', '15:00'], lingue: ['Italiano', 'Inglese', 'Francese'], incontro: 'Piazza Venezia, Vittoriano',
  },
  {
    id: 'colosseo-prioritario', cat: 'esperienze', titolo: 'Colosseo e Fori Imperiali', formula: 'Accesso prioritario · guida',
    citta: 'Roma', regione: 'Lazio', foto: [F.colosseoArchi, F.colosseo], prezzo: 69, prezzoPieno: 79, unita: 'a persona',
    voto: 4.8, recensioni: 1260, durata: '2 ore e 30', etichetta: 'Offerta', partner: 'La Torre srl', cancellazione: true,
    descrizione: "Saltate la fila e scendete nell'arena con una guida archeologa: il Colosseo, il Foro Romano e il Palatino in un unico percorso.",
    include: ['Biglietto salta fila', 'Guida archeologa', 'Accesso all’arena', 'Foro Romano e Palatino'],
    orari: ['08:30', '10:30', '13:00', '15:30'], lingue: ['Italiano', 'Inglese', 'Tedesco'], incontro: 'Arco di Costantino',
  },
  {
    id: 'corso-pasta', cat: 'esperienze', titolo: 'Corso di pasta fresca', formula: 'In piccolo gruppo · Trastevere',
    citta: 'Roma', regione: 'Lazio', foto: [F.pasta, F.ristorante], prezzo: 85, unita: 'a persona',
    voto: 4.9, recensioni: 207, durata: '3 ore', etichetta: 'Novità', partner: 'Osteria della Mole', cancellazione: true,
    descrizione: 'Fettuccine, ravioli e tonnarelli a mano con una sfoglina romana, poi a tavola con quello che avete preparato e un calice di Cesanese.',
    include: ['Ingredienti e grembiule', 'Pranzo o cena', 'Calice di vino', 'Ricettario digitale'],
    orari: ['11:00', '18:00'], lingue: ['Italiano', 'Inglese'], incontro: 'Via della Lungaretta, Trastevere',
  },
  {
    id: 'cena-fori', cat: 'esperienze', titolo: 'Cena gourmet con vista Fori', formula: 'Menu degustazione 6 portate',
    citta: 'Roma', regione: 'Lazio', foto: [F.cena, F.ristorante], prezzo: 140, unita: 'a persona',
    voto: 4.7, recensioni: 96, durata: '2 ore', etichetta: 'Solo su Network', partner: 'GAR S.R.L', cancellazione: false,
    descrizione: 'Terrazza panoramica sui Fori Imperiali e un menu che racconta il Lazio, abbinato ai vini della rete.',
    include: ['Menu degustazione 6 portate', 'Abbinamento vini', 'Tavolo in terrazza'],
    orari: ['19:30', '21:00'], lingue: ['Italiano', 'Inglese'], incontro: 'Via dei Fori Imperiali',
  },
  {
    id: 'cinque-terre', cat: 'esperienze', titolo: 'Cinque Terre al tramonto', formula: 'In barca · aperitivo a bordo',
    citta: 'Manarola', regione: 'Liguria', foto: [F.manarola, F.vernazza], prezzo: 95, unita: 'a persona',
    voto: 4.9, recensioni: 534, durata: '2 ore', partner: 'Gar Ghost srl', cancellazione: true,
    descrizione: 'Dal porto di Manarola a Vernazza mentre il sole scende sul mare, con aperitivo ligure a bordo e bagno nelle calette.',
    include: ['Barca con skipper', 'Aperitivo ligure', 'Sosta bagno'],
    orari: ['17:30', '18:30'], lingue: ['Italiano', 'Inglese'], incontro: 'Porticciolo di Manarola',
  },

  // ── Soggiorni ────────────────────────────────────────────────────────
  {
    id: 'palazzo-esquilino', cat: 'soggiorni', titolo: 'Palazzo Esquilino', formula: 'Boutique hotel ★★★★ · Doppia superior',
    citta: 'Roma', regione: 'Lazio', foto: [F.cameraClassica, F.camera, F.colosseo], prezzo: 189, prezzoPieno: 220, unita: 'a notte', daPrezzo: true,
    voto: 4.8, recensioni: 642, etichetta: 'Offerta', partner: 'Sibylla', cancellazione: true,
    descrizione: 'Palazzo di fine Ottocento a dieci minuti dal Colosseo: camere ampie, colazione con prodotti del territorio e concierge digitale con i totem della rete.',
    include: ['Colazione inclusa', 'Wi-Fi veloce', 'Concierge digitale', 'Deposito bagagli gratuito'],
    alloggio: { tipo: 'Hotel', stelle: 4, zona: 'Esquilino', km: 1.4, trattamento: 'Colazione inclusa', servizi: ['wifi', 'aria', 'ristorante', 'accessibile', 'palestra'], ospiti: 3, pagaInStruttura: true },
  },
  {
    id: 'trevi-suites', cat: 'soggiorni', titolo: 'Residenza Trevi Suites', formula: 'Suite ★★★★ · centro storico',
    citta: 'Roma', regione: 'Lazio', foto: [F.camera, F.trevi], prezzo: 240, unita: 'a notte', daPrezzo: true,
    voto: 4.9, recensioni: 318, etichetta: 'Più scelto', partner: 'Leaving Room Italia', cancellazione: true,
    descrizione: 'Sei suite a due passi da Fontana di Trevi, con terrazza comune sui tetti e check-in senza attese.',
    include: ['Colazione in camera', 'Terrazza panoramica', 'Check-in digitale'],
    alloggio: { tipo: 'Hotel', stelle: 4, zona: 'Centro storico', km: 0.3, trattamento: 'Colazione inclusa', servizi: ['wifi', 'aria', 'vista'], ospiti: 2, pagaInStruttura: false },
  },
  {
    id: 'villa-ardea', cat: 'soggiorni', titolo: 'Villa Ardea Resort & Spa', formula: 'Resort ★★★★★ · Junior suite',
    citta: 'Ardea', regione: 'Lazio', foto: [F.piscinaNotte, F.resort, F.piscina], prezzo: 310, unita: 'a notte', daPrezzo: true,
    voto: 4.7, recensioni: 205, etichetta: 'Solo su Network', partner: 'La Torre srl', cancellazione: false,
    descrizione: 'Piscina, spa e pineta a mezz’ora da Roma: il resort della rete per chi vuole la città di giorno e il silenzio di sera.',
    include: ['Mezza pensione', 'Accesso spa', 'Navetta per Roma'],
    alloggio: { tipo: 'Resort', stelle: 5, zona: 'Litorale', km: 3.5, trattamento: 'Mezza pensione', servizi: ['wifi', 'parcheggio', 'piscina', 'spa', 'aria', 'ristorante', 'navetta', 'palestra', 'accessibile'], ospiti: 4, pagaInStruttura: true },
  },
  {
    id: 'ca-rialto', cat: 'soggiorni', titolo: "Ca' Rialto Guest House", formula: 'Dimora storica · vista canale',
    citta: 'Venezia', regione: 'Veneto', foto: [F.rialto, F.cameraClassica], prezzo: 165, unita: 'a notte', daPrezzo: true,
    voto: 4.6, recensioni: 284, partner: 'Gar Ghost srl', cancellazione: true,
    descrizione: 'Cinque camere affacciate sul Canal Grande a cento metri dal ponte di Rialto, in una casa veneziana del Seicento.',
    include: ['Colazione', 'Vista canale', 'Transfer in taxi acqueo scontato'],
    alloggio: { tipo: 'Dimora storica', zona: 'San Polo', km: 0.6, trattamento: 'Colazione inclusa', servizi: ['wifi', 'aria', 'vista', 'animali'], ospiti: 2, pagaInStruttura: true },
  },
  {
    id: 'dimora-mare', cat: 'soggiorni', titolo: 'Dimora sul mare', formula: 'Villa con piscina · 6 ospiti',
    citta: 'Villasimius', regione: 'Sardegna', foto: [F.mare, F.piscina, F.resort], prezzo: 420, unita: 'a notte', daPrezzo: true,
    voto: 4.8, recensioni: 77, etichetta: 'Novità', partner: 'GAR S.R.L', cancellazione: true,
    descrizione: 'Villa a picco su una caletta turchese, con piscina a sfioro e barca a disposizione su richiesta.',
    include: ['Piscina privata', 'Pulizia giornaliera', 'Barca su richiesta'],
    alloggio: { tipo: 'Villa', zona: 'Costa sud', km: 4.2, trattamento: 'Solo pernottamento', servizi: ['wifi', 'parcheggio', 'piscina', 'aria', 'vista', 'animali'], ospiti: 6, pagaInStruttura: false },
  },

  {
    id: 'hotel-navona', cat: 'soggiorni', titolo: 'Hotel Navona', formula: 'Hotel ★★★ · Doppia classic',
    citta: 'Roma', regione: 'Lazio', foto: [F.cameraClassica, F.trevi], prezzo: 155, prezzoPieno: 178, unita: 'a notte', daPrezzo: true,
    voto: 4.5, recensioni: 912, etichetta: 'Offerta', partner: 'Roma Incoming', cancellazione: true,
    descrizione: 'A cinquanta passi da Piazza Navona, camere essenziali e luminose per chi vuole girare Roma tutta a piedi.',
    include: ['Colazione', 'Wi-Fi', 'Deposito bagagli'],
    alloggio: { tipo: 'Hotel', stelle: 3, zona: 'Centro storico', km: 0.4, trattamento: 'Colazione inclusa', servizi: ['wifi', 'aria', 'accessibile'], ospiti: 3, pagaInStruttura: true },
  },
  {
    id: 'trastevere-bb', cat: 'soggiorni', titolo: 'B&B Vicolo del Cinque', formula: 'B&B · camera con bagno privato',
    citta: 'Roma', regione: 'Lazio', foto: [F.tevere, F.camera], prezzo: 95, unita: 'a notte', daPrezzo: true,
    voto: 4.7, recensioni: 431, etichetta: 'Più scelto', partner: 'Leaving Room Italia', cancellazione: true,
    descrizione: 'Quattro camere in un palazzetto di Trastevere: colazione fatta in casa e le trattorie migliori sotto casa.',
    include: ['Colazione fatta in casa', 'Wi-Fi', 'Check-in fino a mezzanotte'],
    alloggio: { tipo: 'B&B', zona: 'Trastevere', km: 1.8, trattamento: 'Colazione inclusa', servizi: ['wifi', 'aria', 'animali'], ospiti: 2, pagaInStruttura: true },
  },
  {
    id: 'prati-loft', cat: 'soggiorni', titolo: 'Loft Prati San Pietro', formula: 'Appartamento · 2 camere · 4 ospiti',
    citta: 'Roma', regione: 'Lazio', foto: [F.sanPietro, F.camera], prezzo: 130, unita: 'a notte', daPrezzo: true,
    voto: 4.6, recensioni: 156, partner: 'GAR S.R.L', cancellazione: false,
    descrizione: 'Loft con cucina a dieci minuti a piedi da San Pietro: comodo per famiglie e soggiorni lunghi.',
    include: ['Cucina attrezzata', 'Lavatrice', 'Biancheria e pulizie finali'],
    alloggio: { tipo: 'Appartamento', zona: 'Prati', km: 2.6, trattamento: 'Solo pernottamento', servizi: ['wifi', 'aria', 'parcheggio'], ospiti: 4, pagaInStruttura: false },
  },
  {
    id: 'hotel-san-marco', cat: 'soggiorni', titolo: 'Hotel Ala San Marco', formula: 'Hotel ★★★★ · Deluxe vista laguna',
    citta: 'Venezia', regione: 'Veneto', foto: [F.camera, F.rialto], prezzo: 230, unita: 'a notte', daPrezzo: true,
    voto: 4.8, recensioni: 509, etichetta: 'Solo su Network', partner: 'Gar Ghost srl', cancellazione: true,
    descrizione: 'Affacciato sul bacino di San Marco, con altana panoramica e ristorante di cucina veneziana.',
    include: ['Colazione', 'Altana panoramica', 'Transfer in taxi acqueo scontato'],
    alloggio: { tipo: 'Hotel', stelle: 4, zona: 'San Marco', km: 0.2, trattamento: 'Colazione inclusa', servizi: ['wifi', 'aria', 'ristorante', 'vista', 'palestra'], ospiti: 3, pagaInStruttura: true },
  },
  {
    id: 'manarola-mare', cat: 'soggiorni', titolo: 'Camere sul Porticciolo', formula: 'B&B · vista mare',
    citta: 'Manarola', regione: 'Liguria', foto: [F.manarola, F.cameraClassica], prezzo: 120, unita: 'a notte', daPrezzo: true,
    voto: 4.9, recensioni: 288, etichetta: 'Più scelto', partner: 'Italia Autentica TO', cancellazione: true,
    descrizione: 'Camere colorate sopra il porticciolo di Manarola: si sente il mare dal letto e i sentieri partono sotto casa.',
    include: ['Colazione in terrazza', 'Vista mare', 'Pass treno Cinque Terre scontato'],
    alloggio: { tipo: 'B&B', zona: 'Borgo', km: 0.1, trattamento: 'Colazione inclusa', servizi: ['wifi', 'vista'], ospiti: 2, pagaInStruttura: true },
  },
  {
    id: 'vernazza-terrazze', cat: 'soggiorni', titolo: 'Hotel Le Terrazze', formula: 'Hotel ★★★ · Doppia con terrazzo',
    citta: 'Vernazza', regione: 'Liguria', foto: [F.vernazza, F.camera], prezzo: 145, unita: 'a notte', daPrezzo: true,
    voto: 4.4, recensioni: 203, etichetta: 'Novità', partner: 'Italia Autentica TO', cancellazione: false,
    descrizione: 'Terrazzi privati sul porto di Vernazza e ristorante di pesce del giorno al piano terra.',
    include: ['Colazione', 'Terrazzo privato', 'Ristorante convenzionato'],
    alloggio: { tipo: 'Hotel', stelle: 3, zona: 'Porto', km: 0.2, trattamento: 'Colazione inclusa', servizi: ['wifi', 'ristorante', 'vista', 'animali'], ospiti: 3, pagaInStruttura: true },
  },
  {
    id: 'agriturismo-piglio', cat: 'soggiorni', titolo: 'Agriturismo Colle Cesanese', formula: 'Agriturismo · tra le vigne',
    citta: 'Piglio', regione: 'Lazio', foto: [F.vino, F.ristorante], prezzo: 110, unita: 'a notte', daPrezzo: true,
    voto: 4.8, recensioni: 134, partner: 'Cantine del Piglio', cancellazione: true,
    descrizione: 'Casale in mezzo ai filari del Cesanese: cena con i prodotti dell’azienda e degustazione in cantina.',
    include: ['Mezza pensione', 'Degustazione in cantina', 'Biciclette'],
    alloggio: { tipo: 'Agriturismo', zona: 'Colline', km: 2.1, trattamento: 'Mezza pensione', servizi: ['wifi', 'parcheggio', 'piscina', 'ristorante', 'animali', 'accessibile'], ospiti: 4, pagaInStruttura: true },
  },

  // ── Prodotti ─────────────────────────────────────────────────────────
  {
    id: 'olio-sabina', cat: 'prodotti', titolo: 'Olio EVO Sabina DOP', formula: 'Bottiglia 0,75 l',
    citta: 'Rieti', regione: 'Lazio', foto: [F.olio], prezzo: 18.5, unita: 'cad.',
    voto: 4.9, recensioni: 188, etichetta: 'Più scelto', partner: 'Frantoio Sabino', cancellazione: false,
    descrizione: 'Olio extravergine della Sabina, frangitura a freddo entro sei ore dalla raccolta. Fruttato medio, note di carciofo.',
    include: ['Spedizione in 48 ore', 'Confezione protettiva'],
  },
  {
    id: 'cesanese', cat: 'prodotti', titolo: 'Cesanese del Piglio DOCG', formula: 'Cassetta da 3 bottiglie',
    citta: 'Piglio', regione: 'Lazio', foto: [F.vino], prezzo: 54, prezzoPieno: 62, unita: 'cad.',
    voto: 4.7, recensioni: 96, etichetta: 'Offerta', partner: 'Cantine del Piglio', cancellazione: false,
    descrizione: "Il rosso più antico del Lazio: tre annate a confronto, selezionate dai sommelier della rete.",
    include: ['3 bottiglie 0,75 l', 'Scheda di degustazione'],
  },
  {
    id: 'box-sapori', cat: 'prodotti', titolo: 'Box Sapori di Roma', formula: 'Pasta, guanciale, pecorino, salsa tartufata',
    citta: 'Roma', regione: 'Lazio', foto: [F.sapori], prezzo: 49, unita: 'cad.',
    voto: 4.8, recensioni: 143, etichetta: 'Solo su Network', partner: 'Sibylla', cancellazione: false,
    descrizione: "Tutto per una carbonara e un'amatriciana come in trattoria, più la salsa tartufata dei produttori della rete.",
    include: ['Pasta di Gragnano IGP', 'Guanciale', 'Pecorino Romano DOP', 'Salsa tartufata'],
  },
  {
    id: 'kit-pizza', cat: 'prodotti', titolo: 'Kit pizza napoletana', formula: 'Per 4 pizze',
    citta: 'Napoli', regione: 'Campania', foto: [F.pizza], prezzo: 24, unita: 'cad.',
    voto: 4.6, recensioni: 61, etichetta: 'Novità', partner: 'Gar Ghost srl', cancellazione: false,
    descrizione: 'Farina tipo 1, pomodoro San Marzano DOP, fior di latte e lievito madre essiccato, con la ricetta del pizzaiolo.',
    include: ['Farina 1 kg', 'Pomodoro San Marzano DOP', 'Ricetta illustrata'],
  },

  // ── Servizi ──────────────────────────────────────────────────────────
  {
    id: 'deposito-bagagli', cat: 'servizi', titolo: 'Deposito bagagli', formula: 'Fino a 24 ore · Termini e Colosseo',
    citta: 'Roma', regione: 'Lazio', foto: [F.valigia], prezzo: 6, unita: 'a bagaglio',
    voto: 4.8, recensioni: 902, etichetta: 'Più scelto', partner: 'Sibylla', cancellazione: true,
    descrizione: 'Lasciate i bagagli in uno dei punti della rete e visitate la città leggeri. Assicurazione inclusa.',
    include: ['Assicurazione fino a 3.000 €', 'Ritiro con QR code'], orari: ['08:00', '12:00', '16:00'],
  },
  {
    id: 'transfer-fco', cat: 'servizi', titolo: 'Transfer privato Fiumicino', formula: 'Aeroporto ↔ hotel · fino a 3 persone',
    citta: 'Roma', regione: 'Lazio', foto: [F.tevere], prezzo: 55, unita: 'a tratta',
    voto: 4.7, recensioni: 388, partner: 'La Torre srl', cancellazione: true,
    descrizione: "Autista che vi aspetta agli arrivi con il cartello, monitoraggio del volo e attesa gratuita di 60 minuti.",
    include: ['Monitoraggio del volo', '60 minuti di attesa', 'Acqua a bordo'], orari: ['Su orario del volo'],
  },
  {
    id: 'guida-digitale', cat: 'servizi', titolo: 'Infopoint digitale', formula: 'Pass totem + app · 72 ore',
    citta: 'Roma', regione: 'Lazio', foto: [F.mappa], prezzo: 9.9, unita: 'a persona',
    voto: 4.5, recensioni: 120, etichetta: 'Novità', partner: 'Sibylla', cancellazione: true,
    descrizione: "I totem della rete diventano la vostra guida: mappe, prenotazioni dell'ultimo minuto e sconti nei locali partner.",
    include: ['Accesso a tutti i totem', 'Sconti nei locali partner', 'Mappe offline'],
  },
  {
    id: 'assistenza', cat: 'servizi', titolo: 'Assistenza human touch', formula: 'Concierge dedicato 7 giorni su 7',
    citta: 'Tutta Italia', regione: 'Italia', foto: [F.assistenza], prezzo: 29, unita: 'a viaggio',
    voto: 4.9, recensioni: 75, partner: 'Sibylla', cancellazione: true,
    descrizione: 'Una persona vera, non un bot: il booking centralizzato di Sibylla segue il vostro viaggio e risolve gli imprevisti.',
    include: ['Numero dedicato', 'Riprenotazioni gratuite', 'Assistenza in 4 lingue'],
  },
]

/** Destinazioni della rete: ogni pagina raccoglie le offerte delle sue località. */
export const DESTINAZIONI = [
  { nome: 'Roma', regione: 'Lazio', foto: F.colosseoArchi, citta: ['Roma'],
    intro: "Duemila anni di storia a portata di passeggiata: dal Colosseo a Trastevere, con gli hotel, le guide e i sapori della rete." },
  { nome: 'Venezia', regione: 'Veneto', foto: F.rialto, citta: ['Venezia'],
    intro: 'Dimore storiche sul Canal Grande e una città da vivere lontano dalla folla, calle dopo calle.' },
  { nome: 'Cinque Terre', regione: 'Liguria', foto: F.vernazza, citta: ['Manarola', 'Vernazza'],
    intro: 'Cinque borghi a picco sul mare: sentieri, barche al tramonto e la cucina ligure dei nostri partner.' },
  { nome: 'Sardegna', regione: 'Mare', foto: F.mare, citta: ['Villasimius'],
    intro: 'Calette turchesi e ville sul mare per chi cerca silenzio, sole e privacy.' },
  { nome: 'Castelli Romani', regione: 'Lazio', foto: F.vino, citta: ['Ardea', 'Piglio'],
    intro: 'Vigne, borghi e resort a mezz’ora da Roma: il Lazio da gustare con calma.' },
]
export const destinazione = (nome: string) => DESTINAZIONI.find(d => d.nome === nome)

export const PARTNER: Record<'hotel' | 'to' | 'fornitori', string[]> = {
  hotel: ['GAR S.R.L', 'Sibylla', 'Leaving Room Italia S.R.L.', 'Gar Ghost srl', 'La Torre srl'],
  to: ['Viaggi del Tevere', 'Italia Autentica TO', 'Roma Incoming'],
  fornitori: ['Acqua Egeria', 'Frantoio Sabino', 'Cantine del Piglio', 'Aaron Truffles'],
}

export const eur = (n: number) => n.toLocaleString(loc(), { style: 'currency', currency: 'EUR', minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })
export const trova = (id: string) => OFFERTE.find(o => o.id === id)
export const nomeCategoria = (c: Categoria) => t(CATEGORIE.find(x => x.id === c)?.nome ?? c)

/** Struttura che ospita il totem (la categoria «Struttura» del totem). */
export const STRUTTURA_OSPITE = {
  nome: 'Hotel Archimede',
  stelle: 4,
  indirizzo: 'Via Vicenza 5/A · Roma',
  foto: [F.cameraClassica, F.camera, F.colosseo],
  telefonoReception: '9',
  servizi: [
    { icona: 'fa-mug-saucer', nome: 'Colazione', info: '7:00 – 10:30 · sala colazioni, piano terra' },
    { icona: 'fa-door-open', nome: 'Check-out', info: 'Entro le 11:00 · late check-out su richiesta' },
    { icona: 'fa-wifi', nome: 'Wi-Fi', info: 'Rete «Archimede-Guest» · password sul cartoncino in camera' },
    { icona: 'fa-bell-concierge', nome: 'Reception', info: 'Aperta 24 ore · tasto 9 dal telefono di camera' },
    { icona: 'fa-utensils', nome: 'Ristorante', info: 'Cena 19:30 – 22:30 · prenotazione in reception' },
    { icona: 'fa-suitcase-rolling', nome: 'Deposito bagagli', info: 'Gratuito il giorno del check-out' },
  ],
}

/** Riga di carrello costruita dalla scelta dell'utente (stessa logica web e totem). */
export function rigaDa(o: Offerta, s: { qta: number; data?: string; dataFine?: string; orario?: string }) {
  const fmtData = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(loc(), { day: 'numeric', month: 'short' })
  if (o.cat === 'soggiorni' && s.data && s.dataFine) {
    const notti = Math.max(1, Math.round((+new Date(s.dataFine) - +new Date(s.data)) / 86400000))
    return {
      id: o.id, qta: s.qta, data: s.data, dataFine: s.dataFine, prezzo: o.prezzo * notti,
      dettaglio: `${fmtData(s.data)} → ${fmtData(s.dataFine)} · ${notti === 1 ? t('{n} notte', { n: notti }) : t('{n} notti', { n: notti })} · ${s.qta === 1 ? t('{n} camera', { n: s.qta }) : t('{n} camere', { n: s.qta })}`,
    }
  }
  const quando = [s.data && fmtData(s.data), s.orario && t(s.orario)].filter(Boolean).join(' · ')
  const quanti = o.unita === 'a persona' ? (s.qta === 1 ? t('{n} persona', { n: s.qta }) : t('{n} persone', { n: s.qta }))
    : o.cat === 'prodotti' ? t('{n} pz', { n: s.qta }) : `${s.qta} × ${t(o.unita.replace('a ', ''))}`
  return { id: o.id, qta: s.qta, data: s.data, orario: s.orario, prezzo: o.prezzo, dettaglio: [quando, quanti].filter(Boolean).join(' · ') }
}

/**
 * Testo di una riga di carrello o d'ordine nella lingua corrente. `dettaglio`
 * è salvato nella lingua in cui la riga è stata aggiunta: dove possibile lo
 * si ricostruisce dai dati della riga.
 */
export function testoRiga(r: { id: string; qta: number; data?: string; dataFine?: string; orario?: string; dettaglio: string; b2b?: boolean; codice?: string; riservato?: string }) {
  const o = trova(r.id)
  if (!o) return t(r.dettaglio)
  const fmtData = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(loc(), { day: 'numeric', month: 'short' })
  if (r.riservato && r.data && r.dataFine) return t('{tipo} · {dal} → {al} · 1 posto · riservato operatori', { tipo: t(r.riservato), dal: fmtData(r.data), al: fmtData(r.dataFine) })
  const base = rigaDa(o, r).dettaglio
  if (!r.b2b) return base
  return r.codice ? t('{dettaglio} · tariffa operatore {codice}', { dettaglio: base, codice: r.codice }) : t('{dettaglio} · tariffa operatore', { dettaglio: base })
}

export const oggiIso = (piu = 0) => { const d = new Date(); d.setDate(d.getDate() + piu); return d.toISOString().slice(0, 10) }
