import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Tipologia cliente scelta in fase di creazione dal pannello di controllo
export type Tipologia = 'Singola' | 'Multistruttura'

interface OrgState {
  tipologia:        Tipologia
  strutture:        string[]
  activeStruttura:  string
  setActiveStruttura: (s: string) => void
  // utility di configurazione (usate dall'admin panel quando arriverà il backend)
  setTipologia:     (t: Tipologia) => void
  setStrutture:     (list: string[]) => void
}

// ⚠️ Dati mock — verranno sostituiti dalla configurazione del cliente dal backend.
//    L'attuale demo rappresenta Mario Rossi con multistruttura su 4 immobili.
const MOCK_STRUTTURE = ['Hotel Noto', 'Hotel Siracusa', 'Hotel Catania', 'Resort Taormina']

export const useOrgStore = create<OrgState>()(persist((set) => ({
  tipologia:        'Multistruttura',
  strutture:        MOCK_STRUTTURE,
  activeStruttura:  MOCK_STRUTTURE[0],

  setActiveStruttura: (s) => set({ activeStruttura: s }),
  setTipologia:       (t) => set({ tipologia: t }),
  setStrutture:       (list) => set((state) => ({
    strutture: list,
    // se la struttura attiva non è più valida, ripiega sulla prima
    activeStruttura: list.includes(state.activeStruttura) ? state.activeStruttura : (list[0] ?? ''),
  })),
}), {
  name: 'sibylla.org',
  // Si ricorda solo la struttura scelta: l'elenco arriva dal backend o dai mock.
  partialize: (s) => ({ activeStruttura: s.activeStruttura }),
}))
