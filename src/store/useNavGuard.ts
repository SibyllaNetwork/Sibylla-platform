import { create } from 'zustand'

// Guard di navigazione: una pagina con modifiche non salvate registra un `guard`.
// Il dashboard, prima di cambiare pagina, lo interroga: se restituisce `false`
// la navigazione viene bloccata (la pagina mostrerà la propria conferma).
// `proceed` riprende la navigazione bloccata (stessa destinazione, stesso tipo:
// avanti o Indietro) senza interrogare di nuovo il guard: la pagina lo chiama
// quando l'utente conferma di voler uscire.

export type NavGuard = (intendedPage: string, proceed: () => void) => boolean

interface NavGuardState {
  guard: NavGuard | null
  setGuard: (g: NavGuard | null) => void
}

export const useNavGuard = create<NavGuardState>((set) => ({
  guard: null,
  setGuard: (guard) => set({ guard }),
}))
