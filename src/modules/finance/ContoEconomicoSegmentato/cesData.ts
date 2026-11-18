// ─── Conto economico segmentato — modello dati (mock) ──────────────────────
//  Il conto economico (bilancio o bilancio preventivo da Business Central) è
//  riclassificato per segmento:
//
//    RICAVI − COSTI VARIABILI            → MARGINE DI CONTRIBUZIONE
//          − COSTI FISSI SPECIFICI       → MARGINE DI SEGMENTO SPECIFICO
//          − COSTI FISSI COMUNI ALLOCATI → EBIT (margine netto)
//    EBITDA = EBIT + ammortamenti (specifici + comuni allocati)
//
//  Due livelli:
//   - gruppo (multi-struttura): un segmento per struttura; i costi comuni sono
//     i costi di sede, allocati alle strutture;
//   - struttura: un segmento per linea di ricavo (Room department, F&B, SPA,
//     Servizi ancillari); i costi comuni sono quelli della struttura più la
//     sua quota dei costi di sede (così l'EBIT della struttura coincide fra i
//     due livelli).
//  Linee di ricavo e classificazione dei costi arriveranno dal Configuratore
//  (Costi mapping); qui i numeri sono generati, stabili per nome/anno.

import { schedaDemo, hashNome } from '../../../core/demo/struttureDemo'

export type Fonte = 'consuntivo' | 'preventivo'
export type BaseRiparto = 'ricavi' | 'margine' | 'uguale'

/** Voce di costo: `amm` = ammortamento (si somma all'EBIT per l'EBITDA). */
export interface Voce { key: string; label: string; amm?: boolean }

export interface Segmento {
  id: string
  nome: string
  /** Unità degli indicatori: ospite (presenze) o coperto. */
  unita: 'ospite' | 'coperto'
  volume: number
  ricavi: number
  variabili: Record<string, number>
  fissiSpecifici: Record<string, number>
}

export interface ContoSegmentato {
  segmenti: Segmento[]
  vociVariabili: Voce[]
  vociFisse: Voce[]
  vociComuni: Voce[]
  /** Costi comuni da allocare (totale per voce). */
  comuni: Record<string, number>
}

// ── Voci ───────────────────────────────────────────────────────────────────
const V_VAR: Voce[] = [
  { key: 'mp',    label: 'Materie prime F&B' },
  { key: 'lav',   label: 'Lavanderia e biancheria' },
  { key: 'amen',  label: 'Amenities e prodotti' },
  { key: 'comm',  label: 'Commissioni OTA e canali' },
]
const V_FIX_LINEA: Voce[] = [
  { key: 'pers',  label: 'Personale di reparto' },
  { key: 'sup',   label: 'Personale: supervisori' },
  { key: 'amm',   label: 'Ammortamenti', amm: true },
  { key: 'manut', label: 'Manutenzioni' },
  { key: 'comm',  label: 'Servizi commerciali' },
]
const V_COM_STRUTTURA: Voce[] = [
  { key: 'pers',  label: 'Personale comune' },
  { key: 'amm',   label: 'Ammortamenti comuni', amm: true },
  { key: 'aff',   label: 'Affitti comuni' },
  { key: 'serv',  label: 'Servizi comuni (utenze, assicurazioni)' },
  { key: 'sede',  label: 'Quota costi di sede' },
]
// A livello di gruppo i costi della struttura sono tutti specifici del segmento
const V_FIX_GRUPPO: Voce[] = [
  { key: 'pers',  label: 'Personale' },
  { key: 'amm',   label: 'Ammortamenti', amm: true },
  { key: 'aff',   label: 'Affitti' },
  { key: 'manut', label: 'Manutenzioni' },
  { key: 'serv',  label: 'Servizi generali e commerciali' },
]
const V_COM_GRUPPO: Voce[] = [
  { key: 'pers',  label: 'Personale di sede' },
  { key: 'amm',   label: 'Ammortamenti di sede', amm: true },
  { key: 'serv',  label: 'Servizi di sede' },
]

// ── Generazione ────────────────────────────────────────────────────────────
const r100 = (n: number) => Math.round(n / 100) * 100
/** Variazione pseudo-casuale stabile in [−amp, +amp]. */
const jit = (seme: number, k: number, amp: number) => (((Math.imul(seme ^ (k * 2654435761), 1597334677) >>> 0) % 2001) / 1000 - 1) * amp

interface LineaDef {
  id: string; nome: string; unita: 'ospite' | 'coperto'
  volume: (camere: number) => number
  prezzo: number
  /** Costi variabili: quota dei ricavi per voce. */
  var: Partial<Record<string, number>>
  /** Costi fissi specifici: quota dei ricavi per voce. */
  fix: Partial<Record<string, number>>
}

const LINEE: LineaDef[] = [
  { id: 'room', nome: 'Room department', unita: 'ospite', volume: c => c * 365 * 0.68 * 1.8, prezzo: 86,
    var: { lav: 0.045, amen: 0.03, comm: 0.12 },
    fix: { pers: 0.17, sup: 0.025, amm: 0.06, manut: 0.025, comm: 0.02 } },
  { id: 'fb', nome: 'F&B', unita: 'coperto', volume: c => c * 365 * 0.95, prezzo: 36,
    var: { mp: 0.32, lav: 0.02, comm: 0.01 },
    fix: { pers: 0.36, sup: 0.04, amm: 0.03, manut: 0.015, comm: 0.01 } },
  { id: 'spa', nome: 'SPA', unita: 'ospite', volume: c => c * 120, prezzo: 58,
    var: { amen: 0.13, lav: 0.05, comm: 0.04 },
    fix: { pers: 0.42, sup: 0.05, amm: 0.09, manut: 0.04, comm: 0.03 } },
  { id: 'anc', nome: 'Servizi ancillari', unita: 'ospite', volume: c => c * 210, prezzo: 13,
    var: { amen: 0.16, comm: 0.03 },
    fix: { pers: 0.22, amm: 0.07, manut: 0.05, comm: 0.01 } },
]

function fattore(anno: string, fonte: Fonte) {
  const y = 1 + (Number(anno) - 2025) * 0.04
  return { ric: y * (fonte === 'preventivo' ? 1.05 : 1), cost: y * (fonte === 'preventivo' ? 0.98 : 1) }
}

/** Linee di ricavo di una struttura (con i loro costi variabili e fissi specifici). */
function lineeStruttura(nome: string, anno: string, fonte: Fonte): Segmento[] {
  const s = schedaDemo(nome)
  const camere = s.camere || 40
  const f = fattore(anno, fonte)
  const seme = hashNome(nome + anno)
  // Le strutture piccole (< 4★) non hanno la SPA
  const linee = LINEE.filter(l => l.id !== 'spa' || s.stelle >= 4 || /resort/i.test(s.tipo))
  return linee.map((l, i) => {
    const volume = Math.round(l.volume(camere) * (1 + jit(seme, i, 0.08)))
    const ricavi = r100(volume * l.prezzo * (1 + jit(seme, i + 10, 0.06)) * f.ric)
    const variabili: Record<string, number> = {}
    V_VAR.forEach((v, k) => { variabili[v.key] = r100(ricavi * (l.var[v.key] ?? 0) * (1 + jit(seme, i * 7 + k, 0.1)) * f.cost / f.ric) })
    const fissiSpecifici: Record<string, number> = {}
    V_FIX_LINEA.forEach((v, k) => { fissiSpecifici[v.key] = r100(ricavi * (l.fix[v.key] ?? 0) * (1 + jit(seme, i * 11 + k + 50, 0.12)) * f.cost / f.ric) })
    return { id: l.id, nome: l.nome, unita: l.unita, volume, ricavi, variabili, fissiSpecifici }
  })
}

/** Costi comuni propri della struttura (esclusa la quota di sede). */
function comuniStruttura(nome: string, anno: string, fonte: Fonte, ricavi: number): Record<string, number> {
  const seme = hashNome(nome + 'c' + anno)
  const f = fattore(anno, fonte)
  const k = f.cost / f.ric
  return {
    pers: r100(ricavi * 0.07 * (1 + jit(seme, 1, 0.1)) * k),
    amm:  r100(ricavi * 0.035 * (1 + jit(seme, 2, 0.1)) * k),
    aff:  r100(ricavi * 0.02 * (1 + jit(seme, 3, 0.2)) * k),
    serv: r100(ricavi * 0.06 * (1 + jit(seme, 4, 0.1)) * k),
  }
}

/** Costi di sede del gruppo (da allocare alle strutture). */
function costiSede(strutture: string[], anno: string, fonte: Fonte): Record<string, number> {
  const f = fattore(anno, fonte)
  const n = strutture.length
  return {
    pers: r100(95000 * n * f.cost),
    amm:  r100(14000 * n * f.cost),
    serv: r100(38000 * n * f.cost),
  }
}

const somma = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)
const sommaSeg = (s: Segmento) => ({ variabili: somma(s.variabili), fissi: somma(s.fissiSpecifici) })

// ── Riparto dei costi comuni ───────────────────────────────────────────────
export function pesi(segmenti: Segmento[], base: BaseRiparto): number[] {
  const basi = segmenti.map(s =>
    base === 'ricavi' ? s.ricavi
    : base === 'margine' ? Math.max(0, s.ricavi - sommaSeg(s).variabili)
    : 1)
  const tot = basi.reduce((a, b) => a + b, 0) || 1
  return basi.map(b => b / tot)
}

/** Vista di gruppo: un segmento per struttura. */
export function contoGruppo(strutture: string[], anno: string, fonte: Fonte): ContoSegmentato {
  const segmenti: Segmento[] = strutture.map(nome => {
    const linee = lineeStruttura(nome, anno, fonte)
    const ricavi = linee.reduce((a, l) => a + l.ricavi, 0)
    const variabili: Record<string, number> = {}
    V_VAR.forEach(v => { variabili[v.key] = linee.reduce((a, l) => a + l.variabili[v.key], 0) })
    const fl = (k: string) => linee.reduce((a, l) => a + (l.fissiSpecifici[k] ?? 0), 0)
    const com = comuniStruttura(nome, anno, fonte, ricavi)
    const fissiSpecifici: Record<string, number> = {
      pers:  fl('pers') + fl('sup') + com.pers,
      amm:   fl('amm') + com.amm,
      aff:   com.aff,
      manut: fl('manut'),
      serv:  fl('comm') + com.serv,
    }
    const room = linee.find(l => l.id === 'room')
    return { id: nome, nome, unita: 'ospite', volume: room?.volume ?? 0, ricavi, variabili, fissiSpecifici }
  })
  return { segmenti, vociVariabili: V_VAR, vociFisse: V_FIX_GRUPPO, vociComuni: V_COM_GRUPPO, comuni: costiSede(strutture, anno, fonte) }
}

/**
 * Vista struttura: un segmento per linea di ricavo. `gruppo` (se presente)
 * serve a calcolare la quota dei costi di sede con lo stesso criterio di riparto.
 */
export function contoStruttura(nome: string, anno: string, fonte: Fonte, base: BaseRiparto, gruppo?: string[]): ContoSegmentato {
  const segmenti = lineeStruttura(nome, anno, fonte)
  const ricavi = segmenti.reduce((a, l) => a + l.ricavi, 0)
  const comuni: Record<string, number> = { ...comuniStruttura(nome, anno, fonte, ricavi), sede: 0 }
  if (gruppo && gruppo.length > 1) {
    const g = contoGruppo(gruppo, anno, fonte)
    const i = gruppo.indexOf(nome)
    const quota = pesi(g.segmenti, base)[i] ?? 0
    comuni.sede = r100(somma(g.comuni) * quota)
  }
  const vociComuni = comuni.sede ? V_COM_STRUTTURA : V_COM_STRUTTURA.filter(v => v.key !== 'sede')
  return { segmenti, vociVariabili: V_VAR, vociFisse: V_FIX_LINEA, vociComuni, comuni }
}

// ── Conto riclassificato (righe calcolate) ─────────────────────────────────
export interface Calcolo {
  pesi: number[]
  ricavi: number[]
  variabili: Record<string, number[]>
  totVariabili: number[]
  mdc: number[]
  fissi: Record<string, number[]>
  totFissi: number[]
  mss: number[]
  comuni: Record<string, number[]>
  totComuni: number[]
  ebit: number[]
  ebitda: number[]
  volume: number[]
}

export function calcola(c: ContoSegmentato, base: BaseRiparto): Calcolo {
  const p = pesi(c.segmenti, base)
  const per = (f: (s: Segmento) => number) => c.segmenti.map(f)
  const ricavi = per(s => s.ricavi)
  const variabili: Record<string, number[]> = {}
  c.vociVariabili.forEach(v => { variabili[v.key] = per(s => s.variabili[v.key] ?? 0) })
  const totVariabili = per(s => sommaSeg(s).variabili)
  const mdc = ricavi.map((r, i) => r - totVariabili[i])
  const fissi: Record<string, number[]> = {}
  c.vociFisse.forEach(v => { fissi[v.key] = per(s => s.fissiSpecifici[v.key] ?? 0) })
  const totFissi = per(s => sommaSeg(s).fissi)
  const mss = mdc.map((m, i) => m - totFissi[i])
  // Riparto: arrotonda per segmento e assegna il resto all'ultimo, così la colonna totale torna
  const comuni: Record<string, number[]> = {}
  c.vociComuni.forEach(v => {
    const tot = c.comuni[v.key] ?? 0
    const q = p.map(w => Math.round(tot * w))
    if (q.length) q[q.length - 1] += tot - q.reduce((a, b) => a + b, 0)
    comuni[v.key] = q
  })
  const totComuni = c.segmenti.map((_, i) => c.vociComuni.reduce((a, v) => a + comuni[v.key][i], 0))
  const ebit = mss.map((m, i) => m - totComuni[i])
  const amm = c.segmenti.map((_, i) =>
    c.vociFisse.filter(v => v.amm).reduce((a, v) => a + fissi[v.key][i], 0)
    + c.vociComuni.filter(v => v.amm).reduce((a, v) => a + comuni[v.key][i], 0))
  const ebitda = ebit.map((e, i) => e + amm[i])
  return { pesi: p, ricavi, variabili, totVariabili, mdc, fissi, totFissi, mss, comuni, totComuni, ebit, ebitda, volume: per(s => s.volume) }
}

export const tot = (a: number[]) => a.reduce((x, y) => x + y, 0)

// ── Formattazione ──────────────────────────────────────────────────────────
// useGrouping 'always': in it-IT i numeri a 4 cifre non avrebbero il punto.
const NUM = new Intl.NumberFormat('it-IT', { useGrouping: 'always', maximumFractionDigits: 0 } as unknown as Intl.NumberFormatOptions)
const DEC = new Intl.NumberFormat('it-IT', { useGrouping: 'always', minimumFractionDigits: 2, maximumFractionDigits: 2 } as unknown as Intl.NumberFormatOptions)
export const fmtNum = (v: number) => `${v < 0 ? '-' : ''}${NUM.format(Math.abs(v))}`
export const fmtEuro2 = (v: number) => `${v < 0 ? '-' : ''}${DEC.format(Math.abs(v))} €`
export const fmtPct = (v: number, dec = 1) => `${(v * 100).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec })}%`

export const BASI: { value: BaseRiparto; label: string; breve: string; desc: string }[] = [
  { value: 'ricavi',  label: 'Peso % sui ricavi',   breve: 'peso % ricavi',   desc: 'Ogni segmento riceve i costi comuni in proporzione ai ricavi che genera.' },
  { value: 'margine', label: 'Peso % sul margine',  breve: 'peso % margine',  desc: 'In proporzione al margine di contribuzione: chi crea più margine sostiene più costi comuni.' },
  { value: 'uguale',  label: 'Per numero di hotel', breve: 'n. hotel',        desc: 'In parti uguali fra le strutture del gruppo (fra le linee di ricavo, nella vista della singola struttura).' },
]
