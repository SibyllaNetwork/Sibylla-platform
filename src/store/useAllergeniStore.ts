import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── ALLERGENI (F&B) ──────────────────────────────────────────────────────────
//  Catalogo degli allergeni dichiarati sulle voci di menu. È la fonte unica di
//  codice, nome e descrizione: le voci (`useVociMenuStore`) memorizzano solo il
//  codice, i menu e il web menu leggono i testi da qui.
//
//  I 14 allergeni dell'allegato II del Reg. UE 1169/2011 sono un elenco di
//  legge: si possono correggere nome e descrizione — la dicitura da stampare —
//  ma NON si possono eliminare né aggiungere al loro insieme. Accanto si
//  possono dichiarare voci proprie (intolleranze, preferenze) per il servizio
//  in sala: sono marcate come personalizzate e restano eliminabili.
//
//  La pagina precedente teneva un elenco libero, e infatti mostrava «Cereali»
//  due volte più due righe di prova: un elenco di legge non va lasciato
//  riscrivibile a mano.

export interface Allergene {
  /** Codice mostrato nei badge: la lettera dell'allegato II o una sigla propria. */
  codice: string
  nome: string
  /** Dicitura completa, quella che finisce stampata su menu e web menu. */
  descrizione: string
  /** true = uno dei 14 dell'allegato II: correggibile nei testi, non eliminabile. */
  ue: boolean
}

/**
 * I 14 allergeni a dichiarazione obbligatoria, nell'ordine dell'allegato II.
 * Le lettere sono quelle usate sui menu della struttura.
 */
export const ALLERGENI_UE: Allergene[] = [
  { codice: 'A', ue: true, nome: 'Cereali contenenti glutine', descrizione: 'Cereali contenenti glutine e prodotti derivati (grano, segale, orzo, avena, farro, kamut).' },
  { codice: 'B', ue: true, nome: 'Crostacei',                  descrizione: 'Crostacei e prodotti a base di crostacei.' },
  { codice: 'C', ue: true, nome: 'Uova',                       descrizione: 'Uova e prodotti a base di uova.' },
  { codice: 'D', ue: true, nome: 'Pesce',                      descrizione: 'Pesce e prodotti a base di pesce.' },
  { codice: 'E', ue: true, nome: 'Arachidi',                   descrizione: 'Arachidi e prodotti a base di arachidi.' },
  { codice: 'F', ue: true, nome: 'Soia',                       descrizione: 'Soia e prodotti a base di soia.' },
  { codice: 'G', ue: true, nome: 'Latte',                      descrizione: 'Latte e prodotti a base di latte (compreso il lattosio).' },
  { codice: 'H', ue: true, nome: 'Frutta a guscio',            descrizione: 'Frutta a guscio e loro prodotti (mandorle, nocciole, noci, noci di acagiù, di pecan, del Brasile, pistacchi, noci macadamia).' },
  { codice: 'I', ue: true, nome: 'Sedano',                     descrizione: 'Sedano e prodotti a base di sedano.' },
  { codice: 'J', ue: true, nome: 'Senape',                     descrizione: 'Senape e prodotti a base di senape.' },
  { codice: 'K', ue: true, nome: 'Semi di sesamo',             descrizione: 'Semi di sesamo e prodotti a base di sesamo.' },
  { codice: 'L', ue: true, nome: 'Solfiti',                    descrizione: 'Anidride solforosa e solfiti in concentrazione superiore a 10 mg/kg o 10 mg/l.' },
  { codice: 'M', ue: true, nome: 'Lupini',                     descrizione: 'Lupini e prodotti a base di lupini.' },
  { codice: 'N', ue: true, nome: 'Molluschi',                  descrizione: 'Molluschi e prodotti a base di molluschi.' },
]

/** Voci proprie di partenza: le intolleranze che la sala segnala più spesso. */
const PERSONALIZZATI: Allergene[] = [
  { codice: 'P1', ue: false, nome: 'Nichel', descrizione: 'Alimenti a contenuto rilevante di nichel — segnalazione per il servizio in sala.' },
]

interface AllergeniState {
  allergeni: Allergene[]
  addAllergene:    (a: Allergene) => void
  updateAllergene: (codice: string, patch: Partial<Allergene>) => void
  removeAllergene: (codice: string) => void
}

export const useAllergeniStore = create<AllergeniState>()(
  persist(
    (set) => ({
      allergeni: [...ALLERGENI_UE, ...PERSONALIZZATI].map(a => ({ ...a })),

      addAllergene: (a) => set(s => ({ allergeni: [...s.allergeni, a] })),
      updateAllergene: (codice, patch) =>
        set(s => ({
          allergeni: s.allergeni.map(a =>
            a.codice === codice
              // il codice degli allergeni UE non si tocca: è la lettera di legge
              ? { ...a, ...patch, codice: a.ue ? a.codice : (patch.codice ?? a.codice) }
              : a),
        })),
      // Gli allergeni di legge non sono eliminabili: la guardia sta qui, non
      // solo nella UI, così nessun'altra pagina può togliere una riga di legge.
      removeAllergene: (codice) =>
        set(s => ({ allergeni: s.allergeni.filter(a => a.codice !== codice || a.ue) })),
    }),
    { name: 'sibylla.fb.allergeni', version: 1 },
  ),
)

/** Allergene dal codice: prima nel catalogo salvato, poi nell'elenco di legge. */
export const allergeneMeta = (codice: string): Allergene | undefined =>
  useAllergeniStore.getState().allergeni.find(a => a.codice === codice)
  ?? ALLERGENI_UE.find(a => a.codice === codice)

/** Etichetta per i tooltip: «A — Cereali contenenti glutine». */
export const allergeneLabel = (codice: string): string => {
  const meta = allergeneMeta(codice)
  return meta ? `${meta.codice} — ${meta.nome}` : codice
}

/** Catalogo ordinato: prima le lettere di legge, poi le voci proprie. */
export const allergeniOrdinati = (allergeni: Allergene[]): Allergene[] =>
  [...allergeni].sort((a, b) =>
    Number(b.ue) - Number(a.ue) || a.codice.localeCompare(b.codice, 'it'))

/** Prossima sigla libera per una voce propria: P1, P2, P3… */
export const prossimaSigla = (allergeni: Allergene[]): string => {
  const usate = new Set(allergeni.map(a => a.codice.toUpperCase()))
  for (let i = 1; i < 100; i++) if (!usate.has(`P${i}`)) return `P${i}`
  return ''
}
