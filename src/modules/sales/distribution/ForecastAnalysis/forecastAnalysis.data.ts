// ─── FORECAST ANALYSIS — dati di lavoro ─────────────────────────────────────────
//  Che cosa si chiuderà, con quanta certezza. La previsione si costruisce sulla curva
//  di prenotazione condivisa (`sales/_data/revenueMock`): dato quanto è già a libro a
//  N giorni dall'arrivo, la curva dice quale quota della domanda finale rappresenta —
//  e per differenza quanto deve ancora entrare.
//
//  Le tre parti del forecast, tenute separate perché hanno certezze diverse:
//    • GARANTITO — prenotazioni confermate a libro: soldi in cassa salvo cancellazioni;
//    • OPZIONATO — quote e opzioni a libro non ancora confermate: da lavorare;
//    • DA ACQUISIRE — la domanda che la curva dice ancora in arrivo: è previsione, non
//      portafoglio, e va letta come tale.
//  Il budget del periodo è il riferimento: garantito + opzionato + da acquisire meno
//  budget dice se il periodo chiude sopra o sotto obiettivo.
//
//  Tutto deterministico: stessi filtri → stessi numeri.
import {
  aggiornatoAl, budgetDa, buildGiorni, buildOtb, camereDisponibili, mixAgenzie, mixCanali,
  mixSegmenti, otbFrazione, STRUTTURE, type VoceDimensione,
} from '../../_data/revenueMock'

/** Orizzonti di previsione offerti dalla pagina (giorni di soggiorno futuri). */
export const ORIZZONTI = [30, 60, 90]

/** Quota delle prenotazioni a libro già confermata: il resto è opzione da lavorare. */
const QUOTA_CONFERMATA = 0.92

/** Dimensioni del ranking: chi porta il portafoglio futuro. */
export type Dimensione = 'segmenti' | 'canali' | 'agenzie'

export const DIMENSIONI: { key: Dimensione; label: string; titolo: string }[] = [
  { key: 'segmenti', label: 'Segmenti', titolo: 'Forecast per segmento di mercato' },
  { key: 'canali', label: 'Canali', titolo: 'Forecast per canale di vendita' },
  { key: 'agenzie', label: 'Agenzie', titolo: 'Prime agenzie sul portafoglio futuro' },
]

export interface GiornoForecast {
  data: Date
  /** Etichetta d'asse (gg/mm). */
  label: string
  weekend: boolean
  /** Giorni che mancano all'arrivo. */
  lead: number
  /** Ricavo confermato a libro. */
  garantito: number
  /** Opzioni a libro non ancora confermate. */
  opzionato: number
  /** Domanda che la curva di prenotazione dice ancora in arrivo. */
  daAcquisire: number
  /** Chiusura attesa del giorno: garantito + opzionato + da acquisire. */
  atteso: number
  /** Ricavo a libro l'anno precedente alla stessa distanza dall'arrivo. */
  ly: number
  /** Obiettivo di budget del giorno. */
  budget: number
  /** Camere attese e occupazione attesa a fine corsa. */
  camereAttese: number
  occAttesa: number
}

export interface SettimanaForecast {
  /** Etichetta della settimana (dal gg/mm). */
  label: string
  garantito: number
  opzionato: number
  daAcquisire: number
  atteso: number
  budget: number
  /** Scostamento della chiusura attesa sul budget della settimana. */
  gap: number
  /** Quota del budget già coperta dal portafoglio confermato. */
  coperturaGarantito: number
}

export interface ForecastData {
  strutture: { id: number; nome: string }[]
  strutturaId: number | null
  /** Giorni di soggiorno futuri considerati. */
  orizzonte: number
  camereDisponibili: number
  giorni: GiornoForecast[]
  settimane: SettimanaForecast[]
  segmenti: VoceDimensione[]
  canali: VoceDimensione[]
  agenzie: VoceDimensione[]
  aggiornatoAl: Date
}

/** La previsione sull'orizzonte scelto, giorno per giorno e settimana per settimana. */
export function buildForecast(
  strutturaId: number | null,
  orizzonte: number,
  oggi = new Date(),
): ForecastData {
  const disponibili = camereDisponibili(strutturaId)
  const dal = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + 1)
  const al = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + orizzonte)
  const otb = buildOtb(buildGiorni(dal, al, strutturaId, oggi), 7, strutturaId)

  const giorni: GiornoForecast[] = otb.map((d) => {
    // La curva dice quale quota della domanda finale è già a libro: il resto deve
    // ancora entrare, e si stima riportando l'on-the-book al totale della curva.
    const frazione = otbFrazione(d.lead)
    const atteso = frazione ? Math.round(d.otbRicavo / frazione) : d.otbRicavo
    const garantito = Math.round(d.otbRicavo * QUOTA_CONFERMATA)
    const opzionato = d.otbRicavo - garantito
    const camereAttese = frazione ? Math.round(d.otbCamere / frazione) : d.otbCamere

    return {
      data: d.data,
      label: d.label,
      weekend: d.weekend,
      lead: d.lead,
      garantito,
      opzionato,
      daAcquisire: Math.max(0, atteso - d.otbRicavo),
      atteso,
      ly: d.ricaviLY,
      budget: budgetDa(d.ricaviLY),
      camereAttese,
      occAttesa: disponibili ? +((camereAttese / disponibili) * 100).toFixed(1) : 0,
    }
  })

  // Settimane di soggiorno: è l'unità con cui si decide un'azione commerciale (una
  // promozione, un'apertura di allotment), il giorno singolo è troppo fine.
  const settimane: SettimanaForecast[] = []
  for (let i = 0; i < giorni.length; i += 7) {
    const blocco = giorni.slice(i, i + 7)
    if (!blocco.length) continue
    const somma = (f: (g: GiornoForecast) => number) => blocco.reduce((s, g) => s + f(g), 0)
    const atteso = somma((g) => g.atteso)
    const budget = somma((g) => g.budget)
    const garantito = somma((g) => g.garantito)
    settimane.push({
      label: `dal ${blocco[0].label}`,
      garantito,
      opzionato: somma((g) => g.opzionato),
      daAcquisire: somma((g) => g.daAcquisire),
      atteso,
      budget,
      gap: atteso - budget,
      coperturaGarantito: budget ? (garantito / budget) * 100 : 0,
    })
  }

  const totaleAtteso = giorni.reduce((s, g) => s + g.atteso, 0)
  const camereAttese = giorni.reduce((s, g) => s + g.camereAttese, 0)
  const adrAtteso = camereAttese ? Math.round(totaleAtteso / camereAttese) : 0

  return {
    strutture: STRUTTURE.map((s) => ({ id: s.id, nome: s.nome })),
    strutturaId,
    orizzonte,
    camereDisponibili: disponibili,
    giorni,
    settimane,
    segmenti: mixSegmenti(totaleAtteso, adrAtteso),
    canali: mixCanali(totaleAtteso, adrAtteso),
    agenzie: mixAgenzie(totaleAtteso),
    aggiornatoAl: aggiornatoAl(oggi),
  }
}

export interface ForecastKpi {
  garantito: number
  opzionato: number
  daAcquisire: number
  atteso: number
  budget: number
  ly: number
  /** Scostamento della chiusura attesa sul budget del periodo. */
  deltaBudget: number
  /** Scostamento della chiusura attesa sull'anno precedente. */
  deltaLy: number
  /** Quota del budget coperta dalle sole prenotazioni confermate. */
  coperturaGarantito: number
  /** Occupazione attesa a fine corsa sull'orizzonte. */
  occAttesa: number
  /** Ricavo medio per camera attesa. */
  adrAtteso: number
  camereAttese: number
  /** Settimane con la chiusura attesa sotto il budget. */
  settimaneSotto: number
  /** Settimana con lo scostamento peggiore. */
  peggiore: SettimanaForecast | null
  sparkAtteso: number[]
  sparkGarantito: number[]
  sparkOcc: number[]
}

/** Indicatori del periodo di previsione. */
export function computeForecastKpi(d: ForecastData): ForecastKpi {
  const somma = (f: (g: GiornoForecast) => number) => d.giorni.reduce((s, g) => s + f(g), 0)
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)

  const garantito = somma((g) => g.garantito)
  const opzionato = somma((g) => g.opzionato)
  const daAcquisire = somma((g) => g.daAcquisire)
  const atteso = somma((g) => g.atteso)
  const budget = somma((g) => g.budget)
  const ly = somma((g) => g.ly)
  const camereAttese = somma((g) => g.camereAttese)
  const notti = d.giorni.length * d.camereDisponibili

  const sotto = d.settimane.filter((s) => s.gap < 0)
  const peggiore = [...d.settimane].sort((a, b) => a.gap - b.gap)[0]

  return {
    garantito,
    opzionato,
    daAcquisire,
    atteso,
    budget,
    ly,
    deltaBudget: pct(atteso, budget),
    deltaLy: pct(atteso, ly),
    coperturaGarantito: budget ? (garantito / budget) * 100 : 0,
    occAttesa: notti ? (camereAttese / notti) * 100 : 0,
    adrAtteso: camereAttese ? atteso / camereAttese : 0,
    camereAttese,
    settimaneSotto: sotto.length,
    peggiore: peggiore && peggiore.gap < 0 ? peggiore : null,
    sparkAtteso: d.giorni.map((g) => g.atteso),
    sparkGarantito: d.giorni.map((g) => g.garantito),
    sparkOcc: d.giorni.map((g) => g.occAttesa),
  }
}
