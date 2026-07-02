import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import copyJson from '../locales/copy.json'

// ─────────────────────────────────────────────────────────────────────────────
//  Copy store — testi della piattaforma editabili + multilingua, PER CLIENTE.
//
//  Modello di persistenza (scelto): JSON STATICI NEL REPO + DEPLOY.
//    • Niente database, niente storage esterni, niente backend di persistenza.
//    • Il source of truth condiviso è src/locales/copy.json: versionato nel repo,
//      bundlato con l'app → una modifica committata si propaga a TUTTI gli utenti
//      al rilascio.
//    • L'editor-nel-clone (Console assistenza) NON scrive nel repo a runtime: le
//      modifiche vivono in `overrides` (localStorage) come BOZZA locale, e vengono
//      poi ESPORTATE (serializeForCommit) → commit → deploy per la pubblicazione.
//
//  Struttura di copy.json:  { [clientKey]: { [lang]: { [key]: text } } }
//    - "default" = testi base condivisi da tutti i clienti.
//    - "int-gar", … = override per singolo intestatario/cliente.
//
//  Catena di risoluzione di t(key, fallback):
//    draft[client][lang]  → draft[client][it]
//      → repo[client][lang] → repo[client][it]
//      → repo[default][lang] → repo[default][it]
//      → fallback (letterale nel .tsx) → key
//
//  `client` è la chiave dell'intestatario (es. 'int-gar'); vedi useCurrentClientKey
//  in src/core/i18n/copy.ts.
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
/** override[clientKey][lang][key] = testo */
export type Overrides = Record<string, Partial<Record<Lang, Bundle>>>

const DEFAULT_CLIENT = 'default'

// Testi committati nel repo (source of truth propagato via deploy).
const REPO = copyJson as Overrides

interface CopyState {
  /** Lingua attualmente mostrata dal clone/app. */
  lang: Lang
  /** Modalità editor (editing in-contesto nel clone della Console). */
  editMode: boolean
  /** Bozze per cliente/lingua/chiave (modifiche non ancora committate). */
  overrides: Overrides

  setLang: (l: Lang) => void
  setEditMode: (v: boolean) => void
  toggleEdit: () => void
  /** Scrive/aggiorna la bozza di una chiave, per un cliente e una lingua. */
  setEntry: (clientKey: string, lang: Lang, key: string, text: string) => void
  /** Rimuove la bozza (torna al testo del repo). */
  resetEntry: (clientKey: string, lang: Lang, key: string) => void
  /** Sostituisce in blocco la bozza di un cliente/lingua. */
  mergeBundle: (clientKey: string, lang: Lang, bundle: Bundle) => void
  /** Svuota le bozze (es. dopo aver esportato e deployato). */
  clearDrafts: (clientKey?: string) => void
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
      clearDrafts: (clientKey) =>
        set((s) => {
          if (!clientKey) return { overrides: {} }
          const next = { ...s.overrides }
          delete next[clientKey]
          return { overrides: next }
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

/**
 * Elenco delle chiavi editabili = registro. La sezione `default` di copy.json fa
 * da registro: una stringa diventa editabile dall'assistenza quando la sua chiave
 * è presente lì (in una qualsiasi lingua). Migrare una pagina = t('chiave','IT') nel
 * .tsx + aggiungere la chiave a default in copy.json.
 */
export function copyKeys(): string[] {
  const base = REPO[DEFAULT_CLIENT] ?? {}
  const set = new Set<string>()
  for (const lang of Object.keys(base) as Lang[]) Object.keys(base[lang] ?? {}).forEach((k) => set.add(k))
  return Array.from(set).sort()
}

/** Numero di bozze (chiavi modificate) per un cliente, su tutte le lingue. */
export function draftCount(overrides: Overrides, clientKey: string): number {
  const client = overrides[clientKey]
  if (!client) return 0
  let n = 0
  for (const lang of Object.keys(client) as Lang[]) n += Object.keys(client[lang] ?? {}).length
  return n
}

/** Risoluzione pura di una chiave dato cliente, lingua, bozze e repo. */
export function resolveCopy(
  overrides: Overrides,
  clientKey: string,
  lang: Lang,
  key: string,
  fallback?: string,
): string {
  const draft = overrides[clientKey]
  const repoClient = REPO[clientKey]
  const repoDefault = REPO[DEFAULT_CLIENT]
  return (
    draft?.[lang]?.[key] ??
    draft?.[SOURCE_LANG]?.[key] ??
    repoClient?.[lang]?.[key] ??
    repoClient?.[SOURCE_LANG]?.[key] ??
    repoDefault?.[lang]?.[key] ??
    repoDefault?.[SOURCE_LANG]?.[key] ??
    fallback ??
    key
  )
}

/**
 * Produce il contenuto JSON pronto da committare in src/locales/copy.json,
 * fondendo il repo attuale con le bozze locali. È l'artefatto che l'assistenza
 * esporta e che un dev committa → deploy → pubblicazione a tutti gli utenti.
 */
export function serializeForCommit(overrides: Overrides): string {
  const merged: Overrides = JSON.parse(JSON.stringify(REPO))
  for (const client of Object.keys(overrides)) {
    merged[client] = merged[client] ?? {}
    for (const lang of Object.keys(overrides[client]) as Lang[]) {
      merged[client][lang] = { ...(merged[client][lang] ?? {}), ...(overrides[client][lang] ?? {}) }
    }
  }
  return JSON.stringify(merged, null, 2) + '\n'
}
