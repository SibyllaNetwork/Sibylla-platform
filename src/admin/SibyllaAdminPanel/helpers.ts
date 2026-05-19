import T from '../../core/tokens'
import type { FnType } from './types'

export function getAllPages(items: any[]): string[] {
  const r: string[] = []
  for (const it of items) {
    if (it.page) r.push(it.page)
    if (it.children) r.push(...getAllPages(it.children))
  }
  return r
}

export const FN_OPTIONS: { val: FnType; label: string; icon: string; color: string }[] = [
  { val: 'completo', label: 'Controllo completo', icon: 'check', color: T.success },
  { val: 'lettura',  label: 'Sola lettura',       icon: 'bar',   color: T.blue },
  { val: 'nascosta', label: 'Pagina non visibile', icon: 'x',    color: T.textDisabled },
]
