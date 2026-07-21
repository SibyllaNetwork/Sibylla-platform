import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Layout del pannello laterale "Sale e tavoli" ─────────────────────────────
//  Memorizza, per ciascuna modalità (service/compose), l'ordine delle card del
//  blocco di destra (riordinabili via drag & drop) e lo stato aperto/chiuso di
//  ciascuna card. Persistito così la disposizione resta tra le sessioni.

interface SalePanelState {
  /** Ordine canonico degli id-card per chiave modalità. */
  order: Record<string, string[]>
  /** Card chiuse: chiave `${storeKey}:${cardId}` → true. */
  collapsed: Record<string, boolean>
  setOrder: (key: string, ids: string[]) => void
  toggle: (key: string, cardId: string) => void
}

export const useSalePanelStore = create<SalePanelState>()(
  persist(
    (set) => ({
      order: {},
      collapsed: {},
      setOrder: (key, ids) => set(s => ({ order: { ...s.order, [key]: ids } })),
      toggle: (key, cardId) =>
        set(s => {
          const k = `${key}:${cardId}`
          return { collapsed: { ...s.collapsed, [k]: !s.collapsed[k] } }
        }),
    }),
    { name: 'sibylla.sale-panel', version: 1 },
  ),
)
