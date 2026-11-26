import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { oggiIso, rigaDa, trova } from './sitoData'
import type { RigaCarrello } from './useSitoStore'

/**
 * Area riservata del sito Sibylla Network, sul modello di sibyllanetwork.com:
 * account Privato o Business (operatori del settore: hotel, tour operator,
 * fornitori, ristoranti), Gestisci profilo, Ordini effettuati, Preferiti,
 * Portafoglio (Sibylla Token, 1 token = 1 €) e, per i Business, le tariffe,
 * promozioni e soggiorni riservati agli operatori.
 * Demo: qualunque e-mail e password entrano; un'e-mail nuova crea un profilo
 * con qualche ordine e un movimento di portafoglio d'esempio. I profili
 * restano salvati per e-mail (localStorage sibylla.sito-account).
 */
export type TipoAccount = 'privato' | 'business'
export const TIPI_AZIENDA = ['Hotel', 'Tour Operator', 'Fornitore', 'Ristorante', 'Tour Operator Individuali'] as const
export type TipoAzienda = typeof TIPI_AZIENDA[number]

export interface Azienda {
  ragione: string
  piva: string
  cf: string
  tel: string
  email: string
  indirizzo: string
  tipo: TipoAzienda
  ruolo: string
}

export interface UtenteSito {
  tipo: TipoAccount
  nome: string
  cognome: string
  email: string
  tel: string
  cf: string
  nascita: string
  nazionalita: string
  indirizzo: string
  sesso: '' | 'M' | 'F'
  /** Immagine del profilo (data URL), mostrata tonda. */
  avatar?: string
  newsletter: boolean
  azienda?: Azienda
}

export interface RigaOrdine extends Omit<RigaCarrello, 'key'> {
  key: string
  annullata?: boolean
  /** Prenotata a tariffa operatore (area riservata). */
  b2b?: boolean
}
export interface Ordine {
  id: string
  email: string
  data: string
  righe: RigaOrdine[]
  sconto: number
  totale: number
  metodo: string
}

export interface Movimento {
  id: string
  email: string
  data: string
  /** + ricarica, − pagamento in token */
  importo: number
  dettaglio: string
}

const uid = () => Math.random().toString(36).slice(2, 9)
export const nuovoNumeroOrdine = () => `SN-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`

function ordiniDemo(email: string, business: boolean): Ordine[] {
  const riga = (id: string, s: Parameters<typeof rigaDa>[1], b2b = false): RigaOrdine => {
    const r = rigaDa(trova(id)!, s)
    return { ...r, prezzo: b2b ? Math.round(r.prezzo * 0.8) : r.prezzo, key: uid(), b2b: b2b || undefined }
  }
  const tot = (righe: RigaOrdine[]) => righe.reduce((a, r) => a + r.prezzo * r.qta, 0)
  const a = business
    ? [riga('trevi-suites', { qta: 6, data: oggiIso(32), dataFine: oggiIso(35) }, true), riga('dolce-vita', { qta: 12, data: oggiIso(33), orario: '09:00' }, true)]
    : [riga('trevi-suites', { qta: 1, data: oggiIso(18), dataFine: oggiIso(21) }), riga('colosseo-prioritario', { qta: 2, data: oggiIso(19), orario: '10:30' })]
  const b = [riga('dolce-vita-notte', { qta: 2, data: oggiIso(-34), orario: '21:00' }), riga('corso-pasta', { qta: 2, data: oggiIso(-33), orario: '18:00' })]
  const c = [riga('olio-sabina', { qta: 2 }), riga('cesanese', { qta: 3 })]
  const d = [riga('transfer-fco', { qta: 1, data: oggiIso(-35), orario: '11:00' })]
  return [
    { id: 'SN-2026-48213', email, data: oggiIso(-6), righe: a, sconto: 0, totale: tot(a), metodo: 'Carta di credito' },
    { id: 'SN-2026-31877', email, data: oggiIso(-40), righe: c, sconto: 0, totale: tot(c), metodo: 'Sibylla Token' },
    { id: 'SN-2026-29054', email, data: oggiIso(-52), righe: [...b, ...d], sconto: 0, totale: tot([...b, ...d]), metodo: 'Carta di credito' },
  ]
}

const nomeDaEmail = (email: string) => {
  const p = email.split('@')[0].split(/[._-]/).filter(Boolean)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return { nome: cap(p[0] ?? 'Ospite'), cognome: cap(p[1] ?? '') }
}

/** Profilo vuoto a partire dai campi del form (registrazione o primo accesso demo). */
export const profiloBase = (tipo: TipoAccount, email: string, extra: Partial<UtenteSito> = {}): UtenteSito => ({
  tipo, ...nomeDaEmail(email), email, tel: '', cf: '', nascita: '', nazionalita: 'Italia', indirizzo: '', sesso: '', newsletter: false, ...extra,
})

/** Profili demo per l'accesso rapido della fiera. */
export const DEMO = {
  business: profiloBase('business', 'booking@hotelarchimede.it', {
    nome: 'Laura', cognome: 'Ferri', tel: '+39 06 4740 2100', nazionalita: 'Italia', indirizzo: 'Via dei Mille 19, Roma', sesso: 'F', newsletter: true,
    azienda: { ragione: 'Hotel Archimede S.r.l.', piva: '04512870585', cf: '04512870585', tel: '+39 06 4740 2100', email: 'amministrazione@hotelarchimede.it', indirizzo: 'Via dei Mille 19, 00185 Roma', tipo: 'Hotel', ruolo: 'Responsabile booking' },
  }),
  privato: profiloBase('privato', 'giulia.romano@gmail.com', { nome: 'Giulia', cognome: 'Romano', tel: '+39 333 123 4567', nascita: '1990-04-18', indirizzo: 'Via Nazionale 12, Roma', sesso: 'F', newsletter: true }),
}

interface AccountState {
  utente: UtenteSito | null
  profili: Record<string, UtenteSito>
  ordini: Ordine[]
  movimenti: Movimento[]
  /** Accesso: un'e-mail già registrata ritrova il suo profilo; una nuova ne crea uno demo. */
  accedi: (email: string, tipo?: TipoAccount) => void
  accediDemo: (tipo: TipoAccount) => void
  registra: (u: UtenteSito) => void
  esci: () => void
  salvaUtente: (u: Partial<UtenteSito>) => void
  aggiungiOrdine: (o: Ordine) => void
  annullaRiga: (ordine: string, key: string) => void
  ricarica: (importo: number, dettaglio: string) => void
  pagaToken: (importo: number, dettaglio: string) => void
}

const conSeed = (s: Pick<AccountState, 'profili' | 'ordini' | 'movimenti'>, u: UtenteSito) => {
  const nuovo = !s.profili[u.email]
  return {
    utente: s.profili[u.email] ?? u,
    profili: nuovo ? { ...s.profili, [u.email]: u } : s.profili,
    ordini: nuovo ? [...s.ordini, ...ordiniDemo(u.email, u.tipo === 'business')] : s.ordini,
    movimenti: nuovo
      ? [...s.movimenti, { id: uid(), email: u.email, data: oggiIso(-60), importo: u.tipo === 'business' ? 500 : 50, dettaglio: 'Ricarica · carta di credito' },
        { id: uid(), email: u.email, data: oggiIso(-40), importo: -23, dettaglio: 'Ordine SN-2026-31877' }]
      : s.movimenti,
  }
}

export const useSitoAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      utente: null,
      profili: {},
      ordini: [],
      movimenti: [],

      accedi: (email, tipo = 'privato') => {
        const e = email.trim().toLowerCase()
        set((s) => conSeed(s, profiloBase(tipo, e)))
      },
      accediDemo: (tipo) => set((s) => conSeed(s, DEMO[tipo])),
      registra: (u) => {
        const e = u.email.trim().toLowerCase()
        const p = { ...u, email: e }
        set((s) => ({ utente: p, profili: { ...s.profili, [e]: p } }))
      },
      esci: () => set({ utente: null }),
      salvaUtente: (u) => {
        const cur = get().utente
        if (!cur) return
        const p = { ...cur, ...u, email: cur.email }
        set((s) => ({ utente: p, profili: { ...s.profili, [p.email]: p } }))
      },
      aggiungiOrdine: (o) => set((s) => ({ ordini: [o, ...s.ordini] })),
      annullaRiga: (ordine, key) => set((s) => ({
        ordini: s.ordini.map(o => (o.id !== ordine ? o : { ...o, righe: o.righe.map(r => (r.key === key ? { ...r, annullata: true } : r)) })),
      })),
      ricarica: (importo, dettaglio) => {
        const u = get().utente
        if (!u) return
        set((s) => ({ movimenti: [{ id: uid(), email: u.email, data: oggiIso(), importo, dettaglio }, ...s.movimenti] }))
      },
      pagaToken: (importo, dettaglio) => {
        const u = get().utente
        if (!u) return
        set((s) => ({ movimenti: [{ id: uid(), email: u.email, data: oggiIso(), importo: -importo, dettaglio }, ...s.movimenti] }))
      },
    }),
    { name: 'sibylla.sito-account', version: 2, migrate: () => ({ utente: null, profili: {}, ordini: [], movimenti: [] }) as unknown as AccountState },
  ),
)

/** Saldo del portafoglio dell'utente collegato. */
export const useSaldo = () => useSitoAccountStore(s => (s.utente ? s.movimenti.filter(m => m.email === s.utente!.email).reduce((a, m) => a + m.importo, 0) : 0))

/** Stato di una riga d'ordine per il cliente. */
export type StatoRiga = 'in-programma' | 'concluso' | 'annullato' | 'in-consegna' | 'consegnato'
export function statoRiga(r: RigaOrdine, dataOrdine: string): StatoRiga {
  if (r.annullata) return 'annullato'
  if (trova(r.id)?.cat === 'prodotti') {
    const giorni = (Date.now() - +new Date(`${dataOrdine}T12:00:00`)) / 86400000
    return giorni > 4 ? 'consegnato' : 'in-consegna'
  }
  const fine = r.dataFine ?? r.data
  if (!fine) return 'in-programma'
  return fine < oggiIso() ? 'concluso' : 'in-programma'
}
export const STATI_RIGA: Record<StatoRiga, { nome: string; icona: string }> = {
  'in-programma': { nome: 'In programma', icona: 'fa-calendar-check' },
  concluso: { nome: 'Concluso', icona: 'fa-circle-check' },
  annullato: { nome: 'Annullato', icona: 'fa-circle-xmark' },
  'in-consegna': { nome: 'In consegna', icona: 'fa-truck-fast' },
  consegnato: { nome: 'Consegnato', icona: 'fa-box-circle-check' },
}
