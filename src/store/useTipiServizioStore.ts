import { create } from 'zustand'
import {
  TIPI_SERVIZIO_INIT,
  TIPO_SERVIZIO_FALLBACK,
  type TipoServizio,
  type TipoServizioMeta,
} from '../modules/purchasing/Servizi/servizi-types'

interface TipiServizioState {
  tipi: TipoServizioMeta[]

  addTipo:    (t: TipoServizioMeta) => void
  updateTipo: (id: TipoServizio, patch: Partial<TipoServizioMeta>) => void
  removeTipo: (id: TipoServizio) => void

  // Helper di lettura: se l'id non esiste, ritorna il fallback senza eccezioni.
  meta: (id: TipoServizio) => TipoServizioMeta
}

export const useTipiServizioStore = create<TipiServizioState>((set, get) => ({
  tipi: TIPI_SERVIZIO_INIT,

  addTipo: (t) =>
    set(state => {
      if (state.tipi.some(x => x.id === t.id)) return state
      return { tipi: [...state.tipi, t] }
    }),
  updateTipo: (id, patch) =>
    set(state => ({
      tipi: state.tipi.map(x => x.id === id ? { ...x, ...patch } : x),
    })),
  removeTipo: (id) =>
    set(state => ({ tipi: state.tipi.filter(x => x.id !== id) })),

  meta: (id) => {
    const t = get().tipi.find(x => x.id === id)
    return t || TIPO_SERVIZIO_FALLBACK
  },
}))
