// ─── MONTHLY TREND — dati di lavoro ─────────────────────────────────────────────
//  Modello e generatore dei dati della pagina. Come nel resto della piattaforma
//  la pagina è "fallback-first": qui vivono numeri mock DETERMINISTICI (nessun
//  Math.random: gli stessi filtri danno sempre gli stessi numeri) che la pagina
//  mostra finché il backend non risponde.
//
//  La logica è quella del revenue management alberghiero:
//    camere vendute → occupazione = vendute / disponibili
//    ADR    = ricavi camere / camere vendute
//    RevPAR = ricavi camere / camere disponibili  ( = ADR × occupazione )
//  I giorni successivi a oggi non sono consuntivo ma previsione, e si separano in
//  garantito (confermato) e opzionato (opzioni non ancora confermate).

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

export interface VoceRanking {
  label: string
  valore: number
  /** Quota sul totale (%). */
  quota: number
  /** Commissione media riconosciuta (solo per intermediari). */
  commissione?: number
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

export const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

export const STRUTTURE = [
  { id: 1, nome: 'Hotel Archimede' },
  { id: 2, nome: 'Grand Hotel Roma' },
  { id: 3, nome: 'B&B Ortigia' },
  { id: 4, nome: 'Resort Capo Bianco' },
]

/** Inventario camere per struttura (l'insieme = somma delle singole). */
const INVENTARIO: Record<number, number> = { 1: 42, 2: 96, 3: 8, 4: 64 }

/** Occupazione media attesa per mese: alta stagione piena, gennaio scarico. */
const STAGIONALITA = [0.38, 0.42, 0.53, 0.66, 0.74, 0.82, 0.86, 0.88, 0.79, 0.62, 0.46, 0.55]

/** ADR base per mese (€): sale nei mesi di alta stagione. */
const ADR_BASE = [92, 95, 104, 118, 132, 158, 182, 196, 164, 126, 102, 116]

/** Pseudo-casualità deterministica: stesso giorno → sempre lo stesso scostamento. */
function jitter(seed: number, ampiezza: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return (x - Math.floor(x) - 0.5) * 2 * ampiezza
}

export function giorniDelMese(anno: number, mese: number): number {
  return new Date(anno, mese, 0).getDate()
}

/**
 * Costruisce la serie giornaliera del mese selezionato.
 * `oggi` serve a separare consuntivo e previsione: i giorni oltre la data odierna
 * sono previsione (e nei mesi passati il mese è tutto consuntivato).
 */
export function buildMonthlyTrend(
  anno: number,
  mese: number,
  strutturaId: number | null,
  oggi = new Date(),
): MonthlyTrendData {
  const camereDisponibili = strutturaId
    ? INVENTARIO[strutturaId] ?? 40
    : Object.values(INVENTARIO).reduce((s, n) => s + n, 0)

  const nGiorni = giorniDelMese(anno, mese)
  const meseCorrente = oggi.getFullYear() === anno && oggi.getMonth() + 1 === mese
  const mesePassato = anno < oggi.getFullYear() || (anno === oggi.getFullYear() && mese - 1 < oggi.getMonth())
  const ultimoGiornoConsuntivo = meseCorrente ? oggi.getDate() : mesePassato ? nGiorni : 0

  const occBase = STAGIONALITA[mese - 1]
  const adrBase = ADR_BASE[mese - 1]

  const giorni: GiornoTrend[] = Array.from({ length: nGiorni }, (_, i) => {
    const g = i + 1
    const dow = new Date(anno, mese - 1, g).getDay()
    const weekend = dow === 5 || dow === 6
    const seed = anno * 1000 + mese * 40 + g

    // Occupazione: base stagionale + spinta del weekend + scostamento del giorno
    const occ = Math.max(0.28, Math.min(1, occBase + (weekend ? 0.07 : -0.015) + jitter(seed, 0.06)))
    const camere = Math.round(camereDisponibili * occ)
    // ADR: più alto nei weekend e nei giorni pieni (curva prezzo/occupazione)
    const adr = Math.round(adrBase * (1 + (weekend ? 0.1 : 0) + (occ - occBase) * 0.55 + jitter(seed + 7, 0.035)))
    const ricavi = camere * adr

    // Anno precedente: stessa stagionalità, volumi e prezzi più bassi
    const occLY = Math.max(0.24, Math.min(1, occ - 0.035 + jitter(seed + 31, 0.05)))
    const ricaviLY = Math.round(camereDisponibili * occLY * adr * (0.93 + jitter(seed + 51, 0.03)))

    const futuro = g > ultimoGiornoConsuntivo
    return {
      g,
      label: `${String(g).padStart(2, '0')}/${String(mese).padStart(2, '0')}`,
      camere,
      occ: +(occ * 100).toFixed(1),
      adr,
      // Il giorno di taglio compare in entrambe le serie: così consuntivo e
      // previsione risultano attaccati e non c'è un buco nel grafico.
      ricaviTY: futuro ? null : ricavi,
      ricaviFc: g >= ultimoGiornoConsuntivo ? ricavi : null,
      ricaviLY,
      futuro,
    }
  })

  const consuntivo = giorni.filter((d) => !d.futuro).reduce((s, d) => s + (d.ricaviTY ?? 0), 0)
  const previsione = giorni.filter((d) => d.futuro).reduce((s, d) => s + (d.ricaviFc ?? 0), 0)
  // Del portafoglio futuro una parte è confermata, il resto è in opzione.
  const forecastGarantito = Math.round(consuntivo + previsione * 0.78)
  const forecastOpzionato = Math.round(consuntivo + previsione)
  const budgetMese = Math.round((consuntivo + previsione) * 0.94)

  const totale = consuntivo + previsione
  const quote = (perc: number) => Math.round(totale * perc)

  // Mix dei canali di vendita: identità (ogni canale ha il suo colore).
  const canaliRaw: [string, number, number | undefined][] = [
    ['Vendita diretta', 0.34, undefined],
    ['OTA', 0.29, 17.5],
    ['Tour operator', 0.16, 21],
    ['Corporate', 0.13, 8],
    ['Gruppi', 0.08, 12],
  ]
  const canali: VoceRanking[] = canaliRaw.map(([label, perc, commissione]) => ({
    label, valore: quote(perc), quota: +(perc * 100).toFixed(1), commissione,
  }))

  const segmentiRaw: [string, number][] = [
    ['Leisure', 0.46], ['Business', 0.21], ['Gruppi', 0.14], ['MICE', 0.11], ['Long stay', 0.08],
  ]
  const segmenti: VoceRanking[] = segmentiRaw.map(([label, perc]) => ({
    label, valore: quote(perc), quota: +(perc * 100).toFixed(1),
  }))

  const agenzieRaw: [string, number, number][] = [
    ['Booking.com', 0.145, 17],
    ['Expedia', 0.072, 19],
    ['Hotelbeds', 0.055, 22],
    ['ADP srl', 0.038, 14],
    ['Airbnb', 0.026, 15],
  ]
  const agenzie: VoceRanking[] = agenzieRaw.map(([label, perc, commissione]) => ({
    label, valore: quote(perc), quota: +(perc * 100).toFixed(1), commissione,
  }))

  const qualita: IndicatoreQualita[] = [
    { key: 'ALOS', label: 'Permanenza media', valore: `${(2.6 + occBase).toFixed(1)} notti`, delta: 4.2 },
    { key: 'leadTime', label: 'Lead time', valore: `${Math.round(18 + occBase * 22)} gg`, delta: 6.1 },
    { key: 'cancellazioni', label: 'Cancellazioni', valore: `${(9.4 - occBase * 2).toFixed(1)}%`, delta: -1.8, invert: true },
    { key: 'noShow', label: 'No show', valore: `${(1.6 - occBase * 0.5).toFixed(1)}%`, delta: 0.3, invert: true },
    { key: 'complimentary', label: 'Complimentary', valore: `${(0.9 - occBase * 0.2).toFixed(1)}%`, delta: -0.2, invert: true },
  ]

  return {
    strutture: STRUTTURE,
    strutturaId,
    anno,
    mese,
    camereDisponibili,
    ultimoGiornoConsuntivo,
    giorni,
    forecastGarantito,
    forecastOpzionato,
    budgetMese,
    canali,
    segmenti,
    agenzie,
    qualita,
    aggiornatoAl: new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 9, 19),
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
  /** Serie giornaliera dei ricavi consuntivati, per le sparkline. */
  sparkRicavi: number[]
  sparkAdr: number[]
  sparkOcc: number[]
  sparkRevpar: number[]
}

/** Calcola gli indicatori del mese sui soli giorni consuntivati (confronto omogeneo). */
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
