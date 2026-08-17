// ─── ADR ANALYSIS — dati di lavoro ──────────────────────────────────────────────
//  L'ADR (ricavo medio per camera venduta) letto su quattro tagli: nel tempo
//  contro anno precedente e budget, per canale (dove il prezzo di vendita è
//  eroso dalle commissioni), per tipologia di camera e in relazione con
//  l'occupazione (elasticità: quanto prezzo regge la domanda).
//  Primitive di dominio in `sales/_data/revenueMock`.
import {
  aggiornatoAl, buildGiorniMese, camereDisponibili, jitter, mixCanali, mixTipologie,
  ADR_BASE, STRUTTURE, type GiornoBase, type VoceDimensione, type VoceTipologia,
} from '../../_data/revenueMock'

export interface GiornoAdr extends GiornoBase {
  /** ADR di budget del giorno. */
  adrBudget: number
  /** Sconto medio applicato sul prezzo di listino (%). */
  sconto: number
}

export interface VoceCanaleAdr extends VoceDimensione {
  /** ADR lordo del canale. */
  adrLordo: number
  /** ADR al netto della commissione riconosciuta all'intermediario. */
  adrNetto: number
}

export interface AdrData {
  strutture: { id: number; nome: string }[]
  strutturaId: number | null
  anno: number
  mese: number
  camereDisponibili: number
  giorni: GiornoAdr[]
  canali: VoceCanaleAdr[]
  tipologie: VoceTipologia[]
  aggiornatoAl: Date
}

export function buildAdr(
  anno: number,
  mese: number,
  strutturaId: number | null,
  oggi = new Date(),
): AdrData {
  const base = buildGiorniMese(anno, mese, strutturaId, oggi)
  const adrBase = ADR_BASE[mese - 1]

  const giorni: GiornoAdr[] = base.map((d, i) => ({
    ...d,
    // Budget: curva liscia sul prezzo di stagione, senza il rumore del giorno
    adrBudget: Math.round(adrBase * (1 + (d.weekend ? 0.08 : 0)) * (1 + jitter(i + 5, 0.02))),
    // Sconto medio concesso rispetto al listino: sale quando la domanda è debole
    sconto: +Math.max(0, 14 - (d.occ - 70) * 0.35 + jitter(i + 17, 1.4)).toFixed(1),
  }))

  const camere = giorni.reduce((s, d) => s + d.camere, 0)
  const ricavi = giorni.reduce((s, d) => s + d.ricavi, 0)
  const adrMedio = camere ? Math.round(ricavi / camere) : 0
  const occMedia = giorni.length ? giorni.reduce((s, d) => s + d.occ, 0) / giorni.length : 0

  // Per canale: dall'ADR lordo si sottrae la commissione riconosciuta, ed è
  // quello il prezzo che entra davvero in cassa.
  const canali: VoceCanaleAdr[] = mixCanali(ricavi, adrMedio).map((c) => {
    const adrLordo = c.adr ?? adrMedio
    return {
      ...c,
      adrLordo,
      adrNetto: Math.round(adrLordo * (1 - (c.commissione ?? 0) / 100)),
    }
  })

  return {
    strutture: STRUTTURE.map((s) => ({ id: s.id, nome: s.nome })),
    strutturaId,
    anno,
    mese,
    camereDisponibili: camereDisponibili(strutturaId),
    giorni,
    canali,
    tipologie: mixTipologie(strutturaId, occMedia, adrMedio, ricavi),
    aggiornatoAl: aggiornatoAl(oggi),
  }
}

export interface AdrKpi {
  adr: number
  adrLy: number
  deltaLy: number
  adrBudget: number
  deltaBudget: number
  sconto: number
  revpar: number
  occ: number
  /** ADR medio riconosciuto in cassa, al netto delle commissioni. */
  adrNetto: number
  sparkAdr: number[]
  sparkSconto: number[]
  sparkRevpar: number[]
  /** Punti giornalieri per la relazione prezzo/occupazione. */
  nuvola: { occ: number; adr: number; label: string }[]
}

export function computeAdrKpi(d: AdrData): AdrKpi {
  const g = d.giorni
  const camere = g.reduce((s, x) => s + x.camere, 0)
  const ricavi = g.reduce((s, x) => s + x.ricavi, 0)
  const notti = g.length * d.camereDisponibili

  const adr = camere ? ricavi / camere : 0
  const adrLy = g.length ? g.reduce((s, x) => s + x.adrLY, 0) / g.length : 0
  const adrBudget = g.length ? g.reduce((s, x) => s + x.adrBudget, 0) / g.length : 0
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)

  // ADR netto medio: media degli ADR di canale pesata sulla quota di ricavo
  const pesoTot = d.canali.reduce((s, c) => s + c.quota, 0) || 1
  const adrNetto = d.canali.reduce((s, c) => s + c.adrNetto * c.quota, 0) / pesoTot

  return {
    adr,
    adrLy,
    deltaLy: pct(adr, adrLy),
    adrBudget,
    deltaBudget: pct(adr, adrBudget),
    sconto: g.length ? g.reduce((s, x) => s + x.sconto, 0) / g.length : 0,
    revpar: notti ? ricavi / notti : 0,
    occ: notti ? (camere / notti) * 100 : 0,
    adrNetto,
    sparkAdr: g.map((x) => x.adr),
    sparkSconto: g.map((x) => x.sconto),
    sparkRevpar: g.map((x) => (d.camereDisponibili ? x.ricavi / d.camereDisponibili : 0)),
    nuvola: g.map((x) => ({ occ: x.occ, adr: x.adr, label: x.label })),
  }
}
