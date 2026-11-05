import { ApiError } from '../../../services/api'
import { getToken } from '../../../services/auth.service'
import type { AnagraficaLocale } from '../../../store/useAnagrafichePersonaleStore'

// ─── Anagrafiche del personale: tipo, dati di esempio, regole della demo ─────
//  Condiviso da Archivio del personale e Crea anagrafica personale.

export interface PersonaleItem {
  id?: number
  matricola?: number | string
  nome?: string
  cognome?: string
  sesso?: string
  telefono?: string
  email?: string
  email_aziendale?: string
  contatto_emergenza?: string
  nato_il?: string
  codice_fiscale?: string
  indirizzo?: string
  indirizzo2?: string
  cap?: string
  provincia?: string
  nazione?: string
  strutture?: string
  /** Id avatar (`avatar-07`) o foto come data URL / URL. */
  avatarUrl?: string
  documenti?: {
    identita?: string
    codiceFiscale?: string
    contratto?: string
    privacy?: string
    sicurezza?: string
    altri?: string[]
  }
  [key: string]: unknown
}

export const FALLBACK: PersonaleItem[] = [
  { id: 66, matricola: 66, nome: 'Piero',     cognome: 'Aragona',  telefono: '+39 339 1234567', email: 'p.aragona@hotelnoto.it', contatto_emergenza: 'Maria Aragona +39 340 1112233', nato_il: '12/03/1959', codice_fiscale: 'RSSMRA85C10H501Z', indirizzo: 'VIA DEI MILLE, 30',  cap: '00199', provincia: 'to',   nazione: 'ITA', documenti: { identita: 'carta_identita_aragona.pdf', codiceFiscale: 'tessera_sanitaria_aragona.pdf', contratto: 'contratto_lavoro_2026.pdf', privacy: 'informativa_privacy.pdf', sicurezza: 'formazione_sicurezza.pdf', altri: ['patto_riservatezza.pdf'] } },
  { id: 67, matricola: 67, nome: 'Ruggero',   cognome: 'Novi',     telefono: '+39 340 7654321', nato_il: '17/04/2025', codice_fiscale: 'RSSMRA85C10H501Z', indirizzo: 'VIA DEI MILLE, 30',  cap: '00185', provincia: 'rm',   nazione: 'ITA', documenti: { identita: 'carta_identita_novi.pdf', codiceFiscale: 'tessera_novi.pdf', contratto: 'contratto_novi.pdf', privacy: 'informativa_privacy.pdf', sicurezza: 'formazione_sicurezza.pdf' } },
  { id: 69, matricola: 69, nome: 'Andrea',    cognome: 'Grimaudo', telefono: '+39 333 9988776', email: 'a.grimaudo@hotelnoto.it', contatto_emergenza: 'Luca Grimaudo +39 333 4455661', nato_il: '10/10/1996', codice_fiscale: 'QSSFC90L23F205X', indirizzo: 'VIA DEI MILLE, 30',  cap: '00185', provincia: 'ROMA', nazione: 'ITA', documenti: { identita: 'patente_grimaudo.pdf', codiceFiscale: 'codice_fiscale_grimaudo.pdf', contratto: 'contratto_indeterminato.pdf', privacy: 'informativa_privacy.pdf', altri: ['allegato_mansioni.pdf'] } },
  { id: 82, matricola: 82, nome: 'mario',     cognome: 'idraulico',telefono: '+39 366 1472583', nato_il: '01/01/2025', codice_fiscale: 'token',           indirizzo: 'via nicola da bari', cap: '000000',provincia: 'BA',   nazione: 'ITA' },
  { id: 83, matricola: 83, nome: 'Ali',       cognome: 'Aslan',    telefono: '+39 351 2589631', nato_il: '13/05/2020', codice_fiscale: 'MRSFSDJFKS545ASE',indirizzo: 'Casal Bertone',     cap: '00159', provincia: 'Rome', nazione: 'ITA' },
  { id: 84, matricola: 84, nome: 'dino 2',    cognome: 'tacchini', telefono: '+39 338 7531594', nato_il: '22/08/1985', codice_fiscale: 'safihiqwruajksfbafj', indirizzo: 'via dei mille, 30', cap: '00123', provincia: 'RM',   nazione: 'ITA' },
  { id: 85, matricola: 85, nome: 'Scontrino', cognome: 'test',     telefono: '+39 320 1112233', nato_il: '01/01/2001', codice_fiscale: 'BNCMRC90L15F205X',indirizzo: 'Via delle Magnolie 27', cap: '90146', provincia: 'Palermo', nazione: 'ITA' },
  { id: 86, matricola: 86, nome: 'Scontrino', cognome: 'test',     telefono: '',                nato_il: '01/01/0001', codice_fiscale: 'Vwertyuioi',      indirizzo: 'HR Managment & Innovation', cap: '90146', provincia: 'Palermo', nazione: 'ITA' },
  { id: 88, matricola: 88, nome: 'Andrea G',  cognome: 'Test',     telefono: '+39 347 4455667', email: 'a.test@hotelnoto.it', contatto_emergenza: 'Giulia Test +39 347 9988770', nato_il: '08/07/1994', codice_fiscale: 'qwertyuiop',      indirizzo: 'Viale Luca Gaurico, 283', cap: '00143', provincia: 'Roma', nazione: 'ITA', documenti: { identita: 'carta_identita_test.pdf', contratto: 'contratto_stagionale.pdf' } },
  { id: 89, matricola: 89, nome: 'Marco',     cognome: 'Campo',    telefono: '+39 342 8899001', nato_il: '30/06/1989', codice_fiscale: 'VRDLNZ02A22H501Y',indirizzo: 'Viale Luca Gaurico, 283', cap: '00143', provincia: 'Roma', nazione: 'ITA', documenti: { identita: 'carta_identita_campo.pdf', codiceFiscale: 'tessera_campo.pdf', contratto: 'contratto_campo.pdf', privacy: 'informativa_privacy.pdf', sicurezza: 'formazione_sicurezza.pdf' } },
  { id: 90, matricola: 90, nome: 'Sicilia',   cognome: 'Andrea',   telefono: '+39 331 5566778', nato_il: '01/01/2001', codice_fiscale: 'qwertyuiop',      indirizzo: 'Viale Luca Gaurico, 283', cap: '00143', provincia: 'Roma', nazione: 'ITA' },
]

/**
 * Elenco della demo: dati di esempio con sopra le schede salvate in questo
 * browser (modificate o nuove, in coda) e senza i dipendenti eliminati.
 */
export const elencoDemo = (locali: Record<string, AnagraficaLocale>, eliminati: string[]): PersonaleItem[] => {
  const via = new Set(eliminati)
  const base = FALLBACK.map((p) => (locali[String(p.id)] ? { ...p, ...locali[String(p.id)] } : p))
  const ids = new Set(FALLBACK.map((p) => String(p.id)))
  const nuovi: PersonaleItem[] = Object.values(locali).filter((a) => !ids.has(String(a.id))).sort((a, b) => a.id - b.id).map((a) => ({ ...a }))
  return [...base, ...nuovi].filter((p) => !via.has(String(p.id)))
}

/**
 * Vero quando il backend dell'anagrafica non c'è (rete assente, Portal non
 * configurato, rotta mancante, gateway giù, sessione di sviluppo senza login):
 * in quel caso si lavora sulla copia della demo, come nelle altre pagine.
 * Qualsiasi altra risposta d'errore è un errore vero da mostrare.
 */
export const backendNonRaggiungibile = (e: unknown): boolean => {
  if (!(e instanceof ApiError)) return true
  if (e.status === 401) return !getToken()
  return [0, 404, 501, 502, 503, 504].includes(e.status)
}

/** Messaggio leggibile da un errore del backend (corpo `{ error | message | title }` o testo). */
export const messaggioErrore = (e: unknown, predefinito: string): string => {
  if (e instanceof ApiError) {
    const b = e.body as { error?: string; message?: string; title?: string; detail?: string } | string | null
    const dettaglio = typeof b === 'string' ? b : b?.error || b?.message || b?.detail || b?.title
    return dettaglio && dettaglio.length < 300 ? `${predefinito} ${dettaglio}` : `${predefinito} (errore ${e.status})`
  }
  return predefinito
}
