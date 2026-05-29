import { create } from 'zustand'
import { SERVIZI_INIT } from '../modules/purchasing/Servizi/servizi-seed'
import type { Servizio } from '../modules/purchasing/Servizi/servizi-types'

interface ServiziState {
  servizi: Servizio[]

  addServizio:    (s: Omit<Servizio, 'id'>) => Servizio
  updateServizio: (id: string, patch: Partial<Servizio>) => void
  removeServizio: (id: string) => void
  toggleAttivo:     (id: string) => void
  togglePubblicato: (id: string) => void
}

const newId = () => `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export const useServiziStore = create<ServiziState>((set) => ({
  servizi: SERVIZI_INIT,

  addServizio: (s) => {
    const created: Servizio = { id: newId(), ...s }
    set(state => ({ servizi: [...state.servizi, created] }))
    return created
  },
  updateServizio: (id, patch) =>
    set(state => ({ servizi: state.servizi.map(s => s.id === id ? { ...s, ...patch } : s) })),
  removeServizio: (id) =>
    set(state => ({ servizi: state.servizi.filter(s => s.id !== id) })),
  toggleAttivo: (id) =>
    set(state => ({ servizi: state.servizi.map(s => s.id === id ? { ...s, attivo: !s.attivo } : s) })),
  togglePubblicato: (id) =>
    set(state => ({ servizi: state.servizi.map(s => s.id === id ? { ...s, pubblicato: !s.pubblicato } : s) })),
}))
