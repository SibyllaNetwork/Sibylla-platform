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
  /** Tariffa base a notte: vale per i giorni senza tariffa propria. */
  prezzoNotte: number
  /** Tariffe giorno per giorno (data ISO della notte → prezzo). */
  tariffe: Record<string, number>
  descrizione: string
  /** Foto della camera (data URL compressa); null = illustrazione. */
  immagine: string | null
}

export type UnitaExtra = 'soggiorno' | 'persona' | 'notte' | 'persona-notte'

/** Servizio aggiuntivo a pagamento, che il cliente può aggiungere accettando. */
export interface ServizioExtra {
  id: string
  nome: string
  prezzo: number
  unita: UnitaExtra
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
  extra: ServizioExtra[]
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
  /** Servizi aggiuntivi scelti dal cliente (id di ServizioExtra). */
  extraScelti?: string[]
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
    {
      name: 'sibylla.preventivi-soggiorno',
      version: 2,
      // v2: tariffe giorno per giorno, foto/descrizione camera, servizi extra.
      migrate: (stato: any) => ({
        ...stato,
        preventivi: (stato?.preventivi ?? []).map((p: any) => ({
          ...p,
          proposte: p.proposte.map((q: any) => ({
            ...q, extra: q.extra ?? [],
            camere: q.camere.map((c: any) => ({ tariffe: {}, descrizione: '', immagine: null, ...c })),
          })),
        })),
      }),
    },
  ),
)
