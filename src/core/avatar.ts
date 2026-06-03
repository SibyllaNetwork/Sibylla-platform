// Avatar profilo — SEGNAPOSTO TEMPORANEO: stile DiceBear "big-smile" via API.
// Si salva nel DB solo il `seed`: riproducibile, leggerissimo, nessun upload.
// ⚠️ Provvisorio: verrà sostituito dagli asset avatar forniti dall'utente.

const DICEBEAR = 'https://api.dicebear.com/9.x/big-smile/svg'

/** URL SVG dell'avatar per un dato seed. */
export const avatarUrl = (seed: string): string =>
  `${DICEBEAR}?seed=${encodeURIComponent(seed)}`

/** Genera N seed-varianti a partire da una base (es. il nome del profilo). */
export const avatarVariants = (base: string, n = 12): string[] =>
  Array.from({ length: n }, (_, i) => (i === 0 ? base : `${base}-${i + 1}`))
