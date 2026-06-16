// ─────────────────────────────────────────────────────────────────────────────
//  Banner generator — modello dati dei formati, configurazione e generatore del
//  codice iframe da incollare nei siti di terzi (stile Booking / Airbnb / Trivago).
//  Ogni formato produce un embed verso il motore di prenotazione Sibylla con i
//  parametri di tracciamento (ID affiliato + UTM) codificati in query string.
// ─────────────────────────────────────────────────────────────────────────────

export type BannerKind = 'widget' | 'display' | 'card' | 'link'

export interface BannerFormat {
  id: string
  kind: BannerKind
  label: string
  /** Etichetta dimensione mostrata in galleria (es. "728 × 90"). */
  size: string
  /** Larghezza in px; null = responsive (100% del contenitore). */
  width: number | null
  /** Altezza in px. */
  height: number
  /** Orientamento prevalente del layout di anteprima. */
  orientation: 'horizontal' | 'vertical' | 'block'
  description: string
}

export interface BannerGroup {
  kind: BannerKind
  label: string
  icon: string
  formats: BannerFormat[]
}

export const BANNER_GROUPS: BannerGroup[] = [
  {
    kind: 'widget',
    label: 'Widget di ricerca',
    icon: 'search',
    formats: [
      {
        id: 'widget-horizontal', kind: 'widget', label: 'Barra di ricerca',
        size: 'Responsive × 140', width: null, height: 140, orientation: 'horizontal',
        description: 'Barra a tutta larghezza con destinazione, date, ospiti e Cerca. Ideale sotto l\'header.',
      },
      {
        id: 'widget-vertical', kind: 'widget', label: 'Box di ricerca verticale',
        size: '320 × 420', width: 320, height: 420, orientation: 'vertical',
        description: 'Modulo compatto in colonna, perfetto per la sidebar di un sito.',
      },
    ],
  },
  {
    kind: 'display',
    label: 'Banner display',
    icon: 'image',
    formats: [
      {
        id: 'leaderboard', kind: 'display', label: 'Leaderboard',
        size: '728 × 90', width: 728, height: 90, orientation: 'horizontal',
        description: 'Formato IAB classico per testata/footer di pagina.',
      },
      {
        id: 'rectangle', kind: 'display', label: 'Medium Rectangle',
        size: '300 × 250', width: 300, height: 250, orientation: 'block',
        description: 'Il formato più diffuso, integrato nel corpo dei contenuti.',
      },
      {
        id: 'skyscraper', kind: 'display', label: 'Wide Skyscraper',
        size: '160 × 600', width: 160, height: 600, orientation: 'vertical',
        description: 'Banner verticale per colonna laterale.',
      },
      {
        id: 'mobile', kind: 'display', label: 'Mobile Banner',
        size: '320 × 50', width: 320, height: 50, orientation: 'horizontal',
        description: 'Striscia compatta ottimizzata per smartphone.',
      },
    ],
  },
  {
    kind: 'card',
    label: 'Card offerta',
    icon: 'tag',
    formats: [
      {
        id: 'card-offerta', kind: 'card', label: 'Card struttura',
        size: '320 × 440', width: 320, height: 440, orientation: 'vertical',
        description: 'Card con foto, destinazione, prezzo "da €" e bottone Prenota.',
      },
    ],
  },
  {
    kind: 'link',
    label: 'Link & smart banner',
    icon: 'link',
    formats: [
      {
        id: 'smart-button', kind: 'link', label: 'Smart button',
        size: 'Responsive × 56', width: null, height: 56, orientation: 'horizontal',
        description: 'Bottone brandizzato "Prenota su Sibylla", leggerissimo.',
      },
    ],
  },
]

export const ALL_FORMATS: BannerFormat[] = BANNER_GROUPS.flatMap(g => g.formats)

export function findFormat(id: string): BannerFormat {
  return ALL_FORMATS.find(f => f.id === id) ?? ALL_FORMATS[0]
}

// ─── Configurazione ──────────────────────────────────────────────────────────

export interface BannerConfig {
  destinazione: string
  lingua: string
  valuta: string
  tema: 'light' | 'dark'
  accent: string
  /** Sfondo fotografico: indice in BANNER_BACKGROUNDS, oppure BG_AUTO (-1). */
  background: number
  /** Messaggio/slogan personalizzato. Vuoto = usa lo slogan predefinito della lingua. */
  messaggio: string
  // ── Logo ──
  /** Logo personalizzato: URL esterno o data-URL caricato. Vuoto = logo Sibylla. */
  logoCustom: string
  logoPosition: LogoPosition
  /** Altezza logo in px; 0 = automatica (default per formato). */
  logoSize: number
  // ── Sfondo ──
  /** Tipo di sfondo: immagine (preset/personalizzata) oppure colore pieno. */
  bgMode: 'image' | 'color'
  /** Colore di sfondo (usato quando bgMode === 'color'). */
  bgColor: string
  /** Sfondo personalizzato: URL esterno o data-URL caricato. Ha priorità su `background`. */
  bgCustom: string
  bgPosition: BgPosition
  bgFit: 'cover' | 'contain'
  /** Colore dei testi/slogan. Vuoto = automatico (bianco su foto/scuro, scuro su chiaro). */
  textColor: string
  // ── Link / CTA ──
  linkType: LinkType
  /** URL usato quando linkType === 'custom'. */
  linkUrl: string
  /** Testo del bottone/CTA; vuoto = testo predefinito per formato/lingua. */
  linkText: string
  linkTarget: '_blank' | '_self'
  // ── Tracciamento ──
  affiliateId: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
}

export type LogoPosition = 'left' | 'center' | 'right'
export type BgPosition = 'center' | 'top' | 'bottom' | 'left' | 'right'
export type LinkType = 'search' | 'destination' | 'home' | 'custom'

export const DEFAULT_CONFIG: BannerConfig = {
  destinazione: '',
  lingua: 'it',
  valuta: 'EUR',
  tema: 'light',
  accent: '#204769',
  background: -1,
  messaggio: '',
  logoCustom: '',
  logoPosition: 'left',
  logoSize: 0,
  bgMode: 'image',
  bgColor: '#204769',
  bgCustom: '',
  bgPosition: 'center',
  bgFit: 'cover',
  textColor: '',
  linkType: 'search',
  linkUrl: '',
  linkText: '',
  linkTarget: '_blank',
  affiliateId: '',
  utmSource: '',
  utmMedium: 'banner',
  utmCampaign: '',
}

export const LOGO_POSITIONS: ReadonlyArray<readonly [LogoPosition, string]> = [
  ['left', 'Sinistra'], ['center', 'Centro'], ['right', 'Destra'],
] as const

export const BG_POSITIONS: ReadonlyArray<readonly [BgPosition, string]> = [
  ['center', 'Centro'], ['top', 'Alto'], ['bottom', 'Basso'], ['left', 'Sinistra'], ['right', 'Destra'],
] as const

export const LINK_TYPES: ReadonlyArray<readonly [LinkType, string]> = [
  ['search', 'Motore di ricerca'], ['destination', 'Destinazione'], ['home', 'Home Sibylla'], ['custom', 'URL personalizzato'],
] as const

/** true se il valore è caricato localmente (data-URL) e quindi non incorporabile nel codice embed. */
export function isDataUrl(v: string): boolean {
  return v.trim().startsWith('data:')
}

export const LINGUE: ReadonlyArray<readonly [string, string]> = [
  ['it', 'Italiano'], ['en', 'English'], ['de', 'Deutsch'],
  ['fr', 'Français'], ['es', 'Español'],
] as const

export const VALUTE: ReadonlyArray<readonly [string, string]> = [
  ['EUR', '€ Euro'], ['USD', '$ Dollaro USA'], ['GBP', '£ Sterlina'], ['CHF', 'CHF Franco svizzero'],
] as const

export const ACCENT_PRESETS: string[] = [
  '#204769', '#C9A84C', '#007035', '#D10011', '#5C9CD4', '#5E6AD2', '#1B1D23',
]

// ─── Etichette per la lingua dell'anteprima ────────────────────────────────────

export interface PreviewLabels {
  destination: string
  checkin: string
  checkout: string
  guests: string
  search: string
  bookNow: string
  from: string
  perNight: string
  /** Slogan principale (headline pubblicitaria). */
  slogan: string
  /** Riga servizi: ricerca soggiorni, prenotazioni turistiche, servizi per il turismo. */
  services: string
  /** Slogan compatto per i formati piccoli (mobile, barra). */
  sloganShort: string
  /** Slogan-CTA per lo smart button. */
  smartCta: string
}

const LABELS: Record<string, PreviewLabels> = {
  it: { destination: 'Dove vuoi andare?', checkin: 'Check-in', checkout: 'Check-out', guests: 'Ospiti', search: 'Cerca', bookNow: 'Prenota ora', from: 'da', perNight: '/ notte',
    slogan: 'Il tuo prossimo soggiorno inizia qui',
    services: 'Ricerca soggiorni · Prenotazioni turistiche · Servizi per il turismo',
    sloganShort: 'Cerca, prenota, parti con Sibylla',
    smartCta: 'Cerca e prenota il tuo soggiorno' },
  en: { destination: 'Where are you going?', checkin: 'Check-in', checkout: 'Check-out', guests: 'Guests', search: 'Search', bookNow: 'Book now', from: 'from', perNight: '/ night',
    slogan: 'Your next stay starts here',
    services: 'Stay search · Travel bookings · Tourism services',
    sloganShort: 'Search, book, travel with Sibylla',
    smartCta: 'Search & book your stay' },
  de: { destination: 'Wohin möchten Sie?', checkin: 'Anreise', checkout: 'Abreise', guests: 'Gäste', search: 'Suchen', bookNow: 'Jetzt buchen', from: 'ab', perNight: '/ Nacht',
    slogan: 'Ihr nächster Aufenthalt beginnt hier',
    services: 'Unterkunftssuche · Reisebuchungen · Tourismus-Services',
    sloganShort: 'Suchen, buchen, reisen mit Sibylla',
    smartCta: 'Aufenthalt suchen & buchen' },
  fr: { destination: 'Où allez-vous ?', checkin: 'Arrivée', checkout: 'Départ', guests: 'Voyageurs', search: 'Rechercher', bookNow: 'Réserver', from: 'dès', perNight: '/ nuit',
    slogan: 'Votre prochain séjour commence ici',
    services: 'Recherche de séjours · Réservations touristiques · Services touristiques',
    sloganShort: 'Cherchez, réservez, partez avec Sibylla',
    smartCta: 'Cherchez et réservez votre séjour' },
  es: { destination: '¿A dónde vas?', checkin: 'Entrada', checkout: 'Salida', guests: 'Huéspedes', search: 'Buscar', bookNow: 'Reservar', from: 'desde', perNight: '/ noche',
    slogan: 'Tu próxima estancia empieza aquí',
    services: 'Búsqueda de estancias · Reservas turísticas · Servicios turísticos',
    sloganShort: 'Busca, reserva y viaja con Sibylla',
    smartCta: 'Busca y reserva tu estancia' },
}

export function labelsFor(lingua: string): PreviewLabels {
  return LABELS[lingua] ?? LABELS.it
}

// ─── Generatore del codice embed ───────────────────────────────────────────────

const EMBED_BASE = 'https://embed.sibyllanetwork.com/booking'

export function buildEmbedUrl(format: BannerFormat, c: BannerConfig): string {
  const q = new URLSearchParams()
  q.set('format', format.id)
  q.set('theme', c.tema)
  q.set('accent', c.accent.replace('#', ''))
  q.set('lang', c.lingua)
  q.set('currency', c.valuta)
  if (c.messaggio.trim()) q.set('msg', c.messaggio.trim())
  if (c.destinazione.trim()) q.set('dest', c.destinazione.trim())

  // Logo personalizzato — solo URL esterni (i data-URL caricati non sono incorporabili).
  if (c.logoCustom.trim() && !isDataUrl(c.logoCustom)) q.set('logo', c.logoCustom.trim())
  if (c.logoPosition !== 'left') q.set('logopos', c.logoPosition)
  if (c.logoSize > 0) q.set('logoh', String(c.logoSize))

  // Sfondo: colore pieno oppure immagine (preset/personalizzata).
  if (c.bgMode === 'color') {
    q.set('bgcolor', c.bgColor.replace('#', ''))
  } else {
    q.set('bg', c.background < 0 ? 'auto' : String(c.background))
    if (c.bgCustom.trim() && !isDataUrl(c.bgCustom)) q.set('bgurl', c.bgCustom.trim())
    if (c.bgPosition !== 'center') q.set('bgpos', c.bgPosition)
    if (c.bgFit !== 'cover') q.set('bgfit', c.bgFit)
  }
  if (c.textColor.trim()) q.set('textcolor', c.textColor.replace('#', ''))

  // Link / CTA
  q.set('link', c.linkType)
  if (c.linkType === 'custom' && c.linkUrl.trim()) q.set('linkurl', c.linkUrl.trim())
  if (c.linkText.trim()) q.set('cta', c.linkText.trim())
  if (c.linkTarget !== '_blank') q.set('target', c.linkTarget)

  if (c.affiliateId.trim()) q.set('aid', c.affiliateId.trim())
  if (c.utmSource.trim()) q.set('utm_source', c.utmSource.trim())
  if (c.utmMedium.trim()) q.set('utm_medium', c.utmMedium.trim())
  if (c.utmCampaign.trim()) q.set('utm_campaign', c.utmCampaign.trim())
  return `${EMBED_BASE}?${q.toString()}`
}

export function buildEmbedCode(format: BannerFormat, c: BannerConfig): string {
  const url = buildEmbedUrl(format, c)
  const width = format.width === null ? '100%' : String(format.width)
  const maxW = format.width === null ? '' : `max-width:${format.width}px;`
  return [
    `<!-- Banner Sibylla · ${format.label} (${format.size}) -->`,
    `<iframe`,
    `  src="${url}"`,
    `  width="${width}" height="${format.height}"`,
    `  style="border:0;overflow:hidden;${maxW}width:${width};height:${format.height}px"`,
    `  frameborder="0" scrolling="no" loading="lazy"`,
    `  title="Sibylla — Prenota il tuo soggiorno"`,
    `  referrerpolicy="strict-origin-when-cross-origin">`,
    `</iframe>`,
  ].join('\n')
}
