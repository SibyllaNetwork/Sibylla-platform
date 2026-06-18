import React from 'react'
import type { BannerConfig, BannerFormat } from './bannerData'
import { buildScrim, fontStack, labelsFor } from './bannerData'
import { BannerPhoto, SibyllaMark, Watermark } from './BannerArt'
import { resolveBackground } from './backgrounds'

// ─────────────────────────────────────────────────────────────────────────────
//  BannerPreview — rende un facsimile del banner alle dimensioni reali del
//  formato, con il marchio Sibylla ufficiale e la foto di sfondo (BannerArt).
//  L'accento e il tema arrivano via CSS custom properties; il layout effettivo
//  è demandato al .sass (nessuno stile visivo inline).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  format: BannerFormat
  config: BannerConfig
}

/** Campo fittizio del widget di ricerca. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <span className="bgen-pv__field">
      {label && <span className="bgen-pv__field-label">{label}</span>}
      <span className="bgen-pv__field-value">{value}</span>
    </span>
  )
}

export default function BannerPreview({ format, config }: Props) {
  const L = labelsFor(config.lingua)
  const dest = config.destinazione.trim() || L.destination
  const msg = config.messaggio.trim()
  const cta = config.linkText.trim()
  const logoSrc = config.logoCustom.trim() || undefined
  const logoH = config.logoSize
  const colorMode = config.bgMode === 'color'
  const bgSrc = config.bgCustom.trim() || resolveBackground(config.background, format.orientation).src
  const cls = `bgen-pv bgen-pv--${format.kind} bgen-pv--${format.id} bgen-pv--${format.orientation}`
  const fStack = fontStack(config.fontFamily)
  const styleVars = {
    '--bw': format.width === null ? '100%' : `${format.width}px`,
    '--bh': `${format.height}px`,
    '--bv-accent': config.accent,
    ...(colorMode ? { '--bg-color': config.bgColor } : {}),
    ...(config.textColor.trim() ? { '--bv-text': config.textColor } : {}),
    ...(fStack ? { '--bv-font': fStack } : {}),
    '--bv-head-scale': config.headingScale,
    ...(config.headingWeight > 0 ? { '--bv-head-weight': config.headingWeight } : {}),
    '--bv-tracking': config.letterSpacing ? `${config.letterSpacing}em` : 'normal',
    '--bv-leading': config.lineHeight,
    '--bv-transform': config.textTransform,
    '--bv-scrim': buildScrim(config),
  } as React.CSSProperties
  const photo = colorMode ? null : <BannerPhoto src={bgSrc} position={config.bgPosition} fit={config.bgFit} />
  const scrim = colorMode ? null : <div className="bgen-pv__scrim" />

  if (format.kind === 'widget') {
    return (
      <div className={cls} data-tema={config.tema} data-logo-pos={config.logoPosition} style={styleVars}>
        <Watermark />
        <div className="bgen-pv__widget-head">
          <SibyllaMark tone={config.tema} src={logoSrc} height={logoH} />
          <span className="bgen-pv__widget-slogan">{msg || L.slogan}</span>
        </div>
        <div className="bgen-pv__widget-body">
          <div className="bgen-pv__fields">
            <Field label="" value={dest} />
            <Field label={L.checkin} value="—" />
            <Field label={L.checkout} value="—" />
            <Field label={L.guests} value="2" />
          </div>
          <button type="button" className="bgen-pv__cta" tabIndex={-1}>{cta || L.search}</button>
        </div>
      </div>
    )
  }

  if (format.kind === 'card') {
    return (
      <div className={cls} data-tema={config.tema} data-logo-pos={config.logoPosition} data-talign={config.textAlign} style={styleVars}>
        <div className="bgen-pv__photo">
          {photo}
          {scrim}
          <Watermark />
          <span className="bgen-pv__photo-brand"><SibyllaMark tone="dark" src={logoSrc} height={logoH} /></span>
          <span className="bgen-pv__photo-badge">{cta || L.bookNow}</span>
          <span className="bgen-pv__photo-caption">{msg || L.slogan}</span>
        </div>
        <div className="bgen-pv__card-body">
          <div className="bgen-pv__card-dest">{config.destinazione.trim() || 'La tua prossima meta'}</div>
          <div className="bgen-pv__card-meta">★ 4,8 · 128 recensioni</div>
          <div className="bgen-pv__price">
            <span className="bgen-pv__price-from">{L.from}</span>
            <span className="bgen-pv__price-val">€ 89</span>
            <span className="bgen-pv__price-unit">{L.perNight}</span>
          </div>
          <button type="button" className="bgen-pv__cta" tabIndex={-1}>{cta || L.bookNow}</button>
        </div>
      </div>
    )
  }

  if (format.kind === 'link') {
    return (
      <div className={cls} data-tema={config.tema} style={styleVars}>
        <button type="button" className="bgen-pv__smart" tabIndex={-1}>
          <SibyllaMark tone="dark" src={logoSrc} height={logoH} />
          <span className="bgen-pv__smart-label">{cta || msg || L.smartCta}</span>
        </button>
      </div>
    )
  }

  // display — foto a tutto banner, scrim per leggibilità, testo sopra
  return (
    <div className={cls} data-tema={config.tema} data-logo-pos={config.logoPosition} data-valign={config.contentVAlign} data-talign={config.textAlign} style={styleVars}>
      {photo}
      {format.id !== 'mobile' && <Watermark />}
      {scrim}
      <div className="bgen-pv__display-inner">
        <SibyllaMark tone="dark" src={logoSrc} height={logoH} />
        <div className="bgen-pv__headline">{msg || (format.id === 'mobile' ? L.sloganShort : L.slogan)}</div>
        <div className="bgen-pv__sub">{L.services}</div>
        <button type="button" className="bgen-pv__cta" tabIndex={-1}>{cta || L.bookNow}</button>
      </div>
    </div>
  )
}
