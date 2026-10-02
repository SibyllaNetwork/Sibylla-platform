import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMemo } from 'react'

// ─── VCC INCASSATE PRIMA DEL CHECK-IN ────────────────────────────────────────
// Requisito "Gestione VCC Emesse" (docs/Requisito Gestione VCC Emesse.docx).
// Una struttura può incassare la VCC prima della data in: se la prenotazione
// viene poi modificata o cancellata, l'importo incassato non coincide più con
// quello effettivo (da Vertical) e l'Amministrazione Sibylla lavora il delta:
//   delta > 0 → genera la VCC integrativa, poi conferma la risoluzione;
//   delta < 0 → chiede un bonifico alla struttura (fuori piattaforma), poi
//               conferma la risoluzione.
// Store persistito e condiviso: la pagina Admin "VCC emesse" e il Centro
// notifiche (casistiche scadute) leggono gli stessi dati.

export type StatusPrenotazione = 'Confermata' | 'Modificata' | 'Cancellata'
export type StatoLavorazione = 'Nessuna azione necessaria' | 'Da lavorare' | 'Risolto'

export const STATUS_PRENOTAZIONE: StatusPrenotazione[] = ['Confermata', 'Modificata', 'Cancellata']
export const STATI_LAVORAZIONE: StatoLavorazione[] = ['Nessuna azione necessaria', 'Da lavorare', 'Risolto']

export interface VccEmessa {
  id: string
  struttura: string
  bookingId: string
  /** Importo della VCC già incassata: non cambia più dopo l'incasso. */
  importoStruttura: number
  status: StatusPrenotazione
  /** Data di check-in, aaaa-mm-gg. */
  dataIn: string
  /** Importo effettivo della prenotazione ricevuto da Vertical. */
  importoDataIn: number
  /** VCC integrativa (pari al delta) generata per le modifiche positive. */
  integrativa: boolean
  /** Lavorazione chiusa dall'Amministrazione ("Risolto" a back end). */
  risolto: boolean
  risoltoAt?: string
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** Delta importi = Importo data in − Importo struttura. */
export const deltaOf = (v: VccEmessa) => r2(v.importoDataIn - v.importoStruttura)

export function statoLavorazioneOf(v: VccEmessa): StatoLavorazione {
  if (deltaOf(v) === 0) return 'Nessuna azione necessaria'
  return v.risolto ? 'Risolto' : 'Da lavorare'
}

export const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Casistica scaduta: data in passata, delta ≠ 0 e lavorazione non risolta. */
export const isScaduta = (v: VccEmessa, oggi = todayIso()) =>
  v.dataIn < oggi && deltaOf(v) !== 0 && !v.risolto

/** Vista di default: data in ≥ oggi, oppure casistiche scadute ancora aperte. */
export const isDaMonitorare = (v: VccEmessa, oggi = todayIso()) =>
  v.dataIn >= oggi || isScaduta(v, oggi)

export const vccScadute = (rows: VccEmessa[], oggi = todayIso()) =>
  rows.filter(v => isScaduta(v, oggi))

// ─── Dati di esempio ─────────────────────────────────────────────────────────
// Date relative a oggi, così la demo mostra sempre sia casistiche future sia
// scadute (le prime righe ricalcano il mock-up del requisito).
const shift = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type SeedRow = [string, string, number, StatusPrenotazione, number, number, Partial<VccEmessa>?]
const SEED_ROWS: SeedRow[] = [
  ['Hotel Aurora Roma',      'G2TEST-BPBQ7K', 420,  'Cancellata', -4,  0],
  ['Villa Sole Taormina',    'G2TEST-TNP4XA', 650,  'Modificata', -2,  780],
  ['Palazzo Navona Suites',  'G2TEST-DKT3ME', 910,  'Modificata',  0,  760],
  ['Grand Hotel Riviera',    'G2TEST-WBIL2Q', 300,  'Confermata',  3,  300],
  ['Residenza dei Fiori',    'G2TEST-OQ53RV', 540,  'Modificata',  6,  615,  { integrativa: true }],
  ['Hotel Bellavista Como',  'G2TEST-1T6GHZ', 1200, 'Confermata', 10,  1200],
  ['Casa Lido Venezia',      'G2TEST-I631PL', 275,  'Cancellata', 13,  0],
  ['Borgo Antico Spa',       'G2TEST-KM82WD', 860,  'Modificata', 15,  990],
  ['Hotel Duomo Milano',     'G2TEST-ZR47BN', 1480, 'Confermata', 18,  1480],
  ['Masseria Ulivi',         'G2TEST-HC19TS', 720,  'Modificata', 21,  640],
  ['Resort Mare Chiaro',     'G2TEST-PF05LU', 395,  'Confermata', 24,  395],
  ['Hotel Aurora Roma',      'G2TEST-QA88XE', 560,  'Modificata', 27,  610],
  ['Villa Sole Taormina',    'G2TEST-NB61KC', 1040, 'Cancellata', 31,  0],
  ['Grand Hotel Riviera',    'G2TEST-EY24VM', 480,  'Confermata', 35,  480],
  // Passate e già risolte / senza delta: fuori dalla vista di default.
  ['Palazzo Navona Suites',  'G2TEST-LS30GA', 690,  'Modificata', -9,  820,  { integrativa: true, risolto: true }],
  ['Casa Lido Venezia',      'G2TEST-WX72DO', 350,  'Cancellata', -12, 0,    { risolto: true }],
  ['Hotel Bellavista Como',  'G2TEST-MJ46RF', 900,  'Confermata', -6,  900],
  // Scaduta ancora aperta.
  ['Borgo Antico Spa',       'G2TEST-CV13YP', 610,  'Modificata', -7,  540],
]

const SEED: VccEmessa[] = SEED_ROWS.map(([struttura, bookingId, importoStruttura, status, giorni, importoDataIn, extra], i) => ({
  id: `vcc-${i + 1}`,
  struttura, bookingId, importoStruttura, status,
  dataIn: shift(giorni),
  importoDataIn,
  integrativa: false,
  risolto: false,
  ...extra,
}))

/** Esito della lavorazione registrato dall'Amministrazione (unica parte persistita). */
interface Esito { integrativa?: boolean; risolto?: boolean; risoltoAt?: string }

interface VccEmesseState {
  esiti: Record<string, Esito>
  /** Flusso modifica positiva: genera la VCC integrativa pari al delta. */
  generaIntegrativa: (id: string) => void
  /** Conferma la risoluzione della lavorazione (Stato lavorazione → Risolto). */
  risolvi: (id: string) => void
  /** Notifica delle casistiche scadute nel Centro notifiche. */
  notificaScadute: boolean
  setNotificaScadute: (on: boolean) => void
}

const setEsito = (s: VccEmesseState, id: string, e: Esito) =>
  ({ esiti: { ...s.esiti, [id]: { ...s.esiti[id], ...e } } })

export const useVccEmesseStore = create<VccEmesseState>()(
  persist(
    (set) => ({
      esiti: {},
      generaIntegrativa: (id) => set((s) => setEsito(s, id, { integrativa: true })),
      risolvi: (id) => set((s) => setEsito(s, id, { risolto: true, risoltoAt: new Date().toISOString() })),
      notificaScadute: true,
      setNotificaScadute: (notificaScadute) => set({ notificaScadute }),
    }),
    { name: 'sibylla.vcc-emesse', version: 1 },
  ),
)

/** Righe VCC (dati di esempio + esiti registrati). Al collegamento col back end
 *  la sorgente diventa l'API; gli esiti diventano le chiamate di lavorazione. */
export function useVccRows(): VccEmessa[] {
  const esiti = useVccEmesseStore((s) => s.esiti)
  return useMemo(() => SEED.map(v => ({ ...v, ...esiti[v.id] })), [esiti])
}
