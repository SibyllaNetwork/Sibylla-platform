import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LivelloOp, RepartoOp } from '../modules/appop/opCatalogo'

// ─── Abilitazione App Op! del dipendente ─────────────────────────────────────
//  Sezione «App Op!» di Crea anagrafica personale: il check di abilitazione,
//  l'email aziendale a cui arriva il token di invito e reparti/grado con cui il
//  dipendente entra nell'app. L'Archivio del personale mostra l'azione
//  «Invita Op!» solo per chi è abilitato (e con il modulo App Op! attivo).
//  Collegato all'anagrafica per `anagraficaId`, come i contratti.

export interface AbilitazioneOp {
  abilitato: boolean
  emailAziendale: string
  livello: LivelloOp
  reparti: RepartoOp[]
  responsabile: boolean
  hr: boolean
  /** Utenza creata nell'App Op! (dopo il primo invito). */
  opId?: number
  ultimoInvito?: { emailMascherata: string; scadeIl: string; inviatoIl: string }
}

export const abilitazioneVuota = (): AbilitazioneOp => ({
  abilitato: false, emailAziendale: '', livello: 'impiegato', reparti: [], responsabile: false, hr: false,
})

const SEED: Record<string, AbilitazioneOp> = {
  '66': { abilitato: true, emailAziendale: 'p.aragona@hotelnoto.it', livello: 'amministratore', reparti: ['frontOffice', 'risorseUmane'], responsabile: true, hr: true },
  '89': { abilitato: true, emailAziendale: 'm.campo@hotelnoto.it', livello: 'impiegato', reparti: ['frontOffice'], responsabile: false, hr: false },
  // Collaboratori esterni (chiave est-<id>, vedi useCollaboratoriEsterniStore)
  'est-ce-1': { abilitato: true, emailAziendale: 'e.morra@splendorservizi.it', livello: 'impiegato', reparti: ['pulizie'], responsabile: false, hr: false },
  'est-ce-2': { abilitato: true, emailAziendale: 'd.lupo@tecnoimpiantihotel.it', livello: 'impiegato', reparti: ['manutenzione'], responsabile: false, hr: false },
}

interface State {
  abilitazioni: Record<string, AbilitazioneOp>
  set: (anagraficaId: string, a: AbilitazioneOp) => void
  patch: (anagraficaId: string, p: Partial<AbilitazioneOp>) => void
  /** Sposta l'abilitazione da una chiave provvisoria (`nuovo-…`) all'id definitivo. */
  sposta: (da: string, a: string) => void
  /** Toglie l'abilitazione (eliminazione del dipendente). */
  rimuovi: (anagraficaId: string) => void
}

export const useAnagraficaOpStore = create<State>()(
  persist(
    (set) => ({
      abilitazioni: SEED,
      set: (id, a) => set(s => ({ abilitazioni: { ...s.abilitazioni, [id]: a } })),
      patch: (id, p) => set(s => ({ abilitazioni: { ...s.abilitazioni, [id]: { ...(s.abilitazioni[id] ?? abilitazioneVuota()), ...p } } })),
      sposta: (da, a) => set(s => {
        if (da === a || !s.abilitazioni[da]) return s
        const { [da]: abil, ...resto } = s.abilitazioni
        return { abilitazioni: { ...resto, [a]: { ...resto[a], ...abil } } }
      }),
      rimuovi: (id) => set(s => {
        const { [id]: _tolta, ...resto } = s.abilitazioni
        return { abilitazioni: resto }
      }),
    }),
    {
      name: 'sibylla.anagrafica-op',
      version: 2,
      // v2: abilitazioni dei collaboratori esterni di esempio
      migrate: (persisted: any) => ({ abilitazioni: { ...SEED, ...(persisted?.abilitazioni ?? {}) } }) as any,
    },
  ),
)
