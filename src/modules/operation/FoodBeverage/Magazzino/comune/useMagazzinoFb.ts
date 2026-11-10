// ─── Magazzino ristorazione: contesto condiviso dalle pagine ─────────────────
//  § B4 della scheda 17: all'apertura si legge `contesto`; 404 { collegata:
//  false } → riquadro "non ancora attivo", altro errore → "non raggiungibile"
//  con Riprova. Il contesto (strutture, punti, categorie, fornitori, permessi)
//  resta in memoria per la sessione: è di Op, qui non si salva nulla.

import { create } from 'zustand'
import { magazzinoFbOp, messaggioErrore } from '../api/magazzinoFbOp'
import type { Contesto } from '../api/tipi'

export type StatoMagazzino = 'iniziale' | 'caricamento' | 'pronto' | 'non-collegata' | 'errore'

interface MagazzinoFbState {
  stato: StatoMagazzino
  errore: string | null
  contesto: Contesto | null
  idStruttura: number | null
  /** Chiave della struttura di Platform per cui è stato letto il contesto (cambia struttura in alto → si rilegge). */
  chiave: string | null
  /** `idPlatform`: struttura selezionata in alto, per preselezionare quella di Op corrispondente. */
  carica: (chiave: string, forza?: boolean, idPlatform?: number | null) => Promise<void>
  /** Rilegge il contesto dopo una modifica di punti, categorie o fornitori, senza riquadro di caricamento. */
  aggiorna: () => Promise<void>
  setStruttura: (id: number) => void
  /** Da Giacenze: la pagina Movimenti apre subito "Nuovo movimento". */
  apriNuovoMovimento: boolean
  setApriNuovoMovimento: (v: boolean) => void
  /** Da Movimenti (scarico di una comanda): la pagina Ricette apre la ricetta di questa voce. */
  ricettaDaAprire: string | null
  setRicettaDaAprire: (voce: string | null) => void
  /** Da Riordino: la pagina Ordini apre questo ordine appena creato. */
  ordineDaAprire: number | null
  setOrdineDaAprire: (id: number | null) => void
  /** Da Ordini ("Registra l'arrivo"): Ricevi merce parte collegata a questo ordine. */
  ordineDaRicevere: { id: number; id_fornitore: number } | null
  setOrdineDaRicevere: (o: { id: number; id_fornitore: number } | null) => void
}

export const useMagazzinoFb = create<MagazzinoFbState>((set, get) => ({
  stato: 'iniziale',
  errore: null,
  contesto: null,
  idStruttura: null,
  chiave: null,

  carica: async (chiave, forza = false, idPlatform = null) => {
    const s = get()
    if (!forza && s.chiave === chiave && (s.stato === 'pronto' || s.stato === 'caricamento')) return
    set({ stato: 'caricamento', errore: null, chiave })
    try {
      const c = await magazzinoFbOp('contesto', {})
      if (get().chiave !== chiave) return
      if (c === null) { set({ stato: 'non-collegata', contesto: null }); return }
      // Prima la struttura di Op collegata a quella scelta in alto, poi quella di prima, poi la prima.
      const collegata = idPlatform != null ? c.strutture.find(x => x.id_struttura_platform === idPlatform)?.id : undefined
      const id = collegata ?? (c.strutture.some(x => x.id === s.idStruttura) ? s.idStruttura : c.strutture[0]?.id ?? null)
      set({ stato: 'pronto', contesto: c, idStruttura: id })
    } catch (e) {
      if (get().chiave !== chiave) return
      set({ stato: 'errore', errore: messaggioErrore(e) })
    }
  },

  aggiorna: async () => {
    try {
      const c = await magazzinoFbOp('contesto', {})
      if (c) set({ contesto: c })
    } catch {
      // Resta il contesto di prima: la pagina ha già mostrato l'esito dell'azione.
    }
  },

  setStruttura: id => set({ idStruttura: id }),
  apriNuovoMovimento: false,
  setApriNuovoMovimento: v => set({ apriNuovoMovimento: v }),
  ricettaDaAprire: null,
  setRicettaDaAprire: voce => set({ ricettaDaAprire: voce }),
  ordineDaAprire: null,
  setOrdineDaAprire: id => set({ ordineDaAprire: id }),
  ordineDaRicevere: null,
  setOrdineDaRicevere: o => set({ ordineDaRicevere: o }),
}))
