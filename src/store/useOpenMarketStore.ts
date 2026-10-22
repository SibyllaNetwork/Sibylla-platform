import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Open market ──────────────────────────────────────────────────────────────
//  Iscrizione delle strutture al mercato aperto della rete: i tour operator
//  possono inviare proposte di distribuzione sui segmenti di vendita, che la
//  struttura accetta o rifiuta. Stato per struttura (id), persistito (mock).

interface OpenMarketState {
  attive: Record<number, boolean>
  imposta: (strutturaId: number, attiva: boolean) => void
}

export const useOpenMarketStore = create<OpenMarketState>()(
  persist(
    (set) => ({
      attive: {},
      imposta: (strutturaId, attiva) => set((s) => ({ attive: { ...s.attive, [strutturaId]: attiva } })),
    }),
    { name: 'sibylla.open-market' },
  ),
)
