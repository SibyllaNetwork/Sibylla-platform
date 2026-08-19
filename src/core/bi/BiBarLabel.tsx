import React from 'react'
import { fmtEurK } from './chartTheme'
import './BiBarLabel.sass'

// ─── ETICHETTA DI VALORE SULLE BARRE ────────────────────────────────────────────
//  Etichetta all'estremità LIBERA della barra: a destra se il valore è positivo, a
//  sinistra se è negativo (barre orizzontali). Serve dove i valori hanno segno
//  variabile — scostamenti, valori attesi, sbilanci: con la posizione fissa a destra
//  le barre negative si ritrovano l'etichetta sopra il grafico, sovrapposta alle
//  altre (regole_ui.md §13).

/**
 * Crea il renderer da passare a `<LabelList content={…}>`.
 * `format` di default è l'importo compatto (12,3k €).
 */
export function barEndLabel(format: (n: number) => string = fmtEurK) {
  return function EtichettaBarra(p: any) {
    const { x = 0, y = 0, width = 0, height = 0, value } = p
    const n = Number(value)
    if (!Number.isFinite(n)) return null
    // Con i valori negativi recharts passa una larghezza negativa: gli estremi si
    // ricavano sempre da min/max, non da x e x+width dati per buoni.
    const sinistra = Math.min(x, x + width)
    const destra = Math.max(x, x + width)
    const negativa = n < 0
    return (
      <text
        x={negativa ? sinistra - 6 : destra + 6}
        y={y + height / 2}
        dy={4}
        textAnchor={negativa ? 'end' : 'start'}
        className="bi-bar-label"
      >
        {format(n)}
      </text>
    )
  }
}

/**
 * Variante per le barre di scostamento con valori di segno misto e scale molto
 * diverse (un positivo grande e tanti negativi piccoli): l'etichetta sta SEMPRE
 * subito a destra dell'estremo positivo della barra, cioè oltre lo zero per le
 * barre negative. Con l'etichetta all'estremità libera (`barEndLabel`) i negativi
 * piccoli la spingerebbero sopra le etichette di categoria dell'asse.
 */
export function barRightLabel(format: (n: number) => string = fmtEurK) {
  return function EtichettaBarraDestra(p: any) {
    const { x = 0, y = 0, width = 0, height = 0, value } = p
    const n = Number(value)
    if (!Number.isFinite(n)) return null
    return (
      <text
        x={Math.max(x, x + width) + 6}
        y={y + height / 2}
        dy={4}
        textAnchor="start"
        className="bi-bar-label"
      >
        {format(n)}
      </text>
    )
  }
}

/**
 * Etichetta di valore per le barre VERTICALI: sopra la barra se il valore è positivo,
 * sotto se è negativo. Serve al posto di `<LabelList position="top">`, che manda il
 * testo a capo sulla larghezza della barra (recharts usa il suo `Text` con word-wrap):
 * su una barra sottile "12,1k €" diventa due righe.
 */
export function barTopLabel(format: (n: number) => string = fmtEurK) {
  return function EtichettaBarraSopra(p: any) {
    const { x = 0, y = 0, width = 0, height = 0, value } = p
    const n = Number(value)
    if (!Number.isFinite(n)) return null
    const negativa = n < 0
    const alto = Math.min(y, y + height)
    const basso = Math.max(y, y + height)
    return (
      <text
        x={x + width / 2}
        y={negativa ? basso + 12 : alto - 5}
        textAnchor="middle"
        className="bi-bar-label"
      >
        {format(n)}
      </text>
    )
  }
}
