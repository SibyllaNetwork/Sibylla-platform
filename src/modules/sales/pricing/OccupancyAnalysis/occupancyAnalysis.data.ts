// ─── OCCUPANCY ANALYSIS — dati di lavoro ────────────────────────────────────────
//  Occupazione del mese letta su quattro tagli: nel tempo (giorno per giorno,
//  contro il budget e contro l'anno precedente), per tipologia di camera, per
//  giorno della settimana e nel calendario del mese.
//  Primitive di dominio in `sales/_data/revenueMock`.
import {
  aggiornatoAl, buildGiorniMese, camereDisponibili, GIORNI_SETTIMANA, jitter,
  mixTipologie, STAGIONALITA, STRUTTURE, type GiornoBase, type VoceTipologia,
} from '../../_data/revenueMock'

export interface GiornoOcc extends GiornoBase {
  /** Obiettivo di occupazione del giorno (budget). */
  occBudget: number
  /** Camere fuori servizio. */
  fuoriServizio: number
  /** Camere omaggio. */
  complimentary: number
}

export interface VoceGiornoSettimana {
  label: string
  /** Occupazione media del giorno della settimana (%). */
  occ: number
  /** ADR medio del giorno della settimana. */
  adr: number
}

export interface OccupancyData {
  strutture: { id: number; nome: string }[]
  strutturaId: number | null
  anno: number
  mese: number
  camereDisponibili: number
  giorni: GiornoOcc[]
  tipologie: VoceTipologia[]
  perGiornoSettimana: VoceGiornoSettimana[]
  aggiornatoAl: Date
}

export function buildOccupancy(
  anno: number,
  mese: number,
  strutturaId: number | null,
  oggi = new Date(),
): OccupancyData {
  const disponibili = camereDisponibili(strutturaId)
  const base = buildGiorniMese(anno, mese, strutturaId, oggi)
  const occBase = STAGIONALITA[mese - 1] * 100

  const giorni: GiornoOcc[] = base.map((d, i) => ({
    ...d,
    // Il budget è una curva liscia: serve a vedere lo scostamento, non il rumore
    occBudget: +(occBase + (d.weekend ? 5 : -1) + jitter(i + 11, 1.6)).toFixed(1),
    fuoriServizio: Math.max(0, Math.round(disponibili * 0.012 + jitter(i + 21, 1.2))),
    complimentary: Math.max(0, Math.round(disponibili * 0.007 + jitter(i + 33, 0.8))),
  }))

  const occMedia = giorni.reduce((s, d) => s + d.occ, 0) / Math.max(1, giorni.length)
  const camereVendute = giorni.reduce((s, d) => s + d.camere, 0)
  const ricavi = giorni.reduce((s, d) => s + d.ricavi, 0)
  const adrMedio = camereVendute ? Math.round(ricavi / camereVendute) : 0

  // Occupazione media per giorno della settimana: dice dove la settimana si sfalda
  const perGiornoSettimana: VoceGiornoSettimana[] = GIORNI_SETTIMANA.map((label, dow) => {
    const gg = giorni.filter((d) => d.dow === dow)
    const occ = gg.length ? gg.reduce((s, d) => s + d.occ, 0) / gg.length : 0
    const camere = gg.reduce((s, d) => s + d.camere, 0)
    const ric = gg.reduce((s, d) => s + d.ricavi, 0)
    return { label, occ: +occ.toFixed(1), adr: camere ? Math.round(ric / camere) : 0 }
  })

  return {
    strutture: STRUTTURE.map((s) => ({ id: s.id, nome: s.nome })),
    strutturaId,
    anno,
    mese,
    camereDisponibili: disponibili,
    giorni,
    tipologie: mixTipologie(strutturaId, occMedia, adrMedio, ricavi),
    perGiornoSettimana,
    aggiornatoAl: aggiornatoAl(oggi),
  }
}

export interface OccupancyKpi {
  occ: number
  deltaOccLy: number
  deltaOccBudget: number
  camereVendute: number
  notti: number
  fuoriServizio: number
  complimentary: number
  adr: number
  revpar: number
  sparkOcc: number[]
  sparkVendute: number[]
  sparkRevpar: number[]
  /** Giorno più pieno e giorno più vuoto del mese. */
  piuPieno: GiornoOcc | null
  piuVuoto: GiornoOcc | null
}

export function computeOccupancyKpi(d: OccupancyData): OccupancyKpi {
  const g = d.giorni
  const notti = g.length * d.camereDisponibili
  const camereVendute = g.reduce((s, x) => s + x.camere, 0)
  const ricavi = g.reduce((s, x) => s + x.ricavi, 0)
  const occ = notti ? (camereVendute / notti) * 100 : 0
  const occLy = g.length ? g.reduce((s, x) => s + x.occLY, 0) / g.length : 0
  const occBudget = g.length ? g.reduce((s, x) => s + x.occBudget, 0) / g.length : 0
  const ordinati = [...g].sort((a, b) => b.occ - a.occ)

  return {
    occ,
    // L'occupazione si confronta in punti percentuali, non in variazione %
    deltaOccLy: +(occ - occLy).toFixed(1),
    deltaOccBudget: +(occ - occBudget).toFixed(1),
    camereVendute,
    notti,
    fuoriServizio: g.reduce((s, x) => s + x.fuoriServizio, 0),
    complimentary: g.reduce((s, x) => s + x.complimentary, 0),
    adr: camereVendute ? ricavi / camereVendute : 0,
    revpar: notti ? ricavi / notti : 0,
    sparkOcc: g.map((x) => x.occ),
    sparkVendute: g.map((x) => x.camere),
    sparkRevpar: g.map((x) => (d.camereDisponibili ? x.ricavi / d.camereDisponibili : 0)),
    piuPieno: ordinati[0] ?? null,
    piuVuoto: ordinati[ordinati.length - 1] ?? null,
  }
}

/** Celle del calendario del mese, allineate alla settimana che inizia il lunedì. */
export function buildCalendario(d: OccupancyData): (GiornoOcc | null)[] {
  if (!d.giorni.length) return []
  const primo = d.giorni[0]
  const vuoti = Array.from({ length: primo.dow }, () => null)
  return [...vuoti, ...d.giorni]
}
