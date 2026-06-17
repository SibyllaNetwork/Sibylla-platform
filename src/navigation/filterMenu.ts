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
