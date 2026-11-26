import { useSitoStore } from '../useSitoStore'
import { Dizionario, LINGUE, Lingua } from './lingue'
import aree from './dizionari'

export type { Lingua } from './lingue'
export { LINGUE } from './lingue'

/**
 * Traduzione del sito Sibylla Network.
 *
 * La chiave è il testo italiano esatto: `t('Il tuo carrello')`. Le parti
 * variabili vanno come segnaposto: `t('Ciao {nome}', { nome })`. I contenuti
 * che arrivano dai dati (titoli e descrizioni delle offerte, FAQ, pagine) si
 * traducono dove vengono mostrati: `t(o.titolo)`.
 * Se manca una traduzione resta l'italiano. Al cambio di lingua il sito viene
 * ridisegnato da capo (chiave sulla radice in SitoNetwork), quindi `t` si può
 * usare ovunque, anche fuori dai componenti.
 */
const DIZ: Dizionario = { en: {}, de: {}, fr: {}, es: {} }
for (const a of aree) for (const l of Object.keys(DIZ) as (keyof Dizionario)[]) Object.assign(DIZ[l], a[l])

export const linguaCorrente = (): Lingua => useSitoStore.getState().lingua

export function t(testo: string, vars?: Record<string, string | number>): string {
  const l = linguaCorrente()
  let s = l === 'it' ? testo : (DIZ[l][testo] ?? testo)
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

/** Locale per numeri, date e valuta ('it-IT', 'en-GB', …). */
export const loc = (): string => LINGUE.find(x => x.id === linguaCorrente())?.locale ?? 'it-IT'

/** Elenco dei testi italiani senza traduzione nella lingua indicata (per i controlli). */
export const mancanti = (l: Exclude<Lingua, 'it'>, testi: string[]) => testi.filter(s => !(s in DIZ[l]))
