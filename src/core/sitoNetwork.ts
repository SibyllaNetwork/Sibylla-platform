/**
 * Sito Sibylla Network: dal 27/11/2026 è un progetto a parte
 * (repo SibyllaNetwork/sibylla-network, Vercel sibylla-network).
 * Platform lo apre con un link: da "Disconnetti profilo" in topbar e,
 * su uno schermo da totem, all'avvio (il totem gira sul sito).
 */
export const SITO_NETWORK_URL: string =
  process.env.REACT_APP_SITO_NETWORK_URL || 'https://sibylla-network.vercel.app'

/** Totem: verticale, largo almeno 900px, proporzioni attorno al 9:16 (es. 1080×1920).
 *  `?piattaforma` lo disattiva (Platform su un monitor ruotato), `?totem` lo forza. */
const QUERY_TOTEM = '(orientation: portrait) and (min-width: 900px) and (min-aspect-ratio: 1/2) and (max-aspect-ratio: 5/8)'

export function eSchermoTotem(): boolean {
  const q = new URLSearchParams(window.location.search)
  if (q.has('piattaforma')) return false
  if (q.has('totem')) return true
  return window.matchMedia?.(QUERY_TOTEM).matches ?? false
}

export function apriSitoNetwork(totem = false) {
  window.location.assign(totem ? `${SITO_NETWORK_URL}/?totem` : SITO_NETWORK_URL)
}
