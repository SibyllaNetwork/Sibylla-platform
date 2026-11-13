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
  /** Piani su cui ci sono camere della tipologia (per il filtro Piano). */
  piani?: string[]
  descrizione: string
  nomeOnline: string
  amenities: string[]
  immagine: string | null
  gallery: string[]
  attiva: boolean
  /** Personalizzazione operativa della tipologia (housekeeping). Assente = valori predefiniti. */
  personalizzazione?: PersonalizzazioneCamera
}

/** Segmento dell'ospite che determina le regole di servizio in camera. */
export type SegmentoOspite = 'individuali' | 'corporate' | 'gruppi'

export interface PersonalizzazioneCamera {
  /** Intervallo in giorni del cambio lenzuola, contato dalla data di arrivo del
   *  soggiorno; 0 = solo alla partenza. Il cambio il giorno della partenza è
   *  sempre previsto, a prescindere dall'intervallo. */
  cambioLenzuola: Record<SegmentoOspite, number>
  /** 'tutti' = stesso intervallo per ogni ospite (`cambioLenzuolaTutti`);
   *  'segmento' (o assente) = intervallo per tipo di ospite. */
  modoLenzuola?: 'tutti' | 'segmento'
  cambioLenzuolaTutti?: number
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
