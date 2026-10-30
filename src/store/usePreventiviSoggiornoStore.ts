import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lingua } from '../modules/sales/preventivi/CreaPreventivo/lingue'

// ─── Preventivi di soggiorno ──────────────────────────────────────────────────
//  Un preventivo propone una o più soluzioni di soggiorno (date, camere,
//  trattamento, servizi inclusi, tassa di soggiorno, prezzo). Il cliente lo
//  riceve via mail e accetta una delle proposte dai pulsanti nel messaggio.
//  Mock persistito: il BE salverà e invierà davvero la mail.

export type StatoPreventivo = 'Bozza' | 'Inviato' | 'Accettato' | 'Rifiutato'

export interface CameraProposta {
  id: string
  tipologia: string
  quantita: number
  /** Tariffa base a notte: vale per i giorni senza tariffa propria. */
  prezzoNotte: number
  /** Tariffe giorno per giorno (data ISO della notte → prezzo). */
  tariffe: Record<string, number>
  descrizione: string
  /** Foto della camera (data URL compressa); null = illustrazione. */
  immagine: string | null
  /** Camere assegnate dal gestionale (numeri): se ci sono, quantita = numeri.length. */
  numeri: string[]
}

export type UnitaExtra = 'soggiorno' | 'persona' | 'notte' | 'persona-notte'

/** Servizio aggiuntivo a pagamento, che il cliente può aggiungere accettando. */
export interface ServizioExtra {
  id: string
  nome: string
  prezzo: number
  unita: UnitaExtra
}

/** Come si scelgono le camere: in automatico sulle libere del periodo, o a mano. */
export type Assegnazione = 'automatica' | 'manuale'

export interface PropostaSoggiorno {
  id: string
  titolo: string
  assegnazione: Assegnazione
  checkin: string
  checkout: string
  adulti: number
  bambini: number
  camere: CameraProposta[]
  trattamento: string
  servizi: string[]
  extra: ServizioExtra[]
  scontoPct: number
  /** Tassa di soggiorno: importo a persona per notte. */
  tassaImporto: number
  /** Notti massime soggette a tassa (regolamento comunale). */
  tassaMaxNotti: number
  /** Minori esenti dalla tassa. */
  tassaEsentiMinori: boolean
}

// ─── Pagamento con carta (Nexi) dopo l'accettazione ──────────────────────────
export type EsitoPagamento = 'autorizzato' | 'rifiutato'

export interface TentativoPagamento {
  id: string
  /** Data e ora (ISO). */
  il: string
  esito: EsitoPagamento
  importo: number
  tipo: 'caparra' | 'totale'
  circuito: string
  ultime4: string
  titolare: string
  /** Codice di autorizzazione della banca (solo se autorizzato). */
  codiceAut?: string
  /** Motivo del diniego (solo se rifiutato). */
  motivo?: string
  /** Notifica letta dall'hotel nel Centro notifiche. */
  letta?: boolean
  /** Proposta e servizi extra per cui si pagava (per riprovare dalla mail). */
  propostaId?: string
  extraScelti?: string[]
}

export interface PreventivoSoggiorno {
  id: string
  codice: string
  struttura: string
  cliente: string
  email: string
  telefono: string
  messaggio: string
  validita: string
  /** Template della mail (pronto o personale). */
  templateId?: string
  /** Lingua della mail e della pagina di conferma (default italiano). */
  lingua?: Lingua
  creato: string
  stato: StatoPreventivo
  inviatoIl?: string
  /** Proposta scelta dal cliente. */
  accettata?: string
  rispostaIl?: string
  /** Servizi aggiuntivi scelti dal cliente (id di ServizioExtra). */
  extraScelti?: string[]
  /** Termini e condizioni accettati con la proposta (titolo e versione). */
  terminiAccettati?: string
  /** Tentativi di pagamento, dal più vecchio. L'ultimo autorizzato conferma la prenotazione. */
  pagamenti?: TentativoPagamento[]
  proposte: PropostaSoggiorno[]
}

interface PreventiviSoggiornoState {
  preventivi: PreventivoSoggiorno[]
  salva: (p: PreventivoSoggiorno) => void
  aggiorna: (id: string, patch: Partial<PreventivoSoggiorno>) => void
  elimina: (id: string) => void
  prossimoCodice: () => string
  /** Registra un tentativo di pagamento del cliente. */
  registraPagamento: (id: string, t: TentativoPagamento) => void
  segnaPagamentoLetto: (id: string, tentativo: string) => void
}

export const usePreventiviSoggiornoStore = create<PreventiviSoggiornoState>()(
  persist(
    (set, get) => ({
      preventivi: [],
      salva: (p) => set((s) => ({
        preventivi: s.preventivi.some((x) => x.id === p.id)
          ? s.preventivi.map((x) => (x.id === p.id ? p : x))
          : [p, ...s.preventivi],
      })),
      aggiorna: (id, patch) => set((s) => ({
        preventivi: s.preventivi.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      })),
      elimina: (id) => set((s) => ({ preventivi: s.preventivi.filter((x) => x.id !== id) })),
      registraPagamento: (id, t) => set((s) => ({
        preventivi: s.preventivi.map((x) => (x.id === id ? { ...x, pagamenti: [...(x.pagamenti ?? []), t] } : x)),
      })),
      segnaPagamentoLetto: (id, tentativo) => set((s) => ({
        preventivi: s.preventivi.map((x) => (x.id === id
          ? { ...x, pagamenti: (x.pagamenti ?? []).map((t) => (t.id === tentativo ? { ...t, letta: true } : t)) } : x)),
      })),
      prossimoCodice: () => `PRV-S${101 + get().preventivi.reduce((m, p) => Math.max(m, Number(p.codice.slice(5)) - 101 + 1 || 0), 0)}`,
    }),
    {
      name: 'sibylla.preventivi-soggiorno',
      version: 3,
      // v2: tariffe giorno per giorno, foto/descrizione camera, servizi extra.
      // v3: camere assegnate dal gestionale (numeri), modo di assegnazione, template.
      migrate: (stato: any) => ({
        ...stato,
        preventivi: (stato?.preventivi ?? []).map((p: any) => ({
          ...p,
          proposte: p.proposte.map((q: any) => ({
            assegnazione: 'manuale', ...q, extra: q.extra ?? [],
            camere: q.camere.map((c: any) => ({ tariffe: {}, descrizione: '', immagine: null, numeri: [], ...c })),
          })),
        })),
      }),
    },
  ),
)

/** Pagamento andato a buon fine (la prenotazione è confermata). */
export const pagamentoOk = (p: PreventivoSoggiorno) => (p.pagamenti ?? []).find((t) => t.esito === 'autorizzato')
