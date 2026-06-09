import { create } from 'zustand'

// ─── Notifiche servizi (mock front-end) ─────────────────────────────────────────
// Modella le notifiche del workflow di approvazione servizi, in attesa del BE:
//   - 'richiesta'  → al supporto Sibylla: nuovo servizio da verificare
//   - 'approvato'  → al cliente: servizio pubblicato
//   - 'rifiutato'  → al cliente: con motivazione, da correggere e ri-sottomettere

export type DestinatarioNotifica = 'supporto' | 'cliente'
export type TipoNotificaServizio = 'richiesta' | 'approvato' | 'rifiutato'

export interface NotificaServizio {
  id: string
  destinatario: DestinatarioNotifica
  tipo: TipoNotificaServizio
  servizioId: string
  servizioNome: string
  motivazione?: string
  letta: boolean
  ts: number
}

interface NotificheServiziState {
  notifiche: NotificaServizio[]
  push: (n: Omit<NotificaServizio, 'id' | 'letta'>) => void
  markRead: (id: string) => void
  markAllRead: (dest: DestinatarioNotifica) => void
  countNonLette: (dest: DestinatarioNotifica) => number
}

const newId = () => `ntf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export const useNotificheServiziStore = create<NotificheServiziState>((set, get) => ({
  notifiche: [],
  push: (n) =>
    set(state => ({ notifiche: [{ ...n, id: newId(), letta: false }, ...state.notifiche] })),
  markRead: (id) =>
    set(state => ({ notifiche: state.notifiche.map(x => x.id === id ? { ...x, letta: true } : x) })),
  markAllRead: (dest) =>
    set(state => ({ notifiche: state.notifiche.map(x => x.destinatario === dest ? { ...x, letta: true } : x) })),
  countNonLette: (dest) =>
    get().notifiche.filter(x => x.destinatario === dest && !x.letta).length,
}))
