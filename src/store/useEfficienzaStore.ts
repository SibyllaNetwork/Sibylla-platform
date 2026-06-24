import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Efficienza operativa ──────────────────────────────────────────────────────
// Stato condiviso fra la pagina "Efficienza operativa" e il Centro notifiche:
//  · modalita      → come mostrare il valore dell'ottimizzazione (€ o %)
//  · notificaOn    → flag gestito dalle impostazioni del Centro notifiche
//  · ottimizzazioni→ riallocazioni applicate dal TO (generano la notifica ricavo)

export type ModalitaValore = 'eur' | 'pct'

export interface Ottimizzazione {
  id: string
  createdAt: string
  destinazione: string
  struttura: string
  daStruttura: string
  camere: number
  ricavoPre: number
  ricavoPost: number
}

interface EfficienzaState {
  modalita: ModalitaValore
  notificaOn: boolean
  ottimizzazioni: Ottimizzazione[]
  setModalita: (m: ModalitaValore) => void
  setNotificaOn: (b: boolean) => void
  registra: (o: Omit<Ottimizzazione, 'id' | 'createdAt'>) => void
  annulla: (id: string) => void
  reset: () => void
}

const uid = () => Math.random().toString(36).slice(2, 9)
const now = () => new Date().toISOString()

export const useEfficienzaStore = create<EfficienzaState>()(
  persist(
    (set) => ({
      modalita: 'eur',
      notificaOn: true,
      ottimizzazioni: [],
      setModalita: (m) => set({ modalita: m }),
      setNotificaOn: (b) => set({ notificaOn: b }),
      registra: (o) =>
        set((s) => ({ ottimizzazioni: [{ id: uid(), createdAt: now(), ...o }, ...s.ottimizzazioni] })),
      annulla: (id) => set((s) => ({ ottimizzazioni: s.ottimizzazioni.filter((x) => x.id !== id) })),
      reset: () => set({ ottimizzazioni: [] }),
    }),
    { name: 'sibylla.efficienza', version: 1 },
  ),
)

export const deltaEur = (o: Ottimizzazione) => o.ricavoPost - o.ricavoPre
export const deltaPct = (o: Ottimizzazione) =>
  o.ricavoPre ? ((o.ricavoPost - o.ricavoPre) / o.ricavoPre) * 100 : 0
