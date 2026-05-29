import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Temi disponibili — corrispondono a [data-theme="..."] in src/styles/_themes.sass
export type Theme = 'classic' | 'editorial' | 'swiss' | 'terracotta' | 'dark'

export const THEMES: { id: Theme; label: string; description: string }[] = [
  { id: 'classic',    label: 'Classic',    description: 'Navy + oro, look originale Sibylla' },
  { id: 'editorial',  label: 'Pro',        description: 'Look CRM moderno — dark slate + accento indaco' },
  { id: 'swiss',      label: 'Swiss',      description: 'Inter + bordi neri, minimal svizzero' },
  { id: 'terracotta', label: 'Terracotta', description: 'Terra + verde oliva, mediterraneo' },
  { id: 'dark',       label: 'Dark',       description: 'Dark mode professionale — slate + accento blu' },
]

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'classic',
      setTheme: (t) => set({ theme: t }),
    }),
    { name: 'sibylla.theme' }
  )
)
