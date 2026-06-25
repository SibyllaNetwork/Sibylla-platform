import { create } from 'zustand'

// Storico di navigazione: il dashboard registra qui la funzione `goBack`
// (basata sullo stack delle pagine visitate). Il componente BtnBack la usa
// come default quando non riceve un onClick esplicito, così "Indietro" torna
// alla pagina precedente invece che alla home.

interface NavBackState {
  goBack: (() => void) | null
  setGoBack: (fn: (() => void) | null) => void
}

export const useNavBack = create<NavBackState>((set) => ({
  goBack: null,
  setGoBack: (goBack) => set({ goBack }),
}))
