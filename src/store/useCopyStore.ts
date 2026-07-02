import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─────────────────────────────────────────────────────────────────────────────
//  Copy store — testi della piattaforma editabili + multilingua, PER CLIENTE.
//
//  Vincoli architetturali (richiesti):
//    • NIENTE database.
//    • NIENTE storage esterni (no Blob, no object store).
//    • Testi PER CLIENTE (intestatario del contratto), non globali.
//
//  → La persistenza è interamente client-side in `localStorage` (Zustand persist),
//    esattamente come gli altri store della piattaforma (useAccessStore,
//    useCartStore, useSectionThemeStore, …). Nessun servizio esterno coinvolto.
//
//  Ogni testo è una coppia `chiave → testo` risolta da t(key, fallback). La catena
//  di fallback garantisce che, senza override, la UI mostri il letterale italiano
//  di oggi (migrazione sicura e incrementale):
//
//    override[client][lang][key] → override[client]['it'][key]
//      → SEED[lang][key] → SEED['it'][key] → fallback (letterale nel .tsx) → key
//
//  `client` è la chiave dell'intestatario (es. 'int-gar'); vedi useCurrentClientKey
//  in src/core/i18n/copy.ts per come viene derivata (sessione assist o profilo).
// ─────────────────────────────────────────────────────────────────────────────

export type Lang = 'it' | 'en' | 'de' | 'fr' | 'es'

export const SOURCE_LANG: Lang = 'it'

export const SUPPORTED_LANGS: { id: Lang; label: string; flag: string }[] = [
  { id: 'it', label: 'Italiano', flag: '🇮🇹' },
  { id: 'en', label: 'English',  flag: '🇬🇧' },
  { id: 'de', label: 'Deutsch',  flag: '🇩🇪' },
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'es', label: 'Español',  flag: '🇪🇸' },
]

export type Bundle = Record<string, string>

// Bundle di default (demo) per la pagina pilota, condiviso da tutti i clienti come
// base. Gli override per-cliente ci si sovrappongono. Le chiavi seguono la
// convenzione `area.pagina.campo`.
const SEED: Partial<Record<Lang, Bundle>> = {
  it: {
    'op.anagraficheOspiti.title': 'Anagrafiche Ospiti',
    'op.anagraficheOspiti.subtitle': 'Organizza, aggiorna e controlla le anagrafiche dei clienti della struttura',
  },
  en: {
    'op.anagraficheOspiti.title': 'Guest Records',
    'op.anagraficheOspiti.subtitle': "Organize, update and manage your property's guest records",
  },
  de: {
    'op.anagraficheOspiti.title': 'Gästestammdaten',
    'op.anagraficheOspiti.subtitle': 'Organisieren, aktualisieren und verwalten Sie die Gästedaten Ihrer Unterkunft',
  },
}

/** override[clientKey][lang][key] = testo */
type Overrides = Record<string, Partial<Record<Lang, Bundle>>>

interface CopyState {
  /** Lingua attualmente mostrata dal clone/app. */
  lang: Lang
  /** Modalità editor (editing in-contesto nel clone della Console). */
  editMode: boolean
  /** Override per cliente/lingua/chiave (modifiche dell'assistenza). */
  overrides: Overrides

  setLang: (l: Lang) => void
  setEditMode: (v: boolean) => void
  toggleEdit: () => void
  /** Scrive/aggiorna il testo di una chiave, per un cliente e una lingua. */
  setEntry: (clientKey: string, lang: Lang, key: string, text: string) => void
  /** Rimuove l'override (torna a SEED/fallback). */
  resetEntry: (clientKey: string, lang: Lang, key: string) => void
  /** Sostituisce in blocco il bundle di un cliente/lingua. */
  mergeBundle: (clientKey: string, lang: Lang, bundle: Bundle) => void
}

export const useCopyStore = create<CopyState>()(
  persist(
    (set) => ({
      lang: SOURCE_LANG,
      editMode: false,
      overrides: {},

      setLang: (l) => set({ lang: l }),
      setEditMode: (v) => set({ editMode: v }),
      toggleEdit: () => set((s) => ({ editMode: !s.editMode })),
      setEntry: (clientKey, lang, key, text) =>
        set((s) => {
          const client = s.overrides[clientKey] ?? {}
          const bundle = client[lang] ?? {}
          return { overrides: { ...s.overrides, [clientKey]: { ...client, [lang]: { ...bundle, [key]: text } } } }
        }),
      resetEntry: (clientKey, lang, key) =>
        set((s) => {
          const client = s.overrides[clientKey] ?? {}
          const bundle = { ...(client[lang] ?? {}) }
          delete bundle[key]
          return { overrides: { ...s.overrides, [clientKey]: { ...client, [lang]: bundle } } }
        }),
      mergeBundle: (clientKey, lang, bundle) =>
        set((s) => {
          const client = s.overrides[clientKey] ?? {}
          return { overrides: { ...s.overrides, [clientKey]: { ...client, [lang]: { ...(client[lang] ?? {}), ...bundle } } } }
        }),
    }),
    {
      name: 'sibylla.copy',
      version: 1,
      // `editMode` è transitorio: non persiste.
      partialize: (s) => ({ lang: s.lang, overrides: s.overrides }),
    },
  ),
)

/** Risoluzione pura di una chiave dato cliente, lingua e override correnti. */
export function resolveCopy(
  overrides: Overrides,
  clientKey: string,
  lang: Lang,
  key: string,
  fallback?: string,
): string {
  const client = overrides[clientKey]
  return (
    client?.[lang]?.[key] ??
    client?.[SOURCE_LANG]?.[key] ??
    SEED[lang]?.[key] ??
    SEED[SOURCE_LANG]?.[key] ??
    fallback ??
    key
  )
}
