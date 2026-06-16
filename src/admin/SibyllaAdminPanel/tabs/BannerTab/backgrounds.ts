// ─────────────────────────────────────────────────────────────────────────────
//  Sfondi fotografici dei banner. Le immagini vivono in ./backgrounds e vengono
//  importate (bundle) così da avere un URL stabile richiamabile dal progetto.
//  Per aggiungerne altre: deposita il file in ./backgrounds e aggiungi una voce.
// ─────────────────────────────────────────────────────────────────────────────
import banner1 from './backgrounds/banner1.jpg'
import banner2 from './backgrounds/banner2.jpg'
import banner3 from './backgrounds/banner3.jpg'
import banner4 from './backgrounds/banner4.jpg'

export interface BannerBackground {
  id: number
  src: string
  label: string
  orientation: 'landscape' | 'portrait'
}

export const BANNER_BACKGROUNDS: BannerBackground[] = [
  { id: 0, src: banner1, label: 'Città storica', orientation: 'landscape' },
  { id: 1, src: banner2, label: 'Roma in vespa', orientation: 'portrait' },
  { id: 2, src: banner3, label: 'Spiaggia',      orientation: 'landscape' },
  { id: 3, src: banner4, label: 'Resort',        orientation: 'portrait' },
]

/** -1 = automatico (sceglie in base all'orientamento del formato). */
export const BG_AUTO = -1

/** Sfondo predefinito per orientamento del banner. */
export function defaultBackgroundId(orientation: 'horizontal' | 'vertical' | 'block'): number {
  return orientation === 'vertical' ? 3 : 2
}

export function resolveBackground(
  backgroundId: number,
  orientation: 'horizontal' | 'vertical' | 'block',
): BannerBackground {
  const id = backgroundId === BG_AUTO ? defaultBackgroundId(orientation) : backgroundId
  return BANNER_BACKGROUNDS[id] ?? BANNER_BACKGROUNDS[0]
}
