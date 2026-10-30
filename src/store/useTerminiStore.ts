import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { tr, type Lingua } from '../modules/sales/preventivi/CreaPreventivo/lingue'

// ─── Termini e condizioni ─────────────────────────────────────────────────────
//  Libreria dei documenti di termini e condizioni che i template della mail
//  del preventivo inseriscono (blocco "Termini e condizioni"). Ogni documento
//  ha sezioni (titolo + testo). Mock persistito: il BE li salverà per
//  organizzazione, con lo storico delle versioni accettate dai clienti.

export interface SezioneTermini {
  id: string
  titolo: string
  testo: string
}

export interface Termini {
  id: string
  titolo: string
  aggiornato: string
  sezioni: SezioneTermini[]
  /** Traduzioni scritte a mano (titolo e sezioni per id); il resto dal frasario. */
  traduzioni?: Partial<Record<Lingua, { titolo?: string; sezioni?: Record<string, { titolo?: string; testo?: string }> }>>
}

const s = (id: string, titolo: string, testo: string): SezioneTermini => ({ id, titolo, testo })

export const TERMINI_INIT: Termini[] = [
  {
    id: 'tc-generali', titolo: 'Condizioni generali di soggiorno', aggiornato: '01/10/2026',
    sezioni: [
      s('pren', 'Prenotazione e caparra', 'La prenotazione è confermata al ricevimento della caparra del 30% del totale del soggiorno, da versare entro 3 giorni dall\'accettazione della proposta. Il saldo si paga all\'arrivo o alla partenza.'),
      s('canc', 'Cancellazione', 'Cancellazione gratuita fino a 14 giorni prima dell\'arrivo. Da 13 a 3 giorni prima viene trattenuta la caparra; nei 2 giorni precedenti l\'arrivo o in caso di mancato arrivo è dovuto l\'intero importo del soggiorno.'),
      s('orari', 'Arrivo e partenza', 'Le camere sono disponibili dalle ore 14:00 del giorno di arrivo e vanno lasciate entro le ore 11:00 del giorno di partenza. La partenza anticipata non dà diritto a rimborsi.'),
      s('tassa', 'Tassa di soggiorno', 'La tassa di soggiorno è dovuta per legge secondo il regolamento comunale e si paga in struttura; non è compresa nella caparra.'),
      s('privacy', 'Dati personali', 'I dati forniti sono trattati per gestire la prenotazione e gli obblighi di legge (comunicazione alloggiati), secondo il Regolamento UE 2016/679.'),
    ],
  },
  {
    id: 'tc-gruppi', titolo: 'Condizioni per gruppi e aziende', aggiornato: '01/10/2026',
    sezioni: [
      s('pren', 'Conferma e rooming list', 'La conferma è vincolante alla firma della proposta e al versamento dell\'acconto del 40%. La rooming list definitiva va inviata almeno 10 giorni prima dell\'arrivo.'),
      s('rid', 'Riduzioni e release', 'Fino a 30 giorni prima dell\'arrivo si può ridurre il numero di camere del 10% senza penali; oltre, le camere non utilizzate sono addebitate per intero.'),
      s('pag', 'Pagamento', 'Il saldo avviene con bonifico bancario entro la data di arrivo oppure secondo gli accordi di fatturazione indicati nel contratto.'),
      s('resp', 'Responsabilità', 'Il gruppo risponde di eventuali danni arrecati alle camere e agli spazi comuni durante il soggiorno.'),
    ],
  },
]

interface TerminiState {
  documenti: Termini[]
  salva: (t: Termini) => void
  elimina: (id: string) => void
}

export const useTerminiStore = create<TerminiState>()(
  persist(
    (set) => ({
      documenti: TERMINI_INIT,
      salva: (t) => set((st) => {
        const v = { ...t, aggiornato: new Date().toLocaleDateString('it-IT') }
        return {
          documenti: st.documenti.some((x) => x.id === t.id)
            ? st.documenti.map((x) => (x.id === t.id ? v : x))
            : [...st.documenti, v],
        }
      }),
      elimina: (id) => set((st) => ({ documenti: st.documenti.filter((x) => x.id !== id) })),
    }),
    { name: 'sibylla.termini-condizioni', version: 1 },
  ),
)

export const terminiDi = (id: string | null | undefined, documenti = useTerminiStore.getState().documenti) =>
  (id ? documenti.find((d) => d.id === id) ?? null : null)

/** Il documento nella lingua: traduzioni scritte, frasario, oppure italiano. */
export function terminiIn(doc: Termini, lingua: Lingua): Termini {
  if (lingua === 'it') return doc
  const x = doc.traduzioni?.[lingua]
  return {
    ...doc,
    titolo: x?.titolo || tr(lingua, doc.titolo),
    sezioni: doc.sezioni.map((s) => ({
      ...s,
      titolo: x?.sezioni?.[s.id]?.titolo || tr(lingua, s.titolo),
      testo: x?.sezioni?.[s.id]?.testo || tr(lingua, s.testo),
    })),
  }
}
