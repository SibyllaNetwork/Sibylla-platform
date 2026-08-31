import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── SERVICE MONITOR (F&B) ────────────────────────────────────────────────────
//  Monitor KDS di reparto: la pagina che in cucina o al bar mostra le comande
//  attive. Ogni monitor genera un URL univoco da aprire sul display del
//  reparto; la pagina si aggiorna da sé ogni pochi secondi.
//
//  Le voci di menu (`useVociMenuStore`) instradano i piatti a questi monitor
//  per id: è la fonte unica dei nomi che compaiono là.

export type RepartoMonitor = 'cucina' | 'bar' | 'pasticceria' | 'pass' | 'dispensa'

export interface Monitor {
  id: string
  nome: string
  reparto: RepartoMonitor
  outletId: number
  /** Coda dell'URL pubblico: univoca, è ciò che identifica il display. */
  slug: string
  /** Secondi fra un aggiornamento e il successivo. */
  refreshSec: number
  attivo: boolean
}

export const REPARTI_MONITOR: Array<{
  id: RepartoMonitor
  label: string
  /** Token della palette validata: un colore per reparto. */
  colore: string
}> = [
  { id: 'cucina',      label: 'Cucina',      colore: 'var(--chart-1)' },
  { id: 'bar',         label: 'Bar',         colore: 'var(--chart-3)' },
  { id: 'pasticceria', label: 'Pasticceria', colore: 'var(--chart-4)' },
  { id: 'pass',        label: 'Pass',        colore: 'var(--chart-5)' },
  { id: 'dispensa',    label: 'Dispensa',    colore: 'var(--chart-6)' },
]

export const repartoMonitorMeta = (id: RepartoMonitor) =>
  REPARTI_MONITOR.find(r => r.id === id) ?? REPARTI_MONITOR[0]

/** Intervalli di aggiornamento proposti: sotto i 10 s il display sfarfalla. */
export const REFRESH_MONITOR: number[] = [10, 15, 30, 60]

const BASE_URL = 'https://outlet.sibyllanetwork.it/monitor'

/** URL pubblico del monitor: quello da aprire sul display in reparto. */
export const monitorUrl = (m: Monitor): string => `${BASE_URL}/${m.slug}`

/** Slug da un nome: minuscolo, senza accenti, parole unite da trattini. */
export const slugDaNome = (nome: string, reparto: string): string => {
  const base = `${nome} ${reparto}`
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  // coda casuale breve: due monitor omonimi su outlet diversi restano distinti
  return `${base}-${Math.random().toString(16).slice(2, 6)}`
}

const SEED: Monitor[] = [
  { id: 'mon-primi',   nome: 'KDS Cucina - Primi',       reparto: 'cucina',      outletId: 1, slug: 'kds-cucina-primi-f3287f',   refreshSec: 15, attivo: true },
  { id: 'mon-secondi', nome: 'KDS Cucina - Secondi',     reparto: 'cucina',      outletId: 1, slug: 'kds-cucina-secondi-a91b40', refreshSec: 15, attivo: true },
  { id: 'mon-freddi',  nome: 'KDS Freddi e antipasti',   reparto: 'cucina',      outletId: 1, slug: 'kds-freddi-antipasti-7c14', refreshSec: 15, attivo: true },
  { id: 'mon-past',    nome: 'KDS Pasticceria',          reparto: 'pasticceria', outletId: 1, slug: 'kds-pasticceria-3d7ec9',    refreshSec: 30, attivo: true },
  { id: 'mon-bar',     nome: 'KDS Bar',                  reparto: 'bar',         outletId: 3, slug: 'kds-bar-5b02aa',            refreshSec: 10, attivo: true },
  { id: 'mon-pass',    nome: 'KDS Pass / Espositore',    reparto: 'pass',        outletId: 1, slug: 'kds-pass-espositore-0e44',  refreshSec: 10, attivo: false },
]

interface ServiceMonitorState {
  monitor: Monitor[]
  addMonitor:    (m: Omit<Monitor, 'id'>) => Monitor
  updateMonitor: (id: string, patch: Partial<Monitor>) => void
  removeMonitor: (id: string) => void
  toggleMonitor: (id: string) => void
}

const newId = () => `mon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

export const useServiceMonitorStore = create<ServiceMonitorState>()(
  persist(
    (set) => ({
      monitor: SEED.map(m => ({ ...m })),

      addMonitor: (m) => {
        const created: Monitor = { id: newId(), ...m }
        set(s => ({ monitor: [...s.monitor, created] }))
        return created
      },
      updateMonitor: (id, patch) =>
        set(s => ({ monitor: s.monitor.map(m => m.id === id ? { ...m, ...patch } : m) })),
      removeMonitor: (id) =>
        set(s => ({ monitor: s.monitor.filter(m => m.id !== id) })),
      toggleMonitor: (id) =>
        set(s => ({ monitor: s.monitor.map(m => m.id === id ? { ...m, attivo: !m.attivo } : m) })),
    }),
    { name: 'sibylla.fb.serviceMonitor', version: 1 },
  ),
)

/** Anagrafica per i pane che la referenziano (voci di menu). */
export const monitorDisponibili = (): Monitor[] =>
  useServiceMonitorStore.getState().monitor

/** Monitor di un outlet, per reparto e poi per nome. */
export const monitorOrdinati = (
  monitor: Monitor[],
  outletId: number | 'tutti',
): Monitor[] =>
  monitor
    .filter(m => outletId === 'tutti' || m.outletId === outletId)
    .sort((a, b) =>
      REPARTI_MONITOR.findIndex(r => r.id === a.reparto) - REPARTI_MONITOR.findIndex(r => r.id === b.reparto)
      || a.nome.localeCompare(b.nome, 'it'))
