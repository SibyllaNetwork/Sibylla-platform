import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BookingPageConfig } from '../admin/SibyllaAdminPanel/tabs/BannerTab/bookingPageData'

// Pagine di Booking salvate dall'utente, persistite in localStorage così da
// poter essere riprese e modificate in sessioni successive (come i banner).
export interface SavedBookingPage {
  id: string
  name: string
  config: BookingPageConfig
  updatedAt: number
}

interface BookingPageState {
  saved: SavedBookingPage[]
  /** Salva (o aggiorna se esiste già una pagina con lo stesso nome). Ritorna l'id. */
  savePage: (name: string, config: BookingPageConfig) => string
  removePage: (id: string) => void
  renamePage: (id: string, name: string) => void
}

export const useBookingPageStore = create<BookingPageState>()(
  persist(
    (set, get) => ({
      saved: [],
      savePage: (name, config) => {
        const now = Date.now()
        const existing = get().saved.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase())
        if (existing) {
          set(s => ({
            saved: s.saved.map(p => p.id === existing.id ? { ...p, config, updatedAt: now } : p),
          }))
          return existing.id
        }
        const id = `bp-${now}-${Math.floor(now % 100000)}`
        set(s => ({ saved: [{ id, name: name.trim(), config, updatedAt: now }, ...s.saved] }))
        return id
      },
      removePage: (id) => set(s => ({ saved: s.saved.filter(p => p.id !== id) })),
      renamePage: (id, name) =>
        set(s => ({ saved: s.saved.map(p => p.id === id ? { ...p, name: name.trim() } : p) })),
    }),
    { name: 'sibylla.booking-pages' },
  ),
)
