// ─── Template della mail del preventivo di soggiorno ─────────────────────────
//  Un template decide COME appare il preventivo (impaginazione, lettera, font,
//  colori, dimensioni, bordi, angoli, titoli); il preventivo decide COSA
//  contiene (cliente, proposte, camere). I template pronti sono qui; quelli
//  creati dal cliente stanno in useTemplatePreventivoStore.
//
//  I colori sono hex perché finiscono negli stili in linea della mail: i client
//  di posta non leggono le variabili CSS della piattaforma.

import { CLIENTS_INIT, INTESTATARI_INIT } from '../../../../admin/SibyllaAdminPanel/constants'

export type BloccoId = 'intestazione' | 'copertina' | 'lettera' | 'proposte' | 'condizioni' | 'termini' | 'firma' | 'footer'

export const BLOCCHI: Record<BloccoId, { label: string; icona: string; desc: string }> = {
  intestazione: { label: 'Intestazione', icona: 'fa-heading', desc: 'Logo, codice, titolo e sottotitolo' },
  copertina:    { label: 'Immagine di copertina', icona: 'fa-image', desc: 'Foto a tutta larghezza' },
  lettera:      { label: 'Lettera', icona: 'fa-envelope-open-text', desc: 'Saluto e messaggio al cliente' },
  proposte:     { label: 'Proposte', icona: 'fa-bed', desc: 'Le soluzioni di soggiorno con i prezzi' },
  condizioni:   { label: 'Note sull\'offerta', icona: 'fa-circle-info', desc: 'Validità, tassa di soggiorno, note' },
  termini:      { label: 'Termini e condizioni', icona: 'fa-file-contract', desc: 'Il documento scelto dalla libreria' },
  firma:        { label: 'Firma e contatti', icona: 'fa-signature', desc: 'Chiusura, firma e recapiti' },
  footer:       { label: 'Footer istituzionale', icona: 'fa-building-columns', desc: 'Dati societari e contatti dell\'azienda' },
}

export type FontKey = 'poppins' | 'montserrat' | 'opensans' | 'raleway' | 'playfair' | 'lora' | 'cormorant' | 'georgia' | 'helvetica' | 'courier'

/** Font della mail: i Google Font hanno un ripiego sicuro per i client che non li caricano. */
export const FONT: Record<FontKey, { label: string; stack: string; google?: string }> = {
  poppins:    { label: 'Poppins (geometrico)', stack: "Poppins,'Segoe UI',Helvetica,Arial,sans-serif", google: 'Poppins:wght@400;500;600;700;800' },
  montserrat: { label: 'Montserrat (moderno)', stack: "Montserrat,'Segoe UI',Helvetica,Arial,sans-serif", google: 'Montserrat:wght@400;500;600;700;800' },
  opensans:   { label: 'Open Sans (leggibile)', stack: "'Open Sans','Segoe UI',Helvetica,Arial,sans-serif", google: 'Open+Sans:wght@400;600;700;800' },
  raleway:    { label: 'Raleway (leggero)', stack: "Raleway,'Segoe UI',Helvetica,Arial,sans-serif", google: 'Raleway:wght@400;500;600;700;800' },
  playfair:   { label: 'Playfair Display (elegante)', stack: "'Playfair Display',Georgia,'Times New Roman',serif", google: 'Playfair+Display:wght@400;600;700;800' },
  lora:       { label: 'Lora (classico)', stack: "Lora,Georgia,'Times New Roman',serif", google: 'Lora:wght@400;500;600;700' },
  cormorant:  { label: 'Cormorant (raffinato)', stack: "'Cormorant Garamond',Georgia,serif", google: 'Cormorant+Garamond:wght@400;500;600;700' },
  georgia:    { label: 'Georgia (di sistema)', stack: "Georgia,'Times New Roman',serif" },
  helvetica:  { label: 'Helvetica (di sistema)', stack: "Helvetica,Arial,sans-serif" },
  courier:    { label: 'Courier (macchina da scrivere)', stack: "'Courier New',Courier,monospace" },
}

export interface ColoriTemplate {
  /** Fondo dietro la mail. */
  sfondo: string
  /** Fondo del contenitore e delle card. */
  superficie: string
  /** Titoli, intestazione piena, prezzi in evidenza. */
  primario: string
  /** Riquadri dei servizi aggiuntivi ed etichette. */
  accento: string
  testo: string
  tenue: string
  bordo: string
  pulsante: string
  testoPulsante: string
  /** Testo sopra l'intestazione piena. */
  testoIntestazione: string
  sfondoFooter: string
  testoFooter: string
}

/** Dati istituzionali del footer: i campi vuoti si prendono dalla scheda della struttura. */
export interface DatiFooter {
  ragioneSociale: string
  indirizzo: string
  cap: string
  citta: string
  provincia: string
  piva: string
  codiceFiscale: string
  rea: string
  capitaleSociale: string
  telefono: string
  email: string
  pec: string
  sito: string
  facebook: string
  instagram: string
  linkedin: string
  notaLegale: string
  mostraLogo: boolean
  allineamento: 'left' | 'center' | 'right'
}

export const FOOTER_VUOTO: DatiFooter = {
  ragioneSociale: '', indirizzo: '', cap: '', citta: '', provincia: '', piva: '', codiceFiscale: '', rea: '', capitaleSociale: '',
  telefono: '', email: '', pec: '', sito: '', facebook: '', instagram: '', linkedin: '',
  notaLegale: 'Hai ricevuto questa mail perché hai chiesto un preventivo a {struttura}. I tuoi dati sono trattati secondo l\'informativa privacy (Reg. UE 2016/679).',
  mostraLogo: false, allineamento: 'center',
}

/** Dati della struttura dalla sua scheda (Admin): nome, città, contatti, intestatario. */
export function datiStruttura(nome: string): Partial<DatiFooter> {
  const c = CLIENTS_INIT.find((x) => x.nome === nome)
  if (!c) return { ragioneSociale: nome }
  const int = INTESTATARI_INIT.find((i) => i.struttureIds.includes(c.id))
  const [citta, prov] = [c.citta.replace(/\s*\(.*\)$/, ''), (c.citta.match(/\(([A-Z]{2})\)/) ?? [])[1] ?? '']
  return {
    ragioneSociale: int ? `${int.nome} · ${c.nome}` : c.nome,
    citta, provincia: prov, telefono: c.tel, email: c.email,
    sito: c.email.includes('@') ? `www.${c.email.split('@')[1]}` : '',
  }
}

/** Footer effettivo: quello del template, completato coi dati della struttura. */
export function footerEffettivo(f: DatiFooter, struttura: string): DatiFooter {
  const d = datiStruttura(struttura)
  const out = { ...f }
  ;(Object.keys(d) as (keyof DatiFooter)[]).forEach((k) => { if (!out[k]) (out as any)[k] = d[k] })
  return out
}

export interface TemplateSoggiorno {
  id: string
  nome: string
  descrizione: string
  /** Template pronto (non modificabile: si personalizza una copia). */
  pronto?: boolean
  aggiornato?: string
  blocchi: { id: BloccoId; visibile: boolean }[]
  intestazione: {
    stile: 'pieno' | 'chiaro' | 'linea'
    allineamento: 'left' | 'center' | 'right'
    logo: string | null
    mostraCodice: boolean
  }
  copertina: { immagine: string | null; altezza: number }
  /** Termini e condizioni dalla libreria (useTerminiStore). */
  termini: {
    id: string | null
    presentazione: 'completo' | 'sintesi'
    /** Il cliente deve accettarli per confermare la proposta. */
    obbligatorio: boolean
  }
  footer: DatiFooter
  proposte: {
    disposizione: 'colonna' | 'griglia'
    fotoCamera: 'sinistra' | 'destra' | 'sopra' | 'nascosta'
    dettaglioGiorni: boolean
    mostraServizi: boolean
    prezzi: 'completo' | 'totale'
    mostraNumeriCamera: boolean
  }
  testi: {
    etichetta: string
    titolo: string
    sottotitolo: string
    saluto: string
    lettera: string
    chiusura: string
    firma: string
    contatti: string
    condizioni: string
    pulsante: string
  }
  font: {
    titoli: FontKey
    testo: FontKey
    dimTitolo: number
    dimSottotitolo: number
    dimTesto: number
    pesoTitoli: number
    etichetteMaiuscole: boolean
    interlinea: number
  }
  colori: ColoriTemplate
  forme: {
    larghezza: number
    spaziatura: number
    raggioContenitore: number
    raggioCard: number
    raggioPulsante: number
    raggioFoto: number
    bordo: number
    stileBordo: 'solid' | 'dashed' | 'dotted'
    ombra: boolean
  }
}

/** Segnaposto sostituiti nei testi del template. */
export const SEGNAPOSTO: [string, string][] = [
  ['{cliente}', 'Nome del cliente'],
  ['{struttura}', 'Nome della struttura'],
  ['{codice}', 'Codice del preventivo'],
  ['{soluzioni}', 'Numero di soluzioni (es. "2 soluzioni")'],
  ['{validita}', 'Giorni di validità'],
  ['{lettera}', 'Lettera della proposta (solo nel pulsante)'],
]

const IMG = (id: string, w = 1200) => `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`

const ORDINE: BloccoId[] = ['intestazione', 'copertina', 'lettera', 'proposte', 'condizioni', 'termini', 'firma', 'footer']
const TERMINI: TemplateSoggiorno['termini'] = { id: 'tc-generali', presentazione: 'sintesi', obbligatorio: true }
const blocchi = (nascosti: BloccoId[] = [], ordine = ORDINE) => ordine.map((id) => ({ id, visibile: !nascosti.includes(id) }))

const TESTI: TemplateSoggiorno['testi'] = {
  etichetta: 'Preventivo {codice}',
  titolo: '{struttura}',
  sottotitolo: 'Proposte di soggiorno pensate per te',
  saluto: 'Gentile {cliente},',
  lettera: 'grazie per averci contattato. Abbiamo preparato per te le soluzioni qui sotto: scegli quella che preferisci con il pulsante "Accetta" e ti confermeremo la prenotazione.',
  chiusura: 'Restiamo a disposizione per qualsiasi richiesta.',
  firma: 'Lo staff di {struttura}',
  contatti: '',
  condizioni: 'Offerta valida {validita} giorni dalla data di invio, salvo disponibilità al momento della conferma.\nLa tassa di soggiorno è dovuta per legge e si paga in struttura.',
  pulsante: 'Accetta la proposta {lettera}',
}

/** Template pronti: impaginazioni standard già curate. */
export const TEMPLATE_PRONTI: TemplateSoggiorno[] = [
  {
    id: 'tpl-classico', pronto: true, nome: 'Classico', descrizione: 'L\'impaginazione Platform: intestazione blu, camere con foto a sinistra',
    blocchi: blocchi(['copertina']),
    intestazione: { stile: 'pieno', allineamento: 'left', logo: null, mostraCodice: true },
    copertina: { immagine: IMG('photo-1566073771259-6a8506099945'), altezza: 220 },
    termini: TERMINI,
    footer: FOOTER_VUOTO,
    proposte: { disposizione: 'colonna', fotoCamera: 'sinistra', dettaglioGiorni: true, mostraServizi: true, prezzi: 'completo', mostraNumeriCamera: false },
    testi: TESTI,
    font: { titoli: 'poppins', testo: 'poppins', dimTitolo: 24, dimSottotitolo: 14, dimTesto: 13, pesoTitoli: 700, etichetteMaiuscole: true, interlinea: 1.6 },
    colori: { sfondo: '#F1F5F9', superficie: '#FFFFFF', primario: '#204769', accento: '#9A6B12', testo: '#1E293B', tenue: '#64748B', bordo: '#E2E8F0', pulsante: '#204769', testoPulsante: '#FFFFFF', testoIntestazione: '#FFFFFF', sfondoFooter: '#16324A', testoFooter: '#CBD5E1' },
    forme: { larghezza: 640, spaziatura: 28, raggioContenitore: 16, raggioCard: 14, raggioPulsante: 10, raggioFoto: 10, bordo: 1, stileBordo: 'solid', ombra: false },
  },
  {
    id: 'tpl-elegante', pronto: true, nome: 'Elegante', descrizione: 'Copertina fotografica, titoli serif e dettagli oro: per hotel di charme',
    blocchi: blocchi([], ['copertina', 'intestazione', 'lettera', 'proposte', 'condizioni', 'termini', 'firma', 'footer']),
    intestazione: { stile: 'chiaro', allineamento: 'center', logo: null, mostraCodice: true },
    copertina: { immagine: IMG('photo-1542314831-068cd1dbfeeb'), altezza: 260 },
    termini: TERMINI,
    footer: FOOTER_VUOTO,
    proposte: { disposizione: 'colonna', fotoCamera: 'sopra', dettaglioGiorni: false, mostraServizi: true, prezzi: 'completo', mostraNumeriCamera: false },
    testi: { ...TESTI, sottotitolo: 'Un soggiorno pensato per te', firma: 'Con i migliori saluti,\nla Direzione di {struttura}' },
    font: { titoli: 'playfair', testo: 'lora', dimTitolo: 30, dimSottotitolo: 15, dimTesto: 14, pesoTitoli: 600, etichetteMaiuscole: true, interlinea: 1.7 },
    colori: { sfondo: '#F4EFE6', superficie: '#FFFDF8', primario: '#3B2F2A', accento: '#A67C2E', testo: '#2E2622', tenue: '#7A6C62', bordo: '#E6DCCB', pulsante: '#A67C2E', testoPulsante: '#FFFFFF', testoIntestazione: '#FFFFFF', sfondoFooter: '#3B2F2A', testoFooter: '#E6DCCB' },
    forme: { larghezza: 640, spaziatura: 32, raggioContenitore: 4, raggioCard: 4, raggioPulsante: 2, raggioFoto: 2, bordo: 1, stileBordo: 'solid', ombra: false },
  },
  {
    id: 'tpl-mediterraneo', pronto: true, nome: 'Mediterraneo', descrizione: 'Colori del mare, angoli morbidi e proposte affiancate a due colonne',
    blocchi: blocchi(),
    intestazione: { stile: 'pieno', allineamento: 'center', logo: null, mostraCodice: false },
    copertina: { immagine: IMG('photo-1507525428034-b723cf961d3e'), altezza: 200 },
    termini: TERMINI,
    footer: FOOTER_VUOTO,
    proposte: { disposizione: 'griglia', fotoCamera: 'sopra', dettaglioGiorni: false, mostraServizi: true, prezzi: 'totale', mostraNumeriCamera: false },
    testi: { ...TESTI, sottotitolo: 'Le tue vacanze al mare iniziano qui', lettera: 'che bello sentirti! Ecco le proposte che abbiamo preparato per le tue vacanze: scegli quella che ti piace di più e pensiamo noi al resto.' },
    font: { titoli: 'montserrat', testo: 'opensans', dimTitolo: 26, dimSottotitolo: 14, dimTesto: 13, pesoTitoli: 800, etichetteMaiuscole: true, interlinea: 1.6 },
    colori: { sfondo: '#E6F3F7', superficie: '#FFFFFF', primario: '#0B6E8A', accento: '#D9622B', testo: '#16323C', tenue: '#5B7782', bordo: '#CFE5EC', pulsante: '#D9622B', testoPulsante: '#FFFFFF', testoIntestazione: '#FFFFFF', sfondoFooter: '#0B6E8A', testoFooter: '#E6F3F7' },
    forme: { larghezza: 680, spaziatura: 24, raggioContenitore: 24, raggioCard: 20, raggioPulsante: 24, raggioFoto: 16, bordo: 0, stileBordo: 'solid', ombra: true },
  },
  {
    id: 'tpl-minimal', pronto: true, nome: 'Minimal', descrizione: 'Bianco e nero, linee sottili e tanto respiro: nessuna distrazione',
    blocchi: blocchi(['copertina']),
    intestazione: { stile: 'linea', allineamento: 'left', logo: null, mostraCodice: true },
    copertina: { immagine: IMG('photo-1505691938895-1758d7feb511'), altezza: 200 },
    termini: TERMINI,
    footer: FOOTER_VUOTO,
    proposte: { disposizione: 'colonna', fotoCamera: 'destra', dettaglioGiorni: true, mostraServizi: false, prezzi: 'completo', mostraNumeriCamera: false },
    testi: { ...TESTI, sottotitolo: 'Preventivo di soggiorno' },
    font: { titoli: 'helvetica', testo: 'helvetica', dimTitolo: 22, dimSottotitolo: 13, dimTesto: 13, pesoTitoli: 700, etichetteMaiuscole: true, interlinea: 1.55 },
    colori: { sfondo: '#FFFFFF', superficie: '#FFFFFF', primario: '#111111', accento: '#111111', testo: '#111111', tenue: '#6B6B6B', bordo: '#DDDDDD', pulsante: '#111111', testoPulsante: '#FFFFFF', testoIntestazione: '#111111', sfondoFooter: '#F5F5F5', testoFooter: '#6B6B6B' },
    forme: { larghezza: 600, spaziatura: 24, raggioContenitore: 0, raggioCard: 0, raggioPulsante: 0, raggioFoto: 0, bordo: 1, stileBordo: 'solid', ombra: false },
  },
  {
    id: 'tpl-business', pronto: true, nome: 'Business', descrizione: 'Compatto e ordinato, con i numeri di camera: per aziende e gruppi',
    blocchi: blocchi(['copertina']),
    intestazione: { stile: 'pieno', allineamento: 'left', logo: null, mostraCodice: true },
    copertina: { immagine: IMG('photo-1564501049412-61c2a3083791'), altezza: 180 },
    termini: TERMINI,
    footer: FOOTER_VUOTO,
    proposte: { disposizione: 'colonna', fotoCamera: 'nascosta', dettaglioGiorni: true, mostraServizi: true, prezzi: 'completo', mostraNumeriCamera: true },
    testi: { ...TESTI, saluto: 'Spett.le {cliente},', lettera: 'facendo seguito alla Vostra richiesta, siamo lieti di sottoporVi le seguenti soluzioni di soggiorno. Per confermare è sufficiente il pulsante "Accetta" della proposta scelta.', sottotitolo: 'Offerta commerciale · {soluzioni}' },
    font: { titoli: 'opensans', testo: 'opensans', dimTitolo: 20, dimSottotitolo: 13, dimTesto: 12, pesoTitoli: 700, etichetteMaiuscole: false, interlinea: 1.5 },
    colori: { sfondo: '#EEF0F3', superficie: '#FFFFFF', primario: '#2B3A4A', accento: '#2F6FB2', testo: '#1F2933', tenue: '#616E7C', bordo: '#D9DEE4', pulsante: '#2F6FB2', testoPulsante: '#FFFFFF', testoIntestazione: '#FFFFFF', sfondoFooter: '#2B3A4A', testoFooter: '#D9DEE4' },
    forme: { larghezza: 680, spaziatura: 22, raggioContenitore: 6, raggioCard: 6, raggioPulsante: 4, raggioFoto: 4, bordo: 1, stileBordo: 'solid', ombra: false },
  },
]

export const TEMPLATE_DEFAULT = TEMPLATE_PRONTI[0]

/** Template completo anche se salvato da una versione precedente (campi nuovi dal default). */
export function normalizza(t: Partial<TemplateSoggiorno> & { id: string }): TemplateSoggiorno {
  const d = TEMPLATE_DEFAULT
  const presenti = (t.blocchi ?? []).filter((b) => BLOCCHI[b.id])
  return {
    ...d, ...t, pronto: t.pronto,
    blocchi: [...presenti, ...d.blocchi.filter((b) => !presenti.some((x) => x.id === b.id)).map((b) => ({ ...b, visibile: false }))],
    intestazione: { ...d.intestazione, ...t.intestazione },
    copertina: { ...d.copertina, ...t.copertina },
    termini: { ...d.termini, ...t.termini },
    footer: { ...d.footer, ...t.footer },
    proposte: { ...d.proposte, ...t.proposte },
    testi: { ...d.testi, ...t.testi },
    font: { ...d.font, ...t.font },
    colori: { ...d.colori, ...t.colori },
    forme: { ...d.forme, ...t.forme },
  } as TemplateSoggiorno
}

/** Palette pronte da applicare in un clic nell'editor. */
export const PALETTE: { nome: string; colori: ColoriTemplate }[] = TEMPLATE_PRONTI.map((t) => ({ nome: t.nome, colori: t.colori }))

export const FOTO_COPERTINA: { nome: string; url: string }[] = [
  { nome: 'Facciata hotel', url: IMG('photo-1566073771259-6a8506099945') },
  { nome: 'Hall', url: IMG('photo-1542314831-068cd1dbfeeb') },
  { nome: 'Piscina resort', url: IMG('photo-1564501049412-61c2a3083791') },
  { nome: 'Spiaggia', url: IMG('photo-1507525428034-b723cf961d3e') },
  { nome: 'Camera luminosa', url: IMG('photo-1505691938895-1758d7feb511') },
  { nome: 'Suite', url: IMG('photo-1631049307264-da0ec9d70304') },
]
