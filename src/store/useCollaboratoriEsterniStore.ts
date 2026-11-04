import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CategoriaEsterniHr } from './useHrConfigStore'

// ─── HUMAN RESOURCES › COLLABORATORI ESTERNI ─────────────────────────────────
//  Addetti delle ditte in appalto (fornitori di Purchasing con `appalto`) che
//  lavorano in struttura e possono usare l'App Op! nel reparto della loro
//  categoria (Configurazione HR › Collaboratori esterni). Anagrafica leggera:
//  niente contratto di lavoro, ferie o cedolini; c'è invece il periodo di
//  autorizzazione, oltre il quale l'accesso all'app non è più consentito.
//  L'abilitazione e l'invito App Op! vivono in useAnagraficaOpStore con la
//  chiave `est-<id>` (stesso flusso dei dipendenti: invitoAnagrafica.ts).

export interface DocumentoEsterno {
  file?: string
  dataUrl?: string
  /** Scadenza del documento (DURC, idoneità…) — ISO yyyy-mm-dd. */
  scadenza?: string
}

export interface CollaboratoreEsterno {
  id: string
  nome: string
  cognome: string
  email: string
  telefono: string
  codiceFiscale: string
  dataNascita?: string
  /** Data di assunzione presso l'impresa appaltatrice (obbligatoria sul badge, L. 136/2010). */
  dataAssunzione?: string
  /** Foto tessera per il badge (data URL). */
  foto?: string
  /** Numero progressivo del badge di riconoscimento (EST-0001…). */
  numeroBadge?: string
  /** Fornitore di Purchasing (useCatalogoStore.fornitori) da cui dipende. */
  fornitoreId: string
  categoriaId: string
  /** Strutture in cui opera (vuoto = tutte). */
  strutture: string[]
  autorizzatoDal: string
  autorizzatoAl: string
  documenti: Record<string, DocumentoEsterno>
  note: string
  createdAt: string
}

/** Chiave dell'abilitazione App Op! in useAnagraficaOpStore. */
export const chiaveOpEsterno = (id: string) => `est-${id}`

export type StatoAutorizzazione = 'attiva' | 'in-scadenza' | 'scaduta' | 'futura'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const traGiorni = (n: number) => iso(new Date(Date.now() + n * 86_400_000))

export function statoAutorizzazione(c: Pick<CollaboratoreEsterno, 'autorizzatoDal' | 'autorizzatoAl'>, oggi = iso(new Date())): StatoAutorizzazione {
  if (c.autorizzatoDal && c.autorizzatoDal > oggi) return 'futura'
  if (c.autorizzatoAl && c.autorizzatoAl < oggi) return 'scaduta'
  if (c.autorizzatoAl && c.autorizzatoAl <= traGiorni(30)) return 'in-scadenza'
  return 'attiva'
}

export const STATO_AUT_LABEL: Record<StatoAutorizzazione, string> = {
  attiva: 'Autorizzato', 'in-scadenza': 'In scadenza', scaduta: 'Scaduto', futura: 'Non ancora attivo',
}

/** Documenti richiesti dalla categoria non caricati o scaduti. */
export function documentiMancanti(c: CollaboratoreEsterno, cat?: CategoriaEsterniHr): string[] {
  if (!cat) return []
  const oggi = iso(new Date())
  return cat.documenti.filter(d => {
    const doc = c.documenti[d]
    return !doc?.file || (doc.scadenza != null && doc.scadenza !== '' && doc.scadenza < oggi)
  })
}

const doc = (file: string, scadenza?: string): DocumentoEsterno => ({ file, scadenza })

const SEED: CollaboratoreEsterno[] = [
  {
    id: 'ce-1', numeroBadge: 'EST-0001', dataNascita: '1988-04-05', dataAssunzione: '2021-09-01', nome: 'Elena', cognome: 'Morra', email: 'e.morra@splendorservizi.it', telefono: '+39 333 1212121', codiceFiscale: 'MRRLNE88D45H501K',
    fornitoreId: 'forn-app-splendor', categoriaId: 'cest-pul', strutture: [], autorizzatoDal: '2026-03-01', autorizzatoAl: '2027-02-28',
    documenti: { 'Contratto d’appalto': doc('appalto_splendor_2026.pdf'), DURC: doc('durc_splendor.pdf', '2027-01-15'), 'Formazione sicurezza': doc('sicurezza_morra.pdf'), 'Documento d’identità': doc('ci_morra.pdf', '2030-05-10') },
    note: '', createdAt: '2026-02-20T09:00:00.000Z',
  },
  {
    id: 'ce-2', numeroBadge: 'EST-0002', dataNascita: '1980-01-01', dataAssunzione: '2015-03-16', nome: 'Davide', cognome: 'Lupo', email: 'd.lupo@tecnoimpiantihotel.it', telefono: '+39 347 3434343', codiceFiscale: 'LPUDVD80A01H501Z',
    fornitoreId: 'forn-app-tecnoimpianti', categoriaId: 'cest-man', strutture: [], autorizzatoDal: '2026-01-01', autorizzatoAl: traGiorni(18),
    documenti: { 'Contratto d’appalto': doc('appalto_tecnoimpianti.pdf'), DURC: doc('durc_tecnoimpianti.pdf', traGiorni(18)), 'Formazione sicurezza': doc('sicurezza_lupo.pdf'), 'Documento d’identità': doc('ci_lupo.pdf') },
    note: 'Reperibile per pronto intervento notturno.', createdAt: '2025-12-20T09:00:00.000Z',
  },
  {
    id: 'ce-3', numeroBadge: 'EST-0003', dataNascita: '1992-08-10', dataAssunzione: '2024-05-01', nome: 'Karim', cognome: 'Benali', email: 'k.benali@movifacchinaggio.it', telefono: '+39 320 5656565', codiceFiscale: 'BNLKRM92M10Z330P',
    fornitoreId: 'forn-app-movi', categoriaId: 'cest-fac', strutture: [], autorizzatoDal: '2026-05-01', autorizzatoAl: '2026-10-31',
    documenti: { 'Contratto d’appalto': doc('appalto_movi.pdf'), 'Documento d’identità': doc('ci_benali.pdf') },
    note: '', createdAt: '2026-04-28T09:00:00.000Z',
  },
]

const uid = () => `ce-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`

interface State {
  collaboratori: CollaboratoreEsterno[]
  add: (c: Omit<CollaboratoreEsterno, 'id' | 'createdAt'>) => string
  update: (id: string, patch: Partial<CollaboratoreEsterno>) => void
  remove: (id: string) => void
}

export const useCollaboratoriEsterniStore = create<State>()(
  persist(
    (set) => ({
      collaboratori: SEED,
      add: (c) => {
        const id = uid()
        set(s => {
          const max = Math.max(0, ...s.collaboratori.map(x => Number(x.numeroBadge?.replace(/\D/g, '')) || 0))
          const numeroBadge = c.numeroBadge || `EST-${String(max + 1).padStart(4, '0')}`
          return { collaboratori: [...s.collaboratori, { ...c, numeroBadge, id, createdAt: new Date().toISOString() }] }
        })
        return id
      },
      update: (id, patch) => set(s => ({ collaboratori: s.collaboratori.map(c => (c.id === id ? { ...c, ...patch } : c)) })),
      remove: (id) => set(s => ({ collaboratori: s.collaboratori.filter(c => c.id !== id) })),
    }),
    {
      name: 'sibylla.collaboratori-esterni',
      version: 2,
      // v2: dati del badge (numero, nascita, assunzione) sui record seed
      migrate: (persisted: any) => ({
        collaboratori: ((persisted?.collaboratori ?? SEED) as CollaboratoreEsterno[]).map(c => ({ ...SEED.find(x => x.id === c.id), ...c, numeroBadge: c.numeroBadge ?? SEED.find(x => x.id === c.id)?.numeroBadge })),
      }) as any,
    },
  ),
)
