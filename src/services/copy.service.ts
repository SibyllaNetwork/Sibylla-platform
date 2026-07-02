/**
 * Traduzione automatica del copy — helper OPZIONALE e STATELESS.
 *
 * IMPORTANTE: la persistenza del copy è interamente client-side (useCopyStore →
 * localStorage), per cliente. Non c'è database né storage esterno. Questo file NON
 * salva nulla: si limita, quando disponibile, a chiedere una traduzione.
 *
 * La traduzione (Azure Translator F0 gratuito / LibreTranslate) è un servizio
 * stateless — non è storage. Se il backend che la espone non c'è, la funzione
 * ritorna un risultato vuoto e l'assistenza digita le traduzioni a mano nel clone:
 * nessuna dipendenza dura.
 *
 * Contratto (se/quando esposto dal proxy):
 *   POST /Sibylla/copy/Translate  { text, fromLang, toLangs } → { [lang]: text }
 */
import { apiFetchSibylla } from './api'
import type { Lang } from '../store/useCopyStore'

/**
 * Traduce un testo dalla lingua sorgente verso più lingue target.
 * Ritorna `{}` se il servizio non è disponibile (fallback: inserimento manuale).
 */
export async function translateText(
  text: string,
  fromLang: Lang,
  toLangs: Lang[],
): Promise<Partial<Record<Lang, string>>> {
  if (!text.trim() || toLangs.length === 0) return {}
  try {
    const data = await apiFetchSibylla<Partial<Record<Lang, string>>>('copy/Translate', {
      method: 'POST',
      body: { text, fromLang, toLangs },
    })
    return data ?? {}
  } catch {
    return {}
  }
}
