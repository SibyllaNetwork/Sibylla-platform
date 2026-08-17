// ─── useFitRows ─────────────────────────────────────────────────────────────────
//  Quante righe di tabella ci stanno DAVVERO nello spazio disponibile.
//  Nelle pagine BI la tabella di dettaglio vive dentro una card ad altezza fissa:
//  un numero di righe fisso taglierebbe le ultime righe (o costringerebbe a
//  scrollare, che qui è vietato). L'hook misura il contenitore e, quando la
//  tabella è a schermo, misura anche l'altezza REALE di una riga e
//  dell'intestazione — così il calcolo non dipende da numeri scritti a mano che il
//  tema o la compattazione possono smentire.
//
//  Restituisce { rows, ref }: `ref` è un ref-callback da mettere sul contenitore
//  della tabella. È un callback e non un oggetto ref perché il contenitore spesso
//  nasce e muore con la vista (tab Trend/Dettaglio): con un ref-oggetto la misura
//  non ripartirebbe al rimontaggio.
import { useCallback, useEffect, useState } from 'react'

export interface FitRowsOptions {
  /** Altezza di riga presunta finché non è misurabile. */
  rowHeight?: number
  /** Altezza dell'intestazione presunta finché non è misurabile. */
  headerHeight?: number
  /** Spazio da riservare (piede o paginazione fuori dal contenitore misurato). */
  reserve?: number
  /** Righe minime da mostrare comunque. */
  min?: number
  /** Righe massime: oltre, la tabella diventa illeggibile. */
  max?: number
  /** Selettore della riga da misurare dentro il contenitore. */
  rowSelector?: string
  /** Selettore dell'intestazione da misurare dentro il contenitore. */
  headSelector?: string
}

export interface FitRowsResult {
  /** Righe che ci stanno nello spazio disponibile. */
  rows: number
  /** Ref-callback da applicare al contenitore della tabella. */
  ref: (el: HTMLElement | null) => void
}

export function useFitRows({
  rowHeight = 34, headerHeight = 36, reserve = 0, min = 3, max = 24,
  rowSelector = 'tbody tr', headSelector = 'thead',
}: FitRowsOptions = {}): FitRowsResult {
  const [node, setNode] = useState<HTMLElement | null>(null)
  const [rows, setRows] = useState(min)

  const misura = useCallback(() => {
    if (!node || node.clientHeight <= 0) return
    const riga = node.querySelector(rowSelector) as HTMLElement | null
    const testa = node.querySelector(headSelector) as HTMLElement | null
    const hRiga = riga?.offsetHeight || rowHeight
    const hTesta = testa?.offsetHeight || headerHeight
    const n = Math.floor((node.clientHeight - hTesta - reserve) / hRiga)
    const valore = Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))
    setRows((cur) => (cur === valore ? cur : valore))
  }, [node, rowHeight, headerHeight, reserve, min, max, rowSelector, headSelector])

  // Ri-misura a ogni cambio di dimensione del contenitore (sidenav, resize…).
  useEffect(() => {
    if (!node) return
    const ro = new ResizeObserver(misura)
    ro.observe(node)
    return () => ro.disconnect()
  }, [node, misura])

  // …e dopo ogni impaginazione: cambiando il numero di righe cambiano le altezze
  // reali, quindi il calcolo si ripete finché non si stabilizza (converge: quando
  // il valore calcolato coincide con quello corrente lo stato non cambia più).
  useEffect(() => {
    const raf = requestAnimationFrame(misura)
    return () => cancelAnimationFrame(raf)
  }, [misura, rows])

  return { rows, ref: setNode }
}
