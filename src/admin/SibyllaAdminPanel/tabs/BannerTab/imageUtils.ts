// ─────────────────────────────────────────────────────────────────────────────
//  Helper condiviso: carica un'immagine da file locale ridimensionandola e
//  comprimendola via canvas, così il data-URL resta leggero e può essere salvato
//  nel localStorage insieme alla configurazione. Logo → PNG (preserva la
//  trasparenza); foto/sfondi → JPEG.
// ─────────────────────────────────────────────────────────────────────────────
export function readImageScaled(
  file: File, maxW: number, maxH: number, mime: 'image/jpeg' | 'image/png', quality: number,
  onLoad: (dataUrl: string) => void,
) {
  const reader = new FileReader()
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : ''
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, maxW / img.width, maxH / img.height)
      const w = Math.max(1, Math.round(img.width * ratio))
      const h = Math.max(1, Math.round(img.height * ratio))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { onLoad(result); return }
      ctx.drawImage(img, 0, 0, w, h)
      try { onLoad(canvas.toDataURL(mime, quality)) } catch { onLoad(result) }
    }
    img.onerror = () => onLoad(result)
    img.src = result
  }
  reader.readAsDataURL(file)
}

/** true se il valore è caricato localmente (data-URL) e quindi non incorporabile nel codice embed di terzi. */
export function isDataUrl(v: string): boolean {
  return v.trim().startsWith('data:')
}
