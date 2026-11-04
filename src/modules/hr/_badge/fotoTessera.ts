// ─── FOTO TESSERA PER IL BADGE ───────────────────────────────────────────────
//  Ritaglia al centro in formato 4:5 (quello della foto sul badge) e riduce a
//  480×600 px in JPEG: l'immagine resta nitida in stampa (≈ 22×28 mm a 550 dpi)
//  ma leggera da salvare con la scheda del collaboratore.

const LARGHEZZA = 480
const ALTEZZA = 600

export const FOTO_MAX_MB = 10

export function leggiFotoTessera(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Il file scelto non è un’immagine (JPG, PNG, HEIC…).')); return }
    if (file.size > FOTO_MAX_MB * 1024 * 1024) { reject(new Error(`L’immagine supera i ${FOTO_MAX_MB} MB.`)); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const ratio = LARGHEZZA / ALTEZZA
      let sw = img.naturalWidth, sh = img.naturalHeight
      if (sw / sh > ratio) sw = sh * ratio
      else sh = sw / ratio
      const sx = (img.naturalWidth - sw) / 2
      // leggermente verso l'alto: nelle foto ritratto il volto sta nella metà superiore
      const sy = Math.max(0, (img.naturalHeight - sh) * 0.35)
      const canvas = document.createElement('canvas')
      canvas.width = LARGHEZZA
      canvas.height = ALTEZZA
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Impossibile elaborare l’immagine.')); return }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, LARGHEZZA, ALTEZZA)
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, LARGHEZZA, ALTEZZA)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Immagine non leggibile: prova con un JPG o un PNG.')) }
    img.src = url
  })
}
