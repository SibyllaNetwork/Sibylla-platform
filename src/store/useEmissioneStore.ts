import { create } from 'zustand'

// ─────────────────────────────────────────────────────────────────────────────
//  Payload di navigazione per il flusso di checkout/emissione documenti.
//  Router state-based (no URL params) → passiamo i dati via store transitorio.
//
//  ContiCamera → "Paga ora" → EmissioneDocumenti:   `checkout`
//  EmissioneDocumenti → "Emetti documento" → pagina documento (per tipo): `documento`
//    - Scontrino → 'scontrino-documento'
//    - Caparra   → 'ricevuta-caparra'
//    - Fattura   → 'fattura-documento'
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

export type TipoDocumento = 'Scontrino' | 'Caparra' | 'Fattura'

/** Dati del documento emesso, condivisi da tutte le pagine documento. */
export interface DocumentoData {
  tipo: TipoDocumento
  numero: string
  data: string
  struttura: string
  // Intestatario persona (Scontrino / Caparra)
  nome: string
  cognome: string
  // Intestatario azienda (Fattura)
  ragioneSociale: string
  partitaIva: string
  codiceUnivoco: string
  pec: string
  // Comuni
  indirizzo: string
  cap: string
  citta: string
  provincia: string
  nazionalita: string
  codiceFiscale: string
  // Contenuto
  addebiti: EmAddebito[]
  caparra: number
  modoPagamento: string
  importo: string
}

interface EmissioneState {
  /** Addebiti selezionati da ContiCamera per l'emissione. null = arrivo diretto. */
  checkout: CheckoutPayload | null
  /** Documento emesso, per la pagina documento. */
  documento: DocumentoData | null

  setCheckout: (p: CheckoutPayload) => void
  clearCheckout: () => void
  setDocumento: (d: DocumentoData) => void
  clearDocumento: () => void
}

export const useEmissioneStore = create<EmissioneState>((set) => ({
  checkout: null,
  documento: null,
  setCheckout: (p) => set({ checkout: p }),
  clearCheckout: () => set({ checkout: null }),
  setDocumento: (d) => set({ documento: d }),
  clearDocumento: () => set({ documento: null }),
}))
