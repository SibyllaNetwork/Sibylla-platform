// Bandiere dei paesi (emoji) da affiancare ai nomi delle nazioni nei campi
// Nazionalità / Paese di nascita. Chiave normalizzata (UPPER, trim) → emoji.
// Le emoji-bandiera (regional indicators) sono testo: funzionano dentro le <option>
// dei <select> nativi (degradano alle sigle a 2 lettere solo su Windows datati).

const FLAGS: Record<string, string> = {
  ITALIA: '🇮🇹', ITALIANA: '🇮🇹',
  FRANCIA: '🇫🇷', FRANCESE: '🇫🇷',
  GERMANIA: '🇩🇪', TEDESCA: '🇩🇪',
  SPAGNA: '🇪🇸', SPAGNOLA: '🇪🇸',
  'REGNO UNITO': '🇬🇧',
  'STATI UNITI': '🇺🇸', USA: '🇺🇸',
  ALBANIA: '🇦🇱',
  ROMANIA: '🇷🇴',
  MAROCCO: '🇲🇦',
  CINA: '🇨🇳',
  ANDORRA: '🇦🇩',
  AUSTRIA: '🇦🇹',
  BELGIO: '🇧🇪',
  CROAZIA: '🇭🇷',
  DANIMARCA: '🇩🇰',
  FINLANDIA: '🇫🇮',
  GRECIA: '🇬🇷',
  IRLANDA: '🇮🇪',
  LUSSEMBURGO: '🇱🇺',
  NORVEGIA: '🇳🇴',
  'PAESI BASSI': '🇳🇱',
  POLONIA: '🇵🇱',
  PORTOGALLO: '🇵🇹',
  'REPUBBLICA CECA': '🇨🇿',
  SLOVACCHIA: '🇸🇰',
  SLOVENIA: '🇸🇮',
  SVEZIA: '🇸🇪',
  SVIZZERA: '🇨🇭',
  UNGHERIA: '🇭🇺',
}

/** Elenco paesi (IT) selezionabili, tutti con bandiera nota in FLAGS. */
export const PAESI: string[] = [
  'ITALIA', 'ANDORRA', 'AUSTRIA', 'BELGIO', 'CINA', 'CROAZIA', 'DANIMARCA',
  'FINLANDIA', 'FRANCIA', 'GERMANIA', 'GRECIA', 'IRLANDA', 'LUSSEMBURGO',
  'MAROCCO', 'NORVEGIA', 'PAESI BASSI', 'POLONIA', 'PORTOGALLO', 'REGNO UNITO',
  'REPUBBLICA CECA', 'ROMANIA', 'SLOVACCHIA', 'SLOVENIA', 'SPAGNA', 'STATI UNITI',
  'SVEZIA', 'SVIZZERA', 'UNGHERIA', 'ALBANIA',
]

// Nome paese (IT) → ISO 3166-1 alpha-2, per gli SVG tondi di public/flags.
const ISO: Record<string, string> = {
  ITALIA: 'it', ITALIANA: 'it',
  FRANCIA: 'fr', FRANCESE: 'fr',
  GERMANIA: 'de', TEDESCA: 'de',
  SPAGNA: 'es', SPAGNOLA: 'es',
  'REGNO UNITO': 'gb', INGHILTERRA: 'gb',
  'STATI UNITI': 'us', USA: 'us',
  ALBANIA: 'al', ROMANIA: 'ro', MAROCCO: 'ma', CINA: 'cn', ANDORRA: 'ad',
  AUSTRIA: 'at', BELGIO: 'be', CROAZIA: 'hr', DANIMARCA: 'dk', FINLANDIA: 'fi',
  GRECIA: 'gr', IRLANDA: 'ie', LUSSEMBURGO: 'lu', NORVEGIA: 'no',
  'PAESI BASSI': 'nl', POLONIA: 'pl', PORTOGALLO: 'pt', 'REPUBBLICA CECA': 'cz',
  SLOVACCHIA: 'sk', SLOVENIA: 'si', SVEZIA: 'se', SVIZZERA: 'ch', UNGHERIA: 'hu',
  CANADA: 'ca', RUSSIA: 'ru', TURCHIA: 'tr', GIAPPONE: 'jp', 'COREA DEL SUD': 'kr',
  INDIA: 'in', BRASILE: 'br', ARGENTINA: 'ar', AUSTRALIA: 'au',
  'NUOVA ZELANDA': 'nz', MESSICO: 'mx',
}

/** ISO 3166-1 alpha-2 per un nome paese (IT), '' se sconosciuto. */
export const countryIso = (name?: string): string =>
  name ? (ISO[name.trim().toUpperCase()] ?? '') : ''

/**
 * ISO alpha-2 da un'emoji-bandiera: i regional indicator (U+1F1E6…U+1F1FF)
 * SONO le due lettere del codice, con offset fisso rispetto ad 'A'.
 */
export const isoFromFlagEmoji = (emoji?: string): string => {
  if (!emoji) return ''
  const cps = Array.from(emoji).map(c => c.codePointAt(0) ?? 0)
  const letters = cps.filter(cp => cp >= 0x1f1e6 && cp <= 0x1f1ff)
  if (letters.length !== 2) return ''
  return letters.map(cp => String.fromCharCode(cp - 0x1f1e6 + 97)).join('')
}

/** Emoji bandiera per un nome paese (IT), '' se sconosciuto. */
export const countryFlag = (name?: string): string =>
  name ? (FLAGS[name.trim().toUpperCase()] ?? '') : ''

/** "🇮🇹 ITALIA" — bandiera + nome; ritorna solo il nome se la bandiera è ignota. */
export const withFlag = (name?: string): string => {
  const f = countryFlag(name)
  return f ? `${f} ${name}` : (name ?? '')
}
