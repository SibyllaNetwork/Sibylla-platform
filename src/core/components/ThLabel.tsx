import React from 'react'
import TruncatedText from './TruncatedText'

/**
 * Intestazione di colonna responsive (standard piattaforma: le tabelle non
 * scrollano MAI in orizzontale).
 *
 * Mostra l'etichetta intera alle larghezze standard e l'abbreviazione puntata
 * quando la pagina si compatta; in entrambi i casi il testo resta su una riga
 * e, se troncato o abbreviato, il tooltip riporta l'etichetta completa.
 *
 * Lo scambio lo decide la pagina, dentro la propria container query, con il
 * mixin `+th-compact` (styles/_mixins.sass).
 */
interface Props {
  /** Etichetta completa. */
  full: string
  /** Abbreviazione puntata usata sotto soglia (default: l'etichetta intera). */
  short?: string
}

export default function ThLabel({ full, short }: Props) {
  return (
    <>
      <span className="sib-th-full"><TruncatedText text={full} /></span>
      <span className="sib-th-short"><TruncatedText text={short ?? full} full={full} /></span>
    </>
  )
}
