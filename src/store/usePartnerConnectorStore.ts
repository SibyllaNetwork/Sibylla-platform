import { create } from 'zustand'
import { PARTNER_CONNECTORS_INIT } from '../admin/SibyllaAdminPanel/strutture/partner-seed'
import type { CanaleVendita } from '../admin/SibyllaAdminPanel/strutture/types'
import type { PartnerConnector } from '../admin/SibyllaAdminPanel/strutture/partner-types'

interface PartnerConnectorState {
  connectors: PartnerConnector[]

  addConnector:    (c: Omit<PartnerConnector, 'id'>) => PartnerConnector
  updateConnector: (id: string, patch: Partial<PartnerConnector>) => void
  removeConnector: (id: string) => void
  toggleAttivo:    (id: string) => void
  toggleCanale:    (id: string, canale: CanaleVendita) => void
  // Simula una sincronizzazione: marca lo stato come 'in-corso' e dopo
  // un secondo lo riporta a 'ok' aggiornando lastSync (solo nel mock — il
  // backend reale gestirà la chiamata HTTP al partner).
  triggerSync:     (id: string) => void
}

const newId = () => `pc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

export const usePartnerConnectorStore = create<PartnerConnectorState>((set) => ({
  connectors: PARTNER_CONNECTORS_INIT,

  addConnector: (c) => {
    const created: PartnerConnector = { id: newId(), ...c }
    set(state => ({ connectors: [...state.connectors, created] }))
    return created
  },
  updateConnector: (id, patch) =>
    set(state => ({ connectors: state.connectors.map(c => c.id === id ? { ...c, ...patch } : c) })),
  removeConnector: (id) =>
    set(state => ({ connectors: state.connectors.filter(c => c.id !== id) })),
  toggleAttivo: (id) =>
    set(state => ({ connectors: state.connectors.map(c => c.id === id ? { ...c, attivo: !c.attivo } : c) })),
  toggleCanale: (id, canale) =>
    set(state => ({
      connectors: state.connectors.map(c => {
        if (c.id !== id) return c
        const curr = c.canali[canale]
        return { ...c, canali: { ...c.canali, [canale]: { ...curr, abilitato: !curr.abilitato } } }
      }),
    })),
  triggerSync: (id) => {
    set(state => ({
      connectors: state.connectors.map(c => c.id === id ? { ...c, statoSync: 'in-corso', messaggioSync: 'Sincronizzazione in corso…' } : c),
    }))
    window.setTimeout(() => {
      set(state => ({
        connectors: state.connectors.map(c => c.id === id
          ? { ...c, statoSync: 'ok', messaggioSync: 'Sincronizzazione completata', ultimoSync: new Date().toISOString() }
          : c),
      }))
    }, 1400)
  },
}))
