import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Contratti del personale ──────────────────────────────────────────────────
//  Storico dei contratti (operativi) collegati a un'anagrafica del personale.
//  Scopo: specificare ruolo, livello e retribuzione (RAL) del profilo, con il PDF
//  del contratto allegato. Ogni variazione contrattuale è un nuovo record nello
//  storico (ordinato per decorrenza/creazione). L'"Archivio del personale" legge
//  l'ultimo contratto per mostrare/aprire il relativo PDF.

export interface ContrattoPersonale {
  id: string
  /** Chiave di collegamento all'anagrafica (id/matricola del dipendente). */
  anagraficaId: string
  nomeImpiegato: string
  ruolo: string
  livello?: string
  tipologia: string
  /** Retribuzione annua lorda (testo, es. "28.000"). */
  ral: string
  /** Data di decorrenza della (variazione di) contratto — ISO yyyy-mm-dd. */
  decorrenza?: string
  note?: string
  // ── Inquadramento (dal Configuratore HR: useHrConfigStore) ────────────────
  ccnlId?: string
  /** Etichetta del CCNL al momento della firma (resta nello storico se il CCNL cambia). */
  ccnl?: string
  livelloId?: string
  tipologiaId?: string
  repartoId?: string
  reparto?: string
  orarioId?: string
  schemaTurniId?: string
  /** Percentuale di part time (100 = full time). */
  partTimePerc?: number
  /** Fine rapporto per le tipologie con scadenza — ISO yyyy-mm-dd. */
  scadenza?: string
  provaGiorni?: number
  /** Spettanze annue fissate alla firma (riproporzionate al part time). */
  ferieGiorni?: number
  rolOre?: number
  exFestivitaOre?: number
  /** PDF del contratto. */
  pdfName?: string
  pdfDataUrl?: string
  createdAt: string
}

const uid = () => `ctr-${Math.round(performance.now())}-${Math.floor(Math.random() * 1e4)}`

const TUR = { ccnlId: 'ccnl-tur', ccnl: 'CCNL Turismo – Aziende alberghiere' }
const SEED: ContrattoPersonale[] = [
  { id: 'ctr-seed-66-1', anagraficaId: '66', nomeImpiegato: 'Piero Aragona', ruolo: 'Direttore di struttura', livello: 'Q.A', tipologia: 'Tempo indeterminato', ral: '52.000', decorrenza: '2026-01-01', pdfName: 'contratto_lavoro_2026.pdf', createdAt: '2026-01-02T09:00:00.000Z',
    ...TUR, livelloId: 'tur-qa', tipologiaId: 'tip-ind', repartoId: 'rep-dir', reparto: 'Direzione', orarioId: 'ora-ft5', partTimePerc: 100, provaGiorni: 180, ferieGiorni: 26, rolOre: 72, exFestivitaOre: 32 },
  { id: 'ctr-seed-66-0', anagraficaId: '66', nomeImpiegato: 'Piero Aragona', ruolo: 'Vice direttore', livello: 'Q.B', tipologia: 'Tempo indeterminato', ral: '44.000', decorrenza: '2023-03-01', pdfName: 'contratto_2023.pdf', createdAt: '2023-03-01T09:00:00.000Z',
    ...TUR, livelloId: 'tur-qb', tipologiaId: 'tip-ind', repartoId: 'rep-dir', reparto: 'Direzione', orarioId: 'ora-ft5', partTimePerc: 100, provaGiorni: 180, ferieGiorni: 26, rolOre: 72, exFestivitaOre: 32 },
  { id: 'ctr-seed-67-0', anagraficaId: '67', nomeImpiegato: 'Ruggero Novi', ruolo: 'Responsabile amministrativo', livello: '2°', tipologia: 'Tempo indeterminato', ral: '29.000', decorrenza: '2025-02-01', pdfName: 'contratto_novi.pdf', createdAt: '2025-01-28T09:00:00.000Z',
    ...TUR, livelloId: 'tur-2', tipologiaId: 'tip-ind', repartoId: 'rep-amm', reparto: 'Amministrazione', orarioId: 'ora-ft5', partTimePerc: 100, provaGiorni: 90, ferieGiorni: 26, rolOre: 72, exFestivitaOre: 32 },
  { id: 'ctr-seed-69-0', anagraficaId: '69', nomeImpiegato: 'Andrea Grimaudo', ruolo: 'Maître', livello: '2°', tipologia: 'Tempo indeterminato', ral: '27.500', decorrenza: '2024-05-01', pdfName: 'contratto_indeterminato.pdf', createdAt: '2024-04-26T09:00:00.000Z',
    ...TUR, livelloId: 'tur-2', tipologiaId: 'tip-ind', repartoId: 'rep-fb', reparto: 'F&B', orarioId: 'ora-tur', schemaTurniId: 'sch-61', partTimePerc: 100, provaGiorni: 90, ferieGiorni: 26, rolOre: 72, exFestivitaOre: 32 },
  { id: 'ctr-seed-88-0', anagraficaId: '88', nomeImpiegato: 'Andrea G Test', ruolo: 'Cameriera ai piani', livello: '6°S', tipologia: 'Stagionale', ral: '15.100', decorrenza: '2026-04-01', scadenza: '2026-10-31', pdfName: 'contratto_stagionale.pdf', createdAt: '2026-03-25T09:00:00.000Z',
    ...TUR, livelloId: 'tur-6s', tipologiaId: 'tip-sta', repartoId: 'rep-hk', reparto: 'Housekeeping', orarioId: 'ora-pt30', schemaTurniId: 'sch-52', partTimePerc: 75, provaGiorni: 45, ferieGiorni: 19.5, rolOre: 54, exFestivitaOre: 24 },
  { id: 'ctr-seed-89-0', anagraficaId: '89', nomeImpiegato: 'Marco Campo', ruolo: 'Addetto ricevimento', livello: '4°', tipologia: 'Stagionale', ral: '24.000', decorrenza: '2026-04-15', scadenza: '2026-11-15', pdfName: 'contratto_campo.pdf', createdAt: '2026-04-10T09:00:00.000Z',
    ...TUR, livelloId: 'tur-4', tipologiaId: 'tip-sta', repartoId: 'rep-fo', reparto: 'Front office', orarioId: 'ora-tur', schemaTurniId: 'sch-cc', partTimePerc: 100, provaGiorni: 60, ferieGiorni: 26, rolOre: 72, exFestivitaOre: 32 },
]

interface ContrattiState {
  contratti: ContrattoPersonale[]
  /** Contratti di un'anagrafica, dal più recente (per decorrenza/creazione). */
  contrattiFor: (anagraficaId: string) => ContrattoPersonale[]
  /** Ultimo contratto (vigente) di un'anagrafica. */
  ultimoContratto: (anagraficaId: string) => ContrattoPersonale | undefined
  addContratto: (patch: Omit<ContrattoPersonale, 'id' | 'createdAt'>) => string
  updateContratto: (id: string, patch: Partial<ContrattoPersonale>) => void
  removeContratto: (id: string) => void
}

const sortDesc = (list: ContrattoPersonale[]) =>
  [...list].sort((a, b) => (b.decorrenza ?? b.createdAt).localeCompare(a.decorrenza ?? a.createdAt))

export const useContrattiPersonaleStore = create<ContrattiState>()(
  persist(
    (set, get) => ({
      contratti: SEED,
      contrattiFor: (anagraficaId) =>
        sortDesc(get().contratti.filter(c => c.anagraficaId === anagraficaId)),
      ultimoContratto: (anagraficaId) =>
        sortDesc(get().contratti.filter(c => c.anagraficaId === anagraficaId))[0],
      addContratto: (patch) => {
        const id = uid()
        set(s => ({ contratti: [...s.contratti, { id, createdAt: new Date().toISOString(), ...patch }] }))
        return id
      },
      updateContratto: (id, patch) =>
        set(s => ({ contratti: s.contratti.map(c => c.id === id ? { ...c, ...patch } : c) })),
      removeContratto: (id) =>
        set(s => ({ contratti: s.contratti.filter(c => c.id !== id) })),
    }),
    {
      name: 'sibylla.contratti-personale',
      version: 2,
      // v2: inquadramento (CCNL, livello, reparto, orario, turni, spettanze). I record
      // seed si riallineano, quelli inseriti dall'utente restano com'erano.
      migrate: (persisted: any) => {
        const mine = ((persisted?.contratti ?? []) as ContrattoPersonale[]).filter(c => !c.id.startsWith('ctr-seed-'))
        return { contratti: [...SEED, ...mine] } as any
      },
    },
  ),
)
