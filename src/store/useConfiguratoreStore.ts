// ─────────────────────────────────────────────────────────────────────────────
//  Store della sezione Configuratore.
//
//  Due responsabilità:
//   1. COMPLETAMENTO per configuratore ('configured' | 'partial' | 'empty'):
//      alimenta i badge dell'hub/sidebar e la logica di gating (una voce con
//      `requires` è sbloccata solo quando il prerequisito è 'configured').
//   2. DIRTY STATE del pane corrente: numero di modifiche non salvate,
//      registrate dal pane (via CfgSaveBar / markDirty) e azzerate al
//      salvataggio o all'abbandono confermato. La shell chiede conferma prima
//      di cambiare voce con modifiche pendenti.
//
//  Il completamento è persistito (chiave «sibylla.configuratore»); il dirty
//  state è transitorio e non viene mai scritto in localStorage.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  configuratoreById,
  type ConfiguratoreDef,
  type ConfiguratoreId,
} from '../modules/impostazioni/Configuratore/registry'

export type CfgCompletion = 'configured' | 'partial' | 'empty'

/** Stato mostrato da badge e pill: completamento + gating + costruzione. */
export type CfgDisplayStatus = CfgCompletion | 'locked' | 'soon'

// Fotografia iniziale di un profilo a metà configurazione: dà all'hub una
// progressione reale e mostra il gating (Stagionalità 'partial' → Overbooking
// limit e i due Listini risultano bloccati finché non è completata).
const SEED_COMPLETION: Partial<Record<ConfiguratoreId, CfgCompletion>> = {
  'camere-mapping':           'configured',
  'mapping-segmento-mercato': 'configured',
  'bar-fit':                  'configured',
  'bottom-rate':              'partial',
  'fasce-eta':                'configured',
  'stagionalita':             'partial',
  'scaglioni-occupazione':    'configured',
  'finestre-prenotazione':    'configured',
  'richieste-extra':          'partial',
  'buffer-presenze':          'configured',
  'vincolo-matriosca':        'configured',
  'arrangiamenti':            'partial',
  'lotti-mapping':            'empty',
  'market-specifics':         'configured',
  'politiche-prenotazione':   'partial',
  'voci-incasso':             'partial',
  'personalizza-struttura':   'configured',
  'fb-outlet':                'configured',
  'fb-sale-tavoli':           'configured',
  'fb-turni':                 'configured',
  'fb-categorie':             'configured',
  'fb-voci-menu':             'partial',
  'fb-tipi-menu':             'configured',
  'fb-web-menu':              'partial',
  'fb-allergeni':             'configured',
  'fb-stampanti':             'configured',
}

interface ConfiguratoreState {
  /** Completamento per id configuratore (assente = 'empty'). */
  completion: Record<string, CfgCompletion>
  setCompletion: (id: ConfiguratoreId, value: CfgCompletion) => void

  /** Pane con modifiche pendenti (null = nessuna modifica in sospeso). */
  dirtyPane: string | null
  /** Numero di modifiche non salvate nel pane corrente. */
  dirtyCount: number
  /** Registra le modifiche pendenti di un pane (count 0 ⇒ pulito). */
  markDirty: (paneId: string, count: number) => void
  /** Azzera il dirty state (dopo salvataggio o abbandono confermato). */
  resetDirty: () => void
}

export const useConfiguratoreStore = create<ConfiguratoreState>()(
  persist(
    (set) => ({
      completion: { ...SEED_COMPLETION } as Record<string, CfgCompletion>,
      setCompletion: (id, value) =>
        set(s => ({ completion: { ...s.completion, [id]: value } })),

      dirtyPane: null,
      dirtyCount: 0,
      markDirty: (paneId, count) =>
        set(count > 0 ? { dirtyPane: paneId, dirtyCount: count } : { dirtyPane: null, dirtyCount: 0 }),
      resetDirty: () => set({ dirtyPane: null, dirtyCount: 0 }),
    }),
    {
      name: 'sibylla.configuratore',
      version: 1,
      // Persistiamo solo il completamento: il dirty state è transitorio.
      partialize: (s) => ({ completion: s.completion }),
      migrate: () => ({ completion: { ...SEED_COMPLETION } as Record<string, CfgCompletion> }),
    },
  ),
)

// ─── Helper puri (usabili nei selector e fuori da React) ──────────────────────

/** Completamento di una voce (default 'empty'). */
export function completionOf(completion: Record<string, CfgCompletion>, id: string): CfgCompletion {
  return completion[id] ?? 'empty'
}

/**
 * True se la voce è sbloccata: senza `requires` è sempre accessibile, con
 * `requires` lo diventa solo quando il prerequisito risulta 'configured'.
 */
export function isUnlocked(completion: Record<string, CfgCompletion>, id: string): boolean {
  const def = configuratoreById(id)
  if (!def?.requires) return true
  return completionOf(completion, def.requires.id) === 'configured'
}

/** Stato da mostrare su badge e pill: gating e 'soon' prevalgono sul completamento. */
export function displayStatusOf(completion: Record<string, CfgCompletion>, id: string): CfgDisplayStatus {
  const def = configuratoreById(id)
  if (!def) return 'empty'
  if (def.status === 'soon') return 'soon'
  if (!isUnlocked(completion, id)) return 'locked'
  return completionOf(completion, id)
}

/**
 * Prossimo passo suggerito tra le voci date (per la CTA "Riprendi da…"):
 * la prima voce non 'configured', sbloccata e già costruita.
 */
export function nextStepAmong(
  completion: Record<string, CfgCompletion>,
  defs: ConfiguratoreDef[],
): ConfiguratoreDef | null {
  return defs.find(d =>
    d.status !== 'soon'
    && isUnlocked(completion, d.id)
    && completionOf(completion, d.id) !== 'configured',
  ) ?? null
}
