import MENU from './menu'
import T from '../core/tokens'

export function findByPage(items: any[], pageId: string): any {
  for (const item of items) {
    if (item.page === pageId) return item
    if (item.children) { const f = findByPage(item.children, pageId); if (f) return f }
  }
  return null
}

export function buildCrumbs(items: any[], pageId: string, path: any[] = []): any[] | null {
  for (const item of items) {
    const next = [...path, item]
    if (item.page === pageId || item.id === pageId) return next
    if (item.children) { const f = buildCrumbs(item.children, pageId, next); if (f) return f }
  }
  return null
}

export function getModuleColor(crumbs: any[]): string {
  const imp = crumbs?.find((c: any) => c.id === 'impresa')
  if (!imp) return T.blue
  return crumbs[crumbs.indexOf(imp) + 1]?.color || T.blue
}

export function filterMenuByPages(menu: any[], allowedLinks: string[]): any[] {
  const alwaysVisible = ['home']
  return menu.reduce((acc: any[], item: any) => {
    if (alwaysVisible.includes(item.id)) {
      acc.push(item)
    } else if (item.page) {
      if (allowedLinks.includes(item.page)) acc.push(item)
    } else if (item.children) {
      const filtered = filterMenuByPages(item.children, allowedLinks)
      if (filtered.length > 0) acc.push({ ...item, children: filtered })
    }
    return acc
  }, [])
}

// ── Ricerca nel menu ──────────────────────────────────────────────────────────
export interface SearchResult {
  page:  string
  label: string
  path:  string[]   // breadcrumb testuale (es. ["Impresa", "Sales", "Pricing"])
  color: string     // colore del modulo
}

function walkMenu(
  items: any[],
  ancestors: any[],
  results: SearchResult[]
): void {
  for (const item of items) {
    const path = [...ancestors, item]
    if (item.page) {
      // Ricavare colore modulo (depth 2 sotto "impresa")
      const impIdx = path.findIndex(n => n.id === 'impresa')
      const color  = impIdx >= 0 ? path[impIdx + 1]?.color ?? T.blue : T.blue
      results.push({
        page:  item.page,
        label: item.label,
        // Mostra solo i nodi significativi (esclude root e "impresa")
        path:  path
          .filter(n => n.id !== 'impresa' && n.page !== 'home')
          .map(n => n.label)
          .slice(0, -1),  // escludi l'item stesso (già in label)
        color,
      })
    }
    if (item.children) walkMenu(item.children, path, results)
  }
}

let _allResults: SearchResult[] | null = null

function getAllResults(): SearchResult[] {
  if (!_allResults) {
    _allResults = []
    walkMenu(MENU, [], _allResults)
  }
  return _allResults
}

export function searchMenu(query: string): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase().trim()
  return getAllResults().filter(r =>
    r.label.toLowerCase().includes(q) ||
    r.path.some(p => p.toLowerCase().includes(q))
  ).slice(0, 8)  // max 8 risultati
}

// ── Parent map per pagine interne (non presenti nel menu sidebar) ────────────
// Quando si naviga a una di queste pagine tramite link interno,
// la sidebar evidenzia la pagina madre.
const PARENT_MAP: Record<string, string> = {
  'nuova-prenotazione':   'tableau-book',
  'calendario-tariffe':   'tariffe-disp',
  'foresight-revenue':    'tariffe-disp',
  'configura-notifiche':  'centro-notifiche',
  'prenotazioni-ids':     'tariffe-disp',
  'analisi-dist-sales':   'analisi-dist-exec',
}

export function resolveActivePage(pageId: string): string {
  const found = findByPage(MENU, pageId)
  if (found) return pageId
  return PARENT_MAP[pageId] || pageId
}
