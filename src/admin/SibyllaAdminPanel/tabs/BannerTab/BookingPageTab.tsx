import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'
import Ico from '../../../../core/icons/Ico'
import { InputField, SelectField } from '../../../../core/components/form'
import BookingPagePreview from './BookingPagePreview'
import {
  ACCENT_PRESETS, BOOKING_FIELDS, BRAND_LIST, CATEGORIES, DEFAULT_CONFIG, LINGUE, VALUTE,
  applyBrand, buildPageCode, buildPageUrl,
} from './bookingPageData'
import type { BookingBrand, BookingFieldKey, BookingPageConfig } from './bookingPageData'
import { BANNER_BACKGROUNDS, BG_AUTO } from './backgrounds'
import { isDataUrl, readImageScaled } from './imageUtils'
import { useBookingPageStore } from '../../../../store/useBookingPageStore'
import { toast } from '../../../../core/components/Toast/useToast'
import './BookingPageTab.sass'

const DEVICES: ReadonlyArray<readonly [Device, string, number, string]> = [
  ['desktop', 'Desktop', 1200, 'desktop'],
  ['tablet', 'Tablet', 820, 'tablet'],
  ['mobile', 'Mobile', 390, 'mobile'],
] as const
type Device = 'desktop' | 'tablet' | 'mobile'

const STAGE_PAD = 32

export default function BookingPageTab() {
  const [config, setConfig] = useState<BookingPageConfig>(DEFAULT_CONFIG)
  const [device, setDevice] = useState<Device>('desktop')
  const [hostChrome, setHostChrome] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pageName, setPageName] = useState('')

  const savedPages = useBookingPageStore(s => s.saved)
  const savePage = useBookingPageStore(s => s.savePage)
  const removePage = useBookingPageStore(s => s.removePage)

  const code = useMemo(() => buildPageCode(config), [config])
  const url = useMemo(() => buildPageUrl(config), [config])

  const set = <K extends keyof BookingPageConfig>(k: K, v: BookingPageConfig[K]) =>
    setConfig(p => ({ ...p, [k]: v }))
  const setField = (k: BookingFieldKey, v: boolean) =>
    setConfig(p => ({ ...p, fields: { ...p.fields, [k]: v } }))

  const deviceW = DEVICES.find(d => d[0] === device)?.[2] ?? 1200

  // ─── Zoom dell'anteprima per far entrare il «device» nello stage ──────────────
  const stageRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const recompute = () => {
      const availW = el.clientWidth - STAGE_PAD
      const z = Math.min(1, availW / deviceW)
      setZoom(z > 0 ? z : 1)
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [deviceW])

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
    const name = pageName.trim() || `Pagina ${config.brand === 'sibylla' ? 'Sibylla' : 'Sibylla Network'} — ${new Date().toLocaleDateString('it-IT')}`
    try {
      savePage(name, config)
      setPageName('')
      toast.success(`Pagina "${name}" salvata.`, 'Salvato')
    } catch {
      toast.error('Spazio esaurito: elimina qualche pagina salvata oppure usa URL immagine al posto dei file caricati.', 'Salvataggio non riuscito')
    }
  }
  const loadSaved = (p: typeof savedPages[number]) => setConfig({ ...DEFAULT_CONFIG, ...p.config })

  const onBrand = (b: BookingBrand) => setConfig(p => applyBrand(p, b))

  return (
    <div className="bpage">
      {/* ─── Aside: brand + pagine salvate ───────────────────────────────────── */}
      <aside className="bpage__aside" aria-label="Brandizzazione">
        <div className="bgen__group-head">
          <Ico n="share" s={13} c="var(--color-text-inactive)" />
          Brandizzazione
        </div>
        <div className="bpage__brands">
          {BRAND_LIST.map(b => {
            const active = config.brand === b.id
            return (
              <button
                key={b.id}
                type="button"
                className={`bpage__brand${active ? ' bpage__brand--active' : ''}`}
                onClick={() => onBrand(b.id)}
                aria-current={active ? 'true' : undefined}
              >
                <span className="bpage__brand-swatches">
                  <span className="bpage__brand-sw" style={{ '--sw': b.accent } as React.CSSProperties} />
                  <span className="bpage__brand-sw" style={{ '--sw': b.accent2 } as React.CSSProperties} />
                </span>
                <span className="bpage__brand-name">{b.label}</span>
                <span className="bpage__brand-tag">{b.tagline}</span>
              </button>
            )
          })}
        </div>

        {savedPages.length > 0 && (
          <div className="bpage__saved">
            <div className="bgen__group-head">
              <Ico n="save" s={13} c="var(--color-text-inactive)" />
              Pagine salvate
            </div>
            {savedPages.map(p => (
              <div key={p.id} className="bgen__saved-item">
                <button type="button" className="bgen__saved-load" onClick={() => loadSaved(p)} title="Carica questa pagina">
                  <span className="bgen__saved-name">{p.name}</span>
                  <span className="bgen__saved-meta">{p.config.brand === 'sibylla' ? 'Sibylla' : 'Sibylla Network'}</span>
                </button>
                <button type="button" className="bgen__saved-del" onClick={() => removePage(p.id)} title="Elimina" aria-label="Elimina">
                  <Ico n="trash" s={13} c="var(--color-text-inactive)" />
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ─── Dettaglio: anteprima + configuratore + codice ───────────────────── */}
      <div className="bgen__detail">
        <div className="bgen__detail-head">
          <div>
            <div className="bgen__detail-title">Pagina di Booking</div>
            <div className="bgen__detail-desc">
              Pagina di prenotazione full-screen da incorporare via iframe nel sito di un affiliato.
              Stessi campi di «Strutture ricettive», interamente personalizzabile.
            </div>
          </div>
          <div className="bgen__save">
            <input
              className="sib-input sib-input--dense bgen__save-name"
              placeholder="Nome pagina…"
              value={pageName}
              onChange={e => setPageName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doSave() }}
            />
            <button type="button" className="sib-btn sib-btn--secondary sib-btn--sm" onClick={doSave}>
              <Ico n="save" s={13} c="var(--color-primary)" />
              Salva
            </button>
          </div>
        </div>

        {/* Controlli anteprima */}
        <div className="bpage__preview-bar">
          <div className="bgen__segmented">
            {DEVICES.map(([id, label]) => (
              <button key={id} type="button" className={`bgen__seg${device === id ? ' bgen__seg--active' : ''}`} onClick={() => setDevice(id)}>{label}</button>
            ))}
          </div>
          <label className="bpage__check">
            <input type="checkbox" checked={hostChrome} onChange={e => setHostChrome(e.target.checked)} />
            Contesto sito ospitante (header + sidenav)
          </label>
        </div>

        <div className="bpage__stage" ref={stageRef}>
          <div
            className="bpage__frame"
            style={{ '--device-w': `${deviceW}px`, '--preview-zoom': zoom } as React.CSSProperties}
          >
            <BookingPagePreview config={config} hostChrome={hostChrome} />
          </div>
        </div>

        <div className="bgen__cols">
          {/* ─── Configuratore ─────────────────────────────────────────────── */}
          <section className="bgen__config bpage__config">
            <h3 className="bgen__section-title">Generale</h3>
            <div className="bgen__grid">
              <SelectField
                className="bgen__field"
                name="bpage-lingua"
                label="Lingua"
                value={config.lingua}
                onChange={e => set('lingua', e.target.value)}
                options={LINGUE.map(([v, l]) => ({ value: v, label: l }))}
              />
              <SelectField
                className="bgen__field"
                name="bpage-valuta"
                label="Valuta"
                value={config.valuta}
                onChange={e => set('valuta', e.target.value)}
                options={VALUTE.map(([v, l]) => ({ value: v, label: l }))}
              />
              <SelectField
                className="bgen__field"
                name="bpage-tema"
                label="Tema"
                value={config.tema}
                onChange={e => set('tema', e.target.value as BookingPageConfig['tema'])}
                options={[{ value: 'light', label: 'Chiaro' }, { value: 'dark', label: 'Scuro' }]}
              />
              <SelectField
                className="bgen__field"
                name="bpage-content-width"
                label="Larghezza contenuti"
                value={config.contentWidth}
                onChange={e => set('contentWidth', e.target.value as BookingPageConfig['contentWidth'])}
                options={[{ value: 'boxed', label: 'Incolonnata (max-width)' }, { value: 'full', label: 'A tutta pagina' }]}
              />
            </div>

            <div className="bgen__field bgen__field--full">
              <label className="bgen__label">Colore primario (accento)</label>
              <Palette value={config.accent} onPick={v => set('accent', v)} />
            </div>
            <div className="bgen__field bgen__field--full">
              <label className="bgen__label">Colore secondario</label>
              <Palette value={config.accent2} onPick={v => set('accent2', v)} />
            </div>
            <div className="bgen__field bgen__field--full">
              <label className="bgen__label">Colore testi</label>
              <div className="bgen__palette">
                <button type="button" className={`bgen__swatch bgen__swatch--auto${config.textColor === '' ? ' bgen__swatch--active' : ''}`} onClick={() => set('textColor', '')} title="Automatico">A</button>
                {['#FFFFFF', '#1B1D23', '#204769', '#C9A84C'].map(cv => (
                  <button key={cv} type="button" className={`bgen__swatch${config.textColor.toLowerCase() === cv.toLowerCase() ? ' bgen__swatch--active' : ''}`} style={{ '--sw': cv } as React.CSSProperties} onClick={() => set('textColor', cv)} aria-label={`Colore testo ${cv}`} />
                ))}
                <input type="color" className="bgen__color-input" value={config.textColor || '#1b1d23'} onChange={e => set('textColor', e.target.value)} aria-label="Colore testo personalizzato" />
              </div>
            </div>

            {/* ─── Header ─────────────────────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">
              Header
              <Toggle on={config.showHeader} onChange={v => set('showHeader', v)} />
            </h3>
            {config.showHeader && (
              <>
                <div className="bgen__field bgen__field--full">
                  <label className="bgen__label">Logo personalizzato</label>
                  <UploadRow
                    value={config.logoCustom}
                    placeholder="URL del logo (https://…) — vuoto = logo Sibylla"
                    onChange={v => set('logoCustom', v)}
                    onFile={f => readImageScaled(f, 480, 480, 'image/png', 1, d => set('logoCustom', d))}
                    isLogo
                  />
                </div>
                <div className="bgen__grid">
                  <SelectField
                    className="bgen__field"
                    name="bpage-logo-size"
                    label="Dimensione logo"
                    value={config.logoSize}
                    onChange={e => set('logoSize', Number(e.target.value))}
                    options={[
                      { value: 0, label: 'Automatica' },
                      { value: 20, label: 'Piccolo' },
                      { value: 28, label: 'Medio' },
                      { value: 36, label: 'Grande' },
                      { value: 44, label: 'Extra' },
                    ]}
                  />
                  <InputField
                    className="bgen__field"
                    name="bpage-header-cta"
                    label="Bottone in alto a destra"
                    placeholder="Es. Accedi (vuoto = nascosto)"
                    value={config.headerCtaText}
                    onChange={e => set('headerCtaText', e.target.value)}
                  />
                </div>
                <InputField
                  className="bgen__field bgen__field--full"
                  name="bpage-header-links"
                  label="Voci di navigazione"
                  placeholder="Separate da virgola — es. Soggiorni, Esperienze, Offerte"
                  value={config.headerLinks}
                  onChange={e => set('headerLinks', e.target.value)}
                />
              </>
            )}

            {/* ─── Hero ───────────────────────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">
              Hero
              <Toggle on={config.showHero} onChange={v => set('showHero', v)} />
            </h3>
            {config.showHero && (
              <>
                <InputField
                  className="bgen__field bgen__field--full"
                  name="bpage-hero-title"
                  label="Titolo"
                  placeholder="Vuoto = slogan predefinito del brand"
                  value={config.heroTitle}
                  onChange={e => set('heroTitle', e.target.value)}
                />
                <InputField
                  className="bgen__field bgen__field--full"
                  name="bpage-hero-subtitle"
                  label="Sottotitolo"
                  placeholder="Vuoto = riga servizi predefinita"
                  value={config.heroSubtitle}
                  onChange={e => set('heroSubtitle', e.target.value)}
                />
                <div className="bgen__field bgen__field--full">
                  <label className="bgen__label">Tipo di sfondo hero</label>
                  <div className="bgen__segmented">
                    <button type="button" className={`bgen__seg${config.heroBgMode === 'image' ? ' bgen__seg--active' : ''}`} onClick={() => set('heroBgMode', 'image')}>Immagine</button>
                    <button type="button" className={`bgen__seg${config.heroBgMode === 'color' ? ' bgen__seg--active' : ''}`} onClick={() => set('heroBgMode', 'color')}>Colore pieno</button>
                  </div>
                </div>
                {config.heroBgMode === 'color' ? (
                  <div className="bgen__field bgen__field--full">
                    <label className="bgen__label">Colore hero</label>
                    <Palette value={config.heroColor} onPick={v => set('heroColor', v)} />
                  </div>
                ) : (
                  <>
                    <div className="bgen__field bgen__field--full">
                      <label className="bgen__label">Immagine predefinita</label>
                      <div className="bgen__bg-grid">
                        <button type="button" className={`bgen__bg bgen__bg--auto${config.heroBackground === BG_AUTO && !config.heroBgCustom ? ' bgen__bg--active' : ''}`} onClick={() => { set('heroBackground', BG_AUTO); set('heroBgCustom', '') }}>Auto</button>
                        {BANNER_BACKGROUNDS.map(b => (
                          <button key={b.id} type="button" className={`bgen__bg${config.heroBackground === b.id && !config.heroBgCustom ? ' bgen__bg--active' : ''}`} style={{ '--bg-thumb': `url(${b.src})` } as React.CSSProperties} onClick={() => { set('heroBackground', b.id); set('heroBgCustom', '') }} title={b.label} aria-label={b.label} />
                        ))}
                      </div>
                    </div>
                    <div className="bgen__field bgen__field--full">
                      <label className="bgen__label">Immagine personalizzata</label>
                      <UploadRow
                        value={config.heroBgCustom}
                        placeholder="URL immagine (https://…)"
                        onChange={v => set('heroBgCustom', v)}
                        onFile={f => readImageScaled(f, 1920, 1280, 'image/jpeg', 0.82, d => set('heroBgCustom', d))}
                      />
                    </div>
                    <div className="bgen__field bgen__field--full">
                      <label className="bgen__label">Intensità velo scuro · {config.heroOverlay}%</label>
                      <input type="range" min={0} max={90} step={5} value={config.heroOverlay} onChange={e => set('heroOverlay', Number(e.target.value))} className="bpage__range" />
                    </div>
                  </>
                )}
              </>
            )}

            {/* ─── Ricerca ────────────────────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">Box di ricerca</h3>
            <div className="bgen__grid">
              <InputField
                className="bgen__field"
                name="bpage-search-title"
                label="Titolo box"
                placeholder="Vuoto = «Trova la tua struttura»"
                value={config.searchTitle}
                onChange={e => set('searchTitle', e.target.value)}
              />
              <InputField
                className="bgen__field"
                name="bpage-search-cta"
                label="Testo bottone Cerca"
                placeholder="Vuoto = «Cerca Hotel»"
                value={config.searchCtaText}
                onChange={e => set('searchCtaText', e.target.value)}
              />
            </div>
            <div className="bgen__field bgen__field--full">
              <label className="bgen__label">Campi visibili</label>
              <div className="bpage__fields">
                {BOOKING_FIELDS.map(([key, label]) => (
                  <label key={key} className={`bpage__chip${config.fields[key] ? ' bpage__chip--on' : ''}`}>
                    <input type="checkbox" checked={config.fields[key]} onChange={e => setField(key, e.target.checked)} />
                    {label}
                  </label>
                ))}
              </div>
              <span className="bgen__hint-inline">Gli stessi campi della pagina «Strutture ricettive». Disattiva quelli che non vuoi mostrare.</span>
            </div>

            {/* ─── Risultati ──────────────────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">
              Risultati
              <Toggle on={config.showResults} onChange={v => set('showResults', v)} />
            </h3>
            {config.showResults && (
              <>
                <InputField
                  className="bgen__field bgen__field--full"
                  name="bpage-results-title"
                  label="Titolo sezione"
                  placeholder="Vuoto = «Strutture disponibili»"
                  value={config.resultsTitle}
                  onChange={e => set('resultsTitle', e.target.value)}
                />
                <div className="bgen__grid">
                  <SelectField
                    className="bgen__field"
                    name="bpage-results-view"
                    label="Vista"
                    value={config.resultsView}
                    onChange={e => set('resultsView', e.target.value as BookingPageConfig['resultsView'])}
                    options={[{ value: 'grid', label: 'Griglia' }, { value: 'list', label: 'Lista' }]}
                  />
                  <div className="bgen__field">
                    <label className="bgen__label">Card mostrate · {config.resultsCount}</label>
                    <input type="range" min={2} max={12} step={1} value={config.resultsCount} onChange={e => set('resultsCount', Number(e.target.value))} className="bpage__range" />
                  </div>
                </div>
                <label className="bpage__check">
                  <input type="checkbox" checked={config.showSort} onChange={e => set('showSort', e.target.checked)} />
                  Mostra ordinamento ({CATEGORIES.length > 0 ? 'Ordina per…' : ''})
                </label>
              </>
            )}

            {/* ─── Layout / incorporamento ────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">Layout incorporamento</h3>
            <div className="bgen__grid">
              <SelectField
                className="bgen__field"
                name="bpage-layout-mode"
                label="Altezza iframe"
                value={config.layoutMode}
                onChange={e => set('layoutMode', e.target.value as BookingPageConfig['layoutMode'])}
                options={[
                  { value: 'fullscreen', label: 'Full-screen (100vh)' },
                  { value: 'fixed', label: 'Altezza fissa' },
                ]}
              />
              {config.layoutMode === 'fixed' && (
                <div className="bgen__field">
                  <label className="bgen__label">Altezza · {config.fixedHeight}px</label>
                  <input type="range" min={500} max={2000} step={50} value={config.fixedHeight} onChange={e => set('fixedHeight', Number(e.target.value))} className="bpage__range" />
                </div>
              )}
            </div>

            {/* ─── Footer ─────────────────────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">
              Footer
              <Toggle on={config.showFooter} onChange={v => set('showFooter', v)} />
            </h3>
            {config.showFooter && (
              <InputField
                className="bgen__field bgen__field--full"
                name="bpage-footer-text"
                label="Testo footer"
                placeholder="Vuoto = testo predefinito del brand"
                value={config.footerText}
                onChange={e => set('footerText', e.target.value)}
              />
            )}

            {/* ─── Tracciamento ───────────────────────────────────────────── */}
            <h3 className="bgen__section-title bgen__section-title--spaced">Tracciamento</h3>
            <div className="bgen__grid">
              <InputField
                className="bgen__field"
                name="bpage-affiliate-id"
                label="ID affiliato / partner"
                placeholder="Es. AFF-10234"
                value={config.affiliateId}
                onChange={e => set('affiliateId', e.target.value)}
              />
              <InputField
                className="bgen__field"
                name="bpage-utm-source"
                label="UTM source"
                placeholder="Es. sito-affiliato"
                value={config.utmSource}
                onChange={e => set('utmSource', e.target.value)}
              />
              <InputField
                className="bgen__field"
                name="bpage-utm-medium"
                label="UTM medium"
                placeholder="booking-page"
                value={config.utmMedium}
                onChange={e => set('utmMedium', e.target.value)}
              />
              <InputField
                className="bgen__field"
                name="bpage-utm-campaign"
                label="UTM campaign"
                placeholder="Es. estate-2026"
                value={config.utmCampaign}
                onChange={e => set('utmCampaign', e.target.value)}
              />
            </div>
          </section>

          {/* ─── Codice ───────────────────────────────────────────────────── */}
          <section className="bgen__code-pane bpage__code-pane">
            <div className="bgen__code-head">
              <h3 className="bgen__section-title">Codice da incollare</h3>
              <button type="button" className={`sib-btn sib-btn--primary sib-btn--sm${copied ? ' bgen__copy--done' : ''}`} onClick={copy}>
                <Ico n={copied ? 'check' : 'copy'} s={13} c="#fff" />
                {copied ? 'Copiato!' : 'Copia codice'}
              </button>
            </div>
            <p className="bgen__hint">
              Incolla lo snippet nel contenuto della pagina dell'affiliato: è un <code>iframe</code> autoconsistente, pensato per riempire l'area contenuti di un sito con header e sidenav esistenti.
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
  )
}

// ─── Sotto-componenti riusati ─────────────────────────────────────────────────────
function Palette({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  return (
    <div className="bgen__palette">
      {ACCENT_PRESETS.map(c => (
        <button key={c} type="button" className={`bgen__swatch${value.toLowerCase() === c.toLowerCase() ? ' bgen__swatch--active' : ''}`} style={{ '--sw': c } as React.CSSProperties} onClick={() => onPick(c)} aria-label={`Colore ${c}`} />
      ))}
      <input type="color" className="bgen__color-input" value={value} onChange={e => onPick(e.target.value)} aria-label="Colore personalizzato" />
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className={`bpage__switch${on ? ' bpage__switch--on' : ''}`} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span className="bpage__switch-knob" />
    </button>
  )
}

function UploadRow({ value, placeholder, onChange, onFile, isLogo }: {
  value: string
  placeholder: string
  onChange: (v: string) => void
  onFile: (f: File) => void
  isLogo?: boolean
}) {
  return (
    <>
      <div className="bgen__upload">
        <input className="sib-input" placeholder={placeholder} value={isDataUrl(value) ? '' : value} onChange={e => onChange(e.target.value)} />
        <label className="sib-btn sib-btn--secondary sib-btn--sm bgen__upload-btn">
          <Ico n="upload" s={13} c="var(--color-primary)" />
          Carica
          <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
        </label>
        {value && <button type="button" className="sib-btn sib-btn--ghost sib-btn--sm" onClick={() => onChange('')}>Rimuovi</button>}
      </div>
      {value && (
        <div className="bgen__thumb-row">
          <img className={`bgen__thumb${isLogo ? ' bgen__thumb--logo' : ''}`} src={value} alt="Anteprima" />
          <span className="bgen__hint-inline">
            {isDataUrl(value)
              ? 'Caricato da file: viene salvato con la pagina. Per il codice di terzi serve un URL pubblico.'
              : 'Da URL esterno.'}
          </span>
        </div>
      )}
    </>
  )
}
