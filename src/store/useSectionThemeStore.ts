import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Tema per sezione (Platform / Tableau / Agorà) ────────────────────────────
//  La piattaforma raccoglie tre prodotti che prima erano separati e avevano una
//  propria palette. UI/UX identiche, cambia solo il "main color" in base alla
//  pagina. I colori sono ISTITUZIONALI e non modificabili. L'operatore può
//  scegliere la modalità:
//    • unificata   → un unico colore (Platform) su tutta la piattaforma;
//    • dissociata  → ogni prodotto usa il proprio colore istituzionale, applicato
//                    anche a sidenav e header (oltre al contenuto).

export type Sezione = 'platform' | 'tableau' | 'agora'

export const SEZIONE_LABEL: Record<Sezione, string> = {
  platform: 'Platform',
  tableau: 'Tableau',
  agora: 'Agorà',
}

// Colori istituzionali dei tre prodotti (fissi, non personalizzabili).
export const SECTION_COLORS: Record<Sezione, string> = {
  platform: '#204769',
  tableau: '#206953',
  agora: '#708090',
}

// Pagine assegnate a Tableau (il resto, tranne Agorà, è Platform).
const TABLEAU_PAGES = new Set<string>([
  'live-display',
  'tableau-book',
  'open-board',
  'richieste-operative',
  'giornale-impresa',
  'crea-pratica',
  'monitoraggio-pratiche',
  'action-centre',
  'efficienza-operativa',
  'imposta-dist',
  'cal-annuale',
  'value-analysis',
  'executive-overview',
  'analisi-dist-sales',
  'analisi-dist-exec',
  'market-lens',
  // Pagina esclusiva del catalogo tour operator
  'le-mie-destinazioni',
])

// Pagine Agorà non prefissate con "agora" (le agora-* sono già incluse).
const AGORA_PAGES = new Set<string>([
  'crea-acquisto',
  'acquisti-rete',
  'matchzone',
  'gestione-annunci',
])

/**
 * Sezione (prodotto) a cui appartiene una pagina.
 *
 * Alcune pagine sono CONDIVISE tra moduli diversi (es. "Giornale impresa" esiste
 * sia per le aziende col modulo Tour Operator sia per gli hotel). Le pagine verdi
 * (Tableau) appartengono al mondo Tour Operator: in modalità dissociata restano
 * verdi solo se l'utente ha il modulo `tour-operator`; per tutti gli altri moduli
 * la stessa pagina è blu Platform. Passa `moduli` (i moduli sottoscritti dal
 * profilo/assist) per applicare la regola; se omesso (nessun contratto caricato)
 * si usa la sezione istituzionale della pagina.
 */
export function sectionForPage(page: string, moduli?: string[]): Sezione {
  // Le pagine con parametri usano "id:param" → considera l'id.
  const base = page.includes(':') ? page.slice(0, page.indexOf(':')) : page
  if (TABLEAU_PAGES.has(base)) {
    if (moduli && !moduli.includes('tour-operator')) return 'platform'
    return 'tableau'
  }
  if (base.startsWith('agora') || AGORA_PAGES.has(base)) return 'agora'
  return 'platform'
}

interface SectionThemeState {
  /** true = modalità dissociata (ogni prodotto col suo colore istituzionale). */
  dissociato: boolean
  setDissociato: (v: boolean) => void
}

export const useSectionThemeStore = create<SectionThemeState>()(
  persist(
    (set) => ({
      dissociato: false,
      setDissociato: (dissociato) => set({ dissociato }),
    }),
    { name: 'sibylla.section-theme', version: 2 },
  ),
)
