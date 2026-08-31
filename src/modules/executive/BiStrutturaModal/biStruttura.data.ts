// ─── DATI BI DELLA SINGOLA STRUTTURA ────────────────────────────────────────────
//  Serie di supporto alla modale di business intelligence aperta dalle pagine
//  "I miei business" e "I miei ristoranti": la riga della tabella porta il dato
//  del giorno, qui intorno ci si costruisce il contesto che serve a leggerlo
//  (ultimi 14 giorni, 12 mesi contro anno precedente, composizione dei ricavi).
//
//  I numeri sono generati in modo DETERMINISTICO dal seme della struttura: la
//  stessa struttura mostra sempre le stesse serie, e due strutture diverse non si
//  somigliano. Quando arriverà il dato vero basterà sostituire `buildBiStruttura`.

export type BiVariante = 'business' | 'ristorante'

export interface BiStrutturaInput {
  variante: BiVariante
  /** Indice della struttura in elenco: rende le serie stabili e distinte. */
  seed: number
  /** Data selezionata nel calendario della pagina. */
  data: Date
  /** Data futura: la pagina sta mostrando una previsione, non un consuntivo. */
  isForecast: boolean
  ricavi: number
  costi: number
  profitto: number
  perc: number
  /** Solo ristoranti. */
  coperti?: number
  scontrino?: number
}

export interface BiStrutturaData {
  giorni: { label: string; ricavi: number; costi: number; profitto: number; coperti: number }[]
  mesi: { label: string; ty: number; ly: number }[]
  composizione: { label: string; valore: number; quota: number }[]
  sparkRicavi: number[]
  sparkCosti: number[]
  sparkProfitto: number[]
  sparkMargine: number[]
  sparkCoperti: number[]
  sparkScontrino: number[]
  /** Variazioni sul periodo precedente di pari durata. */
  deltaRicavi: number
  deltaCosti: number
  deltaProfitto: number
  deltaMargine: number
  deltaCoperti: number
  deltaScontrino: number
  /** Ricavi dei 12 mesi contro l'anno precedente. */
  deltaAnno: number
  aggiornatoAl: Date
}

const MESI_S = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

/** Generatore pseudo-casuale ripetibile: stesso seme → stessa serie. */
function rng(seed: number) {
  let s = (seed + 1) * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/** Le voci in cui si scompone il fatturato, diverse per hotel e ristoranti. */
const VOCI: Record<BiVariante, string[]> = {
  business:   ['Camere', 'F&B', 'Spa & extra', 'Meeting & eventi'],
  ristorante: ['Food', 'Beverage', 'Coperto & servizio', 'Asporto & delivery'],
}

const PESI: Record<BiVariante, number[]> = {
  business:   [0.62, 0.21, 0.11, 0.06],
  ristorante: [0.58, 0.27, 0.09, 0.06],
}

const variazione = (attuale: number, precedente: number) =>
  precedente ? ((attuale - precedente) / precedente) * 100 : 0

export function buildBiStruttura(input: BiStrutturaInput): BiStrutturaData {
  const { variante, seed, data, ricavi, costi, coperti = 0 } = input
  const r = rng(seed)

  // ── Ultimi 14 giorni fino alla data selezionata ──────────────────────────────
  //  L'ultimo giorno è esattamente il dato che l'utente sta guardando in tabella:
  //  la serie non deve contraddire la riga da cui è partito.
  const incidenzaCosti = ricavi ? costi / ricavi : 0.55
  const giorni: BiStrutturaData['giorni'] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(data.getFullYear(), data.getMonth(), data.getDate() - i)
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const f = i === 0 ? 1 : (0.80 + r() * 0.32) * (weekend ? 1.14 : 1)
    const gRicavi = Math.round(ricavi * f)
    const gCosti = i === 0 ? costi : Math.round(gRicavi * (incidenzaCosti + (r() - 0.5) * 0.06))
    giorni.push({
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      ricavi: gRicavi,
      costi: gCosti,
      profitto: gRicavi - gCosti,
      // I coperti non seguono i ricavi uno a uno: variando di suo, lo scontrino
      // medio del giorno smette di essere una costante e torna a dire qualcosa.
      coperti: i === 0 ? coperti : Math.round(coperti * f * (0.90 + r() * 0.20)),
    })
  }

  // ── 12 mesi contro l'anno precedente ────────────────────────────────────────
  const mesi: BiStrutturaData['mesi'] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(data.getFullYear(), data.getMonth() - i, 1)
    // Stagionalità: picco estivo, minimo invernale.
    const stag = 1 + Math.sin(((d.getMonth() - 2) / 12) * Math.PI * 2) * 0.22
    const ty = Math.round(ricavi * 30 * stag * (0.92 + r() * 0.16))
    mesi.push({
      label: `${MESI_S[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      ty,
      ly: Math.round(ty / (0.94 + r() * 0.18)),
    })
  }

  // ── Composizione dei ricavi del giorno ──────────────────────────────────────
  const pesi = PESI[variante].map((p) => p * (0.86 + r() * 0.28))
  const somma = pesi.reduce((s, p) => s + p, 0)
  const composizione = VOCI[variante].map((label, i) => ({
    label,
    valore: Math.round((ricavi * pesi[i]) / somma),
    quota: (pesi[i] / somma) * 100,
  }))

  // ── Micro-andamenti delle KPI e variazioni sul periodo precedente ───────────
  const sparkRicavi = giorni.map((g) => g.ricavi)
  const sparkCosti = giorni.map((g) => g.costi)
  const sparkProfitto = giorni.map((g) => g.profitto)
  const sparkMargine = giorni.map((g) => (g.ricavi ? (g.profitto / g.ricavi) * 100 : 0))
  const sparkCoperti = giorni.map((g) => g.coperti)
  const sparkScontrino = giorni.map((g) => (g.coperti ? g.ricavi / g.coperti : 0))

  const somma7 = (v: number[], da: number) => v.slice(da, da + 7).reduce((s, n) => s + n, 0)
  const ricaviUlt = somma7(sparkRicavi, 7), ricaviPrec = somma7(sparkRicavi, 0)
  const costiUlt = somma7(sparkCosti, 7), costiPrec = somma7(sparkCosti, 0)
  const profUlt = somma7(sparkProfitto, 7), profPrec = somma7(sparkProfitto, 0)
  const copUlt = somma7(sparkCoperti, 7), copPrec = somma7(sparkCoperti, 0)

  const tyAnno = mesi.reduce((s, m) => s + m.ty, 0)
  const lyAnno = mesi.reduce((s, m) => s + m.ly, 0)

  return {
    giorni,
    mesi,
    composizione,
    sparkRicavi,
    sparkCosti,
    sparkProfitto,
    sparkMargine,
    sparkCoperti,
    sparkScontrino,
    deltaRicavi: variazione(ricaviUlt, ricaviPrec),
    deltaCosti: variazione(costiUlt, costiPrec),
    deltaProfitto: variazione(profUlt, profPrec),
    deltaMargine: (ricaviUlt ? (profUlt / ricaviUlt) * 100 : 0) - (ricaviPrec ? (profPrec / ricaviPrec) * 100 : 0),
    deltaCoperti: variazione(copUlt, copPrec),
    deltaScontrino: variazione(copUlt ? ricaviUlt / copUlt : 0, copPrec ? ricaviPrec / copPrec : 0),
    deltaAnno: variazione(tyAnno, lyAnno),
    // Il dato BI è fermo al carico notturno del giorno selezionato.
    aggiornatoAl: new Date(data.getFullYear(), data.getMonth(), data.getDate(), 6, 30),
  }
}
