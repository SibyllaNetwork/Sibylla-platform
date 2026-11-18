import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PARAMETRI_DEFAULT, Parametri } from '../modules/finance/AnalisiIndici/indiciData'

/**
 * Parametri configurabili dell'Analisi per indici (fattore IVA di DSO e DPO),
 * persistiti: valgono per tutte le strutture finché non si cambiano.
 */
interface State extends Parametri {
  set: (p: Partial<Parametri>) => void
  reset: () => void
}

export const useIndiciParametriStore = create<State>()(
  persist(
    set => ({
      ...PARAMETRI_DEFAULT,
      set: p => set(p),
      reset: () => set(PARAMETRI_DEFAULT),
    }),
    { name: 'sibylla.finance.indici-parametri', version: 1 },
  ),
)
