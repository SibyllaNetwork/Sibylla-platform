import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CLIENTS_INIT, RUOLI_INIT, USERS_INIT } from '../admin/SibyllaAdminPanel/constants'
import type { FnType, Ruolo, UserAssoc } from '../admin/SibyllaAdminPanel/types'

// ─────────────────────────────────────────────────────────────────────────────
//  Config admin per-cliente persistita: ruoli (tab Ruoli) e matrice funzioni
//  (tab Funzioni). Prima erano in state locale del SibyllaAdminPanel e si
//  azzeravano uscendo dal pannello → le creazioni non venivano salvate.
//  Qui sono persistite in localStorage e pre-popolate con ruoli di esempio.
// ─────────────────────────────────────────────────────────────────────────────

export type RuoliMap = Record<number, Ruolo[]>
export type FunzioniMap = Record<number, Record<string, Record<string, FnType>>>
/** clienteId → utenteId → associazioni (ruoli + strutture). */
export type AssocMap = Record<number, Record<number, UserAssoc>>

type Updater<T> = T | ((prev: T) => T)
const apply = <T>(u: Updater<T>, prev: T): T => (typeof u === 'function' ? (u as (p: T) => T)(prev) : u)

interface AdminConfigState {
  ruoliMap: RuoliMap
  funzioniMap: FunzioniMap
  assocMap: AssocMap
  setRuoliMap: (u: Updater<RuoliMap>) => void
  setFunzioniMap: (u: Updater<FunzioniMap>) => void
  setAssocMap: (u: Updater<AssocMap>) => void
}

const seedFunzioni = (): FunzioniMap =>
  Object.fromEntries(CLIENTS_INIT.map(c => [c.id, {}])) as FunzioniMap

// Copia profonda del seed ruoli (evita mutazioni del template condiviso).
const seedRuoli = (): RuoliMap =>
  Object.fromEntries(
    Object.entries(RUOLI_INIT).map(([id, list]) => [Number(id), list.map(r => ({ ...r }))]),
  ) as RuoliMap

// Associazioni di esempio: ogni utente del cliente è collegato alla propria
// struttura con il primo ruolo (Amministratore), così il tab non è vuoto.
const seedAssoc = (): AssocMap =>
  Object.fromEntries(CLIENTS_INIT.map(c => {
    const roles = RUOLI_INIT[c.id] || []
    const inner = Object.fromEntries(
      (USERS_INIT[c.id] || []).map(u => [u.id, { strutture: { [String(c.id)]: roles[0] ? [roles[0].id] : [] } }]),
    )
    return [c.id, inner]
  })) as AssocMap

export const useAdminConfigStore = create<AdminConfigState>()(
  persist(
    (set) => ({
      ruoliMap: seedRuoli(),
      funzioniMap: seedFunzioni(),
      assocMap: seedAssoc(),
      setRuoliMap: (u) => set(s => ({ ruoliMap: apply(u, s.ruoliMap) })),
      setFunzioniMap: (u) => set(s => ({ funzioniMap: apply(u, s.funzioniMap) })),
      setAssocMap: (u) => set(s => ({ assocMap: apply(u, s.assocMap) })),
    }),
    {
      name: 'sibylla.admin-config',
      version: 3,
      // Mantiene ruoli/funzioni persistiti; ri-genera le associazioni nel nuovo
      // formato (ruoli per-struttura), il cui shape è cambiato fra le versioni.
      migrate: (persisted: any) => ({
        ruoliMap: persisted?.ruoliMap ?? seedRuoli(),
        funzioniMap: persisted?.funzioniMap ?? seedFunzioni(),
        assocMap: seedAssoc(),
      }),
    },
  ),
)
