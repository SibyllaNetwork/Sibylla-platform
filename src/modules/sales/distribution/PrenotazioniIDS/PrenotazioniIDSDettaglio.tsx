import React from 'react'
import PrenotazioniIDS from './PrenotazioniIDS'

// Il dettaglio della giornata è confluito nella pagina unica Prenotazioni IDS:
// la rotta `prenotazioni-ids-dett:<iso>|<struttura>` resta valida e apre la
// stessa pagina preimpostata su quella data e struttura.
interface Props {
  navigate: (p: string) => void
  iso?: string
  struttura?: string
}

export default function PrenotazioniIDSDettaglio(props: Props) {
  return <PrenotazioniIDS {...props} />
}
