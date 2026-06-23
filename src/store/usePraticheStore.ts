import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Pratiche (Tour Operator) ─────────────────────────────────────────────────
//  Il Tour Operator crea e categorizza le pratiche (destinazione, categoria a
//  stelle, tipologia cliente singoli/gruppi, budget di riferimento, markup) e le
//  assegna a un singolo profilo del team o a tutto il team.
//
//  Monitoraggio pratiche: ogni pratica ha uno stato (In attesa / In corso /
//  Confermata / Chiusa) e un "tempo di gestione" (da `updatedAt`, l'ultimo cambio
//  di stato). Le pratiche in attesa oltre la soglia `slaHours` (impostata nel
//  Configuratore) generano un sollecito/notifica per accelerare la gestione.
//
//  Store persistito: "Crea pratica", "Monitoraggio pratiche" e il Centro notifiche
//  condividono lo stesso elenco.

export type TipologiaCliente = 'singoli' | 'gruppi'

export const TIPOLOGIA_META: Record<TipologiaCliente, { label: string; icon: string }> = {
  singoli: { label: 'Singoli', icon: 'user' },
  gruppi:  { label: 'Gruppi',  icon: 'users' },
}

export type StatoPratica = 'in-attesa' | 'in-corso' | 'confermata' | 'chiusa'

export const STATO_PRATICA_META: Record<
  StatoPratica,
  { label: string; tone: 'wait' | 'info' | 'ok' | 'done' }
> = {
  'in-attesa': { label: 'In attesa',  tone: 'wait' },
  'in-corso':  { label: 'In corso',   tone: 'info' },
  confermata:  { label: 'Confermata', tone: 'ok' },
  chiusa:      { label: 'Chiusa',     tone: 'done' },
}

export const STATO_PRATICA_FLOW: StatoPratica[] = ['in-attesa', 'in-corso', 'confermata', 'chiusa']

/** Stato "pending": pratiche ancora da prendere in carico → conteggio e solleciti SLA. */
export const STATO_PENDING: StatoPratica = 'in-attesa'

/** Assegnazione della pratica: a tutto il team oppure a un singolo profilo. */
export type Assegnazione =
  | { tipo: 'team' }
  | { tipo: 'profilo'; nome: string }

export interface Pratica {
  id: string
  destinazione: string
  /** Categoria espressa come classe a stelle (1–5). */
  categoria: number
  tipologia: TipologiaCliente
  /** Budget di riferimento in euro. */
  budget: number
  /** Markup applicato, in percentuale. */
  markup: number
  stato: StatoPratica
  assegnazione: Assegnazione
  createdAt: number
  /** Ultimo cambio di stato: base per il "tempo di gestione" nel monitoraggio. */
  updatedAt: number
}

export interface NuovaPraticaInput {
  destinazione: string
  categoria: number
  tipologia: TipologiaCliente
  budget: number
  markup: number
  assegnazione: Assegnazione
}

interface PraticheState {
  pratiche: Pratica[]
  /** Soglia (ore) oltre la quale una pratica in attesa va sollecitata. (Configuratore) */
  slaHours: number
  /** Notifica di sollecito attiva. (Configuratore) */
  notificaSolleciti: boolean
  crea: (input: NuovaPraticaInput) => void
  setStato: (id: string, stato: StatoPratica) => void
  setMarkup: (id: string, markup: number) => void
  remove: (id: string) => void
  setSlaHours: (h: number) => void
  setNotificaSolleciti: (v: boolean) => void
}

const now = () => Date.now()
const uid = () => `prat-${now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`
const H = 1000 * 60 * 60

const SEED: Pratica[] = [
  {
    id: 'prat-seed-1',
    destinazione: 'Roma',
    categoria: 4,
    tipologia: 'gruppi',
    budget: 12000,
    markup: 18,
    stato: 'in-corso',
    assegnazione: { tipo: 'profilo', nome: 'Sicilia Andrea' },
    createdAt: now() - 30 * H,
    updatedAt: now() - 5 * H,
  },
  {
    id: 'prat-seed-2',
    destinazione: 'Firenze',
    categoria: 5,
    tipologia: 'singoli',
    budget: 4500,
    markup: 22,
    stato: 'in-attesa',
    assegnazione: { tipo: 'team' },
    createdAt: now() - 3 * H,
    updatedAt: now() - 3 * H,
  },
  {
    id: 'prat-seed-3',
    destinazione: 'Napoli',
    categoria: 3,
    tipologia: 'gruppi',
    budget: 7800,
    markup: 16,
    stato: 'in-attesa',
    assegnazione: { tipo: 'profilo', nome: 'Massimo Belloni' },
    // Oltre la soglia di default (10h) → in ritardo, sollecito attivo.
    createdAt: now() - 16 * H,
    updatedAt: now() - 14 * H,
  },
  {
    id: 'prat-seed-4',
    destinazione: 'Milano',
    categoria: 4,
    tipologia: 'singoli',
    budget: 8200,
    markup: 15,
    stato: 'confermata',
    assegnazione: { tipo: 'profilo', nome: 'Marco Campo' },
    createdAt: now() - 72 * H,
    updatedAt: now() - 20 * H,
  },
]

export const usePraticheStore = create<PraticheState>()(
  persist(
    (set) => ({
      pratiche: SEED,
      slaHours: 10,
      notificaSolleciti: true,
      crea: (input) =>
        set((state) => ({
          pratiche: [
            { id: uid(), ...input, stato: 'in-attesa', createdAt: now(), updatedAt: now() },
            ...state.pratiche,
          ],
        })),
      setStato: (id, stato) =>
        set((state) => ({
          pratiche: state.pratiche.map((p) => (p.id === id ? { ...p, stato, updatedAt: now() } : p)),
        })),
      setMarkup: (id, markup) =>
        set((state) => ({
          pratiche: state.pratiche.map((p) => (p.id === id ? { ...p, markup: Math.max(0, Math.round(markup)) } : p)),
        })),
      remove: (id) =>
        set((state) => ({ pratiche: state.pratiche.filter((p) => p.id !== id) })),
      setSlaHours: (h) => set({ slaHours: Math.max(1, Math.round(h)) }),
      setNotificaSolleciti: (notificaSolleciti) => set({ notificaSolleciti }),
    }),
    {
      name: 'sibylla.pratiche',
      version: 2,
      migrate: (state: any) => {
        if (!state) return state
        const map: Record<string, StatoPratica> = { aperta: 'in-attesa', 'in-lavorazione': 'in-corso' }
        state.pratiche = (state.pratiche || []).map((p: any) => ({
          ...p,
          stato: map[p.stato] ?? p.stato,
          updatedAt: p.updatedAt ?? p.createdAt ?? Date.now(),
        }))
        if (typeof state.slaHours !== 'number') state.slaHours = 10
        if (typeof state.notificaSolleciti !== 'boolean') state.notificaSolleciti = true
        return state
      },
    },
  ),
)

// ─── Selettori puri ───────────────────────────────────────────────────────────

/** Pratiche in attesa di presa in carico (pending). */
export function praticheInPending(pratiche: Pratica[]): Pratica[] {
  return pratiche.filter((p) => p.stato === STATO_PENDING)
}

/** Ore trascorse nello stato corrente (tempo di gestione). */
export function oreInGestione(p: Pratica, nowMs: number): number {
  return (nowMs - p.updatedAt) / H
}

/** Pratiche in attesa oltre la soglia SLA → da sollecitare. */
export function praticheInRitardo(pratiche: Pratica[], slaHours: number, nowMs: number): Pratica[] {
  return pratiche.filter((p) => p.stato === STATO_PENDING && oreInGestione(p, nowMs) >= slaHours)
}
