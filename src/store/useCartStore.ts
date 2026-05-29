// useCartStore — adattamento di Newagora/CartContext.tsx come Zustand store.
//
// Il carrello Agorà di Sibylla supporta due tipi di item (kind):
//   - 'product' → prodotto del catalogo Sibylla (riferimenti per id/barcode al
//                 catalogo; prezzo è cristallizzato al momento dell'aggiunta)
//   - 'stay'    → lotto camere / soggiorno (annunci MatchZone-style)
//
// Differenze rispetto al CartContext originale di Newagora:
//   - Zustand al posto di Context+useState (coerente con useOrgStore/useCatalogoStore)
//   - Nuovo campo `mercato` su ProductCartItem (per distinguere Agorà vs Network)
//   - Identificatori coerenti con il catalogo Sibylla (prodottoId, fornitoreId)
//   - Logica di addProduct/updateQuantity/totals invariata (parità funzionale)

import { create } from 'zustand'
import type { Mercato } from '../admin/SibyllaAdminPanel/catalogo/types'
import type { MercatoServizio, TipoServizio } from '../modules/purchasing/Servizi/servizi-types'

export interface ProductCartItem {
  kind: 'product'
  id: string                // = prodottoId del catalogo
  prodottoId: string
  barcode: string
  categoriaId: string
  fornitoreId: string
  fornitoreNome: string
  nome: string
  descrizione: string
  immagineUrl: string
  unita: string
  quantitaUnita: number
  prezzoUnitario: number     // cristallizzato all'aggiunta
  quantita: number
  mercato: Mercato
}

export interface StayCartItem {
  kind: 'stay'
  id: string
  nome: string
  location: string
  immagineUrl: string
  prezzoPerNotte: number
  notti: number
  adulti: number
  bambini: number
  checkIn: string | null
  checkOut: string | null
  stelle: number
  camere: string
}

export interface ServiceCartItem {
  kind: 'service'
  id: string                 // unique cart-line id (srv-id + booking signature)
  servizioId: string
  tipo: TipoServizio
  nome: string
  citta: string
  immagineUrl: string
  prezzoUnitario: number     // cristallizzato al listino selezionato
  mercato: MercatoServizio
  durata: string
  quantita: number           // moltiplicatore (persone | giorni | ore | gruppi)
  unitaPrezzo: string        // etichetta del moltiplicatore (es. "persone", "giorni")
  // Dettagli specifici della prenotazione, key/value, dipendono dal tipo.
  // Tenuti come record string per uniformità nel render del carrello.
  prenotazione: Record<string, string>
}

export type CartItem = ProductCartItem | StayCartItem | ServiceCartItem

interface CartState {
  items: CartItem[]

  addProduct: (item: Omit<ProductCartItem, 'kind' | 'quantita'>, quantita: number) => void
  addStay:    (item: Omit<StayCartItem, 'kind'>) => void
  addService: (item: Omit<ServiceCartItem, 'kind'>) => void
  removeItem: (id: string) => void
  updateProductQuantita: (id: string, quantita: number) => void
  updateStayNotti:       (id: string, notti: number) => void
  updateServiceQuantita: (id: string, quantita: number) => void
  clearCart: () => void

  totaleItems: () => number
  totalePrezzo: () => number
  countByMercato: (m: Mercato) => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addProduct: (item, quantita) =>
    set((s) => {
      const existing = s.items.find(
        (i) => i.kind === 'product' && i.id === item.id && i.mercato === item.mercato,
      )
      if (existing && existing.kind === 'product') {
        return {
          items: s.items.map((i) =>
            i.kind === 'product' && i.id === item.id && i.mercato === item.mercato
              ? { ...i, quantita: i.quantita + quantita }
              : i,
          ),
        }
      }
      return { items: [...s.items, { kind: 'product', ...item, quantita }] }
    }),

  addStay: (item) =>
    set((s) => {
      // un'unica entry per (struttura + checkIn/checkOut). Se esiste, sostituisce.
      const idx = s.items.findIndex(
        (i) =>
          i.kind === 'stay' &&
          i.id === item.id &&
          i.checkIn === item.checkIn &&
          i.checkOut === item.checkOut,
      )
      if (idx >= 0) {
        const clone = [...s.items]
        clone[idx] = { kind: 'stay', ...item }
        return { items: clone }
      }
      return { items: [...s.items, { kind: 'stay', ...item }] }
    }),

  addService: (item) =>
    set((s) => {
      const existing = s.items.find(
        (i) => i.kind === 'service' && i.id === item.id,
      )
      if (existing) {
        // stessa identica prenotazione (id già "firmato"): aumenta quantità
        return {
          items: s.items.map((i) =>
            i.kind === 'service' && i.id === item.id
              ? { ...i, quantita: i.quantita + item.quantita }
              : i,
          ),
        }
      }
      return { items: [...s.items, { kind: 'service', ...item }] }
    }),

  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  updateProductQuantita: (id, quantita) => {
    if (quantita <= 0) {
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
      return
    }
    set((s) => ({
      items: s.items.map((i) =>
        i.kind === 'product' && i.id === id ? { ...i, quantita } : i,
      ),
    }))
  },

  updateStayNotti: (id, notti) => {
    if (notti <= 0) {
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
      return
    }
    set((s) => ({
      items: s.items.map((i) => (i.kind === 'stay' && i.id === id ? { ...i, notti } : i)),
    }))
  },

  updateServiceQuantita: (id, quantita) => {
    if (quantita <= 0) {
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
      return
    }
    set((s) => ({
      items: s.items.map((i) =>
        i.kind === 'service' && i.id === id ? { ...i, quantita } : i,
      ),
    }))
  },

  clearCart: () => set({ items: [] }),

  totaleItems: () => {
    let count = 0
    for (const it of get().items) {
      if (it.kind === 'product')      count += it.quantita
      else if (it.kind === 'service') count += it.quantita
      else                            count += 1
    }
    return count
  },

  totalePrezzo: () => {
    let price = 0
    for (const it of get().items) {
      if (it.kind === 'product')      price += it.prezzoUnitario * it.quantita
      else if (it.kind === 'stay')    price += it.prezzoPerNotte * it.notti
      else if (it.kind === 'service') price += it.prezzoUnitario * it.quantita
    }
    return price
  },

  countByMercato: (m) => {
    let count = 0
    for (const it of get().items) {
      if (it.kind === 'product' && it.mercato === m) count += it.quantita
    }
    return count
  },
}))
