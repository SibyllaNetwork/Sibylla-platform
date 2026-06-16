import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BannerConfig } from '../admin/SibyllaAdminPanel/tabs/BannerTab/bannerData'

// Banner di affiliazione salvati dall'utente, persistiti in localStorage così da
// poter essere ripresi e modificati in sessioni successive.
export interface SavedBanner {
  id: string
  name: string
  formatId: string
  config: BannerConfig
  updatedAt: number
}

interface BannerState {
  saved: SavedBanner[]
  /** Salva (o aggiorna se esiste già un banner con lo stesso nome). Ritorna l'id. */
  saveBanner: (name: string, formatId: string, config: BannerConfig) => string
  removeBanner: (id: string) => void
  renameBanner: (id: string, name: string) => void
}

export const useBannerStore = create<BannerState>()(
  persist(
    (set, get) => ({
      saved: [],
      saveBanner: (name, formatId, config) => {
        const now = Date.now()
        const existing = get().saved.find(b => b.name.trim().toLowerCase() === name.trim().toLowerCase())
        if (existing) {
          set(s => ({
            saved: s.saved.map(b =>
              b.id === existing.id ? { ...b, formatId, config, updatedAt: now } : b),
          }))
          return existing.id
        }
        const id = `bn-${now}-${Math.floor(now % 100000)}`
        set(s => ({ saved: [{ id, name: name.trim(), formatId, config, updatedAt: now }, ...s.saved] }))
        return id
      },
      removeBanner: (id) => set(s => ({ saved: s.saved.filter(b => b.id !== id) })),
      renameBanner: (id, name) =>
        set(s => ({ saved: s.saved.map(b => b.id === id ? { ...b, name: name.trim() } : b) })),
    }),
    { name: 'sibylla.banners' },
  ),
)
