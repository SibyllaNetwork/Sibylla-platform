/** Lingue del sito Sibylla Network (web e totem). L'italiano è la lingua sorgente. */
export type Lingua = 'it' | 'en' | 'de' | 'fr' | 'es'

export const LINGUE: { id: Lingua; nome: string; sigla: string; bandiera: string; locale: string }[] = [
  { id: 'it', nome: 'Italiano', sigla: 'IT', bandiera: 'it', locale: 'it-IT' },
  { id: 'en', nome: 'English', sigla: 'EN', bandiera: 'gb', locale: 'en-GB' },
  { id: 'de', nome: 'Deutsch', sigla: 'DE', bandiera: 'de', locale: 'de-DE' },
  { id: 'fr', nome: 'Français', sigla: 'FR', bandiera: 'fr', locale: 'fr-FR' },
  { id: 'es', nome: 'Español', sigla: 'ES', bandiera: 'es', locale: 'es-ES' },
]

/** Traduzioni di un'area: chiave = testo italiano esatto (con i segnaposto {nome}). */
export type Dizionario = Record<Exclude<Lingua, 'it'>, Record<string, string>>

/** Riga di dizionario: [italiano, inglese, tedesco, francese, spagnolo]. */
export type Riga = [it: string, en: string, de: string, fr: string, es: string]

/** Da righe [it, en, de, fr, es] al dizionario per lingua. */
export function righe(r: Riga[]): Dizionario {
  const d: Dizionario = { en: {}, de: {}, fr: {}, es: {} }
  for (const [it, en, de, fr, es] of r) { d.en[it] = en; d.de[it] = de; d.fr[it] = fr; d.es[it] = es }
  return d
}
