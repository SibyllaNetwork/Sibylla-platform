/**
 * Client per la gestione del copy multilingua verso il backend di dominio,
 * inoltrato dal catch-all proxy `/Sibylla/copy/*`.
 *
 * Contratto atteso (da implementare in Portal/SibyllaApi/ — vedi
 * docs/copy-editabile-multilingua.md §"Contratto API"):
 *
 *   POST /Sibylla/copy/GetBundle      { lang }                  → { [key]: text }
 *   POST /Sibylla/copy/SaveEntry      { lang, key, text, publish } → CopyEntryDto
 *   POST /Sibylla/copy/Translate      { key, fromLang, toLangs } → { [lang]: text }
 *
 * Tutte le funzioni sono FALLBACK-FIRST: se il backend non è disponibile
 * ritornano un valore neutro (bundle vuoto / echo del testo) così il layer FE
 * (useCopyStore + SEED) continua a funzionare in locale. Nessuna eccezione
 * propagata al chiamante per il solo fatto che il BE non c'è ancora.
 */
import { apiFetchSibylla } from './api'
import type { Lang } from '../store/useCopyStore'

export interface CopyEntryDto {
  key: string
  lang: Lang
  text: string
  status: 'draft' | 'published'
  version: number
  updatedBy?: string
  updatedAt?: string
}

type Bundle = Record<string, string>

/** Scarica il bundle pubblicato di una lingua. Bundle vuoto se il BE non risponde. */
export async function getBundle(lang: Lang): Promise<Bundle> {
  try {
    const data = await apiFetchSibylla<Bundle>('copy/GetBundle', { method: 'POST', body: { lang } })
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

/** Salva (draft o published) il testo di una chiave in una lingua. */
export async function saveEntry(
  lang: Lang,
  key: string,
  text: string,
  publish = true,
): Promise<CopyEntryDto | null> {
  try {
    return await apiFetchSibylla<CopyEntryDto>('copy/SaveEntry', {
      method: 'POST',
      body: { lang, key, text, publish },
    })
  } catch {
    return null
  }
}

/**
 * Richiede la traduzione automatica di una chiave dalla lingua sorgente verso più
 * lingue target. La traduzione avviene lato backend (motore gratuito Azure
 * Translator F0 / LibreTranslate self-hosted, con glossario). Echo del testo
 * sorgente se il BE non risponde.
 */
export async function translateEntry(
  key: string,
  fromLang: Lang,
  toLangs: Lang[],
): Promise<Partial<Record<Lang, string>>> {
  try {
    const data = await apiFetchSibylla<Partial<Record<Lang, string>>>('copy/Translate', {
      method: 'POST',
      body: { key, fromLang, toLangs },
    })
    return data ?? {}
  } catch {
    return {}
  }
}
