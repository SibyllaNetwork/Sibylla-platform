// ─── BUDGET ANALYSIS — dati di lavoro ───────────────────────────────────────────
//  Il budget si legge contro il consuntivo: la pagina non ha un modello proprio, usa
//  il conto economico condiviso di finance (`finance/_data/financeMock`), dove ogni
//  mese porta con sé il proprio budget di ricavi e il budget di ogni voce di costo.
//  Così Budget analysis, Finance overview e Analisi scenari raccontano gli stessi
//  numeri: qui ci sono solo le derivazioni della pagina.
//
//  Due letture, scelte in pagina:
//    • PROGRESSIVO — solo i mesi chiusi: confronto omogeneo, nessuna previsione
//      dentro il numero;
//    • ANNO INTERO — mesi chiusi più previsione: l'atterraggio atteso.
//
//  Convenzione dei segni: lo scostamento è sempre EFFETTO SUL MARGINE. Ricavi sopra
//  budget e costi sotto budget sono entrambi positivi, così le voci si possono
//  ordinare fra loro e sommare senza cambiare segno a mano.
import {
  FAMIGLIE_COSTO, famigliaDi, type FinanceData, type MeseFinance, type VoceCostoMese,
} from '../../../finance/_data/financeMock'

/** Ampiezza del periodo analizzato. */
export type Ambito = 'ytd' | 'anno'

export const AMBITI: { key: Ambito; label: string }[] = [
  { key: 'ytd', label: 'Progressivo (mesi chiusi)' },
  { key: 'anno', label: 'Anno intero (con previsione)' },
]

/** Metrica del grafico principale: sono tutte in €, un solo asse dei valori. */
export type Misura = 'ricavi' | 'costi' | 'gop'

/** Indicatore per camera disponibile. */
export type PerCamera = 'revpar' | 'costpar' | 'goppar'

export interface MeseBudget {
  /** 1-12 */
  mese: number
  label: string
  /** Mese già chiuso: oltre, i valori sono previsione. */
  consuntivo: boolean
  ricavi: number
  ricaviBudget: number
  costi: number
  costiBudget: number
  gop: number
  gopBudget: number
  camereDisponibili: number
  revpar: number
  revparBudget: number
  costpar: number
  costparBudget: number
  goppar: number
  gopparBudget: number
  /** Effetto sul margine del mese: margine consuntivo meno margine di budget. */
  scostamento: number
  /** Scostamento sommato da inizio anno: dice se il recupero è in corso. */
  scostamentoCum: number
}

/** Il valore e il suo budget per la misura scelta. */
export function valoriDi(m: MeseBudget, misura: Misura): { valore: number; budget: number } {
  return misura === 'ricavi' ? { valore: m.ricavi, budget: m.ricaviBudget }
    : misura === 'costi' ? { valore: m.costi, budget: m.costiBudget }
      : { valore: m.gop, budget: m.gopBudget }
}

/** Il valore per camera disponibile e il suo budget. */
export function perCameraDi(m: MeseBudget, k: PerCamera): { valore: number; budget: number } {
  return k === 'revpar' ? { valore: m.revpar, budget: m.revparBudget }
    : k === 'costpar' ? { valore: m.costpar, budget: m.costparBudget }
      : { valore: m.goppar, budget: m.gopparBudget }
}

/** I dodici mesi con budget, consuntivo e indicatori per camera disponibile. */
export function budgetMesi(d: FinanceData): MeseBudget[] {
  let cum = 0
  return d.mesi.map((m) => {
    const gopBudget = m.ricaviBudget - m.costiBudget
    const scostamento = m.gop - gopBudget
    cum += scostamento
    const perCamera = (v: number) => (m.camereDisponibili ? v / m.camereDisponibili : 0)
    return {
      mese: m.mese,
      label: m.label,
      consuntivo: m.consuntivo,
      ricavi: m.ricaviTotali,
      ricaviBudget: m.ricaviBudget,
      costi: m.costiTotali,
      costiBudget: m.costiBudget,
      gop: m.gop,
      gopBudget,
      camereDisponibili: m.camereDisponibili,
      revpar: perCamera(m.ricaviTotali),
      revparBudget: perCamera(m.ricaviBudget),
      costpar: perCamera(m.costiTotali),
      costparBudget: perCamera(m.costiBudget),
      goppar: perCamera(m.gop),
      gopparBudget: perCamera(gopBudget),
      scostamento,
      scostamentoCum: cum,
    }
  })
}

/** I mesi dell'ambito scelto (con l'anno intero come rete quando nulla è chiuso). */
export function mesiDi(d: FinanceData, ambito: Ambito): MeseFinance[] {
  if (ambito === 'anno') return d.mesi
  const chiusi = d.mesi.filter((m) => m.consuntivo)
  return chiusi.length ? chiusi : d.mesi
}

export interface BudgetKpi {
  ricavi: number
  ricaviBudget: number
  /** Scostamento dei ricavi in % sul budget del periodo. */
  deltaRicavi: number
  costi: number
  costiBudget: number
  deltaCosti: number
  gop: number
  gopBudget: number
  deltaGop: number
  /** Effetto sul margine in €: è il numero che si porta in riunione. */
  scostamentoGop: number
  /** Quanto del budget di ricavi del periodo è stato realizzato. */
  raggiungimento: number
  /** Chiusura attesa dell'anno e budget dell'anno intero. */
  atterraggio: number
  budgetAnno: number
  deltaAtterraggio: number
  /** Mesi del periodo chiusi sotto il budget di margine. */
  mesiSotto: number
  mesiTotali: number
  /** Mese con lo scostamento di margine peggiore del periodo. */
  peggiore: { label: string; delta: number } | null
  sparkRicavi: number[]
  sparkCosti: number[]
  sparkGop: number[]
  sparkScostamento: number[]
}

/** Indicatori del periodo: consuntivo contro budget, più l'atterraggio d'anno. */
export function computeBudgetKpi(d: FinanceData, ambito: Ambito): BudgetKpi {
  const mesi = budgetMesi(d)
  const chiusi = mesi.filter((m) => m.consuntivo)
  const periodo = ambito === 'anno' ? mesi : (chiusi.length ? chiusi : mesi)
  const somma = (f: (m: MeseBudget) => number, su = periodo) => su.reduce((s, m) => s + f(m), 0)
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)

  const ricavi = somma((m) => m.ricavi)
  const ricaviBudget = somma((m) => m.ricaviBudget)
  const costi = somma((m) => m.costi)
  const costiBudget = somma((m) => m.costiBudget)
  const gop = somma((m) => m.gop)
  const gopBudget = somma((m) => m.gopBudget)
  // L'atterraggio guarda sempre i dodici mesi: è la chiusura attesa dell'anno,
  // qualunque sia l'ambito con cui si stanno leggendo gli scostamenti.
  const atterraggio = somma((m) => m.ricavi, mesi)
  const budgetAnno = somma((m) => m.ricaviBudget, mesi)

  const peggioreMese = [...periodo].sort((a, b) => a.scostamento - b.scostamento)[0]

  return {
    ricavi,
    ricaviBudget,
    deltaRicavi: pct(ricavi, ricaviBudget),
    costi,
    costiBudget,
    deltaCosti: pct(costi, costiBudget),
    gop,
    gopBudget,
    deltaGop: pct(gop, gopBudget),
    scostamentoGop: gop - gopBudget,
    raggiungimento: ricaviBudget ? (ricavi / ricaviBudget) * 100 : 0,
    atterraggio,
    budgetAnno,
    deltaAtterraggio: pct(atterraggio, budgetAnno),
    mesiSotto: periodo.filter((m) => m.scostamento < 0).length,
    mesiTotali: periodo.length,
    peggiore: peggioreMese && peggioreMese.scostamento < 0
      ? { label: peggioreMese.label, delta: peggioreMese.scostamento }
      : null,
    sparkRicavi: periodo.map((m) => m.ricavi),
    sparkCosti: periodo.map((m) => m.costi),
    sparkGop: periodo.map((m) => m.gop),
    sparkScostamento: periodo.map((m) => m.scostamentoCum),
  }
}

export interface VoceScostamento {
  key: string
  label: string
  consuntivo: number
  budget: number
  /** Effetto sul margine: positivo = margine migliore del budget. */
  effetto: number
  /** true per le voci di costo (dove spendere più del budget peggiora il margine). */
  costo: boolean
}

/**
 * Da dove nasce lo scostamento: i ricavi da una parte, le famiglie di costo
 * dall'altra, tutte misurate come effetto sul margine e ordinate per peso. È la
 * risposta alla domanda "su cosa intervengo per primo".
 */
export function scostamentiBudget(d: FinanceData, ambito: Ambito): VoceScostamento[] {
  const mesi = mesiDi(d, ambito)
  const somma = (f: (m: MeseFinance) => number) => mesi.reduce((s, m) => s + f(m), 0)

  const ricavi = somma((m) => m.ricaviTotali)
  const ricaviBudget = somma((m) => m.ricaviBudget)

  const perFamiglia = FAMIGLIE_COSTO.map((f) => {
    const consuntivo = somma((m) => m.costi
      .filter((c) => famigliaDi(c.key) === f.key)
      .reduce((s, c) => s + c.valore, 0))
    const budget = somma((m) => m.costi
      .filter((c) => famigliaDi(c.key) === f.key)
      .reduce((s, c) => s + c.budget, 0))
    return {
      key: f.key,
      label: f.breve,
      consuntivo,
      budget,
      // Un costo sopra il budget sottrae margine: il segno si gira una volta qui.
      effetto: budget - consuntivo,
      costo: true,
    }
  })

  return [
    { key: 'ricavi', label: 'Ricavi', consuntivo: ricavi, budget: ricaviBudget, effetto: ricavi - ricaviBudget, costo: false },
    ...perFamiglia,
  ].sort((a, b) => Math.abs(b.effetto) - Math.abs(a.effetto))
}

export interface RigaSintesi {
  label: string
  budget: number
  consuntivo: number
  /** true per le voci di costo: il badge di variazione va letto al contrario. */
  costo?: boolean
  /** true per la riga di sintesi (margine operativo). */
  totale?: boolean
}

/**
 * Il conto del periodo in quattro righe: ricavi, costi divisi fra reparto e
 * indistribuiti, margine. Quattro perché la card deve stare in una schermata anche
 * sui laptop bassi senza scroll: i totali dei costi li porta già la fascia KPI.
 */
export function sintesiBudget(d: FinanceData, ambito: Ambito): RigaSintesi[] {
  const mesi = mesiDi(d, ambito)
  const somma = (f: (m: MeseFinance) => number) => mesi.reduce((s, m) => s + f(m), 0)
  const costi = (filtro: (c: VoceCostoMese) => boolean, campo: 'valore' | 'budget') =>
    somma((m) => m.costi.filter(filtro).reduce((s, c) => s + c[campo], 0))

  const diretti = (c: VoceCostoMese) => !!c.reparto
  // Affitti e ammortamenti stanno con gli indistribuiti: non sono attribuibili a un
  // reparto, ed è così che li legge il conto economico.
  const indistribuiti = (c: VoceCostoMese) => !c.reparto

  const ricavi = somma((m) => m.ricaviTotali)
  const ricaviBudget = somma((m) => m.ricaviBudget)
  const costiTot = somma((m) => m.costiTotali)
  const costiTotBudget = somma((m) => m.costiBudget)

  return [
    { label: 'Ricavi totali', budget: ricaviBudget, consuntivo: ricavi },
    { label: 'Costi diretti di reparto', budget: costi(diretti, 'budget'), consuntivo: costi(diretti, 'valore'), costo: true },
    { label: 'Costi indistribuiti e struttura', budget: costi(indistribuiti, 'budget'), consuntivo: costi(indistribuiti, 'valore'), costo: true },
    { label: 'Margine operativo', budget: ricaviBudget - costiTotBudget, consuntivo: ricavi - costiTot, totale: true },
  ]
}
