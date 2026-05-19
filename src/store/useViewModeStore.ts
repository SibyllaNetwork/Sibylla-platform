import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Modalità di visualizzazione dell'applicazione.
//   classic — layout standard, una pagina alla volta
//   tabs    — tab persistenti in cima al contenuto, ogni pagina visitata
//             viene aggiunta come tab per il rapido passaggio tra sezioni
export type ViewMode = 'classic' | 'tabs'

export interface OpenTab {
  page:  string
  label: string
}

interface ViewModeState {
  mode:      ViewMode
  setMode:   (m: ViewMode) => void

  openTabs:  OpenTab[]
  addTab:    (tab: OpenTab) => void
  closeTab:  (page: string) => void
  clearTabs: () => void
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set, get) => ({
      mode:    'classic',
      setMode: (m) => set({ mode: m }),

      openTabs: [],
      addTab: (tab) => {
        const cur = get().openTabs
        if (cur.some(t => t.page === tab.page)) return
        set({ openTabs: [...cur, tab] })
      },
      closeTab: (page) => {
        set({ openTabs: get().openTabs.filter(t => t.page !== page) })
      },
      clearTabs: () => set({ openTabs: [] }),
    }),
    { name: 'sibylla.viewmode' }
  )
)
