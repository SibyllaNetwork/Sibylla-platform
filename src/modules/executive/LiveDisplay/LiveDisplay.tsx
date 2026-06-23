import React, { useState } from 'react'
import BtnBack from '../../../core/components/BtnBack'
import PageHeader from '../../../core/components/PageHeader'
import { useLiveDisplayStore, FONTS, fontStack, type SezioneId, type LiveConfig } from '../../../store/useLiveDisplayStore'
import './LiveDisplay.sass'

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=900&q=70&auto=format&fit=crop`

// Copertine selezionabili per l'hero (esempi di stile).
const COVERS: { id: string; label: string; url: string }[] = [
  { id: 'mediterraneo', label: 'Mediterraneo', url: IMG('photo-1507525428034-b723cf961d3e') },
  { id: 'esploratore',  label: 'Esploratore',  url: IMG('photo-1469854523086-cc02fe5d8800') },
  { id: 'editoriale',   label: 'Città d\'arte', url: IMG('photo-1499678329028-101435549a4e') },
  { id: 'luxury',       label: 'Luxury',        url: IMG('photo-1540555700478-4be289fbecef') },
  { id: 'montagna',     label: 'Montagna',      url: IMG('photo-1464822759023-fed622ff2c3b') },
]
// Se l'id corrisponde a un preset usa la sua immagine, altrimenti l'id è già
// un URL o un'immagine caricata (data URL).
const coverUrl = (id: string) => COVERS.find((c) => c.id === id)?.url ?? (id || COVERS[0].url)

const MAX_IMG_BYTES = 3 * 1024 * 1024 // 3 MB

// Campo immagine riutilizzabile: anteprima + upload (max 3 MB) + URL.
function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [err, setErr] = useState('')
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) { setErr('Seleziona un file immagine'); return }
    if (f.size > MAX_IMG_BYTES) { setErr('Immagine troppo grande (max 3 MB)'); return }
    setErr('')
    const r = new FileReader()
    r.onload = () => onChange(String(r.result))
    r.readAsDataURL(f)
  }
  const caricata = value.startsWith('data:')
  return (
    <div className="ld__img">
      <span className="ld__img-thumb" style={{ backgroundImage: `url(${value})` }} aria-hidden="true" />
      <div className="ld__img-ctrl">
        <label className="ld__img-btn">
          <i className="fa-light fa-arrow-up-from-bracket" aria-hidden="true" /> Carica
          <input type="file" accept="image/*" onChange={onFile} hidden />
        </label>
        <input
          className="sib-input"
          placeholder={caricata ? 'Immagine caricata · incolla un URL per sostituire' : 'oppure URL immagine'}
          value={caricata ? '' : value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {err && <span className="ld__img-err"><i className="fa-light fa-circle-exclamation" aria-hidden="true" /> {err}</span>}
    </div>
  )
}

// Servizi in evidenza (fissi).
const SERVIZI = [
  { label: 'Transfer', icon: 'car' }, { label: 'Spa', icon: 'spa' },
  { label: 'Ristorante', icon: 'utensils' }, { label: 'Escursioni', icon: 'compass' },
  { label: 'Eventi', icon: 'ticket' },
]
const eur = (n: number) => `€ ${n.toLocaleString('it-IT')}`

// Icona per blocco/sezione (palette e composer drag & drop).
const SEC_META: Record<SezioneId, string> = {
  destinazioni: 'images',
  strutture: 'hotel',
  servizi: 'bell-concierge',
  pacchetti: 'box-open',
  contatti: 'address-book',
}

// Miniatura ricca del blocco (anteprima stilizzata) usata nella palette.
function BlockMini({ kind, items }: { kind: SezioneId; items: LiveConfig['items'] }) {
  if (kind === 'destinazioni')
    return <div className="bm bm--photos">{items.destinazioni.slice(0, 3).map((d) => <span key={d.id} style={{ backgroundImage: `url(${d.img})` }} />)}</div>
  if (kind === 'strutture')
    return <div className="bm bm--photos bm--4">{items.strutture.slice(0, 4).map((s) => <span key={s.id} style={{ backgroundImage: `url(${s.img})` }} />)}</div>
  if (kind === 'servizi')
    return <div className="bm bm--pills">{[0, 1, 2, 3].map((i) => <span key={i} />)}</div>
  if (kind === 'pacchetti')
    return <div className="bm bm--cards">{items.pacchetti.slice(0, 3).map((p) => <span key={p.id}><b /><i /></span>)}</div>
  return <div className="bm bm--lines">{[0, 1, 2].map((i) => <span key={i} />)}</div>
}

// ─── Pagina builder ─────────────────────────────────────────────────────────
export default function LiveDisplay({ navigate }: { navigate: (p: string) => void }) {
  const pages = useLiveDisplayStore((s) => s.pages)
  const currentId = useLiveDisplayStore((s) => s.currentId)
  const { newPage, selectPage, renamePage, deletePage, duplicatePage, setBrand, setTheme, setHero, setContatti, setSocial, setSectionLabel, toggleSection, dropSection, addItem, updateItem, removeItem, reset } = useLiveDisplayStore()
  const [salvato, setSalvato] = useState(false)
  const [copied, setCopied] = useState(false)

  const current = pages.find((p) => p.id === currentId) ?? pages[0]
  const config = current.config
  const { brand, theme, hero, sections, items, contatti, social } = config

  const shareLink = `https://vetrine.sibyllanetwork.it/${current.slug}`
  const copyLink = async () => {
    try { await navigator.clipboard?.writeText(shareLink) } catch { /* no-op */ }
    setCopied(true); window.setTimeout(() => setCopied(false), 2000)
  }

  // ── Drag & drop dei blocchi (sezioni) ───────────────────────────────────────
  const [dragId, setDragId] = useState<SezioneId | null>(null)
  const [overZone, setOverZone] = useState<string | null>(null)
  const palette = sections.filter((s) => !s.visible)
  const onZoneDrop = (beforeId: SezioneId | null) => {
    if (dragId) dropSection(dragId, beforeId, true)
    setDragId(null); setOverZone(null)
  }
  const visibili = sections.filter((s) => s.visible)

  const vars = {
    ['--vt-primary' as string]: theme.primary,
    ['--vt-accent' as string]: theme.accent,
    ['--vt-bg' as string]: theme.bg,
    ['--vt-text' as string]: theme.text,
    ['--vt-font' as string]: fontStack(theme.font),
    ['--vt-radius' as string]: `${theme.radius}px`,
  } as React.CSSProperties

  const salva = () => { setSalvato(true); window.setTimeout(() => setSalvato(false), 2500) }

  return (
    <div className="ld">
      <BtnBack onClick={() => navigate('home')} />
      <div className="ld__top">
        <PageHeader title="Live display" subtitle="Crea e personalizza la tua vetrina: layout, colori, font, testi e link" />
        <div className="ld__top-actions">
          {salvato && <span className="ld__saved"><i className="fa-light fa-circle-check" aria-hidden="true" /> Pagina pubblicata</span>}
          <button type="button" className="sib-btn sib-btn--ghost" onClick={reset}><i className="fa-light fa-arrow-rotate-left" aria-hidden="true" /> Ripristina</button>
          <button type="button" className="sib-btn sib-btn--secondary" onClick={() => window.open(shareLink, '_blank', 'noopener')}><i className="fa-light fa-arrow-up-right-from-square" aria-hidden="true" /> Anteprima</button>
          <button type="button" className="sib-btn sib-btn--primary" onClick={salva}><i className="fa-light fa-cloud-arrow-up" aria-hidden="true" /> Pubblica</button>
        </div>
      </div>

      {/* ── Le mie pagine: salva con nome, modifica, elimina, link condivisione ── */}
      <div className="ld__pages">
        <div className="ld__pages-list">
          {pages.map((p) => (
            <button key={p.id} type="button" className={`ld__page${p.id === currentId ? ' is-active' : ''}`} onClick={() => selectPage(p.id)} title={p.nome}>
              <i className="fa-light fa-window-maximize" aria-hidden="true" /> {p.nome}
            </button>
          ))}
          <button type="button" className="ld__page-add" onClick={newPage}><i className="fa-light fa-plus" aria-hidden="true" /> Nuova pagina</button>
        </div>
        <div className="ld__pages-bar">
          <label className="ld__pages-name">
            <span>Nome pagina</span>
            <input className="sib-input" value={current.nome} onChange={(e) => renamePage(current.id, e.target.value)} />
          </label>
          <button type="button" className="sib-btn sib-btn--icon" title="Duplica pagina" onClick={() => duplicatePage(current.id)}><i className="fa-light fa-copy" aria-hidden="true" /></button>
          <button type="button" className="sib-btn sib-btn--icon" title="Elimina pagina" onClick={() => deletePage(current.id)} disabled={pages.length <= 1}><i className="fa-light fa-trash" aria-hidden="true" /></button>
          <div className="ld__share">
            <i className="fa-light fa-link ld__share-ico" aria-hidden="true" />
            <input className="sib-input ld__share-url" readOnly value={shareLink} onFocus={(e) => e.target.select()} />
            <button type="button" className="sib-btn sib-btn--secondary" onClick={copyLink}>
              <i className={`fa-light fa-${copied ? 'check' : 'copy'}`} aria-hidden="true" /> {copied ? 'Copiato' : 'Copia link'}
            </button>
          </div>
        </div>
      </div>

      <div className="ld__workspace">
        {/* ── Editor ──────────────────────────────────────────────────────────── */}
        <aside className="ld__editor">
          {/* Brand */}
          <div className="ld__card">
            <h3 className="ld__card-title"><i className="fa-light fa-store" aria-hidden="true" /> Brand & dominio</h3>
            <label className="ld__field"><span>Nome vetrina</span><input className="sib-input" value={brand.nome} onChange={(e) => setBrand({ nome: e.target.value })} /></label>
            <label className="ld__field"><span>Payoff</span><input className="sib-input" value={brand.payoff} onChange={(e) => setBrand({ payoff: e.target.value })} /></label>
            <label className="ld__field"><span>Dominio / sito</span><input className="sib-input" value={social.sito} onChange={(e) => setSocial({ sito: e.target.value })} /></label>
          </div>

          {/* Hero */}
          <div className="ld__card">
            <h3 className="ld__card-title"><i className="fa-light fa-heading" aria-hidden="true" /> Sezione hero</h3>
            <label className="ld__field"><span>Titolo</span><input className="sib-input" value={hero.titolo} onChange={(e) => setHero({ titolo: e.target.value })} /></label>
            <label className="ld__field"><span>Sottotitolo</span><textarea className="sib-input ld__textarea" rows={2} value={hero.sottotitolo} onChange={(e) => setHero({ sottotitolo: e.target.value })} /></label>
            <div className="ld__row2">
              <label className="ld__field"><span>Testo pulsante</span><input className="sib-input" value={hero.ctaLabel} onChange={(e) => setHero({ ctaLabel: e.target.value })} /></label>
              <label className="ld__field"><span>Link pulsante</span><input className="sib-input" value={hero.ctaUrl} onChange={(e) => setHero({ ctaUrl: e.target.value })} /></label>
            </div>
            <div className="ld__row2">
              <div className="ld__field">
                <span>Allineamento</span>
                <div className="ld__seg">
                  {(['left', 'center'] as const).map((a) => (
                    <button key={a} type="button" className={`ld__seg-btn${hero.align === a ? ' is-active' : ''}`} onClick={() => setHero({ align: a })}>
                      <i className={`fa-light fa-align-${a}`} aria-hidden="true" /> {a === 'left' ? 'Sinistra' : 'Centro'}
                    </button>
                  ))}
                </div>
              </div>
              <label className="ld__field">
                <span>Copertina</span>
                <select className="sib-select" value={COVERS.some((c) => c.id === hero.coverId) ? hero.coverId : ''} onChange={(e) => setHero({ coverId: e.target.value })}>
                  {COVERS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  {!COVERS.some((c) => c.id === hero.coverId) && <option value="">Personalizzata</option>}
                </select>
              </label>
            </div>
            <label className="ld__field"><span>Copertina personalizzata</span>
              <ImageField value={coverUrl(hero.coverId)} onChange={(v) => setHero({ coverId: v })} />
            </label>
          </div>

          {/* Aspetto */}
          <div className="ld__card">
            <h3 className="ld__card-title"><i className="fa-light fa-palette" aria-hidden="true" /> Aspetto</h3>
            <div className="ld__colors">
              {([
                ['primary', 'Primario'], ['accent', 'Accento'], ['bg', 'Sfondo'], ['text', 'Testo'],
              ] as const).map(([k, lbl]) => (
                <label key={k} className="ld__color">
                  <span className="ld__color-swatch" style={{ background: theme[k] }}>
                    <input type="color" value={theme[k]} onChange={(e) => setTheme({ [k]: e.target.value } as Partial<typeof theme>)} />
                  </span>
                  <span className="ld__color-lbl">{lbl}</span>
                </label>
              ))}
            </div>
            <label className="ld__field"><span>Font</span>
              <select className="sib-select" value={theme.font} onChange={(e) => setTheme({ font: e.target.value as typeof theme.font })}>
                {FONTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </label>
            <label className="ld__field"><span>Arrotondamento angoli — {theme.radius}px</span>
              <input type="range" min={0} max={28} value={theme.radius} onChange={(e) => setTheme({ radius: Number(e.target.value) })} />
            </label>
          </div>

          {/* Layout: palette dei blocchi (trascinabili nell'anteprima) */}
          <div className="ld__card">
            <h3 className="ld__card-title"><i className="fa-light fa-table-cells-large" aria-hidden="true" /> Blocchi della vetrina</h3>
            <p className="ld__hint">Trascina un blocco nelle aree tratteggiate dell'anteprima per inserirlo. Nell'anteprima puoi riordinare e rimuovere i blocchi.</p>
            {palette.length === 0 ? (
              <span className="ld__palette-empty">Tutti i blocchi sono nella vetrina.</span>
            ) : (
              <div className="ld__tiles">
                {palette.map((sec) => (
                  <div
                    key={sec.id}
                    className={`ld__tile${dragId === sec.id ? ' is-dragging' : ''}`}
                    draggable
                    onDragStart={() => setDragId(sec.id)}
                    onDragEnd={() => { setDragId(null); setOverZone(null) }}
                  >
                    <div className="ld__tile-mini"><BlockMini kind={sec.id} items={items} /></div>
                    <div className="ld__tile-foot">
                      <i className="fa-solid fa-grip-vertical" aria-hidden="true" />
                      <i className={`fa-light fa-${SEC_META[sec.id]}`} aria-hidden="true" />
                      <span>{sec.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contenuti: destinazioni / strutture / pacchetti */}
          <div className="ld__card">
            <h3 className="ld__card-title"><i className="fa-light fa-images" aria-hidden="true" /> Contenuti</h3>
            <p className="ld__hint">Aggiungi, modifica e rimuovi destinazioni, strutture e pacchetti (con prezzi e immagini).</p>

            {/* Destinazioni */}
            <div className="ld__items">
              <div className="ld__items-head"><span>Destinazioni in evidenza</span><button type="button" className="ld__add" onClick={() => addItem('destinazioni')}><i className="fa-light fa-plus" aria-hidden="true" /> Aggiungi</button></div>
              {items.destinazioni.map((d) => (
                <div key={d.id} className="ld__item">
                  <input className="sib-input" placeholder="Nome" value={d.nome} onChange={(e) => updateItem('destinazioni', d.id, { nome: e.target.value })} />
                  <div className="ld__item-row">
                    <input className="sib-input" placeholder="Tag" value={d.tag} onChange={(e) => updateItem('destinazioni', d.id, { tag: e.target.value })} />
                    <div className="ld__price"><span>€</span><input className="sib-input" type="number" placeholder="da" value={d.da} onChange={(e) => updateItem('destinazioni', d.id, { da: Number(e.target.value) || 0 })} /></div>
                    <button type="button" className="ld__del" onClick={() => removeItem('destinazioni', d.id)} aria-label="Rimuovi"><i className="fa-light fa-trash" aria-hidden="true" /></button>
                  </div>
                  <ImageField value={d.img} onChange={(v) => updateItem('destinazioni', d.id, { img: v })} />
                </div>
              ))}
            </div>

            {/* Strutture */}
            <div className="ld__items">
              <div className="ld__items-head"><span>Strutture</span><button type="button" className="ld__add" onClick={() => addItem('strutture')}><i className="fa-light fa-plus" aria-hidden="true" /> Aggiungi</button></div>
              {items.strutture.map((s) => (
                <div key={s.id} className="ld__item">
                  <div className="ld__item-row">
                    <input className="sib-input" placeholder="Nome" value={s.nome} onChange={(e) => updateItem('strutture', s.id, { nome: e.target.value })} />
                    <input className="sib-input" placeholder="Città" value={s.citta} onChange={(e) => updateItem('strutture', s.id, { citta: e.target.value })} />
                    <button type="button" className="ld__del" onClick={() => removeItem('strutture', s.id)} aria-label="Rimuovi"><i className="fa-light fa-trash" aria-hidden="true" /></button>
                  </div>
                  <ImageField value={s.img} onChange={(v) => updateItem('strutture', s.id, { img: v })} />
                </div>
              ))}
            </div>

            {/* Pacchetti */}
            <div className="ld__items">
              <div className="ld__items-head"><span>Pacchetti</span><button type="button" className="ld__add" onClick={() => addItem('pacchetti')}><i className="fa-light fa-plus" aria-hidden="true" /> Aggiungi</button></div>
              {items.pacchetti.map((p) => (
                <div key={p.id} className="ld__item">
                  <input className="sib-input" placeholder="Nome" value={p.nome} onChange={(e) => updateItem('pacchetti', p.id, { nome: e.target.value })} />
                  <div className="ld__item-row">
                    <div className="ld__price"><input className="sib-input" type="number" placeholder="notti" value={p.notti} onChange={(e) => updateItem('pacchetti', p.id, { notti: Number(e.target.value) || 0 })} /><span>notti</span></div>
                    <div className="ld__price"><span>€</span><input className="sib-input" type="number" placeholder="da" value={p.da} onChange={(e) => updateItem('pacchetti', p.id, { da: Number(e.target.value) || 0 })} /></div>
                    <button type="button" className="ld__del" onClick={() => removeItem('pacchetti', p.id)} aria-label="Rimuovi"><i className="fa-light fa-trash" aria-hidden="true" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contatti & social */}
          <div className="ld__card">
            <h3 className="ld__card-title"><i className="fa-light fa-address-book" aria-hidden="true" /> Contatti & social</h3>
            <label className="ld__field"><span>Email</span><input className="sib-input" value={contatti.email} onChange={(e) => setContatti({ email: e.target.value })} /></label>
            <div className="ld__row2">
              <label className="ld__field"><span>Telefono</span><input className="sib-input" value={contatti.telefono} onChange={(e) => setContatti({ telefono: e.target.value })} /></label>
              <label className="ld__field"><span>Indirizzo</span><input className="sib-input" value={contatti.indirizzo} onChange={(e) => setContatti({ indirizzo: e.target.value })} /></label>
            </div>
            <div className="ld__row2">
              <label className="ld__field"><span>Instagram</span><input className="sib-input" value={social.instagram} onChange={(e) => setSocial({ instagram: e.target.value })} /></label>
              <label className="ld__field"><span>Facebook</span><input className="sib-input" value={social.facebook} onChange={(e) => setSocial({ facebook: e.target.value })} /></label>
            </div>
          </div>
        </aside>

        {/* ── Anteprima live ──────────────────────────────────────────────────── */}
        <div className="ld__stage">
          <div className="ld__browser">
            <div className="ld__browser-bar">
              <span className="ld__dot" /><span className="ld__dot" /><span className="ld__dot" />
              <span className="ld__browser-url"><i className="fa-light fa-lock" aria-hidden="true" /> {shareLink.replace(/^https?:\/\//, '')}</span>
            </div>
            <div className="ld__browser-scroll">
              <div className={`vt${dragId ? ' vt--composing' : ''}`} style={vars}>
                {/* Nav */}
                <header className="vt__nav">
                  <span className="vt__brand">{brand.nome}</span>
                  <nav className="vt__menu">
                    {visibili.map((s) => <span key={s.id}>{s.label}</span>)}
                  </nav>
                </header>

                {/* Hero */}
                <section className={`vt__hero vt__hero--${hero.align}`} style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55)), url(${coverUrl(hero.coverId)})` }}>
                  <span className="vt__hero-payoff">{brand.payoff}</span>
                  <h1 className="vt__hero-title">{hero.titolo}</h1>
                  <p className="vt__hero-sub">{hero.sottotitolo}</p>
                  <a className="vt__cta" href={hero.ctaUrl} target="_blank" rel="noopener noreferrer">{hero.ctaLabel}</a>
                </section>

                {/* Sezioni in ordine — con aree tratteggiate per il drag & drop */}
                {visibili.map((sec) => (
                  <React.Fragment key={sec.id}>
                    <div
                      className={`vt__zone${overZone === sec.id ? ' is-over' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setOverZone(sec.id) }}
                      onDragLeave={() => setOverZone((z) => (z === sec.id ? null : z))}
                      onDrop={(e) => { e.preventDefault(); onZoneDrop(sec.id) }}
                    >
                      <span><i className="fa-light fa-plus" aria-hidden="true" /> Rilascia il blocco qui</span>
                    </div>
                    <section className="vt__sec vt__sec--editable">
                      <div className="vt__sec-tools">
                        <span className="vt__tool vt__tool--grip" draggable onDragStart={() => setDragId(sec.id)} onDragEnd={() => { setDragId(null); setOverZone(null) }} title="Trascina per spostare"><i className="fa-solid fa-grip-vertical" aria-hidden="true" /></span>
                        <button type="button" className="vt__tool" onClick={() => toggleSection(sec.id)} title="Rimuovi dalla vetrina"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
                      </div>
                      <input className="vt__sec-title vt__title-input" value={sec.label} onChange={(e) => setSectionLabel(sec.id, e.target.value)} aria-label="Titolo sezione" />
                    {sec.id === 'destinazioni' && (
                      <div className="vt__grid vt__grid--3">
                        {items.destinazioni.map((d) => (
                          <div key={d.id} className="vt__dest" style={{ backgroundImage: `url(${d.img})` }}>
                            <span className="vt__dest-tag">{d.tag}</span>
                            <span className="vt__dest-info"><strong>{d.nome}</strong><span>da {eur(d.da)}</span></span>
                          </div>
                        ))}
                      </div>
                    )}
                    {sec.id === 'strutture' && (
                      <div className="vt__grid vt__grid--4">
                        {items.strutture.map((s) => (
                          <div key={s.id} className="vt__card">
                            <span className="vt__card-img" style={{ backgroundImage: `url(${s.img})` }} />
                            <span className="vt__card-name">{s.nome}</span>
                            <span className="vt__card-meta">{s.citta}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {sec.id === 'servizi' && (
                      <div className="vt__chips">
                        {SERVIZI.map((sv) => <span key={sv.label} className="vt__chip"><i className={`fa-light fa-${sv.icon}`} aria-hidden="true" /> {sv.label}</span>)}
                      </div>
                    )}
                    {sec.id === 'pacchetti' && (
                      <div className="vt__grid vt__grid--3">
                        {items.pacchetti.map((p) => (
                          <div key={p.id} className="vt__pkg">
                            <strong>{p.nome}</strong>
                            <span className="vt__pkg-meta">{p.notti} notti</span>
                            <span className="vt__pkg-price">da {eur(p.da)}</span>
                            <a className="vt__cta vt__cta--sm" href={hero.ctaUrl} target="_blank" rel="noopener noreferrer">Scopri</a>
                          </div>
                        ))}
                      </div>
                    )}
                    {sec.id === 'contatti' && (
                      <div className="vt__contatti">
                        <span><i className="fa-light fa-envelope" aria-hidden="true" /> {contatti.email}</span>
                        <span><i className="fa-light fa-phone" aria-hidden="true" /> {contatti.telefono}</span>
                        <span><i className="fa-light fa-location-dot" aria-hidden="true" /> {contatti.indirizzo}</span>
                      </div>
                    )}
                    </section>
                  </React.Fragment>
                ))}

                {/* Area finale: trascina qui per aggiungere in fondo */}
                <div
                  className={`vt__zone vt__zone--end${overZone === '__end' ? ' is-over' : ''}${visibili.length === 0 ? ' vt__zone--empty' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setOverZone('__end') }}
                  onDragLeave={() => setOverZone((z) => (z === '__end' ? null : z))}
                  onDrop={(e) => { e.preventDefault(); onZoneDrop(null) }}
                >
                  <span><i className="fa-light fa-arrow-down-to-line" aria-hidden="true" /> {visibili.length === 0 ? 'Trascina qui un blocco per iniziare' : 'Trascina qui per aggiungere in fondo'}</span>
                </div>

                {/* Footer */}
                <footer className="vt__footer">
                  <span>© {brand.nome}</span>
                  <span className="vt__footer-social">
                    {social.instagram && <i className="fa-brands fa-instagram" aria-hidden="true" />}
                    {social.facebook && <i className="fa-brands fa-facebook" aria-hidden="true" />}
                  </span>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
