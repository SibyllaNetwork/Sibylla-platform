import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import Ico from '../../../../core/icons/Ico'
import { InputField, SelectField } from '../../../../core/components/form'
import BannerPreview from './BannerPreview'
import BookingPageTab from './BookingPageTab'
import {
  ACCENT_PRESETS, BANNER_GROUPS, BG_POSITIONS, DEFAULT_CONFIG, FONT_FAMILIES, HEADING_WEIGHTS,
  LINGUE, LINK_TYPES, LOGO_POSITIONS, SCRIM_STYLES, TEXT_ALIGN_OPTIONS, VALIGN_OPTIONS, VALUTE,
  buildEmbedCode, buildEmbedUrl, findFormat, isDataUrl, labelsFor,
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

            <InputField
              className="bgen__field bgen__field--full"
              name="bgen-dest"
              label="Destinazione predefinita"
              placeholder="Es. Roma, Costiera Amalfitana… (vuoto = ricerca libera)"
              value={config.destinazione}
              onChange={e => set('destinazione', e.target.value)}
            />

            <InputField
              className="bgen__field bgen__field--full"
              name="bgen-msg"
              label="Messaggio personalizzato"
              placeholder={`${labelsFor(config.lingua).slogan} (predefinito)`}
              value={config.messaggio}
              onChange={e => set('messaggio', e.target.value)}
              hint="Sovrascrive lo slogan in tutti i banner. Lascia vuoto per usare il testo predefinito della lingua selezionata."
            />

            <div className="bgen__grid">
              <SelectField
                className="bgen__field"
                name="bgen-lang"
                label="Lingua"
                value={config.lingua}
                onChange={e => set('lingua', e.target.value)}
                options={LINGUE.map(([v, l]) => ({ value: v, label: l }))}
              />
              <SelectField
                className="bgen__field"
                name="bgen-cur"
                label="Valuta"
                value={config.valuta}
                onChange={e => set('valuta', e.target.value)}
                options={VALUTE.map(([v, l]) => ({ value: v, label: l }))}
              />
              <SelectField
                className="bgen__field"
                name="bgen-tema"
                label="Tema"
                value={config.tema}
                onChange={e => set('tema', e.target.value as BannerConfig['tema'])}
                options={[{ value: 'light', label: 'Chiaro' }, { value: 'dark', label: 'Scuro' }]}
              />
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

            {/* ─── Tipografia ───────────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">Tipografia</h3>
            <SelectField
              className="bgen__field bgen__field--full"
              name="bgen-font"
              label="Font dei titoli"
              value={config.fontFamily}
              onChange={e => set('fontFamily', e.target.value)}
              options={FONT_FAMILIES.map(f => ({ value: f.id, label: f.label }))}
            />
            <div className="bgen__grid">
              <SelectField
                className="bgen__field"
                name="bgen-fweight"
                label="Peso"
                value={config.headingWeight}
                onChange={e => set('headingWeight', Number(e.target.value))}
                options={HEADING_WEIGHTS.map(([v, l]) => ({ value: v, label: l }))}
              />
              <SelectField
                className="bgen__field"
                name="bgen-fscale"
                label="Dimensione"
                value={config.headingScale}
                onChange={e => set('headingScale', Number(e.target.value))}
                options={[
                  { value: 0.85, label: 'Compatta' },
                  { value: 1, label: 'Normale' },
                  { value: 1.15, label: 'Grande' },
                  { value: 1.3, label: 'Molto grande' },
                  { value: 1.5, label: 'Massima' },
                ]}
              />
              <SelectField
                className="bgen__field"
                name="bgen-fleading"
                label="Interlinea"
                value={config.lineHeight}
                onChange={e => set('lineHeight', Number(e.target.value))}
                options={[
                  { value: 1, label: 'Stretta' },
                  { value: 1.2, label: 'Normale' },
                  { value: 1.4, label: 'Ariosa' },
                  { value: 1.6, label: 'Molto ariosa' },
                ]}
              />
              <SelectField
                className="bgen__field"
                name="bgen-ftracking"
                label="Spaziatura lettere"
                value={config.letterSpacing}
                onChange={e => set('letterSpacing', Number(e.target.value))}
                options={[
                  { value: -0.02, label: 'Compatta' },
                  { value: 0, label: 'Normale' },
                  { value: 0.04, label: 'Larga' },
                  { value: 0.08, label: 'Molto larga' },
                  { value: 0.16, label: 'Massima' },
                ]}
              />
            </div>
            <div className="bgen__field bgen__field--full">
              <label className="bgen__label">Stile del testo</label>
              <div className="bgen__segmented">
                <button type="button" className={`bgen__seg${config.textTransform === 'none' ? ' bgen__seg--active' : ''}`} onClick={() => set('textTransform', 'none')}>Normale</button>
                <button type="button" className={`bgen__seg${config.textTransform === 'uppercase' ? ' bgen__seg--active' : ''}`} onClick={() => set('textTransform', 'uppercase')}>MAIUSCOLO</button>
              </div>
            </div>

            {/* ─── Disposizione dei testi (banner con foto) ─────────── */}
            {(format.kind === 'display' || format.kind === 'card') && (
              <>
                <h3 className="bgen__section-title bgen__section-title--spaced">Disposizione testi</h3>
                <div className="bgen__grid">
                  {format.kind === 'display' && (
                    <SelectField
                      className="bgen__field"
                      name="bgen-valign"
                      label="Posizione verticale"
                      value={config.contentVAlign}
                      onChange={e => set('contentVAlign', e.target.value as BannerConfig['contentVAlign'])}
                      options={VALIGN_OPTIONS.map(([v, l]) => ({ value: v, label: l }))}
                    />
                  )}
                  <SelectField
                    className="bgen__field"
                    name="bgen-talign"
                    label="Allineamento orizzontale"
                    value={config.textAlign}
                    onChange={e => set('textAlign', e.target.value as BannerConfig['textAlign'])}
                    options={TEXT_ALIGN_OPTIONS.map(([v, l]) => ({ value: v, label: l }))}
                  />
                </div>
                <span className="bgen__hint-inline">Il logo resta posizionato in modo indipendente dalla sezione Logo.</span>
              </>
            )}

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
              <SelectField
                className="bgen__field"
                name="bgen-logo-pos"
                label="Posizione logo"
                value={config.logoPosition}
                onChange={e => set('logoPosition', e.target.value as BannerConfig['logoPosition'])}
                options={LOGO_POSITIONS.map(([v, l]) => ({ value: v, label: l }))}
              />
              <SelectField
                className="bgen__field"
                name="bgen-logo-size"
                label="Dimensione logo"
                value={config.logoSize}
                onChange={e => set('logoSize', Number(e.target.value))}
                options={[
                  { value: 0, label: 'Automatica' },
                  { value: 16, label: 'Piccolo' },
                  { value: 22, label: 'Medio' },
                  { value: 30, label: 'Grande' },
                  { value: 40, label: 'Extra' },
                ]}
              />
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
                  <SelectField
                    className="bgen__field"
                    name="bgen-bg-pos"
                    label="Posizione sfondo"
                    value={config.bgPosition}
                    onChange={e => set('bgPosition', e.target.value as BannerConfig['bgPosition'])}
                    options={BG_POSITIONS.map(([v, l]) => ({ value: v, label: l }))}
                  />
                  <SelectField
                    className="bgen__field"
                    name="bgen-bg-fit"
                    label="Adattamento"
                    value={config.bgFit}
                    onChange={e => set('bgFit', e.target.value as BannerConfig['bgFit'])}
                    options={[
                      { value: 'cover', label: 'Riempi (cover)' },
                      { value: 'contain', label: 'Contieni (contain)' },
                    ]}
                  />
                </div>

                {(format.kind === 'display' || format.kind === 'card') && (
                  <>
                    <div className="bgen__grid">
                      <SelectField
                        className="bgen__field"
                        name="bgen-scrim"
                        label="Effetto sfumatura"
                        value={config.scrimStyle}
                        onChange={e => set('scrimStyle', e.target.value as BannerConfig['scrimStyle'])}
                        options={SCRIM_STYLES.map(([v, l]) => ({ value: v, label: l }))}
                      />
                      {config.scrimStyle !== 'none' && (
                        <SelectField
                          className="bgen__field"
                          name="bgen-scrim-str"
                          label="Intensità"
                          value={config.scrimStrength}
                          onChange={e => set('scrimStrength', Number(e.target.value))}
                          options={[
                            { value: 35, label: 'Leggera' },
                            { value: 55, label: 'Media' },
                            { value: 72, label: 'Marcata' },
                            { value: 88, label: 'Forte' },
                            { value: 100, label: 'Piena' },
                          ]}
                        />
                      )}
                    </div>
                    {config.scrimStyle !== 'none' && (
                      <div className="bgen__field bgen__field--full">
                        <label className="bgen__label">Colore sfumatura</label>
                        <div className="bgen__palette">
                          {['#081422', '#000000', '#204769', '#3A1D12', '#1B1D23'].map(c => (
                            <button
                              key={c}
                              type="button"
                              className={`bgen__swatch${config.scrimColor.toLowerCase() === c.toLowerCase() ? ' bgen__swatch--active' : ''}`}
                              style={{ '--sw': c } as React.CSSProperties}
                              onClick={() => set('scrimColor', c)}
                              aria-label={`Sfumatura ${c}`}
                            />
                          ))}
                          <input
                            type="color"
                            className="bgen__color-input"
                            value={config.scrimColor}
                            onChange={e => set('scrimColor', e.target.value)}
                            aria-label="Colore sfumatura personalizzato"
                          />
                        </div>
                        <span className="bgen__hint-inline">La sfumatura migliora la leggibilità dei testi sopra la foto.</span>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ─── Link ─────────────────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">Link</h3>
            <div className="bgen__grid">
              <SelectField
                className="bgen__field"
                name="bgen-link-type"
                label="Tipo di link"
                value={config.linkType}
                onChange={e => set('linkType', e.target.value as BannerConfig['linkType'])}
                options={LINK_TYPES.map(([v, l]) => ({ value: v, label: l }))}
              />
              <SelectField
                className="bgen__field"
                name="bgen-link-target"
                label="Apertura"
                value={config.linkTarget}
                onChange={e => set('linkTarget', e.target.value as BannerConfig['linkTarget'])}
                options={[
                  { value: '_blank', label: 'Nuova scheda' },
                  { value: '_self', label: 'Stessa scheda' },
                ]}
              />
            </div>
            {config.linkType === 'custom' && (
              <InputField
                className="bgen__field bgen__field--full"
                name="bgen-link-url"
                label="URL di destinazione"
                placeholder="https://…"
                value={config.linkUrl}
                onChange={e => set('linkUrl', e.target.value)}
              />
            )}
            <InputField
              className="bgen__field bgen__field--full"
              name="bgen-link-text"
              label="Testo del link / bottone"
              placeholder="Es. Prenota ora, Scopri le offerte… (vuoto = predefinito)"
              value={config.linkText}
              onChange={e => set('linkText', e.target.value)}
            />

            <h3 className="bgen__section-title bgen__section-title--spaced">Tracciamento</h3>
            <div className="bgen__grid">
              <InputField
                className="bgen__field"
                name="bgen-aid"
                label="ID affiliato / partner"
                placeholder="Es. AFF-10234"
                value={config.affiliateId}
                onChange={e => set('affiliateId', e.target.value)}
              />
              <InputField
                className="bgen__field"
                name="bgen-utms"
                label="UTM source"
                placeholder="Es. blog-viaggi"
                value={config.utmSource}
                onChange={e => set('utmSource', e.target.value)}
              />
              <InputField
                className="bgen__field"
                name="bgen-utmm"
                label="UTM medium"
                placeholder="banner"
                value={config.utmMedium}
                onChange={e => set('utmMedium', e.target.value)}
              />
              <InputField
                className="bgen__field"
                name="bgen-utmc"
                label="UTM campaign"
                placeholder="Es. estate-2026"
                value={config.utmCampaign}
                onChange={e => set('utmCampaign', e.target.value)}
              />
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
