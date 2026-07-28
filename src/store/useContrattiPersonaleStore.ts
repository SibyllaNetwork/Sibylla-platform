import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Contratti del personale ──────────────────────────────────────────────────
//  Storico dei contratti (operativi) collegati a un'anagrafica del personale.
//  Scopo: specificare ruolo, livello e retribuzione (RAL) del profilo, con il PDF
//  del contratto allegato. Ogni variazione contrattuale è un nuovo record nello
//  storico (ordinato per decorrenza/creazione). L'"Archivio del personale" legge
//  l'ultimo contratto per mostrare/aprire il relativo PDF.

export interface ContrattoPersonale {
  id: string
  /** Chiave di collegamento all'anagrafica (id/matricola del dipendente). */
  anagraficaId: string
  nomeImpiegato: string
  ruolo: string
  livello?: string
  tipologia: string
  /** Retribuzione annua lorda (testo, es. "28.000"). */
  ral: string
  /** Data di decorrenza della (variazione di) contratto — ISO yyyy-mm-dd. */
  decorrenza?: string
  note?: string
  /** PDF del contratto. */
  pdfName?: string
  pdfDataUrl?: string
  createdAt: string
}

const uid = () => `ctr-${Math.round(performance.now())}-${Math.floor(Math.random() * 1e4)}`

const SEED: ContrattoPersonale[] = [
  { id: 'ctr-seed-66-1', anagraficaId: '66', nomeImpiegato: 'Piero Aragona', ruolo: 'Direttore di struttura', livello: 'Quadro', tipologia: 'Tempo indeterminato', ral: '52.000', decorrenza: '2026-01-01', pdfName: 'contratto_lavoro_2026.pdf', createdAt: '2026-01-02T09:00:00.000Z' },
  { id: 'ctr-seed-66-0', anagraficaId: '66', nomeImpiegato: 'Piero Aragona', ruolo: 'Vice direttore',            livello: '1° livello', tipologia: 'Tempo indeterminato', ral: '44.000', decorrenza: '2023-03-01', pdfName: 'contratto_2023.pdf',      createdAt: '2023-03-01T09:00:00.000Z' },
  { id: 'ctr-seed-89-0', anagraficaId: '89', nomeImpiegato: 'Marco Campo',   ruolo: 'Addetto ricevimento',       livello: '3° livello', tipologia: 'Stagionale',           ral: '24.000', decorrenza: '2026-04-15', pdfName: 'contratto_campo.pdf',   createdAt: '2026-04-10T09:00:00.000Z' },
]

interface ContrattiState {
  contratti: ContrattoPersonale[]
  /** Contratti di un'anagrafica, dal più recente (per decorrenza/creazione). */
  contrattiFor: (anagraficaId: string) => ContrattoPersonale[]
  /** Ultimo contratto (vigente) di un'anagrafica. */
  ultimoContratto: (anagraficaId: string) => ContrattoPersonale | undefined
  addContratto: (patch: Omit<ContrattoPersonale, 'id' | 'createdAt'>) => string
  updateContratto: (id: string, patch: Partial<ContrattoPersonale>) => void
  removeContratto: (id: string) => void
}

const sortDesc = (list: ContrattoPersonale[]) =>
  [...list].sort((a, b) => (b.decorrenza ?? b.createdAt).localeCompare(a.decorrenza ?? a.createdAt))

export const useContrattiPersonaleStore = create<ContrattiState>()(
  persist(
    (set, get) => ({
      contratti: SEED,
      contrattiFor: (anagraficaId) =>
        sortDesc(get().contratti.filter(c => c.anagraficaId === anagraficaId)),
      ultimoContratto: (anagraficaId) =>
        sortDesc(get().contratti.filter(c => c.anagraficaId === anagraficaId))[0],
      addContratto: (patch) => {
        const id = uid()
        set(s => ({ contratti: [...s.contratti, { id, createdAt: new Date().toISOString(), ...patch }] }))
        return id
      },
      updateContratto: (id, patch) =>
        set(s => ({ contratti: s.contratti.map(c => c.id === id ? { ...c, ...patch } : c) })),
      removeContratto: (id) =>
        set(s => ({ contratti: s.contratti.filter(c => c.id !== id) })),
    }),
    { name: 'sibylla.contratti-personale', version: 1 },
  ),
)
