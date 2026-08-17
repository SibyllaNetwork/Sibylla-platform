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
}

const COSTI: VoceCosto[] = [
  // Reparto camere
  { key: 'personale-camere', label: 'Personale camere', reparto: 'camere', quota: 0.175, variabile: 0.45 },
  { key: 'lavanderia', label: 'Lavanderia e consumabili', reparto: 'camere', quota: 0.055, variabile: 1 },
  { key: 'commissioni', label: 'Commissioni e OTA', reparto: 'camere', quota: 0.082, variabile: 1 },
  { key: 'altri-camere', label: 'Altri costi camere', reparto: 'camere', quota: 0.028, variabile: 0.6 },
  // Reparto food & beverage
  { key: 'food-cost', label: 'Materie prime F&B', reparto: 'fb', quota: 0.3, variabile: 1 },
  { key: 'personale-fb', label: 'Personale F&B', reparto: 'fb', quota: 0.315, variabile: 0.5 },
  { key: 'altri-fb', label: 'Altri costi F&B', reparto: 'fb', quota: 0.06, variabile: 0.7 },
  // Altri ricavi
  { key: 'costi-altri', label: 'Costi altri servizi', reparto: 'altri', quota: 0.4, variabile: 0.8 },
  // Costi indistribuiti (sul ricavo totale)
  { key: 'amministrazione', label: 'Amministrazione', quota: 0.068, variabile: 0.1 },
  { key: 'marketing', label: 'Marketing e distribuzione', quota: 0.042, variabile: 0.3 },
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
}

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
  costi: VoceCostoMese[]
  costiDiretti: number
  costiIndistribuiti: number
  costiStruttura: number
  costiTotali: number
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

  const mesi: MeseFinance[] = []
  let saldo = 0

  for (let m = 1; m <= 12; m++) {
    const giorni = buildGiorniMese(anno, m, strutturaId, oggi)
    const nGiorni = giorniDelMese(anno, m)
    const camereDisp = disponibiliGiorno * nGiorni
    const camereVendute = giorni.reduce((s, d) => s + d.camere, 0)
    const ricaviCamere = giorni.reduce((s, d) => s + d.ricavi, 0)
    const ricaviCamereLY = giorni.reduce((s, d) => s + d.ricaviLY, 0)
    const adr = camereVendute ? ricaviCamere / camereVendute : 0

    // F&B e altri ricavi seguono i volumi camere, con un po' di stagionalità propria
    const ricaviFb = Math.round(ricaviCamere * QUOTA_FB * (1 + jitter(m + 61, 0.06)))
    const ricaviAltri = Math.round(ricaviCamere * QUOTA_ALTRI * (1 + jitter(m + 71, 0.1)))
    const ricaviTotali = ricaviCamere + ricaviFb + ricaviAltri
    const ricaviLY = Math.round((ricaviCamereLY) * (1 + QUOTA_FB + QUOTA_ALTRI) * 0.98)

    const ricavoDi = (r?: Reparto) =>
      r === 'camere' ? ricaviCamere : r === 'fb' ? ricaviFb : r === 'altri' ? ricaviAltri : ricaviTotali

    const costi: VoceCostoMese[] = COSTI.map((c) => {
      const valore = Math.round(ricavoDi(c.reparto) * c.quota * (1 + jitter(m * 13 + c.key.length, 0.04)))
      return {
        key: c.key,
        label: c.label,
        reparto: c.reparto,
        valore,
        variabile: Math.round(valore * c.variabile),
        fisso: Math.round(valore * (1 - c.variabile)),
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
    })

    const costiDiretti = costi.filter((c) => c.reparto).reduce((s, c) => s + c.valore, 0)
    const costiIndistribuiti = costi.filter((c) => !c.reparto).reduce((s, c) => s + c.valore, 0)
    const costiTotali = costiDiretti + costiIndistribuiti
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
      camereDisponibili: camereDisp,
      camereVendute,
      occ: camereDisp ? +((camereVendute / camereDisp) * 100).toFixed(1) : 0,
      adr,
      ricaviCamere,
      ricaviFb,
      ricaviAltri,
      ricaviTotali,
      ricaviLY,
      costi,
      costiDiretti,
      costiIndistribuiti,
      costiStruttura,
      costiTotali,
      costiFissi,
      costiVariabili,
      cvu: camereVendute ? costiVariabili / camereVendute : 0,
      contribuzione: ricaviTotali - costiVariabili,
      gop,
      gopPct: ricaviTotali ? (gop / ricaviTotali) * 100 : 0,
      goppar: camereDisp ? gop / camereDisp : 0,
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
