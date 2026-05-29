import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: number
  variant: ToastVariant
  message: string
  title?: string
}

interface ToastState {
  toasts: ToastItem[]
  push: (t: Omit<ToastItem, 'id'>, timeout?: number) => number
  dismiss: (id: number) => void
}

let _id = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t, timeout = 4000) => {
    const id = ++_id
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    if (timeout > 0) {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), timeout)
    }
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

/**
 * API imperativa per mostrare un toast da qualunque punto (anche fuori da React):
 *   import { toast } from '.../core/components/Toast/useToast'
 *   toast.success('Salvato', 'Operazione completata')
 */
export const toast = {
  success: (message: string, title?: string) => useToastStore.getState().push({ variant: 'success', message, title }),
  error:   (message: string, title?: string) => useToastStore.getState().push({ variant: 'error', message, title }),
  warning: (message: string, title?: string) => useToastStore.getState().push({ variant: 'warning', message, title }),
  info:    (message: string, title?: string) => useToastStore.getState().push({ variant: 'info', message, title }),
}
