import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Anagrafica clienti (ristorazione) ────────────────────────────────────────
//  Rubrica dei clienti abituali: dati di contatto, allergie/preferenze e n. visite.
//  Usata dalla pagina "Sale e tavoli" per collegare una prenotazione a un cliente
//  (precompila telefono/note) e per la gestione della clientela.

export interface Cliente {
  id: string
  nome: string
  telefono?: string
  email?: string
  /** Allergie / intolleranze note. */
  allergie?: string
  /** Preferenze e note (tavolo preferito, occasioni, ecc.). */
  note?: string
  /** Numero di visite registrate. */
  visite?: number
}

const uid = () => `c-${Math.round(performance.now())}-${Math.floor(Math.random() * 1e4)}`

const SEED: Cliente[] = [
  { id: 'cli-rossi', nome: 'Famiglia Rossi', telefono: '+39 340 1234567', allergie: 'Glutine (1 pax)', note: 'Preferiscono tavolo vicino alla finestra', visite: 12 },
  { id: 'cli-bianchi', nome: 'Mario Bianchi', telefono: '+39 333 9876543', email: 'm.bianchi@example.com', note: 'Cliente business, spesso pranzi di lavoro', visite: 5 },
  { id: 'cli-verdi', nome: 'Anna Verdi', telefono: '+39 348 5551212', allergie: 'Lattosio, frutta a guscio', visite: 3 },
]

interface ClientiState {
  clienti: Cliente[]
  addCliente: (patch: Omit<Cliente, 'id'>) => string
  updateCliente: (id: string, patch: Partial<Cliente>) => void
  removeCliente: (id: string) => void
}

export const useClientiStore = create<ClientiState>()(
  persist(
    (set) => ({
      clienti: SEED,
      addCliente: (patch) => {
        const id = uid()
        set(s => ({ clienti: [...s.clienti, { id, visite: 0, ...patch }] }))
        return id
      },
      updateCliente: (id, patch) =>
        set(s => ({ clienti: s.clienti.map(c => c.id === id ? { ...c, ...patch } : c) })),
      removeCliente: (id) =>
        set(s => ({ clienti: s.clienti.filter(c => c.id !== id) })),
    }),
    { name: 'sibylla.clienti', version: 1 },
  ),
)
