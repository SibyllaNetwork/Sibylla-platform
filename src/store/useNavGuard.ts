import { create } from 'zustand'

// Guard di navigazione: una pagina con modifiche non salvate registra un `guard`.
// Il dashboard, prima di cambiare pagina, lo interroga: se restituisce `false`
// la navigazione viene bloccata (la pagina mostrerà la propria conferma).

interface NavGuardState {
  guard: ((intendedPage: string) => boolean) | null
  setGuard: (g: ((intendedPage: string) => boolean) | null) => void
}

export const useNavGuard = create<NavGuardState>((set) => ({
  guard: null,
  setGuard: (guard) => set({ guard }),
}))
