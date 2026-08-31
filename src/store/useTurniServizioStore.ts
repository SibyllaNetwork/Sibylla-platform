import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── TURNI DI SERVIZIO (F&B) ──────────────────────────────────────────────────
//  Fonte unica dei turni di servizio degli outlet: orari e copertura per
//  Colazione, Pranzo e Cena. Un servizio può avere più turni (es. Cena con
//  Turno 1 e Turno 2) e ogni turno vale per tutte le sale o per una sola.
//  Le sale citate dai turni sono quelle di `useSaleStore`, gestite in
//  Configuratore → F&B → Sale e tavoli: qui si referenziano per nome.

export type ServizioTurno = 'colazione' | 'pranzo' | 'cena'

export interface Turno {
  id: string
  outletId: number
  servizio: ServizioTurno
  nome: string
  /** Nome della sala; stringa vuota = tutte le sale dell'outlet. */
  sala: string
  /** hh:mm */
  inizio: string
  /** hh:mm */
  fine: string
  /** Copertura massima; 0 = illimitata. */
  maxPax: number
  attivo: boolean
}

export const SERVIZI_TURNO: Array<{
  id: ServizioTurno
  label: string
  /** Token della palette validata: un colore per servizio. */
  colore: string
  ordine: number
}> = [
  { id: 'colazione', label: 'Colazione', colore: 'var(--chart-4)', ordine: 1 },
  { id: 'pranzo',    label: 'Pranzo',    colore: 'var(--chart-3)', ordine: 2 },
  { id: 'cena',      label: 'Cena',      colore: 'var(--chart-1)', ordine: 3 },
]

export const servizioMeta = (id: ServizioTurno) =>
  SERVIZI_TURNO.find(s => s.id === id) ?? SERVIZI_TURNO[0]

/** Minuti dall'inizio del giorno, per ordinare e validare gli orari. */
export const minuti = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const SEED: Turno[] = [
  { id: 't-col-1',   outletId: 1, servizio: 'colazione', nome: 'Turno Unico', sala: '', inizio: '08:00', fine: '11:00', maxPax: 0,   attivo: true },
  { id: 't-pra-1',   outletId: 1, servizio: 'pranzo',    nome: 'Turno 1',     sala: '', inizio: '12:00', fine: '14:00', maxPax: 150, attivo: true },
  { id: 't-pra-2',   outletId: 1, servizio: 'pranzo',    nome: 'Turno 2',     sala: '', inizio: '14:00', fine: '16:00', maxPax: 150, attivo: true },
  { id: 't-cen-1',   outletId: 1, servizio: 'cena',      nome: 'Turno 1',     sala: '', inizio: '19:00', fine: '21:00', maxPax: 150, attivo: true },
  { id: 't-cen-2',   outletId: 1, servizio: 'cena',      nome: 'Turno 2',     sala: '', inizio: '21:00', fine: '23:00', maxPax: 150, attivo: true },
]

interface TurniServizioState {
  turni: Turno[]
  addTurno:    (t: Omit<Turno, 'id'>) => Turno
  updateTurno: (id: string, patch: Partial<Turno>) => void
  removeTurno: (id: string) => void
  toggleTurno: (id: string) => void
}

const newId = () => `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

export const useTurniServizioStore = create<TurniServizioState>()(
  persist(
    (set) => ({
      turni: SEED.map(t => ({ ...t })),

      addTurno: (t) => {
        const created: Turno = { id: newId(), ...t }
        set(s => ({ turni: [...s.turni, created] }))
        return created
      },
      updateTurno: (id, patch) =>
        set(s => ({ turni: s.turni.map(t => t.id === id ? { ...t, ...patch } : t) })),
      removeTurno: (id) =>
        set(s => ({ turni: s.turni.filter(t => t.id !== id) })),
      toggleTurno: (id) =>
        set(s => ({ turni: s.turni.map(t => t.id === id ? { ...t, attivo: !t.attivo } : t) })),
    }),
    { name: 'sibylla.fb.turni', version: 1 },
  ),
)

/** Turni di un outlet ordinati per servizio (colazione → cena) e orario. */
export function turniOrdinati(turni: Turno[], outletId: number): Turno[] {
  return turni
    .filter(t => t.outletId === outletId)
    .sort((a, b) =>
      servizioMeta(a.servizio).ordine - servizioMeta(b.servizio).ordine
      || minuti(a.inizio) - minuti(b.inizio))
}

/**
 * Turni dello stesso servizio e della stessa sala che si accavallano: due turni
 * non possono coprire lo stesso orario nella stessa sala.
 */
export function turnoInConflitto(turni: Turno[], candidato: Turno): Turno | null {
  return turni.find(t =>
    t.id !== candidato.id
    && t.outletId === candidato.outletId
    && t.servizio === candidato.servizio
    // sala vuota = tutte: si accavalla con qualunque sala dello stesso servizio
    && (t.sala === candidato.sala || t.sala === '' || candidato.sala === '')
    && minuti(t.inizio) < minuti(candidato.fine)
    && minuti(candidato.inizio) < minuti(t.fine),
  ) ?? null
}
