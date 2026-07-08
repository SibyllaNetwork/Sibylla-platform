import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Annunci pubblicati in Agorà ────────────────────────────────────────────────
//  Destinazione degli annunci creati in "Componi annunci" e pubblicati (icona
//  "pubblica"). Store globale persistito: la pagina Componi annunci (mount Ricavi
//  o mount Agorà) e la pagina Annunci (mount Agorà, albero React separato) non
//  condividono context, quindi comunicano attraverso questo singleton.

export interface AnnuncioPubblicato {
  id: string
  logo?: string            // logo struttura (data URL), opzionale
  ragioneSociale: string
  periodo: string
  tipologia: string        // es. Base doppia / Base multipla
  lotti: number
  struttura: string
  categoria: number        // stelle (3–5)
  camere: number
  pubblicazione: string    // gg/mm/aaaa
  genere: 'Vendita' | 'Acquisto'
  destinatario: string     // 'Tutti' oppure la categoria/operatore destinatario
}

// Categoria del profilo corrente: gli annunci riservati ad altre categorie
// risultano "non destinati a te" e i dati identificativi vengono mascherati.
export const MIA_CATEGORIA = 'Veratour'

/** True se l'annuncio è aperto a tutti o destinato alla categoria corrente. */
export const annuncioPerMe = (a: AnnuncioPubblicato): boolean =>
  !a.destinatario || a.destinatario === 'Tutti' || a.destinatario === MIA_CATEGORIA

interface AnnunciState {
  annunci: AnnuncioPubblicato[]
  /** Inserisce o aggiorna (per id) un annuncio pubblicato, in cima alla lista. */
  pubblica: (a: AnnuncioPubblicato) => void
  rimuovi: (id: string) => void
}

const mk = (
  id: string, periodo: string, tipologia: string, lotti: number,
  struttura: string, categoria: number, pubblicazione: string,
  genere: 'Vendita' | 'Acquisto', destinatario: string,
): AnnuncioPubblicato => ({
  id, ragioneSociale: 'G.A.R-SRL', periodo, tipologia, lotti, struttura,
  categoria, camere: lotti * 25, pubblicazione, genere, destinatario,
})

const SEED: AnnuncioPubblicato[] = [
  mk('seed-1',  '01/07/2025 - 30/11/2025', 'Base doppia',   1, 'Hotel Archimede', 4, '09/07/2025', 'Vendita',  'Tutti'),
  mk('seed-2',  '01/07/2025 - 30/11/2025', 'Base doppia',   1, 'Hotel Archimede', 4, '08/07/2025', 'Vendita',  'Veratour'),
  mk('seed-3',  '01/07/2025 - 31/12/2025', 'Base doppia',   1, 'Hotel Archimede', 4, '07/07/2025', 'Vendita',  'TUI'),
  mk('seed-4',  '04/07/2025 - 01/11/2025', 'Base doppia',   3, 'Hotel Archimede', 4, '07/07/2025', 'Vendita',  'Tutti'),
  mk('seed-5',  '01/02/2025 - 01/09/2025', 'Base multipla', 1, 'Hotel Archimede', 4, '03/07/2025', 'Acquisto', 'Alpitour'),
  mk('seed-6',  '01/05/2025 - 01/12/2025', 'Base doppia',   3, 'Hotel Archimede', 4, '16/05/2025', 'Vendita',  'Tutti'),
  mk('seed-7',  '01/05/2025 - 01/12/2025', 'Base doppia',   2, 'Hotel Archimede', 4, '18/04/2025', 'Acquisto', 'Veratour'),
  mk('seed-8',  '01/04/2025 - 01/12/2025', 'Base doppia',   3, 'Hotel Archimede', 4, '15/04/2025', 'Vendita',  'Eden Viaggi'),
  mk('seed-9',  '01/02/2025 - 01/09/2025', 'Base doppia',   1, 'Hotel Archimede', 4, '10/02/2025', 'Vendita',  'Tutti'),
  mk('seed-10', '01/01/2025 - 01/05/2025', 'Base doppia',   4, 'Hotel Archimede', 4, '14/01/2025', 'Acquisto', 'Tutti'),
  mk('seed-11', '01/02/2025 - 01/06/2025', 'Base multipla', 3, 'Hotel Lazio',     3, '14/01/2025', 'Vendita',  'Bluvacanze'),
  mk('seed-12', '01/01/2025 - 01/09/2025', 'Base multipla', 3, 'Hotel Archimede', 4, '14/01/2025', 'Vendita',  'Tutti'),
  mk('seed-13', '01/01/2024 - 01/01/2025', 'Base doppia',   1, 'Hotel Archimede', 4, '14/01/2025', 'Acquisto', 'TUI'),
  mk('seed-14', '01/01/2025 - 01/05/2025', 'Base doppia',   4, 'Hotel Siracusa',  3, '14/01/2025', 'Vendita',  'Tutti'),
]

export const useAnnunciStore = create<AnnunciState>()(
  persist(
    (set) => ({
      annunci: SEED,
      pubblica: (a) =>
        set((s) => ({ annunci: [a, ...s.annunci.filter((x) => x.id !== a.id)] })),
      rimuovi: (id) => set((s) => ({ annunci: s.annunci.filter((x) => x.id !== id) })),
    }),
    { name: 'sibylla.annunci-agora', version: 1 },
  ),
)
