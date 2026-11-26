import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lingua } from './i18n/lingue'
import type { Categoria } from './sitoData'

/**
 * Sito Sibylla Network (vetrina e-commerce): visibilità, pagina corrente,
 * carrello e preferiti. Si apre da "Disconnetti profilo" in topbar; "Area
 * riservata" porta all'accesso del cliente (useSitoAccountStore), da cui
 * l'«Area partner» riporta in Platform. Persistiti carrello, preferiti,
 * modo e versione.
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
  | { nome: 'accesso'; modo?: 'accedi' | 'registrati'; poi?: PaginaSito }
  | { nome: 'account'; sez?: SezioneAccount }
  | { nome: 'faq' }
  | { nome: 'richiesta'; tipo: TipoRichiesta }
  | { nome: 'preventivo'; codice?: string }

/** Sezioni dell'area riservata (menu utente di sibyllanetwork.com + operatori). */
export type SezioneAccount = 'operatori' | 'profilo' | 'ordini' | 'preferiti' | 'portafoglio'
/** Servizi su richiesta (sibyllanetwork.com/transfers, /restaurants, /luggage). */
export type TipoRichiesta = 'transfer' | 'ristoranti' | 'bagagli'

/** Pagine istituzionali (come sul sito attuale, una pagina ciascuna). */
export type PaginaInfo = 'chi-siamo' | 'partner' | 'imt' | 'lavora' | 'contatti' | 'societa' | 'privacy' | 'cookie' | 'termini' | 'mission'

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
  /** Tariffa operatore dall'area riservata. */
  b2b?: boolean
}

export type ModoSito = 'web' | 'totem'
/** Versioni grafiche della home web, scelte dai link in header.
 *  'impatto2' esiste solo sul totem: il sito web la mostra come 'impatto'. */
export type VersioneHome = 'impatto' | 'impatto2' | 'editoriale' | 'bento'
export type VersioneWeb = Exclude<VersioneHome, 'impatto2'>
export const versioneWeb = (v: VersioneHome): VersioneWeb => (v === 'impatto2' ? 'impatto' : v)

/** Ricerca soggiorni (barra del catalogo): la scheda parte da queste date. */
export interface RicercaSoggiorni {
  dove: string
  dal: string
  al: string
  adulti: number
  bambini: number
  camere: number
}

const isoTra = (giorni: number) => { const d = new Date(); d.setDate(d.getDate() + giorni); return d.toISOString().slice(0, 10) }

interface SitoState {
  aperto: boolean
  /** Sito web (desktop/mobile) o Totem interattivo verticale nelle strutture. */
  modo: ModoSito
  versione: VersioneHome
  /** Lingua di sito e totem (vedi i18n). */
  lingua: Lingua
  setLingua: (l: Lingua) => void
  pagina: PaginaSito
  carrello: RigaCarrello[]
  preferiti: string[]
  drawer: boolean
  ricerca: RicercaSoggiorni
  setRicerca: (r: Partial<RicercaSoggiorni>) => void
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
      lingua: 'it',
      setLingua: (lingua) => set({ lingua, drawer: false }),
      pagina: { nome: 'home' },
      carrello: [],
      preferiti: [],
      drawer: false,
      ricerca: { dove: '', dal: isoTra(14), al: isoTra(17), adulti: 2, bambini: 0, camere: 1 },
      setRicerca: (r) => set((s) => ({ ricerca: { ...s.ricerca, ...r } })),
      apri: () => set({ aperto: true, pagina: { nome: 'home' } }),
      chiudi: () => set({ aperto: false, drawer: false }),
      vai: (pagina) => set({ pagina, drawer: false }),
      aggiungi: (r) => set((s) => {
        const key = [r.id, r.data ?? '', r.dataFine ?? '', r.orario ?? '', r.b2b ? 'b2b' : ''].join('|')
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
    { name: 'sibylla.sito-network', version: 1, partialize: (s) => ({ carrello: s.carrello, preferiti: s.preferiti, modo: s.modo, versione: s.versione, lingua: s.lingua }) },
  ),
)

// Solo in sviluppo: aggancio per la QA automatica (puppeteer) delle pagine
if (process.env.NODE_ENV !== 'production') (window as unknown as { __snwStore: typeof useSitoStore }).__snwStore = useSitoStore
