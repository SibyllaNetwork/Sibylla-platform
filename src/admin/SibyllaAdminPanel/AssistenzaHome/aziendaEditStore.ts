// ─────────────────────────────────────────────────────────────────────────────
//  Ponte tra "Gestione delle aziende" e "Crea azienda": tiene la bozza da
//  precompilare quando si clicca la matita (Modifica) su una riga. CreaAzienda
//  legge la bozza al mount e la svuota, così l'apertura normale resta a vuoto.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import type { FormState } from './CreaAzienda'

interface AziendaEditState {
  draft: Partial<FormState> | null
  startEdit: (d: Partial<FormState>) => void
  clear: () => void
}

export const useAziendaEditStore = create<AziendaEditState>(set => ({
  draft: null,
  startEdit: d => set({ draft: d }),
  clear: () => set({ draft: null }),
}))
