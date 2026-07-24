import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Acquisti condivisi (Agorà) ──────────────────────────────────────────────────
//  Store singleton condiviso fra la pagina "Acquisti condivisi" (catalogo dei gruppi)
//  e la pagina "Gruppi attivi": sono due route distinte del MemoryRouter Agorà, quindi
//  lo stato dei gruppi (creazione + adesioni) vive qui per restare coerente fra le due.

export interface GroupPurchase {
  id: string
  productName: string
  description: string
  image: string
  supplier: string
  category: string
  regularPrice: number
  groupPrice: number
  minQuantity: number
  currentParticipants: number
  maxParticipants: number
  endDate: string
  unit: string
  quantityPerPerson: number
  discount: number
  status: 'active' | 'closing-soon' | 'completed'
}

export const GROUP_PURCHASE_CATEGORIES = [
  'Tutti', 'Alimentari', 'Formaggi', 'Pasta', 'Vini', 'Salumi', 'Prodotti Tipici',
]

// Data di riferimento "oggi" per il calcolo dei giorni residui (dataset mock).
const REFERENCE_TODAY = '2026-03-31'

export const getProgressPercentage = (current: number, min: number) =>
  Math.min((current / min) * 100, 100)

export const getDaysRemaining = (endDate: string) => {
  const today = new Date(REFERENCE_TODAY)
  const end = new Date(endDate)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const SEED_GROUP_PURCHASES: GroupPurchase[] = [
  { id: '1', productName: 'Olio Extravergine di Oliva DOP Puglia', description: 'Olio biologico certificato, spremitura a freddo, produzione 2025', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800', supplier: 'Oleificio Pugliese Bio', category: 'Alimentari', regularPrice: 18.5, groupPrice: 13.9, minQuantity: 50, currentParticipants: 38, maxParticipants: 100, endDate: '2026-04-15', unit: 'bottiglia da 750ml', quantityPerPerson: 6, discount: 25, status: 'active' },
  { id: '2', productName: 'Parmigiano Reggiano DOP 24 mesi', description: 'Forma intera stagionata 24 mesi, prodotto di montagna', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800', supplier: 'Caseificio Alpino Tradizionale', category: 'Formaggi', regularPrice: 32, groupPrice: 24, minQuantity: 30, currentParticipants: 28, maxParticipants: 50, endDate: '2026-04-10', unit: 'kg', quantityPerPerson: 2, discount: 25, status: 'closing-soon' },
  { id: '3', productName: 'Pasta di Gragnano IGP - Box Misto', description: 'Selezione di 12 formati di pasta artigianale trafilata al bronzo', image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=800', supplier: 'Pastificio Artigiano Napoletano', category: 'Pasta', regularPrice: 45, groupPrice: 35, minQuantity: 40, currentParticipants: 42, maxParticipants: 80, endDate: '2026-04-20', unit: 'box da 12 pacchi', quantityPerPerson: 1, discount: 22, status: 'active' },
  { id: '4', productName: 'Vino Chianti Classico DOCG - Cassa 6 Bottiglie', description: "Annata 2023, medaglia d'oro al concorso enologico internazionale", image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800', supplier: 'Cantina Toscana Del Chianti', category: 'Vini', regularPrice: 78, groupPrice: 59.9, minQuantity: 25, currentParticipants: 19, maxParticipants: 50, endDate: '2026-04-18', unit: 'cassa da 6 bottiglie', quantityPerPerson: 1, discount: 23, status: 'active' },
  { id: '5', productName: 'Prosciutto Crudo di Parma DOP 18 mesi', description: 'Intero disossato, peso medio 7-8 kg, taglio sottovuoto gratuito', image: 'https://images.unsplash.com/photo-1542843289-3b0e1c9ea8f0?w=800', supplier: 'Salumificio Emiliano D.O.P.', category: 'Salumi', regularPrice: 26, groupPrice: 19.5, minQuantity: 35, currentParticipants: 31, maxParticipants: 60, endDate: '2026-04-12', unit: 'kg', quantityPerPerson: 3, discount: 25, status: 'closing-soon' },
  { id: '6', productName: 'Miele Biologico Multiflora - Set 12 Vasetti', description: 'Miele italiano biologico certificato, produzione delle nostre api', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784088?w=800', supplier: 'Azienda Agricola Bio del Garda', category: 'Prodotti Tipici', regularPrice: 48, groupPrice: 38.4, minQuantity: 20, currentParticipants: 15, maxParticipants: 40, endDate: '2026-04-25', unit: 'set da 12 vasetti 250g', quantityPerPerson: 1, discount: 20, status: 'active' },
]

type NewPurchaseData = Omit<GroupPurchase, 'id' | 'currentParticipants' | 'status' | 'discount'>

interface GroupPurchasesState {
  purchases: GroupPurchase[]
  addPurchase: (data: NewPurchaseData) => void
  /** Aggiunge l'utente corrente alla lista partecipanti; al raggiungimento del minimo il gruppo si completa. */
  joinPurchase: (id: string) => void
}

export const useGroupPurchasesStore = create<GroupPurchasesState>()(
  persist(
    (set) => ({
      purchases: SEED_GROUP_PURCHASES,
      addPurchase: (data) =>
        set((s) => {
          const discount = data.regularPrice > 0
            ? Math.round(((data.regularPrice - data.groupPrice) / data.regularPrice) * 100)
            : 0
          const newGp: GroupPurchase = {
            ...data,
            id: `gp-${Date.now()}`,
            currentParticipants: 0,
            status: 'active',
            discount,
          }
          return { purchases: [newGp, ...s.purchases] }
        }),
      joinPurchase: (id) =>
        set((s) => ({
          purchases: s.purchases.map((gp) => {
            if (gp.id !== id) return gp
            const currentParticipants = gp.currentParticipants + 1
            const reachedMin = currentParticipants >= gp.minQuantity
            return { ...gp, currentParticipants, status: reachedMin ? 'completed' : gp.status }
          }),
        })),
    }),
    { name: 'agora-group-purchases' },
  ),
)
