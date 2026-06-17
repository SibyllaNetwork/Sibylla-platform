import React from 'react'
import logoSibylla from './sibylla-bullet.svg'
import logoKey from './sibylla-key.svg'

// ─────────────────────────────────────────────────────────────────────────────
//  BannerArt — asset grafici dei banner: il logo Sibylla ufficiale
//  (Logo_sibylla_bullet.svg: simbolo oro + wordmark), l'emblema Sibylla
//  (Logo_sibylla_key.svg) usato come watermark di sfondo, e la foto di sfondo
//  (BannerPhoto, da ./backgrounds) per i banner display e la card.
//  Sui fondi scuri logo ed emblema sono resi bianchi via filtro CSS.
// ─────────────────────────────────────────────────────────────────────────────

interface MarkProps {
  /** Tono del contesto: su sfondi scuri/foto il logo Sibylla viene reso bianco. */
  tone?: 'light' | 'dark'
  /** Logo personalizzato (URL/data-URL). Se presente sostituisce quello Sibylla. */
  src?: string
  /** Altezza in px; 0/undefined = default del formato (via CSS). */
  height?: number
}

/** Logo del banner: Sibylla ufficiale o, se fornito, quello personalizzato. */
export function SibyllaMark({ tone = 'light', src, height }: MarkProps) {
  const custom = !!src && src.trim() !== ''
  const cls = `bgen-mark bgen-mark--${tone}${custom ? ' bgen-mark--custom' : ''}`
  const style = height && height > 0
    ? ({ '--logo-h': `${height}px` } as React.CSSProperties)
    : undefined
  return (
    <span className={cls}>
      <img className="bgen-mark__img" src={custom ? src : logoSibylla} alt="Logo" style={style} />
    </span>
  )
}

/** Emblema Sibylla usato come watermark di sfondo (decorativo). */
export function Watermark() {
  return <img className="bgen-pv__watermark" src={logoKey} alt="" aria-hidden="true" />
}

/**
 * Logo Sibylla Network: emblema "chiave" oro + wordmark «Sibylla Network».
 * Replica l'identità di sibyllanetwork.com. Su barra arancio (tone="dark") emblema
 * e testo diventano bianchi; su fondo chiaro restano oro/scuri.
 */
export function SibyllaNetworkMark({ tone = 'light', src, height, wordmark = true }: MarkProps & { wordmark?: boolean }) {
  const custom = !!src && src.trim() !== ''
  const cls = `bgen-mark booknet-mark booknet-mark--${tone}${custom ? ' bgen-mark--custom' : ''}`
  const style = height && height > 0
    ? ({ '--logo-h': `${height}px` } as React.CSSProperties)
    : undefined
  return (
    <span className={cls}>
      <img className="bgen-mark__img booknet-mark__key" src={custom ? src : logoKey} alt="Sibylla Network" style={style} />
      {!custom && wordmark && (
        <span className="booknet-mark__word"><b>Sibylla</b> Network</span>
      )}
    </span>
  )
}

/** Foto di sfondo del banner (riempie il contenitore; posizione/ritaglio configurabili). */
export function BannerPhoto({ src, position = 'center', fit = 'cover' }: {
  src: string
  position?: string
  fit?: 'cover' | 'contain'
}) {
  const style = { '--bg-pos': position, '--bg-fit': fit } as React.CSSProperties
  return <img className="bgen-pv__photo-bg" src={src} alt="" aria-hidden="true" style={style} />
}
