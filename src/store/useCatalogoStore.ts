import { create } from 'zustand'
import {
  CATEGORIE_INIT,
  FORNITORI_INIT,
  PRODOTTI_INIT,
} from '../admin/SibyllaAdminPanel/catalogo/mockData'
import type {
  Categoria,
  Fornitore,
  Prodotto,
} from '../admin/SibyllaAdminPanel/catalogo/types'

// ─── Movimenti magazzino ──────────────────────────────────────────────────────
export type TipoMovimento = 'entrata' | 'uscita' | 'rettifica'

export interface Movimento {
  id: string
  ts: number              // epoch ms
  prodottoId: string
  barcode: string
  tipo: TipoMovimento
  quantita: number        // sempre positiva; il segno è dato da `tipo`
  magazzinoId: string     // riferimento al magazzino di destinazione/origine (può essere '')
  collocazione?: string   // collocazione fisica dentro il magazzino (es. "Scaffale A")
  operatore: string       // ex. email/username — vuoto se non noto
  note: string
}

// ─── Magazzini ────────────────────────────────────────────────────────────────
export interface Magazzino {
  id: string
  nome: string
  strutture: string[]     // nomi delle strutture servite
  collocazioni: string[]  // collocazioni fisiche disponibili
  note?: string
}

// ─── State ────────────────────────────────────────────────────────────────────
interface CatalogoState {
  categorie: Categoria[]
  fornitori: Fornitore[]
  prodotti:  Prodotto[]
  movimenti: Movimento[]
  magazzini: Magazzino[]

  // ── Categorie CRUD ─────────────────────────────────────────────────────────
  addCategoria:    (c: Omit<Categoria, 'id'>) => Categoria
  updateCategoria: (id: string, patch: Partial<Categoria>) => void
  removeCategoria: (id: string) => void

  // ── Fornitori CRUD ─────────────────────────────────────────────────────────
  addFornitore:    (f: Omit<Fornitore, 'id'>) => Fornitore
  updateFornitore: (id: string, patch: Partial<Fornitore>) => void
  removeFornitore: (id: string) => void
  toggleFornitorePubblicato: (id: string) => void

  // ── Prodotti CRUD ──────────────────────────────────────────────────────────
  addProdotto:     (p: Omit<Prodotto, 'id'>) => Prodotto
  updateProdotto:  (id: string, patch: Partial<Prodotto>) => void
  removeProdotto:  (id: string) => void
  toggleProdottoAttivo: (id: string) => void
  toggleProdottoPubblicato: (id: string) => void

  // ── Magazzini CRUD ─────────────────────────────────────────────────────────
  addMagazzino:    (m: Omit<Magazzino, 'id'>) => Magazzino
  removeMagazzino: (id: string) => void

  // ── Movimenti / lookup barcode ─────────────────────────────────────────────
  registraMovimento: (m: Omit<Movimento, 'id' | 'ts'>) => Movimento
  prodottoByBarcode: (barcode: string) => Prodotto | undefined
  giacenza:          (prodottoId: string, magazzinoId?: string) => number
  isBarcodeUsed:     (barcode: string, exceptId?: string) => boolean
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

export const useCatalogoStore = create<CatalogoState>((set, get) => ({
  categorie: CATEGORIE_INIT,
  fornitori: FORNITORI_INIT,
  prodotti:  PRODOTTI_INIT,
  movimenti: [],
  magazzini: [],

  // ─── Categorie ───────────────────────────────────────────────────────────
  addCategoria: (c) => {
    const created: Categoria = { id: newId('cat'), ...c }
    set(s => ({ categorie: [...s.categorie, created] }))
    return created
  },
  updateCategoria: (id, patch) =>
    set(s => ({ categorie: s.categorie.map(c => c.id === id ? { ...c, ...patch } : c) })),
  removeCategoria: (id) =>
    set(s => ({ categorie: s.categorie.filter(c => c.id !== id) })),

  // ─── Fornitori ───────────────────────────────────────────────────────────
  addFornitore: (f) => {
    const created: Fornitore = { id: newId('forn'), ...f }
    set(s => ({ fornitori: [...s.fornitori, created] }))
    return created
  },
  updateFornitore: (id, patch) =>
    set(s => ({ fornitori: s.fornitori.map(f => f.id === id ? { ...f, ...patch } : f) })),
  removeFornitore: (id) =>
    set(s => ({ fornitori: s.fornitori.filter(f => f.id !== id) })),
  toggleFornitorePubblicato: (id) =>
    set(s => ({ fornitori: s.fornitori.map(f => f.id === id ? { ...f, pubblicato: !f.pubblicato } : f) })),

  // ─── Prodotti ────────────────────────────────────────────────────────────
  addProdotto: (p) => {
    const created: Prodotto = { id: newId('prod'), ...p }
    set(s => ({ prodotti: [...s.prodotti, created] }))
    return created
  },
  updateProdotto: (id, patch) =>
    set(s => ({ prodotti: s.prodotti.map(x => x.id === id ? { ...x, ...patch } : x) })),
  removeProdotto: (id) =>
    set(s => ({ prodotti: s.prodotti.filter(x => x.id !== id) })),
  toggleProdottoAttivo: (id) =>
    set(s => ({ prodotti: s.prodotti.map(x => x.id === id ? { ...x, attivo: !x.attivo } : x) })),
  toggleProdottoPubblicato: (id) =>
    set(s => ({ prodotti: s.prodotti.map(x => x.id === id ? { ...x, pubblicato: !x.pubblicato } : x) })),

  // ─── Magazzini ───────────────────────────────────────────────────────────
  addMagazzino: (m) => {
    const created: Magazzino = { id: newId('mag'), ...m }
    set(s => ({ magazzini: [...s.magazzini, created] }))
    return created
  },
  removeMagazzino: (id) =>
    set(s => ({ magazzini: s.magazzini.filter(m => m.id !== id) })),

  // ─── Movimenti ───────────────────────────────────────────────────────────
  registraMovimento: (m) => {
    const created: Movimento = { id: newId('mov'), ts: Date.now(), ...m }
    set(s => ({ movimenti: [created, ...s.movimenti] }))
    return created
  },
  prodottoByBarcode: (barcode) => {
    if (!barcode) return undefined
    return get().prodotti.find(p => p.barcode === barcode)
  },
  giacenza: (prodottoId, magazzinoId) =>
    get().movimenti.reduce((tot, m) => {
      if (m.prodottoId !== prodottoId) return tot
      if (magazzinoId && m.magazzinoId !== magazzinoId) return tot
      const sign = m.tipo === 'uscita' ? -1 : 1
      return tot + sign * m.quantita
    }, 0),
  isBarcodeUsed: (barcode, exceptId) =>
    get().prodotti.some(p => p.barcode === barcode && p.id !== exceptId),
}))
