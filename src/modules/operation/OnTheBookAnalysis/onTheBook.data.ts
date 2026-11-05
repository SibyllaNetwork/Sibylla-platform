// ─── ON THE BOOK ANALYSIS — dati di lavoro ──────────────────────────────────────
//  L'on the book (OTB) è quanto è GIÀ a libro oggi per le date di soggiorno future:
//  camere e ricavo confermati, confrontati con l'anno precedente alla stessa
//  distanza dall'arrivo (pace) e con la domanda che ci si aspetta a consuntivo.
//  Qui si legge la solidità del libro (garantito contro opzionato), da quali
//  segmenti e canali arriva e quanto ne è entrato nell'ultima settimana.
//
//  Primitive di dominio in `sales/_data/revenueMock` (curva di prenotazione
//  compresa): stessi numeri di Pickup analysis e Monthly trend.
import {
  aggiornatoAl, buildGiorni, buildOtb, camereDisponibili, jitter, mixCanali, mixSegmenti,
  MESI, STRUTTURE, type OtbGiorno, type VoceDimensione,
} from '../../sales/_data/revenueMock'

/** Orizzonti di analisi (giorni di soggiorno futuri). */
export const ORIZZONTI = [30, 60, 90, 180]

/** Finestra del pickup mostrato nella card dedicata. */
export const FINESTRA_PICKUP = 7

export interface OtbGiornoAnalisi extends OtbGiorno {
  /** Ricavo a libro con prenotazione garantita (carta o caparra). */
  garantito: number
  /** Ricavo a libro ancora in opzione: può cadere. */
  opzionato: number
  /** Ricavo che ci si aspetta a consuntivo per la data (domanda finale prevista). */
  previsto: number
}

export interface OtbPeriodo {
  /** Etichetta d'asse ("nov", "sett. 12/11"). */
  label: string
  /** Etichetta estesa per tooltip e tabella. */
  esteso: string
  garantito: number
  opzionato: number
  otbRicavo: number
  otbRicavoLY: number
  otbCamere: number
  previsto: number
  pickupCamere: number
  pickupRicavo: number
}

export interface OtbData {
  strutture: { id: number; nome: string }[]
  strutturaId: number | null
  orizzonte: number
  camereDisponibili: number
  giorni: OtbGiornoAnalisi[]
  mesi: OtbPeriodo[]
  settimane: OtbPeriodo[]
  segmenti: VoceDimensione[]
  canali: VoceDimensione[]
  aggiornatoAl: Date
}

/**
 * Quota del libro ancora in opzione: più l'arrivo è lontano, più prenotazioni sono
 * opzioni di gruppi e tour operator non ancora confermate.
 */
function quotaOpzionata(lead: number, seed: number) {
  return Math.min(0.38, Math.max(0.04, 0.05 + lead * 0.0024 + jitter(seed, 0.03)))
}

const MESI_BREVI = MESI.map((m) => m.slice(0, 3).toLowerCase())

function aggrega(giorni: OtbGiornoAnalisi[], chiave: (d: OtbGiornoAnalisi) => string, etichette: (d: OtbGiornoAnalisi) => [string, string]): OtbPeriodo[] {
  const out = new Map<string, OtbPeriodo>()
  giorni.forEach((d) => {
    const k = chiave(d)
    let p = out.get(k)
    if (!p) {
      const [label, esteso] = etichette(d)
      p = { label, esteso, garantito: 0, opzionato: 0, otbRicavo: 0, otbRicavoLY: 0, otbCamere: 0, previsto: 0, pickupCamere: 0, pickupRicavo: 0 }
      out.set(k, p)
    }
    p.garantito += d.garantito
    p.opzionato += d.opzionato
    p.otbRicavo += d.otbRicavo
    p.otbRicavoLY += d.otbRicavoLY
    p.otbCamere += d.otbCamere
    p.previsto += d.previsto
    p.pickupCamere += d.pickupCamere
    p.pickupRicavo += d.pickupRicavo
  })
  return Array.from(out.values())
}

const gm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

export function buildOnTheBook(strutturaId: number | null, orizzonte: number, oggi = new Date()): OtbData {
  const dal = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 1)
  const al = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + orizzonte)
  const giorni: OtbGiornoAnalisi[] = buildOtb(buildGiorni(dal, al, strutturaId, oggi), FINESTRA_PICKUP, strutturaId)
    .map((d) => {
      const q = quotaOpzionata(d.lead, d.data.getTime() / 86_400_000 + (strutturaId ?? 0))
      const opzionato = Math.round(d.otbRicavo * q)
      return { ...d, garantito: d.otbRicavo - opzionato, opzionato, previsto: d.ricavi }
    })

  const mesi = aggrega(giorni,
    (d) => `${d.data.getFullYear()}-${d.data.getMonth()}`,
    (d) => [MESI_BREVI[d.data.getMonth()], `${MESI[d.data.getMonth()]} ${d.data.getFullYear()}`])
  // Settimane di soggiorno che partono da domani (blocchi di 7 giorni).
  const settimane = aggrega(giorni,
    (d) => String(Math.floor((d.lead - 1) / 7)),
    (d) => {
      const inizio = new Date(d.data)
      const fine = new Date(d.data); fine.setDate(fine.getDate() + 6)
      return [gm(inizio), `Settimana dal ${gm(inizio)} al ${gm(fine)}`]
    })

  const otbRicavo = giorni.reduce((s, d) => s + d.otbRicavo, 0)
  const otbCamere = giorni.reduce((s, d) => s + d.otbCamere, 0)
  const adrOtb = otbCamere ? otbRicavo / otbCamere : 0

  return {
    strutture: STRUTTURE.map((s) => ({ id: s.id, nome: s.nome })),
    strutturaId,
    orizzonte,
    camereDisponibili: camereDisponibili(strutturaId),
    giorni,
    mesi,
    settimane,
    segmenti: mixSegmenti(otbRicavo, adrOtb).sort((a, b) => b.valore - a.valore),
    canali: mixCanali(otbRicavo, adrOtb).sort((a, b) => b.valore - a.valore),
    aggiornatoAl: aggiornatoAl(oggi),
  }
}

export interface OtbKpi {
  otbRicavo: number
  otbRicavoLY: number
  /** Scostamento del ricavo a libro dall'anno precedente alla stessa distanza (pace). */
  pace: number
  otbCamere: number
  otbCamereLY: number
  deltaCamere: number
  adr: number
  adrLY: number
  deltaAdr: number
  /** Occupazione a libro sull'orizzonte (%). */
  occ: number
  /** Quota garantita del libro (%). */
  quotaGarantita: number
  garantito: number
  opzionato: number
  /** Ricavo atteso a consuntivo e quota già a libro. */
  previsto: number
  copertura: number
  pickupCamere: number
  pickupRicavo: number
  sparkOtb: number[]
  sparkCamere: number[]
  sparkAdr: number[]
  sparkOcc: number[]
  sparkGarantito: number[]
}

export function computeOtbKpi(d: OtbData): OtbKpi {
  const g = d.giorni
  const somma = (f: (x: OtbGiornoAnalisi) => number) => g.reduce((s, x) => s + f(x), 0)
  const otbRicavo = somma((x) => x.otbRicavo)
  const otbRicavoLY = somma((x) => x.otbRicavoLY)
  const otbCamere = somma((x) => x.otbCamere)
  const otbCamereLY = somma((x) => x.otbCamereLY)
  const garantito = somma((x) => x.garantito)
  const opzionato = somma((x) => x.opzionato)
  const previsto = somma((x) => x.previsto)
  const adr = otbCamere ? otbRicavo / otbCamere : 0
  const adrLY = otbCamereLY ? otbRicavoLY / otbCamereLY : 0
  const notti = g.length * d.camereDisponibili
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)
  // Le sparkline seguono le settimane: con 180 giorni una per giorno sarebbe rumore.
  const s = d.settimane
  return {
    otbRicavo, otbRicavoLY, pace: pct(otbRicavo, otbRicavoLY),
    otbCamere, otbCamereLY, deltaCamere: pct(otbCamere, otbCamereLY),
    adr, adrLY, deltaAdr: pct(adr, adrLY),
    occ: notti ? (otbCamere / notti) * 100 : 0,
    quotaGarantita: otbRicavo ? (garantito / otbRicavo) * 100 : 0,
    garantito, opzionato,
    previsto, copertura: previsto ? (otbRicavo / previsto) * 100 : 0,
    pickupCamere: somma((x) => x.pickupCamere),
    pickupRicavo: somma((x) => x.pickupRicavo),
    sparkOtb: s.map((x) => x.otbRicavo),
    sparkCamere: s.map((x) => x.otbCamere),
    sparkAdr: s.map((x) => (x.otbCamere ? x.otbRicavo / x.otbCamere : 0)),
    sparkOcc: s.map((x) => x.otbCamere),
    sparkGarantito: s.map((x) => (x.otbRicavo ? (x.garantito / x.otbRicavo) * 100 : 0)),
  }
}
