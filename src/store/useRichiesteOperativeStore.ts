import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Richieste operative (Tour Operator → Hotel) ──────────────────────────────
//  In fase di prenotazione il Tour Operator invia alla struttura di destinazione
//  una richiesta operativa per i suoi clienti (es. mazzo di fiori o bottiglia di
//  champagne in camera all'arrivo). La richiesta è agganciata a una specifica
//  prenotazione del planner (bookingId = Pren.booking) e segue il flusso:
//
//    inviata ──(operatore esegue e conferma)──▶ eseguita
//
//  Quando inviata:
//    • arriva all'hotel come notifica nel Centro notifiche;
//    • compare nel Planner, nella sezione "Richieste operative".
//  Quando eseguita:
//    • sulla barra della prenotazione del TO nel planner appare un'icona; al
//      rollover la tooltip mostra il dettaglio della richiesta.
//
//  Store singleton persistito su localStorage: la pagina TO, il Centro notifiche
//  e il Planner sono alberi React separati e condividono lo stato qui.

export type StatoRichiesta = 'inviata' | 'eseguita'

export const STATO_RICHIESTA_META: Record<
  StatoRichiesta,
  { label: string; tone: 'wait' | 'ok'; icon: string }
> = {
  inviata:  { label: 'Da eseguire', tone: 'wait', icon: 'clock' },
  eseguita: { label: 'Eseguita',    tone: 'ok',   icon: 'circle-check' },
}

/** Servizio/extra scelto dal catalogo (stile "pacchetti dinamici"). */
export interface ServizioSel {
  id: string
  label: string
  icon: string
  categoryId: string
  categoryLabel: string
}

export interface RichiestaOperativa {
  id: string
  /** Riferimento alla prenotazione del planner (Pren.booking). */
  bookingId: string
  /** Nominativo cliente / etichetta prenotazione. */
  nominativo: string
  strutturaNome: string
  citta: string
  /** Periodo del soggiorno (ISO yyyy-MM-dd). */
  dalISO: string
  alISO: string
  descrizione: string
  servizi: ServizioSel[]
  stato: StatoRichiesta
  createdAt: number
  eseguitaAt?: number
}

export interface NuovaRichiestaInput {
  bookingId: string
  nominativo: string
  strutturaNome: string
  citta: string
  dalISO: string
  alISO: string
  descrizione: string
  servizi: ServizioSel[]
}

interface RichiesteOperativeState {
  richieste: RichiestaOperativa[]
  invia: (input: NuovaRichiestaInput) => void
  /** L'operatore conferma l'esecuzione della richiesta. */
  eseguita: (id: string) => void
  /** Riporta la richiesta in "da eseguire". */
  annulla: (id: string) => void
  remove: (id: string) => void
}

const now = () => Date.now()
const uid = () => `ro-${now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`

// Seed dimostrativo agganciato a prenotazioni "Tour Operator Test" del planner
// (planner.data → PRENS). Una richiesta da eseguire e una già eseguita, così il
// planner mostra subito sia la voce in elenco sia l'icona sulla barra.
const SEED: RichiestaOperativa[] = [
  {
    id: 'ro-seed-1',
    bookingId: '15080',
    nominativo: 'Mario Giordani',
    strutturaNome: 'Hotel Tutorial',
    citta: 'Roma',
    dalISO: '2026-04-13',
    alISO: '2026-04-14',
    descrizione:
      'Allestire la camera con un mazzo di fiori freschi e una bottiglia di champagne in ghiaccio per l\'arrivo degli sposi.',
    servizi: [
      { id: 'fiori',     label: 'Fiori freschi', icon: 'flower',            categoryId: 'camera', categoryLabel: 'Camera & Allestimenti' },
      { id: 'champagne', label: 'Champagne',     icon: 'champagne-glasses', categoryId: 'fb',     categoryLabel: 'Food & Beverage' },
    ],
    stato: 'inviata',
    createdAt: now() - 1000 * 60 * 60 * 3,
  },
  {
    id: 'ro-seed-2',
    bookingId: '15082',
    nominativo: 'Gruppo Aurora',
    strutturaNome: 'Hotel Tutorial',
    citta: 'Roma',
    dalISO: '2026-04-13',
    alISO: '2026-04-14',
    descrizione: 'Cesto di benvenuto con prodotti tipici locali in camera prima del check-in.',
    servizi: [
      { id: 'cesto', label: 'Cesto di benvenuto', icon: 'basket-shopping', categoryId: 'fb', categoryLabel: 'Food & Beverage' },
    ],
    stato: 'eseguita',
    createdAt: now() - 1000 * 60 * 60 * 26,
    eseguitaAt: now() - 1000 * 60 * 60 * 4,
  },
]

export const useRichiesteOperativeStore = create<RichiesteOperativeState>()(
  persist(
    (set) => ({
      richieste: SEED,
      invia: (input) =>
        set((state) => ({
          richieste: [
            { id: uid(), ...input, stato: 'inviata', createdAt: now() },
            ...state.richieste,
          ],
        })),
      eseguita: (id) =>
        set((state) => ({
          richieste: state.richieste.map((r) =>
            r.id === id ? { ...r, stato: 'eseguita', eseguitaAt: now() } : r,
          ),
        })),
      annulla: (id) =>
        set((state) => ({
          richieste: state.richieste.map((r) =>
            r.id === id ? { ...r, stato: 'inviata', eseguitaAt: undefined } : r,
          ),
        })),
      remove: (id) =>
        set((state) => ({ richieste: state.richieste.filter((r) => r.id !== id) })),
    }),
    { name: 'sibylla.richieste-operative', version: 2 },
  ),
)

// ─── Selettori puri ───────────────────────────────────────────────────────────

/** Richieste agganciate a una prenotazione del planner. */
export function richiesteByBooking(
  richieste: RichiestaOperativa[],
  bookingId: string,
): RichiestaOperativa[] {
  return richieste.filter((r) => r.bookingId === bookingId)
}

/** Set dei bookingId con almeno una richiesta già eseguita (→ icona sulla barra). */
export function bookingsConRichiestaEseguita(richieste: RichiestaOperativa[]): Set<string> {
  return new Set(richieste.filter((r) => r.stato === 'eseguita').map((r) => r.bookingId))
}

/** Set dei bookingId con almeno una richiesta ancora da eseguire. */
export function bookingsConRichiestaInAttesa(richieste: RichiestaOperativa[]): Set<string> {
  return new Set(richieste.filter((r) => r.stato === 'inviata').map((r) => r.bookingId))
}

/** Numero di richieste ancora da eseguire (badge planner). */
export function richiestePendingCount(richieste: RichiestaOperativa[]): number {
  return richieste.filter((r) => r.stato === 'inviata').length
}
