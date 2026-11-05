import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Anagrafiche del personale salvate in questo browser ─────────────────────
//  Copia locale della demo, usata solo quando il backend dell'anagrafica
//  (`/Sibylla/anagrafica-personale/*`) non è raggiungibile: Crea anagrafica vi
//  salva le schede nuove o modificate (foto compresa), l'Archivio del personale
//  le sovrappone ai dati di esempio e vi annota i dipendenti eliminati.
//  Con il backend attivo questi dati non vengono letti.

export interface AnagraficaLocale {
  id: number
  matricola?: number | string
  nome?: string
  cognome?: string
  sesso?: string
  telefono?: string
  email?: string
  email_aziendale?: string
  contatto_emergenza?: string
  /** gg/mm/aaaa, come le righe dell'Archivio. */
  nato_il?: string
  codice_fiscale?: string
  indirizzo?: string
  indirizzo2?: string
  cap?: string
  provincia?: string
  nazione?: string
  strutture?: string
  /** Id avatar (`avatar-07`) o foto ridimensionata come data URL. */
  avatarUrl?: string
  documenti?: {
    identita?: string
    codiceFiscale?: string
    contratto?: string
    privacy?: string
    sicurezza?: string
    altri?: string[]
  }
  aggiornatoIl: string
}

interface State {
  /** Schede salvate in locale, per id del dipendente. */
  anagrafiche: Record<string, AnagraficaLocale>
  /** Id dei dipendenti eliminati (anche quelli dei dati di esempio). */
  eliminati: string[]
  salva: (a: Omit<AnagraficaLocale, 'aggiornatoIl'>) => void
  elimina: (id: string) => void
}

export const useAnagrafichePersonaleStore = create<State>()(
  persist(
    (set) => ({
      anagrafiche: {},
      eliminati: [],
      salva: (a) => set((s) => ({
        anagrafiche: { ...s.anagrafiche, [String(a.id)]: { ...s.anagrafiche[String(a.id)], ...a, aggiornatoIl: new Date().toISOString() } },
        eliminati: s.eliminati.filter((x) => x !== String(a.id)),
      })),
      elimina: (id) => set((s) => {
        const { [id]: _tolta, ...resto } = s.anagrafiche
        return { anagrafiche: resto, eliminati: s.eliminati.includes(id) ? s.eliminati : [...s.eliminati, id] }
      }),
    }),
    { name: 'sibylla.anagrafiche-personale', version: 1 },
  ),
)

/** Primo id numerico libero dopo quelli già usati (dati di esempio + copia locale). */
export const prossimoIdLocale = (usati: (number | string | undefined)[]): number => {
  const n = usati.map((x) => Number(x)).filter((x) => Number.isFinite(x))
  const locali = Object.keys(useAnagrafichePersonaleStore.getState().anagrafiche).map(Number).filter(Number.isFinite)
  const eliminati = useAnagrafichePersonaleStore.getState().eliminati.map(Number).filter(Number.isFinite)
  return Math.max(0, ...n, ...locali, ...eliminati) + 1
}
