// ─────────────────────────────────────────────────────────────────────────────
//  B.A.R. / F.I.T. — dati e store.
//
//  A DB esiste la GRIGLIA COMPLETA di 450 BAR definita dalla consulenza
//  (mock deterministico: `composizioneBar` genera la stessa composizione per
//  lo stesso numero di griglia). Il PROFILO della struttura è un sottoinsieme
//  della griglia: l'eliminazione da parte dell'utente toglie la BAR dal
//  profilo ma NON tocca la griglia a DB; il totale disponibile si aggiorna e
//  la progressione numerica resta quella della griglia.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type BarMode = 'BAR' | 'FIT'

/** Dimensione della griglia di consulenza a DB. */
export const GRIGLIA_DB_TOTALE = 450

export const TIPOLOGIE_CAMERA = [
  'Singola Classic',
  'Doppia Classic',
  'Doppia Economy',
  'Tripla Classic',
  'Matrimoniale convertibile in Tripla',
  'Matrimoniale Economy',
  'Matrimoniale Classic',
  'Doppia convertibile in Quadrupla',
  'Doppia convertibile in Tripla',
]

// Colonne della matrice di creazione (9 tipologie × 10 colonne).
export const MATRICE_COLONNE = [
  { key: 'bar',   breve: 'B.A.R.',   estesa: 'Best available rate (B.A.R.)' },
  { key: 'ad1',   breve: 'Ad. 1',    estesa: 'Adulto 1' },
  { key: 'ad2',   breve: 'Ad. 2',    estesa: 'Adulto 2' },
  { key: 'ad3',   breve: 'Ad. 3',    estesa: 'Adulto 3' },
  { key: 'ad4',   breve: 'Ad. 4',    estesa: 'Adulto 4' },
  { key: 'adext', breve: 'Ad. ex.',  estesa: 'Adulto extra' },
  { key: 'bb1',   breve: 'Bb. 1',    estesa: 'Bambino 1' },
  { key: 'bb2',   breve: 'Bb. 2',    estesa: 'Bambino 2' },
  { key: 'bb3',   breve: 'Bb. 3',    estesa: 'Bambino 3' },
  { key: 'inf',   breve: 'Inf.',     estesa: 'Infanti' },
] as const

export type MatriceColKey = typeof MATRICE_COLONNE[number]['key']
export type BarMatrix = Record<string, Partial<Record<MatriceColKey, number>>>

// ─── Composizione (griglia di consulenza, mock deterministico) ────────────────

export interface BarRiga {
  tipologia: string
  individuale: number | null
  gruppo: number | null
  bambini: number | null
}

/** Composizione della BAR n della griglia: stessa per lo stesso numero. */
export function composizioneBar(mode: BarMode, n: number, custom?: BarMatrix): BarRiga[] {
  if (custom) {
    return TIPOLOGIE_CAMERA
      .filter(t => custom[t] && Object.values(custom[t]).some(v => v != null && v > 0))
      .map(t => ({
        tipologia: t,
        individuale: custom[t].bar ?? null,
        gruppo: custom[t].ad2 ?? null,
        bambini: custom[t].bb1 ?? null,
      }))
  }
  const base = mode === 'BAR' ? 68 + (n - 1) * 2.5 : 60 + (n - 1) * 2.2
  const quante = 6 + (n % 4)
  return TIPOLOGIE_CAMERA.slice(0, quante).map((tipologia, i) => {
    const fattore = 0.72 + i * 0.09
    const individuale = Math.round(base * fattore)
    return {
      tipologia,
      individuale,
      gruppo: i % 5 === 4 ? null : Math.round(individuale * 0.92),
      bambini: i >= 4 ? Math.round(individuale * 0.35) : null,
    }
  })
}

export interface BarSintesi {
  tipologie: number
  doppia: number | null
  min: number
  max: number
}

/** Sintesi per la riga di lista: n. tipologie, doppia di riferimento, range. */
export function sintesiBar(rows: BarRiga[]): BarSintesi {
  const valori = rows
    .flatMap(r => [r.individuale, r.gruppo])
    .filter((v): v is number => v != null && v > 0)
  return {
    tipologie: rows.length,
    doppia: rows.find(r => r.tipologia === 'Doppia Classic')?.individuale ?? null,
    min: valori.length ? Math.min(...valori) : 0,
    max: valori.length ? Math.max(...valori) : 0,
  }
}

// ─── Store del profilo (persistito) ───────────────────────────────────────────

// Il profilo parte con un sottoinsieme non contiguo della griglia (24 e 31
// mostrano che la numerazione resta quella della griglia di consulenza).
const SEED_PROFILO: Record<BarMode, number[]> = {
  BAR: [...Array.from({ length: 18 }, (_, i) => i + 1), 24, 27, 31],
  FIT: Array.from({ length: 12 }, (_, i) => i + 1),
}

interface BarFitState {
  /** Numeri di griglia delle BAR presenti nel profilo, per modalità. */
  profilo: Record<BarMode, number[]>
  /** Matrici inserite dall'utente (chiave `${mode}-${n}`). */
  custom: Record<string, BarMatrix>
  rimuovi: (mode: BarMode, n: number) => void
  /** Aggiunge una BAR al profilo sul primo slot libero della griglia; torna il numero. */
  aggiungi: (mode: BarMode, matrix: BarMatrix) => number
}

export const useBarFitStore = create<BarFitState>()(
  persist(
    (set, get) => ({
      profilo: { BAR: [...SEED_PROFILO.BAR], FIT: [...SEED_PROFILO.FIT] },
      custom: {},
      rimuovi: (mode, n) =>
        set(s => ({ profilo: { ...s.profilo, [mode]: s.profilo[mode].filter(x => x !== n) } })),
      aggiungi: (mode, matrix) => {
        const presenti = new Set(get().profilo[mode])
        let n = 1
        while (presenti.has(n) && n <= GRIGLIA_DB_TOTALE) n += 1
        set(s => ({
          profilo: { ...s.profilo, [mode]: [...s.profilo[mode], n].sort((a, b) => a - b) },
          custom: { ...s.custom, [`${mode}-${n}`]: matrix },
        }))
        return n
      },
    }),
    { name: 'sibylla.cfg.barfit', version: 1 },
  ),
)
