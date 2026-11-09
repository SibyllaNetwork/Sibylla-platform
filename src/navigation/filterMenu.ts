// ─────────────────────────────────────────────────────────────────────────────
//  Filtra l'albero MENU mantenendo solo i nodi raggiungibili da un set di pagine
//  abilitate: una foglia resta se la sua `page` è abilitata; un gruppo resta se
//  almeno un discendente è abilitato (oppure se la sua pagina propria lo è).
// ─────────────────────────────────────────────────────────────────────────────
export function filterMenu(items: any[], allowed: Set<string>): any[] {
  const out: any[] = []
  for (const it of items) {
    const kids = it.children ? filterMenu(it.children, allowed) : []
    const selfOk = it.page ? allowed.has(it.page) : false
    if (selfOk || kids.length > 0) {
      out.push(it.children ? { ...it, children: kids } : it)
    }
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
//  Etichette differenziate per modulo. MENU_FULL fonde i nodi per `id` e tiene
//  la label del menu base: per le pagine condivise che cambiano nome in un certo
//  modulo (es. "cal-annuale" → "Pianificazione annuale" per il Tour Operator)
//  si rietichetta qui in base ai moduli dell'utente, così sidenav e ricerca
//  mostrano il nome corretto.
// ─────────────────────────────────────────────────────────────────────────────
const MENU_LABEL_OVERRIDES: Record<string, Record<string, string>> = {
  'cal-annuale': { 'tour-operator': 'Pianificazione annuale' },
}

export function applyModuleLabels(items: any[], moduli?: string[]): any[] {
  const mods = moduli ?? []
  // Voci legate a un modulo (`modulo`): solo a chi ce l'ha (es. il gruppo AppOp! di Operation col modulo App Op!).
  const visibile = (n: any) => !n.modulo || mods.includes(n.modulo)
  const relabel = (n: any): any => {
    let label = n.label
    const ov = n.page ? MENU_LABEL_OVERRIDES[n.page] : undefined
    if (ov) { const hit = mods.find(m => ov[m]); if (hit) label = ov[hit] }
    const children = n.children ? n.children.filter(visibile).map(relabel) : undefined
    if (children) return { ...n, label, children }
    return label !== n.label ? { ...n, label } : n
  }
  return items.filter(visibile).map(relabel)
}

// ─────────────────────────────────────────────────────────────────────────────
//  Food & Beverage stand alone: chi ha solo il modulo `food-beverage` vede Home,
//  Profilo e, al primo livello, i gruppi interni della sezione Food & Beverage
//  (Operativo, Economato, Struttura, Menu, Generali, Amministrazione) con le
//  loro voci. La Dashboard F&B è la Home, quindi non si ripete nel menu.
// ─────────────────────────────────────────────────────────────────────────────
const ICONE_FB_STANDALONE: Record<string, string> = {
  'fb-operativo': 'concierge-bell',
  'fb-economato': 'warehouse',
  'fb-struttura': 'building',
  'fb-menu': 'book',
  'fb-generali': 'sliders',
  'fb-amministrazione': 'user-shield',
}

const trova = (items: any[], id: string): any | undefined => {
  for (const n of items) {
    if (n.id === id) return n
    const hit = n.children ? trova(n.children, id) : undefined
    if (hit) return hit
  }
  return undefined
}

export const isFbStandalone = (moduli?: string[]) => !!moduli && moduli.length === 1 && moduli[0] === 'food-beverage'

/** Moduli di sola ristorazione: chi ha solo questi è un ristorante separato dall'hotel. */
export const MODULI_RISTORAZIONE = ['food-beverage', 'ristorazione']

/**
 * Utenza di sola ristorazione (es. Elena Russo, Marco Bruno): niente addebiti in camera, numeri di camera, clienti
 * hotel né wallet Sibylla. Con anche una Struttura ricettiva (o Full) i riferimenti tornano.
 */
export const isSoloRistorazione = (moduli?: string[]) =>
  !!moduli && moduli.length > 0 && moduli.every(m => MODULI_RISTORAZIONE.includes(m))

/** Pagine legate all'hotel o al wallet, nascoste alle utenze di sola ristorazione. */
export const PAGINE_HOTEL_WALLET = ['fb-mobile-wallet', 'fb-wallet-clienti']

/** Toglie dal menu le pagine wallet per le utenze di sola ristorazione. */
export function applySoloRistorazione(items: any[], moduli?: string[]): any[] {
  if (!isSoloRistorazione(moduli)) return items
  return filterMenu(items, new Set(raccogliPagine(items).filter(p => !PAGINE_HOTEL_WALLET.includes(p))))
}

const raccogliPagine = (items: any[]): string[] =>
  items.flatMap(n => [...(n.page ? [n.page] : []), ...(n.children ? raccogliPagine(n.children) : [])])

export function applyStandalone(items: any[], moduli?: string[]): any[] {
  if (!isFbStandalone(moduli)) return items
  const fb = trova(items, 'food-beverage')
  const gruppi = (fb?.children ?? [])
    .filter((n: any) => n.children?.length)
    .map((n: any) => ({ ...n, icon: ICONE_FB_STANDALONE[n.id] ?? 'utensils' }))
  // Profilo senza il gruppo "Gestisci organizzazione": le sue voci (l'Organigramma) salgono direttamente sotto Profilo.
  const profilo = items.find(n => n.id === 'profilo')
  const profiloPiatto = profilo && {
    ...profilo,
    children: (profilo.children ?? []).flatMap((c: any) => (c.id === 'gestisci-org' ? c.children ?? [] : [c])),
  }
  return [
    ...items.filter(n => n.id === 'home'),
    ...(profiloPiatto ? [profiloPiatto] : []),
    ...gruppi,
  ]
}
