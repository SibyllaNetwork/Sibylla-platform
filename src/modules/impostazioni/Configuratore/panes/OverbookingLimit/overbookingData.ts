// ─────────────────────────────────────────────────────────────────────────────
//  Overbooking limit — dati e store.
//
//  Le regole (tipologia camera × periodo stagionale) dicono fino a che
//  livello il sistema può accettare vendite oltre la disponibilità fisica.
//  Il periodo è una delle stagionalità configurate (il configuratore è
//  sbloccato solo a Stagionalità configurata e applicata). Persistito in
//  «sibylla.cfg.overbooking».
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RegolaOverbooking {
  id: string
  tipologia: string
  /** Id della stagionalità (catalogo del Pannello di Controllo). */
  stagioneId: string
  /** OverBooking limit in % sulla disponibilità fisica. */
  limit: number
  /** Protection in %: quota protetta non vendibile in overbooking. */
  protection: number
}

export const TIPOLOGIE_CAMERA_OVB = [
  'Singola Classic',
  'Doppia Classic',
  'Doppia Economy',
  'Tripla Classic',
  'Matrimoniale Classic',
  'Matrimoniale Economy',
]

// Regole d'esempio del profilo demo (righe espandibili già popolate).
const SEED_REGOLE: RegolaOverbooking[] = [
  { id: 'ovb-1', tipologia: 'Doppia Classic',      stagioneId: 'low-1',  limit: 10, protection: 2 },
  { id: 'ovb-2', tipologia: 'Doppia Classic',      stagioneId: 'high-1', limit: 6,  protection: 4 },
  { id: 'ovb-3', tipologia: 'Doppia Classic',      stagioneId: 'peak',   limit: 3,  protection: 6 },
  { id: 'ovb-4', tipologia: 'Singola Classic',     stagioneId: 'low-1',  limit: 8,  protection: 2 },
  { id: 'ovb-5', tipologia: 'Singola Classic',     stagioneId: 'peak',   limit: 2,  protection: 5 },
  { id: 'ovb-6', tipologia: 'Matrimoniale Classic', stagioneId: 'mid-1', limit: 5,  protection: 3 },
]

interface OverbookingState {
  regole: RegolaOverbooking[]
  salva: (regole: RegolaOverbooking[]) => void
}

export const useOverbookingStore = create<OverbookingState>()(
  persist(
    (set) => ({
      regole: SEED_REGOLE.map(r => ({ ...r })),
      salva: (regole) => set({ regole }),
    }),
    { name: 'sibylla.cfg.overbooking', version: 1 },
  ),
)
