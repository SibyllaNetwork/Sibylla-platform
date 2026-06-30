import type { ReactNode } from 'react'
import { create } from 'zustand'

// Standard piattaforma: ogni azione distruttiva ("Elimina") deve passare da una
// modale di conferma. Lo store espone `confirm(opts)` che restituisce una Promise
// risolta a true/false; un singolo <ConfirmDialog/> montato a livello app legge
// questo stato e mostra l'alert. Uso tipico:
//   const confirm = useConfirmStore(s => s.confirm)
//   if (await confirm({ message: 'Eliminare la notifica?' })) doDelete()

export interface ConfirmOptions {
  title?: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** true = pulsante di conferma in stile distruttivo (default per le eliminazioni) */
  danger?: boolean
}

interface ConfirmState {
  open: boolean
  options: ConfirmOptions
  _resolve: ((value: boolean) => void) | null
  confirm: (opts?: ConfirmOptions) => Promise<boolean>
  resolve: (value: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: {},
  _resolve: null,
  confirm: (opts = {}) =>
    new Promise<boolean>((resolve) => {
      // se c'è una conferma pendente non risolta, annullala
      get()._resolve?.(false)
      set({ open: true, options: opts, _resolve: resolve })
    }),
  resolve: (value) => {
    get()._resolve?.(value)
    set({ open: false, _resolve: null })
  },
}))
