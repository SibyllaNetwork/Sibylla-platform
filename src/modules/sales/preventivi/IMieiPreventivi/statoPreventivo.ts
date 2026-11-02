import { pagamentoOk, type PreventivoSoggiorno } from '../../../../store/usePreventiviSoggiornoStore'
import { LETTERE, eur } from '../CreaPreventivo/soggiorno'

// ─── Stato del preventivo come lo vede l'hotel ───────────────────────────────
//  Lo stato salvato (Bozza, Inviato, Letto, Accettato, Rifiutato) più quello che
//  ne segue: scaduto se il cliente non ha risposto entro la validità, confermato
//  se ha anche pagato con carta. Una riga sotto il badge dice il perché.

export type StatoVisto = 'Bozza' | 'Inviato' | 'Letto' | 'Accettato' | 'Confermato' | 'Rifiutato' | 'Scaduto'

export const STATI_VISTI: { stato: StatoVisto; icona: string; desc: string }[] = [
  { stato: 'Bozza', icona: 'fa-pen-line', desc: 'Non ancora inviato al cliente' },
  { stato: 'Inviato', icona: 'fa-paper-plane', desc: 'In attesa della risposta del cliente' },
  { stato: 'Letto', icona: 'fa-envelope-open', desc: 'Il cliente ha aperto la mail' },
  { stato: 'Accettato', icona: 'fa-circle-check', desc: 'Il cliente ha scelto una proposta' },
  { stato: 'Confermato', icona: 'fa-credit-card', desc: 'Proposta scelta e pagamento autorizzato' },
  { stato: 'Rifiutato', icona: 'fa-circle-xmark', desc: 'Il cliente ha rifiutato il preventivo' },
  { stato: 'Scaduto', icona: 'fa-hourglass-end', desc: 'Nessuna risposta entro la validità' },
]

export const iconaStato = (s: StatoVisto) => STATI_VISTI.find((x) => x.stato === s)?.icona ?? 'fa-circle'

/** Classe CSS dello stato ("Confermato" → "confermato"). */
export const chiaveStato = (s: string) => s.toLowerCase()

export interface StatoDettaglio {
  stato: StatoVisto
  /** Seconda riga sotto il badge (data, proposta scelta, pagamento…). */
  nota: string
  /** Avviso da far notare (pagamento non riuscito, in scadenza). */
  avviso?: 'pagamento-ko' | 'in-scadenza'
}

const dataBreve = (s?: string) => (s ? s.split(',')[0].trim().slice(0, 5) : '')

/** Giorni che mancano alla scadenza (negativo se già scaduto). */
export function giorniAllaScadenza(scadenza: Date | null): number | null {
  if (!scadenza) return null
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  return Math.round((scadenza.getTime() - oggi.getTime()) / 86400000)
}

/** Scadenza del preventivo di soggiorno: creato + giorni di validità. */
export function scadenzaSoggiorno(p: PreventivoSoggiorno): Date {
  const [g, m, a] = p.creato.split('/').map(Number)
  return new Date(a, m - 1, g + Number(p.validita))
}

export function statoSoggiorno(p: PreventivoSoggiorno): StatoDettaglio {
  const ok = pagamentoOk(p)
  const ko = (p.pagamenti ?? []).filter((t) => t.esito === 'rifiutato')
  const scelta = p.proposte.findIndex((q) => q.id === p.accettata)
  const lettera = scelta >= 0 ? `Proposta ${LETTERE[scelta]}` : ''
  if (p.stato === 'Accettato' && ok) {
    return { stato: 'Confermato', nota: `${lettera} · ${ok.tipo === 'caparra' ? 'caparra' : 'saldo'} ${eur(ok.importo)}` }
  }
  if (p.stato === 'Accettato') return { stato: 'Accettato', nota: `${lettera}${p.rispostaIl ? ` · ${dataBreve(p.rispostaIl)}` : ''}` }
  if (p.stato === 'Rifiutato') return { stato: 'Rifiutato', nota: p.rispostaIl ? `il ${dataBreve(p.rispostaIl)}` : 'dal cliente' }
  if (p.stato === 'Bozza') return { stato: 'Bozza', nota: 'da inviare' }
  const giorni = giorniAllaScadenza(scadenzaSoggiorno(p))
  if (giorni !== null && giorni < 0) return { stato: 'Scaduto', nota: 'senza risposta' }
  const base: StatoVisto = p.stato === 'Letto' ? 'Letto' : 'Inviato'
  if (ko.length > 0) {
    return { stato: base, nota: `pagamento non riuscito${ko.length > 1 ? ` (${ko.length})` : ''}`, avviso: 'pagamento-ko' }
  }
  if (giorni !== null && giorni <= 2) {
    return { stato: base, nota: giorni === 0 ? 'scade oggi' : `scade tra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`, avviso: 'in-scadenza' }
  }
  return { stato: base, nota: p.inviatoIl ? `il ${dataBreve(p.inviatoIl)}` : '' }
}

/** Preventivi senza dettaglio (prodotti, servizi, archivio): stato salvato più la scadenza. */
export function statoSemplice(stato: string | undefined, scadenza: Date | null): StatoDettaglio {
  const s = (STATI_VISTI.find((x) => x.stato === stato)?.stato ?? 'Bozza') as StatoVisto
  const giorni = giorniAllaScadenza(scadenza)
  if ((s === 'Inviato' || s === 'Letto') && giorni !== null && giorni < 0) return { stato: 'Scaduto', nota: 'senza risposta' }
  if ((s === 'Inviato' || s === 'Letto') && giorni !== null && giorni <= 2) {
    return { stato: s, nota: giorni === 0 ? 'scade oggi' : `scade tra ${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`, avviso: 'in-scadenza' }
  }
  return { stato: s, nota: s === 'Bozza' ? 'da inviare' : '' }
}
