import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PACCHETTI_INIT, CLIENTS_INIT, CLIENT_ADMINS } from '../admin/SibyllaAdminPanel/constants'
import type { Modulo } from '../admin/SibyllaAdminPanel/types'

// ─────────────────────────────────────────────────────────────────────────────
//  Access store — utenze fittizie (profili) associate a uno o più moduli.
//  Ogni profilo, una volta "caricato", filtra il menu della sidenav alle sole
//  pagine dei moduli sottoscritti dal suo contratto.
//  currentProfileId = null  → nessun filtro (menu completo, comportamento attuale).
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessProfile {
  id: string
  nome: string
  email: string
  password: string
  /** Struttura/cliente di appartenenza. */
  cliente: string
  ruolo: string
  /** Id dei moduli sottoscritti (da `modules`). */
  moduli: string[]
}

/**
 * Sessione di assistenza: l'admin Sibylla entra nell'app "come" un cliente
 * (intestatario del contratto). La sidenav/topbar reali si filtrano sui suoi
 * moduli e assumono il tema oro della console di amministrazione.
 */
export interface AssistSession {
  intestatarioId: string
  nome: string
  moduli: string[]
  struttureIds: number[]
}

interface AccessState {
  /** Catalogo moduli (id → pagine). Allineato al seed dell'admin (PACCHETTI_INIT). */
  modules: Modulo[]
  profiles: AccessProfile[]
  /** Profilo attualmente caricato; null = menu completo. */
  currentProfileId: string | null
  /** Sessione di assistenza attiva (admin che impersona un cliente); null = nessuna. */
  assist: AssistSession | null
  /** Overlay della Login profili aperto. */
  accessOpen: boolean
  /**
   * Pagine visibili scelte per struttura (id di CLIENTS_INIT) in "Personalizza Moduli": restringono quelle dei suoi
   * moduli. Assente = tutte le pagine dei moduli.
   */
  pagineStruttura: Record<number, string[]>
  /** Dati della struttura salvati dall'Admin Panel (scheda Struttura). */
  datiStruttura: Record<number, unknown>

  addProfile: (p: Omit<AccessProfile, 'id'>) => string
  updateProfile: (id: string, patch: Partial<AccessProfile>) => void
  removeProfile: (id: string) => void
  loginAs: (id: string | null) => void
  /** Avvia/termina una sessione di assistenza cliente. */
  startAssist: (s: AssistSession) => void
  exitAssist: () => void
  /** Verifica credenziali; ritorna il profilo o null. */
  login: (email: string, password: string) => AccessProfile | null
  /** Allinea i moduli dei profili di un'azienda (quando variati nell'admin). */
  syncClientModules: (clienteName: string, moduli: string[]) => void
  /**
   * Moduli della struttura (Admin Panel → Moduli): sono quelli del suo profilo, valgono per menu e Configuratore (es.
   * App Op! apre il gruppo App Op!) e aggiornano l'assistenza in corso. Le pagine tornano a quelle dei moduli.
   */
  setModuliStruttura: (id: number, moduli: string[]) => void
  /** Pagine visibili della struttura; null = tutte quelle dei suoi moduli. */
  setPagineStruttura: (id: number, pagine: string[] | null) => void
  setDatiStruttura: (id: number, dati: unknown) => void
  logout: () => void
  openAccess: () => void
  closeAccess: () => void
}

const MODULES: Modulo[] = PACCHETTI_INIT.map(m => ({ ...m, pages: [...m.pages] }))

// Utenze di test = amministratori delle aziende clienti (una per azienda).
// Derivate dalla stessa fonte usata dall'admin (CLIENTS_INIT + CLIENT_ADMINS),
// così profilo di login, utente del cliente e moduli assegnati restano allineati.
const SEED_PROFILES: AccessProfile[] = CLIENTS_INIT.map(c => {
  const a = CLIENT_ADMINS[c.id]
  return {
    id: `p-${c.id}`,
    nome: a?.nome ?? c.nome,
    email: a?.email ?? c.email,
    password: 'demo',
    cliente: c.nome,
    ruolo: 'Amministratore',
    moduli: a?.moduli ?? ['struttura-ricettiva'],
  }
})

export const useAccessStore = create<AccessState>()(
  persist(
    (set, get) => ({
      modules: MODULES,
      profiles: SEED_PROFILES,
      currentProfileId: null,
      assist: null,
      accessOpen: false,
      pagineStruttura: {},
      datiStruttura: {},

      addProfile: (p) => {
        const id = `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        set(s => ({ profiles: [{ id, ...p }, ...s.profiles] }))
        return id
      },
      updateProfile: (id, patch) =>
        set(s => ({ profiles: s.profiles.map(p => p.id === id ? { ...p, ...patch } : p) })),
      removeProfile: (id) =>
        set(s => ({
          profiles: s.profiles.filter(p => p.id !== id),
          currentProfileId: s.currentProfileId === id ? null : s.currentProfileId,
        })),
      loginAs: (id) => set({ currentProfileId: id, accessOpen: false }),
      startAssist: (s) => set({ assist: s, accessOpen: false }),
      exitAssist: () => set({ assist: null }),
      login: (email, password) => {
        const p = get().profiles.find(
          x => x.email.trim().toLowerCase() === email.trim().toLowerCase() && x.password === password,
        )
        if (p) set({ currentProfileId: p.id, accessOpen: false })
        return p ?? null
      },
      syncClientModules: (clienteName, moduli) =>
        set(s => ({ profiles: s.profiles.map(p => p.cliente === clienteName ? { ...p, moduli: [...moduli] } : p) })),
      setModuliStruttura: (id, moduli) =>
        set(s => {
          const { [id]: _tolte, ...pagine } = s.pagineStruttura
          return {
            profiles: s.profiles.map(p => strutturaDelProfilo(p) === id ? { ...p, moduli: [...moduli] } : p),
            pagineStruttura: pagine,
            assist: s.assist && s.assist.struttureIds.length === 1 && s.assist.struttureIds[0] === id ? { ...s.assist, moduli: [...moduli] } : s.assist,
          }
        }),
      setPagineStruttura: (id, pagine) =>
        set(s => {
          const { [id]: _prima, ...altre } = s.pagineStruttura
          return { pagineStruttura: pagine ? { ...altre, [id]: [...pagine] } : altre }
        }),
      setDatiStruttura: (id, dati) => set(s => ({ datiStruttura: { ...s.datiStruttura, [id]: dati } })),
      logout: () => set({ currentProfileId: null }),
      openAccess: () => set({ accessOpen: true }),
      closeAccess: () => set({ accessOpen: false }),
    }),
    {
      name: 'sibylla.access',
      // Bump versione: rigenera le utenze di test (= admin delle aziende) anche
      // sostituendo eventuali profili persistiti in localStorage.
      // v4: Giulia Neri passa al modulo "Menu Tour Operator".
      // v5: catalogo moduli a 4 (Struttura ricettiva / Tour Operator / Ristorazione / Full).
      version: 5,
      migrate: () => ({ profiles: SEED_PROFILES, currentProfileId: null, assist: null, pagineStruttura: {}, datiStruttura: {} }) as Partial<AccessState> as AccessState,
      // Non persistiamo `modules` (riallineati dal seed) né `accessOpen` (transitorio).
      partialize: (s) => ({
        profiles: s.profiles, currentProfileId: s.currentProfileId, assist: s.assist,
        pagineStruttura: s.pagineStruttura, datiStruttura: s.datiStruttura,
      }),
    },
  ),
)

/**
 * Insieme delle pagine abilitate per un profilo = unione delle pagine dei moduli
 * sottoscritti. La Home è sempre inclusa (landing di piattaforma).
 */
export function enabledPagesForProfile(profile: AccessProfile, modules: Modulo[]): Set<string> {
  return paginePerStruttura(strutturaDelProfilo(profile), profile.moduli, modules)
}

/** Struttura (id di CLIENTS_INIT) del profilo: dall'id "p-<id>" delle utenze seed, o dal nome della struttura. */
export function strutturaDelProfilo(p: AccessProfile): number | null {
  const m = /^p-(\d+)$/.exec(p.id)
  if (m) return Number(m[1])
  return CLIENTS_INIT.find(c => c.nome === p.cliente)?.id ?? null
}

/**
 * Pagine visibili di una struttura: quelle dei suoi moduli, ristrette a quelle scelte in "Personalizza Moduli" se ce
 * ne sono (Home sempre inclusa).
 */
export function paginePerStruttura(id: number | null, moduli: string[], modules: Modulo[]): Set<string> {
  const delModuli = enabledPagesForModuli(moduli, modules)
  const scelte = id === null ? undefined : useAccessStore.getState().pagineStruttura[id]
  if (!scelte) return delModuli
  const set = new Set<string>(['home'])
  scelte.forEach(pg => { if (delModuli.has(pg)) set.add(pg) })
  return set
}

/** Profilo della struttura (l'utenza amministratore seed "p-<id>"), se c'è. */
export function profiloDellaStruttura(id: number, profiles: AccessProfile[]): AccessProfile | undefined {
  return profiles.find(p => strutturaDelProfilo(p) === id)
}

/** Insieme delle pagine abilitate dall'unione dei moduli indicati (Home sempre inclusa). */
export function enabledPagesForModuli(moduli: string[], modules: Modulo[]): Set<string> {
  const set = new Set<string>(['home'])
  for (const mid of moduli) {
    const m = modules.find(x => x.id === mid)
    if (m) m.pages.forEach(pg => set.add(pg))
  }
  return set
}

/**
 * Voci del Configuratore visibili per un profilo, in base ai moduli sottoscritti.
 * Ritorna `null` se nessun limite (almeno un modulo concede tutte le voci, es.
 * Full Suite); altrimenti l'unione delle `configuratoreItems` dei moduli (es. il
 * modulo Ristoranti concede solo le voci Food & Beverage).
 */
export function allowedConfiguratoreIds(profile: AccessProfile, modules: Modulo[]): Set<string> | null {
  const set = new Set<string>()
  for (const mid of profile.moduli) {
    const m = modules.find(x => x.id === mid)
    if (!m) continue
    if (!m.configuratoreItems) return null  // modulo senza restrizioni → tutte le voci
    m.configuratoreItems.forEach(id => set.add(id))
  }
  return set
}
