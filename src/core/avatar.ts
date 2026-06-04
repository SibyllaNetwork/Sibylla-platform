// Avatar profilo — asset SVG forniti dall'utente in /public/avatars.
// Si salva nel DB solo l'id avatar (campo `seed`): leggerissimo, nessun upload, riproducibile.

const COUNT = 50

/** Tutti gli id avatar disponibili: ['avatar-01', … 'avatar-18']. */
export const avatarIds: string[] = Array.from(
  { length: COUNT },
  (_, i) => `avatar-${String(i + 1).padStart(2, '0')}`,
)

/** Vero se la stringa è un id avatar valido (es. 'avatar-07'). */
const isAvatarId = (s: string): boolean => avatarIds.includes(s)

/** Hash deterministico di una stringa → indice 0..COUNT-1 (avatar stabile per testo libero). */
const hashIndex = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % COUNT
}

/** Avatar predefinito quando l'utente non ne sceglie uno: Maschio → avatar-18, Femmina → avatar-05. */
export const defaultAvatarId = (sesso?: string): string =>
  sesso === 'Femmina' ? 'avatar-05' : 'avatar-18'

/** Vero se la stringa è già un URL/dato immagine da usare così com'è (foto caricata o esterna). */
const isImageRef = (s: string): boolean =>
  /^(data:|blob:|https?:|\/)/.test(s)

/**
 * URL dell'immagine avatar.
 * - foto caricata o URL esterno (data:/blob:/http/`/…`) → usato così com'è
 * - id avatar ('avatar-07') → file SVG in /public/avatars
 * - stringa libera (vecchi dati, nome profilo) → avatar stabile via hash (render mai rotto)
 */
export const avatarUrl = (idOrSeed: string): string => {
  if (idOrSeed && isImageRef(idOrSeed)) return idOrSeed
  const id = isAvatarId(idOrSeed) ? idOrSeed : avatarIds[hashIndex(idOrSeed || '')]
  return `/avatars/${id}.svg`
}
