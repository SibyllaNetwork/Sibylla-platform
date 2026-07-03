import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Blocchi fantasma (Planner) ───────────────────────────────────────────────
//  Un "blocco fantasma" è una PRELAZIONE morbida su una camera per un periodo:
//  lo spazio resta disponibile alla vendita (NON modifica la disponibilità
//  residua) ma è marcato come "riservato/opzionato" e mostrato a tutti gli utenti
//  con una freccia caratteristica e l'icona del fantasmino nella timeline.
//
//  Flusso:
//    Planner → pulsante "Blocco fantasma" (accende la modalità) → strisciata sui
//    giorni → modale (date, camera, motivazione) → Salva → blocco creato.
//
//    In "Nuova prenotazione", se si sceglie una camera in blocco fantasma nel
//    periodo, appare l'icona del fantasmino accanto al numero camera e un alert
//    avvisa che si sta prenotando su un blocco: confermando, il blocco è rimosso
//    e la prenotazione procede normalmente.
//
//  Store singleton persistito: Planner e Nuova prenotazione sono alberi React
//  separati e condividono lo stato qui.

export interface BloccoFantasma {
  id: string
  /** Numero camera oggetto della prelazione. */
  numeroCamera: string
  /** Etichetta tipologia camera (per la modale/label). */
  camTipo?: string
  /** Periodo (ISO yyyy-MM-dd): dalISO = primo giorno, alISO = giorno dopo l'ultima notte. */
  dalISO: string
  alISO: string
  /** Motivazione della prelazione (obbligatoria). */
  motivazione: string
  createdAt: number
}

export interface NuovoBloccoInput {
  numeroCamera: string
  camTipo?: string
  dalISO: string
  alISO: string
  motivazione: string
}

interface BlocchiFantasmaState {
  blocchi: BloccoFantasma[]
  add: (input: NuovoBloccoInput) => void
  update: (id: string, patch: Partial<NuovoBloccoInput>) => void
  remove: (id: string) => void
}

const now = () => Date.now()
const uid = () => `bf-${now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`

// Seed dimostrativo: una camera del planner (106 DOPPIA CLASSIC) in blocco fantasma
// dentro la finestra di default (2026-04-13 + 10 gg), così la feature è subito
// visibile sia nella timeline sia in "Nuova prenotazione".
const SEED: BloccoFantasma[] = [
  {
    id: 'bf-seed-1',
    numeroCamera: '106',
    camTipo: 'DOPPIA CLASSIC (Doppia Classic)',
    dalISO: '2026-04-16',
    alISO: '2026-04-18',
    motivazione: 'Possibile gruppo in trattativa — tenere riservato.',
    createdAt: now() - 1000 * 60 * 60 * 6,
  },
]

export const useBlocchiFantasmaStore = create<BlocchiFantasmaState>()(
  persist(
    (set) => ({
      blocchi: SEED,
      add: (input) =>
        set((state) => ({
          blocchi: [{ id: uid(), ...input, createdAt: now() }, ...state.blocchi],
        })),
      update: (id, patch) =>
        set((state) => ({
          blocchi: state.blocchi.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),
      remove: (id) =>
        set((state) => ({ blocchi: state.blocchi.filter((b) => b.id !== id) })),
    }),
    { name: 'sibylla.blocchi-fantasma', version: 1 },
  ),
)

// ─── Selettori puri ───────────────────────────────────────────────────────────

/** Due periodi [aDal, aAl) e [bDal, bAl) si sovrappongono? (ISO yyyy-MM-dd) */
function overlap(aDal: string, aAl: string, bDal: string, bAl: string): boolean {
  return aDal < bAl && aAl > bDal
}

/** Blocco attivo su una camera che si sovrappone al periodo indicato (o null). */
export function bloccoPerCameraPeriodo(
  blocchi: BloccoFantasma[],
  numeroCamera: string,
  dalISO: string,
  alISO: string,
): BloccoFantasma | null {
  if (!numeroCamera || !dalISO || !alISO) return null
  return (
    blocchi.find(
      (b) => b.numeroCamera === numeroCamera && overlap(b.dalISO, b.alISO, dalISO, alISO),
    ) ?? null
  )
}
