// ─── Disponibilità reale per il preventivo di soggiorno ──────────────────────
//  Le camere libere vengono dal gestionale della struttura (pmsDi: le stesse
//  camere e prenotazioni di Planner, Arrivi e partenze, Ospiti in casa): una
//  camera è libera se nessuna prenotazione valida si sovrappone alle notti del
//  soggiorno. I servizi aggiuntivi sono quelli della struttura (alcuni
//  stagionali) più quelli attivi in "I miei servizi" nel periodo.

import { pmsDi } from '../../../operation/_data/pmsDi'
import type { CameraDemo } from '../../../operation/_data/pmsDemo'
import type { Servizio } from '../../../purchasing/Servizi/servizi-types'
import type { CameraProposta, PropostaSoggiorno, ServizioExtra, UnitaExtra } from '../../../../store/usePreventiviSoggiornoStore'
import { tipologia } from './soggiorno'

/** Tipologia del preventivo per ogni categoria del gestionale. */
const TIPOLOGIA_PMS: Record<CameraDemo['categoria'], string> = {
  SGL: 'Singola Classic', DBL: 'Doppia Classic', MAT: 'Matrimoniale Deluxe', TRP: 'Tripla Classic', SUITE: 'Suite',
}
export const tipologiaPms = (c: CameraDemo) => TIPOLOGIA_PMS[c.categoria]
export const capacitaPms = (c: CameraDemo) => tipologia(tipologiaPms(c)).capacita

const uid = () => Math.random().toString(36).slice(2, 10)
const perNumero = (a: CameraDemo, b: CameraDemo) => a.numero.localeCompare(b.numero, undefined, { numeric: true })

/** Camere della struttura libere per tutte le notti fra check-in e check-out. */
export function camereLibere(struttura: string, checkin: string, checkout: string): CameraDemo[] {
  if (!checkin || !checkout || checkout <= checkin) return []
  const { camere, prenotazioni } = pmsDi(struttura)
  const occupate = new Set(prenotazioni
    .filter((p) => p.stato !== 'noshow' && p.checkIn < checkout && p.checkOut > checkin)
    .map((p) => p.camera))
  return camere.filter((c) => !occupate.has(c.numero)).sort(perNumero)
}

export const camereStruttura = (struttura: string) => pmsDi(struttura).camere
export const totaleCamere = (struttura: string) => camereStruttura(struttura).length

export interface GruppoLibere {
  tipologia: string
  capacita: number
  tariffa: number
  camere: CameraDemo[]
}

/** Camere libere raggruppate per tipologia, dalla più piccola. */
export function perTipologia(libere: CameraDemo[]): GruppoLibere[] {
  const m = new Map<string, GruppoLibere>()
  libere.forEach((c) => {
    const t = tipologiaPms(c)
    const g = m.get(t) ?? { tipologia: t, capacita: capacitaPms(c), tariffa: c.tariffa, camere: [] }
    g.tariffa = Math.min(g.tariffa, c.tariffa)
    g.camere.push(c)
    m.set(t, g)
  })
  return Array.from(m.values()).sort((a, b) => a.capacita - b.capacita || a.tariffa - b.tariffa)
}

/**
 * Assegnazione automatica: una sola camera se ce n'è una che ospita tutti
 * (la più piccola e economica), altrimenti si riempie con le camere più
 * capienti finché il resto sta in una camera sola. Pochi letti vuoti, poche
 * camere, prezzo più basso a parità.
 */
export function assegnaAutomatico(libere: CameraDemo[], ospiti: number): CameraDemo[] {
  const pool = [...libere]
  const scelte: CameraDemo[] = []
  let resto = ospiti
  const migliore = (xs: CameraDemo[], piuGrande: boolean) => xs.sort((a, b) =>
    (piuGrande ? capacitaPms(b) - capacitaPms(a) : capacitaPms(a) - capacitaPms(b)) || a.tariffa - b.tariffa || perNumero(a, b))[0]
  while (resto > 0 && pool.length) {
    const serve = resto
    const basta = pool.filter((c) => capacitaPms(c) >= serve)
    const c = basta.length ? migliore(basta, false) : migliore(pool, true)
    scelte.push(c)
    pool.splice(pool.indexOf(c), 1)
    resto -= capacitaPms(c)
  }
  return scelte.sort(perNumero)
}

/**
 * Camere del preventivo dalle camere assegnate, una riga per tipologia.
 * Foto, descrizione e tariffe già personalizzate per una tipologia restano.
 */
export function camereDaNumeri(scelte: CameraDemo[], esistenti: CameraProposta[]): CameraProposta[] {
  const gruppi = new Map<string, CameraDemo[]>()
  scelte.forEach((c) => gruppi.set(tipologiaPms(c), [...(gruppi.get(tipologiaPms(c)) ?? []), c]))
  return Array.from(gruppi.entries()).map(([nome, cs]: [string, CameraDemo[]]) => {
    const prima = esistenti.find((e) => e.tipologia === nome)
    return {
      id: prima?.id ?? uid(), tipologia: nome, quantita: cs.length,
      prezzoNotte: prima?.numeri.length ? prima.prezzoNotte : Math.min(...cs.map((c) => c.tariffa)),
      tariffe: prima?.tariffe ?? {},
      descrizione: prima?.descrizione ?? tipologia(nome).descrizione,
      immagine: prima?.immagine ?? null,
      numeri: cs.map((c) => c.numero),
    }
  })
}

const capienza = (cs: CameraDemo[]) => cs.reduce((n, c) => n + capacitaPms(c), 0)
const spostaIso = (iso: string, giorni: number) => {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + giorni)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Le camere libere bastano per gli ospiti? */
export const bastano = (libere: CameraDemo[], ospiti: number) => capienza(assegnaAutomatico(libere, ospiti)) >= ospiti

/**
 * Prima data, dal check-in scelto in avanti (fino a 90 giorni), in cui le
 * camere libere bastano per gli ospiti con lo stesso numero di notti.
 */
export function primaDataUtile(struttura: string, checkin: string, checkout: string, ospiti: number) {
  const n = Math.round((new Date(checkout + 'T12:00:00').getTime() - new Date(checkin + 'T12:00:00').getTime()) / 86400000)
  if (!(n > 0)) return null
  for (let g = 1; g <= 90; g++) {
    const a = spostaIso(checkin, g)
    const libere = camereLibere(struttura, a, spostaIso(a, n))
    if (bastano(libere, ospiti)) return { checkin: a, checkout: spostaIso(a, n), libere: libere.length }
  }
  return null
}

/** Camere del gestionale già scelte nella proposta (per numero). */
export function numeriScelti(q: PropostaSoggiorno) {
  return q.camere.flatMap((c) => c.numeri)
}

// ─── Servizi aggiuntivi disponibili nel periodo ──────────────────────────────

export interface ServizioProponibile extends Omit<ServizioExtra, 'id'> {
  fonte: 'struttura' | 'rete'
  disponibile: boolean
  /** Perché non si può proporre (fuori stagione, fuori periodo). */
  nota?: string
}

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

/** Servizi della struttura; `mesi` (1-12) = stagionali. */
export const SERVIZI_STRUTTURA: (Omit<ServizioExtra, 'id'> & { mesi?: number[] })[] = [
  { nome: 'Transfer aeroporto (a/r)', prezzo: 60, unita: 'soggiorno' },
  { nome: 'Parcheggio custodito', prezzo: 15, unita: 'notte' },
  { nome: 'Percorso spa', prezzo: 45, unita: 'persona' },
  { nome: 'Massaggio rilassante 50 min', prezzo: 70, unita: 'persona' },
  { nome: 'Cena romantica', prezzo: 90, unita: 'soggiorno' },
  { nome: 'Colazione in camera', prezzo: 10, unita: 'persona-notte' },
  { nome: 'Late check-out (ore 16)', prezzo: 35, unita: 'soggiorno' },
  { nome: 'Escursione guidata', prezzo: 40, unita: 'persona', mesi: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { nome: 'Bottiglia di prosecco in camera', prezzo: 28, unita: 'soggiorno' },
  { nome: 'Noleggio biciclette', prezzo: 18, unita: 'persona', mesi: [4, 5, 6, 7, 8, 9, 10] },
  { nome: 'Ombrellone e lettini in spiaggia', prezzo: 25, unita: 'notte', mesi: [6, 7, 8, 9] },
  { nome: 'Cenone di Capodanno', prezzo: 120, unita: 'persona', mesi: [12, 1] },
]

const UNITA_RETE: Record<Servizio['pricingMode'], UnitaExtra> = {
  'per-persona': 'persona', 'per-gruppo': 'soggiorno', 'per-giorno': 'notte', 'per-ora': 'soggiorno',
}

/** Mesi toccati dal soggiorno (1-12). */
function mesiSoggiorno(checkin: string, checkout: string) {
  const out = new Set<number>()
  const d = new Date(checkin + 'T12:00:00')
  const fine = new Date(checkout + 'T12:00:00')
  if (isNaN(d.getTime()) || isNaN(fine.getTime())) return out
  out.add(d.getMonth() + 1)
  while (d < fine) { d.setDate(d.getDate() + 1); out.add(d.getMonth() + 1) }
  return out
}

export function serviziProponibili(q: PropostaSoggiorno, rete: Servizio[]): ServizioProponibile[] {
  const mesi = mesiSoggiorno(q.checkin, q.checkout)
  const propri: ServizioProponibile[] = SERVIZI_STRUTTURA.map(({ mesi: stagione, ...s }) => {
    const ok = !stagione || Array.from(mesi).some((m) => stagione.includes(m))
    return {
      ...s, fonte: 'struttura', disponibile: ok,
      nota: ok ? undefined : `Solo ${stagione!.map((m) => MESI[m - 1]).join(', ')}`,
    }
  })
  const diRete: ServizioProponibile[] = rete.filter((s) => s.attivo).map((s) => {
    const ok = s.disponibileDal <= q.checkout && s.disponibileAl >= q.checkin
    return {
      nome: s.nome, prezzo: s.prezzoB2C, unita: UNITA_RETE[s.pricingMode], fonte: 'rete', disponibile: ok,
      nota: ok ? undefined : 'Fuori dal periodo di disponibilità',
    }
  })
  return [...propri, ...diRete]
}
