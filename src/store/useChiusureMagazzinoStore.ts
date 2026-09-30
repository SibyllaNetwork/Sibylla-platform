// ─── Chiusure e bilanciamento di magazzino — stato condiviso ──────────────────
//  Un solo store per le tre pagine perché si parlano:
//   • Bilanciamento scorte genera trasferimenti: lo scarico dal centrale è
//     immediato, il carico nel reparto arriva alla conferma di ricevimento.
//     Un trasferimento ancora in transito blocca il preliminare del reparto.
//   • Preliminare di chiusura tiene la bozza della conta e, alla conferma,
//     scrive la chiusura nel Registro.
//   • Registro chiusure può riaprire l'ultima chiusura: il periodo torna nel
//     preliminare con la conta di prima come bozza.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAccessStore } from './useAccessStore'
import {
  MAGAZZINI_CHIUSURA, PENDENZE_INIT, TRASFERIMENTI_INIT, PRIMO_PERIODO,
  articoloById, chiusureStoriche, decimaliDi, numeroChiusura, periodoSuccessivo, righeBase, righeDiChiusura, valorizza,
  type CausaleDifferenza, type Chiusura, type Pendenza, type Periodo, type RigaChiusura,
  type Trasferimento,
} from '../modules/magazzino/_data/chiusure.model'

/** Movimento registrato dopo la generazione dei dati di partenza. */
export interface MovimentoExtra {
  magazzinoId: string
  periodo: Periodo
  articoloId: string
  entrate: number
  uscite: number
  origine: string
}

export interface BozzaConta {
  conte: Record<string, number>
  causali: Record<string, CausaleDifferenza>
  note: string
  aggiornata?: number
}

const bozzaVuota = (): BozzaConta => ({ conte: {}, causali: {}, note: '' })
export const chiaveBozza = (magazzinoId: string, periodo: Periodo) => `${magazzinoId}|${periodo}`

interface ChiusureState {
  chiusure: Chiusura[]
  bozze: Record<string, BozzaConta>
  pendenze: Pendenza[]
  risolte: Record<string, { il: number; da: string }>
  movExtra: MovimentoExtra[]
  trasferimenti: Trasferimento[]

  setConta: (magazzinoId: string, periodo: Periodo, articoloId: string, n: number | undefined) => void
  setCausale: (magazzinoId: string, periodo: Periodo, articoloId: string, c: CausaleDifferenza | undefined) => void
  setNote: (magazzinoId: string, periodo: Periodo, note: string) => void
  /** Riporta la teorica nella conta degli articoli non ancora contati. */
  allineaNonContati: (magazzinoId: string, periodo: Periodo, righe: RigaChiusura[]) => number
  azzeraConta: (magazzinoId: string, periodo: Periodo) => void

  risolviPendenza: (id: string) => void
  chiudiPeriodo: (magazzinoId: string, periodo: Periodo, righe: RigaChiusura[], note: string) => Chiusura
  riapriChiusura: (id: string, motivo: string) => void

  generaTrasferimenti: (
    docs: Array<{ daId: string; aId: string; righe: Array<{ articoloId: string; qta: number }> }>,
  ) => Trasferimento[]
  riceviTrasferimento: (id: string) => void

  reset: () => void
}

/** Chi sta operando: il profilo caricato, altrimenti l'amministratore. */
export const operatoreCorrente = () => {
  const s = useAccessStore.getState()
  return s.profiles.find(p => p.id === s.currentProfileId)?.nome ?? 'Amministratore'
}

const iniziale = () => ({
  chiusure: chiusureStoriche(),
  bozze: {} as Record<string, BozzaConta>,
  pendenze: PENDENZE_INIT,
  risolte: {} as Record<string, { il: number; da: string }>,
  movExtra: [] as MovimentoExtra[],
  trasferimenti: TRASFERIMENTI_INIT,
})

export const useChiusureMagazzinoStore = create<ChiusureState>()(
  persist(
    (set, get) => {
      const patchBozza = (magazzinoId: string, periodo: Periodo, fn: (b: BozzaConta) => BozzaConta) =>
        set(s => {
          const k = chiaveBozza(magazzinoId, periodo)
          return { bozze: { ...s.bozze, [k]: { ...fn(s.bozze[k] ?? bozzaVuota()), aggiornata: Date.now() } } }
        })

      return {
        ...iniziale(),

        setConta: (m, p, a, n) => patchBozza(m, p, b => {
          const conte = { ...b.conte }
          if (n == null) delete conte[a]; else conte[a] = n
          return { ...b, conte }
        }),

        setCausale: (m, p, a, c) => patchBozza(m, p, b => {
          const causali = { ...b.causali }
          if (!c) delete causali[a]; else causali[a] = c
          return { ...b, causali }
        }),

        setNote: (m, p, note) => patchBozza(m, p, b => ({ ...b, note })),

        allineaNonContati: (m, p, righe) => {
          const mancanti = righe.filter(r => r.contato == null)
          patchBozza(m, p, b => ({
            ...b,
            conte: {
              ...b.conte,
              ...Object.fromEntries(mancanti.map(r => {
                const f = 10 ** decimaliDi(articoloById(r.articoloId)?.um ?? 'pz')
                return [r.articoloId, Math.round((r.iniziale + r.entrate - r.uscite) * f) / f]
              })),
            },
          }))
          return mancanti.length
        },

        azzeraConta: (m, p) => patchBozza(m, p, b => ({ ...bozzaVuota(), note: b.note })),

        risolviPendenza: (id) => {
          const pd = get().pendenze.find(x => x.id === id)
          if (!pd) return
          set(s => ({
            risolte: { ...s.risolte, [id]: { il: Date.now(), da: operatoreCorrente() } },
            movExtra: pd.movimento
              ? [...s.movExtra, {
                  magazzinoId: pd.magazzinoId, periodo: pd.periodo, articoloId: pd.movimento.articoloId,
                  entrate: pd.movimento.entrate ?? 0, uscite: pd.movimento.uscite ?? 0, origine: pd.titolo,
                }]
              : s.movExtra,
          }))
        },

        chiudiPeriodo: (magazzinoId, periodo, righe, note) => {
          const anno = new Date().getFullYear()
          const suffisso = `/${String(anno).slice(-2)}`
          const ultimo = Math.max(0, ...get().chiusure
            .filter(c => c.numero.endsWith(suffisso))
            .map(c => Number(c.numero.slice(3, 6)) || 0))
          // Una riapertura non cancella la chiusura di prima: la nuova la sostituisce
          const riaperta = get().chiusure
            .filter(c => c.magazzinoId === magazzinoId && c.periodo === periodo && c.stato === 'riaperta')
            .sort((x, y) => y.chiusaIl - x.chiusaIl)[0]
          const c: Chiusura = {
            id: `${magazzinoId}-${periodo}-${Date.now().toString(36)}`,
            numero: numeroChiusura(ultimo + 1, anno),
            sostituisce: riaperta?.numero,
            magazzinoId, periodo,
            chiusaIl: Date.now(),
            operatore: operatoreCorrente(),
            stato: 'definitiva',
            valori: valorizza(righe),
            righe,
            note: note.trim() || undefined,
          }
          set(s => {
            const bozze = { ...s.bozze }
            delete bozze[chiaveBozza(magazzinoId, periodo)]
            return { chiusure: [c, ...s.chiusure], bozze }
          })
          return c
        },

        riapriChiusura: (id, motivo) => {
          const c = get().chiusure.find(x => x.id === id)
          if (!c) return
          const righe = righeDiChiusura(c)
          set(s => ({
            chiusure: s.chiusure.map(x => x.id === id
              ? { ...x, stato: 'riaperta', riapertura: { il: Date.now(), da: operatoreCorrente(), motivo } }
              : x),
            // La conta di prima torna come bozza: si corregge, non si rifà da capo
            bozze: {
              ...s.bozze,
              [chiaveBozza(c.magazzinoId, c.periodo)]: {
                conte: Object.fromEntries(righe.filter(r => r.contato != null).map(r => [r.articoloId, r.contato!])),
                causali: Object.fromEntries(righe.filter(r => r.causale).map(r => [r.articoloId, r.causale!])),
                note: c.note ?? '',
                aggiornata: Date.now(),
              },
            },
          }))
        },

        generaTrasferimenti: (docs) => {
          const op = operatoreCorrente()
          const ultimo = Math.max(930, ...get().trasferimenti.map(t => Number(t.numero.replace(/\D/g, '')) || 0))
          const creati: Trasferimento[] = docs.map((d, i) => ({
            id: `tr-${Date.now().toString(36)}-${i}`,
            numero: `TR-${String(ultimo + i + 1).padStart(4, '0')}`,
            daId: d.daId, aId: d.aId,
            creatoIl: Date.now(), operatore: op, stato: 'in-transito',
            righe: d.righe,
          }))
          set(s => ({
            trasferimenti: [...creati, ...s.trasferimenti],
            // La merce esce subito dal magazzino che la cede
            movExtra: [
              ...s.movExtra,
              ...creati.flatMap(t => t.righe.map(r => ({
                magazzinoId: t.daId, periodo: periodoAperto(s, t.daId), articoloId: r.articoloId,
                entrate: 0, uscite: r.qta, origine: t.numero,
              }))),
            ],
          }))
          return creati
        },

        riceviTrasferimento: (id) => {
          const t = get().trasferimenti.find(x => x.id === id)
          if (!t || t.stato === 'ricevuto') return
          set(s => ({
            trasferimenti: s.trasferimenti.map(x => x.id === id ? { ...x, stato: 'ricevuto', ricevutoIl: Date.now() } : x),
            movExtra: [
              ...s.movExtra,
              ...t.righe.map(r => ({
                magazzinoId: t.aId, periodo: periodoAperto(s, t.aId), articoloId: r.articoloId,
                entrate: r.qta, uscite: 0, origine: t.numero,
              })),
            ],
          }))
        },

        reset: () => set(iniziale()),
      }
    },
    {
      name: 'sibylla.chiusure-magazzino',
      version: 1,
      // Lo storico seminato è deterministico: si salva comunque tutto, ma senza
      // le righe (si rigenerano), così localStorage resta leggero.
      partialize: s => ({
        chiusure: s.chiusure.map(c => c.righe ? c : { ...c, righe: undefined }),
        bozze: s.bozze, pendenze: s.pendenze, risolte: s.risolte,
        movExtra: s.movExtra, trasferimenti: s.trasferimenti,
      }),
    },
  ),
)

// ─── Letture derivate ─────────────────────────────────────────────────────────
type Stato = Pick<ChiusureState, 'chiusure' | 'bozze' | 'movExtra'>

/** Ultima chiusura valida (non riaperta) di un magazzino. */
export const ultimaChiusura = (s: Pick<ChiusureState, 'chiusure'>, magazzinoId: string) =>
  s.chiusure
    .filter(c => c.magazzinoId === magazzinoId && c.stato === 'definitiva')
    .sort((a, b) => b.periodo.localeCompare(a.periodo) || b.chiusaIl - a.chiusaIl)[0]

/** Il periodo da chiudere: quello dopo l'ultima chiusura valida. */
export const periodoAperto = (s: Pick<ChiusureState, 'chiusure'>, magazzinoId: string): Periodo => {
  const u = ultimaChiusura(s, magazzinoId)
  return u ? periodoSuccessivo(u.periodo) : PRIMO_PERIODO
}

/**
 * Righe di lavoro del periodo: movimenti di partenza + movimenti registrati
 * dopo (pendenze risolte, trasferimenti) + conta e causali della bozza.
 */
export function righeCorrenti(s: Stato, magazzinoId: string, periodo: Periodo): RigaChiusura[] {
  const b = s.bozze[chiaveBozza(magazzinoId, periodo)]
  const extra = s.movExtra.filter(x => x.magazzinoId === magazzinoId && x.periodo === periodo)
  return righeBase(magazzinoId, periodo).map(r => {
    const mine = extra.filter(x => x.articoloId === r.articoloId)
    return {
      ...r,
      entrate: r.entrate + mine.reduce((a, x) => a + x.entrate, 0),
      uscite: r.uscite + mine.reduce((a, x) => a + x.uscite, 0),
      contato: b?.conte[r.articoloId],
      causale: b?.causali[r.articoloId],
    }
  })
}

/** Giacenza attuale (teorica) di ogni articolo di un magazzino. */
export function giacenzeAttuali(s: Stato, magazzinoId: string): Record<string, number> {
  const p = periodoAperto(s, magazzinoId)
  const righe = righeCorrenti(s, magazzinoId, p)
  if (righe.length) return Object.fromEntries(righe.map(r => [r.articoloId, r.iniziale + r.entrate - r.uscite]))
  // Periodo appena chiuso e non ancora movimentato: vale il contato, più
  // quanto si è mosso dopo la chiusura
  const u = ultimaChiusura(s, magazzinoId)
  if (!u) return {}
  const extra = s.movExtra.filter(x => x.magazzinoId === magazzinoId && x.periodo === p)
  return Object.fromEntries(righeDiChiusura(u).map(r => [
    r.articoloId,
    (r.contato ?? 0) + extra.filter(x => x.articoloId === r.articoloId).reduce((a, x) => a + x.entrate - x.uscite, 0),
  ]))
}

export const magazziniDi = (strutturaId: string) => MAGAZZINI_CHIUSURA.filter(m => m.strutturaId === strutturaId)
