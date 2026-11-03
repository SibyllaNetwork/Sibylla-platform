import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── HUMAN RESOURCES › GESTIONE DELLE PRESENZE ───────────────────────────────
// Dati condivisi delle pagine Nota spese, Cedolini, Richieste e Piano ferie.
// Le richieste approvate in "Richieste" sono le stesse assenze che "Piano ferie"
// disegna sul calendario: approvare una richiesta la fa comparire nel piano.
// Mock persistito (demo): il back end sostituirà seed e azioni.

export type Reparto = 'Front office' | 'F&B' | 'Housekeeping' | 'Manutenzione' | 'Cucina' | 'Amministrazione'
export const REPARTI_HR: Reparto[] = ['Front office', 'F&B', 'Housekeeping', 'Manutenzione', 'Cucina', 'Amministrazione']

export interface DipendenteHr {
  id: number
  nome: string
  cognome: string
  reparto: Reparto
  /** Giorni di ferie maturati nell'anno. */
  ferieAnnue: number
}

// ── Nota spese ──
export type CategoriaSpesa = 'Trasporto' | 'Vitto' | 'Alloggio' | 'Carburante' | 'Materiale' | 'Altro'
export const CATEGORIE_SPESA: CategoriaSpesa[] = ['Trasporto', 'Vitto', 'Alloggio', 'Carburante', 'Materiale', 'Altro']
export type StatoSpesa = 'Da approvare' | 'Approvata' | 'Rifiutata' | 'Rimborsata'
export const STATI_SPESA: StatoSpesa[] = ['Da approvare', 'Approvata', 'Rifiutata', 'Rimborsata']

export interface NotaSpesa {
  id: string
  dipendenteId: number
  /** aaaa-mm-gg */
  data: string
  categoria: CategoriaSpesa
  descrizione: string
  importo: number
  giustificativo?: string
  stato: StatoSpesa
  motivo?: string
}

// ── Cedolini ──
export type StatoCedolino = 'Bozza' | 'Pubblicato'
export interface Cedolino {
  id: string
  dipendenteId: number
  /** aaaa-mm */
  mese: string
  lordo: number
  netto: number
  file: string
  stato: StatoCedolino
  /** Il dipendente l'ha aperto dalla sua area. */
  visto: boolean
  pubblicatoAt?: string
}

// ── Richieste di assenza ──
export type TipoAssenza = 'Ferie' | 'Permesso' | 'ROL' | 'Malattia'
export const TIPI_ASSENZA: TipoAssenza[] = ['Ferie', 'Permesso', 'ROL', 'Malattia']
export type StatoRichiesta = 'Da approvare' | 'Approvata' | 'Rifiutata'
export const STATI_RICHIESTA: StatoRichiesta[] = ['Da approvare', 'Approvata', 'Rifiutata']

export interface RichiestaAssenza {
  id: string
  dipendenteId: number
  tipo: TipoAssenza
  /** aaaa-mm-gg */
  dal: string
  al: string
  note?: string
  stato: StatoRichiesta
  motivo?: string
  /** ISO datetime della richiesta. */
  createdAt: string
}

// ─── Date ─────────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayIsoHr = () => isoOf(new Date())
const dayOffset = (offset: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + offset); return isoOf(d) }
const monthOffset = (offset: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` }
export const fmtDataHr = (iso: string) => iso.split('-').reverse().join('/')

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
export const fmtMeseHr = (ym: string) => { const [y, m] = ym.split('-').map(Number); return `${MESI[m - 1]} ${y}` }

/** Giorni lavorativi (lun-sab) compresi nell'intervallo: le ferie non contano la domenica. */
export function giorniLavorativi(dal: string, al: string) {
  const a = new Date(`${dal}T12:00:00`)
  const b = new Date(`${al}T12:00:00`)
  let n = 0
  for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (d.getDay() !== 0) n++
  return n
}

/** Formato euro con migliaia sempre raggruppate (it-IT non le raggruppa sotto le 5 cifre). */
export const eurHr = (n: number) => {
  const [int, dec] = Math.abs(n).toFixed(2).split('.')
  return `${n < 0 ? '-' : ''}${int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec} €`
}

// ─── Seed ─────────────────────────────────────────────────────────────────────
export const DIPENDENTI_HR: DipendenteHr[] = [
  { id: 1,  nome: 'Andrea',  cognome: 'Grimaudo',  reparto: 'Front office',    ferieAnnue: 26 },
  { id: 2,  nome: 'Giulia',  cognome: 'Conti',     reparto: 'Front office',    ferieAnnue: 26 },
  { id: 3,  nome: 'Marco',   cognome: 'Esposito',  reparto: 'Cucina',          ferieAnnue: 26 },
  { id: 4,  nome: 'Sara',    cognome: 'Romano',    reparto: 'Housekeeping',    ferieAnnue: 22 },
  { id: 5,  nome: 'Davide',  cognome: 'Marini',    reparto: 'Front office',    ferieAnnue: 26 },
  { id: 6,  nome: 'Sergio',  cognome: 'Benvenuti', reparto: 'Manutenzione',    ferieAnnue: 26 },
  { id: 7,  nome: 'Manuel',  cognome: 'Fantoni',   reparto: 'Manutenzione',    ferieAnnue: 22 },
  { id: 8,  nome: 'Oscar',   cognome: 'Pettinari', reparto: 'Housekeeping',    ferieAnnue: 22 },
  { id: 9,  nome: 'Luca',    cognome: 'Hambelli',  reparto: 'Amministrazione', ferieAnnue: 26 },
  { id: 10, nome: 'Elena',   cognome: 'Bianchi',   reparto: 'F&B',             ferieAnnue: 26 },
  { id: 11, nome: 'Chiara',  cognome: 'Ferri',     reparto: 'F&B',             ferieAnnue: 22 },
  { id: 12, nome: 'Paolo',   cognome: 'Greco',     reparto: 'Cucina',          ferieAnnue: 26 },
]

export const nomeDipendente = (id: number) => {
  const d = DIPENDENTI_HR.find(x => x.id === id)
  return d ? `${d.nome} ${d.cognome}` : '—'
}
export const repartoDipendente = (id: number) => DIPENDENTI_HR.find(x => x.id === id)?.reparto ?? ''

function seedNoteSpese(): NotaSpesa[] {
  const rows: Omit<NotaSpesa, 'id'>[] = [
    { dipendenteId: 9,  data: dayOffset(-2),  categoria: 'Trasporto',  descrizione: 'Treno Roma–Milano fiera BIT',        importo: 89.9,  giustificativo: 'biglietto_trenitalia.pdf', stato: 'Da approvare' },
    { dipendenteId: 9,  data: dayOffset(-2),  categoria: 'Alloggio',   descrizione: 'Pernottamento fiera BIT (1 notte)',  importo: 142,   giustificativo: 'fattura_hotel.pdf',        stato: 'Da approvare' },
    { dipendenteId: 3,  data: dayOffset(-4),  categoria: 'Materiale',  descrizione: 'Coltelli professionali per la brigata', importo: 236.5, giustificativo: 'scontrino_coltelleria.jpg', stato: 'Da approvare' },
    { dipendenteId: 6,  data: dayOffset(-5),  categoria: 'Carburante', descrizione: 'Rifornimento furgone manutenzione',  importo: 68.4,  giustificativo: 'ricevuta_carburante.jpg',  stato: 'Approvata' },
    { dipendenteId: 1,  data: dayOffset(-7),  categoria: 'Vitto',      descrizione: 'Pranzo con agenzia partner',         importo: 54,    giustificativo: 'ricevuta_ristorante.pdf',  stato: 'Approvata' },
    { dipendenteId: 10, data: dayOffset(-9),  categoria: 'Materiale',  descrizione: 'Allestimento tavoli evento',         importo: 118.2, giustificativo: 'fattura_allestimenti.pdf', stato: 'Rimborsata' },
    { dipendenteId: 5,  data: dayOffset(-11), categoria: 'Trasporto',  descrizione: 'Taxi per transfer ospite VIP',       importo: 45,                                                stato: 'Rifiutata', motivo: 'Manca il giustificativo: il transfer va fatturato al cliente.' },
    { dipendenteId: 7,  data: dayOffset(-12), categoria: 'Materiale',  descrizione: 'Ricambi impianto idraulico',         importo: 312.75, giustificativo: 'fattura_ferramenta.pdf',  stato: 'Rimborsata' },
    { dipendenteId: 12, data: dayOffset(-15), categoria: 'Trasporto',  descrizione: 'Corso HACCP – viaggio A/R',          importo: 38.6,  giustificativo: 'biglietti_bus.pdf',        stato: 'Approvata' },
    { dipendenteId: 2,  data: dayOffset(-18), categoria: 'Altro',      descrizione: 'Cancelleria reception',              importo: 27.3,  giustificativo: 'scontrino_cartoleria.jpg', stato: 'Rimborsata' },
    { dipendenteId: 11, data: dayOffset(-20), categoria: 'Vitto',      descrizione: 'Degustazione fornitore vini',        importo: 76,    giustificativo: 'ricevuta_enoteca.pdf',     stato: 'Rimborsata' },
    { dipendenteId: 4,  data: dayOffset(-23), categoria: 'Materiale',  descrizione: 'Prodotti pulizia urgenti',           importo: 64.9,  giustificativo: 'scontrino_market.jpg',     stato: 'Rimborsata' },
  ]
  return rows.map((r, i) => ({ ...r, id: `ns-${i + 1}` }))
}

function seedCedolini(): Cedolino[] {
  const out: Cedolino[] = []
  const lordi: Record<number, number> = { 1: 2150, 2: 1980, 3: 2420, 4: 1720, 5: 1890, 6: 2080, 7: 1760, 8: 1700, 9: 2650, 10: 2010, 11: 1830, 12: 2290 }
  // Ultimi tre mesi: i due più vecchi pubblicati, il mese scorso ancora in bozza per metà del personale.
  for (const off of [-3, -2, -1]) {
    const mese = monthOffset(off)
    for (const d of DIPENDENTI_HR) {
      const lordo = lordi[d.id] + (off === -1 ? 0 : (d.id % 3) * 15)
      const bozza = off === -1 && d.id % 2 === 0
      out.push({
        id: `ced-${mese}-${d.id}`,
        dipendenteId: d.id,
        mese,
        lordo,
        netto: Math.round(lordo * 0.74 * 100) / 100,
        file: `cedolino_${mese}_${d.cognome.toLowerCase()}.pdf`,
        stato: bozza ? 'Bozza' : 'Pubblicato',
        visto: !bozza && (off < -1 || d.id % 3 !== 0),
        pubblicatoAt: bozza ? undefined : (off === -1 ? dayOffset(-1) : `${monthOffset(off + 1)}-05`),
      })
    }
  }
  return out
}

function seedRichieste(): RichiestaAssenza[] {
  const r = (dipendenteId: number, tipo: TipoAssenza, dal: number, al: number, stato: StatoRichiesta, creata: number, note?: string, motivo?: string): Omit<RichiestaAssenza, 'id'> =>
    ({ dipendenteId, tipo, dal: dayOffset(dal), al: dayOffset(al), stato, note, motivo, createdAt: `${dayOffset(creata)}T09:${pad((dipendenteId * 7) % 60)}:00` })
  const rows = [
    r(2,  'Ferie',    6,  12, 'Da approvare', -1, 'Matrimonio di mia sorella'),
    r(5,  'Ferie',    8,  10, 'Da approvare', -1),
    r(12, 'Permesso', 20, 20, 'Da approvare', 0,  'Visita medica, solo mattina'),
    r(8,  'ROL',      14, 15, 'Da approvare', -2),
    r(11, 'Ferie',    20, 27, 'Da approvare', -3, 'Viaggio programmato da tempo'),
    r(1,  'Ferie',    -3, 2,  'Approvata',    -20),
    r(4,  'Malattia', -2, 1,  'Approvata',    -2,  'Certificato INPS n. 2026/118843'),
    r(6,  'Ferie',    9,  16, 'Approvata',    -12),
    r(10, 'ROL',      4,  4,  'Approvata',    -6),
    r(3,  'Ferie',    18, 24, 'Approvata',    -15),
    r(9,  'Permesso', -6, -6, 'Approvata',    -9),
    r(7,  'Ferie',    7,  11, 'Rifiutata',    -8,  undefined, 'Nello stesso periodo è già assente Sergio Benvenuti: la manutenzione resterebbe scoperta.'),
    r(2,  'Ferie',    -25, -19, 'Approvata',  -40),
    r(5,  'Malattia', -14, -12, 'Approvata',  -14),
  ]
  return rows.map((x, i) => ({ ...x, id: `ra-${i + 1}` }))
}

// ─── Store ────────────────────────────────────────────────────────────────────
interface HrGestioneState {
  noteSpese: NotaSpesa[]
  cedolini: Cedolino[]
  richieste: RichiestaAssenza[]

  aggiungiSpesa: (s: Omit<NotaSpesa, 'id' | 'stato'>) => void
  setStatoSpesa: (id: string, stato: StatoSpesa, motivo?: string) => void
  eliminaSpesa: (id: string) => void

  caricaCedolini: (mese: string, dipendenteIds: number[]) => number
  pubblicaCedolini: (ids: string[]) => void
  eliminaCedolino: (id: string) => void

  aggiungiRichiesta: (r: Omit<RichiestaAssenza, 'id' | 'stato' | 'createdAt'>) => void
  decidiRichiesta: (id: string, stato: 'Approvata' | 'Rifiutata', motivo?: string) => void
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const useHrGestioneStore = create<HrGestioneState>()(persist((set, get) => ({
  noteSpese: seedNoteSpese(),
  cedolini: seedCedolini(),
  richieste: seedRichieste(),

  aggiungiSpesa: (s) => set(st => ({ noteSpese: [{ ...s, id: uid('ns'), stato: 'Da approvare' }, ...st.noteSpese] })),
  setStatoSpesa: (id, stato, motivo) => set(st => ({ noteSpese: st.noteSpese.map(n => n.id === id ? { ...n, stato, motivo: stato === 'Rifiutata' ? motivo : undefined } : n) })),
  eliminaSpesa: (id) => set(st => ({ noteSpese: st.noteSpese.filter(n => n.id !== id) })),

  caricaCedolini: (mese, dipendenteIds) => {
    const esistenti = new Set(get().cedolini.filter(c => c.mese === mese).map(c => c.dipendenteId))
    const nuovi: Cedolino[] = dipendenteIds.filter(id => !esistenti.has(id)).map(id => {
      const d = DIPENDENTI_HR.find(x => x.id === id)!
      const lordo = 1700 + ((id * 137) % 950)
      return { id: `ced-${mese}-${id}`, dipendenteId: id, mese, lordo, netto: Math.round(lordo * 0.74 * 100) / 100, file: `cedolino_${mese}_${d.cognome.toLowerCase()}.pdf`, stato: 'Bozza', visto: false }
    })
    set(st => ({ cedolini: [...nuovi, ...st.cedolini] }))
    return nuovi.length
  },
  pubblicaCedolini: (ids) => {
    const oggi = todayIsoHr()
    set(st => ({ cedolini: st.cedolini.map(c => ids.includes(c.id) && c.stato === 'Bozza' ? { ...c, stato: 'Pubblicato', pubblicatoAt: oggi } : c) }))
  },
  eliminaCedolino: (id) => set(st => ({ cedolini: st.cedolini.filter(c => c.id !== id) })),

  aggiungiRichiesta: (r) => set(st => ({ richieste: [{ ...r, id: uid('ra'), stato: 'Da approvare', createdAt: new Date().toISOString() }, ...st.richieste] })),
  decidiRichiesta: (id, stato, motivo) => set(st => ({ richieste: st.richieste.map(r => r.id === id ? { ...r, stato, motivo: stato === 'Rifiutata' ? motivo : undefined } : r) })),
}), { name: 'sibylla.hr-gestione', version: 3, migrate: () => ({ noteSpese: seedNoteSpese(), cedolini: seedCedolini(), richieste: seedRichieste() }) as unknown as HrGestioneState }))

/** Ferie godute (approvate) nell'anno solare corrente per dipendente. */
export function ferieGodute(richieste: RichiestaAssenza[], dipendenteId: number, anno = new Date().getFullYear()) {
  return richieste
    .filter(r => r.dipendenteId === dipendenteId && r.tipo === 'Ferie' && r.stato === 'Approvata' && r.dal.startsWith(String(anno)))
    .reduce((s, r) => s + giorniLavorativi(r.dal, r.al), 0)
}

/** Assenze già approvate dello stesso reparto che si sovrappongono all'intervallo (escluso il dipendente). */
export function sovrapposizioni(richieste: RichiestaAssenza[], r: Pick<RichiestaAssenza, 'id' | 'dipendenteId' | 'dal' | 'al'>) {
  const rep = repartoDipendente(r.dipendenteId)
  return richieste.filter(x =>
    x.id !== r.id && x.dipendenteId !== r.dipendenteId && x.stato === 'Approvata' &&
    repartoDipendente(x.dipendenteId) === rep && x.dal <= r.al && x.al >= r.dal)
}
