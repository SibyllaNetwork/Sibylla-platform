import { useEffect, useState } from 'react'

/**
 * Riconosce lo schermo di un totem dalla risoluzione: verticale, largo almeno
 * 900px e con proporzioni attorno al 9:16 (larghezza/altezza fra 0,5 e 0,625,
 * cioè da 9:18 a 10:16). Esempi: 1080×1920, 2160×3840 → totem; telefoni
 * (troppo stretti), tablet verticali (3:4) e monitor orizzontali → sito web.
 *
 * `?piattaforma` nell'indirizzo lo disattiva (per usare Platform da un
 * monitor ruotato in verticale); `?totem` lo forza su qualunque schermo.
 */
export const QUERY_TOTEM = '(orientation: portrait) and (min-width: 900px) and (min-aspect-ratio: 1/2) and (max-aspect-ratio: 5/8)'

const parametro = (nome: string) => {
  try { return new URLSearchParams(window.location.search).has(nome) } catch { return false }
}

export function eSchermoTotem(): boolean {
  if (typeof window === 'undefined') return false
  if (parametro('piattaforma')) return false
  if (parametro('totem')) return true
  return window.matchMedia?.(QUERY_TOTEM).matches ?? false
}

/** Si aggiorna se lo schermo cambia (rotazione, finestra ridimensionata). */
export function useSchermoTotem(): boolean {
  const [totem, setTotem] = useState(eSchermoTotem)
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY_TOTEM)
    if (!mq) return
    const aggiorna = () => setTotem(eSchermoTotem())
    mq.addEventListener('change', aggiorna)
    return () => mq.removeEventListener('change', aggiorna)
  }, [])
  return totem
}
