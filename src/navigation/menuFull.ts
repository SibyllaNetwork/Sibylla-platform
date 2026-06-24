// ─── MENU FULL (superset di tutti i moduli) ───────────────────────────────────
// Struttura COMUNE filtrata: la piattaforma mostra sempre questo menu, filtrato
// alle pagine dei moduli sottoscritti dalla struttura. Quando una struttura ha
// più moduli, l'unione è incrementale e SENZA pagine duplicate.
//
// Costruzione: unione per `id` dei tre menu (Struttura ricettiva → Tour Operator
// → Ristorazione). La dedup avviene SOLO a parità di pagina E percorso (stesso id
// sotto lo stesso genitore): una pagina presente in percorsi diversi viene
// mantenuta in entrambi (es. "Inserisci contratto" sotto vendita e acquisto).
import MENU from './menu'
import MENU_TO from './menuTourOperator'
import MENU_RISTORANTI from './menuRistoranti'

// Unione per id: ordine base dal primo albero, voci nuove accodate; i nodi con
// stesso id vengono fusi ricorsivamente sui figli (nessun id duplicato).
function mergeNodes(primary: any[], extra: any[]): any[] {
  const out: any[] = primary.map((n) => ({ ...n, children: n.children ? [...n.children] : undefined }))
  const idx = new Map<string, number>()
  out.forEach((n, i) => { if (n.id != null) idx.set(n.id, i) })
  for (const n of extra) {
    const i = n.id != null ? idx.get(n.id) : undefined
    if (i !== undefined) {
      if (n.children) out[i] = { ...out[i], children: mergeNodes(out[i].children || [], n.children) }
    } else {
      out.push({ ...n, children: n.children ? [...n.children] : undefined })
      if (n.id != null) idx.set(n.id, out.length - 1)
    }
  }
  return out
}

const MENU_FULL: any[] = mergeNodes(mergeNodes(MENU as any[], MENU_TO as any[]), MENU_RISTORANTI as any[])

export default MENU_FULL
