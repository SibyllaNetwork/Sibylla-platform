// ─── PICKUP ANALYSIS — dati di lavoro ───────────────────────────────────────────
//  Il pickup è la domanda ENTRATA in un intervallo di osservazione: la differenza
//  fra l'on-the-book di oggi e quello di N giorni fa, letta per data di soggiorno.
//  Serve a capire se il ritmo di riempimento sta tenendo (pace) e su quali date
//  intervenire con prezzo o disponibilità.
//
//  Primitive di dominio in `sales/_data/revenueMock` (curva di prenotazione
//  compresa): qui ci sono solo le derivazioni della pagina.
import {
  aggiornatoAl, buildGiorni, buildOtb, camereDisponibili, mixCanali, mixSegmenti,
  STRUTTURE, type OtbGiorno, type VoceDimensione,
} from '../../_data/revenueMock'

/** Finestre di osservazione del pickup offerte dalla pagina. */
export const FINESTRE = [1, 7, 14, 30]

/** Orizzonti di analisi (giorni di soggiorno futuri). */
export const ORIZZONTI = [30, 60, 90]

export interface PickupData {
  strutture: { id: number; nome: string }[]
  strutturaId: number | null
  /** Giorni di osservazione del pickup. */
  finestra: number
  /** Giorni di soggiorno futuri considerati. */
  orizzonte: number
  camereDisponibili: number
  giorni: OtbGiorno[]
  /** Pickup per canale di vendita nella finestra. */
  canali: VoceDimensione[]
  /** Pickup per segmento di mercato nella finestra. */
  segmenti: VoceDimensione[]
  aggiornatoAl: Date
}

export function buildPickup(
  strutturaId: number | null,
  finestra: number,
  orizzonte: number,
  oggi = new Date(),
): PickupData {
  const dal = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 1)
  const al = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + orizzonte)
  const giorni = buildOtb(buildGiorni(dal, al, strutturaId, oggi), finestra, strutturaId)
  const pickupRicavo = giorni.reduce((s, d) => s + d.pickupRicavo, 0)

  return {
    strutture: STRUTTURE.map((s) => ({ id: s.id, nome: s.nome })),
    strutturaId,
    finestra,
    orizzonte,
    camereDisponibili: camereDisponibili(strutturaId),
    giorni,
    canali: mixCanali(pickupRicavo),
    segmenti: mixSegmenti(pickupRicavo),
    aggiornatoAl: aggiornatoAl(oggi),
  }
}

export interface PickupKpi {
  /** Camere acquisite nella finestra. */
  pickupCamere: number
  /** Ricavo acquisito nella finestra. */
  pickupRicavo: number
  /** ADR delle camere acquisite: dice a che prezzo sta entrando la domanda. */
  adrPickup: number
  /** Ricavo già a libro sull'orizzonte. */
  otbRicavo: number
  /** Occupazione media a libro sull'orizzonte. */
  otbOcc: number
  /** Scostamento dell'on-the-book rispetto all'anno precedente (pace). */
  paceVsLy: number
  /** Media giornaliera del pickup, per la sparkline. */
  sparkPickup: number[]
  sparkOtb: number[]
  sparkAdr: number[]
  sparkOcc: number[]
  /** Giorni con il pickup più alto e più basso: dove guardare per primo. */
  migliori: OtbGiorno[]
  critici: OtbGiorno[]
}

export function computePickupKpi(d: PickupData): PickupKpi {
  const g = d.giorni
  const pickupCamere = g.reduce((s, x) => s + x.pickupCamere, 0)
  const pickupRicavo = g.reduce((s, x) => s + x.pickupRicavo, 0)
  const otbRicavo = g.reduce((s, x) => s + x.otbRicavo, 0)
  const otbRicavoLY = g.reduce((s, x) => s + x.otbRicavoLY, 0)
  const otbCamere = g.reduce((s, x) => s + x.otbCamere, 0)
  const notti = g.length * d.camereDisponibili

  const perPickup = [...g].sort((a, b) => b.pickupCamere - a.pickupCamere)
  // Giorni critici: poca domanda entrata E occupazione a libro ancora bassa
  const perCriticita = [...g].sort((a, b) => (a.pickupCamere - b.pickupCamere) || (a.otbOcc - b.otbOcc))

  return {
    pickupCamere,
    pickupRicavo,
    adrPickup: pickupCamere ? pickupRicavo / pickupCamere : 0,
    otbRicavo,
    otbOcc: notti ? (otbCamere / notti) * 100 : 0,
    paceVsLy: otbRicavoLY ? ((otbRicavo - otbRicavoLY) / otbRicavoLY) * 100 : 0,
    sparkPickup: g.map((x) => x.pickupRicavo),
    sparkOtb: g.map((x) => x.otbRicavo),
    sparkAdr: g.map((x) => (x.pickupCamere ? x.pickupRicavo / x.pickupCamere : 0)),
    sparkOcc: g.map((x) => x.otbOcc),
    migliori: perPickup.slice(0, 5),
    critici: perCriticita.slice(0, 5),
  }
}
