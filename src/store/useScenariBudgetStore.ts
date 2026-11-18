import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Scenari simulati da trasportare nel Budget complessivo (modalità "Simulato").
 * Li producono la Break-even point analysis e il Simulatore di scenari; ogni scenario porta i 12
 * mesi già ripartiti per le voci del budget. `daAprire` è lo scenario da
 * mostrare subito all'arrivo nel Budget complessivo.
 */
export interface ScenarioBudget {
  id: string
  nome: string
  origine: 'bep' | 'simulatore'
  struttura: string
  anno: number
  creatoIl: string
  /** Obiettivi impostati nella simulazione (€). */
  ricaviObiettivo: number
  margineObiettivo: number
  mesi: { vendite: number[]; proventi: number[]; fisso: number[]; variabile: number[] }
}

interface State {
  scenari: ScenarioBudget[]
  daAprire: string | null
  aggiungi: (s: ScenarioBudget) => void
  apri: (id: string | null) => void
}

export const useScenariBudgetStore = create<State>()(
  persist(
    set => ({
      scenari: [],
      daAprire: null,
      aggiungi: s => set(st => ({ scenari: [...st.scenari.filter(x => x.nome !== s.nome || x.struttura !== s.struttura), s], daAprire: s.id })),
      apri: id => set({ daAprire: id }),
    }),
    { name: 'sibylla.finance.scenari-budget', version: 1 },
  ),
)
