// ─── STILI DI RISTORANTE ──────────────────────────────────────────────────────
//  Ogni ristorante ha la sua identità: sale e turni, carta (categorie e piatti
//  con le schede tecniche) e brigata. Lo stile si ricava dalla classificazione
//  della scheda cliente (Trattoria, Pizzeria, Etnico, Fine Dining); la brigata
//  cambia da ristorante a ristorante (nomi generati dal nome della struttura).
//  I piatti riusano gli id della carta base: comande, prenotazioni e statistiche
//  restano coerenti, cambiano solo nome, descrizione, prezzo e ricetta.
//  ⚠️ Dati mock — verranno dal backend.

export type StileRistorante = 'trattoria' | 'pizzeria' | 'etnico' | 'fine-dining'

export const stileDa = (classificazione?: string): StileRistorante => {
  const c = (classificazione ?? '').toLowerCase()
  if (c.includes('pizzeria')) return 'pizzeria'
  if (c.includes('etnico')) return 'etnico'
  if (c.includes('fine')) return 'fine-dining'
  return 'trattoria'
}

type Servizio = 'Colazione' | 'Pranzo' | 'Cena'

export interface PiattoStile {
  nome: string
  en: string
  descrizione: string
  prezzo: number
  allergeni: string[]
  /** Scheda tecnica: [ingrediente, quantità]; gli ingredienti assenti dal catalogo si ignorano. */
  ricetta: Array<[string, number]>
}

export interface SpecStile {
  sale: Array<[string, number]>
  turni: Array<[string, Servizio, string, string]>
  /** Categorie di cucina (id della carta base) → nome ed emoji. */
  categorie: Record<number, [string, string]>
  /** Piatti di cucina (id della carta base). */
  piatti: Record<number, PiattoStile>
  /** Ruoli di cucina che lo stile rinomina (es. Chef de partie → Pizzaiolo). */
  ruoli?: Record<string, string>
}

const P = (nome: string, en: string, descrizione: string, prezzo: number, allergeni: string[], ricetta: Array<[string, number]>): PiattoStile =>
  ({ nome, en, descrizione, prezzo, allergeni, ricetta })

export const STILI: Record<StileRistorante, SpecStile> = {
  trattoria: {
    sale: [['Sala interna', 56], ['Dehors', 32]],
    turni: [['Pranzo', 'Pranzo', '12:00', '15:00'], ['Turno 1', 'Cena', '19:00', '21:00'], ['Turno 2', 'Cena', '21:00', '23:30']],
    categorie: { 1: ['Antipasti', '🥗'], 2: ['Primi', '🍝'], 3: ['Secondi', '🥩'], 14: ['Contorni', '🥦'], 4: ['Dolci', '🍮'] },
    piatti: {
      1:   P('Vitello tonnato', 'Vitello tonnato', 'Girello rosa, salsa tonnata, capperi', 12, ['C', 'D'], [['Tonno', .04], ['Maionese', .03], ['Capperi', .005]]),
      2:   P('Battuta al coltello', 'Hand-cut beef tartare', 'Fassona piemontese, olio e limone', 14, [], [['Manzo crudo', .12], ['Olio EVO', .012], ['Limone', .02]]),
      16:  P('Peperoni in bagna cauda', 'Peppers with bagna cauda', 'Aglio, acciughe, olio', 10, ['D'], [['Peperoni', .15], ['Alici del Cantabrico', .02], ['Aglio', .01], ['Olio EVO', .02]]),
      3:   P('Agnolotti del plin', 'Agnolotti del plin', 'Al sugo d’arrosto', 14, ['A', 'C', 'G'], [['Burro', .02], ['Parmigiano', .02]]),
      4:   P('Tajarin al ragù', 'Tajarin with meat ragù', 'Tagliolini all’uovo, ragù di salsiccia', 13, ['A', 'C'], [['Tuorlo', 2], ['Salsa di pomodoro', .06]]),
      17:  P('Risotto al Barolo', 'Barolo risotto', 'Carnaroli, Barolo, Castelmagno', 15, ['G', 'L'], [['Riso Carnaroli', .09], ['Burro', .02], ['Parmigiano', .025]]),
      5:   P('Brasato al Barolo', 'Beef braised in Barolo', 'Cottura lenta, polenta', 20, ['L'], [['Rosmarino', .003], ['Olio EVO', .01]]),
      6:   P('Bollito misto', 'Mixed boiled meats', 'Con bagnetto verde e mostarda', 22, ['J'], [['Prezzemolo', .01], ['Capperi', .005]]),
      114: P('Spinaci al burro', 'Buttered spinach', 'Burro e parmigiano', 5, ['G'], [['Spinaci saltati', .18], ['Burro', .015]]),
      115: P('Patate al forno', 'Roast potatoes', 'Rosmarino e sale grosso', 5, [], [['Patate al forno', .22], ['Rosmarino', .003]]),
      7:   P('Bonet', 'Bonet', 'Budino al cacao e amaretti', 6.5, ['A', 'C', 'G', 'H'], [['Cacao amaro', .01], ['Tuorlo', 1]]),
      8:   P('Panna cotta', 'Panna cotta', 'Con caramello o frutti di bosco', 6, ['G'], [['Frutti rossi', .03]]),
    },
  },
  pizzeria: {
    sale: [['Sala del forno', 64], ['Veranda', 28]],
    turni: [['Pranzo', 'Pranzo', '12:00', '15:30'], ['Cena', 'Cena', '19:00', '21:15'], ['Dopocena', 'Cena', '21:15', '00:00']],
    categorie: { 1: ['Antipasti e fritti', '🧆'], 2: ['Pizze classiche', '🍕'], 3: ['Pizze speciali', '🍕'], 14: ['Fritti', '🍟'], 4: ['Dolci', '🧁'] },
    piatti: {
      1:   P('Montanara fritta', 'Fried montanara', 'Pomodoro, parmigiano, basilico', 5, ['A', 'G'], [['Salsa di pomodoro', .06], ['Parmigiano', .01], ['Basilico', .003]]),
      2:   P('Frittatina di pasta', 'Fried pasta frittata', 'Bucatini, besciamella, piselli', 4, ['A', 'C', 'G'], [['Prosciutto cotto', .02], ['Parmigiano', .01]]),
      16:  P('Bufala e crudo', 'Buffalo mozzarella and ham', 'Mozzarella di bufala DOP, crudo di Parma', 12, ['G'], [['Mozzarella', .15], ['Prosciutto crudo', .05]]),
      3:   P('Margherita', 'Margherita', 'Pomodoro San Marzano, fior di latte, basilico', 7, ['A', 'G'], [['Salsa di pomodoro', .08], ['Mozzarella', .12], ['Basilico', .003], ['Olio EVO', .01]]),
      4:   P('Marinara', 'Marinara', 'Pomodoro, aglio, origano', 6, ['A'], [['Salsa di pomodoro', .09], ['Aglio', .004], ['Olio EVO', .01]]),
      17:  P('Diavola', 'Diavola', 'Pomodoro, fior di latte, salame piccante', 8.5, ['A', 'G'], [['Salsa di pomodoro', .08], ['Mozzarella', .12], ['Salame piccante', .05]]),
      5:   P('Capricciosa', 'Capricciosa', 'Cotto, funghi, carciofi, olive', 10, ['A', 'G'], [['Salsa di pomodoro', .08], ['Mozzarella', .1], ['Prosciutto cotto', .04], ['Carciofi', .04], ['Olive taggiasche', .02]]),
      6:   P('Ortolana', 'Vegetable pizza', 'Zucchine, melanzane, peperoni grigliati', 9.5, ['A', 'G'], [['Mozzarella', .1], ['Zucchine grigliate', .05], ['Melanzane grigliate', .05], ['Peperoni', .04]]),
      114: P('Crocchè di patate', 'Potato croquettes', 'Fior di latte filante', 3.5, ['A', 'G'], [['Patate al forno', .1], ['Mozzarella', .03]]),
      115: P('Patatine fritte', 'French fries', 'Taglio a mano', 4, [], [['Patate al forno', .2]]),
      7:   P('Babà al rum', 'Rum babà', 'Con crema e amarene', 5.5, ['A', 'C', 'G'], [['Tuorlo', 1]]),
      8:   P('Sfogliatella', 'Sfogliatella', 'Riccia, ricotta e canditi', 3.5, ['A', 'G'], [['Ricotta', .06]]),
    },
    ruoli: { 'Chef de partie': 'Pizzaiolo', 'Commis di cucina': 'Aiuto pizzaiolo', Pasticcere: 'Friggitore' },
  },
  etnico: {
    sale: [['Sala principale', 48], ['Sushi bar', 14]],
    turni: [['Pranzo', 'Pranzo', '12:30', '14:30'], ['Cena', 'Cena', '19:30', '23:00']],
    categorie: { 1: ['Antipasti', '🥟'], 2: ['Sushi e sashimi', '🍣'], 3: ['Cucina calda', '🍜'], 14: ['Riso e zuppe', '🍚'], 4: ['Dessert', '🍡'] },
    piatti: {
      1:   P('Edamame', 'Edamame', 'Fagioli di soia al sale', 5, ['F'], [['Sale grosso', .004]]),
      2:   P('Gyoza di maiale', 'Pork gyoza', 'Ravioli alla piastra, salsa ponzu', 8, ['A', 'F'], [['Aglio', .004]]),
      16:  P('Tartare di salmone', 'Salmon tartare', 'Avocado, sesamo, lime', 13, ['D', 'K'], [['Salmone affumicato', .1], ['Avocado', .05], ['Lime', .02]]),
      3:   P('Nigiri misto', 'Mixed nigiri', '8 pezzi: salmone, tonno, gambero', 16, ['D', 'B'], [['Salmone affumicato', .05], ['Tonno', .05], ['Gamberi', .03]]),
      4:   P('Uramaki California', 'California uramaki', 'Granchio, avocado, cetriolo, 8 pezzi', 12, ['B', 'C', 'K'], [['Avocado', .04], ['Maionese', .01]]),
      17:  P('Sashimi di salmone', 'Salmon sashimi', '10 fette', 15, ['D'], [['Salmone affumicato', .15]]),
      5:   P('Ramen tonkotsu', 'Tonkotsu ramen', 'Brodo di maiale, chashu, uovo marinato', 15, ['A', 'C', 'F'], [['Pancetta', .06], ['Tuorlo', 1]]),
      6:   P('Tempura di gamberi', 'Shrimp tempura', 'Con verdure e salsa tentsuyu', 14, ['A', 'B'], [['Gamberi', .12], ['Zucchine grigliate', .04]]),
      114: P('Gohan', 'Steamed rice', 'Riso bianco al vapore', 3, [], [['Riso Carnaroli', .08]]),
      115: P('Zuppa di miso', 'Miso soup', 'Tofu, alga wakame, cipollotto', 4, ['F'], [['Sedano', .02]]),
      7:   P('Mochi', 'Mochi', 'Tris: matcha, sesamo nero, mango', 6, ['G', 'K'], [['Ricotta', .03]]),
      8:   P('Cheesecake al matcha', 'Matcha cheesecake', 'Base biscotto, tè verde', 6.5, ['A', 'G'], [['Base biscotto', .06], ['Ricotta', .1]]),
    },
    ruoli: { 'Chef de partie': 'Sushi chef', 'Commis di cucina': 'Aiuto sushi chef' },
  },
  'fine-dining': {
    sale: [['Sala degustazione', 28], ['Saletta privée', 10]],
    turni: [['Pranzo', 'Pranzo', '12:30', '14:30'], ['Cena', 'Cena', '19:30', '23:30']],
    categorie: { 1: ['Entrée', '🍽️'], 2: ['Primi', '🍝'], 3: ['Secondi', '🥩'], 14: ['Contorni', '🥕'], 4: ['Dessert', '🍫'] },
    piatti: {
      1:   P('Battuta di Fassona e tartufo', 'Fassona tartare with truffle', 'Tartufo nero, tuorlo marinato', 24, ['C'], [['Manzo crudo', .1], ['Crema di tartufo', .01], ['Tuorlo', 1]]),
      2:   P('Uovo morbido e fonduta', 'Soft egg and fondue', 'Fonduta di Castelmagno, nocciole', 18, ['C', 'G', 'H'], [['Tuorlo', 1], ['Parmigiano', .03], ['Burro', .01]]),
      16:  P('Capesante scottate', 'Seared scallops', 'Topinambur, nocciola, burro nocciola', 22, ['G', 'H', 'R'], [['Burro', .02], ['Gamberi', .06]]),
      3:   P('Tajarin al tartufo bianco', 'Tajarin with white truffle', '40 tuorli, burro di malga', 35, ['A', 'C', 'G'], [['Tuorlo', 3], ['Burro', .03], ['Crema di tartufo', .015]]),
      4:   P('Risotto al Castelmagno', 'Castelmagno risotto', 'Riduzione al Nebbiolo', 24, ['G', 'L'], [['Riso Carnaroli', .09], ['Burro', .02], ['Parmigiano', .03]]),
      17:  P('Plin al sugo d’arrosto', 'Plin with roast jus', 'Tre carni, burro e salvia', 22, ['A', 'C', 'G'], [['Burro', .02], ['Parmigiano', .02]]),
      5:   P('Guancia brasata al Nebbiolo', 'Cheek braised in Nebbiolo', 'Purè affumicato, cipolla di Tropea', 32, ['G', 'L'], [['Rosmarino', .003], ['Burro', .02]]),
      6:   P('Rombo in crosta di nocciole', 'Turbot in hazelnut crust', 'Carciofi e salsa al Roero Arneis', 34, ['D', 'H', 'L'], [['Carciofi', .06], ['Burro', .015]]),
      114: P('Verdure dell’orto', 'Garden vegetables', 'Glassate al burro', 9, ['G'], [['Zucchine grigliate', .05], ['Carciofi', .04], ['Burro', .01]]),
      115: P('Purè al burro', 'Butter mash', 'Patate di montagna', 8, ['G'], [['Patate al forno', .18], ['Burro', .03]]),
      7:   P('Nocciola Tonda Gentile', 'Hazelnut dessert', 'Semifreddo, croccante e cacao', 16, ['A', 'C', 'G', 'H'], [['Cacao amaro', .01], ['Mascarpone', .05]]),
      8:   P('Zabaione al Moscato', 'Moscato zabaglione', 'Con lingue di gatto', 14, ['A', 'C', 'L'], [['Tuorlo', 2]]),
    },
  },
}

// ── Brigata ──────────────────────────────────────────────────────────────────

export interface MembroBrigata { nome: string; ruolo: string; seed: string; contratto: string }

/** Ruoli della brigata, nell'ordine dell'organigramma (con il contratto tipico). */
const SLOT: Array<[string, string]> = [
  ['Direttore di ristorante', 'Full-time'], ['Maître', 'Full-time'],
  ['Chef de rang', 'Full-time'], ['Chef de rang', 'Full-time'],
  ['Commis di sala', 'Stagionale'], ['Commis di sala', 'Part-time'],
  ['Sommelier', 'Full-time'], ['Hostess di sala', 'Part-time'],
  ['Executive chef', 'Full-time'], ['Sous chef', 'Full-time'],
  ['Chef de partie', 'Full-time'], ['Chef de partie', 'Full-time'],
  ['Commis di cucina', 'Apprendistato'], ['Pasticcere', 'Full-time'],
  ['Lavapiatti', 'Part-time'], ['Barman', 'Full-time'],
  ['Cassiere', 'Full-time'], ['Economo', 'Full-time'],
]

// Brigata storica di Osteria della Mole (la prima configurata): resta quella.
const BRIGATA_MOLE: Array<[string, string]> = [
  ['Roberto Ferraro', 'avatar-18'], ['Chiara Gallo', 'avatar-09'], ['Luca Villa', 'avatar-31'], ['Sara Testa', 'avatar-35'],
  ['Davide Rizzo', 'avatar-26'], ['Martina Galli', 'avatar-34'], ['Paolo Neri', 'avatar-29'], ['Giorgia Leone', 'avatar-39'],
  ['Antonio Esposito', 'avatar-43'], ['Francesca Marino', 'avatar-44'], ['Matteo Conte', 'avatar-36'], ['Giulia Pellegrini', 'avatar-23'],
  ['Simone Greco', 'avatar-28'], ['Elisa Fontana', 'avatar-46'], ['Karim Haddad', 'avatar-41'], ['Andrea Costa', 'avatar-47'],
  ['Valentina Moretti', 'avatar-50'], ['Stefano Rinaldi', 'avatar-20'],
]

const NOMI_M = ['Alessandro', 'Lorenzo', 'Federico', 'Gabriele', 'Riccardo', 'Tommaso', 'Edoardo', 'Nicola', 'Pietro', 'Giovanni',
  'Emanuele', 'Salvatore', 'Vincenzo', 'Gennaro', 'Ciro', 'Fabio', 'Massimo', 'Daniele', 'Enrico', 'Michele', 'Omar', 'Luigi']
const NOMI_F = ['Alessia', 'Beatrice', 'Camilla', 'Elena', 'Federica', 'Ilaria', 'Laura', 'Marta', 'Noemi', 'Rebecca',
  'Serena', 'Silvia', 'Teresa', 'Veronica', 'Anna', 'Carmela', 'Rosa', 'Bianca', 'Greta', 'Irene']
const COGNOMI = ['Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marini', 'Bruno', 'De Luca', 'Mancini', 'Lombardi', 'Barbieri',
  'Caruso', 'Ferrara', 'Santoro', 'Coppola', 'Russo', 'Iovine', 'Amato', 'Serra', 'Vitale', 'Orlando', 'Sartori',
  'Fabbri', 'Morelli', 'Gentile', 'Martini', 'Benedetti', 'Riva']
const NOMI_M_JP = ['Kenji', 'Hiroshi', 'Takumi', 'Daiki', 'Ren']
const NOMI_F_JP = ['Aiko', 'Yuki', 'Sakura', 'Hana', 'Mei']
const COGNOMI_JP = ['Tanaka', 'Sato', 'Watanabe', 'Kobayashi', 'Yamamoto', 'Nakamura']
const AVATAR_M = ['04', '06', '08', '10', '14', '17', '18', '20', '22', '24', '26', '27', '28', '29', '31', '33', '36', '38', '40', '41', '42', '43', '47', '49']
const AVATAR_F = ['05', '07', '09', '11', '13', '15', '16', '19', '21', '23', '25', '30', '32', '34', '35', '37', '39', '44', '45', '46', '48', '50']

const hash = (t: string) => {
  let h = 2166136261
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0
  return h
}
const rng = (seed: number) => {
  let s = seed || 1
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}

/** Brigata del ristorante: sempre la stessa per lo stesso nome. */
export function brigataDi(struttura: string, classificazione?: string): MembroBrigata[] {
  const ruoli = STILI[stileDa(classificazione)].ruoli ?? {}
  const rinomina = (r: string) => ruoli[r] ?? r
  if (struttura === 'Osteria della Mole') {
    return SLOT.map(([ruolo, contratto], i) => ({ nome: BRIGATA_MOLE[i][0], seed: BRIGATA_MOLE[i][1], ruolo: rinomina(ruolo), contratto }))
  }
  const rnd = rng(hash(struttura))
  const usati = new Set<string>()
  const prendi = (xs: string[]) => {
    for (let k = 0; k < 50; k++) { const x = xs[Math.floor(rnd() * xs.length)]; if (!usati.has(x)) { usati.add(x); return x } }
    return xs[Math.floor(rnd() * xs.length)]
  }
  // Cucina giapponese: la brigata di cucina viene dal Giappone.
  const giapponese = stileDa(classificazione) === 'etnico'
  const CUCINA = ['Executive chef', 'Sous chef', 'Chef de partie', 'Commis di cucina']
  return SLOT.map(([ruolo, contratto]) => {
    const donna = rnd() < 0.5
    const jp = giapponese && CUCINA.includes(ruolo)
    const nome = jp
      ? `${prendi(donna ? NOMI_F_JP : NOMI_M_JP)} ${prendi(COGNOMI_JP)}`
      : `${prendi(donna ? NOMI_F : NOMI_M)} ${prendi(COGNOMI)}`
    const avatar = (donna ? AVATAR_F : AVATAR_M)[Math.floor(rnd() * (donna ? AVATAR_F : AVATAR_M).length)]
    return { nome, ruolo: rinomina(ruolo), seed: `avatar-${avatar}`, contratto }
  })
}

/** Nome breve per sala e cassa: "Luca V.". */
export const breve = (nome: string) => {
  const [n, ...c] = nome.split(/\s+/)
  return c.length ? `${n} ${c[c.length - 1][0]}.` : n
}
