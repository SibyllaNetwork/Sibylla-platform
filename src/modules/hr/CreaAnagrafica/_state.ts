/**
 * State condiviso (module-scoped) per passare l'anagrafica in modifica dalla
 * lista "Archivio del personale" alla pagina Crea/Modifica anagrafica, senza
 * context globali. La pagina, in modalità editing, legge questo stato per
 * precompilare i campi.
 */

export interface EditingAnagrafica {
  id?: number | string
  nome?: string
  cognome?: string
  data_nascita?: string // ISO yyyy-mm-dd
  codice_fiscale?: string
  indirizzo?: string
  cap?: string
  provincia?: string
  nazionalita?: string
  documenti?: {
    identita?: string
    codiceFiscale?: string
    contratto?: string
    privacy?: string
    sicurezza?: string
    altri?: string[]
  }
}

let _editing: EditingAnagrafica | null = null

export function setEditingAnagrafica(a: EditingAnagrafica | null) {
  _editing = a
}
export function getEditingAnagrafica(): EditingAnagrafica | null {
  return _editing
}
export function clearEditingAnagrafica() {
  _editing = null
}
