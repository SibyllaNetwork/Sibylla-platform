// ─── MOTION (kit Configuratore) ──────────────────────────────────────────────
//  Le animazioni del kit (transizioni tra pane, indicatore che scorre, save
//  bar) sono disattivate quando l'utente chiede meno movimento: le regole CSS
//  stanno sotto `@media (prefers-reduced-motion: no-preference)`, e i timing
//  JS (skeleton di transizione) si azzerano con questo helper.

export function cfgPrefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
