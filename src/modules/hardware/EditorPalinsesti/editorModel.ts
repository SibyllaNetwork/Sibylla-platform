import {
  SFONDI, durataProgetto, LISTINI_PREZZO,
  type Elemento, type Progetto, type Slide, type TipoElemento, type FormatoSpot, type FormaTipo, type WidgetTipo,
} from '../../../store/useTotemStore'

// ─── Editor palinsesti: costanti, modelli e controlli di qualità ─────────────

export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
export const r1 = (v: number) => Math.round(v * 10) / 10
export const r05 = (v: number) => Math.round(v * 2) / 2

export const COLORI_BASE = ['#FFFFFF', '#1E293B', '#000000', '#204769', '#A2864C', '#E9D7A8', '#FFD166', '#F39A5C', '#E25C5C', '#48C49A', '#57B6D9', '#8E7CC3']
export const MAX_IMG = 1.5 * 1024 * 1024

export const TIPO_LBL: Record<TipoElemento, string> = { testo: 'Testo', prezzo: 'Prezzo', icona: 'Icona', immagine: 'Immagine', forma: 'Forma', qr: 'QR code', widget: 'Widget' }
export const TIPO_ICO: Record<TipoElemento, string> = { testo: 'font', prezzo: 'tag', icona: 'icons', immagine: 'image', forma: 'shapes', qr: 'qrcode', widget: 'gauge-high' }

/** Rapporto larghezza/altezza della slide: serve per tenere quadrati QR e cerchi. */
export const rapporto = (f: FormatoSpot = 'verticale') => (f === 'orizzontale' ? 16 / 9 : 9 / 16)
/** Altezza in % che rende quadrato un elemento largo `w`%. */
export const hQuadrata = (w: number, f?: FormatoSpot) => r05(w * rapporto(f))

export const NUOVO: Record<TipoElemento, Partial<Elemento>> = {
  testo:    { testo: 'Nuovo testo', x: 10, y: 40, w: 80, h: 10, font: 'Poppins', size: 24, peso: 600, colore: '#FFFFFF', allinea: 'center', ingresso: 'dissolvenza' },
  prezzo:   { x: 20, y: 58, w: 60, h: 16, prezzoModo: 'dinamico', fonte: 'camera', prezzo: 99, bollino: true, font: 'Bebas Neue', size: 56, colore: '#FFFFFF', allinea: 'center', ingresso: 'rimbalzo' },
  icona:    { icona: 'star', x: 38, y: 14, w: 24, h: 13, colore: '#FFFFFF', size: 16, ingresso: 'zoom' },
  immagine: { x: 10, y: 10, w: 80, h: 34, raggio: 12, adatta: 'cover', filtro: 'nessuno', ingresso: 'dissolvenza' },
  forma:    { forma: 'rettangolo', x: 20, y: 78, w: 60, h: 9, sfondo: '#A2864C', raggio: 12, ingresso: 'sali' },
  qr:       { link: 'https://', x: 32, y: 60, w: 36, colore: '#000000', sfondo: '#FFFFFF', raggio: 10, ingresso: 'zoom' },
  widget:   { widget: 'ora', x: 25, y: 6, w: 50, h: 7, font: 'Poppins', size: 16, peso: 600, colore: '#FFFFFF', allinea: 'center', raggio: 30 },
}

/** Stili di testo pronti nella libreria "Aggiungi". */
export const PRESET_TESTO: { id: string; label: string; demo: string; e: Partial<Elemento> }[] = [
  { id: 'titolo', label: 'Titolo', demo: 'Titolo d\'impatto', e: { testo: 'Titolo d\'impatto', font: 'Bebas Neue', size: 54, peso: 400, h: 12, ingresso: 'sali', ombra: 'morbida' } },
  { id: 'elegante', label: 'Titolo elegante', demo: 'Serata speciale', e: { testo: 'Serata speciale', font: 'Playfair Display', size: 34, peso: 600, h: 11, ingresso: 'dissolvenza' } },
  { id: 'sottotitolo', label: 'Sottotitolo', demo: 'Un sottotitolo chiaro', e: { testo: 'Un sottotitolo chiaro', font: 'Montserrat', size: 18, peso: 600, h: 8, ingresso: 'dissolvenza', inizio: 0.4 } },
  { id: 'paragrafo', label: 'Paragrafo', demo: 'Due righe per spiegare l\'offerta', e: { testo: 'Due righe per spiegare l\'offerta in modo semplice', font: 'Poppins', size: 14, peso: 400, h: 10, interlinea: 130, ingresso: 'dissolvenza', inizio: 0.8 } },
  { id: 'etichetta', label: 'Etichetta', demo: 'NOVITÀ', e: { testo: 'Novità', font: 'Poppins', size: 12, peso: 800, w: 34, x: 33, h: 5, maiuscolo: true, spaziatura: 14, sfondo: '#A2864C', raggio: 20, ingresso: 'zoom' } },
  { id: 'cta', label: 'Invito all\'azione', demo: 'Prenota ora', e: { testo: 'Prenota ora', font: 'Poppins', size: 16, peso: 800, w: 56, x: 22, h: 8, sfondo: '#FFFFFF', colore: '#204769', raggio: 40, ingresso: 'sali', loop: 'pulsa', azione: 'prenota' } },
]

export const FORME: { id: FormaTipo; label: string; ico: string }[] = [
  { id: 'rettangolo', label: 'Rettangolo', ico: 'square' }, { id: 'pillola', label: 'Pillola', ico: 'capsules' },
  { id: 'cerchio', label: 'Cerchio', ico: 'circle' }, { id: 'linea', label: 'Linea', ico: 'minus' }, { id: 'triangolo', label: 'Triangolo', ico: 'play' },
]
export const WIDGETS: { id: WidgetTipo; label: string; ico: string; hint: string }[] = [
  { id: 'ora', label: 'Ora', ico: 'clock', hint: 'L\'ora esatta del totem' },
  { id: 'data', label: 'Data', ico: 'calendar-day', hint: 'Giorno della settimana e data' },
  { id: 'meteo', label: 'Meteo', ico: 'cloud-sun', hint: 'Temperatura e cielo nella città del totem' },
  { id: 'countdown', label: 'Countdown', ico: 'hourglass-half', hint: 'Il tempo che manca a un evento o alla fine di un\'offerta' },
]

export const CATEGORIE_ICONE: { id: string; label: string; icone: string[] }[] = [
  { id: 'hotel', label: 'Ospitalità', icone: ['bell-concierge', 'bed', 'key', 'door-open', 'hotel', 'wifi', 'square-parking', 'elevator', 'suitcase-rolling', 'shirt', 'baby-carriage', 'dog'] },
  { id: 'food', label: 'Cibo e bevande', icone: ['utensils', 'wine-glass', 'champagne-glasses', 'martini-glass-citrus', 'mug-hot', 'cake-candles', 'pizza-slice', 'fish', 'ice-cream', 'burger', 'bowl-food', 'beer-mug-empty'] },
  { id: 'well', label: 'Benessere', icone: ['spa', 'person-swimming', 'dumbbell', 'leaf', 'hot-tub-person', 'person-walking', 'heart-pulse', 'seedling', 'sun', 'moon', 'feather', 'water'] },
  { id: 'viaggio', label: 'Viaggi ed esperienze', icone: ['sailboat', 'umbrella-beach', 'mountain-sun', 'map-location-dot', 'plane', 'train', 'car', 'bicycle', 'camera', 'landmark', 'ticket', 'compass'] },
  { id: 'promo', label: 'Promozioni', icone: ['percent', 'tag', 'gift', 'star', 'fire', 'bolt', 'crown', 'gem', 'heart', 'thumbs-up', 'award', 'certificate'] },
  { id: 'info', label: 'Informazioni', icone: ['circle-info', 'qrcode', 'phone', 'envelope', 'location-dot', 'clock', 'calendar-days', 'music', 'microphone', 'children', 'wheelchair', 'arrow-right'] },
]
export const TUTTE_ICONE = CATEGORIE_ICONE.flatMap(c => c.icone)

// ─── Modelli di partenza ─────────────────────────────────────────────────────
const e = (x: Partial<Elemento> & Pick<Elemento, 'tipo' | 'x' | 'y' | 'w' | 'h'>): Elemento => ({ id: uid('el'), ...x })
const s = (x: Omit<Slide, 'id'>): Slide => ({ id: uid('s'), ...x })
const traDomani = () => { const d = new Date(Date.now() + 3 * 86400000); d.setHours(20, 0, 0, 0); return `${d.toISOString().slice(0, 10)}T20:00` }

export interface ModelloSpot { id: string; nome: string; descrizione: string; ico: string; slides: () => Slide[] }
export const MODELLI: ModelloSpot[] = [
  { id: 'vuoto', nome: 'Spot vuoto', descrizione: 'Una slide con un titolo, parti da zero', ico: 'file', slides: () => [
    s({ nome: 'Apertura', durata: 6, sfondo: 'oceano', transizione: 'dissolvenza', elementi: [
      e({ tipo: 'testo', nome: 'Titolo', testo: 'Il tuo titolo', x: 8, y: 40, w: 84, h: 12, font: 'Bebas Neue', size: 52, colore: '#FFFFFF', allinea: 'center', ingresso: 'sali' }),
    ] }),
  ] },
  { id: 'offerta', nome: 'Offerta lampo', descrizione: 'Sconto, prezzo barrato e countdown alla scadenza', ico: 'bolt', slides: () => [
    s({ nome: 'Sconto', durata: 5, sfondo: 'corallo', transizione: 'zoom', elementi: [
      e({ tipo: 'testo', nome: 'Etichetta', testo: 'Solo questa settimana', x: 20, y: 12, w: 60, h: 6, font: 'Poppins', size: 13, peso: 800, colore: '#FFFFFF', sfondo: '#1E293B', raggio: 30, allinea: 'center', maiuscolo: true, spaziatura: 8, ingresso: 'scendi' }),
      e({ tipo: 'testo', nome: 'Sconto', testo: '-30%', x: 6, y: 24, w: 88, h: 22, font: 'Bebas Neue', size: 120, colore: '#FFFFFF', allinea: 'center', ingresso: 'rimbalzo', inizio: 0.3, ombra: 'forte' }),
      e({ tipo: 'testo', nome: 'Cosa', testo: 'sul soggiorno di 3 notti', x: 10, y: 48, w: 80, h: 8, font: 'Montserrat', size: 18, peso: 600, colore: '#FFFFFF', allinea: 'center', ingresso: 'dissolvenza', inizio: 0.9 }),
      e({ tipo: 'widget', nome: 'Countdown', widget: 'countdown', countdownA: traDomani(), x: 15, y: 64, w: 70, h: 8, font: 'Montserrat', size: 18, peso: 800, colore: '#1E293B', sfondo: '#FFFFFF', raggio: 30, allinea: 'center', ingresso: 'sali', inizio: 1.4, loop: 'pulsa' }),
    ] }),
    s({ nome: 'Prezzo', durata: 5, sfondo: 'notte', transizione: 'spinta', elementi: [
      e({ tipo: 'prezzo', nome: 'Prezzo', x: 14, y: 34, w: 72, h: 18, prezzoModo: 'dinamico', fonte: 'camera', prezzo: 129, prezzoPrima: 189, prefisso: 'a notte da', bollino: true, font: 'Bebas Neue', size: 64, colore: '#FFD166', allinea: 'center', ingresso: 'rimbalzo' }),
      e({ tipo: 'testo', nome: 'Invito', testo: 'Prenota ora', x: 22, y: 70, w: 56, h: 8, font: 'Poppins', size: 16, peso: 800, colore: '#142A44', sfondo: '#FFD166', raggio: 40, allinea: 'center', ingresso: 'sali', inizio: 0.8, loop: 'pulsa', azione: 'prenota' }),
    ] }),
  ] },
  { id: 'benvenuto', nome: 'Benvenuto in hotel', descrizione: 'Saluto, ora, meteo e QR del Wi-Fi per la hall', ico: 'hand-holding-heart', slides: () => [
    s({ nome: 'Benvenuti', durata: 8, sfondo: 'ardesia', transizione: 'dissolvenza', elementi: [
      e({ tipo: 'widget', nome: 'Ora', widget: 'ora', x: 8, y: 5, w: 40, h: 6, font: 'Montserrat', size: 16, peso: 600, colore: '#E9D7A8', allinea: 'left' }),
      e({ tipo: 'widget', nome: 'Meteo', widget: 'meteo', x: 52, y: 5, w: 40, h: 6, font: 'Montserrat', size: 14, peso: 600, colore: '#E9D7A8', allinea: 'right' }),
      e({ tipo: 'testo', nome: 'Saluto', testo: 'Benvenuti', x: 8, y: 26, w: 84, h: 12, font: 'Playfair Display', size: 44, peso: 600, colore: '#FFFFFF', allinea: 'center', ingresso: 'sali', ombra: 'morbida' }),
      e({ tipo: 'widget', nome: 'Data', widget: 'data', x: 10, y: 39, w: 80, h: 6, font: 'Poppins', size: 14, colore: '#C9D2DE', allinea: 'center', ingresso: 'dissolvenza', inizio: 0.6 }),
      e({ tipo: 'forma', nome: 'Separatore', forma: 'linea', x: 40, y: 49, w: 20, h: 0.5, sfondo: '#A2864C', ingresso: 'da-sinistra', inizio: 0.8 }),
      e({ tipo: 'qr', nome: 'QR Wi-Fi', link: 'WIFI:T:WPA;S:Hotel-Ospiti;P:benvenuti;;', x: 33, y: 56, w: 34, h: 19, colore: '#1E293B', sfondo: '#FFFFFF', raggio: 10, ingresso: 'zoom', inizio: 1.2 }),
      e({ tipo: 'testo', nome: 'Wi-Fi', testo: 'Inquadra per collegarti al Wi-Fi', x: 12, y: 78, w: 76, h: 6, font: 'Poppins', size: 13, peso: 600, colore: '#FFFFFF', allinea: 'center', ingresso: 'dissolvenza', inizio: 1.6 }),
    ] }),
  ] },
  { id: 'menu', nome: 'Menu del giorno', descrizione: 'Tre piatti con il prezzo del menu dal listino', ico: 'utensils', slides: () => [
    s({ nome: 'Menu', durata: 9, sfondo: 'sabbia', transizione: 'tendina', elementi: [
      e({ tipo: 'testo', nome: 'Occhiello', testo: 'Oggi a pranzo', x: 10, y: 9, w: 80, h: 6, font: 'Montserrat', size: 14, peso: 800, colore: '#A2864C', allinea: 'center', maiuscolo: true, spaziatura: 14, ingresso: 'scendi' }),
      e({ tipo: 'testo', nome: 'Titolo', testo: 'Menu del giorno', x: 8, y: 16, w: 84, h: 10, font: 'Playfair Display', size: 36, peso: 800, colore: '#2B2417', allinea: 'center', ingresso: 'dissolvenza', inizio: 0.3 }),
      e({ tipo: 'testo', nome: 'Antipasto', testo: 'Tartare di tonno, agrumi e finocchio', x: 10, y: 34, w: 80, h: 8, font: 'Poppins', size: 15, colore: '#2B2417', allinea: 'center', ingresso: 'sali', inizio: 0.9 }),
      e({ tipo: 'testo', nome: 'Primo', testo: 'Paccheri alla norma con ricotta salata', x: 10, y: 44, w: 80, h: 8, font: 'Poppins', size: 15, colore: '#2B2417', allinea: 'center', ingresso: 'sali', inizio: 1.4 }),
      e({ tipo: 'testo', nome: 'Dolce', testo: 'Cannolo scomposto al pistacchio', x: 10, y: 54, w: 80, h: 8, font: 'Poppins', size: 15, colore: '#2B2417', allinea: 'center', ingresso: 'sali', inizio: 1.9 }),
      e({ tipo: 'prezzo', nome: 'Prezzo', x: 20, y: 68, w: 60, h: 16, prezzoModo: 'dinamico', fonte: 'menu', prezzo: 65, suffisso: 'bevande incluse', bollino: false, font: 'Bebas Neue', size: 52, colore: '#204769', allinea: 'center', ingresso: 'rimbalzo', inizio: 2.6 }),
    ] }),
  ] },
  { id: 'evento', nome: 'Evento', descrizione: 'Data, luogo, countdown e QR per i biglietti', ico: 'calendar-star', slides: () => [
    s({ nome: 'Annuncio', durata: 6, sfondo: 'lavanda', transizione: 'sfocatura', elementi: [
      e({ tipo: 'icona', nome: 'Icona', icona: 'music', x: 40, y: 10, w: 20, h: 11, colore: '#FFFFFF', ingresso: 'zoom', loop: 'oscilla' }),
      e({ tipo: 'testo', nome: 'Titolo', testo: 'Jazz sotto le stelle', x: 6, y: 26, w: 88, h: 16, font: 'Playfair Display', size: 40, peso: 800, colore: '#FFFFFF', allinea: 'center', ingresso: 'sali', inizio: 0.3, ombra: 'morbida' }),
      e({ tipo: 'testo', nome: 'Quando', testo: 'Sabato · ore 21:00 · Terrazza panoramica', x: 8, y: 46, w: 84, h: 7, font: 'Montserrat', size: 15, peso: 600, colore: '#F1ECFF', allinea: 'center', ingresso: 'dissolvenza', inizio: 0.9 }),
      e({ tipo: 'widget', nome: 'Countdown', widget: 'countdown', countdownA: traDomani(), x: 18, y: 58, w: 64, h: 7, font: 'Montserrat', size: 16, peso: 800, colore: '#5B4B9A', sfondo: '#FFFFFF', raggio: 30, allinea: 'center', ingresso: 'sali', inizio: 1.3 }),
    ] }),
    s({ nome: 'Biglietti', durata: 5, sfondo: 'notte', transizione: 'dissolvenza', elementi: [
      e({ tipo: 'testo', nome: 'Invito', testo: 'Posti limitati', x: 10, y: 18, w: 80, h: 10, font: 'Bebas Neue', size: 48, colore: '#FFFFFF', allinea: 'center', ingresso: 'sali' }),
      e({ tipo: 'qr', nome: 'QR biglietti', link: 'https://sibylla.it/eventi/jazz', x: 30, y: 36, w: 40, h: 22.5, colore: '#142A44', sfondo: '#FFFFFF', raggio: 12, ingresso: 'zoom', inizio: 0.5, azione: 'link', azioneVal: 'https://sibylla.it/eventi/jazz' }),
      e({ tipo: 'testo', nome: 'Inquadra', testo: 'Inquadra e prenota il tavolo', x: 12, y: 64, w: 76, h: 6, font: 'Poppins', size: 13, peso: 600, colore: '#C9D2DE', allinea: 'center', ingresso: 'dissolvenza', inizio: 1, loop: 'lampeggia' }),
    ] }),
  ] },
  { id: 'servizio', nome: 'Servizio con foto', descrizione: 'Foto a tutto schermo con velatura, titolo e prezzo', ico: 'image', slides: () => [
    s({ nome: 'Foto', durata: 7, sfondo: 'smeraldo', bg: { modo: 'immagine', c1: '#0D5C4A', c2: '#48C49A', angolo: 160, velatura: 35, kenBurns: true }, transizione: 'dissolvenza', elementi: [
      e({ tipo: 'testo', nome: 'Titolo', testo: 'Percorso benessere', x: 8, y: 54, w: 84, h: 11, font: 'Playfair Display', size: 36, peso: 600, colore: '#FFFFFF', allinea: 'left', ingresso: 'da-sinistra', inizio: 0.5, ombra: 'morbida' }),
      e({ tipo: 'prezzo', nome: 'Prezzo', x: 8, y: 66, w: 50, h: 14, prezzoModo: 'dinamico', fonte: 'spa', prezzo: 59, prefisso: 'a persona', bollino: true, font: 'Bebas Neue', size: 52, colore: '#FFFFFF', allinea: 'left', ingresso: 'sali', inizio: 1.1 }),
      e({ tipo: 'testo', nome: 'Nota', testo: 'Carica la tua foto dallo sfondo della slide', x: 8, y: 86, w: 84, h: 5, font: 'Poppins', size: 11, colore: '#D8F3EA', allinea: 'left', corsivo: true }),
    ] }),
  ] },
]

// ─── Colore e contrasto ──────────────────────────────────────────────────────
const hexRgb = (h: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{6})$/i.exec(h.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const lum = ([r, g, b]: [number, number, number]) => {
  const c = [r, g, b].map(v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4) })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const mix = (a: string, b: string) => {
  const x = hexRgb(a), y = hexRgb(b)
  if (!x || !y) return a
  return '#' + x.map((v, i) => Math.round((v + y[i]) / 2).toString(16).padStart(2, '0')).join('')
}
export function contrasto(a: string, b: string) {
  const x = hexRgb(a), y = hexRgb(b)
  if (!x || !y) return null
  const l1 = lum(x), l2 = lum(y)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}
/** Colore medio dello sfondo di una slide (null se è una foto senza velatura). */
export function coloreSfondo(sl: Slide): string | null {
  const b = sl.bg
  if (!b) return SFONDI.find(x => x.id === sl.sfondo)?.medio ?? '#1D3A57'
  if (b.modo === 'colore') return b.c1
  if (b.modo === 'gradiente') return mix(b.c1, b.c2)
  return (b.velatura ?? 0) >= 45 ? '#2A2A2A' : null
}
export const testoLeggibileSu = (bg: string) => ((contrasto('#FFFFFF', bg) ?? 21) >= (contrasto('#1E293B', bg) ?? 0) ? '#FFFFFF' : '#1E293B')

// ─── Controllo di Sibylla ────────────────────────────────────────────────────
export interface Controllo {
  ok: boolean
  txt: string
  slideId?: string
  elId?: string
  /** Correzione automatica proposta. */
  fix?: (p: Progetto) => Progetto
}
const patchEl = (p: Progetto, sid: string, eid: string, patch: Partial<Elemento>): Progetto =>
  ({ ...p, slides: p.slides.map(s => s.id !== sid ? s : { ...s, elementi: s.elementi.map(x => x.id === eid ? { ...x, ...patch } : x) }) })
const patchSlide = (p: Progetto, sid: string, patch: Partial<Slide>): Progetto => ({ ...p, slides: p.slides.map(s => s.id === sid ? { ...s, ...patch } : s) })

const MARGINE = 3
const conTesto = (x: Elemento) => x.tipo === 'testo' || x.tipo === 'prezzo' || x.tipo === 'widget'

export function controlli(p: Progetto, totemTouch: number, totemTot: number): Controllo[] {
  const out: Controllo[] = []
  const tot = durataProgetto(p)
  out.push(tot <= 30
    ? { ok: true, txt: `Durata totale ${tot} s: adatta a chi passa davanti allo schermo` }
    : { ok: false, txt: `Durata totale ${tot} s: oltre 30 s pochi lo guardano fino in fondo` })

  p.slides.forEach((sl, i) => {
    const n = sl.nome ? `Slide ${i + 1} «${sl.nome}»` : `Slide ${i + 1}`
    const visibili = sl.elementi.filter(x => !x.nascosto)
    const parole = visibili.filter(x => x.tipo === 'testo').reduce((k, x) => k + (x.testo ?? '').split(/\s+/).filter(Boolean).length, 0)
    if (parole > sl.durata * 3) {
      const durata = Math.min(30, Math.ceil(parole / 3))
      out.push({ ok: false, txt: `${n}: ${parole} parole in ${sl.durata} s, servono almeno ${durata} s per leggerle`, slideId: sl.id, fix: q => patchSlide(q, sl.id, { durata }) })
    }
    if (visibili.length > 10) out.push({ ok: false, txt: `${n}: ${visibili.length} elementi, la slide è affollata`, slideId: sl.id })
    if (sl.bg?.modo === 'immagine' && !sl.bg.src) out.push({ ok: false, txt: `${n}: lo sfondo a foto è senza immagine`, slideId: sl.id })
    const bg = coloreSfondo(sl)
    visibili.forEach(x => {
      const nome = x.nome ?? (x.tipo === 'testo' ? `«${(x.testo ?? '').slice(0, 24)}»` : TIPO_LBL[x.tipo].toLowerCase())
      if (conTesto(x) && (x.size ?? 16) < 12)
        out.push({ ok: false, txt: `${n}: ${nome} sotto i 12 pt, illeggibile a distanza`, slideId: sl.id, elId: x.id, fix: q => patchEl(q, sl.id, x.id, { size: 14 }) })
      const dietro = conTesto(x) && x.sfondo && x.sfondo.startsWith('#') ? x.sfondo : bg
      if (conTesto(x) && dietro && x.colore) {
        const c = contrasto(x.colore, dietro)
        if (c != null && c < 3) out.push({ ok: false, txt: `${n}: ${nome} poco leggibile sullo sfondo (contrasto ${c.toFixed(1)}:1)`, slideId: sl.id, elId: x.id, fix: q => patchEl(q, sl.id, x.id, { colore: testoLeggibileSu(dietro) }) })
      }
      if ((conTesto(x) || x.tipo === 'qr') && (x.x < MARGINE || x.y < MARGINE || x.x + x.w > 100 - MARGINE || x.y + x.h > 100 - MARGINE)) {
        const w = Math.min(x.w, 100 - 2 * MARGINE), h = Math.min(x.h, 100 - 2 * MARGINE)
        out.push({ ok: false, txt: `${n}: ${nome} esce dall'area sicura, sul bordo del totem si taglia`, slideId: sl.id, elId: x.id,
          fix: q => patchEl(q, sl.id, x.id, { w, h, x: r05(Math.min(100 - MARGINE - w, Math.max(MARGINE, x.x))), y: r05(Math.min(100 - MARGINE - h, Math.max(MARGINE, x.y))) }) })
      }
      if ((x.inizio ?? 0) >= sl.durata)
        out.push({ ok: false, txt: `${n}: ${nome} entra dopo la fine della slide e non si vede mai`, slideId: sl.id, elId: x.id, fix: q => patchEl(q, sl.id, x.id, { inizio: 0 }) })
      if (x.tipo === 'qr') {
        const w = Math.max(x.w, p.formato === 'orizzontale' ? 18 : 30)
        if (x.w < (p.formato === 'orizzontale' ? 14 : 26)) out.push({ ok: false, txt: `${n}: QR troppo piccolo, da lontano non si inquadra`, slideId: sl.id, elId: x.id, fix: q => patchEl(q, sl.id, x.id, { w, h: hQuadrata(w, p.formato), x: r05(Math.min(100 - w - MARGINE, x.x)) }) })
        if (!x.link || x.link === 'https://') out.push({ ok: false, txt: `${n}: il QR non ha ancora un indirizzo`, slideId: sl.id, elId: x.id })
        if ((x.fine ?? sl.durata) - (x.inizio ?? 0) < 4) out.push({ ok: false, txt: `${n}: il QR resta in scena meno di 4 s, non c'è il tempo di inquadrarlo`, slideId: sl.id, elId: x.id })
      }
      if (x.tipo === 'immagine' && !x.src) out.push({ ok: false, txt: `${n}: c'è un riquadro immagine vuoto`, slideId: sl.id, elId: x.id })
      if (x.tipo === 'widget' && x.widget === 'countdown' && x.countdownA && new Date(x.countdownA).getTime() < Date.now())
        out.push({ ok: false, txt: `${n}: il countdown è già scaduto`, slideId: sl.id, elId: x.id })
    })
  })

  const dinamici = p.slides.flatMap(s => s.elementi).filter(x => x.tipo === 'prezzo' && x.prezzoModo === 'dinamico')
  if (dinamici.length) {
    const nomi = Array.from(new Set(dinamici.map(x => LISTINI_PREZZO.find(l => l.id === x.fonte)?.label ?? 'listino')))
    out.push({ ok: true, txt: `Prezzo dinamico da ${nomi.join(', ')}: si aggiorna ogni mattina dalla Gestione del pricing` })
  }
  if (p.slides.some(s => s.elementi.some(x => x.azione && x.azione !== 'nessuna')))
    out.push({ ok: true, txt: `Elementi toccabili attivi su ${totemTouch} totem su ${totemTot} (quelli con il touch abilitato)` })
  if (out.every(x => x.ok)) out.push({ ok: true, txt: 'Testi leggibili, contrasti e tempi di lettura corretti' })
  return out
}

/** Punteggio 0–100 dello spot per l'anello del controllo. */
export const punteggio = (cs: Controllo[]) => Math.max(0, 100 - cs.filter(c => !c.ok).length * 12)
