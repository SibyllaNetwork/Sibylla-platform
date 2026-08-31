import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── MENU DEL GIORNO (F&B) ────────────────────────────────────────────────────
//  Fonte unica dei menu giornalieri degli outlet: un menu del giorno è una
//  data + un nome + l'insieme delle voci di menu che lo compongono, con un
//  prezzo fisso opzionale. Se il prezzo fisso non è indicato, il prezzo del
//  menu è la somma delle voci incluse (menu «a listino»): è il caso del menu
//  che cambia ogni giorno e segue i prezzi di carta.
//
//  Le voci sono referenziate per id: il menu NON copia nome/prezzo, così un
//  ritocco al catalogo si riflette su tutti i menu che quella voce compongono.

export type MenuGiornoId = string

/** Voce di menu selezionabile in un menu del giorno (catalogo F&B). */
export interface VoceMenuSel {
  id: string
  nome: string
  categoria: string
  /** Prezzo di carta della voce, in euro. */
  prezzo: number
}

// TODO: quando `useVociMenuStore` è in main, leggere le voci da lì invece di
// questa costante (stessi id/nome/categoria/prezzo del catalogo F&B).
export const VOCI_MENU_DISPONIBILI: VoceMenuSel[] = [
  { id: 'vm-acqua',      nome: 'Acqua',              categoria: 'Soft Drink', prezzo: 2.50 },
  { id: 'vm-barolo',     nome: 'Barolo DOCG',        categoria: 'Vini Rossi', prezzo: 45.00 },
  { id: 'vm-bruschetta', nome: 'Bruschetta',         categoria: 'Antipasti',  prezzo: 6.50 },
  { id: 'vm-carbonara',  nome: 'Carbonara',          categoria: 'Primi',      prezzo: 13.00 },
  { id: 'vm-bistecca',   nome: 'Bistecca',           categoria: 'Secondi',    prezzo: 22.00 },
  { id: 'vm-broccoletti',nome: 'Broccoletti',        categoria: 'Contorni',   prezzo: 5.00 },
  { id: 'vm-dessert',    nome: 'Dessert della casa', categoria: 'Dessert',    prezzo: 6.00 },
]

export interface MenuGiorno {
  id: MenuGiornoId
  outletId: number
  /** yyyy-mm-dd: il giorno in cui il menu è in vendita. */
  data: string
  nome: string
  /** Id delle voci incluse (→ VOCI_MENU_DISPONIBILI). */
  voci: string[]
  /** Prezzo fisso in euro; `null` = prezzo = somma delle voci incluse. */
  prezzoFisso: number | null
  note: string
  attivo: boolean
}

/** Meta di una voce dal suo id (nome/categoria/prezzo per tabella e modale). */
export const voceMeta = (id: string): VoceMenuSel | undefined =>
  VOCI_MENU_DISPONIBILI.find(v => v.id === id)

/** Categorie presenti nel catalogo, in ordine alfabetico, per il filtro. */
export const categorieVoci = (): string[] =>
  Array.from(new Set(VOCI_MENU_DISPONIBILI.map(v => v.categoria))).sort((a, b) => a.localeCompare(b, 'it'))

/** Somma dei prezzi di carta delle voci indicate. */
export const sommaVoci = (vociIds: string[]): number =>
  vociIds.reduce((tot, id) => tot + (voceMeta(id)?.prezzo ?? 0), 0)

/**
 * Prezzo effettivo di un menu: il prezzo fisso quando c'è, altrimenti la somma
 * delle voci incluse. Unico punto in cui questa regola vive.
 */
export const prezzoMenu = (m: MenuGiorno): number =>
  m.prezzoFisso != null ? m.prezzoFisso : sommaVoci(m.voci)

const SEED: MenuGiorno[] = [
  {
    id: 'mg-pasqua-2026', outletId: 1, data: '2026-04-09', nome: 'Menu Pasqua 2026',
    voci: ['vm-bruschetta', 'vm-carbonara', 'vm-dessert'],
    prezzoFisso: 40, note: 'Servito a pranzo, bevande escluse.', attivo: true,
  },
  {
    id: 'mg-business', outletId: 1, data: '2026-04-15', nome: 'Menu Business Lunch',
    voci: ['vm-bruschetta', 'vm-carbonara', 'vm-broccoletti', 'vm-acqua'],
    prezzoFisso: 24, note: 'Mercoledì, solo pranzo: due portate + contorno e acqua.', attivo: true,
  },
  {
    id: 'mg-san-valentino', outletId: 1, data: '2026-02-14', nome: 'Menu San Valentino',
    voci: ['vm-bruschetta', 'vm-carbonara', 'vm-bistecca', 'vm-dessert', 'vm-barolo'],
    prezzoFisso: 75, note: 'Cena su prenotazione, calice di Barolo incluso.', attivo: true,
  },
  {
    // Nessun prezzo fisso: il menu vale la somma delle voci (39,50 €)
    id: 'mg-domenica', outletId: 1, data: '2026-04-12', nome: 'Menu della Domenica',
    voci: ['vm-bruschetta', 'vm-bistecca', 'vm-broccoletti', 'vm-dessert'],
    prezzoFisso: null, note: '', attivo: false,
  },
]

interface MenuGiornoState {
  menu: MenuGiorno[]
  addMenu:    (m: Omit<MenuGiorno, 'id'>) => MenuGiorno
  updateMenu: (id: MenuGiornoId, patch: Partial<MenuGiorno>) => void
  removeMenu: (id: MenuGiornoId) => void
  toggleMenu: (id: MenuGiornoId) => void
}

const newId = () => `mg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

export const useMenuGiornoStore = create<MenuGiornoState>()(
  persist(
    (set) => ({
      menu: SEED.map(m => ({ ...m, voci: [...m.voci] })),

      addMenu: (m) => {
        const created: MenuGiorno = { id: newId(), ...m }
        set(s => ({ menu: [...s.menu, created] }))
        return created
      },
      updateMenu: (id, patch) =>
        set(s => ({ menu: s.menu.map(m => m.id === id ? { ...m, ...patch } : m) })),
      removeMenu: (id) =>
        set(s => ({ menu: s.menu.filter(m => m.id !== id) })),
      toggleMenu: (id) =>
        set(s => ({ menu: s.menu.map(m => m.id === id ? { ...m, attivo: !m.attivo } : m) })),
    }),
    { name: 'sibylla.fb.menu-giorno', version: 1 },
  ),
)

/**
 * Menu di un outlet in ordine cronologico crescente (poi per nome): un menu del
 * giorno si pianifica in avanti, quindi si legge dal primo giorno all'ultimo,
 * non partendo dalla data più lontana.
 */
export function menuOrdinati(menu: MenuGiorno[], outletId: number): MenuGiorno[] {
  return menu
    .filter(m => m.outletId === outletId)
    .sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome, 'it'))
}

/**
 * Un altro menu già in vendita nello stesso giorno per lo stesso outlet: non è
 * un errore bloccante (si possono avere menu diversi, es. pranzo e cena), ma va
 * segnalato in modale per evitare i doppioni per distrazione.
 */
export function menuStessoGiorno(
  menu: MenuGiorno[],
  candidato: Pick<MenuGiorno, 'id' | 'outletId' | 'data'>,
): MenuGiorno | null {
  return menu.find(m =>
    m.id !== candidato.id
    && m.outletId === candidato.outletId
    && m.data === candidato.data,
  ) ?? null
}
