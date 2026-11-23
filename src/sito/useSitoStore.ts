import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Categoria } from './sitoData'

/**
 * Sito Sibylla Network (vetrina e-commerce): visibilità, pagina corrente,
 * carrello e preferiti. Si apre da "Disconnetti profilo" in topbar; "Area
 * riservata" riporta in Platform. Persistiti solo carrello e preferiti.
 */
export type PaginaSito =
  | { nome: 'home' }
  | { nome: 'catalogo'; cat?: Categoria; dove?: string }
  | { nome: 'scheda'; id: string }
  | { nome: 'carrello' }
  | { nome: 'rete'; ancora?: string }
  | { nome: 'info'; id: PaginaInfo }
  | { nome: 'preferiti' }
  | { nome: 'destinazione'; citta: string }
  | { nome: 'conferma'; ordine: string }

/** Pagine istituzionali (come sul sito attuale, una pagina ciascuna). */
export type PaginaInfo = 'chi-siamo' | 'partner' | 'imt' | 'lavora' | 'contatti' | 'societa' | 'privacy' | 'cookie'

export interface RigaCarrello {
  key: string
  id: string
  qta: number
  /** yyyy-MM-dd (esperienze/servizi) o check-in (soggiorni) */
  data?: string
  dataFine?: string
  orario?: string
  /** Prezzo unitario della riga (per i soggiorni: prezzo × notti). */
  prezzo: number
  dettaglio: string
}

export type ModoSito = 'web' | 'totem'
/** Versioni grafiche della home web, scelte dai link in header. */
export type VersioneHome = 'impatto' | 'editoriale' | 'bento'

interface SitoState {
  aperto: boolean
  /** Sito web (desktop/mobile) o Totem interattivo verticale nelle strutture. */
  modo: ModoSito
  versione: VersioneHome
  pagina: PaginaSito
  carrello: RigaCarrello[]
  preferiti: string[]
  drawer: boolean
  apri: () => void
  chiudi: () => void
  vai: (p: PaginaSito) => void
  aggiungi: (r: Omit<RigaCarrello, 'key'>) => void
  qta: (key: string, qta: number) => void
  rimuovi: (key: string) => void
  svuota: () => void
  preferito: (id: string) => void
  setDrawer: (v: boolean) => void
  setModo: (m: ModoSito) => void
  setVersione: (v: VersioneHome) => void
}

export const useSitoStore = create<SitoState>()(
  persist(
    (set) => ({
      aperto: false,
      modo: 'web',
      versione: 'impatto',
      pagina: { nome: 'home' },
      carrello: [],
      preferiti: [],
      drawer: false,
      apri: () => set({ aperto: true, pagina: { nome: 'home' } }),
      chiudi: () => set({ aperto: false, drawer: false }),
      vai: (pagina) => set({ pagina, drawer: false }),
      aggiungi: (r) => set((s) => {
        const key = [r.id, r.data ?? '', r.dataFine ?? '', r.orario ?? ''].join('|')
        const esiste = s.carrello.find(x => x.key === key)
        const carrello = esiste
          ? s.carrello.map(x => (x.key === key ? { ...x, qta: x.qta + r.qta } : x))
          : [...s.carrello, { ...r, key }]
        return { carrello, drawer: true }
      }),
      qta: (key, qta) => set((s) => ({ carrello: s.carrello.map(x => (x.key === key ? { ...x, qta: Math.max(1, qta) } : x)) })),
      rimuovi: (key) => set((s) => ({ carrello: s.carrello.filter(x => x.key !== key) })),
      svuota: () => set({ carrello: [] }),
      preferito: (id) => set((s) => ({ preferiti: s.preferiti.includes(id) ? s.preferiti.filter(x => x !== id) : [...s.preferiti, id] })),
      setDrawer: (drawer) => set({ drawer }),
      setModo: (modo) => set({ modo, pagina: { nome: 'home' }, drawer: false }),
      setVersione: (versione) => set({ versione, pagina: { nome: 'home' }, drawer: false }),
    }),
    { name: 'sibylla.sito-network', version: 1, partialize: (s) => ({ carrello: s.carrello, preferiti: s.preferiti, modo: s.modo, versione: s.versione }) },
  ),
)

// Solo in sviluppo: aggancio per la QA automatica (puppeteer) delle pagine
if (process.env.NODE_ENV !== 'production') (window as unknown as { __snwStore: typeof useSitoStore }).__snwStore = useSitoStore
