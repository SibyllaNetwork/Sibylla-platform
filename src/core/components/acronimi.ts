// ─── GLOSSARIO DELLE SIGLE ───────────────────────────────────────────────────
//  Ogni termine che in interfaccia compare come acronimo (B.A.R., F.I.T., PMS…)
//  va spiegato all'hover, non lasciato indovinare: qui vivono lo scioglimento
//  della sigla e una riga di spiegazione, usati dal componente <Acronimo/> e
//  dall'helper `withAcronimi`.
//
//  Le chiavi sono ESATTAMENTE come appaiono a schermo (puntate e non): la
//  ricerca è case-sensitive e a confine di parola, così «BAR» non aggancia
//  «Barcellona» e «IVA» non aggancia «PRIVATO».

export interface AcronimoDef {
  /** Sigla sciolta per esteso. */
  esteso: string
  /** Una riga: cosa significa nel contesto Sibylla. */
  spiegazione: string
}

export const ACRONIMI: Record<string, AcronimoDef> = {
  'B.A.R.': {
    esteso: 'Best Available Rate',
    spiegazione: 'La migliore tariffa disponibile pubblicata: il livello di riferimento da cui derivano gli altri prezzi.',
  },
  'BAR': {
    esteso: 'Best Available Rate',
    spiegazione: 'La migliore tariffa disponibile pubblicata: il livello di riferimento da cui derivano gli altri prezzi.',
  },
  'F.I.T.': {
    esteso: 'Free Independent Traveller',
    spiegazione: 'Cliente individuale che viaggia per conto proprio, fuori da gruppi o pacchetti organizzati.',
  },
  'FIT': {
    esteso: 'Free Independent Traveller',
    spiegazione: 'Cliente individuale che viaggia per conto proprio, fuori da gruppi o pacchetti organizzati.',
  },
  'PMS': {
    esteso: 'Property Management System',
    spiegazione: 'Il gestionale della struttura: anagrafiche, camere, prenotazioni e conti.',
  },
  'CRS': {
    esteso: 'Central Reservation System',
    spiegazione: 'Il sistema centrale che raccoglie e distribuisce le prenotazioni sui canali di vendita.',
  },
  'OTA': {
    esteso: 'Online Travel Agency',
    spiegazione: 'Portale di prenotazione online (Booking.com, Expedia…) che rivende le camere della struttura.',
  },
  'B2B': {
    esteso: 'Business to Business',
    spiegazione: 'Vendita verso altre aziende: agenzie, tour operator e intermediari.',
  },
  'B2C': {
    esteso: 'Business to Consumer',
    spiegazione: 'Vendita diretta al cliente finale, senza intermediari.',
  },
  'KDS': {
    esteso: 'Kitchen Display System',
    spiegazione: 'Il monitor di reparto che riceve le comande al posto della stampa su carta.',
  },
  'POS': {
    esteso: 'Point of Sale',
    spiegazione: 'Il punto di incasso (cassa o terminale di pagamento) su cui transitano i movimenti.',
  },
  'QR': {
    esteso: 'Quick Response code',
    spiegazione: 'Il codice quadrato che l’ospite inquadra col telefono per aprire la pagina, senza installare nulla.',
  },
  'SDI': {
    esteso: 'Sistema di Interscambio',
    spiegazione: 'Il canale dell’Agenzia delle Entrate attraverso cui transitano le fatture elettroniche.',
  },
  'PEC': {
    esteso: 'Posta Elettronica Certificata',
    spiegazione: 'Indirizzo email con valore legale, usato come recapito alternativo al codice destinatario.',
  },
  'REA': {
    esteso: 'Repertorio Economico Amministrativo',
    spiegazione: 'Il numero di iscrizione dell’impresa presso la Camera di Commercio.',
  },
  'IVA': {
    esteso: 'Imposta sul Valore Aggiunto',
    spiegazione: 'L’imposta applicata su ogni voce di ricavo, con l’aliquota prevista per la categoria.',
  },
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Le sigle puntate finiscono con «.», dove `\b` non vale: confine finale solo
// per quelle senza punto. Ordine per lunghezza decrescente, così «B.A.R.»
// vince su «BAR».
const PATTERN = Object.keys(ACRONIMI)
  .sort((a, b) => b.length - a.length)
  .map(k => (k.endsWith('.') ? `\\b${escapeRe(k)}` : `\\b${escapeRe(k)}\\b`))
  .join('|')

/** Regex globale con gruppo di cattura: usata per lo split del testo. */
export const ACRONIMI_RE = new RegExp(`(${PATTERN})`, 'g')

/** true se la stringa contiene almeno una sigla del glossario. */
export function hasAcronimi(text: string): boolean {
  ACRONIMI_RE.lastIndex = 0
  return ACRONIMI_RE.test(text)
}
