import { create } from 'zustand'
import type { Pren, Piano, PrenPendente, StatoCam } from '../planner/planner.types'
import { impostaDatiPlanner } from '../planner/planner.data'

// ─── GESTIONALE DEMO (front office) ──────────────────────────────────────────
//  Camere, prenotazioni e ospiti della struttura selezionata in alto, calcolati
//  su oggi: Planner, Arrivi e partenze e Ospiti in casa leggono tutti da qui,
//  così lo stesso ospite è nella stessa camera in tutte le pagine.
//
//  È lo strato che sostituisce i dati di esempio quando il backend del front
//  office non risponde (sempre, sulla demo pubblica). Generatore con seme: la
//  stessa struttura nello stesso giorno dà sempre gli stessi dati.

export interface DescrizionePms {
  nome: string
  categoria?: string
  classificazione?: string
  /** Camere dichiarate nella scheda della struttura. */
  camere?: number
}

type Categoria = 'SGL' | 'DBL' | 'MAT' | 'TRP' | 'SUITE'
type Arrangiamento = 'BB' | 'RO' | 'HB'
type CheckIn = 'fatto' | 'parziale' | 'da-fare'

export interface CameraDemo {
  numero: string
  piano: number
  categoria: Categoria
  tipo: string
  tariffa: number
}

export interface OspiteDemo {
  nome: string
  fascia: 'Adulto' | 'Bambino' | 'Infante'
}

export interface PrenDemo {
  id: string
  booking: string
  nominativo: string
  camera: string
  /** yyyy-MM-dd */
  checkIn: string
  checkOut: string
  adulti: number
  bambini: number
  infanti: number
  arrangiamento: Arrangiamento
  canale: string
  tipo: 'Individuale' | 'Gruppo'
  importo: number
  stato: 'confermata' | 'opzione' | 'noshow'
  checkin: CheckIn
  vip: boolean
  note: string
  ospiti: OspiteDemo[]
  /** Già pagato: in partenza resta da incassare la differenza. */
  pagato: number
}

export interface PmsDemo {
  nome: string
  camere: CameraDemo[]
  prenotazioni: PrenDemo[]
}

const TIPI: Record<Categoria, { label: string; tariffa: number }> = {
  SGL:   { label: 'SGL CLASSICA (Singola Classic)',   tariffa: 95 },
  DBL:   { label: 'DOPPIA CLASSIC (Doppia Classic)',  tariffa: 130 },
  MAT:   { label: 'MATRIMONIALE CLASSIC',             tariffa: 140 },
  TRP:   { label: 'TRIPLA COMFORT',                   tariffa: 175 },
  SUITE: { label: 'Suite',                            tariffa: 260 },
}

export const ARRANGIAMENTO: Record<Arrangiamento, { label: string; breve: string; icon: string }> = {
  BB: { label: 'Bed & Breakfast', breve: 'Con colazione',   icon: 'mug-saucer' },
  RO: { label: 'Room only',       breve: 'Senza colazione', icon: 'bed' },
  HB: { label: 'Mezza pensione',  breve: 'Mezza pensione',  icon: 'utensils' },
}

const PIANI = ['Piano Terra', 'Primo Piano', 'Secondo Piano', 'Terzo Piano', 'Quarto Piano', 'Quinto Piano',
  'Sesto Piano', 'Settimo Piano', 'Ottavo Piano', 'Nono Piano', 'Decimo Piano']

const COGNOMI = ['Rossi', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti',
  'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro',
  'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone', 'Longo', 'Gentile', 'Martinelli',
  'Müller', 'Schneider', 'Smith', 'Johnson', 'Dubois', 'Martin', 'García', 'Fernández', 'Tanaka', 'O’Brien']
const NOMI = ['Marco', 'Giulia', 'Luca', 'Francesca', 'Alessandro', 'Chiara', 'Andrea', 'Sara', 'Matteo', 'Elena',
  'Davide', 'Martina', 'Simone', 'Valentina', 'Federico', 'Laura', 'Paolo', 'Anna', 'Stefano', 'Silvia']
const NOMI_BIMBI = ['Leonardo', 'Sofia', 'Tommaso', 'Aurora', 'Edoardo', 'Ginevra', 'Riccardo', 'Alice']
const GRUPPI = ['Welcome Travel', 'Tui Italia', 'Ovest Destination Italy', 'Alpitour', 'Rotary Club', 'Imperatore Travel']
const CANALI: Array<[string, number]> = [
  ['Booking.com', 32], ['Diretto', 20], ['Expedia', 14], ['Sito web', 14], ['GAR S.R.L', 8], ['Sibylla', 7], ['Airbnb', 5],
]
const NOTE = ['', '', '', '', 'Arrivo in tarda serata', 'Culla in camera', 'Ospite celiaco', 'Anniversario: bottiglia di benvenuto', 'Piano alto se possibile', 'Parcheggio prenotato']

const oggiISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const addGiorni = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** yyyy-MM-dd → dd/MM/yyyy (formato delle tabelle del front office). */
export const isoIt = (iso: string) => iso.split('-').reverse().join('/')

const hashNome = (t: string) => {
  let h = 2166136261
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0
  return h
}
const rngDi = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const tipoStruttura = (d: DescrizionePms) => {
  if (d.categoria) return d.categoria
  if (/resort/i.test(d.nome)) return 'resort'
  if (/b&b/i.test(d.nome)) return 'bnb'
  if (/trattoria|ristorante|osteria/i.test(d.nome)) return 'ristorante'
  if (/\bbar\b|lounge/i.test(d.nome)) return 'bar'
  if (/campus|studentato/i.test(d.nome)) return 'studentato'
  if (/residence|case vacanze/i.test(d.nome)) return 'appartamenti'
  return 'hotel'
}

// ─── Generatore ──────────────────────────────────────────────────────────────

export function generaPms(d: DescrizionePms): PmsDemo {
  const oggi = oggiISO()
  const seme = hashNome(d.nome)
  const rnd = rngDi(seme + Number(oggi.replace(/-/g, '')))
  const rndFisso = rngDi(seme)
  const pick = <T,>(xs: T[], r = rnd) => xs[Math.floor(r() * xs.length)]
  const tipo = tipoStruttura(d)
  const studentato = tipo === 'studentato'

  // Camere: quelle della scheda; per le strutture senza scheda un numero
  // plausibile ma sempre uguale. Ristoranti e bar non hanno camere.
  const n = tipo === 'ristorante' || tipo === 'bar' ? 0
    : d.camere ?? (tipo === 'bnb' ? 6 : 40 + (seme % 50))
  const listino = /5★|grand/i.test(`${d.classificazione ?? ''} ${d.nome}`) ? 1.5
    : /resort/i.test(d.nome) || /resort/i.test(d.classificazione ?? '') ? 1.6
    : tipo === 'bnb' ? 0.8 : tipo === 'appartamenti' || tipo === 'case-vacanze' ? 0.9 : studentato ? 0.3 : 1
  const perPiano = n <= 8 ? n : n <= 40 ? 10 : n <= 100 ? 16 : 25
  const camere: CameraDemo[] = []
  for (let i = 0; i < n; i++) {
    const piano = n <= 8 ? 1 : 1 + Math.floor(i / perPiano)
    const k = i % Math.max(1, perPiano)
    const ultimoPiano = piano === Math.ceil(n / Math.max(1, perPiano))
    const r = rndFisso()
    const categoria: Categoria = studentato ? (r < 0.75 ? 'SGL' : 'DBL')
      : n > 8 && ultimoPiano && k >= perPiano - 2 ? 'SUITE'
      : r < 0.15 ? 'SGL' : r < 0.5 ? 'DBL' : r < 0.85 ? 'MAT' : 'TRP'
    camere.push({
      numero: n <= 8 ? String(i + 1) : String(piano * 100 + k + 1),
      piano, categoria, tipo: TIPI[categoria].label,
      tariffa: Math.round(TIPI[categoria].tariffa * listino),
    })
  }

  const prenotazioni: PrenDemo[] = []
  const gruppiDelGiorno: Record<string, string> = {}
  let progressivo = 15000 + (seme % 900)
  camere.forEach(cam => {
    let g = -21 - Math.floor(rnd() * 6)
    while (g < 45) {
      // Più ci si allontana da oggi, più la camera è libera: il futuro si riempie col tempo.
      const vuoto = g > 14 ? 0.45 : 0.25
      g += rnd() < vuoto ? 1 + Math.floor(rnd() * (g > 14 ? 5 : 3)) : 0
      const gruppo = !studentato && n > 8 && rnd() < 0.07
      const notti = studentato ? 20 + Math.floor(rnd() * 60)
        : gruppo ? 3 : Math.min(10, 1 + Math.floor(-Math.log(1 - rnd()) * 2.4))
      const checkIn = addGiorni(oggi, g)
      const checkOut = addGiorni(oggi, g + notti)
      const cognome = pick(COGNOMI)
      const capienza = cam.categoria === 'SGL' ? 1 : cam.categoria === 'TRP' ? 3 : 2
      const adulti = Math.max(1, capienza - (rnd() < 0.25 ? 1 : 0))
      const bambini = capienza >= 2 && rnd() < 0.15 ? 1 : 0
      const infanti = rnd() < 0.04 ? 1 : 0
      const ospiti: OspiteDemo[] = [
        ...Array.from({ length: adulti }, (_, j) => ({ nome: `${cognome} ${j === 0 ? pick(NOMI) : pick(NOMI)}`, fascia: 'Adulto' as const })),
        ...Array.from({ length: bambini }, () => ({ nome: `${cognome} ${pick(NOMI_BIMBI)}`, fascia: 'Bambino' as const })),
        ...Array.from({ length: infanti }, () => ({ nome: `${cognome} ${pick(NOMI_BIMBI)}`, fascia: 'Infante' as const })),
      ]
      let booking: string
      let nominativo = ospiti[0].nome
      let canale = (() => {
        let r = rnd() * 100
        for (const [c, w] of CANALI) { if ((r -= w) < 0) return c }
        return 'Diretto'
      })()
      if (gruppo) {
        const nomeGruppo = GRUPPI[(Number(checkIn.replace(/-/g, '')) + seme) % GRUPPI.length]
        booking = gruppiDelGiorno[checkIn] ||= String(progressivo++)
        nominativo = `Gruppo ${nomeGruppo}`
        canale = nomeGruppo
      } else {
        booking = String(progressivo++)
      }
      const arrangiamento: Arrangiamento = studentato ? 'RO' : rnd() < 0.6 ? 'BB' : rnd() < 0.65 ? 'RO' : 'HB'
      const importo = Math.round(notti * cam.tariffa * (1 + 0.12 * (adulti - 1) + (arrangiamento === 'HB' ? 0.25 : 0)) * 100) / 100

      // Stato rispetto a oggi.
      let stato: PrenDemo['stato'] = 'confermata'
      let checkin: CheckIn = 'da-fare'
      if (checkIn < oggi) {
        checkin = 'fatto'
      } else if (checkIn === oggi) {
        const r = rnd()
        if (r < 0.55) checkin = 'fatto'
        else if (r < 0.65 && ospiti.length > 1) checkin = 'parziale'
        else if (r < 0.7) stato = 'noshow'
      } else if (rnd() < 0.12) {
        stato = 'opzione'
      }
      prenotazioni.push({
        id: `pms-${cam.numero}-${checkIn}`, booking, nominativo, camera: cam.numero,
        checkIn, checkOut, adulti, bambini, infanti, arrangiamento, canale,
        tipo: gruppo ? 'Gruppo' : 'Individuale', importo, stato, checkin,
        vip: rnd() < 0.06, note: pick(NOTE), ospiti,
        pagato: canale === 'Booking.com' || canale === 'Expedia' ? importo : Math.round(importo * (rnd() < 0.5 ? 0.3 : 0) * 100) / 100,
      })
      g += notti
    }
  })
  prenotazioni.sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.camera.localeCompare(b.camera, undefined, { numeric: true }))
  return { nome: d.nome, camere, prenotazioni }
}

// ─── Struttura attiva ────────────────────────────────────────────────────────

let ATTIVO: PmsDemo = { nome: '', camere: [], prenotazioni: [] }

/** Dati del gestionale demo della struttura attiva. */
export const pmsAttivo = () => ATTIVO

/** In casa oggi: arrivati (o in arrivo oggi con check-in fatto) e non ancora partiti. */
export const inCasa = (p: PrenDemo, oggi = oggiISO()) =>
  p.stato !== 'noshow' && p.checkIn <= oggi && oggi < p.checkOut && p.checkin !== 'da-fare'

/** Avvisa le pagine che la struttura del front office è cambiata. */
export const usePmsStore = create<{ versione: number; struttura: string }>(() => ({ versione: 0, struttura: '' }))

export function applicaStrutturaPms(d: DescrizionePms) {
  const oggi = oggiISO()
  if (ATTIVO.nome === d.nome && usePmsStore.getState().struttura === `${d.nome}|${oggi}`) return
  ATTIVO = generaPms(d)

  // Planner: piani con lo stato camera di oggi e le barre delle prenotazioni.
  const piani: Piano[] = []
  ATTIVO.camere.forEach(c => {
    let p = piani.find(x => x.id === c.piano)
    if (!p) { p = { id: c.piano, nome: PIANI[c.piano] ?? `Piano ${c.piano}`, camere: [] }; piani.push(p) }
    const sue = ATTIVO.prenotazioni.filter(x => x.camera === c.numero)
    const r = (hashNome(c.numero + oggi) % 100) / 100
    let stato: StatoCam = 'libera'
    if (sue.some(x => inCasa(x, oggi))) stato = sue.some(x => x.checkOut === addGiorni(oggi, 1) && inCasa(x, oggi)) && r < 0.3 ? 'checkout' : 'occupata'
    else if (sue.some(x => x.checkIn === oggi && x.stato !== 'noshow')) stato = 'prenotata'
    else if (sue.some(x => x.checkOut === oggi)) stato = 'pulizia'
    else if (r < 0.04) stato = 'manutenzione'
    p.camere.push({ numero: c.numero, tipo: c.tipo, stato })
  })
  const prens: Pren[] = ATTIVO.prenotazioni.map(x => ({
    id: x.id, booking: x.booking, nominativo: x.nominativo, checkIn: x.checkIn, checkOut: x.checkOut,
    stato: x.stato === 'noshow' ? 'noshow'
      : x.checkOut <= oggi ? 'checkout'
      : x.checkin === 'fatto' ? 'checkin' : x.checkin === 'parziale' ? 'checkin_p'
      : x.stato === 'opzione' ? 'opzione' : 'confermata',
    numeroCamera: x.camera,
    agenzia: x.canale,
    segmento: x.tipo === 'Gruppo' ? 'Gruppi' : 'Individuali',
    roomingList: x.tipo === 'Gruppo',
    cliente: x.ospiti[0]?.nome,
    statoCheckIn: x.checkin === 'fatto' ? 'Completato' : x.checkin === 'parziale' ? 'Parziale' : 'In attesa',
    persone: x.ospiti.length, adulti: x.adulti, bambini: x.bambini, neonati: x.infanti, animali: 0,
    camere: 1, arrangiamento: x.arrangiamento, note: x.note,
  }))
  const pendenti = (tipo: PrenPendente['tipo'], g: number, nome: string): PrenPendente => ({
    booking: String(19000 + (hashNome(d.nome + tipo) % 900)), nominativo: nome,
    checkIn: addGiorni(oggi, g), checkOut: addGiorni(oggi, g + 3), agenzia: GRUPPI[hashNome(nome) % GRUPPI.length], segmento: 'Gruppi', tipo,
  })
  impostaDatiPlanner({
    strutture: [d.nome],
    piani,
    prens,
    pendingDa: ATTIVO.camere.length ? [pendenti('assegnare', 9, 'Gruppo Fiera del Levante')] : [],
    pendingAl: ATTIVO.camere.length ? [pendenti('allocare', 16, 'Convegno Medici 2026')] : [],
  })
  usePmsStore.setState(s => ({ versione: s.versione + 1, struttura: `${d.nome}|${oggi}` }))
}

// ─── Viste per le pagine ─────────────────────────────────────────────────────

const sovrappone = (p: PrenDemo, da: string, a: string) => p.checkIn <= a && p.checkOut > da

/** Arrivi (una riga per camera) e partenze (una riga per ospite) nel periodo. */
export function arriviPartenzeDemo(da: string, a: string) {
  const oggi = oggiISO()
  const tipo = (x: PrenDemo) => (x.tipo === 'Gruppo' ? 'Gruppo' : 'Individuale')
  const inArrivo = ATTIVO.prenotazioni
    .filter(x => x.checkIn >= da && x.checkIn <= a)
    .map((x, i) => ({
      id: i + 1, prenotazioneNum: x.booking, camera: x.camera, nominativo: x.nominativo,
      ospiti: {
        adulti: x.checkin === 'fatto' ? x.adulti : x.checkin === 'parziale' ? 1 : 0,
        bambini: x.checkin === 'fatto' ? x.bambini : 0,
        infanti: x.checkin === 'fatto' ? x.infanti : 0,
      },
      ospitiTot: { adulti: x.adulti, bambini: x.bambini, infanti: x.infanti },
      arrivo: isoIt(x.checkIn), partenza: isoIt(x.checkOut),
      arrangiamento: ARRANGIAMENTO[x.arrangiamento].label, arrangiamentoIcon: ARRANGIAMENTO[x.arrangiamento].icon,
      agenzia: x.tipo === 'Gruppo' || !['Diretto', 'Sito web'].includes(x.canale) ? x.canale : 'Nessuna',
      tipoPren: tipo(x), importo: x.importo,
      azione: (x.stato === 'noshow' ? 'No Show'
        : x.checkin === 'fatto' ? 'Check-in completo'
        : x.checkin === 'parziale' ? 'Check-in parziale' : 'Check-in da fare') as 'Check-in completo' | 'Check-in parziale' | 'Check-in da fare' | 'No Show',
      vip: x.vip,
      statoPren: (x.stato === 'opzione' ? 'Opzionata' : 'Confermata') as 'Confermata' | 'Opzionata',
      dataOpzione: x.stato === 'opzione' ? isoIt(addGiorni(x.checkIn < oggi ? oggi : x.checkIn, -3)) : undefined,
    }))
  let id = 1
  const inPartenza = ATTIVO.prenotazioni
    .filter(x => x.stato !== 'noshow' && x.checkOut >= da && x.checkOut <= a)
    .flatMap(x => x.ospiti.map((o, j) => ({
      id: id++, prenotazioneNum: x.booking, camera: x.camera, ospite: o.nome, fasciaEta: o.fascia,
      arrivo: isoIt(x.checkIn), partenza: isoIt(x.checkOut),
      arrangiamento: ARRANGIAMENTO[x.arrangiamento].breve, canale: x.canale, tipoPrenotazione: tipo(x),
      residuo: j === 0 ? Math.round((x.importo - x.pagato) * 100) / 100 : 0,
    })))
  return {
    Strutture: [{ Id: 1, nome: ATTIVO.nome }],
    StrutturaId: 1,
    inArrivo,
    inPartenza,
  }
}

const ICONA_CANALE = (c: string) => (['Booking.com', 'Expedia', 'Airbnb', 'Sito web'].includes(c) ? 'globe' : c === 'Diretto' ? 'phone' : 'building')

/** Ospiti in casa nel periodo (una riga per ospite) e camere da chiudere (partenza superata). */
export function ospitiInCasaDemo(da: string, a: string) {
  const oggi = oggiISO()
  let id = 1
  const ospiti = ATTIVO.prenotazioni
    .filter(x => x.stato !== 'noshow' && x.checkin !== 'da-fare' && sovrappone(x, da, a) && x.checkIn <= oggi)
    .flatMap(x => x.ospiti.map(o => ({
      id: id++, prenotazioneNum: x.booking, camera: x.camera, ospite: o.nome, fasciaEta: o.fascia,
      arrivo: isoIt(x.checkIn), partenza: isoIt(x.checkOut),
      arrangiamento: x.arrangiamento === 'RO' ? 'Senza colazione' : 'Con colazione',
      arrangiamentoIcon: x.arrangiamento === 'RO' ? 'ban' : 'mug-saucer',
      canale: x.canale, canaleIcon: ICONA_CANALE(x.canale),
      tipoPren: x.tipo, vip: x.vip, hasNotes: !!x.note,
    })))
  // Qualche camera con la partenza di ieri ancora da chiudere.
  const ieri = addGiorni(oggi, -1)
  const ospitiScaduti = ATTIVO.prenotazioni
    .filter(x => x.checkOut === ieri && x.stato !== 'noshow')
    .slice(0, 3)
    .map((x, i) => ({
      id: i + 1, prenotazioneNum: x.booking, camera: x.camera, ospite: x.ospiti[0].nome,
      arrivo: isoIt(x.checkIn), partenza: isoIt(x.checkOut), selected: i !== 1,
    }))
  return {
    Strutture: [{ Id: 1, nome: ATTIVO.nome }],
    StrutturaId: 1,
    ospiti,
    ospitiScaduti,
  }
}

/** Camere libere oggi (per il "Cambio camera"), con tipologia e tariffa. */
export function camereLibereOggi() {
  const oggi = oggiISO()
  return ATTIVO.camere
    .filter(c => !ATTIVO.prenotazioni.some(x => x.camera === c.numero && sovrappone(x, oggi, oggi) && x.stato !== 'noshow'))
    .slice(0, 8)
}
