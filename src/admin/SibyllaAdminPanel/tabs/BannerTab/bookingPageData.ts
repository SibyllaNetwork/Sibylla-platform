// ─────────────────────────────────────────────────────────────────────────────
//  Pagina di Booking — modello dati, preset di brand, etichette e generatore del
//  codice iframe per una pagina di prenotazione FULL-SCREEN, da incorporare nel
//  sito di un affiliato che non dispone del servizio. La pagina replica i campi
//  di ricerca della pagina "Strutture ricettive" ed è interamente personalizzabile.
//
//  Due brandizzazioni predefinite (sovrascrivibili in ogni parte):
//    · Sibylla         → identità piattaforma (blu #204769 + oro #C9A84C)
//    · Sibylla Network → identità consumer di sibyllanetwork.com (arancio #F08526)
// ─────────────────────────────────────────────────────────────────────────────

import { isDataUrl } from './imageUtils'
import { BG_AUTO } from './backgrounds'

export type BookingBrand = 'sibylla' | 'sibyllanetwork'

// ─── Visibilità dei campi di ricerca (gli stessi di "Strutture ricettive") ──────
export interface BookingFieldVisibility {
  city: boolean
  province: boolean
  dates: boolean
  adults: boolean
  children: boolean
  category: boolean
  budget: boolean
}

export type BookingFieldKey = keyof BookingFieldVisibility

export const BOOKING_FIELDS: ReadonlyArray<readonly [BookingFieldKey, string]> = [
  ['city', 'Città'],
  ['province', 'Provincia'],
  ['dates', 'Date (check-in / check-out)'],
  ['adults', 'Adulti'],
  ['children', 'Bambini'],
  ['category', 'Categoria'],
  ['budget', 'Budget max'],
] as const

export interface BookingPageConfig {
  brand: BookingBrand
  // ── Generale ──
  lingua: string
  valuta: string
  tema: 'light' | 'dark'
  accent: string
  /** Colore secondario (oro/accento brand) per dettagli, stelle, bordi. */
  accent2: string
  /** Colore testi su superfici chiare; vuoto = automatico. */
  textColor: string
  /** Larghezza dei contenuti: a tutta pagina o incolonnati (max-width). */
  contentWidth: 'full' | 'boxed'
  /** Comportamento in altezza dell'iframe: tutto schermo o altezza fissa. */
  layoutMode: 'fullscreen' | 'fixed'
  fixedHeight: number
  // ── Header ──
  showHeader: boolean
  /** Logo personalizzato (URL/data-URL). Vuoto = marchio Sibylla. */
  logoCustom: string
  logoSize: number
  /** Voci di navigazione, separate da virgola. Vuoto = nessuna voce. */
  headerLinks: string
  /** Testo del bottone in alto a destra; vuoto = nascosto. */
  headerCtaText: string
  // ── Hero ──
  showHero: boolean
  /** Titolo hero; vuoto = slogan predefinito del brand/lingua. */
  heroTitle: string
  /** Sottotitolo hero; vuoto = riga servizi predefinita. */
  heroSubtitle: string
  heroBgMode: 'image' | 'color'
  /** Indice in BANNER_BACKGROUNDS oppure BG_AUTO. */
  heroBackground: number
  /** Sfondo hero personalizzato (URL/data-URL). Ha priorità su heroBackground. */
  heroBgCustom: string
  heroColor: string
  /** Intensità dello scrim sopra la foto hero (0–100). */
  heroOverlay: number
  // ── Ricerca ──
  /** Titolo del box di ricerca; vuoto = "Trova la tua struttura". */
  searchTitle: string
  searchCtaText: string
  fields: BookingFieldVisibility
  // ── Risultati ──
  showResults: boolean
  resultsTitle: string
  resultsView: 'grid' | 'list'
  showSort: boolean
  /** Numero di card mostrate nell'anteprima/pagina. */
  resultsCount: number
  // ── Footer ──
  showFooter: boolean
  footerText: string
  // ── Tracciamento ──
  affiliateId: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
}

// ─── Preset di brand ────────────────────────────────────────────────────────────
export interface BrandPreset {
  id: BookingBrand
  label: string
  /** Nome del brand usato nei testi predefiniti (slogan, footer). */
  name: string
  accent: string
  accent2: string
  /** Sfondo hero predefinito (indice in BANNER_BACKGROUNDS). */
  heroBackground: number
  tagline: string
  footer: string
  url: string
  /** Barra utility superiore (solo brand con identità consumer); vuoto = nascosta. */
  topbar?: string
  phone?: string
}

export const BRANDS: Record<BookingBrand, BrandPreset> = {
  sibylla: {
    id: 'sibylla', label: 'Sibylla', name: 'Sibylla',
    accent: '#204769', accent2: '#C9A84C', heroBackground: 0,
    tagline: 'Il tuo prossimo soggiorno inizia qui',
    footer: 'Prenotazioni e servizi per il turismo — powered by Sibylla',
    url: 'https://www.sibyllanetwork.com',
  },
  sibyllanetwork: {
    id: 'sibyllanetwork', label: 'Sibylla Network', name: 'Sibylla Network',
    accent: '#F08526', accent2: '#204769', heroBackground: 2,
    tagline: 'La rete che fa viaggiare l’Italia',
    footer: 'Sibylla Network — la rete di strutture e servizi per il turismo',
    url: 'https://www.sibyllanetwork.com',
    topbar: 'CHANGE THE WAY OF BUYING TRAVEL',
    phone: '+39 06 91714070',
  },
}

export const BRAND_LIST: BrandPreset[] = [BRANDS.sibylla, BRANDS.sibyllanetwork]

export const DEFAULT_FIELDS: BookingFieldVisibility = {
  city: true, province: true, dates: true, adults: true,
  children: true, category: true, budget: true,
}

export const DEFAULT_CONFIG: BookingPageConfig = {
  brand: 'sibylla',
  lingua: 'it',
  valuta: 'EUR',
  tema: 'light',
  accent: BRANDS.sibylla.accent,
  accent2: BRANDS.sibylla.accent2,
  textColor: '',
  contentWidth: 'boxed',
  layoutMode: 'fullscreen',
  fixedHeight: 900,
  showHeader: true,
  logoCustom: '',
  logoSize: 0,
  headerLinks: 'Soggiorni, Esperienze, Offerte',
  headerCtaText: 'Accedi',
  showHero: true,
  heroTitle: '',
  heroSubtitle: '',
  heroBgMode: 'image',
  heroBackground: BRANDS.sibylla.heroBackground,
  heroBgCustom: '',
  heroColor: '#204769',
  heroOverlay: 55,
  searchTitle: '',
  searchCtaText: '',
  fields: { ...DEFAULT_FIELDS },
  showResults: true,
  resultsTitle: '',
  resultsView: 'grid',
  showSort: true,
  resultsCount: 6,
  showFooter: true,
  footerText: '',
  affiliateId: '',
  utmSource: '',
  utmMedium: 'booking-page',
  utmCampaign: '',
}

/**
 * Applica un brand alla configurazione: imposta i colori-accento, lo sfondo hero
 * e il colore hero di default mantenendo le altre personalizzazioni dell'utente.
 */
export function applyBrand(c: BookingPageConfig, brand: BookingBrand): BookingPageConfig {
  const p = BRANDS[brand]
  return {
    ...c,
    brand,
    accent: p.accent,
    accent2: p.accent2,
    heroBackground: p.heroBackground,
    heroBgCustom: '',
    heroColor: p.accent,
  }
}

// ─── Opzioni dei select del configuratore ───────────────────────────────────────
export const LINGUE: ReadonlyArray<readonly [string, string]> = [
  ['it', 'Italiano'], ['en', 'English'], ['de', 'Deutsch'],
  ['fr', 'Français'], ['es', 'Español'],
] as const

export const VALUTE: ReadonlyArray<readonly [string, string]> = [
  ['EUR', '€ Euro'], ['USD', '$ Dollaro USA'], ['GBP', '£ Sterlina'], ['CHF', 'CHF Franco svizzero'],
] as const

export const ACCENT_PRESETS: string[] = [
  '#204769', '#C9A84C', '#F08526', '#007035', '#D10011', '#5C9CD4', '#5E6AD2', '#1B1D23',
]

// ─── Etichette della pagina, per lingua ─────────────────────────────────────────
export interface BookingLabels {
  // header / generale
  login: string
  // hero
  slogan: string
  services: string
  // box ricerca
  searchTitle: string
  city: string
  province: string
  checkin: string
  checkout: string
  adults: string
  children: string
  category: string
  budget: string
  search: string
  all: string
  // risultati
  resultsTitle: string
  resultsCount: (n: number) => string
  sortBy: string
  from: string
  perNight: string
  book: string
  reviews: string
  // footer
  footer: string
}

const IT: BookingLabels = {
  login: 'Accedi',
  slogan: 'Il tuo prossimo soggiorno inizia qui',
  services: 'Ricerca soggiorni · Prenotazioni turistiche · Servizi per il turismo',
  searchTitle: 'Trova la tua struttura',
  city: 'Seleziona Città', province: 'Provincia', checkin: 'Data Inizio', checkout: 'Data Fine',
  adults: 'Adulti', children: 'Bambini', category: 'Categoria', budget: 'Budget Max',
  search: 'Cerca Hotel', all: 'Tutte',
  resultsTitle: 'Strutture disponibili',
  resultsCount: (n) => `${n} ${n === 1 ? 'struttura trovata' : 'strutture trovate'}`,
  sortBy: 'Ordina per', from: 'da', perNight: '/ notte', book: 'Prenota', reviews: 'recensioni',
  footer: 'Prenotazioni e servizi per il turismo',
}

const EN: BookingLabels = {
  login: 'Sign in',
  slogan: 'Your next stay starts here',
  services: 'Stay search · Travel bookings · Tourism services',
  searchTitle: 'Find your stay',
  city: 'Select city', province: 'Province', checkin: 'Check-in', checkout: 'Check-out',
  adults: 'Adults', children: 'Children', category: 'Category', budget: 'Max budget',
  search: 'Search hotels', all: 'All',
  resultsTitle: 'Available stays',
  resultsCount: (n) => `${n} ${n === 1 ? 'property found' : 'properties found'}`,
  sortBy: 'Sort by', from: 'from', perNight: '/ night', book: 'Book', reviews: 'reviews',
  footer: 'Travel bookings and tourism services',
}

const LABELS: Record<string, BookingLabels> = { it: IT, en: EN }

export function labelsFor(lingua: string): BookingLabels {
  return LABELS[lingua] ?? IT
}

// ─── Categorie (allineate a "Strutture ricettive") ──────────────────────────────
export const CATEGORIES: ReadonlyArray<readonly [string, string]> = [
  ['all', 'Tutte le categorie'],
  ['hotel', 'Hotel'],
  ['resort', 'Resort / 5 stelle'],
  ['b&b', 'B&B'],
  ['agriturismo', 'Agriturismo'],
  ['villa', 'Villa'],
  ['apartment', 'Appartamento'],
] as const

export const SORT_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  ['recommended', 'Consigliati'],
  ['price-asc', 'Prezzo: crescente'],
  ['price-desc', 'Prezzo: decrescente'],
  ['stars-desc', 'Stelle: decrescenti'],
] as const

// ─── Generatore del codice embed ────────────────────────────────────────────────
const EMBED_BASE = 'https://embed.sibyllanetwork.com/booking-page'

export function buildPageUrl(c: BookingPageConfig): string {
  const q = new URLSearchParams()
  q.set('brand', c.brand)
  q.set('theme', c.tema)
  q.set('lang', c.lingua)
  q.set('currency', c.valuta)
  q.set('accent', c.accent.replace('#', ''))
  q.set('accent2', c.accent2.replace('#', ''))
  if (c.textColor.trim()) q.set('textcolor', c.textColor.replace('#', ''))
  if (c.contentWidth !== 'boxed') q.set('width', c.contentWidth)

  // Header
  if (!c.showHeader) q.set('header', '0')
  if (c.logoCustom.trim() && !isDataUrl(c.logoCustom)) q.set('logo', c.logoCustom.trim())
  if (c.logoSize > 0) q.set('logoh', String(c.logoSize))
  if (c.headerLinks.trim()) q.set('nav', c.headerLinks.trim())
  if (c.headerCtaText.trim()) q.set('headercta', c.headerCtaText.trim())

  // Hero
  if (!c.showHero) q.set('hero', '0')
  if (c.heroTitle.trim()) q.set('herotitle', c.heroTitle.trim())
  if (c.heroSubtitle.trim()) q.set('herosub', c.heroSubtitle.trim())
  if (c.heroBgMode === 'color') {
    q.set('herobg', 'color')
    q.set('herocolor', c.heroColor.replace('#', ''))
  } else {
    q.set('herobg', c.heroBackground === BG_AUTO ? 'auto' : String(c.heroBackground))
    if (c.heroBgCustom.trim() && !isDataUrl(c.heroBgCustom)) q.set('herourl', c.heroBgCustom.trim())
  }
  q.set('overlay', String(c.heroOverlay))

  // Ricerca — campi visibili (omessi i campi disattivati)
  if (c.searchTitle.trim()) q.set('searchtitle', c.searchTitle.trim())
  if (c.searchCtaText.trim()) q.set('searchcta', c.searchCtaText.trim())
  const hidden = (Object.keys(c.fields) as BookingFieldKey[]).filter(k => !c.fields[k])
  if (hidden.length) q.set('hide', hidden.join(','))

  // Risultati
  if (!c.showResults) q.set('results', '0')
  if (c.resultsTitle.trim()) q.set('resultstitle', c.resultsTitle.trim())
  if (c.resultsView !== 'grid') q.set('view', c.resultsView)
  if (!c.showSort) q.set('sort', '0')
  q.set('count', String(c.resultsCount))

  // Footer
  if (!c.showFooter) q.set('footer', '0')
  if (c.footerText.trim()) q.set('footertext', c.footerText.trim())

  // Tracciamento
  if (c.affiliateId.trim()) q.set('aid', c.affiliateId.trim())
  if (c.utmSource.trim()) q.set('utm_source', c.utmSource.trim())
  if (c.utmMedium.trim()) q.set('utm_medium', c.utmMedium.trim())
  if (c.utmCampaign.trim()) q.set('utm_campaign', c.utmCampaign.trim())

  return `${EMBED_BASE}?${q.toString()}`
}

export function buildPageCode(c: BookingPageConfig): string {
  const url = buildPageUrl(c)
  const heightStyle = c.layoutMode === 'fullscreen'
    ? 'height:100%;min-height:100vh'
    : `height:${c.fixedHeight}px`
  const heightAttr = c.layoutMode === 'fullscreen' ? '100%' : String(c.fixedHeight)
  return [
    `<!-- Pagina di Booking ${BRANDS[c.brand].name} · ${c.layoutMode === 'fullscreen' ? 'full-screen' : `${c.fixedHeight}px`} -->`,
    `<iframe`,
    `  src="${url}"`,
    `  width="100%" height="${heightAttr}"`,
    `  style="border:0;width:100%;display:block;${heightStyle}"`,
    `  frameborder="0" loading="lazy"`,
    `  title="${BRANDS[c.brand].name} — Prenota il tuo soggiorno"`,
    `  allow="geolocation"`,
    `  referrerpolicy="strict-origin-when-cross-origin">`,
    `</iframe>`,
  ].join('\n')
}
