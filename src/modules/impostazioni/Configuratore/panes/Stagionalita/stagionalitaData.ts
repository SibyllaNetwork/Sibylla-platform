// ─────────────────────────────────────────────────────────────────────────────
//  Stagionalità — dati e store.
//
//  Le 7 stagionalità NON vivono nella JSX: sono caricate dal Pannello di
//  Controllo e salvate a DB. Qui il DB è mockato da `fetchStagioniCatalogo()`
//  (fetch asincrona, elenco dinamico): quando arriverà l'API reale basterà
//  sostituire il corpo della funzione.
//
//  I periodi configurati (periodo ↔ stagionalità) sono persistiti per
//  segmento (B2B / Gruppi) nello store zustand `useStagionalitaStore`
//  (chiave «sibylla.cfg.stagionalita»), così Overbooking limit e i Listini
//  possono leggerli e il gating dell'hub resta coerente tra sessioni.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Catalogo stagionalità (Pannello di Controllo → DB) ──────────────────────

export interface StagioneDef {
  id: string
  nome: string
  /** Token colore della palette validata (--chart-*): un colore per stagione. */
  colore: string
  ordine: number
}

// Fotografia del contenuto a DB: 7 stagionalità caricate dalla consulenza.
const CATALOGO_DB: StagioneDef[] = [
  { id: 'low-1',  nome: 'LOW SEASON 1',  colore: 'var(--chart-1)', ordine: 1 },
  { id: 'low-2',  nome: 'LOW SEASON 2',  colore: 'var(--chart-5)', ordine: 2 },
  { id: 'mid-1',  nome: 'MID SEASON 1',  colore: 'var(--chart-4)', ordine: 3 },
  { id: 'mid-2',  nome: 'MID SEASON 2',  colore: 'var(--chart-2)', ordine: 4 },
  { id: 'high-1', nome: 'HIGH SEASON 1', colore: 'var(--chart-3)', ordine: 5 },
  { id: 'high-2', nome: 'HIGH SEASON 2', colore: 'var(--chart-7)', ordine: 6 },
  { id: 'peak',   nome: 'PEAK SEASON',   colore: 'var(--chart-6)', ordine: 7 },
]

/** Elenco stagionalità come arriverebbe dal DB (asincrono, mai hardcodato in JSX). */
export function fetchStagioniCatalogo(): Promise<StagioneDef[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(CATALOGO_DB.map(s => ({ ...s }))), 250)
  })
}

// ─── Periodi configurati ──────────────────────────────────────────────────────

export type SegmentoStagionalita = 'b2b' | 'gruppi'

export interface PeriodoStagione {
  id: string
  /** ISO yyyy-MM-dd (incluso). */
  from: string
  /** ISO yyyy-MM-dd (incluso). */
  to: string
  stagioneId: string
}

export const SEGMENTI: { value: SegmentoStagionalita; label: string }[] = [
  { value: 'b2b',    label: 'B2B' },
  { value: 'gruppi', label: 'Gruppi' },
]

/** Anno tariffario di riferimento della configurazione mock. */
export const ANNO_TARIFFARIO = 2027

// Entrambi i segmenti hanno periodi configurati: sono la base su cui i due pane
// Listini costruiscono le proprie colonne (stagioniDaPeriodi), e i Listini si
// aprono sempre sui contenuti reali.
const SEED_PERIODI: Record<SegmentoStagionalita, PeriodoStagione[]> = {
  b2b: [
    { id: 'b2b-1', from: '2027-01-07', to: '2027-02-28', stagioneId: 'low-1'  },
    { id: 'b2b-2', from: '2027-03-01', to: '2027-04-30', stagioneId: 'mid-1'  },
    { id: 'b2b-3', from: '2027-06-01', to: '2027-07-15', stagioneId: 'high-1' },
    { id: 'b2b-4', from: '2027-08-01', to: '2027-08-31', stagioneId: 'peak'   },
  ],
  gruppi: [
    { id: 'grp-1', from: '2027-01-07', to: '2027-03-31', stagioneId: 'low-1'  },
    { id: 'grp-2', from: '2027-04-01', to: '2027-05-31', stagioneId: 'mid-2'  },
    { id: 'grp-3', from: '2027-06-01', to: '2027-09-30', stagioneId: 'high-2' },
    { id: 'grp-4', from: '2027-12-20', to: '2027-12-31', stagioneId: 'peak'   },
  ],
}

interface StagionalitaState {
  periodi: Record<SegmentoStagionalita, PeriodoStagione[]>
  setPeriodi: (segmento: SegmentoStagionalita, periodi: PeriodoStagione[]) => void
}

export const useStagionalitaStore = create<StagionalitaState>()(
  persist(
    (set) => ({
      periodi: {
        b2b:    SEED_PERIODI.b2b.map(p => ({ ...p })),
        gruppi: SEED_PERIODI.gruppi.map(p => ({ ...p })),
      },
      setPeriodi: (segmento, periodi) =>
        set(s => ({ periodi: { ...s.periodi, [segmento]: periodi } })),
    }),
    {
      name: 'sibylla.cfg.stagionalita',
      // v2: i periodi del segmento Gruppi entrano nel seed (prima era vuoto).
      // Il bump serve perché i browser che hanno già lo stato v1 persistito
      // ripartano dal seed nuovo, altrimenti i Listini gruppi resterebbero
      // senza stagionalità a calendario.
      version: 2,
      migrate: () => ({
        periodi: {
          b2b:    SEED_PERIODI.b2b.map(p => ({ ...p })),
          gruppi: SEED_PERIODI.gruppi.map(p => ({ ...p })),
        },
      }),
    },
  ),
)

// ─── Helper puri ──────────────────────────────────────────────────────────────

/** True se i due intervalli (ISO inclusivi) condividono almeno un giorno. */
export function periodsOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string): boolean {
  return aFrom <= bTo && bFrom <= aTo
}

/** True se il giorno (ISO) cade dentro uno dei periodi dati. */
export function dayIsTaken(dayIso: string, periodi: PeriodoStagione[]): boolean {
  return periodi.some(p => dayIso >= p.from && dayIso <= p.to)
}

/** Numero di giorni (estremi inclusi) di un periodo ISO. */
export function periodDays(from: string, to: string): number {
  const MS = 24 * 60 * 60 * 1000
  return Math.round((Date.parse(to) - Date.parse(from)) / MS) + 1
}

// ─── Stagionalità configurate (base per i configuratori a valle) ──────────────
//  I Listini (individuali e gruppi) sono sbloccati dalla Stagionalità e devono
//  parlare la stessa lingua: le loro colonne sono le stagionalità EFFETTIVAMENTE
//  configurate per il segmento, non un elenco proprio.

export interface StagioneConfigurata {
  id: string
  nome: string
  /** Intervalli configurati, formattati e concatenati: "07/01 – 28/02 · 01/11 – 22/12". */
  periodo: string
  colore: string
}

const ddMM = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/**
 * Stagionalità configurate nei periodi dati, in ordine di catalogo (low → peak):
 * una voce per stagione, con tutti i suoi intervalli. Elenco vuoto = segmento
 * non ancora configurato.
 */
export function stagioniDaPeriodi(periodi: PeriodoStagione[]): StagioneConfigurata[] {
  const intervalli = new Map<string, string[]>()
  for (const p of [...periodi].sort((a, b) => a.from.localeCompare(b.from))) {
    const arr = intervalli.get(p.stagioneId) ?? []
    arr.push(`${ddMM(p.from)} – ${ddMM(p.to)}`)
    intervalli.set(p.stagioneId, arr)
  }
  return CATALOGO_DB
    .filter(s => intervalli.has(s.id))
    .sort((a, b) => a.ordine - b.ordine)
    .map(s => ({
      id: s.id,
      nome: s.nome,
      periodo: (intervalli.get(s.id) ?? []).join(' · '),
      colore: s.colore,
    }))
}
