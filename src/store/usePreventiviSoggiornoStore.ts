import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Preventivi di soggiorno ──────────────────────────────────────────────────
//  Un preventivo propone una o più soluzioni di soggiorno (date, camere,
//  trattamento, servizi inclusi, tassa di soggiorno, prezzo). Il cliente lo
//  riceve via mail e accetta una delle proposte dai pulsanti nel messaggio.
//  Mock persistito: il BE salverà e invierà davvero la mail.

export type StatoPreventivo = 'Bozza' | 'Inviato' | 'Accettato' | 'Rifiutato'

export interface CameraProposta {
  id: string
  tipologia: string
  quantita: number
  prezzoNotte: number
}

export interface PropostaSoggiorno {
  id: string
  titolo: string
  checkin: string
  checkout: string
  adulti: number
  bambini: number
  camere: CameraProposta[]
  trattamento: string
  servizi: string[]
  scontoPct: number
  /** Tassa di soggiorno: importo a persona per notte. */
  tassaImporto: number
  /** Notti massime soggette a tassa (regolamento comunale). */
  tassaMaxNotti: number
  /** Minori esenti dalla tassa. */
  tassaEsentiMinori: boolean
}

export interface PreventivoSoggiorno {
  id: string
  codice: string
  struttura: string
  cliente: string
  email: string
  telefono: string
  messaggio: string
  validita: string
  creato: string
  stato: StatoPreventivo
  inviatoIl?: string
  /** Proposta scelta dal cliente. */
  accettata?: string
  rispostaIl?: string
  proposte: PropostaSoggiorno[]
}

interface PreventiviSoggiornoState {
  preventivi: PreventivoSoggiorno[]
  salva: (p: PreventivoSoggiorno) => void
  aggiorna: (id: string, patch: Partial<PreventivoSoggiorno>) => void
  elimina: (id: string) => void
  prossimoCodice: () => string
}

export const usePreventiviSoggiornoStore = create<PreventiviSoggiornoState>()(
  persist(
    (set, get) => ({
      preventivi: [],
      salva: (p) => set((s) => ({
        preventivi: s.preventivi.some((x) => x.id === p.id)
          ? s.preventivi.map((x) => (x.id === p.id ? p : x))
          : [p, ...s.preventivi],
      })),
      aggiorna: (id, patch) => set((s) => ({
        preventivi: s.preventivi.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      })),
      elimina: (id) => set((s) => ({ preventivi: s.preventivi.filter((x) => x.id !== id) })),
      prossimoCodice: () => `PRV-S${101 + get().preventivi.reduce((m, p) => Math.max(m, Number(p.codice.slice(5)) - 101 + 1 || 0), 0)}`,
    }),
    { name: 'sibylla.preventivi-soggiorno', version: 1 },
  ),
)
