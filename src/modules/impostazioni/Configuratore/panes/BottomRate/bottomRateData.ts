// ─────────────────────────────────────────────────────────────────────────────
//  Bottom rate — dati e store.
//
//  Soglia tariffaria minima per tipologia camera e piano tariffario
//  (BAR / FIT / Gruppi): il piano attivo è quello su cui lavora il pricing
//  automatico. La configurazione della notifica sotto-soglia (canale +
//  segmento) è parte del configuratore. Persistito in
//  «sibylla.cfg.bottomrate».
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PianoTariffario = 'BAR' | 'FIT' | 'GRUPPI'

export const PIANI: { id: PianoTariffario; label: string }[] = [
  { id: 'BAR',    label: 'BAR' },
  { id: 'FIT',    label: 'FIT' },
  { id: 'GRUPPI', label: 'Gruppi' },
]

export interface RigaBottomRate {
  id: number
  nome: string
  /** Soglia per piano (null = piano non configurato). */
  valori: Record<PianoTariffario, number | null>
  /** Piano configurato e attivo per la tipologia (evidenziato in blu). */
  attivo: PianoTariffario
}

export interface NotificaSottoSoglia {
  attiva: boolean
  canale: string
  segmento: string
  /** L'utente corrente è autorizzato alla riapertura del canale. */
  autorizzato: boolean
}

export const CANALI = ['TO Alpitour', 'TO Veratour', 'OTA Booking.com', 'Sito diretto']
export const SEGMENTI_NOTIFICA = ['B2B', 'Gruppi', 'OTA', 'Direct']

const TIPI = [
  'Singola Classic',
  'Doppia Classic',
  'Doppia Economy',
  'Tripla Classic',
  'Matrimoniale convertibile in Tripla',
  'Matrimoniale Economy',
  'Matrimoniale Classic',
  'Doppia convertibile in Quadrupla',
  'Doppia convertibile in Tripla',
]

// Profilo a metà configurazione: BAR ovunque, FIT e Gruppi solo in parte
// (coerente con il seed 'partial' dello store Configuratore).
const SEED_RIGHE: RigaBottomRate[] = TIPI.map((nome, i) => ({
  id: i + 1,
  nome,
  valori: {
    BAR: 52 + i * 7,
    FIT: i < 5 ? 48 + i * 6 : null,
    GRUPPI: i < 3 ? 44 + i * 6 : null,
  },
  attivo: 'BAR',
}))

const SEED_NOTIFICA: NotificaSottoSoglia = {
  attiva: true,
  canale: CANALI[0],
  segmento: SEGMENTI_NOTIFICA[1],
  autorizzato: true,
}

interface BottomRateState {
  righe: RigaBottomRate[]
  notifica: NotificaSottoSoglia
  salva: (righe: RigaBottomRate[], notifica: NotificaSottoSoglia) => void
}

export const useBottomRateStore = create<BottomRateState>()(
  persist(
    (set) => ({
      righe: SEED_RIGHE.map(r => ({ ...r, valori: { ...r.valori } })),
      notifica: { ...SEED_NOTIFICA },
      salva: (righe, notifica) => set({ righe, notifica }),
    }),
    { name: 'sibylla.cfg.bottomrate', version: 1 },
  ),
)
