// ─────────────────────────────────────────────────────────────────────────────
//  Store del catalogo master delle pagine (page «pa-gestione-pagine»).
//
//  Modello:
//   • Profilo  → un "menu differenziato" (es. Hotel, Tour Operator…) con un proprio
//               catalogo di pagine e un proprio stile grafico. I profili sono
//               creabili, rinominabili, duplicabili ed eliminabili.
//   • PageNode → una voce di menu / pagina del catalogo, con gerarchia (parentId
//               + ordine) e stato di pubblicazione.
//   • MenuStyle → personalizzazione grafica del menu del profilo (font, colori,
//               dimensioni). Valori runtime applicati via CSS custom properties.
//
//  Persistito in localStorage (chiave «sibylla.gestione-pagine»).
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PageNode {
  id: string
  nome: string            // etichetta menu
  titolo: string          // titolo pagina (opzionale, se vuoto usa il nome)
  sottotitolo: string     // sottotitolo pagina (opzionale)
  link: string            // link di collegamento
  icona: string           // HTML icona FA, es: <i class="fa-regular fa-pen modify"></i>
  parentId: string | null // gerarchia
  ordine: number          // ordine di visualizzazione tra fratelli
  visibile: boolean       // pubblicata / visibile in menu
  productionReady: boolean
  disabilitata: boolean
}

export interface MenuStyle {
  fontFamily: 'heading' | 'body' | 'mono'
  fontSize: number        // px
  bold: boolean
  uppercase: boolean
  colorText: string
  colorActive: string
  colorBg: string
  colorIcon: string
}

export interface Profilo {
  id: string
  nome: string
  style: MenuStyle
  pages: PageNode[]
}

interface State {
  profili: Profilo[]
  activeId: string

  selectProfile: (id: string) => void
  addProfile: (nome: string) => string
  renameProfile: (id: string, nome: string) => void
  duplicateProfile: (id: string) => string
  deleteProfile: (id: string) => void
  updateStyle: (profileId: string, patch: Partial<MenuStyle>) => void

  addPage: (profileId: string, page: Omit<PageNode, 'id' | 'ordine'>) => string
  updatePage: (profileId: string, id: string, patch: Partial<PageNode>) => void
  deletePage: (profileId: string, id: string) => void
  /**
   * Sposta `dragId` rispetto a `targetId`:
   *  • 'before' / 'after' → fratello del target (eredita il parent del target)
   *  • 'inside'           → figlio del target (sottolivello, in coda)
   */
  movePage: (profileId: string, dragId: string, targetId: string, pos: DropPos) => void
}

export type DropPos = 'before' | 'after' | 'inside'

// ── helpers ──────────────────────────────────────────────────────────────────
let _seq = 0
const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${(_seq++).toString(36)}`

export const DEFAULT_STYLE: MenuStyle = {
  fontFamily: 'heading',
  fontSize: 14,
  bold: false,
  uppercase: false,
  colorText: '#4A4D53',
  colorActive: '#8a6d1f',
  colorBg: '#ffffff',
  colorIcon: '#8a6d1f',
}

export const FONT_STACKS: Record<MenuStyle['fontFamily'], string> = {
  heading: "'Poppins', sans-serif",
  body: "'Open Sans', sans-serif",
  mono: "'SFMono-Regular', ui-monospace, 'Menlo', monospace",
}

/** Ordina i fratelli di un dato parent per `ordine`. */
export function childrenOf(pages: PageNode[], parentId: string | null): PageNode[] {
  return pages
    .filter(p => p.parentId === parentId)
    .sort((a, b) => a.ordine - b.ordine)
}

/** Tutti i discendenti (ricorsivi) di un nodo — usato per impedire cicli nel parent. */
export function descendantIds(pages: PageNode[], id: string): Set<string> {
  const out = new Set<string>()
  const walk = (pid: string) => {
    pages.filter(p => p.parentId === pid).forEach(c => {
      out.add(c.id)
      walk(c.id)
    })
  }
  walk(id)
  return out
}

const nextOrder = (pages: PageNode[], parentId: string | null) =>
  pages.filter(p => p.parentId === parentId).reduce((m, p) => Math.max(m, p.ordine), 0) + 10

// ── seed ───────────────────────────────────────────────────────────────────
function mk(
  nome: string, link: string, icona: string, ordine: number,
  parentId: string | null = null,
  flags: Partial<Pick<PageNode, 'visibile' | 'productionReady' | 'disabilitata'>> = {},
  extra: Partial<Pick<PageNode, 'titolo' | 'sottotitolo'>> = {},
): PageNode {
  return {
    id: uid('pg'),
    nome, link, icona, parentId, ordine,
    titolo: extra.titolo ?? '',
    sottotitolo: extra.sottotitolo ?? '',
    visibile: flags.visibile ?? true,
    productionReady: flags.productionReady ?? true,
    disabilitata: flags.disabilitata ?? false,
  }
}

function seedHotel(): PageNode[] {
  const home = mk('Home', '/Bacheca/index', '<i class="fa-solid fa-house"></i>', 10)
  const op = mk('Operatività', '/operation', '<i class="fa-regular fa-clipboard"></i>', 20, null, { visibile: false })
  return [
    home,
    op,
    mk('Check in', '/operation/checkIn', '<i class="fa-regular fa-right-to-bracket"></i>', 10, op.id),
    mk('CheckOut', '/operation/checkout', '<i class="fa-regular fa-right-from-bracket"></i>', 20, op.id),
    mk('Carrello', '/Operation/RiepilogoServizi', '<i class="fa-solid fa-cart-shopping"></i>', 30, op.id),
    mk('Allestisci camera', '/Stanze/ModificaCameraInventario/', '<i class="fa-regular fa-bed"></i>', 30),
    mk('Crea anagrafica profilo', '/humanResource/GetModificaAnagrafiPersonale', '<i class="fa-regular fa-id-card"></i>', 40),
    mk('Modifica anagrafica profilo', '/humanResource/getAnagraficaPersonale/', '<i class="fa-regular fa-pen modify"></i>', 50, null, {}, { titolo: 'Modifica anagrafica profilo' }),
    mk('Analisi tableau', '/Tableau/Analisi', '<i class="fa-solid fa-chart-line"></i>', 60, null, { productionReady: false }),
    mk('Modifica struttura', '/Impostazioni/GetStruttura', '<i class="fa-regular fa-building"></i>', 70),
  ]
}

function seedTO(): PageNode[] {
  const home = mk('Dashboard', '/Bacheca/index', '<i class="fa-solid fa-gauge"></i>', 10)
  return [
    home,
    mk('Pacchetti', '/agora/dynamic-packages', '<i class="fa-solid fa-box"></i>', 20),
    mk('Preventivi', '/Preventivi/IMieiPreventivi', '<i class="fa-regular fa-file-lines"></i>', 30),
    mk('Match Zone', '/agora/matchzone', '<i class="fa-solid fa-handshake"></i>', 40, null, { productionReady: false }),
  ]
}

function seedFornitore(): PageNode[] {
  const home = mk('Home fornitore', '/Bacheca/index', '<i class="fa-solid fa-house"></i>', 10)
  return [
    home,
    mk('Catalogo', '/agora/portafoglio', '<i class="fa-solid fa-boxes-stacked"></i>', 20),
    mk('Annunci', '/agora/announcements', '<i class="fa-regular fa-newspaper"></i>', 30),
  ]
}

function seedSystem(): PageNode[] {
  return [
    mk('Home', '/Bacheca/index', '<i class="fa-solid fa-house"></i>', 10),
    mk('NotFound', '/NotFound', '<i class="fa-regular fa-circle-question"></i>', 20, null, { visibile: false, disabilitata: true }),
    mk('I.M.T', '/Bacheca/Imt', '<i class="fa-solid fa-diagram-project"></i>', 30),
  ]
}

function seedProfili(): Profilo[] {
  return [
    { id: 'prof-system',     nome: 'System',        style: { ...DEFAULT_STYLE }, pages: seedSystem() },
    { id: 'prof-hotel',      nome: 'Hotel',         style: { ...DEFAULT_STYLE }, pages: seedHotel() },
    { id: 'prof-tour',       nome: 'Tour Operator', style: { ...DEFAULT_STYLE, fontFamily: 'body' }, pages: seedTO() },
    { id: 'prof-fornitore',  nome: 'Fornitore',     style: { ...DEFAULT_STYLE }, pages: seedFornitore() },
  ]
}

// ── store ──────────────────────────────────────────────────────────────────
const patchProfile = (
  profili: Profilo[], id: string, fn: (p: Profilo) => Profilo,
): Profilo[] => profili.map(p => (p.id === id ? fn(p) : p))

export const useGestionePagineStore = create<State>()(
  persist(
    (set, get) => ({
      profili: seedProfili(),
      activeId: 'prof-hotel',

      selectProfile: (id) => set({ activeId: id }),

      addProfile: (nome) => {
        const id = uid('prof')
        set(s => ({
          profili: [...s.profili, { id, nome: nome.trim() || 'Nuovo profilo', style: { ...DEFAULT_STYLE }, pages: [] }],
          activeId: id,
        }))
        return id
      },

      renameProfile: (id, nome) =>
        set(s => ({ profili: patchProfile(s.profili, id, p => ({ ...p, nome: nome.trim() || p.nome })) })),

      duplicateProfile: (id) => {
        const src = get().profili.find(p => p.id === id)
        if (!src) return id
        const newId = uid('prof')
        // rimappa gli id delle pagine mantenendo la gerarchia
        const idMap = new Map<string, string>()
        src.pages.forEach(pg => idMap.set(pg.id, uid('pg')))
        const pages: PageNode[] = src.pages.map(pg => ({
          ...pg,
          id: idMap.get(pg.id)!,
          parentId: pg.parentId ? (idMap.get(pg.parentId) ?? null) : null,
        }))
        set(s => ({
          profili: [...s.profili, { id: newId, nome: `${src.nome} (copia)`, style: { ...src.style }, pages }],
          activeId: newId,
        }))
        return newId
      },

      deleteProfile: (id) =>
        set(s => {
          if (s.profili.length <= 1) return s // non eliminare l'ultimo profilo
          const profili = s.profili.filter(p => p.id !== id)
          const activeId = s.activeId === id ? profili[0].id : s.activeId
          return { profili, activeId }
        }),

      updateStyle: (profileId, patch) =>
        set(s => ({ profili: patchProfile(s.profili, profileId, p => ({ ...p, style: { ...p.style, ...patch } })) })),

      addPage: (profileId, page) => {
        const id = uid('pg')
        set(s => ({
          profili: patchProfile(s.profili, profileId, p => ({
            ...p,
            pages: [...p.pages, { ...page, id, ordine: nextOrder(p.pages, page.parentId) }],
          })),
        }))
        return id
      },

      updatePage: (profileId, id, patch) =>
        set(s => ({
          profili: patchProfile(s.profili, profileId, p => ({
            ...p,
            pages: p.pages.map(pg => (pg.id === id ? { ...pg, ...patch } : pg)),
          })),
        })),

      deletePage: (profileId, id) =>
        set(s => ({
          profili: patchProfile(s.profili, profileId, p => {
            const toDrop = descendantIds(p.pages, id)
            toDrop.add(id)
            return { ...p, pages: p.pages.filter(pg => !toDrop.has(pg.id)) }
          }),
        })),

      movePage: (profileId, dragId, targetId, pos) =>
        set(s => ({
          profili: patchProfile(s.profili, profileId, p => {
            if (dragId === targetId) return p
            const target = p.pages.find(pg => pg.id === targetId)
            const drag = p.pages.find(pg => pg.id === dragId)
            if (!target || !drag) return p
            // vietato spostare un nodo dentro sé stesso o un proprio discendente
            const blocked = descendantIds(p.pages, dragId)
            if (blocked.has(targetId)) return p

            // parent di destinazione + lista fratelli in cui inserire drag
            const newParent = pos === 'inside' ? target.id : target.parentId
            const siblings = childrenOf(p.pages, newParent).filter(pg => pg.id !== dragId)

            let insertAt: number
            if (pos === 'inside') {
              insertAt = siblings.length // in coda ai figli del target
            } else {
              const idx = siblings.findIndex(pg => pg.id === targetId)
              insertAt = pos === 'before' ? idx : idx + 1
            }
            const ordered = [...siblings.slice(0, insertAt), drag, ...siblings.slice(insertAt)]
            const orderById = new Map(ordered.map((pg, i) => [pg.id, (i + 1) * 10]))

            return {
              ...p,
              pages: p.pages.map(pg => {
                if (pg.id === dragId) return { ...pg, parentId: newParent, ordine: orderById.get(pg.id)! }
                if (orderById.has(pg.id)) return { ...pg, ordine: orderById.get(pg.id)! }
                return pg
              }),
            }
          }),
        })),
    }),
    { name: 'sibylla.gestione-pagine', version: 1 },
  ),
)
