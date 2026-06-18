import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Notifiche "Nuove risorse" ───────────────────────────────────────────────────
//  Esito della moderazione comunicato all'utente creatore (campanella nella hub
//  Academy): 'approvato' → annuncio pubblicato; 'rifiutato' → con motivazione, da
//  correggere e ri-sottoporre. Persistito su localStorage e condiviso tra i mount.

export type NotificaRisorsaTipo = 'approvato' | 'rifiutato'

export interface NotificaRisorsa {
  id: string
  tipo: NotificaRisorsaTipo
  risorsaId: string
  titolo: string
  kind: 'personnel' | 'course'
  motivazione?: string
  letta: boolean
  ts: number
}

interface NotificheRisorseState {
  notifiche: NotificaRisorsa[]
  push: (n: Omit<NotificaRisorsa, 'id' | 'letta' | 'ts'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  remove: (id: string) => void
  countNonLette: () => number
}

const newId = () => `ntf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export const useNotificheRisorseStore = create<NotificheRisorseState>()(
  persist(
    (set, get) => ({
      notifiche: [],
      push: (n) =>
        set((state) => ({
          notifiche: [{ ...n, id: newId(), letta: false, ts: Date.now() }, ...state.notifiche],
        })),
      markRead: (id) =>
        set((state) => ({
          notifiche: state.notifiche.map((x) => (x.id === id ? { ...x, letta: true } : x)),
        })),
      markAllRead: () =>
        set((state) => ({ notifiche: state.notifiche.map((x) => ({ ...x, letta: true })) })),
      remove: (id) =>
        set((state) => ({ notifiche: state.notifiche.filter((x) => x.id !== id) })),
      countNonLette: () => get().notifiche.filter((x) => !x.letta).length,
    }),
    { name: 'sibylla.notifiche-risorse' },
  ),
)
