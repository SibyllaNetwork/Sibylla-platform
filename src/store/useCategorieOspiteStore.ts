import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── CATEGORIE OSPITE / CLIENTE (F&B) ─────────────────────────────────────────
//  Con quale trattamento un cliente consuma all'outlet: l'ospite dell'hotel,
//  l'esterno, il personale, la direzione. La categoria decide tre cose che in
//  cassa non sono la stessa cosa:
//   • lo sconto di default applicato al conto;
//   • se il conto può essere addebitato alla camera (l'esterno non ce l'ha);
//   • se la chiusura richiede l'autorizzazione di un responsabile — che è il
//     controllo che serve sugli omaggi al 100%.
//
//  La pagina precedente teneva solo nome, descrizione e sconto: «All Inclusive»
//  e «Direzione» risultavano identici pur essendo due cose diverse.

export interface CategoriaOspite {
  id: string
  nome: string
  descrizione: string
  /** Sconto di default applicato al conto, 0–100. */
  sconto: number
  /** true = il conto può essere addebitato alla camera. */
  addebitoInCamera: boolean
  /** true = la chiusura del conto richiede l'autorizzazione di un responsabile. */
  richiedeAutorizzazione: boolean
  attiva: boolean
}

const SEED: CategoriaOspite[] = [
  {
    id: 'co-hotel', nome: 'Clienti hotel',
    descrizione: 'Ospiti alloggiati in struttura: sconto di cortesia e addebito in camera.',
    sconto: 10, addebitoInCamera: true, richiedeAutorizzazione: false, attiva: true,
  },
  {
    id: 'co-all-incl', nome: 'All Inclusive',
    descrizione: 'Ospiti con trattamento all inclusive: le consumazioni previste dal pacchetto non si pagano al tavolo.',
    sconto: 100, addebitoInCamera: true, richiedeAutorizzazione: false, attiva: true,
  },
  {
    id: 'co-esterni', nome: 'Clienti esterni',
    descrizione: 'Clientela non alloggiata: nessuno sconto e nessun addebito in camera.',
    sconto: 0, addebitoInCamera: false, richiedeAutorizzazione: false, attiva: true,
  },
  {
    id: 'co-personale', nome: 'Personale',
    descrizione: 'Consumazioni del personale in servizio.',
    sconto: 50, addebitoInCamera: false, richiedeAutorizzazione: false, attiva: true,
  },
  {
    id: 'co-direzione', nome: 'Direzione',
    descrizione: 'Omaggi e ospitalità autorizzati dalla direzione.',
    sconto: 100, addebitoInCamera: false, richiedeAutorizzazione: true, attiva: true,
  },
]

interface CategorieOspiteState {
  categorie: CategoriaOspite[]
  addCategoria:    (c: Omit<CategoriaOspite, 'id'>) => CategoriaOspite
  updateCategoria: (id: string, patch: Partial<CategoriaOspite>) => void
  removeCategoria: (id: string) => void
  toggleCategoria: (id: string) => void
}

const newId = () => `co-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

export const useCategorieOspiteStore = create<CategorieOspiteState>()(
  persist(
    (set) => ({
      categorie: SEED.map(c => ({ ...c })),

      addCategoria: (c) => {
        const created: CategoriaOspite = { id: newId(), ...c }
        set(s => ({ categorie: [...s.categorie, created] }))
        return created
      },
      updateCategoria: (id, patch) =>
        set(s => ({ categorie: s.categorie.map(c => c.id === id ? { ...c, ...patch } : c) })),
      removeCategoria: (id) =>
        set(s => ({ categorie: s.categorie.filter(c => c.id !== id) })),
      toggleCategoria: (id) =>
        set(s => ({ categorie: s.categorie.map(c => c.id === id ? { ...c, attiva: !c.attiva } : c) })),
    }),
    { name: 'sibylla.fb.categorieOspite', version: 1 },
  ),
)

/** Categorie dallo sconto più alto al più basso: l'omaggio è quello da vedere subito. */
export const categorieOspiteOrdinate = (categorie: CategoriaOspite[]): CategoriaOspite[] =>
  [...categorie].sort((a, b) => b.sconto - a.sconto || a.nome.localeCompare(b.nome, 'it'))
