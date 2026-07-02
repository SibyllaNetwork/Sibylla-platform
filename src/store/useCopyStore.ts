import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─────────────────────────────────────────────────────────────────────────────
//  Copy store — testi della piattaforma editabili + multilingua.
//
//  Fase 1 (questo file): layer runtime FE. Ogni testo è una coppia `chiave → testo`
//  risolta da t(key, fallback). La catena di fallback garantisce che, in assenza di
//  override o di backend, la UI mostri esattamente il letterale italiano di oggi:
//
//      override[lang][key]  →  override['it'][key]  →  SEED[lang][key]
//        →  SEED['it'][key]  →  fallback (letterale nel .tsx)  →  key
//
//  Gli `override` sono le modifiche fatte dall'assistenza (mock del backend finché
//  `/Sibylla/copy/*` non è pronto: vedi src/services/copy.service.ts). Sono
//  persistiti in localStorage così le modifiche sopravvivono al reload.
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

// Bundle di esempio per la pagina pilota. Dimostra il meccanismo multilingua senza
// dipendere dal backend: quando arriverà `/Sibylla/copy/GetBundle` questi record
// verranno serviti da lì. Le chiavi seguono la convenzione `area.pagina.campo`.
type Bundle = Record<string, string>
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

interface CopyState {
  /** Lingua attualmente mostrata dal clone/app. */
  lang: Lang
  /** Modalità editor (editing in-contesto nel clone della Console). */
  editMode: boolean
  /** Override per lingua/chiave (modifiche dell'assistenza). */
  overrides: Partial<Record<Lang, Bundle>>

  setLang: (l: Lang) => void
  setEditMode: (v: boolean) => void
  toggleEdit: () => void
  /** Scrive/aggiorna il testo di una chiave in una lingua. */
  setEntry: (lang: Lang, key: string, text: string) => void
  /** Rimuove l'override (torna a SEED/fallback). */
  resetEntry: (lang: Lang, key: string) => void
  /** Sostituisce in blocco il bundle di una lingua (es. dopo GetBundle dal BE). */
  mergeBundle: (lang: Lang, bundle: Bundle) => void
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
      setEntry: (lang, key, text) =>
        set((s) => ({ overrides: { ...s.overrides, [lang]: { ...(s.overrides[lang] ?? {}), [key]: text } } })),
      resetEntry: (lang, key) =>
        set((s) => {
          const b = { ...(s.overrides[lang] ?? {}) }
          delete b[key]
          return { overrides: { ...s.overrides, [lang]: b } }
        }),
      mergeBundle: (lang, bundle) =>
        set((s) => ({ overrides: { ...s.overrides, [lang]: { ...(s.overrides[lang] ?? {}), ...bundle } } })),
    }),
    {
      name: 'sibylla.copy',
      version: 1,
      // `editMode` è transitorio: non persiste.
      partialize: (s) => ({ lang: s.lang, overrides: s.overrides }),
    },
  ),
)

/** Risoluzione pura di una chiave data la lingua e gli override correnti. */
export function resolveCopy(
  overrides: Partial<Record<Lang, Bundle>>,
  lang: Lang,
  key: string,
  fallback?: string,
): string {
  return (
    overrides[lang]?.[key] ??
    overrides[SOURCE_LANG]?.[key] ??
    SEED[lang]?.[key] ??
    SEED[SOURCE_LANG]?.[key] ??
    fallback ??
    key
  )
}
