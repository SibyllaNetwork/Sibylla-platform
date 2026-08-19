// ─── SALES OVERVIEW — dati di lavoro ────────────────────────────────────────────
//  La fotografia commerciale dell'anno: ricavi camere mese per mese contro anno
//  precedente e contro budget, indicatori di prezzo e occupazione, mix di vendita e
//  qualità della domanda.
//
//  Le primitive stanno nel modulo condiviso `sales/_data/revenueMock` (inventario,
//  stagionalità, curva prezzo, serie giornaliera, mix per canale/segmento/agenzia):
//  qui ci sono solo le aggregazioni mensili della pagina. È lo stesso modello di
//  Monthly trend e ADR analysis, quindi la panoramica non contraddice i dettagli.
import {
  MESI, STRUTTURE, aggiornatoAl, budgetDa, buildGiorniMese, camereDisponibili,
  giorniDelMese, jitter, mixAgenzie, mixCanali, mixSegmenti, STAGIONALITA,
  type VoceDimensione,
} from '../_data/revenueMock'

export type VoceMix = VoceDimensione

/** Dimensioni del mix di vendita mostrate nella card unica. */
export type Dimensione = 'canali' | 'segmenti' | 'agenzie'

export const DIMENSIONI: { key: Dimensione; label: string; titolo: string }[] = [
  { key: 'canali', label: 'Canali', titolo: 'Mix per canale di vendita' },
  { key: 'segmenti', label: 'Segmenti', titolo: 'Mix per segmento di mercato' },
  { key: 'agenzie', label: 'Agenzie', titolo: 'Prime agenzie per ricavo' },
]

export interface MeseSales {
  /** 1-12 */
  mese: number
  label: string
  /** Mese chiuso: oltre, i valori sono previsione. */
  consuntivo: boolean
  camere: number
  camereDisponibili: number
  occ: number
  adr: number
  /** Ricavi camere del mese (consuntivo o previsione). */
  ricavi: number
  /** Ricavi camere dello stesso mese dell'anno precedente. */
  ricaviLY: number
  /** Budget del mese: consuntivo LY più l'obiettivo di crescita. */
  budget: number
  /** Ricavi per camera disponibile. */
  revpar: number
}

export interface IndicatoreDomanda {
  key: string
  label: string
  /** Valore grezzo: la formattazione italiana la fa la pagina col kit. */
  valore: number
  unita: 'notti' | 'gg' | 'pct'
  /** Variazione rispetto all'anno precedente. */
  delta: number
  /** true quando salire è un peggioramento (cancellazioni, no show). */
  invert?: boolean
}

export interface SalesData {
  strutture: { id: number; nome: string }[]
  strutturaId: number | null
  anno: number
  /** Camere disponibili alla vendita in un giorno. */
  camereDisponibili: number
  /** Ultimo mese consuntivato (0 = anno tutto da fare, 12 = anno chiuso). */
  ultimoMeseConsuntivo: number
  mesi: MeseSales[]
  canali: VoceMix[]
  segmenti: VoceMix[]
  agenzie: VoceMix[]
  domanda: IndicatoreDomanda[]
  aggiornatoAl: Date
}

/** L'anno commerciale: dodici mesi con consuntivo, previsione, LY e budget. */
export function buildSales(
  anno: number,
  strutturaId: number | null,
  oggi = new Date(),
): SalesData {
  const disponibiliGiorno = camereDisponibili(strutturaId)
  const ultimoMeseConsuntivo = anno < oggi.getFullYear() ? 12
    : anno > oggi.getFullYear() ? 0
      : oggi.getMonth() + 1

  const mesi: MeseSales[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const giorni = buildGiorniMese(anno, m, strutturaId, oggi)
    const camereDisp = disponibiliGiorno * giorniDelMese(anno, m)
    const camere = giorni.reduce((s, d) => s + d.camere, 0)
    const ricavi = giorni.reduce((s, d) => s + d.ricavi, 0)
    const ricaviLY = giorni.reduce((s, d) => s + d.ricaviLY, 0)
    return {
      mese: m,
      label: MESI[i].slice(0, 3),
      consuntivo: m <= ultimoMeseConsuntivo,
      camere,
      camereDisponibili: camereDisp,
      occ: camereDisp ? (camere / camereDisp) * 100 : 0,
      adr: camere ? ricavi / camere : 0,
      ricavi,
      ricaviLY,
      budget: budgetDa(ricaviLY),
      revpar: camereDisp ? ricavi / camereDisp : 0,
    }
  })

  const ricaviAnno = mesi.reduce((s, m) => s + m.ricavi, 0)
  const camereAnno = mesi.reduce((s, m) => s + m.camere, 0)
  const adrMedio = camereAnno ? Math.round(ricaviAnno / camereAnno) : 0
  // Qualità della domanda: si muove con la stagione media della selezione, così le
  // strutture di montagna e di mare non hanno gli stessi numeri.
  const stagione = STAGIONALITA.reduce((s, x) => s + x, 0) / STAGIONALITA.length

  const domanda: IndicatoreDomanda[] = [
    { key: 'ALOS', label: 'Permanenza media', valore: 2.4 + stagione, unita: 'notti', delta: 3.6 },
    { key: 'leadTime', label: 'Lead time', valore: Math.round(22 + stagione * 26), unita: 'gg', delta: 5.4 },
    { key: 'cancellazioni', label: 'Cancellazioni', valore: 9.8 - stagione * 2, unita: 'pct', delta: -1.4, invert: true },
    { key: 'noShow', label: 'No show', valore: 1.7 - stagione * 0.5, unita: 'pct', delta: 0.2, invert: true },
    { key: 'complimentary', label: 'Complimentary', valore: 1.1 - stagione * 0.2, unita: 'pct', delta: -0.3, invert: true },
  ]

  return {
    strutture: STRUTTURE.map((s) => ({ id: s.id, nome: s.nome })),
    strutturaId,
    anno,
    camereDisponibili: disponibiliGiorno,
    ultimoMeseConsuntivo,
    mesi,
    canali: mixCanali(ricaviAnno, adrMedio),
    segmenti: mixSegmenti(ricaviAnno, adrMedio),
    agenzie: mixAgenzie(ricaviAnno),
    domanda,
    aggiornatoAl: aggiornatoAl(oggi),
  }
}

export interface SalesKpi {
  ricavi: number
  ricaviLY: number
  deltaRicavi: number
  occ: number
  /** L'occupazione si confronta in punti percentuali, non in variazione %. */
  deltaOcc: number
  adr: number
  deltaAdr: number
  revpar: number
  deltaRevpar: number
  camere: number
  /** Chiusura attesa dell'anno e budget dei dodici mesi. */
  atterraggio: number
  /** Ricavi dei dodici mesi dell'anno precedente. */
  atterraggioLY: number
  budgetAnno: number
  deltaBudget: number
  sparkRicavi: number[]
  sparkOcc: number[]
  sparkAdr: number[]
  sparkRevpar: number[]
}

/**
 * Indicatori del periodo consuntivato: il confronto con l'anno precedente si fa fra
 * mesi chiusi, altrimenti si mette una previsione contro un consuntivo. L'atterraggio
 * guarda invece tutti i dodici mesi, e lo dice.
 */
export function computeSalesKpi(d: SalesData): SalesKpi {
  const chiusi = d.mesi.filter((m) => m.consuntivo)
  const base = chiusi.length ? chiusi : d.mesi
  const somma = (f: (m: MeseSales) => number, su = base) => su.reduce((s, m) => s + f(m), 0)
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)

  const ricavi = somma((m) => m.ricavi)
  const ricaviLY = somma((m) => m.ricaviLY)
  const camere = somma((m) => m.camere)
  const camereDisp = somma((m) => m.camereDisponibili)

  const occ = camereDisp ? (camere / camereDisp) * 100 : 0
  const adr = camere ? ricavi / camere : 0
  const revpar = camereDisp ? ricavi / camereDisp : 0
  // Anno precedente: stesse camere disponibili, volumi leggermente più bassi
  const camereLY = Math.round(camere * 0.965)
  const occLY = camereDisp ? (camereLY / camereDisp) * 100 : 0
  const adrLY = camereLY ? ricaviLY / camereLY : 0
  const revparLY = camereDisp ? ricaviLY / camereDisp : 0

  const atterraggio = somma((m) => m.ricavi, d.mesi)
  const atterraggioLY = somma((m) => m.ricaviLY, d.mesi)
  const budgetAnno = somma((m) => m.budget, d.mesi)

  return {
    ricavi,
    ricaviLY,
    deltaRicavi: pct(ricavi, ricaviLY),
    occ,
    deltaOcc: +(occ - occLY).toFixed(1),
    adr,
    deltaAdr: pct(adr, adrLY),
    revpar,
    deltaRevpar: pct(revpar, revparLY),
    camere,
    atterraggio,
    atterraggioLY,
    budgetAnno,
    deltaBudget: pct(atterraggio, budgetAnno),
    sparkRicavi: base.map((m) => m.ricavi),
    sparkOcc: base.map((m) => m.occ),
    sparkAdr: base.map((m) => m.adr),
    sparkRevpar: base.map((m) => m.revpar),
  }
}

export interface VoceConfronto {
  label: string
  ricavi: number
  /** Ricavi della stessa voce nell'anno precedente. */
  ricaviLY: number
  /** Scostamento in €: quanto la voce ha aggiunto o perso rispetto a LY. */
  delta: number
  /** Variazione della quota di mix, in punti percentuali. */
  deltaQuota: number
}

/**
 * Il mix contro l'anno precedente: non basta sapere quanto pesa un canale oggi, serve
 * sapere se sta crescendo più o meno del totale. Le quote dell'anno precedente sono
 * diverse da quelle correnti — il mix si muove — e si ricavano deterministicamente
 * dalla voce, così il confronto ha lo stesso valore a ogni ricarico.
 */
export function mixControLy(voci: VoceMix[], ricaviLY: number): VoceConfronto[] {
  const totale = voci.reduce((s, v) => s + v.valore, 0)
  // Quote LY: la quota corrente spostata di qualche punto in su o in giù per voce
  const quoteLY = voci.map((v, i) => Math.max(0.01, (totale ? v.valore / totale : 0) * (1 + jitter(i * 17 + v.label.length, 0.16))))
  const sommaQuote = quoteLY.reduce((s, q) => s + q, 0) || 1

  return voci.map((v, i) => {
    const quota = totale ? (v.valore / totale) * 100 : 0
    const quotaLY = (quoteLY[i] / sommaQuote) * 100
    const ricaviVoceLY = Math.round(ricaviLY * (quotaLY / 100))
    return {
      label: v.label,
      ricavi: v.valore,
      ricaviLY: ricaviVoceLY,
      delta: v.valore - ricaviVoceLY,
      deltaQuota: +(quota - quotaLY).toFixed(1),
    }
  })
}
