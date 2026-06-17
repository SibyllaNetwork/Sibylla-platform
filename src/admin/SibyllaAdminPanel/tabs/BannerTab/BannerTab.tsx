import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import Ico from '../../../../core/icons/Ico'
import BannerPreview from './BannerPreview'
import BookingPageTab from './BookingPageTab'
import {
  ACCENT_PRESETS, BANNER_GROUPS, BG_POSITIONS, DEFAULT_CONFIG, LINGUE, LINK_TYPES,
  LOGO_POSITIONS, VALUTE, buildEmbedCode, buildEmbedUrl, findFormat, isDataUrl, labelsFor,
} from './bannerData'
import type { BannerConfig } from './bannerData'
import { BANNER_BACKGROUNDS, BG_AUTO } from './backgrounds'
import { useBannerStore } from '../../../../store/useBannerStore'
import { toast } from '../../../../core/components/Toast/useToast'
import './BannerTab.sass'

const STAGE_PAD = 48 // margine interno dello stage di anteprima, px

/**
 * Carica un'immagine da file locale ridimensionandola/comprimendola via canvas,
 * così il data-URL resta leggero e può essere salvato nel localStorage col banner.
 * I logo restano PNG (preservano la trasparenza); gli sfondi diventano JPEG.
 */
function readImageScaled(
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

export default function BannerTab() {
  const [view, setView] = useState<'banner' | 'page'>('banner')
  const [selId, setSelId] = useState<string>(BANNER_GROUPS[0].formats[0].id)
  const [config, setConfig] = useState<BannerConfig>(DEFAULT_CONFIG)
  const [copied, setCopied] = useState(false)
  const [bannerName, setBannerName] = useState('')

  const savedBanners = useBannerStore(s => s.saved)
  const saveBanner = useBannerStore(s => s.saveBanner)
  const removeBanner = useBannerStore(s => s.removeBanner)

  const format = findFormat(selId)
  const code = useMemo(() => buildEmbedCode(format, config), [format, config])
  const url = useMemo(() => buildEmbedUrl(format, config), [format, config])

  const set = <K extends keyof BannerConfig>(k: K, v: BannerConfig[K]) =>
    setConfig(p => ({ ...p, [k]: v }))

  // ─── Scaling dell'anteprima per far entrare il formato nello stage ──────────
  const stageRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const recompute = () => {
      const availW = el.clientWidth - STAGE_PAD
      const availH = el.clientHeight - STAGE_PAD
      const w = format.width ?? availW
      const s = Math.min(1, availW / w, availH / format.height)
      setScale(s > 0 ? s : 1)
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [format])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const doSave = () => {
    const name = bannerName.trim() || `${format.label} — ${new Date().toLocaleDateString('it-IT')}`
    try {
      saveBanner(name, selId, config)
      setBannerName('')
      toast.success(`Banner "${name}" salvato.`, 'Salvato')
    } catch {
      toast.error('Spazio esaurito: elimina qualche banner salvato oppure usa un URL immagine al posto del file caricato.', 'Salvataggio non riuscito')
    }
  }
  const loadSaved = (b: typeof savedBanners[number]) => {
    setSelId(b.formatId)
    setConfig({ ...DEFAULT_CONFIG, ...b.config })
  }

  return (
    <div className="bgen-wrap">
      <div className="bgen-switch" role="tablist" aria-label="Tipo di contenuto">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'banner'}
          className={`bgen-switch__btn${view === 'banner' ? ' bgen-switch__btn--active' : ''}`}
          onClick={() => setView('banner')}
        >
          <Ico n="image" s={14} c={view === 'banner' ? 'var(--color-primary)' : 'var(--color-text-inactive)'} />
          Banner di affiliazione
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'page'}
          className={`bgen-switch__btn${view === 'page' ? ' bgen-switch__btn--active' : ''}`}
          onClick={() => setView('page')}
        >
          <Ico n="globe" s={14} c={view === 'page' ? 'var(--color-primary)' : 'var(--color-text-inactive)'} />
          Pagina di Booking
        </button>
      </div>

      {view === 'page' ? (
        <BookingPageTab />
      ) : (
        <div className="bgen">
          {/* ─── Galleria formati (master) ─────────────────────────────────────── */}
          <aside className="bgen__gallery" aria-label="Formati banner">
        {BANNER_GROUPS.map(g => (
          <div key={g.kind} className="bgen__group">
            <div className="bgen__group-head">
              <Ico n={g.icon} s={13} c="var(--color-text-inactive)" />
              {g.label}
            </div>
            {g.formats.map(f => {
              const active = f.id === selId
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`bgen__format${active ? ' bgen__format--active' : ''}`}
                  onClick={() => setSelId(f.id)}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className="bgen__format-name">{f.label}</span>
                  <span className="bgen__format-size">{f.size}</span>
                </button>
              )
            })}
          </div>
        ))}

        {savedBanners.length > 0 && (
          <div className="bgen__group bgen__saved">
            <div className="bgen__group-head">
              <Ico n="save" s={13} c="var(--color-text-inactive)" />
              Banner salvati
            </div>
            {savedBanners.map(b => (
              <div key={b.id} className="bgen__saved-item">
                <button type="button" className="bgen__saved-load" onClick={() => loadSaved(b)} title="Carica questo banner">
                  <span className="bgen__saved-name">{b.name}</span>
                  <span className="bgen__saved-meta">{findFormat(b.formatId).label}</span>
                </button>
                <button type="button" className="bgen__saved-del" onClick={() => removeBanner(b.id)} title="Elimina" aria-label="Elimina">
                  <Ico n="trash" s={13} c="var(--color-text-inactive)" />
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ─── Dettaglio: anteprima + configuratore + codice ─────────────────── */}
      <div className="bgen__detail">
        <div className="bgen__detail-head">
          <div>
            <div className="bgen__detail-title">{format.label}</div>
            <div className="bgen__detail-desc">{format.description}</div>
          </div>
          <div className="bgen__save">
            <input
              className="sib-input sib-input--dense bgen__save-name"
              placeholder="Nome banner…"
              value={bannerName}
              onChange={e => setBannerName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doSave() }}
            />
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={doSave}>
              <Ico n="save" s={13} c="var(--color-primary)" />
              Salva
            </button>
            <span className="bgen__size-badge">{format.size}</span>
          </div>
        </div>

        <div className="bgen__stage" ref={stageRef}>
          <div
            className="bgen__stage-scale"
            style={{ '--preview-scale': scale } as React.CSSProperties}
          >
            <BannerPreview format={format} config={config} />
          </div>
        </div>

        <div className="bgen__cols">
          {/* Configuratore */}
          <section className="bgen__config">
            <h3 className="bgen__section-title">Configurazione</h3>

            <div className="bgen__field bgen__field--full">
              <label className="bgen__label" htmlFor="bgen-dest">Destinazione predefinita</label>
              <input
                id="bgen-dest"
                className="sib-input"
                placeholder="Es. Roma, Costiera Amalfitana… (vuoto = ricerca libera)"
                value={config.destinazione}
                onChange={e => set('destinazione', e.target.value)}
              />
            </div>

            <div className="bgen__field bgen__field--full">
              <label className="bgen__label" htmlFor="bgen-msg">Messaggio personalizzato</label>
              <input
                id="bgen-msg"
                className="sib-input"
                placeholder={`${labelsFor(config.lingua).slogan} (predefinito)`}
                value={config.messaggio}
                onChange={e => set('messaggio', e.target.value)}
              />
              <span className="bgen__hint-inline">Sovrascrive lo slogan in tutti i banner. Lascia vuoto per usare il testo predefinito della lingua selezionata.</span>
            </div>

            <div className="bgen__grid">
              <div className="bgen__field">
                <label className="bgen__label" htmlFor="bgen-lang">Lingua</label>
                <select id="bgen-lang" className="sib-select" value={config.lingua} onChange={e => set('lingua', e.target.value)}>
                  {LINGUE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="bgen__field">
                <label className="bgen__label" htmlFor="bgen-cur">Valuta</label>
                <select id="bgen-cur" className="sib-select" value={config.valuta} onChange={e => set('valuta', e.target.value)}>
                  {VALUTE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="bgen__field">
                <label className="bgen__label" htmlFor="bgen-tema">Tema</label>
                <select id="bgen-tema" className="sib-select" value={config.tema} onChange={e => set('tema', e.target.value as BannerConfig['tema'])}>
                  <option value="light">Chiaro</option>
                  <option value="dark">Scuro</option>
                </select>
              </div>
            </div>

            <div className="bgen__field bgen__field--full">
              <label className="bgen__label">Colore accento</label>
              <div className="bgen__palette">
                {ACCENT_PRESETS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`bgen__swatch${config.accent.toLowerCase() === c.toLowerCase() ? ' bgen__swatch--active' : ''}`}
                    style={{ '--sw': c } as React.CSSProperties}
                    onClick={() => set('accent', c)}
                    aria-label={`Colore ${c}`}
                  />
                ))}
                <input
                  type="color"
                  className="bgen__color-input"
                  value={config.accent}
                  onChange={e => set('accent', e.target.value)}
                  aria-label="Colore personalizzato"
                />
              </div>
            </div>

            <div className="bgen__field bgen__field--full">
              <label className="bgen__label">Colore testi</label>
              <div className="bgen__palette">
                <button
                  type="button"
                  className={`bgen__swatch bgen__swatch--auto${config.textColor === '' ? ' bgen__swatch--active' : ''}`}
                  onClick={() => set('textColor', '')}
                  title="Automatico"
                >A</button>
                {['#FFFFFF', '#1B1D23', '#204769', '#C9A84C'].map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`bgen__swatch${config.textColor.toLowerCase() === c.toLowerCase() ? ' bgen__swatch--active' : ''}`}
                    style={{ '--sw': c } as React.CSSProperties}
                    onClick={() => set('textColor', c)}
                    aria-label={`Colore testo ${c}`}
                  />
                ))}
                <input
                  type="color"
                  className="bgen__color-input"
                  value={config.textColor || '#ffffff'}
                  onChange={e => set('textColor', e.target.value)}
                  aria-label="Colore testo personalizzato"
                />
              </div>
              <span className="bgen__hint-inline">"A" = automatico (bianco su foto/scuro, scuro su chiaro).</span>
            </div>

            {/* ─── Logo ─────────────────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">Logo</h3>
            <div className="bgen__field bgen__field--full">
              <label className="bgen__label" htmlFor="bgen-logo-url">Logo personalizzato</label>
              <div className="bgen__upload">
                <input
                  id="bgen-logo-url"
                  className="sib-input"
                  placeholder="URL del logo (https://…) — vuoto = logo Sibylla"
                  value={isDataUrl(config.logoCustom) ? '' : config.logoCustom}
                  onChange={e => set('logoCustom', e.target.value)}
                />
                <label className="sib-btn sib-btn--secondary sib-btn--sm bgen__upload-btn">
                  <Ico n="upload" s={13} c="var(--color-primary)" />
                  Carica
                  <input type="file" accept="image/*" hidden
                    onChange={e => { const f = e.target.files?.[0]; if (f) readImageScaled(f, 480, 480, 'image/png', 1, d => set('logoCustom', d)) }} />
                </label>
                {config.logoCustom && (
                  <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={() => set('logoCustom', '')}>Rimuovi</button>
                )}
              </div>
              {config.logoCustom && (
                <div className="bgen__thumb-row">
                  <img className="bgen__thumb bgen__thumb--logo" src={config.logoCustom} alt="Anteprima logo" />
                  <span className="bgen__hint-inline">
                    {isDataUrl(config.logoCustom)
                      ? 'Logo caricato da file: viene salvato insieme al banner. Per incorporarlo nel codice di terzi serve un URL pubblico.'
                      : 'Logo da URL esterno.'}
                  </span>
                </div>
              )}
            </div>
            <div className="bgen__grid">
              <div className="bgen__field">
                <label className="bgen__label" htmlFor="bgen-logo-pos">Posizione logo</label>
                <select id="bgen-logo-pos" className="sib-select" value={config.logoPosition} onChange={e => set('logoPosition', e.target.value as BannerConfig['logoPosition'])}>
                  {LOGO_POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="bgen__field">
                <label className="bgen__label" htmlFor="bgen-logo-size">Dimensione logo</label>
                <select id="bgen-logo-size" className="sib-select" value={config.logoSize} onChange={e => set('logoSize', Number(e.target.value))}>
                  <option value={0}>Automatica</option>
                  <option value={16}>Piccolo</option>
                  <option value={22}>Medio</option>
                  <option value={30}>Grande</option>
                  <option value={40}>Extra</option>
                </select>
              </div>
            </div>

            {/* ─── Sfondo ───────────────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">Sfondo</h3>
            <div className="bgen__field bgen__field--full">
              <label className="bgen__label">Tipo di sfondo</label>
              <div className="bgen__segmented">
                <button type="button" className={`bgen__seg${config.bgMode === 'image' ? ' bgen__seg--active' : ''}`} onClick={() => set('bgMode', 'image')}>Immagine</button>
                <button type="button" className={`bgen__seg${config.bgMode === 'color' ? ' bgen__seg--active' : ''}`} onClick={() => set('bgMode', 'color')}>Colore pieno</button>
              </div>
            </div>

            {config.bgMode === 'color' ? (
              <div className="bgen__field bgen__field--full">
                <label className="bgen__label">Colore di sfondo</label>
                <div className="bgen__palette">
                  {ACCENT_PRESETS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`bgen__swatch${config.bgColor.toLowerCase() === c.toLowerCase() ? ' bgen__swatch--active' : ''}`}
                      style={{ '--sw': c } as React.CSSProperties}
                      onClick={() => set('bgColor', c)}
                      aria-label={`Sfondo ${c}`}
                    />
                  ))}
                  <input
                    type="color"
                    className="bgen__color-input"
                    value={config.bgColor}
                    onChange={e => set('bgColor', e.target.value)}
                    aria-label="Colore di sfondo personalizzato"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="bgen__field bgen__field--full">
                  <label className="bgen__label">Immagine predefinita</label>
                  <div className="bgen__bg-grid">
                    <button
                      type="button"
                      className={`bgen__bg bgen__bg--auto${config.background === BG_AUTO && !config.bgCustom ? ' bgen__bg--active' : ''}`}
                      onClick={() => { set('background', BG_AUTO); set('bgCustom', '') }}
                    >
                      Auto
                    </button>
                    {BANNER_BACKGROUNDS.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        className={`bgen__bg${config.background === b.id && !config.bgCustom ? ' bgen__bg--active' : ''}`}
                        style={{ '--bg-thumb': `url(${b.src})` } as React.CSSProperties}
                        onClick={() => { set('background', b.id); set('bgCustom', '') }}
                        title={b.label}
                        aria-label={b.label}
                      />
                    ))}
                  </div>
                </div>
                <div className="bgen__field bgen__field--full">
                  <label className="bgen__label" htmlFor="bgen-bg-url">Immagine personalizzata</label>
                  <div className="bgen__upload">
                    <input
                      id="bgen-bg-url"
                      className="sib-input"
                      placeholder="URL immagine (https://…)"
                      value={isDataUrl(config.bgCustom) ? '' : config.bgCustom}
                      onChange={e => set('bgCustom', e.target.value)}
                    />
                    <label className="sib-btn sib-btn--secondary sib-btn--sm bgen__upload-btn">
                      <Ico n="upload" s={13} c="var(--color-primary)" />
                      Carica
                      <input type="file" accept="image/*" hidden
                        onChange={e => { const f = e.target.files?.[0]; if (f) readImageScaled(f, 1600, 1200, 'image/jpeg', 0.82, d => set('bgCustom', d)) }} />
                    </label>
                    {config.bgCustom && (
                      <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={() => set('bgCustom', '')}>Rimuovi</button>
                    )}
                  </div>
                  {config.bgCustom && (
                    <div className="bgen__thumb-row">
                      <img className="bgen__thumb" src={config.bgCustom} alt="Anteprima sfondo" />
                      <span className="bgen__hint-inline">
                        {isDataUrl(config.bgCustom)
                          ? 'Immagine caricata da file: viene salvata insieme al banner. Per incorporarla nel codice di terzi serve un URL pubblico.'
                          : 'Immagine da URL esterno.'}
                      </span>
                    </div>
                  )}
                  <span className="bgen__hint-inline">
                    Dimensione consigliata per «{format.label}»: <b>{format.width ? `${format.width}×${format.height}` : `≥ 1200×${format.height}`} px</b> · formati JPG, PNG o WebP.
                  </span>
                </div>
                <div className="bgen__grid">
                  <div className="bgen__field">
                    <label className="bgen__label" htmlFor="bgen-bg-pos">Posizione sfondo</label>
                    <select id="bgen-bg-pos" className="sib-select" value={config.bgPosition} onChange={e => set('bgPosition', e.target.value as BannerConfig['bgPosition'])}>
                      {BG_POSITIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="bgen__field">
                    <label className="bgen__label" htmlFor="bgen-bg-fit">Adattamento</label>
                    <select id="bgen-bg-fit" className="sib-select" value={config.bgFit} onChange={e => set('bgFit', e.target.value as BannerConfig['bgFit'])}>
                      <option value="cover">Riempi (cover)</option>
                      <option value="contain">Contieni (contain)</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ─── Link ─────────────────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">Link</h3>
            <div className="bgen__grid">
              <div className="bgen__field">
                <label className="bgen__label" htmlFor="bgen-link-type">Tipo di link</label>
                <select id="bgen-link-type" className="sib-select" value={config.linkType} onChange={e => set('linkType', e.target.value as BannerConfig['linkType'])}>
                  {LINK_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="bgen__field">
                <label className="bgen__label" htmlFor="bgen-link-target">Apertura</label>
                <select id="bgen-link-target" className="sib-select" value={config.linkTarget} onChange={e => set('linkTarget', e.target.value as BannerConfig['linkTarget'])}>
                  <option value="_blank">Nuova scheda</option>
                  <option value="_self">Stessa scheda</option>
                </select>
              </div>
            </div>
            {config.linkType === 'custom' && (
              <div className="bgen__field bgen__field--full">
                <label className="bgen__label" htmlFor="bgen-link-url">URL di destinazione</label>
                <input id="bgen-link-url" className="sib-input" placeholder="https://…" value={config.linkUrl} onChange={e => set('linkUrl', e.target.value)} />
              </div>
            )}
            <div className="bgen__field bgen__field--full">
              <label className="bgen__label" htmlFor="bgen-link-text">Testo del link / bottone</label>
              <input id="bgen-link-text" className="sib-input" placeholder="Es. Prenota ora, Scopri le offerte… (vuoto = predefinito)" value={config.linkText} onChange={e => set('linkText', e.target.value)} />
            </div>

            <h3 className="bgen__section-title bgen__section-title--spaced">Tracciamento</h3>
            <div className="bgen__grid">
              <div className="bgen__field">
                <label className="bgen__label" htmlFor="bgen-aid">ID affiliato / partner</label>
                <input id="bgen-aid" className="sib-input" placeholder="Es. AFF-10234" value={config.affiliateId} onChange={e => set('affiliateId', e.target.value)} />
              </div>
              <div className="bgen__field">
                <label className="bgen__label" htmlFor="bgen-utms">UTM source</label>
                <input id="bgen-utms" className="sib-input" placeholder="Es. blog-viaggi" value={config.utmSource} onChange={e => set('utmSource', e.target.value)} />
              </div>
              <div className="bgen__field">
                <label className="bgen__label" htmlFor="bgen-utmm">UTM medium</label>
                <input id="bgen-utmm" className="sib-input" placeholder="banner" value={config.utmMedium} onChange={e => set('utmMedium', e.target.value)} />
              </div>
              <div className="bgen__field">
                <label className="bgen__label" htmlFor="bgen-utmc">UTM campaign</label>
                <input id="bgen-utmc" className="sib-input" placeholder="Es. estate-2026" value={config.utmCampaign} onChange={e => set('utmCampaign', e.target.value)} />
              </div>
            </div>
          </section>

          {/* Codice generato */}
          <section className="bgen__code-pane">
            <div className="bgen__code-head">
              <h3 className="bgen__section-title">Codice da incollare</h3>
              <button type="button" className={`sib-btn sib-btn--primary sib-btn--sm${copied ? ' bgen__copy--done' : ''}`} onClick={copy}>
                <Ico n={copied ? 'check' : 'copy'} s={13} c="#fff" />
                {copied ? 'Copiato!' : 'Copia codice'}
              </button>
            </div>
            <p className="bgen__hint">
              Incolla questo snippet nel punto della pagina dove vuoi mostrare il banner. È un <code>iframe</code> autoconsistente: non richiede librerie e non eredita lo stile del sito ospitante.
            </p>
            <pre className="bgen__code"><code>{code}</code></pre>

            <div className="bgen__url">
              <span className="bgen__url-label">URL embed</span>
              <a className="bgen__url-link" href={url} target="_blank" rel="noreferrer noopener">{url}</a>
            </div>
          </section>
        </div>
      </div>
        </div>
      )}
    </div>
  )
}
