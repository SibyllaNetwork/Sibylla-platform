import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Budget dei ricavi salvati ────────────────────────────────────────────────
//  Registro dei budget salvati per struttura e anno (mock, in attesa del BE).
//  Budget dei ricavi lo scrive col pulsante Salva; Imposta distribuzione lo
//  legge per lo scudo di stato accanto a "Invita nuovo operatore".

const chiave = (struttura: string, anno: string | number) => `${struttura}|${anno}`

interface BudgetRicaviState {
  /** struttura|anno → data/ora ISO del salvataggio */
  salvati: Record<string, string>
  salva: (struttura: string, anno: string | number) => void
  salvatoIl: (struttura: string, anno: string | number) => string | undefined
}

export const useBudgetRicaviStore = create<BudgetRicaviState>()(
  persist(
    (set, get) => ({
      salvati: {},
      salva: (struttura, anno) => set((s) => ({ salvati: { ...s.salvati, [chiave(struttura, anno)]: new Date().toISOString() } })),
      salvatoIl: (struttura, anno) => get().salvati[chiave(struttura, anno)],
    }),
    { name: 'sibylla.budget-ricavi', partialize: (s) => ({ salvati: s.salvati }) },
  ),
)
