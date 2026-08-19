// ─── DATI DI LAVORO CONDIVISI — area acquisti ───────────────────────────────────
//  Modello unico delle pagine BI degli acquisti (Purchasing overview, Fatturazione
//  passiva). È costruito SOPRA il conto economico condiviso di finance: la spesa
//  verso i fornitori di un mese sono i costi di quel mese che nascono da una fattura
//  passiva. Restano fuori il personale (che si paga in busta, non con fattura) e gli
//  ammortamenti (che non sono un acquisto del periodo): sono le due voci che il
//  ciclo passivo non vede, e tenerle dentro gonfierebbe il fatturato dei fornitori.
//
//  Il documento è il mattone: prima si generano le fatture — una per fornitore e per
//  mese, con termini di pagamento propri del fornitore — poi gli aggregati sono somme
//  di documenti. Così i totali di Purchasing overview e le righe di Fatturazione
//  passiva non possono divergere.
//
//  Tutto deterministico: stessi filtri → stessi numeri.
import {
  FAMIGLIE_COSTO, buildFinance, famigliaDi, type FamigliaCosto, type FinanceData,
} from '../../finance/_data/financeMock'
import { MESI, STRUTTURE, aggiornatoAl, jitter } from '../../sales/_data/revenueMock'

export { MESI, STRUTTURE }

/**
 * Famiglie di costo che generano una fattura passiva. Il personale e gli affitti con
 * gli ammortamenti (famiglia `struttura`) non passano dal ciclo passivo degli
 * acquisti: la prima è retribuzione, i secondi sono impegni pluriennali.
 */
const FAMIGLIE_FATTURABILI: FamigliaCosto[] = ['materie', 'distribuzione', 'energia', 'altri']

/** Categorie merceologiche di spesa: è il modo in cui l'ufficio acquisti ragiona. */
export type Categoria =
  | 'alimentari' | 'energia' | 'manutenzioni' | 'camera' | 'servizi' | 'marketing'

export const CATEGORIE: { key: Categoria; label: string; breve: string }[] = [
  { key: 'alimentari', label: 'Alimentari e bevande', breve: 'Alimentari' },
  { key: 'energia', label: 'Energia e utenze', breve: 'Energia' },
  { key: 'manutenzioni', label: 'Manutenzioni e impianti', breve: 'Manutenzioni' },
  { key: 'camera', label: 'Forniture camera e lavanderia', breve: 'Camera' },
  { key: 'servizi', label: 'Servizi esterni', breve: 'Servizi' },
  { key: 'marketing', label: 'Marketing e distribuzione', breve: 'Marketing' },
]

/**
 * Anagrafica fornitori: quota sulla spesa fatturabile, categoria e termini di
 * pagamento concordati. Le quote sommano a 1.
 */
interface Anagrafica {
  id: number
  nome: string
  categoria: Categoria
  quota: number
  /** Giorni di pagamento concordati con il fornitore. */
  termini: 30 | 60 | 90
}

const FORNITORI: Anagrafica[] = [
  { id: 1, nome: 'Marr Distribuzione', categoria: 'alimentari', quota: 0.155, termini: 60 },
  { id: 2, nome: 'Metro Italia', categoria: 'alimentari', quota: 0.092, termini: 30 },
  { id: 3, nome: 'Partesa Bevande', categoria: 'alimentari', quota: 0.068, termini: 60 },
  { id: 4, nome: 'Enel Energia', categoria: 'energia', quota: 0.128, termini: 30 },
  { id: 5, nome: 'Hera Comm Gas', categoria: 'energia', quota: 0.061, termini: 30 },
  { id: 6, nome: 'Termoidraulica Rossi', categoria: 'manutenzioni', quota: 0.072, termini: 60 },
  { id: 7, nome: 'Elettro Impianti Sud', categoria: 'manutenzioni', quota: 0.045, termini: 90 },
  { id: 8, nome: 'Hotel Supply Italia', categoria: 'camera', quota: 0.089, termini: 60 },
  { id: 9, nome: 'Lavanderia Aurora', categoria: 'camera', quota: 0.074, termini: 30 },
  { id: 10, nome: 'Vigilanza Aretusa', categoria: 'servizi', quota: 0.038, termini: 60 },
  { id: 11, nome: 'Green Care Giardini', categoria: 'servizi', quota: 0.029, termini: 60 },
  { id: 12, nome: 'Adv Republic', categoria: 'marketing', quota: 0.149, termini: 30 },
]

export type StatoFattura = 'pagata' | 'da pagare' | 'scaduta'

export interface FatturaPassiva {
  id: number
  /** Numero di registrazione in contabilità. */
  numero: string
  strutturaId: number
  struttura: string
  fornitoreId: number
  fornitore: string
  categoria: Categoria
  /** Imponibile del documento (negativo per le note di credito). */
  imponibile: number
  /** true per le note di credito (resi, abbuoni, rettifiche). */
  notaCredito: boolean
  emessa: Date
  scadenza: Date
  /**
   * Giorni che mancano alla scadenza alla data di analisi: negativo se la scadenza è
   * già passata. Per i documenti pagati è il tempo che restava al pagamento.
   */
  giorniAllaScadenza: number
  stato: StatoFattura
  pagata: Date | null
}

export interface MeseAcquisti {
  /** 1-12 */
  mese: number
  label: string
  /** Mese già consuntivato. */
  consuntivo: boolean
  /** Fatturazione passiva del mese (note di credito già sottratte). */
  spesa: number
  /** Fatturazione passiva dello stesso mese dell'anno precedente. */
  spesaLY: number
  /** Numero di fatture del mese. */
  fatture: number
  /** Numero di note di credito del mese. */
  noteCredito: number
}

export interface VoceAcquisti {
  key: string
  label: string
  spesa: number
  spesaLY: number
  /** Quota sulla spesa del periodo (%). */
  quota: number
  /** Documenti emessi nel periodo. */
  documenti: number
  /** Esposizione ancora aperta (fatture non pagate). */
  aperto: number
}

export interface PurchasingData {
  strutture: { id: number; nome: string }[]
  strutturaId: number | null
  anno: number
  /** Ultimo mese consuntivato (0 = anno tutto da fare, 12 = anno chiuso). */
  ultimoMeseConsuntivo: number
  mesi: MeseAcquisti[]
  fatture: FatturaPassiva[]
  fornitori: VoceAcquisti[]
  categorie: VoceAcquisti[]
  perStruttura: VoceAcquisti[]
  /** Ricavi dell'anno: servono all'incidenza degli acquisti. */
  ricaviAnno: number
  /** Giorni medi di pagamento concordati, pesati sulla spesa. */
  terminiMedi: number
  aggiornatoAl: Date
}

/** Data senza ora, per fare differenze in giorni senza sorprese. */
function giorno(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function giorniFra(a: Date, b: Date): number {
  return Math.round((giorno(b).getTime() - giorno(a).getTime()) / 86_400_000)
}

/** L'anno degli acquisti: documenti, aggregati e anagrafiche della selezione. */
export function buildPurchasing(
  anno: number,
  strutturaId: number | null,
  oggi = new Date(),
): PurchasingData {
  const oggi0 = giorno(oggi)
  const fin: FinanceData = buildFinance(anno, strutturaId, oggi)
  const strutture = strutturaId === null ? STRUTTURE : STRUTTURE.filter((s) => s.id === strutturaId)
  const camereTotali = strutture.reduce((s, x) => s + x.camere, 0) || 1

  const fatture: FatturaPassiva[] = []
  let progressivo = 0

  const mesi: MeseAcquisti[] = fin.mesi.map((m) => {
    // Spesa fatturabile del mese: i costi che nascono da una fattura passiva
    const fatturabile = m.costi
      .filter((c) => FAMIGLIE_FATTURABILI.includes(famigliaDi(c.key)))
      .reduce((s, c) => s + c.valore, 0)
    // Gli acquisti dell'anno precedente seguono i ricavi, ma con meno elasticità:
    // una parte della spesa è impegnata a prescindere dai volumi.
    const spintaRicavi = m.ricaviLY ? m.ricaviTotali / m.ricaviLY : 1
    const fatturabileLY = Math.round(fatturabile / (1 + (spintaRicavi - 1) * 0.7))

    for (const f of FORNITORI) {
      const seed = m.mese * 97 + f.id * 13 + (strutturaId ?? 0)
      const importoMese = fatturabile * f.quota * (1 + jitter(seed, 0.09))
      // Il documento è emesso da UNA struttura: si assegna in proporzione alle camere,
      // così il ranking delle strutture pesa quanto la struttura consuma davvero.
      for (const s of strutture) {
        const quotaStruttura = s.camere / camereTotali
        const imponibile = Math.round(importoMese * quotaStruttura)
        if (imponibile <= 0) continue

        const emessa = new Date(anno, m.mese - 1, Math.min(28, 4 + ((f.id * 3 + s.id) % 20)))
        const scadenza = new Date(emessa.getFullYear(), emessa.getMonth(), emessa.getDate() + f.termini)
        const giorniAllaScadenza = giorniFra(oggi0, scadenza)
        // Pagato quando la scadenza è passata, tranne una quota di ritardatarie che
        // resta scaduta: è la parte che il controllo di gestione deve vedere.
        const inRitardo = jitter(seed + 5, 1) > 0.72
        const stato: StatoFattura = giorniAllaScadenza < 0
          ? (inRitardo ? 'scaduta' : 'pagata')
          : 'da pagare'
        progressivo += 1

        fatture.push({
          id: progressivo,
          numero: `${anno}/${String(progressivo).padStart(5, '0')}`,
          strutturaId: s.id,
          struttura: s.nome,
          fornitoreId: f.id,
          fornitore: f.nome,
          categoria: f.categoria,
          imponibile,
          notaCredito: false,
          emessa,
          scadenza,
          giorniAllaScadenza,
          stato,
          pagata: stato === 'pagata'
            ? new Date(scadenza.getFullYear(), scadenza.getMonth(), scadenza.getDate() - Math.round(2 + jitter(seed + 11, 3)))
            : null,
        })

        // Note di credito: una ogni tanto, deterministicamente, sulla stessa fattura
        // (reso merce, abbuono, rettifica di prezzo).
        if (jitter(seed + 23, 1) > 0.86) {
          progressivo += 1
          const valore = -Math.round(imponibile * (0.04 + Math.abs(jitter(seed + 29, 0.05))))
          fatture.push({
            id: progressivo,
            numero: `${anno}/NC${String(progressivo).padStart(4, '0')}`,
            strutturaId: s.id,
            struttura: s.nome,
            fornitoreId: f.id,
            fornitore: f.nome,
            categoria: f.categoria,
            imponibile: valore,
            notaCredito: true,
            emessa: new Date(emessa.getFullYear(), emessa.getMonth(), Math.min(28, emessa.getDate() + 6)),
            scadenza,
            giorniAllaScadenza,
            // Una nota di credito non si paga: compensa. Si considera chiusa.
            stato: 'pagata',
            pagata: new Date(emessa.getFullYear(), emessa.getMonth(), Math.min(28, emessa.getDate() + 6)),
          })
        }
      }
    }

    const delMese = fatture.filter((f) => f.emessa.getMonth() + 1 === m.mese)
    return {
      mese: m.mese,
      label: MESI[m.mese - 1].slice(0, 3),
      consuntivo: m.consuntivo,
      spesa: delMese.reduce((s, f) => s + f.imponibile, 0),
      spesaLY: fatturabileLY,
      fatture: delMese.filter((f) => !f.notaCredito).length,
      noteCredito: delMese.filter((f) => f.notaCredito).length,
    }
  })

  const spesaTotale = mesi.reduce((s, m) => s + m.spesa, 0)
  const spesaLyTotale = mesi.reduce((s, m) => s + m.spesaLY, 0)

  /** Aggregato di un insieme di documenti su una chiave. */
  const raggruppa = (
    chiave: (f: FatturaPassiva) => string,
    etichetta: (k: string) => string,
    quotaLy: (k: string) => number,
  ): VoceAcquisti[] => {
    const mappa = new Map<string, VoceAcquisti>()
    for (const f of fatture) {
      const k = chiave(f)
      const voce = mappa.get(k) ?? {
        key: k, label: etichetta(k), spesa: 0, spesaLY: 0, quota: 0, documenti: 0, aperto: 0,
      }
      voce.spesa += f.imponibile
      voce.documenti += 1
      if (f.stato !== 'pagata') voce.aperto += f.imponibile
      mappa.set(k, voce)
    }
    return Array.from(mappa.values())
      .map((v) => ({
        ...v,
        spesaLY: Math.round(spesaLyTotale * quotaLy(v.key)),
        quota: spesaTotale ? +((v.spesa / spesaTotale) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.spesa - a.spesa)
  }

  const quotaFornitoreLy = (k: string) => {
    const f = FORNITORI.find((x) => String(x.id) === k)
    // Le quote dell'anno precedente sono diverse: il portafoglio fornitori si muove.
    return f ? f.quota * (1 + jitter(f.id * 31, 0.12)) : 0
  }

  const fornitori = raggruppa(
    (f) => String(f.fornitoreId),
    (k) => FORNITORI.find((x) => String(x.id) === k)?.nome ?? k,
    quotaFornitoreLy,
  )
  const categorie = raggruppa(
    (f) => f.categoria,
    (k) => CATEGORIE.find((c) => c.key === k)?.breve ?? k,
    (k) => FORNITORI.filter((x) => x.categoria === k).reduce((s, x) => s + quotaFornitoreLy(String(x.id)), 0),
  )
  const perStruttura = raggruppa(
    (f) => String(f.strutturaId),
    (k) => STRUTTURE.find((s) => String(s.id) === k)?.nome ?? k,
    (k) => (STRUTTURE.find((s) => String(s.id) === k)?.camere ?? 0) / camereTotali,
  )

  const terminiMedi = FORNITORI.reduce((s, f) => s + f.termini * f.quota, 0)

  return {
    strutture: STRUTTURE.map((s) => ({ id: s.id, nome: s.nome })),
    strutturaId,
    anno: fin.anno,
    ultimoMeseConsuntivo: fin.ultimoMeseConsuntivo,
    mesi,
    fatture,
    fornitori,
    categorie,
    perStruttura,
    ricaviAnno: fin.mesi.reduce((s, m) => s + m.ricaviTotali, 0),
    terminiMedi: Math.round(terminiMedi),
    aggiornatoAl: aggiornatoAl(oggi),
  }
}

// ─── Indicatori della panoramica ────────────────────────────────────────────────

export interface PurchasingKpi {
  spesa: number
  spesaLY: number
  deltaSpesa: number
  /** Fornitori con almeno un documento nel periodo. */
  fornitoriAttivi: number
  fatture: number
  noteCredito: number
  valoreNoteCredito: number
  /** Peso degli acquisti sui ricavi: è il numero che dice se la spesa è sostenibile. */
  incidenza: number
  /** Quota di spesa concentrata sui primi tre fornitori. */
  concentrazione: number
  sparkSpesa: number[]
  sparkFatture: number[]
}

/** Indicatori del periodo: solo mesi chiusi se ce ne sono, altrimenti l'anno. */
export function computePurchasingKpi(d: PurchasingData): PurchasingKpi {
  const chiusi = d.mesi.filter((m) => m.consuntivo)
  const base = chiusi.length ? chiusi : d.mesi
  const finoA = base[base.length - 1]?.mese ?? 12
  const documenti = d.fatture.filter((f) => f.emessa.getMonth() + 1 <= finoA)

  const spesa = base.reduce((s, m) => s + m.spesa, 0)
  const spesaLY = base.reduce((s, m) => s + m.spesaLY, 0)
  const note = documenti.filter((f) => f.notaCredito)
  const perFornitore = new Map<number, number>()
  for (const f of documenti) perFornitore.set(f.fornitoreId, (perFornitore.get(f.fornitoreId) ?? 0) + f.imponibile)
  const primiTre = Array.from(perFornitore.values()).sort((a, b) => b - a).slice(0, 3).reduce((s, v) => s + v, 0)
  // I ricavi dello stesso periodo: la spesa si confronta con quello che ha prodotto
  const quotaAnno = d.mesi.length ? base.length / d.mesi.length : 1

  return {
    spesa,
    spesaLY,
    deltaSpesa: spesaLY ? ((spesa - spesaLY) / spesaLY) * 100 : 0,
    fornitoriAttivi: perFornitore.size,
    fatture: documenti.filter((f) => !f.notaCredito).length,
    noteCredito: note.length,
    valoreNoteCredito: note.reduce((s, f) => s + f.imponibile, 0),
    incidenza: d.ricaviAnno ? (spesa / (d.ricaviAnno * quotaAnno)) * 100 : 0,
    concentrazione: spesa ? (primiTre / spesa) * 100 : 0,
    sparkSpesa: base.map((m) => m.spesa),
    sparkFatture: base.map((m) => m.fatture),
  }
}

// ─── Indicatori del ciclo passivo ───────────────────────────────────────────────

export const FASCE_SCADENZA = ['Scadute', '0-30 gg', '31-60 gg', 'oltre 60 gg'] as const

export interface FasciaScadenza {
  label: string
  /** Importo aperto nella fascia. */
  valore: number
  documenti: number
}

export interface FatturePassiveKpi {
  /** Fatturazione passiva del periodo (note di credito sottratte). */
  totale: number
  pagato: number
  /** Quota pagata sul totale. */
  pagatoPct: number
  aperto: number
  scaduto: number
  documenti: number
  documentiAperti: number
  /** Giorni medi effettivi di pagamento (DPO reale sui documenti pagati). */
  giorniMediPagamento: number
  /** Termini medi concordati: il confronto dice se si paga prima o dopo il dovuto. */
  terminiMedi: number
  fasce: FasciaScadenza[]
  /** Fornitori con la maggiore esposizione aperta. */
  esposizione: VoceAcquisti[]
}

/** Il ciclo passivo alla data di analisi: pagato, aperto, scaduto e scadenzario. */
export function computeFatturePassiveKpi(d: PurchasingData): FatturePassiveKpi {
  const documenti = d.fatture
  const totale = documenti.reduce((s, f) => s + f.imponibile, 0)
  const pagate = documenti.filter((f) => f.stato === 'pagata')
  const aperte = documenti.filter((f) => f.stato !== 'pagata')
  const scadute = documenti.filter((f) => f.stato === 'scaduta')

  const pagato = pagate.reduce((s, f) => s + f.imponibile, 0)
  // DPO reale: giorni fra emissione e pagamento, pesati sull'importo
  const pesato = pagate.reduce((a, f) => {
    if (!f.pagata) return a
    const giorni = Math.max(0, Math.round((f.pagata.getTime() - f.emessa.getTime()) / 86_400_000))
    return { g: a.g + giorni * Math.abs(f.imponibile), v: a.v + Math.abs(f.imponibile) }
  }, { g: 0, v: 0 })

  const fascia = (f: FatturaPassiva): typeof FASCE_SCADENZA[number] =>
    f.stato === 'scaduta' ? 'Scadute'
      : f.giorniAllaScadenza <= 30 ? '0-30 gg'
        : f.giorniAllaScadenza <= 60 ? '31-60 gg'
          : 'oltre 60 gg'

  const fasce: FasciaScadenza[] = FASCE_SCADENZA.map((label) => {
    const dentro = aperte.filter((f) => fascia(f) === label)
    return { label, valore: dentro.reduce((s, f) => s + f.imponibile, 0), documenti: dentro.length }
  })

  const perFornitore = new Map<string, VoceAcquisti>()
  for (const f of aperte) {
    const voce = perFornitore.get(f.fornitore) ?? {
      key: f.fornitore, label: f.fornitore, spesa: 0, spesaLY: 0, quota: 0, documenti: 0, aperto: 0,
    }
    voce.aperto += f.imponibile
    voce.documenti += 1
    perFornitore.set(f.fornitore, voce)
  }
  const apertoTotale = aperte.reduce((s, f) => s + f.imponibile, 0)

  return {
    totale,
    pagato,
    pagatoPct: totale ? (pagato / totale) * 100 : 0,
    aperto: apertoTotale,
    scaduto: scadute.reduce((s, f) => s + f.imponibile, 0),
    documenti: documenti.length,
    documentiAperti: aperte.length,
    giorniMediPagamento: pesato.v ? Math.round(pesato.g / pesato.v) : 0,
    terminiMedi: d.terminiMedi,
    fasce,
    esposizione: Array.from(perFornitore.values())
      .map((v) => ({ ...v, quota: apertoTotale ? +((v.aperto / apertoTotale) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.aperto - a.aperto),
  }
}

/** Famiglie di costo escluse dal ciclo passivo, per il piede delle card. */
export const FAMIGLIE_ESCLUSE = FAMIGLIE_COSTO
  .filter((f) => !FAMIGLIE_FATTURABILI.includes(f.key))
  .map((f) => f.breve)
