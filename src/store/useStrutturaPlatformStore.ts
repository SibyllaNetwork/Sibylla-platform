// Store delle strutture a livello di piattaforma — distinto da useOrgStore
// (che tiene la sessione/tenant attivo). Qui vive l'anagrafica globale di
// tutte le strutture configurate nel SibyllaAdminPanel.

import { create } from 'zustand'
import { STRUTTURE_INIT } from '../admin/SibyllaAdminPanel/strutture/seed'
import type { CanaleVendita, Struttura } from '../admin/SibyllaAdminPanel/strutture/types'

interface StrutturaPlatformState {
  strutture: Struttura[]

  addStruttura:    (s: Omit<Struttura, 'id'>) => Struttura
  updateStruttura: (id: string, patch: Partial<Struttura>) => void
  removeStruttura: (id: string) => void
  toggleAttiva:    (id: string) => void
  // Toggle della pubblicazione su un singolo canale (Agorà / B2B / B2C).
  toggleCanale:    (id: string, canale: CanaleVendita) => void
}

const newId = () => `str-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export const useStrutturaPlatformStore = create<StrutturaPlatformState>((set) => ({
  strutture: STRUTTURE_INIT,

  addStruttura: (s) => {
    const created: Struttura = { id: newId(), ...s }
    set(state => ({ strutture: [...state.strutture, created] }))
    return created
  },
  updateStruttura: (id, patch) =>
    set(state => ({ strutture: state.strutture.map(s => s.id === id ? { ...s, ...patch } : s) })),
  removeStruttura: (id) =>
    set(state => ({ strutture: state.strutture.filter(s => s.id !== id) })),
  toggleAttiva: (id) =>
    set(state => ({ strutture: state.strutture.map(s => s.id === id ? { ...s, attiva: !s.attiva } : s) })),
  toggleCanale: (id, canale) =>
    set(state => ({
      strutture: state.strutture.map(s => {
        if (s.id !== id) return s
        const curr = s.canali[canale]
        return {
          ...s,
          canali: { ...s.canali, [canale]: { ...curr, pubblicata: !curr.pubblicata } },
        }
      }),
    })),
}))
