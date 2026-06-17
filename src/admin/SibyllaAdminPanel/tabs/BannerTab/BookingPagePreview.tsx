import React, { useMemo } from 'react'
import Ico from '../../../../core/icons/Ico'
import type { BookingPageConfig } from './bookingPageData'
import { BRANDS, CATEGORIES, SORT_OPTIONS, labelsFor } from './bookingPageData'
import { SibyllaMark, SibyllaNetworkMark, BannerPhoto } from './BannerArt'
import { resolveBackground } from './backgrounds'
import { useStrutturaPlatformStore } from '../../../../store/useStrutturaPlatformStore'
import type { Struttura } from '../../strutture/types'

// ─────────────────────────────────────────────────────────────────────────────
//  BookingPagePreview — facsimile a tutta pagina della Pagina di Booking. Replica
//  header, hero, box di ricerca (campi della pagina "Strutture ricettive"), griglia
//  risultati (strutture reali pubblicate su Agorà) e footer. Brand e colori arrivano
//  via CSS custom properties; ogni stile visivo vive nel .sass (nessun inline-style).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  config: BookingPageConfig
  /** Mostra un finto contesto sito ospitante (header + sidenav) attorno alla pagina. */
  hostChrome?: boolean
}

interface CardModel {
  id: string
  name: string
  location: string
  stars: number
  image: string
  rooms: string
  price: number
}

const parseStars = (c: string): number => {
  const n = parseInt(c.replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

const formatRooms = (s: Struttura): string => {
  if (s.tipologieCamere.length === 0) return s.camere > 0 ? `${s.camere} camere disponibili` : 'Su richiesta'
  if (s.tipologieCamere.length === 1) return s.tipologieCamere[0].nome
  return `${s.tipologieCamere.length} tipologie · da ${s.tipologieCamere[0].nome}`
}

const minPrezzo = (s: Struttura): number => {
  const v = s.tipologieCamere.map(t => t.prezzoAgora).filter(p => p > 0)
  return v.length ? Math.min(...v) : 0
}

// Card di esempio quando nessuna struttura è pubblicata su Agorà (anteprima vuota).
const MOCK_CARDS: CardModel[] = [
  { id: 'm1', name: 'Grand Hotel Vittoria', location: 'Roma, Lazio', stars: 5, image: '', rooms: 'Suite vista città', price: 189 },
  { id: 'm2', name: 'Resort Baia Azzurra', location: 'Taormina, Sicilia', stars: 5, image: '', rooms: '3 tipologie · da Doppia Deluxe', price: 240 },
  { id: 'm3', name: 'Agriturismo Le Querce', location: 'Montalcino, Toscana', stars: 4, image: '', rooms: 'Camera matrimoniale', price: 96 },
  { id: 'm4', name: 'Borgo dei Limoni B&B', location: 'Amalfi, Campania', stars: 4, image: '', rooms: '2 tipologie · da Classic', price: 128 },
  { id: 'm5', name: 'Rifugio Cime Bianche', location: 'Cortina, Veneto', stars: 3, image: '', rooms: 'Camera alpina', price: 110 },
  { id: 'm6', name: 'Villa Marina Suites', location: 'Portofino, Liguria', stars: 5, image: '', rooms: 'Suite fronte mare', price: 320 },
]

function Stars({ n }: { n: number }) {
  return (
    <span className="bookpv-card__stars" aria-label={`${n} stelle`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={`bookpv-card__star${i < n ? ' bookpv-card__star--on' : ''}`}>★</span>
      ))}
    </span>
  )
}

/** Campo fittizio del box di ricerca (select/input non interattivo). */
function SearchField({ label, value, kind = 'select' }: { label: string; value: string; kind?: 'select' | 'input' | 'slider' }) {
  return (
    <label className="bookpv-search__field">
      <span className="bookpv-search__field-label">{label}</span>
      {kind === 'slider' ? (
        <span className="bookpv-search__slider">
          <span className="bookpv-search__slider-track"><span className="bookpv-search__slider-fill" /></span>
          <span className="bookpv-search__slider-val">{value}</span>
        </span>
      ) : (
        <span className={`bookpv-search__control bookpv-search__control--${kind}`}>{value}</span>
      )}
    </label>
  )
}

export default function BookingPagePreview({ config: c, hostChrome }: Props) {
  const L = labelsFor(c.lingua)
  const brand = BRANDS[c.brand]
  const strutture = useStrutturaPlatformStore(s => s.strutture)

  const cards = useMemo<CardModel[]>(() => {
    const real = strutture
      .filter(s => s.attiva && s.canali.agora.pubblicata)
      .map<CardModel>(s => ({
        id: s.id,
        name: s.nome,
        location: `${s.citta}${s.provincia ? `, ${s.provincia}` : ''}`,
        stars: parseStars(s.classificazione),
        image: s.fotoPrincipale || s.logoUrl,
        rooms: formatRooms(s),
        price: minPrezzo(s),
      }))
    const list = real.length ? real : MOCK_CARDS
    return list.slice(0, Math.max(1, c.resultsCount))
  }, [strutture, c.resultsCount])

  const heroColorMode = c.heroBgMode === 'color'
  const heroSrc = c.heroBgCustom.trim() || resolveBackground(c.heroBackground, 'horizontal').src
  const fallbackPhoto = resolveBackground(2, 'horizontal').src

  const logoSrc = c.logoCustom.trim() || undefined
  const navLinks = c.headerLinks.split(',').map(s => s.trim()).filter(Boolean)
  const heroTitle = c.heroTitle.trim() || brand.tagline || L.slogan
  const heroSub = c.heroSubtitle.trim() || L.services
  const searchTitle = c.searchTitle.trim() || L.searchTitle
  const searchCta = c.searchCtaText.trim() || L.search
  const resultsTitle = c.resultsTitle.trim() || L.resultsTitle
  const footerText = c.footerText.trim() || brand.footer

  const styleVars = {
    '--accent': c.accent,
    '--accent2': c.accent2,
    '--overlay': String(c.heroOverlay / 100),
    ...(c.textColor.trim() ? { '--page-ink': c.textColor } : {}),
    ...(heroColorMode ? { '--hero-color': c.heroColor } : {}),
    ...(c.logoSize > 0 ? { '--logo-h': `${c.logoSize}px` } : {}),
  } as React.CSSProperties

  const rootCls = [
    'bookpv',
    `bookpv--${c.brand}`,
    `bookpv--w-${c.contentWidth}`,
  ].join(' ')

  const page = (
    <div className={rootCls} data-tema={c.tema} style={styleVars}>
      {c.brand === 'sibyllanetwork' && c.showHeader && brand.topbar && (
        <div className="bookpv__topbar">
          <div className="bookpv__bar bookpv__topbar-inner">
            <span className="bookpv__wordmark"><b>Sibylla</b> Network</span>
            <span className="bookpv__topbar-tag">{brand.topbar}</span>
            {brand.phone && <span className="bookpv__topbar-phone">✆ {brand.phone}</span>}
          </div>
        </div>
      )}

      {c.showHeader && (
        <header className="bookpv__header">
          <div className="bookpv__bar">
            <span className="bookpv__logo">
              {c.brand === 'sibyllanetwork'
                ? <SibyllaNetworkMark tone={c.tema === 'dark' ? 'dark' : 'light'} src={logoSrc} height={c.logoSize} wordmark={false} />
                : <SibyllaMark tone={c.tema === 'dark' ? 'dark' : 'light'} src={logoSrc} height={c.logoSize} />}
            </span>
            {navLinks.length > 0 && (
              <nav className="bookpv__nav">
                {navLinks.map((n, i) => <span key={i} className="bookpv__nav-link">{n}</span>)}
              </nav>
            )}
            {c.headerCtaText.trim() && <span className="bookpv__header-cta">{c.headerCtaText.trim()}</span>}
          </div>
        </header>
      )}

      {c.showHero ? (
        <section className="bookpv__hero" data-mode={heroColorMode ? 'color' : 'image'}>
          {!heroColorMode && <BannerPhoto src={heroSrc} position="center" fit="cover" />}
          {!heroColorMode && <div className="bookpv__hero-scrim" />}
          <div className="bookpv__bar bookpv__hero-inner">
            <div className="bookpv__hero-copy">
              <h1 className="bookpv__hero-title">{heroTitle}</h1>
              <p className="bookpv__hero-sub">{heroSub}</p>
            </div>
            <SearchBox c={c} L={L} title={searchTitle} cta={searchCta} />
          </div>
        </section>
      ) : (
        <section className="bookpv__searchbar">
          <div className="bookpv__bar">
            <SearchBox c={c} L={L} title={searchTitle} cta={searchCta} flat />
          </div>
        </section>
      )}

      {c.showResults && (
        <section className="bookpv__results">
          <div className="bookpv__bar">
            <div className="bookpv__results-head">
              <div>
                <h2 className="bookpv__results-title">{resultsTitle}</h2>
                <span className="bookpv__results-count">{L.resultsCount(cards.length)}</span>
              </div>
              <div className="bookpv__results-controls">
                <span className="bookpv__view-toggle">
                  <span className={`bookpv__view-btn${c.resultsView === 'grid' ? ' bookpv__view-btn--active' : ''}`}>▦</span>
                  <span className={`bookpv__view-btn${c.resultsView === 'list' ? ' bookpv__view-btn--active' : ''}`}>≡</span>
                </span>
                {c.showSort && (
                  <span className="bookpv__sort">
                    <span className="bookpv__sort-label">{L.sortBy}</span>
                    <span className="bookpv-search__control bookpv-search__control--select bookpv__sort-select">{SORT_OPTIONS[0][1]}</span>
                  </span>
                )}
              </div>
            </div>

            <div className={`bookpv__grid${c.resultsView === 'list' ? ' bookpv__grid--list' : ''}`}>
              {cards.map(card => (
                <article key={card.id} className="bookpv-card">
                  <div className="bookpv-card__media">
                    <BannerPhoto src={card.image || fallbackPhoto} position="center" fit="cover" />
                    <span className="bookpv-card__fav">♡</span>
                  </div>
                  <div className="bookpv-card__body">
                    <Stars n={card.stars} />
                    <div className="bookpv-card__title">{card.name}</div>
                    <div className="bookpv-card__loc">{card.location}</div>
                    <div className="bookpv-card__rooms">{card.rooms}</div>
                    <div className="bookpv-card__meta">★ 4,8 · 128 {L.reviews}</div>
                    <div className="bookpv-card__footer">
                      <span className="bookpv-card__price">
                        <span className="bookpv-card__price-from">{L.from}</span>
                        <span className="bookpv-card__price-val">€ {card.price || 89}</span>
                        <span className="bookpv-card__price-unit">{L.perNight}</span>
                      </span>
                      <span className="bookpv-card__book">{L.book}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {c.showFooter && (
        <footer className="bookpv__footer">
          <div className="bookpv__bar bookpv__footer-inner">
            <span className="bookpv__footer-logo">
              {c.brand === 'sibyllanetwork'
                ? <SibyllaNetworkMark tone="dark" src={logoSrc} height={c.logoSize} />
                : <SibyllaMark tone="dark" src={logoSrc} height={c.logoSize} />}
            </span>
            <span className="bookpv__footer-text">{footerText}</span>
            <span className="bookpv__footer-by">© {brand.name}</span>
          </div>
        </footer>
      )}
    </div>
  )

  if (!hostChrome) return page

  // Contesto sito ospitante (anteprima): header + sidenav del sito di terzi che
  // incorpora la pagina via iframe. Aiuta a valutare l'inserimento reale.
  return (
    <div className="bookhost">
      <div className="bookhost__topbar">
        <span className="bookhost__brand">Sito affiliato</span>
        <span className="bookhost__dots"><i /><i /><i /></span>
      </div>
      <div className="bookhost__body">
        <aside className="bookhost__sidenav">
          {['Home', 'Servizi', 'Prenota', 'Contatti', 'Area riservata'].map((i, idx) => (
            <span key={i} className={`bookhost__navitem${idx === 2 ? ' bookhost__navitem--active' : ''}`}>{i}</span>
          ))}
        </aside>
        <div className="bookhost__content">
          <div className="bookhost__iframe-label">iframe Sibylla</div>
          {page}
        </div>
      </div>
    </div>
  )
}

// ─── Box di ricerca ──────────────────────────────────────────────────────────────
function SearchBox({ c, L, title, cta, flat }: {
  c: BookingPageConfig
  L: ReturnType<typeof labelsFor>
  title: string
  cta: string
  flat?: boolean
}) {
  const f = c.fields
  return (
    <div className={`bookpv-search${flat ? ' bookpv-search--flat' : ''}`}>
      {!flat && <div className="bookpv-search__title">{title}</div>}
      <div className="bookpv-search__grid">
        {f.city && <SearchField label={L.city} value={L.all} />}
        {f.province && <SearchField label={L.province} value={L.all} />}
        {f.dates && <SearchField label={L.checkin} value="—" kind="input" />}
        {f.dates && <SearchField label={L.checkout} value="—" kind="input" />}
        {f.adults && <SearchField label={L.adults} value="2" kind="input" />}
        {f.children && <SearchField label={L.children} value="0" kind="input" />}
        {f.category && <SearchField label={L.category} value={CATEGORIES[0][1]} />}
        {f.budget && <SearchField label={L.budget} value="€ 1500" kind="slider" />}
      </div>
      <div className="bookpv-search__cta-row">
        <button type="button" className="bookpv-search__cta" tabIndex={-1}>
          <Ico n="search" s={15} c="#fff" />
          {cta}
        </button>
      </div>
    </div>
  )
}
