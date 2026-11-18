import { hashNome } from '../../../core/demo/struttureDemo'

/**
 * Dati dell'Analisi per indici. Ogni anno ha uno stato patrimoniale ed
 * economico riclassificato (mock, deterministico per struttura): gli indici si
 * calcolano dalle formule della specifica, così valori, componenti e storico
 * restano coerenti fra loro.
 */

export interface Bilancio {
  anno: number
  ricavi: number
  costoMaterie: number
  redditoOperativo: number
  redditoNetto: number
  totaleAttivo: number
  crediti: number
  magazzino: number
  ccAttivi: number
  patrimonioNetto: number
  passivitaCorrenti: number
  passivitaLungo: number
  fornitori: number
  bancheCcPassivi: number
  finanziamentiLungo: number
}

/**
 * Parametri configurabili degli indici: fattore IVA applicato al fatturato
 * (DSO) e agli acquisti di materie (DPO). Default 1,2 come nel documento.
 */
export interface Parametri { ivaVendite: number; ivaAcquisti: number }
export const PARAMETRI_DEFAULT: Parametri = { ivaVendite: 1.2, ivaAcquisti: 1.2 }
const fmtFatt = (v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 3 })

export const formulaDi = (ind: Indice, p: Parametri) => (typeof ind.formula === 'function' ? ind.formula(p) : ind.formula)

/** Stato dell'esercizio rispetto all'anno in corso. */
export const ANNO_CORRENTE = new Date().getFullYear()
export type StatoEsercizio = 'chiuso' | 'in-corso' | 'previsionale'
export const statoEsercizio = (anno: number): StatoEsercizio =>
  anno < ANNO_CORRENTE ? 'chiuso' : anno === ANNO_CORRENTE ? 'in-corso' : 'previsionale'
export const STATO_LBL: Record<StatoEsercizio, { breve: string; full: string }> = {
  'chiuso': { breve: 'chiuso', full: 'Bilancio chiuso (Business Central)' },
  'in-corso': { breve: 'in corso', full: 'Esercizio in corso: valori a oggi, non ancora a bilancio' },
  'previsionale': { breve: 'previsionale', full: 'Esercizio futuro: valori del bilancio preventivo' },
}

export type Unita = 'pct' | 'gg' | 'eur' | 'x'
/** Direzione favorevole: 'up' = meglio se sale, 'down' = meglio se scende. */
export type Polarita = 'up' | 'down' | 'neutral'

export interface Componente { label: string; get: (b: Bilancio) => number }

export interface Indice {
  key: string
  label: string
  breve?: string
  /** Testo della formula; funzione quando dipende dai parametri (fattore IVA). */
  formula: string | ((p: Parametri) => string)
  unita: Unita
  polarita: Polarita
  calc: (b: Bilancio, prev: Bilancio | undefined, p: Parametri) => number
  /** Formula non ancora definita nel documento: quella mostrata è provvisoria. */
  provvisoria?: boolean
  componenti: Componente[]
  /** Lettura dell'indice per l'utente (tooltip e modale). */
  nota: string
}

export type SezioneId = 'crescita' | 'redditivita' | 'liquidita' | 'solidita'
export interface Sezione { id: SezioneId; titolo: string; icona: string; desc: string; indici: Indice[] }

export const ANNO_MIN = 2019
export const ANNI = ['2022', '2023', '2024', '2025']

// ── Generazione del bilancio ───────────────────────────────────────────────
// Rumore deterministico in [-1, 1] per struttura/anno/grandezza
function rnd(seed: number, anno: number, k: number): number {
  const x = Math.sin(seed * 0.0007 + anno * 12.9898 + k * 78.233) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}
const r100 = (n: number) => Math.round(n / 100) * 100

export function bilanci(struttura: string, fino: number): Bilancio[] {
  const seed = hashNome(struttura || 'Gruppo')
  const scala = 0.75 + (seed % 50) / 100
  const out: Bilancio[] = []
  let ricavi = 640000 * scala
  for (let anno = ANNO_MIN; anno <= fino; anno++) {
    const r = (k: number) => rnd(seed, anno, k)
    if (anno > ANNO_MIN) ricavi *= 1 + 0.075 + 0.07 * r(1)
    const totaleAttivo = ricavi * (0.92 + 0.06 * r(2))
    const patrimonioNetto = totaleAttivo * (0.31 + 0.05 * r(3))
    const terzi = totaleAttivo - patrimonioNetto
    const bancheCcPassivi = terzi * (0.09 + 0.03 * r(4))
    const finanziamentiLungo = terzi * (0.2 + 0.05 * r(5))
    const costoMaterie = ricavi * (0.24 + 0.02 * r(6))
    const redditoOperativo = ricavi * (0.12 + 0.05 * r(7))
    const oneri = (bancheCcPassivi + finanziamentiLungo) * 0.045
    const redditoNetto = (redditoOperativo - oneri) * 0.72
    const dso = 34 + 9 * r(8)
    const dsi = 15 + 5 * r(9)
    const dpo = 54 + 10 * r(10)
    out.push({
      anno,
      ricavi: r100(ricavi),
      costoMaterie: r100(costoMaterie),
      redditoOperativo: r100(redditoOperativo),
      redditoNetto: r100(redditoNetto),
      totaleAttivo: r100(totaleAttivo),
      crediti: r100((dso * ricavi * 1.2) / 360),
      magazzino: r100((dsi * costoMaterie) / 360),
      ccAttivi: r100(ricavi * (0.045 + 0.02 * r(11))),
      patrimonioNetto: r100(patrimonioNetto),
      passivitaCorrenti: r100(terzi * 0.56),
      passivitaLungo: r100(terzi * 0.44),
      fornitori: r100((dpo * costoMaterie * 1.2) / 360),
      bancheCcPassivi: r100(bancheCcPassivi),
      finanziamentiLungo: r100(finanziamentiLungo),
    })
  }
  return out
}

// ── Grandezze derivate ─────────────────────────────────────────────────────
const mezziTerzi = (b: Bilancio) => b.passivitaCorrenti + b.passivitaLungo
const debitiFin = (b: Bilancio) => b.bancheCcPassivi + b.finanziamentiLungo
const pfn = (b: Bilancio) => debitiFin(b) - b.ccAttivi
const varPct = (v: number, p?: number) => (p ? (v - p) / p : NaN)

const C = {
  ricavi: { label: 'Ricavi', get: (b: Bilancio) => b.ricavi },
  attivo: { label: 'Totale attivo (capitale investito)', get: (b: Bilancio) => b.totaleAttivo },
  terzi: { label: 'Mezzi di terzi', get: mezziTerzi },
  pn: { label: 'Patrimonio netto', get: (b: Bilancio) => b.patrimonioNetto },
  rn: { label: 'Reddito netto', get: (b: Bilancio) => b.redditoNetto },
  ro: { label: 'Reddito operativo', get: (b: Bilancio) => b.redditoOperativo },
  crediti: { label: 'Crediti verso clienti', get: (b: Bilancio) => b.crediti },
  magazzino: { label: 'Magazzino', get: (b: Bilancio) => b.magazzino },
  materie: { label: 'Costo materie e materiali di consumo', get: (b: Bilancio) => b.costoMaterie },
  fornitori: { label: 'Debiti verso fornitori', get: (b: Bilancio) => b.fornitori },
  banche: { label: 'Banche c/c passivi', get: (b: Bilancio) => b.bancheCcPassivi },
  finLungo: { label: 'Finanziamenti di terzi a lungo', get: (b: Bilancio) => b.finanziamentiLungo },
  debitiFin: { label: 'Debiti finanziari', get: debitiFin },
  ccAttivi: { label: 'C/c attivi', get: (b: Bilancio) => b.ccAttivi },
  pfn: { label: 'Posizione finanziaria netta', get: pfn },
  passCorr: { label: 'Passività correnti', get: (b: Bilancio) => b.passivitaCorrenti },
  passLungo: { label: 'Passività a lungo', get: (b: Bilancio) => b.passivitaLungo },
  totPass: { label: 'Totale passività', get: mezziTerzi },
}

export const SEZIONI: Sezione[] = [
  {
    id: 'crescita', titolo: 'Crescita', icona: 'fa-seedling',
    desc: 'Variazione anno su anno di ricavi, capitale investito e fonti di finanziamento',
    indici: [
      { key: 'crescitaRicavi', label: 'Crescita ricavi', formula: '(Ricavi anno − Ricavi anno prec.) / Ricavi anno prec.', unita: 'pct', polarita: 'up',
        calc: (b, p) => varPct(b.ricavi, p?.ricavi), componenti: [C.ricavi],
        nota: 'Quanto sono aumentati i ricavi rispetto all\'anno precedente.' },
      { key: 'crescitaCapitale', provvisoria: true, label: 'Crescita capitale investito', breve: 'Crescita cap. investito', formula: '(Tot. attivo anno − anno prec.) / Tot. attivo anno prec.', unita: 'pct', polarita: 'neutral',
        calc: (b, p) => varPct(b.totaleAttivo, p?.totaleAttivo), componenti: [C.attivo],
        nota: 'Variazione del totale attivo: misura quanto l\'impresa ha investito in più (o in meno).' },
      { key: 'varTerzi', provvisoria: true, label: 'Variazione mezzi di terzi', formula: '(Mezzi di terzi anno − anno prec.) / Mezzi di terzi anno prec.', unita: 'pct', polarita: 'down',
        calc: (b, p) => varPct(mezziTerzi(b), p && mezziTerzi(p)), componenti: [C.terzi],
        nota: 'Variazione delle fonti esterne (debiti): se cresce più dei mezzi propri aumenta la dipendenza da terzi.' },
      { key: 'varPropri', provvisoria: true, label: 'Variazione mezzi propri', formula: '(Patrimonio netto anno − anno prec.) / Patrimonio netto anno prec.', unita: 'pct', polarita: 'up',
        calc: (b, p) => varPct(b.patrimonioNetto, p?.patrimonioNetto), componenti: [C.pn],
        nota: 'Variazione del patrimonio netto: utili trattenuti, aumenti o riduzioni di capitale.' },
    ],
  },
  {
    id: 'redditivita', titolo: 'Redditività', icona: 'fa-chart-line-up',
    desc: 'Capacità di generare reddito dal capitale proprio, dal capitale investito e dalle vendite',
    indici: [
      { key: 'roe', label: 'Redditività netta (ROE)', formula: 'Reddito netto / Patrimonio netto', unita: 'pct', polarita: 'up',
        calc: b => b.redditoNetto / b.patrimonioNetto, componenti: [C.rn, C.pn],
        nota: 'Rendimento del capitale dei soci.' },
      { key: 'roi', label: 'Redditività operativa (ROI)', formula: 'Reddito operativo / Totale attivo', unita: 'pct', polarita: 'up',
        calc: b => b.redditoOperativo / b.totaleAttivo, componenti: [C.ro, C.attivo],
        nota: 'Rendimento della gestione caratteristica su tutto il capitale investito.' },
      { key: 'ros', label: 'Return on sales (ROS)', formula: 'Reddito operativo / Ricavi', unita: 'pct', polarita: 'up',
        calc: b => b.redditoOperativo / b.ricavi, componenti: [C.ro, C.ricavi],
        nota: 'Quanta parte di ogni euro di ricavo diventa reddito operativo.' },
      { key: 'turnover', label: 'Asset turnover', formula: 'Ricavi / Capitale investito', unita: 'x', polarita: 'up',
        calc: b => b.ricavi / b.totaleAttivo, componenti: [C.ricavi, C.attivo],
        nota: 'Rotazione del capitale investito: quante volte gli investimenti si trasformano in ricavi.' },
    ],
  },
  {
    id: 'liquidita', titolo: 'Liquidità', icona: 'fa-droplet',
    desc: 'Tempi del ciclo commerciale: incasso dei crediti, rotazione del magazzino, pagamento dei fornitori',
    indici: [
      { key: 'dso', label: 'DSO · tempo incasso crediti', formula: p => `Crediti × 360 / (Fatturato × ${fmtFatt(p.ivaVendite)})`, unita: 'gg', polarita: 'down',
        calc: (b, _, p) => (b.crediti * 360) / (b.ricavi * p.ivaVendite), componenti: [C.crediti, C.ricavi],
        nota: 'Giorni medi per incassare dai clienti: il fatturato è maggiorato del fattore IVA configurato.' },
      { key: 'dsi', label: 'DSI · durata magazzino', formula: 'Magazzino × 360 / Costo materie', unita: 'gg', polarita: 'down',
        calc: b => (b.magazzino * 360) / b.costoMaterie, componenti: [C.magazzino, C.materie],
        nota: 'Giorni medi di giacenza delle scorte.' },
      { key: 'dpo', label: 'DPO · tempo pagamento fornitori', formula: p => `Fornitori × 360 / (Costo materie e mat. cons. × ${fmtFatt(p.ivaAcquisti)})`, unita: 'gg', polarita: 'up',
        calc: (b, _, p) => (b.fornitori * 360) / (b.costoMaterie * p.ivaAcquisti), componenti: [C.fornitori, C.materie],
        nota: 'Giorni medi per pagare i fornitori (acquisti maggiorati del fattore IVA configurato): più è lungo, più il ciclo è finanziato dai fornitori.' },
    ],
  },
  {
    id: 'solidita', titolo: 'Solidità', icona: 'fa-building-columns',
    desc: 'Struttura delle fonti: debiti finanziari, posizione finanziaria netta e grado di indebitamento',
    indici: [
      { key: 'debitiFin', label: 'Debiti finanziari', formula: 'Banche c/c passivi + Finanziamenti di terzi a lungo', unita: 'eur', polarita: 'down',
        calc: debitiFin, componenti: [C.banche, C.finLungo],
        nota: 'Debito verso banche e finanziatori.' },
      { key: 'pfn', label: 'Posizione finanziaria netta', formula: 'Debiti finanziari − C/c attivi', unita: 'eur', polarita: 'down',
        calc: pfn, componenti: [C.debitiFin, C.ccAttivi],
        nota: 'Debito finanziario al netto della liquidità disponibile.' },
      { key: 'totPass', label: 'Totale passività', formula: 'Passività correnti + Passività a lungo', unita: 'eur', polarita: 'down',
        calc: mezziTerzi, componenti: [C.passCorr, C.passLungo],
        nota: 'Tutte le fonti di terzi, a breve e a lungo.' },
      { key: 'indebComplessivo', label: 'Indebitamento complessivo', formula: 'Totale passività / Patrimonio netto', unita: 'x', polarita: 'down',
        calc: b => mezziTerzi(b) / b.patrimonioNetto, componenti: [C.totPass, C.pn],
        nota: 'Euro di debiti per ogni euro di mezzi propri.' },
      { key: 'indebFinanziario', label: 'Indebitamento finanziario', formula: 'PFN / Patrimonio netto', unita: 'x', polarita: 'down',
        calc: b => pfn(b) / b.patrimonioNetto, componenti: [C.pfn, C.pn],
        nota: 'Debito finanziario netto per ogni euro di mezzi propri.' },
    ],
  },
]

// ── Formattazione ──────────────────────────────────────────────────────────
const NUM = new Intl.NumberFormat('it-IT', { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions)
const dec = (v: number, d: number) => v.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d })
const segno = (v: number) => (v < 0 ? '−' : '')

export const fmtEuro = (v: number) => `${segno(v)}${NUM.format(Math.round(Math.abs(v)))}`

export function fmtValore(v: number, u: Unita): string {
  if (!isFinite(v)) return '—'
  switch (u) {
    case 'pct': return `${segno(v)}${dec(Math.abs(v) * 100, 1)}%`
    case 'gg': return `${Math.round(v)} gg`
    case 'x': return `${segno(v)}${dec(Math.abs(v), 2)}×`
    default: return `${fmtEuro(v)} €`
  }
}

/** Variazione fra due anni, nell'unità dell'indice (punti % per le percentuali). */
export function fmtDelta(d: number, u: Unita): string {
  if (!isFinite(d)) return '—'
  const s = d > 0 ? '+' : d < 0 ? '−' : ''
  const a = Math.abs(d)
  switch (u) {
    case 'pct': return `${s}${dec(a * 100, 1)} pt`
    case 'gg': return `${s}${Math.round(a)} gg`
    case 'x': return `${s}${dec(a, 2)}`
    default: return `${s}${NUM.format(Math.round(a))} €`
  }
}

export const unitaLbl: Record<Unita, string> = { pct: '%', gg: 'giorni', x: 'volte', eur: '€' }

/** Serie storica dell'indice (dal secondo anno disponibile, per le variazioni). */
export function serie(ind: Indice, bil: Bilancio[], par: Parametri): { anno: number; v: number }[] {
  return bil.map((b, i) => ({ anno: b.anno, v: ind.calc(b, bil[i - 1], par) })).filter(p => isFinite(p.v))
}

export type Tono = 'pos' | 'neg' | 'neutral'
export function tono(delta: number, pol: Polarita, u: Unita): Tono {
  const soglia = u === 'pct' ? 0.001 : u === 'gg' ? 0.5 : u === 'x' ? 0.005 : 1
  if (!isFinite(delta) || Math.abs(delta) < soglia || pol === 'neutral') return 'neutral'
  return (pol === 'up' ? delta > 0 : delta < 0) ? 'pos' : 'neg'
}
