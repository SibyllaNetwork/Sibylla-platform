// ─── REGISTRO PRESENZE — stato condiviso ────────────────────────────────────────
//  Presenze e timbrature del personale, lette da Registro presenze (vista
//  giornaliera e dettagliata), Timbrature e Cedolini. Le giornate sono generate
//  in modo deterministico (demo) e incrociate con le richieste approvate in
//  Human resources › Richieste: ferie, malattia, ROL e permessi approvati
//  compaiono da soli nel registro. Qui si salvano solo le correzioni fatte a
//  mano dall'ufficio del personale.
import { useCallback } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { autoreHr, DIPENDENTI_HR, useHrGestioneStore, type RichiestaAssenza } from './useHrGestioneStore'
import {
  chiaveGiorno, dataDa, GIORNO_MIN, inserisciPermesso, isoDi, segmentiDaTimbrature, segmentiGiorno,
  timbratureDaSegmenti, turnoPrevisto, uscitaDimenticata, ORE_ORDINARIE,
  type GiornataRegistro, type SegmentoPresenza, type Timbratura,
} from '../modules/hr/_presenze/presenze.model'

export interface TrasmissioneConsuntivo {
  id: string
  /** Mese di competenza (aaaa-mm). */
  mese: string
  software: string
  at: string
  autore: string
  dipendenti: number
  oreOrdinarie: number
  oreStraordinario: number
  giorniFerie: number
  orePermessi: number
  giorniMalattia: number
  /** Timbrature anomale presenti al momento dell'invio. */
  anomalie: number
  note?: string
  /** «simulato» finché il connettore paghe non è attivo sull'ambiente. */
  esito?: 'inviato' | 'simulato'
  protocollo?: string
  /** File consegnato (es. RILPRE) con il numero di record. */
  file?: { nome: string; record: number }
}

interface RegistroPresenzeState {
  /** Giornate corrette a mano (tipo di giornata o orario). */
  segmenti: Record<string, SegmentoPresenza[]>
  /** Timbrature corrette a mano: quando ci sono, la presenza si ricalcola da loro. */
  timbrature: Record<string, Timbratura[]>
  /** Straordinario approvato dal datore di lavoro, in minuti, per giornata (Cedolini). */
  straordinarioApprovato: Record<string, number>
  /** Timbratura dall'app con nome e cognome consentita fino a questa data (aaaa-mm-gg). */
  timbraturaConNomeFino: string
  impostaSegmenti: (chiave: string, segmenti: SegmentoPresenza[]) => void
  impostaTimbrature: (chiave: string, timbrature: Timbratura[]) => void
  /** Svuota la giornata: nessuna presenza né assenza. */
  eliminaGiornata: (chiave: string) => void
  approvaStraordinario: (chiave: string, minuti: number | null) => void
  setTimbraturaConNomeFino: (iso: string) => void
  trasmissioni: TrasmissioneConsuntivo[]
  registraTrasmissione: (t: Omit<TrasmissioneConsuntivo, 'id' | 'at' | 'autore'>) => TrasmissioneConsuntivo
}

const fra = (giorni: number) => { const d = new Date(); d.setDate(d.getDate() + giorni); return isoDi(d) }

export const useRegistroPresenzeStore = create<RegistroPresenzeState>()(persist((set) => ({
  trasmissioni: [],
  registraTrasmissione: (t) => {
    const voce: TrasmissioneConsuntivo = { ...t, id: `tc${Date.now()}`, at: new Date().toISOString(), autore: autoreHr() }
    set((st) => ({ trasmissioni: [voce, ...st.trasmissioni] }))
    return voce
  },
  segmenti: {},
  timbrature: {},
  straordinarioApprovato: {},
  timbraturaConNomeFino: fra(30),
  impostaSegmenti: (k, seg) => set((st) => {
    const timbrature = { ...st.timbrature }
    delete timbrature[k]
    return { segmenti: { ...st.segmenti, [k]: seg }, timbrature }
  }),
  impostaTimbrature: (k, lista) => set((st) => ({ timbrature: { ...st.timbrature, [k]: lista } })),
  eliminaGiornata: (k) => set((st) => {
    const timbrature = { ...st.timbrature }
    delete timbrature[k]
    return { segmenti: { ...st.segmenti, [k]: [] }, timbrature }
  }),
  approvaStraordinario: (k, minuti) => set((st) => {
    const straordinarioApprovato = { ...st.straordinarioApprovato }
    if (minuti == null) delete straordinarioApprovato[k]
    else straordinarioApprovato[k] = minuti
    return { straordinarioApprovato }
  }),
  setTimbraturaConNomeFino: (iso) => set({ timbraturaConNomeFino: iso }),
}), { name: 'sibylla.registro-presenze', version: 1 }))

/** Richiesta approvata dall'HR che copre il giorno. */
function approvataDi(richieste: RichiestaAssenza[], id: number, iso: string) {
  return richieste.find((r) => r.dipendenteId === id && r.stato === 'Approvata' && r.dal <= iso && r.al >= iso)
}

/** Giornata generata: turno demo, con sopra le assenze approvate in Richieste. */
function generaGiornata(richieste: RichiestaAssenza[], id: number, iso: string): SegmentoPresenza[] {
  const d = dataDa(iso)
  const base = segmentiGiorno(id, d)
  const turno = turnoPrevisto(id, d)
  const r = approvataDi(richieste, id, iso)
  if (!r || !turno) return base
  if (r.tipo === 'Ferie') return [{ tipo: 'ferie', start_min: 0, end_min: GIORNO_MIN, note: r.note || 'Ferie' }]
  if (r.tipo === 'Malattia') return [{ tipo: 'assenza', start_min: 0, end_min: GIORNO_MIN, note: 'Malattia' }]
  const ore = r.dal === r.al && r.ore != null ? r.ore : ORE_ORDINARIE
  if (ore >= ORE_ORDINARIE) return [{ tipo: 'permesso', start_min: turno.inizio, end_min: turno.inizio + ORE_ORDINARIE * 60, note: r.tipo }]
  // Permesso a ore a fine turno: il dipendente esce prima.
  const fine = Math.max(...base.filter((s) => s.tipo === 'presente').map((s) => s.end_min))
  return inserisciPermesso(base, fine - ore * 60, fine, r.tipo)
}

/** Dipendenti che non hanno ancora attivato l'App Op! (demo). */
export const SENZA_APP = [8, 11]
/** Postazione da cui il dipendente timbra di solito (demo). */
export const postazioneDi = (id: number) => (SENZA_APP.includes(id) ? 'kiosk ingresso personale' : id % 3 === 0 ? 'App Op!' : 'kiosk ingresso personale')

type StatoRegistro = Pick<RegistroPresenzeState, 'segmenti' | 'timbrature'>

/** La giornata di un dipendente come la vedono tutte le pagine. */
export function giornataPresenze(st: StatoRegistro, richieste: RichiestaAssenza[], id: number, iso: string, ora = new Date()): GiornataRegistro {
  const k = chiaveGiorno(id, iso)
  const manuali = st.timbrature[k]
  const base = st.segmenti[k] ?? generaGiornata(richieste, id, iso)
  // Chi ha attivato l'App Op! timbra col telefono, gli altri dal kiosk all'ingresso.
  let timbrature = manuali ?? timbratureDaSegmenti(base, k).map((t) => ({ ...t, postazione: postazioneDi(id) }))
  let segmenti = manuali ? segmentiDaTimbrature(manuali, base) : base
  const oggi = iso === isoDi(ora)
  if (!manuali && !st.segmenti[k] && !oggi && iso < isoDi(ora) && uscitaDimenticata(id, dataDa(iso)) && timbrature.length) {
    timbrature = timbrature.slice(0, -1)
  }
  // Oggi esiste solo quello che è già successo: le timbrature dopo quest'ora non ci sono ancora.
  if (oggi && !manuali) {
    const adesso = ora.getHours() * 60 + ora.getMinutes()
    timbrature = timbrature.filter((t) => t.min <= adesso)
    segmenti = segmenti.flatMap((s) => (s.tipo === 'presente' || s.tipo === 'pausa'
      ? (s.start_min >= adesso ? [] : [{ ...s, end_min: Math.min(s.end_min, adesso) }])
      : [s]))
  }
  const ultima = [...timbrature].sort((a, b) => a.min - b.min).pop()
  return {
    segmenti,
    timbrature,
    modificato: !!st.segmenti[k] || !!manuali,
    inServizio: oggi && ultima?.verso === 'entrata',
  }
}

/** Funzione (dipendente, giorno) → giornata, legata allo stato corrente. */
export function useGiornataPresenze() {
  const segmenti = useRegistroPresenzeStore((s) => s.segmenti)
  const timbrature = useRegistroPresenzeStore((s) => s.timbrature)
  const richieste = useHrGestioneStore((s) => s.richieste)
  return useCallback((id: number, iso: string) => giornataPresenze({ segmenti, timbrature }, richieste, id, iso), [segmenti, timbrature, richieste])
}

// ── Personale del registro (demo: l'anagrafica HR) ────────────────────────────
export interface DipendentePresenze {
  id: number
  nome: string
  cognome: string
  reparto: string
  email: string
  telefono: string
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')
export const DIPENDENTI_PRESENZE: DipendentePresenze[] = DIPENDENTI_HR.map((d) => ({
  id: d.id, nome: d.nome, cognome: d.cognome, reparto: d.reparto,
  email: `${slug(d.nome)}.${slug(d.cognome)}@hoteltutorial.it`,
  telefono: `+39 3${String(30 + d.id * 3).padStart(2, '0')} ${String(1000000 + d.id * 739211).slice(0, 7)}`,
}))
