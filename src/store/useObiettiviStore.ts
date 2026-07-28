import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Premio performance · Obiettivi ───────────────────────────────────────────
//  Modello dell'assegnazione obiettivo (Premio performance HR):
//  - obiettivo di reparto o individuale
//  - vendita di prodotti / servizi / esperienze (focus commerciale)
//  - budget lordo + margine % (M.U.) come fonte del target
//  - frammentazione in PERIODI → SOTTOPERIODI definiti dall'utente
//  - premio a VALORE ASSOLUTO (€) per ogni sottoperiodo
//  Lo store è condiviso con la vista "Obiettivi in corso" (illustrazioni
//  real-time): `avanzaProgresso()` fa evolvere il venduto degli obiettivi attivi.

export type Segmento = 'prodotti' | 'servizi' | 'esperienze'
export type TipologiaObiettivo = 'reparto' | 'individuale'
export type StatoObiettivo = 'bozza' | 'in-corso' | 'concluso'

export interface SottoPeriodo {
  id: string
  nome: string
  dal?: string          // ISO yyyy-mm-dd
  al?: string           // ISO yyyy-mm-dd (scadenza → countdown)
  target: number        // target di vendita (€)
  premio: number        // premio a valore assoluto (€)
  venduto: number       // venduto corrente (€) — evolve in real-time
}
export interface Periodo {
  id: string
  nome: string
  sottoperiodi: SottoPeriodo[]
}
export interface Obiettivo {
  id: string
  nome: string
  tipologia: TipologiaObiettivo
  reparto?: string
  assegnatario?: string   // valorizzato se tipologia === 'individuale'
  report: string          // fonte dati / KPI di misurazione
  segmenti: Segmento[]    // prodotti / servizi / esperienze
  budgetLordo: number     // € budget lordo obiettivo
  marginePct: number      // M.U. — margine % sul budget
  dataAvvio: string       // ISO datetime-local (yyyy-mm-ddThh:mm)
  stato: StatoObiettivo
  periodi: Periodo[]
  createdAt: string
}

// ─── Selettori/derivati (funzioni pure, non hook) ─────────────────────────────
export const tuttiSotto = (o: Obiettivo): SottoPeriodo[] => o.periodi.flatMap((p) => p.sottoperiodi)
export const premioTotale = (o: Obiettivo) => tuttiSotto(o).reduce((s, sp) => s + (sp.premio || 0), 0)
export const targetTotale = (o: Obiettivo) => tuttiSotto(o).reduce((s, sp) => s + (sp.target || 0), 0)
export const vendutoTotale = (o: Obiettivo) => tuttiSotto(o).reduce((s, sp) => s + Math.min(sp.venduto, sp.target || 0), 0)
export const premioSbloccato = (o: Obiettivo) =>
  tuttiSotto(o).filter((sp) => sp.target > 0 && sp.venduto >= sp.target).reduce((s, sp) => s + sp.premio, 0)
export const avanzamentoPct = (o: Obiettivo) => {
  const t = targetTotale(o)
  return t > 0 ? Math.min(100, Math.round((vendutoTotale(o) / t) * 100)) : 0
}
export const margineAtteso = (o: Obiettivo) => Math.round((o.budgetLordo * o.marginePct) / 100)

const uid = (p = 'ob') => `${p}-${Math.round(performance.now())}-${Math.floor(Math.random() * 1e4)}`

// ─── Seed dimostrativo (2 in corso + 1 concluso) ──────────────────────────────
const SEED: Obiettivo[] = [
  {
    id: 'ob-commerciale-q2', nome: 'Spinta commerciale estate', tipologia: 'reparto', reparto: 'Commerciale',
    report: 'Report vendite reparto', segmenti: ['servizi', 'esperienze'], budgetLordo: 120000, marginePct: 35,
    dataAvvio: '2026-08-01T09:00', stato: 'in-corso', createdAt: '2026-07-20T09:00:00.000Z',
    periodi: [
      { id: 'p-ago', nome: 'Agosto', sottoperiodi: [
        { id: 's-ago-1', nome: '1ª quindicina', dal: '2026-08-01', al: '2026-08-15', target: 15000, premio: 400, venduto: 15000 },
        { id: 's-ago-2', nome: '2ª quindicina', dal: '2026-08-16', al: '2026-08-31', target: 15000, premio: 400, venduto: 11200 },
      ] },
      { id: 'p-set', nome: 'Settembre', sottoperiodi: [
        { id: 's-set-1', nome: '1ª quindicina', dal: '2026-09-01', al: '2026-09-15', target: 18000, premio: 500, venduto: 0 },
        { id: 's-set-2', nome: '2ª quindicina', dal: '2026-09-16', al: '2026-09-30', target: 18000, premio: 500, venduto: 0 },
      ] },
      { id: 'p-ott', nome: 'Ottobre', sottoperiodi: [
        { id: 's-ott-1', nome: 'Mese pieno', dal: '2026-10-01', al: '2026-10-31', target: 40000, premio: 1200, venduto: 0 },
      ] },
    ],
  },
  {
    id: 'ob-upsell-front', nome: 'Upselling reception', tipologia: 'individuale', reparto: 'Front office', assegnatario: 'Andrea Grimaudo',
    report: 'Report upselling', segmenti: ['prodotti', 'servizi'], budgetLordo: 24000, marginePct: 40,
    dataAvvio: '2026-08-01T09:00', stato: 'in-corso', createdAt: '2026-07-22T09:00:00.000Z',
    periodi: [
      { id: 'pu-ago', nome: 'Agosto', sottoperiodi: [
        { id: 'su-ago', nome: 'Mese pieno', dal: '2026-08-01', al: '2026-08-31', target: 6000, premio: 250, venduto: 6000 },
      ] },
      { id: 'pu-set', nome: 'Settembre', sottoperiodi: [
        { id: 'su-set', nome: 'Mese pieno', dal: '2026-09-01', al: '2026-09-30', target: 9000, premio: 350, venduto: 4300 },
      ] },
      { id: 'pu-ott', nome: 'Ottobre', sottoperiodi: [
        { id: 'su-ott', nome: 'Mese pieno', dal: '2026-10-01', al: '2026-10-31', target: 9000, premio: 400, venduto: 0 },
      ] },
    ],
  },
  {
    id: 'ob-esperienze-inverno', nome: 'Esperienze inverno', tipologia: 'reparto', reparto: 'Marketing',
    report: 'Report esperienze / attività', segmenti: ['esperienze'], budgetLordo: 40000, marginePct: 30,
    dataAvvio: '2026-01-07T09:00', stato: 'concluso', createdAt: '2025-12-20T09:00:00.000Z',
    periodi: [
      { id: 'pe-gen', nome: 'Gennaio', sottoperiodi: [
        { id: 'se-gen', nome: 'Mese pieno', dal: '2026-01-07', al: '2026-01-31', target: 12000, premio: 500, venduto: 12000 },
      ] },
      { id: 'pe-feb', nome: 'Febbraio', sottoperiodi: [
        { id: 'se-feb', nome: 'Mese pieno', dal: '2026-02-01', al: '2026-02-28', target: 12000, premio: 500, venduto: 12000 },
      ] },
    ],
  },
]

interface ObiettiviState {
  obiettivi: Obiettivo[]
  addObiettivo: (patch: Omit<Obiettivo, 'id' | 'createdAt'>) => string
  updateObiettivo: (id: string, patch: Partial<Obiettivo>) => void
  removeObiettivo: (id: string) => void
  /** Fa evolvere in real-time il venduto: avanza il primo sottoperiodo non
   *  ancora completato di ogni obiettivo in corso (effetto "onda" di progresso). */
  avanzaProgresso: () => void
}

export const useObiettiviStore = create<ObiettiviState>()(
  persist(
    (set) => ({
      obiettivi: SEED,
      addObiettivo: (patch) => {
        const id = uid()
        set((s) => ({ obiettivi: [{ id, createdAt: new Date().toISOString(), ...patch }, ...s.obiettivi] }))
        return id
      },
      updateObiettivo: (id, patch) =>
        set((s) => ({ obiettivi: s.obiettivi.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
      removeObiettivo: (id) =>
        set((s) => ({ obiettivi: s.obiettivi.filter((o) => o.id !== id) })),
      avanzaProgresso: () =>
        set((s) => ({
          obiettivi: s.obiettivi.map((o) => {
            if (o.stato !== 'in-corso') return o
            let mosso = false
            const periodi = o.periodi.map((p) => ({
              ...p,
              sottoperiodi: p.sottoperiodi.map((sp) => {
                if (mosso || sp.venduto >= sp.target) return sp
                mosso = true
                // avanza di una frazione variabile del target (8–22%)
                const delta = Math.max(1, Math.round(sp.target * (0.08 + Math.random() * 0.14)))
                return { ...sp, venduto: Math.min(sp.target, sp.venduto + delta) }
              }),
            }))
            return { ...o, periodi }
          }),
        })),
    }),
    { name: 'sibylla.obiettivi', version: 2 },
  ),
)
