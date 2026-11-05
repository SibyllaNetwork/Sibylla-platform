import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAccessStore } from './useAccessStore'
import { useHrConfigStore } from './useHrConfigStore'

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
  /** Ore di ROL (riduzione orario di lavoro) maturate nell'anno, in proporzione al contratto. */
  rolAnnui: number
}

// ── Storico degli interventi dell'ufficio del personale ──
// Le richieste e le spese nascono dal dipendente nell'App Op!: ogni volta che l'HR
// le decide o le corregge resta traccia di chi, quando e che cosa (anche il
// messaggio al dipendente), a tutela di entrambi.
export interface EventoHr {
  /** ISO datetime. */
  at: string
  autore: string
  azione: string
  /** Campi cambiati, es. "Periodo: 09/11 → 15/11/2026 diventa 10/11 → 14/11/2026". */
  modifiche?: string[]
  /** Messaggio al dipendente (motivo del rifiuto o della modifica). */
  messaggio?: string
}

/** Chi sta operando: l'utenza collegata, altrimenti l'ufficio del personale. */
export function autoreHr(): string {
  const a = useAccessStore.getState()
  const p = a.currentProfileId ? a.profiles.find(x => x.id === a.currentProfileId) : undefined
  return p?.nome ?? 'Ufficio del personale'
}
const evento = (azione: string, extra: Partial<EventoHr> = {}): EventoHr => ({ at: new Date().toISOString(), autore: autoreHr(), azione, ...extra })
const conEvento = <T extends { storico?: EventoHr[] }>(x: T, e: EventoHr): T => ({ ...x, storico: [...(x.storico ?? []), e] })

// ── Nota spese ──
// Voci del foglio "Nota spese mensile": trasporti, vitto e altro (i buoni pasto sono a parte).
export type CategoriaSpesa = 'Treno' | 'Bus' | 'Aereo' | 'Parcheggio' | 'Taxi' | 'Pasti' | 'Varie'
export const CATEGORIE_SPESA: CategoriaSpesa[] = ['Treno', 'Bus', 'Aereo', 'Parcheggio', 'Taxi', 'Pasti', 'Varie']
export const TRASPORTI: CategoriaSpesa[] = ['Treno', 'Bus', 'Aereo', 'Parcheggio', 'Taxi']
export const VITTO_ALTRO: CategoriaSpesa[] = ['Pasti', 'Varie']
/** Valore del buono pasto giornaliero (esente fino a 8 € se elettronico). */
export const VALORE_BUONO = 8
export const chiaveBuono = (dipendenteId: number, iso: string) => `${dipendenteId}|${iso}`
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
  storico?: EventoHr[]
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
// Iter approvativo di ferie e ROL: il dipendente chiede dall'App Op!, il responsabile
// del reparto approva o rifiuta (sempre dall'App Op!) e solo dopo la richiesta passa
// all'ufficio del personale, che dà l'approvazione definitiva. Permessi e malattia, e
// i reparti senza responsabile, arrivano direttamente all'HR.
export type StatoRichiesta = 'Al responsabile' | 'Da approvare' | 'Approvata' | 'Rifiutata'
export const STATI_RICHIESTA: StatoRichiesta[] = ['Al responsabile', 'Da approvare', 'Approvata', 'Rifiutata']
export const TIPI_CON_RESPONSABILE: TipoAssenza[] = ['Ferie', 'ROL']
/** Richiesta ancora aperta (dal responsabile o dall'HR): conta nei saldi "in attesa". */
export const inAttesaRichiesta = (s: StatoRichiesta) => s === 'Al responsabile' || s === 'Da approvare'

/** Primo livello dell'iter: la decisione del responsabile di reparto. */
export interface ApprovazioneResponsabile {
  nome: string
  esito: 'In attesa' | 'Approvata' | 'Rifiutata'
  /** ISO datetime della decisione. */
  at?: string
  motivo?: string
  /** Ultimo sollecito inviato dall'HR (ISO). */
  sollecitatoAt?: string
}

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
  /** Ore richieste (ROL e permessi a ore). Senza ore vale la giornata intera: 8 h per giorno lavorativo. */
  ore?: number
  /** ISO datetime della richiesta. */
  createdAt: string
  storico?: EventoHr[]
  /** Iter ferie/ROL: assente se la richiesta va direttamente all'HR. */
  responsabile?: ApprovazioneResponsabile
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
  { id: 1,  nome: 'Andrea',  cognome: 'Grimaudo',  reparto: 'Front office',    ferieAnnue: 26, rolAnnui: 72 },
  { id: 2,  nome: 'Giulia',  cognome: 'Conti',     reparto: 'Front office',    ferieAnnue: 26, rolAnnui: 72 },
  { id: 3,  nome: 'Marco',   cognome: 'Esposito',  reparto: 'Cucina',          ferieAnnue: 26, rolAnnui: 72 },
  { id: 4,  nome: 'Sara',    cognome: 'Romano',    reparto: 'Housekeeping',    ferieAnnue: 22, rolAnnui: 43 },
  { id: 5,  nome: 'Davide',  cognome: 'Marini',    reparto: 'Front office',    ferieAnnue: 26, rolAnnui: 58 },
  { id: 6,  nome: 'Sergio',  cognome: 'Benvenuti', reparto: 'Manutenzione',    ferieAnnue: 26, rolAnnui: 72 },
  { id: 7,  nome: 'Manuel',  cognome: 'Fantoni',   reparto: 'Manutenzione',    ferieAnnue: 22, rolAnnui: 29 },
  { id: 8,  nome: 'Oscar',   cognome: 'Pettinari', reparto: 'Housekeeping',    ferieAnnue: 22, rolAnnui: 72 },
  { id: 9,  nome: 'Luca',    cognome: 'Hambelli',  reparto: 'Amministrazione', ferieAnnue: 26, rolAnnui: 72 },
  { id: 10, nome: 'Elena',   cognome: 'Bianchi',   reparto: 'F&B',             ferieAnnue: 26, rolAnnui: 72 },
  { id: 11, nome: 'Chiara',  cognome: 'Ferri',     reparto: 'F&B',             ferieAnnue: 22, rolAnnui: 22 },
  { id: 12, nome: 'Paolo',   cognome: 'Greco',     reparto: 'Cucina',          ferieAnnue: 26, rolAnnui: 72 },
]

export const nomeDipendente = (id: number) => {
  const d = DIPENDENTI_HR.find(x => x.id === id)
  return d ? `${d.nome} ${d.cognome}` : '—'
}
export const repartoDipendente = (id: number) => DIPENDENTI_HR.find(x => x.id === id)?.reparto ?? ''

function seedNoteSpese(): NotaSpesa[] {
  // Due mesi di spese per ogni dipendente: il mese scorso è tutto chiuso (rimborsato,
  // con qualche rifiuto), il mese in corso è ancora da lavorare.
  const out: NotaSpesa[] = []
  const DESCR: Record<CategoriaSpesa, string[]> = {
    Treno: ['Treno A/R per fiera', 'Treno per corso di formazione', 'Treno per visita fornitore'],
    Bus: ['Bus navetta aeroporto', 'Biglietti bus urbano'],
    Aereo: ['Volo per workshop commerciale', 'Volo per fiera di settore'],
    Parcheggio: ['Parcheggio in fiera', 'Parcheggio stazione', 'Sosta presso fornitore'],
    Taxi: ['Taxi per transfer ospite', 'Taxi dalla stazione'],
    Pasti: ['Pranzo con agenzia partner', 'Cena in trasferta', 'Pranzo durante il corso'],
    Varie: ['Cancelleria reception', 'Ricambi urgenti', 'Prodotti per allestimento'],
  }
  const IMPORTI: Record<CategoriaSpesa, [number, number]> = {
    Treno: [24, 95], Bus: [2, 12], Aereo: [80, 240], Parcheggio: [4, 22], Taxi: [15, 48], Pasti: [14, 62], Varie: [9, 140],
  }
  let n = 0
  for (const d of DIPENDENTI_HR) {
    let seme = d.id * 9301 + 49297
    const rnd = () => { seme = (seme * 9301 + 49297) % 233280; return seme / 233280 }
    for (const off of [-1, 0]) {
      const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + off); base.setHours(12, 0, 0, 0)
      const giorniMese = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
      const ultimo = off === 0 ? Math.max(1, new Date().getDate()) : giorniMese
      const quante = 4 + Math.floor(rnd() * 7)
      for (let k = 0; k < quante; k++) {
        const giorno = 1 + Math.floor(rnd() * ultimo)
        const cat = CATEGORIE_SPESA[Math.floor(rnd() * (d.reparto === 'Amministrazione' || d.reparto === 'Front office' ? 7 : 5)) % 7]
        const [lo, hi] = IMPORTI[cat]
        const importo = Math.round((lo + rnd() * (hi - lo)) * 10) / 10
        const data = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(giorno)}`
        const descr = DESCR[cat][Math.floor(rnd() * DESCR[cat].length)]
        const x = rnd()
        const stato: StatoSpesa = off < 0
          ? (x < 0.08 ? 'Rifiutata' : 'Rimborsata')
          : (x < 0.5 ? 'Da approvare' : x < 0.85 ? 'Approvata' : x < 0.93 ? 'Rimborsata' : 'Rifiutata')
        const senzaRicevuta = stato === 'Rifiutata'
        out.push({
          id: `ns-${++n}`,
          dipendenteId: d.id,
          data,
          categoria: cat,
          descrizione: descr,
          importo,
          giustificativo: senzaRicevuta ? undefined : `ricevuta_${cat.toLowerCase()}_${data}.pdf`,
          stato,
          motivo: stato === 'Rifiutata' ? 'Manca la ricevuta: senza giustificativo la spesa non è rimborsabile.' : undefined,
        })
      }
    }
  }
  return out
}

function seedBuoni(): string[] {
  // Buono pasto nei giorni lavorati a turno spezzato: circa un giorno feriale su tre.
  const out: string[] = []
  for (const d of DIPENDENTI_HR) {
    for (let off = -45; off <= 0; off++) {
      const g = new Date(); g.setHours(12, 0, 0, 0); g.setDate(g.getDate() + off)
      if (g.getDay() === 0) continue
      if ((g.getDate() + d.id * 2) % 3 === 0) out.push(chiaveBuono(d.id, isoOf(g)))
    }
  }
  return out
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
  // Anno delle feste: da febbraio in poi quello corrente, a gennaio quello appena passato.
  const oggi = new Date()
  const an = oggi.getMonth() >= 1 ? oggi.getFullYear() : oggi.getFullYear() - 1
  const dic = (g: number) => `${an}-12-${pad(g)}`
  const gen = (g: number) => `${an + 1}-01-${pad(g)}`
  const natale = (): Omit<RichiestaAssenza, 'id'>[] => ([
    [2, dic(22), dic(27), 'Approvata', -6, 'Natale con la famiglia in Puglia'],
    [6, dic(28), gen(2), 'Da approvare', -3, undefined],
    [9, dic(24), dic(31), 'Approvata', -9, undefined],
    [11, dic(20), dic(26), 'Da approvare', -2, 'Pranzo di Natale dai nonni'],
    [8, dic(29), gen(4), 'Al responsabile', -1, undefined],
    [3, dic(23), dic(26), 'Da approvare', -2, undefined],
    [12, gen(2), gen(6), 'Approvata', -8, 'Settimana bianca'],
    [1, dic(24), dic(26), 'Rifiutata', -4, undefined, 'Front office al completo per il cenone: anticipa al 20-22 dicembre.'],
    [4, dic(8), dic(10), 'Da approvare', -1, 'Ponte dell\'Immacolata'],
  ] as [number, string, string, StatoRichiesta, number, string | undefined, string?][]).map(([dipendenteId, dal, al, stato, creata, note, motivo]) =>
    ({ dipendenteId, tipo: 'Ferie' as const, dal, al, stato, note, motivo, createdAt: `${dayOffset(creata)}T10:${pad((dipendenteId * 11) % 60)}:00` }))
  const r = (dipendenteId: number, tipo: TipoAssenza, dal: number, al: number, stato: StatoRichiesta, creata: number, note?: string, motivo?: string, ore?: number): Omit<RichiestaAssenza, 'id'> =>
    ({ dipendenteId, tipo, dal: dayOffset(dal), al: dayOffset(al), stato, note, motivo, ore, createdAt: `${dayOffset(creata)}T09:${pad((dipendenteId * 7) % 60)}:00` })
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
    // ROL a ore e a giornate, già goduti nell'anno o da approvare.
    r(9,  'ROL',      3,  3,  'Da approvare', 0,  'Uscita anticipata per pratiche in comune', undefined, 3),
    r(4,  'ROL',      11, 11, 'Da approvare', -1, undefined, undefined, 4),
    r(6,  'ROL',      -40, -38, 'Approvata',  -45),
    r(1,  'ROL',      -12, -12, 'Approvata',  -15, undefined, undefined, 4),
    r(12, 'ROL',      -30, -30, 'Approvata',  -33),
    r(7,  'ROL',      -20, -19, 'Approvata',  -24),
    r(5,  'ROL',      -50, -50, 'Rifiutata',  -52, undefined, 'Giornata di picco: il front office resterebbe con una sola persona.', 6),
    // Rifiutata in primo livello dal responsabile di reparto (non arriva all'HR per la decisione).
    r(4,  'Ferie',    30, 34, 'Rifiutata',  -2,  'Weekend lungo', 'Fine mese c\'è il gruppo congressuale: servono tutte le cameriere ai piani.'),
    // Ferie di Natale (alimentano il piano ferie "Natale"): date dell'anno delle feste in corso.
    ...natale(),
  ]
  // Iter del responsabile sulle richieste d'esempio: quelle ancora aperte ma "fresche"
  // sono ferme al responsabile, le altre lui le ha già approvate (o, una, rifiutata).
  const alResponsabile = new Set([1, 4, 16])
  const rifiutataDalResp = 21
  return rows.map((x, i) => {
    const id = `ra-${i + 1}`
    const it = iterIniziale(x.dipendenteId, x.tipo)
    if (!it.responsabile) return { ...x, id }
    const nome = it.responsabile.nome
    const decisa = `${x.createdAt.slice(0, 10)}T17:30:00`
    if (x.stato === 'Al responsabile') return { ...x, id, responsabile: it.responsabile }
    if (x.stato === 'Da approvare' && alResponsabile.has(i)) return { ...x, id, stato: 'Al responsabile' as const, responsabile: it.responsabile }
    if (i === rifiutataDalResp) {
      return { ...x, id, responsabile: { nome, esito: 'Rifiutata' as const, at: decisa, motivo: x.motivo },
        storico: [{ at: decisa, autore: nome, azione: 'Rifiutata dal responsabile', messaggio: x.motivo }] }
    }
    return { ...x, id, responsabile: { nome, esito: 'Approvata' as const, at: decisa },
      storico: [{ at: decisa, autore: nome, azione: 'Approvata dal responsabile' }] }
  })
}

/** Responsabile del reparto (Configurazione HR › Reparti); vuoto se non indicato. */
export function responsabileReparto(reparto: string): string {
  return useHrConfigStore.getState().reparti.find(r => r.nome === reparto && r.attivo)?.responsabile?.trim() ?? ''
}

/** Da chi parte l'iter: il responsabile per ferie/ROL di un reparto che lo ha (e se non è il richiedente). */
export function iterIniziale(dipendenteId: number, tipo: TipoAssenza): { stato: StatoRichiesta; responsabile?: ApprovazioneResponsabile } {
  const nome = responsabileReparto(repartoDipendente(dipendenteId))
  if (!TIPI_CON_RESPONSABILE.includes(tipo) || !nome || nome === nomeDipendente(dipendenteId)) return { stato: 'Da approvare' }
  return { stato: 'Al responsabile', responsabile: { nome, esito: 'In attesa' } }
}

// ─── Store ────────────────────────────────────────────────────────────────────
interface HrGestioneState {
  noteSpese: NotaSpesa[]
  /** Giorni con buono pasto, chiave `dipendenteId|aaaa-mm-gg`. */
  buoniPasto: string[]
  cedolini: Cedolino[]
  richieste: RichiestaAssenza[]

  aggiungiSpesa: (s: Omit<NotaSpesa, 'id' | 'stato'>) => void
  setStatoSpesa: (id: string, stato: StatoSpesa, motivo?: string) => void
  /** L'HR corregge una spesa: `modifiche` descrive i campi cambiati, `messaggio` va al dipendente. */
  modificaSpesa: (id: string, patch: Partial<Omit<NotaSpesa, 'id' | 'storico'>>, modifiche: string[], messaggio?: string) => void
  eliminaSpesa: (id: string) => void
  toggleBuono: (dipendenteId: number, iso: string) => void

  caricaCedolini: (mese: string, dipendenteIds: number[]) => number
  pubblicaCedolini: (ids: string[]) => void
  eliminaCedolino: (id: string) => void

  aggiungiRichiesta: (r: Omit<RichiestaAssenza, 'id' | 'stato' | 'createdAt'>) => void
  decidiRichiesta: (id: string, stato: 'Approvata' | 'Rifiutata', motivo?: string) => void
  /** Primo livello (App Op!): il responsabile di reparto approva → passa all'HR; rifiuta → chiusa. */
  decidiResponsabile: (id: string, esito: 'Approvata' | 'Rifiutata', motivo?: string) => void
  /** L'HR sollecita il responsabile che non ha ancora deciso (notifica nell'App Op!). */
  sollecitaResponsabile: (ids: string[]) => void
  /** L'HR corregge una richiesta arrivata dall'App Op! (tutti i campi tranne id e data di richiesta). */
  modificaRichiesta: (id: string, patch: Partial<Omit<RichiestaAssenza, 'id' | 'createdAt' | 'storico'>>, modifiche: string[], messaggio?: string) => void
  eliminaRichiesta: (id: string) => void
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const useHrGestioneStore = create<HrGestioneState>()(persist((set, get) => ({
  noteSpese: seedNoteSpese(),
  buoniPasto: seedBuoni(),
  cedolini: seedCedolini(),
  richieste: seedRichieste(),

  aggiungiSpesa: (s) => set(st => ({ noteSpese: [{ ...s, id: uid('ns'), stato: 'Da approvare' }, ...st.noteSpese] })),
  setStatoSpesa: (id, stato, motivo) => set(st => ({ noteSpese: st.noteSpese.map(n => n.id === id
    ? conEvento({ ...n, stato, motivo: stato === 'Rifiutata' ? motivo : undefined }, evento(({ Approvata: 'Approvata', Rifiutata: 'Rifiutata', Rimborsata: 'Rimborsata', 'Da approvare': 'Rimessa in attesa' } as Record<StatoSpesa, string>)[stato], { messaggio: stato === 'Rifiutata' ? motivo : undefined }))
    : n) })),
  modificaSpesa: (id, patch, modifiche, messaggio) => set(st => ({ noteSpese: st.noteSpese.map(n => {
    if (n.id !== id) return n
    const stato = patch.stato ?? n.stato
    return conEvento({ ...n, ...patch, motivo: stato === 'Rifiutata' ? (patch.motivo ?? n.motivo) : undefined }, evento('Modificata', { modifiche, messaggio: messaggio || undefined }))
  }) })),
  eliminaSpesa: (id) => set(st => ({ noteSpese: st.noteSpese.filter(n => n.id !== id) })),
  toggleBuono: (dipendenteId, iso) => set(st => {
    const k = chiaveBuono(dipendenteId, iso)
    return { buoniPasto: st.buoniPasto.includes(k) ? st.buoniPasto.filter(x => x !== k) : [...st.buoniPasto, k] }
  }),

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

  aggiungiRichiesta: (r) => set(st => ({ richieste: [{ ...r, id: uid('ra'), ...iterIniziale(r.dipendenteId, r.tipo), createdAt: new Date().toISOString() }, ...st.richieste] })),
  decidiRichiesta: (id, stato, motivo) => set(st => ({ richieste: st.richieste.map(r => r.id === id
    ? conEvento({ ...r, stato, motivo: stato === 'Rifiutata' ? motivo : undefined }, evento(stato, { messaggio: stato === 'Rifiutata' ? motivo : undefined }))
    : r) })),
  decidiResponsabile: (id, esito, motivo) => set(st => ({ richieste: st.richieste.map(r => {
    if (r.id !== id || r.stato !== 'Al responsabile' || !r.responsabile) return r
    const at = new Date().toISOString()
    const nome = r.responsabile.nome
    return {
      ...r,
      stato: esito === 'Approvata' ? 'Da approvare' : 'Rifiutata',
      motivo: esito === 'Rifiutata' ? motivo : undefined,
      responsabile: { ...r.responsabile, esito, at, motivo: esito === 'Rifiutata' ? motivo : undefined },
      storico: [...(r.storico ?? []), { at, autore: nome, azione: esito === 'Approvata' ? 'Approvata dal responsabile' : 'Rifiutata dal responsabile', messaggio: esito === 'Rifiutata' ? motivo : undefined }],
    }
  }) })),
  sollecitaResponsabile: (ids) => set(st => ({ richieste: st.richieste.map(r => {
    if (!ids.includes(r.id) || r.stato !== 'Al responsabile' || !r.responsabile) return r
    const e = evento('Sollecito al responsabile', { messaggio: `Promemoria inviato a ${r.responsabile.nome} nell'App Op!` })
    return { ...conEvento(r, e), responsabile: { ...r.responsabile, sollecitatoAt: e.at } }
  }) })),
  modificaRichiesta: (id, patch, modifiche, messaggio) => set(st => ({ richieste: st.richieste.map(r => {
    if (r.id !== id) return r
    const stato = patch.stato ?? r.stato
    return conEvento({ ...r, ...patch, motivo: stato === 'Rifiutata' ? (patch.motivo ?? r.motivo) : undefined }, evento('Modificata', { modifiche, messaggio: messaggio || undefined }))
  }) })),
  eliminaRichiesta: (id) => set(st => ({ richieste: st.richieste.filter(r => r.id !== id) })),
}), { name: 'sibylla.hr-gestione', version: 7, migrate: () => ({ noteSpese: seedNoteSpese(), buoniPasto: seedBuoni(), cedolini: seedCedolini(), richieste: seedRichieste() }) as unknown as HrGestioneState }))

/** Ferie godute (approvate) nell'anno solare corrente per dipendente. */
export function ferieGodute(richieste: RichiestaAssenza[], dipendenteId: number, anno = new Date().getFullYear()) {
  return richieste
    .filter(r => r.dipendenteId === dipendenteId && r.tipo === 'Ferie' && r.stato === 'Approvata' && r.dal.startsWith(String(anno)))
    .reduce((s, r) => s + giorniLavorativi(r.dal, r.al), 0)
}

/** Ore di una richiesta: quelle indicate, oppure 8 h per ogni giorno lavorativo. */
// Almeno una giornata: anche un'assenza di domenica (giorno lavorato in hotel) vale 8 h.
export const oreRichiesta = (r: Pick<RichiestaAssenza, 'dal' | 'al' | 'ore'>) => r.ore ?? Math.max(1, giorniLavorativi(r.dal, r.al)) * ORE_GIORNO
export const ORE_GIORNO = 8

/** Saldo ROL dell'anno: maturate, godute (approvate), in attesa e residue. */
export function saldoRol(richieste: RichiestaAssenza[], dipendenteId: number, anno = new Date().getFullYear()) {
  const d = DIPENDENTI_HR.find(x => x.id === dipendenteId)
  const rol = richieste.filter(r => r.dipendenteId === dipendenteId && r.tipo === 'ROL' && r.dal.startsWith(String(anno)))
  const godute = rol.filter(r => r.stato === 'Approvata').reduce((s, r) => s + oreRichiesta(r), 0)
  const inAttesa = rol.filter(r => inAttesaRichiesta(r.stato)).reduce((s, r) => s + oreRichiesta(r), 0)
  const maturate = d?.rolAnnui ?? 0
  return { maturate, godute, inAttesa, residue: maturate - godute }
}

/** Saldo ferie dell'anno in giorni lavorativi: maturate (da contratto), godute (approvate), in attesa e residue. */
export function saldoFerie(richieste: RichiestaAssenza[], dipendenteId: number, anno = new Date().getFullYear()) {
  const d = DIPENDENTI_HR.find(x => x.id === dipendenteId)
  const ferie = richieste.filter(r => r.dipendenteId === dipendenteId && r.tipo === 'Ferie' && r.dal.startsWith(String(anno)))
  const giorni = (r: RichiestaAssenza) => giorniLavorativi(r.dal, r.al)
  const godute = ferie.filter(r => r.stato === 'Approvata').reduce((s, r) => s + giorni(r), 0)
  const inAttesa = ferie.filter(r => inAttesaRichiesta(r.stato)).reduce((s, r) => s + giorni(r), 0)
  const maturate = d?.ferieAnnue ?? 0
  return { maturate, godute, inAttesa, residue: maturate - godute }
}

/** Assenze già approvate dello stesso reparto che si sovrappongono all'intervallo (escluso il dipendente). */
export function sovrapposizioni(richieste: RichiestaAssenza[], r: Pick<RichiestaAssenza, 'id' | 'dipendenteId' | 'dal' | 'al'>) {
  const rep = repartoDipendente(r.dipendenteId)
  return richieste.filter(x =>
    x.id !== r.id && x.dipendenteId !== r.dipendenteId && x.stato === 'Approvata' &&
    repartoDipendente(x.dipendenteId) === rep && x.dal <= r.al && x.al >= r.dal)
}
