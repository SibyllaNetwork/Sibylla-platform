import { useCallback } from 'react'
import { useCopyStore, resolveCopy, type Lang } from '../../store/useCopyStore'
import { useAccessStore } from '../../store/useAccessStore'
import { INTESTATARI_INIT } from '../../admin/SibyllaAdminPanel/constants'

// ─────────────────────────────────────────────────────────────────────────────
//  Helper di traduzione runtime — PER CLIENTE.
//
//  Uso nei componenti:
//      const t = useT()
//      <PageHeader title={t('op.anagraficheOspiti.title', 'Anagrafiche Ospiti')} />
//
//  Il secondo argomento è il letterale italiano di oggi: fallback se la chiave non
//  è ancora tradotta o gestita. Migrare una stringa a t(...) NON ne cambia il
//  rendering finché non viene tradotta → migrazione sicura e incrementale.
// ─────────────────────────────────────────────────────────────────────────────

export type TFn = (key: string, fallback?: string) => string

/**
 * Chiave del cliente corrente = intestatario del contratto.
 *  • In sessione di assistenza → l'intestatario impersonato.
 *  • Con un profilo loggato → l'intestatario che possiede la struttura del profilo.
 *  • Altrimenti → 'default'.
 * Così ciò che l'assistenza modifica impersonando un cliente coincide con ciò che
 * quel cliente vede da loggato.
 */
export function useCurrentClientKey(): string {
  const assist = useAccessStore((s) => s.assist)
  const currentProfileId = useAccessStore((s) => s.currentProfileId)
  const profiles = useAccessStore((s) => s.profiles)

  if (assist) return assist.intestatarioId
  if (currentProfileId) {
    const p = profiles.find((x) => x.id === currentProfileId)
    if (p) {
      const sid = Number(p.id.replace(/^p-/, ''))
      const int = INTESTATARI_INIT.find((i) => i.struttureIds.includes(sid))
      if (int) return int.id
    }
  }
  return 'default'
}

/** Hook reattivo: si ri-renderizza al cambio di lingua, cliente o override. */
export function useT(): TFn {
  const clientKey = useCurrentClientKey()
  const lang = useCopyStore((s) => s.lang)
  const overrides = useCopyStore((s) => s.overrides)
  return useCallback(
    (key: string, fallback?: string) => resolveCopy(overrides, clientKey, lang, key, fallback),
    [overrides, clientKey, lang],
  )
}

/** Lingua attualmente mostrata (hook). */
export function useLang(): Lang {
  return useCopyStore((s) => s.lang)
}
