// ─── MONTHLY TREND — dati di lavoro ─────────────────────────────────────────────
//  Modello e derivazioni della pagina. Le primitive di dominio (inventario,
//  stagionalità, curva prezzo, serie giornaliera, mix per canale/segmento/agenzia)
//  stanno nel modulo condiviso `sales/_data/revenueMock`: qui c'è solo ciò che è
//  specifico del mese — separazione consuntivo/previsione, forecast garantito e
//  opzionato, indicatori di sintesi.
import {
  MESI as MESI_BASE, STRUTTURE, aggiornatoAl, buildGiorniMese, camereDisponibili,
  giorniDelMese, mixAgenzie, mixCanali, mixSegmenti, STAGIONALITA,
  type VoceDimensione,
} from '../../_data/revenueMock'

export const MESI = MESI_BASE
export { STRUTTURE }
export type VoceRanking = VoceDimensione

export interface GiornoTrend {
  /** Giorno del mese. */
  g: number
  /** Etichetta d'asse (gg/mm). */
  label: string
  /** Camere vendute. */
  camere: number
  /** Occupazione % sulle camere disponibili. */
  occ: number
  /** Ricavo medio per camera venduta. */
  adr: number
  /** Ricavi camere del giorno, anno corrente (null nei giorni futuri). */
  ricaviTY: number | null
  /** Previsione dei giorni futuri (null nei giorni consuntivati). */
  ricaviFc: number | null
  /** Ricavi camere dello stesso giorno dell'anno precedente. */
  ricaviLY: number
  /** true se il giorno è previsione e non consuntivo. */
  futuro: boolean
}

export interface IndicatoreQualita {
  key: string
  label: string
  valore: string
  /** Variazione rispetto allo stesso mese dell'anno precedente. */
  delta: number
  /** true quando salire è un peggioramento (cancellazioni, no show). */
  invert?: boolean
}

export interface MonthlyTrendData {
  strutture: { id: number; nome: string }[]
  strutturaId: number | null
  anno: number
  /** 1-12 */
  mese: number
  /** Camere disponibili alla vendita (inventario della selezione). */
  camereDisponibili: number
  /** Ultimo giorno consuntivato: oltre, è previsione. */
  ultimoGiornoConsuntivo: number
  giorni: GiornoTrend[]
  /** Previsione a fine mese, solo prenotazioni confermate. */
  forecastGarantito: number
  /** Previsione a fine mese comprensiva delle opzioni. */
  forecastOpzionato: number
  /** Budget del mese, per il confronto della previsione. */
  budgetMese: number
  canali: VoceRanking[]
  segmenti: VoceRanking[]
  agenzie: VoceRanking[]
  qualita: IndicatoreQualita[]
  /** Momento dell'ultimo carico dati BI. */
  aggiornatoAl: Date
}

export { giorniDelMese }

/**
 * Costruisce i dati del mese selezionato.
 * `oggi` separa consuntivo e previsione: i giorni oltre la data odierna sono
 * previsione; nei mesi passati il mese è tutto consuntivato, in quelli futuri è
 * tutto previsione.
 */
export function buildMonthlyTrend(
  anno: number,
  mese: number,
  strutturaId: number | null,
  oggi = new Date(),
): MonthlyTrendData {
  const disponibili = camereDisponibili(strutturaId)
  const base = buildGiorniMese(anno, mese, strutturaId, oggi)
  const nGiorni = base.length

  const meseCorrente = oggi.getFullYear() === anno && oggi.getMonth() + 1 === mese
  const mesePassato = anno < oggi.getFullYear() || (anno === oggi.getFullYear() && mese - 1 < oggi.getMonth())
  const ultimoGiornoConsuntivo = meseCorrente ? oggi.getDate() : mesePassato ? nGiorni : 0

  const giorni: GiornoTrend[] = base.map((d) => {
    const futuro = d.g > ultimoGiornoConsuntivo
    return {
      g: d.g,
      label: d.label,
      camere: d.camere,
      occ: d.occ,
      adr: d.adr,
      ricaviTY: futuro ? null : d.ricavi,
      // Il giorno di taglio compare in entrambe le serie: consuntivo e previsione
      // risultano attaccati e nel grafico non si apre un buco.
      ricaviFc: d.g >= ultimoGiornoConsuntivo ? d.ricavi : null,
      ricaviLY: d.ricaviLY,
      futuro,
    }
  })

  const consuntivo = giorni.filter((d) => !d.futuro).reduce((s, d) => s + (d.ricaviTY ?? 0), 0)
  const previsione = giorni.filter((d) => d.futuro).reduce((s, d) => s + (d.ricaviFc ?? 0), 0)
  // Del portafoglio futuro una parte è confermata, il resto è ancora in opzione.
  const forecastGarantito = Math.round(consuntivo + previsione * 0.78)
  const forecastOpzionato = Math.round(consuntivo + previsione)
  const budgetMese = Math.round((consuntivo + previsione) * 0.94)

  const totale = consuntivo + previsione
  const adrMedio = Math.round(totale / Math.max(1, base.reduce((s, d) => s + d.camere, 0)))
  const occBase = STAGIONALITA[mese - 1]

  const qualita: IndicatoreQualita[] = [
    { key: 'ALOS', label: 'Permanenza media', valore: `${(2.6 + occBase).toFixed(1)} notti`, delta: 4.2 },
    { key: 'leadTime', label: 'Lead time', valore: `${Math.round(18 + occBase * 22)} gg`, delta: 6.1 },
    { key: 'cancellazioni', label: 'Cancellazioni', valore: `${(9.4 - occBase * 2).toFixed(1)}%`, delta: -1.8, invert: true },
    { key: 'noShow', label: 'No show', valore: `${(1.6 - occBase * 0.5).toFixed(1)}%`, delta: 0.3, invert: true },
    { key: 'complimentary', label: 'Complimentary', valore: `${(0.9 - occBase * 0.2).toFixed(1)}%`, delta: -0.2, invert: true },
  ]

  return {
    strutture: STRUTTURE.map((s) => ({ id: s.id, nome: s.nome })),
    strutturaId,
    anno,
    mese,
    camereDisponibili: disponibili,
    ultimoGiornoConsuntivo,
    giorni,
    forecastGarantito,
    forecastOpzionato,
    budgetMese,
    canali: mixCanali(totale, adrMedio),
    segmenti: mixSegmenti(totale, adrMedio),
    agenzie: mixAgenzie(totale),
    qualita,
    aggiornatoAl: aggiornatoAl(oggi),
  }
}

// ─── Indicatori di sintesi del mese ─────────────────────────────────────────────

export interface MonthlyKpi {
  ricaviTY: number
  ricaviLY: number
  deltaRicavi: number
  adr: number
  deltaAdr: number
  occ: number
  deltaOcc: number
  revpar: number
  deltaRevpar: number
  forecastGarantito: number
  deltaBudget: number
  /** Serie giornaliere per le sparkline delle KPI. */
  sparkRicavi: number[]
  sparkAdr: number[]
  sparkOcc: number[]
  sparkRevpar: number[]
}

/** Indicatori del mese sui soli giorni consuntivati, per un confronto omogeneo. */
export function computeKpi(d: MonthlyTrendData): MonthlyKpi {
  const cons = d.giorni.filter((g) => !g.futuro)
  const base = cons.length ? cons : d.giorni
  const nights = base.length * d.camereDisponibili

  const ricaviTY = base.reduce((s, g) => s + (g.ricaviTY ?? g.ricaviFc ?? 0), 0)
  const ricaviLY = base.reduce((s, g) => s + g.ricaviLY, 0)
  const camere = base.reduce((s, g) => s + g.camere, 0)

  const adr = camere ? ricaviTY / camere : 0
  const occ = nights ? (camere / nights) * 100 : 0
  const revpar = nights ? ricaviTY / nights : 0

  // Anno precedente: stesse notti disponibili, ADR ricavato dai ricavi LY
  const camereLY = Math.round(camere * 0.965)
  const adrLY = camereLY ? ricaviLY / camereLY : 0
  const occLY = nights ? (camereLY / nights) * 100 : 0
  const revparLY = nights ? ricaviLY / nights : 0

  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)

  return {
    ricaviTY,
    ricaviLY,
    deltaRicavi: pct(ricaviTY, ricaviLY),
    adr,
    deltaAdr: pct(adr, adrLY),
    occ,
    // L'occupazione si confronta in punti percentuali, non in variazione %
    deltaOcc: +(occ - occLY).toFixed(1),
    revpar,
    deltaRevpar: pct(revpar, revparLY),
    forecastGarantito: d.forecastGarantito,
    deltaBudget: pct(d.forecastGarantito, d.budgetMese),
    sparkRicavi: base.map((g) => g.ricaviTY ?? 0),
    sparkAdr: base.map((g) => g.adr),
    sparkOcc: base.map((g) => g.occ),
    sparkRevpar: base.map((g) => (d.camereDisponibili ? (g.ricaviTY ?? 0) / d.camereDisponibili : 0)),
  }
}
