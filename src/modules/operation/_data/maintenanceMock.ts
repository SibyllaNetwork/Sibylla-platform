// ─── DATI DI LAVORO CONDIVISI — manutenzione ────────────────────────────────────
//  Modello degli interventi tecnici (Maintenance analysis), costruito SOPRA le serie
//  del ciclo revenue (`sales/_data/revenueMock`): gli interventi seguono le camere
//  occupate (più passaggi, più guasti) e le camere fuori servizio si traducono in
//  notti perse e ricavo mancato all'ADR del mese. Così la manutenzione parla la
//  stessa lingua delle pagine di revenue invece di essere un mondo a parte.
//
//  Tutto deterministico: stessi filtri → stessi numeri.
import {
  MESI, STRUTTURE, aggiornatoAl, buildGiorniMese, camereDisponibili, giorniDelMese,
  jitter,
} from '../../sales/_data/revenueMock'

export { MESI, STRUTTURE }

// ─── Tipologie e priorità ───────────────────────────────────────────────────────

/**
 * Tipologie d'intervento: quota sul totale, durata media di lavorazione e costo
 * medio (materiali + manodopera esterna).
 */
export const TIPOLOGIE_INTERVENTO: {
  key: string
  label: string
  /** Etichetta di una parola per gli assi categoriali. */
  sigla: string
  quota: number
  oreMedie: number
  costoMedio: number
}[] = [
  { key: 'idraulico', label: 'Idraulico e sanitari', sigla: 'Idraulico', quota: 0.22, oreMedie: 3.2, costoMedio: 180 },
  { key: 'arredi', label: 'Arredi e finiture', sigla: 'Arredi', quota: 0.18, oreMedie: 5.5, costoMedio: 240 },
  { key: 'elettrico', label: 'Impianto elettrico', sigla: 'Elettrico', quota: 0.16, oreMedie: 2.4, costoMedio: 150 },
  { key: 'clima', label: 'Climatizzazione', sigla: 'Clima', quota: 0.14, oreMedie: 4.6, costoMedio: 320 },
  { key: 'rete', label: 'TV, rete e domotica', sigla: 'Rete', quota: 0.12, oreMedie: 1.8, costoMedio: 90 },
  { key: 'sicurezza', label: 'Serrature e sicurezza', sigla: 'Serrature', quota: 0.08, oreMedie: 1.2, costoMedio: 70 },
  { key: 'altro', label: 'Altri interventi', sigla: 'Altri', quota: 0.1, oreMedie: 2, costoMedio: 110 },
]

/** Priorità con il rispettivo tempo massimo di presa in carico (SLA). */
export const PRIORITA_INTERVENTO: {
  key: string
  label: string
  /** Ore entro cui l'intervento va chiuso. */
  slaOre: number
  quota: number
  /** Quota che rispetta lo SLA (le urgenze si presidiano meglio). */
  rispetto: number
}[] = [
  { key: 'urgente', label: 'Urgente', slaOre: 4, quota: 0.13, rispetto: 0.94 },
  { key: 'alta', label: 'Alta', slaOre: 24, quota: 0.29, rispetto: 0.88 },
  { key: 'normale', label: 'Normale', slaOre: 72, quota: 0.43, rispetto: 0.81 },
  { key: 'programmata', label: 'Programmata', slaOre: 168, quota: 0.15, rispetto: 0.72 },
]

/** Un intervento ogni quante camere occupate. */
const CAMERE_PER_INTERVENTO = 46

/** Quota di camere fuori servizio sulle disponibili (bassa stagione = più lavori). */
const OOO_BASE = 0.018

// ─── Modello mensile ────────────────────────────────────────────────────────────

export interface MeseManutenzione {
  mese: number
  label: string
  /** Interventi segnalati nel mese. */
  aperti: number
  /** Interventi chiusi nel mese. */
  chiusi: number
  /** Interventi ancora aperti a fine mese (arretrato). */
  arretrato: number
  /** Camere fuori servizio, media giornaliera. */
  ooo: number
  /** Notti di camera perse per fuori servizio. */
  nottiPerse: number
  /** Ricavo mancato: notti perse all'ADR del mese. */
  ricavoPerso: number
  /** Costo degli interventi chiusi nel mese. */
  costo: number
  /** Tempo medio di chiusura, in ore. */
  tempoMedio: number
  consuntivo: boolean
}

export interface TipologiaManutenzione {
  key: string
  label: string
  sigla: string
  interventi: number
  ore: number
  costo: number
  /** Quota sul costo totale (%). */
  quotaCosto: number
  /** Tempo medio di chiusura della tipologia, in ore. */
  tempoMedio: number
}

export interface SlaPriorita {
  key: string
  label: string
  slaOre: number
  interventi: number
  /** Interventi chiusi entro lo SLA. */
  entroSla: number
  /** Rispetto dello SLA (%). */
  pct: number
}

export interface InterventoRiga {
  id: string
  data: Date
  struttura: string
  /** Camera o area della struttura. */
  area: string
  tipologia: string
  priorita: string
  tecnico: string
  stato: 'aperto' | 'in corso' | 'chiuso'
  /** Ore trascorse (aperti) o impiegate (chiusi). */
  ore: number
}

export interface ManutenzioneData {
  strutture: { id: number; nome: string }[]
  strutturaId: number | null
  anno: number
  perMese: MeseManutenzione[]
  tipologie: TipologiaManutenzione[]
  sla: SlaPriorita[]
  righe: InterventoRiga[]
  aggiornatoAl: Date
}

export interface ManutenzioneKpi {
  /** Interventi ancora aperti alla data di analisi. */
  aperti: number
  interventi: number
  /** Tempo medio di chiusura, in ore. */
  tempoMedio: number
  /** Camere fuori servizio, media dell'anno. */
  ooo: number
  nottiPerse: number
  costo: number
  ricavoPerso: number
  /** Rispetto complessivo dello SLA (%). */
  slaPct: number
  /** Tipologia col costo più alto. */
  tipologiaPesante: TipologiaManutenzione | null
  /** Priorità col rispetto SLA peggiore. */
  slaPeggiore: SlaPriorita | null
  sparkAperti: number[]
  sparkTempo: number[]
  sparkOoo: number[]
  sparkCosto: number[]
  sparkRicavoPerso: number[]
}

const TECNICI = ['Rossi M.', 'Bianchi L.', 'Ferrara G.', 'Costa A.', 'Esterno · ClimaService', 'Esterno · Idro2000']

const AREE = [
  'Camera 112', 'Camera 214', 'Suite 301', 'Camera 118', 'Camera 405', 'Junior suite 208',
  'Cucina', 'Piscina', 'Ascensore B', 'Sala colazioni', 'Camera 322', 'Lavanderia',
  'Camera 231', 'Reception', 'Camera 507', 'Palestra', 'Camera 129', 'Terrazza',
]

export function buildManutenzione(
  anno: number,
  strutturaId: number | null,
  oggi = new Date(),
): ManutenzioneData {
  const disponibiliGiorno = camereDisponibili(strutturaId)
  const ultimoMeseConsuntivo = anno < oggi.getFullYear() ? 12
    : anno > oggi.getFullYear() ? 0
      : oggi.getMonth() + 1

  const perMese: MeseManutenzione[] = []
  let arretrato = 0

  for (let m = 1; m <= 12; m++) {
    const giorni = buildGiorniMese(anno, m, strutturaId, oggi)
    const nGiorni = giorniDelMese(anno, m)
    const camereVendute = giorni.reduce((s, d) => s + d.camere, 0)
    const ricavi = giorni.reduce((s, d) => s + d.ricavi, 0)
    const adr = camereVendute ? ricavi / camereVendute : 0
    const occ = disponibiliGiorno * nGiorni ? camereVendute / (disponibiliGiorno * nGiorni) : 0

    // Gli interventi seguono i passaggi in camera, con una base fissa di manutenzione
    // programmata che non dipende dall'occupazione.
    const aperti = Math.max(
      0,
      Math.round(camereVendute / CAMERE_PER_INTERVENTO + disponibiliGiorno * 0.09 * (1 + jitter(m * 11, 0.18))),
    )
    // Nei mesi pieni si chiude meno di quanto entra: l'arretrato cresce d'estate e si
    // recupera in bassa stagione, quando i tecnici hanno camere libere su cui lavorare.
    const capacita = 1.06 - occ * 0.22
    const chiusi = Math.max(0, Math.min(aperti + arretrato, Math.round(aperti * capacita)))
    arretrato = Math.max(0, arretrato + aperti - chiusi)

    // Fuori servizio: più lavori dove c'è spazio, quindi in bassa stagione
    const ooo = +(disponibiliGiorno * OOO_BASE * (1.5 - occ) * (1 + jitter(m * 17 + 3, 0.2))).toFixed(1)
    const nottiPerse = Math.round(ooo * nGiorni)
    // Il tempo di chiusura si allunga quando l'arretrato è alto
    const tempoMedio = +(9 + (arretrato / Math.max(1, aperti)) * 14 + jitter(m * 7 + 5, 1.4)).toFixed(1)
    const costoMedio = TIPOLOGIE_INTERVENTO.reduce((s, t) => s + t.quota * t.costoMedio, 0)

    perMese.push({
      mese: m,
      label: MESI[m - 1].slice(0, 3),
      aperti,
      chiusi,
      arretrato,
      ooo,
      nottiPerse,
      // Il ricavo perso si valorizza all'ADR del mese: una camera ferma in agosto
      // costa più di una camera ferma in novembre.
      ricavoPerso: Math.round(nottiPerse * adr),
      costo: Math.round(chiusi * costoMedio * (1 + jitter(m * 13 + 7, 0.08))),
      tempoMedio,
      consuntivo: m <= ultimoMeseConsuntivo,
    })
  }

  const interventiAnno = perMese.reduce((s, m) => s + m.aperti, 0)
  const costoAnno = perMese.reduce((s, m) => s + m.costo, 0)

  const tipologie: TipologiaManutenzione[] = TIPOLOGIE_INTERVENTO.map((t) => {
    const interventi = Math.round(interventiAnno * t.quota)
    const costo = Math.round(interventi * t.costoMedio)
    return {
      key: t.key,
      label: t.label,
      sigla: t.sigla,
      interventi,
      ore: Math.round(interventi * t.oreMedie),
      costo,
      quotaCosto: 0,
      tempoMedio: t.oreMedie,
    }
  }).map((t) => ({ ...t, quotaCosto: costoAnno ? (t.costo / costoAnno) * 100 : 0 }))
    .sort((a, b) => b.costo - a.costo)

  const sla: SlaPriorita[] = PRIORITA_INTERVENTO.map((p) => {
    const interventi = Math.round(interventiAnno * p.quota)
    const entroSla = Math.round(interventi * p.rispetto)
    return {
      key: p.key,
      label: p.label,
      slaOre: p.slaOre,
      interventi,
      entroSla,
      pct: interventi ? (entroSla / interventi) * 100 : 0,
    }
  })

  // Elenco degli interventi recenti: deterministico, dal più vecchio ancora aperto
  const righe: InterventoRiga[] = AREE.map((area, i) => {
    // Passi diversi per tipologia, priorità e stato: con lo stesso modulo gli aperti
    // finirebbero tutti sulla stessa tipologia e l'elenco sembrerebbe finto.
    const tipologia = TIPOLOGIE_INTERVENTO[(i * 5) % TIPOLOGIE_INTERVENTO.length]
    // La priorità NON si ricava da un modulo dell'indice: con quattro priorità e uno
    // stato che dipende da i % 4 tutti gli aperti finirebbero sulla stessa priorità.
    const priorita = PRIORITA_INTERVENTO[
      Math.floor(Math.abs(jitter(i * 13 + 3, 0.999)) * PRIORITA_INTERVENTO.length)
    ]
    const stato: InterventoRiga['stato'] = i % 4 === 0 ? 'aperto' : i % 3 === 0 ? 'in corso' : 'chiuso'
    const giorniIndietro = Math.round(1 + Math.abs(jitter(i * 19 + 5, 12)))
    return {
      id: `i-${i}`,
      data: new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() - giorniIndietro),
      struttura: STRUTTURE[i % STRUTTURE.length].nome,
      area,
      tipologia: tipologia.label,
      priorita: priorita.label,
      tecnico: TECNICI[i % TECNICI.length],
      stato,
      ore: +(tipologia.oreMedie * (0.6 + Math.abs(jitter(i * 23 + 11, 0.9)))).toFixed(1),
    }
  })
  // Prima gli interventi ancora aperti, e dentro ogni stato dal più vecchio: è
  // l'ordine con cui si lavora la lista.
  const pesoStato = { aperto: 0, 'in corso': 1, chiuso: 2 } as const
  righe.sort((a, b) => (pesoStato[a.stato] - pesoStato[b.stato]) || (a.data.getTime() - b.data.getTime()))

  return {
    strutture: STRUTTURE.map((s) => ({ id: s.id, nome: s.nome })),
    strutturaId,
    anno,
    perMese,
    tipologie,
    sla,
    righe,
    aggiornatoAl: aggiornatoAl(oggi),
  }
}

export function computeManutenzione(d: ManutenzioneData): ManutenzioneKpi {
  const somma = (f: (m: MeseManutenzione) => number) => d.perMese.reduce((s, m) => s + f(m), 0)
  const mesi = d.perMese.length || 1
  const interventi = somma((m) => m.aperti)
  const slaInterventi = d.sla.reduce((s, p) => s + p.interventi, 0)
  const slaEntro = d.sla.reduce((s, p) => s + p.entroSla, 0)
  const chiusi = somma((m) => m.chiusi)

  return {
    aperti: d.perMese[d.perMese.length - 1]?.arretrato ?? 0,
    interventi,
    tempoMedio: chiusi
      ? +(somma((m) => m.tempoMedio * m.chiusi) / chiusi).toFixed(1)
      : 0,
    ooo: +(somma((m) => m.ooo) / mesi).toFixed(1),
    nottiPerse: somma((m) => m.nottiPerse),
    costo: somma((m) => m.costo),
    ricavoPerso: somma((m) => m.ricavoPerso),
    slaPct: slaInterventi ? (slaEntro / slaInterventi) * 100 : 0,
    tipologiaPesante: d.tipologie[0] ?? null,
    slaPeggiore: [...d.sla].sort((a, b) => a.pct - b.pct)[0] ?? null,
    sparkAperti: d.perMese.map((m) => m.arretrato),
    sparkTempo: d.perMese.map((m) => m.tempoMedio),
    sparkOoo: d.perMese.map((m) => m.ooo),
    sparkCosto: d.perMese.map((m) => m.costo),
    sparkRicavoPerso: d.perMese.map((m) => m.ricavoPerso),
  }
}
