import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StatoCam } from '../modules/operation/planner/planner.types'

// ─── Override stato camera ────────────────────────────────────────────────────
//  Gli stati camera "base" vivono nei dati del piano (PIANI_DATA). Dalla
//  planimetria (menu contestuale sulla camera) l'operatore può cambiare lo stato
//  di una camera (es. metterla in Manutenzione o Opzionarla): l'override viene
//  salvato qui e il viewer della planimetria lo applica sopra lo stato base, così
//  il colore della camera cambia in tempo reale.
//
//  Chiave: `${struttura}::${pianoId}::${numero}`.

const keyOf = (struttura: string, pianoId: number, numero: string) =>
  `${struttura}::${pianoId}::${numero}`

interface CameraStatiState {
  overrides: Record<string, StatoCam>
  getStato: (struttura: string, pianoId: number, numero: string) => StatoCam | undefined
  setStato: (struttura: string, pianoId: number, numero: string, stato: StatoCam) => void
  clearStato: (struttura: string, pianoId: number, numero: string) => void
}

export const useCameraStatiStore = create<CameraStatiState>()(
  persist(
    (set, get) => ({
      overrides: {},
      getStato: (struttura, pianoId, numero) => get().overrides[keyOf(struttura, pianoId, numero)],
      setStato: (struttura, pianoId, numero, stato) =>
        set(s => ({ overrides: { ...s.overrides, [keyOf(struttura, pianoId, numero)]: stato } })),
      clearStato: (struttura, pianoId, numero) =>
        set(s => {
          const next = { ...s.overrides }
          delete next[keyOf(struttura, pianoId, numero)]
          return { overrides: next }
        }),
    }),
    { name: 'sibylla.camera-stati', version: 1 },
  ),
)
