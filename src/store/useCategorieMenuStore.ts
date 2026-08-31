import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── CATEGORIE MENU (F&B) ─────────────────────────────────────────────────────
//  Fonte unica delle categorie di menu degli outlet (Antipasti, Primi, Vini
//  Rossi, Cocktail, …): sono i raggruppamenti con cui le voci di menu vengono
//  ordinate e stampate su menu, monitor di cucina e web menu.
//
//  Ogni categoria porta con sé:
//   • `tipo`   → a quale menu appartiene (Bar / Cantina / Ristorante / Lounge);
//   • `ordine` → posizione della categoria dentro il menu (0 = prima);
//   • `emoji`  → icona riconoscibile a colpo d'occhio in tabella e sui monitor;
//   • `colore` → **token della palette validata** (`var(--chart-1)` …
//     `var(--chart-8)`, definiti in `src/styles/_themes.sass`), mai un hex.
//     Salvare il token e non il colore risolto è ciò che fa funzionare la
//     pastiglia anche in dark mode (lo skin ridefinisce gli stessi token).

export type TipoMenu = 'bar' | 'cantina' | 'ristorante' | 'lounge'

export interface CategoriaMenu {
  id: string
  nome: string
  tipo: TipoMenu
  /** Posizione della categoria nel menu; 0 = prima. */
  ordine: number
  /** Emoji scelta dalla griglia `EMOJI_CATEGORIA`. */
  emoji: string
  /** Token colore: una stringa `var(--chart-N)` di `COLORI_CATEGORIA`. */
  colore: string
}

export const TIPI_MENU: Array<{ id: TipoMenu; label: string }> = [
  { id: 'bar',        label: 'Bar' },
  { id: 'cantina',    label: 'Cantina' },
  { id: 'ristorante', label: 'Ristorante' },
  { id: 'lounge',     label: 'Lounge' },
]

export const tipoMenuMeta = (id: TipoMenu) =>
  TIPI_MENU.find(t => t.id === id) ?? TIPI_MENU[0]

/**
 * Swatch di colore ammessi: SOLO i token della palette validata del progetto.
 * L'ordine è quello dei slot (serie 1 → `--chart-1`) e va rispettato: è una
 * garanzia di leggibilità per i deficit di visione dei colori, non estetica.
 */
export const COLORI_CATEGORIA: string[] = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)',
  'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)',
]

/** Griglia di emoji selezionabili nella modale (icona della categoria). */
export const EMOJI_CATEGORIA: string[] = [
  '🍝', '🍤', '🥩', '🥦', '🍇', '⭐', '🍸', '🍷', '🍔', '🥗',
  '🍲', '🍣', '🍕', '☕', '🍰', '🥐', '🫙', '🍫', '🦐', '🧁',
]

const SEED: CategoriaMenu[] = [
  { id: 'cat-vini',      nome: 'Vini',            tipo: 'bar',        ordine: 0,  emoji: '🍷', colore: 'var(--chart-3)' },
  { id: 'cat-birre',     nome: 'Birre',           tipo: 'bar',        ordine: 1,  emoji: '🫙', colore: 'var(--chart-4)' },
  { id: 'cat-rossi',     nome: 'Vini Rossi',      tipo: 'cantina',    ordine: 2,  emoji: '🍇', colore: 'var(--chart-6)' },
  { id: 'cat-contorni',  nome: 'Contorni',        tipo: 'ristorante', ordine: 3,  emoji: '🥦', colore: 'var(--chart-8)' },
  { id: 'cat-cocktail',  nome: 'Cocktail',        tipo: 'lounge',     ordine: 4,  emoji: '🍸', colore: 'var(--chart-7)' },
  { id: 'cat-antipasti', nome: 'Antipasti',       tipo: 'ristorante', ordine: 5,  emoji: '🍤', colore: 'var(--chart-2)' },
  { id: 'cat-soft',      nome: 'Soft Drink',      tipo: 'bar',        ordine: 6,  emoji: '☕', colore: 'var(--chart-5)' },
  { id: 'cat-primi',     nome: 'Primi',           tipo: 'ristorante', ordine: 7,  emoji: '🍝', colore: 'var(--chart-1)' },
  { id: 'cat-dessert',   nome: 'Dessert',         tipo: 'ristorante', ordine: 8,  emoji: '🍰', colore: 'var(--chart-3)' },
  { id: 'cat-secondi',   nome: 'Secondi',         tipo: 'ristorante', ordine: 9,  emoji: '🥩', colore: 'var(--chart-6)' },
  { id: 'cat-spirits',   nome: 'Premium Spirits', tipo: 'lounge',     ordine: 10, emoji: '⭐', colore: 'var(--chart-4)' },
  { id: 'cat-bianchi',   nome: 'Vini Bianchi',    tipo: 'cantina',    ordine: 11, emoji: '🥐', colore: 'var(--chart-5)' },
  { id: 'cat-rose',      nome: 'Vini Rosè',       tipo: 'cantina',    ordine: 12, emoji: '🍇', colore: 'var(--chart-2)' },
  { id: 'cat-bollicine', nome: 'Bollicine',       tipo: 'cantina',    ordine: 13, emoji: '🍸', colore: 'var(--chart-1)' },
]

interface CategorieMenuState {
  categorie: CategoriaMenu[]
  addCategoria:    (c: Omit<CategoriaMenu, 'id'>) => CategoriaMenu
  updateCategoria: (id: string, patch: Partial<CategoriaMenu>) => void
  removeCategoria: (id: string) => void
}

const newId = () => `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

export const useCategorieMenuStore = create<CategorieMenuState>()(
  persist(
    (set) => ({
      categorie: SEED.map(c => ({ ...c })),

      addCategoria: (c) => {
        const created: CategoriaMenu = { id: newId(), ...c }
        set(s => ({ categorie: [...s.categorie, created] }))
        return created
      },
      updateCategoria: (id, patch) =>
        set(s => ({ categorie: s.categorie.map(c => c.id === id ? { ...c, ...patch } : c) })),
      removeCategoria: (id) =>
        set(s => ({ categorie: s.categorie.filter(c => c.id !== id) })),
    }),
    { name: 'sibylla.fb.categorie-menu', version: 1 },
  ),
)

// ─── Helper puri (fuori dallo store: testabili e riusabili nei pane) ──────────

/** Categorie ordinate come compaiono nei menu: per `ordine`, poi per nome. */
export function categorieOrdinate(categorie: CategoriaMenu[]): CategoriaMenu[] {
  return [...categorie].sort((a, b) =>
    a.ordine - b.ordine || a.nome.localeCompare(b.nome, 'it'))
}

/**
 * Categoria omonima già esistente (confronto case/spazi-insensitive): due
 * categorie con lo stesso nome renderebbero ambigua l'assegnazione delle voci.
 */
export function categoriaOmonima(
  categorie: CategoriaMenu[],
  nome: string,
  escludiId?: string | null,
): CategoriaMenu | null {
  const k = nome.trim().toLowerCase()
  if (!k) return null
  return categorie.find(c => c.id !== escludiId && c.nome.trim().toLowerCase() === k) ?? null
}

/**
 * Categoria che occupa già la stessa posizione nello stesso tipo di menu.
 * Non è un errore bloccante (l'ordinamento resta deterministico grazie al
 * nome), ma va segnalato: due categorie a pari `ordine` si alternano.
 */
export function ordineOccupato(
  categorie: CategoriaMenu[],
  tipo: TipoMenu,
  ordine: number,
  escludiId?: string | null,
): CategoriaMenu | null {
  return categorie.find(c =>
    c.id !== escludiId && c.tipo === tipo && c.ordine === ordine) ?? null
}

/** Primo `ordine` libero: default sensato per una categoria nuova. */
export function prossimoOrdine(categorie: CategoriaMenu[]): number {
  return categorie.reduce((max, c) => Math.max(max, c.ordine), -1) + 1
}
