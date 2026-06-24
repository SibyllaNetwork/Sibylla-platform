import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Live display: configurazione della vetrina del Tour Operator ─────────────
//  La vetrina è un builder a griglia: nasce VUOTA e l'utente compone la pagina
//  aggiungendo RIGHE. Ogni riga ha una disposizione scelta dall'utente
//  (1 card unica tipo Hero, oppure 2 · 3 · 4 card affiancate) e ciascuno slot
//  ospita una card di un tipo a scelta (hero, immagine, struttura, pacchetto,
//  testo, servizi, contatti). Tutto è persistito tra le sessioni.

export type FontKey = 'poppins' | 'sans' | 'serif' | 'mono'
export const FONTS: { key: FontKey; label: string; stack: string }[] = [
  { key: 'poppins', label: 'Geometrico (Poppins)', stack: "'Poppins', system-ui, sans-serif" },
  { key: 'sans',    label: 'Moderno (Sans)',        stack: "'Helvetica Neue', Arial, sans-serif" },
  { key: 'serif',   label: 'Elegante (Serif)',      stack: "Georgia, 'Times New Roman', serif" },
  { key: 'mono',    label: 'Tecnico (Mono)',        stack: "'Courier New', monospace" },
]
export const fontStack = (k: FontKey) => FONTS.find((f) => f.key === k)?.stack ?? FONTS[0].stack

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=900&q=70&auto=format&fit=crop`
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`

// ─── Card: le tessere che riempiono gli slot della griglia ────────────────────
export type CardType = 'hero' | 'immagine' | 'struttura' | 'pacchetto' | 'testo' | 'servizi' | 'contatti'

export interface ServizioVoce { label: string; icon: string }

// Dati di una card: campi opzionali condivisi tra i vari tipi.
export interface CardData {
  // hero
  titolo?: string; sottotitolo?: string; payoff?: string
  ctaLabel?: string; ctaUrl?: string; align?: 'left' | 'center'; coverId?: string
  // immagine / struttura
  nome?: string; tag?: string; citta?: string; img?: string; da?: number
  // pacchetto
  notti?: number
  // testo
  heading?: string; body?: string
  // servizi
  servizi?: ServizioVoce[]
}

export interface Slot { id: string; type: CardType | null; data: CardData }
export type ColCount = 1 | 2 | 3 | 4
export interface Row { id: string; cols: ColCount; slots: Slot[] }

// Etichetta + icona di ciascun tipo di card (picker e tool).
export const CARD_META: Record<CardType, { label: string; icon: string; hint: string }> = {
  hero:      { label: 'Hero',      icon: 'image',          hint: 'Copertina con titolo e pulsante' },
  immagine:  { label: 'Immagine',  icon: 'panorama',       hint: 'Foto con titolo, tag e prezzo' },
  struttura: { label: 'Struttura', icon: 'hotel',          hint: 'Foto, nome e città' },
  pacchetto: { label: 'Pacchetto', icon: 'box-open',       hint: 'Nome, notti, prezzo e CTA' },
  testo:     { label: 'Testo',     icon: 'align-left',     hint: 'Titolo e paragrafo' },
  servizi:   { label: 'Servizi',   icon: 'bell-concierge', hint: 'Elenco di servizi inclusi' },
  contatti:  { label: 'Contatti',  icon: 'address-book',   hint: 'Email, telefono e indirizzo' },
}
export const CARD_TYPES = Object.keys(CARD_META) as CardType[]

const DEFAULT_SERVIZI: ServizioVoce[] = [
  { label: 'Transfer', icon: 'car' }, { label: 'Spa', icon: 'spa' },
  { label: 'Ristorante', icon: 'utensils' }, { label: 'Escursioni', icon: 'compass' },
  { label: 'Eventi', icon: 'ticket' },
]

// Dati iniziali per ogni tipo di card appena inserita.
const CARD_DEFAULTS: Record<CardType, () => CardData> = {
  hero: () => ({
    payoff: 'Viaggi su misura',
    titolo: 'Scopri le tue prossime destinazioni',
    sottotitolo: 'Catalogo curato di strutture, servizi e pacchetti selezionati per te.',
    ctaLabel: 'Richiedi un preventivo', ctaUrl: 'https://tuonome.sibyllanetwork.it/contatti',
    align: 'left', coverId: 'mediterraneo',
  }),
  immagine:  () => ({ nome: 'Costiera Amalfitana', tag: 'Mare', da: 690, img: IMG('photo-1533106418989-88406c7cc8ca') }),
  struttura: () => ({ nome: 'Hotel Continental', citta: 'Roma', img: IMG('photo-1566073771259-6a8506099945') }),
  pacchetto: () => ({ nome: 'Weekend romantico', notti: 2, da: 320, ctaLabel: 'Scopri', ctaUrl: '#' }),
  testo:     () => ({ heading: 'La nostra promessa', body: 'Raccontiamo qui in poche righe chi siamo e perché scegliere la nostra agenzia per il prossimo viaggio.' }),
  servizi:   () => ({ servizi: DEFAULT_SERVIZI.map((s) => ({ ...s })) }),
  contatti:  () => ({}),
}

const emptySlot = (): Slot => ({ id: uid('sl'), type: null, data: {} })
const makeRow = (cols: ColCount): Row => ({ id: uid('row'), cols, slots: Array.from({ length: cols }, emptySlot) })

export interface LiveConfig {
  brand: { nome: string; payoff: string }
  theme: { primary: string; accent: string; bg: string; text: string; font: FontKey; radius: number }
  layout: Row[]
  contatti: { email: string; telefono: string; indirizzo: string }
  social: { instagram: string; facebook: string; sito: string }
}

// La vetrina nasce VUOTA: nessuna riga, solo nav + footer e le aree da comporre.
export const DEFAULT_CONFIG: LiveConfig = {
  brand: { nome: 'Sibylla Travel', payoff: 'Viaggi su misura, esperienze autentiche' },
  theme: { primary: '#206953', accent: '#E0A500', bg: '#ffffff', text: '#1f2937', font: 'poppins', radius: 14 },
  layout: [],
  contatti: { email: 'info@tuonome.it', telefono: '+39 06 1234 567', indirizzo: 'Via Roma 1, Roma' },
  social: { instagram: 'https://instagram.com/tuonome', facebook: 'https://facebook.com/tuonome', sito: 'https://tuonome.sibyllanetwork.it' },
}

// Pagina-vetrina salvata: nome, slug (per il link) e configurazione.
export interface SavedPage { id: string; nome: string; slug: string; config: LiveConfig; updatedAt: number }

export interface SlotRef { rowId: string; slotId: string }

interface LiveDisplayState {
  pages: SavedPage[]
  currentId: string
  // gestione pagine
  newPage: () => void
  selectPage: (id: string) => void
  renamePage: (id: string, nome: string) => void
  deletePage: (id: string) => void
  duplicatePage: (id: string) => void
  // editing globale (pagina corrente)
  setBrand: (patch: Partial<LiveConfig['brand']>) => void
  setTheme: (patch: Partial<LiveConfig['theme']>) => void
  setContatti: (patch: Partial<LiveConfig['contatti']>) => void
  setSocial: (patch: Partial<LiveConfig['social']>) => void
  // layout a righe
  addRow: (cols: ColCount, afterRowId?: string | null) => void
  setRowCols: (rowId: string, cols: ColCount) => void
  moveRow: (rowId: string, dir: -1 | 1) => void
  removeRow: (rowId: string) => void
  duplicateRow: (rowId: string) => void
  // slot / card
  setSlotType: (rowId: string, slotId: string, type: CardType) => void
  updateSlot: (rowId: string, slotId: string, patch: CardData) => void
  clearSlot: (rowId: string, slotId: string) => void
  reset: () => void
}

const clone = <T,>(c: T): T => JSON.parse(JSON.stringify(c))
const slugify = (s: string) =>
  s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'vetrina'
const newPageObj = (nome: string, config?: LiveConfig): SavedPage => ({
  id: uid('pg'), nome, slug: slugify(nome), config: config ?? clone(DEFAULT_CONFIG), updatedAt: Date.now(),
})

// Ridimensiona gli slot di una riga preservando il contenuto esistente.
const resizeSlots = (slots: Slot[], cols: ColCount): Slot[] => {
  if (slots.length === cols) return slots
  if (slots.length > cols) return slots.slice(0, cols)
  return [...slots, ...Array.from({ length: cols - slots.length }, emptySlot)]
}

export const useLiveDisplayStore = create<LiveDisplayState>()(
  persist(
    (set) => {
      const FIRST = newPageObj('Vetrina principale')
      // Aggiorna la config della pagina corrente.
      const patch = (fn: (c: LiveConfig) => LiveConfig) =>
        set((s) => ({ pages: s.pages.map((p) => (p.id === s.currentId ? { ...p, config: fn(p.config), updatedAt: Date.now() } : p)) }))
      const patchRow = (rowId: string, fn: (r: Row) => Row) =>
        patch((c) => ({ ...c, layout: c.layout.map((r) => (r.id === rowId ? fn(r) : r)) }))
      const patchSlot = (rowId: string, slotId: string, fn: (sl: Slot) => Slot) =>
        patchRow(rowId, (r) => ({ ...r, slots: r.slots.map((sl) => (sl.id === slotId ? fn(sl) : sl)) }))
      return {
        pages: [FIRST],
        currentId: FIRST.id,
        newPage: () => set((s) => { const p = newPageObj(`Vetrina ${s.pages.length + 1}`); return { pages: [...s.pages, p], currentId: p.id } }),
        selectPage: (id) => set({ currentId: id }),
        renamePage: (id, nome) =>
          set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, nome, slug: slugify(nome), updatedAt: Date.now() } : p)) })),
        deletePage: (id) =>
          set((s) => {
            const pages = s.pages.filter((p) => p.id !== id)
            if (pages.length === 0) { const p = newPageObj('Vetrina principale'); return { pages: [p], currentId: p.id } }
            return { pages, currentId: s.currentId === id ? pages[0].id : s.currentId }
          }),
        duplicatePage: (id) =>
          set((s) => {
            const src = s.pages.find((p) => p.id === id)
            if (!src) return s
            const p = newPageObj(`${src.nome} (copia)`, clone(src.config))
            return { pages: [...s.pages, p], currentId: p.id }
          }),
        setBrand: (p) => patch((c) => ({ ...c, brand: { ...c.brand, ...p } })),
        setTheme: (p) => patch((c) => ({ ...c, theme: { ...c.theme, ...p } })),
        setContatti: (p) => patch((c) => ({ ...c, contatti: { ...c.contatti, ...p } })),
        setSocial: (p) => patch((c) => ({ ...c, social: { ...c.social, ...p } })),
        addRow: (cols, afterRowId) =>
          patch((c) => {
            const row = makeRow(cols)
            // undefined → in fondo · null → in testa · id → dopo quella riga
            if (afterRowId === undefined) return { ...c, layout: [...c.layout, row] }
            if (afterRowId === null) return { ...c, layout: [row, ...c.layout] }
            const i = c.layout.findIndex((r) => r.id === afterRowId)
            const layout = [...c.layout]
            layout.splice(i < 0 ? layout.length : i + 1, 0, row)
            return { ...c, layout }
          }),
        setRowCols: (rowId, cols) => patchRow(rowId, (r) => ({ ...r, cols, slots: resizeSlots(r.slots, cols) })),
        moveRow: (rowId, dir) =>
          patch((c) => {
            const i = c.layout.findIndex((r) => r.id === rowId)
            const j = i + dir
            if (i < 0 || j < 0 || j >= c.layout.length) return c
            const layout = [...c.layout]
            ;[layout[i], layout[j]] = [layout[j], layout[i]]
            return { ...c, layout }
          }),
        removeRow: (rowId) => patch((c) => ({ ...c, layout: c.layout.filter((r) => r.id !== rowId) })),
        duplicateRow: (rowId) =>
          patch((c) => {
            const i = c.layout.findIndex((r) => r.id === rowId)
            if (i < 0) return c
            const src = c.layout[i]
            const copy: Row = { id: uid('row'), cols: src.cols, slots: src.slots.map((sl) => ({ ...clone(sl), id: uid('sl') })) }
            const layout = [...c.layout]
            layout.splice(i + 1, 0, copy)
            return { ...c, layout }
          }),
        setSlotType: (rowId, slotId, type) => patchSlot(rowId, slotId, (sl) => ({ ...sl, type, data: CARD_DEFAULTS[type]() })),
        updateSlot: (rowId, slotId, p) => patchSlot(rowId, slotId, (sl) => ({ ...sl, data: { ...sl.data, ...p } })),
        clearSlot: (rowId, slotId) => patchSlot(rowId, slotId, (sl) => ({ ...sl, type: null, data: {} })),
        reset: () => patch(() => clone(DEFAULT_CONFIG)),
      }
    },
    {
      name: 'sibylla.live-display',
      version: 4,
      migrate: (state: any) => {
        if (!state) return state
        // v1/v2: singola `config` → avvolgi in una pagina.
        if (state.config && !state.pages) {
          const p = newPageObj('Vetrina principale')
          state.pages = [p]
          state.currentId = p.id
          delete state.config
        }
        // v3 → v4: il vecchio modello a sezioni/items non è più valido.
        //  Si conserva brand/theme/contatti/social, la vetrina riparte VUOTA.
        if (Array.isArray(state.pages)) {
          state.pages = state.pages.map((p: any) => {
            const c = p.config || {}
            if (!Array.isArray(c.layout)) {
              const d = clone(DEFAULT_CONFIG)
              p.config = {
                brand: c.brand ?? d.brand,
                theme: c.theme ?? d.theme,
                layout: [],
                contatti: c.contatti ?? d.contatti,
                social: c.social ?? d.social,
              }
            }
            return p
          })
        }
        return state
      },
    },
  ),
)
