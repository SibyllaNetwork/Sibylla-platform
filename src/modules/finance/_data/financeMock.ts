// ─── DATI DI LAVORO CONDIVISI — area finance ────────────────────────────────────
//  Modello economico unico delle pagine BI di finance (Finance overview, Break even,
//  Cash flow, WIF analysis, Analisi scenari mensili). È costruito SOPRA le serie del
//  ciclo revenue (`sales/_data/revenueMock`): i ricavi camere del conto economico
//  sono gli stessi che si leggono in Monthly trend e ADR analysis, così le pagine non
//  si contraddicono.
//
//  Impostazione: conto economico per reparto in stile USALI.
//    ricavi di reparto − costi diretti di reparto = margine di reparto
//    Σ margini di reparto − costi indistribuiti      = GOP (margine operativo lordo)
//    GOP / camere disponibili                        = GOPPAR
//  In parallelo ogni costo è classificato in FISSO o VARIABILE (rispetto alle camere
//  occupate): serve al punto di pareggio e alle simulazioni.
//
//  Tutto deterministico: stessi filtri → stessi numeri.
import {
  MESI, STRUTTURE, aggiornatoAl, buildGiorniMese, camereDisponibili, giorniDelMese,
  jitter,
} from '../../sales/_data/revenueMock'

export { MESI, STRUTTURE }

// ─── Struttura del conto economico ──────────────────────────────────────────────

/** Reparti che generano ricavo. */
export type Reparto = 'camere' | 'fb' | 'altri'

export const REPARTI: { key: Reparto; label: string }[] = [
  { key: 'camere', label: 'Camere' },
  { key: 'fb', label: 'Food & Beverage' },
  { key: 'altri', label: 'Altri ricavi' },
]

/**
 * Voci di costo: quota sul ricavo di riferimento e parte variabile.
 * `variabile` = quota del costo che si muove con le camere occupate (il resto è
 * fisso). È l'informazione che permette di calcolare il punto di pareggio.
 */
interface VoceCosto {
  key: string
  label: string
  /** Reparto a cui il costo è direttamente attribuibile (assente = indistribuito). */
  reparto?: Reparto
  /** Quota sul ricavo del reparto (o sul ricavo totale, se indistribuito). */
  quota: number
  /** Parte variabile del costo (0 = tutto fisso, 1 = tutto variabile). */
  variabile: number
  /**
   * Che cosa muove la parte variabile: le CAMERE occupate (lavanderia, personale di
   * servizio, energia) o il RICAVO (commissioni e materie prime, che seguono anche il
   * prezzo). La distinzione conta: con lo stesso numero di camere, un mese a tariffe
   * alte costa più di commissioni.
   */
  driver?: 'camere' | 'ricavo'
}

const COSTI: VoceCosto[] = [
  // Reparto camere
  { key: 'personale-camere', label: 'Personale camere', reparto: 'camere', quota: 0.175, variabile: 0.45 },
  { key: 'lavanderia', label: 'Lavanderia e consumabili', reparto: 'camere', quota: 0.055, variabile: 1 },
  { key: 'commissioni', label: 'Commissioni e OTA', reparto: 'camere', quota: 0.082, variabile: 1, driver: 'ricavo' },
  { key: 'altri-camere', label: 'Altri costi camere', reparto: 'camere', quota: 0.028, variabile: 0.6 },
  // Reparto food & beverage
  { key: 'food-cost', label: 'Materie prime F&B', reparto: 'fb', quota: 0.3, variabile: 1, driver: 'ricavo' },
  { key: 'personale-fb', label: 'Personale F&B', reparto: 'fb', quota: 0.315, variabile: 0.5 },
  { key: 'altri-fb', label: 'Altri costi F&B', reparto: 'fb', quota: 0.06, variabile: 0.7, driver: 'ricavo' },
  // Altri ricavi
  { key: 'costi-altri', label: 'Costi altri servizi', reparto: 'altri', quota: 0.4, variabile: 0.8, driver: 'ricavo' },
  // Costi indistribuiti (sul ricavo totale)
  { key: 'amministrazione', label: 'Amministrazione', quota: 0.068, variabile: 0.1 },
  { key: 'marketing', label: 'Marketing e distribuzione', quota: 0.042, variabile: 0.3, driver: 'ricavo' },
  { key: 'energia', label: 'Energia e utenze', quota: 0.062, variabile: 0.55 },
  { key: 'manutenzione', label: 'Manutenzione', quota: 0.031, variabile: 0.25 },
]

/** Costi di struttura indipendenti dal volume: affitti, ammortamenti, assicurazioni. */
const COSTO_STRUTTURA_PER_CAMERA_MESE = 305

/** Quote di ricavo degli altri reparti rispetto ai ricavi camere. */
const QUOTA_FB = 0.38
const QUOTA_ALTRI = 0.075

// ─── Modello mensile ────────────────────────────────────────────────────────────

export interface VoceCostoMese {
  key: string
  label: string
  reparto?: Reparto
  valore: number
  fisso: number
  variabile: number
  /** Costo previsto dal budget per la stessa voce e lo stesso periodo. */
  budget: number
  /**
   * Budget riparametrato sui volumi effettivi ("budget flessibile"): quanto la voce
   * DOVREBBE costare alle quote di budget, avendo venduto quello che si è venduto.
   * Serve a separare lo scostamento da volumi (budget flessibile − budget) da quello
   * di efficienza (consuntivo − budget flessibile), che è la parte su cui si agisce.
   */
  budgetFlex: number
}

/**
 * Famiglie di costo: aggregazione per NATURA della spesa, che è il modo in cui si
 * governano i costi (si tratta con i fornitori, si taglia, si rinegozia). Il reparto
 * risponde a un'altra domanda — dove il costo è stato consumato — e resta nel campo
 * `reparto`. L'ordine è quello degli slot categoriali e non va cambiato a gusto.
 */
export type FamigliaCosto = 'personale' | 'materie' | 'distribuzione' | 'energia' | 'struttura' | 'altri'

export const FAMIGLIE_COSTO: {
  key: FamigliaCosto
  label: string
  /** Etichetta per le legende. */
  breve: string
  /** Etichetta per gli assi categoriali: UNA parola, così non va mai a capo. */
  sigla: string
  voci: string[]
}[] = [
  { key: 'personale', label: 'Personale', breve: 'Personale', sigla: 'Personale', voci: ['personale-camere', 'personale-fb', 'amministrazione'] },
  { key: 'materie', label: 'Materie prime e consumabili', breve: 'Materie prime', sigla: 'Materie', voci: ['food-cost', 'lavanderia'] },
  { key: 'distribuzione', label: 'Commissioni e marketing', breve: 'Commissioni', sigla: 'Commissioni', voci: ['commissioni', 'marketing'] },
  { key: 'energia', label: 'Energia e utenze', breve: 'Energia', sigla: 'Energia', voci: ['energia'] },
  { key: 'struttura', label: 'Struttura e manutenzione', breve: 'Struttura', sigla: 'Struttura', voci: ['struttura', 'manutenzione'] },
  { key: 'altri', label: 'Altri costi operativi', breve: 'Altri', sigla: 'Altri', voci: ['altri-camere', 'altri-fb', 'costi-altri'] },
]

/** Famiglia di appartenenza di una voce di costo. */
export function famigliaDi(key: string): FamigliaCosto {
  return FAMIGLIE_COSTO.find((f) => f.voci.includes(key))?.key ?? 'altri'
}

/** Il budget dell'anno: i ricavi dell'anno precedente più l'obiettivo di crescita. */
const CRESCITA_BUDGET = 1.04

export interface MeseFinance {
  /** 1-12 */
  mese: number
  /** Etichetta breve (Gen, Feb…). */
  label: string
  camereDisponibili: number
  camereVendute: number
  occ: number
  adr: number
  ricaviCamere: number
  ricaviFb: number
  ricaviAltri: number
  ricaviTotali: number
  /** Ricavi totali dello stesso mese dell'anno precedente. */
  ricaviLY: number
  /** Ricavi totali previsti dal budget. */
  ricaviBudget: number
  costi: VoceCostoMese[]
  costiDiretti: number
  costiIndistribuiti: number
  costiStruttura: number
  costiTotali: number
  /** Costi totali previsti dal budget. */
  costiBudget: number
  /** Costi totali di budget riparametrati sui volumi effettivi. */
  costiBudgetFlex: number
  costiFissi: number
  costiVariabili: number
  /** Costo variabile per camera occupata. */
  cvu: number
  /** Margine di contribuzione (ricavi − costi variabili). */
  contribuzione: number
  /** Margine operativo lordo. */
  gop: number
  gopPct: number
  /** GOP per camera disponibile. */
  goppar: number
  gopLY: number
  /** Mese già consuntivato (i successivi sono previsione). */
  consuntivo: boolean
  // ── Cassa ──
  incassi: number
  pagamenti: number
  /** Flusso di cassa del mese. */
  cassa: number
  /** Saldo di cassa cumulato a fine mese. */
  saldoCumulato: number
}

export interface MargineReparto {
  key: Reparto
  label: string
  ricavi: number
  costi: number
  margine: number
  marginePct: number
}

export interface FinanceData {
  strutture: { id: number; nome: string }[]
  strutturaId: number | null
  anno: number
  camereDisponibili: number
  mesi: MeseFinance[]
  /** Ultimo mese consuntivato (1-12). */
  ultimoMeseConsuntivo: number
  reparti: MargineReparto[]
  /** Costi dell'anno per natura, ordinati per peso. */
  costiPerNatura: VoceCostoMese[]
  aggiornatoAl: Date
}

/** Giorni di incasso e di pagamento medi (DSO/DPO): sfasano la cassa sui ricavi. */
export const DSO = 24
export const DPO = 46

export function buildFinance(
  anno: number,
  strutturaId: number | null,
  oggi = new Date(),
): FinanceData {
  const disponibiliGiorno = camereDisponibili(strutturaId)
  const ultimoMeseConsuntivo = anno < oggi.getFullYear() ? 12
    : anno > oggi.getFullYear() ? 0
      : oggi.getMonth() + 1

  // ── Passo 1: volumi e ricavi del mese ────────────────────────────────────────
  //  I costi si costruiscono DOPO, perché la parte fissa è un impegno d'anno e per
  //  ripartirla servono i totali dei dodici mesi.
  const base = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const giorni = buildGiorniMese(anno, m, strutturaId, oggi)
    const camereDisp = disponibiliGiorno * giorniDelMese(anno, m)
    const camereVendute = giorni.reduce((s, d) => s + d.camere, 0)
    const ricaviCamere = giorni.reduce((s, d) => s + d.ricavi, 0)
    const ricaviCamereLY = giorni.reduce((s, d) => s + d.ricaviLY, 0)

    // F&B e altri ricavi seguono i volumi camere, con un po' di stagionalità propria
    const ricaviFb = Math.round(ricaviCamere * QUOTA_FB * (1 + jitter(m + 61, 0.06)))
    const ricaviAltri = Math.round(ricaviCamere * QUOTA_ALTRI * (1 + jitter(m + 71, 0.1)))
    const ricaviLY = Math.round(ricaviCamereLY * (1 + QUOTA_FB + QUOTA_ALTRI) * 0.98)

    return {
      mese: m,
      camereDisponibili: camereDisp,
      camereVendute,
      adr: camereVendute ? ricaviCamere / camereVendute : 0,
      ricaviCamere,
      ricaviFb,
      ricaviAltri,
      ricaviTotali: ricaviCamere + ricaviFb + ricaviAltri,
      ricaviLY,
      // Budget dell'anno: i ricavi dell'anno precedente più l'obiettivo di crescita
      ricaviBudget: Math.round(ricaviLY * CRESCITA_BUDGET),
    }
  })

  const totale = (f: (b: typeof base[number]) => number) => base.reduce((s, b) => s + f(b), 0)
  const annoCamereDisp = totale((b) => b.camereDisponibili)
  const annoCamereVendute = totale((b) => b.camereVendute)
  const annoRicavi = {
    camere: totale((b) => b.ricaviCamere),
    fb: totale((b) => b.ricaviFb),
    altri: totale((b) => b.ricaviAltri),
    totali: totale((b) => b.ricaviTotali),
  }
  const annoBudget = totale((b) => b.ricaviBudget)
  // Il budget dei ricavi si ripartisce sui reparti con le stesse quote del modello
  const annoBudgetCamere = annoBudget / (1 + QUOTA_FB + QUOTA_ALTRI)

  const ricavoDiMese = (b: typeof base[number], r?: Reparto) =>
    r === 'camere' ? b.ricaviCamere
      : r === 'fb' ? b.ricaviFb
        : r === 'altri' ? b.ricaviAltri
          : b.ricaviTotali
  const ricavoAnnoDi = (r?: Reparto) =>
    r === 'camere' ? annoRicavi.camere
      : r === 'fb' ? annoRicavi.fb
        : r === 'altri' ? annoRicavi.altri
          : annoRicavi.totali
  const budgetAnnoDi = (r?: Reparto) =>
    r === 'camere' ? annoBudgetCamere
      : r === 'fb' ? annoBudgetCamere * QUOTA_FB
        : r === 'altri' ? annoBudgetCamere * QUOTA_ALTRI
          : annoBudget

  // ── Passo 2: costi, cassa e indicatori del mese ──────────────────────────────
  const mesi: MeseFinance[] = []
  let saldo = 0

  for (const b of base) {
    const m = b.mese
    const { camereVendute, ricaviTotali, ricaviLY } = b
    // Quote di ripartizione sui dodici mesi: la CAPACITÀ per la parte fissa (un
    // affitto o uno stipendio a tempo indeterminato non guardano l'occupazione), il
    // volume del proprio DRIVER per la parte variabile. È questa distinzione che rende
    // veri il punto di pareggio, le simulazioni e il costo per camera occupata: nei
    // mesi vuoti la parte fissa si concentra su poche camere.
    const quotaCapacita = annoCamereDisp ? b.camereDisponibili / annoCamereDisp : 0
    const quotaCamere = annoCamereVendute ? camereVendute / annoCamereVendute : 0

    const costi: VoceCostoMese[] = COSTI.map((c) => {
      // Quota del mese sul volume d'anno del proprio driver
      const quotaVolume = c.driver === 'ricavo'
        ? (ricavoAnnoDi(c.reparto) ? ricavoDiMese(b, c.reparto) / ricavoAnnoDi(c.reparto) : 0)
        : quotaCamere
      // La parte fissa è quella PIANIFICATA (calcolata sui ricavi di budget): è un
      // impegno preso prima dell'anno, non una conseguenza di quanto si è venduto.
      const fissoAnno = budgetAnnoDi(c.reparto) * c.quota * (1 - c.variabile)
      const variabileAnno = ricavoAnnoDi(c.reparto) * c.quota * c.variabile
      const variabileBudgetAnno = budgetAnnoDi(c.reparto) * c.quota * c.variabile
      const seed = m * 13 + c.key.length
      const fisso = Math.round(fissoAnno * quotaCapacita * (1 + jitter(seed, 0.015)))
      const variabile = Math.round(variabileAnno * quotaVolume * (1 + jitter(seed + 7, 0.04)))
      const budgetFisso = Math.round(fissoAnno * quotaCapacita)
      return {
        key: c.key,
        label: c.label,
        reparto: c.reparto,
        valore: fisso + variabile,
        fisso,
        variabile,
        budget: budgetFisso + Math.round(variabileBudgetAnno * quotaVolume),
        // Budget riparametrato sui volumi effettivi: separa lo scostamento dovuto
        // ai volumi da quello dovuto all'efficienza della gestione.
        budgetFlex: budgetFisso + Math.round(variabileAnno * quotaVolume),
      }
    })

    // Costi di struttura: fissi per definizione (affitti, ammortamenti, assicurazioni)
    const costiStruttura = Math.round(disponibiliGiorno * COSTO_STRUTTURA_PER_CAMERA_MESE)
    costi.push({
      key: 'struttura',
      label: 'Affitti e ammortamenti',
      valore: costiStruttura,
      fisso: costiStruttura,
      variabile: 0,
      // Affitti e ammortamenti sono contrattualizzati: a budget valgono quanto a
      // consuntivo, e non generano scostamento.
      budget: costiStruttura,
      budgetFlex: costiStruttura,
    })

    const costiDiretti = costi.filter((c) => c.reparto).reduce((s, c) => s + c.valore, 0)
    const costiIndistribuiti = costi.filter((c) => !c.reparto).reduce((s, c) => s + c.valore, 0)
    const costiTotali = costiDiretti + costiIndistribuiti
    const costiBudget = costi.reduce((s, c) => s + c.budget, 0)
    const costiBudgetFlex = costi.reduce((s, c) => s + c.budgetFlex, 0)
    const costiFissi = costi.reduce((s, c) => s + c.fisso, 0)
    const costiVariabili = costi.reduce((s, c) => s + c.variabile, 0)

    const gop = ricaviTotali - costiTotali
    const gopLY = Math.round(ricaviLY * 0.255)

    // Cassa: gli incassi arrivano DSO giorni dopo il ricavo, i pagamenti DPO giorni
    // dopo il costo. Con granularità mensile si sfasa la quota corrispondente.
    const quotaIncassata = 1 - DSO / 30
    const quotaPagata = 1 - DPO / 30
    const precedente = mesi[mesi.length - 1]
    const incassi = Math.round(
      ricaviTotali * Math.max(0, quotaIncassata) + (precedente ? precedente.ricaviTotali * (1 - Math.max(0, quotaIncassata)) : 0),
    )
    const pagamenti = Math.round(
      costiTotali * Math.max(0, quotaPagata) + (precedente ? precedente.costiTotali * (1 - Math.max(0, quotaPagata)) : 0),
    )
    const cassa = incassi - pagamenti
    saldo += cassa

    mesi.push({
      mese: m,
      label: MESI[m - 1].slice(0, 3),
      camereDisponibili: b.camereDisponibili,
      camereVendute,
      occ: b.camereDisponibili ? +((camereVendute / b.camereDisponibili) * 100).toFixed(1) : 0,
      adr: b.adr,
      ricaviCamere: b.ricaviCamere,
      ricaviFb: b.ricaviFb,
      ricaviAltri: b.ricaviAltri,
      ricaviTotali,
      ricaviLY,
      ricaviBudget: b.ricaviBudget,
      costi,
      costiDiretti,
      costiIndistribuiti,
      costiStruttura,
      costiTotali,
      costiBudget,
      costiBudgetFlex,
      costiFissi,
      costiVariabili,
      cvu: camereVendute ? costiVariabili / camereVendute : 0,
      contribuzione: ricaviTotali - costiVariabili,
      gop,
      gopPct: ricaviTotali ? (gop / ricaviTotali) * 100 : 0,
      goppar: b.camereDisponibili ? gop / b.camereDisponibili : 0,
      gopLY,
      consuntivo: m <= ultimoMeseConsuntivo,
      incassi,
      pagamenti,
      cassa,
      saldoCumulato: saldo,
    })
  }

  // Margini di reparto sull'anno
  const reparti: MargineReparto[] = REPARTI.map(({ key, label }) => {
    const ricavi = mesi.reduce((s, m) => s + (key === 'camere' ? m.ricaviCamere : key === 'fb' ? m.ricaviFb : m.ricaviAltri), 0)
    const costi = mesi.reduce(
      (s, m) => s + m.costi.filter((c) => c.reparto === key).reduce((a, c) => a + c.valore, 0),
      0,
    )
    return { key, label, ricavi, costi, margine: ricavi - costi, marginePct: ricavi ? ((ricavi - costi) / ricavi) * 100 : 0 }
  })

  // Costi dell'anno per natura
  const mappa = new Map<string, VoceCostoMese>()
  for (const m of mesi) {
    for (const c of m.costi) {
      const cur = mappa.get(c.key)
      if (cur) {
        cur.valore += c.valore
        cur.fisso += c.fisso
        cur.variabile += c.variabile
        cur.budget += c.budget
        cur.budgetFlex += c.budgetFlex
      } else {
        mappa.set(c.key, { ...c })
      }
    }
  }
  // Array.from e non lo spread: il target di compilazione non itera le Map
  const costiPerNatura = Array.from(mappa.values()).sort((a, b) => b.valore - a.valore)

  return {
    strutture: STRUTTURE.map((s) => ({ id: s.id, nome: s.nome })),
    strutturaId,
    anno,
    camereDisponibili: disponibiliGiorno,
    mesi,
    ultimoMeseConsuntivo,
    reparti,
    costiPerNatura,
    aggiornatoAl: aggiornatoAl(oggi),
  }
}

// ─── Indicatori d'anno ──────────────────────────────────────────────────────────

export interface FinanceKpi {
  ricavi: number
  ricaviLY: number
  deltaRicavi: number
  costi: number
  gop: number
  gopPct: number
  gopLY: number
  deltaGop: number
  goppar: number
  cassa: number
  costiFissi: number
  costiVariabili: number
  incidenzaPersonale: number
  sparkRicavi: number[]
  sparkCosti: number[]
  sparkGop: number[]
  sparkCassa: number[]
}

/** Indicatori dell'anno; `soloConsuntivo` limita il calcolo ai mesi chiusi. */
export function computeFinanceKpi(d: FinanceData, soloConsuntivo = false): FinanceKpi {
  const mesi = soloConsuntivo ? d.mesi.filter((m) => m.consuntivo) : d.mesi
  const base = mesi.length ? mesi : d.mesi
  const somma = (f: (m: MeseFinance) => number) => base.reduce((s, m) => s + f(m), 0)

  const ricavi = somma((m) => m.ricaviTotali)
  const ricaviLY = somma((m) => m.ricaviLY)
  const costi = somma((m) => m.costiTotali)
  const gop = ricavi - costi
  const gopLY = somma((m) => m.gopLY)
  const camereDisp = somma((m) => m.camereDisponibili)
  const personale = somma((m) => m.costi
    .filter((c) => c.key.startsWith('personale') || c.key === 'amministrazione')
    .reduce((a, c) => a + c.valore, 0))
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)

  return {
    ricavi,
    ricaviLY,
    deltaRicavi: pct(ricavi, ricaviLY),
    costi,
    gop,
    gopPct: ricavi ? (gop / ricavi) * 100 : 0,
    gopLY,
    deltaGop: pct(gop, gopLY),
    goppar: camereDisp ? gop / camereDisp : 0,
    cassa: base[base.length - 1]?.saldoCumulato ?? 0,
    costiFissi: somma((m) => m.costiFissi),
    costiVariabili: somma((m) => m.costiVariabili),
    incidenzaPersonale: ricavi ? (personale / ricavi) * 100 : 0,
    sparkRicavi: base.map((m) => m.ricaviTotali),
    sparkCosti: base.map((m) => m.costiTotali),
    sparkGop: base.map((m) => m.gop),
    sparkCassa: base.map((m) => m.saldoCumulato),
  }
}

// ─── Punto di pareggio ──────────────────────────────────────────────────────────

export interface Bep {
  /** Costi fissi del periodo. */
  costiFissi: number
  /** Costo variabile per camera occupata. */
  cvu: number
  /** Ricavo medio per camera occupata (comprensivo di F&B e altri ricavi). */
  ricavoPerCamera: number
  /** Margine di contribuzione unitario. */
  mcu: number
  /** Camere da vendere per coprire i costi fissi. */
  camereBep: number
  /** Ricavo di pareggio. */
  ricaviBep: number
  /** Occupazione di pareggio (%). */
  occBep: number
  /** Camere effettivamente vendute nel periodo. */
  camereVendute: number
  /** Quanto si può perdere prima di andare sotto (%). */
  margineSicurezza: number
  /** Leva operativa: di quanto varia il GOP per 1% di ricavo in più. */
  levaOperativa: number
  /** Mese in cui si raggiunge il pareggio (cumulato), se raggiunto. */
  meseRaggiungimento: number | null
}

/** Punto di pareggio su un insieme di mesi (default: l'anno intero). */
export function computeBep(mesi: MeseFinance[]): Bep {
  const costiFissi = mesi.reduce((s, m) => s + m.costiFissi, 0)
  const costiVariabili = mesi.reduce((s, m) => s + m.costiVariabili, 0)
  const camereVendute = mesi.reduce((s, m) => s + m.camereVendute, 0)
  const camereDisp = mesi.reduce((s, m) => s + m.camereDisponibili, 0)
  const ricavi = mesi.reduce((s, m) => s + m.ricaviTotali, 0)

  const cvu = camereVendute ? costiVariabili / camereVendute : 0
  const ricavoPerCamera = camereVendute ? ricavi / camereVendute : 0
  const mcu = ricavoPerCamera - cvu
  const camereBep = mcu > 0 ? costiFissi / mcu : 0
  const contribuzione = ricavi - costiVariabili
  const gop = ricavi - costiVariabili - costiFissi

  // Mese in cui le camere vendute cumulate superano il pareggio
  let cumulate = 0
  let meseRaggiungimento: number | null = null
  for (const m of mesi) {
    cumulate += m.camereVendute
    if (meseRaggiungimento === null && camereBep > 0 && cumulate >= camereBep) meseRaggiungimento = m.mese
  }

  return {
    costiFissi,
    cvu,
    ricavoPerCamera,
    mcu,
    camereBep,
    ricaviBep: camereBep * ricavoPerCamera,
    occBep: camereDisp ? (camereBep / camereDisp) * 100 : 0,
    camereVendute,
    margineSicurezza: camereVendute ? ((camereVendute - camereBep) / camereVendute) * 100 : 0,
    levaOperativa: gop !== 0 ? contribuzione / gop : 0,
    meseRaggiungimento,
  }
}

// ─── Cassa e capitale circolante ────────────────────────────────────────────────

export interface PassoPonte {
  label: string
  /** Base invisibile su cui poggia la barra (saldo cumulato precedente). */
  base: number
  /** Variazione del mese (positiva o negativa). */
  delta: number
  /** true per la barra conclusiva del totale. */
  totale?: boolean
}

export interface AttesaCassa {
  label: string
  incassi: number
  pagamenti: number
}

export interface CassaKpi {
  incassi: number
  pagamenti: number
  flusso: number
  /** Saldo cumulato a fine periodo. */
  saldoFinale: number
  /** Crediti verso clienti ancora aperti (ricavi non incassati). */
  crediti: number
  /** Debiti verso fornitori ancora aperti (costi non pagati). */
  debiti: number
  dso: number
  dpo: number
  /** Ciclo di cassa: giorni fra l'uscita e il rientro del denaro. */
  cicloCassa: number
  /** Mesi con flusso negativo: sono quelli da presidiare. */
  mesiNegativi: number
  sparkIncassi: number[]
  sparkPagamenti: number[]
  sparkSaldo: number[]
  /** Ponte di cassa: saldo che si costruisce mese per mese, più il totale. */
  ponte: PassoPonte[]
  /** Incassi e pagamenti attesi nelle prossime fasce di 30 giorni. */
  attese: AttesaCassa[]
}

export function computeCassa(d: FinanceData): CassaKpi {
  const incassi = d.mesi.reduce((s, m) => s + m.incassi, 0)
  const pagamenti = d.mesi.reduce((s, m) => s + m.pagamenti, 0)
  const ricavi = d.mesi.reduce((s, m) => s + m.ricaviTotali, 0)
  const costi = d.mesi.reduce((s, m) => s + m.costiTotali, 0)

  const cumulato = d.mesi.reduce((s, m) => s + m.cassa, 0)

  // Ponte "da ricavi a cassa": i ricavi non sono cassa. Prima si toglie quanto è
  // stato fatturato e non ancora incassato, poi i costi, poi si riaggiunge quanto è
  // stato acquistato e non ancora pagato. Ogni barra parte dove finisce la
  // precedente (la `base` è invisibile), l'ultima riparte da zero: è il saldo.
  const crediti = Math.round(ricavi * (DSO / 365))
  const debiti = Math.round(costi * (DPO / 365))
  const ponte: PassoPonte[] = []
  let livello = 0
  const passo = (label: string, delta: number) => {
    if (delta >= 0) {
      ponte.push({ label, base: livello, delta })
    } else {
      ponte.push({ label, base: livello + delta, delta: -delta })
    }
    livello += delta
  }
  passo('Ricavi', ricavi)
  passo('Crediti non incassati', -crediti)
  passo('Costi', -costi)
  passo('Debiti non pagati', debiti)
  ponte.push({ label: 'Cassa', base: 0, delta: livello, totale: true })

  // Attese: le fasce future prendono i mesi non ancora consuntivati
  const futuri = d.mesi.filter((m) => !m.consuntivo).slice(0, 3)
  const attese: AttesaCassa[] = ['Entro 30 gg', '31-60 gg', '61-90 gg'].map((label, i) => ({
    label,
    incassi: futuri[i]?.incassi ?? 0,
    pagamenti: futuri[i]?.pagamenti ?? 0,
  }))

  return {
    incassi,
    pagamenti,
    flusso: incassi - pagamenti,
    saldoFinale: cumulato,
    crediti,
    debiti,
    dso: DSO,
    dpo: DPO,
    cicloCassa: DSO - DPO,
    mesiNegativi: d.mesi.filter((m) => m.cassa < 0).length,
    sparkIncassi: d.mesi.map((m) => m.incassi),
    sparkPagamenti: d.mesi.map((m) => m.pagamenti),
    sparkSaldo: d.mesi.map((m) => m.saldoCumulato),
    ponte,
    attese,
  }
}

// ─── Simulazione (usata da WIF analysis e Analisi scenari mensili) ───────────────

export interface Leve {
  /** Variazione % dell'ADR (e quindi del ricavo per camera). */
  adr: number
  /** Variazione % delle camere occupate. */
  camere: number
  /** Variazione % dei costi fissi. */
  costiFissi: number
  /** Variazione % dei costi variabili unitari. */
  costiVariabili: number
}

export const LEVE_NEUTRE: Leve = { adr: 0, camere: 0, costiFissi: 0, costiVariabili: 0 }

/**
 * I tre scenari di riferimento della revisione di budget.
 * Le ipotesi sono ESPLICITE, non nascoste in una formula: sono le leve che
 * distinguono uno scenario dall'altro, e la pagina le mostra all'utente.
 */
export const SCENARI: { key: 'pessimistico' | 'base' | 'ottimistico'; label: string; leve: Leve }[] = [
  // Domanda debole: si perde occupazione e si difende poco il prezzo; i costi
  // variabili scendono con i volumi ma i fissi restano.
  { key: 'pessimistico', label: 'Pessimistico', leve: { adr: -5, camere: -12, costiFissi: 0, costiVariabili: -3 } },
  { key: 'base', label: 'Base', leve: LEVE_NEUTRE },
  // Domanda in tenuta: prezzo e volumi crescono, i costi variabili seguono.
  { key: 'ottimistico', label: 'Ottimistico', leve: { adr: 4, camere: 7, costiFissi: 1, costiVariabili: 3 } },
]

export interface EsitoScenario {
  ricavi: number
  costi: number
  gop: number
  gopPct: number
  camereVendute: number
  occ: number
  adr: number
  /** Serie mensile del GOP simulato. */
  perMese: { label: string; ricavi: number; gop: number }[]
}

/**
 * Applica le leve al modello e ricalcola il conto economico.
 * I costi variabili seguono le camere occupate (per camera), i fissi non.
 */
export function applyScenario(d: FinanceData, leve: Leve): EsitoScenario {
  const k = {
    adr: 1 + leve.adr / 100,
    camere: 1 + leve.camere / 100,
    cf: 1 + leve.costiFissi / 100,
    cv: 1 + leve.costiVariabili / 100,
  }

  const perMese = d.mesi.map((m) => {
    const camere = m.camereVendute * k.camere
    const ricavoPerCamera = m.camereVendute ? (m.ricaviTotali / m.camereVendute) * k.adr : 0
    const ricavi = camere * ricavoPerCamera
    const variabili = camere * m.cvu * k.cv
    const fissi = m.costiFissi * k.cf
    return { label: m.label, ricavi, gop: ricavi - variabili - fissi, camere, variabili, fissi }
  })

  const ricavi = perMese.reduce((s, m) => s + m.ricavi, 0)
  const costi = perMese.reduce((s, m) => s + m.variabili + m.fissi, 0)
  const camereVendute = perMese.reduce((s, m) => s + m.camere, 0)
  const camereDisp = d.mesi.reduce((s, m) => s + m.camereDisponibili, 0)

  return {
    ricavi,
    costi,
    gop: ricavi - costi,
    gopPct: ricavi ? ((ricavi - costi) / ricavi) * 100 : 0,
    camereVendute,
    occ: camereDisp ? (camereVendute / camereDisp) * 100 : 0,
    adr: camereVendute ? ricavi / camereVendute : 0,
    perMese: perMese.map((m) => ({ label: m.label, ricavi: m.ricavi, gop: m.gop })),
  }
}

// ─── Dal ricavo al margine (usato da Profit trend) ──────────────────────────────

/**
 * Ponte dai ricavi al margine operativo: i tre reparti che portano ricavo, i costi
 * diretti che li erodono, i costi indistribuiti della struttura e ciò che resta.
 * Ogni barra parte dove finisce la precedente (`base` invisibile); l'ultima riparte
 * da zero perché è il risultato.
 */
export function pontePeL(d: FinanceData): PassoPonte[] {
  const somma = (f: (m: MeseFinance) => number) => d.mesi.reduce((s, m) => s + f(m), 0)
  const passi: PassoPonte[] = []
  let livello = 0
  const passo = (label: string, delta: number) => {
    if (delta >= 0) passi.push({ label, base: livello, delta })
    else passi.push({ label, base: livello + delta, delta: -delta })
    livello += delta
  }
  passo('Camere', somma((m) => m.ricaviCamere))
  passo('F&B', somma((m) => m.ricaviFb))
  passo('Altri', somma((m) => m.ricaviAltri))
  passo('Costi diretti', -somma((m) => m.costiDiretti))
  passo('Indistribuiti', -somma((m) => m.costiIndistribuiti))
  passi.push({ label: 'GOP', base: 0, delta: livello, totale: true })
  return passi
}

export interface ProfitKpi {
  gop: number
  gopPct: number
  gopLY: number
  deltaGop: number
  goppar: number
  /** Ricavo totale per camera disponibile. */
  trevpar: number
  /** Ricavo per camera venduta (tutti i reparti). */
  ricavoPerCamera: number
  /** Costo per camera venduta. */
  costoPerCamera: number
  /** Margine per camera venduta. */
  marginePerCamera: number
  /** Mesi chiusi in perdita. */
  mesiInPerdita: number
  /** Mese migliore e peggiore per margine. */
  migliore: MeseFinance | null
  peggiore: MeseFinance | null
  sparkGop: number[]
  sparkMargine: number[]
  sparkGoppar: number[]
}

export function computeProfit(d: FinanceData): ProfitKpi {
  const somma = (f: (m: MeseFinance) => number) => d.mesi.reduce((s, m) => s + f(m), 0)
  const ricavi = somma((m) => m.ricaviTotali)
  const costi = somma((m) => m.costiTotali)
  const gop = ricavi - costi
  const gopLY = somma((m) => m.gopLY)
  const camereDisp = somma((m) => m.camereDisponibili)
  const camereVendute = somma((m) => m.camereVendute)
  const ordinati = [...d.mesi].sort((a, b) => b.gop - a.gop)

  return {
    gop,
    gopPct: ricavi ? (gop / ricavi) * 100 : 0,
    gopLY,
    deltaGop: gopLY ? ((gop - gopLY) / gopLY) * 100 : 0,
    goppar: camereDisp ? gop / camereDisp : 0,
    trevpar: camereDisp ? ricavi / camereDisp : 0,
    ricavoPerCamera: camereVendute ? ricavi / camereVendute : 0,
    costoPerCamera: camereVendute ? costi / camereVendute : 0,
    marginePerCamera: camereVendute ? gop / camereVendute : 0,
    mesiInPerdita: d.mesi.filter((m) => m.gop < 0).length,
    migliore: ordinati[0] ?? null,
    peggiore: ordinati[ordinati.length - 1] ?? null,
    sparkGop: d.mesi.map((m) => m.gop),
    sparkMargine: d.mesi.map((m) => m.gopPct),
    sparkGoppar: d.mesi.map((m) => m.goppar),
  }
}

// ─── Costi (usato da Cost analysis) ─────────────────────────────────────────────
//  Tre letture dello stesso denaro, che rispondono a tre domande diverse:
//   • per FAMIGLIA (natura): su cosa si spende, quindi dove si può intervenire;
//   • per CENTRO DI COSTO (reparto): dove il costo è stato consumato e quanto pesa
//     sui ricavi che quel reparto porta;
//   • per CAMERA OCCUPATA: quanto costa davvero servire una camera, separando la
//     parte variabile da quella fissa (che nei mesi vuoti si concentra su poche
//     camere ed è la vera ragione dei mesi in perdita).

export interface CostoFamiglia {
  key: FamigliaCosto
  label: string
  /** Etichetta corta per le legende. */
  breve: string
  /** Etichetta di una parola per gli assi categoriali. */
  sigla: string
  valore: number
  budget: number
  /** Budget riparametrato sui volumi effettivi. */
  budgetFlex: number
  /** Consuntivo meno budget: positivo = si è speso più del previsto. */
  scostamento: number
  scostamentoPct: number
  /** Parte dello scostamento dovuta a volumi diversi dal budget. */
  effettoVolume: number
  /** Parte dello scostamento dovuta all'efficienza (a parità di volumi). */
  effettoEfficienza: number
  /** Effetto efficienza in quota sul budget flessibile (%). */
  effettoEfficienzaPct: number
  /** Quota sui costi totali (%). */
  quota: number
  /** Incidenza sui ricavi totali (%). */
  incidenza: number
  fisso: number
  variabile: number
}

export type CostoMese = Record<FamigliaCosto, number> & {
  mese: number
  label: string
  totale: number
  budget: number
  /** Costi su ricavi (%). */
  incidenza: number
  /** Costo variabile, fisso e totale per camera occupata. */
  perCameraVariabile: number
  perCameraFisso: number
  perCamera: number
  consuntivo: boolean
}

export interface CostoCentro {
  key: Reparto | 'indistribuiti'
  label: string
  valore: number
  /** Ricavi del centro (per gli indistribuiti: i ricavi totali). */
  ricavi: number
  /** Costo sui ricavi del centro (%). */
  incidenza: number
  /** Quota sui costi totali (%). */
  quota: number
}

export interface VoceCostoAnno extends VoceCostoMese {
  famiglia: FamigliaCosto
  /** Incidenza sui ricavi totali (%). */
  incidenza: number
  scostamento: number
  /** Scostamento a parità di volumi. */
  effettoEfficienza: number
}

export interface CostiKpi {
  costi: number
  costiLY: number
  deltaCosti: number
  budget: number
  /** Budget riparametrato sui volumi effettivi. */
  budgetFlex: number
  scostamento: number
  scostamentoPct: number
  /** Scomposizione dello scostamento: volumi diversi dal budget ed efficienza. */
  effettoVolume: number
  effettoEfficienza: number
  /** Costi su ricavi (%) e stesso indicatore dell'anno precedente. */
  incidenza: number
  incidenzaLY: number
  costoPersonale: number
  incidenzaPersonale: number
  /** Materie prime F&B sui ricavi F&B (%). */
  foodCostPct: number
  /** Energia e utenze sui ricavi totali (%). */
  energiaPct: number
  /** Costo totale per camera occupata. */
  costoPerCamera: number
  costiFissi: number
  costiVariabili: number
  fissiPct: number
  /** Voce con lo scostamento da budget più pesante. */
  vocePeggiore: VoceCostoAnno | null
  perMese: CostoMese[]
  perFamiglia: CostoFamiglia[]
  centri: CostoCentro[]
  voci: VoceCostoAnno[]
  sparkCosti: number[]
  sparkIncidenza: number[]
  sparkPersonale: number[]
  sparkFood: number[]
  sparkPerCamera: number[]
}

export function computeCosti(d: FinanceData): CostiKpi {
  const somma = (f: (m: MeseFinance) => number) => d.mesi.reduce((s, m) => s + f(m), 0)
  const voceMese = (m: MeseFinance, key: string) => m.costi.find((c) => c.key === key)?.valore ?? 0
  const famigliaMese = (m: MeseFinance, fam: FamigliaCosto) =>
    m.costi.filter((c) => famigliaDi(c.key) === fam).reduce((s, c) => s + c.valore, 0)

  const ricavi = somma((m) => m.ricaviTotali)
  const ricaviLY = somma((m) => m.ricaviLY)
  const ricaviFb = somma((m) => m.ricaviFb)
  const costi = somma((m) => m.costiTotali)
  // I costi dell'anno precedente si ricavano dal suo conto economico: ricavi meno
  // margine. Non serve un'altra serie di mock che potrebbe contraddire questa.
  const costiLY = ricaviLY - somma((m) => m.gopLY)
  const budget = somma((m) => m.costiBudget)
  const camereVendute = somma((m) => m.camereVendute)
  const costiFissi = somma((m) => m.costiFissi)
  const costiVariabili = somma((m) => m.costiVariabili)
  const personale = FAMIGLIE_COSTO[0].voci.reduce((s, k) => s + somma((m) => voceMese(m, k)), 0)
  const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0)

  const perMese: CostoMese[] = d.mesi.map((m) => {
    const perFam = FAMIGLIE_COSTO.reduce((acc, f) => {
      acc[f.key] = famigliaMese(m, f.key)
      return acc
    }, {} as Record<FamigliaCosto, number>)
    return {
      ...perFam,
      mese: m.mese,
      label: m.label,
      totale: m.costiTotali,
      budget: m.costiBudget,
      incidenza: pct(m.costiTotali, m.ricaviTotali),
      perCameraVariabile: m.camereVendute ? m.costiVariabili / m.camereVendute : 0,
      perCameraFisso: m.camereVendute ? m.costiFissi / m.camereVendute : 0,
      perCamera: m.camereVendute ? m.costiTotali / m.camereVendute : 0,
      consuntivo: m.consuntivo,
    }
  })

  const perFamiglia: CostoFamiglia[] = FAMIGLIE_COSTO.map((f) => {
    const sommaVoci = (campo: keyof VoceCostoMese) => f.voci.reduce(
      (s, k) => s + somma((m) => Number(m.costi.find((c) => c.key === k)?.[campo] ?? 0)),
      0,
    )
    const valore = somma((m) => famigliaMese(m, f.key))
    const bud = sommaVoci('budget')
    const flex = sommaVoci('budgetFlex')
    return {
      key: f.key,
      label: f.label,
      breve: f.breve,
      sigla: f.sigla,
      valore,
      budget: bud,
      budgetFlex: flex,
      scostamento: valore - bud,
      scostamentoPct: bud ? ((valore - bud) / bud) * 100 : 0,
      effettoVolume: flex - bud,
      effettoEfficienza: valore - flex,
      effettoEfficienzaPct: flex ? ((valore - flex) / flex) * 100 : 0,
      quota: pct(valore, costi),
      incidenza: pct(valore, ricavi),
      fisso: sommaVoci('fisso'),
      variabile: sommaVoci('variabile'),
    }
  })

  // Centri di costo: i tre reparti che generano ricavo più i costi indistribuiti,
  // che non appartengono a nessun reparto e si misurano sui ricavi totali.
  const centri: CostoCentro[] = [
    ...REPARTI.map(({ key, label }) => {
      const valore = somma((m) => m.costi.filter((c) => c.reparto === key).reduce((a, c) => a + c.valore, 0))
      const ricaviCentro = somma((m) => (key === 'camere' ? m.ricaviCamere : key === 'fb' ? m.ricaviFb : m.ricaviAltri))
      return {
        key: key as Reparto,
        label,
        valore,
        ricavi: ricaviCentro,
        incidenza: pct(valore, ricaviCentro),
        quota: pct(valore, costi),
      }
    }),
    {
      key: 'indistribuiti' as const,
      label: 'Costi indistribuiti',
      valore: somma((m) => m.costiIndistribuiti),
      ricavi,
      incidenza: pct(somma((m) => m.costiIndistribuiti), ricavi),
      quota: pct(somma((m) => m.costiIndistribuiti), costi),
    },
  ]

  const voci: VoceCostoAnno[] = d.costiPerNatura.map((c) => ({
    ...c,
    famiglia: famigliaDi(c.key),
    incidenza: pct(c.valore, ricavi),
    scostamento: c.valore - c.budget,
    effettoEfficienza: c.valore - c.budgetFlex,
  }))
  // "Peggiore" è la voce meno efficiente, non la più cresciuta: una voce che sale
  // perché si è venduto di più non è un problema da presidiare.
  const peggiori = [...voci].sort((a, b) => b.effettoEfficienza - a.effettoEfficienza)

  return {
    costi,
    costiLY,
    deltaCosti: costiLY ? ((costi - costiLY) / costiLY) * 100 : 0,
    budget,
    budgetFlex: somma((m) => m.costiBudgetFlex),
    scostamento: costi - budget,
    scostamentoPct: budget ? ((costi - budget) / budget) * 100 : 0,
    effettoVolume: somma((m) => m.costiBudgetFlex - m.costiBudget),
    effettoEfficienza: somma((m) => m.costiTotali - m.costiBudgetFlex),
    incidenza: pct(costi, ricavi),
    incidenzaLY: pct(costiLY, ricaviLY),
    costoPersonale: personale,
    incidenzaPersonale: pct(personale, ricavi),
    foodCostPct: pct(somma((m) => voceMese(m, 'food-cost')), ricaviFb),
    energiaPct: pct(somma((m) => voceMese(m, 'energia')), ricavi),
    costoPerCamera: camereVendute ? costi / camereVendute : 0,
    costiFissi,
    costiVariabili,
    fissiPct: pct(costiFissi, costi),
    vocePeggiore: peggiori[0] ?? null,
    perMese,
    perFamiglia,
    centri,
    voci,
    sparkCosti: d.mesi.map((m) => m.costiTotali),
    sparkIncidenza: perMese.map((m) => m.incidenza),
    sparkPersonale: d.mesi.map((m) => pct(
      FAMIGLIE_COSTO[0].voci.reduce((s, k) => s + voceMese(m, k), 0),
      m.ricaviTotali,
    )),
    sparkFood: d.mesi.map((m) => pct(voceMese(m, 'food-cost'), m.ricaviFb)),
    sparkPerCamera: perMese.map((m) => m.perCamera),
  }
}

// ─── Incassi e credito (usato da Incoming analysis) ─────────────────────────────
//  Il conto economico dice quanto si è fatturato, non quanto è rientrato. Qui il
//  ricavo si legge dal lato dell'incasso: per canale (chi paga subito e chi a 60
//  giorni), per metodo di pagamento, per anzianità del credito ancora aperto.
//
//  Il comportamento di pagamento è una proprietà del CANALE, non del cliente: il
//  diretto incassa alla partenza, l'OTA paga con virtual card a scadenza, il tour
//  operator e il corporate lavorano a fattura. È da qui che nascono DSO, crediti
//  aperti e insoluti.

export interface ProfiloIncasso {
  canale: string
  /** Quota del canale sul ricavo (allineata a `mixCanali` del ciclo revenue). */
  quota: number
  /** Giorni medi fra emissione e incasso, prima della normalizzazione sul DSO. */
  giorni: number
  /** Quota del credito che non rientra (%). */
  insolutoPct: number
  /** Come paga: quote per metodo di pagamento. */
  metodi: { metodo: string; quota: number }[]
}

export const PROFILI_INCASSO: ProfiloIncasso[] = [
  {
    canale: 'Vendita diretta', quota: 0.34, giorni: 2, insolutoPct: 0.2,
    metodi: [{ metodo: 'Carta di credito', quota: 0.62 }, { metodo: 'Contanti', quota: 0.22 }, { metodo: 'Bonifico', quota: 0.16 }],
  },
  {
    canale: 'OTA', quota: 0.29, giorni: 21, insolutoPct: 0.6,
    metodi: [{ metodo: 'Virtual card', quota: 0.7 }, { metodo: 'Portale prepagato', quota: 0.3 }],
  },
  {
    canale: 'Tour operator', quota: 0.16, giorni: 46, insolutoPct: 2.4,
    metodi: [{ metodo: 'Bonifico', quota: 1 }],
  },
  {
    canale: 'Corporate', quota: 0.13, giorni: 38, insolutoPct: 1.1,
    metodi: [{ metodo: 'Bonifico', quota: 0.85 }, { metodo: 'Carta di credito', quota: 0.15 }],
  },
  {
    canale: 'Gruppi', quota: 0.08, giorni: 30, insolutoPct: 1.8,
    metodi: [{ metodo: 'Bonifico', quota: 0.9 }, { metodo: 'Contanti', quota: 0.1 }],
  },
]

/** Metodi di pagamento nell'ordine degli slot categoriali. */
export const METODI_INCASSO = ['Carta di credito', 'Virtual card', 'Bonifico', 'Portale prepagato', 'Contanti']

/** Fasce di anzianità del credito, dalla più giovane alla più vecchia. */
export const FASCE_CREDITO = ['0-30 gg', '31-60 gg', '61-90 gg', 'oltre 90 gg']

/**
 * Ripartizione del credito di un canale nelle quattro fasce: più il canale paga
 * tardi, più il credito si sposta verso le fasce vecchie.
 */
function ripartizioneFasce(giorni: number): number[] {
  if (giorni <= 15) return [0.9, 0.07, 0.02, 0.01]
  if (giorni <= 30) return [0.72, 0.18, 0.07, 0.03]
  if (giorni <= 45) return [0.52, 0.29, 0.13, 0.06]
  return [0.4, 0.31, 0.18, 0.11]
}

export interface CanaleIncasso {
  canale: string
  /** Fatturato del canale nel periodo. */
  fatturato: number
  /** Quanto ne è già rientrato. */
  incassato: number
  /** Credito ancora aperto. */
  credito: number
  insoluti: number
  /** Giorni medi d'incasso del canale (normalizzati sul DSO della struttura). */
  giorni: number
  /** Quota sul fatturato totale (%). */
  quota: number
}

export interface MetodoIncasso {
  metodo: string
  incassato: number
  /** Quota sugli incassi (%). */
  quota: number
}

export interface FasciaCredito {
  label: string
  valore: number
  /** Quota sul credito aperto (%). */
  quota: number
}

export interface PartitaAperta {
  id: string
  cliente: string
  canale: string
  documento: string
  struttura: string
  importo: number
  /** Data di scadenza del pagamento. */
  scadenza: Date
  /** Giorni di ritardo (negativi = non ancora scaduta). */
  ritardo: number
  stato: 'in scadenza' | 'scaduta' | 'insoluta'
}

export interface MeseIncasso {
  mese: number
  label: string
  fatturato: number
  incassato: number
  /** Quota incassata del fatturato del mese (%). */
  incassatoPct: number
  credito: number
  consuntivo: boolean
}

export interface IncassiKpi {
  incassi: number
  fatturato: number
  /** Incassato sul fatturato (%). */
  incassatoPct: number
  credito: number
  insoluti: number
  /** Insoluti sul fatturato (%). */
  insolutiPct: number
  /** Tempo medio d'incasso, media dei canali pesata sul fatturato. */
  tempoMedio: number
  /** Credito nelle due fasce oltre i 60 giorni. */
  creditoVecchio: number
  perMese: MeseIncasso[]
  canali: CanaleIncasso[]
  metodi: MetodoIncasso[]
  fasce: FasciaCredito[]
  partite: PartitaAperta[]
  /** Canale col credito più lento. */
  canalePeggiore: CanaleIncasso | null
  sparkIncassi: number[]
  sparkIncassatoPct: number[]
  sparkCredito: number[]
}

/** Clienti a fattura per il dettaglio delle partite aperte. */
const CLIENTI_PARTITE: [string, string][] = [
  ['Booking.com', 'OTA'],
  ['Expedia', 'OTA'],
  ['Hotelbeds', 'Tour operator'],
  ['Alpitour', 'Tour operator'],
  ['TUI Italia', 'Tour operator'],
  ['ADP srl', 'Corporate'],
  ['Enel Energia spa', 'Corporate'],
  ['Studio Marino & Partners', 'Corporate'],
  ['Politecnico di Milano', 'Gruppi'],
  ['Coro Santa Cecilia', 'Gruppi'],
  ['Wedding Planner Aurora', 'Gruppi'],
  ['Sicily Incentive srl', 'Tour operator'],
  ['Gruppo Bancario Sud', 'Corporate'],
  ['Airbnb', 'OTA'],
  ['Congressi Mediterraneo', 'Gruppi'],
  ['Nord Incoming', 'Tour operator'],
]

export function computeIncassi(d: FinanceData): IncassiKpi {
  const somma = (f: (m: MeseFinance) => number) => d.mesi.reduce((s, m) => s + f(m), 0)
  const fatturato = somma((m) => m.ricaviTotali)
  const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0)

  // I giorni dei canali si normalizzano perché la loro media pesata coincida col DSO
  // della struttura: la stessa metrica non può valere 21 giorni qui e 24 in Cash flow.
  const mediaGrezza = PROFILI_INCASSO.reduce((s, p) => s + p.quota * p.giorni, 0)
  const correzione = mediaGrezza ? DSO / mediaGrezza : 1

  const canali: CanaleIncasso[] = PROFILI_INCASSO.map((p) => {
    const fattCanale = Math.round(fatturato * p.quota)
    const giorni = +(p.giorni * correzione).toFixed(1)
    // Credito aperto: quanto del fatturato annuo resta mediamente da incassare
    const credito = Math.round(fattCanale * (giorni / 365))
    const insoluti = Math.round(credito * (p.insolutoPct / 100) * 12)
    return {
      canale: p.canale,
      fatturato: fattCanale,
      incassato: fattCanale - credito,
      credito,
      insoluti,
      giorni,
      quota: +(p.quota * 100).toFixed(1),
    }
  })

  const credito = canali.reduce((s, c) => s + c.credito, 0)
  const insoluti = canali.reduce((s, c) => s + c.insoluti, 0)
  const incassi = fatturato - credito

  // Metodi di pagamento: l'incassato di ogni canale si spalma sui suoi metodi
  const perMetodo = new Map<string, number>()
  for (const p of PROFILI_INCASSO) {
    const incassatoCanale = canali.find((c) => c.canale === p.canale)?.incassato ?? 0
    for (const m of p.metodi) {
      perMetodo.set(m.metodo, (perMetodo.get(m.metodo) ?? 0) + Math.round(incassatoCanale * m.quota))
    }
  }
  const metodi: MetodoIncasso[] = METODI_INCASSO
    .map((metodo) => ({ metodo, incassato: perMetodo.get(metodo) ?? 0, quota: 0 }))
    .map((m) => ({ ...m, quota: pct(m.incassato, incassi) }))
    .sort((a, b) => b.incassato - a.incassato)

  // Anzianità: ogni canale porta il proprio credito nelle fasce che gli competono
  const valoriFasce = FASCE_CREDITO.map((_, i) => PROFILI_INCASSO.reduce((s, p) => {
    const c = canali.find((x) => x.canale === p.canale)
    return s + Math.round((c?.credito ?? 0) * ripartizioneFasce(c?.giorni ?? p.giorni)[i])
  }, 0))
  const fasce: FasciaCredito[] = FASCE_CREDITO.map((label, i) => ({
    label,
    valore: valoriFasce[i],
    quota: pct(valoriFasce[i], credito),
  }))

  // Andamento mensile: il fatturato del mese rientra in parte nel mese stesso, il
  // resto resta a credito (con la stessa logica di sfasamento della cassa).
  const quotaMese = Math.max(0, 1 - DSO / 30)
  const perMese: MeseIncasso[] = d.mesi.map((m, i) => {
    const precedente = i > 0 ? d.mesi[i - 1] : null
    const incassato = Math.round(
      m.ricaviTotali * quotaMese + (precedente ? precedente.ricaviTotali * (1 - quotaMese) : 0),
    )
    return {
      mese: m.mese,
      label: m.label,
      fatturato: m.ricaviTotali,
      incassato,
      incassatoPct: pct(incassato, m.ricaviTotali),
      credito: Math.max(0, m.ricaviTotali - incassato),
      consuntivo: m.consuntivo,
    }
  })

  // Partite aperte: elenco deterministico, ordinato dal ritardo più grave
  const oggi = d.aggiornatoAl
  const partite: PartitaAperta[] = CLIENTI_PARTITE.map(([cliente, canale], i) => {
    const profilo = PROFILI_INCASSO.find((p) => p.canale === canale) ?? PROFILI_INCASSO[0]
    const quotaCredito = canali.find((c) => c.canale === canale)?.credito ?? 0
    const importo = Math.round((quotaCredito / 4) * (0.35 + Math.abs(jitter(i * 17 + 3, 0.9))))
    // Il ritardo cresce col profilo del canale: chi paga a 60 giorni sfora più spesso
    const ritardo = Math.round(profilo.giorni * correzione * (0.2 + jitter(i * 23 + 5, 1.4)))
    const scadenza = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - ritardo)
    return {
      id: `p-${i}`,
      cliente,
      canale,
      documento: `FT ${2026}/${String(140 + i * 7).padStart(4, '0')}`,
      struttura: STRUTTURE[i % STRUTTURE.length].nome,
      importo,
      scadenza,
      ritardo,
      stato: (ritardo > 90 ? 'insoluta' : ritardo > 0 ? 'scaduta' : 'in scadenza') as PartitaAperta['stato'],
    }
  }).sort((a, b) => b.ritardo - a.ritardo)

  const perLentezza = [...canali].sort((a, b) => b.giorni - a.giorni)

  return {
    incassi,
    fatturato,
    incassatoPct: pct(incassi, fatturato),
    credito,
    insoluti,
    insolutiPct: pct(insoluti, fatturato),
    tempoMedio: +canali.reduce((s, c) => s + (c.fatturato / (fatturato || 1)) * c.giorni, 0).toFixed(1),
    creditoVecchio: valoriFasce[2] + valoriFasce[3],
    perMese,
    canali,
    metodi,
    fasce,
    partite,
    canalePeggiore: perLentezza[0] ?? null,
    sparkIncassi: perMese.map((m) => m.incassato),
    sparkIncassatoPct: perMese.map((m) => m.incassatoPct),
    sparkCredito: perMese.map((m) => m.credito),
  }
}
