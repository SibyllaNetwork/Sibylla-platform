import { create } from 'zustand'

// ─────────────────────────────────────────────────────────────────────────────
//  Payload di navigazione per il flusso di checkout/emissione documenti.
//  Router state-based (no URL params) → passiamo i dati via store transitorio.
//
//  ContiCamera → "Paga ora" → EmissioneDocumenti:   `checkout`
//  EmissioneDocumenti → "Emetti documento" (Fattura) → FatturaDocumento: `fattura`
//
//  Non persistito: è un passaggio di navigazione, non uno stato durevole.
// ─────────────────────────────────────────────────────────────────────────────

export interface EmAddebito {
  id: number
  camera: string
  data: string
  riferimento: string
  descrizione: string
  prezzo: number
  iva: number
}

export interface CheckoutPayload {
  addebiti: EmAddebito[]
  caparra: number
}

export interface FatturaData {
  numero: string
  data: string
  struttura: string
  ragioneSociale: string
  indirizzo: string
  cap: string
  citta: string
  provincia: string
  nazionalita: string
  partitaIva: string
  codiceFiscale: string
  codiceUnivoco: string
  pec: string
  addebiti: EmAddebito[]
  caparra: number
  modoPagamento: string
  importo: string
}

interface EmissioneState {
  /** Addebiti selezionati da ContiCamera per l'emissione. null = arrivo diretto. */
  checkout: CheckoutPayload | null
  /** Dati della fattura emessa, per la pagina documento. */
  fattura: FatturaData | null

  setCheckout: (p: CheckoutPayload) => void
  clearCheckout: () => void
  setFattura: (f: FatturaData) => void
  clearFattura: () => void
}

export const useEmissioneStore = create<EmissioneState>((set) => ({
  checkout: null,
  fattura: null,
  setCheckout: (p) => set({ checkout: p }),
  clearCheckout: () => set({ checkout: null }),
  setFattura: (f) => set({ fattura: f }),
  clearFattura: () => set({ fattura: null }),
}))
