// ─── Chiusure e bilanciamento di magazzino — modello ──────────────────────────
//  Il ciclo di un magazzino alberghiero si chiude a fine mese:
//
//    giacenza iniziale (= contato alla chiusura precedente)
//  + entrate  (carichi da fornitore, trasferimenti ricevuti)
//  − uscite   (scarichi ai reparti, consumi, trasferimenti inviati)
//  = giacenza teorica   →  confronto con la conta fisica  →  rettifiche
//
//  La chiusura congela il valore delle rimanenze (costo medio ponderato) e le
//  differenze inventariali, che il controllo di gestione legge come costo.
//  Qui vivono i dati di partenza (mock deterministici): strutture, magazzini,
//  articoli, livelli di scorta per reparto e lo storico dei periodi già chiusi.

export type CategoriaArticolo =
  | 'Food' | 'Beverage' | 'Vini e distillati' | 'Amenities' | 'Pulizia' | 'Cancelleria' | 'Manutenzione'

export const CATEGORIE_ARTICOLO: CategoriaArticolo[] = [
  'Food', 'Beverage', 'Vini e distillati', 'Amenities', 'Pulizia', 'Cancelleria', 'Manutenzione',
]

export type UnitaArticolo = 'kg' | 'l' | 'pz' | 'conf' | 'bt'

export interface Articolo {
  id: string
  codice: string
  nome: string
  categoria: CategoriaArticolo
  um: UnitaArticolo
  /** Costo medio ponderato per unità (€) */
  costo: number
  fornitore: string
}

export interface StrutturaMag {
  id: string
  nome: string
}

export type TipoMagazzino = 'centrale' | 'bar' | 'cucina' | 'cantina' | 'piani'

export interface MagazzinoChiusura {
  id: string
  strutturaId: string
  nome: string
  tipo: TipoMagazzino
  /** Reparto servito (centro di costo), vuoto per il centrale */
  reparto: string
}

export const STRUTTURE_MAG: StrutturaMag[] = [
  { id: 'azzurro', nome: 'Hotel Azzurro Mare' },
  { id: 'grim',    nome: "Grim's Hotel" },
]

export const MAGAZZINI_CHIUSURA: MagazzinoChiusura[] = [
  { id: 'az-mc',   strutturaId: 'azzurro', nome: 'Magazzino centrale', tipo: 'centrale', reparto: '' },
  { id: 'az-can',  strutturaId: 'azzurro', nome: 'Cantina',            tipo: 'cantina',  reparto: 'Ristorante' },
  { id: 'az-bar',  strutturaId: 'azzurro', nome: 'Bar',                tipo: 'bar',      reparto: 'Bar' },
  { id: 'az-cuc',  strutturaId: 'azzurro', nome: 'Cucina',             tipo: 'cucina',   reparto: 'Ristorante' },
  { id: 'az-pia',  strutturaId: 'azzurro', nome: 'Office piani',       tipo: 'piani',    reparto: 'Housekeeping' },
  { id: 'gr-mc',   strutturaId: 'grim',    nome: 'Magazzino centrale', tipo: 'centrale', reparto: '' },
  { id: 'gr-bar',  strutturaId: 'grim',    nome: 'Bar',                tipo: 'bar',      reparto: 'Bar' },
  { id: 'gr-pia',  strutturaId: 'grim',    nome: 'Office piani',       tipo: 'piani',    reparto: 'Housekeeping' },
]

export const ARTICOLI: Articolo[] = [
  // Food
  { id: 'a01', codice: 'FD-0101', nome: 'Farina 00',                   categoria: 'Food', um: 'kg', costo: 0.92,  fornitore: 'Granaio del Sud' },
  { id: 'a02', codice: 'FD-0102', nome: 'Pasta secca di semola',       categoria: 'Food', um: 'kg', costo: 1.95,  fornitore: 'Granaio del Sud' },
  { id: 'a03', codice: 'FD-0103', nome: 'Riso Carnaroli',              categoria: 'Food', um: 'kg', costo: 3.60,  fornitore: 'Granaio del Sud' },
  { id: 'a04', codice: 'FD-0110', nome: 'Olio extravergine d’oliva',   categoria: 'Food', um: 'l',  costo: 8.50,  fornitore: 'Tavola Tipica' },
  { id: 'a05', codice: 'FD-0111', nome: 'Pomodori pelati',             categoria: 'Food', um: 'kg', costo: 1.80,  fornitore: 'Tavola Tipica' },
  { id: 'a06', codice: 'FD-0120', nome: 'Parmigiano Reggiano 24 mesi', categoria: 'Food', um: 'kg', costo: 18.90, fornitore: 'Tavola Tipica' },
  { id: 'a07', codice: 'FD-0121', nome: 'Burro',                       categoria: 'Food', um: 'kg', costo: 9.20,  fornitore: 'Latteria Alpina' },
  { id: 'a08', codice: 'FD-0122', nome: 'Latte UHT intero',            categoria: 'Food', um: 'l',  costo: 1.10,  fornitore: 'Latteria Alpina' },
  { id: 'a09', codice: 'FD-0130', nome: 'Uova fresche',                categoria: 'Food', um: 'pz', costo: 0.28,  fornitore: 'Latteria Alpina' },
  { id: 'a10', codice: 'FD-0140', nome: 'Caffè in grani',              categoria: 'Food', um: 'kg', costo: 16.50, fornitore: 'Torrefazione Adriatica' },
  { id: 'a11', codice: 'FD-0141', nome: 'Zucchero in bustine',         categoria: 'Food', um: 'conf', costo: 11.80, fornitore: 'Torrefazione Adriatica' },
  { id: 'a12', codice: 'FD-0150', nome: 'Marmellata monoporzione',     categoria: 'Food', um: 'pz', costo: 0.22,  fornitore: 'Tavola Tipica' },
  // Beverage
  { id: 'b01', codice: 'BV-0201', nome: 'Acqua naturale 0,75 l',       categoria: 'Beverage', um: 'bt', costo: 0.45, fornitore: 'Cantine & Bollicine' },
  { id: 'b02', codice: 'BV-0202', nome: 'Acqua frizzante 0,75 l',      categoria: 'Beverage', um: 'bt', costo: 0.45, fornitore: 'Cantine & Bollicine' },
  { id: 'b03', codice: 'BV-0210', nome: 'Cola 33 cl',                  categoria: 'Beverage', um: 'pz', costo: 0.62, fornitore: 'Cantine & Bollicine' },
  { id: 'b04', codice: 'BV-0211', nome: 'Succo d’arancia 1 l',         categoria: 'Beverage', um: 'bt', costo: 1.90, fornitore: 'Cantine & Bollicine' },
  { id: 'b05', codice: 'BV-0220', nome: 'Birra lager 33 cl',           categoria: 'Beverage', um: 'pz', costo: 0.95, fornitore: 'Cantine & Bollicine' },
  // Vini e distillati
  { id: 'v01', codice: 'VN-0301', nome: 'Prosecco DOC Extra Dry',      categoria: 'Vini e distillati', um: 'bt', costo: 5.80,  fornitore: 'Cantine & Bollicine' },
  { id: 'v02', codice: 'VN-0302', nome: 'Chianti Classico DOCG',       categoria: 'Vini e distillati', um: 'bt', costo: 9.40,  fornitore: 'Cantine & Bollicine' },
  { id: 'v03', codice: 'VN-0303', nome: 'Vermentino di Gallura',       categoria: 'Vini e distillati', um: 'bt', costo: 7.60,  fornitore: 'Cantine & Bollicine' },
  { id: 'v04', codice: 'VN-0310', nome: 'Gin London Dry 0,7 l',        categoria: 'Vini e distillati', um: 'bt', costo: 18.50, fornitore: 'Cantine & Bollicine' },
  { id: 'v05', codice: 'VN-0311', nome: 'Bitter aperitivo 1 l',        categoria: 'Vini e distillati', um: 'bt', costo: 13.90, fornitore: 'Cantine & Bollicine' },
  // Amenities
  { id: 'h01', codice: 'AM-0401', nome: 'Shampoo 30 ml',               categoria: 'Amenities', um: 'pz', costo: 0.32, fornitore: 'Linea Cortesia' },
  { id: 'h02', codice: 'AM-0402', nome: 'Bagnoschiuma 30 ml',          categoria: 'Amenities', um: 'pz', costo: 0.32, fornitore: 'Linea Cortesia' },
  { id: 'h03', codice: 'AM-0403', nome: 'Saponetta 20 g',              categoria: 'Amenities', um: 'pz', costo: 0.18, fornitore: 'Linea Cortesia' },
  { id: 'h04', codice: 'AM-0410', nome: 'Kit cortesia (dentale/cucito)', categoria: 'Amenities', um: 'pz', costo: 0.55, fornitore: 'Linea Cortesia' },
  { id: 'h05', codice: 'AM-0411', nome: 'Ciabattine monouso',          categoria: 'Amenities', um: 'pz', costo: 0.70, fornitore: 'Linea Cortesia' },
  { id: 'h06', codice: 'AM-0420', nome: 'Carta igienica (rotolo)',     categoria: 'Amenities', um: 'pz', costo: 0.29, fornitore: 'Igiene Pro' },
  // Pulizia
  { id: 'p01', codice: 'PL-0501', nome: 'Detergente multiuso 5 l',     categoria: 'Pulizia', um: 'pz', costo: 12.40, fornitore: 'Igiene Pro' },
  { id: 'p02', codice: 'PL-0502', nome: 'Disinfettante superfici 1 l', categoria: 'Pulizia', um: 'pz', costo: 4.90,  fornitore: 'Igiene Pro' },
  { id: 'p03', codice: 'PL-0510', nome: 'Sacchi rifiuti 70×110',       categoria: 'Pulizia', um: 'conf', costo: 4.50, fornitore: 'Igiene Pro' },
  { id: 'p04', codice: 'PL-0520', nome: 'Brillantante lavastoviglie 10 l', categoria: 'Pulizia', um: 'pz', costo: 22.00, fornitore: 'Igiene Pro' },
  // Cancelleria
  { id: 'c01', codice: 'CN-0601', nome: 'Carta A4 80 g (risma)',       categoria: 'Cancelleria', um: 'conf', costo: 4.20,  fornitore: 'UfficioPiù' },
  { id: 'c02', codice: 'CN-0602', nome: 'Rotoli POS termici',          categoria: 'Cancelleria', um: 'conf', costo: 11.00, fornitore: 'UfficioPiù' },
  // Manutenzione
  { id: 'm01', codice: 'MN-0701', nome: 'Lampadina LED E27',           categoria: 'Manutenzione', um: 'pz', costo: 3.40, fornitore: 'Manutenzioni Integrate' },
  { id: 'm02', codice: 'MN-0702', nome: 'Batterie stilo AA',           categoria: 'Manutenzione', um: 'conf', costo: 5.50, fornitore: 'Manutenzioni Integrate' },
]

export const articoloById = (id: string) => ARTICOLI.find(a => a.id === id)
export const magazzinoById = (id: string) => MAGAZZINI_CHIUSURA.find(m => m.id === id)
export const strutturaById = (id: string) => STRUTTURE_MAG.find(s => s.id === id)
export const centraleDi = (strutturaId: string) =>
  MAGAZZINI_CHIUSURA.find(m => m.strutturaId === strutturaId && m.tipo === 'centrale')

/** Quali categorie tiene ogni tipo di magazzino (il centrale le tiene tutte). */
const CATEGORIE_PER_TIPO: Record<TipoMagazzino, CategoriaArticolo[] | 'tutte'> = {
  centrale: 'tutte',
  bar:      ['Beverage'],
  cucina:   ['Food'],
  cantina:  ['Vini e distillati'],
  piani:    ['Amenities', 'Pulizia'],
}
/** Articoli food che servono anche al bar (colazioni, caffetteria). */
const EXTRA_BAR = ['a08', 'a10', 'a11', 'v01', 'v04', 'v05']

export function articoliDi(magazzinoId: string): Articolo[] {
  const m = magazzinoById(magazzinoId)
  if (!m) return []
  const cats = CATEGORIE_PER_TIPO[m.tipo]
  return ARTICOLI.filter(a =>
    cats === 'tutte' || cats.includes(a.categoria) || (m.tipo === 'bar' && EXTRA_BAR.includes(a.id)))
}

// ─── Generatore deterministico ────────────────────────────────────────────────
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967295
}
const r1 = (n: number) => Math.round(n * 10) / 10

/** Unità "sfuse" (kg, l) ammettono un decimale; il resto si conta a pezzi. */
export const decimaliDi = (um: UnitaArticolo) => (um === 'kg' || um === 'l' ? 1 : 0)
const arr = (n: number, um: UnitaArticolo) => (decimaliDi(um) ? r1(n) : Math.round(n))

/**
 * Livello par del reparto: la scorta che il reparto deve avere a inizio
 * servizio. Per il centrale è la scorta minima sotto cui si riordina.
 */
export function livelloPar(magazzinoId: string, articoloId: string): number {
  const m = magazzinoById(magazzinoId)
  const a = articoloById(articoloId)
  if (!m || !a) return 0
  const base = a.costo > 15 ? 6 : a.costo > 5 ? 12 : a.costo > 1 ? 30 : 120
  const k = m.tipo === 'centrale' ? 1.6 : m.strutturaId === 'grim' ? 0.6 : 1
  return arr(base * k * (0.8 + hash(magazzinoId + articoloId + 'par') * 0.5), a.um)
}

// ─── Periodi ──────────────────────────────────────────────────────────────────
/** Periodo nel formato 'AAAA-MM'. */
export type Periodo = string

export const PERIODO_CORRENTE: Periodo = '2026-09'
export const PRIMO_PERIODO: Periodo = '2026-01'

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

export const labelPeriodo = (p: Periodo) => {
  const [y, m] = p.split('-').map(Number)
  const s = `${MESI[m - 1]} ${y}`
  return s.charAt(0).toUpperCase() + s.slice(1)
}
/** Forma breve per le celle di tabella: "Set 2026". */
export const labelPeriodoBreve = (p: Periodo) => {
  const [y, m] = p.split('-').map(Number)
  const s = MESI[m - 1].slice(0, 3)
  return `${s.charAt(0).toUpperCase()}${s.slice(1)} ${y}`
}
export const periodoSuccessivo = (p: Periodo): Periodo => {
  const [y, m] = p.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}
export const periodoPrecedente = (p: Periodo): Periodo => {
  const [y, m] = p.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}
/** Ultimo giorno del periodo, alle 23:00 (ora tipica della chiusura). */
export const fineMese = (p: Periodo) => {
  const [y, m] = p.split('-').map(Number)
  return new Date(y, m, 0, 23, 0).getTime()
}

// ─── Righe di chiusura ────────────────────────────────────────────────────────
export const CAUSALI_DIFFERENZA = [
  'Calo naturale',
  'Rottura',
  'Scadenza / deterioramento',
  'Errore di registrazione',
  'Consumo interno non registrato',
  'Omaggio non registrato',
  'Ammanco',
  'Eccedenza da conta',
] as const
export type CausaleDifferenza = typeof CAUSALI_DIFFERENZA[number]

export interface RigaChiusura {
  articoloId: string
  iniziale: number
  entrate: number
  uscite: number
  /** Conta fisica; undefined = non ancora contato */
  contato?: number
  causale?: CausaleDifferenza
  /** Costo medio con cui la riga è stata valorizzata */
  costo: number
}

export const teoricaDi = (r: Pick<RigaChiusura, 'iniziale' | 'entrate' | 'uscite'>) =>
  r.iniziale + r.entrate - r.uscite
export const differenzaDi = (r: RigaChiusura) =>
  r.contato == null ? 0 : r.contato - teoricaDi(r)

/**
 * Genera la catena dei movimenti mensili di un magazzino da gennaio al
 * periodo corrente: ogni mese riparte dal contato del mese precedente, così
 * lo storico e il preliminare di settembre sono coerenti fra loro.
 */
function generaCatena(magazzinoId: string): Record<Periodo, RigaChiusura[]> {
  const out: Record<Periodo, RigaChiusura[]> = {}
  const arts = articoliDi(magazzinoId)
  const cur: Record<string, number> = {}
  arts.forEach(a => { cur[a.id] = arr(livelloPar(magazzinoId, a.id) * (1 + hash(magazzinoId + a.id) * 0.6), a.um) })

  for (let p = PRIMO_PERIODO; ; p = periodoSuccessivo(p)) {
    const inCorso = p === PERIODO_CORRENTE
    const [, mm] = p.split('-').map(Number)
    // Stagionalità di una struttura balneare: estate piena, inverno fermo
    const stag = [0.35, 0.35, 0.5, 0.75, 0.95, 1.25, 1.55, 1.6, 1.1, 0.7, 0.4, 0.45][mm - 1] * (inCorso ? 0.95 : 1)
    out[p] = arts.map(a => {
      const par = livelloPar(magazzinoId, a.id)
      const h = hash(magazzinoId + a.id + p)
      const richiesta = arr(par * stag * (1.4 + h * 1.4), a.um)
      // Si riordina quanto basta per tornare sopra il par a fine mese
      const fabbisogno = Math.max(0, par * 1.2 + richiesta - cur[a.id])
      // Nel mese in corso i reparti non sono ancora stati riforniti del tutto:
      // è il lavoro che resta al bilanciamento
      const reparto = magazzinoById(magazzinoId)?.tipo !== 'centrale'
      const quota = inCorso && reparto ? 0.25 + hash(p + a.id) * 0.7 : 0.85 + hash(p + a.id) * 0.4
      const entrate = arr(fabbisogno * quota, a.um)
      const iniziale = cur[a.id]
      // Non si scarica merce che non c'è: le uscite si fermano alla disponibilità
      const uscite = Math.min(richiesta, arr(iniziale + entrate, a.um))
      const teorica = iniziale + entrate - uscite
      let contato: number | undefined
      let causale: CausaleDifferenza | undefined
      if (!inCorso) {
        const d = hash(magazzinoId + a.id + p + 'diff')
        const delta = d < 0.72 ? 0 : d < 0.9 ? -1 : d < 0.97 ? -2 : 1
        const passo = decimaliDi(a.um) ? 0.3 : 1
        contato = Math.max(0, arr(teorica + delta * passo, a.um))
        if (contato !== arr(teorica, a.um)) {
          causale = delta > 0 ? 'Eccedenza da conta'
            : a.categoria === 'Food' ? (d < 0.95 ? 'Calo naturale' : 'Scadenza / deterioramento')
            : a.categoria === 'Vini e distillati' || a.categoria === 'Beverage' ? (d < 0.95 ? 'Rottura' : 'Omaggio non registrato')
            : d < 0.95 ? 'Consumo interno non registrato' : 'Errore di registrazione'
        }
        cur[a.id] = contato
      }
      return {
        articoloId: a.id,
        iniziale: arr(iniziale, a.um),
        entrate,
        uscite,
        contato,
        causale,
        // Il costo medio si muove poco da un mese all'altro
        costo: Math.round(a.costo * (0.96 + hash(a.id + p + 'cmp') * 0.06) * 100) / 100,
      }
    })
    if (inCorso) break
  }
  return out
}

const CATENE: Record<string, Record<Periodo, RigaChiusura[]>> = Object.fromEntries(
  MAGAZZINI_CHIUSURA.map(m => [m.id, generaCatena(m.id)]),
)

/** Righe di partenza del periodo (senza conta per il periodo in corso). */
export const righeBase = (magazzinoId: string, periodo: Periodo): RigaChiusura[] =>
  CATENE[magazzinoId]?.[periodo] ?? []

// ─── Riepilogo per categoria (valori a costo medio) ───────────────────────────
export interface Valori {
  iniziale: number
  entrate: number
  uscite: number
  teorica: number
  finale: number
  differenza: number
}

export const valoriVuoti = (): Valori =>
  ({ iniziale: 0, entrate: 0, uscite: 0, teorica: 0, finale: 0, differenza: 0 })

export function valorizza(righe: RigaChiusura[]): Valori {
  return righe.reduce((v, r) => {
    const t = teoricaDi(r)
    const fin = r.contato ?? t
    v.iniziale += r.iniziale * r.costo
    v.entrate += r.entrate * r.costo
    v.uscite += r.uscite * r.costo
    v.teorica += t * r.costo
    v.finale += fin * r.costo
    v.differenza += (fin - t) * r.costo
    return v
  }, valoriVuoti())
}

export function perCategoria(righe: RigaChiusura[]): Array<{ categoria: CategoriaArticolo; valori: Valori; righe: RigaChiusura[] }> {
  return CATEGORIE_ARTICOLO
    .map(categoria => {
      const rs = righe.filter(r => articoloById(r.articoloId)?.categoria === categoria)
      return { categoria, righe: rs, valori: valorizza(rs) }
    })
    .filter(g => g.righe.length > 0)
}

/**
 * Consumo del periodo = rimanenza iniziale + acquisti − rimanenza finale.
 * È il numero che finisce nel conto economico del reparto.
 */
export const consumoDi = (v: Valori) => v.iniziale + v.entrate - v.finale

// ─── Chiusure (registro) ──────────────────────────────────────────────────────
export type StatoChiusura = 'definitiva' | 'riaperta'

export interface Chiusura {
  id: string
  numero: string
  magazzinoId: string
  periodo: Periodo
  chiusaIl: number
  operatore: string
  stato: StatoChiusura
  valori: Valori
  /** Righe congelate; per lo storico seminato si rigenerano dalla catena */
  righe?: RigaChiusura[]
  note?: string
  riapertura?: { il: number; da: string; motivo: string }
  /** Numero della chiusura riaperta che questa sostituisce */
  sostituisce?: string
}

const OPERATORI = ['Laura Bianchi', 'Paolo Ferri', 'Giulia Neri']

/** Numero progressivo annuale, come nei registri contabili: CH-045/26. */
export const numeroChiusura = (progressivo: number, anno: number) =>
  `CH-${String(progressivo).padStart(3, '0')}/${String(anno).slice(-2)}`

export function chiusureStoriche(): Chiusura[] {
  const out: Chiusura[] = []
  for (const m of MAGAZZINI_CHIUSURA) {
    for (let p = PRIMO_PERIODO; p !== PERIODO_CORRENTE; p = periodoSuccessivo(p)) {
      const righe = righeBase(m.id, p)
      out.push({
        id: `${m.id}-${p}`,
        numero: '',
        magazzinoId: m.id,
        periodo: p,
        chiusaIl: fineMese(p) + Math.round(hash(m.id + p) * 36) * 3600_000,
        operatore: OPERATORI[Math.floor(hash(p + m.id + 'op') * OPERATORI.length)],
        stato: 'definitiva',
        valori: valorizza(righe),
      })
    }
  }
  out.sort((a, b) => a.chiusaIl - b.chiusaIl).forEach((c, i) => { c.numero = numeroChiusura(i + 1, 2026) })
  return out
}

export const righeDiChiusura = (c: Chiusura) => c.righe ?? righeBase(c.magazzinoId, c.periodo)

// ─── Pendenze del periodo (controlli pre-chiusura) ────────────────────────────
export type TipoPendenza = 'ddt' | 'scarico' | 'prezzo'

export interface Pendenza {
  id: string
  magazzinoId: string
  periodo: Periodo
  tipo: TipoPendenza
  titolo: string
  dettaglio: string
  /** Bloccante: impedisce la chiusura finché non è risolta */
  bloccante: boolean
  /** Movimento che la risoluzione registra (carico o scarico) */
  movimento?: { articoloId: string; entrate?: number; uscite?: number }
}

export const PENDENZE_INIT: Pendenza[] = [
  {
    id: 'pd-1', magazzinoId: 'az-mc', periodo: PERIODO_CORRENTE, tipo: 'ddt', bloccante: true,
    titolo: 'DDT n. 1245 del 26/09 — Granaio del Sud',
    dettaglio: 'Merce ricevuta ma carico non registrato: 25 kg di Farina 00',
    movimento: { articoloId: 'a01', entrate: 25 },
  },
  {
    id: 'pd-2', magazzinoId: 'az-mc', periodo: PERIODO_CORRENTE, tipo: 'ddt', bloccante: true,
    titolo: 'DDT n. 0877 del 28/09 — Linea Cortesia',
    dettaglio: 'Merce ricevuta ma carico non registrato: 400 Shampoo 30 ml',
    movimento: { articoloId: 'h01', entrate: 400 },
  },
  {
    id: 'pd-3', magazzinoId: 'az-mc', periodo: PERIODO_CORRENTE, tipo: 'prezzo', bloccante: false,
    titolo: 'Fattura n. 3310 — Tavola Tipica',
    dettaglio: 'Prezzo in fattura del Parmigiano diverso dall’ordine (+4,2%): il costo medio verrà ricalcolato',
  },
  {
    id: 'pd-4', magazzinoId: 'az-bar', periodo: PERIODO_CORRENTE, tipo: 'scarico', bloccante: true,
    titolo: 'Buono di prelievo n. 212 del 29/09',
    dettaglio: 'Scarico al reparto non confermato: 24 Cola 33 cl',
    movimento: { articoloId: 'b03', uscite: 24 },
  },
  {
    id: 'pd-5', magazzinoId: 'az-cuc', periodo: PERIODO_CORRENTE, tipo: 'scarico', bloccante: false,
    titolo: 'Scarichi da comande del 30/09',
    dettaglio: 'I consumi di cucina di oggi arrivano a fine servizio: verifica di aver chiuso l’ultimo turno',
  },
  {
    id: 'pd-6', magazzinoId: 'gr-mc', periodo: PERIODO_CORRENTE, tipo: 'ddt', bloccante: true,
    titolo: 'DDT n. 5521 del 27/09 — Igiene Pro',
    dettaglio: 'Merce ricevuta ma carico non registrato: 6 Detergente multiuso 5 l',
    movimento: { articoloId: 'p01', entrate: 6 },
  },
]

// ─── Trasferimenti (bilanciamento) ────────────────────────────────────────────
export type StatoTrasferimento = 'in-transito' | 'ricevuto'

export interface Trasferimento {
  id: string
  numero: string
  daId: string
  aId: string
  creatoIl: number
  operatore: string
  stato: StatoTrasferimento
  ricevutoIl?: number
  righe: Array<{ articoloId: string; qta: number }>
}

export const TRASFERIMENTI_INIT: Trasferimento[] = [
  {
    id: 'tr-0930', numero: 'TR-0930', daId: 'az-mc', aId: 'az-pia',
    creatoIl: new Date(2026, 8, 29, 17, 40).getTime(), operatore: 'Paolo Ferri', stato: 'in-transito',
    righe: [{ articoloId: 'h02', qta: 150 }, { articoloId: 'h03', qta: 200 }],
  },
  {
    id: 'tr-0929', numero: 'TR-0929', daId: 'az-mc', aId: 'az-bar',
    creatoIl: new Date(2026, 8, 27, 10, 15).getTime(), operatore: 'Laura Bianchi', stato: 'ricevuto',
    ricevutoIl: new Date(2026, 8, 27, 11, 2).getTime(),
    righe: [{ articoloId: 'b01', qta: 48 }, { articoloId: 'b02', qta: 48 }],
  },
]

// ─── Formattazione ────────────────────────────────────────────────────────────
export const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
export const qta = (n: number, um?: UnitaArticolo) =>
  n.toLocaleString('it-IT', { maximumFractionDigits: um && decimaliDi(um) ? 1 : 0 })
export const dataOra = (ts: number) =>
  new Date(ts).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
