import { schedaDemo } from '../../../../core/demo/struttureDemo'
// ─── DATI PRENOTAZIONI IDS ────────────────────────────────────────────────────
// Sorgente unica (mock deterministico) condivisa fra la vista di sintesi
// giorno-per-giorno e il dettaglio delle singole prenotazioni: il numero di
// righe del dettaglio coincide sempre con il conteggio mostrato nella tabella
// di riepilogo, perché entrambe derivano da `dailyCount()`.

/** Elenco storico; le pagine usano le strutture del cliente corrente (useStrutturaCorrente). */
export const HOTELS = ['Hotel Archimede', 'Hotel Floridia', 'Hotel Lazio', 'Hotel Luce', 'Hotel Lux', 'Hotel Noto', 'Hotel Regio']

const HOTEL_BASE: Record<string, number> = {
  'Hotel Archimede': 14, 'Hotel Floridia': 8, 'Hotel Lazio': 18, 'Hotel Luce': 26, 'Hotel Lux': 10, 'Hotel Noto': 20, 'Hotel Regio': 12,
}

/** Agenzie / canali da cui arrivano le prenotazioni IDS. */
export const ORIGINI = ['DESTINATIONITALIA', 'LOGITRAVEL', 'DOTW', 'G2TRAVEL', 'BOOKING.COM', 'EXPEDIA', 'HOTELBEDS', 'WEBSITE']
export const PIANI_TARIFFARI = ['BB_BAR_IDS', 'RO_BAR_IDS', 'RO_BAR_TO', 'BB_BAR_TO', 'BB_NOTREF_SITO', 'BB_BAR_SITO', 'RO_BAR_NOTREF_SITO', 'BB_NOTREF_IDS', 'RO_NOTREF_IDS']
export const ARRANGIAMENTI = ['BB', 'CA', 'HB', 'FB']
export const STATI = ['Confermata', 'Modificata', 'Cancellata'] as const
export type StatoIDS = typeof STATI[number]
export const TIPI_CAMERA = ['Singola Classic', 'Doppia Classica', 'Doppia Economy', 'Matrimoniale Economy', 'Matrimoniale Superior', 'Tripla Comfort']

const CLIENTI = [
  'Elisabeth Boen', 'MARGARET DEVORE', 'XIANYUE DUAN', 'NASSER AL-SAADI', 'Carolina Delmonte',
  'Nila Venugopal', 'Andrea Blaettler', 'XIAOHONG LIU', 'Daniela Torres', 'Antonio Jose Barreto Diaz',
  'Manuel Alexander Currea Restrepo', 'Sofia Lombardi', 'Jens Hoffmann', 'Marie Lefevre', 'Takeshi Nakamura',
  'Olga Ivanova', 'Peter Van Dijk', 'Ana Paula Ferreira', 'Mohammed Al-Rashid', 'Chiara Esposito',
  'Lars Andersen', 'Beatriz Sanchez', 'John Mitchell', 'Katarzyna Nowak', 'Hugo Martins',
]

export const hashStr = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h }
export const parseIso = (d: string) => { const [y, m, g] = d.split('-').map(Number); return new Date(y, m - 1, g) }
export const toIso = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` }
export const fmtIt = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}` }
export const fmtIsoIt = (iso: string) => fmtIt(parseIso(iso))
export const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

/** Prenotazioni ricevute in una giornata da una struttura (mock deterministico). */
export function dailyCount(hotel: string, d: Date): number {
  // Strutture del cliente fuori dall'elenco storico: volume proporzionale alle camere.
  const base = HOTEL_BASE[hotel] ?? Math.max(2, Math.round(schedaDemo(hotel).camere * 0.22))
  const weekend = d.getDay() === 5 || d.getDay() === 6 ? base * 0.45 : 0
  const seasonal = base * 0.45 * Math.sin((d.getMonth() * 30 + d.getDate()) / 58)
  const noise = ((hashStr(hotel + d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()) % 100) / 100 - 0.3) * base * 0.6
  return Math.max(0, Math.round(base + weekend + seasonal + noise))
}

export interface Day { date: Date; iso: string; label: string; dow: string; count: number }

export function buildSeries(hotel: string, da: Date, a: Date): Day[] {
  const out: Day[] = []
  const cur = new Date(da)
  let guard = 0
  while (cur <= a && guard < 600) {
    out.push({ date: new Date(cur), iso: toIso(cur), label: fmtIt(cur), dow: GIORNI[cur.getDay()], count: dailyCount(hotel, cur) })
    cur.setDate(cur.getDate() + 1)
    guard++
  }
  return out
}

// ─── DETTAGLIO DELLA SINGOLA PRENOTAZIONE ────────────────────────────────────

export interface PrenotazioneIDS {
  key:        string
  /** Minuto del giorno in cui è arrivato il messaggio dal canale. */
  minuto:     number
  nPre:       number
  struttura:  string
  dataPre:    string   // data di inserimento (ISO)
  bookingId:  string
  dataIn:     string   // ISO
  dataOut:    string   // ISO
  persone:    number
  camere:     number
  piano:      string
  arrangiamento: string
  origine:    string
  cliente:    string
  idLog:      number
  vcc:        boolean
  euro:       number
  stato:      StatoIDS
  /** Tipologia della camera prenotata. */
  camera:     string
}

/** Generatore pseudo-casuale deterministico a partire da un seme testuale. */
function rng(seed: string) {
  let s = hashStr(seed) || 1
  const next = () => { s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0; s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  // Semi consecutivi (…|0, …|1, …) darebbero primi valori vicini fra loro:
  // qualche giro a vuoto li decorrela.
  next(); next(); next()
  return next
}

const addDays = (iso: string, n: number) => { const d = parseIso(iso); d.setDate(d.getDate() + n); return toIso(d) }
const digits = (r: () => number, n: number) => Array.from({ length: n }, () => String(Math.floor(r() * 10))).join('')

function bookingIdOf(r: () => number) {
  const forma = Math.floor(r() * 3)
  if (forma === 0) return `${digits(r, 10)}/${digits(r, 10)}|${digits(r, 5)}`
  if (forma === 1) return `${digits(r, 10)}|${digits(r, 5)}`
  return `${digits(r, 5)}${String.fromCharCode(65 + Math.floor(r() * 26))}${String.fromCharCode(65 + Math.floor(r() * 26))}${digits(r, 5)}|${digits(r, 5)}`
}

/** Elenco delle prenotazioni inserite da una struttura in una data giornata. */
export function prenotazioniDelGiorno(hotel: string, iso: string): PrenotazioneIDS[] {
  const n = dailyCount(hotel, parseIso(iso))
  return Array.from({ length: n }, (_, i) => {
    const r = rng(`${hotel}|${iso}|${i}`)
    // Minuto di arrivo del messaggio IDS: da qui derivano numero di
    // prenotazione e id di log, così l'elenco di più strutture si ordina come
    // un'unica coda cronologica invece di raggruppare per struttura.
    const minuto = Math.floor(r() * 1440)
    const anticipo = 1 + Math.floor(r() * 90)
    const notti = 1 + Math.floor(r() * 6)
    const dataIn = addDays(iso, anticipo)
    const persone = 1 + Math.floor(r() * 4)
    const camere = persone > 2 && r() > 0.6 ? 2 : 1
    const notteBase = 55 + r() * 145
    // Estratti dopo gli altri campi: non alterano i valori già generati.
    const vcc = r() > 0.86
    const euro = Math.round(notteBase * notti * camere * 100) / 100
    const sr = r()
    const stato: StatoIDS = sr < 0.14 ? 'Cancellata' : sr < 0.28 ? 'Modificata' : 'Confermata'
    const camera = TIPI_CAMERA[Math.floor(r() * TIPI_CAMERA.length)]
    return {
      key: `${hotel}|${iso}|${i}`,
      minuto,
      // univoco anche fra strutture diverse nello stesso minuto
      nPre: 136000 + minuto * 8 + (hashStr(hotel) % 8),
      struttura: hotel,
      dataPre: iso,
      bookingId: bookingIdOf(r),
      dataIn,
      dataOut: addDays(dataIn, notti),
      persone,
      camere,
      piano: PIANI_TARIFFARI[Math.floor(r() * PIANI_TARIFFARI.length)],
      arrangiamento: r() > 0.12 ? ARRANGIAMENTI[Math.floor(r() * ARRANGIAMENTI.length)] : '',
      origine: ORIGINI[Math.floor(r() * ORIGINI.length)],
      cliente: CLIENTI[Math.floor(r() * CLIENTI.length)],
      idLog: 1030000 + minuto * 3 + (hashStr(`${hotel}${i}`) % 3),
      vcc,
      // Una prenotazione cancellata non genera ricavo (come nel gestionale IDS)
      euro: stato === 'Cancellata' ? 0 : euro,
      stato,
      camera,
    }
  })
}

/** Prenotazioni inserite in una giornata da tutte le strutture, log più recente in testa. */
export function prenotazioniDelGiornoTutte(iso: string, hotels: string[] = HOTELS): PrenotazioneIDS[] {
  return hotels.flatMap(h => prenotazioniDelGiorno(h, iso)).sort((a, b) => b.minuto - a.minuto)
}
