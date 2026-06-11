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

/** Emoji bandiera per un nome paese (IT), '' se sconosciuto. */
export const countryFlag = (name?: string): string =>
  name ? (FLAGS[name.trim().toUpperCase()] ?? '') : ''

/** "🇮🇹 ITALIA" — bandiera + nome; ritorna solo il nome se la bandiera è ignota. */
export const withFlag = (name?: string): string => {
  const f = countryFlag(name)
  return f ? `${f} ${name}` : (name ?? '')
}
