import { create } from 'zustand'
import { FORNITORI_SERVIZI_INIT } from '../modules/purchasing/Servizi/fornitori-seed'
import type { MercatoServizio } from '../modules/purchasing/Servizi/servizi-types'
import type { FornitoreServiziConnector } from '../modules/purchasing/Servizi/fornitori-types'

// Store dei connettori verso i fornitori terzi di SERVIZI (il gemello di
// usePartnerConnectorStore, che fa la stessa cosa per le strutture).
// La sincronizzazione è simulata: il backend reale farà la chiamata HTTP al
// fornitore e popolerà il catalogo servizi.

interface FornitoreServiziState {
  connectors: FornitoreServiziConnector[]

  addConnector:    (c: Omit<FornitoreServiziConnector, 'id'>) => FornitoreServiziConnector
  updateConnector: (id: string, patch: Partial<FornitoreServiziConnector>) => void
  removeConnector: (id: string) => void
  toggleAttivo:    (id: string) => void
  toggleCanale:    (id: string, canale: MercatoServizio) => void
  triggerSync:     (id: string) => void
}

const newId = () => `fs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

/** Servizi che una sync porterebbe dentro: dipende da quante categorie sono mappate. */
const stimaImport = (c: FornitoreServiziConnector): number => {
  const mappate = c.categoryMapping.filter(r => r.tipoServizio !== '').length
  if (mappate === 0) return c.serviziImportati
  return c.serviziImportati + mappate * (8 + Math.floor(Math.random() * 12))
}

export const useFornitoreServiziStore = create<FornitoreServiziState>((set, get) => ({
  connectors: FORNITORI_SERVIZI_INIT,

  addConnector: (c) => {
    const created: FornitoreServiziConnector = { id: newId(), ...c }
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
    const target = get().connectors.find(c => c.id === id)
    if (!target) return
    const mappate = target.categoryMapping.filter(r => r.tipoServizio !== '').length

    set(state => ({
      connectors: state.connectors.map(c => c.id === id
        ? { ...c, statoSync: 'in-corso', messaggioSync: 'Sincronizzazione in corso…' }
        : c),
    }))

    window.setTimeout(() => {
      set(state => ({
        connectors: state.connectors.map(c => {
          if (c.id !== id) return c
          // Senza categorie mappate l'import non produce servizi vendibili:
          // la sync si chiude in errore, così il problema è visibile.
          if (mappate === 0) {
            return {
              ...c,
              statoSync: 'errore',
              messaggioSync: 'Nessuna categoria mappata su un tipo di servizio: i servizi importati non sarebbero prenotabili',
              ultimoSync: new Date().toISOString(),
            }
          }
          const totale = stimaImport(c)
          const nuovi = totale - c.serviziImportati
          return {
            ...c,
            statoSync: 'ok',
            messaggioSync: `${totale.toLocaleString('it-IT')} servizi allineati, ${nuovi} nuovi`,
            serviziImportati: totale,
            ultimoSync: new Date().toISOString(),
          }
        }),
      }))
    }, 1400)
  },
}))
