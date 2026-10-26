// ─── Monitoraggio canali: dati d'esempio ─────────────────────────────────────
//  Ogni modifica (tariffa, disponibilità, restrizione, chiusura vendite) parte
//  verso tutti i canali collegati: un "invio" per canale, con esito, tempo di
//  risposta e tentativi. Generati per struttura (seme della scheda) negli
//  ultimi 30 giorni; Expedia ha un disservizio in corso da ritrasmettere.
//  Il BE (configura/GetMonitoraggioCanali) fornirà gli invii veri.

export type Esito = 'Consegnato' | 'Ritrasmesso' | 'Errore' | 'In coda'
export const ESITI: Esito[] = ['Consegnato', 'Ritrasmesso', 'Errore', 'In coda']

export type Operazione = 'Tariffa' | 'Disponibilità' | 'Restrizione' | 'Chiusura vendite'
export const OPERAZIONI: Operazione[] = ['Tariffa', 'Disponibilità', 'Restrizione', 'Chiusura vendite']

export const OPERAZIONE_ICO: Record<Operazione, string> = {
  'Tariffa': 'fa-tags',
  'Disponibilità': 'fa-bed',
  'Restrizione': 'fa-calendar-xmark',
  'Chiusura vendite': 'fa-ban',
}

export const CANALI = ['Booking.com', 'Expedia', 'Airbnb', 'Sito web', 'Hotelbeds']
export const SIGLA: Record<string, string> = { 'Booking.com': 'B', 'Expedia': 'E', 'Airbnb': 'A', 'Sito web': 'W', 'Hotelbeds': 'H' }

export const CAMERE = ['Singola Classic', 'Doppia Classic', 'Matrimoniale Superior', 'Tripla Classic', 'Junior suite', 'Suite']
const PREZZO_BASE: Record<string, number> = {
  'Singola Classic': 79, 'Doppia Classic': 109, 'Matrimoniale Superior': 139, 'Tripla Classic': 149, 'Junior suite': 189, 'Suite': 259,
}
export const ORIGINI = ['Mario Rossi', 'Giulia Neri', 'Luca Bianchi', 'Revenue bot', 'PMS (automatico)']

export interface Tentativo { ts: Date; ok: boolean | null; nota: string; ms?: number }

export interface Invio {
  id: string
  /** Modifica d'origine: gli invii dello stesso aggiornamento la condividono. */
  lotto: string
  ts: Date
  canale: string
  operazione: Operazione
  camera: string
  periodo: string
  prima: string
  dopo: string
  origine: string
  esito: Esito
  ms: number
  codice: string
  messaggio: string
  tentativi: Tentativo[]
}

// ─── Generatore ──────────────────────────────────────────────────────────────
class Rng {
  private s: number
  constructor(seed: number) { this.s = seed >>> 0 || 1 }
  next() { this.s = (this.s * 1664525 + 1013904223) >>> 0; return this.s / 4294967296 }
  int(a: number, b: number) { return a + Math.floor(this.next() * (b - a + 1)) }
  pick<T>(xs: T[]): T { return xs[Math.floor(this.next() * xs.length)] }
  chance(p: number) { return this.next() < p }
}

const ddmm = (d: Date) => d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })

/** Latenza tipica per canale (ms): Airbnb più lento, il sito web immediato. */
const LATENZA: Record<string, [number, number]> = {
  'Booking.com': [180, 520], 'Expedia': [260, 780], 'Airbnb': [600, 1900], 'Sito web': [40, 120], 'Hotelbeds': [300, 900],
}

let progressivo = 0

interface Modifica { lotto: string; operazione: Operazione; camera: string; periodo: string; prima: string; dopo: string; origine: string }

function modifica(r: Rng, livello: number): Modifica {
  const op = r.pick<Operazione>(['Tariffa', 'Tariffa', 'Tariffa', 'Tariffa', 'Disponibilità', 'Disponibilità', 'Restrizione', 'Chiusura vendite'])
  const camera = r.pick(CAMERE)
  const dal = new Date(); dal.setDate(dal.getDate() + r.int(0, 90))
  const al = new Date(dal); al.setDate(al.getDate() + r.int(0, 6))
  const periodo = +dal === +al ? ddmm(dal) : `${ddmm(dal)} – ${ddmm(al)}`
  let prima = '', dopo = ''
  if (op === 'Tariffa') {
    const p = Math.round(PREZZO_BASE[camera] * livello)
    prima = `${p} €`; dopo = `${p + r.pick([-15, -10, -5, 5, 10, 15, 20, 30])} €`
  } else if (op === 'Disponibilità') {
    const n = r.int(1, 8); prima = `${n} camere`; const m = Math.max(0, n + r.pick([-2, -1, 1, 2])); dopo = m === 1 ? '1 camera' : `${m} camere`
  } else if (op === 'Restrizione') {
    prima = 'Min. 1 notte'; dopo = `Min. ${r.int(2, 4)} notti`
  } else {
    prima = 'Aperta'; dopo = 'Chiusa'
  }
  return { lotto: `UPD-${String(++progressivo).padStart(6, '0')}`, operazione: op, camera, periodo, prima, dopo, origine: r.pick(ORIGINI) }
}

function invio(r: Rng, m: Modifica, canale: string, ts: Date, guasto: boolean): Invio {
  const [lo, hi] = LATENZA[canale]
  const ms = r.int(lo, hi)
  const base = { id: `${m.lotto}-${SIGLA[canale]}`, ts, canale, ...m, ms }
  if (guasto) {
    return { ...base, esito: 'Errore', codice: '503', messaggio: 'Servizio del canale non disponibile (503): aggiornamento non consegnato',
      tentativi: [1, 2, 3].map(k => ({ ts: new Date(ts.getTime() + (k - 1) * 30_000), ok: false, nota: `Tentativo ${k}: 503 Service Unavailable`, ms: 30_000 })) }
  }
  const x = r.next()
  if (x < 0.055) {
    return { ...base, esito: 'Ritrasmesso', codice: '200', messaggio: 'Consegnato al secondo tentativo dopo un timeout',
      tentativi: [
        { ts, ok: false, nota: 'Tentativo 1: timeout dopo 30 s', ms: 30_000 },
        { ts: new Date(ts.getTime() + 60_000), ok: true, nota: 'Tentativo 2: accettato dal canale', ms },
      ] }
  }
  if (x < 0.065) {
    return { ...base, esito: 'Errore', codice: '422', messaggio: r.pick([
      'Tipologia camera non mappata sul canale',
      'Tariffa sotto il minimo consentito dal contratto',
      'Periodo fuori dall’allotment caricato',
    ]), tentativi: [{ ts, ok: false, nota: 'Rifiutato dal canale (422)', ms }] }
  }
  return { ...base, esito: 'Consegnato', codice: '200', messaggio: 'Accettato dal canale', tentativi: [{ ts, ok: true, nota: 'Accettato dal canale', ms }] }
}

/** Invii degli ultimi 30 giorni per una struttura (seme e livello prezzi dalla scheda). */
export function generaInvii(seme: number, livello: number): Invio[] {
  const r = new Rng(seme * 7919 + 17)
  const adesso = Date.now()
  const out: Invio[] = []
  const inizioGuasto = adesso - r.int(70, 110) * 60_000
  let t = adesso - 30 * 86400_000
  while (t < adesso - 60_000) {
    const ora = new Date(t).getHours()
    // Di notte lavorano solo il bot e il PMS: modifiche più rade
    t += (ora < 7 ? r.int(60, 180) : r.int(15, 70)) * 60_000
    if (t >= adesso - 60_000) break
    const m = modifica(r, livello)
    if (ora < 7) m.origine = r.pick(['Revenue bot', 'PMS (automatico)'])
    CANALI.forEach((c, i) => {
      const ts = new Date(t + i * r.int(300, 1400))
      out.push(invio(r, m, c, ts, c === 'Expedia' && t > inizioGuasto))
    })
  }
  return out.sort((a, b) => b.ts.getTime() - a.ts.getTime())
}

// ─── Diretta ─────────────────────────────────────────────────────────────────
const rLive = new Rng(Date.now() % 99991)

/** Una nuova modifica adesso: un invio "In coda" per ogni canale. */
export function lottoLive(livello: number): Invio[] {
  const m = modifica(rLive, livello)
  return CANALI.map((c, i) => ({
    id: `${m.lotto}-${SIGLA[c]}`, ts: new Date(Date.now() + i * 150), canale: c, ...m,
    esito: 'In coda' as Esito, ms: 0, codice: '—', messaggio: 'In attesa di risposta dal canale',
    tentativi: [{ ts: new Date(), ok: null, nota: 'Inviato, in attesa di risposta' }],
  }))
}

/** Esito dell'invio in coda: consegnato, o errore se il canale è guasto. */
export function risolvi(i: Invio, guasto: boolean): Invio {
  const [lo, hi] = LATENZA[i.canale]
  const ms = rLive.int(lo, hi)
  if (guasto) {
    return { ...i, esito: 'Errore', ms: 30_000, codice: '503', messaggio: 'Servizio del canale non disponibile (503): aggiornamento non consegnato',
      tentativi: [{ ts: i.ts, ok: false, nota: 'Tentativo 1: 503 Service Unavailable', ms: 30_000 }] }
  }
  return { ...i, esito: 'Consegnato', ms, codice: '200', messaggio: 'Accettato dal canale',
    tentativi: [{ ts: i.ts, ok: true, nota: 'Accettato dal canale', ms }] }
}

/** Ritrasmissione riuscita di un invio in errore. */
export function ritrasmesso(i: Invio): Invio {
  const ms = rLive.int(...LATENZA[i.canale])
  return { ...i, esito: 'Ritrasmesso', ms, codice: '200', messaggio: 'Ritrasmesso manualmente e accettato dal canale',
    tentativi: [...i.tentativi, { ts: new Date(), ok: true, nota: 'Ritrasmissione manuale: accettato dal canale', ms }] }
}
