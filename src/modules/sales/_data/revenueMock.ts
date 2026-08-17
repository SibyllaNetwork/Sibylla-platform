// ─── DATI DI LAVORO CONDIVISI — ciclo revenue ───────────────────────────────────
//  Primitive comuni alle pagine BI di revenue (Monthly trend, Pickup, Occupancy,
//  ADR analysis): inventario per struttura, stagionalità, curva prezzo, serie
//  giornaliera e curva di prenotazione.
//
//  Tutto è DETERMINISTICO (nessun `Math.random`): gli stessi filtri danno sempre
//  gli stessi numeri, così le pagine sono confrontabili fra loro e le schermate
//  riproducibili. Sono i dati di riserva del pattern fallback-first: quando il
//  backend risponde, il DTO li sovrascrive.
//
//  Logica di dominio (revenue management alberghiero):
//    occupazione = camere vendute / camere disponibili
//    ADR         = ricavi camere / camere vendute
//    RevPAR      = ricavi camere / camere disponibili  ( = ADR × occupazione )
//  La domanda non arriva tutta insieme: più si avvicina la data di arrivo, più
//  l'on-the-book si riempie (curva di prenotazione, vedi `otbFrazione`).

export interface Struttura {
  id: number
  nome: string
  /** Camere disponibili alla vendita. */
  camere: number
  /** Tipo di struttura: cambia i segmenti che hanno senso. */
  tipo: 'hotel' | 'resort' | 'bb'
}

export const STRUTTURE: Struttura[] = [
  { id: 1, nome: 'Hotel Archimede', camere: 42, tipo: 'hotel' },
  { id: 2, nome: 'Grand Hotel Roma', camere: 96, tipo: 'hotel' },
  { id: 3, nome: 'B&B Ortigia', camere: 8, tipo: 'bb' },
  { id: 4, nome: 'Resort Capo Bianco', camere: 64, tipo: 'resort' },
]

/** Camere disponibili per la selezione (null = tutte le strutture). */
export function camereDisponibili(strutturaId: number | null): number {
  if (strutturaId === null) return STRUTTURE.reduce((s, x) => s + x.camere, 0)
  return STRUTTURE.find((s) => s.id === strutturaId)?.camere ?? 40
}

/** Occupazione media attesa per mese (alta stagione piena, gennaio scarico). */
export const STAGIONALITA = [0.38, 0.42, 0.53, 0.66, 0.74, 0.82, 0.86, 0.88, 0.79, 0.62, 0.46, 0.55]

/** ADR base per mese (€): il prezzo segue la domanda. */
export const ADR_BASE = [92, 95, 104, 118, 132, 158, 182, 196, 164, 126, 102, 116]

/** Scostamento deterministico: stesso seme → sempre lo stesso valore. */
export function jitter(seed: number, ampiezza: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return (x - Math.floor(x) - 0.5) * 2 * ampiezza
}

export function giorniDelMese(anno: number, mese: number): number {
  return new Date(anno, mese, 0).getDate()
}

export const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

export const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

// ─── Serie giornaliera ──────────────────────────────────────────────────────────

export interface GiornoBase {
  /** Data del giorno. */
  data: Date
  /** Giorno del mese. */
  g: number
  /** Etichetta d'asse (gg/mm). */
  label: string
  /** 0 = lunedì … 6 = domenica. */
  dow: number
  weekend: boolean
  /** Camere vendute a consuntivo (o previste, se il giorno è futuro). */
  camere: number
  /** Occupazione % sulle camere disponibili. */
  occ: number
  /** Ricavo medio per camera venduta. */
  adr: number
  /** Ricavi camere del giorno. */
  ricavi: number
  /** Ricavi camere dello stesso giorno dell'anno precedente. */
  ricaviLY: number
  /** ADR dello stesso giorno dell'anno precedente. */
  adrLY: number
  /** Occupazione % dell'anno precedente. */
  occLY: number
  /** true se il giorno è oltre la data odierna (previsione, non consuntivo). */
  futuro: boolean
  /** Giorni che mancano all'arrivo (0 per i giorni passati). */
  lead: number
}

/** Serie giornaliera di un intervallo di date (estremi inclusi). */
export function buildGiorni(
  dal: Date,
  al: Date,
  strutturaId: number | null,
  oggi = new Date(),
): GiornoBase[] {
  const camere = camereDisponibili(strutturaId)
  const out: GiornoBase[] = []
  const cur = new Date(dal.getFullYear(), dal.getMonth(), dal.getDate())
  const fine = new Date(al.getFullYear(), al.getMonth(), al.getDate())
  const oggi0 = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())

  while (cur <= fine) {
    const anno = cur.getFullYear()
    const mese = cur.getMonth() + 1
    const g = cur.getDate()
    const jsDow = cur.getDay()
    const dow = (jsDow + 6) % 7            // 0 = lunedì
    const weekend = jsDow === 5 || jsDow === 6
    const seed = anno * 1000 + mese * 40 + g + (strutturaId ?? 0) * 7

    const occBase = STAGIONALITA[mese - 1]
    const adrBase = ADR_BASE[mese - 1]

    const occ = Math.max(0.28, Math.min(1, occBase + (weekend ? 0.07 : -0.015) + jitter(seed, 0.06)))
    const vendute = Math.round(camere * occ)
    // Il prezzo sale nei weekend e quando l'occupazione supera la media di stagione
    const adr = Math.round(adrBase * (1 + (weekend ? 0.1 : 0) + (occ - occBase) * 0.55 + jitter(seed + 7, 0.035)))

    const occLY = Math.max(0.24, Math.min(1, occ - 0.035 + jitter(seed + 31, 0.05)))
    const adrLY = Math.round(adr * (0.93 + jitter(seed + 51, 0.03)))

    const lead = Math.max(0, Math.round((cur.getTime() - oggi0.getTime()) / 86_400_000))

    out.push({
      data: new Date(cur),
      g,
      label: `${String(g).padStart(2, '0')}/${String(mese).padStart(2, '0')}`,
      dow,
      weekend,
      camere: vendute,
      occ: +(occ * 100).toFixed(1),
      adr,
      ricavi: vendute * adr,
      ricaviLY: Math.round(camere * occLY * adrLY),
      adrLY,
      occLY: +(occLY * 100).toFixed(1),
      futuro: cur > oggi0,
      lead,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/** Serie giornaliera di un mese intero. */
export function buildGiorniMese(
  anno: number,
  mese: number,
  strutturaId: number | null,
  oggi = new Date(),
): GiornoBase[] {
  return buildGiorni(
    new Date(anno, mese - 1, 1),
    new Date(anno, mese - 1, giorniDelMese(anno, mese)),
    strutturaId,
    oggi,
  )
}

// ─── Curva di prenotazione (on the book) ────────────────────────────────────────

/**
 * Quota della domanda finale già a libro a `lead` giorni dall'arrivo.
 * A ridosso della data quasi tutto è entrato (1.0); a due mesi ne è entrata circa
 * metà. Serve a ricostruire l'on-the-book e, per differenza, il pickup.
 */
export function otbFrazione(lead: number): number {
  if (lead <= 0) return 1
  return Math.max(0.3, 1 - 0.62 * (1 - Math.exp(-lead / 34)))
}

export interface OtbGiorno extends GiornoBase {
  /** Camere a libro oggi. */
  otbCamere: number
  /** Ricavo a libro oggi. */
  otbRicavo: number
  /** Occupazione a libro oggi (%). */
  otbOcc: number
  /** Camere acquisite nella finestra di osservazione. */
  pickupCamere: number
  /** Ricavo acquisito nella finestra di osservazione. */
  pickupRicavo: number
  /** Camere a libro l'anno precedente alla stessa distanza dall'arrivo. */
  otbCamereLY: number
  /** Ricavo a libro l'anno precedente alla stessa distanza dall'arrivo. */
  otbRicavoLY: number
}

/**
 * On the book e pickup per data di soggiorno.
 * `finestra` = giorni di osservazione del pickup (1, 7, 14, 30…): il pickup è la
 * differenza fra l'on-the-book di oggi e quello di `finestra` giorni fa.
 */
export function buildOtb(
  giorni: GiornoBase[],
  finestra: number,
  strutturaId: number | null,
): OtbGiorno[] {
  const disponibili = camereDisponibili(strutturaId)
  return giorni.map((d) => {
    const fOggi = otbFrazione(d.lead)
    const fPrima = otbFrazione(d.lead + finestra)
    const otbCamere = Math.round(d.camere * fOggi)
    const otbRicavo = Math.round(d.ricavi * fOggi)
    // L'anno precedente la curva era leggermente più lenta
    const fLY = otbFrazione(d.lead) * 0.96
    return {
      ...d,
      otbCamere,
      otbRicavo,
      otbOcc: +((otbCamere / disponibili) * 100).toFixed(1),
      pickupCamere: Math.max(0, otbCamere - Math.round(d.camere * fPrima)),
      pickupRicavo: Math.max(0, otbRicavo - Math.round(d.ricavi * fPrima)),
      otbCamereLY: Math.round((d.ricaviLY / Math.max(1, d.adrLY)) * fLY),
      otbRicavoLY: Math.round(d.ricaviLY * fLY),
    }
  })
}

// ─── Dimensioni di analisi ──────────────────────────────────────────────────────

export interface VoceDimensione {
  label: string
  /** Valore della dimensione (ricavo, camere…). */
  valore: number
  /** Quota sul totale (%). */
  quota: number
  /** Commissione media riconosciuta, dove pertinente. */
  commissione?: number
  /** ADR della voce, dove pertinente. */
  adr?: number
}

/** Canali di vendita: quota di ricavo e commissione media riconosciuta. */
const CANALI: [string, number, number | undefined][] = [
  ['Vendita diretta', 0.34, undefined],
  ['OTA', 0.29, 17.5],
  ['Tour operator', 0.16, 21],
  ['Corporate', 0.13, 8],
  ['Gruppi', 0.08, 12],
]

/** Segmenti di mercato. */
const SEGMENTI: [string, number][] = [
  ['Leisure', 0.46], ['Business', 0.21], ['Gruppi', 0.14], ['MICE', 0.11], ['Long stay', 0.08],
]

/** Intermediari: quota di ricavo e commissione. */
const AGENZIE: [string, number, number][] = [
  ['Booking.com', 0.145, 17],
  ['Expedia', 0.072, 19],
  ['Hotelbeds', 0.055, 22],
  ['ADP srl', 0.038, 14],
  ['Airbnb', 0.026, 15],
]

/**
 * Tipologie di camera: quota di inventario e scostamento di prezzo rispetto
 * all'ADR medio (una suite non si vende al prezzo di una standard).
 */
const TIPOLOGIE: [string, number, number][] = [
  ['Doppia standard', 0.42, 0.86],
  ['Doppia superior', 0.24, 1.05],
  ['Junior suite', 0.14, 1.32],
  ['Suite', 0.06, 1.78],
  ['Singola', 0.09, 0.7],
  ['Familiare', 0.05, 1.24],
]

function voci(
  righe: [string, number, (number | undefined)?][],
  totale: number,
  adrMedio?: number,
  adrMolt?: Record<string, number>,
): VoceDimensione[] {
  return righe.map(([label, perc, commissione]) => ({
    label,
    valore: Math.round(totale * perc),
    quota: +(perc * 100).toFixed(1),
    commissione,
    adr: adrMedio ? Math.round(adrMedio * (adrMolt?.[label] ?? 1)) : undefined,
  }))
}

export const mixCanali = (totale: number, adrMedio?: number): VoceDimensione[] =>
  voci(CANALI, totale, adrMedio, {
    // Il diretto non paga commissione: a pari prezzo di vendita rende di più
    'Vendita diretta': 1.04, OTA: 0.98, 'Tour operator': 0.88, Corporate: 0.95, Gruppi: 0.82,
  })

export const mixSegmenti = (totale: number, adrMedio?: number): VoceDimensione[] =>
  voci(SEGMENTI, totale, adrMedio, {
    Leisure: 1.02, Business: 1.12, Gruppi: 0.84, MICE: 1.08, 'Long stay': 0.78,
  })

export const mixAgenzie = (totale: number): VoceDimensione[] => voci(AGENZIE, totale)

/** Tipologie di camera con camere disponibili, occupazione e ADR. */
export interface VoceTipologia extends VoceDimensione {
  /** Camere della tipologia. */
  inventario: number
  /** Occupazione % della tipologia. */
  occ: number
}

export function mixTipologie(
  strutturaId: number | null,
  occMedia: number,
  adrMedio: number,
  totaleRicavi: number,
): VoceTipologia[] {
  const tot = camereDisponibili(strutturaId)
  return TIPOLOGIE.map(([label, quotaInv, moltPrezzo], i) => {
    const inventario = Math.max(1, Math.round(tot * quotaInv))
    // Le tipologie economiche si riempiono prima, le suite restano più libere
    const occ = Math.max(20, Math.min(100, occMedia * (1 + (1 - moltPrezzo) * 0.22) + jitter(i + 3, 2.5)))
    const adr = Math.round(adrMedio * moltPrezzo)
    const valore = Math.round(totaleRicavi * quotaInv * moltPrezzo)
    return {
      label,
      inventario,
      occ: +occ.toFixed(1),
      adr,
      valore,
      quota: +(quotaInv * 100).toFixed(1),
    }
  })
}

/** Momento convenzionale dell'ultimo carico dati BI (09:19 di oggi). */
export function aggiornatoAl(oggi = new Date()): Date {
  return new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate(), 9, 19)
}
