// ─── Log di sistema: dati d'esempio ──────────────────────────────────────────
//  Eventi generati in modo deterministico negli ultimi 30 giorni, a ridosso di
//  adesso: sessioni utente (accesso → azioni → uscita), sincronizzazioni dei
//  canali e qualche anomalia (accessi falliti, pagamenti rifiutati…).
//  Il BE fornirà gli eventi veri con la stessa forma.

export type Livello = 'Info' | 'Avviso' | 'Errore'

export const LIVELLI: Livello[] = ['Info', 'Avviso', 'Errore']

export type Categoria =
  | 'Accesso' | 'Prenotazioni' | 'Tariffe' | 'Utenti e ruoli'
  | 'Pagamenti' | 'Preventivi' | 'Esportazioni' | 'Integrazioni'

export const CATEGORIE: Record<Categoria, string> = {
  'Accesso':        'fa-right-to-bracket',
  'Prenotazioni':   'fa-calendar-check',
  'Tariffe':        'fa-tags',
  'Utenti e ruoli': 'fa-user-shield',
  'Pagamenti':      'fa-credit-card',
  'Preventivi':     'fa-file-signature',
  'Esportazioni':   'fa-file-export',
  'Integrazioni':   'fa-plug',
}

export interface Modifica { campo: string; prima: string; dopo: string }

export interface UtenteLog {
  id: string
  nome: string
  email: string
  ruolo: string
  avatar: string
  registrato: Date
  attivo: boolean
  /** Utente tecnico (integrazioni): niente sessioni né avatar. */
  sistema?: boolean
}

export interface EventoLog {
  id: string
  ts: Date
  utenteId: string
  codice: string
  evento: string
  categoria: Categoria
  modulo: string
  livello: Livello
  descrizione: string
  ip: string
  dispositivo: string
  luogo: string
  sessione: string
  modifiche: Modifica[]
}

// ─── Utenti ──────────────────────────────────────────────────────────────────
const g = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d }

export const UTENTI: UtenteLog[] = [
  { id: 'mario-rossi',   nome: 'Mario Rossi',   email: 'test@sibyllanetwork.com',            ruolo: 'Amministratore',  avatar: 'avatar-18', registrato: g(640), attivo: true },
  { id: 'giulia-verdi',  nome: 'Giulia Verdi',  email: 'g.verdi@sibyllanetwork.com',         ruolo: 'Front office',    avatar: 'avatar-05', registrato: g(470), attivo: true },
  { id: 'andrea-rossi',  nome: 'Andrea Rossi',  email: 'test_a.grimaudo@sibyllanetwork.com', ruolo: 'Revenue manager', avatar: 'avatar-11', registrato: g(590), attivo: true },
  { id: 'marco-neri',    nome: 'Marco Neri',    email: 'm.neri@sibyllanetwork.com',          ruolo: 'Front office',    avatar: 'avatar-23', registrato: g(450), attivo: true },
  { id: 'lucia-gialli',  nome: 'Lucia Gialli',  email: 'l.gialli@sibyllanetwork.com',        ruolo: 'Contabilità',     avatar: 'avatar-08', registrato: g(400), attivo: true },
  { id: 'john-smith',    nome: 'John Smith',    email: 'test_dfgsd@fsda.com',                ruolo: 'Booking',         avatar: 'avatar-30', registrato: g(520), attivo: true },
  { id: 'luigi-rossi',   nome: 'Luigi Rossi',   email: 'test_l.rossi@sibyllanetwork.com',    ruolo: 'Housekeeping',    avatar: 'avatar-14', registrato: g(540), attivo: true },
  { id: 'ali-aslan',     nome: 'Ali Aslan',     email: 'test_alisahibamiraslan@gmail.com',   ruolo: 'Booking',         avatar: 'avatar-27', registrato: g(520), attivo: true },
  { id: 'sara-conti',    nome: 'Sara Conti',    email: 's.conti@sibyllanetwork.com',         ruolo: 'Revenue manager', avatar: 'avatar-12', registrato: g(210), attivo: true },
  { id: 'paolo-bianchi', nome: 'Paolo Bianchi', email: 'p.bianchi@sibyllanetwork.com',       ruolo: 'Contabilità',     avatar: 'avatar-35', registrato: g(500), attivo: false },
  { id: 'sistema',       nome: 'Channel manager', email: 'api@sibyllanetwork.com',           ruolo: 'Integrazione',    avatar: '',          registrato: g(700), attivo: true, sistema: true },
]

export const utente = (id: string) => UTENTI.find(u => u.id === id)!

// ─── Catalogo eventi ─────────────────────────────────────────────────────────
interface TipoEvento {
  codice: string
  evento: string
  categoria: Categoria
  modulo: string
  livello: Livello
  frase: (r: Rng) => { descrizione: string; modifiche?: Modifica[] }
}

const CAMERE = ['101', '104', '112', '204', '207', '215', '302', '310', '318', '401']
const TIPOLOGIE = ['Doppia standard', 'Doppia superior', 'Junior suite', 'Singola', 'Tripla', 'Suite vista mare']
const OSPITI = ['Famiglia Rossi', 'Bianchi Luca', 'Müller Anna', 'Esposito Gennaro', 'Dupont Claire', 'Ferrari Elena', 'Smith Robert', 'Ricci Marta']
const CANALI = ['Booking.com', 'Expedia', 'Airbnb', 'Sito web', 'Hotelbeds']
const COLLEGHI = ['Giulia Verdi', 'Marco Neri', 'Sara Conti', 'Luigi Rossi', 'John Smith']
const RUOLI = ['Front office', 'Revenue manager', 'Booking', 'Contabilità', 'Housekeeping']
const dataBreve = (r: Rng, base = 0) => {
  const d = new Date(); d.setDate(d.getDate() + base + r.int(1, 40))
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

const AZIONI: TipoEvento[] = [
  { codice: 'CreateBooking', evento: 'Nuova prenotazione', categoria: 'Prenotazioni', modulo: 'Planner', livello: 'Info',
    frase: r => ({ descrizione: `Prenotazione #${r.int(48000, 49999)} per ${r.pick(OSPITI)} · camera ${r.pick(CAMERE)} · ${r.int(1, 7)} notti` }) },
  { codice: 'ModifyBooking', evento: 'Prenotazione modificata', categoria: 'Prenotazioni', modulo: 'Planner', livello: 'Info',
    frase: r => {
      const a = r.int(1, 25), out = dataBreve(r, a)
      return { descrizione: `Prenotazione #${r.int(48000, 49999)} di ${r.pick(OSPITI)}: date di soggiorno aggiornate`,
        modifiche: [{ campo: 'Check-out', prima: dataBreve(r, a - 2), dopo: out }, { campo: 'Camera', prima: r.pick(CAMERE), dopo: r.pick(CAMERE) }] }
    } },
  { codice: 'CancelBooking', evento: 'Prenotazione cancellata', categoria: 'Prenotazioni', modulo: 'Planner', livello: 'Avviso',
    frase: r => ({ descrizione: `Prenotazione #${r.int(48000, 49999)} di ${r.pick(OSPITI)} cancellata · penale ${r.pick(['nessuna', '30%', 'prima notte'])}`,
      modifiche: [{ campo: 'Stato', prima: 'Confermata', dopo: 'Cancellata' }] }) },
  { codice: 'CheckIn', evento: 'Check-in', categoria: 'Prenotazioni', modulo: 'Front office', livello: 'Info',
    frase: r => ({ descrizione: `${r.pick(OSPITI)} registrato in camera ${r.pick(CAMERE)}` }) },
  { codice: 'UpdateRates', evento: 'Tariffe aggiornate', categoria: 'Tariffe', modulo: 'Tariffe e disponibilità', livello: 'Info',
    frase: r => {
      const t = r.pick(TIPOLOGIE), p = r.int(89, 260)
      return { descrizione: `${t}: tariffa B.A.R. aggiornata per ${r.int(3, 30)} giorni`,
        modifiche: [{ campo: `Tariffa ${t}`, prima: `${p} €`, dopo: `${p + r.pick([-20, -10, 10, 15, 25])} €` }] }
    } },
  { codice: 'CloseSales', evento: 'Vendite chiuse', categoria: 'Tariffe', modulo: 'Tariffe e disponibilità', livello: 'Avviso',
    frase: r => ({ descrizione: `Stop sell su ${r.pick(TIPOLOGIE)} per ${r.pick(CANALI)}`,
      modifiche: [{ campo: 'Disponibilità', prima: 'Aperta', dopo: 'Chiusa' }] }) },
  { codice: 'SetAssignedRoles', evento: 'Ruoli assegnati', categoria: 'Utenti e ruoli', modulo: 'Configuratore', livello: 'Avviso',
    frase: r => {
      const a = r.pick(RUOLI), b = r.pick(RUOLI.filter(x => x !== a))
      return { descrizione: `Ruolo di ${r.pick(COLLEGHI)} modificato`, modifiche: [{ campo: 'Ruolo', prima: a, dopo: b }] }
    } },
  { codice: 'Set_Ruoli_Funzioni_Mapping', evento: 'Permessi del ruolo', categoria: 'Utenti e ruoli', modulo: 'Configuratore', livello: 'Avviso',
    frase: r => {
      const f = r.pick(['Cassa', 'Report', 'Tariffe', 'Planner', 'Preventivi'])
      return { descrizione: `Permessi di ${r.pick(RUOLI)} sulla funzione ${f}`, modifiche: [{ campo: f, prima: 'Sola lettura', dopo: 'Lettura e scrittura' }] }
    } },
  { codice: 'PaymentCaptured', evento: 'Pagamento incassato', categoria: 'Pagamenti', modulo: 'Cassa', livello: 'Info',
    frase: r => ({ descrizione: `${r.int(80, 1900)},00 € da ${r.pick(OSPITI)} · ${r.pick(['Visa', 'Mastercard', 'Amex', 'Bonifico', 'Contanti'])}` }) },
  { codice: 'RefundIssued', evento: 'Rimborso emesso', categoria: 'Pagamenti', modulo: 'Cassa', livello: 'Avviso',
    frase: r => ({ descrizione: `Rimborso di ${r.int(40, 600)},00 € a ${r.pick(OSPITI)}` }) },
  { codice: 'PaymentDeclined', evento: 'Pagamento rifiutato', categoria: 'Pagamenti', modulo: 'Cassa', livello: 'Errore',
    frase: r => ({ descrizione: `Carta rifiutata dal circuito (${r.pick(['fondi insufficienti', 'carta scaduta', '3-D Secure non completato'])}) per ${r.pick(OSPITI)}` }) },
  { codice: 'SendQuote', evento: 'Preventivo inviato', categoria: 'Preventivi', modulo: 'Preventivi', livello: 'Info',
    frase: r => ({ descrizione: `Preventivo PRV-S${r.int(101, 160)} inviato a ${r.pick(OSPITI)} con ${r.int(1, 3)} proposte` }) },
  { codice: 'ExportData', evento: 'Esportazione dati', categoria: 'Esportazioni', modulo: 'Report', livello: 'Info',
    frase: r => ({ descrizione: `${r.pick(['Ospiti in casa', 'Arrivi e partenze', 'Report City Tax', 'Movimenti di cassa'])} esportato in Excel (${r.int(20, 900)} righe)` }) },
  { codice: 'PasswordChange', evento: 'Password modificata', categoria: 'Accesso', modulo: 'Profilo', livello: 'Info',
    frase: () => ({ descrizione: 'Password cambiata dall\'utente' }) },
]

// Più frequenti in testa: il generatore pesca con questi pesi.
const PESI = [16, 10, 3, 10, 7, 2, 2, 1, 10, 2, 1, 4, 3, 1]

// ─── Generatore ──────────────────────────────────────────────────────────────
class Rng {
  private s: number
  constructor(seed: number) { this.s = seed }
  next() { this.s = (this.s * 1664525 + 1013904223) >>> 0; return this.s / 4294967296 }
  int(a: number, b: number) { return a + Math.floor(this.next() * (b - a + 1)) }
  pick<T>(xs: T[]): T { return xs[Math.floor(this.next() * xs.length)] }
  chance(p: number) { return this.next() < p }
}

const DISPOSITIVI = ['Chrome · macOS', 'Chrome · Windows', 'Edge · Windows', 'Safari · iPad', 'Safari · iPhone', 'Firefox · Linux']
const LUOGHI = ['Roma, IT', 'Roma, IT', 'Roma, IT', 'Milano, IT', 'Napoli, IT']

let progressivo = 0
const nuovoId = () => `EV-${String(++progressivo).padStart(6, '0')}`
const sessioneId = (r: Rng) => r.int(0x10000000, 0x7fffffff).toString(16).toUpperCase()

interface Origine { ip: string; dispositivo: string; luogo: string; sessione: string }

const origineDi = (r: Rng, u: UtenteLog): Origine => ({
  ip: `93.44.${r.int(10, 250)}.${r.int(2, 250)}`,
  dispositivo: u.ruolo === 'Housekeeping' ? 'Safari · iPad' : r.pick(DISPOSITIVI),
  luogo: r.pick(LUOGHI),
  sessione: sessioneId(r),
})

const evento = (r: Rng, u: UtenteLog, ts: Date, o: Origine, t: Omit<TipoEvento, 'frase'>, dati: { descrizione: string; modifiche?: Modifica[] }): EventoLog => ({
  id: nuovoId(), ts, utenteId: u.id, codice: t.codice, evento: t.evento, categoria: t.categoria,
  modulo: t.modulo, livello: t.livello, descrizione: dati.descrizione, modifiche: dati.modifiche ?? [], ...o,
})

const ACCESSO = { codice: 'LogIn', evento: 'Accesso effettuato', categoria: 'Accesso' as Categoria, modulo: 'Piattaforma', livello: 'Info' as Livello }
const USCITA = { codice: 'LogOut', evento: 'Disconnessione', categoria: 'Accesso' as Categoria, modulo: 'Piattaforma', livello: 'Info' as Livello }
const FALLITO = { codice: 'LoginFailed', evento: 'Accesso non riuscito', categoria: 'Accesso' as Categoria, modulo: 'Piattaforma', livello: 'Avviso' as Livello }
const BLOCCATO = { codice: 'AccountLocked', evento: 'Account bloccato', categoria: 'Accesso' as Categoria, modulo: 'Piattaforma', livello: 'Errore' as Livello }
const SYNC = { codice: 'ChannelSync', evento: 'Sincronizzazione canali', categoria: 'Integrazioni' as Categoria, modulo: 'Channel manager', livello: 'Info' as Livello }
const SYNC_KO = { codice: 'ChannelSyncError', evento: 'Sincronizzazione non riuscita', categoria: 'Integrazioni' as Categoria, modulo: 'Channel manager', livello: 'Errore' as Livello }

/** Un'azione casuale, pescata secondo i pesi del catalogo. */
function azioneCasuale(r: Rng, u: UtenteLog, ts: Date, o: Origine): EventoLog {
  const tot = PESI.reduce((a, b) => a + b, 0)
  let x = r.next() * tot, i = 0
  while (x >= PESI[i]) { x -= PESI[i]; i++ }
  const t = AZIONI[i]
  return evento(r, u, ts, o, t, t.frase(r))
}

/** Sessione completa di un utente: accesso, 2–9 azioni, uscita. */
function sessione(r: Rng, u: UtenteLog, inizio: Date, adesso: Date): EventoLog[] {
  const o = origineDi(r, u)
  const out: EventoLog[] = []
  let t = inizio.getTime()
  // Ogni tanto la password sbagliata al primo colpo
  if (r.chance(0.08)) {
    out.push(evento(r, u, new Date(t - 40_000), o, FALLITO, { descrizione: 'Password errata (1° tentativo)' }))
  }
  out.push(evento(r, u, new Date(t), o, ACCESSO, { descrizione: `Accesso da ${o.dispositivo} · ${o.luogo}` }))
  const n = r.int(2, 9)
  for (let i = 0; i < n; i++) {
    t += r.int(2, 35) * 60_000 + r.int(0, 59) * 1000
    if (t > adesso.getTime()) return out
    out.push(azioneCasuale(r, u, new Date(t), o))
  }
  t += r.int(3, 40) * 60_000
  if (t <= adesso.getTime()) {
    out.push(evento(r, u, new Date(t), o, USCITA, { descrizione: `Sessione chiusa dopo ${Math.round((t - inizio.getTime()) / 60_000)} minuti` }))
  }
  return out
}

/** Tentativi di accesso da un luogo insolito, fino al blocco dell'account. */
function attacco(r: Rng, u: UtenteLog, ts: Date): EventoLog[] {
  const o: Origine = { ip: `185.220.${r.int(10, 250)}.${r.int(2, 250)}`, dispositivo: 'Sconosciuto', luogo: r.pick(['Francoforte, DE', 'Amsterdam, NL', 'Bucarest, RO']), sessione: '—' }
  const out: EventoLog[] = []
  for (let i = 1; i <= 5; i++) {
    out.push(evento(r, u, new Date(ts.getTime() + i * 9000), o, FALLITO, { descrizione: `Password errata (${i}° tentativo) da ${o.luogo}` }))
  }
  out.push(evento(r, u, new Date(ts.getTime() + 50_000), o, BLOCCATO, {
    descrizione: `Account bloccato dopo 5 tentativi falliti da ${o.ip}`,
    modifiche: [{ campo: 'Stato account', prima: 'Attivo', dopo: 'Bloccato per 30 minuti' }],
  }))
  return out
}

function genera(): EventoLog[] {
  const r = new Rng(20261026)
  const adesso = new Date()
  const out: EventoLog[] = []
  const umani = UTENTI.filter(u => !u.sistema)
  const sistema = UTENTI.find(u => u.sistema)!

  for (let giorno = 29; giorno >= 0; giorno--) {
    const base = new Date(adesso); base.setDate(base.getDate() - giorno); base.setHours(0, 0, 0, 0)
    const weekend = base.getDay() === 0 || base.getDay() === 6

    for (const u of umani) {
      // Utente disattivato: nessuna attività negli ultimi 20 giorni
      if (!u.attivo && giorno < 20) continue
      const turni = weekend ? (r.chance(0.35) ? 1 : 0) : r.int(1, 2)
      for (let s = 0; s < turni; s++) {
        const inizio = new Date(base)
        inizio.setHours(s === 0 ? r.int(7, 11) : r.int(14, 18), r.int(0, 59), r.int(0, 59))
        if (inizio > adesso) continue
        out.push(...sessione(r, u, inizio, adesso))
      }
    }

    // Sincronizzazioni ogni 3 ore, con qualche errore del canale
    for (let h = 0; h < 24; h += 3) {
      const ts = new Date(base); ts.setHours(h, r.int(0, 4), r.int(0, 59))
      if (ts > adesso) break
      const o: Origine = { ip: '10.0.4.12', dispositivo: 'API server', luogo: 'Data center, IT', sessione: 'API' }
      const canale = r.pick(CANALI)
      out.push(r.chance(0.07)
        ? evento(r, sistema, ts, o, SYNC_KO, { descrizione: `${canale}: timeout dopo 30 s, ${r.int(2, 14)} aggiornamenti in coda` })
        : evento(r, sistema, ts, o, SYNC, { descrizione: `${r.int(4, 60)} aggiornamenti di tariffe e disponibilità inviati a ${CANALI.length} canali` }))
    }
  }

  // Due episodi sospetti: uno ieri sera, uno qualche giorno fa
  const ieri = new Date(adesso); ieri.setDate(ieri.getDate() - 1); ieri.setHours(23, 12, 4)
  out.push(...attacco(r, utente('john-smith'), ieri))
  const prima = new Date(adesso); prima.setDate(prima.getDate() - 6); prima.setHours(3, 41, 30)
  out.push(...attacco(r, utente('marco-neri'), prima))

  // Attività di adesso: due sessioni aperte negli ultimi minuti
  for (const [id, min] of [['giulia-verdi', 52], ['andrea-rossi', 24]] as const) {
    const ts = new Date(adesso.getTime() - min * 60_000)
    out.push(...sessione(r, utente(id), ts, adesso).filter(e => e.codice !== 'LogOut'))
  }

  return out.sort((a, b) => b.ts.getTime() - a.ts.getTime())
}

export const EVENTI_INIZIALI: EventoLog[] = genera()

// ─── Diretta ─────────────────────────────────────────────────────────────────
const rLive = new Rng(Date.now() % 100000)

/** Un nuovo evento "adesso" da uno degli utenti con una sessione aperta. */
export function eventoLive(eventi: EventoLog[]): EventoLog {
  const recenti = eventi.filter(e => Date.now() - e.ts.getTime() < 3 * 3600_000 && !utente(e.utenteId).sistema)
  const ultimo = recenti.length ? rLive.pick(recenti.slice(0, 12)) : eventi[0]
  const u = utente(ultimo.utenteId)
  const o: Origine = { ip: ultimo.ip, dispositivo: ultimo.dispositivo, luogo: ultimo.luogo, sessione: ultimo.sessione }
  if (rLive.chance(0.08)) return evento(rLive, u, new Date(), o, FALLITO, { descrizione: 'Password errata in fase di conferma operazione' })
  return azioneCasuale(rLive, u, new Date(), o)
}

// ─── Formattazione ───────────────────────────────────────────────────────────
export const dataOra = (d: Date) =>
  d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(',', ' ·')

export const ora = (d: Date) => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function relativo(d: Date, adesso = Date.now()): string {
  const s = Math.round((adesso - d.getTime()) / 1000)
  if (s < 45) return 'adesso'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min fa`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} ${h === 1 ? 'ora' : 'ore'} fa`
  const gg = Math.round(h / 24)
  if (gg === 1) return 'ieri'
  if (gg < 30) return `${gg} giorni fa`
  return d.toLocaleDateString('it-IT')
}

/** Inizio del giorno (mezzanotte locale) — chiave dei separatori per giorno. */
export const giorno = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime() }

export function etichettaGiorno(t: number): string {
  const oggi = giorno(new Date())
  if (t === oggi) return 'Oggi'
  if (t === oggi - 86400_000) return 'Ieri'
  const s = new Date(t).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
