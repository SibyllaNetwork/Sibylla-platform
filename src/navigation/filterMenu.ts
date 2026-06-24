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
  if (!moduli || moduli.length === 0) return items
  const relabel = (n: any): any => {
    let label = n.label
    const ov = n.page ? MENU_LABEL_OVERRIDES[n.page] : undefined
    if (ov) { const hit = moduli.find(m => ov[m]); if (hit) label = ov[hit] }
    const children = n.children ? n.children.map(relabel) : undefined
    if (children) return { ...n, label, children }
    return label !== n.label ? { ...n, label } : n
  }
  return items.map(relabel)
}
