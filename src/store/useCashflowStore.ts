import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Cashflow: piano delle uscite e solleciti ────────────────────────────────
//  • piano: per struttura, la data di uscita scelta per ogni pagamento
//    spostabile (assente = alla scadenza). In produzione le date andranno a
//    Business Central; qui restano nel browser.
//  • solleciti: richieste di pagamento inviate ai clienti in ritardo. Il Centro
//    notifiche le mostra come "Sollecito di pagamento inviato" (per il partner
//    che usa Platform è la notifica "pagamento atteso").

export interface Sollecito {
  incassoId: string
  struttura: string
  cliente: string
  importo: number
  scadenza: string
  inviatoIl: string
}

interface CashflowState {
  piani: Record<string, Record<string, string>>
  solleciti: Sollecito[]
  pianifica: (struttura: string, uscitaId: string, data: string | null) => void
  applicaPiano: (struttura: string, piano: Record<string, string>) => void
  ripristina: (struttura: string) => void
  sollecita: (s: Omit<Sollecito, 'inviatoIl'>) => void
}

export const useCashflowStore = create<CashflowState>()(persist((set) => ({
  piani: {},
  solleciti: [],
  pianifica: (struttura, uscitaId, data) => set(s => {
    const piano = { ...(s.piani[struttura] ?? {}) }
    if (data) piano[uscitaId] = data
    else delete piano[uscitaId]
    return { piani: { ...s.piani, [struttura]: piano } }
  }),
  applicaPiano: (struttura, piano) => set(s => ({ piani: { ...s.piani, [struttura]: { ...(s.piani[struttura] ?? {}), ...piano } } })),
  ripristina: (struttura) => set(s => ({ piani: { ...s.piani, [struttura]: {} } })),
  sollecita: (x) => set(s => ({
    solleciti: [{ ...x, inviatoIl: new Date().toISOString() }, ...s.solleciti.filter(y => y.incassoId !== x.incassoId)],
  })),
}), { name: 'sibylla.cashflow', version: 1 }))
