import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── WEB MENU (F&B) ───────────────────────────────────────────────────────────
//  Fonte unica dei menu web dell'outlet: il menu digitale che l'ospite apre da
//  link diretto o QR code, senza installare nulla. Ogni menu web ha un nome
//  (che è anche il titolo della testata), un claim, l'outlet di riferimento, il
//  colore della testata e un periodo di validità del QR.
//
//  Lo SLUG e quindi l'URL pubblico NON sono scrivibili a mano: si derivano dal
//  nome (vedi `slugDaNome`), così l'utente non può creare due menu sullo stesso
//  indirizzo né rompere un QR già stampato cambiando l'URL a mano. Il conteggio
//  delle voci (`voci`) qui è un dato del menu: con il backend arriverà dal
//  catalogo F&B (voci con «includi nel web menu» attivo).

/** Base dell'URL pubblico dei menu web (dominio del servizio Outlet). */
export const WEB_MENU_BASE = 'https://outlet.sibyllanetwork.it/menu'

export interface WebMenu {
  id: string
  outletId: number
  /** Nome del menu: titolo della testata e sorgente dello slug. */
  nome: string
  /** Claim/sottotitolo mostrato sotto il titolo nella testata. */
  claim: string
  /** Colore della testata: token della palette validata, `var(--chart-n)`. */
  colore: string
  /** Slug generato dal nome; mai scritto a mano. */
  slug: string
  /** Numero di voci pubblicate sul menu. */
  voci: number
  /** Inizio validità del QR, yyyy-mm-dd. */
  qrDal: string
  /** Fine validità del QR, yyyy-mm-dd. */
  qrAl: string
  attivo: boolean
}

/**
 * Colori disponibili per la testata: solo la palette validata (--chart-1…8),
 * nell'ordine dei suoi slot. Non è una scelta estetica libera: fuori da questi
 * token il contrasto non è garantito in chiaro/scuro.
 */
export const COLORI_TESTATA: Array<{ id: string; label: string; value: string }> = [
  { id: 'c1', label: 'Blu',      value: 'var(--chart-1)' },
  { id: 'c2', label: 'Arancio',  value: 'var(--chart-2)' },
  { id: 'c3', label: 'Magenta',  value: 'var(--chart-3)' },
  { id: 'c4', label: 'Ocra',     value: 'var(--chart-4)' },
  { id: 'c5', label: 'Teal',     value: 'var(--chart-5)' },
  { id: 'c6', label: 'Rosso',    value: 'var(--chart-6)' },
  { id: 'c7', label: 'Viola',    value: 'var(--chart-7)' },
  { id: 'c8', label: 'Verde',    value: 'var(--chart-8)' },
]

// Parole di servizio scartate dallo slug: un nome come «Il nostro menu di
// pranzo» produce «menu-pranzo», non «il-nostro-menu-di-pranzo». L'URL resta
// leggibile e stampabile su un tavolo.
const PAROLE_DI_SERVIZIO = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'l',
  'un', 'uno', 'una',
  'di', 'del', 'dello', 'della', 'dei', 'degli', 'delle',
  'da', 'dal', 'dalla', 'dai', 'dalle',
  'a', 'al', 'allo', 'alla', 'ai', 'agli', 'alle',
  'in', 'nel', 'nella', 'nei', 'nelle',
  'con', 'su', 'per', 'tra', 'fra', 'e', 'ed',
  'nostro', 'nostra', 'nostri', 'nostre',
])

/** Parte leggibile dello slug: minuscolo, senza accenti, spazi → «-». */
export function slugifyNome(nome: string): string {
  const parole = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // via i segni diacritici (à → a)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
  const utili = parole.filter(p => !PAROLE_DI_SERVIZIO.has(p))
  // Se restano solo parole di servizio si tiene il nome per intero, e se il
  // nome non ha proprio caratteri utili si ripiega su «menu».
  const scelte = (utili.length ? utili : parole).slice(0, 6)
  return scelte.join('-') || 'menu'
}

/**
 * Suffisso breve e stabile: dipende solo dal nome, quindi lo stesso nome dà
 * sempre lo stesso URL (l'anteprima nella modale coincide con quello salvato) e
 * due nomi diversi non collidono per caso. Hash FNV-1a a 32 bit in base 16.
 */
export function slugSuffisso(nome: string): string {
  let h = 0x811c9dc5
  const s = nome.trim().toLowerCase()
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(6, '0').slice(-6)
}

/** Slug completo: parte leggibile + suffisso stabile (es. `menu-pranzo-25f343`). */
export const slugDaNome = (nome: string): string =>
  `${slugifyNome(nome)}-${slugSuffisso(nome)}`

/** URL pubblico del menu web. */
export const webMenuUrl = (slug: string): string => `${WEB_MENU_BASE}/${slug}`

const SEED: WebMenu[] = [
  {
    id: 'wm-pranzo',
    outletId: 1,
    nome: 'Il nostro menu di pranzo',
    claim: 'Cucina tipica Madonita dal 1981',
    colore: 'var(--chart-1)',
    slug: slugDaNome('Il nostro menu di pranzo'),
    voci: 25,
    qrDal: '2026-04-11',
    qrAl: '2026-04-25',
    attivo: true,
  },
  {
    id: 'wm-vini',
    outletId: 2,
    nome: 'La nostra carta dei vini',
    claim: '120 etichette siciliane e nazionali',
    colore: 'var(--chart-3)',
    slug: slugDaNome('La nostra carta dei vini'),
    voci: 118,
    qrDal: '2026-01-01',
    qrAl: '2026-12-31',
    attivo: true,
  },
  {
    id: 'wm-brunch',
    outletId: 3,
    nome: 'Brunch del weekend',
    claim: 'Sabato e domenica, dalle 11 alle 15',
    colore: 'var(--chart-5)',
    slug: slugDaNome('Brunch del weekend'),
    voci: 14,
    qrDal: '2026-03-07',
    qrAl: '2026-06-28',
    attivo: false,
  },
]

interface WebMenuState {
  menu: WebMenu[]
  addMenu:    (m: Omit<WebMenu, 'id' | 'slug'>) => WebMenu
  updateMenu: (id: string, patch: Partial<Omit<WebMenu, 'id'>>) => void
  removeMenu: (id: string) => void
  toggleMenu: (id: string) => void
}

const newId = () => `wm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`

export const useWebMenuStore = create<WebMenuState>()(
  persist(
    (set) => ({
      menu: SEED.map(m => ({ ...m })),

      // Lo slug non arriva dal chiamante: si ricalcola sempre dal nome, così
      // non esiste un percorso che scriva un URL diverso da quello mostrato.
      addMenu: (m) => {
        const created: WebMenu = { id: newId(), ...m, slug: slugDaNome(m.nome) }
        set(s => ({ menu: [...s.menu, created] }))
        return created
      },
      updateMenu: (id, patch) =>
        set(s => ({
          menu: s.menu.map(m => {
            if (m.id !== id) return m
            const next = { ...m, ...patch }
            return patch.nome != null ? { ...next, slug: slugDaNome(patch.nome) } : next
          }),
        })),
      removeMenu: (id) =>
        set(s => ({ menu: s.menu.filter(m => m.id !== id) })),
      toggleMenu: (id) =>
        set(s => ({ menu: s.menu.map(m => m.id === id ? { ...m, attivo: !m.attivo } : m) })),
    }),
    { name: 'sibylla.fb.webmenu', version: 1 },
  ),
)

/** Menu di un outlet (0 = tutti) ordinati per nome. */
export function webMenuOrdinati(menu: WebMenu[], outletId: number): WebMenu[] {
  return menu
    .filter(m => outletId === 0 || m.outletId === outletId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
}

/**
 * Menu web che occuperebbe già lo stesso URL: due menu non possono avere lo
 * stesso slug, perché l'indirizzo pubblico è uno solo.
 */
export function slugOccupato(menu: WebMenu[], nome: string, escludiId?: string): WebMenu | null {
  const slug = slugDaNome(nome)
  return menu.find(m => m.id !== escludiId && m.slug === slug) ?? null
}
