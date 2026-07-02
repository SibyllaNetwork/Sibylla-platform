import { useCallback } from 'react'
import { useCopyStore, resolveCopy, type Lang } from '../../store/useCopyStore'

// ─────────────────────────────────────────────────────────────────────────────
//  Helper di traduzione runtime.
//
//  Uso nei componenti:
//      const t = useT()
//      <PageHeader title={t('op.anagraficheOspiti.title', 'Anagrafiche Ospiti')} />
//
//  Il secondo argomento è il letterale italiano di oggi: funge da fallback se la
//  chiave non è ancora tradotta o gestita dall'assistenza. Migrare una stringa a
//  t(...) NON ne cambia il rendering finché non viene tradotta → migrazione sicura
//  e incrementale, pagina per pagina.
// ─────────────────────────────────────────────────────────────────────────────

export type TFn = (key: string, fallback?: string) => string

/** Hook reattivo: si ri-renderizza al cambio di lingua o di override. */
export function useT(): TFn {
  const lang = useCopyStore((s) => s.lang)
  const overrides = useCopyStore((s) => s.overrides)
  return useCallback(
    (key: string, fallback?: string) => resolveCopy(overrides, lang, key, fallback),
    [overrides, lang],
  )
}

/** Lingua attualmente mostrata (hook). */
export function useLang(): Lang {
  return useCopyStore((s) => s.lang)
}
