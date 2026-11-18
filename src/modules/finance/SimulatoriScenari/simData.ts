import { hashNome } from '../../../core/demo/struttureDemo'

/**
 * Simulatore di scenari — modello. Base = consuntivo dell'anno precedente per
 * segmento (ADR, notti vendute) e costi (fissi; variabili per notte). Ogni
 * scenario applica variazioni % a ADR e notti per segmento e ai costi:
 *   ricavi segmento   = ADR × (1+ΔADR) × notti × (1+Δnotti)
 *   costi variabili   = costo per notte × (1+Δvar) × notti dello scenario
 *   costi fissi       = fissi × (1+Δfissi)
 *   profitto          = ricavi − costi variabili − costi fissi
 * I costi variabili seguono i volumi: più notti, più pulizie e commissioni.
 */
export const SEGMENTI = [
  { key: 'diretto', label: 'Diretto', icona: 'fa-phone' },
  { key: 'corporate', label: 'Corporate', icona: 'fa-briefcase' },
  { key: 'b2b', label: 'B2B', icona: 'fa-handshake' },
  { key: 'b2c', label: 'B2C', icona: 'fa-globe' },
  { key: 'gruppi', label: 'Gruppi', icona: 'fa-people-group' },
] as const
export type SegKey = typeof SEGMENTI[number]['key']

export interface Base {
  anno: number
  seg: Record<SegKey, { adr: number; rn: number }>
  fissi: number
  /** Costo variabile per notte venduta. */
  varPerNotte: number
}

export interface Leve {
  seg: Record<SegKey, { adr: number; rn: number }>
  fissi: number
  variabili: number
}

export interface Scenario { id: string; nome: string; leve: Leve }

export interface Esito {
  ricaviSeg: Record<SegKey, number>
  nottiSeg: Record<SegKey, number>
  ricavi: number
  notti: number
  variabili: number
  fissi: number
  costi: number
  profitto: number
  margine: number
}

const ZERO_SEG = () => Object.fromEntries(SEGMENTI.map(s => [s.key, { adr: 0, rn: 0 }])) as Leve['seg']
export const leveVuote = (): Leve => ({ seg: ZERO_SEG(), fissi: 0, variabili: 0 })
const tutti = (adr: number, rn: number) => Object.fromEntries(SEGMENTI.map(s => [s.key, { adr, rn }])) as Leve['seg']

/** Tre scenari di partenza: prudente, atteso, ambizioso. */
export function scenariIniziali(): Scenario[] {
  return [
    { id: 's1', nome: 'Prudente', leve: { seg: tutti(0, -6), fissi: 0, variabili: 2 } },
    { id: 's2', nome: 'Atteso', leve: { seg: { ...tutti(3, 2), diretto: { adr: 4, rn: 8 } }, fissi: 1, variabili: 0 } },
    { id: 's3', nome: 'Ambizioso', leve: { seg: { ...tutti(6, 5), b2b: { adr: 2, rn: -4 }, diretto: { adr: 7, rn: 14 } }, fissi: 3, variabili: -2 } },
  ]
}

/** Modelli rapidi applicabili allo scenario attivo. */
export const MODELLI: { id: string; label: string; icona: string; desc: string; leve: () => Leve }[] = [
  { id: 'prezzo', label: 'Spinta sul prezzo', icona: 'fa-tag', desc: '+5% ADR su tutti i segmenti, notti −2%', leve: () => ({ seg: tutti(5, -2), fissi: 0, variabili: 0 }) },
  { id: 'volumi', label: 'Più volumi', icona: 'fa-bed', desc: 'Notti +8% con ADR −3%', leve: () => ({ seg: tutti(-3, 8), fissi: 0, variabili: 0 }) },
  { id: 'diretto', label: 'Disintermediazione', icona: 'fa-arrows-turn-to-dots', desc: 'Diretto +15% notti, B2C −8%, commissioni −4%', leve: () => ({ seg: { ...tutti(0, 0), diretto: { adr: 2, rn: 15 }, b2c: { adr: 0, rn: -8 } }, fissi: 0, variabili: -4 }) },
  { id: 'crisi', label: 'Stress test', icona: 'fa-cloud-bolt', desc: 'Notti −12%, ADR −4%, costi variabili +3%', leve: () => ({ seg: tutti(-4, -12), fissi: 0, variabili: 3 }) },
]

export function baseStruttura(struttura: string, anno: number): Base {
  const h = hashNome(struttura || 'Struttura')
  const k = 0.7 + (h % 60) / 100
  const j = (i: number) => 1 + (((h >> i) % 21) - 10) / 100
  return {
    anno,
    seg: {
      diretto: { adr: Math.round(142 * j(1)), rn: Math.round(4200 * k * j(2)) },
      corporate: { adr: Math.round(118 * j(3)), rn: Math.round(2600 * k * j(4)) },
      b2b: { adr: Math.round(96 * j(5)), rn: Math.round(3900 * k * j(6)) },
      b2c: { adr: Math.round(131 * j(7)), rn: Math.round(6100 * k * j(8)) },
      gruppi: { adr: Math.round(88 * j(9)), rn: Math.round(2300 * k * j(10)) },
    },
    fissi: Math.round(1_180_000 * k * j(11) / 1000) * 1000,
    varPerNotte: Math.round(38 * j(12)),
  }
}

export function calcola(b: Base, l: Leve): Esito {
  const ricaviSeg = {} as Record<SegKey, number>
  const nottiSeg = {} as Record<SegKey, number>
  SEGMENTI.forEach(({ key }) => {
    const s = b.seg[key], v = l.seg[key]
    nottiSeg[key] = s.rn * (1 + v.rn / 100)
    ricaviSeg[key] = s.adr * (1 + v.adr / 100) * nottiSeg[key]
  })
  const ricavi = Object.values(ricaviSeg).reduce((a, x) => a + x, 0)
  const notti = Object.values(nottiSeg).reduce((a, x) => a + x, 0)
  const variabili = notti * b.varPerNotte * (1 + l.variabili / 100)
  const fissi = b.fissi * (1 + l.fissi / 100)
  const costi = variabili + fissi
  const profitto = ricavi - costi
  return { ricaviSeg, nottiSeg, ricavi, notti, variabili, fissi, costi, profitto, margine: ricavi ? profitto / ricavi : 0 }
}

/**
 * Ponte del profitto: dalla base allo scenario, quanto pesa ogni leva.
 * Effetto prezzo (ADR a notti invariate), effetto volumi (notti all'ADR
 * nuovo, al netto dei costi variabili che seguono), costi variabili unitari,
 * costi fissi.
 */
export function ponte(b: Base, l: Leve) {
  const e0 = calcola(b, leveVuote())
  let prezzo = 0, volumi = 0
  SEGMENTI.forEach(({ key }) => {
    const s = b.seg[key], v = l.seg[key]
    const adrNuovo = s.adr * (1 + v.adr / 100)
    prezzo += (adrNuovo - s.adr) * s.rn
    volumi += (adrNuovo - b.varPerNotte) * s.rn * (v.rn / 100)
  })
  const e1 = calcola(b, l)
  const notti = e1.notti
  const variabili = -(notti * b.varPerNotte * (l.variabili / 100))
  const fissi = -(b.fissi * (l.fissi / 100))
  return { base: e0.profitto, prezzo, volumi, variabili, fissi, scenario: e1.profitto }
}

/** Leva più potente: profitto in più per +1% di ADR o di notti, per segmento. */
export function levaMigliore(b: Base) {
  let best = { seg: SEGMENTI[0].label as string, leva: 'ADR', valore: 0 }
  SEGMENTI.forEach(({ key, label }) => {
    const s = b.seg[key]
    const adr = s.adr * s.rn * 0.01
    const rn = (s.adr - b.varPerNotte) * s.rn * 0.01
    if (adr > best.valore) best = { seg: label, leva: 'ADR', valore: adr }
    if (rn > best.valore) best = { seg: label, leva: 'notti', valore: rn }
  })
  return best
}

const NUM = new Intl.NumberFormat('it-IT', { useGrouping: 'always', maximumFractionDigits: 0 } as unknown as Intl.NumberFormatOptions)
export const fmtEuro = (v: number) => `${v < 0 ? '−' : ''}${NUM.format(Math.abs(Math.round(v)))} €`
export const fmtNum = (v: number) => `${v < 0 ? '−' : ''}${NUM.format(Math.abs(Math.round(v)))}`
export function fmtK(v: number) {
  const a = Math.abs(v), s = v < 0 ? '−' : ''
  if (a >= 1e6) return `${s}${(a / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 2 })} mln €`
  if (a >= 1e3) return `${s}${Math.round(a / 1e3).toLocaleString('it-IT')}k €`
  return `${s}${Math.round(a)} €`
}
export const fmtPct = (v: number, dec = 1) => `${(v * 100).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec })}%`
export const segno = (v: number, f: (x: number) => string) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${f(Math.abs(v))}`
