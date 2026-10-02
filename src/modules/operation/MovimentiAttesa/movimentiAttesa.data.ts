import { inCasa, type PrenDemo } from '../_data/pmsDemo'
import { pmsDi } from '../_data/pmsDi'

// ─── MOVIMENTI IN ATTESA (dati demo) ─────────────────────────────────────────
//  La coda del front office fra gli outlet e la fatturazione. Ogni movimento è
//  in uno di tre stati:
//   - da abbinare:  addebito arrivato da un outlet/POS che non trova un conto
//                   valido (camera errata, ospite già partito, nessun nominativo);
//   - da approvare: addebito manuale, sconto, storno o penale che supera la
//                   soglia dell'operatore e attende il responsabile;
//   - da fatturare: conto chiuso al check-out (o city ledger dell'agenzia) per
//                   cui il documento fiscale non è ancora stato emesso.
//  Generati dal gestionale demo della struttura, con orari relativi a ora.

export type StatoAttesa = 'abbinare' | 'approvare' | 'fatturare'

export type Origine =
  | 'ristorante' | 'bar' | 'room-service' | 'minibar' | 'spa'
  | 'lavanderia' | 'parcheggio' | 'transfer' | 'front-office' | 'agenzia'

export const ORIGINI: Record<Origine, { label: string; icon: string }> = {
  'ristorante':   { label: 'Ristorante',    icon: 'utensils' },
  'bar':          { label: 'Bar',           icon: 'martini-glass' },
  'room-service': { label: 'Room service',  icon: 'bell-concierge' },
  'minibar':      { label: 'Minibar',       icon: 'bottle-water' },
  'spa':          { label: 'Spa',           icon: 'spa' },
  'lavanderia':   { label: 'Lavanderia',    icon: 'shirt' },
  'parcheggio':   { label: 'Parcheggio',    icon: 'square-parking' },
  'transfer':     { label: 'Transfer',      icon: 'van-shuttle' },
  'front-office': { label: 'Front office',  icon: 'bell' },
  'agenzia':      { label: 'City ledger',   icon: 'building' },
}

export const MOTIVI: Record<StatoAttesa, string[]> = {
  abbinare: ['Camera non trovata', 'Ospite già partito', 'Conto camera chiuso', 'Nominativo non corrispondente'],
  approvare: ['Oltre soglia operatore', 'Sconto manuale', 'Storno addebito', 'Penale cancellazione', 'Addebito manuale'],
  fatturare: ['Check-out effettuato', 'Saldo da agenzia', 'Richiesta fattura azienda', 'Acconto da regolarizzare'],
}

export interface MovimentoAttesa {
  id: string
  stato: StatoAttesa
  /** Momento in cui il movimento è entrato in coda. */
  quando: Date
  origine: Origine
  descrizione: string
  /** Camera di riferimento (anche errata, per i "da abbinare"). */
  camera: string
  /** Prenotazione collegata, se trovata. */
  booking?: string
  intestatario: string
  operatore: string
  motivo: string
  imponibile: number
  aliquota: number
  importo: number
  /** Solo per i "da fatturare": tipo documento proposto. */
  documento?: 'Fattura' | 'Ricevuta fiscale' | 'Fattura agenzia'
}

const OPERATORI = ['M. Ferri (Ristorante)', 'G. Sala (Bar)', 'L. Vitale (Reception)', 'A. Riva (Night audit)', 'S. Neri (Spa)', 'POS cassa 2']

const VOCI: Array<[Origine, string, number, number]> = [
  ['ristorante', 'Cena — conto tavolo', 48, 10],
  ['ristorante', 'Pranzo — conto tavolo', 34, 10],
  ['bar', 'Consumazioni bar', 16, 22],
  ['bar', 'Aperitivo in terrazza', 24, 22],
  ['room-service', 'Room service — colazione in camera', 28, 10],
  ['minibar', 'Minibar — reintegro', 14, 22],
  ['spa', 'Percorso benessere', 45, 22],
  ['spa', 'Massaggio decontratturante 50′', 70, 22],
  ['lavanderia', 'Lavanderia — capi stirati', 22, 22],
  ['parcheggio', 'Parcheggio custodito', 20, 22],
  ['transfer', 'Transfer aeroporto', 55, 10],
]

const hash = (t: string) => {
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
const isoDi = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const r2 = (v: number) => Math.round(v * 100) / 100

export function movimentiAttesaDemo(struttura: string): MovimentoAttesa[] {
  const ora = new Date()
  const oggi = isoDi(ora)
  const ieri = isoDi(new Date(ora.getTime() - 86400000))
  const rnd = rngDi(hash(struttura) + Number(oggi.replace(/-/g, '')))
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
  const { camere, prenotazioni } = pmsDi(struttura)
  if (!camere.length) return []

  const presenti = prenotazioni.filter((p) => inCasa(p, oggi))
  const partiti = prenotazioni.filter((p) => p.stato !== 'noshow' && (p.checkOut === oggi || p.checkOut === ieri))
  // Indietro nel tempo di qualche minuto/ora, mai prima di due giorni fa.
  const fa = (maxOre: number) => new Date(ora.getTime() - Math.floor(rnd() * maxOre * 60) * 60000 - 4 * 60000)
  const voce = () => {
    const [origine, descrizione, base, aliquota] = pick(VOCI)
    const importo = r2(base * (0.7 + rnd() * 1.6) * (origine === 'ristorante' ? 1 + Math.floor(rnd() * 3) : 1))
    return { origine, descrizione, aliquota, importo, imponibile: r2(importo / (1 + aliquota / 100)) }
  }
  const out: MovimentoAttesa[] = []
  let n = 0
  const id = () => `ma-${hash(struttura) % 1000}-${++n}`

  // Da abbinare: dagli outlet con riferimenti che non tornano.
  const quantiAbb = Math.min(9, 3 + Math.floor(camere.length / 12))
  for (let i = 0; i < quantiAbb; i++) {
    const v = voce()
    const motivo = pick(MOTIVI.abbinare)
    const p: PrenDemo | undefined = motivo === 'Ospite già partito' || motivo === 'Conto camera chiuso' ? pick(partiti.length ? partiti : prenotazioni) : undefined
    const cam = p?.camera ?? (motivo === 'Camera non trovata' ? `${pick(camere).numero}${pick(['0', '9', 'B'])}` : pick(camere).numero)
    out.push({
      id: id(), stato: 'abbinare', quando: fa(30), ...v, motivo,
      camera: cam, booking: p?.booking, intestatario: p?.nominativo ?? (motivo === 'Nominativo non corrispondente' ? `Sig. ${pick(['Ferraro', 'Bassi', 'Kowalski', 'Lindqvist', 'Pellegrini'])}` : '—'),
      operatore: v.origine === 'bar' ? OPERATORI[1] : v.origine === 'spa' ? OPERATORI[4] : pick([OPERATORI[0], OPERATORI[5]]),
    })
  }

  // Da approvare: manuali, sconti, storni e penali sui conti aperti.
  const quantiApp = Math.min(7, 2 + Math.floor(presenti.length / 10))
  for (let i = 0; i < quantiApp && presenti.length; i++) {
    const p = pick(presenti)
    const motivo = pick(MOTIVI.approvare)
    const v = voce()
    const segno = motivo === 'Sconto manuale' || motivo === 'Storno addebito' ? -1 : 1
    const descrizione = motivo === 'Sconto manuale' ? `Sconto fedeltà ${pick([10, 15, 20])}% sul soggiorno`
      : motivo === 'Storno addebito' ? `Storno: ${v.descrizione.toLowerCase()}`
      : motivo === 'Penale cancellazione' ? 'Penale cancellazione camera aggiuntiva'
      : motivo === 'Addebito manuale' ? pick(['Late check-out ore 16:00', 'Culla e kit bimbo', 'Danno accappatoio', 'Upgrade camera superior'])
      : v.descrizione
    const importo = r2(segno * (motivo === 'Sconto manuale' ? p.importo * 0.12 : motivo === 'Penale cancellazione' ? p.importo / Math.max(1, 3) : motivo === 'Oltre soglia operatore' ? v.importo * 4 : v.importo))
    out.push({
      id: id(), stato: 'approvare', quando: fa(20), origine: motivo === 'Oltre soglia operatore' ? v.origine : 'front-office',
      descrizione, motivo, camera: p.camera, booking: p.booking, intestatario: p.nominativo,
      operatore: pick([OPERATORI[2], OPERATORI[3], OPERATORI[0]]),
      aliquota: motivo === 'Penale cancellazione' ? 0 : v.aliquota, importo, imponibile: r2(importo / (1 + (motivo === 'Penale cancellazione' ? 0 : v.aliquota) / 100)),
    })
  }

  // Da fatturare: conti chiusi al check-out senza documento, saldi agenzia.
  partiti.slice(0, 10).forEach((p) => {
    const agenzia = p.tipo === 'Gruppo' || ['Booking.com', 'Expedia', 'GAR S.R.L'].includes(p.canale)
    const motivo = agenzia ? 'Saldo da agenzia' : rnd() < 0.3 ? 'Richiesta fattura azienda' : 'Check-out effettuato'
    const dopo = p.checkOut === oggi ? new Date(ora.getTime() - Math.floor(rnd() * Math.min(300, ora.getHours() * 60)) * 60000) : fa(40)
    out.push({
      id: id(), stato: 'fatturare', quando: dopo, origine: agenzia ? 'agenzia' : 'front-office',
      descrizione: `${p.tipo === 'Gruppo' ? 'Soggiorno gruppo' : 'Soggiorno'} ${p.checkIn.split('-').reverse().join('/')} → ${p.checkOut.split('-').reverse().join('/')}`,
      motivo, camera: p.camera, booking: p.booking, intestatario: agenzia ? p.canale : p.nominativo,
      operatore: pick([OPERATORI[2], OPERATORI[3]]),
      aliquota: 10, importo: p.importo, imponibile: r2(p.importo / 1.1),
      documento: agenzia ? 'Fattura agenzia' : motivo === 'Richiesta fattura azienda' ? 'Fattura' : 'Ricevuta fiscale',
    })
  })

  return out.sort((a, b) => b.quando.getTime() - a.quando.getTime())
}

/** Camere con un conto aperto oggi (destinazioni per "Abbina"). */
export function contiAbbinabili(struttura: string) {
  const oggi = isoDi(new Date())
  return pmsDi(struttura).prenotazioni
    .filter((p) => inCasa(p, oggi))
    .map((p) => ({ camera: p.camera, booking: p.booking, intestatario: p.nominativo }))
    .sort((a, b) => a.camera.localeCompare(b.camera, undefined, { numeric: true }))
}
