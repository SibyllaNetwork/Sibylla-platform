import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  autoreHr, giorniLavorativi, type RichiestaAssenza, type StatoRichiesta,
} from './useHrGestioneStore'

// ─── HUMAN RESOURCES › PIANO FERIE ───────────────────────────────────────────
// L'ufficio del personale apre un piano per ogni periodo festivo (Natale, Pasqua,
// estate…): nome, periodo e termine entro cui i dipendenti chiedono le ferie
// dall'App Op!. Nel piano contano solo le richieste di FERIE che cadono nel suo
// periodo (tagliate ai suoi confini). Quando il periodo è gestito l'HR chiude il
// piano: resta nello storico con la fotografia delle ferie a quella data, anche
// se poi le richieste cambiano. Mock persistito (demo): il BE sostituirà seed e azioni.

export type StatoPiano = 'Aperto' | 'Archiviato'

/** Riga della fotografia del piano alla chiusura. */
export interface FerieArchiviate {
  richiestaId: string
  dipendenteId: number
  /** Già tagliate ai confini del piano. */
  dal: string
  al: string
  stato: StatoRichiesta
  giorni: number
}

export interface PianoFerie {
  id: string
  nome: string
  /** aaaa-mm-gg */
  dal: string
  al: string
  /** Termine per chiedere le ferie del piano dall'App Op! (aaaa-mm-gg), facoltativo. */
  scadenzaRichieste?: string
  /** Assenti contemporanei per reparto oltre cui il giorno si segnala come scoperto. */
  maxAssentiReparto: number
  /** Avviso ai dipendenti mostrato nell'App Op!. */
  note?: string
  stato: StatoPiano
  createdAt: string
  creatoDa: string
  archiviatoAt?: string
  archiviatoDa?: string
  /** Fotografia delle ferie del piano alla chiusura. */
  archivio?: FerieArchiviate[]
}

export type DatiPiano = Pick<PianoFerie, 'nome' | 'dal' | 'al' | 'scadenzaRichieste' | 'maxAssentiReparto' | 'note'>

/** Ferie che rientrano nel piano: tipo Ferie, periodo che si sovrappone, tagliate ai confini. */
export function feriePiano(richieste: RichiestaAssenza[], p: Pick<PianoFerie, 'dal' | 'al'>): FerieArchiviate[] {
  return richieste
    .filter(r => r.tipo === 'Ferie' && r.dal <= p.al && r.al >= p.dal)
    .map(r => {
      const dal = r.dal < p.dal ? p.dal : r.dal
      const al = r.al > p.al ? p.al : r.al
      return { richiestaId: r.id, dipendenteId: r.dipendenteId, dal, al, stato: r.stato, giorni: giorniLavorativi(dal, al) }
    })
}

/** Le ferie del piano: dal vivo se aperto, dalla fotografia se archiviato. */
export const feriePianoCorrenti = (richieste: RichiestaAssenza[], p: PianoFerie) =>
  p.stato === 'Archiviato' && p.archivio ? p.archivio : feriePiano(richieste, p)

const uid = () => `pf-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// ── Seed: Natale in corso di raccolta + estate già chiusa nello storico ──
function seed(): PianoFerie[] {
  const oggi = new Date()
  const an = oggi.getMonth() >= 1 ? oggi.getFullYear() : oggi.getFullYear() - 1
  const estate: FerieArchiviate[] = ([
    [1, '07-06', '07-17', 'Approvata'], [2, '08-10', '08-21', 'Approvata'], [3, '08-17', '08-28', 'Approvata'],
    [4, '07-20', '07-31', 'Approvata'], [5, '08-03', '08-14', 'Approvata'], [6, '06-22', '07-03', 'Approvata'],
    [7, '08-24', '09-04', 'Approvata'], [8, '09-07', '09-18', 'Approvata'], [9, '08-10', '08-14', 'Rifiutata'],
    [9, '08-31', '09-11', 'Approvata'], [10, '07-27', '08-07', 'Approvata'], [11, '06-15', '06-26', 'Approvata'],
    [12, '08-17', '08-21', 'Approvata'],
  ] as [number, string, string, StatoRichiesta][]).map(([dipendenteId, a, b, stato], i) => {
    const dal = `${an}-${a}`, al = `${an}-${b}`
    return { richiestaId: `ra-est-${i + 1}`, dipendenteId, dal, al, stato, giorni: giorniLavorativi(dal, al) }
  })
  return [
    {
      id: 'pf-natale', nome: `Natale ${an}`, dal: `${an}-12-01`, al: `${an + 1}-01-07`,
      scadenzaRichieste: `${an}-11-20`, maxAssentiReparto: 1,
      note: 'Chiedete le ferie di Natale e Capodanno entro il 20 novembre: oltre quella data valutiamo solo i casi urgenti.',
      stato: 'Aperto', createdAt: `${an}-10-15T09:00:00`, creatoDa: 'Ufficio del personale',
    },
    {
      id: 'pf-estate', nome: `Estate ${an}`, dal: `${an}-06-01`, al: `${an}-09-30`,
      scadenzaRichieste: `${an}-04-30`, maxAssentiReparto: 1,
      note: 'Due settimane a testa a rotazione, una in luglio o agosto e una a scelta.',
      stato: 'Archiviato', createdAt: `${an}-03-02T09:00:00`, creatoDa: 'Ufficio del personale',
      archiviatoAt: `${an}-10-01T10:00:00`, archiviatoDa: 'Ufficio del personale', archivio: estate,
    },
  ]
}

interface PianiFerieState {
  piani: PianoFerie[]
  crea: (d: DatiPiano) => string
  modifica: (id: string, d: DatiPiano) => void
  /** Chiude il piano e ne salva la fotografia delle ferie nello storico. */
  archivia: (id: string, richieste: RichiestaAssenza[]) => void
  riapri: (id: string) => void
  elimina: (id: string) => void
}

export const usePianiFerieStore = create<PianiFerieState>()(persist((set) => ({
  piani: seed(),
  crea: (d) => {
    const id = uid()
    set(st => ({ piani: [{ ...d, id, stato: 'Aperto', createdAt: new Date().toISOString(), creatoDa: autoreHr() }, ...st.piani] }))
    return id
  },
  modifica: (id, d) => set(st => ({ piani: st.piani.map(p => p.id === id ? { ...p, ...d } : p) })),
  archivia: (id, richieste) => set(st => ({ piani: st.piani.map(p => p.id === id
    ? { ...p, stato: 'Archiviato', archiviatoAt: new Date().toISOString(), archiviatoDa: autoreHr(), archivio: feriePiano(richieste, p) }
    : p) })),
  riapri: (id) => set(st => ({ piani: st.piani.map(p => p.id === id
    ? { ...p, stato: 'Aperto', archiviatoAt: undefined, archiviatoDa: undefined, archivio: undefined }
    : p) })),
  elimina: (id) => set(st => ({ piani: st.piani.filter(p => p.id !== id) })),
}), { name: 'sibylla.hr-piani-ferie', version: 1 }))
