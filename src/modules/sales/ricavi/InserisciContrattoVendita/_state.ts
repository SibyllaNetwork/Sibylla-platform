/**
 * State condiviso (module-scoped) per passare il contratto in modifica
 * dalla lista "I miei contratti" alla pagina di edit, evitando context globali.
 */

export interface EditingContract {
  id: number | string
  ragioneSociale: string
  email?: string
  telefono?: string
  referente?: string
  periodoInizio?: string  // ISO yyyy-mm-dd
  periodoFine?: string
  camera?: number
  persona?: number
  supplemento?: number
  sconto?: number
  note?: string
}

let _editing: EditingContract | null = null

export function setEditingContract(c: EditingContract | null) {
  _editing = c
}
export function getEditingContract(): EditingContract | null {
  return _editing
}
export function clearEditingContract() {
  _editing = null
}
