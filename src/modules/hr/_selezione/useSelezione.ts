import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Selezione multipla delle righe di una tabella HR (richieste, note spese).
 * `visibili` = id della pagina corrente (per "seleziona tutte"); `reset` = valori
 * che, cambiando (filtri, vista), azzerano la selezione.
 */
export function useSelezione(visibili: string[], reset: unknown[]) {
  const [sel, setSel] = useState<Set<string>>(new Set())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSel(new Set()) }, reset)

  const toggle = useCallback((id: string) => setSel(s => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  }), [])
  const tutteVisibili = visibili.length > 0 && visibili.every(id => sel.has(id))
  const qualcheVisibile = visibili.some(id => sel.has(id))
  const toggleVisibili = () => setSel(s => {
    const n = new Set(s)
    if (tutteVisibili) visibili.forEach(id => n.delete(id)); else visibili.forEach(id => n.add(id))
    return n
  })
  const svuota = useCallback(() => setSel(new Set()), [])
  /** Toglie dalla selezione gli id che non esistono più (es. dopo un'eliminazione). */
  const tieni = useCallback((esistenti: string[]) => setSel(s => {
    const ok = new Set(esistenti)
    const n = new Set(Array.from(s).filter(id => ok.has(id)))
    return n.size === s.size ? s : n
  }), [])

  return useMemo(() => ({
    sel, n: sel.size, has: (id: string) => sel.has(id), toggle, svuota, tieni,
    tutteVisibili, parziale: qualcheVisibile && !tutteVisibili, toggleVisibili,
  }), [sel, toggle, svuota, tieni, tutteVisibili, qualcheVisibile, toggleVisibili])
}
