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

// App Op! (modulo "app-op"): le stesse voci del gruppo AppOp! di Operation (Stato Camere, Segnalazioni, …), portate al
// primo livello prima di Impostazioni. Il nodo compare solo a chi ha il modulo e, in quel caso, il gruppo dentro
// Operation si nasconde per non avere due volte le stesse voci (vedi applyModuleLabels).
export const MENU_APP_OP = {
  id: 'app-op', label: 'App Op!', icon: 'op', modulo: 'app-op', children: [
    { id: 'stato-camere', label: 'Stato Camere', page: 'stato-camere' },
    { id: 'segnalazioni', label: 'Segnalazioni', page: 'segnalazioni' },
    { id: 'assegnazioni-incarichi', label: 'Assegnazioni incarichi', page: 'assegnazioni-incarichi' },
    { id: 'maintenance-analysis', label: 'Maintenance Analysis', page: 'maintenance-analysis' },
  ],
}

const BASE: any[] = mergeNodes(mergeNodes(MENU as any[], MENU_TO as any[]), MENU_RISTORANTI as any[])
const IMPOSTAZIONI = BASE.findIndex(n => n.id === 'impostazioni')
const MENU_FULL: any[] = IMPOSTAZIONI < 0
  ? [...BASE, MENU_APP_OP]
  : [...BASE.slice(0, IMPOSTAZIONI), MENU_APP_OP, ...BASE.slice(IMPOSTAZIONI)]

export default MENU_FULL
