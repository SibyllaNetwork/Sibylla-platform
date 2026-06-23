import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Live display: configurazione della vetrina del Tour Operator ─────────────
//  La vetrina è profondamente personalizzabile: testi, colori, font, raggio,
//  ordine e visibilità delle sezioni (impaginazione/posizione), link e contatti.
//  Tutto persistito così la configurazione resta tra le sessioni.

export type FontKey = 'poppins' | 'sans' | 'serif' | 'mono'
export const FONTS: { key: FontKey; label: string; stack: string }[] = [
  { key: 'poppins', label: 'Geometrico (Poppins)', stack: "'Poppins', system-ui, sans-serif" },
  { key: 'sans',    label: 'Moderno (Sans)',        stack: "'Helvetica Neue', Arial, sans-serif" },
  { key: 'serif',   label: 'Elegante (Serif)',      stack: "Georgia, 'Times New Roman', serif" },
  { key: 'mono',    label: 'Tecnico (Mono)',        stack: "'Courier New', monospace" },
]
export const fontStack = (k: FontKey) => FONTS.find((f) => f.key === k)?.stack ?? FONTS[0].stack

export type SezioneId = 'strutture' | 'servizi' | 'destinazioni' | 'pacchetti' | 'contatti'
export interface VTSection { id: SezioneId; label: string; visible: boolean }

// Contenuti editabili della vetrina.
export interface DestItem { id: string; nome: string; tag: string; da: number; img: string }
export interface StructItem { id: string; nome: string; citta: string; img: string }
export interface PkgItem { id: string; nome: string; notti: number; da: number }
export type ItemKind = 'destinazioni' | 'strutture' | 'pacchetti'

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=900&q=70&auto=format&fit=crop`
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`

export interface LiveConfig {
  brand: { nome: string; payoff: string }
  theme: { primary: string; accent: string; bg: string; text: string; font: FontKey; radius: number }
  hero: { titolo: string; sottotitolo: string; ctaLabel: string; ctaUrl: string; align: 'left' | 'center'; coverId: string }
  sections: VTSection[]
  items: { destinazioni: DestItem[]; strutture: StructItem[]; pacchetti: PkgItem[] }
  contatti: { email: string; telefono: string; indirizzo: string }
  social: { instagram: string; facebook: string; sito: string }
}

export const DEFAULT_CONFIG: LiveConfig = {
  brand: { nome: 'Sibylla Travel', payoff: 'Viaggi su misura, esperienze autentiche' },
  theme: { primary: '#206953', accent: '#E0A500', bg: '#ffffff', text: '#1f2937', font: 'poppins', radius: 14 },
  hero: {
    titolo: 'Scopri le tue prossime destinazioni',
    sottotitolo: 'Catalogo curato di strutture, servizi e pacchetti selezionati per te.',
    ctaLabel: 'Richiedi un preventivo',
    ctaUrl: 'https://tuonome.sibyllanetwork.it/contatti',
    align: 'left',
    coverId: 'mediterraneo',
  },
  sections: [
    { id: 'destinazioni', label: 'Destinazioni in evidenza', visible: true },
    { id: 'strutture',    label: 'Le nostre strutture',      visible: true },
    { id: 'servizi',      label: 'Servizi inclusi',          visible: true },
    { id: 'pacchetti',    label: 'Pacchetti speciali',       visible: true },
    { id: 'contatti',     label: 'Contattaci',               visible: true },
  ],
  items: {
    destinazioni: [
      { id: 'd1', nome: 'Costiera Amalfitana', tag: 'Mare',     da: 690, img: IMG('photo-1533106418989-88406c7cc8ca') },
      { id: 'd2', nome: 'Toscana & Borghi',    tag: 'Cultura',  da: 540, img: IMG('photo-1543429776-2782fc8e1acd') },
      { id: 'd3', nome: 'Dolomiti',            tag: 'Montagna', da: 720, img: IMG('photo-1464822759023-fed622ff2c3b') },
    ],
    strutture: [
      { id: 's1', nome: 'Hotel Continental', citta: 'Roma',    img: IMG('photo-1566073771259-6a8506099945') },
      { id: 's2', nome: 'Lungarno Suites',   citta: 'Firenze', img: IMG('photo-1551882547-ff40c63fe5fa') },
      { id: 's3', nome: 'Galleria Duomo',    citta: 'Milano',  img: IMG('photo-1455587734955-081b22074882') },
      { id: 's4', nome: 'Laguna Palace',     citta: 'Venezia', img: IMG('photo-1538970272646-f61fabb3a8a2') },
    ],
    pacchetti: [
      { id: 'p1', nome: 'Weekend romantico', notti: 2, da: 320 },
      { id: 'p2', nome: 'Tour delle città',  notti: 5, da: 890 },
      { id: 'p3', nome: 'Settimana mare',    notti: 7, da: 1190 },
    ],
  },
  contatti: { email: 'info@tuonome.it', telefono: '+39 06 1234 567', indirizzo: 'Via Roma 1, Roma' },
  social: { instagram: 'https://instagram.com/tuonome', facebook: 'https://facebook.com/tuonome', sito: 'https://tuonome.sibyllanetwork.it' },
}

const NEW_ITEM: Record<ItemKind, () => DestItem | StructItem | PkgItem> = {
  destinazioni: () => ({ id: uid('d'), nome: 'Nuova destinazione', tag: 'Novità', da: 500, img: IMG('photo-1469854523086-cc02fe5d8800') }),
  strutture:    () => ({ id: uid('s'), nome: 'Nuova struttura', citta: 'Città', img: IMG('photo-1551882547-ff40c63fe5fa') }),
  pacchetti:    () => ({ id: uid('p'), nome: 'Nuovo pacchetto', notti: 3, da: 600 }),
}

// Pagina-vetrina salvata: nome, slug (per il link) e configurazione.
export interface SavedPage { id: string; nome: string; slug: string; config: LiveConfig; updatedAt: number }

interface LiveDisplayState {
  pages: SavedPage[]
  currentId: string
  // gestione pagine
  newPage: () => void
  selectPage: (id: string) => void
  renamePage: (id: string, nome: string) => void
  deletePage: (id: string) => void
  duplicatePage: (id: string) => void
  touch: () => void
  // editing (operano sulla pagina corrente)
  setBrand: (patch: Partial<LiveConfig['brand']>) => void
  setTheme: (patch: Partial<LiveConfig['theme']>) => void
  setHero: (patch: Partial<LiveConfig['hero']>) => void
  setContatti: (patch: Partial<LiveConfig['contatti']>) => void
  setSocial: (patch: Partial<LiveConfig['social']>) => void
  setSectionLabel: (id: SezioneId, label: string) => void
  toggleSection: (id: SezioneId) => void
  /** Drag & drop: posiziona la sezione prima di `beforeId` (o in fondo se null)
      impostandone la visibilità. */
  dropSection: (id: SezioneId, beforeId: SezioneId | null, visible: boolean) => void
  addItem: (kind: ItemKind) => void
  updateItem: (kind: ItemKind, id: string, patch: Record<string, unknown>) => void
  removeItem: (kind: ItemKind, id: string) => void
  reset: () => void
}

const clone = (c: LiveConfig): LiveConfig => JSON.parse(JSON.stringify(c))
const slugify = (s: string) =>
  s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'vetrina'
const newPageObj = (nome: string, config?: LiveConfig): SavedPage => ({
  id: uid('pg'), nome, slug: slugify(nome), config: config ?? clone(DEFAULT_CONFIG), updatedAt: Date.now(),
})

export const useLiveDisplayStore = create<LiveDisplayState>()(
  persist(
    (set) => {
      const FIRST = newPageObj('Vetrina principale')
      // Aggiorna la config della pagina corrente.
      const patch = (fn: (c: LiveConfig) => LiveConfig) =>
        set((s) => ({ pages: s.pages.map((p) => (p.id === s.currentId ? { ...p, config: fn(p.config), updatedAt: Date.now() } : p)) }))
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
        touch: () => patch((c) => c),
        setBrand: (p) => patch((c) => ({ ...c, brand: { ...c.brand, ...p } })),
        setTheme: (p) => patch((c) => ({ ...c, theme: { ...c.theme, ...p } })),
        setHero: (p) => patch((c) => ({ ...c, hero: { ...c.hero, ...p } })),
        setContatti: (p) => patch((c) => ({ ...c, contatti: { ...c.contatti, ...p } })),
        setSocial: (p) => patch((c) => ({ ...c, social: { ...c.social, ...p } })),
        setSectionLabel: (id, label) => patch((c) => ({ ...c, sections: c.sections.map((x) => (x.id === id ? { ...x, label } : x)) })),
        toggleSection: (id) => patch((c) => ({ ...c, sections: c.sections.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)) })),
        dropSection: (id, beforeId, visible) =>
          patch((c) => {
            const mapped = c.sections.map((x) => (x.id === id ? { ...x, visible } : x))
            const moving = mapped.find((x) => x.id === id)
            if (!moving) return c
            const rest = mapped.filter((x) => x.id !== id)
            if (beforeId == null) rest.push(moving)
            else { const i = rest.findIndex((x) => x.id === beforeId); rest.splice(i < 0 ? rest.length : i, 0, moving) }
            return { ...c, sections: rest }
          }),
        addItem: (kind) => patch((c) => ({ ...c, items: { ...c.items, [kind]: [...c.items[kind], NEW_ITEM[kind]() as never] } })),
        updateItem: (kind, id, p) =>
          patch((c) => ({ ...c, items: { ...c.items, [kind]: (c.items[kind] as { id: string }[]).map((it) => (it.id === id ? { ...it, ...p } : it)) as never } })),
        removeItem: (kind, id) =>
          patch((c) => ({ ...c, items: { ...c.items, [kind]: (c.items[kind] as { id: string }[]).filter((it) => it.id !== id) as never } })),
        reset: () => patch(() => clone(DEFAULT_CONFIG)),
      }
    },
    {
      name: 'sibylla.live-display',
      version: 3,
      migrate: (state: any) => {
        // v1/v2: singola `config` → avvolgi in una pagina.
        if (state && state.config && !state.pages) {
          if (!state.config.items) state.config.items = clone(DEFAULT_CONFIG).items
          const p = newPageObj('Vetrina principale', state.config)
          state.pages = [p]
          state.currentId = p.id
          delete state.config
        }
        return state
      },
    },
  ),
)
