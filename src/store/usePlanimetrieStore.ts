import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Planimetrie dei piani ────────────────────────────────────────────────────
//  Ogni struttura può disegnare, per ciascun piano, una planimetria: una griglia
//  di celle su cui l'albergatore posiziona le CAMERE (agganciate al numero reale
//  del piano) e gli ELEMENTI di struttura (corridoio, scale, ascensore, ecc.).
//  La planimetria viene creata nell'editor (PlanimetriaEditor) e poi usata in sola
//  lettura dal viewer (PlanimetriaModal), dove le camere si colorano con lo stato
//  di occupazione live. Risolve la leggibilità degli hotel con molte camere, dove
//  la vecchia griglia √n diventava illeggibile.
//
//  Store singleton persistito: chiave = `${struttura}::${pianoId}`.

export type ElementoKind =
  | 'camera'
  // struttura
  | 'corridoio'
  | 'scala'
  | 'ascensore'
  | 'ingresso'
  | 'bagno'
  | 'area'
  // arredo & servizi
  | 'reception'
  | 'desk'
  | 'divano'
  | 'poltrona'
  | 'pianta'

/** Metadati di ogni tipo di elemento non-camera (icona FA + etichetta). */
export const ELEMENTO_META: Record<
  Exclude<ElementoKind, 'camera'>,
  { label: string; icon: string }
> = {
  corridoio:  { label: 'Corridoio',  icon: 'fa-arrows-left-right' },
  scala:      { label: 'Scala',      icon: 'fa-stairs' },
  ascensore:  { label: 'Ascensore',  icon: 'fa-elevator' },
  ingresso:   { label: 'Ingresso',   icon: 'fa-door-open' },
  bagno:      { label: 'Bagno comune', icon: 'fa-restroom' },
  area:       { label: 'Area',       icon: 'fa-vector-square' },
  reception:  { label: 'Reception',  icon: 'fa-bell-concierge' },
  desk:       { label: 'Desk',       icon: 'fa-table' },
  divano:     { label: 'Divanetto',  icon: 'fa-couch' },
  poltrona:   { label: 'Poltrona',   icon: 'fa-chair' },
  pianta:     { label: 'Pianta',     icon: 'fa-seedling' },
}

/** Elementi di sola struttura vs arredo & servizi (per raggruppare la palette). */
export const KIND_STRUTTURA: Array<Exclude<ElementoKind, 'camera'>> =
  ['corridoio', 'scala', 'ascensore', 'ingresso', 'bagno', 'area']
export const KIND_ARREDO: Array<Exclude<ElementoKind, 'camera'>> =
  ['reception', 'desk', 'divano', 'poltrona', 'pianta']

/** Esposizione / affaccio della camera. */
export type Esposizione = 'strada' | 'giardino' | 'mare' | 'corte interna' | 'piazza' | 'montagna'

export const ESPOSIZIONI: Esposizione[] = ['strada', 'giardino', 'mare', 'corte interna', 'piazza', 'montagna']

export interface PlanItem {
  id: string
  kind: ElementoKind
  /** Solo per kind='camera': aggancio al numero della camera del piano. */
  numero?: string
  /** Etichetta libera (aree, elementi). */
  label?: string
  /** Posizione e dimensione in CELLE della griglia (la posizione fisica). */
  x: number
  y: number
  w: number
  h: number

  // ── Riferimenti gestiti dal sistema (solo camere) ──────────────────────────
  //  Questi campi rendono la camera "gestibile" a valle: descrivono tipologia,
  //  metratura, capacità e affaccio così come verranno usati da PMS/planner.
  /** Tipologia commerciale (es. "Doppia Classic", "Suite vista mare"). */
  tipologia?: string
  /** Metri quadri. */
  metratura?: number
  /** Pax massimi. */
  capacita?: number
  /** Descrizione letti (es. "1 matrimoniale + 1 divano letto"). */
  letti?: string
  /** Affaccio / esposizione. */
  esposizione?: Esposizione
  /** Accessibilità disabili. */
  accessibile?: boolean
  /** Note operative libere. */
  note?: string
}

export interface Planimetria {
  cols: number
  rows: number
  items: PlanItem[]
}

const keyOf = (struttura: string, pianoId: number) => `${struttura}::${pianoId}`

/** Costruisce l'id pagina da passare a navigate() per aprire l'editor planimetria. */
export const planimetriaEditorPage = (struttura: string, pianoId: number) =>
  `planimetria-editor:${encodeURIComponent(struttura)}__${pianoId}`

// ── Seed dimostrativo: Primo Piano di "Hotel Tutorial" (corridoio centrale) ─────
const room = (
  numero: string, x: number, y: number,
  tipologia = 'Doppia Classic', metratura = 22, capacita = 2, esposizione: Esposizione = 'strada',
): PlanItem => ({
  id: `seed-${numero}`, kind: 'camera', numero, x, y, w: 2, h: 2,
  tipologia, metratura, capacita, esposizione,
  letti: capacita >= 3 ? '1 matrimoniale + 1 singolo' : '1 matrimoniale',
})
const SEED_PRIMO_PIANO: Planimetria = {
  cols: 14,
  rows: 7,
  items: [
    // fila superiore
    room('101', 0, 0, 'Singola Classic', 16, 1, 'strada'),
    room('102', 2, 0, 'Singola Classic', 16, 1, 'strada'),
    room('103', 4, 0, 'Doppia Classic', 22, 2, 'strada'),
    room('104', 6, 0, 'Doppia Classic', 22, 2, 'giardino'),
    room('105', 8, 0, 'Doppia Classic', 24, 2, 'giardino'),
    { id: 'seed-scala-t', kind: 'scala', x: 12, y: 0, w: 2, h: 2, label: 'Scala' },
    // corridoio centrale
    { id: 'seed-corr', kind: 'corridoio', x: 0, y: 2, w: 14, h: 1, label: 'Corridoio' },
    // fila inferiore
    room('106', 0, 3, 'Doppia Classic', 22, 2, 'corte interna'),
    room('107', 2, 3, 'Matrimoniale Classic', 24, 2, 'corte interna'),
    room('108', 4, 3, 'Doppia Classic', 22, 2, 'corte interna'),
    room('109', 6, 3, 'Doppia Classic', 20, 2, 'corte interna'),
    { id: 'seed-asc', kind: 'ascensore', x: 10, y: 3, w: 2, h: 2, label: 'Ascensore' },
    { id: 'seed-scala-b', kind: 'scala', x: 12, y: 3, w: 2, h: 2, label: 'Scala' },
  ],
}

interface PlanimetrieState {
  byKey: Record<string, Planimetria>
  getPlan: (struttura: string, pianoId: number) => Planimetria | undefined
  savePlan: (struttura: string, pianoId: number, plan: Planimetria) => void
  removePlan: (struttura: string, pianoId: number) => void
}

export const usePlanimetrieStore = create<PlanimetrieState>()(
  persist(
    (set, get) => ({
      byKey: {
        [keyOf('Hotel Tutorial', 1)]: SEED_PRIMO_PIANO,
      },
      getPlan: (struttura, pianoId) => get().byKey[keyOf(struttura, pianoId)],
      savePlan: (struttura, pianoId, plan) =>
        set((s) => ({ byKey: { ...s.byKey, [keyOf(struttura, pianoId)]: plan } })),
      removePlan: (struttura, pianoId) =>
        set((s) => {
          const next = { ...s.byKey }
          delete next[keyOf(struttura, pianoId)]
          return { byKey: next }
        }),
    }),
    { name: 'sibylla.planimetrie', version: 2 },
  ),
)
