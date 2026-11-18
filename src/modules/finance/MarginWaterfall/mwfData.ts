import { hashNome } from '../../../core/demo/struttureDemo'

/**
 * Margin waterfall — dati (mock). Matrice tipologia di camera × segmento di
 * mercato: notti, ricavi e costi variabili per cella. I costi variabili sono
 * quelli di camera (pulizie, lavanderia, amenities: dipendono dalla tipologia)
 * più la commissione del canale (dipende dal segmento). I costi fissi non
 * appartengono a una cella: si ripartiscono sui ricavi (criterio provvisorio,
 * da definire col mapping costi).
 */

export type Prospettiva = 'segmento' | 'camera'

export interface Voce { id: string; nome: string; icona: string }

export const SEGMENTI: Voce[] = [
  { id: 'b2b', nome: 'B2B', icona: 'fa-handshake' },
  { id: 'b2c', nome: 'B2C', icona: 'fa-globe' },
  { id: 'dir', nome: 'Dirette', icona: 'fa-phone' },
  { id: 'grp', nome: 'Gruppi', icona: 'fa-people-group' },
  { id: 'corp', nome: 'Corporate', icona: 'fa-briefcase' },
]

export const CAMERE: Voce[] = [
  { id: 'sgl', nome: 'Singola', icona: 'fa-bed' },
  { id: 'dbl', nome: 'Doppia', icona: 'fa-bed-front' },
  { id: 'dsup', nome: 'Doppia superior', icona: 'fa-bed-front' },
  { id: 'fam', nome: 'Family', icona: 'fa-children' },
  { id: 'jsu', nome: 'Junior suite', icona: 'fa-couch' },
  { id: 'su', nome: 'Suite', icona: 'fa-crown' },
]

// Tipologia: quota delle notti, ADR base, costo variabile di camera per notte
const TIPO: Record<string, { quota: number; adr: number; cv: number }> = {
  sgl: { quota: 0.14, adr: 92, cv: 24 },
  dbl: { quota: 0.36, adr: 128, cv: 31 },
  dsup: { quota: 0.2, adr: 158, cv: 35 },
  fam: { quota: 0.12, adr: 176, cv: 42 },
  jsu: { quota: 0.11, adr: 236, cv: 48 },
  su: { quota: 0.07, adr: 342, cv: 63 },
}
// Segmento: quota delle notti, fattore sull'ADR, commissione del canale
const SEG: Record<string, { quota: number; prezzo: number; comm: number }> = {
  b2b: { quota: 0.22, prezzo: 0.82, comm: 0.18 },
  b2c: { quota: 0.31, prezzo: 1.0, comm: 0.15 },
  dir: { quota: 0.2, prezzo: 1.04, comm: 0.03 },
  grp: { quota: 0.15, prezzo: 0.74, comm: 0.08 },
  corp: { quota: 0.12, prezzo: 0.9, comm: 0.05 },
}

export interface Cella {
  camera: string
  segmento: string
  notti: number
  ricavi: number
  costiCamera: number
  commissioni: number
}

export interface Dataset { celle: Cella[]; costiFissi: number }

const jit = (seme: number, k: number) => {
  const x = Math.sin(seme * 0.001 + k * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

export function genera(struttura: string, anno: number): Dataset {
  const seme = hashNome(struttura + anno)
  const notteTot = 24000 * (0.7 + (hashNome(struttura) % 60) / 100) * (1 + (anno - 2026) * 0.04)
  const celle: Cella[] = []
  let k = 0
  CAMERE.forEach(c => SEGMENTI.forEach(s => {
    const t = TIPO[c.id], g = SEG[s.id]
    // I gruppi comprano poco le suite, i corporate poco le family
    const affinita = (s.id === 'grp' && (c.id === 'su' || c.id === 'jsu')) ? 0.25
      : (s.id === 'corp' && c.id === 'fam') ? 0.15
      : (s.id === 'corp' && c.id === 'sgl') ? 1.8 : 1
    const notti = Math.round(notteTot * t.quota * g.quota * affinita * (1 + 0.15 * jit(seme, k++)))
    const adr = t.adr * g.prezzo * (1 + 0.06 * jit(seme, k++))
    const ricavi = Math.round(notti * adr)
    celle.push({
      camera: c.id, segmento: s.id, notti, ricavi,
      costiCamera: Math.round(notti * t.cv * (1 + 0.08 * jit(seme, k++))),
      commissioni: Math.round(ricavi * g.comm),
    })
  }))
  const ricaviTot = celle.reduce((a, c) => a + c.ricavi, 0)
  return { celle, costiFissi: Math.round(ricaviTot * (0.33 + 0.04 * jit(seme, 99))) }
}

export interface Conto {
  notti: number
  ricavi: number
  costiCamera: number
  commissioni: number
  costiVariabili: number
  mdc: number
  /** Costi fissi ripartiti sui ricavi della selezione. */
  costiFissi: number
  utile: number
}

type Filtro = string | string[] | null
const passa = (f: Filtro, v: string) => (f === null ? true : Array.isArray(f) ? f.includes(v) : f === v)

/** Conto della selezione (filtri su camera e/o segmento: id, elenco di id, null = tutte). */
export function conto(d: Dataset, camera: Filtro, segmento: Filtro): Conto {
  const sel = d.celle.filter(c => passa(camera, c.camera) && passa(segmento, c.segmento))
  const somma = (f: (c: Cella) => number) => sel.reduce((a, c) => a + f(c), 0)
  const ricavi = somma(c => c.ricavi)
  const ricaviTot = d.celle.reduce((a, c) => a + c.ricavi, 0) || 1
  const costiCamera = somma(c => c.costiCamera)
  const commissioni = somma(c => c.commissioni)
  const costiVariabili = costiCamera + commissioni
  const mdc = ricavi - costiVariabili
  const costiFissi = Math.round(d.costiFissi * (ricavi / ricaviTot))
  return { notti: somma(c => c.notti), ricavi, costiCamera, commissioni, costiVariabili, mdc, costiFissi, utile: mdc - costiFissi }
}

const NUM = new Intl.NumberFormat('it-IT', { useGrouping: 'always', maximumFractionDigits: 0 } as unknown as Intl.NumberFormatOptions)
export const fmtNum = (v: number) => `${v < 0 ? '−' : ''}${NUM.format(Math.abs(Math.round(v)))}`
export const fmtEuro = (v: number) => `${fmtNum(v)} €`
export function fmtCompatto(v: number): string {
  const a = Math.abs(v), sg = v < 0 ? '−' : ''
  if (a >= 1e6) return `${sg}${(a / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 2 })} mln €`
  if (a >= 1e3) return `${sg}${Math.round(a / 1e3).toLocaleString('it-IT')}k €`
  return `${sg}${Math.round(a)} €`
}
export const fmtPct = (v: number, dec = 1) => `${(v * 100).toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec })}%`
