import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Tipologie camera ─────────────────────────────────────────────────────────
//  Inventario camere per tipologia (nome, numero camere, capacità, letti extra,
//  scheda con caratteristiche/descrizione/immagini). Per struttura (nome),
//  persistito (mock): finché una struttura non viene salvata, la pagina parte
//  dalle tipologie derivate dalle camere demo.

export interface TipologiaCamera {
  id: string
  nome: string
  /** Categoria base (Singola, Doppia, …) mostrata sotto al nome. */
  tipo: string
  numero: number
  capacita: number
  lettiExtra: number
  descrizione: string
  nomeOnline: string
  amenities: string[]
  immagine: string | null
  gallery: string[]
  attiva: boolean
}

interface TipologieCamereState {
  salvate: Record<string, TipologiaCamera[]>
  salva: (struttura: string, tipologie: TipologiaCamera[]) => void
}

export const useTipologieCamereStore = create<TipologieCamereState>()(
  persist(
    (set) => ({
      salvate: {},
      salva: (struttura, tipologie) => set((s) => ({ salvate: { ...s.salvate, [struttura]: tipologie } })),
    }),
    {
      name: 'sibylla.tipologie-camere',
      // Le immagini caricate sono blob: della sessione, non sopravvivono al reload.
      partialize: (s) => ({
        salvate: Object.fromEntries(Object.entries(s.salvate).map(([k, list]) => [k, list.map((t) => ({
          ...t,
          immagine: t.immagine?.startsWith('blob:') ? null : t.immagine,
          gallery: t.gallery.filter((g) => !g.startsWith('blob:')),
        }))])),
      }),
    },
  ),
)
