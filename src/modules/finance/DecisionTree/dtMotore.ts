// ─── Decision tree · motore ─────────────────────────────────────────────────
//  domanda → PIANO (interprete AI via /api/decision-tree, o locale) →
//  `sanifica` (controlli: corregge gli errori meccanici dell'interprete) →
//  `calcola` (la BI: KPI, albero, grafico) sui dati di Sibylla.
//  I numeri escono SOLO da `genera`/`conto` di Margin waterfall: stesso
//  dataset per struttura × camera × segmento, niente numeri paralleli.

import { CAMERE, SEGMENTI, conto, genera, type Dataset } from '../MarginWaterfall/mwfData'
import { apiFetchSibylla } from '../../../services/api'

export type Metrica = 'ricavi' | 'margine' | 'utile' | 'notti' | 'adr' | 'costi'
export type Dimensione = 'struttura' | 'camera' | 'segmento'

export interface Piano {
  comprensibile: boolean
  metrica: Metrica
  ordine: 'desc' | 'asc'
  dimensioni: Dimensione[]
  strutture: string[]
  camere: string[]
  segmenti: string[]
  anno: number
  confronto: boolean
  nota: string
}

export const ANNI = [2024, 2025, 2026]
export const ANNO_CORRENTE = 2026

export const METRICHE: Record<Metrica, { nome: string; nomeLungo: string; euro: boolean; additiva: boolean; inversa?: boolean }> = {
  ricavi: { nome: 'Ricavi', nomeLungo: 'ricavi', euro: true, additiva: true },
  margine: { nome: 'Margine', nomeLungo: 'margine di contribuzione', euro: true, additiva: true },
  utile: { nome: 'Utile', nomeLungo: 'utile', euro: true, additiva: true },
  notti: { nome: 'Notti', nomeLungo: 'notti vendute', euro: false, additiva: true },
  adr: { nome: 'Prezzo medio', nomeLungo: 'prezzo medio per notte (ADR)', euro: true, additiva: false },
  costi: { nome: 'Costi', nomeLungo: 'costi', euro: true, additiva: true, inversa: true },
}

export const DIMENSIONI: Record<Dimensione, { nome: string; plurale: string }> = {
  struttura: { nome: 'Struttura', plurale: 'strutture' },
  camera: { nome: 'Camera', plurale: 'tipologie di camera' },
  segmento: { nome: 'Segmento', plurale: 'segmenti' },
}

const nomeCamera = (id: string) => CAMERE.find(c => c.id === id)?.nome ?? id
const nomeSegmento = (id: string) => SEGMENTI.find(s => s.id === id)?.nome ?? id

// ── Controlli sul piano ──────────────────────────────────────────────────────
//  Correggono gli errori meccanici visti nel test di Haiku: livelli vuoti,
//  livello già fissato da un solo filtro, anno fuori dati, valori fuori catalogo.
export function sanifica(p: Partial<Piano>, elenco: string[]): Piano {
  const strutture = (p.strutture ?? []).filter(s => elenco.includes(s))
  const camere = (p.camere ?? []).filter(c => CAMERE.some(x => x.id === c))
  const segmenti = (p.segmenti ?? []).filter(s => SEGMENTI.some(x => x.id === s))
  const metrica: Metrica = p.metrica && p.metrica in METRICHE ? p.metrica : 'ricavi'
  const fissata = (d: Dimensione) =>
    d === 'struttura' ? strutture.length === 1 || elenco.length === 1
    : d === 'camera' ? camere.length === 1
    : segmenti.length === 1

  let dim = (p.dimensioni ?? []).filter((d, i, a): d is Dimensione => d in DIMENSIONI && a.indexOf(d) === i).filter(d => !fissata(d))
  // Livello della domanda mancante: quello predefinito per la metrica
  if (!dim.length) {
    const preferite: Dimensione[] = metrica === 'adr' || metrica === 'notti' ? ['camera', 'segmento', 'struttura'] : ['segmento', 'camera', 'struttura']
    const d = preferite.find(x => !fissata(x))
    if (d) dim = [d]
  }
  // Albero a due livelli: con più strutture la prima divisione è la struttura,
  // altrimenti l'altra dimensione libera (la domanda resta l'ultimo livello)
  if (dim.length === 1) {
    if (dim[0] !== 'struttura' && !fissata('struttura')) dim = ['struttura', dim[0]]
    else {
      const altra = (['segmento', 'camera'] as Dimensione[]).find(x => x !== dim[0] && !fissata(x))
      if (altra) dim = [dim[0], altra]
    }
  }
  const anno = p.anno && ANNI.includes(p.anno) ? p.anno : ANNO_CORRENTE
  return {
    comprensibile: p.comprensibile !== false,
    metrica,
    ordine: p.ordine === 'asc' ? 'asc' : 'desc',
    dimensioni: dim.slice(0, 2),
    strutture, camere, segmenti, anno,
    confronto: !!p.confronto,
    nota: (p.nota ?? '').trim(),
  }
}

// ── Interprete locale (riserva: sviluppo, demo senza chiave, AI non raggiungibile)
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const PAROLE_VUOTE = new Set(['hotel', 'resort', 'sibylla', 'grand', 'spa', 'house', 'country', 'boutique', 'relais', 'villa', 'palazzo'])

export function interpretaLocale(domanda: string, elenco: string[]): Partial<Piano> {
  const q = ` ${norm(domanda)} `
  const ha = (re: RegExp) => re.test(q)

  const metrica: Metrica | null =
    ha(/margin|\bmdc\b/) ? 'margine'
    : ha(/utile|guadagn|profitt|redditiv/) ? 'utile'
    : ha(/\bcost|\bspes|\bcommission/) ? 'costi'
    : ha(/\badr\b|prezzo medio|tariffa media|\bprezz/) ? 'adr'
    : ha(/nott|pernott|presenz/) ? 'notti'
    : ha(/vend|ricav|fattur|incass|revenue|produzion|rend/) ? 'ricavi'
    : null

  const strutture = elenco.filter(s => norm(s).split(/\s+/).some(w => w.length > 3 && !PAROLE_VUOTE.has(w) && q.includes(w)))
  const camere = [
    ha(/singol/) && 'sgl',
    ha(/doppi[ae]? superior|superior/) && 'dsup',
    ha(/doppi/) && !ha(/doppi[ae]? superior/) && 'dbl',
    ha(/family|famigli/) && 'fam',
    ha(/junior/) && 'jsu',
    ha(/\bsuite/) && !ha(/junior suite/) && 'su',
  ].filter(Boolean) as string[]
  const segmenti = [
    ha(/b2b|tour operator|\bto\b|agenzi/) && 'b2b',
    ha(/b2c|\bota\b|online|booking/) && 'b2c',
    ha(/dirett|walk.?in|\bsito\b/) && 'dir',
    ha(/grupp/) && 'grp',
    ha(/corporate|aziend|business/) && 'corp',
  ].filter(Boolean) as string[]

  const dimensioni: Dimensione[] = []
  if (ha(/struttur|\bhotel\b|alberg|\bdove\b/) && strutture.length === 0) dimensioni.push('struttura')
  if (ha(/segment|canal|clientel|mercat/)) dimensioni.push('segmento')
  if (ha(/camer|tipolog|stanz/)) dimensioni.push('camera')

  const anno = Number(q.match(/\b(20\d\d)\b/)?.[1] ?? 0)
  const confrontoAnno = ha(/rispetto|confront|\bvs\b/) && anno > 0
  const fuoriAmbito = ha(/\b(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|mese|settiman|ieri|oggi|domani)\b/)
    ? 'I dati disponibili sono su base annua: per ora non si può rispondere su mesi, settimane o giorni.'
    : ha(/dipendent|personale|turni|stipend|fornitor|acquist|magazzin|meteo|tempo fa/)
      ? 'Per ora si risponde su ricavi, margine, utile, notti, prezzo medio e costi per struttura, camera e segmento.'
      : null
  const riconosciuta = metrica || strutture.length || camere.length || segmenti.length || dimensioni.length

  if (fuoriAmbito || !riconosciuta) {
    return {
      comprensibile: false,
      nota: fuoriAmbito ?? 'Non ho capito la domanda: indica cosa vuoi vedere (ricavi, margine, utile, notti, prezzo medio o costi) e per cosa (struttura, camera o segmento).',
    }
  }
  return {
    comprensibile: true,
    metrica: metrica ?? 'ricavi',
    ordine: ha(/\bmeno\b|peggior|minor|\bbass|\bperd/) ? 'asc' : 'desc',
    dimensioni, strutture, camere, segmenti,
    anno: confrontoAnno ? 0 : anno,
    confronto: ha(/rispetto|anno scorso|anno precedente|confront|ottimizz|migliorat|cresc|calat|andando|andament|trend|\bvs\b/),
    nota: '',
  }
}

// ── Calcolo della BI ─────────────────────────────────────────────────────────
interface Somme { ricavi: number; notti: number; mdc: number; utile: number; costi: number }
const ZERO: Somme = { ricavi: 0, notti: 0, mdc: 0, utile: 0, costi: 0 }

export interface Nodo {
  id: string
  nome: string
  dim: Dimensione | null
  valore: number
  prec: number
  /** Quota sul padre (solo metriche additive). */
  quota: number | null
  figli: Nodo[]
  migliore: boolean
}

export interface Voce { id: string; nome: string; valore: number; prec: number }

export interface Risposta {
  piano: Piano
  ambito: string
  titolo: string
  sintesi: string
  totale: number
  totalePrec: number
  migliore: Voce | null
  voci: Voce[]
  radice: Nodo
}

const valoreDi = (m: Metrica, s: Somme) =>
  m === 'ricavi' ? s.ricavi : m === 'margine' ? s.mdc : m === 'utile' ? s.utile : m === 'notti' ? s.notti : m === 'costi' ? s.costi
  : s.notti ? s.ricavi / s.notti : 0

const somma = (a: Somme, b: Somme): Somme => ({
  ricavi: a.ricavi + b.ricavi, notti: a.notti + b.notti, mdc: a.mdc + b.mdc, utile: a.utile + b.utile, costi: a.costi + b.costi,
})

export const delta = (v: number, p: number) => (p ? ((v - p) / Math.abs(p)) * 100 : 0)

export function calcola(piano: Piano, elenco: string[]): Risposta {
  const scopo = piano.strutture.length ? piano.strutture : elenco
  const dati = new Map<string, { cur: Dataset; prec: Dataset }>()
  scopo.forEach(s => dati.set(s, { cur: genera(s, piano.anno), prec: genera(s, piano.anno - 1) }))

  const membri = (d: Dimensione): { id: string; nome: string }[] =>
    d === 'struttura' ? scopo.map(s => ({ id: s, nome: s }))
    : d === 'camera' ? CAMERE.filter(c => !piano.camere.length || piano.camere.includes(c.id))
    : SEGMENTI.filter(s => !piano.segmenti.length || piano.segmenti.includes(s.id))

  type Filtri = Partial<Record<Dimensione, string>>
  const sommeDi = (f: Filtri, quale: 'cur' | 'prec'): Somme => {
    const strutture = f.struttura ? [f.struttura] : scopo
    const camere = f.camera ?? (piano.camere.length ? piano.camere : null)
    const segmenti = f.segmento ?? (piano.segmenti.length ? piano.segmenti : null)
    return strutture.reduce((acc, s) => {
      const c = conto(dati.get(s)![quale], camere, segmenti)
      return somma(acc, { ricavi: c.ricavi, notti: c.notti, mdc: c.mdc, utile: c.utile, costi: c.costiVariabili + c.costiFissi })
    }, ZERO)
  }
  const misura = (f: Filtri) => ({ valore: valoreDi(piano.metrica, sommeDi(f, 'cur')), prec: valoreDi(piano.metrica, sommeDi(f, 'prec')) })
  const additiva = METRICHE[piano.metrica].additiva
  const segno = piano.ordine === 'asc' ? 1 : -1
  const ordina = <T extends { valore: number }>(l: T[]) => [...l].sort((a, b) => segno * (a.valore - b.valore))

  const tot = misura({})
  const [d1, d2] = piano.dimensioni

  // Albero: radice → primo livello → secondo livello
  const ramo = (dim: Dimensione, f: Filtri, padre: number, prefisso: string, prossimo?: Dimensione): Nodo[] =>
    ordina(membri(dim).map(m => {
      const filtri = { ...f, [dim]: m.id }
      const v = misura(filtri)
      return {
        id: `${prefisso}${m.id}`, nome: m.nome, dim, ...v,
        quota: additiva && padre ? v.valore / padre : null,
        figli: prossimo ? ramo(prossimo, filtri, v.valore, `${prefisso}${m.id}/`) : [],
        migliore: false,
      }
    }))
  const radice: Nodo = { id: 'radice', nome: '', dim: null, ...tot, quota: null, figli: d1 ? ramo(d1, {}, tot.valore, '', d2) : [], migliore: true }

  // Percorso migliore: la foglia migliore di tutto l'albero e i suoi antenati
  const foglie: { nodo: Nodo; padre: Nodo | null }[] = []
  radice.figli.forEach(n => (n.figli.length ? n.figli.forEach(f => foglie.push({ nodo: f, padre: n })) : foglie.push({ nodo: n, padre: null })))
  const top = ordina(foglie.map(x => ({ ...x, valore: x.nodo.valore })))[0]
  if (top) { top.nodo.migliore = true; if (top.padre) top.padre.migliore = true }

  // Voci della dimensione su cui verte la domanda (ultimo livello), su tutto l'ambito
  const foglia = d2 ?? d1
  const voci: Voce[] = foglia ? ordina(membri(foglia).map(m => ({ id: m.id, nome: m.nome, ...misura({ [foglia]: m.id }) }))) : []
  const migliore = voci[0] ?? null

  // Testi
  const met = METRICHE[piano.metrica]
  const parti: string[] = []
  parti.push(piano.strutture.length ? piano.strutture.join(', ') : elenco.length > 1 ? 'tutte le strutture' : elenco[0])
  if (piano.camere.length) parti.push(piano.camere.map(nomeCamera).join(', '))
  if (piano.segmenti.length) parti.push(piano.segmenti.map(nomeSegmento).join(', '))
  const ambito = `${parti.join(' · ')} · ${piano.anno}`

  const fmt = formatta(piano.metrica)
  const var1 = delta(tot.valore, tot.prec)
  const andamento = `${var1 >= 0 ? '+' : '−'}${Math.abs(var1).toLocaleString('it-IT', { maximumFractionDigits: 1 })}% sul ${piano.anno - 1}`
  let titolo: string
  if (piano.confronto || !foglia || !migliore) {
    titolo = `${met.nome} ${piano.anno}: ${fmt(tot.valore)}, ${andamento}`
  } else {
    const piu = piano.ordine === 'asc' ? (met.inversa ? 'più bassi' : 'più basso') : (met.inversa ? 'più alti' : 'più alto')
    titolo = `${DIMENSIONI[foglia].nome} con ${met.nomeLungo} ${piu}: ${migliore.nome} (${fmt(migliore.valore)})`
  }
  const sintesi = piano.confronto && migliore && foglia
    ? `${piano.ordine === 'asc' ? 'In coda' : 'In testa'} fra le ${DIMENSIONI[foglia].plurale}: ${migliore.nome}, ${fmt(migliore.valore)} (${delta(migliore.valore, migliore.prec) >= 0 ? '+' : '−'}${Math.abs(delta(migliore.valore, migliore.prec)).toLocaleString('it-IT', { maximumFractionDigits: 1 })}%).`
    : `${met.nome} complessivo: ${fmt(tot.valore)}, ${andamento}.`

  return { piano, ambito, titolo, sintesi, totale: tot.valore, totalePrec: tot.prec, migliore, voci, radice }
}

// ── Formattazione per metrica ────────────────────────────────────────────────
export function formatta(m: Metrica): (n: number) => string {
  if (m === 'notti') return n => `${Math.round(n).toLocaleString('it-IT')} notti`
  if (m === 'adr') return n => `${Math.round(n).toLocaleString('it-IT')} €`
  return n => {
    const a = Math.abs(n)
    const s = n < 0 ? '−' : ''
    if (a >= 1e6) return `${s}${(a / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 2 })} mln €`
    if (a >= 1e3) return `${s}${Math.round(a / 1e3).toLocaleString('it-IT')}k €`
    return `${s}${Math.round(a)} €`
  }
}

// ── Interprete: AI se configurata, altrimenti locale ─────────────────────────
export type Fonte = 'ai' | 'locale'

// Con il Portal configurato (REACT_APP_API_URL) l'interprete è l'endpoint del
// Portal (docs/portal-decision-tree-ai.md); nella demo su Vercel la funzione di
// prova /api/decision-tree. Qualunque errore → interprete locale.
const PORTAL = !!process.env.REACT_APP_API_URL
const TIMEOUT_MS = 15000

async function chiediAi(domanda: string, elenco: string[]): Promise<Partial<Piano> | null> {
  const corpo = { domanda, strutture: elenco }
  if (PORTAL) {
    const scaduto = new Promise<null>(r => window.setTimeout(() => r(null), TIMEOUT_MS))
    const j = await Promise.race([
      apiFetchSibylla<{ piano?: Partial<Piano> }>('finance/decisionTree/Interpreta', { method: 'POST', body: corpo, redirectOn401: false }),
      scaduto,
    ])
    return j?.piano ?? null
  }
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const r = await fetch('/api/decision-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: ctrl.signal,
    })
    if (!r.ok) return null
    const j = await r.json() as { piano?: Partial<Piano> }
    return j.piano ?? null
  } finally {
    window.clearTimeout(timer)
  }
}

export async function interpreta(domanda: string, elenco: string[]): Promise<{ piano: Piano; fonte: Fonte }> {
  try {
    const piano = await chiediAi(domanda, elenco)
    if (piano) return { piano: sanifica(piano, elenco), fonte: 'ai' }
  } catch {
    // Endpoint assente, errore o rete: interprete locale
  }
  return { piano: sanifica(interpretaLocale(domanda, elenco), elenco), fonte: 'locale' }
}
