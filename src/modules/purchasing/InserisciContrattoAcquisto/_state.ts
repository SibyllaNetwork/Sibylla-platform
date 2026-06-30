/**
 * State condiviso (module-scoped) per passare il contratto di acquisto in
 * modifica dalla lista "I miei contratti" alla pagina di inserimento/modifica,
 * evitando context globali. La pagina, in modalità editing, legge questo stato
 * per precompilare i campi.
 */

export interface EditingProdotto { nome: string; prezzo: number }
export interface EditingServizio { nome: string; prezzo: number }

export interface EditingContrattoAcquisto {
  id: number | string
  ragioneSociale: string
  email?: string
  telefono?: string
  referente?: string
  prodotti?: EditingProdotto[]
  servizi?: EditingServizio[]
}

let _editing: EditingContrattoAcquisto | null = null

export function setEditingContrattoAcquisto(c: EditingContrattoAcquisto | null) {
  _editing = c
}
export function getEditingContrattoAcquisto(): EditingContrattoAcquisto | null {
  return _editing
}
export function clearEditingContrattoAcquisto() {
  _editing = null
}
