// ─────────────────────────────────────────────────────────────────────────────
//  Store globale dei MODULI della piattaforma.
//
//  I moduli (insiemi di pagine + voci del Configuratore) sono una risorsa di
//  piattaforma: vengono CREATI dall'Amministrazione piattaforma (Console Agorà →
//  "Nuovo modulo") e ASSEGNATI ai clienti nel pannello admin del cliente.
//  Tenerli in uno store unico evita divergenze tra i due punti d'uso.
//
//  Persistito in localStorage (chiave «sibylla.moduli»).
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Modulo } from '../admin/SibyllaAdminPanel/types'
import { PACCHETTI_INIT } from '../admin/SibyllaAdminPanel/constants'

interface State {
  moduli: Modulo[]
  addModulo: (m: Omit<Modulo, 'id'>) => void
  updateModulo: (id: string, patch: Partial<Modulo>) => void
  removeModulo: (id: string) => void
}

export const useModuliStore = create<State>()(
  persist(
    (set) => ({
      moduli: PACCHETTI_INIT.map(p => ({ ...p, pages: [...p.pages] })),
      addModulo: (m) =>
        set(s => ({ moduli: [...s.moduli, { ...m, id: `custom-${Date.now()}` }] })),
      updateModulo: (id, patch) =>
        set(s => ({ moduli: s.moduli.map(x => (x.id === id ? { ...x, ...patch } : x)) })),
      removeModulo: (id) =>
        set(s => ({ moduli: s.moduli.filter(x => x.id !== id) })),
    }),
    // v2: catalogo a 4 moduli (Struttura ricettiva / Tour Operator / Ristorazione / Full).
    { name: 'sibylla.moduli', version: 2, migrate: () => ({ moduli: PACCHETTI_INIT.map(p => ({ ...p, pages: [...p.pages] })) }) },
  ),
)
